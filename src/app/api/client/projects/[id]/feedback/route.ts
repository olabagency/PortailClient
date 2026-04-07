import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const schema = z.object({
  title: z.string().min(1).max(255),
  content: z.string().optional().nullable(),
  type: z.enum(['feedback', 'modification_request', 'question']),
  deliverable_id: z.string().uuid().optional().nullable(),
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

    const userEmail = user.email
    if (!userEmail) return NextResponse.json({ error: 'Email utilisateur introuvable' }, { status: 401 })

    // Vérifier l'accès via client_portals
    const { data: portalAccess } = await supabase
      .from('client_portals')
      .select('id')
      .eq('project_id', id)
      .filter('email', 'ilike', userEmail)
      .single()

    if (!portalAccess) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    // Récupérer la phase courante (max phase existante pour ce projet)
    const { data: existingFeedback } = await supabase
      .from('client_feedback')
      .select('phase')
      .eq('project_id', id)
      .order('phase', { ascending: false })
      .limit(1)
      .single()

    const currentPhase = existingFeedback?.phase ?? 1

    const { data: newFeedback, error: insertError } = await supabase
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
      })
      .select()
      .single()

    if (insertError || !newFeedback) {
      console.error('[feedback] Insert error:', insertError)
      return NextResponse.json({ error: 'Erreur lors de la création du feedback' }, { status: 500 })
    }

    return NextResponse.json({ data: newFeedback })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
