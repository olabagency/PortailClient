import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { APP_CONFIG } from '@/config/app.config'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import {
  FolderKanban, Users, Clock, CheckCircle2, Zap, Plus, ArrowRight,
  AlertTriangle, ClipboardList, PackageOpen, ChevronRight,
  TrendingUp, MessageSquare, Crown, Sparkles, CalendarCheck, Video, ExternalLink,
} from 'lucide-react'
import { ActivityFeed } from '@/components/dashboard/ActivityFeed'
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

  // Réunions du jour
  const todayStart = new Date(); todayStart.setHours(0,0,0,0)
  const todayEnd   = new Date(); todayEnd.setHours(23,59,59,999)
  const { data: todayMeetingsRaw } = projectIds.length > 0
    ? await supabase
        .from('project_meetings')
        .select('id, title, scheduled_at, meeting_link, project_id, projects(name)')
        .in('project_id', projectIds)
        .gte('scheduled_at', todayStart.toISOString())
        .lte('scheduled_at', todayEnd.toISOString())
        .order('scheduled_at', { ascending: true })
    : { data: [] }
  const todayMeetings = ((todayMeetingsRaw ?? []) as unknown) as Array<{
    id: string; title: string; scheduled_at: string
    meeting_link: string | null; project_id: string
    projects: { name: string } | null
  }>

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
  let pendingClientFeedback = 0
  let milestoneProgressMap: Record<string, { total: number; completed: number }> = {}

  if (projectIds.length > 0) {
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]

    const [
      { count: pendingMilestonesCount },
      { count: overdueMilestonesCount },
      { count: pendingResponsesCount },
      { count: pendingDeliverablesCount },
      { count: pendingClientFeedbackCount },
      { data: allMilestonesData },
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
      supabase.from('client_feedback').select('id', { count: 'exact', head: true })
        .in('project_id', projectIds).eq('source', 'client').eq('status', 'pending'),
      supabase.from('project_milestones').select('project_id, status')
        .in('project_id', (recentProjects ?? []).map(p => p.id)),
    ])

    pendingMilestones    = pendingMilestonesCount ?? 0
    overdueMilestones    = overdueMilestonesCount ?? 0
    pendingResponses     = pendingResponsesCount ?? 0
    pendingDeliverables  = pendingDeliverablesCount ?? 0
    pendingClientFeedback = pendingClientFeedbackCount ?? 0

    // Progress par projet récent
    for (const m of (allMilestonesData ?? [])) {
      if (!milestoneProgressMap[m.project_id]) milestoneProgressMap[m.project_id] = { total: 0, completed: 0 }
      milestoneProgressMap[m.project_id].total++
      if (m.status === 'completed') milestoneProgressMap[m.project_id].completed++
    }
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
    pendingClientFeedback > 0 && {
      label: `${pendingClientFeedback} retour${pendingClientFeedback > 1 ? 's' : ''} client à traiter`,
      sub: 'Retour(s) en attente de réponse',
      Icon: MessageSquare,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      border: 'border-blue-200',
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
                    <div className="w-1 shrink-0" style={{ backgroundColor: project.color ?? '#386FA4' }} />
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
                                backgroundColor: pct === 100 ? '#22c55e' : (project.color ?? '#386FA4'),
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
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Activité récente
            </h2>
          </div>
          <Card className="bg-white">
            <CardContent className="py-2 px-4">
              <ActivityFeed
                apiUrl="/api/activity"
                limit={10}
                showProject
                viewAllHref="/dashboard/activity"
              />
            </CardContent>
          </Card>

          {todayMeetings.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                <CalendarCheck className="h-3.5 w-3.5 text-violet-500" />
                Réunions du jour
              </h2>
              <div className="space-y-2">
                {todayMeetings.map(m => (
                  <div key={m.id} className="rounded-xl border border-violet-100 bg-violet-50 px-4 py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-violet-900 truncate">{m.title}</p>
                      <p className="text-xs text-violet-600 mt-0.5">
                        {new Date(m.scheduled_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        {m.projects?.name ? ` · ${m.projects.name}` : ''}
                      </p>
                    </div>
                    {m.meeting_link && (
                      <a
                        href={m.meeting_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 inline-flex items-center gap-1.5 bg-violet-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-violet-700 transition-colors"
                      >
                        <Video className="h-3.5 w-3.5" />
                        Rejoindre
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Bannière plan ── */}
      {plan === 'free' ? (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#133C55] via-[#386FA4] to-[#59A5D8] px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Cercles décoratifs */}
          <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-white/5 pointer-events-none" />
          <div className="absolute -bottom-10 right-24 h-40 w-40 rounded-full bg-white/5 pointer-events-none" />

          <div className="text-white space-y-1.5 relative z-10">
            <p className="font-bold text-lg flex items-center gap-2">
              <Crown className="h-5 w-5 text-[#84D2F6]" />
              Passez au Plan Pro — 14€/mois
            </p>
            <p className="text-sm text-white/80 leading-relaxed">
              Projets illimités · Messagerie client · Google Calendar &amp; Meet · 10 Go de stockage
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {['✓ Illimité', '✓ Messagerie', '✓ Google Meet', '✓ 10 Go'].map(f => (
                <span key={f} className="text-xs bg-white/15 text-white px-2.5 py-0.5 rounded-full font-medium">
                  {f}
                </span>
              ))}
            </div>
          </div>

          <Link
            href="/dashboard/settings/billing"
            className="relative z-10 shrink-0 inline-flex items-center gap-2 bg-white text-[#133C55] font-semibold text-sm px-5 py-2.5 rounded-xl hover:bg-white/90 transition-colors shadow-sm whitespace-nowrap"
          >
            <Sparkles className="h-4 w-4" />
            Voir les offres
          </Link>
        </div>
      ) : (
        <div className="rounded-2xl bg-gradient-to-r from-[#133C55] to-[#386FA4] px-6 py-4 flex items-center justify-between gap-4">
          <div className="text-white flex items-center gap-3">
            <Crown className="h-5 w-5 text-[#84D2F6] shrink-0" />
            <div>
              <p className="font-semibold text-sm">
                Plan {APP_CONFIG.plans[plan as keyof typeof APP_CONFIG.plans]?.name ?? 'Pro'} activé
              </p>
              <p className="text-xs text-white/70 mt-0.5">Toutes les fonctionnalités sont disponibles.</p>
            </div>
          </div>
          <Link
            href="/dashboard/settings/billing"
            className="shrink-0 text-xs text-white/70 hover:text-white flex items-center gap-1 transition-colors"
          >
            Gérer <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      )}

    </div>
  )
}
