import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/portal/[publicId] — pas d'auth requise
export async function GET(_request: NextRequest, { params }: { params: Promise<{ publicId: string }> }) {
  try {
    const { publicId } = await params
    const supabase = await createClient()

    // Chercher le projet par public_id
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, name, description, settings, status')
      .eq('public_id', publicId)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: 'Formulaire introuvable' }, { status: 404 })
    }

    if (project.status === 'archived') {
      return NextResponse.json({ error: 'Ce formulaire n\'est plus disponible' }, { status: 410 })
    }

    const [{ data: sections }, { data: fields }] = await Promise.all([
      supabase
        .from('onboarding_sections')
        .select('id, title, order_index')
        .eq('project_id', project.id)
        .order('order_index'),
      supabase
        .from('form_fields')
        .select('id, type, label, description, placeholder, required, options, order_index, section_id')
        .eq('project_id', project.id)
        .order('order_index'),
    ])

    return NextResponse.json({
      data: {
        project: {
          name: project.name,
          description: project.description,
          settings: project.settings,
        },
        sections: sections ?? [],
        fields: fields ?? [],
      },
    })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
