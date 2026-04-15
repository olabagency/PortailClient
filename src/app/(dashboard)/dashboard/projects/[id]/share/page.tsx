'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import {
  ArrowLeft, Copy, Check, Mail, Eye, ExternalLink, Loader2, Lock, Shield,
} from 'lucide-react'
import { APP_CONFIG } from '@/config/app.config'
import { toast } from 'sonner'

interface Project {
  id: string
  name: string
  public_id: string
  pin: string | null
  pin_enabled: boolean
  settings: Record<string, unknown> | null
}

export default function SharePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()

  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)

  // Copy state
  const [copied, setCopied] = useState(false)

  // PIN state
  const [pinEnabled, setPinEnabled] = useState(false)
  const [pinCode, setPinCode] = useState('')
  const [savingPin, setSavingPin] = useState(false)
  const [togglingPin, setTogglingPin] = useState(false)

  // Invite state
  const [inviteEmail, setInviteEmail] = useState('')
  const [sendingInvite, setSendingInvite] = useState(false)

  useEffect(() => {
    fetch(`/api/projects/${id}`)
      .then(r => r.json())
      .then(({ data }) => {
        setProject(data)
        if (data) {
          setPinEnabled(data.pin_enabled ?? false)
          setPinCode(data.pin ?? '')
        }
        setLoading(false)
      })
      .catch(() => {
        setLoading(false)
      })
  }, [id])

  const portalUrl = project
    ? `${APP_CONFIG.url}/p/${project.public_id}`
    : ''

  async function handleCopy() {
    if (!portalUrl) return
    await navigator.clipboard.writeText(portalUrl)
    setCopied(true)
    toast.success('Lien copié dans le presse-papiers')
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleTogglePin(enabled: boolean) {
    setTogglingPin(true)
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin_enabled: enabled }),
      })
      if (res.ok) {
        setPinEnabled(enabled)
        if (!enabled) {
          toast.success('Protection par PIN désactivée')
        }
      } else {
        const json = await res.json()
        toast.error(json.error ?? 'Impossible de modifier le paramètre.')
      }
    } catch {
      toast.error('Une erreur est survenue.')
    } finally {
      setTogglingPin(false)
    }
  }

  async function handleSavePin(e: React.FormEvent) {
    e.preventDefault()
    if (pinCode.length !== 4) {
      toast.error('Le code PIN doit contenir exactement 4 chiffres.')
      return
    }
    setSavingPin(true)
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pinCode, pin_enabled: true }),
      })
      if (res.ok) {
        setPinEnabled(true)
        toast.success('Code PIN enregistré avec succès')
      } else {
        const json = await res.json()
        toast.error(json.error ?? 'Impossible d\'enregistrer le PIN.')
      }
    } catch {
      toast.error('Une erreur est survenue.')
    } finally {
      setSavingPin(false)
    }
  }

  async function handleSendInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!inviteEmail.trim()) return

    setSendingInvite(true)
    try {
      const res = await fetch(`/api/projects/${id}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim() }),
      })
      const json = await res.json()

      if (res.ok) {
        toast.success('Invitation envoyée avec succès')
        setInviteEmail('')
      } else {
        toast.error(json.error ?? 'Impossible d\'envoyer l\'invitation.')
      }
    } catch {
      toast.error('Une erreur est survenue.')
    } finally {
      setSendingInvite(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!project) {
    return <p className="text-center text-muted-foreground py-12">Projet introuvable.</p>
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* En-tête */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Partage</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{project.name}</p>
        </div>
      </div>

      {/* Section 1 : Formulaire d'onboarding */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ExternalLink className="h-4 w-4" />
            Lien du formulaire d&apos;onboarding
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Partagez ce lien avec votre client pour qu&apos;il remplisse le questionnaire d&apos;onboarding.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* URL + actions */}
          <div className="flex gap-2">
            <Input
              value={portalUrl}
              readOnly
              className="font-mono text-sm bg-muted"
            />
            <Button variant="outline" onClick={handleCopy} className="shrink-0">
              {copied ? (
                <>
                  <Check className="h-4 w-4 mr-2 text-green-500" />
                  Copié !
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copier
                </>
              )}
            </Button>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => window.open(portalUrl, '_blank')}
          >
            <Eye className="h-4 w-4" />
            Aperçu
          </Button>

          <Separator />

          {/* Protection par PIN */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Protection par code PIN</p>
                  <p className="text-xs text-muted-foreground">
                    Protégez le formulaire avec un code PIN à 4 chiffres
                  </p>
                </div>
              </div>
              <Switch
                id="pin-enabled"
                checked={pinEnabled}
                onCheckedChange={handleTogglePin}
                disabled={togglingPin}
              />
            </div>

            {pinEnabled && (
              <form onSubmit={handleSavePin} className="flex gap-2 items-end">
                <div className="space-y-1 flex-1">
                  <Label htmlFor="pin-code" className="text-xs text-muted-foreground">
                    Code PIN (4 chiffres)
                  </Label>
                  <Input
                    id="pin-code"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{4}"
                    maxLength={4}
                    value={pinCode}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '')
                      setPinCode(val)
                    }}
                    placeholder="1234"
                    className="font-mono tracking-widest"
                  />
                </div>
                <Button
                  type="submit"
                  size="sm"
                  disabled={savingPin || pinCode.length !== 4}
                  className="shrink-0"
                >
                  {savingPin ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Enregistrer'
                  )}
                </Button>
              </form>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Section 2 : Invitation par email */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Envoyer par email
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSendInvite} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Adresse email du client</Label>
              <div className="flex gap-2">
                <Input
                  id="invite-email"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="client@exemple.com"
                  required
                />
                <Button type="submit" disabled={sendingInvite} className="shrink-0">
                  {sendingInvite ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Envoyer'
                  )}
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Le client recevra un email avec le lien du formulaire.
            </p>
          </form>
        </CardContent>
      </Card>

      {/* Section 3 : Paramètres d'accès */}
      <div className="rounded-lg border bg-muted/30 px-4 py-3 flex items-center gap-3">
        <Shield className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="text-sm text-muted-foreground">Identifiant public</span>
        <Badge variant="secondary" className="font-mono ml-auto">
          {project.public_id}
        </Badge>
      </div>
    </div>
  )
}
