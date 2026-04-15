import { APP_CONFIG } from '@/config/app.config'

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL
  ?? `noreply@${APP_CONFIG.url.replace(/https?:\/\//, '')}`

interface SendEmailOptions {
  to: string | string[]
  subject: string
  html: string
}

/**
 * Envoie un email via Resend. Ne bloque pas si Resend n'est pas configuré.
 * Retourne true si envoyé, false sinon.
 */
export async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) {
    console.log('[email] Resend non configuré. Email à envoyer :', options.subject, '→', options.to)
    return false
  }

  try {
    const { Resend } = await import('resend')
    const resend = new Resend(process.env.RESEND_API_KEY)
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: options.to,
      subject: options.subject,
      html: options.html,
    })
    if (error) {
      console.error('[email] Resend error:', error)
      return false
    }
    return true
  } catch (err) {
    console.error('[email] Unexpected error:', err)
    return false
  }
}

// ── Templates ────────────────────────────────────────────────────────────────

export function emailWrapper(content: string): string {
  return `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#111">
      ${content}
      <hr style="border:none;border-top:1px solid #eee;margin:32px 0 16px" />
      <p style="color:#999;font-size:11px;margin:0">
        Envoyé par <a href="${APP_CONFIG.url}" style="color:#3b82f6;text-decoration:none">${APP_CONFIG.name}</a>
      </p>
    </div>
  `
}

export function newDeliverableEmail({
  projectName,
  deliverableName,
  clientPortalUrl,
}: {
  projectName: string
  deliverableName: string
  clientPortalUrl: string
}): string {
  return emailWrapper(`
    <h2 style="margin:0 0 8px;font-size:20px">Nouveau livrable disponible</h2>
    <p style="color:#555;margin:0 0 20px">
      Un nouveau livrable <strong>${deliverableName}</strong> a été partagé sur le projet <strong>${projectName}</strong>.
    </p>
    <a href="${clientPortalUrl}" style="display:inline-block;background:#3b82f6;color:white;text-decoration:none;padding:10px 20px;border-radius:8px;font-weight:600">
      Voir le livrable →
    </a>
  `)
}

export function milestoneCompletedEmail({
  projectName,
  milestoneTitle,
  clientPortalUrl,
}: {
  projectName: string
  milestoneTitle: string
  clientPortalUrl: string
}): string {
  return emailWrapper(`
    <h2 style="margin:0 0 8px;font-size:20px">✅ Étape terminée</h2>
    <p style="color:#555;margin:0 0 20px">
      L'étape <strong>${milestoneTitle}</strong> du projet <strong>${projectName}</strong> a été marquée comme terminée.
    </p>
    <a href="${clientPortalUrl}" style="display:inline-block;background:#3b82f6;color:white;text-decoration:none;padding:10px 20px;border-radius:8px;font-weight:600">
      Voir le projet →
    </a>
  `)
}

export function revisionRequestEmail({
  projectName,
  message,
  formUrl,
  respondentName,
}: {
  projectName: string
  message: string
  formUrl: string
  respondentName?: string
}): string {
  const greeting = respondentName ? `Bonjour ${respondentName},` : 'Bonjour,'
  return emailWrapper(`
    <h2 style="margin:0 0 8px;font-size:20px">📝 Modifications demandées</h2>
    <p style="color:#555;margin:0 0 8px">${greeting}</p>
    <p style="color:#555;margin:0 0 16px">
      Votre questionnaire pour le projet <strong>${projectName}</strong> a été examiné.
      Quelques modifications sont nécessaires avant de pouvoir continuer.
    </p>
    <div style="background:#fafafa;border:1px solid #eee;border-radius:8px;padding:16px;margin:0 0 20px">
      <p style="margin:0;color:#333;font-size:15px;white-space:pre-wrap">${message}</p>
    </div>
    <a href="${formUrl}" style="display:inline-block;background:#E8553A;color:white;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:15px">
      Modifier mon questionnaire →
    </a>
    <p style="color:#999;font-size:12px;margin-top:20px">
      Cliquez sur ce bouton pour accéder à nouveau au formulaire et apporter les modifications demandées.
    </p>
  `)
}

export function clientPortalInviteEmail({
  projectName,
  magicLink,
  respondentName,
}: {
  projectName: string
  magicLink: string
  respondentName?: string
}): string {
  const greeting = respondentName ? `Bonjour ${respondentName},` : 'Bonjour,'
  return emailWrapper(`
    <h2 style="margin:0 0 8px;font-size:20px">🎉 Votre onboarding est complété !</h2>
    <p style="color:#555;margin:0 0 8px">${greeting}</p>
    <p style="color:#555;margin:0 0 20px">
      Merci pour votre onboarding sur le projet <strong>${projectName}</strong>.
      Votre espace client est maintenant accessible — suivez l'avancement de votre projet, consultez les livrables et accédez à vos documents.
    </p>
    <a href="${magicLink}" style="display:inline-block;background:#E8553A;color:white;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:15px">
      Accéder à mon espace client →
    </a>
    <p style="color:#999;font-size:12px;margin-top:20px">
      Ce lien est à usage unique et expire dans 24 heures.
    </p>
  `)
}
