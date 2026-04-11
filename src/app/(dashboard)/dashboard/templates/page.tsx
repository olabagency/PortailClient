'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
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
import {
  Sheet, SheetContent, SheetHeader, SheetFooter,
} from '@/components/ui/sheet'
import {
  LayoutTemplate, Plus, Trash2, Kanban, ClipboardList,
  Star, Wand2, Copy, Pencil, ChevronRight, Layers, Eye,
  CheckCircle2, X,
} from 'lucide-react'
import { toast } from 'sonner'

// ─── Types ────────────────────────────────────────────────────────────────────

interface TemplateSection { title: string; kind: string; order_index: number }
interface TemplateField {
  type: string; label: string; description?: string | null
  placeholder?: string | null; required?: boolean
  options?: string[] | null; section_index?: number | null; sensitive?: boolean
}
interface TemplateColumn { name: string; color?: string }

interface Template {
  id: string
  user_id: string | null
  name: string
  description: string | null
  kanban_config: TemplateColumn[]
  form_config: TemplateField[]
  sections_config: TemplateSection[]
  is_default: boolean
  created_at: string
}

interface Project { id: string; name: string }

// ─── Helpers ──────────────────────────────────────────────────────────────────

const FIELD_TYPE_LABELS: Record<string, string> = {
  text: 'Texte court', textarea: 'Texte long', email: 'Email',
  phone: 'Téléphone', url: 'URL / Lien', date: 'Date',
  select: 'Liste déroulante', multiselect: 'Choix multiples',
  file: 'Fichier', password: 'Mot de passe',
}

const TEMPLATE_COLORS: Record<string, { bg: string; border: string; emoji: string }> = {
  'Site web':             { bg: 'bg-blue-50',   border: 'border-blue-200',   emoji: '🌐' },
  'Application mobile':   { bg: 'bg-purple-50', border: 'border-purple-200', emoji: '📱' },
  'Community management': { bg: 'bg-pink-50',   border: 'border-pink-200',   emoji: '📣' },
  'Identité visuelle':    { bg: 'bg-amber-50',  border: 'border-amber-200',  emoji: '🎨' },
}
const DEFAULT_COLOR = { bg: 'bg-gray-50', border: 'border-gray-200', emoji: '📋' }

// ─── Preview Drawer ───────────────────────────────────────────────────────────

