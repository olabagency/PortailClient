'use client'

import { useState, useEffect, use, useCallback } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  ArrowLeft, ListChecks, PackageOpen, MessageSquare, FolderOpen,
  Circle, Clock, CheckCircle2, FileText, Link2, File, Image,
  ExternalLink, Download, Wrench, HelpCircle, Plus, X,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type MilestoneStatus = 'pending' | 'in_progress' | 'completed'
type DeliverableStatus = 'pending' | 'validated' | 'rejected' | 'revision_requested'
type FeedbackType = 'feedback' | 'modification_request' | 'question'
type FeedbackStatus = 'pending' | 'in_progress' | 'treated'

interface Project {
  id: string
  name: string
  description: string | null
  status: string
  color: string | null
  created_at: string
}

interface Milestone {
  id: string
  title: string
  description: string | null
  status: MilestoneStatus
  due_date: string | null
  order_index: number
}

interface Deliverable {
  id: string
  name: string
  description: string | null
  type: 'file' | 'link'
  url: string
  s3_key: string | null
  size_bytes: number | null
  mime_type: string | null
  status: DeliverableStatus
  client_note: string | null
  created_at: string
}

interface Document {
  id: string
  name: string
  type: 'file' | 'link'
  url: string
  download_url: string | null
  size_bytes: number | null
  mime_type: string | null
  created_at: string
}

interface FeedbackItem {
  id: string
  title: string
  content: string | null
  type: FeedbackType
  status: FeedbackStatus
  source: 'client' | 'freelance'
  phase: number
  deliverable_id: string | null
  created_at: string
}

interface PortalData {
  project: Project
  milestones: Milestone[]
  deliverables: Deliverable[]
  documents: Document[]
  feedback: FeedbackItem[]
  portal: { require_account: boolean; accepted_at: string | null }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  active: { label: 'En cours', variant: 'default' },
  paused: { label: 'En pause', variant: 'secondary' },
  completed: { label: 'Terminé', variant: 'outline' },
  archived: { label: 'Archivé', variant: 'destructive' },
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

function MilestoneStatusIcon({ status }: { status: MilestoneStatus }) {
  if (status === 'completed') return <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
  if (status === 'in_progress') return <Clock className="h-5 w-5 text-blue-500 shrink-0" />
  return <Circle className="h-5 w-5 text-gray-300 shrink-0" />
}

function milestoneStatusLabel(status: MilestoneStatus): string {
  if (status === 'completed') return 'Terminé'
  if (status === 'in_progress') return 'En cours'
  return 'En attente'
}

function DeliverableStatusBadge({ status }: { status: DeliverableStatus }) {
  if (status === 'validated') return <Badge className="text-xs bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100">Validé ✓</Badge>
  if (status === 'rejected') return <Badge className="text-xs bg-red-100 text-red-700 border-red-200 hover:bg-red-100">Refusé</Badge>
  if (status === 'revision_requested') return <Badge className="text-xs bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-100">Révision demandée</Badge>
  return <Badge variant="outline" className="text-xs">En attente de validation</Badge>
}

function FeedbackTypeIcon({ type }: { type: FeedbackType }) {
  if (type === 'modification_request') return <Wrench className="h-4 w-4 text-orange-500 shrink-0" />
  if (type === 'question') return <HelpCircle className="h-4 w-4 text-blue-500 shrink-0" />
  return <MessageSquare className="h-4 w-4 text-violet-500 shrink-0" />
}

function FeedbackStatusBadge({ status }: { status: FeedbackStatus }) {
  if (status === 'treated') return <Badge className="text-xs bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100">Traité</Badge>
  if (status === 'in_progress') return <Badge className="text-xs bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100">En cours</Badge>
  return <Badge variant="outline" className="text-xs">À traiter</Badge>
}

function DocIcon({ doc }: { doc: Document }) {
  if (doc.type === 'link') return <Link2 className="h-4 w-4 text-blue-500 shrink-0" />
  const mime = doc.mime_type ?? ''
  if (mime === 'application/pdf') return <FileText className="h-4 w-4 text-red-500 shrink-0" />
  if (mime.startsWith('image/')) return <Image className="h-4 w-4 text-green-500 shrink-0" />
  return <File className="h-4 w-4 text-muted-foreground shrink-0" />
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function ClientProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params)

  const [data, setData] = useState<PortalData | null>(null)
  const [loading, setLoading] = useState(true)

