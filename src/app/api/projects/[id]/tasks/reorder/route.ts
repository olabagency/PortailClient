import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const reorderSchema = z.object({
  items: z.array(z.object({
    id: z.string().uuid(),
    column_id: z.string().uuid(),
    order_index: z.number().int().min(0),
  })).min(1),
})

// POST /api/projects/[id]/tasks/reorder
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
    const parsed = reorderSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    // Mettre à jour en parallèle (column_id + order_index)
    await Promise.all(
      parsed.data.items.map(({ id: taskId, column_id, order_index }) =>
        supabase
          .from('kanban_tasks')
          .update({ column_id, order_index, updated_at: new Date().toISOString() })
          .eq('id', taskId)
          .eq('project_id', id)
      )
    )

    return NextResponse.json({ data: { success: true } })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
