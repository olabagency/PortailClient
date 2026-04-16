import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createNotification } from '@/lib/notify'
import { z } from 'zod'

const schema = z.object({
  content: z.string().min(1).max(2000),
  quoted_text: z.string().max(500).optional().nullable(),
})

// GET /api/client/projects/[id]/meetings/[meetingId]/comments
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; meetingId: string }> }
) {
  try {
    const { id, meetingId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const admin = createAdminClient()
    const { data: clientRecord } = await admin.from('clients').select('id').eq('user_id', user.id).single()
    if (!clientRecord) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

    const { data: project } = await admin.from('projects').select('id').eq('id', id).eq('client_id', clientRecord.id).single()
    if (!project) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

    const { data, error } = await admin
      .from('meeting_comments')
      .select('*')
      .eq('meeting_id', meetingId)
      .eq('project_id', id)
      .order('created_at', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data: data ?? [] })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST /api/client/projects/[id]/meetings/[meetingId]/comments
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; meetingId: string }> }
) {
  try {
    const { id, meetingId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const admin = createAdminClient()
    const { data: clientRecord } = await admin.from('clients').select('id, name').eq('user_id', user.id).single()
    if (!clientRecord) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

    const { data: project } = await admin.from('projects').select('id, name, user_id').eq('id', id).eq('client_id', clientRecord.id).single()
    if (!project) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

    const body = await request.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

    const { data: meeting } = await admin.from('project_meetings').select('title').eq('id', meetingId).single()

    const { data: comment, error } = await admin
      .from('meeting_comments')
      .insert({
        meeting_id: meetingId,
        project_id: id,
        content: parsed.data.content,
        quoted_text: parsed.data.quoted_text ?? null,
        source: 'client',
      })
      .select()
      .single()

    if (error || !comment) return NextResponse.json({ error: 'Erreur insert' }, { status: 500 })

    // Notifier le freelance
    await createNotification({
      userId: project.user_id,
      type: 'meeting_comment',
      title: `Nouveau commentaire sur la réunion`,
      body: `${clientRecord.name} a commenté la réunion "${meeting?.title ?? ''}" sur le projet ${project.name}`,
      projectId: id,
      clientId: clientRecord.id,
      metadata: { meetingId, commentId: comment.id },
    })

    return NextResponse.json({ data: comment }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