function TemplatePreviewDrawer({
  template,
  onClose,
  onUse,
  onEdit,
  onDuplicate,
}: {
  template: Template | null
  onClose: () => void
  onUse: (t: Template) => void
  onEdit: (t: Template) => void
  onDuplicate: (t: Template) => void
}) {
  if (!template) return null

  const colors = TEMPLATE_COLORS[template.name] ?? DEFAULT_COLOR
  const sections = (template.sections_config ?? []).sort((a, b) => a.order_index - b.order_index)
  const fields = template.form_config ?? []
  const columns = template.kanban_config ?? []

  // Grouper les champs par section
  const fieldsBySectionIndex = new Map<number, TemplateField[]>()
  const unsectionedFields: TemplateField[] = []
  fields.forEach(f => {
    if (f.section_index != null && f.section_index >= 0) {
      if (!fieldsBySectionIndex.has(f.section_index)) fieldsBySectionIndex.set(f.section_index, [])
      fieldsBySectionIndex.get(f.section_index)!.push(f)
    } else {
      unsectionedFields.push(f)
    }
  })

  const totalFields = fields.length
  const requiredCount = fields.filter(f => f.required).length

  return (
    <Sheet open={!!template} onOpenChange={(open) => { if (!open) onClose() }}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="w-full sm:max-w-xl flex flex-col p-0 gap-0"
      >
        {/* Header coloré */}
        <div className={`${colors.bg} ${colors.border} border-b px-6 py-5 shrink-0`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-3xl shrink-0">{colors.emoji}</span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  {template.is_default && <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500 shrink-0" />}
                  <h2 className="text-lg font-bold text-gray-900 truncate">{template.name}</h2>
                </div>
                {template.description && (
                  <p className="text-sm text-gray-500 mt-0.5">{template.description}</p>
                )}
              </div>
            </div>
            <button onClick={onClose} className="shrink-0 text-gray-400 hover:text-gray-700 p-1 rounded-md hover:bg-black/5 transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Stats badges */}
          <div className="flex gap-2 mt-4 flex-wrap">
            <div className="flex items-center gap-1.5 bg-white/70 rounded-full px-3 py-1 text-xs font-medium text-gray-600">
              <Kanban className="h-3.5 w-3.5" />
              {columns.length} colonne{columns.length !== 1 ? 's' : ''}
            </div>
            {sections.length > 0 && (
              <div className="flex items-center gap-1.5 bg-white/70 rounded-full px-3 py-1 text-xs font-medium text-gray-600">
                <Layers className="h-3.5 w-3.5" />
                {sections.length} section{sections.length !== 1 ? 's' : ''}
              </div>
            )}
            <div className="flex items-center gap-1.5 bg-white/70 rounded-full px-3 py-1 text-xs font-medium text-gray-600">
              <ClipboardList className="h-3.5 w-3.5" />
              {totalFields} question{totalFields !== 1 ? 's' : ''}
              {requiredCount > 0 && <span className="text-gray-400">· {requiredCount} requises</span>}
            </div>
          </div>
        </div>

        {/* Contenu scrollable */}
        <div className="flex-1 overflow-y-auto">

          {/* Kanban */}
          <div className="px-6 py-5 border-b">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Colonnes Kanban
            </h3>
            <div className="flex flex-wrap gap-2">
              {columns.map((col, i) => (
                <div key={i} className="flex items-center gap-2 bg-gray-50 border rounded-lg px-3 py-2">
                  <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: col.color ?? '#6B7280' }} />
                  <span className="text-sm font-medium text-gray-700">{col.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Questionnaire */}
          <div className="px-6 py-5">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
              Questionnaire d&apos;onboarding
            </h3>

            {totalFields === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune question dans ce template.</p>
            ) : (
              <div className="space-y-5">
                {/* Sections avec leurs champs */}
                {sections.map((section, sIndex) => {
                  const sectionFields = fieldsBySectionIndex.get(sIndex) ?? []
                  return (
                    <div key={sIndex}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-semibold text-gray-800">{section.title}</span>
                        <div className="flex-1 h-px bg-gray-100" />
                        <span className="text-xs text-muted-foreground shrink-0">{sectionFields.length} champ{sectionFields.length !== 1 ? 's' : ''}</span>
                      </div>
                      <div className="space-y-2 ml-0.5">
                        {sectionFields.map((field, fIndex) => (
                          <FieldPreviewRow key={fIndex} field={field} />
                        ))}
                        {sectionFields.length === 0 && (
                          <p className="text-xs text-muted-foreground italic">Section vide</p>
                        )}
                      </div>
                    </div>
                  )
                })}

                {/* Champs sans section */}
                {unsectionedFields.length > 0 && (
                  <div>
                    {sections.length > 0 && (
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-semibold text-gray-800">Autres questions</span>
                        <div className="flex-1 h-px bg-gray-100" />
                      </div>
                    )}
                    <div className="space-y-2">
                      {unsectionedFields.map((field, fIndex) => (
                        <FieldPreviewRow key={fIndex} field={field} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer sticky */}
        <SheetFooter className="border-t bg-white px-6 py-4 gap-3">
          {template.is_default ? (
            <>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => onDuplicate(template)}
              >
                <Copy className="h-4 w-4 mr-2" />
                Dupliquer &amp; personnaliser
              </Button>
              <Button className="flex-1" onClick={() => onUse(template)}>
                <Wand2 className="h-4 w-4 mr-2" />
                Utiliser tel quel
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => onEdit(template)}
              >
                <Pencil className="h-4 w-4 mr-2" />
                Modifier le template
              </Button>
              <Button className="flex-1" onClick={() => onUse(template)}>
                <Wand2 className="h-4 w-4 mr-2" />
                Créer un projet
              </Button>
            </>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

function FieldPreviewRow({ field }: { field: TemplateField }) {
  const typeLabel = FIELD_TYPE_LABELS[field.type] ?? field.type
  return (
    <div className="flex items-start gap-3 bg-gray-50 rounded-lg px-3 py-2.5">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-gray-800">{field.label}</span>
          {field.required && (
            <Badge variant="destructive" className="text-[10px] py-0 px-1.5 h-4">Requis</Badge>
          )}
          {field.sensitive && (
            <Badge variant="secondary" className="text-[10px] py-0 px-1.5 h-4 text-amber-700 bg-amber-50 border-amber-200">🔒 Chiffré</Badge>
          )}
        </div>
        {field.description && (
          <p className="text-xs text-muted-foreground mt-0.5">{field.description}</p>
        )}
        {field.options && field.options.length > 0 && (
          <div className="flex gap-1 flex-wrap mt-1.5">
            {field.options.slice(0, 4).map((opt, i) => (
              <span key={i} className="text-[10px] bg-white border rounded px-1.5 py-0.5 text-gray-500">{opt}</span>
            ))}
            {field.options.length > 4 && (
              <span className="text-[10px] text-muted-foreground">+{field.options.length - 4}...</span>
            )}
          </div>
        )}
      </div>
      <span className="text-[10px] text-muted-foreground bg-white border rounded px-1.5 py-0.5 shrink-0 mt-0.5">{typeLabel}</span>
    </div>
  )
}

// ─── TemplateCard ─────────────────────────────────────────────────────────────

function TemplateCard({
  template,
  onPreview,
  onUse,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  template: Template
  onPreview: (t: Template) => void
  onUse: (t: Template) => void
  onEdit?: (t: Template) => void
  onDuplicate?: (t: Template) => void
  onDelete?: (t: Template) => void
}) {
  const colCount = template.kanban_config?.length ?? 0
  const fieldCount = template.form_config?.length ?? 0
  const sectionCount = template.sections_config?.length ?? 0
  const colors = TEMPLATE_COLORS[template.name] ?? DEFAULT_COLOR
  const requiredCount = template.form_config?.filter(f => f.required).length ?? 0

  return (
    <Card
      className="group hover:shadow-md transition-all border shadow-sm overflow-hidden flex flex-col cursor-pointer"
      onClick={() => onPreview(template)}
    >
      {/* Header coloré */}
      <div className={`${colors.bg} ${colors.border} border-b px-4 py-4`}>
        <div className="flex items-start gap-2.5 min-w-0">
          <span className="text-2xl shrink-0">{colors.emoji}</span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              {template.is_default && <Star className="h-3 w-3 text-amber-500 fill-amber-500 shrink-0" />}
              <p className="font-semibold text-gray-900 text-sm truncate">{template.name}</p>
            </div>
            {template.description && (
              <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{template.description}</p>
            )}
          </div>
        </div>

        <div className="flex gap-1.5 mt-3 flex-wrap">
          <span className="inline-flex items-center gap-1 bg-white/70 rounded-full px-2 py-0.5 text-xs text-gray-500">
            <Kanban className="h-3 w-3" />{colCount} col.
          </span>
          {sectionCount > 0 && (
            <span className="inline-flex items-center gap-1 bg-white/70 rounded-full px-2 py-0.5 text-xs text-gray-500">
              <Layers className="h-3 w-3" />{sectionCount} sec.
            </span>
          )}
          <span className="inline-flex items-center gap-1 bg-white/70 rounded-full px-2 py-0.5 text-xs text-gray-500">
            <ClipboardList className="h-3 w-3" />{fieldCount} question{fieldCount !== 1 ? 's' : ''}
          </span>
          {requiredCount > 0 && (
            <span className="inline-flex items-center gap-1 bg-white/70 rounded-full px-2 py-0.5 text-xs text-gray-500">
              <CheckCircle2 className="h-3 w-3 text-emerald-500" />{requiredCount} req.
            </span>
          )}
        </div>
      </div>

      {/* Aperçu rapide des sections */}
      <CardContent className="px-4 py-3 flex-1 flex flex-col justify-between">
        <div className="space-y-1 flex-1">
          {(template.sections_config ?? []).slice(0, 3).map((s, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-gray-500">
              <div className="w-1 h-1 rounded-full bg-gray-300 shrink-0" />
              <span className="truncate">{s.title}</span>
            </div>
          ))}
          {(template.sections_config ?? []).length === 0 && (template.form_config ?? []).slice(0, 3).map((f, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-gray-500">
              <div className="w-1 h-1 rounded-full bg-gray-300 shrink-0" />
              <span className="truncate">{f.label}</span>
            </div>
          ))}
          {(template.sections_config?.length ?? 0) > 3 && (
            <p className="text-xs text-muted-foreground pl-3">+ {(template.sections_config?.length ?? 0) - 3} sections...</p>
          )}
        </div>

        {/* Actions */}
        <div className="mt-3 pt-3 border-t space-y-2" onClick={e => e.stopPropagation()}>
          <Button size="sm" className="w-full" onClick={() => onPreview(template)}>
            <Eye className="h-3.5 w-3.5 mr-1.5" />
            Aperçu &amp; utiliser
          </Button>
          <div className="flex gap-1.5">
            {onDuplicate && (
              <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => onDuplicate(template)}>
                <Copy className="h-3 w-3 mr-1" />Dupliquer
              </Button>
            )}
            {onEdit && (
              <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => onEdit(template)}>
                <Pencil className="h-3 w-3 mr-1" />Modifier
              </Button>
            )}
            {onDelete && (
              <Button size="sm" variant="outline" className="px-2 text-destructive hover:text-destructive hover:border-destructive" onClick={() => onDelete(template)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function TemplatesPage() {
  const router = useRouter()
  const [defaults, setDefaults] = useState<Template[]>([])
  const [mine, setMine] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [planError, setPlanError] = useState<string | null>(null)

  // Preview
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null)

  // Dialog "depuis un projet"
  const [fromProjectOpen, setFromProjectOpen] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])
  const [saveName, setSaveName] = useState('')
  const [saveDescription, setSaveDescription] = useState('')
  const [saveProjectId, setSaveProjectId] = useState('')
  const [saving, setSaving] = useState(false)

  // Duplication
  const [duplicating, setDuplicating] = useState<string | null>(null)

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

  async function openFromProjectDialog() {
    setSaveName('')
    setSaveDescription('')
    setSaveProjectId('')
    setPlanError(null)
    const res = await fetch('/api/projects')
    const json = await res.json()
    setProjects(json.data ?? [])
    setFromProjectOpen(true)
  }

  async function handleSaveFromProject(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setPlanError(null)
    const res = await fetch('/api/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: saveName, description: saveDescription || undefined, project_id: saveProjectId || undefined }),
    })
    const json = await res.json()
    if (!res.ok) {
      if (res.status === 403) { setFromProjectOpen(false); setPlanError(json.error) }
      else toast.error(json.error ?? 'Erreur lors de la création')
      setSaving(false)
      return
    }
    setMine(prev => [json.data, ...prev])
    setFromProjectOpen(false)
    toast.success('Template créé — toute la configuration du projet a été copiée !')
    setSaving(false)
  }

  async function handleDuplicate(template: Template) {
    setPreviewTemplate(null)
    setDuplicating(template.id)
    try {
      const res = await fetch(`/api/templates/${template.id}/duplicate`, { method: 'POST' })
      const json = await res.json()
      if (!res.ok) {
        if (res.status === 403) setPlanError(json.error)
        else toast.error(json.error ?? 'Erreur lors de la duplication')
        return
      }
      setMine(prev => [json.data, ...prev])
      toast.success(`"${template.name}" dupliqué — vous pouvez maintenant le modifier`)
      router.push(`/dashboard/templates/${json.data.id}`)
    } finally {
      setDuplicating(null)
    }
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
    setPreviewTemplate(null)
    router.push(`/dashboard/projects/new?template=${template.id}`)
  }

  function handleEdit(template: Template) {
    setPreviewTemplate(null)
    router.push(`/dashboard/templates/${template.id}`)
  }

  const SkeletonCard = () => (
    <div className="rounded-xl border shadow-sm overflow-hidden">
      <div className="bg-gray-100 px-4 py-4 space-y-2">
        <div className="flex gap-2.5">
          <Skeleton className="h-8 w-8 rounded" />
          <div className="space-y-1.5 flex-1">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-40" />
          </div>
        </div>
        <div className="flex gap-1.5 mt-2">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
      </div>
      <div className="p-4 space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
        <Skeleton className="h-3 w-3/5" />
        <Skeleton className="h-8 w-full mt-3" />
      </div>
    </div>
  )

  return (
    <div className="space-y-8 max-w-6xl">

      {/* En-tête */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Templates de projet</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-xl">
            Démarrez chaque nouveau projet avec le bon questionnaire, les bonnes colonnes kanban et les bonnes sections d&apos;onboarding — sans tout reconfigurer à la main.
          </p>
        </div>
        <Button variant="outline" onClick={openFromProjectDialog} className="shrink-0">
          <Plus className="h-4 w-4 mr-2" />
          Depuis un projet
        </Button>
      </div>

      {planError && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive flex items-center justify-between gap-4">
          <span>{planError}</span>
          <a href="/dashboard/settings" className="underline font-medium whitespace-nowrap">Mettre à niveau</a>
        </div>
      )}

      {/* Comment ça marche */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { icon: '👁️', title: 'Prévisualisez', desc: 'Consultez le questionnaire complet et les colonnes kanban avant d\'utiliser' },
          { icon: '✏️', title: 'Personnalisez', desc: 'Dupliquez un modèle et modifiez-le à votre guise' },
          { icon: '🚀', title: 'Créez en 1 clic', desc: 'Projet pré-configuré : kanban, sections, questions' },
        ].map(item => (
          <div key={item.icon} className="flex items-start gap-3 p-4 rounded-xl bg-gray-50 border border-gray-100">
            <span className="text-xl shrink-0">{item.icon}</span>
            <div>
              <p className="font-semibold text-sm text-gray-900">{item.title}</p>
              <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Bibliothèque */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
          <h2 className="text-base font-semibold">Bibliothèque</h2>
          <Badge variant="secondary" className="text-xs">{defaults.length}</Badge>
          <span className="text-xs text-muted-foreground ml-1">— Cliquez sur une carte pour prévisualiser</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {loading
            ? [1, 2, 3, 4].map(i => <SkeletonCard key={i} />)
            : defaults.map(t => (
                <TemplateCard
                  key={t.id}
                  template={t}
                  onPreview={setPreviewTemplate}
                  onUse={handleUse}
                  onDuplicate={handleDuplicate}
                />
              ))
          }
        </div>
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
            <SkeletonCard />
          </div>
        ) : mine.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 gap-4 text-center border-2 border-dashed rounded-xl bg-gray-50/50">
            <div className="w-14 h-14 rounded-2xl bg-white border shadow-sm flex items-center justify-center text-2xl">📋</div>
            <div>
              <p className="font-semibold text-sm text-gray-900">Aucun template personnalisé</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                Dupliquez un template de la bibliothèque pour le modifier, ou sauvegardez la configuration d&apos;un projet existant.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => defaults[0] && setPreviewTemplate(defaults[0])} disabled={defaults.length === 0}>
                <Eye className="h-3.5 w-3.5 mr-1.5" />
                Voir les modèles
              </Button>
              <Button size="sm" onClick={openFromProjectDialog}>
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Depuis un projet
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {mine.map(t => (
              <TemplateCard
                key={t.id}
                template={t}
                onPreview={setPreviewTemplate}
                onUse={handleUse}
                onEdit={handleEdit}
                onDuplicate={handleDuplicate}
                onDelete={setDeleteTarget}
              />
            ))}
            <button
              onClick={openFromProjectDialog}
              className="rounded-xl border-2 border-dashed border-gray-200 hover:border-primary/40 hover:bg-primary/5 transition-colors flex flex-col items-center justify-center gap-3 p-8 text-center min-h-[240px] group"
            >
              <div className="w-10 h-10 rounded-xl bg-gray-100 group-hover:bg-primary/10 flex items-center justify-center transition-colors">
                <Plus className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm text-gray-700">Nouveau template</p>
                <p className="text-xs text-muted-foreground mt-1">Depuis un projet existant</p>
              </div>
            </button>
          </div>
        )}
      </section>

      {/* Tip */}
      <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 px-5 py-4">
        <span className="text-lg shrink-0">💡</span>
        <p className="text-sm text-blue-800">
          <span className="font-semibold">Astuce :</span>{' '}
          Configurez un projet avec votre questionnaire idéal, puis sauvegardez-le comme template depuis l&apos;éditeur d&apos;onboarding.
          Tous vos prochains projets similaires seront prêts en 10 secondes.
          <button onClick={openFromProjectDialog} className="inline-flex items-center gap-1 ml-2 underline font-medium hover:no-underline">
            Sauvegarder depuis un projet <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </p>
      </div>

      {/* ── Preview Drawer ── */}
      <TemplatePreviewDrawer
        template={previewTemplate}
        onClose={() => setPreviewTemplate(null)}
        onUse={handleUse}
        onEdit={handleEdit}
        onDuplicate={handleDuplicate}
      />

      {/* ── Dialog : depuis un projet ── */}
      <Dialog open={fromProjectOpen} onOpenChange={(v) => { if (!v) setFromProjectOpen(false) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Créer un template depuis un projet</DialogTitle>
            <DialogDescription>
              La configuration complète sera copiée : colonnes kanban, sections et questions d&apos;onboarding.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveFromProject} className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>Nom du template <span className="text-destructive">*</span></Label>
              <Input value={saveName} onChange={(e) => setSaveName(e.target.value)} placeholder="Ex : Site vitrine client type" required />
            </div>
            <div className="space-y-2">
              <Label>Description <span className="text-xs text-muted-foreground">(optionnel)</span></Label>
              <Textarea value={saveDescription} onChange={(e) => setSaveDescription(e.target.value)} placeholder="Pour quel type de mission ?" rows={2} />
            </div>
            <div className="space-y-2">
              <Label>Copier depuis un projet <span className="text-xs text-muted-foreground">(optionnel)</span></Label>
              <Select value={saveProjectId} onValueChange={(v) => setSaveProjectId(v ?? '')}>
                <SelectTrigger>
                  <SelectValue placeholder="Colonnes par défaut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Colonnes kanban par défaut (vierge)</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {saveProjectId ? '✓ Kanban, sections et questions du projet seront copiés.' : 'Sans projet source : 4 colonnes par défaut.'}
              </p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFromProjectOpen(false)} disabled={saving}>Annuler</Button>
              <Button type="submit" disabled={saving || !saveName.trim()}>{saving ? 'Création...' : 'Créer le template'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Confirmation suppression ── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => { if (!v) setDeleteTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer « {deleteTarget?.name} » ?</AlertDialogTitle>
            <AlertDialogDescription>
              Ce template sera supprimé définitivement. Les projets existants ne seront pas affectés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? 'Suppression...' : 'Supprimer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Loading duplication */}
      {duplicating && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-6 flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-medium">Duplication en cours...</p>
          </div>
        </div>
      )}
    </div>
  )
}
