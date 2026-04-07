'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { ClientModal } from '@/components/dashboard/ClientModal'
import {
  ArrowLeft, Pencil, Mail, Phone, Building2, FolderKanban, Plus, Calendar,
  Globe, CreditCard, MapPin, Receipt,
} from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

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
  projects: Project[]
}

interface Project {
  id: string
  name: string
  status: string
  public_id: string
  created_at: string
}

const statusLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  active: { label: 'Actif', variant: 'default' },
  paused: { label: 'En pause', variant: 'secondary' },
  completed: { label: 'Terminé', variant: 'outline' },
  archived: { label: 'Archivé', variant: 'secondary' },
}

function nullToUndefined<T extends string>(v: T | null | undefined): T | undefined {
  return v ?? undefined
}

export default function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [client, setClient] = useState<Client | null>(null)
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)

  useEffect(() => {
    fetch(`/api/clients/${id}`)
      .then(r => r.json())
      .then(({ data }) => { setClient(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="space-y-6 max-w-3xl">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 rounded-lg" />
        <Skeleton className="h-32 rounded-lg" />
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

  const clientType = client.client_type ?? 'company'
  const hasBilling = !!(client.billing_name || client.billing_email || client.vat_number || client.address || client.city)

  const billingAddress = [
    client.address,
    [client.zip_code, client.city].filter(Boolean).join(' '),
    client.country !== 'France' ? client.country : null,
  ].filter(Boolean).join(', ')

  return (
    <div className="space-y-6 max-w-3xl">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold">{client.name}</h1>
              <Badge variant={clientTypeVariants[clientType]}>
                {clientTypeLabels[clientType]}
              </Badge>
            </div>
            {client.company && (
              <p className="text-sm text-muted-foreground">{client.company}</p>
            )}
          </div>
        </div>
        <Button variant="outline" onClick={() => setEditOpen(true)}>
          <Pencil className="h-4 w-4 mr-2" />
          Modifier
        </Button>
      </div>

      {/* Coordonnées */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Coordonnées</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {client.email && (
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
              <a href={`mailto:${client.email}`} className="hover:underline text-primary">{client.email}</a>
            </div>
          )}
          {client.phone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
              <a href={`tel:${client.phone}`} className="hover:underline">{client.phone}</a>
            </div>
          )}
          {client.company && (
            <div className="flex items-center gap-2 text-sm">
              <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
              <span>{client.company}</span>
            </div>
          )}
          {client.website && (
            <div className="flex items-center gap-2 text-sm">
              <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
              <a href={client.website} target="_blank" rel="noopener noreferrer" className="hover:underline text-primary truncate">
                {client.website.replace(/^https?:\/\//, '')}
              </a>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4 shrink-0" />
            <span>Client depuis le {format(new Date(client.created_at), 'd MMMM yyyy', { locale: fr })}</span>
          </div>

          {client.notes && (
            <>
              <Separator />
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{client.notes}</p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Facturation */}
      {hasBilling && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Receipt className="h-4 w-4 text-muted-foreground" />
              Facturation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {client.billing_name && (
              <div className="flex items-center gap-2 text-sm">
                <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="font-medium">{client.billing_name}</span>
              </div>
            )}
            {client.billing_email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                <a href={`mailto:${client.billing_email}`} className="hover:underline text-primary">
                  {client.billing_email}
                </a>
              </div>
            )}
            {client.vat_number && (
              <div className="flex items-center gap-2 text-sm">
                <CreditCard className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">{client.vat_number}</span>
              </div>
            )}
            {billingAddress && (
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <span className="text-muted-foreground">{billingAddress}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Projets */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">
            Projets ({client.projects?.length ?? 0})
          </CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={() => router.push(`/dashboard/projects/new?client=${client.id}`)}
          >
            <Plus className="h-4 w-4 mr-1" />
            Nouveau projet
          </Button>
        </CardHeader>
        <CardContent>
          {!client.projects?.length ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Aucun projet pour ce client.
            </p>
          ) : (
            <div className="space-y-2">
              {client.projects.map((project) => {
                const status = statusLabels[project.status] ?? { label: project.status, variant: 'secondary' as const }
                return (
                  <div
                    key={project.id}
                    className="flex items-center justify-between p-3 rounded-md border hover:bg-accent cursor-pointer transition-colors"
                    onClick={() => router.push(`/dashboard/projects/${project.id}`)}
                  >
                    <div className="flex items-center gap-2">
                      <FolderKanban className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{project.name}</span>
                    </div>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <ClientModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSuccess={(updated) => {
          setClient(prev => prev ? { ...prev, ...updated } : prev)
          setEditOpen(false)
        }}
        initialData={client ? {
          ...client,
          email: nullToUndefined(client.email),
          phone: nullToUndefined(client.phone),
          company: nullToUndefined(client.company),
          notes: nullToUndefined(client.notes),
          website: nullToUndefined(client.website),
          client_type: client.client_type ?? 'company',
          billing_name: nullToUndefined(client.billing_name),
          billing_email: nullToUndefined(client.billing_email),
          vat_number: nullToUndefined(client.vat_number),
          address: nullToUndefined(client.address),
          city: nullToUndefined(client.city),
          zip_code: nullToUndefined(client.zip_code),
          country: client.country ?? 'France',
        } : undefined}
        mode="edit"
      />
    </div>
  )
}
