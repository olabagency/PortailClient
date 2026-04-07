'use client'

import { useState, useEffect, use, useCallback } from 'react'
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  ArrowLeft, Plus, GripVertical, Pencil, Trash2, Eye, Layers,
  ChevronDown, ChevronRight, Send, UserCircle,
} from 'lucide-react'
import { APP_CONFIG } from '@/config/app.config'
import type { FormFieldType } from '@/config/app.config'

interface FormField {
  id: string
  type: FormFieldType
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
  project_id: string
}

interface FormFieldMeta {
  id: string
  label: string
  type: string
  order_index: number
}

interface OnboardingResponse {
  id: string
  respondent_name: string | null
  respondent_email: string | null
  responses: Record<string, unknown>
  completed_at: string
}

const defaultField = (): Omit<FormField, 'id' | 'order_index'> => ({
  type: 'text',
  label: '',
  description: '',
  placeholder: '',
  required: false,
  options: null,
  section_id: null,
})

// --- Composant champ triable ---
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
  const typeLabel = APP_CONFIG.formFieldTypes.find(t => t.type === field.type)?.label ?? field.type

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 bg-white border rounded-lg p-3 group">
      <button {...attributes} {...listeners} className="cursor-grab text-muted-foreground hover:text-foreground shrink-0">
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">{field.label || '(sans titre)'}</span>
          {field.required && <Badge variant="destructive" className="text-xs py-0">Requis</Badge>}
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

