import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { APP_CONFIG } from '@/config/app.config'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; milestoneId: string }> },
) {
  try {
    const { id, milestoneId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    // Récupérer le projet + le client
    const { data: project } = await supabase
      .from('projects')
      .select('id, name, client_id, clients(id, name, email)')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (!project) return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 })

    const client = project.clients as unknown as { id: string; name: string; email: string } | null
    if (!client?.email) {
      return NextResponse.json({ error: 'Aucun email client associé à ce projet.' }, { status: 400 })
    }

    // Récupérer l'étape
    const { data: milestone } = await supabase
      .from('project_milestones')
      .select('id, title, description, reference_type, reference_id')
      .eq('id', milestoneId)
      .eq('project_id', id)
      .single()

    if (!milestone) return NextResponse.json({ error: 'Étape introuvable' }, { status: 404 })

    // Récupérer le profil du freelancer (expéditeur)
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, company_name')
      .eq('id', user.id)
      .single()

    const senderName = profile?.company_name ?? profile?.full_name ?? 'Votre prestataire'

    // Résoudre le libellé de la référence (livrable ou document)
    let referenceLabel: string | null = null
    if (milestone.reference_type === 'deliverable' && milestone.reference_id) {
      const { data: del } = await supabase
        .from('project_deliverables')
        .select('name')
        .eq('id', milestone.reference_id)
        .single()
      if (del) referenceLabel = `Livrable : ${del.name}`
    } else if (milestone.reference_type === 'document' && milestone.reference_id) {
      const { data: doc } = await supabase
        .from('project_documents')
        .select('name')
        .eq('id', milestone.reference_id)
        .single()
      if (doc) referenceLabel = `Document : ${doc.name}`
    }

    // Lien vers le portail client
    const portalUrl = `${APP_CONFIG.url}/client/projects/${id}`

    if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === 'REMPLIR') {
      console.log(`[request-validation] Email à envoyer à ${client.email} : ${portalUrl}`)
      return NextResponse.json({ data: { sent: false, preview: portalUrl } })
    }

    const { Resend } = await import('resend')
    const resend = new Resend(process.env.RESEND_API_KEY)
    const fromEmail = process.env.RESEND_FROM_EMAIL ?? `noreply@${APP_CONFIG.url.replace(/https?:\/\//, '')}`

    const { error: emailError } = await resend.emails.send({
      from: `${senderName} <${fromEmail}>`,
      to: client.email,
      subject: `Action requise : validation de l'étape "${milestone.title}" — ${project.name}`,
      html: `
        <!DOCTYPE html>
        <html>
        <body style="margin:0;padding:0;background:#f4f4f4;font-family:sans-serif;">
          <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">

            <div style="background:#386FA4;padding:28px 36px;">
              <p style="margin:0;color:rgba(255,255,255,0.8);font-size:13px;">${senderName}</p>
              <h1 style="margin:6px 0 0;color:#ffffff;font-size:20px;font-weight:700;">
                Votre validation est demandée
              </h1>
            </div>

            <div style="padding:28px 36px;">
              <p style="margin:0 0 12px;color:#374151;font-size:15px;line-height:1.6;">
                Bonjour ${client.name},
              </p>
              <p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.6;">
                <strong>${senderName}</strong> souhaite votre validation pour l'étape suivante du projet <strong>${project.name}</strong> :
              </p>

              <div style="background:#F9FAFB;border:1px solid #E5E7EB;border-left:4px solid #386FA4;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
                <p style="margin:0;font-weight:600;color:#111827;font-size:15px;">✓ ${milestone.title}</p>
                ${milestone.description ? `<p style="margin:6px 0 0;color:#6B7280;font-size:13px;">${milestone.description}</p>` : ''}
                ${referenceLabel ? `<p style="margin:6px 0 0;color:#6B7280;font-size:13px;">📎 ${referenceLabel}</p>` : ''}
              </div>

              <div style="text-align:center;margin-bottom:24px;">
                <a href="${portalUrl}"
                   style="display:inline-block;background:#386FA4;color:#ffffff;padding:13px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;">
                  Accéder à mon espace projet →
                </a>
              </div>

              <p style="margin:0;color:#9CA3AF;font-size:12px;text-align:center;">
                Vous pouvez valider, commenter ou demander des modifications depuis votre espace.
              </p>
            </div>

            <div style="background:#F9FAFB;padding:16px 36px;border-top:1px solid #E5E7EB;">
              <p style="margin:0;color:#9CA3AF;font-size:11px;text-align:center;">
                Si vous pensez avoir reçu cet email par erreur, vous pouvez l'ignorer.
              </p>
            </div>

          </div>
        </body>
        </html>
      `,
    })

    if (emailError) {
      console.error('[request-validation] Resend error:', emailError)
      return NextResponse.json({ error: 'Erreur lors de l\'envoi de l\'email.' }, { status: 500 })
    }

    return NextResponse.json({ data: { sent: true, to: client.email } })
  } catch (err) {
    console.error('[request-validation]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
