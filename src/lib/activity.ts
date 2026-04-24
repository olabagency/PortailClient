import { SupabaseClient } from '@supabase/supabase-js'

export type ActivityAction =
  | 'project_created' | 'project_updated' | 'project_deleted'
  | 'milestone_created' | 'milestone_updated' | 'milestone_deleted' | 'milestone_completed'
  | 'deliverable_sent' | 'deliverable_validated' | 'deliverable_revised'
  | 'document_uploaded' | 'document_deleted' | 'document_moved'
  | 'client_created' | 'client_updated' | 'client_deleted'
  | 'feedback_treated'
  | 'meeting_created' | 'meeting_updated' | 'meeting_canceled' | 'meeting_deleted'
  | 'onboarding_form_responded'
  | 'template_created'
  | 'task_created' | 'task_moved' | 'task_completed' | 'task_deleted'
  | 'column_created'
  | string

interface LogActivityParams {
  supabase: SupabaseClient
  userId: string
  action: ActivityAction
  projectId?: string | null
  entityType?: string
  entityId?: string
  entityName?: string
  metadata?: Record<string, unknown>
}

export async function logActivity({
  supabase,
  userId,
  action,
  projectId,
  entityType,
  entityId,
  entityName,
  metadata = {},
}: LogActivityParams): Promise<void> {
  try {
    await supabase.from('activity_logs').insert({
      user_id: userId,
      project_id: projectId ?? null,
      action,
      entity_type: entityType ?? null,
      entity_id: entityId ?? null,
      entity_name: entityName ?? null,
      metadata,
    })
  } catch {
    // Silencieux — le journal ne doit jamais faire échouer l'action principale
  }
}

export interface ActivityEntry {
  id: string
  user_id: string
  project_id: string | null
  action: string
  entity_type: string | null
  entity_id: string | null
  entity_name: string | null
  metadata: Record<string, unknown>
  created_at: string
}

const ACTION_LABELS: Record<string, string> = {
  project_created: 'Projet créé',
  project_updated: 'Projet modifié',
  project_deleted: 'Projet supprimé',
  milestone_created: 'Étape de timeline ajoutée',
  milestone_updated: 'Étape de timeline mise à jour',
  milestone_completed: 'Étape de timeline terminée',
  milestone_deleted: 'Étape de timeline supprimée',
  deliverable_sent: 'Livrable envoyé',
  deliverable_validated: 'Livrable validé par le client',
  deliverable_revised: 'Révision demandée par le client',
  document_uploaded: 'Document ajouté',
  document_deleted: 'Document supprimé',
  document_moved: 'Document déplacé',
  client_created: 'Client créé',
  client_updated: 'Fiche client modifiée',
  client_deleted: 'Client supprimé',
  feedback_treated: 'Retour traité',
  meeting_created: 'Réunion planifiée',
  meeting_updated: 'Réunion modifiée',
  meeting_canceled: 'Réunion annulée',
  meeting_deleted: 'Réunion supprimée',
  onboarding_form_responded: 'Onboarding complété par le client',
  template_created: 'Template sauvegardé',
  task_created: 'Tâche créée',
  task_moved: 'Tâche déplacée',
  task_completed: 'Tâche terminée',
  task_deleted: 'Tâche supprimée',
  column_created: 'Colonne ajoutée',
}

export function formatActivityLabel(entry: ActivityEntry): string {
  const m = entry.metadata
  const label = ACTION_LABELS[entry.action] ?? entry.action

  if (entry.entity_name) return `${label} — ${entry.entity_name}`

  // Legacy metadata fallbacks
  const name = (m.project_name ?? m.client_name ?? m.template_name ?? m.task_title ?? m.column_name) as string | undefined
  if (name) return `${label} — ${name}`

  return label
}

export function getActivityIcon(action: string): string {
  if (action.startsWith('project')) return '📁'
  if (action.startsWith('milestone')) return '🏁'
  if (action.startsWith('deliverable')) return '📦'
  if (action.startsWith('document')) return '📄'
  if (action.startsWith('client')) return '👤'
  if (action.startsWith('meeting')) return '📅'
  if (action.startsWith('task')) return '✅'
  if (action === 'feedback_treated') return '💬'
  if (action === 'onboarding_form_responded') return '📋'
  return '🔹'
}
