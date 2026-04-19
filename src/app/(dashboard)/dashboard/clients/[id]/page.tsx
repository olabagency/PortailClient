'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ArrowLeft, Pencil, Mail, Phone, Building2, FolderKanban, Plus, Calendar,
  Globe, CreditCard, MapPin, Receipt, ChevronRight, X, Check, Link2,
  Share2, ShieldCheck, ShieldOff,
} from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'

type ClientType = 'individual' | 'company' | 'agency' | 'startup' | 'association' | 'other'

const clientTypeLabels: Record<ClientType, string> = {
  individual: 'Particulier',
  company: 'Entreprise',
  agency: 'Agence',
  startup: 'Startup',
  association: 'Association',
  other: 'Autre',
}

const clientTypeVariants: Record<ClientType, 'default' | 'secondary' | 'outline'> = {
  individual: 'secondary',
  company: 'default',
  agency: 'default',
  startup: 'default',
  association: 'secondary',
  other: 'outline',
}

const clientTypeOptions: { value: ClientType; label: string }[] = [
  { value: 'individual',   label: 'Particulier' },
  { value: 'company',      label: 'Entreprise' },
  { value: 'agency',       label: 'Agence' },
  { value: 'startup',      label: 'Startup' },
  { value: 'association',  label: 'Association' },
  { value: 'other',        label: 'Autre' },
]

interface Client {
  id: string
  name: string
  email: string | null
  phone: string | null
  company: string | null
  notes: string | null
  website: string | null
  client_type: ClientType | null
  billing_name: string | null
  billing_email: string | null
  vat_number: string | null
  address: string | null
  city: string | null
  zip_code: string | null
  country: string | null
  created_at: string
  user_id: string | null
  projects: Project[]
}

interface Project {
  id: string
  name: string
  status: string
  color: string | null
  public_id: string
  created_at: string
}

// Form state shapes — all strings so inputs stay controlled
interface CoordonneesForm {
  name: string
  email: string
  phone: string
  company: string
  website: string
  client_type: ClientType
}

interface FacturationForm {
  billing_name: string
  billing_email: string
  vat_number: string
  address: string
  city: string
  zip_code: string
  country: string
}

const statusLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive'; dot: string }> = {
  active:    { label: 'Actif',    variant: 'default',   dot: 'bg-emerald-500' },
  paused:    { label: 'En pause', variant: 'secondary', dot: 'bg-amber-400' },
  completed: { label: 'Terminé',  variant: 'outline',   dot: 'bg-gray-400' },
  archived:  { label: 'Archivé',  variant: 'secondary', dot: 'bg-gray-300' },
}