  // Deliverable revision state: key = deliverable id
  const [revisionOpen, setRevisionOpen] = useState<Record<string, boolean>>({})
  const [revisionNote, setRevisionNote] = useState<Record<string, string>>({})
  const [updatingDeliverable, setUpdatingDeliverable] = useState<string | null>(null)

  // Add feedback form state
  const [feedbackFormOpen, setFeedbackFormOpen] = useState(false)
  const [feedbackForm, setFeedbackForm] = useState({ title: '', content: '', type: 'feedback' as FeedbackType })
  const [submittingFeedback, setSubmittingFeedback] = useState(false)

  // ---------------------------------------------------------------------------
  // Fetch
  // ---------------------------------------------------------------------------

  const fetchData = useCallback(async () => {
    try {
      const [projectRes, docsRes] = await Promise.all([
        fetch(`/api/client/projects/${projectId}`),
        fetch(`/api/client/projects/${projectId}/documents`),
      ])
      if (!projectRes.ok) throw new Error()
      const json = await projectRes.json() as { data: PortalData }
      // Merge presigned document URLs
      if (docsRes.ok) {
        const docsJson = await docsRes.json() as { data: Document[] }
        json.data.documents = docsJson.data ?? json.data.documents
      }
      setData(json.data)
    } catch {
      toast.error('Impossible de charger le projet')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => { void fetchData() }, [fetchData])

  // ---------------------------------------------------------------------------
  // Deliverable actions
  // ---------------------------------------------------------------------------

  async function handleValidate(delivId: string) {
    setUpdatingDeliverable(delivId)
    try {
      const res = await fetch(`/api/client/projects/${projectId}/deliverables/${delivId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'validated' }),
      })
      if (!res.ok) throw new Error()
      setData(prev => prev ? {
        ...prev,
        deliverables: prev.deliverables.map(d =>
          d.id === delivId ? { ...d, status: 'validated' } : d
        ),
      } : prev)
      toast.success('Livrable validé ✓')
    } catch {
      toast.error('Erreur lors de la validation')
    } finally {
      setUpdatingDeliverable(null)
    }
  }

  async function handleRevision(delivId: string) {
    const note = revisionNote[delivId] ?? ''
    setUpdatingDeliverable(delivId)
    try {
      const res = await fetch(`/api/client/projects/${projectId}/deliverables/${delivId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'revision_requested', client_note: note }),
      })
      if (!res.ok) throw new Error()
      setData(prev => prev ? {
        ...prev,
        deliverables: prev.deliverables.map(d =>
          d.id === delivId ? { ...d, status: 'revision_requested', client_note: note } : d
        ),
      } : prev)
      setRevisionOpen(prev => ({ ...prev, [delivId]: false }))
      toast.success('Demande de révision envoyée')
    } catch {
      toast.error('Erreur lors de la demande')
    } finally {
      setUpdatingDeliverable(null)
    }
  }

  // ---------------------------------------------------------------------------
  // Feedback submit
  // ---------------------------------------------------------------------------

