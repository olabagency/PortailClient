'use client'

import { useState, useEffect, use, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { format, isPast, isFuture } from 'date-fns'
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
  AlertTriangle, ListChecks, PackageOpen, MessageSquare, FolderOpen,
  Circle, CheckCircle2, FileText, Link2, File, Image as ImageIcon,
  ExternalLink, Download, Wrench, HelpCircle, Plus, X,
  CalendarDays, ShieldCheck, Clock, MapPin, Video, ChevronDown,
  ChevronUp, Users, Paperclip, Trash2, UploadCloud, Hourglass,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type MilestoneStatus = 'pending' | 'in_progress' | 'completed'
type DeliverableStatus = 'pending' | 'validated' | 'rejected' | 'revision_requested'
type FeedbackType = 'feedback' | 'modification_request' | 'question'
type FeedbackStatus = 'pending' | 'in_progress' | 'treated'
type Section = 'overview' | 'timeline' | 'deliverables' | 'feedback' | 'documents' | 'meetings'

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
  source: 'freelance' | 'client'
  client_doc_status: 'pending_review' | 'acknowledged'
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
  media_urls: string[] | null
  created_at: string
}

interface Meeting {
  id: string
  title: string
  scheduled_at: string
  duration_min: number | null
  location: string | null
  meeting_link: string | null
  notes: string | null
  summary: string | null
  attendees: string[] | null
}

