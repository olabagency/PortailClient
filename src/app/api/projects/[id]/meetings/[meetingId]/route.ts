import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { getValidAccessToken, updateGoogleCalendarEvent, deleteGoogleCalendarEvent } from '@/lib/google'
import { logActivity } from '@/lib/activity'

const meetingUpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  scheduled_at: z.string().optional(),
  duration_min: z.number().int().min(1).optional(),
  location: z.string().max(300).optional().nullable(),
  meeting_link: z.string().url('Lien invalide').optional().nullable().or(z.literal('')),
  notes: z.string().optional().nullable(),
  summary: z.string().optional().nullable(),
  attendees: z.array(z.string()).optional(),
  status: z.enum(['planifiee', 'confirmee', 'annulee']).optional(),
})

async function checkOwnership(supabase: Awaited<ReturnType<typeof createClient>>, projectId: string, userId: string) {
  const { data, error } = await supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('user_id', userId)
    .single()
  return !error && !!data
}

// PUT /api/projects/[id]/meetings/[meetingId]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; meetingId: string }> },
) {
  try {
    const { id, meetingId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const owned = await checkOwnership(supabase, id, user.id)
    if (!owned) return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 })

    const body = await request.json()
    const parsed = meetingUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const updatePayload: Record<string, unknown> = { ...parsed.data, updated_at: new Date().toISOString() }
    if ('meeting_link' in updatePayload && updatePayload.meeting_link === '') {
      updatePayload.meeting_link = null
    }

    const { data, error } = await supabase
      .from('project_meetings')
      .update(updatePayload)
      .eq('id', meetingId)
      .eq('project_id', id)
      .select('*')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data) return NextResponse.json({ error: 'Réunion introuvable' }, { status: 404 })

    // Sync Google Calendar if the meeting has a linked Google event
    if (data.google_event_id) {
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
          await updateGoogleCalendarEvent(accessToken, data.google_event_id, {
            title: parsed.data.title,
            description: parsed.data.notes ?? undefined,
            startAt: parsed.data.scheduled_at,
            durationMin: parsed.data.duration_min,
          })
        } catch (err) {
          console.error('[meetings/put] Google Calendar sync error:', err)
        }
      }
    }

    const action = parsed.data.status === 'annulee' ? 'meeting_canceled' : 'meeting_updated'
    void logActivity({
      supabase,
      userId: user.id,
      action,
      projectId: id,
      entityType: 'meeting',
      entityId: meetingId,
      entityName: data.title,
    })

    return NextResponse.json({ data })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// DELETE /api/projects/[id]/meetings/[meetingId]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; meetingId: string }> },
) {
  try {
    const { id, meetingId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const owned = await checkOwnership(supabase, id, user.id)
    if (!owned) return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 })

    const { data: meeting } = await supabase
      .from('project_meetings')
      .select('google_event_id, title')
      .eq('id', meetingId)
      .eq('project_id', id)
      .single()

    const { error } = await supabase
      .from('project_meetings')
      .delete()
      .eq('id', meetingId)
      .eq('project_id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Remove from Google Calendar if synced
    if (meeting?.google_event_id) {
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
          await deleteGoogleCalendarEvent(accessToken, meeting.google_event_id)
        } catch (err) {
          console.error('[meetings/delete] Google Calendar sync error:', err)
        }
      }
    }

    void logActivity({
      supabase,
      userId: user.id,
      action: 'meeting_deleted',
      projectId: id,
      entityType: 'meeting',
      entityId: meetingId,
      entityName: meeting?.title ?? undefined,
    })

    return NextResponse.json({ data: { success: true } })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
