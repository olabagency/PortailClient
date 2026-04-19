import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const project = searchParams.get('project')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()

      if (user?.email) {
        // Lier le user auth à l'enregistrement clients via admin (bypass RLS)
        const admin = createAdminClient()
        await admin
          .from('clients')
          .update({ user_id: user.id })
          .ilike('email', user.email)
          .is('user_id', null)

        // Marquer le portail comme accepté via admin
        if (project) {
          await admin
            .from('client_portals')
            .update({ accepted_at: new Date().toISOString() })
            .eq('project_id', project)
            .ilike('email', user.email)
            .is('accepted_at', null)
        }
      }

      const redirectTo = project ? `/client/projects/${project}` : '/client'
      return NextResponse.redirect(`${origin}${redirectTo}`)
    }
  }

  return NextResponse.redirect(`${origin}/client/login?error=auth_failed`)
}
