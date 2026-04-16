import { createAdminClient } from '@/lib/supabase/admin'

interface NotifyOptions {
  userId: string
  type: string
  title: string
  body?: string
  projectId?: string
  clientId?: string
  metadata?: Record<string, unknown>
}

export async function createNotification(opts: NotifyOptions) {
  const admin = createAdminClient()
  await admin.from('notifications').insert({
    user_id: opts.userId,
    type: opts.type,
    title: opts.title,
    body: opts.body ?? null,
    project_id: opts.projectId ?? null,
    client_id: opts.clientId ?? null,
    metadata: opts.metadata ?? {},
  })
}
