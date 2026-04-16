import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generatePresignedDownloadUrl } from '@/lib/s3'

// GET /api/client/projects/[id]/feedback/media?key=...
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

    const admin = createAdminClient()

    // Vérifier accès
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

    // Vérifier que la clé appartient à ce projet (sécurité)
    if (!key.includes(`/${id}/feedback/`)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const downloadUrl = await generatePresignedDownloadUrl(key, 3600)
    return NextResponse.redirect(downloadUrl)
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
