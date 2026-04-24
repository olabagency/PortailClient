'use client'

import { Fragment, Suspense, useEffect, useRef, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { APP_CONFIG } from '@/config/app.config'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  AlertTriangle,
  Building2,
  Calendar,
  CheckCircle2,
  Check,
  CreditCard,
  Crown,
  ExternalLink,
  Info,
  Loader2,
  Lock,
  Link2,
  Unlink,
  Upload,
  UserCircle2,
  Zap,
} from 'lucide-react'
import Link from 'next/link'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Profile {
  full_name: string | null
  email: string
  avatar_url: string | null
  plan: string
  company_name: string | null
  company_type: string | null
  company_siret: string | null
  company_vat: string | null
  company_address: string | null
  company_zip: string | null
  company_city: string | null
  company_website: string | null
  company_email: string | null
  logo_url: string | null
}

interface BillingProfile {
  plan: string
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  stripe_subscription_status: string | null
  stripe_current_period_end: string | null
  trial_ends_at: string | null
}

type CompanyType = 'freelance' | 'agency' | 'company' | 'other'

const COMPANY_TYPE_LABELS: Record<CompanyType, string> = {
  freelance: 'Freelance',
  agency: 'Agence',
  company: 'Entreprise',
  other: 'Autre',
}

// ---------------------------------------------------------------------------
// Billing constants
// ---------------------------------------------------------------------------

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
    accentColor: '#6B7280',
    priceId: null as string | null,
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
    period: 'mois',
    icon: <Crown className="h-5 w-5" />,
    color: 'text-[#386FA4]',
    bgColor: 'bg-sky-50',
    borderColor: 'border-sky-200',
    accentColor: '#386FA4',
    priceId: APP_CONFIG.stripe.proPriceId as string | null,
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
    period: 'mois',
    icon: <Building2 className="h-5 w-5" />,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    accentColor: '#9333EA',
    priceId: APP_CONFIG.stripe.agencyPriceId as string | null,
    features: [
      'Tout Pro inclus',
      '50 Go de stockage',
      'Gestion multi-comptes collaborateurs',
      'Tout illimité (projets, templates)',
    ],
  },
]

type CellValue = boolean | string
interface ComparisonRow {
  category?: string
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
  { category: 'Équipe',             label: 'Gestion multi-comptes',        free: false,        pro: false,         agency: true },
]

