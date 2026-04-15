import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/client/projects
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    // Chercher le profil client lié à cet user — d'abord par user_id, sinon par email (fallback)
    let client: { id: string } | null = null

    const { data: byUserId } = await supabase
      .from('clients')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (byUserId) {
      client = byUserId
    } else if (user.email) {
      // Fallback : le user_id n'a pas encore été lié (premier login avant le fix)
      const { data: byEmail } = await supabase
        .from('clients')
        .select('id')
        .ilike('email', user.email)
        .single()

      if (byEmail) {
        client = byEmail
        // Lier immédiatement pour les prochaines requêtes
        await supabase
          .from('clients')
          .update({ user_id: user.id })
          .eq('id', byEmail.id)
          .is('user_id', null)
      }
    }

    if (!client) {
      return NextResponse.json({ data: [] })
    }

    // Retourner les projets du client
    const { data: projects, error } = await supabase
      .from('projects')
      .select('id, name, description, status, color, created_at')
      .eq('client_id', client.id)
      .neq('status', 'archived')
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ data: projects ?? [] })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
