import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { APP_CONFIG } from '@/config/app.config'

const inviteSchema = z.object({
  email: z.string().email(),
})

// POST /api/projects/[id]/invite
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
    const parsed = inviteSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const { email } = parsed.data
    const portalUrl = `${APP_CONFIG.url}/p/${project.public_id}`

    // Envoyer via Resend si configuré, sinon log en console
    if (process.env.RESEND_API_KEY) {
      try {
        const { Resend } = await import('resend')
        const resend = new Resend(process.env.RESEND_API_KEY)

        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL ?? `noreply@${APP_CONFIG.url.replace(/https?:\/\//, '')}`,
          to: email,
          subject: `Formulaire à remplir : ${project.name}`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #111;">Formulaire d'onboarding</h2>
              <p>Voici votre lien pour remplir le formulaire d'onboarding :</p>
              <p>
                <a href="${portalUrl}" style="display: inline-block; background: #3B82F6; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">
                  Accéder au formulaire
                </a>
              </p>
              <p style="color: #666; font-size: 14px;">
                Ou copiez ce lien : <a href="${portalUrl}">${portalUrl}</a>
              </p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
              <p style="color: #999; font-size: 12px;">Envoyé via ${APP_CONFIG.name}</p>
            </div>
          `,
        })
      } catch (err) {
        console.error('[invite] Resend error:', err)
        return NextResponse.json({ error: 'Erreur lors de l\'envoi de l\'email.' }, { status: 500 })
      }
    } else {
      // Fallback console log si Resend non configuré
      console.log(`[invite] Email non configuré. Invitation pour ${email} : ${portalUrl}`)
    }

    return NextResponse.json({ data: { success: true } })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
