'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isToday,
  addMonths, subMonths, format, parseISO,
} from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  ArrowLeft, ChevronLeft, ChevronRight, CalendarDays, CalendarCheck,
  GitBranch, MessageSquare, Plus, CheckCircle2,
} from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type MilestoneStatus = 'pending' | 'in_progress' | 'completed'

interface Milestone {
  id: string
  title: string
  status: MilestoneStatus
  due_date: string | null
  visible_to_client: boolean
  order_index: number
}

interface Meeting {
  id: string
  title: string
  scheduled_at: string
  duration_min: number
  location: string | null
  meeting_link: string | null
}

interface Project {
  id: string
  name: string
  color: string | null
  status: string
}

type QuickAddStep = 'pick' | 'meeting' | 'milestone'

interface MeetingForm {
  title: string
  time: string
  duration_min: string
}

interface MilestoneForm {
  title: string
  status: MilestoneStatus
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const milestoneStatusConfig: Record<MilestoneStatus, { label: string; dotClass: string; color: string }> = {
  completed:   { label: 'Terminé',  dotClass: 'bg-green-500', color: '#22c55e' },
  in_progress: { label: 'En cours', dotClass: 'bg-blue-500',  color: '#3b82f6' },
  pending:     { label: 'À faire',  dotClass: 'bg-slate-400', color: '#94a3b8' },
}

const MEETING_COLOR = '#8b5cf6' // violet

// ---------------------------------------------------------------------------
// Calendar event union type
// ---------------------------------------------------------------------------

type CalEvent =
  | { kind: 'milestone'; data: Milestone }
  | { kind: 'meeting';   data: Meeting }

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ProjectCalendarPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()

  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [hoveredDay, setHoveredDay] = useState<string | null>(null)

  // Quick-add modal state
  const [quickAddDate, setQuickAddDate] = useState<string | null>(null)
  const [quickAddStep, setQuickAddStep] = useState<QuickAddStep>('pick')
  const [meetingForm, setMeetingForm] = useState<MeetingForm>({ title: '', time: '09:00', duration_min: '60' })
  const [milestoneForm, setMilestoneForm] = useState<MilestoneForm>({ title: '', status: 'pending' })
  const [submitting, setSubmitting] = useState(false)

