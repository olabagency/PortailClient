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
import { Plus, Search, MoreHorizontal, Pencil, Trash2, Eye, Users, FolderKanban, Mail } from 'lucide-react'
import { useDebounce } from '@/hooks/useDebounce'

interface Client {
  id: string
  name: string
  email: string | null
  phone: string | null
  company: string | null
  notes: string | null
  created_at: string
  projects: { count: number }[]
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
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

export default function ClientsPage() {
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)

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

  function handleCreated(newClient: { id: string; name: string; email?: string; phone?: string; company?: string; notes?: string }) {
    setClients(prev => [newClient as Client, ...prev])
  }

  function handleUpdated(updated: { id: string; name: string; email?: string; phone?: string; company?: string; notes?: string }) {
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clients</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {clients.length} client{clients.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={() => { setEditClient(null); setModalOpen(true) }}>
          <Plus className="h-4 w-4 mr-1.5" />
          Nouveau client
        </Button>
      </div>

      {/* Barre de recherche */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher un client..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-white"
        />
      </div>

      {/* Liste */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : clients.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 rounded-xl border-2 border-dashed border-border bg-white text-center">
          <div className="h-14 w-14 rounded-full bg-primary/8 flex items-center justify-center mb-4">
            <Users className="h-7 w-7 text-primary" />
          </div>
          <h3 className="font-semibold text-base mb-1">Aucun client</h3>
          <p className="text-muted-foreground text-sm mb-5">
            {search ? 'Aucun résultat pour cette recherche.' : 'Ajoutez votre premier client pour commencer.'}
          </p>
          {!search && (
            <Button onClick={() => { setEditClient(null); setModalOpen(true) }}>
              <Plus className="h-4 w-4 mr-1.5" />
              Ajouter un client
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {clients.map((client) => {
            const initials = getInitials(client.name)
            const avatarClass = getAvatarColor(client.name)
            const pCount = projectCount(client)

            return (
              <div
                key={client.id}
                className="group flex items-center gap-4 bg-white rounded-xl border border-border px-4 py-3.5 hover:shadow-sm hover:border-primary/20 transition-all cursor-pointer"
                onClick={() => router.push(`/dashboard/clients/${client.id}`)}
              >
                {/* Avatar */}
                <div className={`h-10 w-10 rounded-full shrink-0 flex items-center justify-center text-sm font-semibold ${avatarClass}`}>
                  {initials}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-sm group-hover:text-primary transition-colors">{client.name}</p>
                    {client.company && (
                      <Badge variant="secondary" className="text-xs">{client.company}</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    {client.email && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        {client.email}
                      </span>
                    )}
                    {client.phone && (
                      <span className="text-xs text-muted-foreground">{client.phone}</span>
                    )}
                  </div>
                </div>

                {/* Projets + menu */}
                <div className="flex items-center gap-3 shrink-0">
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground hidden sm:flex">
                    <FolderKanban className="h-3.5 w-3.5" />
                    {pCount} projet{pCount !== 1 ? 's' : ''}
                  </span>
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
              </div>
            )
          })}
        </div>
      )}

      {/* Modal création/édition */}
      <ClientModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditClient(null) }}
        onSuccess={editClient ? handleUpdated : handleCreated}
        initialData={editClient ? { ...editClient, email: editClient.email ?? undefined, phone: editClient.phone ?? undefined, company: editClient.company ?? undefined, notes: editClient.notes ?? undefined } : undefined}
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
