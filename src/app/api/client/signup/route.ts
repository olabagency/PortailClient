import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createNotification } from '@/lib/notify'
import { z } from 'zod'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  project_id: z.string().uuid().optional(),
})

// POST /api/client/signup
// Crée un compte client immédiatement sans email de confirmation (email_confirm: true via admin)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as unknown
    const parsed = schema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

    const { email, password, project_id } = parsed.data
    const admin = createAdminClient()

    // Créer l'utilisateur avec email confirmé immédiatement
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (authError) {
      const msg = authError.message.toLowerCase().includes('already')
        ? 'Un compte existe déjà pour cet email.'
        : authError.message
      return NextResponse.json({ error: msg }, { status: 400 })
    }

    const userId = authData.user.id

    // Lier le user_id à la fiche client existante (par email, case-insensitive)
    await admin
      .from('clients')
      .update({ user_id: userId })
      .ilike('email', email)
      .is('user_id', null)

    // Marquer le portail comme accepté si un projet est fourni + notification freelance
    if (project_id) {
      await admin
        .from('client_portals')
        .update({ accepted_at: new Date().toISOString() })
        .eq('project_id', project_id)
        .ilike('email', email)
        .is('accepted_at', null)

      // Notifier le freelance
      try {
        const { data: project } = await admin
          .from('projects')
          .select('user_id, name, client_id')
          .eq('id', project_id)
          .single()

        if (project) {
          // Récupérer le nom du client pour le message
          let clientName = email
          if (project.client_id) {
            const { data: client } = await admin
              .from('clients')
              .select('name')
              .eq('id', project.client_id)
              .single()
            if (client?.name) clientName = client.name
          }

          await createNotification({
            userId: project.user_id,
            type: 'client_account_created',
            title: `Compte client activé — ${project.name}`,
            body: `${clientName} a créé son espace client.`,
            projectId: project_id,
          })
        }
      } catch {
        // Ne pas bloquer si la notification échoue
      }
    }

    return NextResponse.json({ data: { user_id: userId } }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
