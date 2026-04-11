'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import {
  ArrowLeft, ExternalLink, ClipboardList, Share2, Kanban, BookmarkPlus,
  Activity, ListChecks, FolderOpen, FileText, Image, File, Link2,
  Download, Eye, EyeOff, Plus,
} from 'lucide-react'
import { KanbanBoard } from '@/components/kanban/KanbanBoard'
import { KanbanColumn, KanbanTask } from '@/types/kanban'
import { ActivityFeed } from '@/components/dashboard/ActivityFeed'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

// ── Inline document list ────────────────────────────────────────────────────

interface Doc {
  id: string
  name: string
  type: 'file' | 'link'
  url: string
  size_bytes: number | null
  mime_type: string | null
  visible_to_client: boolean
  created_at: string
}

function fileIcon(mime: string | null) {
  if (!mime) return <File className="h-4 w-4 text-gray-400" />
  if (mime.startsWith('image/')) return <Image className="h-4 w-4 text-blue-400" />
  if (mime === 'application/pdf') return <FileText className="h-4 w-4 text-red-400" />
  return <File className="h-4 w-4 text-gray-400" />
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

function InlineDocuments({ projectId }: { projectId: string }) {
  const [docs, setDocs] = useState<Doc[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/projects/${projectId}/documents`)
    const json = await res.json()
    setDocs(json.data ?? [])
    setLoading(false)
  }, [projectId])

  useEffect(() => { load() }, [load])

  async function toggleVisibility(doc: Doc) {
    const res = await fetch(`/api/projects/${projectId}/documents/${doc.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visible_to_client: !doc.visible_to_client }),
    })
    if (res.ok) {
      setDocs(prev => prev.map(d => d.id === doc.id ? { ...d, visible_to_client: !d.visible_to_client } : d))
    }
  }

  async function openDoc(doc: Doc) {
    if (doc.type === 'link') { window.open(doc.url, '_blank'); return }
    const res = await fetch(`/api/projects/${projectId}/documents/${doc.id}?action=download`)
    const json = await res.json()
    if (json.url) window.open(json.url, '_blank')
    else toast.error('Impossible d\'ouvrir le fichier')
  }

  if (loading) return (
    <div className="space-y-2 p-4">
      {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
    </div>
  )

  return (
    <div>
      {docs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
          <FolderOpen className="h-8 w-8 text-gray-300" />
          <div>
            <p className="font-medium text-sm text-gray-700">Aucun document</p>
            <p className="text-xs text-muted-foreground mt-1">Partagez des fichiers et liens avec votre client.</p>
          </div>
          <Link
            href={`/dashboard/projects/${projectId}/documents`}
            className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
          >
            <Plus className="h-3.5 w-3.5" />
            Ajouter des documents
          </Link>
        </div>
      ) : (
        <>
          <div className="divide-y">
            {docs.map(doc => (
              <div key={doc.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 group">
                <div className="shrink-0">
                  {doc.type === 'link' ? <Link2 className="h-4 w-4 text-purple-400" /> : fileIcon(doc.mime_type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{doc.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatBytes(doc.size_bytes)}
                    {doc.size_bytes && <span className="mx-1">·</span>}
                    {format(new Date(doc.created_at), 'd MMM yyyy', { locale: fr })}
                  </p>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => toggleVisibility(doc)}
                    className="p-1.5 rounded-md hover:bg-gray-200 transition-colors"
                    title={doc.visible_to_client ? 'Masquer au client' : 'Visible par le client'}
                  >
                    {doc.visible_to_client
                      ? <Eye className="h-3.5 w-3.5 text-green-600" />
                      : <EyeOff className="h-3.5 w-3.5 text-gray-400" />}
                  </button>
                  <button
                    onClick={() => openDoc(doc)}
                    className="p-1.5 rounded-md hover:bg-gray-200 transition-colors"
                    title={doc.type === 'link' ? 'Ouvrir le lien' : 'Télécharger'}
                  >
                    {doc.type === 'link'
                      ? <ExternalLink className="h-3.5 w-3.5 text-gray-500" />
                      : <Download className="h-3.5 w-3.5 text-gray-500" />}
                  </button>
                </div>
                {doc.visible_to_client && (
                  <Badge variant="outline" className="text-[10px] h-4 px-1 text-green-700 border-green-200 hidden group-hover:hidden shrink-0">
                    Client
                  </Badge>
                )}
              </div>
            ))}
          </div>
          <div className="px-4 py-3 border-t bg-gray-50/50">
            <Link
              href={`/dashboard/projects/${projectId}/documents`}
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              <FolderOpen className="h-3.5 w-3.5" />
              Gérer tous les documents ({docs.length})
            </Link>
          </div>
        </>
      )}
    </div>
  )
}

interface Project {
  id: string
  name: string
  description: string | null
  status: string
  color: string | null
  public_id: string
  clients: { id: string; name: string; company: string | null; email: string } | null
  created_at: string
}

interface ProjectViewProps {
  project: Project
  columns: KanbanColumn[]
  initialTasks: Record<string, KanbanTask[]>
  portalUrl: string
}

const statusLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  active: { label: 'Actif', variant: 'default' },
  paused: { label: 'En pause', variant: 'secondary' },
  completed: { label: 'Terminé', variant: 'outline' },
  archived: { label: 'Archivé', variant: 'destructive' },
}

