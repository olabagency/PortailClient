'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search, FolderKanban, ListChecks, CalendarCheck, Users, Loader2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SearchResult, SearchResponse } from '@/app/api/search/route'

const SECTION_CONFIG: {
  key: keyof SearchResponse
  label: string
  Icon: React.ElementType
}[] = [
  { key: 'projects', label: 'Projets', Icon: FolderKanban },
  { key: 'milestones', label: 'Timeline', Icon: ListChecks },
  { key: 'meetings', label: 'Réunions', Icon: CalendarCheck },
  { key: 'clients', label: 'Clients', Icon: Users },
]

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

export default function GlobalSearch() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const debouncedQuery = useDebounce(query, 280)

  // Fetch results
  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setResults(null)
      setActiveIndex(-1)
      return
    }
    setLoading(true)
    fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`)
      .then((r) => r.json())
      .then((data: SearchResponse) => {
        setResults(data)
        setActiveIndex(-1)
        setOpen(true)
      })
      .finally(() => setLoading(false))
  }, [debouncedQuery])

  // Flatten all results in display order for keyboard nav
  const flatResults: SearchResult[] = results
    ? SECTION_CONFIG.flatMap(({ key }) => results[key])
    : []

  const totalResults = flatResults.length

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const navigate = useCallback(
    (item: SearchResult) => {
      router.push(item.href)
      setQuery('')
      setResults(null)
      setOpen(false)
      inputRef.current?.blur()
    },
    [router]
  )

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || totalResults === 0) {
      if (e.key === 'Escape') {
        setQuery('')
        setOpen(false)
        inputRef.current?.blur()
      }
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => (i + 1) % totalResults)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => (i - 1 + totalResults) % totalResults)
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault()
      navigate(flatResults[activeIndex])
    } else if (e.key === 'Escape') {
      setOpen(false)
      inputRef.current?.blur()
    }
  }

  const showDropdown = open && query.length >= 2

  // Compute flat index offset per section for keyboard tracking
  let flatOffset = 0

  return (
    <div ref={containerRef} className="relative w-full max-w-sm">
      {/* Input */}
      <div className="relative flex items-center">
        {loading ? (
          <Loader2 className="absolute left-3 h-4 w-4 text-muted-foreground animate-spin pointer-events-none" />
        ) : (
          <Search className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" />
        )}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            if (e.target.value.length >= 2) setOpen(true)
            else setOpen(false)
          }}
          onFocus={() => { if (query.length >= 2 && results) setOpen(true) }}
          onKeyDown={handleKeyDown}
          placeholder="Rechercher…"
          className={cn(
            'w-full h-8 pl-9 pr-8 text-sm rounded-md border border-input bg-background',
            'placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring',
            'transition-all'
          )}
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setResults(null); setOpen(false); inputRef.current?.focus() }}
            className="absolute right-2 p-0.5 text-muted-foreground hover:text-foreground"
            tabIndex={-1}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute top-full mt-1.5 left-0 w-[380px] bg-white rounded-lg border shadow-lg z-50 overflow-hidden">
          {totalResults === 0 && !loading ? (
            <p className="px-4 py-5 text-sm text-muted-foreground text-center">
              Aucun résultat pour &ldquo;{query}&rdquo;
            </p>
          ) : (
            <div className="max-h-[420px] overflow-y-auto py-1">
              {SECTION_CONFIG.map(({ key, label, Icon }) => {
                const items = results?.[key] ?? []
                if (items.length === 0) {
                  flatOffset // don't advance, no items
                  return null
                }
                const sectionOffset = flatOffset
                flatOffset += items.length
                return (
                  <div key={key}>
                    {/* Section header */}
                    <div className="flex items-center gap-1.5 px-3 pt-3 pb-1">
                      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {label}
                      </span>
                    </div>
                    {items.map((item, i) => {
                      const globalIdx = sectionOffset + i
                      const isActive = activeIndex === globalIdx
                      return (
                        <button
                          key={item.id}
                          onMouseEnter={() => setActiveIndex(globalIdx)}
                          onMouseLeave={() => setActiveIndex(-1)}
                          onClick={() => navigate(item)}
                          className={cn(
                            'w-full flex items-start gap-3 px-3 py-2 text-left transition-colors',
                            isActive ? 'bg-accent' : 'hover:bg-accent/50'
                          )}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-foreground truncate">{item.label}</p>
                            {item.sub && (
                              <p className="text-xs text-muted-foreground truncate mt-0.5">{item.sub}</p>
                            )}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
