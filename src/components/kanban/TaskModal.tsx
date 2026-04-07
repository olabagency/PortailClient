'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod/v4'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { KanbanColumn, KanbanTask } from '@/types/kanban'
import { Trash2 } from 'lucide-react'

const taskSchema = z.object({
  title: z.string().min(1, 'Le titre est requis').max(200),
  description: z.string().max(2000).optional(),
  column_id: z.string().uuid('Veuillez sélectionner une colonne'),
  priority: z.enum(['low', 'medium', 'high', 'urgent', 'none']).optional(),
  due_date: z.string().optional(),
  visible_to_client: z.boolean(),
})

type TaskFormValues = z.infer<typeof taskSchema>

interface TaskModalProps {
  task: KanbanTask | null
  columns: KanbanColumn[]
  projectId: string
  open: boolean
  defaultColumnId?: string
  onSave: (values: Partial<KanbanTask>) => Promise<void>
  onDelete: (taskId: string) => Promise<void>
  onClose: () => void
}

export function TaskModal({
  task,
  columns,
  open,
  defaultColumnId,
  onSave,
  onDelete,
  onClose,
}: TaskModalProps) {
  const isEditing = !!task

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: '',
      description: '',
      column_id: defaultColumnId ?? columns[0]?.id ?? '',
      priority: 'none',
      due_date: '',
      visible_to_client: false,
    },
  })

  useEffect(() => {
    if (open) {
      if (task) {
        form.reset({
          title: task.title,
          description: task.description ?? '',
          column_id: task.column_id,
          priority: task.priority ?? 'none',
          due_date: task.due_date ?? '',
          visible_to_client: task.visible_to_client,
        })
      } else {
        form.reset({
          title: '',
          description: '',
          column_id: defaultColumnId ?? columns[0]?.id ?? '',
          priority: 'none',
          due_date: '',
          visible_to_client: false,
        })
      }
    }
  }, [open, task, defaultColumnId, columns, form])

  const onSubmit = async (values: TaskFormValues) => {
    await onSave({
      ...values,
      priority: values.priority === 'none' ? null : values.priority,
      description: values.description || null,
      due_date: values.due_date || null,
    })
    onClose()
  }

  const handleDelete = async () => {
    if (task) {
      await onDelete(task.id)
      onClose()
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Modifier la tâche' : 'Nouvelle tâche'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Titre */}
          <div className="space-y-1.5">
            <Label htmlFor="title">Titre <span className="text-destructive">*</span></Label>
            <Input
              id="title"
              placeholder="Nom de la tâche"
              {...form.register('title')}
            />
            {form.formState.errors.title && (
              <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Détails optionnels..."
              rows={3}
              {...form.register('description')}
            />
          </div>

          {/* Colonne */}
          <div className="space-y-1.5">
            <Label>Colonne</Label>
            <Select
              value={form.watch('column_id')}
              onValueChange={(value) => form.setValue('column_id', value ?? '')}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner une colonne" />
              </SelectTrigger>
              <SelectContent>
                {columns.map((col) => (
                  <SelectItem key={col.id} value={col.id}>
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: col.color }} />
                      {col.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Priorité */}
          <div className="space-y-1.5">
            <Label>Priorité</Label>
            <Select
              value={form.watch('priority') ?? 'none'}
              onValueChange={(value) => form.setValue('priority', (value ?? 'none') as TaskFormValues['priority'])}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner une priorité" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Aucune</SelectItem>
                <SelectItem value="low">Basse</SelectItem>
                <SelectItem value="medium">Moyenne</SelectItem>
                <SelectItem value="high">Haute</SelectItem>
                <SelectItem value="urgent">Urgente</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date d'échéance */}
          <div className="space-y-1.5">
            <Label htmlFor="due_date">Date d&apos;échéance</Label>
            <Input
              id="due_date"
              type="date"
              {...form.register('due_date')}
            />
          </div>

          {/* Visible au client */}
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="visible_to_client">Visible au client</Label>
              <p className="text-xs text-muted-foreground">Le client pourra voir cette tâche</p>
            </div>
            <Switch
              id="visible_to_client"
              checked={form.watch('visible_to_client') ?? false}
              onCheckedChange={(checked) => form.setValue('visible_to_client', checked)}
            />
          </div>

          <DialogFooter className="flex-row gap-2 pt-2">
            {isEditing && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                className="mr-auto"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Supprimer
              </Button>
            )}
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
