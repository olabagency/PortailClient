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
    .select('id, name, description, settings, status, client_id, user_id')
    .eq('public_id', publicId)
    .single()

  if (error || !project || project.status === 'archived') {
    return null
  }

  const adminClient2 = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data: freelancerProfile } = await adminClient2
    .from('profiles')
    .select('full_name, company_name, logo_url, avatar_url')
    .eq('id', project.user_id)
    .single()

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
      id: project.id,
      name: project.name,
      description: project.description,
      settings: project.settings as Record<string, unknown> | null,
    },
    freelancer: {
      name: freelancerProfile?.full_name ?? null,
      company_name: freelancerProfile?.company_name ?? null,
      logo_url: freelancerProfile?.logo_url ?? null,
      avatar_url: freelancerProfile?.avatar_url ?? null,
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
    const f = data.freelancer
    const senderDisplay = f.company_name ?? f.name ?? 'Votre prestataire'
    const logoSrc = f.logo_url ?? f.avatar_url
    const signupUrl = `/client/signup?project=${data.project.id}${data.initialClientInfo.email ? '&email=' + encodeURIComponent(data.initialClientInfo.email) : ''}`

    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-sky-50/20 to-slate-100 px-4 py-8">
        <div className="w-full max-w-[820px] flex flex-col md:flex-row overflow-hidden rounded-3xl shadow-xl bg-white">

          {/* Panneau gauche branding */}
          <div className="md:w-2/5 bg-gradient-to-br from-[#386FA4] to-[#2d5e8e] px-8 py-10 flex flex-col justify-between text-white">
            <div>
              {logoSrc ? (
                <img src={logoSrc} alt={senderDisplay} className="h-12 w-12 rounded-xl object-cover bg-white/20 mb-5" />
              ) : (
                <div className="h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center font-bold text-lg mb-5">
                  {senderDisplay.charAt(0).toUpperCase()}
                </div>
              )}
              <p className="text-white/70 text-sm mb-1">{senderDisplay}</p>
              <h2 className="text-xl font-bold mb-4">Suivez votre projet<br /><span className="text-white/90">{data.project.name}</span></h2>
              <ul className="space-y-2.5 text-sm text-white/80">
                {[
                  'Avancement en temps réel',
                  'Livrables & documents partagés',
                  'Échanges directs',
                  'Accès sécurisé',
                ].map(item => (
                  <li key={item} className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-white/60 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <p className="text-white/40 text-xs mt-8">Données hébergées en France</p>
          </div>

          {/* Panneau droit */}
          <div className="md:w-3/5 px-8 py-10 flex flex-col justify-center">
            <div className="flex justify-center mb-5">
              <div className="h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-emerald-600" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">Formulaire bien reçu ✓</h1>
            <p className="text-gray-500 text-center mb-7 text-sm leading-relaxed">
              Vos informations ont été transmises à <strong>{senderDisplay}</strong>.
              Créez maintenant votre espace client pour suivre l&apos;avancement de votre projet.
            </p>
            <div className="flex flex-col gap-3">
              <Link
                href={signupUrl}
                className="inline-flex items-center justify-center rounded-xl px-6 py-3 text-base font-semibold text-white transition-colors bg-[#386FA4] hover:bg-[#2d5e8e]"
              >
                Créer mon espace client →
              </Link>
              <Link
                href={`/client/login?project=${data.project.id}`}
                className="inline-flex items-center justify-center rounded-xl px-6 py-3 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors border border-gray-200"
              >
                J&apos;ai déjà un compte
              </Link>
            </div>
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
      freelancer={data.freelancer}
    />
  )
}
