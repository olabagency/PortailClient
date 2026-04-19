'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { APP_CONFIG } from '@/config/app.config'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  CheckCircle2, Zap, Building2, Crown, ArrowLeft, ExternalLink,
  Loader2, Info, CreditCard, AlertTriangle,
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
    priceLabel: 'Gratuit',
    period: 'mois',
    icon: <Zap className="h-5 w-5" />,
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    ringColor: 'ring-gray-300',
    accentColor: '#6B7280',
    priceId: null,
    features: [
      '1 projet à la fois',
      'Champs de formulaire illimités',
      '1 template enregistré',
      'Portail client public',
    ],
  },
  {
    key: 'pro',
    name: APP_CONFIG.plans.pro.name,
    price: '14',
    priceLabel: '14€',
    period: 'mois',
    icon: <Crown className="h-5 w-5" />,
    color: 'text-[#386FA4]',
    bgColor: 'bg-sky-50',
    borderColor: 'border-sky-200',
    ringColor: 'ring-[#386FA4]',
    accentColor: '#386FA4',
    priceId: APP_CONFIG.stripe.proPriceId,
    badge: `${APP_CONFIG.stripe.trialDays} jours offerts`,
    features: [
      'Projets illimités',
      '10 Go de stockage',
      'Messagerie client en direct',
      'Intégration Google Calendar & Meet',
      'Portail client + accès authentifié',
    ],
    recommended: true,
  },
  {
    key: 'agency',
    name: APP_CONFIG.plans.agency.name,
    price: '39',
    priceLabel: '39€',
    period: 'mois',
    icon: <Building2 className="h-5 w-5" />,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    ringColor: 'ring-purple-500',
    accentColor: '#9333EA',
    priceId: APP_CONFIG.stripe.agencyPriceId,
    features: [
      'Tout Pro inclus',
      '50 Go de stockage',
      'Gestion multi-comptes collaborateurs',
      'Tout illimité (projets, templates)',
    ],
  },
]

// ── Comparison table rows ────────────────────────────────────────────────────

type CellValue = boolean | string

interface ComparisonRow {
  category?: string   // optional section header
  label: string
  free: CellValue
  pro: CellValue
  agency: CellValue
}

const COMPARISON_ROWS: ComparisonRow[] = [
  { category: 'Projets & contenu', label: 'Projets simultanés',            free: '1',          pro: 'Illimités',   agency: 'Illimités' },
  {                                 label: 'Champs de formulaire',          free: 'Illimités',  pro: 'Illimités',   agency: 'Illimités' },
  {                                 label: 'Templates enregistrés',         free: '1',          pro: 'Illimités',   agency: 'Illimités' },
  { category: 'Portail client',     label: 'Portail public (sans compte)',  free: true,         pro: true,          agency: true },
  {                                 label: 'Portail authentifié (compte)',  free: true,         pro: true,          agency: true },
  {                                 label: 'Messagerie client en direct',   free: false,        pro: true,          agency: true },
  { category: 'Intégrations',       label: 'Google Calendar & Meet',       free: false,        pro: true,          agency: true },
  { category: 'Stockage',           label: 'Espace de stockage',           free: '1 Go',       pro: '10 Go',       agency: '50 Go' },
  { category: 'Équipe',             label: 'Gestion multi-comptes (chargé de projet)', free: false, pro: false, agency: true },
]

// ── Status config ─────────────────────────────────────────────────────────────

type StatusKey = 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid'

