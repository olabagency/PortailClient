import { google } from 'googleapis'

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/userinfo.email',
]

export function getOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!,
    process.env.GOOGLE_REDIRECT_URI!,
  )
}

export function getGoogleOAuthUrl(): string {
  const oauth2 = getOAuthClient()
  return oauth2.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  })
}

export async function exchangeCodeForTokens(code: string) {
  const oauth2 = getOAuthClient()
  const { tokens } = await oauth2.getToken(code)
  return tokens
}

export async function getValidAccessToken(
  accessToken: string,
  refreshToken: string,
  expiresAt: string,
): Promise<string> {
  const now = new Date()
  const expiry = new Date(expiresAt)

  if (expiry > new Date(now.getTime() + 60_000)) {
    return accessToken
  }

  const oauth2 = getOAuthClient()
  oauth2.setCredentials({ refresh_token: refreshToken })
  const { credentials } = await oauth2.refreshAccessToken()
  return credentials.access_token!
}

export interface GoogleMeetingPayload {
  title: string
  description?: string | null
  startAt: string
  durationMin: number
  attendeeEmails?: string[]
}

export async function createGoogleCalendarEvent(
  accessToken: string,
  payload: GoogleMeetingPayload,
): Promise<{ eventId: string; meetLink: string | null }> {
  const oauth2 = getOAuthClient()
  oauth2.setCredentials({ access_token: accessToken })

  const calendar = google.calendar({ version: 'v3', auth: oauth2 })

  const startTime = new Date(payload.startAt)
  const endTime = new Date(startTime.getTime() + payload.durationMin * 60_000)

  const attendees = (payload.attendeeEmails ?? [])
    .filter(Boolean)
    .map((email) => ({ email }))

  const event = await calendar.events.insert({
    calendarId: 'primary',
    conferenceDataVersion: 1,
    requestBody: {
      summary: payload.title,
      description: payload.description ?? undefined,
      start: { dateTime: startTime.toISOString(), timeZone: 'Europe/Paris' },
      end: { dateTime: endTime.toISOString(), timeZone: 'Europe/Paris' },
      attendees,
      conferenceData: {
        createRequest: {
          requestId: `clientflow-${Date.now()}`,
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      },
    },
  })

  const eventId = event.data.id!
  const meetLink = event.data.conferenceData?.entryPoints?.find(
    (ep) => ep.entryPointType === 'video',
  )?.uri ?? null

  return { eventId, meetLink }
}

export async function updateGoogleCalendarEvent(
  accessToken: string,
  eventId: string,
  payload: Partial<GoogleMeetingPayload>,
): Promise<void> {
  const oauth2 = getOAuthClient()
  oauth2.setCredentials({ access_token: accessToken })

  const calendar = google.calendar({ version: 'v3', auth: oauth2 })

  const patch: Record<string, unknown> = {}
  if (payload.title) patch.summary = payload.title
  if (payload.description !== undefined) patch.description = payload.description
  if (payload.startAt && payload.durationMin) {
    const startTime = new Date(payload.startAt)
    const endTime = new Date(startTime.getTime() + payload.durationMin * 60_000)
    patch.start = { dateTime: startTime.toISOString(), timeZone: 'Europe/Paris' }
    patch.end = { dateTime: endTime.toISOString(), timeZone: 'Europe/Paris' }
  }

  await calendar.events.patch({
    calendarId: 'primary',
    eventId,
    requestBody: patch,
  })
}

export async function deleteGoogleCalendarEvent(
  accessToken: string,
  eventId: string,
): Promise<void> {
  const oauth2 = getOAuthClient()
  oauth2.setCredentials({ access_token: accessToken })

  const calendar = google.calendar({ version: 'v3', auth: oauth2 })
  await calendar.events.delete({ calendarId: 'primary', eventId })
}

export async function getGoogleUserEmail(accessToken: string): Promise<string> {
  const oauth2 = getOAuthClient()
  oauth2.setCredentials({ access_token: accessToken })

  const oauth2Api = google.oauth2({ version: 'v2', auth: oauth2 })
  const { data } = await oauth2Api.userinfo.get()
  return data.email!
}
