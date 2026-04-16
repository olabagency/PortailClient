import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generatePresignedUploadUrl } from '@/lib/s3'
import { z } from 'zod'

const schema = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.string().regex(/^(image|video)\//),
})

const ALLOWED_MIME = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'video/mp4', 'video/webm', 'video/quicktime',
]

// POST /api/client/projects/[id]/feedback/presign
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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

    const body = await request.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    if (!ALLOWED_MIME.includes(parsed.data.contentType)) {
      return NextResponse.json({ error: 'Type de fichier non autorisé' }, { status: 400 })
    }

    const ext = parsed.data.filename.split('.').pop() ?? 'bin'
    const key = `${user.id}/${id}/feedback/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`

    const uploadUrl = await generatePresignedUploadUrl(key, parsed.data.contentType, 300)

    return NextResponse.json({ data: { uploadUrl, key } })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
