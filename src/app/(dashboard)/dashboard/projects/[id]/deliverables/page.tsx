'use client'

import { useState, useEffect, use, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  ArrowLeft, FolderOpen, FileText, Link2, Plus, Trash2,
  CheckCircle2, XCircle, Clock, AlertCircle, Upload,
  MessageSquare, Wrench, HelpCircle,
  Info, RotateCcw, CheckCheck, LayersIcon, Send, Loader2 as Loader2Icon,
  ExternalLink, Image as ImageIcon, Play, GitBranch,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Types — Deliverables
// ---------------------------------------------------------------------------

type DeliverableStatus = 'pending' | 'validated' | 'rejected' | 'revision_requested'
type DeliverableType = 'file' | 'link'

interface Deliverable {
  id: string
  project_id: string
  milestone_id: string | null
  name: string
  description: string | null
  type: DeliverableType
  url: string
  s3_key: string | null
  size_bytes: number | null
  mime_type: string | null
  status: DeliverableStatus
  client_note: string | null
  created_at: string
  updated_at: string
}

interface Milestone {
  id: string
  title: string
}

// ---------------------------------------------------------------------------
// Types — Feedback
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
  media_urls: string[] | null
  created_at: string
  updated_at: string
}

interface FeedbackComment {
  id: string
  feedback_id: string
  content: string
  source: 'client' | 'freelance'
  commenter_name: string | null
  created_at: string
}

interface FeedbackStats {
  total: number
  pending: number
  in_progress: number
  treated: number
  questions: number
}

interface DeliverableMin {
  id: string
  name: string
}

// ---------------------------------------------------------------------------
// Helpers — Deliverables
// ---------------------------------------------------------------------------

function deliverableStatusLabel(status: DeliverableStatus): string {
  switch (status) {
    case 'pending': return 'En attente'
    case 'validated': return 'Validé'
    case 'rejected': return 'Refusé'
    case 'revision_requested': return 'Révision demandée'
  }
}

function deliverableStatusBorderClass(status: DeliverableStatus): string {
  switch (status) {
    case 'validated': return 'border-l-4 border-l-emerald-400'
    case 'rejected': return 'border-l-4 border-l-red-400'
    case 'revision_requested': return 'border-l-4 border-l-orange-400'
    default: return 'border-l-4 border-l-gray-200'
  }
}

