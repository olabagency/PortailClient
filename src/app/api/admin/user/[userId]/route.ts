import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'

const schema = z.object({
  plan: z.enum(['free', 'pro', 'agency']),
  trial_ends_at: z.string().nullable().optional(),
})

// PATCH /api/admin/user/[userId]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { data: self } = await supabase
      .from('profiles')
      .select('admin')
      .eq('id', user.id)
      .single()

    if (!self?.admin) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

    const body = await req.json() as unknown
    const parsed = schema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

    const { userId } = await params
    const { plan, trial_ends_at } = parsed.data

    const adminClient = createAdminClient()
    const { error } = await adminClient
      .from('profiles')
      .update({
        plan,
        trial_ends_at: trial_ends_at ?? null,
      })
      .eq('id', userId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ data: { ok: true } })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
