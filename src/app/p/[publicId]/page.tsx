import { notFound } from 'next/navigation'
import FormPage from './FormPage'
import { createClient } from '@/lib/supabase/server'
import { APP_CONFIG } from '@/config/app.config'
import type { Metadata } from 'next'

interface PageProps {
  params: Promise<{ publicId: string }>
}

interface FormField {
  id: string
  type: string
  label: string
  description: string | null
  placeholder: string | null
  required: boolean
  options: string[] | null
  order_index: number
  section_id: string | null
}

interface OnboardingSection {
  id: string
  title: string
  order_index: number
}

async function getPortalData(publicId: string) {
  const supabase = await createClient()

  const { data: project, error } = await supabase
    .from('projects')
    .select('id, name, description, settings, status')
    .eq('public_id', publicId)
    .single()

  if (error || !project || project.status === 'archived') {
    return null
  }

  const [{ data: sections }, { data: fields }] = await Promise.all([
    supabase
      .from('onboarding_sections')
      .select('id, title, order_index')
      .eq('project_id', project.id)
      .order('order_index'),
    supabase
      .from('form_fields')
      .select('id, type, label, description, placeholder, required, options, order_index, section_id')
      .eq('project_id', project.id)
      .order('order_index'),
  ])

  return {
    project: {
      name: project.name,
      description: project.description,
      settings: project.settings as Record<string, unknown> | null,
    },
    sections: (sections ?? []) as OnboardingSection[],
    fields: (fields ?? []) as FormField[],
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { publicId } = await params
  const data = await getPortalData(publicId)
  if (!data) return { title: 'Formulaire introuvable' }
  return {
    title: `${data.project.name} — ${APP_CONFIG.name}`,
    description: data.project.description ?? undefined,
  }
}

export default async function PortalPage({ params }: PageProps) {
  const { publicId } = await params
  const data = await getPortalData(publicId)

  if (!data) notFound()

  return (
    <FormPage
      project={data.project}
      sections={data.sections}
      fields={data.fields}
      publicId={publicId}
    />
  )
}
