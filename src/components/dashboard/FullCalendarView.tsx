'use client'

import { useState, useMemo } from 'react'
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isToday, isBefore, addDays,
  addMonths, subMonths, format, parseISO,
} from 'date-fns'
import { fr } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, CalendarDays, Flag, Video, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import type { CalendarEvent } from './MiniCalendar'
import { cn } from '@/lib/utils'

// ─── Types ───────────────────────────────────────────────────────────────────

type FilterType = 'all' | 'milestone' | 'meeting' | 'onboarding'

/** Extended type used internally for range-event rendering */
type CalendarEventEx = CalendarEvent & {
  _pos?: 'single' | 'start' | 'mid' | 'end'
}

export interface ProjectInfo {
  id: string
  name: string
  color: string | null
}

interface FullCalendarViewProps {
  events: CalendarEvent[]
  projects?: ProjectInfo[]
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getEventBg(event: CalendarEvent): string {
  if (event.type === 'meeting') return 'bg-violet-100 text-violet-800 border-violet-200'
  if (event.type === 'onboarding') return 'bg-emerald-100 text-emerald-800 border-emerald-200'
  if (event.status === 'completed') return 'bg-green-100 text-green-800 border-green-200'
  if (event.status === 'in_progress') return 'bg-blue-100 text-blue-800 border-blue-200'
  return 'bg-slate-100 text-slate-700 border-slate-200'
}

function getEventAccent(event: CalendarEvent): string {
  if (event.type === 'meeting') return '#8b5cf6'
  if (event.type === 'onboarding') return '#10b981'
  if (event.status === 'completed') return '#22c55e'
  if (event.status === 'in_progress') return '#3b82f6'
  return '#94a3b8'
}

function EventIcon({ type }: { type: CalendarEvent['type'] }) {
  if (type === 'meeting') return <Video className="h-3 w-3 shrink-0" />
  if (type === 'onboarding') return <CheckCircle2 className="h-3 w-3 shrink-0" />
  return <Flag className="h-3 w-3 shrink-0" />
}

// ─── Component ───────────────────────────────────────────────────────────────

export function FullCalendarView({ events, projects = [] }: FullCalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [filterType, setFilterType] = useState<FilterType>('all')
  const [filterProject, setFilterProject] = useState<string>('all')

  const filteredEvents = useMemo(() =>
    events.filter(e => {
      if (filterType !== 'all' && e.type !== filterType) return false
      if (filterProject !== 'all' && e.project_id !== filterProject) return false
      return true
    }),
    [events, filterType, filterProject]
  )

  const byDate = useMemo(() => {
    const map: Record<string, CalendarEventEx[]> = {}
    for (const e of filteredEvents) {
      if (!e.date) continue

      if (e.range_start) {
        // Expand multi-day event across every day in the range
        try {
          const rangeStart = parseISO(e.range_start)
          const rangeEnd = parseISO(e.date.slice(0, 10))
          const rangeDays = eachDayOfInterval({ start: rangeStart, end: rangeEnd })
          const len = rangeDays.length
          rangeDays.forEach((d, i) => {
            const key = format(d, 'yyyy-MM-dd')
            if (!map[key]) map[key] = []
            const pos: CalendarEventEx['_pos'] =
              len === 1 ? 'single' : i === 0 ? 'start' : i === len - 1 ? 'end' : 'mid'
            map[key].push({ ...e, _pos: pos })
          })
        } catch {
          // fallback: just add on the end date
          const key = e.date.slice(0, 10)
          if (!map[key]) map[key] = []
          map[key].push({ ...e, _pos: 'single' })
        }
      } else {
        const key = e.date.slice(0, 10)
        if (!map[key]) map[key] = []
        map[key].push({ ...e, _pos: 'single' })
      }
    }
    return map
  }, [filteredEvents])

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: calStart, end: calEnd })
  const weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

  const today = new Date()
  const in60 = addDays(today, 60)

  const upcomingEvents = useMemo(() =>
    filteredEvents
      .filter(e => {
        if (!e.date) return false
        const d = parseISO(e.date)
        return !isBefore(d, today) && !isBefore(in60, d)
      })
      .sort((a, b) => a.date.localeCompare(b.date)),
    [filteredEvents]
  )

  const counts = {
    milestone: events.filter(e => e.type === 'milestone').length,
    meeting: events.filter(e => e.type === 'meeting').length,
    onboarding: events.filter(e => e.type === 'onboarding').length,
  }

  return (
    <div className="space-y-5">

      {/* ── Filtres ── */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1 bg-muted/60 rounded-lg p-1 border">
          {(['all', 'milestone', 'meeting', 'onboarding'] as FilterType[]).map(t => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={cn(
                'px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap',
                filterType === t
                  ? 'bg-white text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {t === 'all' ? 'Tout'
                : t === 'milestone' ? `Étapes (${counts.milestone})`
                : t === 'meeting' ? `Réunions (${counts.meeting})`
                : `Onboardings (${counts.onboarding})`}
            </button>
          ))}
        </div>

        {projects.length > 1 && (
          <select
            value={filterProject}
            onChange={e => setFilterProject(e.target.value)}
            className="h-9 rounded-lg border border-input bg-white px-3 text-xs focus:outline-none focus:ring-2 focus:ring-ring/20 text-foreground"
          >
            <option value="all">Tous les projets</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        )}

        <button
          onClick={() => setCurrentMonth(new Date())}
          className="ml-auto h-9 px-3.5 rounded-lg border border-border bg-white text-xs font-medium hover:bg-accent transition-colors"
        >
          Aujourd&apos;hui
        </button>
      </div>

      {/* ── Grille calendrier ── */}
      <div className="rounded-2xl border bg-white overflow-hidden shadow-sm">
        {/* Navigation mois */}
        <div className="flex items-center justify-between px-5 py-4 border-b bg-white">
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <h2 className="text-base font-semibold capitalize">
            {format(currentMonth, 'MMMM yyyy', { locale: fr })}
          </h2>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* En-têtes jours */}
        <div className="grid grid-cols-7 border-b bg-muted/30">
          {weekDays.map(d => (
            <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2.5 border-r last:border-r-0">
              {d}
            </div>
          ))}
        </div>

        {/* Grille jours */}
        <div className="grid grid-cols-7">
          {days.map((day, idx) => {
            const key = format(day, 'yyyy-MM-dd')
            const dayEvents = byDate[key] ?? []
            const isCurrentMonth = isSameMonth(day, currentMonth)
            const isTodayDay = isToday(day)
            const isLastRow = idx >= days.length - 7

            return (
              <div
                key={key}
                className={cn(
                  'min-h-[110px] p-1.5 border-r border-b last:border-r-0 flex flex-col gap-0.5',
                  isLastRow && 'border-b-0',
                  !isCurrentMonth && 'bg-muted/20',
                )}
              >
                <div className="flex justify-end mb-0.5">
                  <span className={cn(
                    'flex items-center justify-center h-6 w-6 rounded-full text-xs font-medium',
                    isTodayDay
                      ? 'bg-primary text-primary-foreground font-bold'
                      : isCurrentMonth ? 'text-foreground' : 'text-muted-foreground/30',
                  )}>
                    {format(day, 'd')}
                  </span>
                </div>

                {isCurrentMonth && dayEvents.length > 0 && (
                  <div className="flex flex-col gap-0.5">
                    {dayEvents.slice(0, 3).map(e => {
                      const pos = e._pos ?? 'single'
                      const accentColor = e.project_color ?? getEventAccent(e)

                      // Mid-range day: show a compact coloured bar, no text
                      if (pos === 'mid') {
                        return (
                          <div
                            key={`${e.id}-mid-${key}`}
                            className="h-5 w-full"
                            style={{ backgroundColor: accentColor + '30', borderTop: `1px solid ${accentColor}50`, borderBottom: `1px solid ${accentColor}50` }}
                            title={`${e.title} — ${e.project_name}`}
                          />
                        )
                      }

                      // End day: compact coloured bar with rounded right
                      if (pos === 'end') {
                        return (
                          <div
                            key={`${e.id}-end-${key}`}
                            className="h-5 w-full rounded-r"
                            style={{ backgroundColor: accentColor + '30', borderTop: `1px solid ${accentColor}50`, borderBottom: `1px solid ${accentColor}50`, borderRight: `2px solid ${accentColor}` }}
                            title={`${e.title} — ${e.project_name}`}
                          />
                        )
                      }

                      // Single or start: full chip with label
                      const chip = (
                        <div
                          className={cn(
                            'flex items-center gap-1 py-0.5 text-[11px] font-medium border truncate',
                            getEventBg(e),
                            pos === 'start' ? 'rounded-l px-1' : 'rounded px-1',
                          )}
                          style={{ borderLeftColor: accentColor, borderLeftWidth: '3px' }}
                          title={`${e.title} — ${e.project_name}`}
                        >
                          <EventIcon type={e.type} />
                          <span className="truncate">{e.title}</span>
                        </div>
                      )
                      return e.href ? (
                        <Link key={`${e.id}-${pos}`} href={e.href} className="hover:opacity-80 transition-opacity">
                          {chip}
                        </Link>
                      ) : (
                        <div key={`${e.id}-${pos}`}>{chip}</div>
                      )
                    })}
                    {dayEvents.length > 3 && (
                      <span className="text-[10px] text-muted-foreground px-1 font-medium">
                        +{dayEvents.length - 3} autres
                      </span>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Légende ── */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><Flag className="h-3.5 w-3.5 text-green-500" /> Étape terminée</span>
        <span className="flex items-center gap-1.5"><Flag className="h-3.5 w-3.5 text-blue-500" /> En cours</span>
        <span className="flex items-center gap-1.5"><Flag className="h-3.5 w-3.5 text-slate-400" /> À faire</span>
        <span className="flex items-center gap-1.5"><Video className="h-3.5 w-3.5 text-violet-500" /> Réunion</span>
        <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Onboarding</span>
      </div>

      {/* ── Prochains événements ── */}
      <div className="space-y-3">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <CalendarDays className="h-3.5 w-3.5" />
          Prochains événements
          <span className="font-normal normal-case tracking-normal text-muted-foreground/60">— 60 jours</span>
        </h2>

        {upcomingEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 rounded-xl border-2 border-dashed border-border bg-white text-center">
            <CalendarDays className="h-8 w-8 text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">Aucun événement dans les 60 prochains jours.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {upcomingEvents.map(e => {
              const eventDate = parseISO(e.date)
              const accentColor = e.project_color ?? getEventAccent(e)
              const inner = (
                <div className="flex items-center gap-3 w-full">
                  <div className="flex flex-col items-center justify-center w-11 shrink-0 rounded-xl border bg-muted/30 py-1.5">
                    <span className="text-[10px] text-muted-foreground uppercase leading-none">
                      {format(eventDate, 'MMM', { locale: fr })}
                    </span>
                    <span className="text-lg font-bold leading-tight tabular-nums">
                      {format(eventDate, 'd')}
                    </span>
                  </div>
                  <div className="w-1 self-stretch rounded-full shrink-0" style={{ backgroundColor: accentColor }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{e.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{e.project_name}</p>
                  </div>
                  <span className={cn('shrink-0 text-[11px] font-medium px-2.5 py-0.5 rounded-full border', getEventBg(e))}>
                    {e.type === 'meeting' ? 'Réunion' : e.type === 'onboarding' ? 'Onboarding' : 'Étape'}
                  </span>
                </div>
              )

              return e.href ? (
                <Link
                  key={e.id}
                  href={e.href}
                  className="flex items-stretch rounded-xl border bg-white hover:shadow-sm hover:border-primary/20 transition-all px-3 py-2.5"
                >
                  {inner}
                </Link>
              ) : (
                <div key={e.id} className="flex items-stretch rounded-xl border bg-white px-3 py-2.5">
                  {inner}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
