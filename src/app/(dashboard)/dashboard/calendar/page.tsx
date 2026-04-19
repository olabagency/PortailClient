import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Flag, Video, CheckCircle2 } from 'lucide-react'
import { FullCalendarView } from '@/components/dashboard/FullCalendarView'
import type { CalendarEvent } from '@/components/dashboard/MiniCalendar'
import type { ProjectInfo } from '@/components/dashboard/FullCalendarView'
import { cn } from '@/lib/utils'

export const metadata = { title: 'Calendrier' }

export default async function CalendarPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userProjects } = await supabase
    .from('projects')
    .select('id, name, color')
    .eq('user_id', user.id)
    .order('name')

  const projectIds = (userProjects ?? []).map(p => p.id)
  const projects: ProjectInfo[] = (userProjects ?? []).map(p => ({ id: p.id, name: p.name, color: p.color }))

  let allEvents: CalendarEvent[] = []

  if (projectIds.length > 0) {
    const [
      { data: milestonesData },
      { data: meetingsData },
      { data: onboardingsData },
    ] = await Promise.all([
      supabase.from('project_milestones')
        .select('id, title, due_date, start_date, status, project_id, projects(name, color)')
        .in('project_id', projectIds).not('due_date', 'is', null).order('due_date'),
      supabase.from('project_meetings')
        .select('id, title, scheduled_at, project_id, projects(name, color)')
        .in('project_id', projectIds).order('scheduled_at'),
      supabase.from('form_responses')
        .select('id, validated_at, project_id, projects(name, color)')
        .in('project_id', projectIds).not('validated_at', 'is', null)
        .order('validated_at', { ascending: false }),
    ])

    const milestoneEvents: CalendarEvent[] = (milestonesData ?? []).map(m => {
      const proj = m.projects as unknown as { name: string; color: string | null } | null
      const dueDate = (m.due_date as string).slice(0, 10)
      const startDate = m.start_date ? (m.start_date as string).slice(0, 10) : undefined
      return {
        id: m.id,
        title: m.title,
        date: dueDate,
        range_start: startDate && startDate !== dueDate ? startDate : undefined,
        type: 'milestone' as const,
        status: m.status as CalendarEvent['status'],
        project_id: m.project_id,
        project_name: proj?.name ?? '—',
        project_color: proj?.color ?? null,
        href: `/dashboard/projects/${m.project_id}/milestones`,
      }
    })
    const meetingEvents: CalendarEvent[] = (meetingsData ?? []).map(m => {
      const proj = m.projects as unknown as { name: string; color: string | null } | null
      return { id: m.id, title: m.title, date: (m.scheduled_at as string).slice(0, 10), type: 'meeting' as const, project_id: m.project_id, project_name: proj?.name ?? '—', project_color: proj?.color ?? null, href: `/dashboard/projects/${m.project_id}/meetings` }
    })
    const onboardingEvents: CalendarEvent[] = (onboardingsData ?? []).map(v => {
      const proj = v.projects as unknown as { name: string; color: string | null } | null
      return { id: v.id, title: 'Onboarding validé', date: (v.validated_at as string).slice(0, 10), type: 'onboarding' as const, status: 'validated' as const, project_id: v.project_id, project_name: proj?.name ?? '—', project_color: proj?.color ?? null, href: `/dashboard/projects/${v.project_id}/onboarding` }
    })

    allEvents = [...milestoneEvents, ...meetingEvents, ...onboardingEvents]
  }

  const milestoneCount = allEvents.filter(e => e.type === 'milestone').length
  const meetingCount = allEvents.filter(e => e.type === 'meeting').length
  const onboardingCount = allEvents.filter(e => e.type === 'onboarding').length

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Calendrier</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {allEvents.length > 0
              ? `${allEvents.length} événement${allEvents.length > 1 ? 's' : ''} sur ${projects.length} projet${projects.length > 1 ? 's' : ''}`
              : 'Aucun événement pour le moment.'}
          </p>
        </div>
      </div>

      {/* Stats */}
      {allEvents.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Étapes', value: milestoneCount, icon: Flag, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', stripe: 'bg-blue-400' },
            { label: 'Réunions', value: meetingCount, icon: Video, color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-200', stripe: 'bg-violet-400' },
            { label: 'Onboardings', value: onboardingCount, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', stripe: 'bg-emerald-400' },
          ].map(({ label, value, icon: Icon, color, bg, border, stripe }) => (
            <div key={label} className={cn('rounded-xl border overflow-hidden bg-white')}>
              <div className={cn('h-1 w-full', stripe)} />
              <div className={cn('p-4 flex items-center gap-3')}>
                <div className={cn('h-9 w-9 rounded-xl flex items-center justify-center shrink-0', bg, border, 'border')}>
                  <Icon className={cn('h-4 w-4', color)} />
                </div>
                <div>
                  <p className={cn('text-2xl font-bold leading-none', color)}>{value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <FullCalendarView events={allEvents} projects={projects} />
    </div>
  )
}
