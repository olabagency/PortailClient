import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const renameSectionSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  kind: z.enum(['default', 'access']).optional(),
})

// PUT /api/projects/[id]/sections/[sectionId]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sectionId: string }> }
) {
  try {
    const { id, sectionId } = await params
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
    const parsed = renameSectionSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

    const { data, error } = await supabase
      .from('onboarding_sections')
      .update(parsed.data)
      .eq('id', sectionId)
      .eq('project_id', id)
      .select()
      .single()

    if (error || !data) return NextResponse.json({ error: 'Section introuvable' }, { status: 404 })

    return NextResponse.json({ data })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// DELETE /api/projects/[id]/sections/[sectionId]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; sectionId: string }> }
) {
  try {
    const { id, sectionId } = await params
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

    // Délier les champs de cette section (section_id = null)
    await supabase
      .from('form_fields')
      .update({ section_id: null })
      .eq('project_id', id)
      .eq('section_id', sectionId)

    const { error } = await supabase
      .from('onboarding_sections')
      .delete()
      .eq('id', sectionId)
      .eq('project_id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ data: { success: true } })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
