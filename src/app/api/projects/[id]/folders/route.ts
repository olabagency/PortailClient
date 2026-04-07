import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const folderCreateSchema = z.object({
  name: z.string().min(1).max(100),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().default('#6B7280'),
  icon: z.string().optional().default('folder'),
})

// GET /api/projects/[id]/folders
export async function GET(
  _request: NextRequest,
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

    const { data: folders, error } = await supabase
      .from('document_folders')
      .select('*')
      .eq('project_id', id)
      .order('order_index', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Compter les documents par dossier
    const { data: docs } = await supabase
      .from('project_documents')
      .select('folder_id')
      .eq('project_id', id)

    const countMap: Record<string, number> = {}
    let rootCount = 0
    for (const doc of (docs ?? [])) {
      if (doc.folder_id === null || doc.folder_id === undefined) {
        rootCount++
      } else {
        countMap[doc.folder_id] = (countMap[doc.folder_id] ?? 0) + 1
      }
    }

    const foldersWithCount = (folders ?? []).map((folder) => ({
      ...folder,
      doc_count: countMap[folder.id] ?? 0,
    }))

    return NextResponse.json({ data: { folders: foldersWithCount, rootCount } })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST /api/projects/[id]/folders
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
    const parsed = folderCreateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    // Calculer le prochain order_index
    const { data: last } = await supabase
      .from('document_folders')
      .select('order_index')
      .eq('project_id', id)
      .order('order_index', { ascending: false })
      .limit(1)
      .single()
    const orderIndex = last ? last.order_index + 1 : 0

    const { data, error } = await supabase
      .from('document_folders')
      .insert({
        project_id: id,
        name: parsed.data.name,
        color: parsed.data.color,
        icon: parsed.data.icon,
        order_index: orderIndex,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ data }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
