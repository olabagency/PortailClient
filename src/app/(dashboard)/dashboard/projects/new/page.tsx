'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft, Check, Plus, ClipboardList, Users,
  GitBranch, ChevronRight, CheckCircle2, Clock, Circle, Sparkles,
} from 'lucide-react'
import { ClientModal } from '@/components/dashboard/ClientModal'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Client {
  id: string
  name: string
  company: string | null
}

interface OnboardingTemplate {
  id: string
  name: string
  description: string | null
  form_config: Array<{ label: string }>
  is_default: boolean
}

interface TimelineMilestoneTemplate {
  title: string
  description?: string
  priority: 'normal' | 'high' | 'urgent'
  responsible: 'freelancer' | 'client'
  visible_to_client: boolean
}

interface TimelineTemplate {
  id: string
  name: string
  emoji: string
  description: string
  color: string
  milestones: TimelineMilestoneTemplate[]
}

// ─── Built-in timeline templates ─────────────────────────────────────────────

const TIMELINE_TEMPLATES: TimelineTemplate[] = [
  {
    id: 'site-web',
    name: 'Site web',
    emoji: '🌐',
    description: 'Création ou refonte d\'un site vitrine ou e-commerce',
    color: '#3b82f6',
    milestones: [
      { title: 'Onboarding & collecte d\'informations', description: 'Récupération du brief, assets, accès et contenus.', priority: 'high', responsible: 'client', visible_to_client: true },
      { title: 'Maquettes wireframes', description: 'Structure des pages sans style (zoning et navigation).', priority: 'normal', responsible: 'freelancer', visible_to_client: true },
      { title: 'Validation des wireframes', description: 'Retours client et ajustements.', priority: 'normal', responsible: 'client', visible_to_client: true },
      { title: 'Maquettes visuelles', description: 'Design UI complet avec charte graphique.', priority: 'high', responsible: 'freelancer', visible_to_client: true },
      { title: 'Validation du design', description: 'Approbation finale des maquettes.', priority: 'high', responsible: 'client', visible_to_client: true },
      { title: 'Intégration & développement', description: 'Mise en page, animations et fonctionnalités.', priority: 'normal', responsible: 'freelancer', visible_to_client: false },
      { title: 'Tests & corrections', description: 'Tests cross-navigateurs, mobile et correction des bugs.', priority: 'normal', responsible: 'freelancer', visible_to_client: false },
      { title: 'Recette client', description: 'Validation finale du client avant mise en ligne.', priority: 'urgent', responsible: 'client', visible_to_client: true },
      { title: 'Mise en ligne', description: 'Déploiement sur le serveur de production.', priority: 'urgent', responsible: 'freelancer', visible_to_client: true },
    ],
  },
  {
    id: 'appli-mobile',
    name: 'Application mobile',
    emoji: '📱',
    description: 'Conception et développement d\'une app iOS / Android',
    color: '#8b5cf6',
    milestones: [
      { title: 'Cahier des charges & spécifications', description: 'Définition des fonctionnalités et parcours utilisateurs.', priority: 'high', responsible: 'client', visible_to_client: true },
      { title: 'Maquettes UX / wireframes', description: 'Flows et architecture d\'information.', priority: 'normal', responsible: 'freelancer', visible_to_client: true },
      { title: 'Design UI — écrans clés', description: 'Charte graphique et design des écrans principaux.', priority: 'normal', responsible: 'freelancer', visible_to_client: true },
      { title: 'Validation du design', description: 'Retours et approbation du client.', priority: 'high', responsible: 'client', visible_to_client: true },
      { title: 'Développement — Phase 1 (auth + base)', description: 'Authentification, navigation, structure de données.', priority: 'normal', responsible: 'freelancer', visible_to_client: false },
      { title: 'Développement — Phase 2 (fonctionnalités)', description: 'Implémentation des features core.', priority: 'high', responsible: 'freelancer', visible_to_client: false },
      { title: 'Tests & recette', description: 'Tests fonctionnels, performance et UX.', priority: 'normal', responsible: 'freelancer', visible_to_client: false },
      { title: 'Validation client & recette finale', description: 'Test du client sur environnement de staging.', priority: 'urgent', responsible: 'client', visible_to_client: true },
      { title: 'Publication (App Store / Play Store)', description: 'Soumission et mise en ligne des stores.', priority: 'urgent', responsible: 'freelancer', visible_to_client: true },
    ],
  },
  {
    id: 'community-management',
    name: 'Community Management',
    emoji: '📣',
    description: 'Gestion de réseaux sociaux et stratégie éditoriale',
    color: '#ec4899',
    milestones: [
      { title: 'Audit de présence en ligne', description: 'Analyse des comptes existants et positionnement actuel.', priority: 'normal', responsible: 'freelancer', visible_to_client: true },
      { title: 'Validation de la stratégie éditoriale', description: 'Définition des thématiques, ton et fréquence de publication.', priority: 'high', responsible: 'client', visible_to_client: true },
      { title: 'Création des visuels & templates', description: 'Gabarits Canva/Figma aux couleurs de la marque.', priority: 'normal', responsible: 'freelancer', visible_to_client: true },
      { title: 'Validation des visuels', description: 'Approbation des gabarits par le client.', priority: 'normal', responsible: 'client', visible_to_client: true },
      { title: 'Planning éditorial — Mois 1', description: 'Programme complet des publications avec visuels et légendes.', priority: 'high', responsible: 'freelancer', visible_to_client: true },
      { title: 'Lancement & publications', description: 'Mise en ligne du planning validé.', priority: 'normal', responsible: 'freelancer', visible_to_client: false },
      { title: 'Rapport de performance mensuel', description: 'Statistiques et recommandations.', priority: 'normal', responsible: 'freelancer', visible_to_client: true },
    ],
  },
  {
    id: 'identite-visuelle',
    name: 'Identité visuelle',
    emoji: '🎨',
    description: 'Création d\'un logo et d\'une charte graphique',
    color: '#f59e0b',
    milestones: [
      { title: 'Brief créatif & moodboard', description: 'Recueil des inspirations et de l\'univers de la marque.', priority: 'high', responsible: 'client', visible_to_client: true },
      { title: 'Propositions logo (3 pistes)', description: 'Présentation de 3 directions créatives.', priority: 'high', responsible: 'freelancer', visible_to_client: true },
      { title: 'Sélection & retours piste logo', description: 'Le client choisit une direction et donne ses retours.', priority: 'urgent', responsible: 'client', visible_to_client: true },
      { title: 'Affinage du logo', description: 'Déclinaisons (couleur, N&B, horizontal, pictogramme).', priority: 'normal', responsible: 'freelancer', visible_to_client: true },
      { title: 'Validation finale logo', description: 'Approbation des déclinaisons finales.', priority: 'high', responsible: 'client', visible_to_client: true },
      { title: 'Création de la charte graphique', description: 'Couleurs, typographies, iconographie, patterns.', priority: 'normal', responsible: 'freelancer', visible_to_client: true },
      { title: 'Livrables finaux', description: 'Export SVG, PNG, PDF + guide d\'utilisation.', priority: 'normal', responsible: 'freelancer', visible_to_client: true },
    ],
  },
  {
    id: 'refonte-site',
    name: 'Refonte de site',
    emoji: '🔄',
    description: 'Modernisation d\'un site existant',
    color: '#10b981',
    milestones: [
      { title: 'Audit du site existant', description: 'UX, performances, SEO et contenu actuel.', priority: 'normal', responsible: 'freelancer', visible_to_client: true },
      { title: 'Benchmark & recommandations', description: 'Analyse de la concurrence et axes d\'amélioration.', priority: 'normal', responsible: 'freelancer', visible_to_client: true },
      { title: 'Validation de l\'architecture', description: 'Nouvelle arborescence et structure de pages.', priority: 'high', responsible: 'client', visible_to_client: true },
      { title: 'Maquettes design', description: 'Design de la nouvelle version.', priority: 'high', responsible: 'freelancer', visible_to_client: true },
      { title: 'Validation des maquettes', description: 'Approbation client.', priority: 'high', responsible: 'client', visible_to_client: true },
      { title: 'Intégration', description: 'Développement de la nouvelle version.', priority: 'normal', responsible: 'freelancer', visible_to_client: false },
      { title: 'Migration de contenu', description: 'Transfert des contenus existants vers la nouvelle version.', priority: 'normal', responsible: 'freelancer', visible_to_client: false },
      { title: 'Recette & corrections', description: 'Tests et validation finale.', priority: 'urgent', responsible: 'client', visible_to_client: true },
      { title: 'Mise en ligne', description: 'Bascule vers le nouveau site.', priority: 'urgent', responsible: 'freelancer', visible_to_client: true },
    ],
  },
  {
    id: 'video-motion',
    name: 'Vidéo / Motion',
    emoji: '🎬',
    description: 'Production vidéo ou animation motion design',
    color: '#ef4444',
    milestones: [
      { title: 'Brief créatif & script', description: 'Définition du message, ton et storyboard.', priority: 'high', responsible: 'client', visible_to_client: true },
      { title: 'Storyboard & validation', description: 'Présentation et validation du découpage.', priority: 'high', responsible: 'client', visible_to_client: true },
      { title: 'Tournage / Production', description: 'Capture des séquences ou création des assets.', priority: 'normal', responsible: 'freelancer', visible_to_client: false },
      { title: 'Montage v1', description: 'Première version montée avec musique.', priority: 'normal', responsible: 'freelancer', visible_to_client: true },
      { title: 'Retours client v1', description: 'Corrections demandées par le client.', priority: 'normal', responsible: 'client', visible_to_client: true },
      { title: 'Montage final', description: 'Version finale après corrections.', priority: 'high', responsible: 'freelancer', visible_to_client: true },
      { title: 'Livraison des fichiers', description: 'Export aux formats demandés (MP4, MOV, GIF…).', priority: 'high', responsible: 'freelancer', visible_to_client: true },
    ],
  },
]

