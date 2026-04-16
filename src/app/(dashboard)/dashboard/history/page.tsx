'use client'

import { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { History, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { formatActivityLabel, getActivityIcon } from '@/lib/activity'
import type { ActivityEntry } from '@/lib/activity'

const PAGE_SIZE = 50

interface EnrichedEntry extends ActivityEntry {
  projects?: { name: string } | null
}

export default function HistoryPage() {
  const [entries, setEntries] = useState<EnrichedEntry[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')

  const fetchHistory = useCallback(async (p: number) => {
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

  useEffect(() => { void fetchHistory(page) }, [page, fetchHistory])

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
          <History className="h-5 w-5 text-muted-foreground" />
          Historique des actions
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Toutes les actions effectuées sur votre espace, sans exception.
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

      {/* Entries */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3">
              <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-64" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border bg-white py-16 text-center">
          <History className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">Aucune action enregistrée.</p>
          <p className="text-xs text-muted-foreground mt-1">
            Les actions effectuées sur l&apos;application apparaîtront ici.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([day, dayEntries]) => (
            <div key={day}>
              <div className="flex items-center gap-3 mb-3">
                <div className="h-px flex-1 bg-gray-200" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-2 capitalize">
                  {day}
                </span>
                <div className="h-px flex-1 bg-gray-200" />
              </div>

              <div className="space-y-1">
                {dayEntries.map(e => (
                  <div key={e.id} className="flex items-start gap-3 bg-white border rounded-xl px-4 py-3 hover:bg-gray-50 transition-colors">
                    <span className="text-lg shrink-0 mt-0.5">{getActivityIcon(e.action)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800">{formatActivityLabel(e)}</p>
                      {e.projects?.name && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Projet : {e.projects.name}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0 mt-0.5">
                      {format(new Date(e.created_at), 'HH:mm', { locale: fr })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {!search && totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-muted-foreground">
            Page {page + 1} / {totalPages} — {total} actions au total
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
