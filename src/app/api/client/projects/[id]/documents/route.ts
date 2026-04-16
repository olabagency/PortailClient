import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generatePresignedDownloadUrl } from '@/lib/s3'

// GET /api/client/projects/[id]/documents
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const admin = createAdminClient()

    // Vérifier accès : client lié au projet
    const { data: clientRecord } = await admin
      .from('clients')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!clientRecord) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

    const { data: project } = await admin
      .from('projects')
      .select('id')
      .eq('id', id)
      .eq('client_id', clientRecord.id)
      .single()

    if (!project) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

    const { data: documents, error } = await admin
      .from('project_documents')
      .select('id, name, type, url, s3_key, size_bytes, mime_type, source, client_doc_status, created_at')
      .eq('project_id', id)
      .eq('visible_to_client', true)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const docsWithUrls = await Promise.all(
      (documents ?? []).map(async (doc) => {
        if (doc.type === 'file') {
          try {
            const key = doc.s3_key ?? doc.url
            const downloadUrl = await generatePresignedDownloadUrl(key, 3600)
            return { ...doc, download_url: downloadUrl }
          } catch {
            return { ...doc, download_url: null }
          }
        }
        return { ...doc, download_url: doc.url }
      })
    )

    return NextResponse.json({ data: docsWithUrls })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
