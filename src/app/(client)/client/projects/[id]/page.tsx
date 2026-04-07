import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, CheckSquare, Square, FolderOpen } from 'lucide-react'
import Link from 'next/link'

interface KanbanTask {
  id: string
  title: string
  description: string | null
  status: string
  priority: string | null
  due_date: string | null
  visible_to_client: boolean
}

interface KanbanColumn {
  id: string
  name: string
  color: string | null
  order_index: number
  kanban_tasks: KanbanTask[]
}

const priorityLabels: Record<string, string> = {
  low: 'Basse',
  medium: 'Normale',
  high: 'Haute',
  urgent: 'Urgente',
}

const statusLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  active: { label: 'En cours', variant: 'default' },
  paused: { label: 'En pause', variant: 'secondary' },
  completed: { label: 'Terminé', variant: 'outline' },
}

export default async function ClientProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Chercher le client lié à cet user
  const { data: client } = await supabase
    .from('clients')
    .select('id')
    .eq('user_id', user!.id)
    .single()

  if (!client) notFound()

  // Vérifier l'ownership client du projet
  const { data: project } = await supabase
    .from('projects')
    .select('id, name, description, status, color, created_at')
    .eq('id', id)
    .eq('client_id', client.id)
    .single()

  if (!project) notFound()

  // Récupérer les colonnes et tâches visibles
  const { data: columns } = await supabase
    .from('kanban_columns')
    .select(`
      id, name, color, order_index,
      kanban_tasks(id, title, description, status, priority, due_date, visible_to_client)
    `)
    .eq('project_id', id)
    .order('order_index')

  const sortedColumns = ((columns ?? []) as KanbanColumn[]).map(col => ({
    ...col,
    kanban_tasks: col.kanban_tasks.filter(t => t.visible_to_client),
  }))

  const allVisibleTasks = sortedColumns.flatMap(c => c.kanban_tasks)
  const totalTasks = allVisibleTasks.length
  const doneTasks = allVisibleTasks.filter(t => t.status === 'done' || t.status === 'completed').length
  const progressPercent = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0

  const statusInfo = statusLabels[project.status] ?? { label: project.status, variant: 'secondary' as const }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* En-tête */}
      <div className="flex items-center gap-3">
        <Link href="/client" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {project.color && (
              <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: project.color }} />
            )}
            <h1 className="text-2xl font-bold text-gray-900 truncate">{project.name}</h1>
            <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
          </div>
          {project.description && (
            <p className="text-gray-500 mt-0.5 text-sm">{project.description}</p>
          )}
        </div>
      </div>

      {/* Progression globale */}
      {totalTasks > 0 && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="font-medium">Progression du projet</span>
              <span className="text-muted-foreground">{doneTasks} / {totalTasks} tâches</span>
            </div>
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="text-right text-sm font-semibold mt-1 text-primary">{progressPercent}%</p>
          </CardContent>
        </Card>
      )}

      {/* Tâches par colonne */}
      {allVisibleTasks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FolderOpen className="h-10 w-10 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 text-sm">Aucune tâche visible pour le moment.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sortedColumns.map(column => {
            if (column.kanban_tasks.length === 0) return null
            const isDoneColumn = column.name.toLowerCase().includes('terminé') || column.name.toLowerCase().includes('done')

            return (
              <Card key={column.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    {column.color && (
                      <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: column.color }} />
                    )}
                    {column.name}
                    <Badge variant="secondary" className="ml-auto text-xs">
                      {column.kanban_tasks.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {column.kanban_tasks.map(task => (
                    <div key={task.id} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 border">
                      {isDoneColumn
                        ? <CheckSquare className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                        : <Square className="h-4 w-4 text-gray-300 mt-0.5 shrink-0" />
                      }
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800">{task.title}</p>
                        {task.description && (
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{task.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          {task.priority && (
                            <span className="text-xs text-muted-foreground">
                              Priorité : {priorityLabels[task.priority] ?? task.priority}
                            </span>
                          )}
                          {task.due_date && (
                            <span className="text-xs text-muted-foreground">
                              Échéance : {new Date(task.due_date).toLocaleDateString('fr-FR')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Section documents — placeholder */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">Documents</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Les documents partagés apparaîtront ici.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
