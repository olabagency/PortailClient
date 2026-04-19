'use client'

import { useState, useEffect, use, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { format, isPast, isToday, isTomorrow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { RichTextEditor } from '@/components/ui/RichTextEditor'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ArrowLeft,
  CalendarCheck,
  Plus,
  Pencil,
  Trash2,
  ExternalLink,
  MapPin,
  Clock,
  Users,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  X,
  Mail,
  Loader2,
  CheckCircle2,
  Video,
  Phone,
  Building2,
  HelpCircle,
  MessageSquare,
  Send,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type MeetingType = 'appel' | 'visio' | 'presentiel' | 'autre'
type MeetingStatus = 'planifiee' | 'confirmee' | 'annulee'

interface Meeting {
  id: string
  project_id: string
  title: string
  scheduled_at: string
  duration_min: number
  location: string | null
  meeting_link: string | null
  notes: string | null
  summary: string | null
  attendees: string[]
  type?: MeetingType | null
  status?: MeetingStatus | null
  created_at: string
  updated_at: string
}

interface MeetingFormData {
  title: string
  scheduled_at: string
  duration_min: string
  location: string
  meeting_link: string
  notes: string
  attendees: string[]
  type: MeetingType
  status: MeetingStatus
}

interface MeetingComment {
  id: string
  meeting_id: string
  content: string
  source: 'client' | 'freelance'
  quoted_text: string | null
  commenter_name: string | null
  created_at: string
}

const defaultForm = (): MeetingFormData => ({
  title: '',
  scheduled_at: '',
  duration_min: '60',
  location: '',
  meeting_link: '',
  notes: '',
  attendees: [],
  type: 'visio',
  status: 'planifiee',
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDuration(min: number): string {
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m > 0 ? `${h}h${m.toString().padStart(2, '0')}` : `${h}h`
}

function isUrlLike(str: string): boolean {
  return str.startsWith('http://') || str.startsWith('https://')
}

function toLocalDatetimeValue(isoStr: string): string {
  if (!isoStr) return ''
  const d = new Date(isoStr)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function getMeetingTypeLabel(type: MeetingType | null | undefined): string {
  switch (type) {
    case 'appel': return 'Appel'
    case 'visio': return 'Visio'
    case 'presentiel': return 'Présentiel'
    case 'autre': return 'Autre'
    default: return ''
  }
}

function getMeetingTypeIcon(type: MeetingType | null | undefined) {
  switch (type) {
    case 'appel': return <Phone className="h-3 w-3" />
    case 'visio': return <Video className="h-3 w-3" />
    case 'presentiel': return <Building2 className="h-3 w-3" />
    default: return <HelpCircle className="h-3 w-3" />
  }
}

function getMeetingStatusLabel(status: MeetingStatus | null | undefined): string {
  switch (status) {
    case 'confirmee': return 'Confirmée'
    case 'annulee': return 'Annulée'
    default: return 'Planifiée'
  }
}

// Deterministic color from string
const AVATAR_COLORS = [
  'bg-blue-500',
  'bg-violet-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-cyan-500',
  'bg-fuchsia-500',
  'bg-orange-500',
]
function avatarColor(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function getInitials(str: string): string {
  const parts = str.trim().split(/[\s@._-]+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return str.slice(0, 2).toUpperCase()
}

// Group past meetings by month key "MMMM yyyy"
function groupByMonth(meetings: Meeting[]): { label: string; items: Meeting[] }[] {
  const map = new Map<string, Meeting[]>()
  for (const m of meetings) {
    const key = format(new Date(m.scheduled_at), 'MMMM yyyy', { locale: fr })
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(m)
  }
  return Array.from(map.entries()).map(([label, items]) => ({ label, items }))
}

// ---------------------------------------------------------------------------
// Meeting Card
// ---------------------------------------------------------------------------

function MeetingCard({
  meeting,
  onEdit,
  onDelete,
  onSummary,
  isPastMeeting,
  isFirst,
}: {
  meeting: Meeting
  onEdit: (m: Meeting) => void
  onDelete: (id: string) => void
  onSummary: (m: Meeting) => void
  isPastMeeting: boolean
  isFirst?: boolean
}) {
  const visibleAttendees = meeting.attendees.slice(0, 3)
  const extraCount = meeting.attendees.length - 3

  const d = new Date(meeting.scheduled_at)
  const dayNum = format(d, 'd')
  const monthStr = format(d, 'MMM', { locale: fr }).toUpperCase()
  const timeStr = format(d, "HH'h'mm")

  const hasSummary = isPastMeeting && !!meeting.summary

  // Border color logic
  const borderLeftClass = hasSummary
    ? 'border-l-emerald-500'
    : isPastMeeting
      ? 'border-l-muted-foreground/30'
      : 'border-l-blue-500'

  const statusValue = meeting.status ?? 'planifiee'
  const isAnnulee = statusValue === 'annulee'

  function handleRowClick(e: React.MouseEvent) {
    if ((e.target as HTMLElement).closest('button, a')) return
    if (isPastMeeting) onSummary(meeting)
    else onEdit(meeting)
  }

  return (
    <div
      className={cn(
        'group relative flex flex-col sm:flex-row sm:items-start gap-0 bg-white border border-l-4 rounded-lg overflow-hidden cursor-pointer hover:shadow-md transition-all duration-200',
        borderLeftClass,
        isAnnulee && 'opacity-60',
      )}
      onClick={handleRowClick}
    >
      {/* First meeting indicator ribbon */}
      {isFirst && !isPastMeeting && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-400 to-blue-600 opacity-60" />
      )}

      <div className="flex flex-row sm:flex-col items-center sm:justify-center gap-3 sm:gap-0 px-4 py-4 sm:py-5 sm:px-5 sm:min-w-[80px] bg-muted/30 border-r border-dashed border-muted shrink-0">
        <div className={cn(
          'text-center leading-none',
          isPastMeeting ? 'text-muted-foreground' : 'text-blue-600',
        )}>
          <p className="text-2xl font-bold leading-none">{dayNum}</p>
          <p className="text-[11px] font-semibold uppercase tracking-wide mt-0.5">{monthStr}</p>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground sm:mt-2">
          <Clock className="h-3 w-3 shrink-0" />
          <span>{timeStr}</span>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0 px-4 py-3 flex flex-col gap-1.5">
        {/* Row 1: title + badges */}
        <div className="flex flex-wrap items-center gap-2">
          <p className={cn(
            'text-sm font-semibold leading-snug',
            isPastMeeting ? 'text-muted-foreground' : 'text-foreground',
          )}>
            {meeting.title}
          </p>

          {/* Status badge */}
          {statusValue !== 'planifiee' && (
            <Badge
              variant="outline"
              className={cn(
                'text-[10px] px-1.5 py-0 h-4 font-medium',
                statusValue === 'confirmee' && 'border-emerald-400 text-emerald-700 bg-emerald-50',
                statusValue === 'annulee' && 'border-red-300 text-red-600 bg-red-50',
              )}
            >
              {getMeetingStatusLabel(statusValue)}
            </Badge>
          )}

          {/* Type badge */}
          {meeting.type && (
            <span className="inline-flex items-center gap-1 text-[10px] px-1.5 h-4 rounded-full border border-muted bg-muted/50 text-muted-foreground font-medium">
              {getMeetingTypeIcon(meeting.type)}
              {getMeetingTypeLabel(meeting.type)}
            </span>
          )}

          {/* Duration badge */}
          <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
            <Clock className="h-3 w-3" />
            {formatDuration(meeting.duration_min)}
          </span>

          {/* Upcoming / Past badge */}
          {!isPastMeeting ? (
            <Badge className="text-[10px] px-1.5 py-0 h-4 bg-blue-100 text-blue-700 hover:bg-blue-100 border-0">
              À venir
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
              Passée
            </Badge>
          )}
        </div>

        {/* Row 2: location / link */}
        {(meeting.location || meeting.meeting_link) && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            {meeting.meeting_link && isUrlLike(meeting.meeting_link) ? (
              <>
                <ExternalLink className="h-3 w-3 shrink-0 text-primary" />
                <a
                  href={meeting.meeting_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="truncate hover:underline text-primary font-medium"
                  onClick={e => e.stopPropagation()}
                >
                  {meeting.meeting_link.replace(/^https?:\/\//, '')}
                </a>
              </>
            ) : meeting.location ? (
              <>
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="truncate">{meeting.location}</span>
              </>
            ) : null}
          </div>
        )}

        {/* Row 3: attendees */}
        {meeting.attendees.length > 0 && (
          <div className="flex items-center gap-1.5">
            <Users className="h-3 w-3 text-muted-foreground shrink-0" />
            <div className="flex items-center -space-x-1">
              {visibleAttendees.map((a, i) => (
                <div
                  key={i}
                  title={a}
                  className={cn(
                    'h-5 w-5 rounded-full text-white text-[9px] font-bold flex items-center justify-center ring-1 ring-white',
                    avatarColor(a),
                  )}
                >
                  {getInitials(a)}
                </div>
              ))}
              {extraCount > 0 && (
                <div className="h-5 w-5 rounded-full bg-muted text-muted-foreground text-[9px] font-bold flex items-center justify-center ring-1 ring-white">
                  +{extraCount}
                </div>
              )}
            </div>
            <span className="text-xs text-muted-foreground">
              {meeting.attendees.length} participant{meeting.attendees.length > 1 ? 's' : ''}
            </span>
          </div>
        )}

        {/* Row 4: summary indicator */}
        {hasSummary && (
          <div className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Compte-rendu rédigé
          </div>
        )}

        {/* First upcoming label */}
        {isFirst && !isPastMeeting && (
          <div className="text-[10px] font-semibold text-blue-600 uppercase tracking-wide">
            Prochaine réunion
          </div>
        )}
      </div>

      {/* Actions column */}
      <div className="flex sm:flex-col items-center justify-end gap-1 px-2 py-3 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={e => { e.stopPropagation(); onEdit(meeting) }}
          aria-label={isPastMeeting ? 'Modifier' : 'Modifier'}
          title={isPastMeeting ? 'Modifier' : 'Modifier'}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        {isPastMeeting && (
          <Button
            variant="ghost"
            size="icon"
            className={cn('h-7 w-7', hasSummary ? 'text-emerald-600 hover:text-emerald-700' : '')}
            onClick={e => { e.stopPropagation(); onSummary(meeting) }}
            aria-label="Compte-rendu"
            title="Compte-rendu"
          >
            <ClipboardList className="h-3.5 w-3.5" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive hover:text-destructive"
          onClick={e => { e.stopPropagation(); onDelete(meeting.id) }}
          aria-label="Supprimer"
          title="Supprimer"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Stat pill
// ---------------------------------------------------------------------------

function StatPill({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode
  label: string
  value: number
  color?: string
}) {
  return (
    <div className={cn(
      'inline-flex items-center gap-2 px-3 py-1.5 rounded-full border bg-white text-sm',
      color,
    )}>
      <span className="shrink-0">{icon}</span>
      <span className="font-semibold">{value}</span>
      <span className="text-muted-foreground text-xs">{label}</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Attendee input (tag-like)
// ---------------------------------------------------------------------------

function AttendeeInput({
  attendees,
  onChange,
}: {
  attendees: string[]
  onChange: (next: string[]) => void
}) {
  const [inputValue, setInputValue] = useState('')

  function addAttendee(raw: string) {
    const trimmed = raw.trim()
    if (!trimmed || attendees.includes(trimmed)) return
    onChange([...attendees, trimmed])
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addAttendee(inputValue)
      setInputValue('')
    } else if (e.key === 'Backspace' && inputValue === '' && attendees.length > 0) {
      onChange(attendees.slice(0, -1))
    }
  }

  function handleBlur() {
    if (inputValue.trim()) {
      addAttendee(inputValue)
      setInputValue('')
    }
  }

  function removeAttendee(idx: number) {
    onChange(attendees.filter((_, i) => i !== idx))
  }

  return (
    <div className="flex flex-wrap gap-1.5 min-h-[38px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
      {attendees.map((a, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-1 bg-secondary text-secondary-foreground text-xs rounded px-1.5 py-0.5"
        >
          {a}
          <button
            type="button"
            onClick={() => removeAttendee(i)}
            className="hover:text-destructive"
            aria-label={`Supprimer ${a}`}
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <input
        type="text"
        value={inputValue}
        onChange={e => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder={attendees.length === 0 ? 'Email + Entrée pour ajouter…' : ''}
        className="flex-1 min-w-[120px] bg-transparent outline-none placeholder:text-muted-foreground text-xs"
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

function MeetingsPageInner({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: projectId } = use(params)
  const router = useRouter()
  const searchParams = useSearchParams()

  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Past meetings: show all or only last 3 per month group
  const [pastExpanded, setPastExpanded] = useState(false)

  // Create/Edit dialog
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null)
  const [form, setForm] = useState<MeetingFormData>(defaultForm())

  // Summary dialog
  const [summaryDialogOpen, setSummaryDialogOpen] = useState(false)
  const [summaryMeeting, setSummaryMeeting] = useState<Meeting | null>(null)
  const [summaryText, setSummaryText] = useState('')
  const [summaryEditing, setSummaryEditing] = useState(false)
  const [summarySaving, setSummarySaving] = useState(false)
  const [sendingSummary, setSendingSummary] = useState(false)

  // Comments
  const [comments, setComments] = useState<MeetingComment[]>([])
  const [loadingComments, setLoadingComments] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)

  // -------------------------------------------------------------------------
  // Fetch
  // -------------------------------------------------------------------------

  const fetchMeetings = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/meetings`)
      if (!res.ok) throw new Error()
      const json = (await res.json()) as { data: Meeting[] }
      setMeetings(json.data ?? [])
    } catch {
      toast.error('Impossible de charger les réunions')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    void fetchMeetings()
  }, [fetchMeetings])

  // Auto-open meeting from ?open= query param (e.g. from calendar click)
  useEffect(() => {
    const openId = searchParams.get('open')
    if (!openId || meetings.length === 0) return
    const target = meetings.find(m => m.id === openId)
    if (!target) return
    const isPastMeeting = new Date(target.scheduled_at) <= new Date()
    if (isPastMeeting) {
      openSummaryDialog(target)
    } else {
      openEditDialog(target)
    }
    router.replace(`/dashboard/projects/${projectId}/meetings`, { scroll: false })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meetings, searchParams])

  // -------------------------------------------------------------------------
  // Derived lists
  // -------------------------------------------------------------------------

  const now = new Date()
  const upcoming = meetings
    .filter(m => new Date(m.scheduled_at) > now)
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())

  const past = meetings
    .filter(m => new Date(m.scheduled_at) <= now)
    .sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime())

  const pastWithSummary = past.filter(m => !!m.summary).length

  const pastGroups = groupByMonth(past)
  // When collapsed, show only first group (most recent month) limited to 3
  const visiblePastGroups = pastExpanded
    ? pastGroups
    : pastGroups.slice(0, 1).map(g => ({ ...g, items: g.items.slice(0, 3) }))

  const hiddenCount = pastExpanded
    ? 0
    : past.length - (pastGroups[0]?.items.slice(0, 3).length ?? 0)

  // -------------------------------------------------------------------------
  // Delete
  // -------------------------------------------------------------------------

  async function handleDelete(id: string) {
    const prev = meetings
    setMeetings(ms => ms.filter(m => m.id !== id))
    try {
      const res = await fetch(`/api/projects/${projectId}/meetings/${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error()
      toast.success('Réunion supprimée')
    } catch {
      toast.error('Erreur lors de la suppression')
      setMeetings(prev)
    }
  }

  // -------------------------------------------------------------------------
  // Create / Edit dialog
  // -------------------------------------------------------------------------

  function openAddDialog() {
    setEditingMeeting(null)
    setForm(defaultForm())
    setDialogOpen(true)
  }

  function openEditDialog(m: Meeting) {
    setEditingMeeting(m)
    setForm({
      title: m.title,
      scheduled_at: toLocalDatetimeValue(m.scheduled_at),
      duration_min: String(m.duration_min),
      location: m.location ?? '',
      meeting_link: m.meeting_link ?? '',
      notes: m.notes ?? '',
      attendees: m.attendees ?? [],
      type: m.type ?? 'visio',
      status: m.status ?? 'planifiee',
    })
    setDialogOpen(true)
  }

  function closeDialog() {
    setDialogOpen(false)
    setEditingMeeting(null)
    setForm(defaultForm())
  }

  async function handleSave() {
    if (!form.title.trim()) {
      toast.error('Le titre est requis')
      return
    }
    if (!form.scheduled_at) {
      toast.error("La date et l'heure sont requises")
      return
    }
    setSaving(true)
    try {
      const payload = {
        title: form.title.trim(),
        scheduled_at: new Date(form.scheduled_at).toISOString(),
        duration_min: parseInt(form.duration_min, 10),
        location: form.location.trim() || null,
        meeting_link: form.meeting_link.trim() || null,
        notes: form.notes.trim() || null,
        attendees: form.attendees,
        type: form.type,
        status: form.status,
      }

      if (editingMeeting) {
        const res = await fetch(`/api/projects/${projectId}/meetings/${editingMeeting.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error()
        const json = (await res.json()) as { data: Meeting }
        setMeetings(prev => prev.map(m => (m.id === editingMeeting.id ? json.data : m)))
        toast.success('Réunion mise à jour')
      } else {
        const res = await fetch(`/api/projects/${projectId}/meetings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error()
        const json = (await res.json()) as { data: Meeting }
        setMeetings(prev => [...prev, json.data])
        toast.success('Réunion créée')
      }

      closeDialog()
    } catch {
      toast.error('Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  // -------------------------------------------------------------------------
  // Summary dialog
  // -------------------------------------------------------------------------

  async function fetchComments(meetingId: string) {
    setLoadingComments(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/meetings/${meetingId}/comments`)
      if (res.ok) {
        const json = (await res.json()) as { data: MeetingComment[] }
        setComments(json.data ?? [])
      }
    } finally {
      setLoadingComments(false)
    }
  }

  async function handleSubmitComment() {
    if (!summaryMeeting || !commentText.trim()) return
    setSubmittingComment(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/meetings/${summaryMeeting.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: commentText.trim() }),
      })
      if (!res.ok) throw new Error()
      const json = (await res.json()) as { data: MeetingComment }
      setComments(prev => [...prev, json.data])
      setCommentText('')
      toast.success('Réponse envoyée')
    } catch {
      toast.error('Erreur lors de l\'envoi')
    } finally {
      setSubmittingComment(false)
    }
  }

  function openSummaryDialog(m: Meeting) {
    setSummaryMeeting(m)
    setSummaryText(m.summary ?? '')
    setSummaryEditing(!m.summary)
    setSummaryDialogOpen(true)
    setComments([])
    setCommentText('')
    void fetchComments(m.id)
  }

  function closeSummaryDialog() {
    setSummaryDialogOpen(false)
    setSummaryMeeting(null)
    setSummaryText('')
    setSummaryEditing(false)
    setComments([])
    setCommentText('')
  }

  async function handleSendSummary() {
    if (!summaryMeeting?.summary) return
    setSendingSummary(true)
    try {
      const res = await fetch(
        `/api/projects/${projectId}/meetings/${summaryMeeting.id}/send-summary`,
        { method: 'POST' },
      )
      const json = await res.json()
      if (res.ok) {
        toast.success('Compte-rendu envoyé au client')
      } else {
        toast.error((json as { error?: string }).error ?? "Impossible d'envoyer le compte-rendu")
      }
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setSendingSummary(false)
    }
  }

  async function handleSaveSummary() {
    if (!summaryMeeting) return
    setSummarySaving(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/meetings/${summaryMeeting.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summary: summaryText }),
      })
      if (!res.ok) throw new Error()
      const json = (await res.json()) as { data: Meeting }
      setMeetings(prev => prev.map(m => (m.id === summaryMeeting.id ? json.data : m)))
      setSummaryMeeting(json.data)
      setSummaryEditing(false)
      toast.success('Compte-rendu enregistré')
    } catch {
      toast.error('Erreur lors de la sauvegarde')
    } finally {
      setSummarySaving(false)
    }
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
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
            <h1 className="text-2xl font-semibold">Réunions</h1>
            <p className="text-sm text-muted-foreground">
              Planifiez et suivez vos échanges avec le client.
            </p>
          </div>
        </div>
        <Button onClick={openAddDialog} className="shrink-0">
          <Plus className="h-4 w-4 mr-2" />
          Nouvelle réunion
        </Button>
      </div>

      {/* Stats pills */}
      {!loading && meetings.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <StatPill
            icon={<CalendarCheck className="h-3.5 w-3.5 text-blue-500" />}
            label="à venir"
            value={upcoming.length}
            color="border-blue-200 text-blue-700"
          />
          <StatPill
            icon={<Clock className="h-3.5 w-3.5 text-muted-foreground" />}
            label="passées"
            value={past.length}
            color="border-muted"
          />
          <StatPill
            icon={<ClipboardList className="h-3.5 w-3.5 text-muted-foreground" />}
            label="total"
            value={meetings.length}
            color="border-muted"
          />
          <StatPill
            icon={<CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
            label="avec compte-rendu"
            value={pastWithSummary}
            color="border-emerald-200 text-emerald-700"
          />
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>
      ) : meetings.length === 0 ? (
        /* Empty state */
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-20 text-center">
            <div className="rounded-full bg-muted p-5 mb-5">
              <CalendarCheck className="h-10 w-10 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-semibold mb-1">Aucune réunion planifiée</h2>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm">
              Créez votre première réunion pour démarrer le suivi de vos échanges avec le client.
            </p>
            <Button onClick={openAddDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Planifier une réunion
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {/* ---- À venir ---- */}
          <section>
            <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
              À venir
              {upcoming.length > 0 && (
                <Badge className="text-xs bg-blue-100 text-blue-700 hover:bg-blue-100 border-0">
                  {upcoming.length}
                </Badge>
              )}
            </h2>
            {upcoming.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-10 text-center">
                  <CalendarCheck className="h-8 w-8 text-muted-foreground mb-3" />
                  <p className="text-sm font-medium mb-1">Aucune réunion à venir</p>
                  <p className="text-xs text-muted-foreground mb-4">
                    Planifiez votre prochain échange avec le client.
                  </p>
                  <Button variant="outline" size="sm" onClick={openAddDialog}>
                    <Plus className="h-3.5 w-3.5 mr-1.5" />
                    Planifier une réunion
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="relative space-y-2">
                {/* Timeline vertical line */}
                <div className="absolute left-[39px] top-8 bottom-4 w-px bg-blue-200 hidden sm:block" />
                {upcoming.map((m, idx) => (
                  <MeetingCard
                    key={m.id}
                    meeting={m}
                    onEdit={openEditDialog}
                    onDelete={handleDelete}
                    onSummary={openSummaryDialog}
                    isPastMeeting={false}
                    isFirst={idx === 0}
                  />
                ))}
              </div>
            )}
          </section>

          {/* ---- Passées ---- */}
          {past.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-semibold flex items-center gap-2">
                  Passées
                  <Badge variant="outline" className="text-xs">
                    {past.length}
                  </Badge>
                </h2>
                {past.length > 3 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => setPastExpanded(v => !v)}
                  >
                    {pastExpanded ? (
                      <>
                        <ChevronUp className="h-3 w-3 mr-1" />
                        Réduire
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-3 w-3 mr-1" />
                        Voir toutes ({past.length})
                      </>
                    )}
                  </Button>
                )}
              </div>

              <div className="space-y-6">
                {visiblePastGroups.map(group => (
                  <div key={group.label}>
                    {/* Month separator */}
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider capitalize">
                        {group.label}
                      </span>
                      <div className="flex-1 h-px bg-muted" />
                    </div>
                    <div className="space-y-2">
                      {group.items.map(m => (
                        <MeetingCard
                          key={m.id}
                          meeting={m}
                          onEdit={openEditDialog}
                          onDelete={handleDelete}
                          onSummary={openSummaryDialog}
                          isPastMeeting
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {!pastExpanded && hiddenCount > 0 && (
                <button
                  className="mt-3 w-full text-xs text-muted-foreground hover:text-foreground text-center py-2 rounded-lg hover:bg-muted/50 transition-colors"
                  onClick={() => setPastExpanded(true)}
                >
                  <ChevronDown className="h-3 w-3 inline mr-1" />
                  {hiddenCount} réunion{hiddenCount > 1 ? 's' : ''} masquée{hiddenCount > 1 ? 's' : ''} — Voir tout
                </button>
              )}
            </section>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Create / Edit Dialog */}
      {/* ------------------------------------------------------------------ */}
      <Dialog open={dialogOpen} onOpenChange={open => { if (!open) closeDialog() }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingMeeting ? 'Modifier la réunion' : 'Nouvelle réunion'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Titre */}
            <div className="space-y-1.5">
              <Label htmlFor="meeting-title">
                Titre <span className="text-destructive">*</span>
              </Label>
              <Input
                id="meeting-title"
                placeholder="Ex : Point d'avancement hebdo"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              />
            </div>

            {/* Date & Heure / Durée — same row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="meeting-datetime">
                  Date &amp; Heure <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="meeting-datetime"
                  type="datetime-local"
                  value={form.scheduled_at}
                  onChange={e => setForm(f => ({ ...f, scheduled_at: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="meeting-duration">Durée</Label>
                <Select
                  value={form.duration_min}
                  onValueChange={v => setForm(f => ({ ...f, duration_min: v ?? f.duration_min }))}
                >
                  <SelectTrigger id="meeting-duration">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 min</SelectItem>
                    <SelectItem value="30">30 min</SelectItem>
                    <SelectItem value="45">45 min</SelectItem>
                    <SelectItem value="60">1h</SelectItem>
                    <SelectItem value="90">1h30</SelectItem>
                    <SelectItem value="120">2h</SelectItem>
                    <SelectItem value="180">3h</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Type / Statut — same row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="meeting-type">Type de réunion</Label>
                <Select
                  value={form.type}
                  onValueChange={v => setForm(f => ({ ...f, type: v as MeetingType }))}
                >
                  <SelectTrigger id="meeting-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="appel">Appel</SelectItem>
                    <SelectItem value="visio">Visio</SelectItem>
                    <SelectItem value="presentiel">Présentiel</SelectItem>
                    <SelectItem value="autre">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="meeting-status">Statut</Label>
                <Select
                  value={form.status}
                  onValueChange={v => setForm(f => ({ ...f, status: v as MeetingStatus }))}
                >
                  <SelectTrigger id="meeting-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planifiee">Planifiée</SelectItem>
                    <SelectItem value="confirmee">Confirmée</SelectItem>
                    <SelectItem value="annulee">Annulée</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Lien de réunion */}
            <div className="space-y-1.5">
              <Label htmlFor="meeting-link">Lien de réunion</Label>
              <Input
                id="meeting-link"
                type="url"
                placeholder="https://meet.google.com/..."
                value={form.meeting_link}
                onChange={e => setForm(f => ({ ...f, meeting_link: e.target.value }))}
              />
            </div>

            {/* Lieu */}
            <div className="space-y-1.5">
              <Label htmlFor="meeting-location">Lieu</Label>
              <Input
                id="meeting-location"
                placeholder="Ex : Bureau Paris, 12 rue de la Paix"
                value={form.location}
                onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
              />
            </div>

            {/* Participants */}
            <div className="space-y-1.5">
              <Label>Participants</Label>
              <AttendeeInput
                attendees={form.attendees}
                onChange={attendees => setForm(f => ({ ...f, attendees }))}
              />
              <p className="text-xs text-muted-foreground">
                Tapez un email ou un nom puis appuyez sur Entrée
              </p>
            </div>

            {/* Ordre du jour / Notes */}
            <div className="space-y-1.5">
              <Label htmlFor="meeting-notes">Ordre du jour / Notes</Label>
              <Textarea
                id="meeting-notes"
                placeholder="Points à aborder, documents à préparer, objectifs de la réunion…"
                rows={4}
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} disabled={saving}>
              Annuler
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {saving
                ? 'Enregistrement…'
                : editingMeeting
                  ? 'Mettre à jour'
                  : 'Créer la réunion'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ------------------------------------------------------------------ */}
      {/* Summary Dialog */}
      {/* ------------------------------------------------------------------ */}
      <Dialog
        open={summaryDialogOpen}
        onOpenChange={open => { if (!open) closeSummaryDialog() }}
      >
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Compte-rendu de réunion</DialogTitle>
          </DialogHeader>

          {summaryMeeting && (
            <div className="flex flex-col sm:flex-row gap-4 flex-1 overflow-hidden py-2">
              {/* Left column: meeting info (sticky) */}
              <div className="sm:w-56 shrink-0 space-y-3">
                <div className="rounded-lg bg-muted/50 border p-4 space-y-3 sm:sticky sm:top-0">
                  {/* Title + date */}
                  <div>
                    <p className="text-sm font-semibold leading-snug">{summaryMeeting.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(summaryMeeting.scheduled_at), "EEEE d MMMM yyyy 'à' HH'h'mm", { locale: fr })}
                    </p>
                  </div>

                  {/* Duration */}
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5 shrink-0" />
                    <span>{formatDuration(summaryMeeting.duration_min)}</span>
                  </div>

                  {/* Type */}
                  {summaryMeeting.type && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      {getMeetingTypeIcon(summaryMeeting.type)}
                      <span>{getMeetingTypeLabel(summaryMeeting.type)}</span>
                    </div>
                  )}

                  {/* Location / link */}
                  {summaryMeeting.meeting_link && isUrlLike(summaryMeeting.meeting_link) ? (
                    <div className="flex items-center gap-1.5 text-xs">
                      <ExternalLink className="h-3.5 w-3.5 shrink-0 text-primary" />
                      <a
                        href={summaryMeeting.meeting_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline truncate"
                      >
                        Rejoindre
                      </a>
                    </div>
                  ) : summaryMeeting.location ? (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{summaryMeeting.location}</span>
                    </div>
                  ) : null}

                  {/* Attendees */}
                  {summaryMeeting.attendees.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Participants
                      </p>
                      <div className="flex flex-col gap-1">
                        {summaryMeeting.attendees.map((a, i) => (
                          <div key={i} className="flex items-center gap-1.5">
                            <div className={cn(
                              'h-5 w-5 rounded-full text-white text-[9px] font-bold flex items-center justify-center shrink-0',
                              avatarColor(a),
                            )}>
                              {getInitials(a)}
                            </div>
                            <span className="text-xs text-muted-foreground truncate">{a}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Summary state */}
                  {summaryMeeting.summary && (
                    <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                      Compte-rendu rédigé
                    </div>
                  )}
                </div>
              </div>

              {/* Right column: editor + comments */}
              <div className="flex-1 min-w-0 overflow-y-auto space-y-4">
                {!summaryEditing && summaryMeeting.summary ? (
                  <div className="space-y-3">
                    <div className="rounded-lg border bg-background px-4 py-4">
                      <div
                        className="text-sm prose prose-sm max-w-none [&_p]:mb-2 [&_h2]:text-base [&_h2]:font-semibold [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4"
                        dangerouslySetInnerHTML={{ __html: summaryMeeting.summary }}
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSummaryEditing(true)}
                    >
                      <Pencil className="h-3.5 w-3.5 mr-1.5" />
                      Modifier le compte-rendu
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <Label>
                      {summaryMeeting.summary ? 'Modifier le compte-rendu' : 'Rédiger le compte-rendu'}
                    </Label>
                    <RichTextEditor
                      value={summaryText}
                      onChange={setSummaryText}
                      placeholder="Résumé des échanges, décisions prises, prochaines actions…"
                      minHeight="280px"
                    />
                  </div>
                )}

                {/* ── Comments section ── */}
                <div className="border-t pt-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm font-semibold">
                      Commentaires
                      {comments.length > 0 && (
                        <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                          ({comments.length})
                        </span>
                      )}
                    </p>
                    {comments.some(c => c.source === 'client') && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium">
                        {comments.filter(c => c.source === 'client').length} du client
                      </span>
                    )}
                  </div>

                  {loadingComments ? (
                    <div className="space-y-2">
                      {[1, 2].map(i => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
                    </div>
                  ) : comments.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-3 text-center">
                      Aucun commentaire pour cette réunion.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {comments.map(c => (
                        <div
                          key={c.id}
                          className={cn(
                            'rounded-lg px-3 py-2.5 text-sm border',
                            c.source === 'client'
                              ? 'bg-blue-50 border-blue-200'
                              : 'bg-muted/40 border-muted',
                          )}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span className={cn(
                              'text-[11px] font-semibold uppercase tracking-wide',
                              c.source === 'client' ? 'text-blue-600' : 'text-muted-foreground',
                            )}>
                              {c.commenter_name ?? (c.source === 'client' ? 'Client' : 'Vous')}
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              {format(new Date(c.created_at), "d MMM 'à' HH'h'mm", { locale: fr })}
                            </span>
                          </div>
                          {c.quoted_text && (
                            <blockquote className="border-l-2 border-blue-300 pl-2 text-xs text-muted-foreground italic mb-1.5 line-clamp-2">
                              {c.quoted_text}
                            </blockquote>
                          )}
                          <p className="text-sm text-gray-800">{c.content}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Reply form */}
                  <div className="flex gap-2 pt-1">
                    <Textarea
                      placeholder="Répondre au client…"
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
                      disabled={submittingComment || !commentText.trim()}
                      onClick={() => void handleSubmitComment()}
                      title="Envoyer (⌘+Entrée)"
                    >
                      {submittingComment
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <Send className="h-4 w-4" />
                      }
                    </Button>
                  </div>
                  <p className="text-[11px] text-muted-foreground">⌘+Entrée pour envoyer</p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="border-t pt-4 mt-2 shrink-0">
            <Button variant="outline" onClick={closeSummaryDialog} disabled={summarySaving}>
              {summaryEditing ? 'Annuler' : 'Fermer'}
            </Button>
            {!summaryEditing && summaryMeeting?.summary && (
              <Button
                onClick={handleSendSummary}
                disabled={sendingSummary}
                className="gap-2"
              >
                {sendingSummary ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Mail className="h-4 w-4" />
                )}
                Envoyer au client
              </Button>
            )}
            {summaryEditing && (
              <Button onClick={handleSaveSummary} disabled={summarySaving}>
                {summarySaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {summarySaving ? 'Enregistrement…' : 'Enregistrer le compte-rendu'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function MeetingsPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={null}>
      <MeetingsPageInner params={params} />
    </Suspense>
  )
}
