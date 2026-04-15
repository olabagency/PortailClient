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
import { formatDistanceToNow, format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
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
  Plus, GripVertical, Pencil, Trash2, Eye, Layers,
  ChevronDown, ChevronRight, Send, UserCircle, CheckCircle2,
  FileText, Lock, KeyRound, Loader2, RefreshCw, BookmarkPlus,
  MessageSquareDiff, Share2, Copy, Check, Link2,
  ClipboardList, FolderOpen, Settings, Sparkles,
  Users, AlertCircle, Info, Zap, Globe, Hash, Mail, Phone,
  Building2, MapPin, Calendar, CreditCard, ListPlus,
  Image as ImageIcon, FileSignature, BarChart3, Wifi,
} from 'lucide-react'
import { APP_CONFIG } from '@/config/app.config'
import type { FormFieldType } from '@/config/app.config'
import { cn } from '@/lib/utils'

// ─── Types ───────────────────────────────────────────────────────────────────

interface TemplateItem {
  id: string
  name: string
  description: string | null
  is_default: boolean
  form_config: Array<Record<string, unknown>>
  sections_config: Array<Record<string, unknown>>
}

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

// ─── Constants ────────────────────────────────────────────────────────────────

const ACCESS_TYPES = [
  { value: 'password', label: 'Mot de passe', icon: '🔑', description: 'Identifiant + mot de passe' },
  { value: 'url', label: 'Lien / URL', icon: '🌐', description: 'Adresse web, lien d\'accès' },
  { value: 'text', label: 'Identifiant / Code', icon: '📝', description: 'Texte court, clé API' },
  { value: 'textarea', label: 'Notes / Texte long', icon: '📋', description: 'Informations détaillées' },
]

const QUICK_FIELD_PRESETS = [
  { label: 'Prénom', type: 'text', placeholder: 'Jean', icon: <Users className="h-3 w-3" /> },
  { label: 'Nom', type: 'text', placeholder: 'Dupont', icon: <Users className="h-3 w-3" /> },
  { label: 'Email', type: 'email', placeholder: 'jean@exemple.com', icon: <Mail className="h-3 w-3" /> },
  { label: 'Téléphone', type: 'phone', placeholder: '+33 6 00 00 00 00', icon: <Phone className="h-3 w-3" /> },
  { label: 'Entreprise', type: 'text', placeholder: 'Ma Société', icon: <Building2 className="h-3 w-3" /> },
  { label: 'Site web', type: 'url', placeholder: 'https://...', icon: <Globe className="h-3 w-3" /> },
  { label: 'Adresse', type: 'textarea', placeholder: '1 rue de la Paix...', icon: <MapPin className="h-3 w-3" /> },
  { label: 'Secteur d\'activité', type: 'text', placeholder: 'E-commerce, Santé...', icon: <Hash className="h-3 w-3" /> },
  { label: 'Budget', type: 'text', placeholder: '5 000 €', icon: <CreditCard className="h-3 w-3" /> },
  { label: 'Date de lancement', type: 'date', placeholder: '', icon: <Calendar className="h-3 w-3" /> },
  { label: 'Description du projet', type: 'textarea', placeholder: 'Décrivez votre projet...', icon: <ClipboardList className="h-3 w-3" /> },
  { label: 'Objectifs', type: 'textarea', placeholder: 'Vos attentes principales...', icon: <BarChart3 className="h-3 w-3" /> },
]

const QUICK_DOC_PRESETS = [
  { label: 'Logo (PNG ou SVG)', description: 'Logo en haute résolution sur fond transparent', icon: <ImageIcon className="h-4 w-4" /> },
  { label: 'Charte graphique', description: 'Couleurs, typographies, guidelines visuelles', icon: <FileText className="h-4 w-4" /> },
  { label: 'Contrat signé', description: 'Contrat de prestation signé en PDF', icon: <FileSignature className="h-4 w-4" /> },
  { label: 'Cahier des charges', description: 'Document de spécifications du projet', icon: <ClipboardList className="h-4 w-4" /> },
  { label: 'Photos / Visuels', description: 'Photographies ou illustrations à utiliser', icon: <ImageIcon className="h-4 w-4" /> },
  { label: 'Textes / Contenus', description: 'Textes à intégrer sur le site ou la plateforme', icon: <FileText className="h-4 w-4" /> },
]

const QUICK_ACCESS_PRESETS = [
  { label: 'WordPress Admin', type: 'password', description: 'URL + identifiant + mot de passe admin', category: 'CMS' },
  { label: 'FTP / SFTP', type: 'password', description: 'Accès au serveur de fichiers', category: 'Hébergement' },
  { label: 'Hébergeur (cPanel)', type: 'password', description: 'Accès panneau de contrôle hébergement', category: 'Hébergement' },
  { label: 'Google Analytics', type: 'url', description: 'Lien vers le compte Google Analytics', category: 'Marketing' },
  { label: 'Gestionnaire Facebook', type: 'url', description: 'Lien vers le Business Manager Facebook', category: 'Social' },
  { label: 'Instagram', type: 'password', description: 'Identifiants du compte Instagram', category: 'Social' },
  { label: 'Nom de domaine', type: 'url', description: 'Accès au registrar (OVH, Ionos...)', category: 'Hébergement' },
  { label: 'Shopify', type: 'url', description: 'URL de l\'admin Shopify', category: 'E-commerce' },
  { label: 'API Key / Token', type: 'password', description: 'Clé API ou token d\'accès', category: 'Dev' },
  { label: 'Gmail / G Suite', type: 'password', description: 'Accès boîte email Google', category: 'Email' },
]

// ─── Default factories ────────────────────────────────────────────────────────

const defaultField = (): Omit<FormField, 'id' | 'order_index'> => ({
  type: 'text', label: '', description: '', placeholder: '', required: false, options: null, section_id: null, sensitive: false,
})

const defaultDocumentField = (): Omit<FormField, 'id' | 'order_index'> => ({
  type: 'file', label: '', description: '', placeholder: '', required: false, options: null, section_id: null, sensitive: false,
})

const defaultAccessField = () => ({ label: '', accessType: 'password', description: '', required: false })

// ─── Info callout ─────────────────────────────────────────────────────────────

function InfoCallout({ icon: Icon, variant = 'blue', children }: {
  icon?: React.ElementType
  variant?: 'blue' | 'green' | 'amber' | 'violet'
  children: React.ReactNode
}) {
  const styles = {
    blue: 'bg-blue-50 border-blue-100 text-blue-800',
    green: 'bg-emerald-50 border-emerald-100 text-emerald-800',
    amber: 'bg-amber-50 border-amber-100 text-amber-800',
    violet: 'bg-violet-50 border-violet-100 text-violet-800',
  }
  const iconColor = {
    blue: 'text-blue-500',
    green: 'text-emerald-500',
    amber: 'text-amber-500',
    violet: 'text-violet-500',
  }
  return (
    <div className={cn('flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm', styles[variant])}>
      {Icon && <Icon className={cn('h-4 w-4 shrink-0 mt-0.5', iconColor[variant])} />}
      <div>{children}</div>
    </div>
  )
}

// ─── SortableField ────────────────────────────────────────────────────────────

const FIELD_TYPE_ICONS: Record<string, string> = {
  text: '✏️', textarea: '📝', email: '📧', phone: '📞', url: '🔗',
  date: '📅', select: '▼', multiselect: '☑️', file: '📎', password: '🔒',
}

