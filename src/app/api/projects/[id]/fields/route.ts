import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { APP_CONFIG } from '@/config/app.config'

const fieldSchema = z.object({
  type: z.enum(['text','textarea','email','phone','url','date','select','multiselect','file','password']),
  label: z.string().min(1).max(200),
  description: z.string().max(500).optional().or(z.literal('')),
  placeholder: z.string().max(200).optional().or(z.literal('')),
  required: z.boolean().default(false),
  sensitive: z.boolean().default(false),
  options: z.array(z.string()).optional().nullable(),
  section_id: z.string().uuid().optional().nullable(),
  order_index: z.number().int().min(0).default(0),
})

// GET /api/projects/[id]/fields
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    // Vérifier ownership du projet
    const { data: project } = await supabase
      .from('projects')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()
    if (!project) return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 })

    const [{ data: sections }, { data: fields }] = await Promise.all([
      supabase.from('onboarding_sections').select('*').eq('project_id', id).order('order_index'),
      supabase.from('form_fields').select('*').eq('project_id', id).order('order_index'),
    ])

    return NextResponse.json({ data: { sections: sections ?? [], fields: fields ?? [] } })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST /api/projects/[id]/fields
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { data: project } = await supabase
      .from('projects')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()
    if (!project) return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 })

    // Vérifier limite plan
    const { data: profile } = await supabase.from('profiles').select('plan').eq('id', user.id).single()
    const plan = (profile?.plan ?? 'free') as keyof typeof APP_CONFIG.plans
    const limit = APP_CONFIG.plans[plan].maxFormFields

    if (limit !== Infinity) {
      const { count } = await supabase
        .from('form_fields')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', id)

      if ((count ?? 0) >= limit) {
        return NextResponse.json(
          { error: `Limite atteinte : votre plan permet ${limit} champ(s) maximum par formulaire.` },
          { status: 403 }
        )
      }
    }

    const body = await request.json()
    const parsed = fieldSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

    const { data, error } = await supabase
      .from('form_fields')
      .insert({ ...parsed.data, project_id: id })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ data }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
