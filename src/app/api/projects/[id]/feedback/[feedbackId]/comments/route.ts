import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createNotification } from '@/lib/notify'
import { z } from 'zod'

const schema = z.object({
  content: z.string().min(1).max(2000),
})

// GET /api/projects/[id]/feedback/[feedbackId]/comments
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
    const { data: project } = await admin.from('projects').select('id').eq('id', id).eq('user_id', user.id).single()
    if (!project) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

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

// POST /api/projects/[id]/feedback/[feedbackId]/comments
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
    const { data: project } = await admin.from('projects').select('id').eq('id', id).eq('user_id', user.id).single()
    if (!project) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

    // Nom du freelance
    const { data: profile } = await admin.from('profiles').select('full_name').eq('id', user.id).single()
    const commenterName = profile?.full_name ?? user.email ?? 'Prestataire'

    const body = await request.json() as unknown
    const parsed = schema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

    const { data: comment, error } = await admin
      .from('feedback_comments')
      .insert({ feedback_id: feedbackId, project_id: id, content: parsed.data.content, source: 'freelance', commenter_name: commenterName })
      .select().single()

    if (error || !comment) return NextResponse.json({ error: 'Erreur insert' }, { status: 500 })

    // Notifier le client : trouver le client via le projet
    const { data: fullProject } = await admin.from('projects').select('client_id, name, clients(user_id, name)').eq('id', id).single()
    const client = fullProject?.clients as unknown as { user_id: string; name: string } | null
    if (client?.user_id) {
      const { data: feedback } = await admin.from('client_feedback').select('title').eq('id', feedbackId).single()
      await createNotification({
        userId: client.user_id,
        type: 'feedback_comment',
        title: 'Réponse à votre retour',
        body: `${commenterName} a répondu à votre retour "${feedback?.title ?? ''}" sur le projet ${fullProject?.name ?? ''}`,
        projectId: id,
        metadata: { feedbackId, commentId: comment.id },
      })
    }

    return NextResponse.json({ data: comment }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
