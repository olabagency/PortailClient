import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/client/projects/[id]
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const admin = createAdminClient()

    // Trouver le client lié à cet user
    let { data: clientRecord } = await admin
      .from('clients')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!clientRecord && user.email) {
      const { data: byEmail } = await admin
        .from('clients')
        .select('id')
        .ilike('email', user.email)
        .single()
      if (byEmail) {
        clientRecord = byEmail
        await admin.from('clients').update({ user_id: user.id }).eq('id', byEmail.id)
      }
    }

    if (!clientRecord) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

    // Vérifier que ce projet appartient bien à ce client
    const { data: project, error: projectError } = await admin
      .from('projects')
      .select('id, name, description, status, color, public_id, created_at, client_id')
      .eq('id', id)
      .eq('client_id', clientRecord.id)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: 'Projet introuvable ou accès refusé' }, { status: 404 })
    }

    // Récupérer toutes les données en parallèle via admin (bypass RLS)
    const [
      { data: milestones },
      { data: deliverables },
      { data: documents },
      { data: feedback },
      { data: meetings },
    ] = await Promise.all([
      admin
        .from('project_milestones')
        .select('*')
        .eq('project_id', id)
        .eq('visible_to_client', true)
        .order('order_index'),
      admin
        .from('project_deliverables')
        .select('*')
        .eq('project_id', id)
        .order('created_at', { ascending: false }),
      admin
        .from('project_documents')
        .select('*')
        .eq('project_id', id)
        .eq('visible_to_client', true)
        .order('created_at', { ascending: false }),
      admin
        .from('client_feedback')
        .select('*')
        .eq('project_id', id)
        .order('created_at', { ascending: false }),
      admin
        .from('project_meetings')
        .select('id, title, scheduled_at, duration_min, location, meeting_link, notes, summary, attendees')
        .eq('project_id', id)
        .order('scheduled_at', { ascending: true }),
    ])

    // Vérifier l'accès portail (optionnel, pour les métadonnées)
    const { data: portalAccess } = await admin
      .from('client_portals')
      .select('require_account, accepted_at')
      .eq('project_id', id)
      .ilike('email', user.email ?? '')
      .single()

    return NextResponse.json({
      data: {
        project,
        milestones: milestones ?? [],
        deliverables: deliverables ?? [],
        documents: documents ?? [],
        feedback: feedback ?? [],
        meetings: meetings ?? [],
        portal: portalAccess ?? { require_account: false, accepted_at: null },
      },
    })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
