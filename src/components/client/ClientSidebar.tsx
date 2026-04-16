'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { APP_CONFIG } from '@/config/app.config'
import {
  FolderOpen, Settings, LogOut, LayoutDashboard, ListChecks,
  PackageOpen, MessageSquare, ChevronLeft, FileText, CalendarDays,
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
            {/* Back to projects */}
            <Link
              href="/client"
              className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors mb-2"
            >
              <ChevronLeft className="h-4 w-4 shrink-0" />
              Mes projets
            </Link>

            {/* Project nav header */}
            <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
              Mon projet
            </p>

            {/* Project sections */}
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
          href="/client/settings"
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
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
