import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { deleteS3Object } from '@/lib/s3'

// DELETE /api/upload/[fileId]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const { fileId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    // Vérifier ownership via project_files
    const { data: file } = await supabase
      .from('project_files')
      .select('id, s3_key, project_id')
      .eq('id', fileId)
      .single()

    if (!file) return NextResponse.json({ error: 'Fichier introuvable' }, { status: 404 })

    // Vérifier que l'utilisateur est propriétaire du projet
    const { data: project } = await supabase
      .from('projects')
      .select('id')
      .eq('id', file.project_id)
      .eq('user_id', user.id)
      .single()

    if (!project) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

    // Supprimer de S3 si configuré
    if (process.env.S3_BUCKET_NAME && process.env.S3_ENDPOINT && file.s3_key) {
      try {
        await deleteS3Object(file.s3_key)
      } catch (err) {
        console.error('[delete file] S3 error:', err)
        // On continue même si la suppression S3 échoue
      }
    }

    // Supprimer de la DB
    const { error } = await supabase.from('project_files').delete().eq('id', fileId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ data: { success: true } })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
