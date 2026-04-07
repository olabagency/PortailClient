'use client'

import { useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Plus, Pencil, Palette, Trash2, Check, X } from 'lucide-react'
import { KanbanColumn as KanbanColumnType, KanbanTask } from '@/types/kanban'
import { TaskCard } from './TaskCard'

interface KanbanColumnProps {
  column: KanbanColumnType
  tasks: KanbanTask[]
  onAddTask: (columnId: string) => void
  onEditTask: (task: KanbanTask) => void
  onDeleteTask: (taskId: string) => void
  onEditColumn: (columnId: string, data: { name?: string; color?: string }) => Promise<void>
  onDeleteColumn: (columnId: string) => Promise<void>
}

const PRESET_COLORS = [
  '#6B7280', '#3B82F6', '#F59E0B', '#10B981',
  '#EF4444', '#8B5CF6', '#EC4899', '#F97316',
  '#06B6D4', '#84CC16',
]

export function KanbanColumn({
  column,
  tasks,
  onAddTask,
  onEditTask,
  onDeleteTask,
  onEditColumn,
  onDeleteColumn,
}: KanbanColumnProps) {
  const [isRenaming, setIsRenaming] = useState(false)
  const [newName, setNewName] = useState(column.name)
  const [isPickingColor, setIsPickingColor] = useState(false)

  const { setNodeRef, isOver } = useDroppable({ id: column.id })

  const handleRenameSubmit = async () => {
    if (newName.trim() && newName.trim() !== column.name) {
      await onEditColumn(column.id, { name: newName.trim() })
    }
    setIsRenaming(false)
  }

  const handleColorChange = async (color: string) => {
    await onEditColumn(column.id, { color })
    setIsPickingColor(false)
  }

  return (
    <div className="flex flex-col w-72 shrink-0">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div
          className="h-3 w-3 rounded-full shrink-0"
          style={{ backgroundColor: column.color }}
        />

        {isRenaming ? (
          <div className="flex items-center gap-1 flex-1 min-w-0">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRenameSubmit()
                if (e.key === 'Escape') { setIsRenaming(false); setNewName(column.name) }
              }}
              className="h-7 text-sm px-2"
              autoFocus
            />
            <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={handleRenameSubmit}>
              <Check className="h-3.5 w-3.5" />
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => { setIsRenaming(false); setNewName(column.name) }}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          <span className="text-sm font-semibold flex-1 truncate">{column.name}</span>
        )}

        <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full shrink-0">
          {tasks.length}
        </span>

        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
            <MoreHorizontal className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={() => setIsRenaming(true)}>
              <Pencil className="h-4 w-4 mr-2" />
              Renommer
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setIsPickingColor(true)}>
              <Palette className="h-4 w-4 mr-2" />
              Changer la couleur
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => onDeleteColumn(column.id)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Supprimer
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Sélecteur de couleur */}
      {isPickingColor && (
        <div className="mb-3 p-2 bg-card border border-border rounded-lg">
          <p className="text-xs text-muted-foreground mb-2">Choisir une couleur</p>
          <div className="grid grid-cols-5 gap-1.5">
            {PRESET_COLORS.map((color) => (
              <button
                key={color}
                className="h-6 w-6 rounded-full border-2 transition-transform hover:scale-110"
                style={{
                  backgroundColor: color,
                  borderColor: color === column.color ? '#000' : 'transparent',
                }}
                onClick={() => handleColorChange(color)}
              />
            ))}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 w-full h-7 text-xs"
            onClick={() => setIsPickingColor(false)}
          >
            Annuler
          </Button>
        </div>
      )}

      {/* Conteneur des tâches */}
      <div
        ref={setNodeRef}
        className={`flex-1 flex flex-col gap-2 min-h-16 p-2 rounded-lg transition-colors ${
          isOver ? 'bg-accent/50' : 'bg-muted/40'
        }`}
      >
        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onEdit={onEditTask}
              onDelete={onDeleteTask}
            />
          ))}
        </SortableContext>

        {/* Bouton Ajouter une tâche */}
        <button
          onClick={() => onAddTask(column.id)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground py-1.5 px-2 rounded-md hover:bg-muted transition-colors w-full text-left"
        >
          <Plus className="h-3.5 w-3.5" />
          Ajouter une tâche
        </button>
      </div>
    </div>
  )
}
