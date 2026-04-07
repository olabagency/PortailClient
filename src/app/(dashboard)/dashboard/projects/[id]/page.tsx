import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { APP_CONFIG } from '@/config/app.config'
import { ProjectOverview } from '@/components/dashboard/ProjectOverview'

interface Project {
  id: string
  name: string
  description: string | null
  status: string
  color: string | null
  public_id: string
  clients: {
    id: string
    name: string
    company: string | null
    email: string
    website?: string | null
  } | null
  created_at: string
}

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Charger le projet avec vérification d'ownership
  const { data: project, error } = await supabase
    .from('projects')
    .select('*, clients(id, name, company, email, website)')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error || !project) notFound()

  // Comptage des milestones
  const { data: milestonesData } = await supabase
    .from('project_milestones')
    .select('status')
    .eq('project_id', id)

  const milestones = milestonesData ?? []
  const milestoneStats = {
    total: milestones.length,
    completed: milestones.filter((m: { status: string }) => m.status === 'completed').length,
  }

  // Comptage des réponses onboarding
  const { count: responseCount } = await supabase
    .from('onboarding_responses')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', id)

  // Comptage des documents
  const { count: documentCount } = await supabase
    .from('project_documents')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', id)

  // Comptage des retours clients
  const { count: feedbackCount } = await supabase
    .from('client_feedback')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', id)

  // Comptage des livrables
  const { data: deliverablesData } = await supabase
    .from('project_deliverables')
    .select('status')
    .eq('project_id', id)

  const deliverables = deliverablesData ?? []
  const deliverableStats = {
    total: deliverables.length,
    validated: deliverables.filter((d: { status: string }) => d.status === 'validated').length,
    pending: deliverables.filter((d: { status: string }) => d.status !== 'validated').length,
  }

  const portalUrl = `${APP_CONFIG.url}/p/${project.public_id}`

  return (
    <ProjectOverview
      project={project as Project}
      portalUrl={portalUrl}
      milestoneStats={milestoneStats}
      responseCount={responseCount ?? 0}
      documentCount={documentCount ?? 0}
      deliverableStats={deliverableStats}
      feedbackCount={feedbackCount ?? 0}
    />
  )
}
