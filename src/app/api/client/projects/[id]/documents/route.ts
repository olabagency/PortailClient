import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generatePresignedDownloadUrl } from '@/lib/s3'

// GET /api/client/projects/[id]/documents
// Retourne les documents visibles par le client avec URLs presignées pour les fichiers
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const userEmail = user.email
    if (!userEmail) return NextResponse.json({ error: 'Email utilisateur introuvable' }, { status: 401 })

    // Vérifier l'accès via client_portals
    const { data: portalAccess } = await supabase
      .from('client_portals')
      .select('id')
      .eq('project_id', id)
      .filter('email', 'ilike', userEmail)
      .single()

    if (!portalAccess) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const { data: documents, error } = await supabase
      .from('project_documents')
      .select('id, name, type, url, s3_key, size_bytes, mime_type, created_at')
      .eq('project_id', id)
      .eq('visible_to_client', true)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Générer des URLs presignées pour les fichiers
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
