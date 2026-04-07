import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'

const fieldUpdateSchema = z.object({
  label: z.string().min(1).max(200).optional(),
  description: z.string().max(500).optional().or(z.literal('')),
  placeholder: z.string().max(200).optional().or(z.literal('')),
  required: z.boolean().optional(),
  sensitive: z.boolean().optional(),
  options: z.array(z.string()).optional().nullable(),
  section_id: z.string().uuid().optional().nullable(),
  order_index: z.number().int().min(0).optional(),
})

async function verifyOwnership(supabase: SupabaseClient, projectId: string, userId: string) {
  const { data } = await supabase.from('projects').select('id').eq('id', projectId).eq('user_id', userId).single()
  return !!data
}

// PUT /api/projects/[id]/fields/[fieldId]
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string; fieldId: string }> }) {
  try {
    const { id, fieldId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    if (!await verifyOwnership(supabase, id, user.id)) return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 })

    const body = await request.json()
    const parsed = fieldUpdateSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

    const { data, error } = await supabase
      .from('form_fields')
      .update(parsed.data)
      .eq('id', fieldId)
      .eq('project_id', id)
      .select()
      .single()

    if (error || !data) return NextResponse.json({ error: 'Champ introuvable' }, { status: 404 })

    return NextResponse.json({ data })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// DELETE /api/projects/[id]/fields/[fieldId]
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string; fieldId: string }> }) {
  try {
    const { id, fieldId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    if (!await verifyOwnership(supabase, id, user.id)) return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 })

    const { error } = await supabase.from('form_fields').delete().eq('id', fieldId).eq('project_id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ data: { success: true } })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
