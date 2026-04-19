import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createNotification } from '@/lib/notify'
import { z } from 'zod'

const schema = z.object({
  title: z.string().min(1).max(255),
  content: z.string().optional().nullable(),
  type: z.enum(['feedback', 'modification_request', 'question']),
  deliverable_id: z.string().uuid().optional().nullable(),
  media_urls: z.array(z.string()).optional().nullable(),
})

// POST /api/client/projects/[id]/feedback
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const admin = createAdminClient()

    // Vérifier accès : le client doit être lié à ce projet
    const { data: clientRecord } = await admin
      .from('clients')
      .select('id, name')
      .eq('user_id', user.id)
      .single()

    if (!clientRecord) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

    const { data: project } = await admin
      .from('projects')
      .select('id, user_id, name')
      .eq('id', id)
      .eq('client_id', clientRecord.id)
      .single()

    if (!project) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

    const body = await request.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    // Récupérer la phase courante
    const { data: existingFeedback } = await admin
      .from('client_feedback')
      .select('phase')
      .eq('project_id', id)
      .order('phase', { ascending: false })
      .limit(1)
      .single()

    const currentPhase = existingFeedback?.phase ?? 1

    const { data: newFeedback, error: insertError } = await admin
      .from('client_feedback')
      .insert({
        project_id: id,
        title: parsed.data.title,
        content: parsed.data.content ?? null,
        type: parsed.data.type,
        source: 'client',
        status: 'pending',
        phase: currentPhase,
        deliverable_id: parsed.data.deliverable_id ?? null,
        media_urls: parsed.data.media_urls ?? [],
      })
      .select()
      .single()

    if (insertError || !newFeedback) {
      return NextResponse.json({ error: 'Erreur lors de la création du feedback' }, { status: 500 })
    }

    const typeLabel = parsed.data.type === 'modification_request'
      ? 'Demande de modification'
      : parsed.data.type === 'question'
      ? 'Question'
      : 'Retour'

    try {
      await createNotification({
        userId: project.user_id,
        type: 'feedback_received',
        title: `${typeLabel} — ${project.name}`,
        body: `${clientRecord.name} a soumis : « ${parsed.data.title} »`,
        projectId: id,
      })
    } catch { /* notification non bloquante */ }

    return NextResponse.json({ data: newFeedback })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
