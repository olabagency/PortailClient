import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { deleteS3Object } from '@/lib/s3'

const deliverableUpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional().nullable(),
  status: z.enum(['pending', 'validated', 'rejected', 'revision_requested']).optional(),
  client_note: z.string().optional().nullable(),
  milestone_id: z.string().uuid().optional().nullable(),
})

// PUT /api/projects/[id]/deliverables/[deliverableId]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; deliverableId: string }> }
) {
  try {
    const { id, deliverableId } = await params
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
    const parsed = deliverableUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('project_deliverables')
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq('id', deliverableId)
      .eq('project_id', id)
      .select()
      .single()

    if (error || !data) return NextResponse.json({ error: 'Livrable introuvable' }, { status: 404 })

    return NextResponse.json({ data })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// DELETE /api/projects/[id]/deliverables/[deliverableId]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; deliverableId: string }> }
) {
  try {
    const { id, deliverableId } = await params
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

    // Récupérer le livrable pour obtenir la clé S3
    const { data: deliverable } = await supabase
      .from('project_deliverables')
      .select('s3_key')
      .eq('id', deliverableId)
      .eq('project_id', id)
      .single()

    const { error } = await supabase
      .from('project_deliverables')
      .delete()
      .eq('id', deliverableId)
      .eq('project_id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Supprimer le fichier S3 si présent
    if (deliverable?.s3_key) {
      try {
        await deleteS3Object(deliverable.s3_key)
      } catch {
        // Ignorer les erreurs S3 — le livrable est déjà supprimé
      }
    }

    return NextResponse.json({ data: { success: true } })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
