'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button, buttonVariants } from '@/components/ui/button'
import { FieldRenderer } from '@/components/portal/FieldRenderer'
import { CheckCircle2, Lock, Loader2, Check } from 'lucide-react'

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

interface ProjectData {
  name: string
  description: string | null
  settings: Record<string, unknown> | null
}

interface FreelancerBranding {
  name: string | null
  company_name: string | null
  logo_url: string | null
  avatar_url: string | null
}

interface FormPageProps {
  project: ProjectData
  sections: OnboardingSection[]
  fields: FormField[]
  publicId: string
  initialClientInfo?: Partial<ClientInfo>
  freelancer?: FreelancerBranding
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

const STEPS = [
  { number: 1, label: 'Bienvenue' },
  { number: 2, label: 'Questionnaire' },
  { number: 3, label: 'Documents' },
  { number: 4, label: 'Accès techniques' },
  { number: 5, label: 'Vos informations' },
]

export default function FormPage({ project, sections, fields, publicId, initialClientInfo, freelancer }: FormPageProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [responses, setResponses] = useState<Record<string, unknown>>({})
  const [clientInfo, setClientInfo] = useState<ClientInfo>({
    first_name: initialClientInfo?.first_name ?? '',
    last_name: initialClientInfo?.last_name ?? '',
    email: initialClientInfo?.email ?? '',
    phone: initialClientInfo?.phone ?? '',
    company: initialClientInfo?.company ?? '',
    address: initialClientInfo?.address ?? '',
    city: initialClientInfo?.city ?? '',
    zip: initialClientInfo?.zip ?? '',
    country: initialClientInfo?.country ?? 'France',
    vat_number: initialClientInfo?.vat_number ?? '',
    siret: initialClientInfo?.siret ?? '',
    notes: initialClientInfo?.notes ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [portalInvited, setPortalInvited] = useState(false)
  const [sessionId, setSessionId] = useState<string>('')
  const [showSaved, setShowSaved] = useState(false)
  const autoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const key = `cf_session_${publicId}`
    let sid = localStorage.getItem(key)
    if (!sid) {
      sid = Math.random().toString(36).slice(2) + Date.now().toString(36)
      localStorage.setItem(key, sid)
    }
    setSessionId(sid)

    fetch(`/api/portal/${publicId}/progress?session_id=${sid}`)
      .then((r) => r.json())
      .then(({ data }: { data: { responses?: Record<string, unknown>; client_info?: Partial<ClientInfo>; current_step?: number; completed?: boolean } | null }) => {
        if (data) {
          setResponses(data.responses ?? {})
          setClientInfo((prev) => ({ ...prev, ...(data.client_info ?? {}) }))
          setCurrentStep(data.current_step ?? 1)
          if (data.completed) setSubmitted(true)
        }
      })
      .catch(() => {
        // silently ignore progress load errors
      })
  }, [publicId])

  function scheduleAutoSave(
    newResponses: Record<string, unknown>,
    newClientInfo: ClientInfo,
    step: number
  ) {
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current)
    autoSaveRef.current = setTimeout(async () => {
      if (!sessionId) return
      setSaving(true)
      setShowSaved(false)
      try {
        await fetch(`/api/portal/${publicId}/save`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: sessionId,
            current_step: step,
            responses: newResponses,
            client_info: newClientInfo,
            respondent_email: newClientInfo.email || null,
          }),
        })
        setShowSaved(true)
        if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
        savedTimerRef.current = setTimeout(() => setShowSaved(false), 3000)
      } finally {
        setSaving(false)
      }
    }, 2000)
  }

  function handleFieldChange(fieldId: string, value: unknown) {
    const updated = { ...responses, [fieldId]: value }
    setResponses(updated)
    scheduleAutoSave(updated, clientInfo, currentStep)
  }

  function handleClientInfoChange(field: keyof ClientInfo, value: string) {
    const updated = { ...clientInfo, [field]: value }
    setClientInfo(updated)
    scheduleAutoSave(responses, updated, currentStep)
  }

  function isStepComplete(step: number): boolean {
    if (step === 1) return currentStep > 1
    if (step === 2) {
      const qFields = fields.filter(
        (f) =>
          f.type !== 'file' &&
          sections.find((s) => s.id === f.section_id)?.kind !== 'access'
      )
      const required = qFields.filter((f) => f.required)
      if (required.length === 0) return currentStep > 2
      return required.every(
        (f) =>
          responses[f.id] !== undefined &&
          responses[f.id] !== '' &&
          responses[f.id] !== null
      )
    }
    if (step === 3) {
      const docFields = fields.filter((f) => f.type === 'file' && f.required)
      if (docFields.length === 0) return currentStep > 3
      return docFields.every((f) => !!responses[f.id])
    }
    if (step === 4) return currentStep > 4
    if (step === 5) {
      return !!(clientInfo.first_name && clientInfo.last_name && clientInfo.email)
    }
    return false
  }

  async function goToStep(step: number) {
    setCurrentStep(step)
    scheduleAutoSave(responses, clientInfo, step)
  }

  function handleNext() {
    if (currentStep < 5) goToStep(currentStep + 1)
    else handleSubmit()
  }

  function handlePrev() {
    if (currentStep > 1) goToStep(currentStep - 1)
  }

  async function handleSubmit() {
    setSubmitting(true)
    try {
      const allFields = fields.filter((f) => f.required)
      const missing = allFields.filter((f) => !responses[f.id])
      if (missing.length > 0) {
        toast.error(`Champs requis manquants : ${missing.map((f) => f.label).join(', ')}`)
        setSubmitting(false)
        return
      }

      const res = await fetch(`/api/portal/${publicId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          responses,
          client_info: clientInfo,
          respondent_name:
            `${clientInfo.first_name} ${clientInfo.last_name}`.trim() || null,
          respondent_email: clientInfo.email || null,
        }),
      })
      if (res.ok) {
        const json = (await res.json()) as { data?: { id: string; portal_invited?: boolean } }
        setPortalInvited(json.data?.portal_invited ?? false)
        setSubmitted(true)
        localStorage.removeItem(`cf_session_${publicId}`)
      } else {
        const json = (await res.json()) as { error?: string }
        toast.error(json.error ?? "Erreur lors de l'envoi")
      }
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setSubmitting(false)
    }
  }

  // Derived field groups
  const questionFields = fields
    .filter(
      (f) =>
        f.type !== 'file' &&
        sections.find((s) => s.id === f.section_id)?.kind !== 'access'
    )
    .sort((a, b) => a.order_index - b.order_index)

  const documentFields = fields
    .filter((f) => f.type === 'file')
    .sort((a, b) => a.order_index - b.order_index)

  const accessFields = fields
    .filter((f) => sections.find((s) => s.id === f.section_id)?.kind === 'access')
    .sort((a, b) => a.order_index - b.order_index)

  const defaultSections = sections
    .filter((s) => s.kind !== 'access')
    .sort((a, b) => a.order_index - b.order_index)

  const completedCount = submitted ? 5 : STEPS.filter((s) => isStepComplete(s.number)).length
  const progressPercent = (completedCount / 5) * 100

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 flex flex-col min-h-screen sticky top-0 h-screen">
        {/* Freelancer branding */}
        {(freelancer?.logo_url || freelancer?.avatar_url || freelancer?.name || freelancer?.company_name) && (
          <div className="px-6 pt-6 pb-4 border-b border-white/10 flex items-center gap-3">
            {(freelancer.logo_url ?? freelancer.avatar_url) ? (
              <img
                src={(freelancer.logo_url ?? freelancer.avatar_url)!}
                alt={freelancer.company_name ?? freelancer.name ?? ''}
                className="h-9 w-9 rounded-lg object-cover bg-white/10 shrink-0"
              />
            ) : (
              <div className="h-9 w-9 rounded-lg bg-white/10 flex items-center justify-center text-white font-bold text-sm shrink-0">
                {(freelancer.company_name ?? freelancer.name ?? '?').charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-white text-sm font-semibold truncate">
                {freelancer.company_name ?? freelancer.name}
              </p>
              {freelancer.company_name && freelancer.name && (
                <p className="text-gray-400 text-xs truncate">{freelancer.name}</p>
              )}
            </div>
          </div>
        )}
        {/* Top */}
        <div className="px-6 pt-6 pb-5 border-b border-white/10">
          <p className="text-white font-bold text-base leading-tight">{project.name}</p>
          <p className="text-gray-400 text-sm mt-1">Onboarding</p>
        </div>

        {/* Progress */}
        <div className="px-6 py-5 border-b border-white/10">
          <p className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-3">
            Progression
          </p>
          <div className="h-2 bg-gray-700 rounded-full overflow-hidden mb-2">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${progressPercent}%`,
                background: 'linear-gradient(to right, #ec4899, #a855f7)',
              }}
            />
          </div>
          <p className="text-gray-400 text-xs">
            {submitted ? 5 : completedCount}/5 étapes complétées
          </p>
        </div>

        {/* Step list */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {STEPS.map((step) => {
            const isActive = currentStep === step.number && !submitted
            const isCompleted = submitted || isStepComplete(step.number)

            return (
              <button
                key={step.number}
                onClick={() => !submitted && goToStep(step.number)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                  isActive
                    ? 'bg-white/10 text-white font-semibold'
                    : isCompleted
                    ? 'text-emerald-400 hover:bg-white/5'
                    : 'text-gray-400 hover:bg-white/5'
                }`}
              >
                <span
                  className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    isActive
                      ? 'bg-white text-gray-900'
                      : isCompleted
                      ? 'bg-emerald-500 text-white'
                      : 'bg-gray-700 text-gray-400'
                  }`}
                >
                  {isCompleted && !isActive ? <Check className="w-3.5 h-3.5" /> : step.number}
                </span>
                <span className="text-sm">{step.label}</span>
              </button>
            )
          })}
        </nav>

        {/* Bottom navigation */}
        {!submitted && (
          <div className="px-4 py-5 border-t border-white/10 space-y-2">
            <Button
              onClick={handleNext}
              disabled={submitting}
              className="w-full bg-white text-gray-900 hover:bg-gray-100 font-semibold"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Envoi...
                </>
              ) : currentStep === 5 ? (
                'Terminer l\'onboarding'
              ) : (
                'Suivant →'
              )}
            </Button>
            {currentStep > 1 && (
              <Button
                onClick={handlePrev}
                variant="ghost"
                className="w-full text-gray-400 hover:text-white hover:bg-white/10"
              >
                ← Précédent
              </Button>
            )}
          </div>
        )}
      </aside>

      {/* Main content */}
      <main className="flex-1 bg-white flex flex-col">
        {/* Header bar */}
        <div className="flex items-center justify-end px-8 py-3 border-b border-gray-100 min-h-[48px]">
          {saving && (
            <span className="flex items-center gap-1.5 text-xs text-gray-400">
              <Loader2 className="w-3 h-3 animate-spin" />
              Sauvegarde...
            </span>
          )}
          {!saving && showSaved && (
            <span className="text-xs text-emerald-600 font-medium">
              Tout est sauvegardé ✓
            </span>
          )}
        </div>

        {/* Step content */}
        <div className="flex-1 px-8 py-10 max-w-2xl mx-auto w-full">
          {submitted ? (
            <SuccessScreen portalInvited={portalInvited} />
          ) : (
            <>
              {currentStep === 1 && <StepWelcome projectName={project.name} settings={project.settings} />}
              {currentStep === 2 && (
                <StepQuestionnaire
                  fields={questionFields}
                  sections={defaultSections}
                  responses={responses}
                  onChange={handleFieldChange}
                />
              )}
              {currentStep === 3 && (
                <StepDocuments
                  fields={documentFields}
                  responses={responses}
                  onChange={handleFieldChange}
                  publicId={publicId}
                  sessionId={sessionId}
                />
              )}
              {currentStep === 4 && (
                <StepAccess
                  fields={accessFields}
                  responses={responses}
                  onChange={handleFieldChange}
                  publicId={publicId}
                  sessionId={sessionId}
                />
              )}
              {currentStep === 5 && (
                <StepClientInfo
                  clientInfo={clientInfo}
                  onChange={handleClientInfoChange}
                />
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}

// ── Step 1: Bienvenue ──────────────────────────────────────────────────────────

function StepWelcome({ projectName, settings }: { projectName: string; settings: Record<string, unknown> | null }) {
  const welcome = (settings?.welcome ?? {}) as Record<string, string>
  const title = welcome.title || 'Bienvenue ! 🎉'
  const message = welcome.message || 'Nous sommes ravis de vous accompagner sur votre projet'

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
        <p className="mt-2 text-gray-500 text-lg">{message}</p>
        <span className="inline-block mt-4 px-4 py-1.5 bg-gray-100 rounded-full text-sm font-medium text-gray-700">
          {projectName}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl bg-blue-50 p-5">
          <div className="text-2xl mb-2">📋</div>
          <p className="font-semibold text-gray-800 text-sm">Questionnaire projet</p>
          <p className="text-xs text-gray-500 mt-1">
            Parlez-nous de votre vision et objectifs
          </p>
        </div>
        <div className="rounded-xl bg-green-50 p-5">
          <div className="text-2xl mb-2">📁</div>
          <p className="font-semibold text-gray-800 text-sm">Vos documents</p>
          <p className="text-xs text-gray-500 mt-1">
            Partagez vos fichiers, logo et éléments visuels
          </p>
        </div>
        <div className="rounded-xl bg-sky-50 p-5">
          <div className="text-2xl mb-2">🔐</div>
          <p className="font-semibold text-gray-800 text-sm">Accès & informations</p>
          <p className="text-xs text-gray-500 mt-1">
            Partagez vos accès de façon 100% sécurisée
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-6 pt-2">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span>⚡</span>
          <span>Démarrage rapide</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span>💬</span>
          <span>Communication fluide</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span>🎯</span>
          <span>Résultat sur-mesure</span>
        </div>
      </div>
    </div>
  )
}

// ── Step 2: Questionnaire ──────────────────────────────────────────────────────

function StepQuestionnaire({
  fields,
  sections,
  responses,
  onChange,
}: {
  fields: FormField[]
  sections: OnboardingSection[]
  responses: Record<string, unknown>
  onChange: (fieldId: string, value: unknown) => void
}) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">📋 Questionnaire projet</h2>
        <p className="mt-2 text-gray-500">
          Parlez-nous de votre vision, vos objectifs et ce qui rend votre projet unique.
        </p>
      </div>

      {fields.length === 0 ? (
        <p className="text-gray-400 text-sm">Aucune question pour cette étape.</p>
      ) : (
        <div className="space-y-8">
          {sections.map((section) => {
            const sectionFields = fields
              .filter((f) => f.section_id === section.id)
              .sort((a, b) => a.order_index - b.order_index)
            if (sectionFields.length === 0) return null
            return (
              <div key={section.id} className="space-y-5">
                <div className="flex items-center gap-3">
                  <p className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
                    {section.title}
                  </p>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>
                {sectionFields.map((field) => (
                  <FieldRenderer
                    key={field.id}
                    field={field}
                    value={responses[field.id]}
                    onChange={(v) => onChange(field.id, v)}
                  />
                ))}
              </div>
            )
          })}

          {/* Fields without section */}
          {(() => {
            const unsectioned = fields
              .filter((f) => !f.section_id)
              .sort((a, b) => a.order_index - b.order_index)
            if (unsectioned.length === 0) return null
            return (
              <div className="space-y-5">
                {unsectioned.map((field) => (
                  <FieldRenderer
                    key={field.id}
                    field={field}
                    value={responses[field.id]}
                    onChange={(v) => onChange(field.id, v)}
                  />
                ))}
              </div>
            )
          })()}
        </div>
      )}
    </div>
  )
}

