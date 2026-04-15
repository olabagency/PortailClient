'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowLeft, Check, Plus, ClipboardList, Users } from 'lucide-react'
import { ClientModal } from '@/components/dashboard/ClientModal'
import { cn } from '@/lib/utils'

interface Client {
  id: string
  name: string
  company: string | null
}

interface TemplateOption {
  id: string
  name: string
  description: string | null
  kanban_config: Array<{ name: string; color?: string }>
  form_config: Array<{ label: string }>
  is_default: boolean
}

// ─── Preset color swatches ────────────────────────────────────────────────────
const COLOR_SWATCHES = [
  '#6366f1',
  '#8b5cf6',
  '#ec4899',
  '#E8553A',
  '#f59e0b',
  '#10b981',
  '#3b82f6',
  '#64748b',
]

// ─── Step indicator ───────────────────────────────────────────────────────────
const STEPS = [
  { label: 'Projet' },
  { label: 'Client' },
  { label: 'Template' },
]

function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {STEPS.map((step, index) => {
        const stepNumber = index + 1
        const isCompleted = stepNumber < currentStep
        const isCurrent = stepNumber === currentStep
        const isFuture = stepNumber > currentStep

        return (
          <div key={step.label} className="flex items-center">
            {/* Step circle + label */}
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  'h-8 w-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all',
                  isCompleted && 'bg-[#E8553A] text-white',
                  isCurrent && 'bg-white border-2 border-[#E8553A] text-[#E8553A]',
                  isFuture && 'bg-white border-2 border-gray-200 text-gray-400',
                )}
              >
                {isCompleted ? <Check className="h-4 w-4" /> : stepNumber}
              </div>
              <span
                className={cn(
                  'text-xs font-medium whitespace-nowrap',
                  isCurrent ? 'text-[#E8553A]' : isCompleted ? 'text-gray-700' : 'text-gray-400',
                )}
              >
                {step.label}
              </span>
            </div>

            {/* Connector line (not after last step) */}
            {index < STEPS.length - 1 && (
              <div
                className={cn(
                  'h-0.5 w-16 mb-6 mx-2 transition-all',
                  stepNumber < currentStep ? 'bg-[#E8553A]' : 'bg-gray-200',
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Step 1: Project info ─────────────────────────────────────────────────────
function Step1({
  name,
  setName,
  description,
  setDescription,
  color,
  setColor,
}: {
  name: string
  setName: (v: string) => void
  description: string
  setDescription: (v: string) => void
  color: string
  setColor: (v: string) => void
}) {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="name">
          Nom du projet <span className="text-destructive">*</span>
        </Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex : Site vitrine ACME"
          autoFocus
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Décrivez brièvement le projet..."
          rows={3}
        />
      </div>

      <div className="space-y-3">
        <Label>Couleur du projet</Label>
        <div className="flex gap-2.5 flex-wrap">
          {COLOR_SWATCHES.map((swatch) => (
            <button
              key={swatch}
              type="button"
              onClick={() => setColor(swatch)}
              className={cn(
                'h-8 w-8 rounded-full transition-all ring-offset-2',
                color === swatch ? 'ring-2 ring-gray-900 scale-110' : 'hover:scale-105',
              )}
              style={{ backgroundColor: swatch }}
              aria-label={`Couleur ${swatch}`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Step 2: Client ───────────────────────────────────────────────────────────
function Step2({
  clients,
  clientId,
  setClientId,
  onOpenClientModal,
}: {
  clients: Client[]
  clientId: string
  setClientId: (v: string) => void
  onOpenClientModal: () => void
}) {
  if (clients.length === 0) {
    return (
      <div className="text-center py-8 space-y-4">
        <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto">
          <Users className="h-6 w-6 text-gray-400" />
        </div>
        <div>
          <p className="font-medium text-gray-900">Aucun client</p>
          <p className="text-sm text-muted-foreground mt-1">
            Créez votre premier client pour l&apos;associer à ce projet.
          </p>
        </div>
        <Button type="button" onClick={onOpenClientModal}>
          <Plus className="h-4 w-4 mr-2" />
          Créer un client
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Associez ce projet à un client existant ou créez-en un nouveau.
      </p>

      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
        {/* "No client" option */}
        <button
          type="button"
          onClick={() => setClientId('')}
          className={cn(
            'w-full flex items-center gap-3 px-4 py-3 rounded-lg border text-left transition-all',
            clientId === ''
              ? 'border-[#E8553A] bg-[#E8553A]/5 text-[#E8553A]'
              : 'border-gray-200 hover:border-gray-300 text-muted-foreground',
          )}
        >
          <div
            className={cn(
              'h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0',
              clientId === '' ? 'border-[#E8553A]' : 'border-gray-300',
            )}
          >
            {clientId === '' && <div className="h-2.5 w-2.5 rounded-full bg-[#E8553A]" />}
          </div>
          <span className="text-sm font-medium">Aucun client</span>
        </button>

        {clients.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setClientId(c.id)}
            className={cn(
              'w-full flex items-center gap-3 px-4 py-3 rounded-lg border text-left transition-all',
              clientId === c.id
                ? 'border-[#E8553A] bg-[#E8553A]/5'
                : 'border-gray-200 hover:border-gray-300',
            )}
          >
            <div
              className={cn(
                'h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0',
                clientId === c.id ? 'border-[#E8553A]' : 'border-gray-300',
              )}
            >
              {clientId === c.id && <div className="h-2.5 w-2.5 rounded-full bg-[#E8553A]" />}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{c.name}</p>
              {c.company && (
                <p className="text-xs text-muted-foreground truncate">{c.company}</p>
              )}
            </div>
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={onOpenClientModal}
        className="flex items-center gap-2 text-sm text-[#E8553A] hover:text-[#E8553A]/80 font-medium transition-colors"
      >
        <Plus className="h-4 w-4" />
        Créer un nouveau client
      </button>
    </div>
  )
}

// ─── Step 3: Template ─────────────────────────────────────────────────────────
function Step3({
  templates,
  templatesLoaded,
  selectedTemplateId,
  setSelectedTemplateId,
}: {
  templates: TemplateOption[]
  templatesLoaded: boolean
  selectedTemplateId: string | null
  setSelectedTemplateId: (v: string | null) => void
}) {
  if (!templatesLoaded) {
    return (
      <div className="text-center py-10 text-sm text-muted-foreground">
        Chargement des templates...
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Choisissez un template pour préremplir le kanban et le formulaire d&apos;onboarding.
      </p>

      <div className="grid grid-cols-2 gap-3">
        {/* "No template" card */}
        <button
          type="button"
          onClick={() => setSelectedTemplateId(null)}
          className={cn(
            'relative flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-5 text-center transition-all',
            selectedTemplateId === null
              ? 'border-[#E8553A] bg-[#E8553A]/5'
              : 'border-gray-200 hover:border-gray-300',
          )}
        >
          {selectedTemplateId === null && (
            <div className="absolute top-2.5 right-2.5 h-5 w-5 rounded-full bg-[#E8553A] flex items-center justify-center">
              <Check className="h-3 w-3 text-white" />
            </div>
          )}
          <span className="text-sm font-medium text-gray-700">Sans template</span>
          <span className="text-xs text-muted-foreground">Partir de zéro</span>
        </button>

        {templates.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSelectedTemplateId(t.id)}
            className={cn(
              'relative flex flex-col gap-2 rounded-lg border-2 p-4 text-left transition-all',
              selectedTemplateId === t.id
                ? 'border-[#E8553A] bg-[#E8553A]/5'
                : 'border-gray-200 hover:border-gray-300',
            )}
          >
            {selectedTemplateId === t.id && (
              <div className="absolute top-2.5 right-2.5 h-5 w-5 rounded-full bg-[#E8553A] flex items-center justify-center">
                <Check className="h-3 w-3 text-white" />
              </div>
            )}
            <p className="text-sm font-semibold text-gray-900 pr-6 truncate">{t.name}</p>
            {t.description && (
              <p className="text-xs text-muted-foreground line-clamp-2">{t.description}</p>
            )}
            <div className="flex items-center gap-3 mt-1">
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <ClipboardList className="h-3 w-3" />
                {t.form_config?.length ?? 0} champ{(t.form_config?.length ?? 0) !== 1 ? 's' : ''}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Main wizard form ─────────────────────────────────────────────────────────
function NewProjectForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedClientId = searchParams.get('client') ?? ''
  const preselectedTemplateId = searchParams.get('template') ?? null

  const [step, setStep] = useState(1)

  // Step 1
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState('#E8553A')

  // Step 2
  const [clients, setClients] = useState<Client[]>([])
  const [clientId, setClientId] = useState(preselectedClientId)
  const [clientModalOpen, setClientModalOpen] = useState(false)

  // Step 3
  const [templates, setTemplates] = useState<TemplateOption[]>([])
  const [templatesLoaded, setTemplatesLoaded] = useState(false)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(preselectedTemplateId)

  // Submission
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load clients on mount
  useEffect(() => {
    fetch('/api/clients')
      .then((r) => r.json())
      .then(({ data }) => setClients(data ?? []))
  }, [])

  // Load templates when reaching step 3
  useEffect(() => {
    if (step !== 3 || templatesLoaded) return
    fetch('/api/templates')
      .then((r) => r.json())
      .then(({ data }) => {
        const all: TemplateOption[] = [
          ...(data?.defaults ?? []),
          ...(data?.mine ?? []),
        ]
        setTemplates(all)
        setTemplatesLoaded(true)
      })
  }, [step, templatesLoaded])

  function handleNext() {
    if (step === 1) {
      if (!name.trim()) return
      setStep(2)
    } else if (step === 2) {
      setStep(3)
    }
  }

  async function handleSubmit() {
    setLoading(true)
    setError(null)

    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name.trim(),
        description: description.trim() || null,
        color,
        client_id: clientId || null,
        status: 'active',
        template_id: selectedTemplateId ?? null,
      }),
    })

    const json = await res.json() as { data?: { id: string }; error?: string }

    if (!res.ok) {
      setError(json.error ?? 'Une erreur est survenue.')
      setLoading(false)
      return
    }

    router.push(`/dashboard/projects/${json.data!.id}`)
  }

  function handleClientCreated(newClient: Client) {
    setClients((prev) => [newClient, ...prev])
    setClientId(newClient.id)
    setClientModalOpen(false)
  }

  const step1Valid = name.trim().length > 0

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-2xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button
            type="button"
            onClick={() => (step === 1 ? router.back() : setStep(step - 1))}
            className="h-9 w-9 rounded-lg border bg-white shadow-sm flex items-center justify-center hover:bg-gray-50 transition-colors"
            aria-label="Retour"
          >
            <ArrowLeft className="h-4 w-4 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Nouveau projet</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Étape {step} sur {STEPS.length}
            </p>
          </div>
        </div>

        {/* Step indicator */}
        <StepIndicator currentStep={step} />

        {/* Card */}
        <Card className="shadow-sm border-gray-200">
          <CardContent className="pt-6 pb-6">
            {/* Step title */}
            <h2 className="text-base font-semibold text-gray-900 mb-5">
              {step === 1 && 'Informations du projet'}
              {step === 2 && 'Client associé'}
              {step === 3 && 'Template (optionnel)'}
            </h2>

            {step === 1 && (
              <Step1
                name={name}
                setName={setName}
                description={description}
                setDescription={setDescription}
                color={color}
                setColor={setColor}
              />
            )}
            {step === 2 && (
              <Step2
                clients={clients}
                clientId={clientId}
                setClientId={setClientId}
                onOpenClientModal={() => setClientModalOpen(true)}
              />
            )}
            {step === 3 && (
              <Step3
                templates={templates}
                templatesLoaded={templatesLoaded}
                selectedTemplateId={selectedTemplateId}
                setSelectedTemplateId={setSelectedTemplateId}
              />
            )}

            {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

            {/* Footer navigation */}
            <div className="flex items-center justify-between mt-8 pt-5 border-t border-gray-100">
              <div>
                {step > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setStep(step - 1)}
                  >
                    <ArrowLeft className="h-4 w-4 mr-1.5" />
                    Retour
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-3">
                {step === 3 && (
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={loading}
                    className="text-sm text-muted-foreground hover:text-gray-900 transition-colors disabled:opacity-50"
                  >
                    Ignorer
                  </button>
                )}

                {step < 3 ? (
                  <Button
                    type="button"
                    onClick={handleNext}
                    disabled={step === 1 && !step1Valid}
                  >
                    Suivant
                    <span className="ml-1.5">→</span>
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={handleSubmit}
                    disabled={loading}
                  >
                    {loading ? 'Création...' : 'Créer le projet'}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <ClientModal
        open={clientModalOpen}
        onClose={() => setClientModalOpen(false)}
        onSuccess={handleClientCreated}
        mode="create"
      />
    </div>
  )
}

// ─── Page export ──────────────────────────────────────────────────────────────
export default function NewProjectPage() {
  return (
    <Suspense>
      <NewProjectForm />
    </Suspense>
  )
}
