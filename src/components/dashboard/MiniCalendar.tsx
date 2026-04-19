'use client'

import { useState } from 'react'
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isToday,
  addMonths, subMonths, format, parseISO,
} from 'date-fns'
import { fr } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CalendarEvent {
  id: string
  title: string
  date: string             // YYYY-MM-DD (end date / main date)
  range_start?: string     // YYYY-MM-DD — if set, event spans range_start → date
  type: 'milestone' | 'meeting' | 'onboarding'
  status?: 'pending' | 'in_progress' | 'completed' | 'validated'
  project_id: string
  project_name: string
  project_color: string | null
  href?: string
}

/** @deprecated Use CalendarEvent instead */
export interface CalendarMilestone {
  id: string
  title: string
  due_date: string
  status: 'pending' | 'in_progress' | 'completed'
  project_id: string
  project_name: string
  project_color: string | null
}

interface MiniCalendarProps {
  events?: CalendarEvent[]
  /** @deprecated Use events instead */
  milestones?: CalendarMilestone[]
  /** If provided, renders a "Vue complète" link */
  fullViewHref?: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getDotColor(event: CalendarEvent): string {
  if (event.type === 'meeting') return '#8b5cf6'           // violet-500
  if (event.type === 'onboarding') return '#10b981'        // emerald-500
  // milestone
  if (event.status === 'completed') return '#22c55e'       // green-500
  if (event.status === 'in_progress') return '#3b82f6'     // blue-500
  return '#94a3b8'                                          // slate-400
}

function getEventIcon(type: CalendarEvent['type']): string {
  if (type === 'meeting') return '📅'
  if (type === 'onboarding') return '✅'
  return '🎯'
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MiniCalendar({ events, milestones, fullViewHref }: MiniCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [hoveredDay, setHoveredDay] = useState<string | null>(null)

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: calStart, end: calEnd })

  // Normalize: support legacy `milestones` prop by converting to CalendarEvent
  const normalizedEvents: CalendarEvent[] = events ?? (milestones ?? []).map((m) => ({
    id: m.id,
    title: m.title,
    date: m.due_date,
    type: 'milestone' as const,
    status: m.status,
    project_id: m.project_id,
    project_name: m.project_name,
    project_color: m.project_color,
  }))

  // Index events by date string (YYYY-MM-DD), expanding range events across all days
  const byDate: Record<string, CalendarEvent[]> = {}
  for (const e of normalizedEvents) {
    if (!e.date) continue

    if (e.range_start) {
      try {
        const rangeStart = parseISO(e.range_start)
        const rangeEnd = parseISO(e.date.slice(0, 10))
        const rangeDays = eachDayOfInterval({ start: rangeStart, end: rangeEnd })
        for (const d of rangeDays) {
          const key = format(d, 'yyyy-MM-dd')
          if (!byDate[key]) byDate[key] = []
          byDate[key].push(e)
        }
      } catch {
        const key = e.date.slice(0, 10)
        if (!byDate[key]) byDate[key] = []
        byDate[key].push(e)
      }
    } else {
      const key = e.date.slice(0, 10)
      if (!byDate[key]) byDate[key] = []
      byDate[key].push(e)
    }
  }

  const weekDays = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
          aria-label="Mois précédent"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-semibold capitalize">
          {format(currentMonth, 'MMMM yyyy', { locale: fr })}
        </span>
        <button
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
          aria-label="Mois suivant"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 gap-0">
        {weekDays.map((d, i) => (
          <div key={i} className="text-center text-[10px] font-medium text-muted-foreground py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-0">
        {days.map((day) => {
          const key = format(day, 'yyyy-MM-dd')
          const dayEvents = byDate[key] ?? []
          const isCurrentMonth = isSameMonth(day, currentMonth)
          const isTodayDay = isToday(day)
          const isHovered = hoveredDay === key && dayEvents.length > 0

          return (
            <div
              key={key}
              className="relative flex flex-col items-center py-1 group"
              onMouseEnter={() => setHoveredDay(key)}
              onMouseLeave={() => setHoveredDay(null)}
            >
              {/* Day number */}
              <span
                className={[
                  'flex items-center justify-center h-6 w-6 rounded-full text-xs transition-colors',
                  isTodayDay
                    ? 'bg-primary text-primary-foreground font-semibold'
                    : isCurrentMonth
                    ? 'text-foreground'
                    : 'text-muted-foreground/40',
                  !isTodayDay && dayEvents.length > 0 && isCurrentMonth
                    ? 'hover:bg-accent cursor-pointer font-medium'
                    : '',
                ].join(' ')}
              >
                {format(day, 'd')}
              </span>

              {/* Dots */}
              {dayEvents.length > 0 && isCurrentMonth && (
                <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center max-w-[28px]">
                  {dayEvents.slice(0, 3).map((e) =>
                    e.href ? (
                      <Link
                        key={e.id}
                        href={e.href}
                        className="block h-1.5 w-1.5 rounded-full shrink-0 hover:scale-150 transition-transform"
                        style={{ backgroundColor: getDotColor(e) }}
                        title={e.title}
                      />
                    ) : (
                      <span
                        key={e.id}
                        className="block h-1.5 w-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: getDotColor(e) }}
                      />
                    )
                  )}
                  {dayEvents.length > 3 && (
                    <span className="text-[9px] text-muted-foreground leading-none">+{dayEvents.length - 3}</span>
                  )}
                </div>
              )}

              {/* Popover on hover */}
              {isHovered && dayEvents.length > 0 && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-50 min-w-[190px] max-w-[240px] rounded-lg border border-border bg-white shadow-md p-2 space-y-1.5 pointer-events-none">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider pb-1 border-b border-border">
                    {format(day, 'd MMMM', { locale: fr })}
                  </p>
                  {dayEvents.map((e) => (
                    <div key={e.id} className="flex items-start gap-1.5">
                      <span className="text-[11px] shrink-0 mt-0.5">{getEventIcon(e.type)}</span>
                      <div className="min-w-0">
                        <p className="text-xs font-medium leading-snug text-foreground truncate">{e.title}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{e.project_name}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div className="pt-1 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
            Étape terminée
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-blue-500" />
            En cours
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-slate-400" />
            À faire
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: '#8b5cf6' }} />
            Réunion
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: '#10b981' }} />
            Onboarding
          </span>
        </div>
        {fullViewHref && (
          <Link
            href={fullViewHref}
            className="text-xs text-primary hover:underline font-medium shrink-0"
          >
            Vue complète →
          </Link>
        )}
      </div>
    </div>
  )
}
