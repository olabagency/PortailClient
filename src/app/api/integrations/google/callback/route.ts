import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { exchangeCodeForTokens, getGoogleUserEmail } from '@/lib/google'
import { APP_CONFIG } from '@/config/app.config'

// GET /api/integrations/google/callback
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  const redirectBase = `${APP_CONFIG.url}/dashboard/account?tab=integrations`

  if (error || !code) {
    return NextResponse.redirect(`${redirectBase}&google=error`)
  }

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.redirect(`${redirectBase}&google=error`)

    const tokens = await exchangeCodeForTokens(code)
    if (!tokens.access_token || !tokens.refresh_token) {
      return NextResponse.redirect(`${redirectBase}&google=error`)
    }

    const googleEmail = await getGoogleUserEmail(tokens.access_token)

    const expiresAt = tokens.expiry_date
      ? new Date(tokens.expiry_date).toISOString()
      : new Date(Date.now() + 3600 * 1000).toISOString()

    await supabase
      .from('google_integrations')
      .upsert(
        {
          user_id: user.id,
          google_email: googleEmail,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_at: expiresAt,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' },
      )

    return NextResponse.redirect(`${redirectBase}&google=connected`)
  } catch {
    return NextResponse.redirect(`${redirectBase}&google=error`)
  }
}
