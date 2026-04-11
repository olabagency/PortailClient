import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { APP_CONFIG } from '@/config/app.config'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  FolderKanban,
  Users,
  CheckSquare,
  Plus,
  ArrowRight,
  Activity,
  Clock,
  CheckCircle2,
  PauseCircle,
  Zap,
} from 'lucide-react'
import { ActivityFeed } from '@/components/dashboard/ActivityFeed'

const statusLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  active: { label: 'Actif', variant: 'default' },
  paused: { label: 'En pause', variant: 'secondary' },
  completed: { label: 'Terminé', variant: 'outline' },
  archived: { label: 'Archivé', variant: 'destructive' },
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

  // Comptes projets par statut
  const [
    { count: totalProjects },
    { count: activeProjects },
    { count: pausedProjects },
    { count: completedProjects },
    { count: clientsCount },
  ] = await Promise.all([
    supabase.from('projects').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('projects').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'active'),
    supabase.from('projects').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'paused'),
    supabase.from('projects').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'completed'),
    supabase.from('clients').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
  ])

  // Étapes en cours (milestones)
  const { data: userProjects } = await supabase.from('projects').select('id').eq('user_id', user.id)
  const projectIds = (userProjects ?? []).map((p) => p.id)
  let pendingMilestones = 0
  let inProgressMilestones = 0

  if (projectIds.length > 0) {
    const [{ count: pending }, { count: inProgress }] = await Promise.all([
      supabase.from('project_milestones').select('id', { count: 'exact', head: true }).in('project_id', projectIds).eq('status', 'pending'),
      supabase.from('project_milestones').select('id', { count: 'exact', head: true }).in('project_id', projectIds).eq('status', 'in_progress'),
    ])
    pendingMilestones = pending ?? 0
    inProgressMilestones = inProgress ?? 0
  }

  // 3 projets récents
  const { data: recentProjects } = await supabase
    .from('projects')
    .select('id, name, color, status, created_at, clients(name, company)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(3)

  const firstName = profile?.full_name?.split(' ')[0] ?? null

  // Bannière upgrade
  const plan = (profile?.plan ?? 'free') as keyof typeof APP_CONFIG.plans
  const maxProjects = APP_CONFIG.plans[plan].maxProjects
  const showUpgradeBanner = plan === 'free' && (totalProjects ?? 0) >= maxProjects - 1

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Bienvenue */}
      <div>
        <h1 className="text-2xl font-bold">
          {firstName ? `Bonjour, ${firstName} 👋` : `Bienvenue sur ${APP_CONFIG.name}`}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Voici un aperçu de votre activité.
        </p>
      </div>

      {/* Bannière upgrade */}
      {showUpgradeBanner && (
        <div className="flex items-center justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="flex items-center gap-3">
            <Zap className="h-4 w-4 text-amber-600 shrink-0" />
            <p className="text-sm text-amber-800">
              <span className="font-semibold">Limite approchante :</span>{' '}
              vous utilisez {totalProjects}/{maxProjects} projets sur le plan Gratuit.
            </p>
          </div>
          <Link
            href="/dashboard/settings/billing"
            className="shrink-0 text-xs font-semibold text-amber-700 hover:text-amber-900 flex items-center gap-1 whitespace-nowrap"
          >
            Passer au Pro <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      )}

      {/* Métriques — 4 KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <FolderKanban className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalProjects ?? 0}</p>
                <p className="text-xs text-muted-foreground">Total projets</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingMilestones}</p>
                <p className="text-xs text-muted-foreground">Étapes en attente</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                <CheckSquare className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{inProgressMilestones + (activeProjects ?? 0)}</p>
                <p className="text-xs text-muted-foreground">En cours</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{completedProjects ?? 0}</p>
                <p className="text-xs text-muted-foreground">Terminés</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stats secondaires */}
      <div className="flex gap-4 flex-wrap text-sm text-muted-foreground">
        <Link href="/dashboard/clients" className="flex items-center gap-1.5 hover:text-foreground transition-colors">
          <Users className="h-3.5 w-3.5" />
          {clientsCount ?? 0} client{(clientsCount ?? 0) > 1 ? 's' : ''}
        </Link>
        {(pausedProjects ?? 0) > 0 && (
          <span className="flex items-center gap-1.5">
            <PauseCircle className="h-3.5 w-3.5" />
            {pausedProjects} en pause
          </span>
        )}
      </div>

      {/* Projets récents */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Projets récents
          </h2>
          <Link
            href="/dashboard/projects"
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
          >
            Tous les projets
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {recentProjects && recentProjects.length > 0 ? (
          <div className="space-y-2">
            {recentProjects.map((project) => {
              const statusInfo = statusLabels[project.status] ?? { label: project.status, variant: 'secondary' as const }
              const client = project.clients as unknown as { name: string; company: string | null } | null

              return (
                <Link
                  key={project.id}
                  href={`/dashboard/projects/${project.id}`}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border bg-background hover:bg-muted transition-colors"
                >
                  <div
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: project.color ?? '#6B7280' }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{project.name}</p>
                    {client && (
                      <p className="text-xs text-muted-foreground truncate">
                        {client.name}{client.company ? ` · ${client.company}` : ''}
                      </p>
                    )}
                  </div>
                  <Badge variant={statusInfo.variant} className="shrink-0">
                    {statusInfo.label}
                  </Badge>
                </Link>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-10 border border-dashed border-border rounded-lg">
            <p className="text-sm text-muted-foreground">Aucun projet pour l&apos;instant</p>
            <Link
              href="/dashboard/projects/new"
              className="mt-3 inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-medium h-7 px-2.5 gap-1 transition-all hover:bg-primary/80"
            >
              <Plus className="h-3.5 w-3.5" />
              Créer un projet
            </Link>
          </div>
        )}
      </div>

      {/* Activité récente */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Activity className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Activité récente
          </h2>
        </div>
        <Card>
          <CardContent className="py-2 px-4">
            <ActivityFeed apiUrl="/api/activity" limit={8} showProject />
          </CardContent>
        </Card>
      </div>

      {/* Raccourcis */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Raccourcis
        </h2>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/dashboard/projects/new"
            className="inline-flex items-center justify-center gap-1 rounded-[min(var(--radius-md),12px)] border border-border bg-background hover:bg-muted text-sm font-medium h-7 px-2.5 transition-all"
          >
            <Plus className="h-3.5 w-3.5" />
            Nouveau projet
          </Link>
          <Link
            href="/dashboard/clients"
            className="inline-flex items-center justify-center gap-1 rounded-[min(var(--radius-md),12px)] border border-border bg-background hover:bg-muted text-sm font-medium h-7 px-2.5 transition-all"
          >
            <Users className="h-3.5 w-3.5" />
            Voir les clients
          </Link>
          <Link
            href="/dashboard/projects"
            className="inline-flex items-center justify-center gap-1 rounded-[min(var(--radius-md),12px)] border border-border bg-background hover:bg-muted text-sm font-medium h-7 px-2.5 transition-all"
          >
            <FolderKanban className="h-3.5 w-3.5" />
            Tous les projets
          </Link>
        </div>
      </div>
    </div>
  )
}
