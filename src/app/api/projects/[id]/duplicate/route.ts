import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { nanoid } from 'nanoid'

// POST /api/projects/[id]/duplicate
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    // Récupérer le projet source
    const { data: source, error: srcError } = await supabase
      .from('projects')
      .select('*, kanban_columns(*, kanban_tasks(*)), form_fields(*), onboarding_sections(*)')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (srcError || !source) return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 })

    // Créer le projet copié
    const { data: newProject, error: projError } = await supabase
      .from('projects')
      .insert({
        user_id: user.id,
        client_id: source.client_id,
        public_id: nanoid(12),
        name: `${source.name} (copie)`,
        description: source.description,
        status: 'active',
      })
      .select()
      .single()

    if (projError || !newProject) return NextResponse.json({ error: 'Erreur lors de la duplication' }, { status: 500 })

    // Dupliquer les colonnes kanban (les tasks sont recréées vides)
    if (source.kanban_columns?.length) {
      const columns = source.kanban_columns.map(({ id: _id, project_id: _pid, kanban_tasks: _tasks, ...col }: Record<string, unknown>) => ({
        ...col,
        project_id: newProject.id,
      }))
      await supabase.from('kanban_columns').insert(columns)
    }

    // Dupliquer les sections
    if (source.onboarding_sections?.length) {
      const sections = source.onboarding_sections.map(({ id: _id, project_id: _pid, ...s }: Record<string, unknown>) => ({
        ...s,
        project_id: newProject.id,
      }))
      await supabase.from('onboarding_sections').insert(sections)
    }

    // Dupliquer les champs de formulaire
    if (source.form_fields?.length) {
      const fields = source.form_fields.map(({ id: _id, project_id: _pid, ...f }: Record<string, unknown>) => ({
        ...f,
        project_id: newProject.id,
      }))
      await supabase.from('form_fields').insert(fields)
    }

    return NextResponse.json({ data: newProject }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
