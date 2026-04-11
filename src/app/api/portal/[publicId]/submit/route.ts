import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { APP_CONFIG } from '@/config/app.config'

const submitSchema = z.object({
  session_id: z.string().optional(),
  respondent_name: z.string().max(200).optional(),
  respondent_email: z.string().email().optional().or(z.literal('')),
  responses: z.record(z.string(), z.unknown()),
})

// POST /api/portal/[publicId]/submit — pas d'auth requise
export async function POST(request: NextRequest, { params }: { params: Promise<{ publicId: string }> }) {
  try {
    const { publicId } = await params
    const supabase = await createClient()

    // Chercher le projet par public_id
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, name, status, settings, user_id')
      .eq('public_id', publicId)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: 'Formulaire introuvable' }, { status: 404 })
    }

    if (project.status === 'archived') {
      return NextResponse.json({ error: 'Ce formulaire n\'est plus disponible' }, { status: 410 })
    }

    const body = await request.json()
    const parsed = submitSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    // Récupérer les champs requis
    const { data: requiredFields } = await supabase
      .from('form_fields')
      .select('id, label')
      .eq('project_id', project.id)
      .eq('required', true)

    // Vérifier que les champs requis sont présents
    const missingFields = (requiredFields ?? []).filter(
      field => {
        const value = parsed.data.responses[field.id]
        return value === undefined || value === null || value === ''
      }
    )

    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: `Champs obligatoires manquants : ${missingFields.map(f => f.label).join(', ')}` },
        { status: 422 }
      )
    }

    // Récupérer l'IP du client
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0] ?? request.headers.get('x-real-ip') ?? null

    const now = new Date().toISOString()
    const { session_id } = parsed.data

    const payload = {
      project_id: project.id,
      session_id: session_id ?? null,
      respondent_name: parsed.data.respondent_name || null,
      respondent_email: parsed.data.respondent_email || null,
      responses: parsed.data.responses,
      completed: true,
      submitted_at: now,
      updated_at: now,
      ip_address: ipAddress,
    }

    let data: { id: string } | null = null
    let error: { message: string } | null = null

    if (session_id) {
      // Upsert on existing draft row created by auto-save
      const result = await supabase
        .from('form_responses')
        .upsert(payload, { onConflict: 'project_id,session_id', ignoreDuplicates: false })
        .select('id')
        .single()
      data = result.data
      error = result.error
    } else {
      // No session: plain insert
      const result = await supabase
        .from('form_responses')
        .insert(payload)
        .select('id')
        .single()
      data = result.data
      error = result.error
    }

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Envoyer email de notification au freelance
    try {
      const { data: ownerData } = await supabase.auth.admin.getUserById(project.user_id)
      const ownerEmail = ownerData?.user?.email
      if (ownerEmail && process.env.RESEND_API_KEY) {
        const { Resend } = await import('resend')
        const resend = new Resend(process.env.RESEND_API_KEY)
        const fromEmail = process.env.RESEND_FROM_EMAIL ?? `noreply@${APP_CONFIG.url.replace(/https?:\/\//, '')}`
        const respondentName = parsed.data.respondent_name || parsed.data.respondent_email || 'Votre client'
        const projectUrl = `${APP_CONFIG.url}/dashboard/projects/${project.id}/onboarding`

        await resend.emails.send({
          from: fromEmail,
          to: ownerEmail,
          subject: `✅ Onboarding complété — ${project.name}`,
          html: `
            <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px;color:#1a1a1a">
              <h2 style="margin:0 0 16px">Onboarding complété</h2>
              <p style="color:#555;margin:0 0 16px">
                <strong>${respondentName}</strong> vient de compléter le formulaire d'onboarding pour le projet
                <strong>${project.name}</strong>.
              </p>
              <a href="${projectUrl}" style="display:inline-block;background:#3b82f6;color:white;text-decoration:none;padding:10px 20px;border-radius:8px;font-weight:600;margin-bottom:16px">
                Voir les réponses →
              </a>
              <p style="color:#999;font-size:12px;margin:16px 0 0">
                Envoyé par ${APP_CONFIG.name}
              </p>
            </div>
          `,
        })
      }
    } catch (emailErr) {
      console.error('[submit] Email notification error:', emailErr)
      // Ne pas bloquer la réponse si l'email échoue
    }

    return NextResponse.json({ data: { id: data!.id } }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