type StatusKey = 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid'
const STATUS_CONFIG: Record<StatusKey, { label: string; badgeClass: string; dotClass: string }> = {
  active:    { label: 'Actif ✓',                badgeClass: 'bg-green-100 text-green-700 border-green-200', dotClass: 'bg-green-500' },
  trialing:  { label: "Période d'essai",         badgeClass: 'bg-blue-100 text-blue-700 border-blue-200',   dotClass: 'bg-blue-500'  },
  past_due:  { label: 'Paiement en retard',      badgeClass: 'bg-red-100 text-red-700 border-red-200',      dotClass: 'bg-red-500'   },
  canceled:  { label: 'Annulé',                  badgeClass: 'bg-gray-100 text-gray-500 border-gray-200',   dotClass: 'bg-gray-400'  },
  unpaid:    { label: 'Impayé',                  badgeClass: 'bg-red-100 text-red-700 border-red-200',      dotClass: 'bg-red-500'   },
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getInitials(fullName: string | null, email: string | undefined): string {
  if (fullName) {
    return fullName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
  }
  return email?.[0]?.toUpperCase() ?? '?'
}

// ---------------------------------------------------------------------------
// Inner page (uses useSearchParams — must be wrapped in Suspense)
// ---------------------------------------------------------------------------

function AccountPageInner() {
  const { user } = useAuth()
  const supabase = createClient()
  const searchParams = useSearchParams()
  const router = useRouter()
  const defaultTab = searchParams.get('tab') ?? 'compte'

  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  // --- Section 1: Identité
  const [fullName, setFullName] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [savingIdentity, setSavingIdentity] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // --- Section Google Integration
  const [googleConnected, setGoogleConnected] = useState(false)
  const [googleEmail, setGoogleEmail] = useState<string | null>(null)
  const [disconnectingGoogle, setDisconnectingGoogle] = useState(false)

  // --- Section 2: Entreprise
  const [companyName, setCompanyName] = useState('')
  const [companyType, setCompanyType] = useState<CompanyType | ''>('')
  const [companySiret, setCompanySiret] = useState('')
  const [companyVat, setCompanyVat] = useState('')
  const [companyEmail, setCompanyEmail] = useState('')
  const [companyWebsite, setCompanyWebsite] = useState('')
  const [companyAddress, setCompanyAddress] = useState('')
  const [companyZip, setCompanyZip] = useState('')
  const [companyCity, setCompanyCity] = useState('')
  const [savingCompany, setSavingCompany] = useState(false)

  // --- Section 3: Billing
  const [billingProfile, setBillingProfile] = useState<BillingProfile | null>(null)
  const [billingLoading, setBillingLoading] = useState(true)
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null)
  const [portalLoading, setPortalLoading] = useState(false)

  // ---------------------------------------------------------------------------
  // Chargement du profil
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!user) return
    fetch('/api/profile')
      .then((r) => r.json())
      .then(({ data }: { data: Profile }) => {
        if (!data) return
        setProfile(data)
        setFullName(data.full_name ?? '')
        setLogoUrl(data.logo_url ?? null)
        setCompanyName(data.company_name ?? '')
        setCompanyType((data.company_type as CompanyType) ?? '')
        setCompanySiret(data.company_siret ?? '')
        setCompanyVat(data.company_vat ?? '')
        setCompanyEmail(data.company_email ?? '')
        setCompanyWebsite(data.company_website ?? '')
        setCompanyAddress(data.company_address ?? '')
        setCompanyZip(data.company_zip ?? '')
        setCompanyCity(data.company_city ?? '')
      })
      .finally(() => setLoading(false))

    fetch('/api/integrations/google/status')
      .then((r) => r.json())
      .then(({ connected, email }: { connected: boolean; email: string | null }) => {
        setGoogleConnected(connected)
        setGoogleEmail(email)
      })
      .catch(() => {})

    supabase.auth.getUser().then(async ({ data: { user: u } }) => {
      if (!u) return
      const { data } = await supabase
        .from('profiles')
        .select('plan, stripe_customer_id, stripe_subscription_id, stripe_subscription_status, stripe_current_period_end, trial_ends_at')
        .eq('id', u.id)
        .single()
      setBillingProfile(data)
      setBillingLoading(false)
    })
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const googleParam = searchParams.get('google')
    if (googleParam === 'connected') toast.success('Google Calendar connecté avec succès.')
    if (googleParam === 'error') toast.error('Impossible de connecter Google Calendar.')

    const success = searchParams.get('success')
    const canceled = searchParams.get('canceled')
    if (success === '1') toast.success('Abonnement activé ! Bienvenue sur le plan Pro.')
    if (canceled === '1') toast.error('Paiement annulé.')
  }, [searchParams])

  // ---------------------------------------------------------------------------
  // Google
  // ---------------------------------------------------------------------------

  async function handleGoogleDisconnect() {
    setDisconnectingGoogle(true)
    try {
      await fetch('/api/integrations/google/disconnect', { method: 'DELETE' })
      setGoogleConnected(false)
      setGoogleEmail(null)
      toast.success('Google Calendar déconnecté.')
    } catch {
      toast.error('Erreur lors de la déconnexion.')
    } finally {
      setDisconnectingGoogle(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Billing
  // ---------------------------------------------------------------------------

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
      if (!res.ok) { toast.error(json.error ?? 'Erreur lors de la création du paiement'); return }
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
      if (!res.ok) { toast.error(json.error ?? "Erreur lors de l'ouverture du portail"); return }
      if (json.url) window.location.href = json.url
    } catch {
      toast.error('Une erreur est survenue')
    } finally {
      setPortalLoading(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Compression image (Canvas → JPEG max 512px)
  // ---------------------------------------------------------------------------

  async function compressImage(file: File): Promise<File> {
    if (file.type === 'image/svg+xml') return file
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        const MAX = 512
        const scale = Math.min(1, MAX / Math.max(img.width, img.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        const ctx = canvas.getContext('2d')!
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        canvas.toBlob(
          blob => resolve(new File([blob!], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' })),
          'image/jpeg', 0.85
        )
      }
      img.src = URL.createObjectURL(file)
    })
  }

  // ---------------------------------------------------------------------------
  // Upload logo
  // ---------------------------------------------------------------------------

  async function handleLogoUpload(rawFile: File) {
    setUploadingLogo(true)
    try {
      const file = await compressImage(rawFile)
      const presignRes = await fetch('/api/profile/logo-presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, content_type: file.type, size: file.size }),
      })
      const presignJson = await presignRes.json()
      if (!presignRes.ok || !presignJson.data) {
        toast.error(presignJson.error ?? "Erreur lors de la préparation de l'upload.")
        return
      }
      const { uploadUrl, publicUrl } = presignJson.data as { uploadUrl: string; publicUrl: string }
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type, 'x-amz-acl': 'public-read' },
        body: file,
      })
      if (!uploadRes.ok) { toast.error("Erreur lors de l'upload."); return }
      const saveRes = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logo_url: publicUrl }),
      })
      const saveJson = await saveRes.json()
      if (!saveRes.ok) { toast.error(saveJson.error ?? 'Erreur sauvegarde.'); return }
      setLogoUrl(publicUrl)
      toast.success('Logo mis à jour.')
    } catch {
      toast.error('Une erreur est survenue.')
    } finally {
      setUploadingLogo(false)
    }
  }

  async function handleLogoDelete() {
    try {
      const res = await fetch('/api/profile/logo', { method: 'DELETE' })
      if (res.ok) { setLogoUrl(null); toast.success('Logo supprimé.') }
      else toast.error('Erreur lors de la suppression.')
    } catch { toast.error('Erreur réseau.') }
  }

  // ---------------------------------------------------------------------------
  // Sauvegarde identité
  // ---------------------------------------------------------------------------

  async function handleSaveIdentity(e: React.FormEvent) {
    e.preventDefault()
    setSavingIdentity(true)
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: fullName }),
      })
      const json = await res.json()
      if (!res.ok) toast.error(json.error ?? 'Erreur lors de la sauvegarde.')
      else toast.success('Profil mis à jour.')
    } catch {
      toast.error('Une erreur est survenue.')
    } finally {
      setSavingIdentity(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Changement de mot de passe
  // ---------------------------------------------------------------------------

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    if (newPassword.length < 8) { toast.error('Le mot de passe doit contenir au moins 8 caractères.'); return }
    setChangingPassword(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) toast.error('Erreur lors du changement de mot de passe.')
      else { toast.success('Mot de passe modifié.'); setNewPassword('') }
    } finally {
      setChangingPassword(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Sauvegarde entreprise
  // ---------------------------------------------------------------------------

  async function handleSaveCompany(e: React.FormEvent) {
    e.preventDefault()
    setSavingCompany(true)
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name: companyName || null,
          company_type: companyType || null,
          company_siret: companySiret || null,
          company_vat: companyVat || null,
          company_email: companyEmail || null,
          company_website: companyWebsite || null,
          company_address: companyAddress || null,
          company_zip: companyZip || null,
          company_city: companyCity || null,
        }),
      })
      const json = await res.json()
      if (!res.ok) toast.error(json.error ?? 'Erreur lors de la sauvegarde.')
      else toast.success('Informations entreprise mises à jour.')
    } catch {
      toast.error('Une erreur est survenue.')
    } finally {
      setSavingCompany(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Derived
  // ---------------------------------------------------------------------------

  const initials = getInitials(fullName || null, user?.email)
  const currentPlan = profile?.plan ?? billingProfile?.plan ?? 'free'
  const subscriptionStatus = billingProfile?.stripe_subscription_status as StatusKey | null
  const statusConfig = subscriptionStatus ? STATUS_CONFIG[subscriptionStatus] : null
  const currentPlanData = PLANS.find(p => p.key === currentPlan) ?? PLANS[0]
  const isOnPaidPlan = currentPlan !== 'free'

  // ---------------------------------------------------------------------------
  // Loading state
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="max-w-4xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Mon compte</h1>
          <p className="text-muted-foreground text-sm mt-1">Gérez votre profil, votre entreprise et vos préférences.</p>
        </div>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mon compte</h1>
        <p className="text-muted-foreground text-sm mt-1">Gérez votre profil, votre entreprise et vos préférences.</p>
      </div>

      <Tabs defaultValue={defaultTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="compte">
            <UserCircle2 className="h-4 w-4 mr-2" />
            Mon compte
          </TabsTrigger>
          <TabsTrigger value="entreprise">
            <Building2 className="h-4 w-4 mr-2" />
            Mon entreprise
          </TabsTrigger>
          <TabsTrigger value="forfaits">
            <CreditCard className="h-4 w-4 mr-2" />
            Forfait
          </TabsTrigger>
          <TabsTrigger value="integrations">
            <Calendar className="h-4 w-4 mr-2" />
            Intégrations
          </TabsTrigger>
        </TabsList>

        {/* ================================================================ */}
        {/* Tab 1 — Mon compte                                               */}
        {/* ================================================================ */}
        <TabsContent value="compte" className="space-y-6">
          <Card className="bg-white">
            <CardHeader>
              <div className="flex items-center gap-2">
                <UserCircle2 className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base">Identité</CardTitle>
              </div>
              <CardDescription>Vos informations personnelles et votre logo</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Logo upload */}
              <div className="flex items-center gap-5">
                <div className="relative shrink-0">
                  {logoUrl ? (
                    <img src={logoUrl} alt="Logo" className="h-[120px] w-[120px] rounded-xl object-cover border bg-muted" />
                  ) : (
                    <div className="h-[120px] w-[120px] rounded-xl bg-primary/10 border flex items-center justify-center">
                      <span className="text-3xl font-bold text-primary">{initials}</span>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Logo ou photo de profil</p>
                  <p className="text-xs text-muted-foreground">JPG, PNG, WebP ou SVG · 5 Mo max</p>
                  <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" size="sm" disabled={uploadingLogo} onClick={() => fileInputRef.current?.click()}>
                      {uploadingLogo ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Upload className="mr-2 h-3.5 w-3.5" />}
                      {uploadingLogo ? 'Upload...' : 'Choisir une image'}
                    </Button>
                    {logoUrl && (
                      <Button type="button" variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={handleLogoDelete}>
                        Supprimer
                      </Button>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/svg+xml"
                    className="hidden"
                    onChange={(e) => { const file = e.target.files?.[0]; if (file) handleLogoUpload(file); e.target.value = '' }}
                  />
                </div>
              </div>

              <Separator />

              {/* Nom + email */}
              <form onSubmit={handleSaveIdentity} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Nom complet</Label>
                  <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jean Dupont" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" value={user?.email ?? ''} disabled className="bg-muted text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">Pour changer d&apos;email, contactez le support.</p>
                </div>
                <div className="flex justify-end">
                  <Button type="submit" disabled={savingIdentity}>
                    {savingIdentity && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {savingIdentity ? 'Enregistrement...' : 'Sauvegarder'}
                  </Button>
                </div>
              </form>

              <Separator />

              {/* Mot de passe */}
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <p className="text-sm font-medium mb-1">Mot de passe</p>
                  <p className="text-xs text-muted-foreground mb-3">Choisissez un nouveau mot de passe d&apos;au moins 8 caractères.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">Nouveau mot de passe</Label>
                  <Input id="newPassword" type="password" placeholder="8 caractères minimum" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" />
                </div>
                <div className="flex justify-end">
                  <Button type="submit" variant="outline" disabled={changingPassword || !newPassword}>
                    {changingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {changingPassword ? 'Modification...' : 'Changer le mot de passe'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================================================================ */}
        {/* Tab 2 — Mon entreprise                                           */}
        {/* ================================================================ */}
        <TabsContent value="entreprise" className="space-y-6">
          <Card className="bg-white">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base">Mon entreprise</CardTitle>
              </div>
              <CardDescription>Ces informations apparaissent sur vos devis et factures.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveCompany} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Raison sociale</Label>
                    <Input id="companyName" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Mon Entreprise SAS" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="companyType">Type</Label>
                    <Select value={companyType} onValueChange={(v: string) => setCompanyType(v as CompanyType)}>
                      <SelectTrigger id="companyType"><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                      <SelectContent>
                        {(Object.entries(COMPANY_TYPE_LABELS) as [CompanyType, string][]).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="companySiret">SIRET</Label>
                    <Input id="companySiret" value={companySiret} onChange={(e) => setCompanySiret(e.target.value)} placeholder="123 456 789 00012" maxLength={14} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="companyVat">N° TVA intracommunautaire</Label>
                    <Input id="companyVat" value={companyVat} onChange={(e) => setCompanyVat(e.target.value)} placeholder="FR 12 345678901" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="companyEmail">Email de facturation</Label>
                    <Input id="companyEmail" type="email" value={companyEmail} onChange={(e) => setCompanyEmail(e.target.value)} placeholder="compta@monentreprise.fr" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="companyWebsite">Site web</Label>
                    <Input id="companyWebsite" type="url" value={companyWebsite} onChange={(e) => setCompanyWebsite(e.target.value)} placeholder="https://monentreprise.fr" />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="companyAddress">Adresse</Label>
                    <Input id="companyAddress" value={companyAddress} onChange={(e) => setCompanyAddress(e.target.value)} placeholder="12 rue de la Paix" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="companyZip">Code postal</Label>
                    <Input id="companyZip" value={companyZip} onChange={(e) => setCompanyZip(e.target.value)} placeholder="75001" maxLength={10} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="companyCity">Ville</Label>
                    <Input id="companyCity" value={companyCity} onChange={(e) => setCompanyCity(e.target.value)} placeholder="Paris" />
                  </div>
                </div>
                <div className="flex justify-end pt-1">
                  <Button type="submit" disabled={savingCompany}>
                    {savingCompany && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {savingCompany ? 'Enregistrement...' : 'Sauvegarder'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================================================================ */}
        {/* Tab 3 — Forfait                                                  */}
        {/* ================================================================ */}
        <TabsContent value="forfaits" className="space-y-8">
          {billingLoading ? (
            <div className="space-y-6">
              <Skeleton className="h-36 w-full rounded-xl" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-80 w-full rounded-xl" />)}
              </div>
            </div>
          ) : (
            <>
              {/* ── Votre abonnement ─────────────────────────────────── */}
              <div>
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Votre abonnement</h2>
                <Card className="overflow-hidden">
                  <div className="flex">
                    <div className="w-1.5 shrink-0" style={{ backgroundColor: currentPlanData.accentColor }} />
                    <CardContent className="p-6 flex-1">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold border ${currentPlanData.bgColor} ${currentPlanData.color} ${currentPlanData.borderColor}`}>
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
                          {isOnPaidPlan && (
                            <div className="flex items-baseline gap-1">
                              <span className="text-2xl font-bold">{currentPlanData.price}€</span>
                              <span className="text-sm text-muted-foreground">/ mois</span>
                            </div>
                          )}
                          <div className="space-y-1">
                            {billingProfile?.stripe_current_period_end && subscriptionStatus === 'active' && (
                              <p className="text-sm text-muted-foreground">
                                Renouvellement le{' '}
                                <span className="font-medium text-foreground">
                                  {format(new Date(billingProfile.stripe_current_period_end), 'd MMMM yyyy', { locale: fr })}
                                </span>
                              </p>
                            )}
                            {billingProfile?.stripe_current_period_end && subscriptionStatus === 'canceled' && (
                              <p className="text-sm text-muted-foreground">
                                Accès jusqu&apos;au{' '}
                                <span className="font-medium text-foreground">
                                  {format(new Date(billingProfile.stripe_current_period_end), 'd MMMM yyyy', { locale: fr })}
                                </span>
                              </p>
                            )}
                            {billingProfile?.trial_ends_at && subscriptionStatus === 'trialing' && (
                              <p className="text-sm text-blue-600">
                                Essai jusqu&apos;au{' '}
                                <span className="font-semibold">
                                  {format(new Date(billingProfile.trial_ends_at), 'd MMMM yyyy', { locale: fr })}
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
                              <p className="text-sm text-muted-foreground">Passez au plan Pro pour débloquer toutes les fonctionnalités.</p>
                            )}
                          </div>
                        </div>
                        <div className="shrink-0 flex flex-col gap-2">
                          {billingProfile?.stripe_subscription_id && (
                            <Button variant="outline" onClick={handlePortal} disabled={portalLoading} className="gap-2">
                              {portalLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                              Gérer mon abonnement
                            </Button>
                          )}
                          {!isOnPaidPlan && PLANS[1].priceId && (
                            <Button onClick={() => handleCheckout(PLANS[1].priceId)} disabled={!!checkoutLoading} className="gap-2 bg-[#386FA4] hover:bg-[#2d5e8e] text-white">
                              {checkoutLoading === PLANS[1].priceId ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crown className="h-4 w-4" />}
                              Passer au plan Pro
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </div>
                </Card>
              </div>

              {/* ── Comparer les plans ───────────────────────────────── */}
              <div>
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Comparer les plans</h2>
                <div className="rounded-2xl border border-border overflow-hidden shadow-sm bg-white">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="w-[38%] p-0" />
                        {PLANS.map(plan => {
                          const isCurrent = currentPlan === plan.key
                          const isLoading = checkoutLoading === plan.priceId
                          return (
                            <th
                              key={plan.key}
                              className={`w-[20.67%] px-4 pt-5 pb-4 text-center align-top border-l border-border ${isCurrent ? plan.bgColor : ('recommended' in plan && plan.recommended) ? 'bg-sky-50/40' : ''}`}
                            >
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
                              <div className={`flex items-center justify-center gap-1.5 font-semibold mb-1 ${plan.color}`}>
                                {plan.icon}
                                <span>{plan.name}</span>
                              </div>
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
                              <div className="mt-3 pb-1">
                                {!isCurrent && plan.priceId ? (
                                  <Button
                                    onClick={() => handleCheckout(plan.priceId)}
                                    disabled={!!checkoutLoading}
                                    className={`w-full h-8 text-xs ${('recommended' in plan && plan.recommended) ? 'bg-[#386FA4] hover:bg-[#2d5e8e] text-white' : ''}`}
                                    variant={('recommended' in plan && plan.recommended) ? 'default' : 'outline'}
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
                          return <td key={planKey} className={`${baseClass} font-medium text-foreground`}>{value}</td>
                        }

                        return (
                          <Fragment key={row.label}>
                            {showCategoryHeader && (
                              <tr>
                                <td colSpan={4} className="px-5 pt-4 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 bg-muted/30 border-t border-border">
                                  {row.category}
                                </td>
                              </tr>
                            )}
                            <tr className={`${!isLast ? 'border-b border-border/60' : ''} hover:bg-muted/20 transition-colors`}>
                              <td className="px-5 py-3 text-sm text-foreground font-medium">{row.label}</td>
                              {renderCell(row.free, 'free')}
                              {renderCell(row.pro, 'pro')}
                              {renderCell(row.agency, 'agency')}
                            </tr>
                          </Fragment>
                        )
                      })}
                    </tbody>
                  </table>
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

              {/* ── Informations de facturation ──────────────────────── */}
              {billingProfile?.stripe_customer_id && (
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
                              ...{billingProfile.stripe_customer_id.slice(-8)}
                            </code>
                          </div>
                          {billingProfile.stripe_subscription_id && (
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground pl-6">Abonnement :</span>
                              <code className="text-sm font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-700">
                                ...{billingProfile.stripe_subscription_id.slice(-8)}
                              </code>
                            </div>
                          )}
                        </div>
                        <Button variant="ghost" size="sm" onClick={handlePortal} disabled={portalLoading} className="text-sm text-muted-foreground hover:text-foreground gap-1.5 shrink-0">
                          {portalLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ExternalLink className="h-3.5 w-3.5" />}
                          Historique des factures
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* ── Note de bas de page ──────────────────────────────── */}
              <div className="flex items-start gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                <Info className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
                <p className="text-xs text-gray-600">
                  Paiement sécurisé via Stripe. Annulation possible à tout moment depuis le portail de facturation.
                  Vos données restent accessibles même après l&apos;annulation.
                </p>
              </div>
            </>
          )}
        </TabsContent>

        {/* ================================================================ */}
        {/* Tab 4 — Intégrations                                             */}
        {/* ================================================================ */}
        <TabsContent value="integrations" className="space-y-6">
          <Card className="bg-white">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base">Google Calendar &amp; Meet</CardTitle>
              </div>
              <CardDescription>
                Synchronisez vos réunions avec Google Calendar et générez automatiquement des liens Google Meet.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {currentPlan === 'free' ? (
                <div className="flex flex-col items-center gap-3 py-6 text-center">
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                    <Lock className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="font-medium text-sm">Fonctionnalité réservée aux plans Pro et Agence</p>
                  <p className="text-sm text-muted-foreground max-w-xs">
                    Passez au plan Pro pour synchroniser vos réunions avec Google Calendar et créer des liens Meet automatiquement.
                  </p>
                  <Button size="sm" className="mt-1" onClick={() => router.push('/dashboard/account?tab=forfaits')}>
                    <Crown className="mr-2 h-3.5 w-3.5" />
                    Passer au Plan Pro — 14€ / mois
                  </Button>
                </div>
              ) : googleConnected ? (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                      <Check className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Compte Google connecté</p>
                      <p className="text-xs text-muted-foreground">{googleEmail}</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleGoogleDisconnect} disabled={disconnectingGoogle} className="text-red-600 border-red-200 hover:bg-red-50">
                    {disconnectingGoogle ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Unlink className="mr-2 h-3.5 w-3.5" />}
                    Déconnecter
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <p className="font-medium text-sm">Google Calendar non connecté</p>
                    <p className="text-xs text-muted-foreground">
                      Connectez votre compte Google pour synchroniser vos réunions et créer des liens Meet.
                    </p>
                  </div>
                  <a href="/api/integrations/google/connect">
                    <Button size="sm" className="shrink-0 bg-[#386FA4] hover:bg-[#133C55]">
                      <Link2 className="mr-2 h-3.5 w-3.5" />
                      Connecter Google
                    </Button>
                  </a>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page export (wrap inner with Suspense for useSearchParams)
// ---------------------------------------------------------------------------

export default function AccountPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-4xl space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Mon compte</h1>
            <p className="text-muted-foreground text-sm mt-1">Gérez votre profil, votre entreprise et vos préférences.</p>
          </div>
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </div>
      }
    >
      <AccountPageInner />
    </Suspense>
  )
}
