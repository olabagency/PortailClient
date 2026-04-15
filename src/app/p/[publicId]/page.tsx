import { notFound } from 'next/navigation'
import Link from 'next/link'
import FormPage from './FormPage'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { APP_CONFIG } from '@/config/app.config'
import { CheckCircle } from 'lucide-react'
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
  notes: string
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

  const [{ data: sections }, { data: fields }, { data: completedResponse }] = await Promise.all([
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
    supabase
      .from('form_responses')
      .select('id')
      .eq('project_id', project.id)
      .eq('completed', true)
      .limit(1)
      .single(),
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
    notes: '',
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
        notes: '',
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
    already_submitted: !!completedResponse,
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

  if (data.already_submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAF8] px-6">
        <div className="text-center max-w-md mx-auto">
          <div className="h-20 w-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="h-10 w-10 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Formulaire bien reçu ✓</h1>
          <p className="text-gray-500 text-base mb-8">
            Votre prestataire traite vos informations. Créez votre espace client gratuit pour suivre l&apos;avancement de votre projet en temps réel.
          </p>
          <div className="flex flex-col gap-3">
            <Link
              href="/client/signup"
              className="inline-flex items-center justify-center rounded-lg px-6 py-3 text-base font-semibold text-white transition-colors"
              style={{ backgroundColor: 'oklch(0.611 0.196 26.9)' }}
            >
              Créer mon espace client →
            </Link>
            <Link
              href="/client"
              className="inline-flex items-center justify-center rounded-lg px-6 py-3 text-base font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            >
              J&apos;ai déjà un compte →
            </Link>
          </div>
        </div>
      </div>
    )
  }

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
