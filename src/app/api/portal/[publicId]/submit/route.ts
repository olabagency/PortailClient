import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const submitSchema = z.object({
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
      .select('id, status, settings')
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

    const { data, error } = await supabase
      .from('onboarding_responses')
      .insert({
        project_id: project.id,
        respondent_name: parsed.data.respondent_name || null,
        respondent_email: parsed.data.respondent_email || null,
        responses: parsed.data.responses,
        completed_at: new Date().toISOString(),
        ip_address: ipAddress,
      })
      .select('id')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ data: { id: data.id } }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
