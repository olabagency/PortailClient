import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { deleteS3Object } from '@/lib/s3'

const documentUpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  folder_id: z.string().uuid().optional().nullable(),
  visible_to_client: z.boolean().optional(),
})

// PUT /api/projects/[id]/documents/[docId]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  try {
    const { id, docId } = await params
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
    const parsed = documentUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('project_documents')
      .update(parsed.data)
      .eq('id', docId)
      .eq('project_id', id)
      .select()
      .single()

    if (error || !data) return NextResponse.json({ error: 'Document introuvable' }, { status: 404 })

    return NextResponse.json({ data })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// DELETE /api/projects/[id]/documents/[docId]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  try {
    const { id, docId } = await params
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

    // Récupérer le document pour obtenir la clé S3 éventuelle
    const { data: doc } = await supabase
      .from('project_documents')
      .select('s3_key')
      .eq('id', docId)
      .eq('project_id', id)
      .single()

    if (!doc) return NextResponse.json({ error: 'Document introuvable' }, { status: 404 })

    const { error } = await supabase
      .from('project_documents')
      .delete()
      .eq('id', docId)
      .eq('project_id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Supprimer le fichier S3 si présent
    if (doc.s3_key) {
      await deleteS3Object(doc.s3_key)
    }

    return NextResponse.json({ data: { success: true } })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
