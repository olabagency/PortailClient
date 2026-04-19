import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// DELETE /api/clients/[id]/portal-access
// Révoque l'accès portail d'un client (remet user_id à null)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    // Vérifier que ce client appartient au freelance
    const { data: client } = await supabase
      .from('clients')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (!client) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

    const admin = createAdminClient()

    // Retirer le lien auth
    await admin
      .from('clients')
      .update({ user_id: null })
      .eq('id', id)

    // Réinitialiser tous les portails de ce client
    const { data: projects } = await admin
      .from('projects')
      .select('id')
      .eq('client_id', id)

    if (projects?.length) {
      await admin
        .from('client_portals')
        .update({ accepted_at: null })
        .in('project_id', projects.map(p => p.id))
    }

    return NextResponse.json({ data: { success: true } })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
