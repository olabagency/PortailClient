'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Badge } from '@/components/ui/badge'
import { Eye, GripVertical } from 'lucide-react'
import { KanbanTask } from '@/types/kanban'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

const priorityConfig: Record<
  NonNullable<KanbanTask['priority']>,
  { label: string; className: string }
> = {
  low: { label: 'Basse', className: 'bg-gray-100 text-gray-700 border-gray-200' },
  medium: { label: 'Moyenne', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  high: { label: 'Haute', className: 'bg-orange-100 text-orange-700 border-orange-200' },
  urgent: { label: 'Urgente', className: 'bg-red-100 text-red-700 border-red-200' },
}

interface TaskCardProps {
  task: KanbanTask
  onEdit: (task: KanbanTask) => void
  onDelete: (taskId: string) => void
}

export function TaskCard({ task, onEdit }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white border border-border rounded-lg p-3 shadow-sm cursor-pointer hover:shadow-md transition-shadow group"
      onClick={() => onEdit(task)}
    >
      <div className="flex items-start gap-2">
        <div
          {...attributes}
          {...listeners}
          className="mt-0.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium leading-snug line-clamp-2">{task.title}</p>

          {task.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{task.description}</p>
          )}

          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            {task.priority && (
              <Badge
                variant="outline"
                className={`text-xs px-1.5 py-0 h-5 font-normal ${priorityConfig[task.priority].className}`}
              >
                {priorityConfig[task.priority].label}
              </Badge>
            )}

            {task.due_date && (
              <span className="text-xs text-muted-foreground">
                {format(new Date(task.due_date), 'd MMM', { locale: fr })}
              </span>
            )}

            {task.visible_to_client && (
              <Eye className="h-3.5 w-3.5 text-muted-foreground ml-auto" />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
