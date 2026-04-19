import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { generatePresignedUploadUrl, getPublicUrl } from '@/lib/s3'

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
const MAX_SIZE = 2 * 1024 * 1024 // 2 Mo (après compression côté client)

const schema = z.object({
  filename: z.string().min(1).max(255),
  content_type: z.string().min(1),
  size: z.number().int().positive().max(MAX_SIZE),
})

// POST /api/profile/logo-presign
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const body = await request.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

    const { content_type } = parsed.data
    if (!ALLOWED.includes(content_type)) {
      return NextResponse.json({ error: 'Format non autorisé. JPG, PNG, WebP ou SVG.' }, { status: 400 })
    }

    const ext = content_type === 'image/svg+xml' ? 'svg' : content_type === 'image/webp' ? 'webp' : 'jpg'
    const key = `avatars/${user.id}/${Date.now()}.${ext}`

    // public-read → l'image est accessible directement via son URL publique
    const uploadUrl = await generatePresignedUploadUrl(key, content_type, 300, 'public-read')
    const publicUrl = getPublicUrl(key)

    return NextResponse.json({ data: { uploadUrl, publicUrl, key } })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
