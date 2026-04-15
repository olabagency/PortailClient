import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { generatePresignedUploadUrl, BUCKET } from '@/lib/s3'

const ALLOWED_LOGO_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
const MAX_SIZE_BYTES = 5 * 1024 * 1024 // 5 Mo

const presignSchema = z.object({
  filename: z.string().min(1).max(255),
  content_type: z.string().min(1),
  size: z.number().int().positive().max(MAX_SIZE_BYTES),
})

// POST /api/profile/logo-presign
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const body = await request.json()
    const parsed = presignSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const { filename, content_type } = parsed.data

    if (!ALLOWED_LOGO_TYPES.includes(content_type)) {
      return NextResponse.json(
        { error: 'Type de fichier non autorisé. Formats acceptés : JPG, PNG, WebP, SVG.' },
        { status: 400 }
      )
    }

    const ext = filename.split('.').pop()?.toLowerCase() ?? 'jpg'
    const key = `logos/${user.id}/${Date.now()}.${ext}`

    const uploadUrl = await generatePresignedUploadUrl(key, content_type)

    // L'URL publique dépend du bucket S3 (Scaleway Object Storage)
    const publicUrl = `${process.env.S3_ENDPOINT}/${BUCKET}/${key}`

    return NextResponse.json({ data: { uploadUrl, publicUrl, key } })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
