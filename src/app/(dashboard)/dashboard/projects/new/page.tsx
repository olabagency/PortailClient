'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { ArrowLeft, Plus, Wand2, X, Kanban, ClipboardList } from 'lucide-react'
import { ClientModal } from '@/components/dashboard/ClientModal'

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

function NewProjectForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedClientId = searchParams.get('client') ?? ''
  const preselectedTemplateId = searchParams.get('template') ?? ''

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [clientId, setClientId] = useState(preselectedClientId)
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [clientModalOpen, setClientModalOpen] = useState(false)

  // Template
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateOption | null>(null)
  const [templates, setTemplates] = useState<TemplateOption[]>([])
  const [showTemplates, setShowTemplates] = useState(!!preselectedTemplateId)
  const [templatesLoaded, setTemplatesLoaded] = useState(false)

  useEffect(() => {
    fetch('/api/clients')
      .then(r => r.json())
      .then(({ data }) => setClients(data ?? []))
  }, [])

  // Charger templates si pré-sélectionné ou si l'utilisateur veut choisir
  useEffect(() => {
    if (!showTemplates && !preselectedTemplateId) return
    if (templatesLoaded) return

    fetch('/api/templates')
      .then(r => r.json())
      .then(({ data }) => {
        const all = [...(data?.defaults ?? []), ...(data?.mine ?? [])]
        setTemplates(all)
        setTemplatesLoaded(true)

        // Pré-sélectionner le template depuis l'URL
        if (preselectedTemplateId) {
          const found = all.find((t: TemplateOption) => t.id === preselectedTemplateId)
          if (found) setSelectedTemplate(found)
        }
      })
  }, [showTemplates, preselectedTemplateId, templatesLoaded])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        description,
        client_id: clientId || null,
        status: 'active',
        template_id: selectedTemplate?.id ?? null,
      }),
    })

    const json = await res.json()

    if (!res.ok) {
      setError(json.error ?? 'Une erreur est survenue.')
      setLoading(false)
      return
    }

    router.push(`/dashboard/projects/${json.data.id}`)
  }

  function handleClientCreated(newClient: Client) {
    setClients(prev => [newClient, ...prev])
    setClientId(newClient.id)
    setClientModalOpen(false)
  }

  return (
    <div className="max-w-xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Nouveau projet</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Remplissez les informations de base</p>
        </div>
      </div>

      {/* Sélecteur de template */}
      {!showTemplates ? (
        <button
          onClick={() => setShowTemplates(true)}
          className="w-full flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground border border-dashed rounded-lg p-3 hover:border-foreground/30 transition-colors"
        >
          <Wand2 className="h-4 w-4" />
          Partir d&apos;un template (optionnel)
        </button>
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Wand2 className="h-4 w-4" />
                Template
              </CardTitle>
              <button
                onClick={() => { setShowTemplates(false); setSelectedTemplate(null) }}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            {/* Template actuellement sélectionné */}
            {selectedTemplate && (
              <div className="flex items-center justify-between gap-2 bg-primary/5 border border-primary/20 rounded-lg p-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{selectedTemplate.name}</p>
                  <div className="flex gap-2 mt-1">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Kanban className="h-3 w-3" />
                      {selectedTemplate.kanban_config?.length ?? 0} colonnes
                    </span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <ClipboardList className="h-3 w-3" />
                      {selectedTemplate.form_config?.length ?? 0} champs
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedTemplate(null)}
                  className="text-muted-foreground hover:text-foreground shrink-0"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Grille de templates */}
            {!selectedTemplate && (
              !templatesLoaded ? (
                <p className="text-xs text-muted-foreground text-center py-4">Chargement des templates...</p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {templates.map(t => (
                    <button
                      key={t.id}
                      onClick={() => setSelectedTemplate(t)}
                      className="text-left border rounded-lg p-2.5 hover:border-primary/50 hover:bg-primary/5 transition-colors"
                    >
                      <p className="text-xs font-medium truncate">{t.name}</p>
                      {t.description && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{t.description}</p>
                      )}
                      <div className="flex gap-1.5 mt-1.5 flex-wrap">
                        {(t.kanban_config ?? []).slice(0, 3).map((col, i) => (
                          <div key={i} className="flex items-center gap-0.5">
                            <div
                              className="h-1.5 w-1.5 rounded-full"
                              style={{ backgroundColor: col.color ?? '#6B7280' }}
                            />
                          </div>
                        ))}
                        {(t.kanban_config?.length ?? 0) > 3 && (
                          <span className="text-xs text-muted-foreground">+{t.kanban_config.length - 3}</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )
            )}

            {selectedTemplate && (
              <button
                onClick={() => setSelectedTemplate(null)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Changer de template
              </button>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Informations du projet
            {selectedTemplate && (
              <Badge variant="outline" className="ml-2 text-xs font-normal">
                Depuis : {selectedTemplate.name}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nom du projet <span className="text-destructive">*</span></Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex : Site vitrine ACME"
                required
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

            <div className="space-y-2">
              <Label>Client associé</Label>
              <div className="flex gap-2">
                <Select value={clientId} onValueChange={(v) => setClientId(v ?? '')}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Sélectionner un client (optionnel)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Aucun client</SelectItem>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}{c.company ? ` — ${c.company}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setClientModalOpen(true)}
                  title="Créer un nouveau client"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Annuler
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Création...' : 'Créer le projet'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <ClientModal
        open={clientModalOpen}
        onClose={() => setClientModalOpen(false)}
        onSuccess={handleClientCreated}
        mode="create"
      />
    </div>
  )
}

export default function NewProjectPage() {
  return (
    <Suspense>
      <NewProjectForm />
    </Suspense>
  )
}
