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

  const { data: project, error } = await supabase
    .from('projects')
    .select('*, clients(id, name, company, email, website)')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error || !project) notFound()

  const [
    { data: milestonesData },
    { data: upcomingData },
    { count: responseCount },
    { count: documentCount },
    { count: feedbackCount },
    { data: deliverablesData },
    { count: vaultCount },
  ] = await Promise.all([
    supabase
      .from('project_milestones')
      .select('status')
      .eq('project_id', id),
    supabase
      .from('project_milestones')
      .select('id, title, due_date, status, priority')
      .eq('project_id', id)
      .neq('status', 'completed')
      .not('due_date', 'is', null)
      .order('due_date', { ascending: true })
      .limit(4),
    supabase
      .from('form_responses')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', id),
    supabase
      .from('project_documents')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', id),
    supabase
      .from('client_feedback')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', id),
    supabase
      .from('project_deliverables')
      .select('status')
      .eq('project_id', id),
    supabase
      .from('form_fields')
      .select('id, form_sections!inner(kind)', { count: 'exact', head: true })
      .eq('project_id', id)
      .eq('form_sections.kind', 'access'),
  ])

  const milestones = milestonesData ?? []
  const deliverables = deliverablesData ?? []

  const milestoneStats = {
    total: milestones.length,
    completed: milestones.filter((m: { status: string }) => m.status === 'completed').length,
  }
  const deliverableStats = {
    total: deliverables.length,
    validated: deliverables.filter((d: { status: string }) => d.status === 'validated').length,
    pending: deliverables.filter((d: { status: string }) => d.status !== 'validated').length,
  }
  const upcomingMilestones = (upcomingData ?? []) as {
    id: string; title: string; due_date: string; status: string; priority: string
  }[]

  const portalUrl = `${APP_CONFIG.url}/p/${project.public_id}`

  return (
    <ProjectOverview
      project={project as Project}
      portalUrl={portalUrl}
      milestoneStats={milestoneStats}
      upcomingMilestones={upcomingMilestones}
      responseCount={responseCount ?? 0}
      documentCount={documentCount ?? 0}
      deliverableStats={deliverableStats}
      feedbackCount={feedbackCount ?? 0}
      vaultCount={vaultCount ?? 0}
    />
  )
}
