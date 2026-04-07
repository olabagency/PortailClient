'use client'

import { useState, useEffect, use, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  ArrowLeft, Plus, MessageSquare, Wrench, HelpCircle,
  CheckCircle2, ChevronLeft, ChevronRight, Lock,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type FeedbackStatus = 'pending' | 'in_progress' | 'treated'
type FeedbackType = 'feedback' | 'modification_request' | 'question'

interface FeedbackItem {
  id: string
  project_id: string
  deliverable_id: string | null
  phase: number
  title: string
  content: string | null
  type: FeedbackType
  status: FeedbackStatus
  source: 'client' | 'freelance'
  created_at: string
  updated_at: string
}

interface FeedbackStats {
  total: number
  pending: number
  in_progress: number
  treated: number
  questions: number
}

interface Deliverable {
  id: string
  name: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_CYCLE: FeedbackStatus[] = ['pending', 'in_progress', 'treated']

function nextFeedbackStatus(current: FeedbackStatus): FeedbackStatus {
  const idx = STATUS_CYCLE.indexOf(current)
  return STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length]
}

function StatusBadge({ status }: { status: FeedbackStatus }) {
  if (status === 'treated') {
    return (
      <Badge className="text-xs py-0 bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100 shrink-0">
        <CheckCircle2 className="h-3 w-3 mr-1" />
        Traité
      </Badge>
    )
  }
  if (status === 'in_progress') {
    return (
      <Badge className="text-xs py-0 bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100 shrink-0">
        En cours
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="text-xs py-0 shrink-0">
      À traiter
    </Badge>
  )
}

function TypeIcon({ type }: { type: FeedbackType }) {
  if (type === 'modification_request') return <Wrench className="h-3.5 w-3.5 text-orange-500 shrink-0" />
  if (type === 'question') return <HelpCircle className="h-3.5 w-3.5 text-blue-500 shrink-0" />
  return <MessageSquare className="h-3.5 w-3.5 text-violet-500 shrink-0" />
}

function typeLabel(type: FeedbackType): string {
  if (type === 'modification_request') return 'Modification'
  if (type === 'question') return 'Question'
  return 'Retour'
}

// ---------------------------------------------------------------------------
// Add Feedback Dialog
// ---------------------------------------------------------------------------

interface FeedbackFormData {
  title: string
  content: string
  type: FeedbackType
  deliverable_id: string
}

const defaultFeedbackForm = (): FeedbackFormData => ({
  title: '',
  content: '',
  type: 'feedback',
  deliverable_id: '',
})

function AddFeedbackDialog({
  open,
  deliverables,
  onClose,
  onAdd,
}: {
  open: boolean
  deliverables: Deliverable[]
  onClose: () => void
  onAdd: (form: FeedbackFormData) => Promise<void>
}) {
  const [form, setForm] = useState<FeedbackFormData>(defaultFeedbackForm())
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) setForm(defaultFeedbackForm())
  }, [open])

  async function handleSubmit() {
    if (!form.title.trim()) { toast.error('Le titre est requis'); return }
    setSaving(true)
    try {
      await onAdd(form)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ajouter un retour</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="fb-title">Titre <span className="text-destructive">*</span></Label>
            <Input
              id="fb-title"
              placeholder="Ex : Revoir la couleur du bouton principal"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fb-content">Description</Label>
            <Textarea
              id="fb-content"
              placeholder="Détails du retour…"
              rows={3}
              value={form.content}
              onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select
              value={form.type}
              onValueChange={v => setForm(f => ({ ...f, type: v as FeedbackType }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="feedback">Retour général</SelectItem>
                <SelectItem value="modification_request">Demande de modification</SelectItem>
                <SelectItem value="question">Question</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {deliverables.length > 0 && (
            <div className="space-y-1.5">
              <Label>Livrable associé</Label>
              <Select
                value={form.deliverable_id || 'none'}
                onValueChange={(v: string | null) => setForm(f => ({ ...f, deliverable_id: !v || v === 'none' ? '' : v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Aucun livrable" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucun livrable</SelectItem>
                  {deliverables.map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? 'Ajout…' : 'Ajouter'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Feedback item row
// ---------------------------------------------------------------------------

function FeedbackRow({
  item,
  deliverables,
  onStatusCycle,
}: {
  item: FeedbackItem
  deliverables: Deliverable[]
  onStatusCycle: (id: string, next: FeedbackStatus) => void
}) {
  const deliverableName = deliverables.find(d => d.id === item.deliverable_id)?.name ?? null

  return (
    <div className="flex items-start gap-3 bg-white border rounded-lg px-4 py-3 group">
      <TypeIcon type={item.type} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">{item.title}</span>
          {item.source === 'client' && (
            <Badge variant="secondary" className="text-xs py-0">Client</Badge>
          )}
          {deliverableName && (
            <span className="text-xs text-muted-foreground bg-muted rounded px-1.5 py-0.5">
              {deliverableName}
            </span>
          )}
        </div>
        {item.content && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.content}</p>
        )}
        <p className="text-xs text-muted-foreground mt-1">
          {typeLabel(item.type)} · {format(new Date(item.created_at), 'd MMM yyyy', { locale: fr })}
        </p>
      </div>

      <button
        onClick={() => onStatusCycle(item.id, nextFeedbackStatus(item.status))}
        className="shrink-0 hover:opacity-75 transition-opacity"
        title="Changer le statut"
      >
        <StatusBadge status={item.status} />
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function FeedbackPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: projectId } = use(params)
  const router = useRouter()

  const [feedback, setFeedback] = useState<FeedbackItem[]>([])
  const [stats, setStats] = useState<FeedbackStats>({ total: 0, pending: 0, in_progress: 0, treated: 0, questions: 0 })
  const [currentPhase, setCurrentPhase] = useState(1)
  const [viewPhase, setViewPhase] = useState(1)
  const [deliverables, setDeliverables] = useState<Deliverable[]>([])
  const [loading, setLoading] = useState(true)
  const [closingPhase, setClosingPhase] = useState(false)
  const [addDialogOpen, setAddDialogOpen] = useState(false)

  // -------------------------------------------------------------------------
  // Fetch
  // -------------------------------------------------------------------------

  const fetchFeedback = useCallback(async (phase?: number) => {
    try {
      const targetPhase = phase ?? viewPhase
      const res = await fetch(`/api/projects/${projectId}/feedback?phase=${targetPhase}`)
      if (!res.ok) throw new Error()
      const json = (await res.json()) as {
        data: {
          feedback: FeedbackItem[]
          stats: FeedbackStats
          current_phase: number
        }
      }
      setFeedback(json.data.feedback)
      setStats(json.data.stats)
      setCurrentPhase(json.data.current_phase)
      if (phase === undefined) setViewPhase(json.data.current_phase)
    } catch {
      toast.error('Impossible de charger les retours')
    } finally {
      setLoading(false)
    }
  }, [projectId, viewPhase])

  const fetchDeliverables = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/deliverables`)
      if (!res.ok) return
      const json = (await res.json()) as { data: Deliverable[] }
      setDeliverables(json.data ?? [])
    } catch {
      // Silently ignore
    }
  }, [projectId])

  useEffect(() => {
    void fetchFeedback()
    void fetchDeliverables()
  }, [fetchDeliverables]) // eslint-disable-line react-hooks/exhaustive-deps

  // -------------------------------------------------------------------------
  // Phase navigation
  // -------------------------------------------------------------------------

  async function navigatePhase(newPhase: number) {
    if (newPhase < 1 || newPhase > currentPhase) return
    setViewPhase(newPhase)
    setLoading(true)
    await fetchFeedback(newPhase)
  }

  // -------------------------------------------------------------------------
  // Close phase
  // -------------------------------------------------------------------------

  async function handleClosePhase() {
    if (viewPhase !== currentPhase) return
    setClosingPhase(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/feedback/phase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_phase: currentPhase }),
      })
      if (!res.ok) throw new Error()
      const json = (await res.json()) as { data: { new_phase: number } }
      const newPhase = json.data.new_phase
      setCurrentPhase(newPhase)
      setViewPhase(newPhase)
      setFeedback([])
      setStats({ total: 0, pending: 0, in_progress: 0, treated: 0, questions: 0 })
      toast.success(`Phase ${newPhase - 1} clôturée · Phase ${newPhase} ouverte`)
    } catch {
      toast.error('Erreur lors de la clôture de la phase')
    } finally {
      setClosingPhase(false)
    }
  }

  // -------------------------------------------------------------------------
  // Add feedback
  // -------------------------------------------------------------------------

  async function handleAddFeedback(form: FeedbackFormData) {
    const res = await fetch(`/api/projects/${projectId}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: form.title.trim(),
        content: form.content.trim() || null,
        type: form.type,
        deliverable_id: form.deliverable_id || null,
        phase: viewPhase,
        source: 'freelance',
      }),
    })
    if (!res.ok) throw new Error()
    const { data } = (await res.json()) as { data: FeedbackItem }
    setFeedback(prev => [data, ...prev])
    setStats(s => ({
      ...s,
      total: s.total + 1,
      pending: s.pending + 1,
      questions: data.type === 'question' ? s.questions + 1 : s.questions,
    }))
    toast.success('Retour ajouté')
  }

  // -------------------------------------------------------------------------
  // Status cycle
  // -------------------------------------------------------------------------

  async function handleStatusCycle(id: string, next: FeedbackStatus) {
    const prev = feedback
    const item = feedback.find(f => f.id === id)
    if (!item) return

    setFeedback(fs => fs.map(f => (f.id === id ? { ...f, status: next } : f)))

    // Update stats
    setStats(s => {
      const updated = { ...s }
      if (item.status === 'pending') updated.pending = Math.max(0, s.pending - 1)
      if (item.status === 'in_progress') updated.in_progress = Math.max(0, s.in_progress - 1)
      if (item.status === 'treated') updated.treated = Math.max(0, s.treated - 1)
      if (next === 'pending') updated.pending += 1
      if (next === 'in_progress') updated.in_progress += 1
      if (next === 'treated') updated.treated += 1
      return updated
    })

    try {
      const res = await fetch(`/api/projects/${projectId}/feedback/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      })
      if (!res.ok) throw new Error()
    } catch {
      toast.error('Erreur lors de la mise à jour')
      setFeedback(prev)
    }
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  const isCurrentPhase = viewPhase === currentPhase

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
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
            <h1 className="text-2xl font-semibold">Retours clients</h1>
            <p className="text-sm text-muted-foreground">
              Gérez les retours et demandes de modifications du client
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isCurrentPhase && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleClosePhase}
              disabled={closingPhase}
            >
              <Lock className="h-3.5 w-3.5 mr-1.5" />
              {closingPhase ? 'Clôture…' : 'Clôturer la phase'}
            </Button>
          )}
          <Button onClick={() => setAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Ajouter un retour
          </Button>
        </div>
      </div>

      {/* Phase selector */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => navigatePhase(viewPhase - 1)}
          disabled={viewPhase <= 1}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <Badge
          className={[
            'px-3 py-1 text-sm font-medium cursor-default select-none',
            isCurrentPhase
              ? 'bg-pink-100 text-pink-700 border-pink-200 hover:bg-pink-100'
              : 'bg-muted text-muted-foreground hover:bg-muted',
          ].join(' ')}
        >
          Phase {viewPhase}
          {!isCurrentPhase && (
            <Lock className="h-3 w-3 ml-1.5 inline-block" />
          )}
        </Badge>

        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => navigatePhase(viewPhase + 1)}
          disabled={viewPhase >= currentPhase}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>

        {currentPhase > 1 && (
          <span className="text-xs text-muted-foreground ml-2">
            {currentPhase} phase{currentPhase > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3 px-4 text-center">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4 text-center">
            <p className="text-2xl font-bold text-gray-500">{stats.pending}</p>
            <p className="text-xs text-muted-foreground mt-0.5">À traiter</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4 text-center">
            <p className="text-2xl font-bold text-blue-500">{stats.in_progress}</p>
            <p className="text-xs text-muted-foreground mt-0.5">En cours</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4 text-center">
            <p className="text-2xl font-bold text-blue-400">{stats.questions}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Questions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4 text-center">
            <p className="text-2xl font-bold text-emerald-500">{stats.treated}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Traités</p>
          </CardContent>
        </Card>
      </div>

      {/* Feedback list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      ) : feedback.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-14 text-center">
            <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
            <h2 className="text-lg font-medium mb-1">
              {isCurrentPhase ? 'Aucun retour pour cette phase' : 'Aucun retour enregistré'}
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              {isCurrentPhase
                ? 'Ajoutez des retours clients ou attendez les retours du portail.'
                : 'Cette phase ne contient aucun retour.'}
            </p>
            {isCurrentPhase && (
              <Button onClick={() => setAddDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Ajouter un retour
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {feedback.map(item => (
            <FeedbackRow
              key={item.id}
              item={item}
              deliverables={deliverables}
              onStatusCycle={handleStatusCycle}
            />
          ))}
        </div>
      )}

      {/* Add Feedback Dialog */}
      <AddFeedbackDialog
        open={addDialogOpen}
        deliverables={deliverables}
        onClose={() => setAddDialogOpen(false)}
        onAdd={handleAddFeedback}
      />
    </div>
  )
}
