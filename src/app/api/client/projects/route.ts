import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/client/projects
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    // Chercher le profil client lié à cet user
    const { data: client } = await supabase
      .from('clients')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!client) {
      return NextResponse.json({ data: [] })
    }

    // Retourner les projets du client avec leur progression kanban
    const { data: projects, error } = await supabase
      .from('projects')
      .select(`
        id, name, description, status, color, created_at,
        kanban_columns(
          kanban_tasks(id, status)
        )
      `)
      .eq('client_id', client.id)
      .neq('status', 'archived')
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ data: projects ?? [] })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