  // Fetch data
  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const [projectRes, milestonesRes, meetingsRes] = await Promise.all([
          fetch(`/api/projects/${id}`),
          fetch(`/api/projects/${id}/milestones`),
          fetch(`/api/projects/${id}/meetings`),
        ])
        if (projectRes.ok) {
          const { data } = await projectRes.json()
          setProject(data)
        }
        if (milestonesRes.ok) {
          const { data } = await milestonesRes.json()
          setMilestones(data ?? [])
        }
        if (meetingsRes.ok) {
          const { data } = await meetingsRes.json()
          setMeetings(data ?? [])
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  // Build calendar grid
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: calStart, end: calEnd })

  // Index milestones by date
  const milestonesWithDate = milestones.filter((m) => m.due_date)
  const milestonesWithoutDate = milestones.filter((m) => !m.due_date)

  const byDate: Record<string, CalEvent[]> = {}

  for (const m of milestonesWithDate) {
    const key = m.due_date!.slice(0, 10)
    if (!byDate[key]) byDate[key] = []
    byDate[key].push({ kind: 'milestone', data: m })
  }

  for (const mt of meetings) {
    const key = mt.scheduled_at.slice(0, 10)
    if (!byDate[key]) byDate[key] = []
    byDate[key].push({ kind: 'meeting', data: mt })
  }

  const weekDayLabels = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
  const projectColor = project?.color ?? '#386FA4'
  const totalEvents = milestones.length + meetings.length

  // ---------------------------------------------------------------------------
  // Quick-add handlers
  // ---------------------------------------------------------------------------

  function openQuickAdd(dateKey: string) {
    setQuickAddDate(dateKey)
    setQuickAddStep('pick')
    setMeetingForm({ title: '', time: '09:00', duration_min: '60' })
    setMilestoneForm({ title: '', status: 'pending' })
    setHoveredDay(null)
  }

  function closeQuickAdd() {
    setQuickAddDate(null)
    setQuickAddStep('pick')
  }

  async function handleCreateMeeting() {
    if (!quickAddDate || !meetingForm.title.trim()) return
    setSubmitting(true)
    try {
      const scheduled_at = new Date(`${quickAddDate}T${meetingForm.time}:00`).toISOString()
      const res = await fetch(`/api/projects/${id}/meetings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: meetingForm.title.trim(),
          scheduled_at,
          duration_min: parseInt(meetingForm.duration_min, 10),
        }),
      })
      if (!res.ok) {
        const { error } = await res.json()
        toast.error(error ?? 'Erreur lors de la création de la réunion')
        return
      }
      const { data } = await res.json()
      if (data) {
        setMeetings((prev) => [...prev, data])
      }
      toast.success('Réunion créée avec succès')
      closeQuickAdd()
    } catch {
      toast.error('Erreur lors de la création de la réunion')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleCreateMilestone() {
    if (!quickAddDate || !milestoneForm.title.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/projects/${id}/milestones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: milestoneForm.title.trim(),
          due_date: quickAddDate,
          status: milestoneForm.status,
        }),
      })
      if (!res.ok) {
        const { error } = await res.json()
        toast.error(error ?? 'Erreur lors de la création de l\'étape')
        return
      }
      const { data } = await res.json()
      if (data) {
        setMilestones((prev) => [...prev, data])
      }
      toast.success('Étape créée avec succès')
      closeQuickAdd()
    } catch {
      toast.error('Erreur lors de la création de l\'étape')
    } finally {
      setSubmitting(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Modal date label
  // ---------------------------------------------------------------------------

  function getModalDateLabel(dateKey: string): string {
    try {
      return format(parseISO(dateKey), 'EEEE d MMMM', { locale: fr })
    } catch {
      return dateKey
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const quickAddEvents = quickAddDate ? (byDate[quickAddDate] ?? []) : []

  return (
    <div className="space-y-6">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-start gap-4">
        <Link
          href={`/dashboard/projects/${id}`}
          className="mt-0.5 h-8 w-8 shrink-0 flex items-center justify-center rounded-lg border border-border bg-white hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
          aria-label="Retour au projet"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <CalendarDays className="h-6 w-6 text-muted-foreground" />
            Calendrier
          </h1>
          {loading ? (
            <Skeleton className="h-4 w-40 mt-1" />
          ) : (
            <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1.5">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
                style={{ backgroundColor: projectColor }}
              />
              {project?.name ?? '—'}
            </p>
          )}
        </div>
      </div>

      {/* ── Calendar card ──────────────────────────────────────────────── */}
      <Card className="bg-white">
        <CardContent className="p-6">

          {/* Month navigation */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="h-8 w-8 rounded-lg border border-border flex items-center justify-center hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
              aria-label="Mois précédent"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <h2 className="text-base font-semibold capitalize">
              {format(currentMonth, 'MMMM yyyy', { locale: fr })}
            </h2>
            <button
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="h-8 w-8 rounded-lg border border-border flex items-center justify-center hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
              aria-label="Mois suivant"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {loading ? (
            <div className="grid grid-cols-7 gap-px">
              {Array.from({ length: 35 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-md" />
              ))}
            </div>
          ) : (
            <>
              {/* Day-of-week headers */}
              <div className="grid grid-cols-7 gap-px mb-1">
                {weekDayLabels.map((d) => (
                  <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">
                    {d}
                  </div>
                ))}
              </div>

              {/* Day cells */}
              <div className="grid grid-cols-7 gap-px bg-border rounded-xl overflow-hidden border border-border">
                {days.map((day) => {
                  const key = format(day, 'yyyy-MM-dd')
                  const dayEvents = byDate[key] ?? []
                  const isCurrentMonth = isSameMonth(day, currentMonth)
                  const isTodayDay = isToday(day)
                  const isHovered = hoveredDay === key && dayEvents.length > 0

                  return (
                    <div
                      key={key}
                      role="button"
                      tabIndex={0}
                      aria-label={`Ajouter un événement le ${format(day, 'd MMMM yyyy', { locale: fr })}`}
                      className={[
                        'group relative bg-white min-h-[80px] p-2 flex flex-col cursor-pointer',
                        'hover:bg-accent/30 transition-colors',
                        !isCurrentMonth ? 'opacity-40' : '',
                      ].join(' ')}
                      onMouseEnter={() => setHoveredDay(key)}
                      onMouseLeave={() => setHoveredDay(null)}
                      onClick={() => openQuickAdd(key)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') openQuickAdd(key) }}
                    >
                      {/* Day number */}
                      <span
                        className={[
                          'self-start flex items-center justify-center h-6 w-6 rounded-full text-xs mb-1 font-medium',
                          isTodayDay ? 'text-white font-bold' : 'text-foreground',
                        ].join(' ')}
                        style={isTodayDay ? { backgroundColor: projectColor } : {}}
                      >
                        {format(day, 'd')}
                      </span>

                      {/* Event chips */}
                      <div className="flex flex-col gap-0.5 overflow-hidden">
                        {dayEvents.slice(0, 2).map((ev) => {
                          if (ev.kind === 'milestone') {
                            const color = milestoneStatusConfig[ev.data.status].color
                            return (
                              <div
                                key={ev.data.id}
                                className="flex items-center gap-1 rounded px-1 py-0.5 truncate"
                                style={{ backgroundColor: `${color}18` }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Link
                                  href={`/dashboard/projects/${id}/milestones`}
                                  className="flex items-center gap-1 truncate w-full hover:brightness-95 transition-all"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <span
                                    className="inline-block h-1.5 w-1.5 rounded-full shrink-0"
                                    style={{ backgroundColor: color }}
                                  />
                                  <span className="text-[10px] font-medium truncate leading-tight text-foreground">
                                    {ev.data.title}
                                  </span>
                                </Link>
                              </div>
                            )
                          } else {
                            return (
                              <div
                                key={ev.data.id}
                                className="flex items-center gap-1 rounded px-1 py-0.5 truncate"
                                style={{ backgroundColor: `${MEETING_COLOR}18` }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Link
                                  href={`/dashboard/projects/${id}/meetings?open=${ev.data.id}`}
                                  className="flex items-center gap-1 truncate w-full hover:brightness-95 transition-all"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <CalendarCheck
                                    className="inline-block h-2.5 w-2.5 shrink-0"
                                    style={{ color: MEETING_COLOR }}
                                  />
                                  <span className="text-[10px] font-medium truncate leading-tight text-foreground">
                                    {format(new Date(ev.data.scheduled_at), 'HH:mm')} · {ev.data.title}
                                  </span>
                                </Link>
                              </div>
                            )
                          }
                        })}
                        {dayEvents.length > 2 && (
                          <span className="text-[10px] text-muted-foreground pl-1">
                            +{dayEvents.length - 2} de plus
                          </span>
                        )}
                      </div>

                      {/* + button on hover (empty days or days with events) */}
                      <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="h-4 w-4 rounded-full bg-muted flex items-center justify-center">
                          <Plus className="h-2.5 w-2.5 text-muted-foreground" />
                        </span>
                      </div>

                      {/* Popover on hover (only for days with events, and when modal is not open) */}
                      {isHovered && dayEvents.length > 0 && !quickAddDate && (
                        <div className="absolute top-0 left-full ml-1 z-50 min-w-[200px] max-w-[260px] rounded-lg border border-border bg-white shadow-lg p-3 space-y-2 pointer-events-none">
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider pb-1.5 border-b border-border">
                            {format(day, 'EEEE d MMMM', { locale: fr })}
                          </p>
                          {dayEvents.map((ev) => {
                            if (ev.kind === 'milestone') {
                              const color = milestoneStatusConfig[ev.data.status].color
                              return (
                                <div key={ev.data.id} className="flex items-start gap-2">
                                  <span
                                    className="mt-1 block h-2 w-2 rounded-full shrink-0"
                                    style={{ backgroundColor: color }}
                                  />
                                  <div>
                                    <p className="text-xs font-medium text-foreground leading-snug">{ev.data.title}</p>
                                    <p className="text-[10px] text-muted-foreground">{milestoneStatusConfig[ev.data.status].label}</p>
                                  </div>
                                </div>
                              )
                            } else {
                              return (
                                <div key={ev.data.id} className="flex items-start gap-2">
                                  <CalendarCheck
                                    className="mt-0.5 h-3 w-3 shrink-0"
                                    style={{ color: MEETING_COLOR }}
                                  />
                                  <div>
                                    <p className="text-xs font-medium text-foreground leading-snug">{ev.data.title}</p>
                                    <p className="text-[10px] text-muted-foreground">
                                      {format(new Date(ev.data.scheduled_at), 'HH:mm')}
                                      {ev.data.duration_min ? ` · ${ev.data.duration_min} min` : ''}
                                      {ev.data.location ? ` · ${ev.data.location}` : ''}
                                    </p>
                                  </div>
                                </div>
                              )
                            }
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ── Legend ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-5 text-xs text-muted-foreground">
        {Object.entries(milestoneStatusConfig).map(([key, cfg]) => (
          <span key={key} className="flex items-center gap-1.5">
            <span className={`inline-block h-2.5 w-2.5 rounded-full ${cfg.dotClass}`} />
            Étape · {cfg.label}
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: MEETING_COLOR }} />
          Réunion
        </span>
      </div>

      {/* ── Étapes sans date ───────────────────────────────────────────── */}
      {!loading && milestonesWithoutDate.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Étapes sans date
          </h2>
          <Card className="bg-white">
            <CardContent className="py-3 px-4">
              <div className="divide-y divide-border">
                {milestonesWithoutDate.map((m) => (
                  <div key={m.id} className="flex items-center gap-3 py-2.5">
                    <span
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: milestoneStatusConfig[m.status].color }}
                    />
                    <span className="text-sm text-foreground flex-1 truncate">{m.title}</span>
                    <Badge
                      variant={m.status === 'completed' ? 'outline' : 'secondary'}
                      className="text-xs shrink-0"
                    >
                      {milestoneStatusConfig[m.status].label}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Toutes les réunions (liste) ─────────────────────────────────── */}
      {!loading && meetings.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Toutes les réunions
          </h2>
          <Card className="bg-white">
            <CardContent className="py-3 px-4">
              <div className="divide-y divide-border">
                {[...meetings]
                  .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
                  .map((mt) => {
                    const isPast = new Date(mt.scheduled_at) < new Date()
                    return (
                      <div key={mt.id} className="flex items-center gap-3 py-2.5">
                        <CalendarCheck
                          className="h-4 w-4 shrink-0"
                          style={{ color: isPast ? '#94a3b8' : MEETING_COLOR }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${isPast ? 'text-muted-foreground' : 'text-foreground'}`}>
                            {mt.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(mt.scheduled_at), 'EEEE d MMMM yyyy · HH:mm', { locale: fr })}
                            {mt.duration_min ? ` (${mt.duration_min} min)` : ''}
                          </p>
                        </div>
                        <Badge
                          variant={isPast ? 'outline' : 'secondary'}
                          className="text-xs shrink-0"
                        >
                          {isPast ? 'Passée' : 'Planifiée'}
                        </Badge>
                      </div>
                    )
                  })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Empty state */}
      {!loading && totalEvents === 0 && (
        <div className="flex flex-col items-center justify-center py-16 rounded-xl border-2 border-dashed border-border bg-white text-center">
          <CalendarDays className="h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="font-medium text-sm">Aucun événement pour ce projet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Cliquez sur un jour du calendrier ou utilisez les raccourcis ci-dessous.
          </p>
          <div className="flex gap-3 mt-4">
            <Link
              href={`/dashboard/projects/${id}/milestones`}
              className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground text-sm font-medium px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
            >
              Gérer les étapes
            </Link>
            <Link
              href={`/dashboard/projects/${id}/meetings`}
              className="inline-flex items-center gap-1.5 border border-border bg-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-accent transition-colors"
            >
              Planifier une réunion
            </Link>
          </div>
        </div>
      )}

      {/* ── Quick-Add Modal ─────────────────────────────────────────────── */}
      <Dialog open={!!quickAddDate} onOpenChange={(open) => { if (!open) closeQuickAdd() }}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="capitalize">
              {quickAddStep !== 'pick' && (
                <button
                  onClick={() => setQuickAddStep('pick')}
                  className="mr-2 inline-flex items-center justify-center h-6 w-6 rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-foreground align-middle"
                  aria-label="Retour"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
              )}
              {quickAddDate ? `Ajouter — ${getModalDateLabel(quickAddDate)}` : 'Ajouter'}
            </DialogTitle>
          </DialogHeader>

          {/* Existing events for this day */}
          {quickAddStep === 'pick' && quickAddEvents.length > 0 && (
            <div className="space-y-1.5 pb-3 border-b border-border">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Événements existants
              </p>
              {quickAddEvents.map((ev) => {
                if (ev.kind === 'milestone') {
                  const color = milestoneStatusConfig[ev.data.status].color
                  return (
                    <div key={ev.data.id} className="flex items-center gap-2 rounded-md px-2 py-1.5" style={{ backgroundColor: `${color}12` }}>
                      <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                      <span className="text-xs font-medium text-foreground truncate flex-1">{ev.data.title}</span>
                      <span className="text-[10px] text-muted-foreground shrink-0">{milestoneStatusConfig[ev.data.status].label}</span>
                    </div>
                  )
                } else {
                  return (
                    <div key={ev.data.id} className="flex items-center gap-2 rounded-md px-2 py-1.5" style={{ backgroundColor: `${MEETING_COLOR}12` }}>
                      <CalendarCheck className="h-3 w-3 shrink-0" style={{ color: MEETING_COLOR }} />
                      <span className="text-xs font-medium text-foreground truncate flex-1">{ev.data.title}</span>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {format(new Date(ev.data.scheduled_at), 'HH:mm')}
                      </span>
                    </div>
                  )
                }
              })}
            </div>
          )}

          {/* Step: pick action type */}
          {quickAddStep === 'pick' && (
            <div className="grid grid-cols-1 gap-3 py-2">
              {/* Réunion */}
              <button
                onClick={() => setQuickAddStep('meeting')}
                className="flex items-center gap-4 rounded-xl border-2 border-violet-200 bg-violet-50 hover:bg-violet-100 hover:border-violet-300 transition-all p-4 text-left group"
              >
                <div className="h-10 w-10 rounded-lg bg-violet-500 flex items-center justify-center shrink-0 group-hover:bg-violet-600 transition-colors">
                  <CalendarCheck className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-violet-900">Réunion</p>
                  <p className="text-xs text-violet-600 mt-0.5">Planifier un appel ou une rencontre</p>
                </div>
              </button>

              {/* Étape timeline */}
              <button
                onClick={() => setQuickAddStep('milestone')}
                className="flex items-center gap-4 rounded-xl border-2 border-blue-200 bg-blue-50 hover:bg-blue-100 hover:border-blue-300 transition-all p-4 text-left group"
              >
                <div className="h-10 w-10 rounded-lg bg-blue-500 flex items-center justify-center shrink-0 group-hover:bg-blue-600 transition-colors">
                  <GitBranch className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-blue-900">Étape timeline</p>
                  <p className="text-xs text-blue-600 mt-0.5">Ajouter une étape avec une échéance</p>
                </div>
              </button>

              {/* Demande de retour */}
              <button
                onClick={() => router.push(`/dashboard/projects/${id}/deliverables?tab=retours`)}
                className="flex items-center gap-4 rounded-xl border-2 border-primary/20 bg-primary/5 hover:bg-primary/10 hover:border-primary/40 transition-all p-4 text-left group"
              >
                <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center shrink-0 group-hover:bg-primary/90 transition-colors">
                  <MessageSquare className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Demande de retour</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Demander un feedback ou une validation</p>
                </div>
              </button>
            </div>
          )}

          {/* Step: meeting form */}
          {quickAddStep === 'meeting' && (
            <>
              <div className="space-y-4 py-2">
                <div className="space-y-1.5">
                  <Label htmlFor="meeting-title">Titre de la réunion <span className="text-destructive">*</span></Label>
                  <Input
                    id="meeting-title"
                    placeholder="Ex : Point hebdomadaire, Kick-off…"
                    value={meetingForm.title}
                    onChange={(e) => setMeetingForm((f) => ({ ...f, title: e.target.value }))}
                    autoFocus
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="meeting-time">Heure</Label>
                    <Input
                      id="meeting-time"
                      type="time"
                      value={meetingForm.time}
                      onChange={(e) => setMeetingForm((f) => ({ ...f, time: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="meeting-duration">Durée</Label>
                    <Select
                      value={meetingForm.duration_min}
                      onValueChange={(v) => setMeetingForm((f) => ({ ...f, duration_min: v ?? '60' }))}
                    >
                      <SelectTrigger id="meeting-duration">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="30">30 min</SelectItem>
                        <SelectItem value="60">1h</SelectItem>
                        <SelectItem value="90">1h30</SelectItem>
                        <SelectItem value="120">2h</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={closeQuickAdd} disabled={submitting}>
                  Annuler
                </Button>
                <Button
                  onClick={handleCreateMeeting}
                  disabled={!meetingForm.title.trim() || submitting}
                  className="bg-violet-600 hover:bg-violet-700 text-white"
                >
                  {submitting ? 'Création…' : 'Créer la réunion'}
                </Button>
              </DialogFooter>
            </>
          )}

          {/* Step: milestone form */}
          {quickAddStep === 'milestone' && (
            <>
              <div className="space-y-4 py-2">
                <div className="space-y-1.5">
                  <Label htmlFor="milestone-title">Titre de l&apos;étape <span className="text-destructive">*</span></Label>
                  <Input
                    id="milestone-title"
                    placeholder="Ex : Livraison maquettes, Mise en ligne…"
                    value={milestoneForm.title}
                    onChange={(e) => setMilestoneForm((f) => ({ ...f, title: e.target.value }))}
                    autoFocus
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="milestone-status">Statut</Label>
                  <Select
                    value={milestoneForm.status}
                    onValueChange={(v) => setMilestoneForm((f) => ({ ...f, status: v as MilestoneStatus }))}
                  >
                    <SelectTrigger id="milestone-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">À faire</SelectItem>
                      <SelectItem value="in_progress">En cours</SelectItem>
                      <SelectItem value="completed">Terminé</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={closeQuickAdd} disabled={submitting}>
                  Annuler
                </Button>
                <Button
                  onClick={handleCreateMilestone}
                  disabled={!milestoneForm.title.trim() || submitting}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {submitting ? 'Création…' : 'Créer l\'étape'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
