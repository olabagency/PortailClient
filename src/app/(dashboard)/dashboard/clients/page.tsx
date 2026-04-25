'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { ClientModal } from '@/components/dashboard/ClientModal'
import {
  Plus, Search, MoreHorizontal, Pencil, Trash2, Eye,
  Users, FolderOpen, Mail, Phone, Globe, MapPin,
  Building2, User, TrendingUp,
} from 'lucide-react'
import { useDebounce } from '@/hooks/useDebounce'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

type ClientType = 'individual' | 'company' | 'agency' | 'startup' | 'association' | 'other'

interface Client {
  id: string
  name: string
  email: string | null
  phone: string | null
  company: string | null
  notes: string | null
  client_type: ClientType | null
  website: string | null
  city: string | null
  country: string | null
  address: string | null
  zip_code: string | null
  vat_number: string | null
  billing_email: string | null
  billing_name: string | null
  created_at: string
  projects: { count: number }[]
}

const clientTypeLabels: Record<ClientType, string> = {
  individual: 'Particulier',
  company: 'Entreprise',
  agency: 'Agence',
  startup: 'Startup',
  association: 'Association',
  other: 'Autre',
}

const clientTypeColors: Record<ClientType, string> = {
  individual: 'bg-violet-100 text-violet-700 border-violet-200',
  company: 'bg-blue-100 text-blue-700 border-blue-200',
  agency: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  startup: 'bg-amber-100 text-amber-700 border-amber-200',
  association: 'bg-pink-100 text-pink-700 border-pink-200',
  other: 'bg-gray-100 text-gray-600 border-gray-200',
}

