'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  LayoutTemplate,
  Settings,
  Menu,
  ClipboardList,
  FolderOpen,
  ListChecks,
  Share2,
  PackageOpen,
  MessageSquare,
  LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { APP_CONFIG } from '@/config/app.config'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/hooks/useAuth'

const globalNavItems = [
  { href: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/clients', label: 'Clients', icon: Users, exact: false },
  { href: '/dashboard/projects', label: 'Projets', icon: FolderKanban, exact: false },
  { href: '/dashboard/templates', label: 'Templates', icon: LayoutTemplate, exact: false },
]

const bottomItems = [
  { href: '/dashboard/settings', label: 'Paramètres', icon: Settings, exact: false },
]

function projectNavItems(projectId: string) {
  return [
    { href: `/dashboard/projects/${projectId}`, label: 'Vue d\'ensemble', icon: LayoutDashboard, exact: true },
    { href: `/dashboard/projects/${projectId}/milestones`, label: 'Timeline', icon: ListChecks, exact: false },
    { href: `/dashboard/projects/${projectId}/deliverables`, label: 'Livrables', icon: PackageOpen, exact: false },
    { href: `/dashboard/projects/${projectId}/feedback`, label: 'Retours clients', icon: MessageSquare, exact: false },
    { href: `/dashboard/projects/${projectId}/onboarding`, label: 'Questionnaire', icon: ClipboardList, exact: false },
    { href: `/dashboard/projects/${projectId}/documents`, label: 'Documents', icon: FolderOpen, exact: false },
    { href: `/dashboard/projects/${projectId}/share`, label: 'Partage', icon: Share2, exact: false },
  ]
}

function NavLink({ href, label, icon: Icon, exact, indent = false }: {
  href: string
  label: string
  icon: React.ElementType
  exact: boolean
  indent?: boolean
}) {
  const pathname = usePathname()
  const isActive = exact ? pathname === href : pathname.startsWith(href)

  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
        indent && 'ml-2 pl-4 border-l border-border',
        isActive
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {label}
    </Link>
  )
}

function SidebarContent() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuth()

  const initials = user?.user_metadata?.full_name
    ? user.user_metadata.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() ?? '?'

  // Détecter si on est dans un projet spécifique
  const projectMatch = pathname.match(/^\/dashboard\/projects\/([^/]+)/)
  const currentProjectId = projectMatch
    ? (pathname.includes('/new') || pathname.includes('/templates') ? null : projectMatch[1])
    : null

  // Si on est dans un sous-chemin de projet qui n'est pas un projet réel
  const isProjectSection = currentProjectId && currentProjectId !== 'new'

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 py-5 border-b">
        <Link href="/dashboard" className="text-xl font-bold text-foreground">
          {APP_CONFIG.name}
        </Link>
      </div>

      {/* Navigation principale */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {globalNavItems.map((item) => (
          <NavLink key={item.href} {...item} />
        ))}

        {/* Navigation contextuelle projet */}
        {isProjectSection && (
          <div className="mt-4 pt-4 border-t space-y-1">
            <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Projet
            </p>
            {projectNavItems(currentProjectId).map((item) => (
              <NavLink key={item.href} {...item} indent />
            ))}
          </div>
        )}
      </nav>

      {/* Navigation bas */}
      <div className="px-3 py-3 border-t space-y-1">
        {/* User account */}
        <DropdownMenu>
          <DropdownMenuTrigger className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors mt-1">
            <Avatar className="h-6 w-6 shrink-0">
              <AvatarImage src={user?.user_metadata?.avatar_url} />
              <AvatarFallback className="text-[10px] bg-muted text-muted-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="flex-1 truncate text-left">
              {user?.user_metadata?.full_name ?? user?.email ?? 'Mon compte'}
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-56 mb-1">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user?.user_metadata?.full_name ?? 'Mon compte'}</p>
                <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push('/dashboard/settings')} className="cursor-pointer">
              <Settings className="mr-2 h-4 w-4" />
              Paramètres
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="cursor-pointer text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Se déconnecter
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}

export function Sidebar() {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Sidebar desktop */}
      <aside className="hidden md:flex flex-col w-60 shrink-0 border-r bg-white h-screen sticky top-0">
        <SidebarContent />
      </aside>

      {/* Bouton menu mobile */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden fixed top-3 left-3 z-50"
        onClick={() => setOpen(true)}
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Sidebar mobile — Sheet */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="p-0 w-60">
          <SidebarContent />
        </SheetContent>
      </Sheet>
    </>
  )
}
