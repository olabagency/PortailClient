import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { APP_CONFIG } from '@/config/app.config'
import { FolderOpen, Settings, LogOut } from 'lucide-react'

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/client/login')
  }

  const fullName = user.user_metadata?.full_name as string | undefined
  const initials = fullName
    ? fullName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : user.email?.[0]?.toUpperCase() ?? '?'

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-56 shrink-0 border-r bg-white h-screen sticky top-0">
        <div className="px-4 py-5 border-b">
          <Link href="/client" className="text-lg font-bold text-foreground">
            {APP_CONFIG.name}
          </Link>
          <p className="text-xs text-muted-foreground mt-0.5">Espace client</p>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          <Link
            href="/client"
            className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <FolderOpen className="h-4 w-4 shrink-0" />
            Mes projets
          </Link>
        </nav>

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
          {/* User info */}
          <div className="flex items-center gap-2 px-3 py-2 mt-1">
            <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-semibold text-primary shrink-0">
              {initials}
            </div>
            <span className="text-xs text-muted-foreground truncate">
              {fullName ?? user.email}
            </span>
          </div>
        </div>
      </aside>

      {/* Contenu principal */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        {children}
      </main>
    </div>
  )
}
