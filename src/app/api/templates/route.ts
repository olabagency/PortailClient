import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { APP_CONFIG } from '@/config/app.config'
import { logActivity } from '@/lib/activity'

const createTemplateSchema = z.object({
  name: z.string().min(1, 'Le nom est requis').max(100),
  description: z.string().max(500).optional().or(z.literal('')),
  project_id: z.string().uuid().optional().nullable(),
})

// GET /api/templates — liste templates par défaut + ceux de l'utilisateur
export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .or(`is_default.eq.true,user_id.eq.${user.id}`)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const defaults = (data ?? []).filter(t => t.is_default)
    const mine = (data ?? []).filter(t => !t.is_default && t.user_id === user.id)

    return NextResponse.json({ data: { defaults, mine } })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST /api/templates — créer un template (depuis un projet ou vide)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    // Vérifier limite du plan
    const { data: profile } = await supabase
      .from('profiles')
      .select('plan')
      .eq('id', user.id)
      .single()

    const plan = (profile?.plan ?? 'free') as keyof typeof APP_CONFIG.plans
    const limit = APP_CONFIG.plans[plan].maxTemplates

    if (limit !== Infinity) {
      const { count } = await supabase
        .from('templates')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)

      if ((count ?? 0) >= limit) {
        return NextResponse.json(
          { error: `Limite atteinte : votre plan ${APP_CONFIG.plans[plan].name} permet ${limit} template(s) personnalisé(s) maximum.` },
          { status: 403 }
        )
      }
    }

    const body = await request.json()
    const parsed = createTemplateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const { name, description, project_id } = parsed.data

    let kanbanConfig: Array<{ name: string; color: string }> = []
    let formConfig: Array<Record<string, unknown>> = []

    if (project_id) {
      // Vérifier ownership du projet
      const { data: project } = await supabase
        .from('projects')
        .select('id')
        .eq('id', project_id)
        .eq('user_id', user.id)
        .single()

      if (!project) {
        return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 })
      }

      // Copier la config kanban
      const { data: columns } = await supabase
        .from('kanban_columns')
        .select('name, color')
        .eq('project_id', project_id)
        .order('order_index')

      kanbanConfig = (columns ?? []).map(c => ({ name: c.name, color: c.color }))

      // Copier la config formulaire
      const { data: fields } = await supabase
        .from('form_fields')
        .select('type, label, description, placeholder, required, options')
        .eq('project_id', project_id)
        .order('order_index')

      formConfig = (fields ?? []).map(f => ({
        type: f.type,
        label: f.label,
        ...(f.description ? { description: f.description } : {}),
        ...(f.placeholder ? { placeholder: f.placeholder } : {}),
        required: f.required,
        ...(f.options ? { options: f.options } : {}),
      }))
    } else {
      // Template vide avec colonnes par défaut
      kanbanConfig = APP_CONFIG.defaultKanbanColumns.map(c => ({ name: c.name, color: c.color }))
    }

    const { data, error } = await supabase
      .from('templates')
      .insert({
        user_id: user.id,
        name,
        description: description || null,
        kanban_config: kanbanConfig,
        form_config: formConfig,
        is_default: false,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await logActivity({
      supabase,
      userId: user.id,
      action: 'template_created',
      entityType: 'template',
      entityId: data.id,
      metadata: { template_name: data.name },
    })

    return NextResponse.json({ data }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
