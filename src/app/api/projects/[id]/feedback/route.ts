import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const feedbackCreateSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().optional().nullable(),
  type: z.enum(['feedback', 'modification_request', 'question']),
  deliverable_id: z.string().uuid().optional().nullable(),
  phase: z.number().int().min(1).optional(),
  source: z.enum(['client', 'freelance']).optional().default('freelance'),
})

// GET /api/projects/[id]/feedback
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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

    // Déterminer la phase courante
    const { data: phases } = await supabase
      .from('feedback_phases')
      .select('phase')
      .eq('project_id', id)
      .order('phase', { ascending: false })
      .limit(1)

    const currentPhase = phases && phases.length > 0 ? phases[0].phase : 1

    // Lire le paramètre de phase depuis la query
    const { searchParams } = new URL(request.url)
    const phaseParam = searchParams.get('phase')
    const targetPhase = phaseParam ? parseInt(phaseParam, 10) : currentPhase

    // Récupérer les retours pour cette phase
    const { data: feedback, error } = await supabase
      .from('client_feedback')
      .select('*')
      .eq('project_id', id)
      .eq('phase', targetPhase)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Calculer les statistiques
    const total = feedback?.length ?? 0
    const pending = feedback?.filter(f => f.status === 'pending').length ?? 0
    const inProgress = feedback?.filter(f => f.status === 'in_progress').length ?? 0
    const treated = feedback?.filter(f => f.status === 'treated').length ?? 0
    const questions = feedback?.filter(f => f.type === 'question').length ?? 0

    return NextResponse.json({
      data: {
        feedback: feedback ?? [],
        stats: { total, pending, in_progress: inProgress, treated, questions },
        current_phase: currentPhase,
      },
    })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST /api/projects/[id]/feedback
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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

    const body = await request.json()
    const parsed = feedbackCreateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    // Déterminer la phase
    let phase = parsed.data.phase
    if (!phase) {
      const { data: phases } = await supabase
        .from('feedback_phases')
        .select('phase')
        .eq('project_id', id)
        .order('phase', { ascending: false })
        .limit(1)
      phase = phases && phases.length > 0 ? phases[0].phase : 1
    }

    // S'assurer que la ligne feedback_phases existe
    await supabase
      .from('feedback_phases')
      .upsert(
        { project_id: id, phase },
        { onConflict: 'project_id,phase', ignoreDuplicates: true }
      )

    const { data, error } = await supabase
      .from('client_feedback')
      .insert({
        project_id: id,
        deliverable_id: parsed.data.deliverable_id ?? null,
        phase,
        title: parsed.data.title,
        content: parsed.data.content ?? null,
        type: parsed.data.type,
        status: 'pending',
        source: parsed.data.source,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ data }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
