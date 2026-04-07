import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'
import { APP_CONFIG } from '@/config/app.config'

const schema = z.object({
  email: z.string().email(),
  require_account: z.boolean().default(false),
})

// POST /api/projects/[id]/invite-portal
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    // Vérifier ownership du projet
    const { data: project } = await supabase
      .from('projects')
      .select('id, name, public_id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()
    if (!project) return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 })

    const body = await request.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    // Upsert dans client_portals
    const { error: upsertError } = await supabase
      .from('client_portals')
      .upsert(
        {
          project_id: id,
          email: parsed.data.email,
          require_account: parsed.data.require_account,
        },
        { onConflict: 'project_id,email', ignoreDuplicates: false }
      )

    if (upsertError) {
      console.error('[invite-portal] Upsert error:', upsertError)
      return NextResponse.json({ error: 'Erreur lors de la création du portail.' }, { status: 500 })
    }

    // Générer le magic link via admin client
    const adminSupabase = createAdminClient()
    const { data: linkData, error: linkError } = await adminSupabase.auth.admin.generateLink({
      type: 'magiclink',
      email: parsed.data.email,
      options: {
        redirectTo: `${APP_CONFIG.url}/client/auth/callback?project=${id}`,
      },
    })

    if (linkError) {
      console.error('[invite-portal] generateLink error:', linkError)
      // On continue : l'entrée client_portals a été créée
      return NextResponse.json({ data: { success: true } })
    }

    const actionLink = linkData?.properties?.action_link

    // Envoyer l'email via Resend
    if (process.env.RESEND_API_KEY && actionLink) {
      try {
        const { Resend } = await import('resend')
        const resend = new Resend(process.env.RESEND_API_KEY)

        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL ?? `noreply@${APP_CONFIG.url.replace(/https?:\/\//, '')}`,
          to: parsed.data.email,
          subject: `Accès à votre portail projet — ${project.name}`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
              <h2 style="color: #111; margin-bottom: 8px;">${APP_CONFIG.name}</h2>
              <p style="color: #444; font-size: 16px; margin-bottom: 16px;">
                Vous avez été invité à suivre l'avancement du projet <strong>${project.name}</strong>.
              </p>
              <p style="color: #444; font-size: 16px; margin-bottom: 24px;">
                Suivez l'avancement de votre projet, consultez les livrables et échangez directement avec votre prestataire.
              </p>
              <p>
                <a
                  href="${actionLink}"
                  style="display: inline-block; background: #3B82F6; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 16px;"
                >
                  Accéder à mon portail
                </a>
              </p>
              <p style="color: #888; font-size: 13px; margin-top: 24px;">
                Ce lien est à usage unique et expire dans 24 heures. Si vous n'avez pas demandé cet accès, ignorez cet email.
              </p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
              <p style="color: #bbb; font-size: 12px;">Envoyé via ${APP_CONFIG.name}</p>
            </div>
          `,
        })
      } catch (err) {
        console.error('[invite-portal] Resend error:', err)
        // On ne bloque pas : l'entrée portail est créée
      }
    } else if (!actionLink) {
      console.log(`[invite-portal] Pas de lien généré pour ${parsed.data.email}`)
    } else {
      console.log(`[invite-portal] Resend non configuré. Lien pour ${parsed.data.email}: ${actionLink}`)
    }

    return NextResponse.json({ data: { success: true } })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
