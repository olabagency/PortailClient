import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const meetingCreateSchema = z.object({
  title: z.string().min(1, 'Le titre est requis').max(200),
  scheduled_at: z.string().min(1, 'La date est requise'),
  duration_min: z.number().int().min(1).optional().default(60),
  location: z.string().max(300).optional().nullable(),
  meeting_link: z.string().url('Lien invalide').optional().nullable().or(z.literal('')),
  notes: z.string().optional().nullable(),
  attendees: z.array(z.string()).optional().default([]),
  type: z.enum(['appel', 'visio', 'presentiel', 'autre']).optional().default('visio'),
})

// GET /api/projects/[id]/meetings
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    // Check project ownership
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 })
    }

    const { data, error } = await supabase
      .from('project_meetings')
      .select('*')
      .eq('project_id', id)
      .order('scheduled_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ data: data ?? [] })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST /api/projects/[id]/meetings
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    // Check project ownership
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 })
    }

    const body = await request.json()
    const parsed = meetingCreateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('project_meetings')
      .insert({
        project_id: id,
        title: parsed.data.title,
        scheduled_at: parsed.data.scheduled_at,
        duration_min: parsed.data.duration_min,
        location: parsed.data.location ?? null,
        meeting_link: parsed.data.meeting_link || null,
        notes: parsed.data.notes ?? null,
        attendees: parsed.data.attendees,
        type: parsed.data.type ?? 'visio',
      })
      .select('*')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ data }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