// ── Step 3: Documents ──────────────────────────────────────────────────────────

function StepDocuments({
  fields,
  responses,
  onChange,
  publicId,
  sessionId,
}: {
  fields: FormField[]
  responses: Record<string, unknown>
  onChange: (fieldId: string, value: unknown) => void
  publicId: string
  sessionId: string
}) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">📁 Vos documents</h2>
        <p className="mt-2 text-gray-500">
          Partagez votre logo, charte graphique et tout élément visuel utile.
        </p>
      </div>

      {fields.length === 0 ? (
        <p className="text-gray-400 text-sm">Aucun document requis pour ce projet.</p>
      ) : (
        <div className="space-y-5">
          {fields.map((field) => (
            <FieldRenderer
              key={field.id}
              field={field}
              value={responses[field.id]}
              onChange={(v) => onChange(field.id, v)}
              publicId={publicId}
              sessionId={sessionId}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Step 4: Accès techniques ───────────────────────────────────────────────────

function StepAccess({
  fields,
  responses,
  onChange,
  publicId,
  sessionId,
}: {
  fields: FormField[]
  responses: Record<string, unknown>
  onChange: (fieldId: string, value: unknown) => void
  publicId: string
  sessionId: string
}) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">🔐 Accès techniques</h2>
      </div>

      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3">
        <Lock className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-emerald-800 text-sm">Vos données sont protégées</p>
          <p className="text-emerald-700 text-sm mt-1">
            Tous vos identifiants sont chiffrés avec AES-256 et stockés de façon sécurisée.
            Seul votre prestataire y a accès. Aucune donnée n&apos;est partagée avec des tiers.
          </p>
        </div>
      </div>

      {fields.length === 0 ? (
        <p className="text-gray-400 text-sm">Aucun accès requis pour ce projet.</p>
      ) : (
        <div className="space-y-5">
          {fields.map((field) => (
            <div key={field.id}>
              <FieldRenderer
                field={{ ...field, label: `🔒 ${field.label}`, sensitive: true }}
                value={responses[field.id]}
                onChange={(v) => onChange(field.id, v)}
                publicId={publicId}
                sessionId={sessionId}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Step 5: Vos informations ───────────────────────────────────────────────────

function StepClientInfo({
  clientInfo,
  onChange,
}: {
  clientInfo: ClientInfo
  onChange: (field: keyof ClientInfo, value: string) => void
}) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">👤 Vos informations</h2>
        <p className="mt-2 text-gray-500">
          Ces informations sont nécessaires pour la conformité réglementaire et la facturation.
        </p>
      </div>

      <div className="bg-blue-50 rounded-lg p-3">
        <p className="text-sm text-blue-700">
          Vos informations personnelles sont traitées conformément au RGPD et ne sont jamais revendues.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="ci_first_name">
            Prénom <span className="text-red-500">*</span>
          </Label>
          <Input
            id="ci_first_name"
            value={clientInfo.first_name}
            onChange={(e) => onChange('first_name', e.target.value)}
            placeholder="Jean"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ci_last_name">
            Nom <span className="text-red-500">*</span>
          </Label>
          <Input
            id="ci_last_name"
            value={clientInfo.last_name}
            onChange={(e) => onChange('last_name', e.target.value)}
            placeholder="Dupont"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ci_email">
            Email <span className="text-red-500">*</span>
          </Label>
          <Input
            id="ci_email"
            type="email"
            value={clientInfo.email}
            onChange={(e) => onChange('email', e.target.value)}
            placeholder="jean@exemple.fr"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ci_phone">Téléphone</Label>
          <Input
            id="ci_phone"
            type="tel"
            value={clientInfo.phone}
            onChange={(e) => onChange('phone', e.target.value)}
            placeholder="+33 6 00 00 00 00"
          />
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="ci_company">Entreprise / Société</Label>
          <Input
            id="ci_company"
            value={clientInfo.company}
            onChange={(e) => onChange('company', e.target.value)}
            placeholder="Ma Société SAS"
          />
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="ci_address">Adresse</Label>
          <Input
            id="ci_address"
            value={clientInfo.address}
            onChange={(e) => onChange('address', e.target.value)}
            placeholder="12 rue de la Paix"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ci_city">Ville</Label>
          <Input
            id="ci_city"
            value={clientInfo.city}
            onChange={(e) => onChange('city', e.target.value)}
            placeholder="Paris"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ci_zip">Code postal</Label>
          <Input
            id="ci_zip"
            value={clientInfo.zip}
            onChange={(e) => onChange('zip', e.target.value)}
            placeholder="75001"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ci_country">Pays</Label>
          <Input
            id="ci_country"
            value={clientInfo.country}
            onChange={(e) => onChange('country', e.target.value)}
            placeholder="France"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ci_vat">Numéro TVA</Label>
          <Input
            id="ci_vat"
            value={clientInfo.vat_number}
            onChange={(e) => onChange('vat_number', e.target.value)}
            placeholder="FR 00 000 000 000"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ci_siret">SIRET / SIREN</Label>
          <Input
            id="ci_siret"
            value={clientInfo.siret}
            onChange={(e) => onChange('siret', e.target.value)}
            placeholder="000 000 000 00000"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="ci_notes">Commentaire / Informations complémentaires</Label>
        <Textarea
          id="ci_notes"
          value={clientInfo.notes}
          onChange={(e) => onChange('notes', e.target.value)}
          placeholder="Toute information utile : contexte, contraintes, questions, remarques..."
          rows={4}
        />
        <p className="text-xs text-muted-foreground">
          Partagez tout ce qui pourrait être utile à votre prestataire.
        </p>
      </div>
    </div>
  )
}

// ── Success screen ─────────────────────────────────────────────────────────────

function SuccessScreen({ portalInvited: _portalInvited }: { portalInvited: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-8">
      <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center">
        <CheckCircle2 className="w-10 h-10 text-emerald-500" />
      </div>

      <div className="space-y-3">
        <h2 className="text-3xl font-bold text-gray-900">Merci, votre dossier est bien envoyé ! 🎉</h2>
        <p className="text-gray-500 max-w-md mx-auto text-lg">
          Votre prestataire va examiner vos informations. En attendant, créez votre espace client pour suivre l&apos;avancement de votre projet.
        </p>
      </div>

      <div className="flex flex-col items-center gap-3 w-full max-w-xs">
        <Link
          href="/client/signup"
          className={buttonVariants({ size: 'lg' }) + ' w-full justify-center text-base font-semibold'}
          style={{ backgroundColor: 'oklch(0.534 0.107 251)', color: '#fff', borderColor: 'transparent' }}
        >
          Créer mon espace client →
        </Link>
        <Link
          href="/client"
          className="text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          J&apos;ai déjà un compte
        </Link>
      </div>

      <p className="text-xs text-gray-400 max-w-sm mx-auto">
        Vous pourrez voir l&apos;avancement de votre projet, les documents partagés et les étapes validées.
      </p>
    </div>
  )
}