// --- Composant section triable ---
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

  const isUnsectioned = section === null

  return (
    <div
      ref={section ? (sortableProps as ReturnType<typeof useSortable>).setNodeRef : undefined}
      style={style}
      className="border rounded-lg bg-gray-50 overflow-hidden"
    >
      {/* En-tête de section */}
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

      {/* Champs de la section */}
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

// --- Carte de réponse ---
function ResponseCard({
  response,
  formFields,
}: {
  response: OnboardingResponse
  formFields: FormFieldMeta[]
}) {
  const [expanded, setExpanded] = useState(false)

  const answeredCount = formFields.filter(f => {
    const val = response.responses[f.id]
    return val !== undefined && val !== null && val !== ''
  }).length

  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined || value === '') return '—'
    if (Array.isArray(value)) return value.join(', ')
    return String(value)
  }

  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <UserCircle className="h-8 w-8 text-muted-foreground shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {response.respondent_name ?? 'Anonyme'}
              </p>
              {response.respondent_email && (
                <p className="text-xs text-muted-foreground truncate">{response.respondent_email}</p>
              )}
              <p className="text-xs text-muted-foreground mt-0.5">
                {formatDistanceToNow(new Date(response.completed_at), { addSuffix: true, locale: fr })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant="secondary" className="text-xs">
              {answeredCount} champ{answeredCount > 1 ? 's' : ''} rempli{answeredCount > 1 ? 's' : ''}
            </Badge>
            <button
              onClick={() => setExpanded(v => !v)}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label={expanded ? 'Réduire' : 'Développer'}
            >
              {expanded
                ? <ChevronDown className="h-4 w-4" />
                : <ChevronRight className="h-4 w-4" />
              }
            </button>
          </div>
        </div>

        {expanded && formFields.length > 0 && (
          <div className="mt-4 space-y-3 border-t pt-4">
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
      </CardContent>
    </Card>
  )
}

// --- Page principale ---
export default function OnboardingEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()

  const [fields, setFields] = useState<FormField[]>([])
  const [sections, setSections] = useState<OnboardingSection[]>([])
  const [loading, setLoading] = useState(true)

  // Tabs
  const [activeTab, setActiveTab] = useState('editor')

  // Réponses
  const [responses, setResponses] = useState<OnboardingResponse[]>([])
  const [formFieldsMeta, setFormFieldsMeta] = useState<FormFieldMeta[]>([])
  const [responsesLoading, setResponsesLoading] = useState(false)
  const [responsesLoaded, setResponsesLoaded] = useState(false)

  // Dialog invitation
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteSending, setInviteSending] = useState(false)

  // Modal champ
  const [editField, setEditField] = useState<FormField | null>(null)
  const [newField, setNewField] = useState<Omit<FormField, 'id' | 'order_index'>>(defaultField())
  const [fieldModalOpen, setFieldModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [optionInput, setOptionInput] = useState('')

  // Modal section
  const [sectionModalOpen, setSectionModalOpen] = useState(false)
  const [editSection, setEditSection] = useState<OnboardingSection | null>(null)
  const [sectionTitle, setSectionTitle] = useState('')
  const [savingSection, setSavingSection] = useState(false)

  // Confirmation suppression section
  const [deletingSectionId, setDeletingSectionId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  // Chargement initial
  useEffect(() => {
    fetch(`/api/projects/${id}/fields`)
      .then(r => r.json())
      .then(({ data }) => {
        setFields(data?.fields ?? [])
        setSections(data?.sections ?? [])
        setLoading(false)
      })
  }, [id])

  // Chargement des réponses
  const loadResponses = useCallback(async () => {
    if (responsesLoaded) return
    setResponsesLoading(true)
    try {
      const res = await fetch(`/api/projects/${id}/responses`)
      const json = await res.json()
      if (res.ok) {
        setResponses(json.data?.responses ?? [])
        setFormFieldsMeta(json.data?.fields ?? [])
        setResponsesLoaded(true)
      }
    } finally {
      setResponsesLoading(false)
    }
  }, [id, responsesLoaded])

  useEffect(() => {
    if (activeTab === 'responses') {
      loadResponses()
    }
  }, [activeTab, loadResponses])

  // --- Invitation ---
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

  // --- Champs groupés par section ---
  const fieldsBySectionId = useCallback((sectionId: string | null) => {
    return fields
      .filter(f => f.section_id === sectionId)
      .sort((a, b) => a.order_index - b.order_index)
  }, [fields])

  // --- Drag & drop sections ---
  async function handleSectionsDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = sections.findIndex(s => s.id === active.id)
    const newIndex = sections.findIndex(s => s.id === over.id)
    const reordered = arrayMove(sections, oldIndex, newIndex).map((s, i) => ({ ...s, order_index: i }))
    setSections(reordered)

    await fetch(`/api/projects/${id}/sections/reorder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: reordered.map(s => ({ id: s.id, order_index: s.order_index })) }),
    })
  }

  // --- Drag & drop champs dans une section ---
  async function handleFieldsDragEnd(event: DragEndEvent, sectionId: string | null) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const sectionFields = fieldsBySectionId(sectionId)
    const oldIndex = sectionFields.findIndex(f => f.id === active.id)
    const newIndex = sectionFields.findIndex(f => f.id === over.id)
    const reordered = arrayMove(sectionFields, oldIndex, newIndex).map((f, i) => ({ ...f, order_index: i }))

    setFields(prev => {
      const others = prev.filter(f => f.section_id !== sectionId)
      return [...others, ...reordered]
    })

    await fetch(`/api/projects/${id}/fields/reorder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: reordered.map(f => ({ id: f.id, order_index: f.order_index })) }),
    })
  }

  // --- Modal champ ---
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
      if (res.ok) setFields(prev => prev.map(f => f.id === editField.id ? json.data : f))
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

  // --- Modal section ---
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
      if (res.ok) setSections(prev => prev.map(s => s.id === editSection.id ? json.data : s))
    } else {
      const res = await fetch(`/api/projects/${id}/sections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: sectionTitle.trim() }),
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
    // Les champs de cette section passent en section_id = null
    setFields(prev => prev.map(f => f.section_id === sectionId ? { ...f, section_id: null } : f))
    setDeletingSectionId(null)
  }

  const needsOptions = newField.type === 'select' || newField.type === 'multiselect'

  // Sections triées
  const sortedSections = [...sections].sort((a, b) => a.order_index - b.order_index)
  const unsectionedFields = fieldsBySectionId(null)

  return (
    <div className="space-y-6 max-w-2xl">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Formulaire d'onboarding</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Personnalisez les informations demandées au client</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setInviteOpen(true)}>
            <Send className="h-4 w-4 mr-2" />
            Envoyer au client
          </Button>
          <Button variant="outline" size="sm" onClick={() => router.push(`/p/${id}`)}>
            <Eye className="h-4 w-4 mr-2" />
            Aperçu
          </Button>
        </div>
      </div>

      {/* Onglets */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="editor">Éditeur</TabsTrigger>
          <TabsTrigger value="responses">Réponses</TabsTrigger>
        </TabsList>

        {/* Onglet Éditeur */}
        <TabsContent value="editor" className="mt-4 space-y-4">
          {/* Barre d'actions */}
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

          {loading ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-sm text-muted-foreground">Chargement...</p>
              </CardContent>
            </Card>
          ) : sections.length === 0 && fields.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground text-sm mb-3">Aucun champ. Ajoutez des questions pour votre client.</p>
                <div className="flex gap-2 justify-center">
                  <Button variant="outline" onClick={() => openAddFieldModal(null)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Premier champ
                  </Button>
                  <Button variant="outline" onClick={openAddSectionModal}>
                    <Layers className="h-4 w-4 mr-2" />
                    Première section
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {/* Sections triables */}
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

              {/* Champs sans section */}
              {(unsectionedFields.length > 0 || sections.length === 0) && (
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

          {/* Statistiques */}
          {(fields.length > 0 || sections.length > 0) && (
            <Card>
              <CardContent className="py-3">
                <div className="flex gap-4 text-sm text-muted-foreground">
                  <span><strong className="text-foreground">{fields.length}</strong> champ{fields.length > 1 ? 's' : ''}</span>
                  <Separator orientation="vertical" className="h-4" />
                  <span><strong className="text-foreground">{fields.filter(f => f.required).length}</strong> obligatoire{fields.filter(f => f.required).length > 1 ? 's' : ''}</span>
                  <Separator orientation="vertical" className="h-4" />
                  <span><strong className="text-foreground">{sections.length}</strong> section{sections.length > 1 ? 's' : ''}</span>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Onglet Réponses */}
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
                  Aucune réponse pour l'instant. Envoyez le formulaire à votre client.
                </p>
                <Button variant="outline" size="sm" className="mt-4" onClick={() => setInviteOpen(true)}>
                  <Send className="h-4 w-4 mr-2" />
                  Envoyer le formulaire
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {responses.length} réponse{responses.length > 1 ? 's' : ''}
              </p>
              {responses.map(response => (
                <ResponseCard
                  key={response.id}
                  response={response}
                  formFields={formFieldsMeta}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialog invitation */}
      <Dialog open={inviteOpen} onOpenChange={(v) => { if (!v) { setInviteOpen(false); setInviteEmail('') } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Envoyer le formulaire</DialogTitle>
            <DialogDescription>
              Envoyez le lien du formulaire d'onboarding à votre client par email.
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
              <Button
                type="button"
                variant="outline"
                onClick={() => { setInviteOpen(false); setInviteEmail('') }}
                disabled={inviteSending}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={inviteSending}>
                {inviteSending ? 'Envoi...' : 'Envoyer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal ajout/édition champ */}
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
                  value={newField.type}
                  onValueChange={(v) => setNewField(prev => ({ ...prev, type: v as FormFieldType, options: null }))}
                  disabled={!!editField}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {APP_CONFIG.formFieldTypes.map(t => (
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

            {/* Sélecteur de section */}
            <div className="space-y-2">
              <Label>Section <span className="text-xs text-muted-foreground">(optionnel)</span></Label>
              <Select
                value={newField.section_id ?? '__none__'}
                onValueChange={(v) => setNewField(prev => ({ ...prev, section_id: v === '__none__' ? null : v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sans section" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sans section</SelectItem>
                  {sortedSections.map(s => (
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
                    {(newField.options ?? []).map((opt, i) => (
                      <Badge key={i} variant="secondary" className="gap-1">
                        {opt}
                        <button type="button" onClick={() => removeOption(i)} className="ml-1 hover:text-destructive">×</button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFieldModalOpen(false)} disabled={saving}>Annuler</Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Enregistrement...' : editField ? 'Enregistrer' : 'Ajouter le champ'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal ajout/renommage section */}
      <Dialog open={sectionModalOpen} onOpenChange={(v) => { if (!v) setSectionModalOpen(false) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editSection ? 'Renommer la section' : 'Nouvelle section'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveSection} className="space-y-4">
            <div className="space-y-2">
              <Label>Titre de la section <span className="text-destructive">*</span></Label>
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
              <Button type="submit" disabled={savingSection}>
                {savingSection ? 'Enregistrement...' : editSection ? 'Renommer' : 'Créer la section'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog confirmation suppression section */}
      <Dialog open={!!deletingSectionId} onOpenChange={(v) => { if (!v) setDeletingSectionId(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Supprimer la section ?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Les champs de cette section ne seront pas supprimés — ils seront déplacés dans "Sans section".
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingSectionId(null)}>Annuler</Button>
            <Button
              variant="destructive"
              onClick={() => deletingSectionId && handleDeleteSection(deletingSectionId)}
            >
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
