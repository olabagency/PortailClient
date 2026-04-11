'use client'

import { useState, useCallback } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
  closestCorners,
} from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Plus, X, Check, LayoutGrid, List, Eye, EyeOff, Circle, AlertCircle, ArrowUp, Flame } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { KanbanColumn as KanbanColumnType, KanbanTask } from '@/types/kanban'
import { KanbanColumn } from './KanbanColumn'
import { TaskCard } from './TaskCard'
import { TaskModal } from './TaskModal'
import { toast } from 'sonner'

interface KanbanBoardProps {
  projectId: string
  initialColumns: KanbanColumnType[]
  initialTasks: Record<string, KanbanTask[]>
}

const PRIORITY_CONFIG = {
  low:    { label: 'Faible',  icon: Circle,       color: 'text-gray-400' },
  medium: { label: 'Normale', icon: ArrowUp,      color: 'text-blue-500' },
  high:   { label: 'Haute',   icon: AlertCircle,  color: 'text-orange-500' },
  urgent: { label: 'Urgente', icon: Flame,        color: 'text-red-500' },
}

// ── Vue liste ───────────────────────────────────────────────────────────────

function ListView({
  columns,
  tasks,
  onEditTask,
  onAddTask,
}: {
  columns: KanbanColumnType[]
  tasks: Record<string, KanbanTask[]>
  onEditTask: (t: KanbanTask) => void
  onAddTask: (colId: string) => void
}) {
  const allTasks = columns.flatMap(col => (tasks[col.id] ?? []).map(t => ({ ...t, colName: col.name, colColor: col.color })))
  const total = allTasks.length
  const done = allTasks.filter(t => {
    const col = columns.find(c => c.id === t.column_id)
    return col && col.order_index === Math.max(...columns.map(c => c.order_index))
  }).length

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground px-1">
        <span>{total} tâche{total !== 1 ? 's' : ''}</span>
        {total > 0 && (
          <>
            <span>·</span>
            <span>{done} terminée{done !== 1 ? 's' : ''}</span>
            <div className="flex-1 max-w-32 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${total > 0 ? Math.round((done / total) * 100) : 0}%` }}
              />
            </div>
          </>
        )}
      </div>

      {columns.map(col => {
        const colTasks = tasks[col.id] ?? []
        return (
          <div key={col.id} className="border rounded-xl overflow-hidden">
            {/* Column header */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b">
              <div className="flex items-center gap-2">
                {col.color && (
                  <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: col.color }} />
                )}
                <span className="font-medium text-sm">{col.name}</span>
                <Badge variant="secondary" className="text-xs h-4 px-1.5">{colTasks.length}</Badge>
              </div>
              <button
                onClick={() => onAddTask(col.id)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                Ajouter
              </button>
            </div>

            {/* Tasks */}
            {colTasks.length === 0 ? (
              <div className="px-4 py-4 text-center text-xs text-muted-foreground">
                Aucune tâche dans cette colonne
              </div>
            ) : (
              <div className="divide-y">
                {colTasks.map(task => {
                  const priority = task.priority ? PRIORITY_CONFIG[task.priority] : null
                  const PIcon = priority?.icon
                  return (
                    <button
                      key={task.id}
                      onClick={() => onEditTask(task)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left transition-colors group"
                    >
                      {PIcon && (
                        <PIcon className={`h-3.5 w-3.5 shrink-0 ${priority?.color}`} />
                      )}
                      {!priority && <div className="h-3.5 w-3.5 shrink-0" />}
                      <span className="flex-1 text-sm font-medium truncate">{task.title}</span>
                      {task.due_date && (
                        <span className="text-xs text-muted-foreground shrink-0 hidden sm:block">
                          {format(new Date(task.due_date), 'd MMM', { locale: fr })}
                        </span>
                      )}
                      {task.visible_to_client
                        ? <Eye className="h-3.5 w-3.5 text-green-500 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                        : <EyeOff className="h-3.5 w-3.5 text-gray-300 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── KanbanBoard ─────────────────────────────────────────────────────────────

export function KanbanBoard({ projectId, initialColumns, initialTasks }: KanbanBoardProps) {
  const [columns, setColumns] = useState<KanbanColumnType[]>(initialColumns)
  const [tasks, setTasks] = useState<Record<string, KanbanTask[]>>(initialTasks)
  const [activeTask, setActiveTask] = useState<KanbanTask | null>(null)
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board')

  // Modal état
  const [modalOpen, setModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<KanbanTask | null>(null)
  const [defaultColumnId, setDefaultColumnId] = useState<string | undefined>()

  // Ajout de colonne
  const [isAddingColumn, setIsAddingColumn] = useState(false)
  const [newColumnName, setNewColumnName] = useState('')

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  // --- Gestion des tâches ---

  const handleAddTask = useCallback((columnId: string) => {
    setEditingTask(null)
    setDefaultColumnId(columnId)
    setModalOpen(true)
  }, [])

  const handleEditTask = useCallback((task: KanbanTask) => {
    setEditingTask(task)
    setDefaultColumnId(undefined)
    setModalOpen(true)
  }, [])

  const handleSaveTask = async (values: Partial<KanbanTask>) => {
    if (editingTask) {
      // Mise à jour
      const res = await fetch(`/api/projects/${projectId}/tasks/${editingTask.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error ?? 'Erreur lors de la mise à jour'); return }

      const updated: KanbanTask = json.data
      setTasks((prev) => {
        const next = { ...prev }
        // Retirer de l'ancienne colonne si changement
        const oldColId = editingTask.column_id
        next[oldColId] = (next[oldColId] ?? []).filter((t) => t.id !== editingTask.id)
        // Ajouter dans la nouvelle colonne
        const newColId = updated.column_id
        next[newColId] = [...(next[newColId] ?? []), updated].sort((a, b) => a.order_index - b.order_index)
        return next
      })
      toast.success('Tâche mise à jour')
    } else {
      // Création
      const colId = values.column_id ?? defaultColumnId ?? columns[0]?.id
      const res = await fetch(`/api/projects/${projectId}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, column_id: colId }),
      })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error ?? 'Erreur lors de la création'); return }

      const newTask: KanbanTask = json.data
      setTasks((prev) => ({
        ...prev,
        [newTask.column_id]: [...(prev[newTask.column_id] ?? []), newTask],
      }))
      toast.success('Tâche créée')
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    const columnId = Object.keys(tasks).find((colId) =>
      tasks[colId].some((t) => t.id === taskId)
    )
    if (!columnId) return

    const res = await fetch(`/api/projects/${projectId}/tasks/${taskId}`, { method: 'DELETE' })
    if (!res.ok) { toast.error('Erreur lors de la suppression'); return }

    setTasks((prev) => ({
      ...prev,
      [columnId]: prev[columnId].filter((t) => t.id !== taskId),
    }))
    toast.success('Tâche supprimée')
  }

  // --- Gestion des colonnes ---

  const handleAddColumn = async () => {
    if (!newColumnName.trim()) return
    const res = await fetch(`/api/projects/${projectId}/columns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newColumnName.trim() }),
    })
    const json = await res.json()
    if (!res.ok) { toast.error(json.error ?? 'Erreur lors de la création'); return }

    setColumns((prev) => [...prev, json.data])
    setTasks((prev) => ({ ...prev, [json.data.id]: [] }))
    setNewColumnName('')
    setIsAddingColumn(false)
    toast.success('Colonne ajoutée')
  }

  const handleEditColumn = async (columnId: string, data: { name?: string; color?: string }) => {
    const res = await fetch(`/api/projects/${projectId}/columns/${columnId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const json = await res.json()
    if (!res.ok) { toast.error(json.error ?? 'Erreur'); return }

    setColumns((prev) => prev.map((c) => c.id === columnId ? json.data : c))
  }

  const handleDeleteColumn = async (columnId: string) => {
    const res = await fetch(`/api/projects/${projectId}/columns/${columnId}`, { method: 'DELETE' })
    if (!res.ok) { toast.error('Erreur lors de la suppression'); return }

    setColumns((prev) => prev.filter((c) => c.id !== columnId))
    setTasks((prev) => {
      const next = { ...prev }
      delete next[columnId]
      return next
    })
    toast.success('Colonne supprimée')
  }

  // --- Drag & Drop ---

  const findColumnOfTask = (taskId: string) => {
    return Object.keys(tasks).find((colId) => tasks[colId].some((t) => t.id === taskId))
  }

  const handleDragStart = (event: DragStartEvent) => {
    const taskId = event.active.id as string
    const colId = findColumnOfTask(taskId)
    if (colId) {
      setActiveTask(tasks[colId].find((t) => t.id === taskId) ?? null)
    }
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event
    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    const activeColId = findColumnOfTask(activeId)
    if (!activeColId) return

    // over peut être une colonne ou une tâche
    const overColId = columns.find((c) => c.id === overId)
      ? overId
      : findColumnOfTask(overId)

    if (!overColId || activeColId === overColId) return

    setTasks((prev) => {
      const activeTask = prev[activeColId].find((t) => t.id === activeId)
      if (!activeTask) return prev

      const next = { ...prev }
      next[activeColId] = next[activeColId].filter((t) => t.id !== activeId)
      next[overColId] = [...(next[overColId] ?? []), { ...activeTask, column_id: overColId }]
      return next
    })
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveTask(null)

    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    const activeColId = findColumnOfTask(activeId)
    if (!activeColId) return

    const overColId = columns.find((c) => c.id === overId)
      ? overId
      : findColumnOfTask(overId) ?? activeColId

    // Réordonner dans la même colonne
    if (activeColId === overColId && activeId !== overId) {
      setTasks((prev) => {
        const colTasks = prev[activeColId]
        const oldIndex = colTasks.findIndex((t) => t.id === activeId)
        const newIndex = colTasks.findIndex((t) => t.id === overId)
        if (oldIndex === -1 || newIndex === -1) return prev

        const reordered = arrayMove(colTasks, oldIndex, newIndex).map((t, i) => ({
          ...t,
          order_index: i,
        }))

        // Persister
        fetch(`/api/projects/${projectId}/tasks/reorder`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: reordered.map((t) => ({ id: t.id, column_id: t.column_id, order_index: t.order_index })),
          }),
        })

        return { ...prev, [activeColId]: reordered }
      })
      return
    }

    // Déplacement entre colonnes (handleDragOver a déjà fait le déplacement visuel)
    // Persister le nouveau column_id
    const taskInNewCol = tasks[overColId]?.find((t) => t.id === activeId)
    if (taskInNewCol && activeColId !== overColId) {
      const reorderedCol = (tasks[overColId] ?? []).map((t, i) => ({ ...t, order_index: i }))

      fetch(`/api/projects/${projectId}/tasks/reorder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: reorderedCol.map((t) => ({ id: t.id, column_id: overColId, order_index: t.order_index })),
        }),
      })

      setTasks((prev) => ({
        ...prev,
        [overColId]: reorderedCol,
      }))
    }
  }

  const activeTaskColId = activeTask ? findColumnOfTask(activeTask.id) : null
  const allColumns = columns

  return (
    <div className="flex flex-col h-full">
      {/* View mode toggle */}
      <div className="flex items-center justify-end mb-3 gap-1">
        <button
          onClick={() => setViewMode('board')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${viewMode === 'board' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent'}`}
        >
          <LayoutGrid className="h-3.5 w-3.5" />
          Kanban
        </button>
        <button
          onClick={() => setViewMode('list')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent'}`}
        >
          <List className="h-3.5 w-3.5" />
          Liste
        </button>
      </div>

      {/* Vue liste */}
      {viewMode === 'list' && (
        <div className="flex-1 overflow-y-auto">
          <ListView
            columns={columns}
            tasks={tasks}
            onEditTask={handleEditTask}
            onAddTask={handleAddTask}
          />
          <TaskModal
            task={editingTask}
            columns={columns}
            projectId={projectId}
            open={modalOpen}
            defaultColumnId={defaultColumnId}
            onSave={handleSaveTask}
            onDelete={handleDeleteTask}
            onClose={() => { setModalOpen(false); setEditingTask(null) }}
          />
        </div>
      )}

      {/* Vue kanban */}
      {viewMode === 'board' && <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4 items-start">
          {allColumns.map((col) => (
            <KanbanColumn
              key={col.id}
              column={col}
              tasks={tasks[col.id] ?? []}
              onAddTask={handleAddTask}
              onEditTask={handleEditTask}
              onDeleteTask={handleDeleteTask}
              onEditColumn={handleEditColumn}
              onDeleteColumn={handleDeleteColumn}
            />
          ))}

          {/* Ajouter une colonne */}
          <div className="w-72 shrink-0">
            {isAddingColumn ? (
              <div className="flex items-center gap-1.5">
                <Input
                  value={newColumnName}
                  onChange={(e) => setNewColumnName(e.target.value)}
                  placeholder="Nom de la colonne"
                  className="h-8 text-sm"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddColumn()
                    if (e.key === 'Escape') { setIsAddingColumn(false); setNewColumnName('') }
                  }}
                />
                <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={handleAddColumn}>
                  <Check className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => { setIsAddingColumn(false); setNewColumnName('') }}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full border-dashed text-muted-foreground"
                onClick={() => setIsAddingColumn(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Ajouter une colonne
              </Button>
            )}
          </div>
        </div>

        <DragOverlay>
          {activeTask && activeTaskColId ? (
            <div className="rotate-2 opacity-90">
              <TaskCard
                task={activeTask}
                onEdit={() => {}}
                onDelete={() => {}}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>}

      {/* Modal tâche (board view) */}
      {viewMode === 'board' && (
        <TaskModal
          task={editingTask}
          columns={columns}
          projectId={projectId}
          open={modalOpen}
          defaultColumnId={defaultColumnId}
          onSave={handleSaveTask}
          onDelete={handleDeleteTask}
          onClose={() => { setModalOpen(false); setEditingTask(null) }}
        />
      )}
    </div>
  )
}