const STATUS_CONFIG: Record<StatusKey, {
  label: string
  badgeClass: string
  dotClass: string
}> = {
  active: {
    label: 'Actif ✓',
    badgeClass: 'bg-green-100 text-green-700 border-green-200',
    dotClass: 'bg-green-500',
  },
  trialing: {
    label: "Période d'essai",
    badgeClass: 'bg-blue-100 text-blue-700 border-blue-200',
    dotClass: 'bg-blue-500',
  },
  past_due: {
    label: 'Paiement en retard',
    badgeClass: 'bg-red-100 text-red-700 border-red-200',
    dotClass: 'bg-red-500',
  },
  canceled: {
    label: 'Annulé',
    badgeClass: 'bg-gray-100 text-gray-500 border-gray-200',
    dotClass: 'bg-gray-400',
  },
  unpaid: {
    label: 'Impayé',
    badgeClass: 'bg-red-100 text-red-700 border-red-200',
    dotClass: 'bg-red-500',
  },
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
      const json = await res.json() as { url?: string; error?: string }
      if (!res.ok) {
        toast.error(json.error ?? 'Erreur lors de la création du paiement')
        return
      }
      if (json.url) window.location.href = json.url
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
      const json = await res.json() as { url?: string; error?: string }
      if (!res.ok) {
        toast.error(json.error ?? "Erreur lors de l'ouverture du portail")
        return
      }
      if (json.url) window.location.href = json.url
    } catch {
      toast.error('Une erreur est survenue')
    } finally {
      setPortalLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-6 space-y-6">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-36 w-full rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-80 w-full rounded-xl" />)}
        </div>
      </div>
    )
  }

  const currentPlan = profile?.plan ?? 'free'
  const subscriptionStatus = profile?.stripe_subscription_status as StatusKey | null
  const statusConfig = subscriptionStatus ? STATUS_CONFIG[subscriptionStatus] : null
  const currentPlanData = PLANS.find(p => p.key === currentPlan) ?? PLANS[0]
  const isOnPaidPlan = currentPlan !== 'free'

  return (
    <div className="max-w-4xl mx-auto py-6 space-y-8">

      {/* ── En-tête ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/settings" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold">Abonnement & facturation</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Gérez votre plan et vos informations de paiement.</p>
        </div>
      </div>

      {/* ── Section 1 : Votre abonnement ────────────────────────────────── */}
      <div>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Votre abonnement</h2>
        <Card className="overflow-hidden">
          <div className="flex">
            {/* Accent bar */}
            <div className="w-1.5 shrink-0" style={{ backgroundColor: currentPlanData.accentColor }} />
            <CardContent className="p-6 flex-1">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">

                {/* Plan info */}
                <div className="space-y-3">
                  {/* Plan badge */}
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold border ${currentPlanData.bgColor} ${currentPlanData.color} ${currentPlanData.borderColor}`}
                    >
                      {currentPlanData.icon}
                      {currentPlanData.name}
                    </span>
                    {isOnPaidPlan && statusConfig && (
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${statusConfig.badgeClass}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${statusConfig.dotClass}`} />
                        {statusConfig.label}
                      </span>
                    )}
                  </div>

                  {/* Price */}
                  {isOnPaidPlan && (
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-foreground">{currentPlanData.price}€</span>
                      <span className="text-sm text-muted-foreground">/ mois</span>
                    </div>
                  )}

                  {/* Renewal / trial info */}
                  <div className="space-y-1">
                    {profile?.stripe_current_period_end && subscriptionStatus === 'active' && (
                      <p className="text-sm text-muted-foreground">
                        Renouvellement le{' '}
                        <span className="font-medium text-foreground">
                          {format(new Date(profile.stripe_current_period_end), 'd MMMM yyyy', { locale: fr })}
                        </span>
                      </p>
                    )}
                    {profile?.stripe_current_period_end && subscriptionStatus === 'canceled' && (
                      <p className="text-sm text-muted-foreground">
                        Accès jusqu'au{' '}
                        <span className="font-medium text-foreground">
                          {format(new Date(profile.stripe_current_period_end), 'd MMMM yyyy', { locale: fr })}
                        </span>
                      </p>
                    )}
                    {profile?.trial_ends_at && subscriptionStatus === 'trialing' && (
                      <p className="text-sm text-blue-600">
                        Essai jusqu'au{' '}
                        <span className="font-semibold">
                          {format(new Date(profile.trial_ends_at), 'd MMMM yyyy', { locale: fr })}
                        </span>
                      </p>
                    )}
                    {subscriptionStatus === 'past_due' && (
                      <div className="flex items-center gap-1.5 text-sm text-red-600">
                        <AlertTriangle className="h-4 w-4" />
                        Mettez à jour votre moyen de paiement pour continuer.
                      </div>
                    )}
                    {!isOnPaidPlan && (
                      <p className="text-sm text-muted-foreground">
                        Passez au plan Pro pour débloquer toutes les fonctionnalités.
                      </p>
                    )}
                  </div>
                </div>

                {/* CTA */}
                <div className="shrink-0 flex flex-col gap-2">
                  {profile?.stripe_subscription_id && (
                    <Button
                      variant="outline"
                      onClick={handlePortal}
                      disabled={portalLoading}
                      className="gap-2"
                    >
                      {portalLoading
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <ExternalLink className="h-4 w-4" />
                      }
                      Gérer mon abonnement
                    </Button>
                  )}
                  {!isOnPaidPlan && PLANS[1].priceId && (
                    <Button
                      onClick={() => handleCheckout(PLANS[1].priceId)}
                      disabled={!!checkoutLoading}
                      className="gap-2 bg-[#386FA4] hover:bg-[#2d5e8e] text-white"
                    >
                      {checkoutLoading === PLANS[1].priceId
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <Crown className="h-4 w-4" />
                      }
                      Passer au plan Pro
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </div>
        </Card>
      </div>

      {/* ── Section 2 : Tableau de comparaison ──────────────────────────── */}
      <div>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Comparer les plans</h2>

        <div className="rounded-2xl border border-border overflow-hidden shadow-sm bg-white">
          <table className="w-full border-collapse text-sm">

            {/* ─ En-têtes colonnes ─ */}
            <thead>
              <tr className="border-b border-border">
                {/* Colonne feature label */}
                <th className="w-[38%] p-0" />

                {PLANS.map(plan => {
                  const isCurrent = currentPlan === plan.key
                  const isLoading = checkoutLoading === plan.priceId
                  return (
                    <th
                      key={plan.key}
                      className={`w-[20.67%] px-4 pt-5 pb-4 text-center align-top border-l border-border ${
                        isCurrent ? plan.bgColor : plan.recommended ? 'bg-sky-50/40' : ''
                      }`}
                    >
                      {/* Badge */}
                      <div className="flex justify-center mb-2">
                        {isCurrent ? (
                          <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${plan.bgColor} ${plan.color} ${plan.borderColor}`}>
                            ✓ Votre forfait
                          </span>
                        ) : ('recommended' in plan && plan.recommended) ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#386FA4] text-white">
                            ⭐ Recommandé
                          </span>
                        ) : (
                          <span className="h-5" />
                        )}
                      </div>

                      {/* Icône + nom */}
                      <div className={`flex items-center justify-center gap-1.5 font-semibold mb-1 ${plan.color}`}>
                        {plan.icon}
                        <span>{plan.name}</span>
                      </div>

                      {/* Prix */}
                      <div className="mb-1">
                        {plan.key === 'free' ? (
                          <span className="text-xl font-bold text-foreground">Gratuit</span>
                        ) : plan.key === 'agency' ? (
                          <div>
                            <span className="text-xl font-bold text-foreground">39€</span>
                            <span className="text-xs text-muted-foreground"> / mois</span>
                            <p className="text-[10px] text-muted-foreground mt-0.5">+ 9€ / utilisateur supp.</p>
                          </div>
                        ) : (
                          <div>
                            <span className="text-xl font-bold text-foreground">{plan.price}€</span>
                            <span className="text-xs text-muted-foreground"> / mois</span>
                          </div>
                        )}
                      </div>

                      {'badge' in plan && plan.badge && (
                        <p className="text-[10px] text-[#386FA4] font-medium mb-2">✨ {plan.badge}</p>
                      )}

                      {/* CTA */}
                      <div className="mt-3 pb-1">
                        {!isCurrent && plan.priceId ? (
                          <Button
                            onClick={() => handleCheckout(plan.priceId)}
                            disabled={!!checkoutLoading}
                            className={`w-full h-8 text-xs ${plan.recommended ? 'bg-[#386FA4] hover:bg-[#2d5e8e] text-white' : ''}`}
                            variant={plan.recommended ? 'default' : 'outline'}
                            size="sm"
                          >
                            {isLoading
                              ? <><Loader2 className="h-3 w-3 mr-1.5 animate-spin" />Redirection...</>
                              : <>Choisir {plan.name}</>
                            }
                          </Button>
                        ) : isCurrent && plan.key !== 'free' ? (
                          <Button variant="outline" size="sm" onClick={handlePortal} disabled={portalLoading} className="w-full h-8 text-xs">
                            {portalLoading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : null}
                            Gérer
                          </Button>
                        ) : isCurrent ? (
                          <p className="text-[11px] text-muted-foreground py-1">Plan actuel</p>
                        ) : null}
                      </div>
                    </th>
                  )
                })}
              </tr>
            </thead>

            {/* ─ Lignes de fonctionnalités ─ */}
            <tbody>
              {COMPARISON_ROWS.map((row, i) => {
                const isLast = i === COMPARISON_ROWS.length - 1
                const prevCategory = i > 0 ? COMPARISON_ROWS[i - 1].category : undefined
                const showCategoryHeader = row.category && row.category !== prevCategory

                const renderCell = (value: CellValue, planKey: string) => {
                  const plan = PLANS.find(p => p.key === planKey)!
                  const isCurrent = currentPlan === planKey
                  const baseClass = `px-4 py-3 text-center border-l border-border ${isCurrent ? plan.bgColor : ('recommended' in plan && plan.recommended) ? 'bg-sky-50/20' : ''}`

                  if (typeof value === 'boolean') {
                    return (
                      <td key={planKey} className={baseClass}>
                        {value
                          ? <CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" />
                          : <span className="text-muted-foreground/40 text-base leading-none select-none mx-auto block">—</span>
                        }
                      </td>
                    )
                  }
                  return (
                    <td key={planKey} className={`${baseClass} font-medium text-foreground`}>
                      {value}
                    </td>
                  )
                }

                return (
                  <>
                    {showCategoryHeader && (
                      <tr key={`cat-${row.category}`}>
                        <td
                          colSpan={4}
                          className="px-5 pt-4 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 bg-muted/30 border-t border-border"
                        >
                          {row.category}
                        </td>
                      </tr>
                    )}
                    <tr
                      key={row.label}
                      className={`${!isLast ? 'border-b border-border/60' : ''} hover:bg-muted/20 transition-colors`}
                    >
                      <td className="px-5 py-3 text-sm text-foreground font-medium">
                        {row.label}
                      </td>
                      {renderCell(row.free, 'free')}
                      {renderCell(row.pro, 'pro')}
                      {renderCell(row.agency, 'agency')}
                    </tr>
                  </>
                )
              })}
            </tbody>
          </table>

          {/* ─ Stockage supplémentaire ─ */}
          <div className="border-t border-border bg-muted/30 px-5 py-3 flex items-center gap-3">
            <div className="h-6 w-6 rounded-lg bg-sky-100 flex items-center justify-center shrink-0">
              <Info className="h-3.5 w-3.5 text-sky-600" />
            </div>
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">Stockage supplémentaire</span>
              {' '}— 10€ / mois pour 50 Go supplémentaires (disponible sur les plans Pro et Agency).
            </p>
          </div>
        </div>
      </div>

      {/* ── Section 3 : Informations de facturation ──────────────────────── */}
      {profile?.stripe_customer_id && (
        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Informations de facturation</h2>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">ID client Stripe :</span>
                    <code className="text-sm font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-700">
                      ...{profile.stripe_customer_id.slice(-8)}
                    </code>
                  </div>
                  {profile.stripe_subscription_id && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground pl-6">Abonnement :</span>
                      <code className="text-sm font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-700">
                        ...{profile.stripe_subscription_id.slice(-8)}
                      </code>
                    </div>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handlePortal}
                  disabled={portalLoading}
                  className="text-sm text-muted-foreground hover:text-foreground gap-1.5 shrink-0"
                >
                  {portalLoading
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <ExternalLink className="h-3.5 w-3.5" />
                  }
                  Historique des factures
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Note de bas de page ──────────────────────────────────────────── */}
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
    <Suspense fallback={
      <div className="max-w-4xl mx-auto py-6 space-y-6">
        <div className="h-7 w-48 bg-gray-100 animate-pulse rounded" />
        <div className="h-36 w-full bg-gray-100 animate-pulse rounded-xl" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="h-80 bg-gray-100 animate-pulse rounded-xl" />)}
        </div>
      </div>
    }>
      <BillingContent />
    </Suspense>
  )
}
