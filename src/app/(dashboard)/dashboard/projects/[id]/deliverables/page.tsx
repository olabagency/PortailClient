'use client'

import { useState, useEffect, use, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
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
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
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
// Helpers
// ---------------------------------------------------------------------------

function statusLabel(status: DeliverableStatus): string {
  switch (status) {
    case 'pending': return 'En attente'
    case 'validated': return 'Validé'
    case 'rejected': return 'Refusé'
    case 'revision_requested': return 'Révision demandée'
  }
}

function StatusBadge({ status }: { status: DeliverableStatus }) {
  if (status === 'validated') {
    return (
      <Badge className="text-xs py-0 bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100">
        <CheckCircle2 className="h-3 w-3 mr-1" />
        Validé
      </Badge>
    )
  }
  if (status === 'rejected') {
    return (
      <Badge className="text-xs py-0 bg-red-100 text-red-700 border-red-200 hover:bg-red-100">
        <XCircle className="h-3 w-3 mr-1" />
        Refusé
      </Badge>
    )
  }
  if (status === 'revision_requested') {
    return (
      <Badge className="text-xs py-0 bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-100">
        <AlertCircle className="h-3 w-3 mr-1" />
        Révision demandée
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="text-xs py-0">
      <Clock className="h-3 w-3 mr-1" />
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
// Add Link dialog form
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

// ---------------------------------------------------------------------------
// Detail dialog
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
      <DialogContent className="sm:max-w-md">
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
// Add Link Dialog
// ---------------------------------------------------------------------------

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
      <DialogContent className="sm:max-w-md">
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
// Main page
// ---------------------------------------------------------------------------

export default function DeliverablesPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: projectId } = use(params)
  const router = useRouter()

  const [deliverables, setDeliverables] = useState<Deliverable[]>([])
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  const [selectedDeliverable, setSelectedDeliverable] = useState<Deliverable | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [linkDialogOpen, setLinkDialogOpen] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // -------------------------------------------------------------------------
  // Fetch
  // -------------------------------------------------------------------------

  const fetchData = useCallback(async () => {
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
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  // -------------------------------------------------------------------------
  // Upload flow
  // -------------------------------------------------------------------------

  async function uploadFile(file: File) {
    setUploading(true)
    try {
      // 1. Obtenir la presigned URL
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

      // 2. Upload vers S3
      const s3Res = await fetch(presignData.presign_url, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      })
      if (!s3Res.ok) throw new Error('Erreur lors de l\'upload')

      // 3. Créer le livrable en base
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
  }

  // -------------------------------------------------------------------------
  // Update
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
  // Delete
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
  // Render
  // -------------------------------------------------------------------------

  function getMilestoneName(milestoneId: string | null): string | null {
    if (!milestoneId) return null
    return milestones.find(m => m.id === milestoneId)?.title ?? null
  }

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
            <h1 className="text-2xl font-semibold">Livrables</h1>
            <p className="text-sm text-muted-foreground">Fichiers et liens à livrer au client</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="ghost"
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
            {uploading ? 'Upload en cours…' : 'Uploader'}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={e => handleFiles(e.target.files)}
          />
        </div>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={[
          'border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors',
          dragOver
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30',
        ].join(' ')}
      >
        <FolderOpen className={`h-10 w-10 ${dragOver ? 'text-primary' : 'text-muted-foreground'}`} />
        <div className="text-center">
          <p className="text-sm font-medium">
            {uploading ? 'Upload en cours…' : 'Glissez-déposez vos fichiers ici'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            ou cliquez pour parcourir
          </p>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} className="h-36 rounded-xl" />
          ))}
        </div>
      ) : deliverables.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-14 text-center">
            <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <h2 className="text-lg font-medium mb-1">Aucun livrable</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Uploadez des fichiers ou ajoutez des liens à livrer au client.
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
            return (
              <button
                key={deliverable.id}
                onClick={() => { setSelectedDeliverable(deliverable); setDetailOpen(true) }}
                className="text-left bg-white border rounded-xl p-4 space-y-3 hover:shadow-md transition-shadow hover:border-primary/30 group"
              >
                {/* Status badge */}
                <div className="flex items-start justify-between gap-2">
                  <StatusBadge status={deliverable.status} />
                </div>

                {/* Icon + name */}
                <div className="flex items-start gap-2">
                  <div className="mt-0.5 shrink-0">
                    {deliverable.type === 'file'
                      ? <FileText className="h-5 w-5 text-primary" />
                      : <Link2 className="h-5 w-5 text-blue-500" />
                    }
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{deliverable.name}</p>
                    {deliverable.description && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {deliverable.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(deliverable.created_at), 'd MMM yyyy', { locale: fr })}
                    {deliverable.size_bytes ? ` · ${formatFileSize(deliverable.size_bytes)}` : ''}
                  </p>
                  {milestoneName && (
                    <p className="text-xs text-primary flex items-center gap-1">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary" />
                      {milestoneName}
                    </p>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      )}

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
    </div>
  )
}
