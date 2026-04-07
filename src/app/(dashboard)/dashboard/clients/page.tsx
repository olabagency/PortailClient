'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
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
import { Plus, Search, MoreHorizontal, Pencil, Trash2, Eye, Users } from 'lucide-react'
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Clients</h1>
          <p className="text-sm text-muted-foreground mt-1">{clients.length} client{clients.length !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={() => { setEditClient(null); setModalOpen(true) }}>
          <Plus className="h-4 w-4 mr-2" />
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
          className="pl-9"
        />
      </div>

      {/* Liste */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
      ) : clients.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg">Aucun client</h3>
            <p className="text-muted-foreground text-sm mt-1 mb-4">
              {search ? 'Aucun résultat pour cette recherche.' : 'Ajoutez votre premier client pour commencer.'}
            </p>
            {!search && (
              <Button onClick={() => { setEditClient(null); setModalOpen(true) }}>
                <Plus className="h-4 w-4 mr-2" />
                Ajouter un client
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {clients.map((client) => (
            <Card key={client.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="flex items-center justify-between p-4">
                <div
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => router.push(`/dashboard/clients/${client.id}`)}
                >
                  <div className="flex items-center gap-2">
                    <p className="font-medium truncate">{client.name}</p>
                    {client.company && (
                      <Badge variant="secondary" className="text-xs shrink-0">{client.company}</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    {client.email && (
                      <p className="text-sm text-muted-foreground truncate">{client.email}</p>
                    )}
                    {client.phone && (
                      <p className="text-sm text-muted-foreground">{client.phone}</p>
                    )}
                    <p className="text-xs text-muted-foreground shrink-0">
                      {projectCount(client)} projet{projectCount(client) !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-md h-9 w-9 hover:bg-accent text-muted-foreground hover:text-foreground shrink-0 transition-colors">
                    <MoreHorizontal className="h-4 w-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => router.push(`/dashboard/clients/${client.id}`)}>
                      <Eye className="mr-2 h-4 w-4" /> Voir la fiche
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { setEditClient(client); setModalOpen(true) }}>
                      <Pencil className="mr-2 h-4 w-4" /> Modifier
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => setDeleteClient(client)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" /> Supprimer
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardContent>
            </Card>
          ))}
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
              Cette action est irréversible. Les projets associés ne seront pas supprimés mais n'auront plus de client associé.
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
