import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// DELETE /api/projects/[id]/portal-access
// Révoque l'accès portail du client : remet user_id à null sur la fiche client
// et réinitialise client_portals pour permettre une nouvelle invitation.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    // Vérifier ownership + récupérer client_id
    const { data: project } = await supabase
      .from('projects')
      .select('client_id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (!project) return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 })
    if (!project.client_id) return NextResponse.json({ error: 'Aucun client lié' }, { status: 400 })

    const admin = createAdminClient()

    // 1. Retirer le lien user_id → le client ne peut plus se connecter au portail
    await admin
      .from('clients')
      .update({ user_id: null })
      .eq('id', project.client_id)

    // 2. Réinitialiser le portail projet pour permettre une nouvelle invitation
    await admin
      .from('client_portals')
      .update({ accepted_at: null })
      .eq('project_id', id)

    return NextResponse.json({ data: { success: true } })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
