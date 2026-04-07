import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generatePresignedUploadUrl, BUCKET } from '@/lib/s3'
import { z } from 'zod'

const ALLOWED_MIME_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  'application/pdf',
  'video/mp4',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip',
  'text/plain',
]
const MAX_SIZE_BYTES = 50 * 1024 * 1024

const presignSchema = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.string().min(1),
  fieldId: z.string().uuid(),
  sessionId: z.string().min(1),
  size: z.number().int().positive().max(MAX_SIZE_BYTES).optional(),
})

// POST /api/portal/[publicId]/presign
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ publicId: string }> }
) {
  try {
    const { publicId } = await params
    const supabase = await createClient()

    // Verify project exists and is active
    const { data: project, error } = await supabase
      .from('projects')
      .select('id')
      .eq('public_id', publicId)
      .neq('status', 'archived')
      .single()

    if (error || !project) {
      return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 })
    }

    const body = await request.json()
    const parsed = presignSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const { filename, contentType, fieldId, sessionId, size } = parsed.data

    const baseMime = contentType.split(';')[0].trim()
    const isAllowed = ALLOWED_MIME_TYPES.some(allowed => allowed === baseMime)
    if (!isAllowed) {
      return NextResponse.json(
        { error: 'Type de fichier non autorisé.' },
        { status: 400 }
      )
    }

    if (size && size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: 'Fichier trop volumineux. Taille maximum : 50 Mo.' },
        { status: 400 }
      )
    }

    if (!process.env.S3_BUCKET_NAME || !process.env.S3_ENDPOINT) {
      return NextResponse.json({ error: 'Stockage non configuré' }, { status: 503 })
    }

    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_')
    const key = `portal/${project.id}/${sessionId}/${fieldId}/${Date.now()}_${sanitizedFilename}`

    const uploadUrl = await generatePresignedUploadUrl(key, contentType)
    const publicUrl = `${process.env.S3_ENDPOINT}/${BUCKET}/${key}`

    return NextResponse.json({ data: { uploadUrl, key, publicUrl } })
  } catch (err) {
    console.error('[portal presign] error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
