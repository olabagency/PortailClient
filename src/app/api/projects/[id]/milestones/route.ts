import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const milestoneCreateSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional().nullable(),
  status: z.enum(['pending', 'in_progress', 'completed']).optional().default('pending'),
  due_date: z.string().optional().nullable(),
  order_index: z.number().int().min(0).optional(),
  visible_to_client: z.boolean().optional().default(true),
})

// GET /api/projects/[id]/milestones
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    // Vérifier ownership
    const { data: project } = await supabase
      .from('projects')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (!project) return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 })

    const { data, error } = await supabase
      .from('project_milestones')
      .select('*')
      .eq('project_id', id)
      .order('order_index', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ data })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST /api/projects/[id]/milestones
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    // Vérifier ownership
    const { data: project } = await supabase
      .from('projects')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (!project) return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 })

    const body = await request.json()
    const parsed = milestoneCreateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    // Si pas d'order_index fourni, calculer le prochain
    let orderIndex = parsed.data.order_index
    if (orderIndex === undefined) {
      const { data: last } = await supabase
        .from('project_milestones')
        .select('order_index')
        .eq('project_id', id)
        .order('order_index', { ascending: false })
        .limit(1)
        .single()
      orderIndex = last ? last.order_index + 1 : 0
    }

    const { data, error } = await supabase
      .from('project_milestones')
      .insert({
        project_id: id,
        title: parsed.data.title,
        description: parsed.data.description ?? null,
        status: parsed.data.status,
        due_date: parsed.data.due_date ?? null,
        order_index: orderIndex,
        visible_to_client: parsed.data.visible_to_client,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ data }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
