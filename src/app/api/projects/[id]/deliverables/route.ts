import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const deliverableCreateSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional().nullable(),
  type: z.enum(['file', 'link']),
  url: z.string().min(1),
  s3_key: z.string().optional().nullable(),
  size_bytes: z.number().int().optional().nullable(),
  mime_type: z.string().optional().nullable(),
  milestone_id: z.string().uuid().optional().nullable(),
  visible_to_client: z.boolean().optional().default(true),
})

// GET /api/projects/[id]/deliverables
export async function GET(
  _request: NextRequest,
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

    const { data, error } = await supabase
      .from('project_deliverables')
      .select('*')
      .eq('project_id', id)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ data })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST /api/projects/[id]/deliverables
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
    const parsed = deliverableCreateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('project_deliverables')
      .insert({
        project_id: id,
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        type: parsed.data.type,
        url: parsed.data.url,
        s3_key: parsed.data.s3_key ?? null,
        size_bytes: parsed.data.size_bytes ?? null,
        mime_type: parsed.data.mime_type ?? null,
        milestone_id: parsed.data.milestone_id ?? null,
        visible_to_client: parsed.data.visible_to_client,
        status: 'pending',
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ data }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
