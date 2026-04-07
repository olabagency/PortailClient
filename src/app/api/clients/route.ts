import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { logActivity } from '@/lib/activity'

const clientSchema = z.object({
  name: z.string().min(1, 'Le nom est requis').max(100),
  email: z.string().email('Email invalide').optional().or(z.literal('')),
  phone: z.string().max(20).optional().or(z.literal('')),
  company: z.string().max(100).optional().or(z.literal('')),
  notes: z.string().max(1000).optional().or(z.literal('')),
  client_type: z.enum(['individual', 'company', 'agency', 'startup', 'association', 'other']).optional().default('company'),
  website: z.string().url().optional().or(z.literal('')),
  address: z.string().max(200).optional().or(z.literal('')),
  city: z.string().max(100).optional().or(z.literal('')),
  zip_code: z.string().max(20).optional().or(z.literal('')),
  country: z.string().max(100).optional().or(z.literal('')),
  vat_number: z.string().max(50).optional().or(z.literal('')),
  billing_email: z.string().email().optional().or(z.literal('')),
  billing_name: z.string().max(200).optional().or(z.literal('')),
})

// GET /api/clients — liste tous les clients
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') ?? ''

    let query = supabase
      .from('clients')
      .select('*, projects(count)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,company.ilike.%${search}%`)
    }

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ data })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST /api/clients — créer un client
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const body = await request.json()
    const parsed = clientSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('clients')
      .insert({ ...parsed.data, user_id: user.id })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await logActivity({
      supabase,
      userId: user.id,
      action: 'client_created',
      entityType: 'client',
      entityId: data.id,
      metadata: {
        client_name: data.name,
        company: data.company ?? null,
      },
    })

    return NextResponse.json({ data }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
