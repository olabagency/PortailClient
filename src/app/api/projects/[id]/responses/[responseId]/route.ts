import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendEmail, revisionRequestEmail } from '@/lib/email'
import { APP_CONFIG } from '@/config/app.config'

// PUT — valider un onboarding
export async function PUT(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; responseId: string }> }
) {
  try {
    const { id, responseId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    // Verify project ownership
    const { data: project } = await supabase
      .from('projects')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()
    if (!project) return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 })

    const { data, error } = await supabase
      .from('form_responses')
      .update({ validated_at: new Date().toISOString() })
      .eq('id', responseId)
      .eq('project_id', id)
      .select()
      .single()

    if (error || !data) return NextResponse.json({ error: 'Réponse introuvable' }, { status: 404 })
    return NextResponse.json({ data })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// PATCH — demander des modifications (reset completed + envoi email)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; responseId: string }> }
) {
  try {
    const { id, responseId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    // Verify project ownership
    const { data: project } = await supabase
      .from('projects')
      .select('id, name, public_id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()
    if (!project) return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 })

    const body = await request.json()
    const message: string = body?.message ?? ''

    // Reset the response so client can resubmit
    const { data, error } = await supabase
      .from('form_responses')
      .update({ completed: false, validated_at: null })
      .eq('id', responseId)
      .eq('project_id', id)
      .select('respondent_email, client_info')
      .single()

    if (error || !data) return NextResponse.json({ error: 'Réponse introuvable' }, { status: 404 })

    // Send email to client if email known
    const email = data.respondent_email ?? (data.client_info as Record<string, string>)?.email
    if (email && message) {
      const clientInfo = data.client_info as Record<string, string> | null
      const respondentName = clientInfo
        ? [clientInfo.first_name, clientInfo.last_name].filter(Boolean).join(' ') || undefined
        : undefined
      const formUrl = `${APP_CONFIG.url}/p/${project.public_id}`
      await sendEmail({
        to: email,
        subject: `Modifications demandées — ${project.name}`,
        html: revisionRequestEmail({ projectName: project.name, message, formUrl, respondentName }),
      })
    }

    return NextResponse.json({ data: { success: true } })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// DELETE — supprimer une réponse (rend le formulaire de nouveau disponible)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; responseId: string }> }
) {
  try {
    const { id, responseId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { data: project } = await supabase
      .from('projects')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()
    if (!project) return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 })

    const { error } = await supabase
      .from('form_responses')
      .delete()
      .eq('id', responseId)
      .eq('project_id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data: { success: true } })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
