import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/projects/[id]/vault
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    // Vérifier ownership du projet + récupérer le client associé
    const { data: project } = await supabase
      .from('projects')
      .select('id, name, client_id, clients(id, name, email)')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (!project) return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 })

    const client = project.clients as unknown as { id: string; name: string; email: string } | null

    // Récupérer les champs de sections de type 'access'
    const { data: fields } = await supabase
      .from('form_fields')
      .select('id, label, type, sensitive, order_index, section_id, form_sections!inner(id, kind)')
      .eq('project_id', id)
      .eq('form_sections.kind', 'access')
      .order('order_index')

    // Récupérer la dernière réponse complète
    const { data: latestResponse } = await supabase
      .from('form_responses')
      .select('id, responses, submitted_at, updated_at')
      .eq('project_id', id)
      .eq('completed', true)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const responses = (latestResponse?.responses ?? {}) as Record<string, unknown>
    const lastSubmittedAt = latestResponse?.submitted_at ?? latestResponse?.updated_at ?? null

    return NextResponse.json({
      data: {
        fields: (fields ?? []).map((f) => ({
          id: f.id,
          label: f.label,
          type: f.type,
          sensitive: f.sensitive ?? true,
          order_index: f.order_index,
        })),
        responses,
        client: client ?? null,
        lastSubmittedAt,
      },
    })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
