import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

// GET /api/templates/[id]
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { data: template, error } = await supabase
      .from('templates')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !template) return NextResponse.json({ error: 'Template introuvable' }, { status: 404 })

    // L'utilisateur doit être propriétaire OU le template doit être un template par défaut
    if (!template.is_default && template.user_id !== user.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    return NextResponse.json({ data: template })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

const updateTemplateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  kanban_config: z.array(z.object({
    name: z.string().min(1).max(50),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  })).optional(),
  form_config: z.array(z.object({
    type: z.string(),
    label: z.string().min(1),
    description: z.string().optional().nullable(),
    placeholder: z.string().optional().nullable(),
    required: z.boolean().optional().default(false),
    options: z.array(z.string()).optional().nullable(),
  })).optional(),
})

// PUT /api/templates/[id]
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { data: template } = await supabase
      .from('templates')
      .select('id, is_default, user_id')
      .eq('id', id)
      .single()

    if (!template) return NextResponse.json({ error: 'Template introuvable' }, { status: 404 })
    if (template.is_default) return NextResponse.json({ error: 'Impossible de modifier un template par défaut' }, { status: 403 })
    if (template.user_id !== user.id) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })

    const body = await request.json()
    const parsed = updateTemplateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Données invalides' }, { status: 400 })
    }

    const { data: updated, error } = await supabase
      .from('templates')
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ data: updated })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// DELETE /api/templates/[id]
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    // Vérifier que le template appartient à l'utilisateur et n'est pas un template par défaut
    const { data: template } = await supabase
      .from('templates')
      .select('id, is_default, user_id')
      .eq('id', id)
      .single()

    if (!template) return NextResponse.json({ error: 'Template introuvable' }, { status: 404 })
    if (template.is_default) return NextResponse.json({ error: 'Impossible de supprimer un template par défaut' }, { status: 403 })
    if (template.user_id !== user.id) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })

    const { error } = await supabase.from('templates').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ data: null })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
