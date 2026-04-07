import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const phaseSchema = z.object({
  current_phase: z.number().int().min(1),
})

// POST /api/projects/[id]/feedback/phase
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
    const parsed = phaseSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const { current_phase } = parsed.data
    const newPhase = current_phase + 1

    // Clôturer la phase courante
    await supabase
      .from('feedback_phases')
      .update({ closed_at: new Date().toISOString() })
      .eq('project_id', id)
      .eq('phase', current_phase)

    // Ouvrir la nouvelle phase
    await supabase
      .from('feedback_phases')
      .upsert(
        { project_id: id, phase: newPhase },
        { onConflict: 'project_id,phase', ignoreDuplicates: true }
      )

    return NextResponse.json({ data: { new_phase: newPhase } })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
