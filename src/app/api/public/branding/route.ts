import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/public/branding?project=<project_id>
// Endpoint public (no auth) — retourne les infos de branding du freelance pour la page d'inscription client
export async function GET(req: NextRequest) {
  try {
    const projectId = req.nextUrl.searchParams.get('project')
    if (!projectId) return NextResponse.json({ error: 'project requis' }, { status: 400 })

    const admin = createAdminClient()
    const { data: project } = await admin
      .from('projects')
      .select('name, user_id')
      .eq('id', projectId)
      .single()

    if (!project) return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 })

    const { data: profile } = await admin
      .from('profiles')
      .select('full_name, company_name, logo_url, avatar_url')
      .eq('id', project.user_id)
      .single()

    return NextResponse.json({
      data: {
        project_name: project.name,
        freelancer_name: profile?.full_name ?? null,
        company_name: profile?.company_name ?? null,
        logo_url: profile?.logo_url ?? null,
        avatar_url: profile?.avatar_url ?? null,
      },
    })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
