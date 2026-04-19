'use client'

import { useState, useEffect } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { formatActivityLabel, ActivityEntry } from '@/lib/activity'
import {
  FolderPlus, FolderOpen, FolderX,
  CheckSquare, ArrowRight, Trash2, LayoutList,
  UserPlus, UserCog,
  BookmarkPlus,
  GitBranch,
  PackageCheck, PackageOpen, RotateCcw,
  FileUp, FileX,
  CalendarPlus, CalendarCog,
  MessageSquare,
  ClipboardCheck,
  Activity,
  ExternalLink,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import Link from 'next/link'

function activityIcon(action: string) {
  switch (action) {
    case 'project_created':             return <FolderPlus className="h-3.5 w-3.5" />
    case 'project_updated':             return <FolderOpen className="h-3.5 w-3.5" />
    case 'project_deleted':             return <FolderX className="h-3.5 w-3.5" />
    case 'milestone_created':
    case 'milestone_updated':
    case 'milestone_deleted':           return <GitBranch className="h-3.5 w-3.5" />
    case 'deliverable_sent':            return <PackageOpen className="h-3.5 w-3.5" />
    case 'deliverable_validated':       return <PackageCheck className="h-3.5 w-3.5" />
    case 'deliverable_revised':         return <RotateCcw className="h-3.5 w-3.5" />
    case 'document_uploaded':           return <FileUp className="h-3.5 w-3.5" />
    case 'document_deleted':            return <FileX className="h-3.5 w-3.5" />
    case 'client_created':              return <UserPlus className="h-3.5 w-3.5" />
    case 'client_updated':              return <UserCog className="h-3.5 w-3.5" />
    case 'feedback_treated':            return <MessageSquare className="h-3.5 w-3.5" />
    case 'meeting_created':             return <CalendarPlus className="h-3.5 w-3.5" />
    case 'meeting_updated':             return <CalendarCog className="h-3.5 w-3.5" />
    case 'onboarding_form_responded':   return <ClipboardCheck className="h-3.5 w-3.5" />
    case 'template_created':            return <BookmarkPlus className="h-3.5 w-3.5" />
    case 'task_created':                return <LayoutList className="h-3.5 w-3.5" />
    case 'task_moved':                  return <ArrowRight className="h-3.5 w-3.5" />
    case 'task_completed':              return <CheckSquare className="h-3.5 w-3.5" />
    case 'task_deleted':                return <Trash2 className="h-3.5 w-3.5" />
    case 'column_created':              return <LayoutList className="h-3.5 w-3.5" />
    default:                            return <Activity className="h-3.5 w-3.5" />
  }
}

function activityColor(action: string): string {
  if (action === 'project_created')            return 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
  if (action === 'project_updated')            return 'bg-blue-50 text-blue-500 dark:bg-blue-900/20 dark:text-blue-400'
  if (action === 'project_deleted')            return 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
  if (action.startsWith('milestone'))          return 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400'
  if (action === 'deliverable_sent')           return 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
  if (action === 'deliverable_validated')      return 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
  if (action === 'deliverable_revised')        return 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'
  if (action === 'document_uploaded')          return 'bg-slate-100 text-slate-600 dark:bg-slate-900/30 dark:text-slate-400'
  if (action === 'document_deleted')           return 'bg-red-100 text-red-500 dark:bg-red-900/20 dark:text-red-400'
  if (action.startsWith('client'))             return 'bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400'
  if (action === 'feedback_treated')           return 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400'
  if (action.startsWith('meeting'))            return 'bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400'
  if (action === 'onboarding_form_responded')  return 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
  if (action === 'template_created')           return 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400'
  if (action === 'task_completed')             return 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
  if (action === 'task_deleted')               return 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
  if (action.startsWith('task'))               return 'bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400'
  if (action === 'column_created')             return 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400'
  return 'bg-muted text-muted-foreground'
}

interface ActivityFeedProps {
  /** URL de l'API à appeler (ex: /api/activity ou /api/projects/[id]/activity) */
  apiUrl: string
  /** Nombre max d'entrées affichées */
  limit?: number
  /** Afficher le nom du projet sur chaque entrée */
  showProject?: boolean
  /** Lien "Voir tout" affiché en bas */
  viewAllHref?: string
  /** Classes CSS supplémentaires */
  className?: string
}

export function ActivityFeed({ apiUrl, limit, showProject = false, viewAllHref, className }: ActivityFeedProps) {
  const [entries, setEntries] = useState<ActivityEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(apiUrl)
      .then(r => r.json())
      .then(({ data }) => {
        const items: ActivityEntry[] = data ?? []
        setEntries(limit ? items.slice(0, limit) : items)
      })
      .finally(() => setLoading(false))
  }, [apiUrl, limit])

  if (loading) {
    return (
      <div className={`space-y-3 ${className ?? ''}`}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="flex items-start gap-3">
            <Skeleton className="h-7 w-7 rounded-full shrink-0" />
            <div className="flex-1 space-y-1.5 pt-0.5">
              <Skeleton className="h-3.5 w-3/4" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (entries.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center py-10 gap-2 text-center ${className ?? ''}`}>
        <Activity className="h-8 w-8 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">Aucune activité pour l&apos;instant</p>
        <p className="text-xs text-muted-foreground/70">
          Les actions (étapes, réunions, documents…) apparaîtront ici.
        </p>
      </div>
    )
  }

  return (
    <div className={`space-y-0 ${className ?? ''}`}>
      {entries.map((entry) => {
        const project = (entry as ActivityEntry & { projects?: { id: string; name: string } | null }).projects
        return (
          <div key={entry.id} className="flex items-start gap-3 py-2.5 border-b border-border/50 last:border-0">
            <div className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${activityColor(entry.action)}`}>
              {activityIcon(entry.action)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm leading-snug">{formatActivityLabel(entry)}</p>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true, locale: fr })}
                </span>
                {showProject && project && (
                  <>
                    <span className="text-muted-foreground/40 text-xs">·</span>
                    <span className="text-xs text-muted-foreground truncate max-w-[140px]">{project.name}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        )
      })}

      {viewAllHref && (
        <div className="pt-2 pb-1">
          <Link
            href={viewAllHref}
            className="flex items-center gap-1.5 text-xs text-primary hover:underline font-medium"
          >
            <ExternalLink className="h-3 w-3" />
            Voir tous les logs d&apos;activité
          </Link>
        </div>
      )}
    </div>
  )
}
