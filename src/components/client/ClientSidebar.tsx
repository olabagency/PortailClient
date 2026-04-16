'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { APP_CONFIG } from '@/config/app.config'
import {
  FolderOpen, Settings, LogOut, LayoutDashboard, ListChecks,
  PackageOpen, MessageSquare, ChevronLeft, FileText, CalendarDays, UserCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const projectSections = [
  { key: 'overview', label: 'Aperçu', icon: LayoutDashboard },
  { key: 'timeline', label: 'Timeline', icon: ListChecks },
  { key: 'deliverables', label: 'Livrables', icon: PackageOpen },
  { key: 'feedback', label: 'Retours', icon: MessageSquare },
  { key: 'documents', label: 'Documents', icon: FileText },
  { key: 'meetings', label: 'Réunions', icon: CalendarDays },
]

export default function ClientSidebar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const projectMatch = /\/client\/projects\/([^/]+)/.exec(pathname)
  const projectId = projectMatch?.[1] ?? null
  const currentSection = searchParams.get('s') ?? 'overview'

  const [projectName, setProjectName] = useState<string | null>(null)

  useEffect(() => {
    if (!projectId) { setProjectName(null); return }
    fetch(`/api/client/projects/${projectId}`)
      .then(r => r.json())
      .then((json: { data?: { project?: { name?: string } } }) => {
        setProjectName(json.data?.project?.name ?? null)
      })
      .catch(() => setProjectName(null))
  }, [projectId])

  return (
    <aside className="hidden md:flex flex-col w-56 shrink-0 border-r bg-white h-screen sticky top-0">
      {/* Logo */}
      <div className="px-4 py-5 border-b">
        <Link href="/client" className="text-lg font-bold text-foreground">
          {APP_CONFIG.name}
        </Link>
        <p className="text-xs text-muted-foreground mt-0.5">Espace client</p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {projectId ? (
          <>
            <Link
              href="/client"
              className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors mb-2"
            >
              <ChevronLeft className="h-4 w-4 shrink-0" />
              Mes projets
            </Link>

            <div className="px-3 pb-2">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-0.5">
                Projet
              </p>
              {projectName ? (
                <p className="text-xs font-semibold text-foreground truncate" title={projectName}>
                  {projectName}
                </p>
              ) : (
                <div className="h-3 w-24 bg-gray-100 rounded animate-pulse" />
              )}
            </div>

            {projectSections.map(({ key, label, icon: Icon }) => {
              const isActive = currentSection === key
              return (
                <Link
                  key={key}
                  href={`/client/projects/${projectId}?s=${key}`}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                </Link>
              )
            })}
          </>
        ) : (
          <Link
            href="/client"
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
              pathname === '/client'
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )}
          >
            <FolderOpen className="h-4 w-4 shrink-0" />
            Mes projets
          </Link>
        )}
      </nav>

      {/* Bottom actions */}
      <div className="px-3 py-3 border-t space-y-1">
        <Link
          href="/client/infos"
          className={cn(
            'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
            pathname === '/client/infos'
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
          )}
        >
          <UserCircle className="h-4 w-4 shrink-0" />
          Mes infos
        </Link>
        <Link
          href="/client/settings"
          className={cn(
            'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
            pathname === '/client/settings'
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
          )}
        >
          <Settings className="h-4 w-4 shrink-0" />
          Paramètres
        </Link>
        <form action="/api/client/logout" method="POST">
          <button
            type="submit"
            className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Déconnexion
          </button>
        </form>
      </div>
    </aside>
  )
}
