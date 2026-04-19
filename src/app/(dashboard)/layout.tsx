import { Sidebar } from '@/components/dashboard/Sidebar'
import NotificationsBell from '@/components/dashboard/NotificationsBell'
import GlobalSearch from '@/components/dashboard/GlobalSearch'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-[#FAFAF8] overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar with search + notifications */}
        <header className="h-[60px] shrink-0 flex items-center gap-3 px-4 md:px-6 border-b bg-white/80 backdrop-blur-sm">
          <div className="flex-1 flex items-center">
            <GlobalSearch />
          </div>
          <NotificationsBell />
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
