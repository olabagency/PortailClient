import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getGoogleOAuthUrl } from '@/lib/google'

// GET /api/integrations/google/connect
// Réservé aux plans pro et agency — redirige vers Google OAuth
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('plan')
      .eq('id', user.id)
      .single()

    const plan = profile?.plan ?? 'free'
    if (plan === 'free') {
      return NextResponse.json(
        { error: 'Cette fonctionnalité est réservée aux plans Pro et Agence.' },
        { status: 403 },
      )
    }

    const url = getGoogleOAuthUrl()
    return NextResponse.redirect(url)
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
