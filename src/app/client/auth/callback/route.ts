import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const project = searchParams.get('project')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // Marquer accepted_at dans client_portals si un projet est fourni
      if (project) {
        const { data: { user } } = await supabase.auth.getUser()
        if (user?.email) {
          await supabase
            .from('client_portals')
            .update({ accepted_at: new Date().toISOString() })
            .eq('project_id', project)
            .eq('email', user.email)
            .is('accepted_at', null)
        }
      }
      const redirectTo = project ? `/client/projects/${project}` : '/client'
      return NextResponse.redirect(`${origin}${redirectTo}`)
    }
  }

  return NextResponse.redirect(`${origin}/client/login?error=auth_failed`)
}
