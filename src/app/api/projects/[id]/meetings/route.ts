import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { getValidAccessToken, createGoogleCalendarEvent } from '@/lib/google'
import { logActivity } from '@/lib/activity'

const meetingCreateSchema = z.object({
  title: z.string().min(1, 'Le titre est requis').max(200),
  scheduled_at: z.string().min(1, 'La date est requise'),
  duration_min: z.number().int().min(1).optional().default(60),
  location: z.string().max(300).optional().nullable(),
  meeting_link: z.string().url('Lien invalide').optional().nullable().or(z.literal('')),
  notes: z.string().optional().nullable(),
  attendees: z.array(z.string()).optional().default([]),
  type: z.enum(['appel', 'visio', 'presentiel', 'autre']).optional().default('visio'),
  sync_google: z.boolean().optional().default(false),
})

// GET /api/projects/[id]/meetings
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 })
    }

    const { data, error } = await supabase
      .from('project_meetings')
      .select('*')
      .eq('project_id', id)
      .order('scheduled_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ data: data ?? [] })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST /api/projects/[id]/meetings
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 })
    }

    const body = await request.json()
    const parsed = meetingCreateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    let googleEventId: string | null = null
    let finalMeetingLink = parsed.data.meeting_link || null

    if (parsed.data.sync_google) {
      const { data: integration } = await supabase
        .from('google_integrations')
        .select('access_token, refresh_token, expires_at')
        .eq('user_id', user.id)
        .single()

      if (integration) {
        try {
          const accessToken = await getValidAccessToken(
            integration.access_token,
            integration.refresh_token,
            integration.expires_at,
          )
          const result = await createGoogleCalendarEvent(accessToken, {
            title: parsed.data.title,
            description: parsed.data.notes ?? null,
            startAt: parsed.data.scheduled_at,
            durationMin: parsed.data.duration_min,
            attendeeEmails: parsed.data.attendees,
          })
          googleEventId = result.eventId
          if (result.meetLink && !finalMeetingLink) {
            finalMeetingLink = result.meetLink
          }
        } catch (err) {
          console.error('[meetings/post] Google Calendar sync error:', err)
        }
      }
    }

    const { data, error } = await supabase
      .from('project_meetings')
      .insert({
        project_id: id,
        title: parsed.data.title,
        scheduled_at: parsed.data.scheduled_at,
        duration_min: parsed.data.duration_min,
        location: parsed.data.location ?? null,
        meeting_link: finalMeetingLink,
        notes: parsed.data.notes ?? null,
        attendees: parsed.data.attendees,
        type: parsed.data.type ?? 'visio',
        google_event_id: googleEventId,
      })
      .select('*')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    void logActivity({
      supabase,
      userId: user.id,
      action: 'meeting_created',
      projectId: id,
      entityType: 'meeting',
      entityId: data.id,
      entityName: data.title,
      metadata: { scheduled_at: data.scheduled_at, has_meet_link: !!data.meeting_link },
    })

    return NextResponse.json({ data }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
