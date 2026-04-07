import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const feedbackUpdateSchema = z.object({
  status: z.enum(['pending', 'in_progress', 'treated']).optional(),
  title: z.string().min(1).max(200).optional(),
  content: z.string().optional().nullable(),
})

// PUT /api/projects/[id]/feedback/[feedbackId]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; feedbackId: string }> }
) {
  try {
    const { id, feedbackId } = await params
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

    const body = await request.json()
    const parsed = feedbackUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('client_feedback')
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq('id', feedbackId)
      .eq('project_id', id)
      .select()
      .single()

    if (error || !data) return NextResponse.json({ error: 'Retour introuvable' }, { status: 404 })

    return NextResponse.json({ data })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// DELETE /api/projects/[id]/feedback/[feedbackId]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; feedbackId: string }> }
) {
  try {
    const { id, feedbackId } = await params
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

    const { error } = await supabase
      .from('client_feedback')
      .delete()
      .eq('id', feedbackId)
      .eq('project_id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ data: { success: true } })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
