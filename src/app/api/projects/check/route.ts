import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { APP_CONFIG } from '@/config/app.config'

// GET /api/projects/check — vérifie si l'utilisateur peut créer un nouveau projet
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

    const plan = (profile?.plan ?? 'free') as keyof typeof APP_CONFIG.plans
    const limit = APP_CONFIG.plans[plan].maxProjects

    let count = 0
    if (limit !== Infinity) {
      const { count: c } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
      count = c ?? 0
    }

    return NextResponse.json({
      plan,
      planName: APP_CONFIG.plans[plan].name,
      limit: limit === Infinity ? null : limit,
      count,
      allowed: limit === Infinity || count < limit,
    })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
