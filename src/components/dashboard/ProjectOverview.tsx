'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  ArrowLeft,
  ExternalLink,
  ClipboardList,
  FolderOpen,
  PackageOpen,
  MessageSquare,
  ShieldCheck,
  RotateCcw,
  CheckCircle,
  Trash2,
  MoreHorizontal,
  Users,
  CalendarDays,
  ListChecks,
  ChevronRight,
  Share2,
  Flag,
  Clock,
  AlertTriangle,
  Inbox,
  FileText,
} from 'lucide-react'
import { format, isPast, differenceInDays } from 'date-fns'
import { fr } from 'date-fns/locale'
import { cn } from '@/lib/utils'

interface Project {
  id: string
  name: string
  description: string | null
  status: string
  color: string | null
  public_id: string
  clients: {
    id: string
    name: string
    company: string | null
    email: string
    website?: string | null
  } | null
  created_at: string
}

interface UpcomingMilestone {
  id: string
  title: string
  due_date: string
  status: string
  priority: string
}

interface ProjectOverviewProps {
  project: Project
  portalUrl: string
  milestoneStats: { total: number; completed: number }
  upcomingMilestones: UpcomingMilestone[]
  responseCount: number
  documentCount: number
  deliverableStats: { total: number; validated: number; pending: number }
  feedbackCount: number
  vaultCount: number
}

