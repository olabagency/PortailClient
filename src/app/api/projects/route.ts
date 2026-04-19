import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createNotification } from '@/lib/notify'
import { z } from 'zod'
import { nanoid } from 'nanoid'
import { APP_CONFIG } from '@/config/app.config'
import { logActivity } from '@/lib/activity'

const projectSchema = z.object({
  name: z.string().min(1, 'Le nom est requis').max(100),
  description: z.string().max(500).optional().or(z.literal('')),
  client_id: z.string().uuid().optional().nullable(),
  status: z.enum(['active', 'paused', 'completed', 'archived']).default('active'),
  template_id: z.string().uuid().optional().nullable(),
})

// GET /api/projects
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') ?? ''
    const status = searchParams.get('status') ?? ''

    let query = supabase
      .from('projects')
      .select('*, clients(id, name, company)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (search) query = query.ilike('name', `%${search}%`)
    if (status) query = query.eq('status', status)

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ data })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST /api/projects
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    // Vérifier la limite du plan
    const { data: profile } = await supabase
      .from('profiles')
      .select('plan')
      .eq('id', user.id)
      .single()

    const plan = (profile?.plan ?? 'free') as keyof typeof APP_CONFIG.plans
    const limit = APP_CONFIG.plans[plan].maxProjects

    if (limit !== Infinity) {
      const { count } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)

      if ((count ?? 0) >= limit) {
        return NextResponse.json(
          { error: `Limite atteinte : votre plan ${APP_CONFIG.plans[plan].name} permet ${limit} projet(s) maximum.` },
          { status: 403 }
        )
      }
    }

    const body = await request.json()
    const parsed = projectSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const { template_id, ...projectData } = parsed.data

    const { data, error } = await supabase
      .from('projects')
      .insert({ ...projectData, user_id: user.id, public_id: nanoid(12) })
      .select('*, clients(id, name, company)')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Appliquer un template si fourni
    if (template_id) {
      const { data: template } = await supabase
        .from('templates')
        .select('kanban_config, form_config, sections_config')
        .eq('id', template_id)
        .single()

      if (template) {
        // Supprimer les colonnes créées automatiquement par le trigger
        await supabase.from('kanban_columns').delete().eq('project_id', data.id)

        // Créer les colonnes du template
        const kanbanConfig = (template.kanban_config ?? []) as Array<{ name: string; color: string }>
        if (kanbanConfig.length > 0) {
          await supabase.from('kanban_columns').insert(
            kanbanConfig.map((col, i) => ({
              project_id: data.id,
              name: col.name,
              color: col.color ?? '#6B7280',
              order_index: i,
            }))
          )
        }

        // Créer les sections onboarding depuis le template
        const sectionsConfig = (template.sections_config ?? []) as Array<{
          title: string; kind: string; order_index: number
        }>
        const sectionIdMap: Record<number, string> = {}

        if (sectionsConfig.length > 0) {
          const insertedSections = await supabase
            .from('onboarding_sections')
            .insert(
              sectionsConfig.map((s, i) => ({
                project_id: data.id,
                title: s.title,
                kind: s.kind ?? 'default',
                order_index: i,
              }))
            )
            .select('id, order_index')

          ;(insertedSections.data ?? []).forEach(s => {
            sectionIdMap[s.order_index] = s.id
          })
        }

        // Créer les champs formulaire du template avec section_id résolu
        const formConfig = (template.form_config ?? []) as Array<Record<string, unknown>>
        if (formConfig.length > 0) {
          await supabase.from('form_fields').insert(
            formConfig.map((field, i) => {
              const sectionIndex = field.section_index as number | null
              const sectionId = (sectionIndex != null && sectionIdMap[sectionIndex])
                ? sectionIdMap[sectionIndex]
                : null
              return {
                project_id: data.id,
                type: field.type,
                label: field.label,
                description: field.description ?? null,
                placeholder: field.placeholder ?? null,
                required: field.required ?? false,
                options: field.options ?? null,
                sensitive: field.sensitive ?? false,
                section_id: sectionId,
                order_index: i,
              }
            })
          )
        }
      }
    }

    // Notifier le client si le projet est créé directement associé à lui
    if (parsed.data.client_id) {
      const admin = createAdminClient()
      const { data: clientRecord } = await admin
        .from('clients')
        .select('user_id')
        .eq('id', parsed.data.client_id)
        .single()

      if (clientRecord?.user_id) {
        await createNotification({
          userId: clientRecord.user_id,
          type: 'project_linked',
          title: 'Nouveau projet disponible',
          body: `Le projet « ${data.name} » vient d'être ajouté à votre espace client.`,
          projectId: data.id,
        })
      }
    }

    // Logger l'activité
    await logActivity({
      supabase,
      userId: user.id,
      action: 'project_created',
      projectId: data.id,
      entityType: 'project',
      entityId: data.id,
      metadata: {
        project_name: data.name,
        client_name: (data.clients as { name: string } | null)?.name ?? null,
      },
    })

    return NextResponse.json({ data }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
