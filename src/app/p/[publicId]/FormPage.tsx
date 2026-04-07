'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { FieldRenderer } from '@/components/portal/FieldRenderer'
import { Button } from '@/components/ui/button'
import { CheckCircle2, Loader2 } from 'lucide-react'

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

interface ProjectData {
  name: string
  description: string | null
  settings: Record<string, unknown> | null
}

interface FormPageProps {
  project: ProjectData
  sections: OnboardingSection[]
  fields: FormField[]
  publicId: string
}

export default function FormPage({ project, sections, fields, publicId }: FormPageProps) {
  const router = useRouter()
  const storageKey = `cf_form_${publicId}`

  const [responses, setResponses] = useState<Record<string, unknown>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Restore depuis localStorage au mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        setResponses(JSON.parse(saved))
      }
    } catch {
      // ignorer les erreurs de parsing
    }
  }, [storageKey])

  // Sauvegarde auto avec debounce 2s
  const debouncedSave = useCallback(
    (() => {
      let timer: ReturnType<typeof setTimeout>
      return (data: Record<string, unknown>) => {
        clearTimeout(timer)
        timer = setTimeout(() => {
          try {
            localStorage.setItem(storageKey, JSON.stringify(data))
          } catch {
            // ignorer les erreurs de storage
          }
        }, 2000)
      }
    })(),
    [storageKey]
  )

  function handleChange(fieldId: string, value: unknown) {
    setResponses(prev => {
      const next = { ...prev, [fieldId]: value }
      debouncedSave(next)
      return next
    })
    // Effacer l'erreur du champ modifié
    if (errors[fieldId]) {
      setErrors(prev => {
        const next = { ...prev }
        delete next[fieldId]
        return next
      })
    }
  }

  // Calcul progression
  const requiredFields = fields.filter(f => f.required)
  const filledRequired = requiredFields.filter(f => {
    const v = responses[f.id]
    if (Array.isArray(v)) return v.length > 0
    return v !== undefined && v !== null && v !== ''
  })
  const progressPercent = requiredFields.length > 0
    ? Math.round((filledRequired.length / requiredFields.length) * 100)
    : 100

  // Validation
  function validate(): boolean {
    const newErrors: Record<string, string> = {}
    for (const field of requiredFields) {
      const v = responses[field.id]
      const isEmpty = Array.isArray(v) ? v.length === 0 : (v === undefined || v === null || v === '')
      if (isEmpty) {
        newErrors[field.id] = 'Ce champ est obligatoire'
      }
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    setSubmitting(true)
    setSubmitError(null)

    try {
      const res = await fetch(`/api/portal/${publicId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responses }),
      })
      const json = await res.json()

      if (!res.ok) {
        setSubmitError(json.error ?? 'Une erreur est survenue')
        setSubmitting(false)
        return
      }

      // Supprimer la sauvegarde locale
      try { localStorage.removeItem(storageKey) } catch { /* ignorer */ }

      router.push(`/p/${publicId}/success`)
    } catch {
      setSubmitError('Impossible d\'envoyer le formulaire. Vérifiez votre connexion.')
      setSubmitting(false)
    }
  }

  // Grouper les champs par section
  const sortedSections = [...sections].sort((a, b) => a.order_index - b.order_index)
  const fieldsBySection = (sectionId: string | null) =>
    fields.filter(f => f.section_id === sectionId).sort((a, b) => a.order_index - b.order_index)

  const unsectionedFields = fieldsBySection(null)
  const hasAnySections = sortedSections.length > 0

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* En-tête */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
          {project.description && (
            <p className="mt-2 text-gray-600">{project.description}</p>
          )}
        </div>

        {/* Barre de progression */}
        {requiredFields.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between text-sm text-gray-500 mb-1">
              <span>Progression</span>
              <span>{filledRequired.length} / {requiredFields.length} champ{requiredFields.length > 1 ? 's' : ''} obligatoire{requiredFields.length > 1 ? 's' : ''}</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Formulaire */}
        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            {/* Sections avec leurs champs */}
            {hasAnySections && sortedSections.map(section => {
              const sectionFields = fieldsBySection(section.id)
              if (sectionFields.length === 0) return null
              return (
                <div key={section.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="px-6 py-4 border-b bg-gray-50">
                    <h2 className="text-base font-semibold text-gray-800">{section.title}</h2>
                  </div>
                  <div className="px-6 py-5 space-y-5">
                    {sectionFields.map(field => (
                      <FieldRenderer
                        key={field.id}
                        field={field}
                        value={responses[field.id]}
                        onChange={(v) => handleChange(field.id, v)}
                        error={errors[field.id]}
                      />
                    ))}
                  </div>
                </div>
              )
            })}

            {/* Champs sans section */}
            {unsectionedFields.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {hasAnySections && (
                  <div className="px-6 py-4 border-b bg-gray-50">
                    <h2 className="text-base font-semibold text-gray-800">Informations complémentaires</h2>
                  </div>
                )}
                <div className="px-6 py-5 space-y-5">
                  {unsectionedFields.map(field => (
                    <FieldRenderer
                      key={field.id}
                      field={field}
                      value={responses[field.id]}
                      onChange={(v) => handleChange(field.id, v)}
                      error={errors[field.id]}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Message d'erreur global */}
            {submitError && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3">
                <p className="text-sm text-destructive">{submitError}</p>
              </div>
            )}

            {/* Bouton envoi */}
            <div className="flex justify-end">
              <Button type="submit" size="lg" disabled={submitting} className="min-w-32">
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Envoi en cours...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Envoyer
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
