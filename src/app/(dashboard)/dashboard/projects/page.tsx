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
import {
  Plus, Search, MoreHorizontal, Pencil, Trash2, Copy,
  FolderKanban, Eye, LayoutGrid, List,
} from 'lucide-react'
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
  color: string | null
  clients: { id: string; name: string; company: string | null } | null
}

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive'; dot: string }> = {
  active:    { label: 'Actif',     variant: 'default',     dot: 'bg-emerald-500' },
  paused:    { label: 'En pause',  variant: 'secondary',   dot: 'bg-amber-400' },
  completed: { label: 'Terminé',   variant: 'outline',     dot: 'bg-gray-400' },
  archived:  { label: 'Archivé',   variant: 'secondary',   dot: 'bg-gray-300' },
}

export default function ProjectsPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Projets</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {projects.length} projet{projects.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={() => router.push('/dashboard/projects/new')}>
          <Plus className="h-4 w-4 mr-1.5" />
          Nouveau projet
        </Button>
      </div>

      {/* Filtres + toggle vue */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="relative flex-1 min-w-44 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un projet..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? 'all')}>
          <SelectTrigger className="w-40 bg-white">
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
        {/* Toggle vue liste/grille */}
        <div className="flex items-center gap-1 border border-border rounded-lg bg-white p-1 ml-auto">
          <button
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <List className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Liste / Grille */}
      {loading ? (
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-2'}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className={viewMode === 'grid' ? 'h-40 rounded-xl' : 'h-20 rounded-xl'} />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 rounded-xl border-2 border-dashed border-border bg-white text-center">
          <div className="h-14 w-14 rounded-full bg-primary/8 flex items-center justify-center mb-4">
            <FolderKanban className="h-7 w-7 text-primary" />
          </div>
          <h3 className="font-semibold text-base mb-1">Aucun projet</h3>
          <p className="text-muted-foreground text-sm mb-5">
            {search || statusFilter !== 'all'
              ? 'Aucun résultat pour ces filtres.'
              : 'Créez votre premier projet pour démarrer.'}
          </p>
          {!search && statusFilter === 'all' && (
            <Button onClick={() => router.push('/dashboard/projects/new')}>
              <Plus className="h-4 w-4 mr-1.5" />
              Créer un projet
            </Button>
          )}
        </div>
      ) : viewMode === 'list' ? (
        /* ── Vue liste ── */
        <div className="space-y-2">
          {projects.map((project) => {
            const status = statusConfig[project.status] ?? { label: project.status, variant: 'secondary' as const, dot: 'bg-gray-400' }
            return (
              <Card key={project.id} className="overflow-hidden hover:shadow-sm hover:border-primary/20 transition-all group bg-white">
                <CardContent className="flex items-stretch gap-0 p-0">
                  <div className="w-1 shrink-0" style={{ backgroundColor: project.color ?? '#386FA4' }} />
                  <div
                    className="flex-1 flex items-center justify-between gap-3 px-4 py-3.5 cursor-pointer"
                    onClick={() => router.push(`/dashboard/projects/${project.id}`)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold group-hover:text-primary transition-colors">{project.name}</p>
                        <Badge variant={status.variant} className="text-xs">{status.label}</Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                        {project.clients && (
                          <p className="text-sm text-muted-foreground">{project.clients.name}
                            {project.clients.company ? ` · ${project.clients.company}` : ''}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(project.created_at), 'd MMM yyyy', { locale: fr })}
                        </p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        className="inline-flex items-center justify-center rounded-lg h-8 w-8 hover:bg-accent text-muted-foreground hover:text-foreground shrink-0 transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
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
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        /* ── Vue grille ── */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => {
            const status = statusConfig[project.status] ?? { label: project.status, variant: 'secondary' as const, dot: 'bg-gray-400' }
            return (
              <Card
                key={project.id}
                className="overflow-hidden hover:shadow-md hover:border-primary/20 transition-all group bg-white cursor-pointer"
                onClick={() => router.push(`/dashboard/projects/${project.id}`)}
              >
                {/* Color header */}
                <div
                  className="h-2 w-full"
                  style={{ backgroundColor: project.color ?? '#386FA4' }}
                />
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="font-semibold text-sm leading-tight group-hover:text-primary transition-colors line-clamp-2">
                      {project.name}
                    </p>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        className="inline-flex items-center justify-center rounded-md h-7 w-7 hover:bg-accent text-muted-foreground shrink-0 transition-colors -mr-1 -mt-0.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="h-3.5 w-3.5" />
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
                  </div>
                  {project.clients && (
                    <p className="text-xs text-muted-foreground mb-2 truncate">
                      {project.clients.name}{project.clients.company ? ` · ${project.clients.company}` : ''}
                    </p>
                  )}
                  {project.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{project.description}</p>
                  )}
                  <div className="flex items-center justify-between mt-auto pt-2 border-t border-border">
                    <Badge variant={status.variant} className="text-xs">{status.label}</Badge>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(project.created_at), 'd MMM yyyy', { locale: fr })}
                    </p>
                  </div>
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
