'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { APP_CONFIG } from '@/config/app.config'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  CheckCircle2, Zap, Building2, Crown, ArrowLeft, ExternalLink, Loader2, Info,
} from 'lucide-react'
import Link from 'next/link'

// ── Types ────────────────────────────────────────────────────────────────────

interface BillingProfile {
  plan: string
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  stripe_subscription_status: string | null
  stripe_current_period_end: string | null
  trial_ends_at: string | null
}

// ── Plan cards data ───────────────────────────────────────────────────────────

const PLANS = [
  {
    key: 'free',
    name: APP_CONFIG.plans.free.name,
    price: '0',
    period: 'mois',
    icon: <Zap className="h-5 w-5" />,
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    priceId: null,
    features: [
      `${APP_CONFIG.plans.free.maxProjects} projets`,
      `${APP_CONFIG.plans.free.maxFormFields} champs de formulaire`,
      `${APP_CONFIG.plans.free.maxStorageGB} Go de stockage`,
      `${APP_CONFIG.plans.free.maxTemplates} template`,
      'Portail client public',
    ],
  },
  {
    key: 'pro',
    name: APP_CONFIG.plans.pro.name,
    price: '29',
    period: 'mois',
    icon: <Crown className="h-5 w-5" />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    priceId: APP_CONFIG.stripe.proPriceId,
    badge: `${APP_CONFIG.stripe.trialDays} jours offerts`,
    features: [
      'Projets illimités',
      'Champs illimités',
      `${APP_CONFIG.plans.pro.maxStorageGB} Go de stockage`,
      'Templates illimités',
      'Portail client + accès authentifié',
      'Email au client à chaque étape',
    ],
    recommended: true,
  },
  {
    key: 'agency',
    name: APP_CONFIG.plans.agency.name,
    price: '79',
    period: 'mois',
    icon: <Building2 className="h-5 w-5" />,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    priceId: APP_CONFIG.stripe.agencyPriceId,
    features: [
      'Tout Pro inclus',
      `${APP_CONFIG.plans.agency.maxStorageGB} Go de stockage`,
      'Multi-utilisateurs (bientôt)',
      'Support prioritaire',
    ],
  },
]

const PLAN_STATUS_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  active: { label: 'Actif', variant: 'default' },
  trialing: { label: 'Essai', variant: 'secondary' },
  past_due: { label: 'Paiement en retard', variant: 'destructive' },
  canceled: { label: 'Annulé', variant: 'destructive' },
  unpaid: { label: 'Impayé', variant: 'destructive' },
}

// ── Component ─────────────────────────────────────────────────────────────────

