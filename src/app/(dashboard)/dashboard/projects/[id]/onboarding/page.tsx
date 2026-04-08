'use client'

import { useState, useEffect, use, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy,
  useSortable, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  ArrowLeft, Plus, GripVertical, Pencil, Trash2, Eye, Layers,
  ChevronDown, ChevronRight, Send, UserCircle, CheckCircle2,
  FileText, Lock, KeyRound, Loader2, RefreshCw,
} from 'lucide-react'
import { APP_CONFIG } from '@/config/app.config'
import type { FormFieldType } from '@/config/app.config'

// ─── Types ───────────────────────────────────────────────────────────────────

interface FormField {
  id: string
  type: FormFieldType | 'password'
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
  project_id: string
  kind: string
}

interface FormFieldMeta {
  id: string
  label: string
  type: string
  order_index: number
}

interface OnboardingResponse {
  id: string
  current_step: number
  responses: Record<string, string | string[]>
  client_info: Record<string, string>
  completed: boolean
  validated_at: string | null
  respondent_email: string | null
  submitted_at: string | null
  updated_at: string | null
}

// ─── Access field types ───────────────────────────────────────────────────────

const ACCESS_TYPES = [
  { value: 'password', label: 'Mot de passe', icon: '🔑' },
  { value: 'url', label: 'Lien / URL', icon: '🌐' },
  { value: 'text', label: 'Identifiant / Texte', icon: '📝' },
  { value: 'textarea', label: 'Notes / Texte long', icon: '📋' },
]

// ─── Default factories ────────────────────────────────────────────────────────

const defaultField = (): Omit<FormField, 'id' | 'order_index'> => ({
  type: 'text',
  label: '',
  description: '',
  placeholder: '',
  required: false,
  options: null,
  section_id: null,
  sensitive: false,
})

const defaultDocumentField = (): Omit<FormField, 'id' | 'order_index'> => ({
  type: 'file',
  label: '',
  description: '',
  placeholder: '',
  required: false,
  options: null,
  section_id: null,
  sensitive: false,
})

const defaultAccessField = (): { label: string; accessType: string; description: string; required: boolean } => ({
  label: '',
  accessType: 'password',
  description: '',
  required: false,
})

// ─── SortableField ────────────────────────────────────────────────────────────

function SortableField({
  field,
  onEdit,
  onDelete,
}: {
  field: FormField
  onEdit: (f: FormField) => void
  onDelete: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: field.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }
  const allTypes = [...APP_CONFIG.formFieldTypes, { type: 'password', label: 'Mot de passe' }]
  const typeLabel = allTypes.find(t => t.type === field.type)?.label ?? field.type

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 bg-white border rounded-lg p-3 group">
      <button {...attributes} {...listeners} className="cursor-grab text-muted-foreground hover:text-foreground shrink-0">
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">{field.label || '(sans titre)'}</span>
          {field.required && <Badge variant="destructive" className="text-xs py-0">Requis</Badge>}
          {field.sensitive && <Badge variant="secondary" className="text-xs py-0 text-amber-700 bg-amber-50 border-amber-200">Sensible</Badge>}
        </div>
        <p className="text-xs text-muted-foreground">{typeLabel}</p>
      </div>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(field)}>
          <Pencil className="h-3 w-3" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => onDelete(field.id)}>
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  )
}

// ─── SortableSection ──────────────────────────────────────────────────────────

