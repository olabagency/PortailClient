'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
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
  ArrowLeft,
  ExternalLink,
  ClipboardList,
  FolderOpen,
  PackageOpen,
  MessageSquare,
  RotateCcw,
  CheckCircle,
  Trash2,
} from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

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

interface ProjectOverviewProps {
  project: Project
  portalUrl: string
  milestoneStats: { total: number; completed: number }
  responseCount: number
  documentCount: number
  deliverableStats: { total: number; validated: number; pending: number }
  feedbackCount: number
}

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  active: { label: 'Actif', variant: 'default' },
  paused: { label: 'En pause', variant: 'secondary' },
  completed: { label: 'Terminé', variant: 'outline' },
  archived: { label: 'Archivé', variant: 'destructive' },
}

export function ProjectOverview({
  project,
  portalUrl,
  milestoneStats,
  responseCount,
  documentCount,
  deliverableStats,
  feedbackCount,
}: ProjectOverviewProps) {
  const router = useRouter()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [resetDialogOpen, setResetDialogOpen] = useState(false)
  const [closing, setClosing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [resetting, setResetting] = useState(false)

  const statusInfo = statusConfig[project.status] ?? { label: project.status, variant: 'secondary' as const }
  const progressPct =
    milestoneStats.total > 0
      ? Math.round((milestoneStats.completed / milestoneStats.total) * 100)
      : 0
  const pendingMilestones = milestoneStats.total - milestoneStats.completed

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
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setClosing(false)
    }
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
    } catch {
      toast.error('Erreur réseau')
      setDeleting(false)
    }
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
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setResetting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Bouton retour */}
      <div>
        <button
          onClick={() => router.push('/dashboard/projects')}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour au dashboard
        </button>
      </div>

      {/* Layout deux colonnes */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Colonne principale */}
        <div className="flex-1 flex flex-col gap-6 min-w-0">

          {/* Card en-tête projet */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3 flex-wrap">
                  {project.color && (
                    <div
                      className="h-4 w-4 rounded-full shrink-0"
                      style={{ backgroundColor: project.color }}
                    />
                  )}
                  <h1 className="text-2xl font-bold">{project.name}</h1>
                  <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                </div>
                <a
                  href={portalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline shrink-0"
                >
                  Voir côté client
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>

              {project.description && (
                <p className="mt-2 text-sm text-muted-foreground">{project.description}</p>
              )}

              {/* Grille d'infos */}
              <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3">
                <InfoItem label="Client" value={project.clients?.name ?? '—'} />
                <InfoItem label="Email" value={project.clients?.email ?? '—'} />
                <InfoItem label="Entreprise" value={project.clients?.company ?? '—'} />
                <InfoItem
                  label="Site web"
                  value={project.clients?.website ?? '—'}
                />
                <InfoItem
                  label="Date de création"
                  value={format(new Date(project.created_at), 'd MMM yyyy', { locale: fr })}
                />
                <InfoItem
                  label="Statut onboarding"
                  value={responseCount > 0 ? 'Complété' : 'En attente'}
                  valueClassName={responseCount > 0 ? 'text-green-600' : 'text-amber-600'}
                />
              </div>
            </CardContent>
          </Card>

          {/* Card progression */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Progression du projet</CardTitle>
                <Link
                  href={`/dashboard/projects/${project.id}/milestones`}
                  className="text-sm text-primary hover:underline flex items-center gap-1"
                >
                  Voir la timeline →
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm text-muted-foreground mb-1">
                <span>{progressPct}% complété</span>
                <span>{milestoneStats.completed}/{milestoneStats.total} étapes</span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-2 bg-primary rounded-full transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <div className="flex items-center gap-6 text-sm mt-2">
                <span className="flex items-center gap-1.5 text-green-600">
                  <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
                  {milestoneStats.completed} terminée{milestoneStats.completed !== 1 ? 's' : ''} ✓
                </span>
                <span className="flex items-center gap-1.5 text-amber-600">
                  <span className="inline-block h-2 w-2 rounded-full bg-amber-400" />
                  {pendingMilestones} en attente ○
                </span>
              </div>
            </CardContent>
          </Card>

          {/* 4 cartes accès rapide */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <QuickCard
              icon={<ClipboardList className="h-5 w-5 text-primary" />}
              title="Questionnaire"
              description={
                responseCount > 0
                  ? `${responseCount} réponse${responseCount > 1 ? 's' : ''}`
                  : 'En attente'
              }
              descriptionClassName={responseCount > 0 ? 'text-green-600' : 'text-amber-600'}
              href={`/dashboard/projects/${project.id}/onboarding`}
            />
            <QuickCard
              icon={<FolderOpen className="h-5 w-5 text-primary" />}
              title="Documents"
              description={
                documentCount > 0
                  ? `${documentCount} document${documentCount > 1 ? 's' : ''}`
                  : 'Aucun document'
              }
              href={`/dashboard/projects/${project.id}/documents`}
            />
            <QuickCard
              icon={<PackageOpen className="h-5 w-5 text-primary" />}
              title="Livrables"
              description={
                deliverableStats.total > 0
                  ? `${deliverableStats.validated} validé${deliverableStats.validated !== 1 ? 's' : ''} / ${deliverableStats.total}`
                  : 'Aucun livrable'
              }
              descriptionClassName={
                deliverableStats.pending > 0 ? 'text-amber-600' : undefined
              }
              href={`/dashboard/projects/${project.id}/deliverables`}
            />
            <QuickCard
              icon={<MessageSquare className="h-5 w-5 text-primary" />}
              title="Retours clients"
              description={
                feedbackCount > 0
                  ? `${feedbackCount} retour${feedbackCount > 1 ? 's' : ''}`
                  : 'Aucun retour'
              }
              href={`/dashboard/projects/${project.id}/feedback`}
            />
          </div>
        </div>

        {/* Colonne droite — Actions */}
        <div className="w-full lg:w-72 shrink-0">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 pt-0">
              <Separator className="mb-3" />

              <ActionButton
                icon={<RotateCcw className="h-4 w-4" />}
                label="Réinitialiser l'onboarding"
                className="text-amber-600 hover:bg-amber-50"
                onClick={() => setResetDialogOpen(true)}
                disabled={resetting}
              />

              <ActionButton
                icon={<CheckCircle className="h-4 w-4" />}
                label="Clôturer le projet"
                className="text-green-600 hover:bg-green-50"
                onClick={handleClose}
                disabled={closing || project.status === 'completed'}
              />

              <ActionButton
                icon={<Trash2 className="h-4 w-4" />}
                label="Supprimer le projet"
                className="text-destructive hover:bg-destructive/10"
                onClick={() => setDeleteDialogOpen(true)}
                disabled={deleting}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialog confirmation réinitialisation */}
      <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Réinitialiser le questionnaire ?</AlertDialogTitle>
            <AlertDialogDescription>
              Toutes les réponses du client seront supprimées. Le formulaire pourra être
              rempli à nouveau. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resetting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReset}
              disabled={resetting}
            >
              {resetting ? 'Réinitialisation...' : 'Réinitialiser'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog confirmation suppression */}
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

/* ─── Sous-composants ─── */

function InfoItem({
  label,
  value,
  valueClassName,
}: {
  label: string
  value: string
  valueClassName?: string
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-sm font-medium truncate ${valueClassName ?? ''}`}>{value}</span>
    </div>
  )
}

function QuickCard({
  icon,
  title,
  description,
  descriptionClassName,
  href,
}: {
  icon: React.ReactNode
  title: string
  description: string
  descriptionClassName?: string
  href: string
}) {
  return (
    <Link href={href}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
        <CardContent className="pt-5 pb-5">
          <div className="flex items-center gap-3 mb-2">
            {icon}
            <span className="font-medium text-sm">{title}</span>
          </div>
          <p className={`text-sm ${descriptionClassName ?? 'text-muted-foreground'}`}>
            {description}
          </p>
        </CardContent>
      </Card>
    </Link>
  )
}

function ActionButton({
  icon,
  label,
  className,
  onClick,
  disabled,
}: {
  icon: React.ReactNode
  label: string
  className: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {icon}
      {label}
    </button>
  )
}
