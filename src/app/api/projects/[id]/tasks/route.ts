import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { KanbanTask } from '@/types/kanban'
import { logActivity } from '@/lib/activity'

const taskCreateSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  column_id: z.string().uuid(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional().nullable(),
  due_date: z.string().optional().nullable(),
  visible_to_client: z.boolean().optional().default(false),
  order_index: z.number().int().min(0).optional(),
})

// GET /api/projects/[id]/tasks
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
      .from('kanban_tasks')
      .select('*')
      .eq('project_id', id)
      .order('order_index', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Grouper par column_id
    const grouped: Record<string, KanbanTask[]> = {}
    for (const task of (data ?? [])) {
      if (!grouped[task.column_id]) grouped[task.column_id] = []
      grouped[task.column_id].push(task as KanbanTask)
    }

    return NextResponse.json({ data: grouped })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST /api/projects/[id]/tasks
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
    const parsed = taskCreateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    // Si pas d'order_index fourni, calculer le prochain
    let orderIndex = parsed.data.order_index
    if (orderIndex === undefined) {
      const { data: lastTask } = await supabase
        .from('kanban_tasks')
        .select('order_index')
        .eq('column_id', parsed.data.column_id)
        .order('order_index', { ascending: false })
        .limit(1)
        .single()
      orderIndex = lastTask ? lastTask.order_index + 1 : 0
    }

    const { data, error } = await supabase
      .from('kanban_tasks')
      .insert({
        project_id: id,
        column_id: parsed.data.column_id,
        title: parsed.data.title,
        description: parsed.data.description ?? null,
        priority: parsed.data.priority ?? null,
        due_date: parsed.data.due_date ?? null,
        visible_to_client: parsed.data.visible_to_client,
        order_index: orderIndex,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Récupérer le nom de la colonne pour le log
    const { data: col } = await supabase
      .from('kanban_columns')
      .select('name')
      .eq('id', parsed.data.column_id)
      .single()

    await logActivity({
      supabase,
      userId: user.id,
      action: 'task_created',
      projectId: id,
      entityType: 'task',
      entityId: data.id,
      metadata: {
        task_title: data.title,
        column_name: col?.name ?? '',
      },
    })

    return NextResponse.json({ data }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
