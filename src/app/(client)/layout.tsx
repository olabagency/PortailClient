import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import ClientSidebar from '@/components/client/ClientSidebar'
import ClientPortalRefresher from '@/components/client/ClientPortalRefresher'

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/client/login')
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <ClientPortalRefresher />
      <Suspense fallback={<div className="hidden md:block w-56 shrink-0 border-r bg-white h-screen" />}>
        <ClientSidebar />
      </Suspense>
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        {children}
      </main>
    </div>
  )
}
