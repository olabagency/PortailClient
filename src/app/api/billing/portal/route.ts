import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { APP_CONFIG } from '@/config/app.config'

// POST /api/billing/portal — ouvrir le portail de facturation Stripe
// Nécessite STRIPE_SECRET_KEY configuré dans les variables d'environnement
export async function POST() {
  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY ?? ''
    if (!stripeKey || stripeKey === 'REMPLIR') {
      return NextResponse.json({ error: 'Stripe non configuré' }, { status: 503 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single()

    const customerId = profile?.stripe_customer_id as string | null | undefined
    if (!customerId) {
      return NextResponse.json({ error: 'Aucun abonnement trouvé' }, { status: 400 })
    }

    // Import dynamique pour éviter les erreurs si Stripe n'est pas configuré
    const Stripe = (await import('stripe')).default
    const stripe = new Stripe(stripeKey, { apiVersion: '2024-12-18.acacia' as const })

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${APP_CONFIG.url}/dashboard/settings/billing`,
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('[billing/portal]', err)
    return NextResponse.json({ error: "Erreur lors de l'ouverture du portail" }, { status: 500 })
  }
}