interface PortalData {
  project: Project
  milestones: Milestone[]
  deliverables: Deliverable[]
  documents: Document[]
  feedback: FeedbackItem[]
  meetings: Meeting[]
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

const TYPE_LABELS: Record<FeedbackType, string> = {
  feedback: 'Retour général',
  modification_request: 'Demande de modification',
  question: 'Question',
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
  if (mime.startsWith('image/')) return <ImageIcon className="h-4 w-4 text-green-500 shrink-0" />
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

function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-5">
      <h2 className="text-base font-semibold text-gray-900">{title}</h2>
      <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Media upload helper
// ---------------------------------------------------------------------------

interface MediaFile {
  file: File
  previewUrl: string
  key?: string
  uploading: boolean
  error?: string
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

  // Feedback form state
  const [feedbackFormOpen, setFeedbackFormOpen] = useState(false)
  const [feedbackForm, setFeedbackForm] = useState({ title: '', content: '', type: 'feedback' as FeedbackType })
  const [submittingFeedback, setSubmittingFeedback] = useState(false)
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Meeting summary expand state
  const [expandedMeetings, setExpandedMeetings] = useState<Record<string, boolean>>({})

  // Document upload state
  const [docUploading, setDocUploading] = useState(false)
  const docFileInputRef = useRef<HTMLInputElement>(null)

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

  // Clean up preview URLs on unmount
  useEffect(() => {
    return () => { mediaFiles.forEach(f => URL.revokeObjectURL(f.previewUrl)) }
  }, [mediaFiles])

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
  // Media upload
  // ---------------------------------------------------------------------------

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (mediaFiles.length + files.length > 5) {
      toast.error('Maximum 5 fichiers par retour')
      return
    }
    const newFiles: MediaFile[] = files.map(file => ({
      file,
      previewUrl: URL.createObjectURL(file),
      uploading: false,
    }))
    setMediaFiles(prev => [...prev, ...newFiles])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function removeMedia(idx: number) {
    setMediaFiles(prev => {
      URL.revokeObjectURL(prev[idx].previewUrl)
      return prev.filter((_, i) => i !== idx)
    })
  }

  async function uploadMediaFiles(): Promise<string[]> {
    const keys: string[] = []
    for (let i = 0; i < mediaFiles.length; i++) {
      const mf = mediaFiles[i]
      if (mf.key) { keys.push(mf.key); continue }

      setMediaFiles(prev => prev.map((f, idx) => idx === i ? { ...f, uploading: true } : f))
      try {
        const presignRes = await fetch(`/api/client/projects/${projectId}/feedback/presign`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: mf.file.name, contentType: mf.file.type }),
        })
        if (!presignRes.ok) throw new Error('Erreur presign')
        const { data: { uploadUrl, key } } = await presignRes.json() as { data: { uploadUrl: string; key: string } }

        await fetch(uploadUrl, {
          method: 'PUT',
          body: mf.file,
          headers: { 'Content-Type': mf.file.type },
        })

        keys.push(key)
        setMediaFiles(prev => prev.map((f, idx) => idx === i ? { ...f, key, uploading: false } : f))
      } catch {
        setMediaFiles(prev => prev.map((f, idx) => idx === i ? { ...f, uploading: false, error: 'Échec upload' } : f))
        throw new Error('Échec de l\'upload des médias')
      }
    }
    return keys
  }

  // ---------------------------------------------------------------------------
  // Feedback submit
  // ---------------------------------------------------------------------------

  async function handleFeedbackSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!feedbackForm.title.trim()) return
    setSubmittingFeedback(true)
    try {
      let mediaKeys: string[] = []
      if (mediaFiles.length > 0) {
        mediaKeys = await uploadMediaFiles()
      }

      const res = await fetch(`/api/client/projects/${projectId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: feedbackForm.title.trim(),
          content: feedbackForm.content.trim() || null,
          type: feedbackForm.type,
          media_urls: mediaKeys,
        }),
      })
      if (!res.ok) throw new Error()
      const json = await res.json() as { data: FeedbackItem }
      setData(prev => prev ? { ...prev, feedback: [json.data, ...prev.feedback] } : prev)
      setFeedbackForm({ title: '', content: '', type: 'feedback' })
      setMediaFiles([])
      setFeedbackFormOpen(false)
      toast.success('Retour envoyé')
    } catch {
      toast.error('Erreur lors de l\'envoi')
    } finally {
      setSubmittingFeedback(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Document upload
  // ---------------------------------------------------------------------------

  async function handleDocUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!e.target.files) return
    if (!file) return
    if (docFileInputRef.current) docFileInputRef.current.value = ''

    setDocUploading(true)
    try {
      // 1. Get presigned URL
      const presignRes = await fetch(`/api/client/projects/${projectId}/documents/presign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, contentType: file.type, sizeBytes: file.size }),
      })
      if (!presignRes.ok) throw new Error('Erreur presign')
      const { data: { uploadUrl, key } } = await presignRes.json() as { data: { uploadUrl: string; key: string } }

      // 2. Upload to S3
      await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } })

      // 3. Save record
      const saveRes = await fetch(`/api/client/projects/${projectId}/documents/client-upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: file.name, s3Key: key, sizeBytes: file.size, mimeType: file.type }),
      })
      if (!saveRes.ok) throw new Error('Erreur save')
      const { data: doc } = await saveRes.json() as { data: Document }

      setData(prev => prev ? {
        ...prev,
        documents: [{ ...doc, download_url: null }, ...prev.documents],
      } : prev)
      toast.success('Document envoyé — en attente de validation')
    } catch {
      toast.error('Erreur lors de l\'envoi du document')
    } finally {
      setDocUploading(false)
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

  const { project, milestones, deliverables, documents, feedback, meetings = [], portal } = data
  const statusInfo = statusConfig[project.status] ?? { label: project.status, variant: 'secondary' as const }

  const completedMilestones = milestones.filter(m => m.status === 'completed').length
  const progressPct = milestones.length > 0 ? Math.round((completedMilestones / milestones.length) * 100) : 0
  const pendingDeliverables = deliverables.filter(d => d.status === 'pending').length
  const validatedDeliverables = deliverables.filter(d => d.status === 'validated').length

  const accentColor = project.color ?? '#E8553A'

  const sortedMilestones = [...milestones].sort((a, b) => a.order_index - b.order_index)
  const upcomingMilestones = sortedMilestones.filter(m => m.status !== 'completed').slice(0, 3)

  const now = new Date()
  const upcomingMeetings = meetings.filter(m => isFuture(new Date(m.scheduled_at)))
  const pastMeetings = meetings.filter(m => isPast(new Date(m.scheduled_at)))
  const nextMeeting = upcomingMeetings[0] ?? null

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
                    <span className="text-muted-foreground font-medium">Progression globale</span>
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

          {/* Next meeting card */}
          {nextMeeting && (
            <div className="rounded-2xl border bg-white overflow-hidden shadow-sm">
              <div className="px-5 py-4 border-b flex items-center justify-between">
                <h3 className="font-semibold text-sm">Prochaine réunion</h3>
                <button onClick={() => setSection('meetings')} className="text-xs text-primary hover:underline">
                  Toutes les réunions
                </button>
              </div>
              <div className="p-5 flex items-start gap-4">
                <div
                  className="h-12 w-12 rounded-xl flex flex-col items-center justify-center shrink-0 text-white"
                  style={{ backgroundColor: accentColor }}
                >
                  <span className="text-xs font-bold leading-none">
                    {format(new Date(nextMeeting.scheduled_at), 'dd', { locale: fr })}
                  </span>
                  <span className="text-[10px] uppercase leading-none mt-0.5">
                    {format(new Date(nextMeeting.scheduled_at), 'MMM', { locale: fr })}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{nextMeeting.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {format(new Date(nextMeeting.scheduled_at), "EEEE d MMMM 'à' HH'h'mm", { locale: fr })}
                    {nextMeeting.duration_min ? ` · ${nextMeeting.duration_min} min` : ''}
                  </p>
                  {nextMeeting.location && (
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                      <MapPin className="h-3 w-3" />{nextMeeting.location}
                    </p>
                  )}
                </div>
                {nextMeeting.meeting_link && (
                  <a
                    href={nextMeeting.meeting_link}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button size="sm" className="shrink-0 gap-1.5">
                      <Video className="h-3.5 w-3.5" />
                      Rejoindre
                    </Button>
                  </a>
                )}
              </div>
            </div>
          )}

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
                    <a href={d.url} target="_blank" rel="noopener noreferrer"
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
                        <Button size="sm" className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
                          onClick={() => handleRevision(d.id)} disabled={updatingDeliverable === d.id}
                        >
                          {updatingDeliverable === d.id ? 'Envoi…' : 'Envoyer la demande'}
                        </Button>
                        <Button size="sm" variant="ghost"
                          onClick={() => setRevisionOpen(prev => ({ ...prev, [d.id]: false }))}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2 pt-1 border-t">
                      <Button size="sm" className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={() => handleValidate(d.id)} disabled={updatingDeliverable === d.id}
                      >
                        {updatingDeliverable === d.id ? '…' : 'Valider'}
                      </Button>
                      <Button size="sm" variant="outline"
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
        <div className="space-y-0">
          <SectionHeader
            title="Timeline du projet"
            description="Suivez l'avancement des grandes étapes de votre projet, de la conception jusqu'à la livraison finale."
          />
          {milestones.length === 0 ? (
            <div className="rounded-2xl border bg-white shadow-sm">
              <div className="py-14 text-center">
                <ListChecks className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">Aucune étape définie pour l&apos;instant.</p>
              </div>
            </div>
          ) : (
            <div className="relative">
              <div className="absolute left-[19px] top-6 bottom-6 w-px bg-gray-200" />
              <div className="space-y-2">
                {sortedMilestones.map(m => (
                  <div key={m.id} className="relative flex items-start gap-4">
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
        <div className="space-y-0">
          <SectionHeader
            title="Livrables"
            description="Retrouvez ici tous les éléments livrés par votre prestataire. Vous pouvez valider chaque livrable ou demander des modifications."
          />
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
                    <a href={d.url} target="_blank" rel="noopener noreferrer"
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
                            <Button size="sm" className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
                              onClick={() => handleRevision(d.id)} disabled={updatingDeliverable === d.id}
                            >
                              {updatingDeliverable === d.id ? 'Envoi…' : 'Envoyer la demande'}
                            </Button>
                            <Button size="sm" variant="ghost"
                              onClick={() => setRevisionOpen(prev => ({ ...prev, [d.id]: false }))}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <Button size="sm" className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={() => handleValidate(d.id)} disabled={updatingDeliverable === d.id}
                          >
                            {updatingDeliverable === d.id ? '…' : 'Valider'}
                          </Button>
                          <Button size="sm" variant="outline"
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
        <div className="space-y-0">
          <SectionHeader
            title="Retours & demandes"
            description="Envoyez vos retours, demandes de modification ou questions à votre prestataire. Chaque message sera traité et vous serez informé de son avancement."
          />

          {feedbackFormOpen ? (
            <div className="rounded-2xl border bg-white shadow-sm p-5 mb-4">
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
                    placeholder="Détails, contexte, captures d'écran à partager…"
                    rows={3}
                    value={feedbackForm.content}
                    onChange={e => setFeedbackForm(f => ({ ...f, content: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Type de retour</Label>
                  <div className="flex flex-wrap gap-2">
                    {(Object.entries(TYPE_LABELS) as [FeedbackType, string][]).map(([val, label]) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setFeedbackForm(f => ({ ...f, type: val }))}
                        className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                          feedbackForm.type === val
                            ? 'bg-primary text-white border-primary'
                            : 'border-gray-200 text-muted-foreground hover:border-primary hover:text-primary'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Media upload */}
                <div className="space-y-1.5">
                  <Label>Pièces jointes (images / vidéos)</Label>
                  {mediaFiles.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {mediaFiles.map((mf, idx) => (
                        <div key={idx} className="relative group">
                          {mf.file.type.startsWith('image/') ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={mf.previewUrl}
                              alt="preview"
                              className="h-16 w-16 object-cover rounded-lg border"
                            />
                          ) : (
                            <div className="h-16 w-16 rounded-lg border bg-gray-100 flex flex-col items-center justify-center gap-1">
                              <Video className="h-5 w-5 text-muted-foreground" />
                              <span className="text-[10px] text-muted-foreground truncate w-12 text-center">
                                {mf.file.name.split('.').pop()?.toUpperCase()}
                              </span>
                            </div>
                          )}
                          {mf.uploading && (
                            <div className="absolute inset-0 bg-white/70 rounded-lg flex items-center justify-center">
                              <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                            </div>
                          )}
                          {mf.error && (
                            <div className="absolute inset-0 bg-red-50/80 rounded-lg flex items-center justify-center">
                              <span className="text-[10px] text-red-600 text-center px-1">Erreur</span>
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => removeMedia(idx)}
                            className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-white border shadow-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="h-3 w-3 text-red-500" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {mediaFiles.length < 5 && (
                    <>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*,video/*"
                        multiple
                        className="hidden"
                        onChange={handleFileSelect}
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2 text-sm text-muted-foreground border border-dashed rounded-lg px-3 py-2 hover:border-primary hover:text-primary transition-colors"
                      >
                        <Paperclip className="h-4 w-4" />
                        Ajouter un fichier ({mediaFiles.length}/5)
                      </button>
                    </>
                  )}
                </div>

                <div className="flex gap-2 pt-1">
                  <Button type="submit" disabled={submittingFeedback || !feedbackForm.title.trim()}>
                    {submittingFeedback ? 'Envoi…' : 'Envoyer'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => {
                    setFeedbackFormOpen(false)
                    setMediaFiles([])
                  }}>
                    Annuler
                  </Button>
                </div>
              </form>
            </div>
          ) : (
            <div className="flex justify-end mb-4">
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
                <div key={f.id} className="bg-white border rounded-xl px-4 py-3 space-y-2">
                  <div className="flex items-start gap-3">
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
                        <span className="text-xs text-muted-foreground">{TYPE_LABELS[f.type]}</span>
                      </div>
                      {f.content && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{f.content}</p>}
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(f.created_at), 'd MMM yyyy', { locale: fr })}
                      </p>
                    </div>
                    <FeedbackStatusBadge status={f.status} />
                  </div>
                  {/* Media thumbnails */}
                  {f.media_urls && f.media_urls.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1 border-t">
                      {f.media_urls.map((key, idx) => (
                        <a
                          key={idx}
                          href={`/api/client/projects/${projectId}/feedback/media?key=${encodeURIComponent(key)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-xs text-primary hover:underline border rounded-lg px-2 py-1"
                        >
                          <Paperclip className="h-3 w-3" />
                          Pièce jointe {idx + 1}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── DOCUMENTS ── */}
      {section === 'documents' && (
        <div className="space-y-0">
          <div className="flex items-start justify-between mb-5">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Documents partagés</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Accédez aux documents de votre projet et envoyez vos propres fichiers à votre prestataire.
              </p>
            </div>
            <div>
              <input
                ref={docFileInputRef}
                type="file"
                className="hidden"
                onChange={handleDocUpload}
              />
              <Button
                size="sm"
                variant="outline"
                className="gap-2 shrink-0"
                disabled={docUploading}
                onClick={() => docFileInputRef.current?.click()}
              >
                {docUploading
                  ? <><div className="h-3.5 w-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />Envoi…</>
                  : <><UploadCloud className="h-3.5 w-3.5" />Envoyer un document</>
                }
              </Button>
            </div>
          </div>

          {documents.length === 0 ? (
            <div className="rounded-2xl border border-dashed bg-gray-50 py-14 text-center">
              <FolderOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">Aucun document pour le moment.</p>
              <p className="text-xs text-muted-foreground mt-1">
                Votre prestataire partagera les documents ici. Vous pouvez aussi en envoyer.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {documents.map(doc => {
                const isPendingReview = doc.source === 'client' && doc.client_doc_status === 'pending_review'
                return (
                  <div key={doc.id} className={`flex items-center gap-3 border rounded-xl px-4 py-3 ${isPendingReview ? 'bg-amber-50 border-amber-200' : 'bg-white'}`}>
                    <DocIcon doc={doc} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium truncate">{doc.name}</p>
                        {isPendingReview && (
                          <Badge className="text-xs bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100 gap-1">
                            <Hourglass className="h-3 w-3" />
                            En attente de validation
                          </Badge>
                        )}
                        {doc.source === 'client' && doc.client_doc_status === 'acknowledged' && (
                          <Badge className="text-xs bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100">
                            Reçu par le prestataire
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {doc.source === 'client' ? 'Envoyé par vous · ' : ''}
                        {format(new Date(doc.created_at), 'd MMM yyyy', { locale: fr })}
                        {doc.size_bytes ? ` · ${formatBytes(doc.size_bytes)}` : ''}
                      </p>
                    </div>
                    {(doc.download_url ?? doc.url) && !isPendingReview && (
                      <a href={doc.download_url ?? doc.url} target="_blank" rel="noopener noreferrer" className="shrink-0">
                        <Button variant="ghost" size="sm" className="gap-1.5">
                          {doc.type === 'file'
                            ? <><Download className="h-3.5 w-3.5" />Télécharger</>
                            : <><ExternalLink className="h-3.5 w-3.5" />Ouvrir</>
                          }
                        </Button>
                      </a>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── MEETINGS ── */}
      {section === 'meetings' && (
        <div className="space-y-0">
          <SectionHeader
            title="Réunions"
            description="Consultez vos prochains rendez-vous, rejoignez les visioconférences planifiées et retrouvez les compte-rendus de vos réunions passées."
          />

          {meetings.length === 0 ? (
            <div className="rounded-2xl border bg-white shadow-sm">
              <div className="py-14 text-center">
                <CalendarDays className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">Aucune réunion planifiée pour le moment.</p>
                <p className="text-xs text-muted-foreground mt-1">Votre prestataire ajoutera ici les réunions de suivi.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Upcoming meetings */}
              {upcomingMeetings.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                    À venir
                  </h3>
                  <div className="space-y-3">
                    {upcomingMeetings.map(m => (
                      <div key={m.id} className="rounded-2xl border bg-white shadow-sm overflow-hidden">
                        <div className="p-5 flex items-start gap-4">
                          {/* Date badge */}
                          <div
                            className="h-14 w-14 rounded-xl flex flex-col items-center justify-center shrink-0 text-white"
                            style={{ backgroundColor: accentColor }}
                          >
                            <span className="text-lg font-bold leading-none">
                              {format(new Date(m.scheduled_at), 'dd')}
                            </span>
                            <span className="text-[11px] uppercase leading-none mt-0.5">
                              {format(new Date(m.scheduled_at), 'MMM', { locale: fr })}
                            </span>
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm">{m.title}</p>
                            <div className="mt-1.5 space-y-1">
                              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                                <Clock className="h-3.5 w-3.5 shrink-0" />
                                {format(new Date(m.scheduled_at), "EEEE d MMMM 'à' HH'h'mm", { locale: fr })}
                                {m.duration_min ? ` · ${m.duration_min} min` : ''}
                              </p>
                              {m.location && (
                                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                                  <MapPin className="h-3.5 w-3.5 shrink-0" />{m.location}
                                </p>
                              )}
                              {m.attendees && m.attendees.length > 0 && (
                                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                                  <Users className="h-3.5 w-3.5 shrink-0" />
                                  {m.attendees.join(', ')}
                                </p>
                              )}
                            </div>
                            {m.notes && (
                              <p className="text-xs text-muted-foreground mt-2 italic border-t pt-2">{m.notes}</p>
                            )}
                          </div>

                          {m.meeting_link && (
                            <a href={m.meeting_link} target="_blank" rel="noopener noreferrer">
                              <Button size="sm" className="shrink-0 gap-1.5">
                                <Video className="h-3.5 w-3.5" />
                                Rejoindre
                              </Button>
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Past meetings */}
              {pastMeetings.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                    Réunions passées
                  </h3>
                  <div className="space-y-2">
                    {[...pastMeetings].reverse().map(m => {
                      const isExpanded = expandedMeetings[m.id] ?? false
                      return (
                        <div key={m.id} className="rounded-xl border bg-white shadow-sm overflow-hidden">
                          <button
                            className="w-full p-4 flex items-center gap-3 text-left hover:bg-gray-50 transition-colors"
                            onClick={() => setExpandedMeetings(prev => ({ ...prev, [m.id]: !isExpanded }))}
                          >
                            <div className="h-9 w-9 rounded-lg bg-gray-100 flex flex-col items-center justify-center shrink-0">
                              <span className="text-xs font-bold leading-none text-gray-600">
                                {format(new Date(m.scheduled_at), 'dd')}
                              </span>
                              <span className="text-[9px] uppercase leading-none text-gray-400 mt-0.5">
                                {format(new Date(m.scheduled_at), 'MMM', { locale: fr })}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-700 truncate">{m.title}</p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(m.scheduled_at), "d MMM yyyy 'à' HH'h'mm", { locale: fr })}
                                {m.duration_min ? ` · ${m.duration_min} min` : ''}
                              </p>
                            </div>
                            {m.summary ? (
                              <Badge className="text-xs bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100 shrink-0">
                                Compte-rendu disponible
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs shrink-0">Sans compte-rendu</Badge>
                            )}
                            {isExpanded
                              ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                              : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                            }
                          </button>

                          {isExpanded && (
                            <div className="px-4 pb-4 border-t">
                              <div className="pt-3 space-y-3">
                                {m.location && (
                                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                                    <MapPin className="h-3.5 w-3.5 shrink-0" />{m.location}
                                  </p>
                                )}
                                {m.attendees && m.attendees.length > 0 && (
                                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                                    <Users className="h-3.5 w-3.5 shrink-0" />
                                    {m.attendees.join(', ')}
                                  </p>
                                )}
                                {m.notes && (
                                  <div>
                                    <p className="text-xs font-semibold text-gray-700 mb-1">Notes</p>
                                    <p className="text-xs text-muted-foreground whitespace-pre-line">{m.notes}</p>
                                  </div>
                                )}
                                {m.summary ? (
                                  <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-3">
                                    <p className="text-xs font-semibold text-emerald-800 mb-1.5">
                                      Compte-rendu
                                    </p>
                                    <p className="text-xs text-emerald-700 whitespace-pre-line leading-relaxed">
                                      {m.summary}
                                    </p>
                                  </div>
                                ) : (
                                  <p className="text-xs text-muted-foreground italic">
                                    Aucun compte-rendu rédigé pour cette réunion.
                                  </p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

    </div>
  )
}
