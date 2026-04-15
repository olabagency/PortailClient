'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  Settings,
  Menu,
  ClipboardList,
  FolderOpen,
  ListChecks,
  PackageOpen,
  LogOut,
  Crown,
  CalendarDays,
  CalendarCheck,
  UserCircle2,
  KeyRound,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { APP_CONFIG } from '@/config/app.config'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
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
  { href: '/dashboard/calendar', label: 'Calendrier', icon: CalendarDays, exact: false },
]

const bottomItems = [
  { href: '/dashboard/account', label: 'Paramètres', icon: Settings, exact: false },
]

function projectNavItems(projectId: string) {
  return [
    { href: `/dashboard/projects/${projectId}`, label: 'Vue d\'ensemble', icon: LayoutDashboard, exact: true },
    { href: `/dashboard/projects/${projectId}/milestones`, label: 'Timeline', icon: ListChecks, exact: false },
    { href: `/dashboard/projects/${projectId}/calendar`, label: 'Calendrier', icon: CalendarDays, exact: false },
    { href: `/dashboard/projects/${projectId}/meetings`, label: 'Réunions', icon: CalendarCheck, exact: false },
    { href: `/dashboard/projects/${projectId}/deliverables`, label: 'Livrables & Retours', icon: PackageOpen, exact: false },
    { href: `/dashboard/projects/${projectId}/onboarding`, label: 'Onboarding', icon: ClipboardList, exact: false },
    { href: `/dashboard/projects/${projectId}/documents`, label: 'Documents', icon: FolderOpen, exact: false },
    { href: `/dashboard/projects/${projectId}/vault`, label: 'Coffre-fort', icon: KeyRound, exact: false },
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
  const { user, logout } = useAuth()
  const [plan, setPlan] = useState<string>('free')

  useEffect(() => {
    if (user) {
      const supabase = createClient()
      supabase.from('profiles').select('plan').eq('id', user.id).single()
        .then(({ data }) => { if (data?.plan) setPlan(data.plan) })
    }
  }, [user])

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
      <div className="px-4 py-4 border-b">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <span className="text-primary-foreground text-xs font-bold leading-none">
              {APP_CONFIG.name.charAt(0)}
            </span>
          </div>
          <span className="text-base font-bold text-foreground tracking-tight">{APP_CONFIG.name}</span>
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
            <DropdownMenuGroup>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user?.user_metadata?.full_name ?? 'Mon compte'}</p>
                  <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold w-fit ${
                    plan === 'pro' ? 'bg-primary/10 text-primary' :
                    plan === 'agency' ? 'bg-purple-100 text-purple-700' :
                    'bg-gray-100 text-gray-500'
                  }`}>
                    {plan === 'pro' ? 'Pro' : plan === 'agency' ? 'Agence' : 'Gratuit'}
                  </span>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="p-0 cursor-pointer font-medium">
              <Link href="/dashboard/account" className="flex items-center w-full px-1.5 py-1 gap-1.5">
                <UserCircle2 className="h-4 w-4" />
                Mon compte
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem className="p-0 cursor-pointer">
              <Link href="/dashboard/settings/billing" className="flex items-center w-full px-1.5 py-1 gap-1.5">
                <Crown className="h-4 w-4" />
                Abonnement
              </Link>
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
      <aside className="hidden md:flex flex-col w-60 shrink-0 border-r bg-white h-screen sticky top-0 shadow-[1px_0_0_0_hsl(var(--border))]">
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
