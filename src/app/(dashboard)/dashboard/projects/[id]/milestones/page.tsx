'use client'

import { useState, useEffect, use, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import {
  SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy,
  useSortable, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  GripVertical, Plus, Pencil, Trash2, Circle, Clock, CheckCircle2,
  Eye, EyeOff, ListChecks, ArrowLeft,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type MilestoneStatus = 'pending' | 'in_progress' | 'completed'

interface Milestone {
  id: string
  title: string
  description: string | null
  status: MilestoneStatus
  due_date: string | null
  visible_to_client: boolean
  order_index: number
}

interface MilestoneFormData {
  title: string
  description: string
  status: MilestoneStatus
  due_date: string
  visible_to_client: boolean
}

const defaultForm = (): MilestoneFormData => ({
  title: '',
  description: '',
  status: 'pending',
  due_date: '',
  visible_to_client: true,
})

// ---------------------------------------------------------------------------
// Status helpers
// ---------------------------------------------------------------------------

const STATUS_CYCLE: MilestoneStatus[] = ['pending', 'in_progress', 'completed']

function nextStatus(current: MilestoneStatus): MilestoneStatus {
  const idx = STATUS_CYCLE.indexOf(current)
  return STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length]
}

function StatusIcon({ status }: { status: MilestoneStatus }) {
  if (status === 'completed') {
    return <CheckCircle2 className="h-5 w-5" style={{ color: '#10B981' }} />
  }
  if (status === 'in_progress') {
    return <Clock className="h-5 w-5" style={{ color: '#3B82F6' }} />
  }
  return <Circle className="h-5 w-5" style={{ color: '#6B7280' }} />
}

function statusLabel(status: MilestoneStatus): string {
  if (status === 'completed') return 'Terminé'
  if (status === 'in_progress') return 'En cours'
  return 'En attente'
}

function statusBadgeVariant(status: MilestoneStatus): 'default' | 'secondary' | 'outline' {
  if (status === 'completed') return 'default'
  if (status === 'in_progress') return 'secondary'
  return 'outline'
}

// ---------------------------------------------------------------------------
// SortableMilestone
// ---------------------------------------------------------------------------

function SortableMilestone({
  milestone,
  onStatusToggle,
  onEdit,
  onDelete,
}: {
  milestone: Milestone
  onStatusToggle: (id: string, next: MilestoneStatus) => void
  onEdit: (m: Milestone) => void
  onDelete: (id: string) => void
}) {
  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging,
  } = useSortable({ id: milestone.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 bg-white border rounded-lg p-4 group"
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab text-muted-foreground hover:text-foreground shrink-0"
        aria-label="Déplacer"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      {/* Status toggle */}
      <button
        onClick={() => onStatusToggle(milestone.id, nextStatus(milestone.status))}
        className="shrink-0 hover:opacity-75 transition-opacity"
        aria-label={`Statut : ${statusLabel(milestone.status)}`}
      >
        <StatusIcon status={milestone.status} />
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={
              milestone.status === 'completed'
                ? 'text-sm font-medium text-muted-foreground line-through'
                : 'text-sm font-medium'
            }
          >
            {milestone.title}
          </span>
          <Badge variant={statusBadgeVariant(milestone.status)} className="text-xs py-0">
            {statusLabel(milestone.status)}
          </Badge>
        </div>
        {milestone.description && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{milestone.description}</p>
        )}
        {milestone.due_date && (
          <p className="text-xs text-muted-foreground mt-0.5">
            Date limite :{' '}
            {format(new Date(milestone.due_date), 'd MMM yyyy', { locale: fr })}
          </p>
        )}
      </div>

      {/* Visibility + actions */}
      <div className="flex items-center gap-1 shrink-0">
        <span className="text-muted-foreground" aria-label={milestone.visible_to_client ? 'Visible client' : 'Masqué client'}>
          {milestone.visible_to_client
            ? <Eye className="h-4 w-4" />
            : <EyeOff className="h-4 w-4" />
          }
        </span>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onEdit(milestone)}
            aria-label="Modifier"
          >
            <Pencil className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={() => onDelete(milestone.id)}
            aria-label="Supprimer"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function MilestonesPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: projectId } = use(params)
  const router = useRouter()

  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null)
  const [form, setForm] = useState<MilestoneFormData>(defaultForm())

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  // -------------------------------------------------------------------------
  // Fetch
  // -------------------------------------------------------------------------

  const fetchMilestones = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/milestones`)
      if (!res.ok) throw new Error('Erreur lors du chargement')
      const json = (await res.json()) as { data: Milestone[] }
      setMilestones(json.data ?? [])
    } catch {
      toast.error('Impossible de charger les étapes')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    void fetchMilestones()
  }, [fetchMilestones])

  // -------------------------------------------------------------------------
  // Stats
  // -------------------------------------------------------------------------

  const total = milestones.length
  const completedCount = milestones.filter(m => m.status === 'completed').length
  const inProgressCount = milestones.filter(m => m.status === 'in_progress').length
  const pendingCount = milestones.filter(m => m.status === 'pending').length
  const pct = total > 0 ? Math.round((completedCount / total) * 100) : 0

  // -------------------------------------------------------------------------
  // DnD reorder
  // -------------------------------------------------------------------------

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = milestones.findIndex(m => m.id === active.id)
    const newIndex = milestones.findIndex(m => m.id === over.id)
    const reordered = arrayMove(milestones, oldIndex, newIndex).map((m, i) => ({
      ...m,
      order_index: i,
    }))
    setMilestones(reordered)

    try {
      const res = await fetch(`/api/projects/${projectId}/milestones/reorder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: reordered.map(m => ({ id: m.id, order_index: m.order_index })),
        }),
      })
      if (!res.ok) throw new Error()
    } catch {
      toast.error('Erreur lors de la réorganisation')
      void fetchMilestones()
    }
  }

  // -------------------------------------------------------------------------
  // Status toggle
  // -------------------------------------------------------------------------

  async function handleStatusToggle(id: string, next: MilestoneStatus) {
    setMilestones(prev =>
      prev.map(m => (m.id === id ? { ...m, status: next } : m)),
    )
    try {
      const res = await fetch(`/api/projects/${projectId}/milestones/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      })
      if (!res.ok) throw new Error()
    } catch {
      toast.error('Erreur lors de la mise à jour du statut')
      void fetchMilestones()
    }
  }

  // -------------------------------------------------------------------------
  // Delete
  // -------------------------------------------------------------------------

  async function handleDelete(id: string) {
    const prev = milestones
    setMilestones(ms => ms.filter(m => m.id !== id))
    try {
      const res = await fetch(`/api/projects/${projectId}/milestones/${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error()
      toast.success('Étape supprimée')
    } catch {
      toast.error('Erreur lors de la suppression')
      setMilestones(prev)
    }
  }

  // -------------------------------------------------------------------------
  // Dialog helpers
  // -------------------------------------------------------------------------

  function openAddDialog() {
    setEditingMilestone(null)
    setForm(defaultForm())
    setDialogOpen(true)
  }

  function openEditDialog(m: Milestone) {
    setEditingMilestone(m)
    setForm({
      title: m.title,
      description: m.description ?? '',
      status: m.status,
      due_date: m.due_date ?? '',
      visible_to_client: m.visible_to_client,
    })
    setDialogOpen(true)
  }

  function closeDialog() {
    setDialogOpen(false)
    setEditingMilestone(null)
    setForm(defaultForm())
  }

  // -------------------------------------------------------------------------
  // Save (create or update)
  // -------------------------------------------------------------------------

  async function handleSave() {
    if (!form.title.trim()) {
      toast.error('Le titre est requis')
      return
    }
    setSaving(true)
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        status: form.status,
        due_date: form.due_date || null,
        visible_to_client: form.visible_to_client,
      }

      if (editingMilestone) {
        const res = await fetch(
          `/api/projects/${projectId}/milestones/${editingMilestone.id}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          },
        )
        if (!res.ok) throw new Error()
        const json = (await res.json()) as { data: Milestone }
        setMilestones(prev =>
          prev.map(m => (m.id === editingMilestone.id ? json.data : m)),
        )
        toast.success('Étape mise à jour')
      } else {
        const res = await fetch(`/api/projects/${projectId}/milestones`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error()
        const json = (await res.json()) as { data: Milestone }
        setMilestones(prev => [...prev, json.data])
        toast.success('Étape ajoutée')
      }

      closeDialog()
    } catch {
      toast.error('Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            aria-label="Retour"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">Timeline</h1>
            <p className="text-sm text-muted-foreground">Suivez l&apos;avancement par étapes</p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {total > 0 && (
            <span className="text-sm text-muted-foreground hidden sm:block">
              {completedCount}/{total} étapes · {pct}&nbsp;%
            </span>
          )}
          <Button onClick={openAddDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Ajouter une étape
          </Button>
        </div>
      </div>

      {/* Progress overview */}
      {!loading && total > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Progression</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Progress bar */}
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <div
                style={{ width: `${pct}%` }}
                className="h-2 bg-primary rounded-full transition-all duration-500"
              />
            </div>

            {/* Stats row */}
            <div className="flex flex-wrap gap-4 text-sm">
              <span className="flex items-center gap-1.5">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: '#10B981' }}
                />
                <span style={{ color: '#10B981' }} className="font-medium">
                  {completedCount} terminée{completedCount > 1 ? 's' : ''}
                </span>
              </span>
              <span className="flex items-center gap-1.5">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: '#3B82F6' }}
                />
                <span style={{ color: '#3B82F6' }} className="font-medium">
                  {inProgressCount} en cours
                </span>
              </span>
              <span className="flex items-center gap-1.5">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: '#6B7280' }}
                />
                <span style={{ color: '#6B7280' }} className="font-medium">
                  {pendingCount} en attente
                </span>
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Milestone list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      ) : milestones.length === 0 ? (
        /* Empty state */
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <ListChecks className="h-12 w-12 text-muted-foreground mb-4" />
            <h2 className="text-lg font-medium mb-1">Aucune étape définie</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Ajoutez des étapes pour suivre l&apos;avancement du projet.
            </p>
            <Button onClick={openAddDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Ajouter la première étape
            </Button>
          </CardContent>
        </Card>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={milestones.map(m => m.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {milestones.map(milestone => (
                <SortableMilestone
                  key={milestone.id}
                  milestone={milestone}
                  onStatusToggle={handleStatusToggle}
                  onEdit={openEditDialog}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={open => { if (!open) closeDialog() }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingMilestone ? 'Modifier l\'étape' : 'Nouvelle étape'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Titre */}
            <div className="space-y-1.5">
              <Label htmlFor="milestone-title">Titre <span className="text-destructive">*</span></Label>
              <Input
                id="milestone-title"
                placeholder="Ex : Livraison maquettes"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="milestone-desc">Description</Label>
              <Textarea
                id="milestone-desc"
                placeholder="Détails sur cette étape…"
                rows={3}
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>

            {/* Statut */}
            <div className="space-y-1.5">
              <Label htmlFor="milestone-status">Statut</Label>
              <Select
                value={form.status}
                onValueChange={v => setForm(f => ({ ...f, status: v as MilestoneStatus }))}
              >
                <SelectTrigger id="milestone-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">En attente</SelectItem>
                  <SelectItem value="in_progress">En cours</SelectItem>
                  <SelectItem value="completed">Terminé</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date limite */}
            <div className="space-y-1.5">
              <Label htmlFor="milestone-due">Date limite</Label>
              <Input
                id="milestone-due"
                type="date"
                value={form.due_date}
                onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
              />
            </div>

            {/* Visible client */}
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="milestone-visible" className="text-sm font-medium">
                  Visible par le client
                </Label>
                <p className="text-xs text-muted-foreground">
                  Afficher cette étape dans le portail client
                </p>
              </div>
              <Switch
                id="milestone-visible"
                checked={form.visible_to_client}
                onCheckedChange={checked => setForm(f => ({ ...f, visible_to_client: checked }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} disabled={saving}>
              Annuler
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Enregistrement…' : editingMilestone ? 'Mettre à jour' : 'Ajouter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
