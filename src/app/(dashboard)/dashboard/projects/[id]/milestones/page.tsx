'use client'

import { useState, useEffect, use, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import {
  SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy,
  useSortable, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  format, differenceInDays, isPast, parseISO, isToday, isTomorrow,
  isThisWeek,
} from 'date-fns'
import { fr } from 'date-fns/locale'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel, DropdownMenuGroup,
} from '@/components/ui/dropdown-menu'
import { Textarea } from '@/components/ui/textarea'
import {
  GripVertical, Plus, Pencil, Trash2, CheckCircle2, Clock, Circle,
  Eye, EyeOff, ListChecks, Link2, CalendarCheck, SendHorizonal,
  CalendarDays, AlertTriangle, Flag, Search, SlidersHorizontal,
  ChevronDown, ChevronRight, Copy, User, Tag, TrendingUp,
  LayoutList, GitBranch, ArrowUpDown, X, CheckCheck, Layers,
  CalendarRange, Zap, Target,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ReferenceItem {
  id: string
  name: string
}

type MilestoneStatus = 'pending' | 'in_progress' | 'completed'
type MilestonePriority = 'normal' | 'high' | 'urgent'
type SortBy = 'order' | 'due_date' | 'priority' | 'status' | 'title'
type ViewMode = 'timeline' | 'list'
type GroupBy = 'none' | 'status' | 'priority'

interface Milestone {
  id: string
  title: string
  description: string | null
  status: MilestoneStatus
  due_date: string | null
  start_date: string | null
  visible_to_client: boolean
  order_index: number
  reference_type: 'deliverable' | 'document' | 'onboarding' | null
  reference_id: string | null
  priority: MilestonePriority
  tags: string[]
  assigned_to: string | null
  completion_note: string | null
}

interface MilestoneFormData {
  title: string
  description: string
  status: MilestoneStatus
  due_date: string
  start_date: string
  visible_to_client: boolean
  reference_type: string
  reference_id: string
  priority: MilestonePriority
  tags: string
  assigned_to: string
  completion_note: string
}

const defaultForm = (): MilestoneFormData => ({
  title: '',
  description: '',
  status: 'pending',
  due_date: '',
  start_date: '',
  visible_to_client: true,
  reference_type: '',
  reference_id: '',
  priority: 'normal',
  tags: '',
  assigned_to: '',
  completion_note: '',
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_CYCLE: MilestoneStatus[] = ['pending', 'in_progress', 'completed']

function nextStatus(current: MilestoneStatus): MilestoneStatus {
  const idx = STATUS_CYCLE.indexOf(current)
  return STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length]
}

function statusLabel(status: MilestoneStatus): string {
  if (status === 'completed') return 'Terminé'
  if (status === 'in_progress') return 'En cours'
  return 'En attente'
}

function priorityLabel(priority: MilestonePriority): string {
  if (priority === 'urgent') return 'Urgent'
  if (priority === 'high') return 'Haute'
  return 'Normale'
}

type DueDateStatus = 'overdue' | 'today' | 'tomorrow' | 'week' | 'ok' | null

function getDueDateStatus(dueDate: string | null, status: MilestoneStatus): DueDateStatus {
  if (!dueDate || status === 'completed') return null
  const date = parseISO(dueDate)
  if (isPast(date) && !isToday(date)) return 'overdue'
  if (isToday(date)) return 'today'
  if (isTomorrow(date)) return 'tomorrow'
  if (isThisWeek(date, { locale: fr })) return 'week'
  return 'ok'
}

function getDueDateLabel(dueDate: string | null, status: MilestoneStatus): string | null {
  if (!dueDate || status === 'completed') return null
  const ds = getDueDateStatus(dueDate, status)
  if (ds === 'overdue') {
    const days = differenceInDays(new Date(), parseISO(dueDate))
    return `En retard de ${days}j`
  }
  if (ds === 'today') return "Aujourd'hui"
  if (ds === 'tomorrow') return 'Demain'
  if (ds === 'week') return 'Cette semaine'
  return null
}

function priorityWeight(p: MilestonePriority): number {
  return p === 'urgent' ? 3 : p === 'high' ? 2 : 1
}

function statusWeight(s: MilestoneStatus): number {
  return s === 'in_progress' ? 1 : s === 'pending' ? 2 : 3
}

function getReferenceLabel(
  m: Milestone,
  deliverables: ReferenceItem[],
  documents: ReferenceItem[],
): string | null {
  if (!m.reference_type) return null
  if (m.reference_type === 'onboarding') return "Lié à l'onboarding"
  if (m.reference_type === 'deliverable') {
    const found = deliverables.find(d => d.id === m.reference_id)
    return found ? found.name : 'Livrable référencé'
  }
  if (m.reference_type === 'document') {
    const found = documents.find(d => d.id === m.reference_id)
    return found ? found.name : 'Document référencé'
  }
  return null
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function parseTags(input: string): string[] {
  return input
    .split(',')
    .map(t => t.trim())
    .filter(Boolean)
}

// ---------------------------------------------------------------------------
// StatusNode
// ---------------------------------------------------------------------------

function StatusNode({
  status,
  onClick,
  size = 'md',
}: {
  status: MilestoneStatus
  onClick: () => void
  size?: 'sm' | 'md'
}) {
  const sz = size === 'sm' ? 'h-7 w-7' : 'h-9 w-9'
  const iconSz = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'
  return (
    <button
      onClick={onClick}
      className={cn(
        'relative z-10 flex shrink-0 items-center justify-center rounded-full border-2 transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary/30',
        sz,
        status === 'completed' && 'border-emerald-500 bg-emerald-50 text-emerald-600 shadow-emerald-100 shadow-sm',
        status === 'in_progress' && 'border-blue-500 bg-blue-50 text-blue-600 shadow-blue-100 shadow-sm',
        status === 'pending' && 'border-gray-300 bg-white text-gray-400',
      )}
      title={`${statusLabel(status)} — cliquer pour changer`}
    >
      {status === 'completed' && <CheckCircle2 className={iconSz} />}
      {status === 'in_progress' && <Clock className={cn(iconSz, 'animate-pulse')} />}
      {status === 'pending' && <Circle className={iconSz} />}
    </button>
  )
}

// ---------------------------------------------------------------------------
// PriorityStripe
// ---------------------------------------------------------------------------

function PriorityStripe({ priority }: { priority: MilestonePriority }) {
  return (
    <div
      className={cn(
        'absolute inset-y-0 left-0 w-1 rounded-l-xl transition-colors',
        priority === 'urgent' && 'bg-red-500',
        priority === 'high' && 'bg-orange-400',
        priority === 'normal' && 'bg-transparent',
      )}
    />
  )
}

// ---------------------------------------------------------------------------
// StatCard
// ---------------------------------------------------------------------------

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  sub,
}: {
  icon: React.ElementType
  label: string
  value: string | number
  color: string
  sub?: string
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-card p-4 shadow-sm">
      <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', color)}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-muted-foreground">{label}</p>
        <p className="text-xl font-bold leading-tight">{value}</p>
        {sub && <p className="truncate text-xs text-muted-foreground">{sub}</p>}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// SortableMilestone (Timeline view)
// ---------------------------------------------------------------------------

function SortableMilestone({
  milestone,
  isLast,
  isToday: isTodayMarker,
  onStatusToggle,
  onEdit,
  onDelete,
  onDuplicate,
  onRequestValidation,
  sendingValidationId,
  referenceLabel,
}: {
  milestone: Milestone
  isLast: boolean
  isToday?: boolean
  onStatusToggle: (id: string, next: MilestoneStatus) => void
  onEdit: (m: Milestone) => void
  onDelete: (id: string) => void
  onDuplicate: (m: Milestone) => void
  onRequestValidation: (id: string) => void
  sendingValidationId: string | null
  referenceLabel?: string
}) {
  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging,
  } = useSortable({ id: milestone.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  const [expanded, setExpanded] = useState(false)

  const dueDateStatus = getDueDateStatus(milestone.due_date, milestone.status)
  const dueDateLabel = getDueDateLabel(milestone.due_date, milestone.status)
  const priority = milestone.priority ?? 'normal'
  const tags = milestone.tags ?? []

  return (
    <div ref={setNodeRef} style={style} className="flex gap-4 group">
      {/* Timeline column */}
      <div className="flex flex-col items-center">
        {isTodayMarker && (
          <div className="mb-1 flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
            <span>Aujourd&apos;hui</span>
          </div>
        )}
        <StatusNode
          status={milestone.status}
          onClick={() => onStatusToggle(milestone.id, nextStatus(milestone.status))}
        />
        {!isLast && (
          <div className={cn(
            'mt-1 w-0.5 flex-1 min-h-[2rem]',
            milestone.status === 'completed' ? 'bg-emerald-200' : 'bg-border',
          )} />
        )}
      </div>

      {/* Card */}
      <div
        className={cn(
          'relative mb-4 flex-1 overflow-hidden rounded-xl border bg-card shadow-sm transition-all hover:shadow-md',
          isDragging && 'shadow-lg ring-2 ring-primary/30',
          milestone.status === 'completed' && 'opacity-70',
        )}
      >
        <PriorityStripe priority={priority} />

        {/* Card header */}
        <div className="flex items-start justify-between gap-3 pl-5 pr-4 pt-4 pb-2">
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            {/* Top row: badges */}
            <div className="flex flex-wrap items-center gap-1.5">
              {/* Status badge */}
              <Badge
                variant="outline"
                className={cn(
                  'text-xs h-5 px-1.5',
                  milestone.status === 'completed' && 'border-emerald-200 bg-emerald-50 text-emerald-700',
                  milestone.status === 'in_progress' && 'border-blue-200 bg-blue-50 text-blue-700',
                  milestone.status === 'pending' && 'border-gray-200 bg-gray-50 text-gray-600',
                )}
              >
                {statusLabel(milestone.status)}
              </Badge>

              {/* Priority badge */}
              {priority !== 'normal' && (
                <Badge
                  variant="outline"
                  className={cn(
                    'text-xs h-5 px-1.5',
                    priority === 'urgent' && 'border-red-200 bg-red-50 text-red-700',
                    priority === 'high' && 'border-orange-200 bg-orange-50 text-orange-700',
                  )}
                >
                  <Flag className="mr-1 h-2.5 w-2.5" />
                  {priorityLabel(priority)}
                </Badge>
              )}

              {/* Due date urgency */}
              {dueDateStatus === 'overdue' && (
                <Badge variant="destructive" className="text-xs h-5 px-1.5">
                  <AlertTriangle className="mr-1 h-2.5 w-2.5" />
                  {dueDateLabel}
                </Badge>
              )}
              {dueDateStatus === 'today' && (
                <Badge variant="outline" className="border-red-200 bg-red-50 text-xs h-5 px-1.5 text-red-700">
                  <Zap className="mr-1 h-2.5 w-2.5" />
                  {dueDateLabel}
                </Badge>
              )}
              {dueDateStatus === 'tomorrow' && (
                <Badge variant="outline" className="border-orange-200 bg-orange-50 text-xs h-5 px-1.5 text-orange-700">
                  <Clock className="mr-1 h-2.5 w-2.5" />
                  {dueDateLabel}
                </Badge>
              )}
              {dueDateStatus === 'week' && (
                <Badge variant="outline" className="border-yellow-200 bg-yellow-50 text-xs h-5 px-1.5 text-yellow-700">
                  <CalendarDays className="mr-1 h-2.5 w-2.5" />
                  {dueDateLabel}
                </Badge>
              )}

              {/* Tags */}
              {tags.slice(0, 3).map(tag => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-0.5 rounded-full border border-violet-200 bg-violet-50 px-1.5 text-[10px] font-medium text-violet-700 h-5"
                >
                  {tag}
                </span>
              ))}
              {tags.length > 3 && (
                <span className="text-[10px] text-muted-foreground">+{tags.length - 3}</span>
              )}
            </div>

            {/* Title row */}
            <div className="flex items-center gap-2">
              {/* Drag handle */}
              <button
                {...attributes}
                {...listeners}
                className="cursor-grab shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
              >
                <GripVertical className="h-4 w-4" />
              </button>

              <button
                onClick={() => setExpanded(e => !e)}
                className="flex items-center gap-1.5 text-left"
              >
                <span
                  className={cn(
                    'text-sm font-semibold',
                    milestone.status === 'completed' && 'line-through text-muted-foreground',
                  )}
                >
                  {milestone.title}
                </span>
                {milestone.description && (
                  expanded
                    ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    : <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                )}
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            {milestone.status !== 'completed' && (
              <button
                onClick={() => onStatusToggle(milestone.id, 'completed')}
                className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-emerald-50 hover:text-emerald-600"
                title="Marquer comme terminé"
              >
                <CheckCheck className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              onClick={() => onRequestValidation(milestone.id)}
              disabled={sendingValidationId === milestone.id}
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary disabled:opacity-50"
              title="Demander la validation au client"
            >
              <SendHorizonal className={cn('h-3.5 w-3.5', sendingValidationId === milestone.id && 'animate-pulse')} />
            </button>
            <button
              onClick={() => onEdit(milestone)}
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              title="Modifier"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
                <ChevronDown className="h-3.5 w-3.5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onClick={() => onDuplicate(milestone)}>
                  <Copy className="mr-2 h-3.5 w-3.5" />
                  Dupliquer
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onDelete(milestone.id)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-3.5 w-3.5" />
                  Supprimer
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Expandable description */}
        {expanded && milestone.description && (
          <p className="px-5 pb-2 text-sm text-muted-foreground leading-relaxed">
            {milestone.description}
          </p>
        )}

        {/* Completion note */}
        {expanded && milestone.completion_note && milestone.status === 'completed' && (
          <div className="mx-5 mb-2 rounded-lg border border-emerald-100 bg-emerald-50/60 px-3 py-2">
            <p className="text-xs font-medium text-emerald-700 mb-0.5">Note de clôture</p>
            <p className="text-xs text-emerald-600">{milestone.completion_note}</p>
          </div>
        )}

        {/* Reference */}
        {referenceLabel && (
          <div className="mx-5 mb-2 flex items-center gap-1.5 rounded-md bg-muted/50 px-2 py-1.5">
            <Link2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{referenceLabel}</span>
          </div>
        )}

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t bg-muted/20 px-5 py-2 text-xs text-muted-foreground rounded-b-xl">
          {/* Date range */}
          <div className="flex items-center gap-1.5">
            <CalendarRange className="h-3.5 w-3.5 shrink-0" />
            {milestone.start_date || milestone.due_date ? (
              <span className={cn(
                (dueDateStatus === 'overdue' || dueDateStatus === 'today') && 'font-medium text-destructive',
                dueDateStatus === 'tomorrow' && 'font-medium text-orange-600',
              )}>
                {milestone.start_date
                  ? `${format(parseISO(milestone.start_date), 'd MMM', { locale: fr })} → `
                  : ''}
                {milestone.due_date
                  ? format(parseISO(milestone.due_date), 'd MMM yyyy', { locale: fr })
                  : 'Sans échéance'}
              </span>
            ) : (
              <span className="italic">Pas de date</span>
            )}
          </div>

          {/* Assignee */}
          {milestone.assigned_to && (
            <div className="flex items-center gap-1.5">
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[9px] font-bold text-primary">
                {getInitials(milestone.assigned_to)}
              </div>
              <span>{milestone.assigned_to}</span>
            </div>
          )}

          {/* Visibility */}
          <div
            className="flex items-center gap-1"
            title={milestone.visible_to_client ? 'Visible par le client' : 'Masqué au client'}
          >
            {milestone.visible_to_client
              ? <Eye className="h-3.5 w-3.5" />
              : <EyeOff className="h-3.5 w-3.5" />
            }
            <span>{milestone.visible_to_client ? 'Visible' : 'Masqué'}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// List row (compact view)
// ---------------------------------------------------------------------------

function ListRow({
  milestone,
  onStatusToggle,
  onEdit,
  onDelete,
  onDuplicate,
  onRequestValidation,
  sendingValidationId,
}: {
  milestone: Milestone
  onStatusToggle: (id: string, next: MilestoneStatus) => void
  onEdit: (m: Milestone) => void
  onDelete: (id: string) => void
  onDuplicate: (m: Milestone) => void
  onRequestValidation: (id: string) => void
  sendingValidationId: string | null
}) {
  const dueDateStatus = getDueDateStatus(milestone.due_date, milestone.status)
  const priority = milestone.priority ?? 'normal'
  const tags = milestone.tags ?? []

  return (
    <div className={cn(
      'group flex items-center gap-3 border-b px-4 py-3 text-sm transition-colors hover:bg-muted/30 last:border-b-0',
    )}>
      {/* Priority stripe */}
      <div className={cn(
        'h-6 w-1 shrink-0 rounded-full',
        priority === 'urgent' && 'bg-red-500',
        priority === 'high' && 'bg-orange-400',
        priority === 'normal' && 'bg-transparent',
      )} />

      {/* Status node */}
      <StatusNode
        status={milestone.status}
        onClick={() => onStatusToggle(milestone.id, nextStatus(milestone.status))}
        size="sm"
      />

      {/* Title */}
      <div className="min-w-0 flex-1">
        <span className={cn(
          'font-medium',
          milestone.status === 'completed' && 'line-through text-muted-foreground',
        )}>
          {milestone.title}
        </span>
        {tags.length > 0 && (
          <div className="mt-0.5 flex flex-wrap gap-1">
            {tags.slice(0, 4).map(tag => (
              <span key={tag} className="rounded-full border border-violet-200 bg-violet-50 px-1.5 text-[10px] text-violet-700">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Assignee */}
      <div className="hidden w-28 shrink-0 sm:flex items-center gap-1.5 text-xs text-muted-foreground">
        {milestone.assigned_to ? (
          <>
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[9px] font-bold text-primary shrink-0">
              {getInitials(milestone.assigned_to)}
            </div>
            <span className="truncate">{milestone.assigned_to}</span>
          </>
        ) : (
          <span className="italic">—</span>
        )}
      </div>

      {/* Due date */}
      <div className={cn(
        'hidden w-28 shrink-0 text-xs sm:block',
        dueDateStatus === 'overdue' && 'font-medium text-destructive',
        dueDateStatus === 'today' && 'font-medium text-destructive',
        dueDateStatus === 'tomorrow' && 'font-medium text-orange-600',
        (!dueDateStatus || dueDateStatus === 'ok' || dueDateStatus === 'week') && 'text-muted-foreground',
      )}>
        {milestone.due_date
          ? format(parseISO(milestone.due_date), 'd MMM yyyy', { locale: fr })
          : <span className="italic">—</span>
        }
      </div>

      {/* Visibility */}
      <div className="hidden shrink-0 sm:block text-muted-foreground">
        {milestone.visible_to_client ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        {milestone.status !== 'completed' && (
          <button
            onClick={() => onStatusToggle(milestone.id, 'completed')}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-emerald-50 hover:text-emerald-600"
            title="Marquer terminé"
          >
            <CheckCheck className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          onClick={() => onRequestValidation(milestone.id)}
          disabled={sendingValidationId === milestone.id}
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-primary/10 hover:text-primary disabled:opacity-50"
          title="Demander validation"
        >
          <SendHorizonal className={cn('h-3.5 w-3.5', sendingValidationId === milestone.id && 'animate-pulse')} />
        </button>
        <button
          onClick={() => onEdit(milestone)}
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
          title="Modifier"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground">
            <ChevronDown className="h-3.5 w-3.5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={() => onDuplicate(milestone)}>
              <Copy className="mr-2 h-3.5 w-3.5" />
              Dupliquer
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onDelete(milestone.id)} className="text-destructive focus:text-destructive">
              <Trash2 className="mr-2 h-3.5 w-3.5" />
              Supprimer
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// FilterPill
// ---------------------------------------------------------------------------

function FilterPill({
  label,
  active,
  count,
  onClick,
}: {
  label: string
  active: boolean
  count?: number
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all',
        active
          ? 'bg-primary text-primary-foreground shadow-sm'
          : 'bg-muted text-muted-foreground hover:bg-muted/80',
      )}
    >
      {label}
      {count !== undefined && (
        <span className={cn(
          'flex h-4 min-w-4 items-center justify-center rounded-full text-[10px]',
          active ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-background text-foreground',
        )}>
          {count}
        </span>
      )}
    </button>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function MilestonesPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: projectId } = use(params)
  const router = useRouter()

  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deliverables, setDeliverables] = useState<ReferenceItem[]>([])
  const [documents, setDocuments] = useState<ReferenceItem[]>([])
  const [sendingValidationId, setSendingValidationId] = useState<string | null>(null)

  // View/filter state
  const [viewMode, setViewMode] = useState<ViewMode>('timeline')
  const [filterStatus, setFilterStatus] = useState<'all' | MilestoneStatus>('all')
  const [filterPriority, setFilterPriority] = useState<'all' | MilestonePriority>('all')
  const [showHiddenFromClient, setShowHiddenFromClient] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortBy>('order')
  const [groupBy, setGroupBy] = useState<GroupBy>('none')

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null)
  const [form, setForm] = useState<MilestoneFormData>(defaultForm())

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  // -------------------------------------------------------------------------
  // Fetch
  // -------------------------------------------------------------------------

  const fetchMilestones = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/milestones`)
      if (!res.ok) throw new Error('Erreur lors du chargement')
      const json = (await res.json()) as { data: Milestone[] }
      setMilestones(json.data ?? [])
    } catch {
      toast.error('Impossible de charger les étapes')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    void fetchMilestones()

    fetch(`/api/projects/${projectId}/deliverables`)
      .then(r => r.json())
      .then(({ data }: { data?: { id: string; name: string }[] }) =>
        setDeliverables((data ?? []).map(d => ({ id: d.id, name: d.name })))
      )
      .catch(() => {})

    fetch(`/api/projects/${projectId}/documents`)
      .then(r => r.json())
      .then(({ data }: { data?: { id: string; name: string }[] }) => {
        setDocuments((data ?? []).map(d => ({ id: d.id, name: d.name })))
      })
      .catch(() => {})
  }, [fetchMilestones, projectId])

  // -------------------------------------------------------------------------
  // Stats
  // -------------------------------------------------------------------------

  const total = milestones.length
  const completedCount = milestones.filter(m => m.status === 'completed').length
  const inProgressCount = milestones.filter(m => m.status === 'in_progress').length
  const pendingCount = milestones.filter(m => m.status === 'pending').length
  const overdueCount = milestones.filter(m => getDueDateStatus(m.due_date, m.status) === 'overdue').length
  const pct = total > 0 ? Math.round((completedCount / total) * 100) : 0

  const nextDeadline = useMemo(() => {
    const upcoming = milestones
      .filter(m => m.due_date && m.status !== 'completed')
      .sort((a, b) => (a.due_date ?? '').localeCompare(b.due_date ?? ''))
    return upcoming[0] ?? null
  }, [milestones])

  // -------------------------------------------------------------------------
  // Filtered + sorted milestones
  // -------------------------------------------------------------------------

  const processedMilestones = useMemo(() => {
    let list = milestones.filter(m => {
      if (filterStatus !== 'all' && m.status !== filterStatus) return false
      if (filterPriority !== 'all' && m.priority !== filterPriority) return false
      if (!showHiddenFromClient && !m.visible_to_client) return false
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const inTitle = m.title.toLowerCase().includes(q)
        const inDesc = m.description?.toLowerCase().includes(q) ?? false
        const inTags = m.tags?.some(t => t.toLowerCase().includes(q)) ?? false
        const inAssignee = m.assigned_to?.toLowerCase().includes(q) ?? false
        if (!inTitle && !inDesc && !inTags && !inAssignee) return false
      }
      return true
    })

    if (sortBy !== 'order') {
      list = [...list].sort((a, b) => {
        if (sortBy === 'due_date') {
          if (!a.due_date && !b.due_date) return 0
          if (!a.due_date) return 1
          if (!b.due_date) return -1
          return a.due_date.localeCompare(b.due_date)
        }
        if (sortBy === 'priority') return priorityWeight(b.priority) - priorityWeight(a.priority)
        if (sortBy === 'status') return statusWeight(a.status) - statusWeight(b.status)
        if (sortBy === 'title') return a.title.localeCompare(b.title)
        return a.order_index - b.order_index
      })
    }

    return list
  }, [milestones, filterStatus, filterPriority, showHiddenFromClient, searchQuery, sortBy])

  // Group by
  const groupedMilestones = useMemo((): Record<string, Milestone[]> => {
    if (groupBy === 'none') return { '': processedMilestones }
    if (groupBy === 'status') {
      return {
        'in_progress': processedMilestones.filter(m => m.status === 'in_progress'),
        'pending': processedMilestones.filter(m => m.status === 'pending'),
        'completed': processedMilestones.filter(m => m.status === 'completed'),
      }
    }
    // by priority
    return {
      'urgent': processedMilestones.filter(m => m.priority === 'urgent'),
      'high': processedMilestones.filter(m => m.priority === 'high'),
      'normal': processedMilestones.filter(m => m.priority === 'normal'),
    }
  }, [processedMilestones, groupBy])

  const groupLabels: Record<string, string> = {
    in_progress: 'En cours',
    pending: 'En attente',
    completed: 'Terminé',
    urgent: '🔴 Urgent',
    high: '🟠 Haute priorité',
    normal: 'Normale',
    '': '',
  }

  // -------------------------------------------------------------------------
  // DnD reorder
  // -------------------------------------------------------------------------

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = milestones.findIndex(m => m.id === active.id)
    const newIndex = milestones.findIndex(m => m.id === over.id)
    const reordered = arrayMove(milestones, oldIndex, newIndex).map((m, i) => ({
      ...m,
      order_index: i,
    }))
    setMilestones(reordered)

    try {
      const res = await fetch(`/api/projects/${projectId}/milestones/reorder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: reordered.map(m => ({ id: m.id, order_index: m.order_index })),
        }),
      })
      if (!res.ok) throw new Error()
    } catch {
      toast.error('Erreur lors de la réorganisation')
      void fetchMilestones()
    }
  }

  // -------------------------------------------------------------------------
  // Status toggle
  // -------------------------------------------------------------------------

  async function handleStatusToggle(id: string, next: MilestoneStatus) {
    setMilestones(prev => prev.map(m => (m.id === id ? { ...m, status: next } : m)))
    try {
      const res = await fetch(`/api/projects/${projectId}/milestones/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      })
      if (!res.ok) throw new Error()
      if (next === 'completed') toast.success('Étape marquée comme terminée ✓')
    } catch {
      toast.error('Erreur lors de la mise à jour')
      void fetchMilestones()
    }
  }

  // -------------------------------------------------------------------------
  // Delete
  // -------------------------------------------------------------------------

  async function handleDelete(id: string) {
    const prev = milestones
    setMilestones(ms => ms.filter(m => m.id !== id))
    try {
      const res = await fetch(`/api/projects/${projectId}/milestones/${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error()
      toast.success('Étape supprimée')
    } catch {
      toast.error('Erreur lors de la suppression')
      setMilestones(prev)
    }
  }

  // -------------------------------------------------------------------------
  // Duplicate
  // -------------------------------------------------------------------------

  async function handleDuplicate(m: Milestone) {
    try {
      const payload = {
        title: `${m.title} (copie)`,
        description: m.description,
        status: 'pending' as MilestoneStatus,
        due_date: m.due_date,
        start_date: m.start_date,
        visible_to_client: m.visible_to_client,
        priority: m.priority,
        tags: m.tags,
        assigned_to: m.assigned_to,
        reference_type: m.reference_type,
        reference_id: m.reference_id,
      }
      const res = await fetch(`/api/projects/${projectId}/milestones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error()
      const json = (await res.json()) as { data: Milestone }
      setMilestones(prev => [...prev, json.data])
      toast.success('Étape dupliquée')
    } catch {
      toast.error('Erreur lors de la duplication')
    }
  }

  // -------------------------------------------------------------------------
  // Request validation
  // -------------------------------------------------------------------------

  async function handleRequestValidation(milestoneId: string) {
    setSendingValidationId(milestoneId)
    try {
      const res = await fetch(
        `/api/projects/${projectId}/milestones/${milestoneId}/request-validation`,
        { method: 'POST' },
      )
      const json = await res.json() as { data?: { sent: boolean; to?: string }; error?: string }
      if (!res.ok) throw new Error(json.error ?? 'Erreur')
      if (json.data?.sent) {
        toast.success(`Email de validation envoyé à ${json.data.to}`)
      } else {
        toast.info('Email non configuré')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de l'envoi")
    } finally {
      setSendingValidationId(null)
    }
  }

  // -------------------------------------------------------------------------
  // Dialog helpers
  // -------------------------------------------------------------------------

  function openAddDialog() {
    setEditingMilestone(null)
    setForm(defaultForm())
    setDialogOpen(true)
  }

  function openEditDialog(m: Milestone) {
    setEditingMilestone(m)
    setForm({
      title: m.title,
      description: m.description ?? '',
      status: m.status,
      due_date: m.due_date ?? '',
      start_date: m.start_date ?? '',
      visible_to_client: m.visible_to_client,
      reference_type: m.reference_type ?? '',
      reference_id: m.reference_id ?? '',
      priority: m.priority ?? 'normal',
      tags: (m.tags ?? []).join(', '),
      assigned_to: m.assigned_to ?? '',
      completion_note: m.completion_note ?? '',
    })
    setDialogOpen(true)
  }

  function closeDialog() {
    setDialogOpen(false)
    setEditingMilestone(null)
    setForm(defaultForm())
  }

  // -------------------------------------------------------------------------
  // Save
  // -------------------------------------------------------------------------

  async function handleSave() {
    if (!form.title.trim()) {
      toast.error('Le titre est requis')
      return
    }
    setSaving(true)
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        status: form.status,
        due_date: form.due_date || null,
        start_date: form.start_date || null,
        visible_to_client: form.visible_to_client,
        reference_type: form.reference_type || null,
        reference_id: (form.reference_type && form.reference_type !== 'onboarding')
          ? (form.reference_id.trim() || null)
          : null,
        priority: form.priority,
        tags: parseTags(form.tags),
        assigned_to: form.assigned_to.trim() || null,
        completion_note: form.completion_note.trim() || null,
      }

      if (editingMilestone) {
        const res = await fetch(
          `/api/projects/${projectId}/milestones/${editingMilestone.id}`,
          { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) },
        )
        if (!res.ok) throw new Error()
        const json = (await res.json()) as { data: Milestone }
        setMilestones(prev =>
          prev.map(m => m.id === editingMilestone.id ? json.data : m),
        )
        toast.success('Étape mise à jour')
      } else {
        const res = await fetch(`/api/projects/${projectId}/milestones`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error()
        const json = (await res.json()) as { data: Milestone }
        setMilestones(prev => [...prev, json.data])
        toast.success('Étape ajoutée')
      }

      closeDialog()
    } catch {
      toast.error('Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  // -------------------------------------------------------------------------
  // Render helpers
  // -------------------------------------------------------------------------

  const sortLabel = (s: SortBy) => ({
    order: 'Ordre manuel',
    due_date: 'Date limite',
    priority: 'Priorité',
    status: 'Statut',
    title: 'Titre',
  })[s]

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Timeline du projet</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Planifiez, suivez et validez chaque étape de votre projet
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/dashboard/projects/${projectId}/meetings`)}
          >
            <CalendarCheck className="mr-2 h-4 w-4" />
            Réunion
          </Button>
          <Button size="sm" onClick={openAddDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Ajouter une étape
          </Button>
        </div>
      </div>

      {/* ── Stat cards ─────────────────────────────────────────────────────── */}
      {!loading && total > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            icon={Target}
            label="Progression globale"
            value={`${pct} %`}
            color="bg-primary/10 text-primary"
            sub={`${completedCount}/${total} terminées`}
          />
          <StatCard
            icon={TrendingUp}
            label="En cours"
            value={inProgressCount}
            color="bg-blue-50 text-blue-600"
            sub={`${pendingCount} en attente`}
          />
          <StatCard
            icon={AlertTriangle}
            label="En retard"
            value={overdueCount}
            color={overdueCount > 0 ? 'bg-red-50 text-red-600' : 'bg-muted text-muted-foreground'}
            sub={overdueCount > 0 ? 'Action requise' : 'Tout est à jour'}
          />
          <StatCard
            icon={CalendarDays}
            label="Prochaine échéance"
            value={nextDeadline
              ? format(parseISO(nextDeadline.due_date!), 'd MMM', { locale: fr })
              : '—'}
            color="bg-emerald-50 text-emerald-600"
            sub={nextDeadline?.title ?? 'Aucune échéance'}
          />
        </div>
      )}

      {/* ── Progress bar ───────────────────────────────────────────────────── */}
      {!loading && total > 0 && (
        <div className="rounded-xl border bg-card p-4 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Avancement global</span>
            <span className="font-semibold text-foreground">{pct} %</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              style={{ width: `${pct}%` }}
              className="h-2.5 rounded-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-700"
            />
          </div>
          {/* Segment breakdown */}
          <div className="flex h-1.5 w-full overflow-hidden rounded-full gap-0.5">
            {completedCount > 0 && (
              <div
                style={{ width: `${(completedCount / total) * 100}%` }}
                className="h-full rounded-full bg-emerald-500 transition-all"
                title={`${completedCount} terminée(s)`}
              />
            )}
            {inProgressCount > 0 && (
              <div
                style={{ width: `${(inProgressCount / total) * 100}%` }}
                className="h-full rounded-full bg-blue-400 transition-all"
                title={`${inProgressCount} en cours`}
              />
            )}
            {pendingCount > 0 && (
              <div
                style={{ width: `${(pendingCount / total) * 100}%` }}
                className="h-full rounded-full bg-gray-200 transition-all"
                title={`${pendingCount} en attente`}
              />
            )}
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" /> {completedCount} terminée{completedCount > 1 ? 's' : ''}</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-400 inline-block" /> {inProgressCount} en cours</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-gray-300 inline-block" /> {pendingCount} en attente</span>
          </div>
        </div>
      )}

      {/* ── Toolbar ────────────────────────────────────────────────────────── */}
      {!loading && total > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative flex-1 min-w-48 max-w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Rechercher…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Sort */}
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex h-8 items-center gap-1.5 rounded-md border border-input bg-background px-3 text-xs font-medium shadow-sm hover:bg-accent hover:text-accent-foreground">
              <ArrowUpDown className="h-3.5 w-3.5" />
              {sortLabel(sortBy)}
              <ChevronDown className="h-3 w-3" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              <DropdownMenuGroup>
                <DropdownMenuLabel className="text-xs">Trier par</DropdownMenuLabel>
                {(['order', 'due_date', 'priority', 'status', 'title'] as SortBy[]).map(s => (
                  <DropdownMenuItem
                    key={s}
                    onClick={() => setSortBy(s)}
                    className={cn('text-xs', sortBy === s && 'font-medium text-primary')}
                  >
                    {sortLabel(s)}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Group by */}
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex h-8 items-center gap-1.5 rounded-md border border-input bg-background px-3 text-xs font-medium shadow-sm hover:bg-accent hover:text-accent-foreground">
              <Layers className="h-3.5 w-3.5" />
              {groupBy === 'none' ? 'Grouper' : groupBy === 'status' ? 'Par statut' : 'Par priorité'}
              <ChevronDown className="h-3 w-3" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              <DropdownMenuGroup>
                <DropdownMenuLabel className="text-xs">Grouper par</DropdownMenuLabel>
                {(['none', 'status', 'priority'] as GroupBy[]).map(g => (
                  <DropdownMenuItem
                    key={g}
                    onClick={() => setGroupBy(g)}
                    className={cn('text-xs', groupBy === g && 'font-medium text-primary')}
                  >
                    {g === 'none' ? 'Aucun' : g === 'status' ? 'Statut' : 'Priorité'}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* View toggle */}
          <div className="flex items-center rounded-lg border bg-muted/30 p-0.5 gap-0.5">
            <button
              onClick={() => setViewMode('timeline')}
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-all',
                viewMode === 'timeline' && 'bg-background text-foreground shadow-sm',
              )}
              title="Vue timeline"
            >
              <GitBranch className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-all',
                viewMode === 'list' && 'bg-background text-foreground shadow-sm',
              )}
              title="Vue liste"
            >
              <LayoutList className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Filters */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Switch
              checked={showHiddenFromClient}
              onCheckedChange={setShowHiddenFromClient}
              id="show-hidden"
            />
            <label htmlFor="show-hidden" className="cursor-pointer">Masqués client</label>
          </div>
        </div>
      )}

      {/* ── Filter pills ───────────────────────────────────────────────────── */}
      {!loading && total > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {/* Status pills */}
          <div className="flex items-center gap-1">
            <FilterPill label="Tous" count={total} active={filterStatus === 'all'} onClick={() => setFilterStatus('all')} />
            <FilterPill label="En attente" count={pendingCount} active={filterStatus === 'pending'} onClick={() => setFilterStatus('pending')} />
            <FilterPill label="En cours" count={inProgressCount} active={filterStatus === 'in_progress'} onClick={() => setFilterStatus('in_progress')} />
            <FilterPill label="Terminé" count={completedCount} active={filterStatus === 'completed'} onClick={() => setFilterStatus('completed')} />
          </div>
          <div className="h-4 w-px bg-border" />
          {/* Priority pills */}
          <div className="flex items-center gap-1">
            <FilterPill label="🔴 Urgent" active={filterPriority === 'urgent'} onClick={() => setFilterPriority(filterPriority === 'urgent' ? 'all' : 'urgent')} />
            <FilterPill label="🟠 Haute" active={filterPriority === 'high'} onClick={() => setFilterPriority(filterPriority === 'high' ? 'all' : 'high')} />
          </div>
          {(filterStatus !== 'all' || filterPriority !== 'all' || searchQuery) && (
            <button
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
              onClick={() => { setFilterStatus('all'); setFilterPriority('all'); setSearchQuery('') }}
            >
              <X className="h-3 w-3" />
              Réinitialiser
            </button>
          )}
        </div>
      )}

      {/* ── Content ────────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex gap-4">
              <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
              <Skeleton className="h-28 w-full rounded-xl" />
            </div>
          ))}
        </div>
      ) : milestones.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-card px-6 py-20 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5">
            <ListChecks className="h-8 w-8 text-primary" />
          </div>
          <h2 className="mb-1 text-lg font-semibold">Aucune étape définie</h2>
          <p className="mb-6 max-w-sm text-sm text-muted-foreground">
            Découpez votre projet en étapes clés pour suivre l&apos;avancement et tenir votre client informé.
          </p>
          <Button onClick={openAddDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Ajouter la première étape
          </Button>
        </div>
      ) : processedMilestones.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border bg-card px-6 py-12 text-center">
          <Search className="mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium">Aucune étape ne correspond à votre recherche.</p>
          <button
            className="mt-2 text-xs text-primary hover:underline"
            onClick={() => { setFilterStatus('all'); setFilterPriority('all'); setSearchQuery('') }}
          >
            Réinitialiser les filtres
          </button>
        </div>
      ) : viewMode === 'timeline' ? (
        /* ── Timeline view ─────────────────────────────────────────────────── */
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <div className="space-y-6">
            {Object.entries(groupedMilestones).map(([groupKey, items]) => (
              items.length === 0 ? null : (
                <div key={groupKey}>
                  {groupBy !== 'none' && (
                    <div className="mb-3 flex items-center gap-2">
                      <span className="text-sm font-semibold">{groupLabels[groupKey] ?? groupKey}</span>
                      <span className="text-xs text-muted-foreground">({items.length})</span>
                      <div className="flex-1 h-px bg-border" />
                    </div>
                  )}
                  <SortableContext
                    items={items.map(m => m.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="pl-1">
                      {items.map((milestone, index) => (
                        <SortableMilestone
                          key={milestone.id}
                          milestone={milestone}
                          isLast={index === items.length - 1}
                          onStatusToggle={handleStatusToggle}
                          onEdit={openEditDialog}
                          onDelete={handleDelete}
                          onDuplicate={handleDuplicate}
                          onRequestValidation={handleRequestValidation}
                          sendingValidationId={sendingValidationId}
                          referenceLabel={getReferenceLabel(milestone, deliverables, documents) ?? undefined}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </div>
              )
            ))}
          </div>
        </DndContext>
      ) : (
        /* ── List view ─────────────────────────────────────────────────────── */
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          {/* List header */}
          <div className="flex items-center gap-3 border-b bg-muted/30 px-4 py-2 text-xs font-medium text-muted-foreground">
            <div className="w-1 shrink-0" />
            <div className="w-7 shrink-0" />
            <div className="flex-1">Étape</div>
            <div className="hidden w-28 shrink-0 sm:block">Assigné à</div>
            <div className="hidden w-28 shrink-0 sm:block">Date limite</div>
            <div className="hidden shrink-0 sm:block w-6">Vis.</div>
            <div className="w-28 shrink-0" />
          </div>
          {Object.entries(groupedMilestones).map(([groupKey, items]) => (
            items.length === 0 ? null : (
              <div key={groupKey}>
                {groupBy !== 'none' && (
                  <div className="flex items-center gap-2 border-b bg-muted/10 px-4 py-1.5">
                    <span className="text-xs font-semibold text-muted-foreground">{groupLabels[groupKey] ?? groupKey}</span>
                    <span className="text-xs text-muted-foreground/60">({items.length})</span>
                  </div>
                )}
                {items.map(m => (
                  <ListRow
                    key={m.id}
                    milestone={m}
                    onStatusToggle={handleStatusToggle}
                    onEdit={openEditDialog}
                    onDelete={handleDelete}
                    onDuplicate={handleDuplicate}
                    onRequestValidation={handleRequestValidation}
                    sendingValidationId={sendingValidationId}
                  />
                ))}
              </div>
            )
          ))}
        </div>
      )}

      {/* ── Add / Edit Dialog ──────────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={open => { if (!open) closeDialog() }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingMilestone ? "Modifier l'étape" : 'Nouvelle étape'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Titre */}
            <div className="space-y-1.5">
              <Label htmlFor="ms-title">Titre <span className="text-destructive">*</span></Label>
              <Input
                id="ms-title"
                placeholder="Ex : Livraison maquettes"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="ms-desc">Description</Label>
              <Textarea
                id="ms-desc"
                placeholder="Détails, contexte, critères de validation…"
                rows={3}
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>

            {/* Statut + Priorité */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="ms-status">Statut</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as MilestoneStatus }))}>
                  <SelectTrigger id="ms-status"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">⬜ En attente</SelectItem>
                    <SelectItem value="in_progress">🔵 En cours</SelectItem>
                    <SelectItem value="completed">✅ Terminé</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ms-priority">Priorité</Label>
                <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v as MilestonePriority }))}>
                  <SelectTrigger id="ms-priority"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">⚪ Normale</SelectItem>
                    <SelectItem value="high">🟠 Haute</SelectItem>
                    <SelectItem value="urgent">🔴 Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Date début + Date limite */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="ms-start">
                  <CalendarDays className="inline mr-1 h-3.5 w-3.5" />
                  Date de début
                </Label>
                <Input
                  id="ms-start"
                  type="date"
                  value={form.start_date}
                  onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ms-due">
                  <CalendarDays className="inline mr-1 h-3.5 w-3.5" />
                  Date limite
                </Label>
                <Input
                  id="ms-due"
                  type="date"
                  value={form.due_date}
                  onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
                />
              </div>
            </div>

            {/* Assigné à + Tags */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="ms-assigned">
                  <User className="inline mr-1 h-3.5 w-3.5" />
                  Assigné à
                </Label>
                <Input
                  id="ms-assigned"
                  placeholder="Prénom Nom"
                  value={form.assigned_to}
                  onChange={e => setForm(f => ({ ...f, assigned_to: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ms-tags">
                  <Tag className="inline mr-1 h-3.5 w-3.5" />
                  Tags
                </Label>
                <Input
                  id="ms-tags"
                  placeholder="Design, UI, Livrable…"
                  value={form.tags}
                  onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">Séparer par des virgules</p>
              </div>
            </div>

            {/* Note de clôture (si statut = completed) */}
            {form.status === 'completed' && (
              <div className="space-y-1.5">
                <Label htmlFor="ms-completion-note">Note de clôture</Label>
                <Textarea
                  id="ms-completion-note"
                  placeholder="Résumé de ce qui a été livré, notes importantes…"
                  rows={2}
                  value={form.completion_note}
                  onChange={e => setForm(f => ({ ...f, completion_note: e.target.value }))}
                />
              </div>
            )}

            {/* Visible client */}
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label htmlFor="ms-visible" className="text-sm font-medium">Visible par le client</Label>
                <p className="text-xs text-muted-foreground">Afficher cette étape dans le portail client</p>
              </div>
              <Switch
                id="ms-visible"
                checked={form.visible_to_client}
                onCheckedChange={checked => setForm(f => ({ ...f, visible_to_client: checked }))}
              />
            </div>

            {/* Référence associée */}
            <div className="space-y-3 border-t pt-4">
              <p className="text-sm font-medium flex items-center gap-1.5">
                <Link2 className="h-4 w-4" />
                Référence associée
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="ms-ref-type">Type</Label>
                <Select
                  value={form.reference_type}
                  onValueChange={v => setForm(f => ({ ...f, reference_type: v ?? '', reference_id: '' }))}
                >
                  <SelectTrigger id="ms-ref-type"><SelectValue placeholder="Aucune" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Aucune</SelectItem>
                    <SelectItem value="onboarding">Onboarding client</SelectItem>
                    <SelectItem value="deliverable">Livrable</SelectItem>
                    <SelectItem value="document">Document</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {form.reference_type === 'deliverable' && (
                <div className="space-y-1.5">
                  <Label>Livrable associé</Label>
                  {deliverables.length > 0 ? (
                    <Select value={form.reference_id} onValueChange={v => setForm(f => ({ ...f, reference_id: v ?? '' }))}>
                      <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                      <SelectContent>
                        {deliverables.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-xs text-muted-foreground">Aucun livrable sur ce projet.</p>
                  )}
                </div>
              )}

              {form.reference_type === 'document' && (
                <div className="space-y-1.5">
                  <Label>Document associé</Label>
                  {documents.length > 0 ? (
                    <Select value={form.reference_id} onValueChange={v => setForm(f => ({ ...f, reference_id: v ?? '' }))}>
                      <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                      <SelectContent>
                        {documents.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-xs text-muted-foreground">Aucun document sur ce projet.</p>
                  )}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} disabled={saving}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Enregistrement…' : editingMilestone ? 'Mettre à jour' : 'Ajouter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
