const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/userinfo.email',
]

const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const CALENDAR_BASE = 'https://www.googleapis.com/calendar/v3'
const USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo'

export function getGoogleOAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
    response_type: 'code',
    scope: SCOPES.join(' '),
    access_type: 'offline',
    prompt: 'consent',
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`
}

export async function exchangeCodeForTokens(code: string) {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
      grant_type: 'authorization_code',
    }),
  })
  if (!res.ok) throw new Error(`Token exchange failed: ${await res.text()}`)
  return res.json() as Promise<{
    access_token: string
    refresh_token?: string
    expires_in: number
    token_type: string
  }>
}

export async function getValidAccessToken(
  accessToken: string,
  refreshToken: string,
  expiresAt: string,
): Promise<string> {
  const expiry = new Date(expiresAt)
  if (expiry > new Date(Date.now() + 60_000)) return accessToken

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })
  if (!res.ok) throw new Error(`Token refresh failed: ${await res.text()}`)
  const data = await res.json() as { access_token: string }
  return data.access_token
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
  const startTime = new Date(payload.startAt)
  const endTime = new Date(startTime.getTime() + payload.durationMin * 60_000)

  const body = {
    summary: payload.title,
    description: payload.description ?? undefined,
    start: { dateTime: startTime.toISOString(), timeZone: 'Europe/Paris' },
    end: { dateTime: endTime.toISOString(), timeZone: 'Europe/Paris' },
    attendees: (payload.attendeeEmails ?? []).filter(Boolean).map((email) => ({ email })),
    conferenceData: {
      createRequest: {
        requestId: `hublio-${Date.now()}`,
        conferenceSolutionKey: { type: 'hangoutsMeet' },
      },
    },
  }

  const res = await fetch(
    `${CALENDAR_BASE}/calendars/primary/events?conferenceDataVersion=1`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    },
  )
  if (!res.ok) throw new Error(`Calendar insert failed: ${await res.text()}`)
  const data = await res.json() as {
    id: string
    conferenceData?: { entryPoints?: Array<{ entryPointType: string; uri: string }> }
  }

  const meetLink = data.conferenceData?.entryPoints?.find(
    (ep) => ep.entryPointType === 'video',
  )?.uri ?? null

  return { eventId: data.id, meetLink }
}

export async function updateGoogleCalendarEvent(
  accessToken: string,
  eventId: string,
  payload: Partial<GoogleMeetingPayload>,
): Promise<void> {
  const patch: Record<string, unknown> = {}
  if (payload.title) patch.summary = payload.title
  if (payload.description !== undefined) patch.description = payload.description
  if (payload.startAt && payload.durationMin) {
    const startTime = new Date(payload.startAt)
    const endTime = new Date(startTime.getTime() + payload.durationMin * 60_000)
    patch.start = { dateTime: startTime.toISOString(), timeZone: 'Europe/Paris' }
    patch.end = { dateTime: endTime.toISOString(), timeZone: 'Europe/Paris' }
  }

  const res = await fetch(`${CALENDAR_BASE}/calendars/primary/events/${eventId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(patch),
  })
  if (!res.ok) throw new Error(`Calendar patch failed: ${await res.text()}`)
}

export async function deleteGoogleCalendarEvent(
  accessToken: string,
  eventId: string,
): Promise<void> {
  const res = await fetch(`${CALENDAR_BASE}/calendars/primary/events/${eventId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok && res.status !== 410) throw new Error(`Calendar delete failed: ${await res.text()}`)
}

export async function getGoogleUserEmail(accessToken: string): Promise<string> {
  const res = await fetch(USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error(`Userinfo failed: ${await res.text()}`)
  const data = await res.json() as { email: string }
  return data.email
}
