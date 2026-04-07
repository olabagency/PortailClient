import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const documentLinkCreateSchema = z.object({
  name: z.string().min(1).max(200),
  type: z.literal('link'),
  url: z.string().url(),
  folder_id: z.string().uuid().optional().nullable(),
  visible_to_client: z.boolean().optional().default(false),
})

// GET /api/projects/[id]/documents?folder_id=xxx
// Passer folder_id='root' pour les documents sans dossier
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    // Vérifier ownership
    const { data: project } = await supabase
      .from('projects')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (!project) return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 })

    const { searchParams } = new URL(request.url)
    const folderIdParam = searchParams.get('folder_id')

    let query = supabase
      .from('project_documents')
      .select('*')
      .eq('project_id', id)
      .order('created_at', { ascending: false })

    if (folderIdParam === 'root') {
      query = query.is('folder_id', null)
    } else if (folderIdParam) {
      query = query.eq('folder_id', folderIdParam)
    }

    const { data, error } = await query

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ data })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST /api/projects/[id]/documents (pour les liens uniquement)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    // Vérifier ownership
    const { data: project } = await supabase
      .from('projects')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (!project) return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 })

    const body = await request.json()
    const parsed = documentLinkCreateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('project_documents')
      .insert({
        project_id: id,
        name: parsed.data.name,
        type: parsed.data.type,
        url: parsed.data.url,
        folder_id: parsed.data.folder_id ?? null,
        visible_to_client: parsed.data.visible_to_client,
        uploaded_by: user.id,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ data }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
