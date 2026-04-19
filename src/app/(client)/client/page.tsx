import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { FolderOpen, ArrowRight } from 'lucide-react'

interface Project {
  id: string
  name: string
  description: string | null
  status: string
  color: string | null
  created_at: string
  milestone_total: number
  milestone_done: number
}

const statusLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  active: { label: 'En cours', variant: 'default' },
  paused: { label: 'En pause', variant: 'secondary' },
  completed: { label: 'Terminé', variant: 'outline' },
}

export default async function ClientDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const admin = createAdminClient()

  // Chercher le client lié à cet user (via admin pour bypasser RLS)
  let { data: client } = await admin
    .from('clients')
    .select('id, name')
    .eq('user_id', user!.id)
    .single()

  // Fallback par email si user_id pas encore lié
  if (!client && user!.email) {
    const { data: clientByEmail } = await admin
      .from('clients')
      .select('id, name')
      .ilike('email', user!.email)
      .single()

    if (clientByEmail) {
      await admin
        .from('clients')
        .update({ user_id: user!.id })
        .eq('id', clientByEmail.id)
      client = clientByEmail
    }
  }

  if (!client) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center">
        <FolderOpen className="h-12 w-12 mx-auto text-gray-300 mb-4" />
        <h1 className="text-xl font-semibold text-gray-700 mb-2">Aucun projet associé</h1>
        <p className="text-gray-500 text-sm">
          Votre compte n'est pas encore lié à un projet. Contactez votre prestataire.
        </p>
      </div>
    )
  }

  const { data: projectsRaw } = await admin
    .from('projects')
    .select('id, name, description, status, color, created_at')
    .eq('client_id', client.id)
    .neq('status', 'archived')
    .order('created_at', { ascending: false })

  // Récupérer les jalons pour la progression (sans kanban qui bloque)
  const { data: milestones } = await admin
    .from('project_milestones')
    .select('project_id, status')
    .in('project_id', (projectsRaw ?? []).map(p => p.id))

  const projectList: Project[] = (projectsRaw ?? []).map(p => {
    const ms = (milestones ?? []).filter(m => m.project_id === p.id)
    return {
      ...p,
      milestone_total: ms.length,
      milestone_done: ms.filter(m => m.status === 'completed').length,
    }
  })

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Bonjour, {client.name} 👋</h1>
        <p className="text-gray-500 mt-1">Voici l'avancement de vos projets.</p>
      </div>

      {projectList.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FolderOpen className="h-10 w-10 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 text-sm">Aucun projet en cours pour le moment.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {projectList.map(project => {
            const progress = project.milestone_total > 0
              ? Math.round((project.milestone_done / project.milestone_total) * 100)
              : 0
            const statusInfo = statusLabels[project.status] ?? { label: project.status, variant: 'secondary' as const }

            return (
              <Link key={project.id} href={`/client/projects/${project.id}`}>
                <Card className="hover:shadow-md transition-all group overflow-hidden">
                  <CardContent className="p-0 flex items-stretch">
                    {/* Left color accent */}
                    <div
                      className="w-1.5 shrink-0 rounded-l-lg"
                      style={{ backgroundColor: project.color ?? '#386FA4' }}
                    />
                    <div className="flex-1 p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h2 className="font-semibold text-gray-900 truncate group-hover:text-primary transition-colors">{project.name}</h2>
                            <Badge variant={statusInfo.variant} className="shrink-0 text-xs">
                              {statusInfo.label}
                            </Badge>
                          </div>
                          {project.description && (
                            <p className="text-sm text-gray-500 truncate mb-3">{project.description}</p>
                          )}
                          {/* Progress bar */}
                          <div>
                            <div className="flex items-center justify-between text-xs text-gray-400 mb-1.5">
                              <span>Progression</span>
                              <span className="font-medium text-gray-600">{progress}%</span>
                            </div>
                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${progress}%`,
                                  background: progress === 100 ? '#22c55e' : 'linear-gradient(to right, #386FA4, #59A5D8)',
                                }}
                              />
                            </div>
                          </div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-gray-300 shrink-0 mt-1 group-hover:text-primary transition-colors" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