// ─── Preset color swatches ────────────────────────────────────────────────────

const COLOR_SWATCHES = [
  '#6366f1', '#8b5cf6', '#ec4899', '#E8553A',
  '#f59e0b', '#10b981', '#3b82f6', '#64748b',
]

// ─── Step indicator ───────────────────────────────────────────────────────────

const STEPS = [
  { label: 'Projet' },
  { label: 'Client' },
  { label: 'Onboarding' },
  { label: 'Timeline' },
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
            <div className="flex flex-col items-center gap-1.5">
              <div className={cn(
                'h-8 w-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all',
                isCompleted && 'bg-[#386FA4] text-white',
                isCurrent && 'bg-white border-2 border-[#386FA4] text-[#386FA4]',
                isFuture && 'bg-white border-2 border-gray-200 text-gray-400',
              )}>
                {isCompleted ? <Check className="h-4 w-4" /> : stepNumber}
              </div>
              <span className={cn(
                'text-xs font-medium whitespace-nowrap',
                isCurrent ? 'text-[#386FA4]' : isCompleted ? 'text-gray-700' : 'text-gray-400',
              )}>
                {step.label}
              </span>
            </div>
            {index < STEPS.length - 1 && (
              <div className={cn(
                'h-0.5 w-12 mb-6 mx-2 transition-all',
                stepNumber < currentStep ? 'bg-[#386FA4]' : 'bg-gray-200',
              )} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Step 1: Project info ─────────────────────────────────────────────────────

function Step1({
  name, setName, description, setDescription, color, setColor,
}: {
  name: string; setName: (v: string) => void
  description: string; setDescription: (v: string) => void
  color: string; setColor: (v: string) => void
}) {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="name">Nom du projet <span className="text-destructive">*</span></Label>
        <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="Ex : Site vitrine ACME" autoFocus />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" value={description} onChange={e => setDescription(e.target.value)} placeholder="Décrivez brièvement le projet..." rows={3} />
      </div>
      <div className="space-y-3">
        <div>
          <Label>Couleur du projet</Label>
          <p className="text-xs text-muted-foreground mt-0.5">
            Identifie visuellement ce projet dans le dashboard, le calendrier et la liste des projets.
          </p>
        </div>
        <div className="flex gap-2.5 flex-wrap items-center">
          {COLOR_SWATCHES.map(swatch => (
            <button
              key={swatch} type="button" onClick={() => setColor(swatch)}
              className={cn('h-8 w-8 rounded-full transition-all ring-offset-2', color === swatch ? 'ring-2 ring-gray-900 scale-110' : 'hover:scale-105')}
              style={{ backgroundColor: swatch }}
              title={swatch}
            />
          ))}
          <div className="flex items-center gap-2 ml-1 border rounded-lg px-3 py-1.5">
            <div className="h-4 w-4 rounded-full shrink-0" style={{ backgroundColor: color }} />
            <span className="text-xs text-muted-foreground font-mono">{color}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Step 2: Client ───────────────────────────────────────────────────────────

function Step2({
  clients, clientId, setClientId, onOpenClientModal,
}: {
  clients: Client[]; clientId: string; setClientId: (v: string) => void; onOpenClientModal: () => void
}) {
  const [search, setSearch] = useState('')

  if (clients.length === 0) {
    return (
      <div className="text-center py-8 space-y-4">
        <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto">
          <Users className="h-6 w-6 text-gray-400" />
        </div>
        <div>
          <p className="font-medium text-gray-900">Aucun client</p>
          <p className="text-sm text-muted-foreground mt-1">Créez votre premier client pour l&apos;associer.</p>
        </div>
        <Button type="button" onClick={onOpenClientModal}><Plus className="h-4 w-4 mr-2" />Créer un client</Button>
      </div>
    )
  }

  const filtered = search.length >= 3
    ? clients.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.company ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : clients

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Associez ce projet à un client existant ou créez-en un nouveau.</p>

      {/* Barre de recherche */}
      <div className="relative">
        <Input
          placeholder="Rechercher un client (3 lettres min.)…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
        <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
          >✕</button>
        )}
      </div>

      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
        {/* Option "aucun client" — masquée si recherche active */}
        {!search && (
          <button
            type="button" onClick={() => setClientId('')}
            className={cn('w-full flex items-center gap-3 px-4 py-3 rounded-lg border text-left transition-all',
              clientId === '' ? 'border-[#386FA4] bg-[#386FA4]/5 text-[#386FA4]' : 'border-gray-200 hover:border-gray-300 text-muted-foreground')}
          >
            <div className={cn('h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0', clientId === '' ? 'border-[#386FA4]' : 'border-gray-300')}>
              {clientId === '' && <div className="h-2.5 w-2.5 rounded-full bg-[#386FA4]" />}
            </div>
            <span className="text-sm font-medium">Aucun client</span>
          </button>
        )}

        {filtered.length === 0 && search.length >= 3 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Aucun client trouvé pour &quot;{search}&quot;.
          </p>
        )}

        {filtered.map(c => (
          <button
            key={c.id} type="button" onClick={() => setClientId(c.id)}
            className={cn('w-full flex items-center gap-3 px-4 py-3 rounded-lg border text-left transition-all',
              clientId === c.id ? 'border-[#386FA4] bg-[#386FA4]/5' : 'border-gray-200 hover:border-gray-300')}
          >
            <div className={cn('h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0', clientId === c.id ? 'border-[#386FA4]' : 'border-gray-300')}>
              {clientId === c.id && <div className="h-2.5 w-2.5 rounded-full bg-[#386FA4]" />}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{c.name}</p>
              {c.company && <p className="text-xs text-muted-foreground truncate">{c.company}</p>}
            </div>
          </button>
        ))}
      </div>

      <button type="button" onClick={onOpenClientModal} className="flex items-center gap-2 text-sm text-[#386FA4] hover:text-[#386FA4]/80 font-medium transition-colors">
        <Plus className="h-4 w-4" />Créer un nouveau client
      </button>
    </div>
  )
}

