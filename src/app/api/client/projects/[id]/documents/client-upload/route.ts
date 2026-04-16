import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(1).max(255),
  s3Key: z.string().min(1),
  sizeBytes: z.number().int().positive().optional().nullable(),
  mimeType: z.string().optional().nullable(),
})

// POST /api/client/projects/[id]/documents/client-upload
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

    const { data: doc, error } = await admin
      .from('project_documents')
      .insert({
        project_id: id,
        name: parsed.data.name,
        type: 'file',
        url: parsed.data.s3Key,
        s3_key: parsed.data.s3Key,
        size_bytes: parsed.data.sizeBytes ?? null,
        mime_type: parsed.data.mimeType ?? null,
        visible_to_client: true,
        uploaded_by: user.id,
        source: 'client',
        client_doc_status: 'pending_review',
      })
      .select()
      .single()

    if (error || !doc) {
      return NextResponse.json({ error: 'Erreur lors de l\'enregistrement' }, { status: 500 })
    }

    return NextResponse.json({ data: doc })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
