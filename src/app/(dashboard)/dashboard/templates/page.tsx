'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { LayoutTemplate, Plus, Trash2, Kanban, ClipboardList, BookmarkPlus, Star, Wand2 } from 'lucide-react'
import { toast } from 'sonner'

interface TemplateColumn { name: string; color?: string }
interface TemplateField { type: string; label: string; required?: boolean }

interface Template {
  id: string
  user_id: string | null
  name: string
  description: string | null
  kanban_config: TemplateColumn[]
  form_config: TemplateField[]
  is_default: boolean
  created_at: string
}

interface Project {
  id: string
  name: string
}

function TemplateCard({
  template,
  isDeletable,
  onDelete,
  onUse,
}: {
  template: Template
  isDeletable: boolean
  onDelete: (t: Template) => void
  onUse: (t: Template) => void
}) {
  const colCount = template.kanban_config?.length ?? 0
  const fieldCount = template.form_config?.length ?? 0

  return (
    <Card className="group hover:shadow-md transition-shadow flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {template.is_default && (
              <Star className="h-3.5 w-3.5 text-amber-500 shrink-0 fill-amber-500" />
            )}
            <CardTitle className="text-base truncate">{template.name}</CardTitle>
          </div>
          {isDeletable && (
            <button
              onClick={() => onDelete(template)}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive shrink-0 p-0.5"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
        {template.description && (
          <CardDescription className="text-xs mt-1 line-clamp-2">{template.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="pt-0 space-y-3 flex-1 flex flex-col justify-between">
        <div className="space-y-2">
          {/* Stats */}
          <div className="flex gap-2 flex-wrap">
            <Badge variant="secondary" className="text-xs gap-1 py-0.5">
              <Kanban className="h-3 w-3" />
              {colCount} colonne{colCount !== 1 ? 's' : ''}
            </Badge>
            <Badge variant="secondary" className="text-xs gap-1 py-0.5">
              <ClipboardList className="h-3 w-3" />
              {fieldCount} champ{fieldCount !== 1 ? 's' : ''}
            </Badge>
          </div>

          {/* Aperçu colonnes */}
          {colCount > 0 && (
            <div className="flex gap-2 flex-wrap">
              {template.kanban_config.map((col, i) => (
                <div key={i} className="flex items-center gap-1 text-xs text-muted-foreground">
                  <div
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: col.color ?? '#6B7280' }}
                  />
                  <span className="truncate max-w-[90px]">{col.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <Button size="sm" className="w-full mt-2" onClick={() => onUse(template)}>
          <Wand2 className="h-3.5 w-3.5 mr-1.5" />
          Utiliser ce template
        </Button>
      </CardContent>
    </Card>
  )
}

export default function TemplatesPage() {
  const router = useRouter()
  const [defaults, setDefaults] = useState<Template[]>([])
  const [mine, setMine] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [planError, setPlanError] = useState<string | null>(null)

  // Dialog sauvegarder
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])
  const [saveName, setSaveName] = useState('')
  const [saveDescription, setSaveDescription] = useState('')
  const [saveProjectId, setSaveProjectId] = useState('')
  const [saving, setSaving] = useState(false)

  // Confirmation suppression
  const [deleteTarget, setDeleteTarget] = useState<Template | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchTemplates = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/templates')
    const json = await res.json()
    if (res.ok) {
      setDefaults(json.data.defaults ?? [])
      setMine(json.data.mine ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchTemplates() }, [fetchTemplates])

  async function openSaveDialog() {
    setSaveName('')
    setSaveDescription('')
    setSaveProjectId('')
    setPlanError(null)
    const res = await fetch('/api/projects')
    const json = await res.json()
    setProjects(json.data ?? [])
    setSaveDialogOpen(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setPlanError(null)

    const res = await fetch('/api/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: saveName,
        description: saveDescription || undefined,
        project_id: saveProjectId || undefined,
      }),
    })
    const json = await res.json()

    if (!res.ok) {
      if (res.status === 403) {
        setSaveDialogOpen(false)
        setPlanError(json.error)
      } else {
        toast.error(json.error ?? 'Erreur lors de la création')
      }
      setSaving(false)
      return
    }

    setMine(prev => [json.data, ...prev])
    setSaveDialogOpen(false)
    toast.success('Template créé avec succès')
    setSaving(false)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    const res = await fetch(`/api/templates/${deleteTarget.id}`, { method: 'DELETE' })
    if (res.ok) {
      setMine(prev => prev.filter(t => t.id !== deleteTarget.id))
      toast.success('Template supprimé')
    } else {
      toast.error('Erreur lors de la suppression')
    }
    setDeleteTarget(null)
    setDeleting(false)
  }

  function handleUse(template: Template) {
    router.push(`/dashboard/projects/new?template=${template.id}`)
  }

  return (
    <div className="space-y-8">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Templates</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Créez de nouveaux projets en un clic depuis vos configurations favorites.
          </p>
        </div>
        <Button onClick={openSaveDialog}>
          <BookmarkPlus className="h-4 w-4 mr-2" />
          Sauvegarder un projet
        </Button>
      </div>

      {planError && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive flex items-center justify-between gap-4">
          <span>{planError}</span>
          <a href="/dashboard/settings" className="underline font-medium whitespace-nowrap">
            Mettre à niveau
          </a>
        </div>
      )}

      {/* Bibliothèque */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
          <h2 className="text-base font-semibold">Bibliothèque</h2>
          <Badge variant="secondary" className="text-xs">{defaults.length}</Badge>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <Card key={i}>
                <CardHeader><Skeleton className="h-5 w-32" /></CardHeader>
                <CardContent className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-8 w-full mt-4" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {defaults.map(t => (
              <TemplateCard key={t.id} template={t} isDeletable={false} onDelete={setDeleteTarget} onUse={handleUse} />
            ))}
          </div>
        )}
      </section>

      <Separator />

      {/* Mes templates */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <LayoutTemplate className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-base font-semibold">Mes templates</h2>
          <Badge variant="secondary" className="text-xs">{mine.length}</Badge>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <Card><CardHeader><Skeleton className="h-5 w-32" /></CardHeader></Card>
          </div>
        ) : mine.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-center border-2 border-dashed rounded-lg">
            <BookmarkPlus className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="font-medium text-sm">Aucun template personnalisé</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                Sauvegardez la configuration d&apos;un projet existant pour le réutiliser facilement.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={openSaveDialog}>
              <Plus className="h-4 w-4 mr-1.5" />
              Créer mon premier template
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {mine.map(t => (
              <TemplateCard key={t.id} template={t} isDeletable={true} onDelete={setDeleteTarget} onUse={handleUse} />
            ))}
          </div>
        )}
      </section>

      {/* Dialog sauvegarder */}
      <Dialog open={saveDialogOpen} onOpenChange={(v) => { if (!v) setSaveDialogOpen(false) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Sauvegarder comme template</DialogTitle>
            <DialogDescription>
              Donnez un nom à votre template et choisissez optionnellement un projet dont copier la configuration kanban et formulaire.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>Nom du template <span className="text-destructive">*</span></Label>
              <Input
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="Ex : Site vitrine client type"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Description <span className="text-xs text-muted-foreground">(optionnel)</span></Label>
              <Textarea
                value={saveDescription}
                onChange={(e) => setSaveDescription(e.target.value)}
                placeholder="À quoi sert ce template ?"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Copier depuis un projet <span className="text-xs text-muted-foreground">(optionnel)</span></Label>
              <Select value={saveProjectId} onValueChange={(v) => setSaveProjectId(v ?? '')}>
                <SelectTrigger>
                  <SelectValue placeholder="Colonnes par défaut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Colonnes kanban par défaut</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {saveProjectId
                  ? 'Le kanban et le formulaire du projet seront copiés dans le template.'
                  : 'Le template utilisera les 4 colonnes kanban par défaut.'}
              </p>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setSaveDialogOpen(false)} disabled={saving}>
                Annuler
              </Button>
              <Button type="submit" disabled={saving || !saveName.trim()}>
                {saving ? 'Sauvegarde...' : 'Sauvegarder le template'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirmation suppression */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => { if (!v) setDeleteTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer « {deleteTarget?.name} » ?</AlertDialogTitle>
            <AlertDialogDescription>
              Ce template sera supprimé définitivement. Les projets déjà créés depuis ce template ne seront pas affectés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Suppression...' : 'Supprimer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
