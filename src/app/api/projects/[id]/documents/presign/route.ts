import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { generatePresignedUploadUrl } from '@/lib/s3'
import { APP_CONFIG } from '@/config/app.config'

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  'application/zip',
  'application/x-zip-compressed',
]

const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100 Mo

const presignSchema = z.object({
  filename: z.string().min(1).max(255),
  content_type: z.string().min(1),
  folder_id: z.string().uuid().optional().nullable(),
  file_size: z.number().int().positive().max(MAX_FILE_SIZE, 'Fichier trop lourd (max 100 Mo)'),
})

// POST /api/projects/[id]/documents/presign
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { data: project } = await supabase
      .from('projects')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (!project) return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 })

    const body = await request.json()
    const parsed = presignSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    if (!ALLOWED_MIME_TYPES.includes(parsed.data.content_type)) {
      return NextResponse.json({ error: 'Type de fichier non autorisé' }, { status: 400 })
    }

    // Vérifier le quota de stockage du plan
    const { data: profile } = await supabase
      .from('profiles')
      .select('plan')
      .eq('id', user.id)
      .single()

    const plan = (profile?.plan ?? 'free') as keyof typeof APP_CONFIG.plans
    const maxBytes = APP_CONFIG.plans[plan].maxStorageGB * 1024 * 1024 * 1024

    const { data: allProjects } = await supabase
      .from('projects')
      .select('id')
      .eq('user_id', user.id)

    const projectIds = ((allProjects ?? []) as { id: string }[]).map(p => p.id)
    let usedBytes = 0
    if (projectIds.length > 0) {
      const { data: docs } = await supabase
        .from('project_documents')
        .select('size_bytes')
        .in('project_id', projectIds)
        .eq('type', 'file')
      usedBytes = ((docs ?? []) as { size_bytes: number | null }[])
        .reduce((sum, d) => sum + (d.size_bytes ?? 0), 0)
    }

    if (usedBytes + parsed.data.file_size > maxBytes) {
      return NextResponse.json(
        { error: `Quota de stockage dépassé. Limite du plan ${APP_CONFIG.plans[plan].name} : ${APP_CONFIG.plans[plan].maxStorageGB} Go.` },
        { status: 403 }
      )
    }

    // Construire la clé S3 en sanitisant le nom de fichier
    const sanitizedFilename = parsed.data.filename.replace(/\s+/g, '_')
    const s3Key = `${user.id}/${id}/documents/${Date.now()}_${sanitizedFilename}`

    const presignUrl = await generatePresignedUploadUrl(s3Key, parsed.data.content_type)

    return NextResponse.json({ data: { presign_url: presignUrl, s3_key: s3Key } })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