function DeliverableStatusBadge({ status }: { status: DeliverableStatus }) {
  if (status === 'validated') {
    return (
      <Badge className="text-xs py-0.5 px-2 bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100 gap-1">
        <CheckCircle2 className="h-3 w-3" />
        Validé
      </Badge>
    )
  }
  if (status === 'rejected') {
    return (
      <Badge className="text-xs py-0.5 px-2 bg-red-100 text-red-700 border-red-200 hover:bg-red-100 gap-1">
        <XCircle className="h-3 w-3" />
        Refusé
      </Badge>
    )
  }
  if (status === 'revision_requested') {
    return (
      <Badge className="text-xs py-0.5 px-2 bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-100 gap-1">
        <AlertCircle className="h-3 w-3" />
        Révision demandée
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="text-xs py-0.5 px-2 gap-1">
      <Clock className="h-3 w-3" />
      En attente
    </Badge>
  )
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

// ---------------------------------------------------------------------------
// Helpers — Feedback
// ---------------------------------------------------------------------------

const STATUS_CYCLE: FeedbackStatus[] = ['pending', 'in_progress', 'treated']

function nextFeedbackStatus(current: FeedbackStatus): FeedbackStatus {
  const idx = STATUS_CYCLE.indexOf(current)
  return STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length]
}

function feedbackStatusBorderClass(status: FeedbackStatus): string {
  switch (status) {
    case 'treated': return 'border-l-4 border-l-emerald-400'
    case 'in_progress': return 'border-l-4 border-l-blue-400'
    default: return 'border-l-4 border-l-gray-200'
  }
}

function FeedbackStatusBadge({ status }: { status: FeedbackStatus }) {
  if (status === 'treated') {
    return (
      <Badge className="text-xs py-0.5 px-2 bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100 shrink-0 gap-1">
        <CheckCircle2 className="h-3 w-3" />
        Traité
      </Badge>
    )
  }
  if (status === 'in_progress') {
    return (
      <Badge className="text-xs py-0.5 px-2 bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100 shrink-0">
        En cours
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="text-xs py-0.5 px-2 shrink-0 text-gray-500">
      À traiter
    </Badge>
  )
}

function TypeBadge({ type }: { type: FeedbackType }) {
  if (type === 'modification_request') {
    return (
      <Badge className="text-xs py-0.5 px-2 bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-100 gap-1 shrink-0">
        <Wrench className="h-3 w-3" />
        Modification
      </Badge>
    )
  }
  if (type === 'question') {
    return (
      <Badge className="text-xs py-0.5 px-2 bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100 gap-1 shrink-0">
        <HelpCircle className="h-3 w-3" />
        Question
      </Badge>
    )
  }
  return (
    <Badge className="text-xs py-0.5 px-2 bg-violet-100 text-violet-700 border-violet-200 hover:bg-violet-100 gap-1 shrink-0">
      <MessageSquare className="h-3 w-3" />
      Retour
    </Badge>
  )
}

function typeLabel(type: FeedbackType): string {
  if (type === 'modification_request') return 'Modification'
  if (type === 'question') return 'Question'
  return 'Retour'
}

// ---------------------------------------------------------------------------
// Deliverable — Detail dialog
// ---------------------------------------------------------------------------

function DetailDialog({
  open,
  deliverable,
  milestones,
  onClose,
  onUpdate,
  onDelete,
}: {
  open: boolean
  deliverable: Deliverable | null
  milestones: Milestone[]
  onClose: () => void
  onUpdate: (id: string, patch: Partial<Deliverable>) => Promise<void>
  onDelete: (id: string) => Promise<void>
}) {
  const [status, setStatus] = useState<DeliverableStatus>('pending')
  const [milestoneId, setMilestoneId] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (deliverable) {
      setStatus(deliverable.status)
      setMilestoneId(deliverable.milestone_id ?? '')
    }
  }, [deliverable])

  if (!deliverable) return null

  async function handleSave() {
    if (!deliverable) return
    setSaving(true)
    try {
      await onUpdate(deliverable.id, {
        status,
        milestone_id: milestoneId || null,
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deliverable) return
    setDeleting(true)
    try {
      await onDelete(deliverable.id)
      onClose()
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={open => { if (!open) onClose() }}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {deliverable.type === 'file'
              ? <FileText className="h-4 w-4 text-muted-foreground" />
              : <Link2 className="h-4 w-4 text-muted-foreground" />
            }
            {deliverable.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Statut */}
          <div className="space-y-1.5">
            <Label>Statut</Label>
            <Select value={status} onValueChange={v => setStatus(v as DeliverableStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">En attente</SelectItem>
                <SelectItem value="validated">Validé</SelectItem>
                <SelectItem value="rejected">Refusé</SelectItem>
                <SelectItem value="revision_requested">Révision demandée</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Note client */}
          {deliverable.client_note && (
            <div className="space-y-1.5">
              <Label>Note du client</Label>
              <div className="rounded-md border bg-muted/50 p-3 text-sm text-muted-foreground">
                {deliverable.client_note}
              </div>
            </div>
          )}

          {/* Étape associée */}
          <div className="space-y-1.5">
            <Label>Étape associée</Label>
            <Select
              value={milestoneId || 'none'}
              onValueChange={(v: string | null) => setMilestoneId(!v || v === 'none' ? '' : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Aucune étape" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Aucune étape</SelectItem>
                {milestones.map(m => (
                  <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Infos fichier */}
          {deliverable.type === 'file' && deliverable.size_bytes && (
            <p className="text-xs text-muted-foreground">
              Taille : {formatFileSize(deliverable.size_bytes)}
              {deliverable.mime_type && ` · ${deliverable.mime_type}`}
            </p>
          )}

          {/* URL pour les liens */}
          {deliverable.type === 'link' && (
            <div className="space-y-1.5">
              <Label>URL</Label>
              <a
                href={deliverable.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-sm text-primary underline truncate"
              >
                {deliverable.url}
              </a>
            </div>
          )}
        </div>

        <DialogFooter className="flex-row justify-between gap-2">
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleting || saving}
            size="sm"
          >
            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
            {deleting ? 'Suppression…' : 'Supprimer'}
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={saving || deleting}>
              Fermer
            </Button>
            <Button onClick={handleSave} disabled={saving || deleting}>
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Deliverable — Add Link Dialog
// ---------------------------------------------------------------------------

interface LinkFormData {
  name: string
  url: string
  description: string
  milestone_id: string
}

const defaultLinkForm = (): LinkFormData => ({
  name: '',
  url: '',
  description: '',
  milestone_id: '',
})

function AddLinkDialog({
  open,
  milestones,
  onClose,
  onAdd,
}: {
  open: boolean
  milestones: Milestone[]
  onClose: () => void
  onAdd: (form: LinkFormData) => Promise<void>
}) {
  const [form, setForm] = useState<LinkFormData>(defaultLinkForm())
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) setForm(defaultLinkForm())
  }, [open])

  async function handleSubmit() {
    if (!form.name.trim()) { toast.error('Le nom est requis'); return }
    if (!form.url.trim()) { toast.error("L'URL est requise"); return }
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
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Ajouter un lien</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="link-name">Nom <span className="text-destructive">*</span></Label>
            <Input
              id="link-name"
              placeholder="Ex : Maquette Figma"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="link-url">URL <span className="text-destructive">*</span></Label>
            <Input
              id="link-url"
              type="url"
              placeholder="https://…"
              value={form.url}
              onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="link-desc">Description</Label>
            <Textarea
              id="link-desc"
              placeholder="Description du livrable…"
              rows={2}
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Étape associée</Label>
            <Select
              value={form.milestone_id || 'none'}
              onValueChange={(v: string | null) => setForm(f => ({ ...f, milestone_id: !v || v === 'none' ? '' : v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Aucune étape" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Aucune étape</SelectItem>
                {milestones.map(m => (
                  <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
// Feedback — Add Feedback Dialog
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
  deliverables: DeliverableMin[]
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
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Nouveau retour ou question</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Type selector — visual pills */}
          <div className="space-y-1.5">
            <Label>Type</Label>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { value: 'feedback', label: 'Retour', icon: MessageSquare, color: 'violet' },
                  { value: 'modification_request', label: 'Modification', icon: Wrench, color: 'orange' },
                  { value: 'question', label: 'Question', icon: HelpCircle, color: 'blue' },
                ] as const
              ).map(({ value, label, icon: Icon, color }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, type: value }))}
                  className={[
                    'flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 text-xs font-medium transition-all',
                    form.type === value
                      ? color === 'violet'
                        ? 'border-violet-400 bg-violet-50 text-violet-700'
                        : color === 'orange'
                          ? 'border-orange-400 bg-orange-50 text-orange-700'
                          : 'border-blue-400 bg-blue-50 text-blue-700'
                      : 'border-border bg-background text-muted-foreground hover:border-muted-foreground/40',
                  ].join(' ')}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>

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
            <Label htmlFor="fb-content">Description <span className="text-muted-foreground font-normal">(optionnel)</span></Label>
            <Textarea
              id="fb-content"
              placeholder="Détails supplémentaires…"
              rows={3}
              value={form.content}
              onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
            />
          </div>

          {deliverables.length > 0 && (
            <div className="space-y-1.5">
              <Label>Livrable concerné <span className="text-muted-foreground font-normal">(optionnel)</span></Label>
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
// Feedback — Card
// ---------------------------------------------------------------------------
// Feedback Detail Dialog
// ---------------------------------------------------------------------------

function FeedbackDetailDialog({
  item,
  projectId,
  deliverables,
  open,
  onClose,
  onStatusCycle,
}: {
  item: FeedbackItem | null
  projectId: string
  deliverables: DeliverableMin[]
  open: boolean
  onClose: () => void
  onStatusCycle: (id: string, next: FeedbackStatus) => void
}) {
  const [comments, setComments] = useState<FeedbackComment[]>([])
  const [loadingComments, setLoadingComments] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open || !item) return
    setLoadingComments(true)
    fetch(`/api/projects/${projectId}/feedback/${item.id}/comments`)
      .then(r => r.ok ? r.json() as Promise<{ data: FeedbackComment[] }> : { data: [] })
      .then(json => setComments(json.data ?? []))
      .finally(() => setLoadingComments(false))
  }, [open, item, projectId])

  async function handleSubmitComment() {
    if (!item || !commentText.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/feedback/${item.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: commentText.trim() }),
      })
      if (!res.ok) throw new Error()
      const json = (await res.json()) as { data: FeedbackComment }
      setComments(prev => [...prev, json.data])
      setCommentText('')
      toast.success('Commentaire envoyé')
    } catch {
      toast.error('Erreur lors de l\'envoi')
    } finally {
      setSubmitting(false)
    }
  }

  if (!item) return null

  const deliverableName = deliverables.find(d => d.id === item.deliverable_id)?.name ?? null
  const mediaUrls = item.media_urls?.filter(Boolean) ?? []

  function isVideo(url: string) {
    return /\.(mp4|mov|webm|avi)(\?|$)/i.test(url)
  }

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <TypeBadge type={item.type} />
            <span className="flex-1 truncate">{item.title}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 space-y-4 py-2">
          {/* Meta */}
          <div className="flex items-center gap-2 flex-wrap">
            {item.source === 'client' && (
              <Badge variant="secondary" className="text-xs">Du client</Badge>
            )}
            {deliverableName && (
              <span className="text-xs text-muted-foreground bg-muted rounded-md px-2 py-0.5 flex items-center gap-1">
                <FileText className="h-3 w-3" />{deliverableName}
              </span>
            )}
            <span className="text-xs text-muted-foreground ml-auto">
              {format(new Date(item.created_at), "d MMM yyyy 'à' HH'h'mm", { locale: fr })}
            </span>
          </div>

          {/* Content */}
          {item.content && (
            <div className="rounded-lg border bg-muted/40 px-4 py-3 text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
              {item.content}
            </div>
          )}

          {/* Media */}
          {mediaUrls.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Pièces jointes ({mediaUrls.length})
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {mediaUrls.map((url, i) => (
                  isVideo(url) ? (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                      className="relative rounded-lg border overflow-hidden bg-black aspect-video flex items-center justify-center hover:opacity-90 transition-opacity">
                      <Play className="h-8 w-8 text-white/80" />
                      <span className="absolute bottom-1 right-1 text-[10px] text-white/60 bg-black/40 px-1 rounded">Vidéo</span>
                    </a>
                  ) : (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                      className="relative rounded-lg border overflow-hidden aspect-video bg-muted hover:opacity-90 transition-opacity group">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt={`media-${i}`} className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                      <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/20 transition-opacity">
                        <ExternalLink className="h-5 w-5 text-white" />
                      </span>
                    </a>
                  )
                ))}
              </div>
            </div>
          )}

          {/* Status */}
          <div className="flex items-center justify-between border-t pt-3">
            <span className="text-sm text-muted-foreground">Statut du retour</span>
            <button
              onClick={() => onStatusCycle(item.id, nextFeedbackStatus(item.status))}
              className="hover:opacity-75 transition-opacity"
              title="Cliquer pour changer"
            >
              <FeedbackStatusBadge status={item.status} />
            </button>
          </div>

          {/* Comments */}
          <div className="border-t pt-4 space-y-3">
            <p className="text-sm font-semibold flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              Commentaires
              {comments.length > 0 && <span className="text-xs font-normal text-muted-foreground">({comments.length})</span>}
            </p>

            {loadingComments ? (
              <div className="space-y-2">
                <div className="h-12 rounded-lg bg-muted animate-pulse" />
                <div className="h-12 rounded-lg bg-muted animate-pulse" />
              </div>
            ) : comments.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-3">Aucun commentaire. Posez une question au client ci-dessous.</p>
            ) : (
              <div className="space-y-2">
                {comments.map(c => (
                  <div key={c.id} className={`rounded-lg px-3 py-2.5 text-sm border ${c.source === 'client' ? 'bg-blue-50 border-blue-200' : 'bg-muted/40 border-muted'}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-[11px] font-semibold uppercase tracking-wide ${c.source === 'client' ? 'text-blue-600' : 'text-muted-foreground'}`}>
                        {c.commenter_name ?? (c.source === 'client' ? 'Client' : 'Vous')}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {format(new Date(c.created_at), "d MMM 'à' HH'h'mm", { locale: fr })}
                      </span>
                    </div>
                    <p className="text-sm text-gray-800">{c.content}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <Textarea
                placeholder="Demander plus d'infos au client… (⌘+Entrée pour envoyer)"
                rows={2}
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                className="text-sm resize-none"
                onKeyDown={e => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault()
                    void handleSubmitComment()
                  }
                }}
              />
              <Button
                size="icon"
                className="shrink-0 h-[68px] w-9"
                disabled={submitting || !commentText.trim()}
                onClick={() => void handleSubmitComment()}
              >
                {submitting ? <Loader2Icon className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------

function FeedbackRow({
  item,
  deliverables,
  onStatusCycle,
  onOpen,
}: {
  item: FeedbackItem
  deliverables: DeliverableMin[]
  onStatusCycle: (id: string, next: FeedbackStatus) => void
  onOpen: (item: FeedbackItem) => void
}) {
  const deliverableName = deliverables.find(d => d.id === item.deliverable_id)?.name ?? null
  const mediaCount = item.media_urls?.filter(Boolean).length ?? 0

  return (
    <div
      className={[
        'flex items-start gap-4 bg-white rounded-xl px-4 py-4 border transition-shadow hover:shadow-sm group cursor-pointer',
        feedbackStatusBorderClass(item.status),
        item.source === 'client' && item.status === 'pending' ? 'ring-1 ring-blue-200' : '',
      ].join(' ')}
      onClick={() => onOpen(item)}
    >
      {/* Left: type + content */}
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <TypeBadge type={item.type} />
          {item.source === 'client' && (
            <Badge variant="secondary" className="text-xs py-0.5 px-2">Client</Badge>
          )}
          {item.source === 'client' && item.status === 'pending' && (
            <Badge className="text-xs py-0.5 px-2 bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100">À traiter</Badge>
          )}
          {deliverableName && (
            <span className="text-xs text-muted-foreground bg-muted rounded-md px-2 py-0.5 flex items-center gap-1">
              <FileText className="h-3 w-3" />
              {deliverableName}
            </span>
          )}
          {mediaCount > 0 && (
            <span className="text-xs text-muted-foreground bg-muted rounded-md px-2 py-0.5 flex items-center gap-1">
              <ImageIcon className="h-3 w-3" />
              {mediaCount} fichier{mediaCount > 1 ? 's' : ''}
            </span>
          )}
        </div>
        <p className="text-sm font-medium leading-snug">{item.title}</p>
        {item.content && (
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{item.content}</p>
        )}
        <p className="text-xs text-muted-foreground">
          {format(new Date(item.created_at), 'd MMM yyyy', { locale: fr })}
        </p>
      </div>

      {/* Right: status cycle button */}
      <button
        onClick={e => { e.stopPropagation(); onStatusCycle(item.id, nextFeedbackStatus(item.status)) }}
        className="shrink-0 mt-0.5 hover:opacity-75 transition-opacity"
        title="Cliquer pour changer le statut"
      >
        <FeedbackStatusBadge status={item.status} />
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function DeliverablesPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: projectId } = use(params)
  const router = useRouter()
  const searchParams = useSearchParams()

  const defaultTab = searchParams.get('tab') === 'retours' ? 'retours' : 'livrables'

  // ---- Deliverables state ----
  const [deliverables, setDeliverables] = useState<Deliverable[]>([])
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [loadingDeliverables, setLoadingDeliverables] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [selectedDeliverable, setSelectedDeliverable] = useState<Deliverable | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [linkDialogOpen, setLinkDialogOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ---- Timeline link state (post-upload) ----
  const [timelineLinkOpen, setTimelineLinkOpen] = useState(false)
  const [pendingDeliverableForTimeline, setPendingDeliverableForTimeline] = useState<Deliverable | null>(null)
  const [timelineLinkMode, setTimelineLinkMode] = useState<'existing' | 'new' | 'skip'>('existing')
  const [timelineLinkMilestoneId, setTimelineLinkMilestoneId] = useState('')
  const [timelineLinkTitle, setTimelineLinkTitle] = useState('')
  const [timelineLinkPriority, setTimelineLinkPriority] = useState<'normal' | 'high' | 'urgent'>('normal')
  const [timelineLinkDueDate, setTimelineLinkDueDate] = useState('')
  const [timelineLinkSaving, setTimelineLinkSaving] = useState(false)

  // ---- Feedback state ----
  const [feedback, setFeedback] = useState<FeedbackItem[]>([])
  const [stats, setStats] = useState<FeedbackStats>({ total: 0, pending: 0, in_progress: 0, treated: 0, questions: 0 })
  const [loadingFeedback, setLoadingFeedback] = useState(true)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackItem | null>(null)
  const [feedbackDetailOpen, setFeedbackDetailOpen] = useState(false)

  // -------------------------------------------------------------------------
  // Fetch — Deliverables
  // -------------------------------------------------------------------------

  const fetchDeliverables = useCallback(async () => {
    try {
      const [resD, resM] = await Promise.all([
        fetch(`/api/projects/${projectId}/deliverables`),
        fetch(`/api/projects/${projectId}/milestones`),
      ])
      if (!resD.ok) throw new Error()
      const jsonD = (await resD.json()) as { data: Deliverable[] }
      setDeliverables(jsonD.data ?? [])
      if (resM.ok) {
        const jsonM = (await resM.json()) as { data: Milestone[] }
        setMilestones(jsonM.data ?? [])
      }
    } catch {
      toast.error('Impossible de charger les livrables')
    } finally {
      setLoadingDeliverables(false)
    }
  }, [projectId])

  // -------------------------------------------------------------------------
  // Fetch — Feedback
  // -------------------------------------------------------------------------

  const fetchFeedback = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/feedback`)
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
    } catch {
      toast.error('Impossible de charger les retours')
    } finally {
      setLoadingFeedback(false)
    }
  }, [projectId])

  useEffect(() => {
    void fetchDeliverables()
    void fetchFeedback()
  }, [fetchDeliverables]) // eslint-disable-line react-hooks/exhaustive-deps

  // -------------------------------------------------------------------------
  // Upload flow
  // -------------------------------------------------------------------------

  async function uploadFile(file: File) {
    setUploading(true)
    try {
      const presignRes = await fetch(`/api/projects/${projectId}/deliverables/presign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, content_type: file.type }),
      })
      if (!presignRes.ok) {
        const err = (await presignRes.json()) as { error: string }
        toast.error(err.error ?? 'Type de fichier non autorisé')
        return
      }
      const { data: presignData } = (await presignRes.json()) as {
        data: { presign_url: string; s3_key: string }
      }

      const s3Res = await fetch(presignData.presign_url, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      })
      if (!s3Res.ok) throw new Error('Erreur lors de l\'upload')

      const createRes = await fetch(`/api/projects/${projectId}/deliverables`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: file.name,
          type: 'file',
          url: presignData.s3_key,
          s3_key: presignData.s3_key,
          size_bytes: file.size,
          mime_type: file.type,
        }),
      })
      if (!createRes.ok) throw new Error()
      const { data } = (await createRes.json()) as { data: Deliverable }
      setDeliverables(prev => [data, ...prev])
      toast.success(`${file.name} uploadé`)
      // Propose linking to timeline
      setPendingDeliverableForTimeline(data)
      setTimelineLinkTitle(file.name.replace(/\.[^.]+$/, ''))
      setTimelineLinkMode('existing')
      setTimelineLinkMilestoneId('')
      setTimelineLinkDueDate('')
      setTimelineLinkOpen(true)
    } catch {
      toast.error('Erreur lors de l\'upload')
    } finally {
      setUploading(false)
    }
  }

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    Array.from(files).forEach(file => {
      void uploadFile(file)
    })
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    handleFiles(e.dataTransfer.files)
  }

  // -------------------------------------------------------------------------
  // Add link
  // -------------------------------------------------------------------------

  async function handleAddLink(form: LinkFormData) {
    const res = await fetch(`/api/projects/${projectId}/deliverables`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name.trim(),
        description: form.description.trim() || null,
        type: 'link',
        url: form.url.trim(),
        milestone_id: form.milestone_id || null,
      }),
    })
    if (!res.ok) throw new Error()
    const { data } = (await res.json()) as { data: Deliverable }
    setDeliverables(prev => [data, ...prev])
    toast.success('Lien ajouté')
    // Propose linking to timeline
    setPendingDeliverableForTimeline(data)
    setTimelineLinkTitle(form.name.trim())
    setTimelineLinkMode('existing')
    setTimelineLinkMilestoneId('')
    setTimelineLinkDueDate('')
    setTimelineLinkOpen(true)
  }

  // -------------------------------------------------------------------------
  // Update deliverable
  // -------------------------------------------------------------------------

  async function handleUpdate(id: string, patch: Partial<Deliverable>) {
    const res = await fetch(`/api/projects/${projectId}/deliverables/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    if (!res.ok) {
      toast.error('Erreur lors de la mise à jour')
      throw new Error()
    }
    const { data } = (await res.json()) as { data: Deliverable }
    setDeliverables(prev => prev.map(d => (d.id === id ? data : d)))
    toast.success('Livrable mis à jour')
  }

  // -------------------------------------------------------------------------
  // Delete deliverable
  // -------------------------------------------------------------------------

  async function handleDelete(id: string) {
    const res = await fetch(`/api/projects/${projectId}/deliverables/${id}`, {
      method: 'DELETE',
    })
    if (!res.ok) {
      toast.error('Erreur lors de la suppression')
      throw new Error()
    }
    setDeliverables(prev => prev.filter(d => d.id !== id))
    toast.success('Livrable supprimé')
  }

  // -------------------------------------------------------------------------
  // Quick status change on deliverable card
  // -------------------------------------------------------------------------

  async function handleQuickStatus(id: string, newStatus: DeliverableStatus) {
    const res = await fetch(`/api/projects/${projectId}/deliverables/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    if (!res.ok) { toast.error('Erreur lors de la mise à jour'); return }
    const { data } = (await res.json()) as { data: Deliverable }
    setDeliverables(prev => prev.map(d => (d.id === id ? data : d)))
    toast.success(deliverableStatusLabel(newStatus))
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
        phase: 1,
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
  // Timeline link (post-upload)
  // -------------------------------------------------------------------------

  async function handleTimelineLink() {
    if (!pendingDeliverableForTimeline) return
    if (timelineLinkMode === 'skip') {
      setTimelineLinkOpen(false)
      return
    }
    setTimelineLinkSaving(true)
    try {
      if (timelineLinkMode === 'existing' && timelineLinkMilestoneId) {
        // Link deliverable to existing milestone
        await fetch(`/api/projects/${projectId}/deliverables/${pendingDeliverableForTimeline.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ milestone_id: timelineLinkMilestoneId }),
        })
        const ms = milestones.find(m => m.id === timelineLinkMilestoneId)
        toast.success(`Lié à l'étape "${ms?.title ?? ''}"`)
      } else if (timelineLinkMode === 'new' && timelineLinkTitle.trim()) {
        // Create new milestone linked to this deliverable
        const res = await fetch(`/api/projects/${projectId}/milestones`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: timelineLinkTitle.trim(),
            status: 'pending',
            priority: timelineLinkPriority,
            due_date: timelineLinkDueDate || null,
            visible_to_client: true,
            responsible: 'freelancer',
            reference_type: 'deliverable',
            reference_id: pendingDeliverableForTimeline.id,
            subtasks: [],
          }),
        })
        if (res.ok) {
          const json = (await res.json()) as { data: { title: string } }
          toast.success(`Étape "${json.data.title}" créée dans la timeline`)
        }
      }
      setTimelineLinkOpen(false)
    } catch {
      toast.error('Erreur lors de la liaison à la timeline')
    } finally {
      setTimelineLinkSaving(false)
    }
  }

  // -------------------------------------------------------------------------
  // Render helpers
  // -------------------------------------------------------------------------

  function getMilestoneName(milestoneId: string | null): string | null {
    if (!milestoneId) return null
    return milestones.find(m => m.id === milestoneId)?.title ?? null
  }

  const deliverablesMins: DeliverableMin[] = deliverables.map(d => ({ id: d.id, name: d.name }))

  // Deliverable stats
  const totalDeliverables = deliverables.length
  const validatedCount = deliverables.filter(d => d.status === 'validated').length
  const pendingCount = deliverables.filter(d => d.status === 'pending').length
  const revisionCount = deliverables.filter(d => d.status === 'revision_requested').length

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="space-y-6">
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
            <h1 className="text-2xl font-bold tracking-tight">Livrables & Retours</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Partagez vos fichiers avec le client et gérez ses retours
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue={defaultTab}>
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="livrables" className="gap-2">
            <FolderOpen className="h-4 w-4" />
            Livrables
            {totalDeliverables > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs py-0 px-1.5 h-4">
                {totalDeliverables}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="retours" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Retours & Questions
            {stats.pending > 0 && (
              <Badge className="ml-1 text-xs py-0 px-1.5 h-4 bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-100">
                {stats.pending}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ---------------------------------------------------------------- */}
        {/* Tab — Livrables                                                   */}
        {/* ---------------------------------------------------------------- */}
        <TabsContent value="livrables" className="space-y-5 mt-6">

          {/* Info callout */}
          <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
            <Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
            <p className="text-sm text-blue-700 leading-relaxed">
              Les livrables sont les fichiers ou liens que vous partagez avec votre client (maquettes, exports, documents finaux). Le client peut les valider ou demander des révisions.
            </p>
          </div>

          {/* Stats bar — only when there are deliverables */}
          {!loadingDeliverables && totalDeliverables > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-xl border bg-white px-4 py-3 flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                  <LayersIcon className="h-4 w-4 text-gray-500" />
                </div>
                <div>
                  <p className="text-lg font-bold leading-none">{totalDeliverables}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Total</p>
                </div>
              </div>
              <div className="rounded-xl border bg-white px-4 py-3 flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                  <CheckCheck className="h-4 w-4 text-emerald-500" />
                </div>
                <div>
                  <p className="text-lg font-bold leading-none text-emerald-600">{validatedCount}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Validés</p>
                </div>
              </div>
              <div className="rounded-xl border bg-white px-4 py-3 flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-gray-50 flex items-center justify-center shrink-0">
                  <Clock className="h-4 w-4 text-gray-400" />
                </div>
                <div>
                  <p className="text-lg font-bold leading-none text-gray-500">{pendingCount}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">En attente</p>
                </div>
              </div>
              <div className="rounded-xl border bg-white px-4 py-3 flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-orange-50 flex items-center justify-center shrink-0">
                  <RotateCcw className="h-4 w-4 text-orange-400" />
                </div>
                <div>
                  <p className="text-lg font-bold leading-none text-orange-600">{revisionCount}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Révisions</p>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => setLinkDialogOpen(true)}
            >
              <Link2 className="h-4 w-4 mr-2" />
              Ajouter un lien
            </Button>
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              <Upload className="h-4 w-4 mr-2" />
              {uploading ? 'Upload en cours…' : 'Uploader un fichier'}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={e => handleFiles(e.target.files)}
            />
          </div>

          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={[
              'border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all',
              dragOver
                ? 'border-primary bg-primary/5 scale-[1.01]'
                : 'border-muted-foreground/20 hover:border-primary/40 hover:bg-muted/20',
            ].join(' ')}
          >
            <div className={[
              'h-12 w-12 rounded-xl flex items-center justify-center transition-colors',
              dragOver ? 'bg-primary/10' : 'bg-muted',
            ].join(' ')}>
              <Upload className={`h-5 w-5 ${dragOver ? 'text-primary' : 'text-muted-foreground'}`} />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium">
                {uploading ? 'Upload en cours…' : 'Glissez-déposez vos fichiers ici'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                ou <span className="text-primary">cliquez pour parcourir</span>
              </p>
            </div>
          </div>

          {/* Grid */}
          {loadingDeliverables ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <Skeleton key={i} className="h-44 rounded-xl" />
              ))}
            </div>
          ) : deliverables.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                  <FolderOpen className="h-8 w-8 text-muted-foreground" />
                </div>
                <h2 className="text-base font-semibold mb-1">Aucun livrable pour l'instant</h2>
                <p className="text-sm text-muted-foreground mb-6 max-w-xs">
                  Uploadez vos premiers fichiers ou ajoutez un lien (Figma, Google Drive, etc.) à partager avec votre client.
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setLinkDialogOpen(true)}>
                    <Link2 className="h-4 w-4 mr-2" />
                    Ajouter un lien
                  </Button>
                  <Button onClick={() => fileInputRef.current?.click()}>
                    <Upload className="h-4 w-4 mr-2" />
                    Uploader
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {deliverables.map(deliverable => {
                const milestoneName = getMilestoneName(deliverable.milestone_id)
                const isFile = deliverable.type === 'file'
                return (
                  <div
                    key={deliverable.id}
                    className={[
                      'bg-white rounded-xl border overflow-hidden flex flex-col transition-shadow hover:shadow-md group',
                      deliverableStatusBorderClass(deliverable.status),
                    ].join(' ')}
                  >
                    {/* Card header */}
                    <button
                      onClick={() => { setSelectedDeliverable(deliverable); setDetailOpen(true) }}
                      className="text-left flex-1 p-4 space-y-3"
                    >
                      {/* Type + Status row */}
                      <div className="flex items-center justify-between gap-2">
                        <div className={[
                          'h-8 w-8 rounded-lg flex items-center justify-center shrink-0',
                          isFile ? 'bg-primary/10' : 'bg-blue-50',
                        ].join(' ')}>
                          {isFile
                            ? <FileText className="h-4 w-4 text-primary" />
                            : <Link2 className="h-4 w-4 text-blue-500" />
                          }
                        </div>
                        <DeliverableStatusBadge status={deliverable.status} />
                      </div>

                      {/* Name + description */}
                      <div className="space-y-0.5">
                        <p className="text-sm font-semibold truncate leading-snug">{deliverable.name}</p>
                        {deliverable.description && (
                          <p className="text-xs text-muted-foreground truncate">
                            {deliverable.description}
                          </p>
                        )}
                      </div>

                      {/* Meta */}
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(deliverable.created_at), 'd MMM yyyy', { locale: fr })}
                          {deliverable.size_bytes ? ` · ${formatFileSize(deliverable.size_bytes)}` : ''}
                        </p>
                        {milestoneName && (
                          <p className="text-xs text-primary flex items-center gap-1.5">
                            <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary" />
                            {milestoneName}
                          </p>
                        )}
                      </div>
                    </button>

                    {/* Quick action footer */}
                    {deliverable.status !== 'validated' && (
                      <div className="border-t px-4 py-2.5 flex gap-2 bg-muted/20">
                        <button
                          onClick={() => handleQuickStatus(deliverable.id, 'validated')}
                          className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg py-1.5 transition-colors"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Valider
                        </button>
                        {deliverable.status !== 'revision_requested' && (
                          <button
                            onClick={() => handleQuickStatus(deliverable.id, 'revision_requested')}
                            className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium text-orange-700 bg-orange-50 hover:bg-orange-100 rounded-lg py-1.5 transition-colors"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Révision
                          </button>
                        )}
                      </div>
                    )}
                    {deliverable.status === 'validated' && (
                      <div className="border-t px-4 py-2.5 bg-emerald-50/50">
                        <p className="text-xs text-center text-emerald-600 font-medium flex items-center justify-center gap-1.5">
                          <CheckCheck className="h-3.5 w-3.5" />
                          Livrable validé
                        </p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* ---------------------------------------------------------------- */}
        {/* Tab — Retours & Questions                                          */}
        {/* ---------------------------------------------------------------- */}
        <TabsContent value="retours" className="space-y-5 mt-6">

          {/* Alerte retours clients en attente */}
          {feedback.filter(f => f.source === 'client' && f.status === 'pending').length > 0 && (
            <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
              <AlertCircle className="h-4 w-4 text-blue-600 shrink-0" />
              <p className="text-sm text-blue-800 flex-1">
                <span className="font-semibold">
                  {feedback.filter(f => f.source === 'client' && f.status === 'pending').length} retour{feedback.filter(f => f.source === 'client' && f.status === 'pending').length > 1 ? 's' : ''} client
                </span>{' '}en attente de traitement — cliquez pour ouvrir.
              </p>
            </div>
          )}

          {/* Info callout */}
          <div className="flex items-start gap-3 rounded-xl border border-violet-100 bg-violet-50 px-4 py-3">
            <Info className="h-4 w-4 text-violet-500 mt-0.5 shrink-0" />
            <p className="text-sm text-violet-700 leading-relaxed">
              Les retours regroupent les commentaires, demandes de modifications et questions du client sur votre travail.
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end">
            <Button onClick={() => setAddDialogOpen(true)} size="sm">
              <Plus className="h-4 w-4 mr-1.5" />
              Ajouter un retour
            </Button>
          </div>

          {/* Stats bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl border bg-white px-4 py-3 flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                <MessageSquare className="h-4 w-4 text-gray-500" />
              </div>
              <div>
                <p className="text-lg font-bold leading-none">{stats.total}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Total</p>
              </div>
            </div>
            <div className="rounded-xl border bg-white px-4 py-3 flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-gray-50 flex items-center justify-center shrink-0">
                <Clock className="h-4 w-4 text-gray-400" />
              </div>
              <div>
                <p className="text-lg font-bold leading-none text-gray-500">{stats.pending}</p>
                <p className="text-xs text-muted-foreground mt-0.5">À traiter</p>
              </div>
            </div>
            <div className="rounded-xl border bg-white px-4 py-3 flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                <AlertCircle className="h-4 w-4 text-blue-400" />
              </div>
              <div>
                <p className="text-lg font-bold leading-none text-blue-600">{stats.in_progress}</p>
                <p className="text-xs text-muted-foreground mt-0.5">En cours</p>
              </div>
            </div>
            <div className="rounded-xl border bg-white px-4 py-3 flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                <CheckCheck className="h-4 w-4 text-emerald-500" />
              </div>
              <div>
                <p className="text-lg font-bold leading-none text-emerald-600">{stats.treated}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Traités</p>
              </div>
            </div>
          </div>

          {/* Feedback list */}
          {loadingFeedback ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map(i => (
                <Skeleton key={i} className="h-24 w-full rounded-xl" />
              ))}
            </div>
          ) : feedback.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                  <MessageSquare className="h-8 w-8 text-muted-foreground" />
                </div>
                <h2 className="text-base font-semibold mb-1">Aucun retour pour l&apos;instant</h2>
                <p className="text-sm text-muted-foreground mb-6 max-w-xs">
                  Ajoutez un retour manuellement ou attendez les retours via le portail client.
                </p>
                <Button onClick={() => setAddDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter un retour
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {feedback.map(item => (
                <FeedbackRow
                  key={item.id}
                  item={item}
                  deliverables={deliverablesMins}
                  onStatusCycle={handleStatusCycle}
                  onOpen={f => { setSelectedFeedback(f); setFeedbackDetailOpen(true) }}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Detail Dialog */}
      <DetailDialog
        open={detailOpen}
        deliverable={selectedDeliverable}
        milestones={milestones}
        onClose={() => { setDetailOpen(false); setSelectedDeliverable(null) }}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
      />

      {/* Add Link Dialog */}
      <AddLinkDialog
        open={linkDialogOpen}
        milestones={milestones}
        onClose={() => setLinkDialogOpen(false)}
        onAdd={handleAddLink}
      />

      {/* Add Feedback Dialog */}
      <AddFeedbackDialog
        open={addDialogOpen}
        deliverables={deliverablesMins}
        onClose={() => setAddDialogOpen(false)}
        onAdd={handleAddFeedback}
      />

      {/* Feedback Detail Dialog */}
      <FeedbackDetailDialog
        open={feedbackDetailOpen}
        item={selectedFeedback}
        projectId={projectId}
        deliverables={deliverablesMins}
        onClose={() => { setFeedbackDetailOpen(false); setSelectedFeedback(null) }}
        onStatusCycle={(id, next) => {
          handleStatusCycle(id, next)
          setSelectedFeedback(prev => prev ? { ...prev, status: next } : null)
        }}
      />

      {/* Timeline Link Dialog */}
      <Dialog open={timelineLinkOpen} onOpenChange={open => { if (!open) setTimelineLinkOpen(false) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GitBranch className="h-4 w-4 text-primary" />
              Ajouter à la timeline ?
            </DialogTitle>
          </DialogHeader>

          <p className="text-sm text-muted-foreground -mt-1">
            Voulez-vous lier <strong>&quot;{pendingDeliverableForTimeline?.name}&quot;</strong> à une étape de votre timeline ?
          </p>

          {/* Mode selector */}
          <div className="flex flex-col gap-2">
            {[
              { value: 'existing', label: '🔗 Lier à une étape existante', disabled: milestones.length === 0 },
              { value: 'new',      label: '➕ Créer une nouvelle étape', disabled: false },
              { value: 'skip',     label: '⏭ Ignorer',                   disabled: false },
            ].map(opt => (
              <button
                key={opt.value}
                type="button"
                disabled={opt.disabled}
                onClick={() => setTimelineLinkMode(opt.value as typeof timelineLinkMode)}
                className={[
                  'flex items-center gap-2 rounded-lg border-2 px-4 py-3 text-left text-sm font-medium transition-all',
                  timelineLinkMode === opt.value ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/30',
                  opt.disabled ? 'opacity-40 cursor-not-allowed' : '',
                ].join(' ')}
              >
                {opt.label}
                {opt.value === 'existing' && opt.disabled && (
                  <span className="ml-auto text-xs font-normal text-muted-foreground">(aucune étape)</span>
                )}
              </button>
            ))}
          </div>

          {/* Existing milestone selector */}
          {timelineLinkMode === 'existing' && milestones.length > 0 && (
            <div className="space-y-1.5">
              <Label>Étape à lier</Label>
              <Select value={timelineLinkMilestoneId} onValueChange={(v: string) => setTimelineLinkMilestoneId(v)}>
                <SelectTrigger><SelectValue placeholder="Choisir une étape…" /></SelectTrigger>
                <SelectContent>
                  {milestones.map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* New milestone form */}
          {timelineLinkMode === 'new' && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="tl-title">Titre de l&apos;étape <span className="text-destructive">*</span></Label>
                <Input
                  id="tl-title"
                  value={timelineLinkTitle}
                  onChange={e => setTimelineLinkTitle(e.target.value)}
                  placeholder="Ex : Livraison maquettes"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="tl-priority">Priorité</Label>
                  <Select value={timelineLinkPriority} onValueChange={(v: string) => setTimelineLinkPriority(v as typeof timelineLinkPriority)}>
                    <SelectTrigger id="tl-priority"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">⚪ Normale</SelectItem>
                      <SelectItem value="high">🟠 Haute</SelectItem>
                      <SelectItem value="urgent">🔴 Urgente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tl-due">Date limite</Label>
                  <Input
                    id="tl-due"
                    type="date"
                    value={timelineLinkDueDate}
                    onChange={e => setTimelineLinkDueDate(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setTimelineLinkOpen(false)} disabled={timelineLinkSaving}>
              Ignorer
            </Button>
            {timelineLinkMode !== 'skip' && (
              <Button
                onClick={handleTimelineLink}
                disabled={
                  timelineLinkSaving ||
                  (timelineLinkMode === 'existing' && !timelineLinkMilestoneId) ||
                  (timelineLinkMode === 'new' && !timelineLinkTitle.trim())
                }
              >
                {timelineLinkSaving ? 'Enregistrement…' : 'Confirmer'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
