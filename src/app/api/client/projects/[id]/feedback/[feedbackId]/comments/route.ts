import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createNotification } from '@/lib/notify'
import { z } from 'zod'

const schema = z.object({
  content: z.string().min(1).max(2000),
})

// GET /api/client/projects/[id]/feedback/[feedbackId]/comments
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; feedbackId: string }> }
) {
  try {
    const { id, feedbackId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const admin = createAdminClient()
    const { data: clientRecord } = await admin.from('clients').select('id').eq('user_id', user.id).single()
    if (!clientRecord) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

    const { data: proj } = await admin.from('projects').select('id').eq('id', id).eq('client_id', clientRecord.id).single()
    if (!proj) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

    const { data, error } = await admin
      .from('feedback_comments')
      .select('*')
      .eq('feedback_id', feedbackId)
      .eq('project_id', id)
      .order('created_at', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data: data ?? [] })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST /api/client/projects/[id]/feedback/[feedbackId]/comments
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; feedbackId: string }> }
) {
  try {
    const { id, feedbackId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const admin = createAdminClient()
    const { data: clientRecord } = await admin.from('clients').select('id, name').eq('user_id', user.id).single()
    if (!clientRecord) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

    const { data: proj } = await admin.from('projects').select('id, user_id, name').eq('id', id).eq('client_id', clientRecord.id).single()
    if (!proj) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

    const body = await request.json() as unknown
    const parsed = schema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

    // Récupérer le titre du compte rendu pour la notification
    const { data: feedback } = await admin
      .from('client_feedback')
      .select('title')
      .eq('id', feedbackId)
      .single()

    const { data: comment, error } = await admin
      .from('feedback_comments')
      .insert({ feedback_id: feedbackId, project_id: id, content: parsed.data.content, source: 'client', commenter_name: clientRecord.name })
      .select().single()

    if (error || !comment) return NextResponse.json({ error: 'Erreur insert' }, { status: 500 })

    try {
      await createNotification({
        userId: proj.user_id,
        type: 'feedback_comment',
        title: `Nouveau commentaire — ${proj.name}`,
        body: `${clientRecord.name} a commenté « ${feedback?.title ?? 'un compte rendu'} »`,
        projectId: id,
      })
    } catch { /* notification non bloquante */ }

    return NextResponse.json({ data: comment }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
