'use client'

import { useState, useEffect, use, useCallback } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  AlertTriangle, ListChecks, PackageOpen, MessageSquare, FolderOpen,
  Circle, CheckCircle2, FileText, Link2, File, Image,
  ExternalLink, Download, Wrench, HelpCircle, Plus, X,
  CalendarDays, ShieldCheck, Clock,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type MilestoneStatus = 'pending' | 'in_progress' | 'completed'
type DeliverableStatus = 'pending' | 'validated' | 'rejected' | 'revision_requested'
type FeedbackType = 'feedback' | 'modification_request' | 'question'
type FeedbackStatus = 'pending' | 'in_progress' | 'treated'
type Section = 'overview' | 'timeline' | 'deliverables' | 'feedback' | 'documents'

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

function milestoneStatusLabel(status: MilestoneStatus): string {
  if (status === 'completed') return 'Terminé'
  if (status === 'in_progress') return 'En cours'
  return 'En attente'
}

function DeliverableStatusBadge({ status }: { status: DeliverableStatus }) {
  if (status === 'validated') return <Badge className="text-xs bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100">Validé</Badge>
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

function ProjectInitials({ name, color }: { name: string; color: string | null }) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase()
  return (
    <div
      className="h-12 w-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shrink-0"
      style={{ backgroundColor: color ?? '#E8553A' }}
    >
      {initials}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function ClientProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params)
  const router = useRouter()
  const searchParams = useSearchParams()
  const rawSection = searchParams.get('s')
  const section: Section = (rawSection as Section) ?? 'overview'

  function setSection(s: Section) {
    router.push(`/client/projects/${projectId}?s=${s}`)
  }

  const [data, setData] = useState<PortalData | null>(null)
  const [loading, setLoading] = useState(true)

  // Deliverable revision state
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
      toast.success('Livrable validé')
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
        <Skeleton className="h-32 w-full rounded-2xl" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
        </div>
        <Skeleton className="h-48 w-full rounded-2xl" />
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

  const { project, milestones, deliverables, documents, feedback, portal } = data
  const statusInfo = statusConfig[project.status] ?? { label: project.status, variant: 'secondary' as const }

  const completedMilestones = milestones.filter(m => m.status === 'completed').length
  const progressPct = milestones.length > 0 ? Math.round((completedMilestones / milestones.length) * 100) : 0
  const pendingDeliverables = deliverables.filter(d => d.status === 'pending').length
  const validatedDeliverables = deliverables.filter(d => d.status === 'validated').length

  const accentColor = project.color ?? '#E8553A'

  const sortedMilestones = [...milestones].sort((a, b) => a.order_index - b.order_index)
  const upcomingMilestones = sortedMilestones
    .filter(m => m.status !== 'completed')
    .slice(0, 3)

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="max-w-3xl mx-auto space-y-5">

      {/* ── OVERVIEW ── */}
      {section === 'overview' && (
        <>
          {/* Hero card */}
          <div className="rounded-2xl border bg-white overflow-hidden shadow-sm">
            <div className="h-1.5 w-full" style={{ backgroundColor: accentColor }} />
            <div className="p-6">
              <div className="flex items-start gap-4">
                <ProjectInitials name={project.name} color={project.color} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-xl font-bold truncate">{project.name}</h1>
                    <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                  </div>
                  {project.description && (
                    <p className="text-sm text-muted-foreground mt-1">{project.description}</p>
                  )}
                </div>
              </div>

              {milestones.length > 0 && (
                <div className="mt-5">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-muted-foreground font-medium">Progression</span>
                    <span className="font-semibold" style={{ color: accentColor }}>{progressPct}%</span>
                  </div>
                  <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-2 rounded-full transition-all duration-700"
                      style={{ width: `${progressPct}%`, backgroundColor: accentColor }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    {completedMilestones} étape{completedMilestones > 1 ? 's' : ''} terminée{completedMilestones > 1 ? 's' : ''} sur {milestones.length}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Action required banner */}
          {pendingDeliverables > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
              <div className="flex-1">
                <p className="font-semibold text-amber-800 text-sm">
                  {pendingDeliverables} livrable{pendingDeliverables > 1 ? 's' : ''} en attente de votre validation
                </p>
                <p className="text-xs text-amber-600 mt-0.5">Votre prestataire attend votre retour pour continuer.</p>
              </div>
              <button
                onClick={() => setSection('deliverables')}
                className="text-xs font-medium text-amber-700 border border-amber-300 rounded-lg px-3 py-1.5 hover:bg-amber-100 transition-colors shrink-0"
              >
                Voir
              </button>
            </div>
          )}

          {/* Info cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl border bg-white p-4 flex flex-col gap-1 shadow-sm">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground mt-1">Début du projet</p>
              <p className="text-sm font-semibold">
                {format(new Date(project.created_at), 'd MMM yyyy', { locale: fr })}
              </p>
            </div>
            <div className="rounded-xl border bg-white p-4 flex flex-col gap-1 shadow-sm">
              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground mt-1">Accès depuis</p>
              <p className="text-sm font-semibold">
                {portal.accepted_at
                  ? format(new Date(portal.accepted_at), 'd MMM yyyy', { locale: fr })
                  : 'Non connecté'}
              </p>
            </div>
            <div className="rounded-xl border bg-white p-4 flex flex-col gap-1 shadow-sm">
              <ListChecks className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground mt-1">Étapes terminées</p>
              <p className="text-sm font-semibold">{completedMilestones} / {milestones.length}</p>
            </div>
            <div className="rounded-xl border bg-white p-4 flex flex-col gap-1 shadow-sm">
              <PackageOpen className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground mt-1">Livrables validés</p>
              <p className="text-sm font-semibold">{validatedDeliverables} / {deliverables.length}</p>
            </div>
          </div>

          {/* Upcoming milestones */}
          {upcomingMilestones.length > 0 && (
            <div className="rounded-2xl border bg-white overflow-hidden shadow-sm">
              <div className="px-5 py-4 border-b flex items-center justify-between">
                <h3 className="font-semibold text-sm">Prochaines étapes</h3>
                <button
                  onClick={() => setSection('timeline')}
                  className="text-xs text-primary hover:underline"
                >
                  Voir tout
                </button>
              </div>
              <div className="divide-y">
                {upcomingMilestones.map(m => (
                  <div key={m.id} className="px-5 py-3 flex items-center gap-3">
                    {m.status === 'in_progress'
                      ? <Clock className="h-4 w-4 text-blue-500 shrink-0" />
                      : <Circle className="h-4 w-4 text-gray-300 shrink-0" />
                    }
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{m.title}</p>
                      {m.due_date && (
                        <p className="text-xs text-muted-foreground">
                          Échéance : {format(new Date(m.due_date), 'd MMM yyyy', { locale: fr })}
                        </p>
                      )}
                    </div>
                    <Badge
                      variant={m.status === 'in_progress' ? 'secondary' : 'outline'}
                      className="text-xs shrink-0"
                    >
                      {milestoneStatusLabel(m.status)}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pending deliverables preview (max 2) */}
          {pendingDeliverables > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-sm px-0.5">Livrables en attente</h3>
              {deliverables.filter(d => d.status === 'pending').slice(0, 2).map(d => (
                <div key={d.id} className="rounded-2xl border bg-white p-4 space-y-3 shadow-sm">
                  <div className="flex items-start gap-3">
                    {d.type === 'file'
                      ? <FileText className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      : <Link2 className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                    }
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{d.name}</p>
                      {d.description && <p className="text-xs text-muted-foreground">{d.description}</p>}
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {format(new Date(d.created_at), 'd MMM yyyy', { locale: fr })}
                        {d.size_bytes ? ` · ${formatBytes(d.size_bytes)}` : ''}
                      </p>
                    </div>
                    <a
                      href={d.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline shrink-0"
                    >
                      {d.type === 'file' ? <Download className="h-3 w-3" /> : <ExternalLink className="h-3 w-3" />}
                      {d.type === 'file' ? 'Voir' : 'Ouvrir'}
                    </a>
                  </div>

                  {revisionOpen[d.id] ? (
                    <div className="space-y-2 pt-1 border-t">
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
                    <div className="flex gap-2 pt-1 border-t">
                      <Button
                        size="sm"
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={() => handleValidate(d.id)}
                        disabled={updatingDeliverable === d.id}
                      >
                        {updatingDeliverable === d.id ? '…' : 'Valider'}
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
              ))}
            </div>
          )}

          {milestones.length === 0 && deliverables.length === 0 && documents.length === 0 && (
            <div className="rounded-2xl border bg-white shadow-sm">
              <div className="py-14 text-center">
                <p className="text-muted-foreground">Bienvenue sur votre portail projet.</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Les informations de votre projet apparaîtront ici au fur et à mesure.
                </p>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── TIMELINE ── */}
      {section === 'timeline' && (
        <div className="space-y-4">
          <h2 className="text-base font-semibold">Timeline</h2>
          {milestones.length === 0 ? (
            <div className="rounded-2xl border bg-white shadow-sm">
              <div className="py-14 text-center">
                <ListChecks className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">Aucune étape définie pour l&apos;instant.</p>
              </div>
            </div>
          ) : (
            <div className="relative">
              {/* Vertical connector line */}
              <div className="absolute left-[19px] top-6 bottom-6 w-px bg-gray-200" />
              <div className="space-y-2">
                {sortedMilestones.map((m, i) => (
                  <div key={m.id} className="relative flex items-start gap-4">
                    {/* Status icon */}
                    <div className="relative z-10 shrink-0 mt-0.5">
                      {m.status === 'completed' ? (
                        <div className="h-9 w-9 rounded-full bg-emerald-100 flex items-center justify-center">
                          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                        </div>
                      ) : m.status === 'in_progress' ? (
                        <div className="h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center">
                          <div className="h-3 w-3 rounded-full bg-blue-500 animate-pulse" />
                        </div>
                      ) : (
                        <div className="h-9 w-9 rounded-full bg-gray-100 flex items-center justify-center">
                          <Circle className="h-4 w-4 text-gray-300" />
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 bg-white border rounded-xl px-4 py-3 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-sm font-medium ${m.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                          {m.title}
                        </span>
                        <Badge
                          variant={m.status === 'completed' ? 'default' : m.status === 'in_progress' ? 'secondary' : 'outline'}
                          className="text-xs py-0"
                        >
                          {milestoneStatusLabel(m.status)}
                        </Badge>
                      </div>
                      {m.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">{m.description}</p>
                      )}
                      {m.due_date && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Échéance : {format(new Date(m.due_date), 'd MMM yyyy', { locale: fr })}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── DELIVERABLES ── */}
      {section === 'deliverables' && (
        <div className="space-y-4">
          <h2 className="text-base font-semibold">Livrables</h2>
          {deliverables.length === 0 ? (
            <div className="rounded-2xl border bg-white shadow-sm">
              <div className="py-14 text-center">
                <PackageOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">Aucun livrable pour le moment.</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {deliverables.map(d => (
                <div key={d.id} className="bg-white border rounded-2xl p-4 space-y-3 shadow-sm">
                  <DeliverableStatusBadge status={d.status} />

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
                            {updatingDeliverable === d.id ? '…' : 'Valider'}
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
        </div>
      )}

      {/* ── FEEDBACK ── */}
      {section === 'feedback' && (
        <div className="space-y-4">
          <h2 className="text-base font-semibold">Retours</h2>

          {feedbackFormOpen ? (
            <div className="rounded-2xl border bg-white shadow-sm p-5">
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
            </div>
          ) : (
            <div className="flex justify-end">
              <Button onClick={() => setFeedbackFormOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Soumettre un retour
              </Button>
            </div>
          )}

          {feedback.length === 0 ? (
            <div className="rounded-2xl border bg-white shadow-sm">
              <div className="py-14 text-center">
                <MessageSquare className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">Aucun retour pour le moment.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {feedback.map(f => (
                <div key={f.id} className="flex items-start gap-3 bg-white border rounded-xl px-4 py-3">
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
        </div>
      )}

      {/* ── DOCUMENTS ── */}
      {section === 'documents' && (
        <div className="space-y-4">
          <h2 className="text-base font-semibold">Documents</h2>
          {documents.length === 0 ? (
            <div className="rounded-2xl border bg-white shadow-sm">
              <div className="py-14 text-center">
                <FolderOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">Aucun document partagé pour le moment.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {documents.map(doc => (
                <div key={doc.id} className="flex items-center gap-3 bg-white border rounded-xl px-4 py-3">
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
        </div>
      )}

    </div>
  )
}
