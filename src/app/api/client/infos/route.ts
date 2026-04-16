import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createNotification } from '@/lib/notify'
import { z } from 'zod'

const schema = z.object({
  fields: z.object({
    name: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    company: z.string().optional(),
    billing_address: z.string().optional(),
    siret: z.string().optional(),
    vat_number: z.string().optional(),
  }),
  message: z.string().max(1000).optional().nullable(),
  project_id: z.string().uuid().optional().nullable(),
})

// POST /api/client/infos
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const admin = createAdminClient()
    const { data: clientRecord } = await admin
      .from('clients')
      .select('id, name')
      .eq('user_id', user.id)
      .single()
    if (!clientRecord) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

    const body = await request.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

    const { data: req, error } = await admin
      .from('client_info_requests')
      .insert({
        client_id: clientRecord.id,
        project_id: parsed.data.project_id ?? null,
        fields: parsed.data.fields,
        message: parsed.data.message ?? null,
        status: 'pending',
      })
      .select()
      .single()

    if (error || !req) return NextResponse.json({ error: 'Erreur insert' }, { status: 500 })

    // Trouver tous les freelances liés à ce client via les projets
    const { data: projects } = await admin
      .from('projects')
      .select('user_id, name')
      .eq('client_id', clientRecord.id)

    const freelancerIds = [...new Set((projects ?? []).map(p => p.user_id))]
    const projectName = (projects ?? [])[0]?.name

    for (const freelancerId of freelancerIds) {
      await createNotification({
        userId: freelancerId,
        type: 'client_info_update',
        title: 'Mise à jour des informations client',
        body: `${clientRecord.name} souhaite modifier ses informations${projectName ? ` (projet : ${projectName})` : ''}`,
        clientId: clientRecord.id,
        metadata: { requestId: req.id, fields: Object.keys(parsed.data.fields) },
      })
    }

    return NextResponse.json({ data: req }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