function getInitials(name: string): string {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

function getAvatarColor(name: string): string {
  const colors = [
    'bg-primary/15 text-primary',
    'bg-blue-100 text-blue-700',
    'bg-emerald-100 text-emerald-700',
    'bg-violet-100 text-violet-700',
    'bg-amber-100 text-amber-700',
    'bg-rose-100 text-rose-700',
    'bg-teal-100 text-teal-700',
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

function clientToCoordonneesForm(client: Client): CoordonneesForm {
  return {
    name:        client.name,
    email:       client.email ?? '',
    phone:       client.phone ?? '',
    company:     client.company ?? '',
    website:     client.website ?? '',
    client_type: client.client_type ?? 'company',
  }
}

function clientToFacturationForm(client: Client): FacturationForm {
  return {
    billing_name:  client.billing_name ?? '',
    billing_email: client.billing_email ?? '',
    vat_number:    client.vat_number ?? '',
    address:       client.address ?? '',
    city:          client.city ?? '',
    zip_code:      client.zip_code ?? '',
    country:       client.country ?? 'France',
  }
}

export default function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()

  const [client, setClient]   = useState<Client | null>(null)
  const [loading, setLoading] = useState(true)

  // Edit mode flags
  const [editingCoordonnees, setEditingCoordonnees] = useState(false)
  const [editingFacturation, setEditingFacturation] = useState(false)

  // Form state
  const [coordonneesForm, setCoordonneesForm] = useState<CoordonneesForm | null>(null)
  const [facturationForm, setFacturationForm] = useState<FacturationForm | null>(null)

  // Saving state
  const [savingCoordonnees, setSavingCoordonnees] = useState(false)
  const [savingFacturation, setSavingFacturation] = useState(false)

  // Error state
  const [errorCoordonnees, setErrorCoordonnees] = useState<string | null>(null)
  const [errorFacturation, setErrorFacturation] = useState<string | null>(null)

  // Portal access
  const [invitingPortal, setInvitingPortal] = useState(false)
  const [revokeOpen, setRevokeOpen] = useState(false)
  const [revoking, setRevoking] = useState(false)

  async function handleInvitePortal() {
    if (!client) return
    const projectId = client.projects?.[0]?.id
    if (!projectId) { toast.error('Liez d\'abord un projet à ce client.'); return }
    setInvitingPortal(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/invite-portal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: client.email }),
      })
      if (res.ok) toast.success(`Invitation envoyée à ${client.email}`)
      else { const j = await res.json() as { error?: string }; toast.error(j.error ?? 'Erreur') }
    } catch { toast.error('Erreur réseau') } finally { setInvitingPortal(false) }
  }

  async function handleRevokeAccess() {
    if (!client) return
    setRevoking(true)
    try {
      const res = await fetch(`/api/clients/${client.id}/portal-access`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Accès portail révoqué')
        setRevokeOpen(false)
        setClient(prev => prev ? { ...prev, user_id: null } : prev)
      } else { const j = await res.json() as { error?: string }; toast.error(j.error ?? 'Erreur') }
    } catch { toast.error('Erreur réseau') } finally { setRevoking(false) }
  }

  // Link project
  const [linkProjectOpen, setLinkProjectOpen] = useState(false)
  const [projectsList, setProjectsList] = useState<{ id: string; name: string; color: string | null; status: string }[]>([])
  const [projectSearch, setProjectSearch] = useState('')
  const [linkingProject, setLinkingProject] = useState(false)

  async function openLinkProjectDialog() {
    setProjectSearch('')
    setLinkProjectOpen(true)
    const res = await fetch('/api/projects')
    if (res.ok) {
      const json = await res.json() as { data: { id: string; name: string; color: string | null; status: string; client_id: string | null }[] }
      // Afficher les projets sans client OU déjà liés à ce client
      setProjectsList((json.data ?? []).filter(p => !p.client_id || p.client_id === id))
    }
  }

  async function handleLinkProject(projectId: string) {
    setLinkingProject(true)
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: id }),
      })
      if (res.ok) {
        toast.success('Projet lié au client')
        setLinkProjectOpen(false)
        // Refresh client data
        const r = await fetch(`/api/clients/${id}`)
        const { data } = await r.json() as { data: Client }
        setClient(data)
      } else {
        const json = await res.json() as { error?: string }
        toast.error(json.error ?? 'Erreur lors de la liaison')
      }
    } catch { toast.error('Erreur réseau') } finally { setLinkingProject(false) }
  }

  useEffect(() => {
    fetch(`/api/clients/${id}`)
      .then(r => r.json())
      .then(({ data }) => { setClient(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [id])

  // --- Handlers: Coordonnées ---

  const startEditCoordonnees = () => {
    if (!client) return
    setCoordonneesForm(clientToCoordonneesForm(client))
    setErrorCoordonnees(null)
    setEditingCoordonnees(true)
  }

  const cancelEditCoordonnees = () => {
    setEditingCoordonnees(false)
    setCoordonneesForm(null)
    setErrorCoordonnees(null)
  }

  const saveCoordonnees = async () => {
    if (!client || !coordonneesForm) return
    setSavingCoordonnees(true)
    setErrorCoordonnees(null)
    try {
      const res = await fetch(`/api/clients/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(coordonneesForm),
      })
      const json = await res.json()
      if (!res.ok) {
        setErrorCoordonnees(json.error ?? 'Une erreur est survenue.')
        return
      }
      setClient(prev => prev ? { ...prev, ...json.data } : prev)
      setEditingCoordonnees(false)
      setCoordonneesForm(null)
    } catch {
      setErrorCoordonnees('Erreur réseau. Veuillez réessayer.')
    } finally {
      setSavingCoordonnees(false)
    }
  }

  // --- Handlers: Facturation ---

  const startEditFacturation = () => {
    if (!client) return
    setFacturationForm(clientToFacturationForm(client))
    setErrorFacturation(null)
    setEditingFacturation(true)
  }

  const cancelEditFacturation = () => {
    setEditingFacturation(false)
    setFacturationForm(null)
    setErrorFacturation(null)
  }

  const saveFacturation = async () => {
    if (!client || !facturationForm) return
    setSavingFacturation(true)
    setErrorFacturation(null)
    try {
      const res = await fetch(`/api/clients/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(facturationForm),
      })
      const json = await res.json()
      if (!res.ok) {
        setErrorFacturation(json.error ?? 'Une erreur est survenue.')
        return
      }
      setClient(prev => prev ? { ...prev, ...json.data } : prev)
      setEditingFacturation(false)
      setFacturationForm(null)
    } catch {
      setErrorFacturation('Erreur réseau. Veuillez réessayer.')
    } finally {
      setSavingFacturation(false)
    }
  }

  // --- Loading / Not found ---

  if (loading) {
    return (
      <div className="space-y-6 max-w-4xl">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
    )
  }

  if (!client) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-muted-foreground">Client introuvable.</p>
        <Button variant="link" onClick={() => router.push('/dashboard/clients')}>
          Retour aux clients
        </Button>
      </div>
    )
  }

  // Derived display values (always from latest client state)
  const clientType = client.client_type ?? 'company'
  const billingAddress = [
    client.address,
    [client.zip_code, client.city].filter(Boolean).join(' '),
    client.country && client.country !== 'France' ? client.country : null,
  ].filter(Boolean).join(', ')

  const initials    = getInitials(client.name)
  const avatarClass = getAvatarColor(client.name)

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Breadcrumb */}
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour aux clients
      </button>

      {/* Hero */}
      <div className="bg-white rounded-xl border border-border overflow-hidden shadow-sm">
        <div className="h-1.5 w-full bg-primary/20" />
        <div className="px-6 py-5 flex items-start gap-4 flex-wrap">
          <div className={`h-14 w-14 rounded-full flex items-center justify-center text-xl font-bold shrink-0 ${avatarClass}`}>
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <h1 className="text-2xl font-bold tracking-tight">{client.name}</h1>
              <Badge variant={clientTypeVariants[clientType]}>{clientTypeLabels[clientType]}</Badge>
            </div>
            <div className="flex items-center gap-3 flex-wrap text-sm text-muted-foreground">
              {client.company && (
                <span className="flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5" />
                  {client.company}
                </span>
              )}
              {client.email && (
                <a href={`mailto:${client.email}`} className="flex items-center gap-1 hover:text-primary transition-colors">
                  <Mail className="h-3.5 w-3.5" />
                  {client.email}
                </a>
              )}
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                Client depuis {format(new Date(client.created_at), 'MMM yyyy', { locale: fr })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Coordonnées ── */}
      <Card className="bg-white">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Coordonnées
            </CardTitle>
            {!editingCoordonnees && (
              <button
                onClick={startEditCoordonnees}
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                aria-label="Modifier les coordonnées"
              >
                <Pencil className="h-4 w-4" />
              </button>
            )}
          </div>
        </CardHeader>

        <CardContent>
          {editingCoordonnees && coordonneesForm ? (
            /* ── Edit mode ── */
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="coord-name">Nom *</Label>
                  <Input
                    id="coord-name"
                    value={coordonneesForm.name}
                    onChange={e => setCoordonneesForm(f => f ? { ...f, name: e.target.value } : f)}
                    placeholder="Nom du client"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="coord-email">Email</Label>
                  <Input
                    id="coord-email"
                    type="email"
                    value={coordonneesForm.email}
                    onChange={e => setCoordonneesForm(f => f ? { ...f, email: e.target.value } : f)}
                    placeholder="email@exemple.com"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="coord-phone">Téléphone</Label>
                  <Input
                    id="coord-phone"
                    value={coordonneesForm.phone}
                    onChange={e => setCoordonneesForm(f => f ? { ...f, phone: e.target.value } : f)}
                    placeholder="+33 6 00 00 00 00"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="coord-company">Société</Label>
                  <Input
                    id="coord-company"
                    value={coordonneesForm.company}
                    onChange={e => setCoordonneesForm(f => f ? { ...f, company: e.target.value } : f)}
                    placeholder="Nom de la société"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="coord-website">Site web</Label>
                  <Input
                    id="coord-website"
                    value={coordonneesForm.website}
                    onChange={e => setCoordonneesForm(f => f ? { ...f, website: e.target.value } : f)}
                    placeholder="https://exemple.com"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="coord-type">Type de client</Label>
                  <Select
                    value={coordonneesForm.client_type}
                    onValueChange={val => setCoordonneesForm(f => f ? { ...f, client_type: val as ClientType } : f)}
                  >
                    <SelectTrigger id="coord-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {clientTypeOptions.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {errorCoordonnees && (
                <p className="text-sm text-destructive">{errorCoordonnees}</p>
              )}

              <div className="flex items-center gap-2 pt-1">
                <Button size="sm" onClick={saveCoordonnees} disabled={savingCoordonnees || !coordonneesForm.name.trim()}>
                  <Check className="h-3.5 w-3.5 mr-1.5" />
                  {savingCoordonnees ? 'Enregistrement…' : 'Sauvegarder'}
                </Button>
                <Button size="sm" variant="ghost" onClick={cancelEditCoordonnees} disabled={savingCoordonnees}>
                  <X className="h-3.5 w-3.5 mr-1" />
                  Annuler
                </Button>
              </div>
            </div>
          ) : (
            /* ── Read mode ── */
            <div className="space-y-2.5">
              {client.email ? (
                <div className="flex items-center gap-2.5 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                  <a href={`mailto:${client.email}`} className="hover:underline text-primary">{client.email}</a>
                </div>
              ) : null}
              {client.phone ? (
                <div className="flex items-center gap-2.5 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                  <a href={`tel:${client.phone}`} className="hover:underline">{client.phone}</a>
                </div>
              ) : null}
              {client.company ? (
                <div className="flex items-center gap-2.5 text-sm">
                  <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>{client.company}</span>
                </div>
              ) : null}
              {client.website ? (
                <div className="flex items-center gap-2.5 text-sm">
                  <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
                  <a href={client.website} target="_blank" rel="noopener noreferrer" className="hover:underline text-primary truncate">
                    {client.website.replace(/^https?:\/\//, '')}
                  </a>
                </div>
              ) : null}
              {!client.email && !client.phone && !client.company && !client.website && (
                <p className="text-sm text-muted-foreground italic">Aucune coordonnée renseignée.</p>
              )}
              {client.notes && (
                <>
                  <Separator />
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{client.notes}</p>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Facturation ── */}
      <Card className="bg-white">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              Facturation
            </CardTitle>
            {!editingFacturation && (
              <button
                onClick={startEditFacturation}
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                aria-label="Modifier les informations de facturation"
              >
                <Pencil className="h-4 w-4" />
              </button>
            )}
          </div>
        </CardHeader>

        <CardContent>
          {editingFacturation && facturationForm ? (
            /* ── Edit mode ── */
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="fact-billing-name">Nom de facturation</Label>
                  <Input
                    id="fact-billing-name"
                    value={facturationForm.billing_name}
                    onChange={e => setFacturationForm(f => f ? { ...f, billing_name: e.target.value } : f)}
                    placeholder="Raison sociale ou nom complet"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="fact-billing-email">Email de facturation</Label>
                  <Input
                    id="fact-billing-email"
                    type="email"
                    value={facturationForm.billing_email}
                    onChange={e => setFacturationForm(f => f ? { ...f, billing_email: e.target.value } : f)}
                    placeholder="facturation@exemple.com"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="fact-vat">Numéro de TVA</Label>
                  <Input
                    id="fact-vat"
                    value={facturationForm.vat_number}
                    onChange={e => setFacturationForm(f => f ? { ...f, vat_number: e.target.value } : f)}
                    placeholder="FR00000000000"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="fact-address">Adresse</Label>
                  <Input
                    id="fact-address"
                    value={facturationForm.address}
                    onChange={e => setFacturationForm(f => f ? { ...f, address: e.target.value } : f)}
                    placeholder="1 rue de la Paix"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="fact-city">Ville</Label>
                  <Input
                    id="fact-city"
                    value={facturationForm.city}
                    onChange={e => setFacturationForm(f => f ? { ...f, city: e.target.value } : f)}
                    placeholder="Paris"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="fact-zip">Code postal</Label>
                  <Input
                    id="fact-zip"
                    value={facturationForm.zip_code}
                    onChange={e => setFacturationForm(f => f ? { ...f, zip_code: e.target.value } : f)}
                    placeholder="75001"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="fact-country">Pays</Label>
                  <Input
                    id="fact-country"
                    value={facturationForm.country}
                    onChange={e => setFacturationForm(f => f ? { ...f, country: e.target.value } : f)}
                    placeholder="France"
                  />
                </div>
              </div>

              {errorFacturation && (
                <p className="text-sm text-destructive">{errorFacturation}</p>
              )}

              <div className="flex items-center gap-2 pt-1">
                <Button size="sm" onClick={saveFacturation} disabled={savingFacturation}>
                  <Check className="h-3.5 w-3.5 mr-1.5" />
                  {savingFacturation ? 'Enregistrement…' : 'Sauvegarder'}
                </Button>
                <Button size="sm" variant="ghost" onClick={cancelEditFacturation} disabled={savingFacturation}>
                  <X className="h-3.5 w-3.5 mr-1" />
                  Annuler
                </Button>
              </div>
            </div>
          ) : (
            /* ── Read mode ── */
            <div className="space-y-2.5">
              {client.billing_name ? (
                <div className="flex items-center gap-2.5 text-sm">
                  <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="font-medium">{client.billing_name}</span>
                </div>
              ) : null}
              {client.billing_email ? (
                <div className="flex items-center gap-2.5 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                  <a href={`mailto:${client.billing_email}`} className="hover:underline text-primary">
                    {client.billing_email}
                  </a>
                </div>
              ) : null}
              {client.vat_number ? (
                <div className="flex items-center gap-2.5 text-sm">
                  <CreditCard className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">{client.vat_number}</span>
                </div>
              ) : null}
              {billingAddress ? (
                <div className="flex items-start gap-2.5 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <span className="text-muted-foreground">{billingAddress}</span>
                </div>
              ) : null}
              {!client.billing_name && !client.billing_email && !client.vat_number && !billingAddress && (
                <p className="text-sm text-muted-foreground italic">Aucune information de facturation renseignée.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Accès portail client ── */}
      <Card className="bg-white">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              Accès portail client
            </CardTitle>
            <div className="flex items-center gap-2">
              {client.user_id ? (
                <>
                  <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-1 font-medium">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Accès actif
                  </span>
                  <Button size="sm" variant="outline" className="gap-1.5 h-8" disabled={invitingPortal} onClick={handleInvitePortal}>
                    <Share2 className="h-3.5 w-3.5" />
                    {invitingPortal ? 'Envoi...' : 'Renvoyer l\'invitation'}
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1.5 h-8 text-amber-600 border-amber-200 hover:bg-amber-50" onClick={() => setRevokeOpen(true)}>
                    <ShieldOff className="h-3.5 w-3.5" />
                    Révoquer
                  </Button>
                </>
              ) : (
                <>
                  <span className="inline-flex items-center gap-1.5 text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-full px-2.5 py-1 font-medium">
                    <span className="h-1.5 w-1.5 rounded-full bg-gray-300" />
                    Pas d&apos;accès
                  </span>
                  {client.email && (
                    <Button size="sm" variant="outline" className="gap-1.5 h-8" disabled={invitingPortal} onClick={handleInvitePortal}>
                      <Share2 className="h-3.5 w-3.5" />
                      {invitingPortal ? 'Envoi...' : 'Envoyer une invitation'}
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-xs text-muted-foreground">
            {client.user_id
              ? 'Ce client peut se connecter à son espace de suivi de projet.'
              : client.email
                ? 'Envoyez une invitation par email pour donner accès au portail client.'
                : 'Ajoutez un email à ce client pour pouvoir l\'inviter.'}
          </p>
        </CardContent>
      </Card>

      {/* ── Projets (read-only) ── */}
      <Card className="bg-white">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Projets ({client.projects?.length ?? 0})
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              className="text-muted-foreground hover:text-foreground"
              onClick={openLinkProjectDialog}
            >
              <Link2 className="h-3.5 w-3.5 mr-1" />
              Lier un projet
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => router.push(`/dashboard/projects/new?client=${client.id}`)}
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Nouveau projet
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!client.projects?.length ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <FolderKanban className="h-8 w-8 text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">Aucun projet pour ce client.</p>
              <Button
                size="sm"
                variant="link"
                className="mt-1"
                onClick={() => router.push(`/dashboard/projects/new?client=${client.id}`)}
              >
                Créer un projet
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {client.projects.map((project) => {
                const status = statusLabels[project.status] ?? { label: project.status, variant: 'secondary' as const, dot: 'bg-gray-400' }
                return (
                  <div
                    key={project.id}
                    className="group flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/20 hover:bg-accent/30 cursor-pointer transition-all overflow-hidden"
                    onClick={() => router.push(`/dashboard/projects/${project.id}`)}
                  >
                    <div
                      className="w-1 h-8 rounded-full shrink-0"
                      style={{ backgroundColor: project.color ?? '#386FA4' }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium group-hover:text-primary transition-colors truncate">{project.name}</p>
                    </div>
                    <Badge variant={status.variant} className="flex items-center gap-1 text-xs shrink-0">
                      <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                      {status.label}
                    </Badge>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Dialog révocation portail ── */}
      <AlertDialog open={revokeOpen} onOpenChange={setRevokeOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Révoquer l&apos;accès portail ?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-semibold">{client.name}</span> ne pourra plus se connecter à son espace client.
              Vous pourrez lui renvoyer une invitation à tout moment.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={revoking}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleRevokeAccess} disabled={revoking}
              className="bg-amber-600 text-white hover:bg-amber-700">
              {revoking ? 'Révocation...' : 'Révoquer l\'accès'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Dialog lier un projet ── */}
      <Dialog open={linkProjectOpen} onOpenChange={setLinkProjectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lier un projet existant</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <Input
              placeholder="Rechercher un projet..."
              value={projectSearch}
              onChange={e => setProjectSearch(e.target.value)}
              autoFocus
            />
            <div className="max-h-64 overflow-y-auto divide-y rounded-lg border">
              {projectsList
                .filter(p => p.name.toLowerCase().includes(projectSearch.toLowerCase()))
                .map(p => (
                  <button
                    key={p.id}
                    disabled={linkingProject}
                    onClick={() => handleLinkProject(p.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent text-left transition-colors"
                  >
                    <div
                      className="h-8 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: p.color ?? '#386FA4' }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{statusLabels[p.status]?.label ?? p.status}</p>
                    </div>
                    {client.projects?.some(cp => cp.id === p.id) && (
                      <span className="text-xs text-emerald-600 font-medium shrink-0">Déjà lié</span>
                    )}
                  </button>
                ))}
              {projectsList.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">Aucun projet disponible</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
