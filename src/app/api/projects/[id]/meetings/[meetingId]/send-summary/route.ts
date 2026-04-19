import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; meetingId: string }> },
) {
  try {
    const { id, meetingId } = await params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    if (!process.env.RESEND_API_KEY) {
      console.log('[send-summary] Resend non configuré.')
      return NextResponse.json({ error: 'Service email non configuré.' }, { status: 503 })
    }

    // Get profile (for sender name)
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, company_name')
      .eq('id', user.id)
      .single()

    // Get project + client
    const { data: project } = await supabase
      .from('projects')
      .select('id, name, client_id, clients(name, email)')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (!project) return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 })

    // Get meeting
    const { data: meeting } = await supabase
      .from('project_meetings')
      .select('*')
      .eq('id', meetingId)
      .eq('project_id', id)
      .single()

    if (!meeting) return NextResponse.json({ error: 'Réunion introuvable' }, { status: 404 })
    if (!meeting.summary)
      return NextResponse.json({ error: 'Aucun compte-rendu à envoyer' }, { status: 400 })

    const client = project.clients as unknown as { name: string; email: string } | null
    if (!client?.email) return NextResponse.json({ error: 'Email client introuvable' }, { status: 400 })

    const senderName = profile?.company_name ?? profile?.full_name ?? 'Votre prestataire'
    const fromEmail = process.env.RESEND_FROM_EMAIL ?? `noreply@${process.env.NEXT_PUBLIC_APP_URL?.replace(/https?:\/\//, '') ?? 'app.local'}`

    const formattedDate = new Date(meeting.scheduled_at).toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

    const { Resend } = await import('resend')
    const resend = new Resend(process.env.RESEND_API_KEY)

    const { error } = await resend.emails.send({
      from: `${senderName} <${fromEmail}>`,
      to: client.email,
      subject: `Compte-rendu : ${meeting.title} — ${formattedDate}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #386FA4;">Compte-rendu de réunion</h2>
          <p><strong>${meeting.title}</strong></p>
          <p style="color: #666;">${formattedDate} · ${meeting.duration_min} min</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 16px 0;" />
          <div style="line-height: 1.6;">${meeting.summary}</div>
          <hr style="border: none; border-top: 1px solid #eee; margin: 16px 0;" />
          <p style="color: #888; font-size: 12px;">
            Envoyé par ${senderName} via votre portail client.
          </p>
        </div>
      `,
    })

    if (error) {
      console.error('[send-summary] Resend error:', error)
      return NextResponse.json({ error: 'Erreur lors de l\'envoi de l\'email' }, { status: 500 })
    }

    return NextResponse.json({ data: { sent: true } })
  } catch (err) {
    console.error('[send-summary]', err)
    return NextResponse.json({ error: "Erreur lors de l'envoi" }, { status: 500 })
  }
}
