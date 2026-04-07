import { notFound } from 'next/navigation'
import FormPage from './FormPage'
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

interface PortalData {
  project: {
    name: string
    description: string | null
    settings: Record<string, unknown> | null
  }
  sections: OnboardingSection[]
  fields: FormField[]
}

async function getPortalData(publicId: string): Promise<PortalData | null> {
  try {
    const res = await fetch(
      `${APP_CONFIG.url}/api/portal/${publicId}`,
      { cache: 'no-store' }
    )
    if (!res.ok) return null
    const json = await res.json()
    return json.data ?? null
  } catch {
    return null
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

  if (!data) {
    notFound()
  }

  return (
    <FormPage
      project={data.project}
      sections={data.sections}
      fields={data.fields}
      publicId={publicId}
    />
  )
}
