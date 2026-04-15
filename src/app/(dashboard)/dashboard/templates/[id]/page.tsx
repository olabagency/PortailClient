'use client'

import { useState, useEffect, use } from 'react'
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
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  ArrowLeft, Plus, GripVertical, Pencil, Trash2, Save, AlertCircle,
} from 'lucide-react'
import { APP_CONFIG } from '@/config/app.config'
import type { FormFieldType } from '@/config/app.config'

// ---- Types ----

interface FormField {
  type: FormFieldType
  label: string
  description: string | null
  placeholder: string | null
  required: boolean
  options: string[] | null
}

interface FormFieldWithId extends FormField {
  _id: string
}

interface Template {
  id: number
  name: string
  description: string | null
  is_default: boolean
  form_config: FormField[]
}

// ---- Helpers ----

let _idCounter = 0
function genId() {
  return `field-${++_idCounter}-${Date.now()}`
}

const defaultFormField = (): Omit<FormFieldWithId, '_id'> => ({
  type: 'text',
  label: '',
  description: null,
  placeholder: null,
  required: false,
  options: null,
})

// ---- SortableFormField ----

function SortableFormField({
  field,
  onEdit,
  onDelete,
  readOnly,
}: {
  field: FormFieldWithId
  onEdit: (f: FormFieldWithId) => void
  onDelete: (id: string) => void
  readOnly: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: field._id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }
  const typeLabel = APP_CONFIG.formFieldTypes.find(t => t.type === field.type)?.label ?? field.type

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 bg-white border rounded-lg p-3 group">
      {!readOnly && (
        <button {...attributes} {...listeners} className="cursor-grab text-muted-foreground hover:text-foreground shrink-0">
          <GripVertical className="h-4 w-4" />
        </button>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">{field.label || '(sans titre)'}</span>
          {field.required && <Badge variant="destructive" className="text-xs py-0">Requis</Badge>}
        </div>
        <p className="text-xs text-muted-foreground">{typeLabel}</p>
      </div>
      {!readOnly && (
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(field)}>
            <Pencil className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={() => onDelete(field._id)}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  )
}

// ---- Page principale ----

export default function TemplateEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()

  const [template, setTemplate] = useState<Template | null>(null)
  const [loading, setLoading] = useState(true)

  // Champs éditables
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [formFields, setFormFields] = useState<FormFieldWithId[]>([])

  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

  // Modal champ
  const [fieldModalOpen, setFieldModalOpen] = useState(false)
  const [editingField, setEditingField] = useState<FormFieldWithId | null>(null)
  const [fieldDraft, setFieldDraft] = useState<Omit<FormFieldWithId, '_id'>>(defaultFormField())
  const [optionInput, setOptionInput] = useState('')

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  // Chargement initial
  useEffect(() => {
    fetch(`/api/templates/${id}`)
      .then(r => r.json())
      .then(({ data, error }) => {
        if (error || !data) {
          toast.error('Template introuvable')
          router.push('/dashboard/templates')
          return
        }
        setTemplate(data)
        setName(data.name)
        setDescription(data.description ?? '')
        setFormFields(
          (data.form_config ?? []).map((f: FormField) => ({ ...f, _id: genId() }))
        )
        setLoading(false)
      })
  }, [id, router])

  // Marquer dirty dès modification
  function markDirty() {
    setDirty(true)
  }

  // ---- FormField handlers ----

  function handleFieldsDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = formFields.findIndex(f => f._id === active.id)
    const newIndex = formFields.findIndex(f => f._id === over.id)
    setFormFields(prev => arrayMove(prev, oldIndex, newIndex))
    markDirty()
  }

  function openAddFieldModal() {
    setEditingField(null)
    setFieldDraft(defaultFormField())
    setOptionInput('')
    setFieldModalOpen(true)
  }

  function openEditFieldModal(field: FormFieldWithId) {
    setEditingField(field)
    setFieldDraft({
      type: field.type,
      label: field.label,
      description: field.description,
      placeholder: field.placeholder,
      required: field.required,
      options: field.options,
    })
    setOptionInput('')
    setFieldModalOpen(true)
  }

  function handleSaveField(e: React.FormEvent) {
    e.preventDefault()
    if (editingField) {
      setFormFields(prev =>
        prev.map(f => f._id === editingField._id ? { ...fieldDraft, _id: editingField._id } : f)
      )
    } else {
      setFormFields(prev => [...prev, { ...fieldDraft, _id: genId() }])
    }
    setFieldModalOpen(false)
    markDirty()
  }

  function handleDeleteField(fieldId: string) {
    setFormFields(prev => prev.filter(f => f._id !== fieldId))
    markDirty()
  }

  function addOption() {
    if (!optionInput.trim()) return
    setFieldDraft(prev => ({ ...prev, options: [...(prev.options ?? []), optionInput.trim()] }))
    setOptionInput('')
  }

  function removeOption(idx: number) {
    setFieldDraft(prev => ({ ...prev, options: prev.options?.filter((_, i) => i !== idx) ?? null }))
  }

  // ---- Sauvegarde ----

  async function handleSave() {
    if (!template) return
    setSaving(true)
    try {
      const res = await fetch(`/api/templates/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim() || template.name,
          description: description.trim() || null,
          form_config: formFields.map(({ _id: _, ...rest }) => rest),
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error ?? 'Erreur lors de la sauvegarde')
      } else {
        setTemplate(json.data)
        setDirty(false)
        toast.success('Template sauvegardé')
      }
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setSaving(false)
    }
  }

  const needsOptions = fieldDraft.type === 'select' || fieldDraft.type === 'multiselect'
  const isReadOnly = template?.is_default ?? false

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-muted-foreground">Chargement...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/templates')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold truncate">{name || 'Template sans nom'}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Éditeur de template</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {dirty && !isReadOnly && (
            <span className="flex items-center gap-1.5 text-xs text-amber-600 font-medium">
              <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
              Non enregistré
            </span>
          )}
          {!isReadOnly && (
            <Button size="sm" onClick={handleSave} disabled={saving || !dirty}>
              <Save className="h-4 w-4 mr-1.5" />
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          )}
        </div>
      </div>

      {/* Avertissement lecture seule */}
      {isReadOnly && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <p>Ce template est un modèle par défaut. Il est en lecture seule. Dupliquez-le pour le personnaliser.</p>
        </div>
      )}

      {/* Informations générales */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Informations générales</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="template-name">Nom du template <span className="text-destructive">*</span></Label>
            <Input
              id="template-name"
              value={name}
              onChange={(e) => { setName(e.target.value); markDirty() }}
              placeholder="Ex : Site vitrine freelance"
              disabled={isReadOnly}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="template-desc">Description <span className="text-xs text-muted-foreground">(optionnel)</span></Label>
            <Input
              id="template-desc"
              value={description}
              onChange={(e) => { setDescription(e.target.value); markDirty() }}
              placeholder="Description courte du template..."
              disabled={isReadOnly}
            />
          </div>
        </CardContent>
      </Card>

      {/* Section Formulaire d'onboarding */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Formulaire d'onboarding</CardTitle>
            {!isReadOnly && (
              <Button variant="outline" size="sm" onClick={openAddFieldModal}>
                <Plus className="h-4 w-4 mr-1.5" />
                Ajouter un champ
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {formFields.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground mb-3">Aucun champ dans ce formulaire.</p>
              {!isReadOnly && (
                <Button variant="outline" size="sm" onClick={openAddFieldModal}>
                  <Plus className="h-4 w-4 mr-1.5" />
                  Ajouter un champ
                </Button>
              )}
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleFieldsDragEnd}
            >
              <SortableContext items={formFields.map(f => f._id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {formFields.map(field => (
                    <SortableFormField
                      key={field._id}
                      field={field}
                      onEdit={openEditFieldModal}
                      onDelete={handleDeleteField}
                      readOnly={isReadOnly}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </CardContent>
      </Card>

      {/* Statistiques */}
      {formFields.length > 0 && (
        <Card>
          <CardContent className="py-3">
            <div className="flex gap-4 text-sm text-muted-foreground">
              <span><strong className="text-foreground">{formFields.length}</strong> champ{formFields.length > 1 ? 's' : ''}</span>
              <Separator orientation="vertical" className="h-4" />
              <span><strong className="text-foreground">{formFields.filter(f => f.required).length}</strong> obligatoire{formFields.filter(f => f.required).length > 1 ? 's' : ''}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bouton Enregistrer bas de page */}
      {!isReadOnly && (
        <div className="flex justify-end pb-6">
          <Button onClick={handleSave} disabled={saving || !dirty}>
            <Save className="h-4 w-4 mr-1.5" />
            {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
          </Button>
        </div>
      )}

      {/* Modal ajout/édition champ */}
      <Dialog open={fieldModalOpen} onOpenChange={(v) => { if (!v) setFieldModalOpen(false) }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingField ? 'Modifier le champ' : 'Nouveau champ'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveField} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={fieldDraft.type}
                  onValueChange={(v) => setFieldDraft(prev => ({ ...prev, type: v as FormFieldType, options: null }))}
                  disabled={!!editingField}
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
                  id="field-required"
                  checked={fieldDraft.required}
                  onCheckedChange={(v) => setFieldDraft(prev => ({ ...prev, required: v }))}
                />
                <Label htmlFor="field-required">Obligatoire</Label>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Libellé <span className="text-destructive">*</span></Label>
              <Input
                value={fieldDraft.label}
                onChange={(e) => setFieldDraft(prev => ({ ...prev, label: e.target.value }))}
                placeholder="Ex : Nom du projet"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Description <span className="text-xs text-muted-foreground">(optionnel)</span></Label>
              <Input
                value={fieldDraft.description ?? ''}
                onChange={(e) => setFieldDraft(prev => ({ ...prev, description: e.target.value || null }))}
                placeholder="Aide contextuelle affichée sous le champ"
              />
            </div>

            {!needsOptions && (
              <div className="space-y-2">
                <Label>Placeholder <span className="text-xs text-muted-foreground">(optionnel)</span></Label>
                <Input
                  value={fieldDraft.placeholder ?? ''}
                  onChange={(e) => setFieldDraft(prev => ({ ...prev, placeholder: e.target.value || null }))}
                  placeholder="Texte indicatif dans le champ"
                />
              </div>
            )}

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
                {(fieldDraft.options ?? []).length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {(fieldDraft.options ?? []).map((opt, i) => (
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
              <Button type="button" variant="outline" onClick={() => setFieldModalOpen(false)}>Annuler</Button>
              <Button type="submit">
                {editingField ? 'Enregistrer' : 'Ajouter le champ'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
