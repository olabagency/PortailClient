import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/dashboard/stats
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    // Compter les projets actifs
    const { count: projectsCount } = await supabase
      .from('projects')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'active')

    // Compter les clients
    const { count: clientsCount } = await supabase
      .from('clients')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)

    // Récupérer les IDs des projets de l'utilisateur
    const { data: userProjects } = await supabase
      .from('projects')
      .select('id')
      .eq('user_id', user.id)

    const projectIds = (userProjects ?? []).map((p) => p.id)

    let activeTasks = 0
    if (projectIds.length > 0) {
      // Récupérer les colonnes "Terminé" pour ces projets
      const { data: doneColumns } = await supabase
        .from('kanban_columns')
        .select('id')
        .in('project_id', projectIds)
        .ilike('name', 'Terminé')

      const doneColumnIds = (doneColumns ?? []).map((c) => c.id)

      // Compter les tâches qui ne sont PAS dans les colonnes "Terminé"
      let query = supabase
        .from('kanban_tasks')
        .select('id', { count: 'exact', head: true })
        .in('project_id', projectIds)

      if (doneColumnIds.length > 0) {
        query = query.not('column_id', 'in', `(${doneColumnIds.join(',')})`)
      }

      const { count } = await query
      activeTasks = count ?? 0
    }

    return NextResponse.json({
      data: {
        projectsCount: projectsCount ?? 0,
        clientsCount: clientsCount ?? 0,
        activeTasks,
      },
    })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