function getInitials(name: string): string {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

function getAvatarColor(name: string): string {
  const colors = [
    'bg-[#133C55] text-white',
    'bg-[#386FA4] text-white',
    'bg-emerald-600 text-white',
    'bg-violet-600 text-white',
    'bg-amber-500 text-white',
    'bg-rose-600 text-white',
    'bg-teal-600 text-white',
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="bg-white rounded-xl border border-border px-5 py-4 flex items-center gap-4">
      <div className="h-10 w-10 rounded-lg bg-[#133C55]/8 flex items-center justify-center shrink-0 text-[#133C55]">
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-[#133C55]">{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
      </div>
    </div>
  )
}

export default function ClientsPage() {
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)
  const [typeFilter, setTypeFilter] = useState<ClientType | 'all'>('all')

  const [modalOpen, setModalOpen] = useState(false)
  const [editClient, setEditClient] = useState<Client | null>(null)
  const [deleteClient, setDeleteClient] = useState<Client | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchClients = useCallback(async () => {
    setLoading(true)
    const params = debouncedSearch ? `?search=${encodeURIComponent(debouncedSearch)}` : ''
    const res = await fetch(`/api/clients${params}`)
    const json = await res.json()
    if (res.ok) setClients(json.data)
    setLoading(false)
  }, [debouncedSearch])

  useEffect(() => { fetchClients() }, [fetchClients])

  function handleCreated(newClient: Partial<Client>) {
    setClients(prev => [newClient as Client, ...prev])
  }

  function handleUpdated(updated: Partial<Client>) {
    setClients(prev => prev.map(c => c.id === updated.id ? { ...c, ...updated } : c))
  }

  async function handleDelete() {
    if (!deleteClient) return
    setDeleting(true)
    await fetch(`/api/clients/${deleteClient.id}`, { method: 'DELETE' })
    setClients(prev => prev.filter(c => c.id !== deleteClient.id))
    setDeleteClient(null)
    setDeleting(false)
  }

  const projectCount = (client: Client) => client.projects?.[0]?.count ?? 0

  const filtered = typeFilter === 'all'
    ? clients
    : clients.filter(c => c.client_type === typeFilter)

  const totalProjects = clients.reduce((acc, c) => acc + projectCount(c), 0)
  const withEmail = clients.filter(c => c.email).length
  const typeBreakdown = Object.entries(clientTypeLabels).map(([key, label]) => ({
    type: key as ClientType,
    label,
    count: clients.filter(c => c.client_type === key).length,
  })).filter(e => e.count > 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clients</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Gérez votre portefeuille clients
          </p>
        </div>
        <Button
          className="bg-[#133C55] hover:bg-[#133C55]/90 text-white"
          onClick={() => { setEditClient(null); setModalOpen(true) }}
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Nouveau client
        </Button>
      </div>

      {/* Stats */}
      {!loading && clients.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <StatCard icon={<Users className="h-5 w-5" />} label="Clients au total" value={clients.length} />
          <StatCard icon={<FolderOpen className="h-5 w-5" />} label="Projets associés" value={totalProjects} />
          <StatCard icon={<TrendingUp className="h-5 w-5" />} label="Avec email" value={withEmail} />
        </div>
      )}

      {/* Filtres + recherche */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom, email, société..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white"
          />
        </div>
        {typeBreakdown.length > 1 && (
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setTypeFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                typeFilter === 'all'
                  ? 'bg-[#133C55] text-white border-[#133C55]'
                  : 'bg-white text-muted-foreground border-border hover:border-[#133C55]/40'
              }`}
            >
              Tous ({clients.length})
            </button>
            {typeBreakdown.map(({ type, label, count }) => (
              <button
                key={type}
                onClick={() => setTypeFilter(typeFilter === type ? 'all' : type)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  typeFilter === type
                    ? 'bg-[#133C55] text-white border-[#133C55]'
                    : 'bg-white text-muted-foreground border-border hover:border-[#133C55]/40'
                }`}
              >
                {label} ({count})
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Liste */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 rounded-xl border-2 border-dashed border-border bg-white text-center">
          <div className="h-14 w-14 rounded-full bg-[#133C55]/8 flex items-center justify-center mb-4">
            <Users className="h-7 w-7 text-[#133C55]" />
          </div>
          <h3 className="font-semibold text-base mb-1">Aucun client</h3>
          <p className="text-muted-foreground text-sm mb-5">
            {search || typeFilter !== 'all'
              ? 'Aucun résultat pour ces filtres.'
              : 'Ajoutez votre premier client pour commencer.'}
          </p>
          {!search && typeFilter === 'all' && (
            <Button onClick={() => { setEditClient(null); setModalOpen(true) }}>
              <Plus className="h-4 w-4 mr-1.5" />
              Ajouter un client
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((client) => {
            const initials = getInitials(client.name)
            const avatarClass = getAvatarColor(client.name)
            const pCount = projectCount(client)
            const location = [client.city, client.country].filter(Boolean).join(', ')
            const typeKey = client.client_type ?? 'other'

            return (
              <div
                key={client.id}
                className="group bg-white rounded-xl border border-border hover:shadow-sm hover:border-[#59A5D8]/40 transition-all cursor-pointer"
                onClick={() => router.push(`/dashboard/clients/${client.id}`)}
              >
                <div className="flex items-start gap-4 px-4 py-4">
                  {/* Avatar */}
                  <div className={`h-11 w-11 rounded-full shrink-0 flex items-center justify-center text-sm font-bold ${avatarClass}`}>
                    {initials}
                  </div>

                  {/* Bloc principal */}
                  <div className="flex-1 min-w-0">
                    {/* Ligne 1 : nom + type */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm group-hover:text-[#133C55] transition-colors">
                        {client.name}
                      </p>
                      {client.client_type && (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium border ${clientTypeColors[typeKey]}`}>
                          {clientTypeLabels[typeKey]}
                        </span>
                      )}
                      {client.company && (
                        <Badge variant="secondary" className="text-xs gap-1">
                          <Building2 className="h-2.5 w-2.5" />
                          {client.company}
                        </Badge>
                      )}
                    </div>

                    {/* Ligne 2 : contacts */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5">
                      {client.email && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Mail className="h-3 w-3 shrink-0" />
                          {client.email}
                        </span>
                      )}
                      {client.phone && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Phone className="h-3 w-3 shrink-0" />
                          {client.phone}
                        </span>
                      )}
                      {client.website && (
                        <span
                          className="flex items-center gap-1 text-xs text-[#386FA4] hover:underline"
                          onClick={(e) => { e.stopPropagation(); window.open(client.website!, '_blank') }}
                        >
                          <Globe className="h-3 w-3 shrink-0" />
                          {client.website.replace(/^https?:\/\//, '')}
                        </span>
                      )}
                      {location && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3 shrink-0" />
                          {location}
                        </span>
                      )}
                    </div>

                    {/* Ligne 3 : notes */}
                    {client.notes && (
                      <p className="text-xs text-muted-foreground mt-1.5 line-clamp-1 italic">
                        {client.notes}
                      </p>
                    )}
                  </div>

                  {/* Méta droite */}
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <div className="flex items-center gap-3">
                      <div className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground">
                        <FolderOpen className="h-3.5 w-3.5" />
                        <span>{pCount} projet{pCount !== 1 ? 's' : ''}</span>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          className="inline-flex items-center justify-center rounded-lg h-8 w-8 hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => router.push(`/dashboard/clients/${client.id}`)}>
                            <Eye className="mr-2 h-4 w-4" /> Voir la fiche
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setEditClient(client); setModalOpen(true) }}>
                            <Pencil className="mr-2 h-4 w-4" /> Modifier
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={(e) => { e.stopPropagation(); setDeleteClient(client) }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <p className="text-[10px] text-muted-foreground/60 hidden sm:block">
                      Depuis {format(new Date(client.created_at), 'd MMM yyyy', { locale: fr })}
                    </p>
                  </div>
                </div>

                {/* Footer : infos billing si présentes */}
                {(client.vat_number || client.billing_email || client.billing_name) && (
                  <div className="border-t border-border/60 px-4 py-2 flex flex-wrap gap-x-4 gap-y-0.5">
                    {client.billing_name && (
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <User className="h-2.5 w-2.5" />
                        Facturation : {client.billing_name}
                      </span>
                    )}
                    {client.billing_email && (
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Mail className="h-2.5 w-2.5" />
                        {client.billing_email}
                      </span>
                    )}
                    {client.vat_number && (
                      <span className="text-[10px] text-muted-foreground font-mono">
                        TVA : {client.vat_number}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Résumé en bas si filtre actif */}
      {typeFilter !== 'all' && filtered.length > 0 && (
        <p className="text-xs text-center text-muted-foreground">
          {filtered.length} client{filtered.length !== 1 ? 's' : ''} — {clientTypeLabels[typeFilter]}
        </p>
      )}

      {/* Modal création/édition */}
      <ClientModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditClient(null) }}
        onSuccess={editClient ? handleUpdated : handleCreated}
        initialData={editClient ? {
          id: editClient.id,
          name: editClient.name,
          email: editClient.email ?? undefined,
          phone: editClient.phone ?? undefined,
          company: editClient.company ?? undefined,
          notes: editClient.notes ?? undefined,
          client_type: editClient.client_type ?? undefined,
          website: editClient.website ?? undefined,
          city: editClient.city ?? undefined,
          country: editClient.country ?? undefined,
          address: editClient.address ?? undefined,
          zip_code: editClient.zip_code ?? undefined,
          vat_number: editClient.vat_number ?? undefined,
          billing_email: editClient.billing_email ?? undefined,
          billing_name: editClient.billing_name ?? undefined,
        } : undefined}
        mode={editClient ? 'edit' : 'create'}
      />

      {/* Dialog confirmation suppression */}
      <AlertDialog open={!!deleteClient} onOpenChange={(v) => { if (!v) setDeleteClient(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer {deleteClient?.name} ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Les projets associés ne seront pas supprimés mais n&apos;auront plus de client associé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Suppression...' : 'Supprimer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
