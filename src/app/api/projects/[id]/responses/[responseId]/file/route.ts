import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generatePresignedDownloadUrl } from '@/lib/s3'

// GET /api/projects/[id]/responses/[responseId]/file?key=xxx
// Retourne une presigned URL pour prévisualiser un fichier uploadé lors de l'onboarding
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const key = request.nextUrl.searchParams.get('key')
    if (!key) return NextResponse.json({ error: 'Clé manquante' }, { status: 400 })

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { data: project } = await supabase
      .from('projects').select('id').eq('id', id).eq('user_id', user.id).single()
    if (!project) return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 })

    const url = await generatePresignedDownloadUrl(key, 3600)
    return NextResponse.json({ url })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