  async function handleFeedbackSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!feedbackForm.title.trim()) return
    setSubmittingFeedback(true)
    try {
      const res = await fetch(`/api/client/projects/${projectId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: feedbackForm.title.trim(),
          content: feedbackForm.content.trim() || null,
          type: feedbackForm.type,
        }),
      })
      if (!res.ok) throw new Error()
      const json = await res.json() as { data: FeedbackItem }
      setData(prev => prev ? { ...prev, feedback: [json.data, ...prev.feedback] } : prev)
      setFeedbackForm({ title: '', content: '', type: 'feedback' })
      setFeedbackFormOpen(false)
      toast.success('Retour envoyé')
    } catch {
      toast.error('Erreur lors de l\'envoi')
    } finally {
      setSubmittingFeedback(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Loading
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Projet introuvable ou accès refusé.</p>
        <Link href="/client" className="text-primary text-sm mt-2 inline-block hover:underline">← Retour</Link>
      </div>
    )
  }

  const { project, milestones, deliverables, documents, feedback } = data
  const statusInfo = statusConfig[project.status] ?? { label: project.status, variant: 'secondary' as const }

  // Stats
  const completedMilestones = milestones.filter(m => m.status === 'completed').length
  const progressPct = milestones.length > 0 ? Math.round((completedMilestones / milestones.length) * 100) : 0
  const pendingFeedback = feedback.filter(f => f.status === 'pending').length

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/client" className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {project.color && (
              <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: project.color }} />
            )}
            <h1 className="text-xl font-bold truncate">{project.name}</h1>
            <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
          </div>
          {project.description && (
            <p className="text-sm text-muted-foreground mt-0.5 truncate">{project.description}</p>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="w-full sm:w-auto flex-wrap h-auto gap-1">
          <TabsTrigger value="overview">Vue d&apos;ensemble</TabsTrigger>
          <TabsTrigger value="timeline" className="flex items-center gap-1.5">
            <ListChecks className="h-3.5 w-3.5" />
            Timeline
          </TabsTrigger>
          <TabsTrigger value="deliverables" className="flex items-center gap-1.5">
            <PackageOpen className="h-3.5 w-3.5" />
            Livrables
          </TabsTrigger>
          <TabsTrigger value="feedback" className="flex items-center gap-1.5">
            <MessageSquare className="h-3.5 w-3.5" />
            Retours
          </TabsTrigger>
          <TabsTrigger value="documents" className="flex items-center gap-1.5">
            <FolderOpen className="h-3.5 w-3.5" />
            Documents
          </TabsTrigger>
        </TabsList>

        {/* ── Vue d'ensemble ── */}
        <TabsContent value="overview" className="mt-4 space-y-4">
          {/* Progress */}
          {milestones.length > 0 && (
            <Card>
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="font-medium">Progression du projet</span>
                  <span className="text-muted-foreground">{completedMilestones}/{milestones.length} étapes</span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-2 bg-primary rounded-full transition-all duration-500"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <p className="text-right text-sm font-semibold text-primary mt-1">{progressPct}%</p>
              </CardContent>
            </Card>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Étapes', value: milestones.length },
              { label: 'Livrables', value: deliverables.length },
              { label: 'Retours en attente', value: pendingFeedback },
              { label: 'Documents', value: documents.length },
            ].map(stat => (
              <Card key={stat.label}>
                <CardContent className="pt-4 pb-3 text-center">
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {milestones.length === 0 && deliverables.length === 0 && documents.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">Bienvenue sur votre portail projet.</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Les informations de votre projet apparaîtront ici au fur et à mesure.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Timeline ── */}
        <TabsContent value="timeline" className="mt-4">
          {milestones.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <ListChecks className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">Aucune étape définie pour l&apos;instant.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {[...milestones].sort((a, b) => a.order_index - b.order_index).map(m => (
                <div key={m.id} className="flex items-start gap-3 bg-white border rounded-lg px-4 py-3">
                  <MilestoneStatusIcon status={m.status} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-sm font-medium ${m.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                        {m.title}
                      </span>
                      <Badge variant={m.status === 'completed' ? 'default' : m.status === 'in_progress' ? 'secondary' : 'outline'} className="text-xs py-0">
                        {milestoneStatusLabel(m.status)}
                      </Badge>
                    </div>
                    {m.description && <p className="text-xs text-muted-foreground mt-0.5">{m.description}</p>}
                    {m.due_date && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Échéance : {format(new Date(m.due_date), 'd MMM yyyy', { locale: fr })}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Livrables ── */}
        <TabsContent value="deliverables" className="mt-4">
          {deliverables.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <PackageOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">Aucun livrable pour le moment.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {deliverables.map(d => (
                <div key={d.id} className="bg-white border rounded-xl p-4 space-y-3">
                  {/* Status */}
                  <DeliverableStatusBadge status={d.status} />

                  {/* Name + icon */}
                  <div className="flex items-start gap-2">
                    {d.type === 'file'
                      ? <FileText className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      : <Link2 className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                    }
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{d.name}</p>
                      {d.description && <p className="text-xs text-muted-foreground truncate">{d.description}</p>}
                      {d.client_note && (
                        <p className="text-xs text-muted-foreground mt-1 italic">&ldquo;{d.client_note}&rdquo;</p>
                      )}
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(d.created_at), 'd MMM yyyy', { locale: fr })}
                      {d.size_bytes ? ` · ${formatBytes(d.size_bytes)}` : ''}
                    </p>
                    <a
                      href={d.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      {d.type === 'file' ? <Download className="h-3 w-3" /> : <ExternalLink className="h-3 w-3" />}
                      {d.type === 'file' ? 'Télécharger' : 'Ouvrir'}
                    </a>
                  </div>

                  {/* Actions (only if pending) */}
                  {d.status === 'pending' && (
                    <div className="pt-1 border-t space-y-2">
                      {revisionOpen[d.id] ? (
                        <div className="space-y-2">
                          <Textarea
                            placeholder="Décrivez les modifications souhaitées…"
                            rows={3}
                            className="text-sm"
                            value={revisionNote[d.id] ?? ''}
                            onChange={e => setRevisionNote(prev => ({ ...prev, [d.id]: e.target.value }))}
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
                              onClick={() => handleRevision(d.id)}
                              disabled={updatingDeliverable === d.id}
                            >
                              {updatingDeliverable === d.id ? 'Envoi…' : 'Envoyer la demande'}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setRevisionOpen(prev => ({ ...prev, [d.id]: false }))}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={() => handleValidate(d.id)}
                            disabled={updatingDeliverable === d.id}
                          >
                            {updatingDeliverable === d.id ? '…' : 'Valider ✓'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 text-orange-600 border-orange-200 hover:bg-orange-50"
                            onClick={() => setRevisionOpen(prev => ({ ...prev, [d.id]: true }))}
                          >
                            Demander une révision
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Retours ── */}
        <TabsContent value="feedback" className="mt-4 space-y-4">
          {/* Add feedback */}
          {feedbackFormOpen ? (
            <Card>
              <CardContent className="pt-4 pb-4">
                <form onSubmit={handleFeedbackSubmit} className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="fb-title">Titre <span className="text-destructive">*</span></Label>
                    <Input
                      id="fb-title"
                      placeholder="Ex : Revoir la couleur du bouton"
                      value={feedbackForm.title}
                      onChange={e => setFeedbackForm(f => ({ ...f, title: e.target.value }))}
                      autoFocus
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="fb-content">Description</Label>
                    <Textarea
                      id="fb-content"
                      placeholder="Détails…"
                      rows={3}
                      value={feedbackForm.content}
                      onChange={e => setFeedbackForm(f => ({ ...f, content: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Type</Label>
                    <Select
                      value={feedbackForm.type}
                      onValueChange={v => setFeedbackForm(f => ({ ...f, type: v as FeedbackType }))}
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
                  <div className="flex gap-2 pt-1">
                    <Button type="submit" disabled={submittingFeedback || !feedbackForm.title.trim()}>
                      {submittingFeedback ? 'Envoi…' : 'Envoyer'}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setFeedbackFormOpen(false)}>
                      Annuler
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          ) : (
            <div className="flex justify-end">
              <Button onClick={() => setFeedbackFormOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Soumettre un retour
              </Button>
            </div>
          )}

          {/* Feedback list */}
          {feedback.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <MessageSquare className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">Aucun retour pour le moment.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {feedback.map(f => (
                <div key={f.id} className="flex items-start gap-3 bg-white border rounded-lg px-4 py-3">
                  <FeedbackTypeIcon type={f.type} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">{f.title}</span>
                      <Badge
                        variant="secondary"
                        className={`text-xs py-0 ${f.source === 'client' ? 'bg-blue-50 text-blue-600' : ''}`}
                      >
                        {f.source === 'client' ? 'Vous' : 'Prestataire'}
                      </Badge>
                    </div>
                    {f.content && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{f.content}</p>}
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(f.created_at), 'd MMM yyyy', { locale: fr })}
                    </p>
                  </div>
                  <FeedbackStatusBadge status={f.status} />
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Documents ── */}
        <TabsContent value="documents" className="mt-4">
          {documents.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FolderOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">Aucun document partagé pour le moment.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {documents.map(doc => (
                <div key={doc.id} className="flex items-center gap-3 bg-white border rounded-lg px-4 py-3">
                  <DocIcon doc={doc} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{doc.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(doc.created_at), 'd MMM yyyy', { locale: fr })}
                      {doc.size_bytes ? ` · ${formatBytes(doc.size_bytes)}` : ''}
                    </p>
                  </div>
                  {(doc.download_url ?? doc.url) && (
                    <a
                      href={doc.download_url ?? doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0"
                    >
                      <Button variant="ghost" size="sm" className="gap-1.5">
                        {doc.type === 'file'
                          ? <><Download className="h-3.5 w-3.5" />Télécharger</>
                          : <><ExternalLink className="h-3.5 w-3.5" />Ouvrir</>
                        }
                      </Button>
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
