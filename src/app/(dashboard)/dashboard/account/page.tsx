'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
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
import {
  Loader2,
  Upload,
  Building2,
  UserCircle2,
  CreditCard,
  Check,
  Zap,
  Crown,
  ExternalLink,
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

type CompanyType = 'freelance' | 'agency' | 'company' | 'other'

const COMPANY_TYPE_LABELS: Record<CompanyType, string> = {
  freelance: 'Freelance',
  agency: 'Agence',
  company: 'Entreprise',
  other: 'Autre',
}

// ---------------------------------------------------------------------------
// Plan definitions
// ---------------------------------------------------------------------------

const PLAN_CARDS = [
  {
    key: 'free',
    name: 'Gratuit',
    price: '0',
    period: 'mois',
    icon: Zap,
    iconColor: 'text-gray-500',
    cardClass: 'border-gray-200',
    badgeVariant: 'secondary' as const,
    features: [
      `${APP_CONFIG.plans.free.maxProjects} projets`,
      `${APP_CONFIG.plans.free.maxStorageGB} Go de stockage`,
      `${APP_CONFIG.plans.free.maxFormFields} champs de formulaire`,
      `${APP_CONFIG.plans.free.maxTemplates} template`,
      'Portail client public',
    ],
  },
  {
    key: 'pro',
    name: 'Pro',
    price: '14',
    period: 'mois',
    icon: Zap,
    iconColor: 'text-primary',
    cardClass: 'border-primary ring-2 ring-primary/20',
    badgeVariant: 'default' as const,
    features: [
      'Projets illimités',
      '10 Go de stockage',
      'Champs de formulaire illimités',
      'Templates illimités',
      'Messagerie client',
      'Google Calendar / Meet',
    ],
    highlighted: true,
  },
  {
    key: 'agency',
    name: 'Agence',
    price: '39',
    period: 'mois',
    icon: Crown,
    iconColor: 'text-purple-600',
    cardClass: 'border-purple-200',
    badgeVariant: 'outline' as const,
    features: [
      'Tout le plan Pro',
      '50 Go de stockage',
      'Multi-comptes',
      'Branding personnalisé',
      'Support prioritaire',
    ],
  },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getInitials(fullName: string | null, email: string | undefined): string {
  if (fullName) {
    return fullName
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
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
  }, [user])

  // ---------------------------------------------------------------------------
  // Upload logo
  // ---------------------------------------------------------------------------

  async function handleLogoUpload(file: File) {
    setUploadingLogo(true)
    try {
      const presignRes = await fetch('/api/profile/logo-presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          content_type: file.type,
          size: file.size,
        }),
      })
      const presignJson = await presignRes.json()
      if (!presignRes.ok || !presignJson.data) {
        toast.error(presignJson.error ?? "Erreur lors de la préparation de l'upload.")
        return
      }

      const { uploadUrl, publicUrl } = presignJson.data as {
        uploadUrl: string
        publicUrl: string
        key: string
      }

      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      })
      if (!uploadRes.ok) {
        toast.error("Erreur lors de l'upload du logo.")
        return
      }

      const saveRes = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logo_url: publicUrl }),
      })
      const saveJson = await saveRes.json()
      if (!saveRes.ok) {
        toast.error(saveJson.error ?? 'Erreur lors de la sauvegarde du logo.')
        return
      }

      setLogoUrl(publicUrl)
      toast.success('Logo mis à jour.')
    } catch {
      toast.error('Une erreur est survenue.')
    } finally {
      setUploadingLogo(false)
    }
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
      if (!res.ok) {
        toast.error(json.error ?? 'Erreur lors de la sauvegarde.')
      } else {
        toast.success('Profil mis à jour.')
      }
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
    if (newPassword.length < 8) {
      toast.error('Le mot de passe doit contenir au moins 8 caractères.')
      return
    }
    setChangingPassword(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) {
        toast.error('Erreur lors du changement de mot de passe.')
      } else {
        toast.success('Mot de passe modifié.')
        setNewPassword('')
      }
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
      if (!res.ok) {
        toast.error(json.error ?? 'Erreur lors de la sauvegarde.')
      } else {
        toast.success('Informations entreprise mises à jour.')
      }
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
  const currentPlan = profile?.plan ?? 'free'

  // ---------------------------------------------------------------------------
  // Loading state
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="max-w-4xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Mon compte</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gérez votre profil, votre entreprise et vos préférences.
          </p>
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
      {/* En-tête */}
      <div>
        <h1 className="text-2xl font-bold">Mon compte</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Gérez votre profil, votre entreprise et vos préférences.
        </p>
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
            Forfaits
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
                    <img
                      src={logoUrl}
                      alt="Logo"
                      className="h-[120px] w-[120px] rounded-xl object-cover border bg-muted"
                    />
                  ) : (
                    <div className="h-[120px] w-[120px] rounded-xl bg-primary/10 border flex items-center justify-center">
                      <span className="text-3xl font-bold text-primary">{initials}</span>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Logo ou photo de profil</p>
                  <p className="text-xs text-muted-foreground">JPG, PNG, WebP ou SVG · 5 Mo max</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={uploadingLogo}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {uploadingLogo ? (
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Upload className="mr-2 h-3.5 w-3.5" />
                    )}
                    {uploadingLogo ? 'Upload en cours...' : 'Choisir une image'}
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/svg+xml"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleLogoUpload(file)
                      e.target.value = ''
                    }}
                  />
                </div>
              </div>

              <Separator />

              {/* Nom + email */}
              <form onSubmit={handleSaveIdentity} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Nom complet</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Jean Dupont"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    value={user?.email ?? ''}
                    disabled
                    className="bg-muted text-muted-foreground"
                  />
                  <p className="text-xs text-muted-foreground">
                    Pour changer d&apos;email, contactez le support.
                  </p>
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
                  <p className="text-xs text-muted-foreground mb-3">
                    Choisissez un nouveau mot de passe d&apos;au moins 8 caractères.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">Nouveau mot de passe</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    placeholder="8 caractères minimum"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                </div>
                <div className="flex justify-end">
                  <Button
                    type="submit"
                    variant="outline"
                    disabled={changingPassword || !newPassword}
                  >
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
              <CardDescription>
                Ces informations apparaissent sur vos devis et factures.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveCompany} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Raison sociale */}
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Raison sociale</Label>
                    <Input
                      id="companyName"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Mon Entreprise SAS"
                    />
                  </div>

                  {/* Type */}
                  <div className="space-y-2">
                    <Label htmlFor="companyType">Type</Label>
                    <Select
                      value={companyType}
                      onValueChange={(v) => setCompanyType(v as CompanyType)}
                    >
                      <SelectTrigger id="companyType">
                        <SelectValue placeholder="Sélectionner..." />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.entries(COMPANY_TYPE_LABELS) as [CompanyType, string][]).map(
                          ([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* SIRET */}
                  <div className="space-y-2">
                    <Label htmlFor="companySiret">SIRET</Label>
                    <Input
                      id="companySiret"
                      value={companySiret}
                      onChange={(e) => setCompanySiret(e.target.value)}
                      placeholder="123 456 789 00012"
                      maxLength={14}
                    />
                  </div>

                  {/* N° TVA */}
                  <div className="space-y-2">
                    <Label htmlFor="companyVat">N° TVA intracommunautaire</Label>
                    <Input
                      id="companyVat"
                      value={companyVat}
                      onChange={(e) => setCompanyVat(e.target.value)}
                      placeholder="FR 12 345678901"
                    />
                  </div>

                  {/* Email facturation */}
                  <div className="space-y-2">
                    <Label htmlFor="companyEmail">Email de facturation</Label>
                    <Input
                      id="companyEmail"
                      type="email"
                      value={companyEmail}
                      onChange={(e) => setCompanyEmail(e.target.value)}
                      placeholder="compta@monentreprise.fr"
                    />
                  </div>

                  {/* Site web */}
                  <div className="space-y-2">
                    <Label htmlFor="companyWebsite">Site web</Label>
                    <Input
                      id="companyWebsite"
                      type="url"
                      value={companyWebsite}
                      onChange={(e) => setCompanyWebsite(e.target.value)}
                      placeholder="https://monentreprise.fr"
                    />
                  </div>

                  {/* Adresse — pleine largeur */}
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="companyAddress">Adresse</Label>
                    <Input
                      id="companyAddress"
                      value={companyAddress}
                      onChange={(e) => setCompanyAddress(e.target.value)}
                      placeholder="12 rue de la Paix"
                    />
                  </div>

                  {/* Code postal */}
                  <div className="space-y-2">
                    <Label htmlFor="companyZip">Code postal</Label>
                    <Input
                      id="companyZip"
                      value={companyZip}
                      onChange={(e) => setCompanyZip(e.target.value)}
                      placeholder="75001"
                      maxLength={10}
                    />
                  </div>

                  {/* Ville */}
                  <div className="space-y-2">
                    <Label htmlFor="companyCity">Ville</Label>
                    <Input
                      id="companyCity"
                      value={companyCity}
                      onChange={(e) => setCompanyCity(e.target.value)}
                      placeholder="Paris"
                    />
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
        {/* Tab 3 — Forfaits                                                 */}
        {/* ================================================================ */}
        <TabsContent value="forfaits" className="space-y-6">
          {/* Bannière upgrade pour les utilisateurs gratuits */}
          {currentPlan === 'free' && (
            <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
              <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-6">
                <div className="space-y-1">
                  <p className="font-semibold text-base">Passez au plan Pro</p>
                  <p className="text-sm text-muted-foreground">
                    Débloquez des projets illimités, plus de stockage et toutes les fonctionnalités.
                  </p>
                </div>
                <Link href="/dashboard/settings/billing">
                  <Button size="sm" className="shrink-0">
                    Passer au Pro
                    <ExternalLink className="ml-2 h-3.5 w-3.5" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Plan actuel */}
          <div className="flex items-center gap-3 px-1">
            <p className="text-sm text-muted-foreground">
              Votre plan actuel :
            </p>
            <Badge variant={currentPlan === 'free' ? 'secondary' : 'default'} className="capitalize">
              {APP_CONFIG.plans[currentPlan as keyof typeof APP_CONFIG.plans]?.name ?? 'Gratuit'}
            </Badge>
            {currentPlan !== 'free' && (
              <Link href="/dashboard/settings/billing" className="ml-auto">
                <Button variant="outline" size="sm">
                  Gérer l&apos;abonnement
                  <ExternalLink className="ml-2 h-3.5 w-3.5" />
                </Button>
              </Link>
            )}
          </div>

          {/* Cards de plans */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PLAN_CARDS.map((plan) => {
              const PlanIcon = plan.icon
              const isCurrentPlan = currentPlan === plan.key
              return (
                <Card
                  key={plan.key}
                  className={`relative bg-white ${plan.cardClass} ${isCurrentPlan ? 'shadow-md' : ''}`}
                >
                  {isCurrentPlan && (
                    <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                      <Badge className="text-[10px] px-2 py-0.5">Plan actuel</Badge>
                    </div>
                  )}
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2 mb-1">
                      <PlanIcon className={`h-5 w-5 ${plan.iconColor}`} />
                      <CardTitle className="text-base">{plan.name}</CardTitle>
                    </div>
                    <div className="flex items-end gap-1">
                      <span className="text-2xl font-bold">{plan.price}€</span>
                      <span className="text-sm text-muted-foreground mb-0.5">/{plan.period}</span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ul className="space-y-2">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2 text-sm">
                          <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                    {!isCurrentPlan && (
                      <Link href="/dashboard/settings/billing" className="block">
                        <Button
                          variant={plan.highlighted ? 'default' : 'outline'}
                          size="sm"
                          className="w-full"
                        >
                          {plan.key === 'free' ? 'Rester gratuit' : `Choisir ${plan.name}`}
                        </Button>
                      </Link>
                    )}
                    {isCurrentPlan && (
                      <Button variant="outline" size="sm" className="w-full" disabled>
                        Plan actuel
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
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
            <p className="text-muted-foreground text-sm mt-1">
              Gérez votre profil, votre entreprise et vos préférences.
            </p>
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