// ─── Step 3: Onboarding template ──────────────────────────────────────────────

function onboardingEmoji(name: string): string {
  const n = name.toLowerCase()
  if (n.includes('site') || n.includes('web'))        return '🌐'
  if (n.includes('app') || n.includes('mobile'))      return '📱'
  if (n.includes('brand') || n.includes('logo') || n.includes('identit')) return '🎨'
  if (n.includes('social') || n.includes('community') || n.includes('réseau')) return '📣'
  if (n.includes('vidéo') || n.includes('video') || n.includes('motion')) return '🎬'
  if (n.includes('seo') || n.includes('référencement'))  return '🔍'
  if (n.includes('photo'))                             return '📷'
  if (n.includes('rédact') || n.includes('copywrit'))  return '✍️'
  return '📋'
}

function Step3({
  templates, templatesLoaded, selectedTemplateId, setSelectedTemplateId,
}: {
  templates: OnboardingTemplate[]; templatesLoaded: boolean
  selectedTemplateId: string | null; setSelectedTemplateId: (v: string | null) => void
}) {
  const [previewId, setPreviewId] = useState<string | null>(null)
  const previewTemplate = templates.find(t => t.id === previewId)

  if (!templatesLoaded) {
    return <div className="text-center py-10 text-sm text-muted-foreground">Chargement des templates…</div>
  }
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Choisissez un template pour préremplir le formulaire d&apos;onboarding client.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button" onClick={() => setSelectedTemplateId(null)}
          className={cn('relative flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-5 text-center transition-all',
            selectedTemplateId === null ? 'border-[#386FA4] bg-[#386FA4]/5' : 'border-gray-200 hover:border-gray-300')}
        >
          {selectedTemplateId === null && (
            <div className="absolute top-2.5 right-2.5 h-5 w-5 rounded-full bg-[#386FA4] flex items-center justify-center">
              <Check className="h-3 w-3 text-white" />
            </div>
          )}
          <span className="text-sm font-medium text-gray-700">Sans template</span>
          <span className="text-xs text-muted-foreground">Partir de zéro</span>
        </button>
        {templates.map(t => (
          <button
            key={t.id} type="button" onClick={() => setSelectedTemplateId(t.id)}
            className={cn('relative flex flex-col gap-2 rounded-lg border-2 p-4 text-left transition-all group',
              selectedTemplateId === t.id ? 'border-[#386FA4] bg-[#386FA4]/5' : 'border-gray-200 hover:border-gray-300')}
          >
            {selectedTemplateId === t.id && (
              <div className="absolute top-2.5 right-2.5 h-5 w-5 rounded-full bg-[#386FA4] flex items-center justify-center">
                <Check className="h-3 w-3 text-white" />
              </div>
            )}
            <div className="flex items-center gap-2 pr-6">
              <span className="text-xl">{onboardingEmoji(t.name)}</span>
              <p className="text-sm font-semibold text-gray-900 truncate">{t.name}</p>
            </div>
            {t.description && <p className="text-xs text-muted-foreground line-clamp-2">{t.description}</p>}
            <div className="flex items-center justify-between mt-1">
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <ClipboardList className="h-3 w-3" />
                {t.form_config?.length ?? 0} champ{(t.form_config?.length ?? 0) !== 1 ? 's' : ''}
              </span>
              <button
                type="button"
                onClick={e => { e.stopPropagation(); setPreviewId(previewId === t.id ? null : t.id) }}
                className="text-[11px] text-primary hover:underline opacity-0 group-hover:opacity-100 transition-opacity"
              >
                Aperçu
              </button>
            </div>
          </button>
        ))}
      </div>

      {/* Preview panel */}
      {previewTemplate && (
        <div className="rounded-xl border bg-muted/20 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold flex items-center gap-2">
              <span>{onboardingEmoji(previewTemplate.name)}</span>
              {previewTemplate.name} — {previewTemplate.form_config?.length ?? 0} champ{(previewTemplate.form_config?.length ?? 0) !== 1 ? 's' : ''}
            </p>
            <button onClick={() => setPreviewId(null)} className="text-xs text-muted-foreground hover:text-foreground">✕</button>
          </div>
          {previewTemplate.description && (
            <p className="text-xs text-muted-foreground">{previewTemplate.description}</p>
          )}
          <div className="space-y-1 max-h-56 overflow-y-auto pt-1">
            {(previewTemplate.form_config ?? []).map((field, i) => (
              <div key={i} className="flex items-center gap-2.5 py-1.5 border-b last:border-0">
                <div className="flex h-5 w-5 items-center justify-center rounded border border-gray-200 bg-white shrink-0 text-[10px] font-medium text-gray-400">
                  {i + 1}
                </div>
                <p className="text-sm text-gray-700">{field.label}</p>
              </div>
            ))}
            {(!previewTemplate.form_config || previewTemplate.form_config.length === 0) && (
              <p className="text-xs text-muted-foreground py-2 text-center">Aucun champ configuré.</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Step 4: Timeline template ────────────────────────────────────────────────

function Step4({
  selectedTimelineId, setSelectedTimelineId,
}: {
  selectedTimelineId: string | null; setSelectedTimelineId: (v: string | null) => void
}) {
  const [preview, setPreview] = useState<string | null>(null)
  const previewTemplate = TIMELINE_TEMPLATES.find(t => t.id === preview)

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Choisissez un modèle de timeline pour préremplir les étapes selon votre type de projet.
      </p>

      <div className="grid grid-cols-2 gap-3">
        {/* "No template" */}
        <button
          type="button" onClick={() => setSelectedTimelineId(null)}
          className={cn('relative flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-5 text-center transition-all',
            selectedTimelineId === null ? 'border-[#386FA4] bg-[#386FA4]/5' : 'border-gray-200 hover:border-gray-300')}
        >
          {selectedTimelineId === null && (
            <div className="absolute top-2.5 right-2.5 h-5 w-5 rounded-full bg-[#386FA4] flex items-center justify-center">
              <Check className="h-3 w-3 text-white" />
            </div>
          )}
          <span className="text-sm font-medium text-gray-700">Sans template</span>
          <span className="text-xs text-muted-foreground">Timeline vide</span>
        </button>

        {TIMELINE_TEMPLATES.map(t => (
          <button
            key={t.id} type="button"
            onClick={() => setSelectedTimelineId(t.id)}
            className={cn('relative flex flex-col gap-2 rounded-lg border-2 p-4 text-left transition-all group',
              selectedTimelineId === t.id ? 'border-[#386FA4] bg-[#386FA4]/5' : 'border-gray-200 hover:border-gray-300')}
          >
            {selectedTimelineId === t.id && (
              <div className="absolute top-2.5 right-2.5 h-5 w-5 rounded-full bg-[#386FA4] flex items-center justify-center">
                <Check className="h-3 w-3 text-white" />
              </div>
            )}
            <div className="flex items-center gap-2 pr-6">
              <span className="text-xl">{t.emoji}</span>
              <p className="text-sm font-semibold text-gray-900 truncate">{t.name}</p>
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2">{t.description}</p>
            <div className="flex items-center justify-between mt-1">
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <GitBranch className="h-3 w-3" />
                {t.milestones.length} étapes
              </span>
              <button
                type="button"
                onClick={e => { e.stopPropagation(); setPreview(preview === t.id ? null : t.id) }}
                className="text-[11px] text-primary hover:underline opacity-0 group-hover:opacity-100 transition-opacity"
              >
                Aperçu
              </button>
            </div>
          </button>
        ))}
      </div>

      {/* Preview panel */}
      {previewTemplate && (
        <div className="rounded-xl border bg-muted/20 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold flex items-center gap-2">
              <span>{previewTemplate.emoji}</span> {previewTemplate.name} — {previewTemplate.milestones.length} étapes
            </p>
            <button onClick={() => setPreview(null)} className="text-xs text-muted-foreground hover:text-foreground">✕</button>
          </div>
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {previewTemplate.milestones.map((m, i) => (
              <div key={i} className="flex items-start gap-2.5 py-1.5 border-b last:border-0">
                <div className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-gray-200 shrink-0">
                  <Circle className="h-2.5 w-2.5 text-gray-300" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{m.title}</p>
                  {m.description && <p className="text-xs text-muted-foreground">{m.description}</p>}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {m.priority !== 'normal' && (
                    <Badge variant="outline" className={cn('text-[10px] h-4 px-1',
                      m.priority === 'urgent' ? 'border-red-200 bg-red-50 text-red-600' : 'border-orange-200 bg-orange-50 text-orange-600')}>
                      {m.priority === 'urgent' ? '🔴' : '🟠'}
                    </Badge>
                  )}
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                    {m.responsible === 'client' ? '👤 Client' : '🧑‍💻 Presta'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
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
  const [color, setColor] = useState('#386FA4')

  // Step 2
  const [clients, setClients] = useState<Client[]>([])
  const [clientId, setClientId] = useState(preselectedClientId)
  const [clientModalOpen, setClientModalOpen] = useState(false)

  // Step 3 — Onboarding
  const [onboardingTemplates, setOnboardingTemplates] = useState<OnboardingTemplate[]>([])
  const [onboardingTemplatesLoaded, setOnboardingTemplatesLoaded] = useState(false)
  const [selectedOnboardingTemplateId, setSelectedOnboardingTemplateId] = useState<string | null>(preselectedTemplateId)

  // Step 4 — Timeline
  const [selectedTimelineId, setSelectedTimelineId] = useState<string | null>(null)

  // Submission
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load clients on mount
  useEffect(() => {
    fetch('/api/clients')
      .then(r => r.json())
      .then(({ data }) => setClients(data ?? []))
  }, [])

  // Load onboarding templates when reaching step 3
  useEffect(() => {
    if (step !== 3 || onboardingTemplatesLoaded) return
    fetch('/api/templates')
      .then(r => r.json())
      .then(({ data }) => {
        const all: OnboardingTemplate[] = [
          ...(data?.defaults ?? []),
          ...(data?.mine ?? []),
        ]
        setOnboardingTemplates(all)
        setOnboardingTemplatesLoaded(true)
      })
  }, [step, onboardingTemplatesLoaded])

  function handleNext() {
    if (step === 1 && name.trim()) setStep(2)
    else if (step < 4) setStep(step + 1)
  }

  async function handleSubmit() {
    setLoading(true)
    setError(null)

    // 1. Create the project
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name.trim(),
        description: description.trim() || null,
        color,
        client_id: clientId || null,
        status: 'active',
        template_id: selectedOnboardingTemplateId ?? null,
      }),
    })

    const json = await res.json() as { data?: { id: string }; error?: string }

    if (!res.ok) {
      setError(json.error ?? 'Une erreur est survenue.')
      setLoading(false)
      return
    }

    const projectId = json.data!.id

    // 2. Apply timeline template if selected
    if (selectedTimelineId) {
      const template = TIMELINE_TEMPLATES.find(t => t.id === selectedTimelineId)
      if (template) {
        try {
          await Promise.all(
            template.milestones.map((m, i) =>
              fetch(`/api/projects/${projectId}/milestones`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  title: m.title,
                  description: m.description ?? null,
                  status: 'pending',
                  priority: m.priority,
                  responsible: m.responsible,
                  visible_to_client: m.visible_to_client,
                  order_index: i,
                  subtasks: [],
                }),
              })
            )
          )
        } catch {
          toast.error('Timeline créée mais erreur lors des étapes')
        }
      }
    }

    router.push(`/dashboard/projects/${projectId}`)
  }

  function handleClientCreated(newClient: Client) {
    setClients(prev => [newClient, ...prev])
    setClientId(newClient.id)
    setClientModalOpen(false)
  }

  const step1Valid = name.trim().length > 0

  const stepTitles = [
    'Informations du projet',
    'Client associé',
    'Template onboarding (optionnel)',
    'Template timeline (optionnel)',
  ]

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-3xl mx-auto px-4 py-10">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button
            type="button"
            onClick={() => step === 1 ? router.back() : setStep(step - 1)}
            className="h-9 w-9 rounded-lg border bg-white shadow-sm flex items-center justify-center hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Nouveau projet</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Étape {step} sur {STEPS.length}</p>
          </div>
        </div>

        {/* Step indicator */}
        <StepIndicator currentStep={step} />

        {/* Card */}
        <Card className="shadow-sm border-gray-200">
          <CardContent className="pt-6 pb-6">
            <h2 className="text-base font-semibold text-gray-900 mb-5">{stepTitles[step - 1]}</h2>

            {step === 1 && <Step1 name={name} setName={setName} description={description} setDescription={setDescription} color={color} setColor={setColor} />}
            {step === 2 && <Step2 clients={clients} clientId={clientId} setClientId={setClientId} onOpenClientModal={() => setClientModalOpen(true)} />}
            {step === 3 && <Step3 templates={onboardingTemplates} templatesLoaded={onboardingTemplatesLoaded} selectedTemplateId={selectedOnboardingTemplateId} setSelectedTemplateId={setSelectedOnboardingTemplateId} />}
            {step === 4 && <Step4 selectedTimelineId={selectedTimelineId} setSelectedTimelineId={setSelectedTimelineId} />}

            {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

            {/* Navigation */}
            <div className="flex items-center justify-between mt-8 pt-5 border-t border-gray-100">
              <div>
                {step > 1 && (
                  <Button type="button" variant="ghost" onClick={() => setStep(step - 1)}>
                    <ArrowLeft className="h-4 w-4 mr-1.5" />Retour
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-3">
                {(step === 3 || step === 4) && (
                  <button
                    type="button"
                    onClick={step === 4 ? handleSubmit : handleNext}
                    disabled={loading}
                    className="text-sm text-muted-foreground hover:text-gray-900 transition-colors disabled:opacity-50"
                  >
                    {step === 4 ? (loading ? 'Création…' : 'Ignorer') : 'Ignorer'}
                  </button>
                )}
                {step < 4 ? (
                  <Button type="button" onClick={handleNext} disabled={step === 1 && !step1Valid}>
                    Suivant <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                ) : (
                  <Button type="button" onClick={handleSubmit} disabled={loading} className="gap-2">
                    {loading ? 'Création…' : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Créer le projet
                      </>
                    )}
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