function BillingContent() {
  const [profile, setProfile] = useState<BillingProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null)
  const [portalLoading, setPortalLoading] = useState(false)

  const searchParams = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    if (searchParams.get('success') === '1') {
      toast.success('Abonnement activé ! Bienvenue sur le plan Pro.')
    } else if (searchParams.get('canceled') === '1') {
      toast.error('Paiement annulé.')
    }
  }, [searchParams])

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data } = await supabase
        .from('profiles')
        .select('plan, stripe_customer_id, stripe_subscription_id, stripe_subscription_status, stripe_current_period_end, trial_ends_at')
        .eq('id', user.id)
        .single()
      setProfile(data)
      setLoading(false)
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleCheckout(priceId: string | null) {
    if (!priceId) return
    setCheckoutLoading(priceId)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId }),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error ?? 'Erreur lors de la création du paiement')
        return
      }
      window.location.href = json.url
    } catch {
      toast.error('Une erreur est survenue')
    } finally {
      setCheckoutLoading(null)
    }
  }

  async function handlePortal() {
    setPortalLoading(true)
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error ?? 'Erreur lors de l\'ouverture du portail')
        return
      }
      window.location.href = json.url
    } catch {
      toast.error('Une erreur est survenue')
    } finally {
      setPortalLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto py-6 space-y-6">
        <Skeleton className="h-7 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-72 w-full rounded-xl" />)}
        </div>
      </div>
    )
  }

  const currentPlan = profile?.plan ?? 'free'
  const subscriptionStatus = profile?.stripe_subscription_status
  const statusInfo = subscriptionStatus ? PLAN_STATUS_LABELS[subscriptionStatus] : null

  return (
    <div className="max-w-3xl mx-auto py-6 space-y-6">
      {/* En-tête */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/settings" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold">Abonnement & facturation</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Gérez votre plan et vos informations de paiement.</p>
        </div>
      </div>

      {/* Plan actuel */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Plan actuel</p>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold capitalize">{currentPlan}</span>
                {statusInfo && (
                  <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                )}
              </div>
              {profile?.stripe_current_period_end && subscriptionStatus === 'active' && (
                <p className="text-xs text-muted-foreground mt-1">
                  Renouvellement le {format(new Date(profile.stripe_current_period_end), 'd MMMM yyyy', { locale: fr })}
                </p>
              )}
              {profile?.trial_ends_at && subscriptionStatus === 'trialing' && (
                <p className="text-xs text-blue-600 mt-1">
                  Essai jusqu'au {format(new Date(profile.trial_ends_at), 'd MMMM yyyy', { locale: fr })}
                </p>
              )}
            </div>
            {profile?.stripe_customer_id && (
              <Button
                variant="outline"
                size="sm"
                onClick={handlePortal}
                disabled={portalLoading}
              >
                {portalLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <ExternalLink className="h-4 w-4 mr-2" />
                )}
                Portail de facturation
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Plans */}
      <div>
        <h2 className="font-semibold text-sm text-muted-foreground mb-3 uppercase tracking-wide">Choisir un plan</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PLANS.map(plan => {
            const isCurrent = currentPlan === plan.key
            const isLoading = checkoutLoading === plan.priceId

            return (
              <div
                key={plan.key}
                className={`relative rounded-xl border-2 p-5 flex flex-col gap-4 transition-all ${
                  isCurrent
                    ? `${plan.borderColor} ${plan.bgColor}`
                    : plan.recommended
                    ? 'border-primary/30 hover:border-primary/60'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {plan.recommended && !isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
                      Recommandé
                    </span>
                  </div>
                )}
                {isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className={`${plan.bgColor} ${plan.color} border ${plan.borderColor} text-xs font-semibold px-3 py-1 rounded-full`}>
                      Plan actuel
                    </span>
                  </div>
                )}

                <div>
                  <div className={`flex items-center gap-2 mb-2 ${plan.color}`}>
                    {plan.icon}
                    <span className="font-semibold">{plan.name}</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold">{plan.price}€</span>
                    <span className="text-xs text-muted-foreground">/ {plan.period}</span>
                  </div>
                  {plan.badge && (
                    <p className="text-xs text-blue-600 font-medium mt-1">✨ {plan.badge}</p>
                  )}
                </div>

                <ul className="space-y-2 flex-1">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                      <span className="text-gray-700">{f}</span>
                    </li>
                  ))}
                </ul>

                {!isCurrent && plan.priceId && (
                  <Button
                    onClick={() => handleCheckout(plan.priceId)}
                    disabled={!!checkoutLoading}
                    className="w-full"
                    variant={plan.recommended ? 'default' : 'outline'}
                    size="sm"
                  >
                    {isLoading ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Redirection...</>
                    ) : (
                      <>Passer au plan {plan.name}</>
                    )}
                  </Button>
                )}
                {isCurrent && plan.key === 'free' && (
                  <p className="text-xs text-center text-muted-foreground">Votre plan actuel</p>
                )}
                {isCurrent && plan.key !== 'free' && (
                  <Button variant="outline" size="sm" onClick={handlePortal} disabled={portalLoading}>
                    {portalLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                    Gérer l'abonnement
                  </Button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Note */}
      <div className="flex items-start gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
        <Info className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
        <p className="text-xs text-gray-600">
          Paiement sécurisé via Stripe. Annulation possible à tout moment depuis le portail de facturation.
          Vos données restent accessibles même après l'annulation.
        </p>
      </div>
    </div>
  )
}

export default function BillingPage() {
  return (
    <Suspense fallback={<div className="max-w-3xl mx-auto py-6 space-y-4"><div className="h-7 w-48 bg-gray-100 animate-pulse rounded" /></div>}>
      <BillingContent />
    </Suspense>
  )
}
