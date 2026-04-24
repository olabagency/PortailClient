import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'
import { APP_CONFIG } from '@/config/app.config'
import { z } from 'zod'

const checkoutSchema = z.object({
  priceId: z.string().min(1),
})

// POST /api/stripe/checkout — créer une session Stripe Checkout
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const body = await request.json()
    const parsed = checkoutSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id, plan, full_name')
      .eq('id', user.id)
      .single()

    let customerId = profile?.stripe_customer_id as string | null | undefined

    // Créer ou récupérer le customer Stripe
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email!,
        name: profile?.full_name ?? undefined,
        metadata: { supabase_user_id: user.id },
      })
      customerId = customer.id

      await supabase
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id)
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: parsed.data.priceId, quantity: 1 }],
      success_url: `${APP_CONFIG.url}/dashboard/account?tab=forfaits&success=1`,
      cancel_url: `${APP_CONFIG.url}/dashboard/account?tab=forfaits&canceled=1`,
      metadata: { supabase_user_id: user.id },
      subscription_data: {
        trial_period_days: APP_CONFIG.stripe.trialDays,
      },
      allow_promotion_codes: true,
      automatic_tax: { enabled: false },
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('[stripe/checkout]', err)
    return NextResponse.json({ error: 'Erreur lors de la création de la session' }, { status: 500 })
  }
}
