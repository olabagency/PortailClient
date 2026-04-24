import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/integrations/google/status
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { data } = await supabase
      .from('google_integrations')
      .select('google_email')
      .eq('user_id', user.id)
      .single()

    return NextResponse.json({
      connected: !!data,
      email: data?.google_email ?? null,
    })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
