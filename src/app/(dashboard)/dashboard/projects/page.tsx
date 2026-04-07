'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Plus, Search, MoreHorizontal, Pencil, Trash2, Copy, FolderKanban, Eye } from 'lucide-react'
import { useDebounce } from '@/hooks/useDebounce'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

interface Project {
  id: string
  name: string
  description: string | null
  status: string
  public_id: string
  created_at: string
  clients: { id: string; name: string; company: string | null } | null
}

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  active: { label: 'Actif', variant: 'default' },
  paused: { label: 'En pause', variant: 'secondary' },
  completed: { label: 'Terminé', variant: 'outline' },
  archived: { label: 'Archivé', variant: 'secondary' },
}

export default function ProjectsPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const debouncedSearch = useDebounce(search, 300)
  const [deleteProject, setDeleteProject] = useState<Project | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchProjects = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (debouncedSearch) params.set('search', debouncedSearch)
    if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter)
    const res = await fetch(`/api/projects?${params}`)
    const json = await res.json()
    if (res.ok) setProjects(json.data)
    setLoading(false)
  }, [debouncedSearch, statusFilter])

  useEffect(() => { fetchProjects() }, [fetchProjects])

  async function handleDelete() {
    if (!deleteProject) return
    setDeleting(true)
    await fetch(`/api/projects/${deleteProject.id}`, { method: 'DELETE' })
    setProjects(prev => prev.filter(p => p.id !== deleteProject.id))
    setDeleteProject(null)
    setDeleting(false)
  }

  async function handleDuplicate(project: Project) {
    const res = await fetch(`/api/projects/${project.id}/duplicate`, { method: 'POST' })
    if (res.ok) fetchProjects()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Projets</h1>
          <p className="text-sm text-muted-foreground mt-1">{projects.length} projet{projects.length !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={() => router.push('/dashboard/projects/new')}>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau projet
        </Button>
      </div>

      {/* Filtres */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un projet..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? 'all')}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="active">Actif</SelectItem>
            <SelectItem value="paused">En pause</SelectItem>
            <SelectItem value="completed">Terminé</SelectItem>
            <SelectItem value="archived">Archivé</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Liste */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
        </div>
      ) : projects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <FolderKanban className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg">Aucun projet</h3>
            <p className="text-muted-foreground text-sm mt-1 mb-4">
              {search || statusFilter !== 'all' ? 'Aucun résultat pour ces filtres.' : 'Créez votre premier projet.'}
            </p>
            {!search && statusFilter === 'all' && (
              <Button onClick={() => router.push('/dashboard/projects/new')}>
                <Plus className="h-4 w-4 mr-2" />
                Créer un projet
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {projects.map((project) => {
            const status = statusConfig[project.status] ?? { label: project.status, variant: 'secondary' as const }
            return (
              <Card key={project.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="flex items-center justify-between p-4">
                  <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => router.push(`/dashboard/projects/${project.id}`)}
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium">{project.name}</p>
                      <Badge variant={status.variant} className="text-xs">{status.label}</Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      {project.clients && (
                        <p className="text-sm text-muted-foreground">{project.clients.name}</p>
                      )}
                      {project.description && (
                        <p className="text-sm text-muted-foreground truncate max-w-xs">{project.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(project.created_at), 'd MMM yyyy', { locale: fr })}
                      </p>
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-md h-9 w-9 hover:bg-accent text-muted-foreground hover:text-foreground shrink-0 transition-colors">
                      <MoreHorizontal className="h-4 w-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => router.push(`/dashboard/projects/${project.id}`)}>
                        <Eye className="mr-2 h-4 w-4" /> Ouvrir
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => router.push(`/dashboard/projects/${project.id}/edit`)}>
                        <Pencil className="mr-2 h-4 w-4" /> Modifier
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDuplicate(project)}>
                        <Copy className="mr-2 h-4 w-4" /> Dupliquer
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => setDeleteProject(project)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> Supprimer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <AlertDialog open={!!deleteProject} onOpenChange={(v) => { if (!v) setDeleteProject(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer « {deleteProject?.name} » ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le kanban, les formulaires et les fichiers associés seront supprimés.
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
