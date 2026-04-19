import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export interface SearchResult {
  id: string
  label: string
  sub?: string
  href: string
  type: 'project' | 'milestone' | 'meeting' | 'client'
}

export interface SearchResponse {
  projects: SearchResult[]
  milestones: SearchResult[]
  meetings: SearchResult[]
  clients: SearchResult[]
}

export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams.get('q')?.trim()
    if (!q || q.length < 2) {
      return NextResponse.json({ projects: [], milestones: [], meetings: [], clients: [] })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const admin = createAdminClient()
    const term = `%${q}%`

    // Récupérer les IDs de projets de l'utilisateur
    const { data: userProjects } = await admin
      .from('projects')
      .select('id')
      .eq('user_id', user.id)

    const projectIds = userProjects?.map((p) => p.id) ?? []

    const [projectsRes, milestonesRes, meetingsRes, clientsRes] = await Promise.all([
      // Projets
      admin
        .from('projects')
        .select('id, name, status')
        .eq('user_id', user.id)
        .or(`name.ilike.${term},description.ilike.${term}`)
        .limit(5),

      // Jalons (timeline)
      projectIds.length > 0
        ? admin
            .from('project_milestones')
            .select('id, title, description, project_id, projects(id, name)')
            .in('project_id', projectIds)
            .or(`title.ilike.${term},description.ilike.${term}`)
            .limit(5)
        : Promise.resolve({ data: [], error: null }),

      // Réunions
      projectIds.length > 0
        ? admin
            .from('project_meetings')
            .select('id, title, scheduled_at, project_id, projects(id, name)')
            .in('project_id', projectIds)
            .or(`title.ilike.${term},notes.ilike.${term}`)
            .limit(5)
        : Promise.resolve({ data: [], error: null }),

      // Clients
      admin
        .from('clients')
        .select('id, name, company, vat_number, email')
        .eq('user_id', user.id)
        .or(`name.ilike.${term},company.ilike.${term},vat_number.ilike.${term},email.ilike.${term}`)
        .limit(5),
    ])

    const statusLabels: Record<string, string> = {
      active: 'Actif',
      paused: 'En pause',
      completed: 'Terminé',
      archived: 'Archivé',
    }

    const projects: SearchResult[] = (projectsRes.data ?? []).map((p) => ({
      id: p.id,
      type: 'project',
      label: p.name,
      sub: statusLabels[p.status as string] ?? p.status,
      href: `/dashboard/projects/${p.id}`,
    }))

    const milestones: SearchResult[] = (milestonesRes.data ?? []).map((m: any) => ({
      id: m.id,
      type: 'milestone',
      label: m.title,
      sub: m.projects?.name ?? '',
      href: `/dashboard/projects/${m.project_id}/milestones`,
    }))

    const meetings: SearchResult[] = (meetingsRes.data ?? []).map((m: any) => ({
      id: m.id,
      type: 'meeting',
      label: m.title,
      sub: m.projects?.name ?? '',
      href: `/dashboard/projects/${m.project_id}/meetings`,
    }))

    const clients: SearchResult[] = (clientsRes.data ?? []).map((c) => ({
      id: c.id,
      type: 'client',
      label: c.name,
      sub: [c.company, c.vat_number].filter(Boolean).join(' · ') || c.email || '',
      href: `/dashboard/clients/${c.id}`,
    }))

    return NextResponse.json({ projects, milestones, meetings, clients })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