const statusConfig: Record<string, { label: string; bg: string; text: string; border: string; dot: string }> = {
  active:    { label: 'Actif',     bg: 'bg-emerald-50',  text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  paused:    { label: 'En pause',  bg: 'bg-amber-50',    text: 'text-amber-700',   border: 'border-amber-200',   dot: 'bg-amber-400' },
  completed: { label: 'Terminé',   bg: 'bg-gray-50',     text: 'text-gray-600',    border: 'border-gray-200',    dot: 'bg-gray-400' },
  archived:  { label: 'Archivé',   bg: 'bg-gray-50',     text: 'text-gray-500',    border: 'border-gray-200',    dot: 'bg-gray-300' },
}

export function ProjectOverview({
  project,
  portalUrl,
  milestoneStats,
  upcomingMilestones,
  responseCount,
  documentCount,
  deliverableStats,
  feedbackCount,
  vaultCount,
}: ProjectOverviewProps) {
  const router = useRouter()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [resetDialogOpen, setResetDialogOpen] = useState(false)
  const [closing, setClosing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [invitingPortal, setInvitingPortal] = useState(false)
  const [portalInvited, setPortalInvited] = useState(false)
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [linkClientOpen, setLinkClientOpen] = useState(false)
  const [clientsList, setClientsList] = useState<{ id: string; name: string; company: string | null; email: string | null }[]>([])
  const [clientSearch, setClientSearch] = useState('')
  const [linkingClient, setLinkingClient] = useState(false)

  const statusInfo = statusConfig[project.status] ?? { label: project.status, bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200', dot: 'bg-gray-400' }
  const progressPct = milestoneStats.total > 0
    ? Math.round((milestoneStats.completed / milestoneStats.total) * 100)
    : 0
  const accentColor = project.color ?? '#E8553A'
  const initials = project.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)

  async function openLinkClientDialog() {
    setClientSearch('')
    setLinkClientOpen(true)
    const res = await fetch('/api/clients')
    if (res.ok) {
      const json = await res.json() as { data: { id: string; name: string; company: string | null; email: string | null }[] }
      setClientsList(json.data ?? [])
    }
  }

  async function handleLinkClient(clientId: string) {
    setLinkingClient(true)
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: clientId }),
      })
      if (res.ok) {
        toast.success('Client lié au projet')
        setLinkClientOpen(false)
        router.refresh()
      } else {
        const json = await res.json() as { error?: string }
        toast.error(json.error ?? 'Erreur lors de la liaison')
      }
    } catch { toast.error('Erreur réseau') } finally { setLinkingClient(false) }
  }

  async function handleUnlinkClient() {
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: null }),
      })
      if (res.ok) { toast.success('Client délié'); router.refresh() }
      else toast.error('Erreur lors du déliage')
    } catch { toast.error('Erreur réseau') }
  }

  async function handleInvitePortal(emailOverride?: string) {
    const email = emailOverride ?? project.clients?.email
    if (!email) { setInviteDialogOpen(true); return }
    setInvitingPortal(true)
    setInviteDialogOpen(false)
    try {
      const res = await fetch(`/api/projects/${project.id}/invite-portal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (res.ok) {
        setPortalInvited(true)
        toast.success(`Invitation envoyée à ${email}`)
      } else {
        const json = await res.json() as { error?: string }
        toast.error(json.error ?? 'Erreur lors de l\'envoi')
      }
    } catch { toast.error('Erreur réseau') } finally { setInvitingPortal(false) }
  }

  async function handleClose() {
    setClosing(true)
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' }),
      })
      if (!res.ok) {
        const json = await res.json() as { error?: string }
        toast.error(json.error ?? 'Erreur lors de la clôture')
      } else {
        toast.success('Projet clôturé avec succès')
        router.refresh()
      }
    } catch { toast.error('Erreur réseau') } finally { setClosing(false) }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      const res = await fetch(`/api/projects/${project.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const json = await res.json() as { error?: string }
        toast.error(json.error ?? 'Erreur lors de la suppression')
        setDeleting(false)
      } else {
        toast.success('Projet supprimé')
        router.push('/dashboard/projects')
      }
    } catch { toast.error('Erreur réseau'); setDeleting(false) }
  }

  async function handleReset() {
    setResetting(true)
    try {
      const res = await fetch(`/api/projects/${project.id}/responses`, { method: 'DELETE' })
      if (!res.ok) {
        const json = await res.json() as { error?: string }
        toast.error(json.error ?? 'Erreur lors de la réinitialisation')
      } else {
        toast.success('Questionnaire réinitialisé')
        setResetDialogOpen(false)
        router.refresh()
      }
    } catch { toast.error('Erreur réseau') } finally { setResetting(false) }
  }

  return (
    <div className="flex flex-col gap-6 pb-8">

      {/* ── Breadcrumb ── */}
      <button
        onClick={() => router.push('/dashboard/projects')}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour aux projets
      </button>

      {/* ── Hero ── */}
      <div className="rounded-2xl border bg-white overflow-hidden shadow-sm">
        {/* Top color stripe */}
        <div className="h-2 w-full" style={{ backgroundColor: accentColor }} />

        <div className="px-6 py-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            {/* Left: avatar + info */}
            <div className="flex items-start gap-4">
              <div
                className="h-14 w-14 rounded-xl flex items-center justify-center text-white text-xl font-bold shrink-0 shadow-sm"
                style={{ backgroundColor: accentColor }}
              >
                {initials}
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap mb-1">
                  <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
                  <span className={cn(
                    'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
                    statusInfo.bg, statusInfo.text, statusInfo.border,
                  )}>
                    <span className={cn('h-1.5 w-1.5 rounded-full', statusInfo.dot)} />
                    {statusInfo.label}
                  </span>
                </div>
                {project.description && (
                  <p className="text-sm text-muted-foreground mb-2 max-w-xl">{project.description}</p>
                )}
                <div className="flex items-center gap-4 flex-wrap text-sm text-muted-foreground">
                  {project.clients && (
                    <Link
                      href={`/dashboard/clients/${project.clients.id}`}
                      className="flex items-center gap-1.5 hover:text-primary transition-colors"
                    >
                      <Users className="h-3.5 w-3.5" />
                      <span className="font-medium text-foreground">{project.clients.name}</span>
                      {project.clients.company && (
                        <span>· {project.clients.company}</span>
                      )}
                    </Link>
                  )}
                  <span className="flex items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5" />
                    Créé le {format(new Date(project.created_at), 'd MMM yyyy', { locale: fr })}
                  </span>
                </div>
              </div>
            </div>

            {/* Right: actions */}
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              {portalInvited ? (
                <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 border border-emerald-200 bg-emerald-50 rounded-lg px-3 py-1.5 font-medium">
                  <CheckCircle className="h-3.5 w-3.5" />
                  Invitation envoyée
                </span>
              ) : (
                <Button variant="outline" size="sm" className="gap-1.5" disabled={invitingPortal} onClick={() => handleInvitePortal()}>
                  <Share2 className="h-3.5 w-3.5" />
                  {invitingPortal ? 'Envoi...' : 'Inviter au portail'}
                </Button>
              )}
              <a
                href={portalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-medium rounded-lg px-3 py-1.5 border transition-colors hover:bg-accent"
              >
                Portail client
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
              <DropdownMenu>
                <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-lg border h-9 w-9 hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
                  <MoreHorizontal className="h-4 w-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={openLinkClientDialog}>
                    <Users className="mr-2 h-4 w-4" />
                    {project.clients ? 'Changer de client' : 'Lier à un client'}
                  </DropdownMenuItem>
                  {project.clients && (
                    <DropdownMenuItem onClick={handleUnlinkClient}>
                      <Users className="mr-2 h-4 w-4 text-muted-foreground" />
                      Délier le client
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-emerald-600 focus:text-emerald-600"
                    onClick={handleClose}
                    disabled={closing || project.status === 'completed'}
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Clôturer le projet
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-amber-600 focus:text-amber-600"
                    onClick={() => setResetDialogOpen(true)}
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Réinitialiser l&apos;onboarding
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => setDeleteDialogOpen(true)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Supprimer le projet
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-6 pt-5 border-t">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <ListChecks className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-semibold">Progression du projet</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  {milestoneStats.completed} terminée{milestoneStats.completed !== 1 ? 's' : ''}
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
                  {milestoneStats.total - milestoneStats.completed} restante{milestoneStats.total - milestoneStats.completed !== 1 ? 's' : ''}
                </span>
                <Link
                  href={`/dashboard/projects/${project.id}/milestones`}
                  className="text-primary hover:underline flex items-center gap-0.5 ml-2 font-medium"
                >
                  Voir la timeline <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${progressPct}%`,
                    backgroundColor: progressPct === 100 ? '#22c55e' : accentColor,
                  }}
                />
              </div>
              <span className="text-sm font-bold tabular-nums w-10 text-right" style={{ color: progressPct === 100 ? '#16a34a' : accentColor }}>
                {progressPct}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Module cards grid ── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <ModuleCard
          href={`/dashboard/projects/${project.id}/onboarding`}
          icon={<ClipboardList className="h-5 w-5" />}
          iconBg="bg-violet-100 text-violet-600"
          title="Onboarding"
          subtitle="Questionnaire client"
          metric={responseCount}
          metricLabel={responseCount === 1 ? 'réponse' : 'réponses'}
          status={
            responseCount > 0
              ? { label: 'Reçu', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' }
              : { label: 'En attente', color: 'text-amber-600 bg-amber-50 border-amber-200' }
          }
        />
        <ModuleCard
          href={`/dashboard/projects/${project.id}/milestones`}
          icon={<Flag className="h-5 w-5" />}
          iconBg="bg-blue-100 text-blue-600"
          title="Timeline"
          subtitle="Étapes du projet"
          metric={milestoneStats.total}
          metricLabel={milestoneStats.total === 1 ? 'étape' : 'étapes'}
          status={
            milestoneStats.total === 0
              ? { label: 'Aucune étape', color: 'text-muted-foreground bg-muted border-border' }
              : milestoneStats.completed === milestoneStats.total
              ? { label: 'Tout terminé', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' }
              : { label: `${milestoneStats.completed}/${milestoneStats.total} faites`, color: 'text-blue-600 bg-blue-50 border-blue-200' }
          }
        />
        <ModuleCard
          href={`/dashboard/projects/${project.id}/deliverables`}
          icon={<PackageOpen className="h-5 w-5" />}
          iconBg="bg-orange-100 text-orange-600"
          title="Livrables"
          subtitle="Validation & retours"
          metric={deliverableStats.total}
          metricLabel={deliverableStats.total === 1 ? 'livrable' : 'livrables'}
          status={
            deliverableStats.total === 0
              ? { label: 'Aucun livrable', color: 'text-muted-foreground bg-muted border-border' }
              : deliverableStats.pending > 0
              ? { label: `${deliverableStats.pending} en attente`, color: 'text-amber-600 bg-amber-50 border-amber-200' }
              : { label: 'Tout validé', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' }
          }
        />
        <ModuleCard
          href={`/dashboard/projects/${project.id}/documents`}
          icon={<FolderOpen className="h-5 w-5" />}
          iconBg="bg-teal-100 text-teal-600"
          title="Documents"
          subtitle="Fichiers & ressources"
          metric={documentCount}
          metricLabel={documentCount === 1 ? 'fichier' : 'fichiers'}
          status={
            documentCount > 0
              ? { label: 'Disponibles', color: 'text-teal-600 bg-teal-50 border-teal-200' }
              : { label: 'Vide', color: 'text-muted-foreground bg-muted border-border' }
          }
        />
        <ModuleCard
          href={`/dashboard/projects/${project.id}/feedback`}
          icon={<MessageSquare className="h-5 w-5" />}
          iconBg="bg-pink-100 text-pink-600"
          title="Retours"
          subtitle="Feedbacks & questions"
          metric={feedbackCount}
          metricLabel={feedbackCount === 1 ? 'retour' : 'retours'}
          status={
            feedbackCount > 0
              ? { label: 'À traiter', color: 'text-pink-600 bg-pink-50 border-pink-200' }
              : { label: 'Aucun retour', color: 'text-muted-foreground bg-muted border-border' }
          }
        />
        <ModuleCard
          href={`/dashboard/projects/${project.id}/vault`}
          icon={<ShieldCheck className="h-5 w-5" />}
          iconBg="bg-slate-100 text-slate-600"
          title="Coffre-fort"
          subtitle="Accès & identifiants"
          metric={vaultCount}
          metricLabel={vaultCount === 1 ? 'accès' : 'accès'}
          status={
            vaultCount > 0
              ? { label: 'Sécurisé', color: 'text-slate-600 bg-slate-50 border-slate-200' }
              : { label: 'Vide', color: 'text-muted-foreground bg-muted border-border' }
          }
        />
      </div>

      {/* ── Prochaines échéances ── */}
      {upcomingMilestones.length > 0 && (
        <div className="rounded-2xl border bg-white overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Prochaines échéances</h2>
            </div>
            <Link
              href={`/dashboard/projects/${project.id}/milestones`}
              className="text-xs text-primary hover:underline flex items-center gap-0.5 font-medium"
            >
              Tout voir <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="divide-y">
            {upcomingMilestones.map(m => {
              const dueDate = new Date(m.due_date)
              const overdue = isPast(dueDate)
              const daysLeft = differenceInDays(dueDate, new Date())
              return (
                <Link
                  key={m.id}
                  href={`/dashboard/projects/${project.id}/milestones`}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/40 transition-colors"
                >
                  <div className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-lg shrink-0',
                    overdue ? 'bg-red-50 text-red-500' : daysLeft <= 3 ? 'bg-amber-50 text-amber-600' : 'bg-muted text-muted-foreground',
                  )}>
                    {overdue ? <AlertTriangle className="h-4 w-4" /> : <Flag className="h-4 w-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{m.title}</p>
                    <p className={cn(
                      'text-xs mt-0.5',
                      overdue ? 'text-red-500 font-medium' : daysLeft <= 3 ? 'text-amber-600' : 'text-muted-foreground',
                    )}>
                      {overdue
                        ? `En retard de ${Math.abs(daysLeft)} jour${Math.abs(daysLeft) > 1 ? 's' : ''}`
                        : daysLeft === 0
                        ? 'Aujourd\'hui'
                        : daysLeft === 1
                        ? 'Demain'
                        : `Dans ${daysLeft} jours`
                      }
                      {' · '}
                      {format(dueDate, 'd MMM yyyy', { locale: fr })}
                    </p>
                  </div>
                  {m.priority === 'urgent' && (
                    <span className="text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-full px-2 py-0.5 shrink-0">
                      Urgent
                    </span>
                  )}
                  {m.priority === 'high' && (
                    <span className="text-xs font-medium text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5 shrink-0">
                      Haute
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Accès rapide ── */}
      <div className="rounded-2xl border bg-white overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Accès rapide</h2>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0">
          {[
            { label: 'Partager le formulaire', href: `/dashboard/projects/${project.id}/share`, icon: <Share2 className="h-4 w-4" /> },
            { label: 'Calendrier', href: `/dashboard/projects/${project.id}/calendar`, icon: <CalendarDays className="h-4 w-4" /> },
            { label: 'Portail client', href: portalUrl, icon: <ExternalLink className="h-4 w-4" />, external: true },
            { label: 'Accès techniques', href: `/dashboard/projects/${project.id}/onboarding?tab=access`, icon: <Inbox className="h-4 w-4" /> },
          ].map(item => (
            item.external ? (
              <a
                key={item.label}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-2 px-4 py-5 hover:bg-muted/40 transition-colors text-center group"
              >
                <span className="text-muted-foreground group-hover:text-primary transition-colors">{item.icon}</span>
                <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors leading-tight">{item.label}</span>
              </a>
            ) : (
              <Link
                key={item.label}
                href={item.href}
                className="flex flex-col items-center gap-2 px-4 py-5 hover:bg-muted/40 transition-colors text-center group"
              >
                <span className="text-muted-foreground group-hover:text-primary transition-colors">{item.icon}</span>
                <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors leading-tight">{item.label}</span>
              </Link>
            )
          ))}
        </div>
      </div>

      {/* ── Dialog lier un client ── */}
      <Dialog open={linkClientOpen} onOpenChange={setLinkClientOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{project.clients ? 'Changer de client' : 'Lier à un client'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <Input
              placeholder="Rechercher un client..."
              value={clientSearch}
              onChange={e => setClientSearch(e.target.value)}
              autoFocus
            />
            <div className="max-h-64 overflow-y-auto divide-y rounded-lg border">
              {clientsList
                .filter(c =>
                  c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
                  (c.company ?? '').toLowerCase().includes(clientSearch.toLowerCase()) ||
                  (c.email ?? '').toLowerCase().includes(clientSearch.toLowerCase())
                )
                .map(c => (
                  <button
                    key={c.id}
                    disabled={linkingClient}
                    onClick={() => handleLinkClient(c.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent text-left transition-colors"
                  >
                    <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                      {c.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{c.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{c.company ?? c.email ?? ''}</p>
                    </div>
                    {project.clients?.id === c.id && (
                      <span className="text-xs text-emerald-600 font-medium shrink-0">Actuel</span>
                    )}
                  </button>
                ))}
              {clientsList.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">Chargement...</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Dialog invitation manuelle ── */}
      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Inviter un client au portail</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="invite-email">Adresse email du client</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="client@exemple.com"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && inviteEmail) handleInvitePortal(inviteEmail) }}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>Annuler</Button>
            <Button disabled={!inviteEmail || invitingPortal} onClick={() => handleInvitePortal(inviteEmail)}>
              <Share2 className="h-4 w-4 mr-2" />
              Envoyer l&apos;invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialogs ── */}
      <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Réinitialiser le questionnaire ?</AlertDialogTitle>
            <AlertDialogDescription>
              Toutes les réponses du client seront supprimées. Le formulaire pourra être rempli à nouveau. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resetting}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleReset} disabled={resetting}>
              {resetting ? 'Réinitialisation...' : 'Réinitialiser'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le projet ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le projet{' '}
              <span className="font-semibold">{project.name}</span> et toutes ses données
              (tâches, documents, réponses) seront définitivement supprimés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Suppression...' : 'Supprimer définitivement'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

/* ─── ModuleCard ─── */

function ModuleCard({
  href,
  icon,
  iconBg,
  title,
  subtitle,
  metric,
  metricLabel,
  status,
}: {
  href: string
  icon: React.ReactNode
  iconBg: string
  title: string
  subtitle: string
  metric: number
  metricLabel: string
  status: { label: string; color: string }
}) {
  return (
    <Link href={href}>
      <div className="group bg-white rounded-2xl border hover:border-primary/30 hover:shadow-md transition-all h-full overflow-hidden">
        <div className="p-5 flex flex-col gap-4 h-full">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', iconBg)}>
              {icon}
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all mt-1" />
          </div>

          {/* Metric */}
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-bold tabular-nums">{metric}</span>
              <span className="text-sm text-muted-foreground">{metricLabel}</span>
            </div>
            <p className="text-sm font-semibold text-foreground mt-0.5">{title}</p>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>

          {/* Status chip */}
          <div className="mt-auto">
            <span className={cn('inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium', status.color)}>
              {status.label}
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}