export function ProjectView({ project, columns, initialTasks, portalUrl }: ProjectViewProps) {
  const router = useRouter()
  const statusInfo = statusLabels[project.status] ?? { label: project.status, variant: 'secondary' as const }

  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSaveTemplate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const res = await fetch('/api/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: templateName, project_id: project.id }),
    })
    const json = await res.json()
    if (!res.ok) {
      toast.error(json.error ?? 'Erreur lors de la sauvegarde')
    } else {
      toast.success('Template sauvegardé avec succès')
      setSaveDialogOpen(false)
      setTemplateName('')
    }
    setSaving(false)
  }

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* En-tête */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/projects')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {project.color && (
              <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: project.color }} />
            )}
            <h1 className="text-xl font-bold truncate">{project.name}</h1>
            <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
          </div>
          {project.clients && (
            <p className="text-sm text-muted-foreground mt-0.5">
              Client : {project.clients.name}
              {project.clients.company && ` · ${project.clients.company}`}
            </p>
          )}
        </div>

        <div className="hidden sm:flex items-center gap-2">
          <button
            onClick={() => { setTemplateName(project.name); setSaveDialogOpen(true) }}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            title="Sauvegarder comme template"
          >
            <BookmarkPlus className="h-4 w-4" />
            Template
          </button>
          <button
            onClick={() => window.open(portalUrl, '_blank')}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
            Portail client
          </button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="kanban" className="flex-1 flex flex-col">
        <TabsList className="w-full sm:w-auto flex-wrap h-auto gap-1">
          <TabsTrigger value="kanban" className="flex items-center gap-1.5">
            <Kanban className="h-4 w-4" />
            Kanban
          </TabsTrigger>
          <TabsTrigger value="milestones" className="flex items-center gap-1.5">
            <ListChecks className="h-4 w-4" />
            Timeline
          </TabsTrigger>
          <TabsTrigger value="documents" className="flex items-center gap-1.5">
            <FolderOpen className="h-4 w-4" />
            Documents
          </TabsTrigger>
          <TabsTrigger value="onboarding" className="flex items-center gap-1.5">
            <ClipboardList className="h-4 w-4" />
            Onboarding
          </TabsTrigger>
          <TabsTrigger value="share" className="flex items-center gap-1.5">
            <Share2 className="h-4 w-4" />
            Partager
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex items-center gap-1.5">
            <Activity className="h-4 w-4" />
            Activité
          </TabsTrigger>
        </TabsList>

        {/* Tab Kanban */}
        <TabsContent value="kanban" className="flex-1 mt-4 overflow-hidden">
          <KanbanBoard
            projectId={project.id}
            initialColumns={columns}
            initialTasks={initialTasks}
          />
        </TabsContent>

        {/* Tab Timeline */}
        <TabsContent value="milestones" className="mt-4">
          <Card>
            <CardContent className="py-8 flex flex-col items-center gap-4 text-center">
              <ListChecks className="h-10 w-10 text-muted-foreground" />
              <div>
                <p className="font-medium">Timeline du projet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Définissez et suivez les étapes clés du projet.
                </p>
              </div>
              <Link
                href={`/dashboard/projects/${project.id}/milestones`}
                className="inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-medium h-8 px-2.5 transition-all hover:bg-primary/80"
              >
                Gérer la timeline
              </Link>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Documents */}
        <TabsContent value="documents" className="mt-4">
          <Card>
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <div className="flex items-center gap-2">
                <FolderOpen className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-sm">Documents</span>
              </div>
              <Link
                href={`/dashboard/projects/${project.id}/documents`}
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                <Plus className="h-3.5 w-3.5" />
                Ajouter
              </Link>
            </div>
            <InlineDocuments projectId={project.id} />
          </Card>
        </TabsContent>

        {/* Tab Onboarding */}
        <TabsContent value="onboarding" className="mt-4">
          <Card>
            <CardContent className="py-8 flex flex-col items-center gap-4 text-center">
              <ClipboardList className="h-10 w-10 text-muted-foreground" />
              <div>
                <p className="font-medium">Formulaire d&apos;onboarding</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Créez et gérez les questions envoyées à votre client.
                </p>
              </div>
              <Link
                href={`/dashboard/projects/${project.id}/onboarding`}
                className="inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-medium h-8 px-2.5 transition-all hover:bg-primary/80"
              >
                Ouvrir l&apos;éditeur
              </Link>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Partager */}
        <TabsContent value="share" className="mt-4">
          <Card>
            <CardContent className="py-8 flex flex-col items-center gap-4 text-center">
              <Share2 className="h-10 w-10 text-muted-foreground" />
              <div>
                <p className="font-medium">Partager le projet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Gérez le lien de partage, la protection PIN et l&apos;envoi par email.
                </p>
              </div>
              <Link
                href={`/dashboard/projects/${project.id}/share`}
                className="inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-medium h-8 px-2.5 transition-all hover:bg-primary/80"
              >
                Gérer le partage
              </Link>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Activité */}
        <TabsContent value="activity" className="mt-4">
          <Card>
            <CardContent className="py-4 px-4">
              <ActivityFeed
                apiUrl={`/api/projects/${project.id}/activity`}
                limit={50}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog sauvegarder comme template */}
      <Dialog open={saveDialogOpen} onOpenChange={(v) => { if (!v) setSaveDialogOpen(false) }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookmarkPlus className="h-4 w-4" />
              Sauvegarder comme template
            </DialogTitle>
            <DialogDescription>
              Le kanban et le formulaire de ce projet seront copiés dans le template.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveTemplate} className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>Nom du template <span className="text-destructive">*</span></Label>
              <Input
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Ex : Site vitrine client type"
                required
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setSaveDialogOpen(false)} disabled={saving}>
                Annuler
              </Button>
              <Button type="submit" disabled={saving || !templateName.trim()}>
                {saving ? 'Sauvegarde...' : 'Sauvegarder'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
