import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/client/projects
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const admin = createAdminClient()

    // Chercher le profil client lié à cet user
    let { data: client } = await admin
      .from('clients')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!client && user.email) {
      const { data: byEmail } = await admin
        .from('clients')
        .select('id')
        .ilike('email', user.email)
        .single()

      if (byEmail) {
        client = byEmail
        await admin.from('clients').update({ user_id: user.id }).eq('id', byEmail.id)
      }
    }

    if (!client) return NextResponse.json({ data: [] })

    const { data: projects, error } = await admin
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
