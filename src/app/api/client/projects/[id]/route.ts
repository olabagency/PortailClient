import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/client/projects/[id]
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
      .select('id, require_account, accepted_at')
      .eq('project_id', id)
      .filter('email', 'ilike', userEmail)
      .single()

    if (!portalAccess) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    // Récupérer le projet
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, name, description, status, color, public_id, created_at')
      .eq('id', id)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 })
    }

    // Récupérer toutes les données en parallèle
    const [
      { data: milestones },
      { data: deliverables },
      { data: documents },
      { data: feedback },
    ] = await Promise.all([
      supabase
        .from('project_milestones')
        .select('*')
        .eq('project_id', id)
        .eq('visible_to_client', true)
        .order('order_index'),
      supabase
        .from('project_deliverables')
        .select('*')
        .eq('project_id', id)
        .order('created_at', { ascending: false }),
      supabase
        .from('project_documents')
        .select('*')
        .eq('project_id', id)
        .eq('visible_to_client', true)
        .order('created_at', { ascending: false }),
      supabase
        .from('client_feedback')
        .select('*')
        .eq('project_id', id)
        .order('created_at', { ascending: false }),
    ])

    return NextResponse.json({
      data: {
        project,
        milestones: milestones ?? [],
        deliverables: deliverables ?? [],
        documents: documents ?? [],
        feedback: feedback ?? [],
        portal: {
          require_account: portalAccess.require_account,
          accepted_at: portalAccess.accepted_at,
        },
      },
    })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
