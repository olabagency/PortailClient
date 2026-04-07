import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generatePresignedUploadUrl, BUCKET } from '@/lib/s3'
import { z } from 'zod'

const ALLOWED_MIME_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  'application/pdf',
  'video/mp4',
]
const MAX_SIZE_BYTES = 50 * 1024 * 1024 // 50 MB

const presignSchema = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.string().min(1),
  projectId: z.string().uuid(),
  context: z.enum(['onboarding', 'project', 'documents']),
  size: z.number().int().positive().max(MAX_SIZE_BYTES).optional(),
})

// POST /api/upload/presign
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

    const { filename, contentType, projectId, context, size } = parsed.data

    // Vérifier le MIME type
    const baseMime = contentType.split(';')[0].trim()
    const isAllowed = ALLOWED_MIME_TYPES.some(allowed => {
      if (allowed.endsWith('/*')) {
        return baseMime.startsWith(allowed.replace('/*', '/'))
      }
      return allowed === baseMime
    })

    if (!isAllowed) {
      return NextResponse.json(
        { error: 'Type de fichier non autorisé. Formats acceptés : images, PDF, MP4.' },
        { status: 400 }
      )
    }

    // Vérifier taille si fournie
    if (size && size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: 'Fichier trop volumineux. Taille maximum : 50 Mo.' },
        { status: 400 }
      )
    }

    // Vérifier ownership du projet
    const { data: project } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single()
    if (!project) return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 })

    // Générer la clé S3
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_')
    const key = `${user.id}/${projectId}/${context}/${Date.now()}_${sanitizedFilename}`

    // Vérifier que S3 est configuré
    if (!process.env.S3_BUCKET_NAME || !process.env.S3_ENDPOINT) {
      return NextResponse.json({ error: 'Stockage non configuré' }, { status: 503 })
    }

    const uploadUrl = await generatePresignedUploadUrl(key, contentType)
    const publicUrl = `${process.env.S3_ENDPOINT}/${BUCKET}/${key}`

    return NextResponse.json({ data: { uploadUrl, key, publicUrl } })
  } catch (err) {
    console.error('[presign] error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
