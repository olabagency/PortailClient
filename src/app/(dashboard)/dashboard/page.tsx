import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { APP_CONFIG } from '@/config/app.config'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import {
  FolderKanban, Users, Clock, CheckCircle2, Zap, Plus, ArrowRight,
  CalendarDays, AlertTriangle, ClipboardList, PackageOpen, ChevronRight,
  TrendingUp,
} from 'lucide-react'
import { ActivityFeed } from '@/components/dashboard/ActivityFeed'
import { MiniCalendar } from '@/components/dashboard/MiniCalendar'
import type { CalendarEvent } from '@/components/dashboard/MiniCalendar'
import { cn } from '@/lib/utils'

const statusConfig: Record<string, { label: string; dot: string; text: string; bg: string; border: string }> = {
  active:    { label: 'Actif',    dot: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50',  border: 'border-emerald-200' },
  paused:    { label: 'En pause', dot: 'bg-amber-400',   text: 'text-amber-700',   bg: 'bg-amber-50',    border: 'border-amber-200' },
  completed: { label: 'Terminé',  dot: 'bg-gray-400',    text: 'text-gray-600',    bg: 'bg-gray-50',     border: 'border-gray-200' },
  archived:  { label: 'Archivé',  dot: 'bg-gray-300',    text: 'text-gray-500',    bg: 'bg-gray-50',     border: 'border-gray-200' },
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, plan')
    .eq('id', user.id)
    .single()

  const [
    { count: totalProjects },
    { count: activeProjects },
    { count: completedProjects },
    { count: clientsCount },
  ] = await Promise.all([
    supabase.from('projects').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('projects').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'active'),
    supabase.from('projects').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'completed'),
    supabase.from('clients').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
  ])

  const { data: userProjects } = await supabase.from('projects').select('id').eq('user_id', user.id)
  const projectIds = (userProjects ?? []).map((p) => p.id)

  // Projets récents avec client
  const { data: recentProjects } = await supabase
    .from('projects')
    .select('id, name, color, status, created_at, clients(name, company)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(6)

  let pendingMilestones = 0
  let overdueMilestones = 0
  let pendingResponses = 0
  let pendingDeliverables = 0
  let allEvents: CalendarEvent[] = []
  let milestoneProgressMap: Record<string, { total: number; completed: number }> = {}

  if (projectIds.length > 0) {
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]
    const in60 = new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000)

    const [
      { count: pendingMilestonesCount },
      { count: overdueMilestonesCount },
      { count: pendingResponsesCount },
      { count: pendingDeliverablesCount },
      { data: allMilestonesData },
      { data: upcomingMilestonesData },
      { data: upcomingMeetingsData },
      { data: validatedOnboardingsData },
    ] = await Promise.all([
      supabase.from('project_milestones').select('id', { count: 'exact', head: true })
        .in('project_id', projectIds).in('status', ['pending', 'in_progress']),
      supabase.from('project_milestones').select('id', { count: 'exact', head: true })
        .in('project_id', projectIds).neq('status', 'completed')
        .not('due_date', 'is', null).lt('due_date', todayStr),
      supabase.from('form_responses').select('id', { count: 'exact', head: true })
        .in('project_id', projectIds).eq('completed', true).is('validated_at', null),
      supabase.from('project_deliverables').select('id', { count: 'exact', head: true })
        .in('project_id', projectIds).eq('status', 'pending'),
      supabase.from('project_milestones').select('project_id, status')
        .in('project_id', (recentProjects ?? []).map(p => p.id)),
      supabase.from('project_milestones')
        .select('id, title, due_date, status, project_id, projects(name, color)')
        .in('project_id', projectIds).not('due_date', 'is', null)
        .gte('due_date', todayStr).lte('due_date', in60.toISOString().split('T')[0]).order('due_date'),
      supabase.from('project_meetings')
        .select('id, title, scheduled_at, project_id, projects(name, color)')
        .in('project_id', projectIds)
        .gte('scheduled_at', today.toISOString()).lte('scheduled_at', in60.toISOString()).order('scheduled_at'),
      supabase.from('form_responses')
        .select('id, validated_at, project_id, projects(name, color)')
        .in('project_id', projectIds).not('validated_at', 'is', null)
        .gte('validated_at', new Date(today.getTime() - 30 * 86400000).toISOString())
        .order('validated_at', { ascending: false }),
    ])

    pendingMilestones   = pendingMilestonesCount ?? 0
    overdueMilestones   = overdueMilestonesCount ?? 0
    pendingResponses    = pendingResponsesCount ?? 0
    pendingDeliverables = pendingDeliverablesCount ?? 0

    // Progress par projet récent
    for (const m of (allMilestonesData ?? [])) {
      if (!milestoneProgressMap[m.project_id]) milestoneProgressMap[m.project_id] = { total: 0, completed: 0 }
      milestoneProgressMap[m.project_id].total++
      if (m.status === 'completed') milestoneProgressMap[m.project_id].completed++
    }

    // Événements calendrier
    const milestoneEvents: CalendarEvent[] = (upcomingMilestonesData ?? []).map((m) => {
      const proj = m.projects as unknown as { name: string; color: string | null } | null
      return { id: m.id, title: m.title, date: m.due_date!, type: 'milestone' as const, status: m.status as CalendarEvent['status'], project_id: m.project_id, project_name: proj?.name ?? '—', project_color: proj?.color ?? null, href: `/dashboard/projects/${m.project_id}/milestones` }
    })
    const meetingEvents: CalendarEvent[] = (upcomingMeetingsData ?? []).map((m) => {
      const proj = m.projects as unknown as { name: string; color: string | null } | null
      return { id: m.id, title: m.title, date: (m.scheduled_at as string).slice(0, 10), type: 'meeting' as const, project_id: m.project_id, project_name: proj?.name ?? '—', project_color: proj?.color ?? null, href: `/dashboard/projects/${m.project_id}/meetings` }
    })
    const onboardingEvents: CalendarEvent[] = (validatedOnboardingsData ?? []).map((v) => {
      const proj = v.projects as unknown as { name: string; color: string | null } | null
      return { id: v.id, title: 'Onboarding validé', date: (v.validated_at as string).slice(0, 10), type: 'onboarding' as const, status: 'validated' as const, project_id: v.project_id, project_name: proj?.name ?? '—', project_color: proj?.color ?? null, href: `/dashboard/projects/${v.project_id}/onboarding` }
    })
    allEvents = [...milestoneEvents, ...meetingEvents, ...onboardingEvents]
  }

  const firstName = profile?.full_name?.split(' ')[0] ?? null
  const plan = (profile?.plan ?? 'free') as keyof typeof APP_CONFIG.plans
  const maxProjects = APP_CONFIG.plans[plan].maxProjects
  const showUpgradeBanner = plan === 'free' && (totalProjects ?? 0) >= maxProjects - 1

  // Actions à traiter
  const actions = [
    overdueMilestones > 0 && {
      label: `${overdueMilestones} étape${overdueMilestones > 1 ? 's' : ''} en retard`,
      sub: 'Deadline dépassée — à replanifier',
      Icon: AlertTriangle,
      color: 'text-red-600',
      bg: 'bg-red-50',
      border: 'border-red-200',
      href: '/dashboard/projects',
    },
    pendingResponses > 0 && {
      label: `${pendingResponses} onboarding${pendingResponses > 1 ? 's' : ''} à valider`,
      sub: 'Réponse reçue, en attente de votre validation',
      Icon: ClipboardList,
      color: 'text-violet-600',
      bg: 'bg-violet-50',
      border: 'border-violet-200',
      href: '/dashboard/projects',
    },
    pendingDeliverables > 0 && {
      label: `${pendingDeliverables} livrable${pendingDeliverables > 1 ? 's' : ''} en attente`,
      sub: 'En attente de validation client',
      Icon: PackageOpen,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      href: '/dashboard/projects',
    },
  ].filter(Boolean) as Array<{ label: string; sub: string; Icon: React.ElementType; color: string; bg: string; border: string; href: string }>

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {firstName ? `Bonjour, ${firstName}` : 'Tableau de bord'}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {(activeProjects ?? 0) > 0
              ? `${activeProjects} projet${(activeProjects ?? 0) > 1 ? 's' : ''} en cours · ${clientsCount ?? 0} client${(clientsCount ?? 0) > 1 ? 's' : ''}`
              : 'Créez votre premier projet pour démarrer.'}
          </p>
        </div>
        <Link
          href="/dashboard/projects/new"
          className="hidden sm:inline-flex items-center gap-1.5 bg-primary text-primary-foreground text-sm font-medium px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors shrink-0"
        >
          <Plus className="h-4 w-4" />
          Nouveau projet
        </Link>
      </div>

      {/* ── Bannière upgrade ── */}
      {showUpgradeBanner && (
        <div className="flex items-center justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="flex items-center gap-3">
            <Zap className="h-4 w-4 text-amber-600 shrink-0" />
            <p className="text-sm text-amber-800">
              <span className="font-semibold">Limite approchante :</span>{' '}
              vous utilisez {totalProjects}/{maxProjects} projets sur le plan Gratuit.
            </p>
          </div>
          <Link href="/dashboard/settings/billing" className="shrink-0 text-xs font-semibold text-amber-700 hover:text-amber-900 flex items-center gap-1 whitespace-nowrap">
            Passer au Pro <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      )}

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Projets actifs',   value: activeProjects ?? 0,   icon: FolderKanban,  color: 'text-primary',       bg: 'bg-primary/8',   stripe: 'bg-primary' },
          { label: 'Étapes en cours',  value: pendingMilestones,      icon: Clock,          color: 'text-amber-600',     bg: 'bg-amber-50',    stripe: 'bg-amber-400' },
          { label: 'Projets terminés', value: completedProjects ?? 0, icon: CheckCircle2,   color: 'text-emerald-600',   bg: 'bg-emerald-50',  stripe: 'bg-emerald-400' },
          { label: 'Clients',          value: clientsCount ?? 0,      icon: Users,          color: 'text-blue-600',      bg: 'bg-blue-50',     stripe: 'bg-blue-400' },
        ].map(({ label, value, icon: Icon, color, bg, stripe }) => (
          <div key={label} className="bg-white rounded-xl border overflow-hidden">
            <div className={cn('h-1 w-full', stripe)} />
            <div className="p-4 flex items-start justify-between gap-2">
              <div>
                <p className="text-3xl font-bold tracking-tight leading-none">{value}</p>
                <p className="text-xs text-muted-foreground mt-2">{label}</p>
              </div>
              <div className={cn('h-9 w-9 rounded-xl flex items-center justify-center shrink-0', bg)}>
                <Icon className={cn('h-[18px] w-[18px]', color)} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Actions à traiter ── */}
      {actions.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
            À traiter
          </h2>
          <div className={cn('grid gap-3', actions.length === 1 ? 'sm:grid-cols-1 max-w-sm' : actions.length === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-3')}>
            {actions.map((action) => (
              <Link
                key={action.label}
                href={action.href}
                className={cn('group flex items-center gap-3 rounded-xl border p-4 hover:shadow-sm transition-all', action.bg, action.border)}
              >
                <div className={cn('shrink-0', action.color)}>
                  <action.Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm font-semibold leading-tight', action.color)}>{action.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{action.sub}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── Layout 2 colonnes ── */}
      <div className="grid lg:grid-cols-3 gap-6">

        {/* Col gauche : Projets récents */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Projets récents
            </h2>
            <Link href="/dashboard/projects" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
              Voir tout <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {recentProjects && recentProjects.length > 0 ? (
            <div className="space-y-2">
              {recentProjects.map((project) => {
                const statusInfo = statusConfig[project.status] ?? { label: project.status, dot: 'bg-gray-400', text: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200' }
                const client = project.clients as unknown as { name: string; company: string | null } | null
                const progress = milestoneProgressMap[project.id]
                const pct = progress && progress.total > 0
                  ? Math.round((progress.completed / progress.total) * 100)
                  : null

                return (
                  <Link
                    key={project.id}
                    href={`/dashboard/projects/${project.id}`}
                    className="group flex items-stretch rounded-xl border border-border bg-white hover:shadow-sm hover:border-primary/20 transition-all overflow-hidden"
                  >
                    <div className="w-1 shrink-0" style={{ backgroundColor: project.color ?? '#E8553A' }} />
                    <div className="flex-1 px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                            {project.name}
                          </p>
                          {client && (
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">
                              {client.name}{client.company ? ` · ${client.company}` : ''}
                            </p>
                          )}
                        </div>
                        <span className={cn(
                          'inline-flex items-center gap-1.5 text-xs font-medium rounded-full border px-2.5 py-0.5 shrink-0',
                          statusInfo.bg, statusInfo.text, statusInfo.border,
                        )}>
                          <span className={cn('h-1.5 w-1.5 rounded-full', statusInfo.dot)} />
                          {statusInfo.label}
                        </span>
                      </div>
                      {pct !== null && (
                        <div className="mt-2.5 flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${pct}%`,
                                backgroundColor: pct === 100 ? '#22c55e' : (project.color ?? '#E8553A'),
                              }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground tabular-nums w-8 text-right">{pct}%</span>
                        </div>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-14 rounded-xl border-2 border-dashed border-border bg-white text-center">
              <div className="h-12 w-12 rounded-full bg-primary/8 flex items-center justify-center mb-3">
                <FolderKanban className="h-6 w-6 text-primary" />
              </div>
              <p className="font-medium text-sm">Aucun projet pour l&apos;instant</p>
              <p className="text-xs text-muted-foreground mt-1 mb-4">Créez votre premier projet en 2 minutes.</p>
              <Link href="/dashboard/projects/new" className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground text-sm font-medium px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors">
                <Plus className="h-3.5 w-3.5" />
                Créer un projet
              </Link>
            </div>
          )}

          {(recentProjects?.length ?? 0) > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              <Link href="/dashboard/projects/new" className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white hover:bg-accent text-xs font-medium h-8 px-3 transition-all">
                <Plus className="h-3.5 w-3.5" /> Nouveau projet
              </Link>
              <Link href="/dashboard/clients" className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white hover:bg-accent text-xs font-medium h-8 px-3 transition-all">
                <Users className="h-3.5 w-3.5" /> Gérer les clients
              </Link>
              <Link href="/dashboard/projects" className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white hover:bg-accent text-xs font-medium h-8 px-3 transition-all">
                <TrendingUp className="h-3.5 w-3.5" /> Tous les projets
              </Link>
            </div>
          )}
        </div>

        {/* Col droite : Activité + plan */}
        <div className="space-y-4">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Activité récente
          </h2>
          <Card className="bg-white">
            <CardContent className="py-2 px-4">
              <ActivityFeed apiUrl="/api/activity" limit={8} showProject />
            </CardContent>
          </Card>

          {plan === 'free' && (
            <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
              <CardContent className="py-4 px-4">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="h-4 w-4 text-primary" />
                  <p className="text-sm font-semibold">Plan Gratuit</p>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  {totalProjects}/{maxProjects} projets utilisés
                </p>
                <div className="h-1.5 bg-primary/20 rounded-full overflow-hidden mb-3">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${Math.min(((totalProjects ?? 0) / (maxProjects === Infinity ? 1 : maxProjects)) * 100, 100)}%` }}
                  />
                </div>
                <Link href="/dashboard/settings/billing" className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
                  Passer au Pro <ArrowRight className="h-3 w-3" />
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* ── Calendrier ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <CalendarDays className="h-3.5 w-3.5" />
            Calendrier — 60 prochains jours
          </h2>
          <Link href="/dashboard/calendar" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
            Vue complète <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <Card className="bg-white">
          <CardContent className="p-4">
            {allEvents.length > 0 ? (
              <MiniCalendar events={allEvents} fullViewHref="/dashboard/calendar" />
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <CalendarDays className="h-8 w-8 text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">Aucun événement prévu dans les 60 prochains jours.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

    </div>
  )
}
