import { notFound } from 'next/navigation'
import FormPage from './FormPage'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
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
  sensitive: boolean
}

interface OnboardingSection {
  id: string
  title: string
  order_index: number
  kind: string
}

interface ClientInfo {
  first_name: string
  last_name: string
  email: string
  phone: string
  company: string
  address: string
  city: string
  zip: string
  country: string
  vat_number: string
  siret: string
}

async function getPortalData(publicId: string) {
  const supabase = await createClient()

  const { data: project, error } = await supabase
    .from('projects')
    .select('id, name, description, settings, status, client_id')
    .eq('public_id', publicId)
    .single()

  if (error || !project || project.status === 'archived') {
    return null
  }

  const [{ data: sections }, { data: fields }] = await Promise.all([
    supabase
      .from('onboarding_sections')
      .select('id, title, order_index, kind')
      .eq('project_id', project.id)
      .order('order_index'),
    supabase
      .from('form_fields')
      .select('id, type, label, description, placeholder, required, options, order_index, section_id, sensitive')
      .eq('project_id', project.id)
      .order('order_index'),
  ])

  let initialClientInfo: ClientInfo = {
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    company: '',
    address: '',
    city: '',
    zip: '',
    country: 'France',
    vat_number: '',
    siret: '',
  }

  if (project.client_id) {
    const adminClient = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const { data: client } = await adminClient
      .from('clients')
      .select('id, name, email, phone, company')
      .eq('id', project.client_id)
      .single()

    if (client) {
      const nameParts = (client.name ?? '').split(' ')
      const firstName = nameParts[0] ?? ''
      const lastName = nameParts.slice(1).join(' ')
      initialClientInfo = {
        first_name: firstName,
        last_name: lastName,
        email: client.email ?? '',
        phone: client.phone ?? '',
        company: client.company ?? '',
        address: '',
        city: '',
        zip: '',
        country: 'France',
        vat_number: '',
        siret: '',
      }
    }
  }

  return {
    project: {
      name: project.name,
      description: project.description,
      settings: project.settings as Record<string, unknown> | null,
    },
    sections: (sections ?? []) as OnboardingSection[],
    fields: (fields ?? []) as FormField[],
    initialClientInfo,
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
      initialClientInfo={data.initialClientInfo}
    />
  )
}
