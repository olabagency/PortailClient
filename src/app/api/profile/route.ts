import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const updateProfileSchema = z.object({
  full_name: z.string().min(1).max(150).optional(),
  company_name: z.string().max(150).optional().nullable(),
  company_type: z.enum(['freelance', 'agency', 'company', 'other']).optional().nullable(),
  company_siret: z.string().max(14).optional().nullable(),
  company_vat: z.string().max(30).optional().nullable(),
  company_address: z.string().max(255).optional().nullable(),
  company_zip: z.string().max(10).optional().nullable(),
  company_city: z.string().max(100).optional().nullable(),
  company_website: z.string().url().max(255).optional().nullable().or(z.literal('')),
  company_email: z.string().email().max(150).optional().nullable().or(z.literal('')),
  logo_url: z.string().url().max(500).optional().nullable().or(z.literal('')),
})

// GET /api/profile
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { data, error } = await supabase
      .from('profiles')
      .select(
        'full_name, email, avatar_url, plan, company_name, company_type, company_siret, company_vat, company_address, company_zip, company_city, company_website, company_email, logo_url'
      )
      .eq('id', user.id)
      .single()

    if (error) return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 })

    return NextResponse.json({ data })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// PUT /api/profile
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const body = await request.json()
    const parsed = updateProfileSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const updates = parsed.data

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: 'Erreur lors de la mise à jour.' }, { status: 500 })

    // Synchroniser full_name dans les metadata Supabase Auth si fourni
    if (updates.full_name) {
      await supabase.auth.updateUser({ data: { full_name: updates.full_name } })
    }

    return NextResponse.json({ data })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
