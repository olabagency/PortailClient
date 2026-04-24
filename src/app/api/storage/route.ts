import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { APP_CONFIG } from '@/config/app.config'

// GET /api/storage — usage global du compte (tous projets confondus)
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
    const planConfig = APP_CONFIG.plans[plan]
    const maxBytes = planConfig.maxStorageGB * 1024 * 1024 * 1024

    const { data: projects } = await supabase
      .from('projects')
      .select('id')
      .eq('user_id', user.id)

    const projectIds = ((projects ?? []) as { id: string }[]).map(p => p.id)
    let usedBytes = 0

    if (projectIds.length > 0) {
      const { data: docs } = await supabase
        .from('project_documents')
        .select('size_bytes')
        .in('project_id', projectIds)
        .eq('type', 'file')
      usedBytes = ((docs ?? []) as { size_bytes: number | null }[])
        .reduce((sum, d) => sum + (d.size_bytes ?? 0), 0)
    }

    return NextResponse.json({
      data: {
        used_bytes: usedBytes,
        max_bytes: maxBytes,
        plan,
        plan_name: planConfig.name,
        max_storage_gb: planConfig.maxStorageGB,
      }
    })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
