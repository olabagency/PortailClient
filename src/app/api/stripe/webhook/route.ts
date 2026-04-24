import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import Stripe from 'stripe'

// POST /api/stripe/webhook — traiter les events Stripe
export async function POST(request: NextRequest) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Missing signature or webhook secret' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('[stripe/webhook] Signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = createAdminClient()

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string
        const status = subscription.status
        const firstItem = subscription.items.data[0]
        const priceId = firstItem?.price.id
        const currentPeriodEnd = firstItem?.current_period_end
          ? new Date(firstItem.current_period_end * 1000).toISOString()
          : null
        const trialEnd = subscription.trial_end
          ? new Date(subscription.trial_end * 1000).toISOString()
          : null

        let plan = 'free'
        if (priceId === process.env.STRIPE_PRO_PRICE_ID) plan = 'pro'
        else if (priceId === process.env.STRIPE_AGENCY_PRICE_ID) plan = 'agency'

        const isActive = ['active', 'trialing'].includes(status)

        await supabase
          .from('profiles')
          .update({
            plan: isActive ? plan : 'free',
            stripe_subscription_id: subscription.id,
            stripe_subscription_status: status,
            stripe_current_period_end: currentPeriodEnd,
            trial_ends_at: trialEnd,
          })
          .eq('stripe_customer_id', customerId)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        await supabase
          .from('profiles')
          .update({
            plan: 'free',
            stripe_subscription_status: 'canceled',
            stripe_subscription_id: null,
            trial_ends_at: null,
          })
          .eq('stripe_customer_id', customerId)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string

        await supabase
          .from('profiles')
          .update({ stripe_subscription_status: 'past_due' })
          .eq('stripe_customer_id', customerId)
        break
      }

      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.supabase_user_id
        const customerId = session.customer as string

        if (userId) {
          await supabase
            .from('profiles')
            .update({ stripe_customer_id: customerId })
            .eq('id', userId)
        }
        break
      }

      default:
        break
    }
  } catch (err) {
    console.error('[stripe/webhook] Handler error:', err)
    return NextResponse.json({ error: 'Webhook handler error' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
