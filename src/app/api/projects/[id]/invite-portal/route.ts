import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
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

    // Récupérer le profil du freelancer (pour personnaliser l'email)
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, company_name')
      .eq('id', user.id)
      .single()

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

    // Lien vers la page de création de compte (email pré-rempli)
    const signupUrl = `${APP_CONFIG.url}/client/signup?email=${encodeURIComponent(parsed.data.email)}&project=${id}`
    const senderName = profile?.company_name ?? profile?.full_name ?? 'Votre prestataire'

    // Envoyer l'email via Resend
    if (process.env.RESEND_API_KEY) {
      try {
        const { Resend } = await import('resend')
        const resend = new Resend(process.env.RESEND_API_KEY)

        await resend.emails.send({
          from: `${senderName} <${process.env.RESEND_FROM_EMAIL ?? `noreply@${APP_CONFIG.url.replace(/https?:\/\//, '')}`}>`,
          to: parsed.data.email,
          subject: `${senderName} vous invite à suivre votre projet — ${project.name}`,
          html: `
            <!DOCTYPE html>
            <html>
            <body style="margin:0;padding:0;background:#f4f4f4;font-family:sans-serif;">
              <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">

                <!-- Header -->
                <div style="background:#E8553A;padding:32px 40px;">
                  <p style="margin:0;color:rgba(255,255,255,0.85);font-size:14px;">${senderName}</p>
                  <h1 style="margin:8px 0 0;color:#ffffff;font-size:22px;font-weight:700;">
                    Accédez à votre espace projet
                  </h1>
                </div>

                <!-- Body -->
                <div style="padding:32px 40px;">
                  <p style="margin:0 0 16px;color:#374151;font-size:16px;line-height:1.6;">
                    Bonjour,
                  </p>
                  <p style="margin:0 0 16px;color:#374151;font-size:16px;line-height:1.6;">
                    <strong>${senderName}</strong> vous invite à rejoindre votre espace client pour suivre l'avancement du projet <strong>${project.name}</strong>.
                  </p>
                  <p style="margin:0 0 28px;color:#6B7280;font-size:14px;line-height:1.6;">
                    Depuis votre espace, vous pouvez consulter les étapes du projet, les livrables partagés et les documents.
                  </p>

                  <!-- CTA -->
                  <div style="text-align:center;margin-bottom:28px;">
                    <a href="${signupUrl}"
                       style="display:inline-block;background:#E8553A;color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:16px;letter-spacing:0.01em;">
                      Créer mon espace client →
                    </a>
                  </div>

                  <p style="margin:0 0 4px;color:#9CA3AF;font-size:12px;text-align:center;">
                    Votre adresse email <strong>${parsed.data.email}</strong> sera pré-remplie.
                  </p>
                  <p style="margin:0;color:#9CA3AF;font-size:12px;text-align:center;">
                    Aucun mot de passe requis — connexion sécurisée par lien email.
                  </p>
                </div>

                <!-- Footer -->
                <div style="background:#F9FAFB;padding:20px 40px;border-top:1px solid #E5E7EB;">
                  <p style="margin:0;color:#9CA3AF;font-size:12px;text-align:center;">
                    Si vous pensez avoir reçu cet email par erreur, vous pouvez l'ignorer.
                  </p>
                </div>

              </div>
            </body>
            </html>
          `,
        })
      } catch (err) {
        console.error('[invite-portal] Resend error:', err)
        // On ne bloque pas : l'entrée portail est créée
      }
    } else {
      console.log(`[invite-portal] Resend non configuré. Lien signup pour ${parsed.data.email}: ${signupUrl}`)
    }

    return NextResponse.json({ data: { success: true } })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
