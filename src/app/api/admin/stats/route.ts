import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { stripe } from '@/lib/stripe'
import { APP_CONFIG } from '@/config/app.config'

export interface AdminUser {
  id: string
  email: string
  full_name: string | null
  plan: string
  account_type: string
  admin: boolean
  stripe_subscription_status: string | null
  trial_ends_at: string | null
  created_at: string
  project_count: number
  storage_used_bytes: number
  storage_max_bytes: number
}

export interface AdminStats {
  mrr_cents: number
  active_subscriptions: number
  total_freelances: number
  total_clients: number
  users: AdminUser[]
}

// GET /api/admin/stats
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { data: selfProfile } = await supabase
      .from('profiles')
      .select('admin')
      .eq('id', user.id)
      .single()

    if (!selfProfile?.admin) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const adminClient = createAdminClient()

    // Tous les profils
    const { data: profiles } = await adminClient
      .from('profiles')
      .select('id, email, full_name, plan, account_type, admin, stripe_subscription_status, trial_ends_at, created_at')
      .order('created_at', { ascending: false })

    // Projets par user
    const { data: projects } = await adminClient
      .from('projects')
      .select('id, user_id')

    // Stockage : tous les fichiers
    const { data: docs } = await adminClient
      .from('project_documents')
      .select('project_id, size_bytes')
      .eq('type', 'file')

    // Index projets → user
    const projectUserMap = new Map<string, string>()
    for (const p of (projects ?? [])) {
      projectUserMap.set(p.id as string, p.user_id as string)
    }

    // Projets count + stockage par user
    const projectCountMap = new Map<string, number>()
    const storageMap = new Map<string, number>()

    for (const p of (projects ?? [])) {
      const uid = p.user_id as string
      projectCountMap.set(uid, (projectCountMap.get(uid) ?? 0) + 1)
    }

    for (const d of (docs ?? [])) {
      const uid = projectUserMap.get(d.project_id as string)
      if (!uid) continue
      storageMap.set(uid, (storageMap.get(uid) ?? 0) + ((d.size_bytes as number) ?? 0))
    }

    // MRR depuis Stripe
    let mrrCents = 0
    let activeSubscriptions = 0

    try {
      let hasMore = true
      let startingAfter: string | undefined

      while (hasMore) {
        const subs = await stripe.subscriptions.list({
          status: 'active',
          limit: 100,
          ...(startingAfter ? { starting_after: startingAfter } : {}),
        })

        activeSubscriptions += subs.data.length

        for (const sub of subs.data) {
          for (const item of sub.items.data) {
            const amount = item.price.unit_amount ?? 0
            const qty = item.quantity ?? 1
            const interval = item.price.recurring?.interval
            const count = item.price.recurring?.interval_count ?? 1
            if (interval === 'month') mrrCents += Math.round((amount * qty) / count)
            else if (interval === 'year') mrrCents += Math.round((amount * qty) / count / 12)
          }
        }

        hasMore = subs.has_more
        if (hasMore && subs.data.length > 0) {
          startingAfter = subs.data[subs.data.length - 1].id
        }
      }
    } catch {
      // Stripe non configuré — on laisse MRR à 0
    }

    const users: AdminUser[] = ((profiles ?? []) as {
      id: string; email: string; full_name: string | null; plan: string;
      account_type: string; admin: boolean; stripe_subscription_status: string | null;
      trial_ends_at: string | null; created_at: string
    }[]).map((p) => {
      const plan = (p.plan ?? 'free') as keyof typeof APP_CONFIG.plans
      const planConfig = APP_CONFIG.plans[plan] ?? APP_CONFIG.plans.free
      return {
        id: p.id,
        email: p.email,
        full_name: p.full_name,
        plan: p.plan ?? 'free',
        account_type: p.account_type ?? 'freelance',
        admin: p.admin ?? false,
        stripe_subscription_status: p.stripe_subscription_status,
        trial_ends_at: p.trial_ends_at,
        created_at: p.created_at,
        project_count: projectCountMap.get(p.id) ?? 0,
        storage_used_bytes: storageMap.get(p.id) ?? 0,
        storage_max_bytes: planConfig.maxStorageGB * 1024 * 1024 * 1024,
      }
    })

    const totalFreelances = users.filter(u => u.account_type === 'freelance').length
    const totalClients = users.filter(u => u.account_type === 'client').length

    const stats: AdminStats = {
      mrr_cents: mrrCents,
      active_subscriptions: activeSubscriptions,
      total_freelances: totalFreelances,
      total_clients: totalClients,
      users,
    }

    return NextResponse.json({ data: stats })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
