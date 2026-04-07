'use client'

import { useState, useEffect } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { formatActivityLabel, ActivityEntry } from '@/lib/activity'
import {
  FolderPlus,
  CheckSquare,
  ArrowRight,
  Trash2,
  LayoutList,
  UserPlus,
  BookmarkPlus,
  Activity,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'

function activityIcon(action: string) {
  switch (action) {
    case 'project_created':   return <FolderPlus className="h-3.5 w-3.5" />
    case 'task_created':      return <LayoutList className="h-3.5 w-3.5" />
    case 'task_moved':        return <ArrowRight className="h-3.5 w-3.5" />
    case 'task_completed':    return <CheckSquare className="h-3.5 w-3.5" />
    case 'task_deleted':      return <Trash2 className="h-3.5 w-3.5" />
    case 'column_created':    return <LayoutList className="h-3.5 w-3.5" />
    case 'client_created':    return <UserPlus className="h-3.5 w-3.5" />
    case 'template_created':  return <BookmarkPlus className="h-3.5 w-3.5" />
    default:                  return <Activity className="h-3.5 w-3.5" />
  }
}

function activityColor(action: string): string {
  switch (action) {
    case 'project_created':   return 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
    case 'task_created':      return 'bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400'
    case 'task_moved':        return 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
    case 'task_completed':    return 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
    case 'task_deleted':      return 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
    case 'column_created':    return 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400'
    case 'client_created':    return 'bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400'
    case 'template_created':  return 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'
    default:                  return 'bg-muted text-muted-foreground'
  }
}

interface ActivityFeedProps {
  /** URL de l'API à appeler (ex: /api/activity ou /api/projects/[id]/activity) */
  apiUrl: string
  /** Nombre max d'entrées affichées */
  limit?: number
  /** Afficher le nom du projet sur chaque entrée */
  showProject?: boolean
  /** Classes CSS supplémentaires */
  className?: string
}

export function ActivityFeed({ apiUrl, limit, showProject = false, className }: ActivityFeedProps) {
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
          Les actions (tâches, colonnes, clients…) apparaîtront ici.
        </p>
      </div>
    )
  }

  return (
    <div className={`space-y-1 ${className ?? ''}`}>
      {entries.map((entry) => {
        const project = (entry as ActivityEntry & { projects?: { id: string; name: string } | null }).projects
        return (
          <div key={entry.id} className="flex items-start gap-3 py-2.5 border-b border-border/50 last:border-0">
            <div className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${activityColor(entry.action)}`}>
              {activityIcon(entry.action)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm leading-snug">{formatActivityLabel(entry)}</p>
              <div className="flex items-center gap-2 mt-0.5">
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
    </div>
  )
}