function SortableField({ field, onEdit, onDelete }: {
  field: FormField
  onEdit: (f: FormField) => void
  onDelete: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: field.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }
  const allTypes = [...APP_CONFIG.formFieldTypes, { type: 'password', label: 'Mot de passe' }]
  const typeLabel = allTypes.find(t => t.type === field.type)?.label ?? field.type

  return (
    <div ref={setNodeRef} style={style} className={cn(
      'flex items-center gap-3 rounded-xl border bg-card p-3.5 group transition-shadow',
      isDragging ? 'shadow-lg ring-2 ring-primary/20' : 'hover:shadow-sm',
    )}>
      <button {...attributes} {...listeners} className="cursor-grab text-muted-foreground/50 hover:text-muted-foreground shrink-0 transition-colors">
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="text-base shrink-0">{FIELD_TYPE_ICONS[field.type] ?? '✏️'}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">{field.label || <span className="italic text-muted-foreground">Sans titre</span>}</span>
          {field.required && <Badge className="text-[10px] py-0 h-4 bg-red-50 text-red-700 border-red-200 hover:bg-red-50">Obligatoire</Badge>}
          {field.sensitive && <Badge className="text-[10px] py-0 h-4 bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50">🔒 Chiffré</Badge>}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{typeLabel}{field.placeholder ? ` · "${field.placeholder}"` : ''}</p>
      </div>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button onClick={() => onEdit(field)} className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button onClick={() => onDelete(field.id)} className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

// ─── SortableSection ──────────────────────────────────────────────────────────

function SortableSection({ section, fields, onEditSection, onDeleteSection, onEditField, onDeleteField, onAddField }: {
  section: OnboardingSection | null
  fields: FormField[]
  onEditSection: (s: OnboardingSection) => void
  onDeleteSection: (id: string) => void
  onEditField: (f: FormField) => void
  onDeleteField: (id: string) => void
  onAddField: (sectionId: string | null) => void
}) {
  const [collapsed, setCollapsed] = useState(false)
  const sortableProps = section
    ? useSortable({ id: section.id }) // eslint-disable-line react-hooks/rules-of-hooks
    : { attributes: {}, listeners: {}, setNodeRef: () => undefined, transform: null, transition: undefined, isDragging: false }

  const style = section
    ? { transform: CSS.Transform.toString(sortableProps.transform), transition: sortableProps.transition, opacity: sortableProps.isDragging ? 0.5 : 1 }
    : {}

  return (
    <div
      ref={section ? (sortableProps as ReturnType<typeof useSortable>).setNodeRef : undefined}
      style={style}
      className="rounded-xl border bg-muted/20 overflow-hidden"
    >
      {/* Section header */}
      <div className="flex items-center gap-2.5 px-4 py-3 bg-card border-b group">
        {section && (
          <button
            {...(sortableProps as ReturnType<typeof useSortable>).attributes}
            {...(sortableProps as ReturnType<typeof useSortable>).listeners}
            className="cursor-grab text-muted-foreground/40 hover:text-muted-foreground shrink-0 transition-colors"
          >
            <GripVertical className="h-4 w-4" />
          </button>
        )}
        {!section && <Layers className="h-4 w-4 text-muted-foreground/50 shrink-0" />}

        <button
          className="flex items-center gap-2 flex-1 text-left"
          onClick={() => setCollapsed(v => !v)}
        >
          {collapsed
            ? <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          }
          <span className="text-sm font-semibold">
            {section ? section.title : 'Champs sans section'}
          </span>
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">
            {fields.length}
          </span>
        </button>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onAddField(section?.id ?? null)}
            className="flex items-center gap-1 h-7 px-2.5 rounded-md text-xs font-medium text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
          >
            <Plus className="h-3 w-3" />
            Champ
          </button>
          {section && (
            <>
              <button onClick={() => onEditSection(section)} className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
                <Pencil className="h-3 w-3" />
              </button>
              <button onClick={() => onDeleteSection(section.id)} className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors">
                <Trash2 className="h-3 w-3" />
              </button>
            </>
          )}
        </div>
      </div>

      {!collapsed && (
        <div className="p-3">
          {fields.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                <Plus className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground mb-2">Aucun champ dans cette section</p>
              <button
                onClick={() => onAddField(section?.id ?? null)}
                className="text-xs text-primary hover:underline font-medium"
              >
                + Ajouter un champ
              </button>
            </div>
          ) : (
            <SortableContext items={fields.map(f => f.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {fields.map(field => (
                  <SortableField key={field.id} field={field} onEdit={onEditField} onDelete={onDeleteField} />
                ))}
              </div>
            </SortableContext>
          )}
        </div>
      )}
    </div>
  )
}

// ─── ResponseCard ─────────────────────────────────────────────────────────────

function ResponseCard({ response, formFields, projectId, onValidate, onRevisionRequest, onDelete }: {
  response: OnboardingResponse
  formFields: FormFieldMeta[]
  projectId: string
  onValidate: (responseId: string) => void
  onRevisionRequest: (responseId: string, message: string) => Promise<void>
  onDelete: (responseId: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [validating, setValidating] = useState(false)
  const [showRevision, setShowRevision] = useState(false)
  const [revisionMessage, setRevisionMessage] = useState('')
  const [requestingRevision, setRequestingRevision] = useState(false)
  const [invitingPortal, setInvitingPortal] = useState(false)
  const [portalInvited, setPortalInvited] = useState(false)

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

  const clientEmail = response.respondent_email
    ?? (response.client_info as Record<string, string> | null)?.email

  async function handleValidateClick() {
    setValidating(true)
    try { await onValidate(response.id) } finally { setValidating(false) }
  }

  async function handleRevisionSubmit() {
    setRequestingRevision(true)
    try {
      await onRevisionRequest(response.id, revisionMessage)
      setShowRevision(false)
      setRevisionMessage('')
    } finally { setRequestingRevision(false) }
  }

  async function handleInvitePortal() {
    if (!clientEmail) return
    setInvitingPortal(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/invite-portal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: clientEmail }),
      })
      if (res.ok) {
        setPortalInvited(true)
        toast.success('Invitation envoyée au client !')
      } else {
        const json = await res.json()
        toast.error(json.error ?? 'Erreur lors de l\'envoi')
      }
    } catch { toast.error('Erreur réseau') } finally { setInvitingPortal(false) }
  }

  const activityDate = response.updated_at
    ? new Date(response.updated_at)
    : response.submitted_at ? new Date(response.submitted_at) : null

  const dateLabel = activityDate
    ? formatDistanceToNow(activityDate, { addSuffix: true, locale: fr })
    : null

  const clientName = response.client_info
    ? [response.client_info.first_name, response.client_info.last_name].filter(Boolean).join(' ')
    : null

  const initials = clientName
    ? clientName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : clientEmail?.[0]?.toUpperCase() ?? '?'

  const progress = response.completed ? 100 : Math.max(0, ((response.current_step - 1) / 5) * 100)

  return (
    <Card className="overflow-hidden">
      {/* Status stripe */}
      <div className={cn(
        'h-1',
        response.validated_at ? 'bg-emerald-500' :
        response.completed ? 'bg-blue-500' : 'bg-gray-200',
      )} />
      <CardContent className="py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {/* Avatar */}
            <div className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold',
              response.validated_at ? 'bg-emerald-100 text-emerald-700' :
              response.completed ? 'bg-blue-100 text-blue-700' : 'bg-muted text-muted-foreground',
            )}>
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">
                {clientName || response.respondent_email || 'Anonyme'}
              </p>
              {clientName && response.respondent_email && (
                <p className="text-xs text-muted-foreground truncate">{response.respondent_email}</p>
              )}
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                {dateLabel && <p className="text-xs text-muted-foreground">{dateLabel}</p>}
                {response.submitted_at && (
                  <p className="text-xs text-muted-foreground">
                    · Soumis le {format(new Date(response.submitted_at), 'd MMM yyyy', { locale: fr })}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {response.validated_at ? (
              <Badge className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50 gap-1">
                <CheckCircle2 className="h-3 w-3" /> Validé
              </Badge>
            ) : response.completed ? (
              <Badge className="text-xs bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50">
                Soumis · En attente
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-xs">
                En cours · {response.current_step}/5
              </Badge>
            )}
            <button
              onClick={() => onDelete(response.id)}
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-red-50 hover:text-red-500 transition-colors"
              title="Supprimer la réponse"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setExpanded(v => !v)}
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            >
              {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Progress bar */}
        {!response.completed && (
          <div className="mt-3 space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Étape {response.current_step} sur 5</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-blue-400 rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        {/* Responses stat */}
        {response.completed && formFields.length > 0 && (
          <div className="mt-2 text-xs text-muted-foreground">
            {answeredCount} réponse{answeredCount > 1 ? 's' : ''} sur {formFields.length} champ{formFields.length > 1 ? 's' : ''}
          </div>
        )}

        {/* Expanded details */}
        {expanded && (
          <div className="mt-4 space-y-4 border-t pt-4">
            {clientInfoEntries.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Informations client</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
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
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Réponses au questionnaire</p>
                <div className="space-y-2.5">
                  {formFields.map(field => {
                    const value = response.responses[field.id]
                    if (value === undefined) return null
                    return (
                      <div key={field.id} className="rounded-lg border bg-muted/30 px-3 py-2">
                        <p className="text-xs font-medium text-muted-foreground">{field.label}</p>
                        <p className="text-sm mt-0.5">{formatValue(value)}</p>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {answeredCount === 0 && clientInfoEntries.length === 0 && (
              <p className="text-xs text-muted-foreground">Aucune réponse enregistrée.</p>
            )}
          </div>
        )}

        {/* Actions — Soumis, pas encore validé */}
        {response.completed && !response.validated_at && (
          <div className="mt-3 pt-3 border-t space-y-2">
            {!showRevision ? (
              <div className="flex items-center gap-2 flex-wrap">
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={validating} onClick={handleValidateClick}>
                  <CheckCircle2 className="h-4 w-4 mr-1.5" />
                  {validating ? 'Validation...' : 'Valider l\'onboarding'}
                </Button>
                <Button size="sm" variant="outline" className="text-amber-600 border-amber-200 hover:bg-amber-50" onClick={() => setShowRevision(true)}>
                  <MessageSquareDiff className="h-4 w-4 mr-1.5" />
                  Demander des modifications
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Message au client (optionnel) :</p>
                <Textarea
                  value={revisionMessage}
                  onChange={(e) => setRevisionMessage(e.target.value)}
                  placeholder="Expliquez ce qui doit être modifié..."
                  rows={3}
                />
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="text-amber-600 border-amber-200 hover:bg-amber-50" disabled={requestingRevision} onClick={handleRevisionSubmit}>
                    <Send className="h-3.5 w-3.5 mr-1.5" />
                    {requestingRevision ? 'Envoi...' : clientEmail ? 'Envoyer au client' : 'Demander modifications'}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setShowRevision(false); setRevisionMessage('') }}>
                    Annuler
                  </Button>
                </div>
                {!clientEmail && <p className="text-xs text-muted-foreground">⚠ Aucun email client — aucun email ne sera envoyé.</p>}
              </div>
            )}
          </div>
        )}

        {/* Actions — Validé */}
        {response.validated_at && clientEmail && (
          <div className="mt-3 pt-3 border-t">
            {portalInvited ? (
              <p className="text-xs text-emerald-600 flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Invitation portail envoyée à {clientEmail}
              </p>
            ) : (
              <Button size="sm" variant="outline" className="text-primary border-primary/20 hover:bg-primary/5" disabled={invitingPortal} onClick={handleInvitePortal}>
                <Share2 className="h-3.5 w-3.5 mr-1.5" />
                {invitingPortal ? 'Envoi...' : 'Inviter au portail client'}
              </Button>
            )}
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
  const [copiedLink, setCopiedLink] = useState(false)

  // Responses
  const [responses, setResponses] = useState<OnboardingResponse[]>([])
  const [formFieldsMeta, setFormFieldsMeta] = useState<FormFieldMeta[]>([])
  const [responsesLoading, setResponsesLoading] = useState(false)
  const [responsesLoaded, setResponsesLoaded] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Welcome settings
  const [welcomeTitle, setWelcomeTitle] = useState('')
  const [welcomeMessage, setWelcomeMessage] = useState('')
  const [projectSettings, setProjectSettings] = useState<Record<string, unknown> | null>(null)
  const [savingWelcome, setSavingWelcome] = useState(false)

  // Invite dialog
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteSending, setInviteSending] = useState(false)

  // Field modal
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

  // Save as template
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [savingTemplate, setSavingTemplate] = useState(false)

  // Load from template
  const [loadTemplateOpen, setLoadTemplateOpen] = useState(false)
  const [templates, setTemplates] = useState<{ defaults: TemplateItem[]; mine: TemplateItem[] }>({ defaults: [], mine: [] })
  const [loadingTemplates, setLoadingTemplates] = useState(false)
  const [applyingTemplate, setApplyingTemplate] = useState(false)

  // Delete response confirmation
  const [deleteResponseId, setDeleteResponseId] = useState<string | null>(null)

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

  // ── Load data ──
  useEffect(() => {
    Promise.all([
      fetch(`/api/projects/${id}/fields`).then(r => r.json()),
      fetch(`/api/projects/${id}`).then(r => r.json()),
    ]).then(([fieldsData, projectData]) => {
      setFields(fieldsData.data?.fields ?? [])
      setSections(fieldsData.data?.sections ?? [])
      setPublicId(projectData.data?.public_id ?? '')
      const settings = projectData.data?.settings ?? null
      setProjectSettings(settings)
      const welcome = (settings?.welcome ?? {}) as Record<string, string>
      setWelcomeTitle(welcome.title ?? '')
      setWelcomeMessage(welcome.message ?? '')
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

  useEffect(() => {
    if (activeTab === 'responses') {
      pollIntervalRef.current = setInterval(() => loadResponses(true), 15000)
    } else {
      if (pollIntervalRef.current) { clearInterval(pollIntervalRef.current); pollIntervalRef.current = null }
    }
    return () => { if (pollIntervalRef.current) { clearInterval(pollIntervalRef.current); pollIntervalRef.current = null } }
  }, [activeTab, loadResponses])

  // ── Actions ──
  async function handleValidate(responseId: string) {
    try {
      const res = await fetch(`/api/projects/${id}/responses/${responseId}`, { method: 'PUT' })
      if (!res.ok) throw new Error()
      setResponses(prev => prev.map(r => r.id === responseId ? { ...r, validated_at: new Date().toISOString() } : r))
      toast.success('Onboarding validé !')
    } catch { toast.error('Erreur lors de la validation') }
  }

  async function handleRevisionRequest(responseId: string, message: string) {
    try {
      const res = await fetch(`/api/projects/${id}/responses/${responseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      })
      if (!res.ok) throw new Error()
      setResponses(prev => prev.map(r => r.id === responseId ? { ...r, completed: false, validated_at: null } : r))
      toast.success('Modifications demandées au client')
    } catch { toast.error('Erreur lors de la demande de modifications') }
  }

  async function handleDeleteResponse(responseId: string) {
    try {
      const res = await fetch(`/api/projects/${id}/responses/${responseId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setResponses(prev => prev.filter(r => r.id !== responseId))
      toast.success('Réponse supprimée. Le formulaire est de nouveau disponible.')
    } catch { toast.error('Erreur lors de la suppression') }
  }

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
    } catch { toast.error('Erreur lors de l\'envoi.') } finally { setInviteSending(false) }
  }

  function copyFormLink() {
    if (!publicId) return
    const url = `${window.location.origin}/p/${publicId}`
    navigator.clipboard.writeText(url)
    setCopiedLink(true)
    toast.success('Lien copié dans le presse-papier')
    setTimeout(() => setCopiedLink(false), 2000)
  }

  async function handleSaveAsTemplate(e: React.FormEvent) {
    e.preventDefault()
    setSavingTemplate(true)
    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: templateName.trim(), project_id: id }),
      })
      const json = await res.json()
      if (res.ok) {
        setSaveTemplateOpen(false)
        setTemplateName('')
        toast.success('Template créé ! Retrouvez-le dans la section Templates.')
      } else {
        toast.error(json.error ?? 'Erreur lors de la création du template')
      }
    } catch { toast.error('Erreur réseau') } finally { setSavingTemplate(false) }
  }

  async function openLoadTemplateDialog() {
    setLoadTemplateOpen(true)
    setLoadingTemplates(true)
    try {
      const res = await fetch('/api/templates')
      const json = await res.json()
      if (res.ok) setTemplates(json.data ?? { defaults: [], mine: [] })
      else toast.error(json.error ?? 'Erreur lors du chargement des templates')
    } catch { toast.error('Erreur réseau') } finally { setLoadingTemplates(false) }
  }

  async function handleApplyTemplate(template: TemplateItem) {
    if (applyingTemplate) return
    setApplyingTemplate(true)
    try {
      const sectionsConfig = template.sections_config ?? []
      const formConfig = template.form_config ?? []

      // Map section index → new section id
      const sectionIdMap: Record<number, string> = {}

      for (let i = 0; i < sectionsConfig.length; i++) {
        const s = sectionsConfig[i] as { title: string; kind?: string }
        const res = await fetch(`/api/projects/${id}/sections`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: s.title, kind: s.kind ?? 'default' }),
        })
        if (res.ok) {
          const json = await res.json()
          sectionIdMap[i] = json.data?.id
        }
      }

      // Create fields
      const fieldPromises = (formConfig as Array<Record<string, unknown>>).map(f => {
        const sectionIndex = typeof f.section_index === 'number' ? f.section_index : null
        const sectionId = sectionIndex !== null ? (sectionIdMap[sectionIndex] ?? null) : null
        return fetch(`/api/projects/${id}/fields`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: f.type,
            label: f.label,
            description: f.description ?? null,
            placeholder: f.placeholder ?? null,
            required: f.required ?? false,
            sensitive: f.sensitive ?? false,
            options: f.options ?? null,
            section_id: sectionId,
            order_index: f.order_index ?? 0,
          }),
        })
      })

      await Promise.all(fieldPromises)

      // Reload
      const reloadRes = await fetch(`/api/projects/${id}/fields`)
      const reloadJson = await reloadRes.json()
      setFields(reloadJson.data?.fields ?? [])
      setSections(reloadJson.data?.sections ?? [])

      setLoadTemplateOpen(false)
      toast.success(`Template "${template.name}" appliqué avec succès !`)
    } catch { toast.error('Erreur lors de l\'application du template') } finally { setApplyingTemplate(false) }
  }

  async function handleSaveWelcome() {
    setSavingWelcome(true)
    try {
      const newSettings = { ...(projectSettings ?? {}), welcome: { title: welcomeTitle, message: welcomeMessage } }
      const res = await fetch(`/api/projects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: newSettings }),
      })
      if (res.ok) { setProjectSettings(newSettings); toast.success('Page de bienvenue mise à jour') }
      else { const json = await res.json(); toast.error(json.error ?? 'Erreur lors de la sauvegarde') }
    } catch { toast.error('Erreur réseau') } finally { setSavingWelcome(false) }
  }

  // ── Derived data ──
  const questionFields = fields
    .filter(f => f.type !== 'file' && sections.find(s => s.id === f.section_id)?.kind !== 'access')
    .sort((a, b) => a.order_index - b.order_index)

  const documentFields = fields.filter(f => f.type === 'file').sort((a, b) => a.order_index - b.order_index)

  const accessFields = fields.filter(f => {
    const sec = sections.find(s => s.id === f.section_id)
    return sec?.kind === 'access'
  }).sort((a, b) => a.order_index - b.order_index)

  const defaultSections = sections.filter(s => s.kind !== 'access').sort((a, b) => a.order_index - b.order_index)

  const fieldsBySectionId = useCallback((sectionId: string | null) => {
    return questionFields.filter(f => f.section_id === sectionId).sort((a, b) => a.order_index - b.order_index)
  }, [questionFields])

  const unsectionedFields = questionFields.filter(f => !f.section_id)
  const sortedSections = [...defaultSections].sort((a, b) => a.order_index - b.order_index)

  // ── DnD ──
  async function handleSectionsDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = defaultSections.findIndex(s => s.id === active.id)
    const newIndex = defaultSections.findIndex(s => s.id === over.id)
    const reordered = arrayMove(defaultSections, oldIndex, newIndex).map((s, i) => ({ ...s, order_index: i }))
    setSections(prev => { const access = prev.filter(s => s.kind === 'access'); return [...reordered, ...access] })
    await fetch(`/api/projects/${id}/sections/reorder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: reordered.map(s => ({ id: s.id, order_index: s.order_index })) }),
    })
  }

  async function handleFieldsDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const activeField = fields.find(f => f.id === active.id)
    const overField = fields.find(f => f.id === over.id)
    if (!activeField || !overField) return
    const activeSectionId = activeField.section_id
    const overSectionId = overField.section_id
    if (activeSectionId === overSectionId) {
      const sectionFields = fieldsBySectionId(activeSectionId)
      const oldIndex = sectionFields.findIndex(f => f.id === active.id)
      const newIndex = sectionFields.findIndex(f => f.id === over.id)
      const reordered = arrayMove(sectionFields, oldIndex, newIndex).map((f, i) => ({ ...f, order_index: i }))
      setFields(prev => { const others = prev.filter(f => f.section_id !== activeSectionId || f.type === 'file'); return [...others, ...reordered] })
      await fetch(`/api/projects/${id}/fields/reorder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: reordered.map(f => ({ id: f.id, order_index: f.order_index })) }),
      })
    } else {
      const activeSectionFields = fieldsBySectionId(activeSectionId).filter(f => f.id !== active.id)
      const reorderedActive = activeSectionFields.map((f, i) => ({ ...f, order_index: i }))
      const overSectionFields = fieldsBySectionId(overSectionId)
      const newIndex = overSectionFields.findIndex(f => f.id === over.id)
      const movedField = { ...activeField, section_id: overSectionId }
      const newOverFields = [...overSectionFields]
      newOverFields.splice(newIndex, 0, movedField)
      const reorderedOver = newOverFields.map((f, i) => ({ ...f, order_index: i }))
      setFields(prev => {
        const others = prev.filter(f => (f.section_id !== activeSectionId && f.section_id !== overSectionId) || f.type === 'file')
        return [...others, ...reorderedActive, ...reorderedOver]
      })
      const allItems = [...reorderedActive, ...reorderedOver].map(f => ({ id: f.id, order_index: f.order_index, section_id: f.section_id }))
      await fetch(`/api/projects/${id}/fields/reorder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: allItems }),
      })
    }
  }

  // ── Field modal ──
  function openAddFieldModal(sectionId: string | null) {
    setEditField(null)
    setNewField({ ...defaultField(), section_id: sectionId })
    setOptionInput('')
    setFieldModalOpen(true)
  }

  function openEditFieldModal(field: FormField) {
    setEditField(field)
    setNewField({ type: field.type, label: field.label, description: field.description ?? '', placeholder: field.placeholder ?? '', required: field.required, options: field.options, section_id: field.section_id, sensitive: field.sensitive })
    setOptionInput('')
    setFieldModalOpen(true)
  }

  async function handleQuickAddField(preset: typeof QUICK_FIELD_PRESETS[number], sectionId: string | null = null) {
    try {
      const sectionFields = fieldsBySectionId(sectionId)
      const res = await fetch(`/api/projects/${id}/fields`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: preset.type, label: preset.label, placeholder: preset.placeholder ?? '', description: '', required: false, options: null, section_id: sectionId, sensitive: false, order_index: sectionFields.length }),
      })
      const json = await res.json()
      if (res.ok) { setFields(prev => [...prev, json.data]); toast.success(`Champ "${preset.label}" ajouté`) }
      else toast.error(json.error ?? 'Erreur')
    } catch { toast.error('Erreur réseau') }
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
  function openAddSectionModal() { setEditSection(null); setSectionTitle(''); setSectionModalOpen(true) }

  function openEditSectionModal(section: OnboardingSection) {
    setEditSection(section); setSectionTitle(section.title); setSectionModalOpen(true)
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
  function openAddDocModal() { setEditDocField(null); setNewDocField(defaultDocumentField()); setDocModalOpen(true) }

  function openEditDocModal(field: FormField) {
    setEditDocField(field)
    setNewDocField({ type: 'file', label: field.label, description: field.description ?? '', placeholder: field.placeholder ?? '', required: field.required, options: field.options, section_id: field.section_id, sensitive: false })
    setDocModalOpen(true)
  }

  async function handleQuickAddDoc(preset: typeof QUICK_DOC_PRESETS[number]) {
    try {
      const res = await fetch(`/api/projects/${id}/fields`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'file', label: preset.label, description: preset.description, placeholder: '', required: false, options: null, section_id: null, sensitive: false, order_index: documentFields.length }),
      })
      const json = await res.json()
      if (res.ok) { setFields(prev => [...prev, json.data]); toast.success(`"${preset.label}" ajouté`) }
      else toast.error(json.error ?? 'Erreur')
    } catch { toast.error('Erreur réseau') }
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
        if (res.ok) { setFields(prev => prev.map(f => f.id === editDocField.id ? { ...f, ...json.data } : f)); setDocModalOpen(false) }
        else toast.error(json.error ?? 'Erreur lors de la modification')
      } else {
        const res = await fetch(`/api/projects/${id}/fields`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'file', label: newDocField.label, description: newDocField.description ?? '', placeholder: '', required: newDocField.required, options: null, section_id: null, sensitive: false, order_index: documentFields.length }),
        })
        const json = await res.json()
        if (res.ok) { setFields(prev => [...prev, json.data]); setDocModalOpen(false) }
        else toast.error(json.error ?? 'Erreur lors de l\'enregistrement')
      }
    } catch { toast.error('Erreur réseau') } finally { setSavingDoc(false) }
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
    if (res.ok) { setSections(prev => [...prev, json.data]); return json.data.id as string }
    throw new Error('Impossible de créer la section accès')
  }

  function openAddAccessModal() { setEditAccessField(null); setNewAccessField(defaultAccessField()); setAccessModalOpen(true) }

  function openEditAccessModal(field: FormField) {
    setEditAccessField(field)
    const accessType = field.sensitive ? 'password' : field.type
    setNewAccessField({ label: field.label, accessType: accessType as string, description: field.description ?? '', required: field.required })
    setAccessModalOpen(true)
  }

  async function handleQuickAddAccess(preset: typeof QUICK_ACCESS_PRESETS[number]) {
    try {
      const isPassword = preset.type === 'password'
      const sectionId = await getOrCreateAccessSection()
      const res = await fetch(`/api/projects/${id}/fields`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: isPassword ? 'text' : preset.type, label: preset.label, description: preset.description, placeholder: '', required: false, options: null, section_id: sectionId, sensitive: isPassword, order_index: accessFields.length }),
      })
      const json = await res.json()
      if (res.ok) { setFields(prev => [...prev, json.data]); toast.success(`"${preset.label}" ajouté`) }
      else toast.error(json.error ?? 'Erreur')
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Erreur') }
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
          body: JSON.stringify({ label: newAccessField.label, description: newAccessField.description, required: newAccessField.required, sensitive }),
        })
        const json = await res.json()
        if (res.ok) { setFields(prev => prev.map(f => f.id === editAccessField.id ? { ...f, ...json.data } : f)); setAccessModalOpen(false) }
        else toast.error(json.error ?? 'Erreur lors de la modification')
      } else {
        const sectionId = await getOrCreateAccessSection()
        const res = await fetch(`/api/projects/${id}/fields`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: fieldType, label: newAccessField.label, description: newAccessField.description ?? '', placeholder: '', required: newAccessField.required, options: null, section_id: sectionId, sensitive, order_index: accessFields.length }),
        })
        const json = await res.json()
        if (res.ok) { setFields(prev => [...prev, json.data]); setAccessModalOpen(false) }
        else toast.error(json.error ?? 'Erreur lors de l\'enregistrement')
      }
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Erreur') } finally { setSavingAccess(false) }
  }

  const needsOptions = newField.type === 'select' || newField.type === 'multiselect'

  // ── Stats ──
  const validatedCount = responses.filter(r => r.validated_at).length
  const pendingCount = responses.filter(r => r.completed && !r.validated_at).length
  const inProgressCount = responses.filter(r => !r.completed).length
  const formComplete = questionFields.length > 0 || documentFields.length > 0 || accessFields.length > 0

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Onboarding client</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Configurez le formulaire que recevra votre client pour démarrer le projet
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap self-start">
          <Button variant="outline" size="sm" onClick={openLoadTemplateDialog}>
            <Layers className="h-4 w-4 mr-2" />
            Charger un template
          </Button>
          <Button variant="outline" size="sm" onClick={() => { setTemplateName(''); setSaveTemplateOpen(true) }}>
            <BookmarkPlus className="h-4 w-4 mr-2" />
            Sauvegarder en template
          </Button>
          {publicId && (
            <Button variant="outline" size="sm" onClick={() => router.push(`/p/${publicId}`)}>
              <Eye className="h-4 w-4 mr-2" />
              Aperçu
            </Button>
          )}
          <Button size="sm" onClick={() => setInviteOpen(true)}>
            <Send className="h-4 w-4 mr-2" />
            Envoyer au client
          </Button>
        </div>
      </div>

      {/* ── Workflow steps ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          {
            step: 1,
            title: 'Configurez le formulaire',
            desc: 'Ajoutez vos questions, demandes de documents et accès techniques',
            icon: <Settings className="h-5 w-5" />,
            done: formComplete,
            color: 'text-blue-600',
            bg: 'bg-blue-50',
            border: 'border-blue-100',
          },
          {
            step: 2,
            title: 'Envoyez à votre client',
            desc: 'Partagez le formulaire par email ou copiez le lien directement',
            icon: <Send className="h-5 w-5" />,
            done: responses.length > 0,
            color: 'text-violet-600',
            bg: 'bg-violet-50',
            border: 'border-violet-100',
          },
          {
            step: 3,
            title: 'Validez les réponses',
            desc: 'Révisez les informations et validez l\'onboarding du client',
            icon: <CheckCircle2 className="h-5 w-5" />,
            done: validatedCount > 0,
            color: 'text-emerald-600',
            bg: 'bg-emerald-50',
            border: 'border-emerald-100',
          },
        ].map(s => (
          <div key={s.step} className={cn(
            'relative flex items-start gap-3 rounded-xl border p-4 transition-colors',
            s.done ? `${s.bg} ${s.border}` : 'bg-muted/30 border-border',
          )}>
            {/* Step number / check */}
            <div className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold',
              s.done ? `${s.bg} ${s.color}` : 'bg-muted text-muted-foreground',
            )}>
              {s.done ? <Check className="h-4 w-4" /> : s.step}
            </div>
            <div>
              <p className={cn('text-sm font-semibold', s.done ? s.color : 'text-foreground')}>
                {s.title}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Form link ───────────────────────────────────────────────────────── */}
      {publicId && (
        <div className="flex items-center gap-2 rounded-xl border bg-muted/30 px-4 py-2.5">
          <Link2 className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="flex-1 text-xs text-muted-foreground truncate font-mono">
            {typeof window !== 'undefined' ? `${window.location.origin}/p/${publicId}` : `/p/${publicId}`}
          </span>
          <button
            onClick={copyFormLink}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors shrink-0',
              copiedLink
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-background border hover:bg-accent text-foreground',
            )}
          >
            {copiedLink ? <><Check className="h-3.5 w-3.5" /> Copié</> : <><Copy className="h-3.5 w-3.5" /> Copier</>}
          </button>
          <button
            onClick={() => setInviteOpen(true)}
            className="flex items-center gap-1.5 rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors shrink-0"
          >
            <Send className="h-3.5 w-3.5" />
            Envoyer
          </button>
        </div>
      )}

      {/* ── Tabs ────────────────────────────────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="h-auto flex flex-wrap gap-1 bg-muted/50 p-1 rounded-xl">
          {[
            { value: 'bienvenue', icon: '👋', label: 'Bienvenue', count: null },
            { value: 'questionnaire', icon: '✏️', label: 'Questionnaire', count: questionFields.length || null },
            { value: 'documents', icon: '📎', label: 'Documents', count: documentFields.length || null },
            { value: 'access', icon: '🔑', label: 'Accès', count: accessFields.length || null },
            { value: 'responses', icon: '💬', label: 'Réponses', count: responses.length || null },
          ].map(tab => (
            <TabsTrigger key={tab.value} value={tab.value} className="flex items-center gap-1.5 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg">
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.count !== null && (
                <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary/10 px-1 text-[10px] font-medium text-primary">
                  {tab.count}
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ─── Tab: Bienvenue ──────────────────────────────────────────────── */}
        <TabsContent value="bienvenue" className="mt-4">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Left: editor */}
            <div className="space-y-4">
              <InfoCallout icon={Info} variant="blue">
                Ce message apparaît sur la <strong>première page</strong> du formulaire client. Profitez-en pour créer une bonne première impression.
              </InfoCallout>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="welcome_title">Titre de bienvenue</Label>
                  <Input
                    id="welcome_title"
                    value={welcomeTitle}
                    onChange={(e) => setWelcomeTitle(e.target.value)}
                    placeholder="Bienvenue ! 🎉"
                    maxLength={100}
                  />
                  <p className="text-xs text-muted-foreground">Laissez vide pour utiliser le titre par défaut</p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="welcome_message">Message d&apos;accueil</Label>
                  <Textarea
                    id="welcome_message"
                    value={welcomeMessage}
                    onChange={(e) => setWelcomeMessage(e.target.value)}
                    placeholder="Nous sommes ravis de vous accompagner sur ce projet. Ce formulaire nous permet de mieux comprendre vos besoins et de démarrer dans les meilleures conditions."
                    rows={4}
                    maxLength={400}
                  />
                  <p className="text-xs text-muted-foreground">{welcomeMessage.length}/400 · Laissez vide pour le message par défaut</p>
                </div>

                <Button onClick={handleSaveWelcome} disabled={savingWelcome}>
                  {savingWelcome ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Sauvegarde...</> : 'Sauvegarder'}
                </Button>
              </div>
            </div>

            {/* Right: preview */}
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Aperçu client</p>
              <div className="rounded-2xl border-2 border-dashed bg-gradient-to-br from-background to-muted/20 p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Sparkles className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">Formulaire d&apos;onboarding</span>
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold">{welcomeTitle || 'Bienvenue ! 🎉'}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {welcomeMessage || 'Nous sommes ravis de vous accompagner sur ce projet. Ce formulaire nous permet de mieux comprendre vos besoins.'}
                  </p>
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                    <div className="h-full w-0 rounded-full bg-primary" />
                  </div>
                  <span className="text-xs text-muted-foreground">Étape 1/5</span>
                </div>
                <div className="flex justify-end">
                  <div className="rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground">
                    Commencer →
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ─── Tab: Questionnaire ──────────────────────────────────────────── */}
        <TabsContent value="questionnaire" className="mt-4 space-y-5">

          <InfoCallout icon={ClipboardList} variant="blue">
            <strong>Questionnaire</strong> — Ces champs constituent l&apos;étape 2 du formulaire client. Organisez vos questions en sections pour plus de clarté. Le client répond sur la même page, dans l&apos;ordre que vous définissez.
          </InfoCallout>

          {/* Quick add bar */}
          <div className="rounded-xl border bg-muted/20 p-4 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-yellow-500" />
              Ajout rapide — champs fréquents
            </p>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_FIELD_PRESETS.map(preset => (
                <button
                  key={preset.label}
                  onClick={() => handleQuickAddField(preset, null)}
                  className="inline-flex items-center gap-1.5 rounded-full border bg-background px-2.5 py-1 text-xs font-medium hover:bg-primary/5 hover:border-primary/30 hover:text-primary transition-colors"
                >
                  {preset.icon}
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => openAddFieldModal(null)}>
              <Plus className="h-4 w-4 mr-1.5" />
              Champ personnalisé
            </Button>
            <Button variant="outline" size="sm" onClick={openAddSectionModal}>
              <Layers className="h-4 w-4 mr-1.5" />
              Nouvelle section
            </Button>
          </div>

          {/* Fields list */}
          {loading ? (
            <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}</div>
          ) : sortedSections.length === 0 && unsectionedFields.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-card px-6 py-16 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-50">
                <ClipboardList className="h-7 w-7 text-blue-500" />
              </div>
              <h3 className="mb-1 text-base font-semibold">Aucune question pour l&apos;instant</h3>
              <p className="mb-4 max-w-xs text-sm text-muted-foreground">
                Utilisez les boutons ci-dessus ou les présets rapides pour créer votre questionnaire.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => openAddFieldModal(null)}>
                  <Plus className="h-4 w-4 mr-1.5" />Premier champ
                </Button>
                <Button variant="outline" size="sm" onClick={openAddSectionModal}>
                  <Layers className="h-4 w-4 mr-1.5" />Première section
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleFieldsDragEnd}>
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
                  />
                )}
              </DndContext>
            </div>
          )}

          {(questionFields.length > 0) && (
            <div className="flex gap-4 text-sm text-muted-foreground border-t pt-3">
              <span><strong className="text-foreground">{questionFields.length}</strong> champ{questionFields.length > 1 ? 's' : ''}</span>
              <span className="text-border">|</span>
              <span><strong className="text-foreground">{questionFields.filter(f => f.required).length}</strong> obligatoire{questionFields.filter(f => f.required).length > 1 ? 's' : ''}</span>
              <span className="text-border">|</span>
              <span><strong className="text-foreground">{sections.filter(s => s.kind !== 'access').length}</strong> section{sections.filter(s => s.kind !== 'access').length > 1 ? 's' : ''}</span>
            </div>
          )}
        </TabsContent>

        {/* ─── Tab: Documents ──────────────────────────────────────────────── */}
        <TabsContent value="documents" className="mt-4 space-y-5">

          <InfoCallout icon={FolderOpen} variant="green">
            <strong>Documents demandés</strong> — Le client uploade ses fichiers à l&apos;étape 3. Indiquez clairement ce que vous attendez (format, contenu, utilité) pour éviter les allers-retours.
          </InfoCallout>

          {/* Quick add presets */}
          <div className="rounded-xl border bg-muted/20 p-4 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-yellow-500" />
              Documents fréquemment demandés
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {QUICK_DOC_PRESETS.map(preset => (
                <button
                  key={preset.label}
                  onClick={() => handleQuickAddDoc(preset)}
                  className="flex items-start gap-3 rounded-lg border bg-background px-3 py-2.5 text-left hover:bg-primary/5 hover:border-primary/30 transition-colors group"
                >
                  <span className="mt-0.5 text-muted-foreground group-hover:text-primary transition-colors">
                    {preset.icon}
                  </span>
                  <div>
                    <p className="text-xs font-medium group-hover:text-primary transition-colors">{preset.label}</p>
                    <p className="text-[10px] text-muted-foreground">{preset.description}</p>
                  </div>
                  <Plus className="ml-auto h-3.5 w-3.5 shrink-0 mt-0.5 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                </button>
              ))}
            </div>
          </div>

          <Button size="sm" onClick={openAddDocModal}>
            <Plus className="h-4 w-4 mr-1.5" />
            Document personnalisé
          </Button>

          {loading ? (
            <div className="space-y-2">{[1,2].map(i => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}</div>
          ) : documentFields.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-card px-6 py-12 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
                <FileText className="h-6 w-6 text-emerald-500" />
              </div>
              <h3 className="mb-1 text-sm font-semibold">Aucun document demandé</h3>
              <p className="text-xs text-muted-foreground">Utilisez les présets ci-dessus ou ajoutez un document personnalisé.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {documentFields.map((field, idx) => (
                <div key={field.id} className="flex items-center gap-3 rounded-xl border bg-card p-4 group hover:shadow-sm transition-shadow">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">{field.label || <span className="italic text-muted-foreground">Sans titre</span>}</span>
                      {field.required && <Badge className="text-[10px] py-0 h-4 bg-red-50 text-red-700 border-red-200 hover:bg-red-50">Obligatoire</Badge>}
                    </div>
                    {field.description && <p className="text-xs text-muted-foreground mt-0.5">{field.description}</p>}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button onClick={() => openEditDocModal(field)} className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => handleDeleteField(field.id)} className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ─── Tab: Accès ──────────────────────────────────────────────────── */}
        <TabsContent value="access" className="mt-4 space-y-5">

          <InfoCallout icon={Lock} variant="amber">
            <strong>Accès techniques</strong> — Le client renseigne ses identifiants à l&apos;étape 4. Ces informations sont <strong>chiffrées (AES-256)</strong> et accessibles uniquement via le Coffre-fort du projet. Demandez uniquement ce dont vous avez besoin.
          </InfoCallout>

          {/* Quick add presets by category */}
          <div className="rounded-xl border bg-muted/20 p-4 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-yellow-500" />
              Accès fréquemment demandés
            </p>
            {Object.entries(
              QUICK_ACCESS_PRESETS.reduce<Record<string, typeof QUICK_ACCESS_PRESETS>>((acc, p) => {
                if (!acc[p.category]) acc[p.category] = []
                acc[p.category].push(p)
                return acc
              }, {})
            ).map(([category, presets]) => (
              <div key={category}>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">{category}</p>
                <div className="flex flex-wrap gap-1.5">
                  {presets.map(preset => (
                    <button
                      key={preset.label}
                      onClick={() => handleQuickAddAccess(preset)}
                      className="inline-flex items-center gap-1.5 rounded-full border bg-background px-2.5 py-1 text-xs font-medium hover:bg-amber-50 hover:border-amber-300 hover:text-amber-700 transition-colors"
                    >
                      <Plus className="h-3 w-3" />
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <Button size="sm" onClick={openAddAccessModal}>
            <Plus className="h-4 w-4 mr-1.5" />
            Accès personnalisé
          </Button>

          {loading ? (
            <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}</div>
          ) : accessFields.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-card px-6 py-12 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-50">
                <KeyRound className="h-6 w-6 text-amber-500" />
              </div>
              <h3 className="mb-1 text-sm font-semibold">Aucun accès demandé</h3>
              <p className="text-xs text-muted-foreground">Sélectionnez des présets ou créez un accès personnalisé ci-dessus.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {accessFields.map(field => {
                const accessType = ACCESS_TYPES.find(t => t.value === (field.sensitive ? 'password' : field.type))
                return (
                  <div key={field.id} className="flex items-center gap-3 rounded-xl border bg-card p-4 group hover:shadow-sm transition-shadow">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-lg">
                      {accessType?.icon ?? '🔑'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">{field.label || <span className="italic text-muted-foreground">Sans titre</span>}</span>
                        {field.required && <Badge className="text-[10px] py-0 h-4 bg-red-50 text-red-700 border-red-200 hover:bg-red-50">Obligatoire</Badge>}
                        {field.sensitive && <Badge className="text-[10px] py-0 h-4 bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50">🔒 Chiffré</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{accessType?.label ?? field.type}{field.description ? ` · ${field.description}` : ''}</p>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button onClick={() => openEditAccessModal(field)} className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => handleDeleteField(field.id)} className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* ─── Tab: Réponses ───────────────────────────────────────────────── */}
        <TabsContent value="responses" className="mt-4">
          {responsesLoading ? (
            <div className="space-y-3">
              {[1, 2].map(i => (
                <Card key={i}><CardContent className="py-4">
                  <div className="flex items-start gap-3">
                    <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-5 w-24 rounded-full" />
                  </div>
                </CardContent></Card>
              ))}
            </div>
          ) : responses.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-card px-6 py-16 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-violet-50">
                <Users className="h-7 w-7 text-violet-500" />
              </div>
              <h3 className="mb-1 text-base font-semibold">Aucune réponse pour l&apos;instant</h3>
              <p className="mb-4 max-w-xs text-sm text-muted-foreground">
                Envoyez le formulaire à votre client pour commencer à recevoir ses informations.
              </p>
              <Button size="sm" onClick={() => setInviteOpen(true)}>
                <Send className="h-4 w-4 mr-2" />
                Envoyer le formulaire
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Stats + refresh bar */}
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-3">
                {[
                  { label: 'Validés', value: validatedCount, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100', icon: <CheckCircle2 className="h-4 w-4" /> },
                  { label: 'En attente', value: pendingCount, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100', icon: <AlertCircle className="h-4 w-4" /> },
                  { label: 'En cours', value: inProgressCount, color: 'text-muted-foreground', bg: 'bg-muted', border: 'border-border', icon: <Loader2 className="h-4 w-4" /> },
                ].map(s => (
                  <div key={s.label} className={cn('flex items-center gap-3 rounded-xl border p-3', s.bg, s.border)}>
                    <div className={cn('shrink-0', s.color)}>{s.icon}</div>
                    <div>
                      <p className={cn('text-xl font-bold leading-none', s.color)}>{s.value}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Refresh bar */}
              <div className="flex items-center justify-end gap-3">
                {refreshing ? (
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Actualisation...
                  </span>
                ) : lastRefresh ? (
                  <span className="text-xs text-muted-foreground">
                    Mis à jour à {lastRefresh.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                ) : null}
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={() => loadResponses(true)} disabled={refreshing}>
                  <RefreshCw className="h-3 w-3" />
                  Actualiser
                </Button>
                <span className="flex items-center gap-1.5 text-xs rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 px-2 py-0.5 font-medium">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live · 15s
                </span>
              </div>

              {/* Response cards */}
              {responses.map(response => (
                <ResponseCard
                  key={response.id}
                  response={response}
                  formFields={formFieldsMeta}
                  projectId={id}
                  onValidate={handleValidate}
                  onRevisionRequest={handleRevisionRequest}
                  onDelete={(responseId) => setDeleteResponseId(responseId)}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Dialogs ─────────────────────────────────────────────────────────── */}

      {/* Invitation */}
      <Dialog open={inviteOpen} onOpenChange={(v) => { if (!v) { setInviteOpen(false); setInviteEmail('') } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-primary" />
              Envoyer le formulaire
            </DialogTitle>
            <DialogDescription>
              Votre client recevra un email avec le lien vers son formulaire d&apos;onboarding.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSendInvite} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="invite-email">Adresse email du client</Label>
              <Input id="invite-email" type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="client@exemple.com" required autoFocus />
            </div>
            {publicId && (
              <div className="rounded-lg bg-muted/50 border p-3">
                <p className="text-xs text-muted-foreground mb-1 font-medium">Ou partagez directement le lien :</p>
                <div className="flex items-center gap-2">
                  <code className="text-xs flex-1 truncate text-muted-foreground">/p/{publicId}</code>
                  <button type="button" onClick={copyFormLink} className="text-xs text-primary hover:underline shrink-0 flex items-center gap-1">
                    {copiedLink ? <><Check className="h-3 w-3" /> Copié</> : <><Copy className="h-3 w-3" /> Copier</>}
                  </button>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setInviteOpen(false); setInviteEmail('') }} disabled={inviteSending}>
                Annuler
              </Button>
              <Button type="submit" disabled={inviteSending}>
                {inviteSending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Envoi...</> : <><Send className="h-4 w-4 mr-2" />Envoyer</>}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Save as template */}
      <Dialog open={saveTemplateOpen} onOpenChange={(v) => { if (!v) setSaveTemplateOpen(false) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookmarkPlus className="h-5 w-5 text-primary" />
              Sauvegarder en template
            </DialogTitle>
            <DialogDescription>
              Ce template pourra être réutilisé pour vos prochains projets similaires.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveAsTemplate} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="template-name">Nom du template</Label>
              <Input id="template-name" value={templateName} onChange={(e) => setTemplateName(e.target.value)} placeholder="Ex : Client e-commerce" required autoFocus />
            </div>
            <div className="rounded-lg bg-muted/50 border px-3 py-2 text-xs text-muted-foreground space-y-0.5">
              <p>Sera inclus dans le template :</p>
              <p className="font-medium text-foreground">• {questionFields.length} champ{questionFields.length > 1 ? 's' : ''} de questionnaire</p>
              <p className="font-medium text-foreground">• {documentFields.length} document{documentFields.length > 1 ? 's' : ''} demandé{documentFields.length > 1 ? 's' : ''}</p>
              <p className="font-medium text-foreground">• {accessFields.length} accès technique{accessFields.length > 1 ? 's' : ''}</p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setSaveTemplateOpen(false)} disabled={savingTemplate}>Annuler</Button>
              <Button type="submit" disabled={savingTemplate || !templateName.trim()}>
                {savingTemplate ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Création...</> : 'Créer le template'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Field modal */}
      <Dialog open={fieldModalOpen} onOpenChange={(v) => { if (!v) setFieldModalOpen(false) }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editField ? 'Modifier le champ' : 'Nouveau champ'}</DialogTitle>
            <DialogDescription>Configurez les propriétés de ce champ de formulaire.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveField} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 col-span-2">
                <Label htmlFor="field-label">Libellé <span className="text-destructive">*</span></Label>
                <Input id="field-label" value={newField.label} onChange={e => setNewField(p => ({ ...p, label: e.target.value }))} placeholder="Ex : Votre site web" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="field-type">Type de champ</Label>
                <Select value={newField.type as string} onValueChange={v => setNewField(p => ({ ...p, type: v as FormFieldType, options: null }))}>
                  <SelectTrigger id="field-type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {APP_CONFIG.formFieldTypes.map(t => (
                      <SelectItem key={t.type} value={t.type}>
                        {FIELD_TYPE_ICONS[t.type] ?? ''} {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="field-section">Section</Label>
                <Select
                  value={newField.section_id ?? '__none__'}
                  onValueChange={v => setNewField(p => ({ ...p, section_id: v === '__none__' ? null : v }))}
                >
                  <SelectTrigger id="field-section"><SelectValue placeholder="Sans section" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Sans section</SelectItem>
                    {sortedSections.map(s => <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="field-desc">Description / aide</Label>
              <Input id="field-desc" value={newField.description ?? ''} onChange={e => setNewField(p => ({ ...p, description: e.target.value }))} placeholder="Texte d'aide affiché sous le champ" />
            </div>
            {!needsOptions && (
              <div className="space-y-1.5">
                <Label htmlFor="field-placeholder">Placeholder</Label>
                <Input id="field-placeholder" value={newField.placeholder ?? ''} onChange={e => setNewField(p => ({ ...p, placeholder: e.target.value }))} placeholder="Texte en filigrane..." />
              </div>
            )}
            {needsOptions && (
              <div className="space-y-2">
                <Label>Options</Label>
                <div className="flex gap-2">
                  <Input value={optionInput} onChange={e => setOptionInput(e.target.value)} placeholder="Ajouter une option" onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addOption() } }} />
                  <Button type="button" variant="outline" onClick={addOption}>Ajouter</Button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(newField.options ?? []).map((opt, idx) => (
                    <Badge key={idx} variant="secondary" className="gap-1 pr-1">
                      {opt}
                      <button type="button" onClick={() => removeOption(idx)} className="ml-1 rounded-sm hover:text-destructive transition-colors">×</button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            <div className="flex items-center gap-4 pt-1">
              <div className="flex items-center gap-2">
                <Switch id="field-required" checked={newField.required} onCheckedChange={v => setNewField(p => ({ ...p, required: v }))} />
                <Label htmlFor="field-required" className="text-sm cursor-pointer">Obligatoire</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch id="field-sensitive" checked={newField.sensitive} onCheckedChange={v => setNewField(p => ({ ...p, sensitive: v }))} />
                <Label htmlFor="field-sensitive" className="text-sm cursor-pointer">Chiffré 🔒</Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFieldModalOpen(false)} disabled={saving}>Annuler</Button>
              <Button type="submit" disabled={saving || !newField.label.trim()}>
                {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Enregistrement...</> : editField ? 'Mettre à jour' : 'Ajouter le champ'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Document field modal */}
      <Dialog open={docModalOpen} onOpenChange={(v) => { if (!v) setDocModalOpen(false) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-emerald-600" />
              {editDocField ? 'Modifier la demande' : 'Demander un document'}
            </DialogTitle>
            <DialogDescription>Décrivez précisément le document attendu pour faciliter la tâche au client.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveDocField} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="doc-label">Nom du document <span className="text-destructive">*</span></Label>
              <Input id="doc-label" value={newDocField.label} onChange={e => setNewDocField(p => ({ ...p, label: e.target.value }))} placeholder="Ex : Logo en PNG" required autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="doc-desc">Instructions pour le client</Label>
              <Textarea id="doc-desc" value={newDocField.description ?? ''} onChange={e => setNewDocField(p => ({ ...p, description: e.target.value }))} placeholder="Format attendu, résolution, taille max..." rows={3} />
            </div>
            <div className="flex items-center gap-2">
              <Switch id="doc-required" checked={newDocField.required} onCheckedChange={v => setNewDocField(p => ({ ...p, required: v }))} />
              <Label htmlFor="doc-required" className="cursor-pointer">Document obligatoire</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDocModalOpen(false)} disabled={savingDoc}>Annuler</Button>
              <Button type="submit" disabled={savingDoc || !newDocField.label.trim()}>
                {savingDoc ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Enregistrement...</> : editDocField ? 'Mettre à jour' : 'Ajouter'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Access field modal */}
      <Dialog open={accessModalOpen} onOpenChange={(v) => { if (!v) setAccessModalOpen(false) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-amber-600" />
              {editAccessField ? 'Modifier l\'accès' : 'Demander un accès'}
            </DialogTitle>
            <DialogDescription>Indiquez l&apos;accès dont vous avez besoin. Les mots de passe seront chiffrés automatiquement.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveAccessField} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="access-label">Nom de l&apos;accès <span className="text-destructive">*</span></Label>
              <Input id="access-label" value={newAccessField.label} onChange={e => setNewAccessField(p => ({ ...p, label: e.target.value }))} placeholder="Ex : WordPress Admin" required autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="access-type">Type d&apos;information</Label>
              <Select value={newAccessField.accessType} onValueChange={v => setNewAccessField(p => ({ ...p, accessType: v ?? 'text' }))}>
                <SelectTrigger id="access-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ACCESS_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>
                      <span className="flex items-center gap-2">
                        <span>{t.icon}</span>
                        <span>{t.label}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{ACCESS_TYPES.find(t => t.value === newAccessField.accessType)?.description}</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="access-desc">Instructions</Label>
              <Input id="access-desc" value={newAccessField.description} onChange={e => setNewAccessField(p => ({ ...p, description: e.target.value }))} placeholder="Ex : URL + login + mot de passe admin" />
            </div>
            <div className="flex items-center gap-2">
              <Switch id="access-required" checked={newAccessField.required} onCheckedChange={v => setNewAccessField(p => ({ ...p, required: v }))} />
              <Label htmlFor="access-required" className="cursor-pointer">Accès obligatoire</Label>
            </div>
            {newAccessField.accessType === 'password' && (
              <InfoCallout icon={Lock} variant="amber">
                🔒 Les mots de passe sont chiffrés AES-256 et stockés de façon sécurisée. Ils ne sont visibles que dans le Coffre-fort du projet.
              </InfoCallout>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAccessModalOpen(false)} disabled={savingAccess}>Annuler</Button>
              <Button type="submit" disabled={savingAccess || !newAccessField.label.trim()}>
                {savingAccess ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Enregistrement...</> : editAccessField ? 'Mettre à jour' : 'Ajouter'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Section modal */}
      <Dialog open={sectionModalOpen} onOpenChange={(v) => { if (!v) setSectionModalOpen(false) }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" />
              {editSection ? 'Renommer la section' : 'Nouvelle section'}
            </DialogTitle>
            <DialogDescription>
              Les sections permettent de regrouper vos questions par thème pour une meilleure lisibilité.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveSection} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="section-title">Titre de la section</Label>
              <Input id="section-title" value={sectionTitle} onChange={e => setSectionTitle(e.target.value)} placeholder="Ex : Informations projet, Identité visuelle..." required autoFocus />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setSectionModalOpen(false)} disabled={savingSection}>Annuler</Button>
              <Button type="submit" disabled={savingSection || !sectionTitle.trim()}>
                {savingSection ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />...</> : editSection ? 'Renommer' : 'Créer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete section confirm */}
      <AlertDialog open={!!deletingSectionId} onOpenChange={(v) => { if (!v) setDeletingSectionId(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la section ?</AlertDialogTitle>
            <AlertDialogDescription>
              Les champs de cette section ne seront pas supprimés — ils seront déplacés vers &quot;Champs sans section&quot;.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deletingSectionId && handleDeleteSection(deletingSectionId)}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete response confirm */}
      <AlertDialog open={!!deleteResponseId} onOpenChange={(v) => { if (!v) setDeleteResponseId(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette réponse ?</AlertDialogTitle>
            <AlertDialogDescription>
              La réponse sera définitivement supprimée. Le formulaire sera de nouveau disponible à la soumission pour ce client.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (deleteResponseId) { handleDeleteResponse(deleteResponseId); setDeleteResponseId(null) } }}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Load from template */}
      <Dialog open={loadTemplateOpen} onOpenChange={(v) => { if (!v) setLoadTemplateOpen(false) }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" />
              Charger un template
            </DialogTitle>
            <DialogDescription>
              Les sections et champs du template seront ajoutés à votre formulaire existant.
            </DialogDescription>
          </DialogHeader>

          {loadingTemplates ? (
            <div className="space-y-2 py-2">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
            </div>
          ) : (templates.defaults.length === 0 && templates.mine.length === 0) ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Aucun template disponible. Créez-en un depuis ce formulaire.
            </div>
          ) : (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              {templates.defaults.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Templates par défaut</p>
                  <div className="space-y-2">
                    {templates.defaults.map(t => (
                      <button
                        key={t.id}
                        onClick={() => handleApplyTemplate(t)}
                        disabled={applyingTemplate}
                        className="w-full text-left rounded-lg border bg-card px-4 py-3 hover:bg-accent hover:border-primary/30 transition-colors disabled:opacity-50"
                      >
                        <p className="font-medium text-sm">{t.name}</p>
                        {t.description && <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>}
                        <p className="text-xs text-muted-foreground mt-1">
                          {(t.form_config ?? []).length} champ{(t.form_config ?? []).length > 1 ? 's' : ''} · {(t.sections_config ?? []).length} section{(t.sections_config ?? []).length > 1 ? 's' : ''}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {templates.mine.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Mes templates</p>
                  <div className="space-y-2">
                    {templates.mine.map(t => (
                      <button
                        key={t.id}
                        onClick={() => handleApplyTemplate(t)}
                        disabled={applyingTemplate}
                        className="w-full text-left rounded-lg border bg-card px-4 py-3 hover:bg-accent hover:border-primary/30 transition-colors disabled:opacity-50"
                      >
                        <p className="font-medium text-sm">{t.name}</p>
                        {t.description && <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>}
                        <p className="text-xs text-muted-foreground mt-1">
                          {(t.form_config ?? []).length} champ{(t.form_config ?? []).length > 1 ? 's' : ''} · {(t.sections_config ?? []).length} section{(t.sections_config ?? []).length > 1 ? 's' : ''}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {applyingTemplate && (
            <div className="flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Application du template...
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setLoadTemplateOpen(false)} disabled={applyingTemplate}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
