'use client'

import { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Activity, Search, ChevronLeft, ChevronRight } from 'lucide-react'
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
  ExternalLink,
} from 'lucide-react'
import Link from 'next/link'

const PAGE_SIZE = 50

interface EnrichedEntry extends ActivityEntry {
  projects?: { name: string; id: string } | null
}

function activityIcon(action: string) {
  const cls = 'h-3.5 w-3.5'
  switch (action) {
    case 'project_created':           return <FolderPlus className={cls} />
    case 'project_updated':           return <FolderOpen className={cls} />
    case 'project_deleted':           return <FolderX className={cls} />
    case 'milestone_created':
    case 'milestone_updated':
    case 'milestone_deleted':         return <GitBranch className={cls} />
    case 'deliverable_sent':          return <PackageOpen className={cls} />
    case 'deliverable_validated':     return <PackageCheck className={cls} />
    case 'deliverable_revised':       return <RotateCcw className={cls} />
    case 'document_uploaded':         return <FileUp className={cls} />
    case 'document_deleted':          return <FileX className={cls} />
    case 'client_created':            return <UserPlus className={cls} />
    case 'client_updated':            return <UserCog className={cls} />
    case 'feedback_treated':          return <MessageSquare className={cls} />
    case 'meeting_created':           return <CalendarPlus className={cls} />
    case 'meeting_updated':           return <CalendarCog className={cls} />
    case 'onboarding_form_responded': return <ClipboardCheck className={cls} />
    case 'template_created':          return <BookmarkPlus className={cls} />
    case 'task_created':              return <LayoutList className={cls} />
    case 'task_moved':                return <ArrowRight className={cls} />
    case 'task_completed':            return <CheckSquare className={cls} />
    case 'task_deleted':              return <Trash2 className={cls} />
    default:                          return <Activity className={cls} />
  }
}

function activityColor(action: string): string {
  if (action === 'project_created')           return 'bg-blue-100 text-blue-600'
  if (action === 'project_updated')           return 'bg-blue-50 text-blue-500'
  if (action === 'project_deleted')           return 'bg-red-100 text-red-600'
  if (action.startsWith('milestone'))         return 'bg-indigo-100 text-indigo-600'
  if (action === 'deliverable_sent')          return 'bg-amber-100 text-amber-600'
  if (action === 'deliverable_validated')     return 'bg-green-100 text-green-600'
  if (action === 'deliverable_revised')       return 'bg-orange-100 text-orange-600'
  if (action === 'document_uploaded')         return 'bg-slate-100 text-slate-600'
  if (action === 'document_deleted')          return 'bg-red-100 text-red-500'
  if (action.startsWith('client'))            return 'bg-teal-100 text-teal-600'
  if (action === 'feedback_treated')          return 'bg-cyan-100 text-cyan-600'
  if (action.startsWith('meeting'))           return 'bg-violet-100 text-violet-600'
  if (action === 'onboarding_form_responded') return 'bg-emerald-100 text-emerald-600'
  if (action === 'template_created')          return 'bg-sky-100 text-sky-700'
  if (action === 'task_completed')            return 'bg-green-100 text-green-600'
  if (action === 'task_deleted')              return 'bg-red-100 text-red-600'
  if (action.startsWith('task'))              return 'bg-violet-100 text-violet-600'
  return 'bg-muted text-muted-foreground'
}

export default function ActivityPage() {
  const [entries, setEntries] = useState<EnrichedEntry[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')

  const fetchActivity = useCallback(async (p: number) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/dashboard/history?limit=${PAGE_SIZE}&offset=${p * PAGE_SIZE}`)
      if (res.ok) {
        const json = await res.json() as { data: EnrichedEntry[]; total: number }
        setEntries(json.data ?? [])
        setTotal(json.total ?? 0)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void fetchActivity(page) }, [page, fetchActivity])

  const filtered = search.trim()
    ? entries.filter(e =>
        formatActivityLabel(e).toLowerCase().includes(search.toLowerCase()) ||
        (e.projects?.name ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : entries

  const totalPages = Math.ceil(total / PAGE_SIZE)

  // Group by date
  const grouped: Record<string, EnrichedEntry[]> = {}
  for (const e of filtered) {
    const day = format(new Date(e.created_at), 'EEEE d MMMM yyyy', { locale: fr })
    if (!grouped[day]) grouped[day] = []
    grouped[day].push(e)
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Activity className="h-5 w-5 text-muted-foreground" />
          Journal d&apos;activité
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Toutes les actions effectuées sur votre espace.
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher une action, un projet…"
          className="pl-9"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-36" />
              {[1, 2, 3].map(j => (
                <div key={j} className="flex items-start gap-3">
                  <Skeleton className="h-7 w-7 rounded-full shrink-0" />
                  <div className="flex-1 space-y-1.5 pt-0.5">
                    <Skeleton className="h-3.5 w-3/4" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center rounded-xl border border-dashed">
          <Activity className="h-10 w-10 text-muted-foreground/30 mb-3" />
          <p className="font-medium text-sm">Aucune activité trouvée</p>
          {search && (
            <button onClick={() => setSearch('')} className="mt-2 text-xs text-primary hover:underline">
              Effacer la recherche
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([day, items]) => (
            <div key={day}>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 capitalize">
                {day}
              </p>
              <div className="rounded-xl border bg-card divide-y divide-border/50">
                {items.map(entry => (
                  <div key={entry.id} className="flex items-start gap-3 px-4 py-3">
                    <div className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${activityColor(entry.action)}`}>
                      {activityIcon(entry.action)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm leading-snug">{formatActivityLabel(entry)}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(entry.created_at), 'HH:mm', { locale: fr })}
                        </span>
                        {entry.projects && (
                          <>
                            <span className="text-muted-foreground/40 text-xs">·</span>
                            <Link
                              href={`/dashboard/projects/${entry.projects.id}`}
                              className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-0.5 truncate max-w-[180px]"
                            >
                              {entry.projects.name}
                              <ExternalLink className="h-2.5 w-2.5 ml-0.5 shrink-0" />
                            </Link>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-muted-foreground">
            Page {page + 1} sur {totalPages} · {total} entrées
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => p - 1)}
              disabled={page === 0 || loading}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => p + 1)}
              disabled={page >= totalPages - 1 || loading}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
