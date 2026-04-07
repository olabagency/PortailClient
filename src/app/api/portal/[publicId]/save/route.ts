import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const saveSchema = z.object({
  session_id: z.string().min(1).max(100),
  current_step: z.number().int().min(1).max(6),
  responses: z.record(z.string(), z.unknown()).optional().default({}),
  client_info: z.record(z.string(), z.unknown()).optional().default({}),
  respondent_email: z.string().email().optional().nullable(),
})

export async function POST(request: NextRequest, { params }: { params: Promise<{ publicId: string }> }) {
  try {
    const { publicId } = await params
    const supabase = await createClient()

    // Verify project exists
    const { data: project } = await supabase
      .from('projects')
      .select('id, status')
      .eq('public_id', publicId)
      .single()
    if (!project || project.status === 'archived') {
      return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 })
    }

    const body = await request.json()
    const parsed = saveSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const { session_id, current_step, responses, client_info, respondent_email } = parsed.data

    // Upsert by (project_id, session_id)
    const { data, error } = await supabase
      .from('form_responses')
      .upsert(
        {
          project_id: project.id,
          session_id,
          current_step,
          responses,
          client_info,
          respondent_email: respondent_email ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'project_id,session_id', ignoreDuplicates: false }
      )
      .select('id, current_step')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
