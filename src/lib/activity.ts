import { SupabaseClient } from '@supabase/supabase-js'

export type ActivityAction =
  | 'project_created'
  | 'task_created'
  | 'task_moved'
  | 'task_completed'
  | 'task_deleted'
  | 'column_created'
  | 'client_created'
  | 'template_created'

interface LogActivityParams {
  supabase: SupabaseClient
  userId: string
  action: ActivityAction
  projectId?: string | null
  entityType?: string
  entityId?: string
  metadata?: Record<string, unknown>
}

export async function logActivity({
  supabase,
  userId,
  action,
  projectId,
  entityType,
  entityId,
  metadata = {},
}: LogActivityParams): Promise<void> {
  // Fire-and-forget — on ne bloque pas la réponse principale
  try {
    await supabase.from('activity_log').insert({
      user_id: userId,
      project_id: projectId ?? null,
      action,
      entity_type: entityType ?? null,
      entity_id: entityId ?? null,
      metadata,
    })
  } catch {
    // Silencieux — le journal d'activité ne doit jamais faire échouer une action
  }
}

export interface ActivityEntry {
  id: string
  user_id: string
  project_id: string | null
  action: ActivityAction
  entity_type: string | null
  entity_id: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export function formatActivityLabel(entry: ActivityEntry): string {
  const m = entry.metadata
  switch (entry.action) {
    case 'project_created':
      return `Projet « ${m.project_name ?? 'Sans nom'} » créé`
    case 'task_created':
      return `Tâche « ${m.task_title ?? '…'} » ajoutée dans ${m.column_name ?? 'une colonne'}`
    case 'task_moved':
      return `Tâche « ${m.task_title ?? '…'} » déplacée vers ${m.to_column ?? 'une colonne'}`
    case 'task_completed':
      return `Tâche « ${m.task_title ?? '…'} » marquée comme terminée`
    case 'task_deleted':
      return `Tâche « ${m.task_title ?? '…'} » supprimée`
    case 'column_created':
      return `Colonne « ${m.column_name ?? '…'} » ajoutée`
    case 'client_created':
      return `Client « ${m.client_name ?? '…'} » créé${m.company ? ` (${m.company})` : ''}`
    case 'template_created':
      return `Template « ${m.template_name ?? '…'} » sauvegardé`
    default:
      return entry.action
  }
}
