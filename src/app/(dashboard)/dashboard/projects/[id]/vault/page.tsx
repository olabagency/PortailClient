'use client'

import { use, useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Lock,
  ShieldCheck,
  Eye,
  EyeOff,
  Copy,
  ArrowLeft,
  Loader2,
  KeyRound,
  RefreshCw,
  Check,
  AlertTriangle,
} from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface VaultField {
  id: string
  label: string
  type: string
  sensitive: boolean
  order_index: number
}

interface VaultClient {
  id: string
  name: string
  email: string
}

interface VaultData {
  fields: VaultField[]
  responses: Record<string, unknown>
  client: VaultClient | null
  lastSubmittedAt: string | null
}

const AUTO_LOCK_MS = 5 * 60 * 1000
const SESSION_KEY = 'vault_unlocked_until'

function getSessionUnlockedUntil(): number {
  try { return parseInt(sessionStorage.getItem(SESSION_KEY) ?? '0', 10) } catch { return 0 }
}
function setSessionUnlockedUntil(ms: number) {
  try { sessionStorage.setItem(SESSION_KEY, String(ms)) } catch { /* ignore */ }
}
function clearSession() {
  try { sessionStorage.removeItem(SESSION_KEY) } catch { /* ignore */ }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function VaultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()

  // Initialiser locked selon sessionStorage
  const [locked, setLocked] = useState(() => Date.now() >= getSessionUnlockedUntil())
  const [password, setPassword] = useState('')
  const [showPasswordInput, setShowPasswordInput] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)

  const [vaultData, setVaultData] = useState<VaultData | null>(null)
  const [loading, setLoading] = useState(false)

  const [showField, setShowField] = useState<Record<string, boolean>>({})
  const [copiedField, setCopiedField] = useState<string | null>(null)

  const [requestingSent, setRequestingSent] = useState(false)
  const [sendingRequest, setSendingRequest] = useState(false)

  const lockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const lock = useCallback(() => {
    setLocked(true)
    setVaultData(null)
    setShowField({})
    setPassword('')
    setAuthError(null)
    clearSession()
    if (lockTimerRef.current) { clearTimeout(lockTimerRef.current); lockTimerRef.current = null }
  }, [])

  const resetLockTimer = useCallback(() => {
    // Prolonge la session sessionStorage
    setSessionUnlockedUntil(Date.now() + AUTO_LOCK_MS)
    if (lockTimerRef.current) clearTimeout(lockTimerRef.current)
    lockTimerRef.current = setTimeout(() => {
      lock()
      toast.info('Coffre-fort verrouillé automatiquement après 5 minutes d\'inactivité.')
    }, AUTO_LOCK_MS)
  }, [lock])

  useEffect(() => {
    if (locked) return
    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart']
    const handler = () => resetLockTimer()
    events.forEach((e) => window.addEventListener(e, handler))
    resetLockTimer()
    return () => {
      events.forEach((e) => window.removeEventListener(e, handler))
      if (lockTimerRef.current) clearTimeout(lockTimerRef.current)
    }
  }, [locked, resetLockTimer])

  // Si déjà déverrouillé via sessionStorage au montage → charger les données directement
  useEffect(() => {
    if (!locked && vaultData === null) {
      void fetchVaultData()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchVaultData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/projects/${id}/vault`)
      const json = await res.json() as { data?: VaultData; error?: string }
      if (!res.ok || json.error) { toast.error(json.error ?? 'Impossible de charger les données.'); return }
      setVaultData(json.data ?? null)
    } finally {
      setLoading(false)
    }
  }, [id])

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault()
    setVerifying(true)
    setAuthError(null)
    try {
      const res = await fetch(`/api/projects/${id}/vault/verify-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const json = await res.json() as { data?: { valid: boolean }; error?: string }
      if (!res.ok || json.error) { setAuthError(json.error ?? 'Mot de passe incorrect'); return }
      setSessionUnlockedUntil(Date.now() + AUTO_LOCK_MS)
      setLocked(false)
      setPassword('')
      await fetchVaultData()
    } finally {
      setVerifying(false)
    }
  }

  const handleRequestUpdate = async () => {
    setSendingRequest(true)
    try {
      const res = await fetch(`/api/projects/${id}/vault/request-update`, { method: 'POST' })
      const json = await res.json() as { data?: { sent: boolean }; error?: string }
      if (!res.ok || json.error) { toast.error(json.error ?? "Erreur lors de l'envoi."); return }
      setRequestingSent(true)
      toast.success(json.data?.sent ? 'Email envoyé au client.' : 'Demande enregistrée.')
    } finally {
      setSendingRequest(false)
    }
  }

  const copyToClipboard = async (fieldId: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopiedField(fieldId)
      setTimeout(() => setCopiedField(null), 2000)
      toast.success('Copié dans le presse-papier')
    } catch {
      toast.error('Impossible de copier.')
    }
  }

  const toggleFieldVisibility = (fieldId: string) => {
    setShowField((prev) => ({ ...prev, [fieldId]: !prev[fieldId] }))
    resetLockTimer()
  }

  // ---------------------------------------------------------------------------
  // Vue verrouillée
  // ---------------------------------------------------------------------------
  if (locked) {
    return (
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <KeyRound className="h-6 w-6 text-primary" />
              Coffre-fort
            </h1>
            <p className="text-sm text-muted-foreground">Accès sécurisés du projet</p>
          </div>
        </div>

        {/* Lock screen */}
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-sm">
            {/* Icon */}
            <div className="flex flex-col items-center mb-8 text-center">
              <div className="relative mb-4">
                <div className="h-24 w-24 rounded-3xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shadow-inner">
                  <Lock className="h-12 w-12 text-primary" />
                </div>
                <div className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-amber-100 border-2 border-white flex items-center justify-center">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                </div>
              </div>
              <h2 className="text-xl font-bold text-foreground">Accès restreint</h2>
              <p className="text-sm text-muted-foreground mt-1.5 max-w-xs leading-relaxed">
                Les credentials sont chiffrés. Entrez votre mot de passe pour y accéder.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleUnlock} className="space-y-3">
              <div className="relative">
                <Input
                  type={showPasswordInput ? 'text' : 'password'}
                  placeholder="Votre mot de passe"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setAuthError(null) }}
                  autoFocus
                  className={`h-11 pr-10 text-sm ${authError ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPasswordInput((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showPasswordInput ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {authError && (
                <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2">
                  <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                  <p className="text-sm text-destructive">{authError}</p>
                </div>
              )}

              <Button type="submit" className="w-full h-11" disabled={verifying || !password}>
                {verifying ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Vérification…</>
                ) : (
                  <><ShieldCheck className="h-4 w-4 mr-2" />Déverrouiller</>
                )}
              </Button>
            </form>

            <p className="text-xs text-center text-muted-foreground mt-4">
              Verrouillage automatique après 5 minutes d&apos;inactivité
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Vue déverrouillée
  // ---------------------------------------------------------------------------

  const fields = vaultData?.fields ?? []
  const responses = vaultData?.responses ?? {}
  const filledCount = fields.filter(f => responses[f.id] !== undefined && responses[f.id] !== null && responses[f.id] !== '').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-2.5">
              <KeyRound className="h-6 w-6 text-primary" />
              Coffre-fort
              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100 font-medium gap-1">
                <ShieldCheck className="h-3 w-3" />
                Déverrouillé
              </Badge>
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {filledCount} accès sur {fields.length} renseigné{filledCount > 1 ? 's' : ''}
              {vaultData?.client && (
                <span> · Client : <span className="font-medium text-foreground">{vaultData.client.name}</span></span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRequestUpdate}
            disabled={sendingRequest || requestingSent}
            className="gap-2"
          >
            {sendingRequest ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            {requestingSent ? 'Demande envoyée' : 'Demander mise à jour'}
          </Button>
          <Button variant="outline" size="sm" onClick={lock} className="gap-2">
            <Lock className="h-3.5 w-3.5" />
            Verrouiller
          </Button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : fields.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center gap-4 rounded-xl border-2 border-dashed border-border bg-white">
          <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center">
            <KeyRound className="h-8 w-8 text-muted-foreground/50" />
          </div>
          <div>
            <p className="font-semibold text-foreground">Aucun accès défini</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              Ajoutez des sections de type &quot;Accès&quot; dans l&apos;éditeur d&apos;onboarding pour stocker des credentials ici.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => router.push(`/dashboard/projects/${id}/onboarding`)}>
            Ouvrir l&apos;onboarding
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {fields.map((field) => {
            const rawValue = responses[field.id]
            const value = rawValue !== undefined && rawValue !== null && rawValue !== '' ? String(rawValue) : null
            const isVisible = showField[field.id] ?? false
            const isCopied = copiedField === field.id

            return (
              <div
                key={field.id}
                className="bg-white border rounded-xl p-4 flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow"
              >
                {/* Label row */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate">
                    {field.label}
                  </span>
                  {field.sensitive && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-amber-600 border-amber-200 bg-amber-50 shrink-0">
                      Sensible
                    </Badge>
                  )}
                </div>

                {/* Value */}
                <div className="flex items-center gap-2 min-h-[32px]">
                  <div className="flex-1 min-w-0 font-mono text-sm">
                    {value === null ? (
                      <span className="italic text-muted-foreground/50 text-xs font-sans">Non renseigné</span>
                    ) : isVisible ? (
                      <span className="text-foreground break-all">{value}</span>
                    ) : (
                      <span className="text-muted-foreground tracking-widest">{'•'.repeat(Math.min(value.length, 20))}</span>
                    )}
                  </div>

                  {value !== null && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => toggleFieldVisibility(field.id)}
                        className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                        title={isVisible ? 'Masquer' : 'Afficher'}
                      >
                        {isVisible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                      <button
                        onClick={() => copyToClipboard(field.id, value)}
                        className={`h-8 w-8 flex items-center justify-center rounded-lg transition-colors ${
                          isCopied
                            ? 'bg-emerald-100 text-emerald-600'
                            : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                        }`}
                        title="Copier"
                      >
                        {isCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Footer */}
      {(vaultData?.lastSubmittedAt || vaultData?.client) && (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 pt-4 border-t text-xs text-muted-foreground">
          {vaultData.lastSubmittedAt && (
            <span>
              Réponses soumises le{' '}
              <span className="font-medium text-foreground">
                {format(new Date(vaultData.lastSubmittedAt), 'd MMMM yyyy à HH:mm', { locale: fr })}
              </span>
            </span>
          )}
          {vaultData.client && (
            <span>
              {vaultData.client.name}{' '}
              <span className="text-muted-foreground/60">({vaultData.client.email})</span>
            </span>
          )}
        </div>
      )}
    </div>
  )
}
