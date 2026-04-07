import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { logActivity } from '@/lib/activity'

const taskUpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  column_id: z.string().uuid().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional().nullable(),
  due_date: z.string().optional().nullable(),
  visible_to_client: z.boolean().optional(),
  order_index: z.number().int().min(0).optional(),
})

// GET /api/projects/[id]/tasks/[taskId]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  try {
    const { id, taskId } = await params
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
      .eq('id', taskId)
      .eq('project_id', id)
      .single()

    if (error || !data) return NextResponse.json({ error: 'Tâche introuvable' }, { status: 404 })

    return NextResponse.json({ data })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// PUT /api/projects/[id]/tasks/[taskId]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  try {
    const { id, taskId } = await params
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
    const parsed = taskUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    // Charger la tâche avant update pour détecter les changements de colonne
    const { data: taskBefore } = await supabase
      .from('kanban_tasks')
      .select('title, column_id')
      .eq('id', taskId)
      .eq('project_id', id)
      .single()

    const { data, error } = await supabase
      .from('kanban_tasks')
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq('id', taskId)
      .eq('project_id', id)
      .select()
      .single()

    if (error || !data) return NextResponse.json({ error: 'Tâche introuvable' }, { status: 404 })

    // Logger uniquement si la colonne a changé
    if (taskBefore && parsed.data.column_id && parsed.data.column_id !== taskBefore.column_id) {
      const { data: toCol } = await supabase
        .from('kanban_columns')
        .select('name')
        .eq('id', parsed.data.column_id)
        .single()

      const isCompleted = toCol?.name?.toLowerCase().includes('terminé') ||
        toCol?.name?.toLowerCase().includes('termine') ||
        toCol?.name?.toLowerCase().includes('done')

      await logActivity({
        supabase,
        userId: user.id,
        action: isCompleted ? 'task_completed' : 'task_moved',
        projectId: id,
        entityType: 'task',
        entityId: taskId,
        metadata: {
          task_title: taskBefore.title,
          to_column: toCol?.name ?? '',
        },
      })
    }

    return NextResponse.json({ data })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// DELETE /api/projects/[id]/tasks/[taskId]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  try {
    const { id, taskId } = await params
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

    // Récupérer le titre avant suppression
    const { data: taskToDelete } = await supabase
      .from('kanban_tasks')
      .select('title')
      .eq('id', taskId)
      .eq('project_id', id)
      .single()

    const { error } = await supabase
      .from('kanban_tasks')
      .delete()
      .eq('id', taskId)
      .eq('project_id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await logActivity({
      supabase,
      userId: user.id,
      action: 'task_deleted',
      projectId: id,
      entityType: 'task',
      entityId: taskId,
      metadata: { task_title: taskToDelete?.title ?? '' },
    })

    return NextResponse.json({ data: { success: true } })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
