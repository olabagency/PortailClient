import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { sendEmail, milestoneCompletedEmail } from '@/lib/email'
import { APP_CONFIG } from '@/config/app.config'

const milestoneUpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional().nullable(),
  status: z.enum(['pending', 'in_progress', 'completed']).optional(),
  due_date: z.string().optional().nullable(),
  start_date: z.string().optional().nullable(),
  order_index: z.number().int().min(0).optional(),
  visible_to_client: z.boolean().optional(),
  reference_type: z.enum(['deliverable', 'document', 'onboarding', 'meeting']).optional().nullable(),
  reference_id: z.string().max(200).optional().nullable(),
  priority: z.enum(['normal', 'high', 'urgent']).optional(),
  tags: z.array(z.string().max(50)).optional(),
  assigned_to: z.string().max(100).optional().nullable(),
  completion_note: z.string().max(500).optional().nullable(),
  responsible: z.enum(['freelancer', 'client']).optional(),
  subtasks: z.array(z.object({
    id: z.string(),
    title: z.string().max(200),
    completed: z.boolean(),
  })).optional(),
  meeting_url: z.string().url().optional().nullable(),
})

// PUT /api/projects/[id]/milestones/[milestoneId]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; milestoneId: string }> }
) {
  try {
    const { id, milestoneId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { data: project } = await supabase
      .from('projects')
      .select('id, name')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (!project) return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 })

    const body = await request.json()
    const parsed = milestoneUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const { data: currentMilestone } = await supabase
      .from('project_milestones')
      .select('status, title, visible_to_client')
      .eq('id', milestoneId)
      .single()

    const { data, error } = await supabase
      .from('project_milestones')
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq('id', milestoneId)
      .eq('project_id', id)
      .select()
      .single()

    if (error || !data) return NextResponse.json({ error: 'Jalon introuvable' }, { status: 404 })

    const wasCompleted = currentMilestone?.status !== 'completed' && parsed.data.status === 'completed'
    const isVisibleToClient = parsed.data.visible_to_client ?? currentMilestone?.visible_to_client ?? false

    if (wasCompleted && isVisibleToClient) {
      try {
        const { data: portal } = await supabase
          .from('client_portals')
          .select('email')
          .eq('project_id', id)
          .single()

        if (portal?.email) {
          await sendEmail({
            to: portal.email,
            subject: `Étape terminée : ${data.title} — ${project.name}`,
            html: milestoneCompletedEmail({
              projectName: project.name,
              milestoneTitle: data.title,
              clientPortalUrl: `${APP_CONFIG.url}/client`,
            }),
          })
        }
      } catch (emailErr) {
        console.error('[milestone/put] Email error:', emailErr)
      }
    }

    return NextResponse.json({ data })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// DELETE /api/projects/[id]/milestones/[milestoneId]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; milestoneId: string }> }
) {
  try {
    const { id, milestoneId } = await params
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

    const { error } = await supabase
      .from('project_milestones')
      .delete()
      .eq('id', milestoneId)
      .eq('project_id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ data: { success: true } })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
