import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { FolderOpen, ArrowRight } from 'lucide-react'

interface KanbanTask {
  id: string
  status: string
}

interface KanbanColumn {
  kanban_tasks: KanbanTask[]
}

interface Project {
  id: string
  name: string
  description: string | null
  status: string
  color: string | null
  created_at: string
  kanban_columns: KanbanColumn[]
}

const statusLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  active: { label: 'En cours', variant: 'default' },
  paused: { label: 'En pause', variant: 'secondary' },
  completed: { label: 'Terminé', variant: 'outline' },
}

function computeProgress(project: Project): number {
  const allTasks = project.kanban_columns.flatMap(c => c.kanban_tasks)
  if (allTasks.length === 0) return 0
  const done = allTasks.filter(t => t.status === 'done' || t.status === 'completed').length
  return Math.round((done / allTasks.length) * 100)
}

export default async function ClientDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Chercher le client lié à cet user
  const { data: client } = await supabase
    .from('clients')
    .select('id, name')
    .eq('user_id', user!.id)
    .single()

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

  const { data: projects } = await supabase
    .from('projects')
    .select(`
      id, name, description, status, color, created_at,
      kanban_columns(kanban_tasks(id, status))
    `)
    .eq('client_id', client.id)
    .neq('status', 'archived')
    .order('created_at', { ascending: false })

  const projectList = (projects ?? []) as Project[]

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
            const progress = computeProgress(project)
            const statusInfo = statusLabels[project.status] ?? { label: project.status, variant: 'secondary' as const }

            return (
              <Link key={project.id} href={`/client/projects/${project.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {project.color && (
                            <div
                              className="h-2.5 w-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: project.color }}
                            />
                          )}
                          <h2 className="font-semibold text-gray-900 truncate">{project.name}</h2>
                          <Badge variant={statusInfo.variant} className="shrink-0 text-xs">
                            {statusInfo.label}
                          </Badge>
                        </div>
                        {project.description && (
                          <p className="text-sm text-gray-500 truncate">{project.description}</p>
                        )}
                        {/* Barre de progression */}
                        <div className="mt-3">
                          <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                            <span>Progression</span>
                            <span>{progress}%</span>
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                      </div>
                      <ArrowRight className="h-5 w-5 text-gray-300 shrink-0 mt-0.5" />
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
