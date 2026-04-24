import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createNotification } from '@/lib/notify'
import { z } from 'zod'
import { nanoid } from 'nanoid'
import { logActivity } from '@/lib/activity'

const projectUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().or(z.literal('')),
  client_id: z.string().uuid().optional().nullable(),
  status: z.enum(['active', 'paused', 'completed', 'archived']).optional(),
  pin: z.string().max(10).optional().nullable(),
  pin_enabled: z.boolean().optional(),
  settings: z.record(z.string(), z.unknown()).optional().nullable(),
})

// GET /api/projects/[id]
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { data, error } = await supabase
      .from('projects')
      .select('*, clients(id, name, company, email), kanban_columns(*, kanban_tasks(*))')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error || !data) return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 })

    return NextResponse.json({ data })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// PUT /api/projects/[id]
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const body = await request.json()
    const parsed = projectUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    // Lire l'ancien client_id pour détecter un changement de liaison
    const { data: before } = await supabase
      .from('projects')
      .select('client_id, name')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    const { data, error } = await supabase
      .from('projects')
      .update(parsed.data)
      .eq('id', id)
      .eq('user_id', user.id)
      .select('*, clients(id, name, company)')
      .single()

    if (error || !data) return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 })

    // Notifier le client si un nouveau client_id vient d'être associé
    const newClientId = parsed.data.client_id
    if (newClientId && newClientId !== before?.client_id) {
      const admin = createAdminClient()
      const { data: clientRecord } = await admin
        .from('clients')
        .select('user_id, name')
        .eq('id', newClientId)
        .single()

      if (clientRecord?.user_id) {
        await createNotification({
          userId: clientRecord.user_id,
          type: 'project_linked',
          title: 'Nouveau projet disponible',
          body: `Le projet « ${before?.name ?? data.name} » vient d'être ajouté à votre espace client.`,
          projectId: id,
        })
      }
    }

    void logActivity({
      supabase,
      userId: user.id,
      action: 'project_updated',
      projectId: id,
      entityType: 'project',
      entityId: id,
      entityName: data.name,
    })

    return NextResponse.json({ data })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// DELETE /api/projects/[id]
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { data: projectBefore } = await supabase
      .from('projects')
      .select('name')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    void logActivity({
      supabase,
      userId: user.id,
      action: 'project_deleted',
      projectId: null,
      entityType: 'project',
      entityId: id,
      entityName: projectBefore?.name ?? undefined,
    })

    return NextResponse.json({ data: { success: true } })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
