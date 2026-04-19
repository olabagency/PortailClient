import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createNotification } from '@/lib/notify'
import { z } from 'zod'

const schema = z.object({
  status: z.enum(['validated', 'rejected', 'revision_requested']),
  client_note: z.string().max(1000).optional().nullable(),
})

// PUT /api/client/projects/[id]/deliverables/[deliverableId]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; deliverableId: string }> }
) {
  try {
    const { id, deliverableId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const admin = createAdminClient()

    // Vérifier accès : le client doit être lié à ce projet
    const { data: clientRecord } = await admin
      .from('clients')
      .select('id, name')
      .eq('user_id', user.id)
      .single()

    if (!clientRecord) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

    const { data: project } = await admin
      .from('projects')
      .select('id, user_id, name')
      .eq('id', id)
      .eq('client_id', clientRecord.id)
      .single()

    if (!project) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

    const body = await request.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const { data: updatedDeliverable, error: updateError } = await admin
      .from('project_deliverables')
      .update({
        status: parsed.data.status,
        client_note: parsed.data.client_note ?? null,
      })
      .eq('id', deliverableId)
      .eq('project_id', id)
      .select()
      .single()

    if (updateError || !updatedDeliverable) {
      return NextResponse.json({ error: 'Livrable introuvable ou mise à jour impossible' }, { status: 404 })
    }

    const status = parsed.data.status
    const notifType = status === 'validated' ? 'deliverable_validated' : 'deliverable_revised'
    const statusLabel = status === 'validated'
      ? 'validé ✅'
      : status === 'rejected'
      ? 'rejeté ❌'
      : 'révision demandée 🔄'

    try {
      await createNotification({
        userId: project.user_id,
        type: notifType,
        title: `Livrable ${statusLabel} — ${project.name}`,
        body: `${clientRecord.name} a ${statusLabel.split(' ')[0]} « ${updatedDeliverable.name} »${parsed.data.client_note ? ` : "${parsed.data.client_note}"` : ''}`,
        projectId: id,
      })
    } catch { /* notification non bloquante */ }

    return NextResponse.json({ data: updatedDeliverable })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