function SortableSection({
  section,
  fields,
  onEditSection,
  onDeleteSection,
  onEditField,
  onDeleteField,
  onAddField,
  sensors,
  onFieldsDragEnd,
}: {
  section: OnboardingSection | null
  fields: FormField[]
  onEditSection: (s: OnboardingSection) => void
  onDeleteSection: (id: string) => void
  onEditField: (f: FormField) => void
  onDeleteField: (id: string) => void
  onAddField: (sectionId: string | null) => void
  sensors: ReturnType<typeof useSensors>
  onFieldsDragEnd: (event: DragEndEvent, sectionId: string | null) => void
}) {
  const [collapsed, setCollapsed] = useState(false)
  const sortableProps = section
    ? useSortable({ id: section.id }) // eslint-disable-line react-hooks/rules-of-hooks
    : { attributes: {}, listeners: {}, setNodeRef: () => undefined, transform: null, transition: undefined, isDragging: false }

  const style = section
    ? {
        transform: CSS.Transform.toString(sortableProps.transform),
        transition: sortableProps.transition,
        opacity: sortableProps.isDragging ? 0.5 : 1,
      }
    : {}

  return (
    <div
      ref={section ? (sortableProps as ReturnType<typeof useSortable>).setNodeRef : undefined}
      style={style}
      className="border rounded-lg bg-gray-50 overflow-hidden"
    >
      <div className="flex items-center gap-2 px-4 py-3 bg-white border-b group">
        {section && (
          <button
            {...(sortableProps as ReturnType<typeof useSortable>).attributes}
            {...(sortableProps as ReturnType<typeof useSortable>).listeners}
            className="cursor-grab text-muted-foreground hover:text-foreground shrink-0"
          >
            <GripVertical className="h-4 w-4" />
          </button>
        )}
        {!section && <Layers className="h-4 w-4 text-muted-foreground shrink-0" />}
        <button
          className="flex items-center gap-1 flex-1 text-left"
          onClick={() => setCollapsed(v => !v)}
        >
          {collapsed ? <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
          <span className="text-sm font-semibold">
            {section ? section.title : 'Sans section'}
          </span>
          <Badge variant="secondary" className="ml-1 text-xs py-0">{fields.length}</Badge>
        </button>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => onAddField(section?.id ?? null)}>
            <Plus className="h-3 w-3 mr-1" />
            Champ
          </Button>
          {section && (
            <>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEditSection(section)}>
                <Pencil className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive"
                onClick={() => onDeleteSection(section.id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </>
          )}
        </div>
      </div>

      {!collapsed && (
        <div className="p-3">
          {fields.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-xs text-muted-foreground mb-2">
                {section ? 'Aucun champ dans cette section.' : 'Aucun champ sans section.'}
              </p>
              <Button variant="outline" size="sm" onClick={() => onAddField(section?.id ?? null)}>
                <Plus className="h-3 w-3 mr-1" />
                Ajouter un champ
              </Button>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={(e) => onFieldsDragEnd(e, section?.id ?? null)}
            >
              <SortableContext items={fields.map(f => f.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {fields.map(field => (
                    <SortableField
                      key={field.id}
                      field={field}
                      onEdit={onEditField}
                      onDelete={onDeleteField}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      )}
    </div>
  )
}

// ─── ResponseCard ─────────────────────────────────────────────────────────────

function ResponseCard({
  response,
  formFields,
  projectId,
  onValidate,
}: {
  response: OnboardingResponse
  formFields: FormFieldMeta[]
  projectId: string
  onValidate: (responseId: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [validating, setValidating] = useState(false)

  const answeredCount = formFields.filter(f => {
    const val = response.responses[f.id]
    return val !== undefined && val !== null && val !== ''
  }).length

  const formatValue = (value: string | string[] | undefined): string => {
    if (value === null || value === undefined || value === '') return '—'
    if (Array.isArray(value)) return value.join(', ')
    return String(value)
  }

  const clientInfoEntries = response.client_info ? Object.entries(response.client_info).filter(([, v]) => v) : []

  const labelMap: Record<string, string> = {
    first_name: 'Prénom', last_name: 'Nom', email: 'Email', phone: 'Téléphone',
    company: 'Entreprise', address: 'Adresse', city: 'Ville', zip: 'Code postal',
    country: 'Pays', vat_number: 'TVA', siret: 'SIRET',
  }

  async function handleValidateClick() {
    setValidating(true)
    try {
      await onValidate(response.id)
    } finally {
      setValidating(false)
    }
  }

  const activityDate = response.updated_at
    ? new Date(response.updated_at)
    : response.submitted_at
      ? new Date(response.submitted_at)
      : null
  const dateLabel = activityDate
    ? formatDistanceToNow(activityDate, { addSuffix: true, locale: fr })
    : null

  const clientName = response.client_info
    ? [response.client_info.first_name, response.client_info.last_name].filter(Boolean).join(' ')
    : null

  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <UserCircle className="h-8 w-8 text-muted-foreground shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {clientName || response.respondent_email || 'Anonyme'}
              </p>
              {response.respondent_email && (
                <p className="text-xs text-muted-foreground truncate">{response.respondent_email}</p>
              )}
              {dateLabel && (
                <p className="text-xs text-muted-foreground mt-0.5">{dateLabel}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {response.validated_at ? (
              <Badge className="text-xs bg-green-100 text-green-800 border-green-200 hover:bg-green-100">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Validé ✓
              </Badge>
            ) : response.completed ? (
              <Badge className="text-xs bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100">
                Soumis — En attente de validation
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-xs">
                En cours · Étape {response.current_step}/5
              </Badge>
            )}
            <button
              onClick={() => setExpanded(v => !v)}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label={expanded ? 'Réduire' : 'Développer'}
            >
              {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {!response.completed && (
          <div className="mt-3">
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-400 rounded-full transition-all"
                style={{ width: `${Math.max(0, (response.current_step - 1) / 5 * 100)}%` }}
              />
            </div>
          </div>
        )}

        {expanded && (
          <div className="mt-4 space-y-4 border-t pt-4">
            {clientInfoEntries.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Informations client</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  {clientInfoEntries.map(([key, value]) => (
                    <div key={key}>
                      <p className="text-xs text-muted-foreground">{labelMap[key] ?? key}</p>
                      <p className="text-sm font-medium">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {formFields.length > 0 && (
              <div className="space-y-3">
                {formFields.map(field => {
                  const value = response.responses[field.id]
                  if (value === undefined) return null
                  return (
                    <div key={field.id}>
                      <p className="text-xs font-medium text-muted-foreground mb-0.5">{field.label}</p>
                      <p className="text-sm">{formatValue(value)}</p>
                    </div>
                  )
                })}
              </div>
            )}

            {answeredCount === 0 && clientInfoEntries.length === 0 && (
              <p className="text-xs text-muted-foreground">Aucune réponse enregistrée.</p>
            )}
          </div>
        )}

        {response.completed && !response.validated_at && (
          <div className="mt-3 pt-3 border-t">
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white"
              disabled={validating}
              onClick={handleValidateClick}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              {validating ? 'Validation...' : '✓ Valider l\'onboarding'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function OnboardingEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()

  const [fields, setFields] = useState<FormField[]>([])
  const [sections, setSections] = useState<OnboardingSection[]>([])
  const [loading, setLoading] = useState(true)
  const [publicId, setPublicId] = useState<string>('')
  const [activeTab, setActiveTab] = useState('questionnaire')

  // Responses
  const [responses, setResponses] = useState<OnboardingResponse[]>([])
  const [formFieldsMeta, setFormFieldsMeta] = useState<FormFieldMeta[]>([])
  const [responsesLoading, setResponsesLoading] = useState(false)
  const [responsesLoaded, setResponsesLoaded] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Invite dialog
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteSending, setInviteSending] = useState(false)

  // Field modal (for questionnaire)
  const [editField, setEditField] = useState<FormField | null>(null)
  const [newField, setNewField] = useState<Omit<FormField, 'id' | 'order_index'>>(defaultField())
  const [fieldModalOpen, setFieldModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [optionInput, setOptionInput] = useState('')

  // Document field modal
  const [editDocField, setEditDocField] = useState<FormField | null>(null)
  const [newDocField, setNewDocField] = useState<Omit<FormField, 'id' | 'order_index'>>(defaultDocumentField())
  const [docModalOpen, setDocModalOpen] = useState(false)
  const [savingDoc, setSavingDoc] = useState(false)

  // Access field modal
  const [editAccessField, setEditAccessField] = useState<FormField | null>(null)
  const [newAccessField, setNewAccessField] = useState(defaultAccessField())
  const [accessModalOpen, setAccessModalOpen] = useState(false)
  const [savingAccess, setSavingAccess] = useState(false)

  // Section modal
  const [sectionModalOpen, setSectionModalOpen] = useState(false)
  const [editSection, setEditSection] = useState<OnboardingSection | null>(null)
  const [sectionTitle, setSectionTitle] = useState('')
  const [savingSection, setSavingSection] = useState(false)
  const [deletingSectionId, setDeletingSectionId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  // Load data
  useEffect(() => {
    // Fetch fields + sections + public_id in parallel
    Promise.all([
      fetch(`/api/projects/${id}/fields`).then(r => r.json()),
      fetch(`/api/projects/${id}`).then(r => r.json()),
    ]).then(([fieldsData, projectData]) => {
      setFields(fieldsData.data?.fields ?? [])
      setSections(fieldsData.data?.sections ?? [])
      setPublicId(projectData.data?.public_id ?? '')
      setLoading(false)
    })
  }, [id])

  const loadResponses = useCallback(async (force = false) => {
    if (responsesLoaded && !force) return
    if (force) setRefreshing(true)
    else setResponsesLoading(true)
    try {
      const res = await fetch(`/api/projects/${id}/responses`)
      const json = await res.json()
      if (res.ok) {
        setResponses(json.data?.responses ?? [])
        setFormFieldsMeta(json.data?.fields ?? [])
        setResponsesLoaded(true)
        setLastRefresh(new Date())
      }
    } finally {
      setRefreshing(false)
      setResponsesLoading(false)
    }
  }, [id, responsesLoaded])

  useEffect(() => {
    if (activeTab === 'responses') loadResponses()
  }, [activeTab, loadResponses])

  // Polling toutes les 15s quand l'onglet Réponses est actif
  useEffect(() => {
    if (activeTab === 'responses') {
      pollIntervalRef.current = setInterval(() => {
        loadResponses(true)
      }, 15000)
    } else {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
      }
    }
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
      }
    }
  }, [activeTab, loadResponses])

  // ── Validate onboarding ──
  async function handleValidate(responseId: string) {
    try {
      const res = await fetch(`/api/projects/${id}/responses/${responseId}`, { method: 'PUT' })
      if (!res.ok) throw new Error()
      setResponses(prev => prev.map(r =>
        r.id === responseId ? { ...r, validated_at: new Date().toISOString() } : r
      ))
      toast.success('Onboarding validé !')
    } catch {
      toast.error('Erreur lors de la validation')
    }
  }

  // ── Invite ──
  async function handleSendInvite(e: React.FormEvent) {
    e.preventDefault()
    setInviteSending(true)
    try {
      const res = await fetch(`/api/projects/${id}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail }),
      })
      const json = await res.json()
      if (res.ok) {
        toast.success('Invitation envoyée !')
        setInviteOpen(false)
        setInviteEmail('')
      } else {
        toast.error(json.error ?? 'Erreur lors de l\'envoi.')
      }
    } catch {
      toast.error('Erreur lors de l\'envoi.')
    } finally {
      setInviteSending(false)
    }
  }

  // ── Derived data ──
  const questionFields = fields
    .filter(f => f.type !== 'file' && sections.find(s => s.id === f.section_id)?.kind !== 'access')
    .sort((a, b) => a.order_index - b.order_index)

  const documentFields = fields
    .filter(f => f.type === 'file')
    .sort((a, b) => a.order_index - b.order_index)

  const accessFields = fields
    .filter(f => {
      const sec = sections.find(s => s.id === f.section_id)
      return sec?.kind === 'access'
    })
    .sort((a, b) => a.order_index - b.order_index)

  const defaultSections = sections.filter(s => s.kind !== 'access').sort((a, b) => a.order_index - b.order_index)

  // ── Field helpers ──
  const fieldsBySectionId = useCallback((sectionId: string | null) => {
    return questionFields
      .filter(f => f.section_id === sectionId)
      .sort((a, b) => a.order_index - b.order_index)
  }, [questionFields])

  const unsectionedFields = questionFields.filter(f => !f.section_id)

  // ── Drag & drop sections ──
  async function handleSectionsDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = defaultSections.findIndex(s => s.id === active.id)
    const newIndex = defaultSections.findIndex(s => s.id === over.id)
    const reordered = arrayMove(defaultSections, oldIndex, newIndex).map((s, i) => ({ ...s, order_index: i }))
    setSections(prev => {
      const access = prev.filter(s => s.kind === 'access')
      return [...reordered, ...access]
    })
    await fetch(`/api/projects/${id}/sections/reorder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: reordered.map(s => ({ id: s.id, order_index: s.order_index })) }),
    })
  }

  // ── Drag & drop fields ──
  async function handleFieldsDragEnd(event: DragEndEvent, sectionId: string | null) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const sectionFields = fieldsBySectionId(sectionId)
    const oldIndex = sectionFields.findIndex(f => f.id === active.id)
    const newIndex = sectionFields.findIndex(f => f.id === over.id)
    const reordered = arrayMove(sectionFields, oldIndex, newIndex).map((f, i) => ({ ...f, order_index: i }))
    setFields(prev => {
      const others = prev.filter(f => f.section_id !== sectionId || f.type === 'file')
      return [...others, ...reordered]
    })
    await fetch(`/api/projects/${id}/fields/reorder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: reordered.map(f => ({ id: f.id, order_index: f.order_index })) }),
    })
  }

  // ── Questionnaire field modal ──
  function openAddFieldModal(sectionId: string | null) {
    setEditField(null)
    setNewField({ ...defaultField(), section_id: sectionId })
    setOptionInput('')
    setFieldModalOpen(true)
  }

  function openEditFieldModal(field: FormField) {
    setEditField(field)
    setNewField({
      type: field.type,
      label: field.label,
      description: field.description ?? '',
      placeholder: field.placeholder ?? '',
      required: field.required,
      options: field.options,
      section_id: field.section_id,
      sensitive: field.sensitive,
    })
    setOptionInput('')
    setFieldModalOpen(true)
  }

  async function handleSaveField(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    if (editField) {
      const res = await fetch(`/api/projects/${id}/fields/${editField.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newField),
      })
      const json = await res.json()
      if (res.ok) setFields(prev => prev.map(f => f.id === editField.id ? { ...f, ...json.data } : f))
    } else {
      const sectionFields = fieldsBySectionId(newField.section_id)
      const res = await fetch(`/api/projects/${id}/fields`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newField, order_index: sectionFields.length }),
      })
      const json = await res.json()
      if (res.ok) setFields(prev => [...prev, json.data])
    }
    setSaving(false)
    setFieldModalOpen(false)
  }

  async function handleDeleteField(fieldId: string) {
    await fetch(`/api/projects/${id}/fields/${fieldId}`, { method: 'DELETE' })
    setFields(prev => prev.filter(f => f.id !== fieldId))
  }

  function addOption() {
    if (!optionInput.trim()) return
    setNewField(prev => ({ ...prev, options: [...(prev.options ?? []), optionInput.trim()] }))
    setOptionInput('')
  }

  function removeOption(idx: number) {
    setNewField(prev => ({ ...prev, options: prev.options?.filter((_, i) => i !== idx) ?? null }))
  }

  // ── Section modal ──
  function openAddSectionModal() {
    setEditSection(null)
    setSectionTitle('')
    setSectionModalOpen(true)
  }

  function openEditSectionModal(section: OnboardingSection) {
    setEditSection(section)
    setSectionTitle(section.title)
    setSectionModalOpen(true)
  }

  async function handleSaveSection(e: React.FormEvent) {
    e.preventDefault()
    if (!sectionTitle.trim()) return
    setSavingSection(true)
    if (editSection) {
      const res = await fetch(`/api/projects/${id}/sections/${editSection.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: sectionTitle.trim() }),
      })
      const json = await res.json()
      if (res.ok) setSections(prev => prev.map(s => s.id === editSection.id ? { ...s, ...json.data } : s))
    } else {
      const res = await fetch(`/api/projects/${id}/sections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: sectionTitle.trim(), kind: 'default' }),
      })
      const json = await res.json()
      if (res.ok) setSections(prev => [...prev, json.data])
    }
    setSavingSection(false)
    setSectionModalOpen(false)
  }

  async function handleDeleteSection(sectionId: string) {
    await fetch(`/api/projects/${id}/sections/${sectionId}`, { method: 'DELETE' })
    setSections(prev => prev.filter(s => s.id !== sectionId))
    setFields(prev => prev.map(f => f.section_id === sectionId ? { ...f, section_id: null } : f))
    setDeletingSectionId(null)
  }

  // ── Document field modal ──
  function openAddDocModal() {
    setEditDocField(null)
    setNewDocField(defaultDocumentField())
    setDocModalOpen(true)
  }

  function openEditDocModal(field: FormField) {
    setEditDocField(field)
    setNewDocField({
      type: 'file',
      label: field.label,
      description: field.description ?? '',
      placeholder: field.placeholder ?? '',
      required: field.required,
      options: field.options,
      section_id: field.section_id,
      sensitive: false,
    })
    setDocModalOpen(true)
  }

  async function handleSaveDocField(e: React.FormEvent) {
    e.preventDefault()
    setSavingDoc(true)
    try {
      if (editDocField) {
        const res = await fetch(`/api/projects/${id}/fields/${editDocField.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ label: newDocField.label, description: newDocField.description, required: newDocField.required }),
        })
        const json = await res.json()
        if (res.ok) {
          setFields(prev => prev.map(f => f.id === editDocField.id ? { ...f, ...json.data } : f))
          setDocModalOpen(false)
        } else {
          toast.error(json.error ?? 'Erreur lors de la modification')
        }
      } else {
        const res = await fetch(`/api/projects/${id}/fields`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'file',
            label: newDocField.label,
            description: newDocField.description ?? '',
            placeholder: '',
            required: newDocField.required,
            options: null,
            section_id: null,
            sensitive: false,
            order_index: documentFields.length,
          }),
        })
        const json = await res.json()
        if (res.ok) {
          setFields(prev => [...prev, json.data])
          setDocModalOpen(false)
        } else {
          toast.error(json.error ?? 'Erreur lors de l\'enregistrement')
        }
      }
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setSavingDoc(false)
    }
  }

  // ── Access field modal ──
  async function getOrCreateAccessSection(): Promise<string> {
    const existing = sections.find(s => s.kind === 'access')
    if (existing) return existing.id

    const res = await fetch(`/api/projects/${id}/sections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Accès techniques', kind: 'access' }),
    })
    const json = await res.json()
    if (res.ok) {
      setSections(prev => [...prev, json.data])
      return json.data.id as string
    }
    throw new Error('Impossible de créer la section accès')
  }

  function openAddAccessModal() {
    setEditAccessField(null)
    setNewAccessField(defaultAccessField())
    setAccessModalOpen(true)
  }

  function openEditAccessModal(field: FormField) {
    setEditAccessField(field)
    const accessType = field.sensitive ? 'password' : field.type
    setNewAccessField({
      label: field.label,
      accessType: accessType as string,
      description: field.description ?? '',
      required: field.required,
    })
    setAccessModalOpen(true)
  }

  async function handleSaveAccessField(e: React.FormEvent) {
    e.preventDefault()
    setSavingAccess(true)
    try {
      const isPassword = newAccessField.accessType === 'password'
      const fieldType = isPassword ? 'text' : newAccessField.accessType
      const sensitive = isPassword

      if (editAccessField) {
        const res = await fetch(`/api/projects/${id}/fields/${editAccessField.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            label: newAccessField.label,
            description: newAccessField.description,
            required: newAccessField.required,
            sensitive,
          }),
        })
        const json = await res.json()
        if (res.ok) {
          setFields(prev => prev.map(f => f.id === editAccessField.id ? { ...f, ...json.data } : f))
          setAccessModalOpen(false)
        } else {
          toast.error(json.error ?? 'Erreur lors de la modification')
        }
      } else {
        const sectionId = await getOrCreateAccessSection()
        const res = await fetch(`/api/projects/${id}/fields`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: fieldType,
            label: newAccessField.label,
            description: newAccessField.description ?? '',
            placeholder: '',
            required: newAccessField.required,
            options: null,
            section_id: sectionId,
            sensitive,
            order_index: accessFields.length,
          }),
        })
        const json = await res.json()
        if (res.ok) {
          setFields(prev => [...prev, json.data])
          setAccessModalOpen(false)
        } else {
          toast.error(json.error ?? 'Erreur lors de l\'enregistrement')
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setSavingAccess(false)
    }
  }

  const needsOptions = newField.type === 'select' || newField.type === 'multiselect'
  const sortedSections = [...defaultSections].sort((a, b) => a.order_index - b.order_index)

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Formulaire d&apos;onboarding</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Personnalisez les informations demandées au client</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setInviteOpen(true)}>
            <Send className="h-4 w-4 mr-2" />
            Envoyer au client
          </Button>
          {publicId && (
            <Button variant="outline" size="sm" onClick={() => router.push(`/p/${publicId}`)}>
              <Eye className="h-4 w-4 mr-2" />
              Aperçu
            </Button>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="questionnaire">
            📋 Questionnaire
            {questionFields.length > 0 && (
              <Badge variant="secondary" className="ml-1.5 text-xs py-0">{questionFields.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="documents">
            📁 Documents
            {documentFields.length > 0 && (
              <Badge variant="secondary" className="ml-1.5 text-xs py-0">{documentFields.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="access">
            🔐 Accès
            {accessFields.length > 0 && (
              <Badge variant="secondary" className="ml-1.5 text-xs py-0">{accessFields.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="responses">
            Réponses
            {responses.length > 0 && (
              <Badge variant="secondary" className="ml-1.5 text-xs py-0">{responses.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Tab: Questionnaire ── */}
        <TabsContent value="questionnaire" className="mt-4 space-y-4">
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => openAddFieldModal(null)}>
              <Plus className="h-4 w-4 mr-1" />
              Ajouter un champ
            </Button>
            <Button variant="outline" size="sm" onClick={openAddSectionModal}>
              <Layers className="h-4 w-4 mr-1" />
              Nouvelle section
            </Button>
          </div>

          <div className="rounded-lg bg-blue-50 border border-blue-100 px-4 py-3 text-sm text-blue-700">
            Ces champs apparaissent à l&apos;étape <strong>Questionnaire</strong> du formulaire client (texte, listes, dates...).
          </div>

          {loading ? (
            <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}</div>
          ) : sortedSections.length === 0 && unsectionedFields.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground text-sm mb-3">Aucune question. Ajoutez des champs pour votre client.</p>
                <div className="flex gap-2 justify-center">
                  <Button variant="outline" onClick={() => openAddFieldModal(null)}>
                    <Plus className="h-4 w-4 mr-2" />Premier champ
                  </Button>
                  <Button variant="outline" onClick={openAddSectionModal}>
                    <Layers className="h-4 w-4 mr-2" />Première section
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {sortedSections.length > 0 && (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleSectionsDragEnd}>
                  <SortableContext items={sortedSections.map(s => s.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-3">
                      {sortedSections.map(section => (
                        <SortableSection
                          key={section.id}
                          section={section}
                          fields={fieldsBySectionId(section.id)}
                          onEditSection={openEditSectionModal}
                          onDeleteSection={(sid) => setDeletingSectionId(sid)}
                          onEditField={openEditFieldModal}
                          onDeleteField={handleDeleteField}
                          onAddField={openAddFieldModal}
                          sensors={sensors}
                          onFieldsDragEnd={handleFieldsDragEnd}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
              {(unsectionedFields.length > 0 || sortedSections.length === 0) && (
                <SortableSection
                  section={null}
                  fields={unsectionedFields}
                  onEditSection={() => {}}
                  onDeleteSection={() => {}}
                  onEditField={openEditFieldModal}
                  onDeleteField={handleDeleteField}
                  onAddField={openAddFieldModal}
                  sensors={sensors}
                  onFieldsDragEnd={handleFieldsDragEnd}
                />
              )}
            </div>
          )}

          {(questionFields.length > 0 || sections.filter(s => s.kind !== 'access').length > 0) && (
            <Card>
              <CardContent className="py-3">
                <div className="flex gap-4 text-sm text-muted-foreground">
                  <span><strong className="text-foreground">{questionFields.length}</strong> champ{questionFields.length > 1 ? 's' : ''}</span>
                  <Separator orientation="vertical" className="h-4" />
                  <span><strong className="text-foreground">{questionFields.filter(f => f.required).length}</strong> obligatoire{questionFields.filter(f => f.required).length > 1 ? 's' : ''}</span>
                  <Separator orientation="vertical" className="h-4" />
                  <span><strong className="text-foreground">{sections.filter(s => s.kind !== 'access').length}</strong> section{sections.filter(s => s.kind !== 'access').length > 1 ? 's' : ''}</span>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Tab: Documents ── */}
        <TabsContent value="documents" className="mt-4 space-y-4">
          <Button size="sm" onClick={openAddDocModal}>
            <Plus className="h-4 w-4 mr-1" />
            Demander un document
          </Button>

          <div className="rounded-lg bg-green-50 border border-green-100 px-4 py-3 text-sm text-green-700">
            Définissez ici les documents que le client doit fournir (logo, charte graphique, contrats PDF, etc.). Ils apparaissent à l&apos;étape <strong>Documents</strong>.
          </div>

          {loading ? (
            <div className="space-y-2">{[1,2].map(i => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}</div>
          ) : documentFields.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground text-sm mb-3">Aucun document demandé.</p>
                <Button variant="outline" onClick={openAddDocModal}>
                  <Plus className="h-4 w-4 mr-2" />Demander un document
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {documentFields.map(field => (
                <div key={field.id} className="flex items-center gap-3 bg-white border rounded-lg p-3 group">
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{field.label || '(sans titre)'}</span>
                      {field.required && <Badge variant="destructive" className="text-xs py-0">Requis</Badge>}
                    </div>
                    {field.description && (
                      <p className="text-xs text-muted-foreground truncate">{field.description}</p>
                    )}
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditDocModal(field)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDeleteField(field.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Tab: Accès techniques ── */}
        <TabsContent value="access" className="mt-4 space-y-4">
          <Button size="sm" onClick={openAddAccessModal}>
            <Plus className="h-4 w-4 mr-1" />
            Demander un accès
          </Button>

          <div className="rounded-lg bg-amber-50 border border-amber-100 px-4 py-3 text-sm text-amber-800 flex gap-2">
            <Lock className="h-4 w-4 shrink-0 mt-0.5" />
            <span>
              Définissez les accès dont vous avez besoin (FTP, hébergeur, réseaux sociaux...). Ces informations sont <strong>chiffrées AES-256</strong> et apparaissent à l&apos;étape <strong>Accès techniques</strong>.
            </span>
          </div>

          {loading ? (
            <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}</div>
          ) : accessFields.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <KeyRound className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground text-sm mb-3">Aucun accès demandé.</p>
                <Button variant="outline" onClick={openAddAccessModal}>
                  <Plus className="h-4 w-4 mr-2" />Demander un accès
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {accessFields.map(field => {
                const accessType = ACCESS_TYPES.find(t => t.value === (field.sensitive ? 'password' : field.type))
                return (
                  <div key={field.id} className="flex items-center gap-3 bg-white border rounded-lg p-3 group">
                    <span className="text-base shrink-0">{accessType?.icon ?? '🔑'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">{field.label || '(sans titre)'}</span>
                        {field.required && <Badge variant="destructive" className="text-xs py-0">Requis</Badge>}
                        {field.sensitive && (
                          <Badge variant="secondary" className="text-xs py-0 text-amber-700 bg-amber-50 border-amber-200">
                            🔒 Chiffré
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{accessType?.label ?? field.type}</p>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditAccessModal(field)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDeleteField(field.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* ── Tab: Réponses ── */}
        <TabsContent value="responses" className="mt-4">
          {responsesLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <Card key={i}>
                  <CardContent className="py-4">
                    <div className="flex items-start gap-3">
                      <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-40" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                      <Skeleton className="h-5 w-24 rounded-full" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : responses.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <UserCircle className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  Aucune réponse pour l&apos;instant. Envoyez le formulaire à votre client.
                </p>
                <Button variant="outline" size="sm" className="mt-4" onClick={() => setInviteOpen(true)}>
                  <Send className="h-4 w-4 mr-2" />
                  Envoyer le formulaire
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {/* En-tête live */}
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex gap-4 text-sm">
                  <span className="text-muted-foreground">
                    <span className="font-semibold text-foreground">{responses.filter(r => r.validated_at).length}</span> validé{responses.filter(r => r.validated_at).length !== 1 ? 's' : ''}
                  </span>
                  <span className="text-muted-foreground">
                    <span className="font-semibold text-foreground">{responses.filter(r => r.completed && !r.validated_at).length}</span> en attente
                  </span>
                  <span className="text-muted-foreground">
                    <span className="font-semibold text-foreground">{responses.filter(r => !r.completed).length}</span> en cours
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {refreshing ? (
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Actualisation...
                    </span>
                  ) : lastRefresh ? (
                    <span className="text-xs text-muted-foreground">
                      {lastRefresh.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  ) : null}
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1.5"
                    onClick={() => loadResponses(true)}
                    disabled={refreshing}
                  >
                    <RefreshCw className="h-3 w-3" />
                    Actualiser
                  </Button>
                  <span className="text-xs bg-green-50 border border-green-200 text-green-700 rounded-full px-2 py-0.5 font-medium">
                    ● Live · 15s
                  </span>
                </div>
              </div>
              {responses.map(response => (
                <ResponseCard
                  key={response.id}
                  response={response}
                  formFields={formFieldsMeta}
                  projectId={id}
                  onValidate={handleValidate}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Dialog: Invitation ── */}
      <Dialog open={inviteOpen} onOpenChange={(v) => { if (!v) { setInviteOpen(false); setInviteEmail('') } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Envoyer le formulaire</DialogTitle>
            <DialogDescription>
              Envoyez le lien du formulaire d&apos;onboarding à votre client par email.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSendInvite} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Adresse email</Label>
              <Input
                id="invite-email"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="client@exemple.com"
                required
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setInviteOpen(false); setInviteEmail('') }} disabled={inviteSending}>
                Annuler
              </Button>
              <Button type="submit" disabled={inviteSending}>
                {inviteSending ? 'Envoi...' : 'Envoyer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Questionnaire field ── */}
      <Dialog open={fieldModalOpen} onOpenChange={(v) => { if (!v) setFieldModalOpen(false) }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editField ? 'Modifier le champ' : 'Nouveau champ'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveField} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={newField.type as string}
                  onValueChange={(v) => setNewField(prev => ({ ...prev, type: v as FormFieldType, options: null }))}
                  disabled={!!editField}
                >
                  <SelectTrigger>
                    <SelectValue>
                      {APP_CONFIG.formFieldTypes.find(t => t.type === newField.type)?.label ?? newField.type as string}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {APP_CONFIG.formFieldTypes
                      .filter(t => t.type !== 'file')
                      .map(t => (
                        <SelectItem key={t.type} value={t.type}>{t.label}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Switch
                  id="required"
                  checked={newField.required}
                  onCheckedChange={(v) => setNewField(prev => ({ ...prev, required: v }))}
                />
                <Label htmlFor="required">Obligatoire</Label>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Libellé <span className="text-destructive">*</span></Label>
              <Input
                value={newField.label}
                onChange={(e) => setNewField(prev => ({ ...prev, label: e.target.value }))}
                placeholder="Ex : Nom du projet"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Description <span className="text-xs text-muted-foreground">(optionnel)</span></Label>
              <Input
                value={newField.description ?? ''}
                onChange={(e) => setNewField(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Aide contextuelle affichée sous le champ"
              />
            </div>

            {!needsOptions && (
              <div className="space-y-2">
                <Label>Placeholder <span className="text-xs text-muted-foreground">(optionnel)</span></Label>
                <Input
                  value={newField.placeholder ?? ''}
                  onChange={(e) => setNewField(prev => ({ ...prev, placeholder: e.target.value }))}
                  placeholder="Texte indicatif dans le champ"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Section <span className="text-xs text-muted-foreground">(optionnel)</span></Label>
              <Select
                value={newField.section_id ?? '__none__'}
                onValueChange={(v) => setNewField(prev => ({ ...prev, section_id: v === '__none__' ? null : v }))}
              >
                <SelectTrigger><SelectValue placeholder="Sans section" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sans section</SelectItem>
                  {sections.filter(s => s.kind !== 'access').map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {needsOptions && (
              <div className="space-y-2">
                <Label>Options</Label>
                <div className="flex gap-2">
                  <Input
                    value={optionInput}
                    onChange={(e) => setOptionInput(e.target.value)}
                    placeholder="Ajouter une option..."
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addOption() } }}
                  />
                  <Button type="button" variant="outline" onClick={addOption}>Ajouter</Button>
                </div>
                {(newField.options ?? []).length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {(newField.options ?? []).map((opt, idx) => (
                      <Badge key={idx} variant="secondary" className="gap-1 cursor-pointer" onClick={() => removeOption(idx)}>
                        {opt} ×
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFieldModalOpen(false)} disabled={saving}>Annuler</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Enregistrement...' : (editField ? 'Modifier' : 'Ajouter')}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Document field ── */}
      <Dialog open={docModalOpen} onOpenChange={(v) => { if (!v) setDocModalOpen(false) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editDocField ? 'Modifier le document' : 'Demander un document'}</DialogTitle>
            <DialogDescription>
              Indiquez quel document le client doit fournir.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveDocField} className="space-y-4">
            <div className="space-y-2">
              <Label>Libellé <span className="text-destructive">*</span></Label>
              <Input
                value={newDocField.label}
                onChange={(e) => setNewDocField(prev => ({ ...prev, label: e.target.value }))}
                placeholder="Ex : Logo de l'entreprise, Charte graphique..."
                required
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>Description <span className="text-xs text-muted-foreground">(optionnel)</span></Label>
              <Input
                value={newDocField.description ?? ''}
                onChange={(e) => setNewDocField(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Ex : Format PNG ou SVG, fond transparent"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="doc-required"
                checked={newDocField.required}
                onCheckedChange={(v) => setNewDocField(prev => ({ ...prev, required: v }))}
              />
              <Label htmlFor="doc-required">Document obligatoire</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDocModalOpen(false)} disabled={savingDoc}>Annuler</Button>
              <Button type="submit" disabled={savingDoc}>{savingDoc ? 'Enregistrement...' : (editDocField ? 'Modifier' : 'Ajouter')}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Access field ── */}
      <Dialog open={accessModalOpen} onOpenChange={(v) => { if (!v) setAccessModalOpen(false) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editAccessField ? 'Modifier l\'accès' : 'Demander un accès'}</DialogTitle>
            <DialogDescription>
              Définissez le type d&apos;accès dont vous avez besoin.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveAccessField} className="space-y-4">
            <div className="space-y-2">
              <Label>Nom de l&apos;accès <span className="text-destructive">*</span></Label>
              <Input
                value={newAccessField.label}
                onChange={(e) => setNewAccessField(prev => ({ ...prev, label: e.target.value }))}
                placeholder="Ex : Accès FTP, Mot de passe hébergeur, Facebook..."
                required
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>Type de réponse attendu</Label>
              <Select
                value={newAccessField.accessType}
                onValueChange={(v) => { if (v) setNewAccessField(prev => ({ ...prev, accessType: v })) }}
                disabled={!!editAccessField}
              >
                <SelectTrigger>
                  <SelectValue>
                    {(() => {
                      const t = ACCESS_TYPES.find(t => t.value === newAccessField.accessType)
                      return t ? `${t.icon} ${t.label}` : newAccessField.accessType
                    })()}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {ACCESS_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.icon} {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {newAccessField.accessType === 'password' && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                  🔒 La valeur sera masquée et chiffrée AES-256 côté serveur.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Description <span className="text-xs text-muted-foreground">(optionnel)</span></Label>
              <Input
                value={newAccessField.description}
                onChange={(e) => setNewAccessField(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Ex : Hôte : ftp.monsite.com, port 21"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="access-required"
                checked={newAccessField.required}
                onCheckedChange={(v) => setNewAccessField(prev => ({ ...prev, required: v }))}
              />
              <Label htmlFor="access-required">Obligatoire</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAccessModalOpen(false)} disabled={savingAccess}>Annuler</Button>
              <Button type="submit" disabled={savingAccess}>{savingAccess ? 'Enregistrement...' : (editAccessField ? 'Modifier' : 'Ajouter')}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Section edit modal ── */}
      <Dialog open={sectionModalOpen} onOpenChange={(v) => { if (!v) setSectionModalOpen(false) }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{editSection ? 'Renommer la section' : 'Nouvelle section'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveSection} className="space-y-4">
            <div className="space-y-2">
              <Label>Titre <span className="text-destructive">*</span></Label>
              <Input
                value={sectionTitle}
                onChange={(e) => setSectionTitle(e.target.value)}
                placeholder="Ex : Informations générales"
                required
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setSectionModalOpen(false)} disabled={savingSection}>Annuler</Button>
              <Button type="submit" disabled={savingSection}>{savingSection ? 'Enregistrement...' : (editSection ? 'Renommer' : 'Créer')}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Section delete confirmation ── */}
      <AlertDialog open={!!deletingSectionId} onOpenChange={(v) => { if (!v) setDeletingSectionId(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette section ?</AlertDialogTitle>
            <AlertDialogDescription>
              Les champs de cette section seront conservés mais n&apos;appartiendront plus à aucune section.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => deletingSectionId && handleDeleteSection(deletingSectionId)} className="bg-destructive hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
