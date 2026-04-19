'use client'

import { Suspense, useState, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Loader2, Eye, EyeOff, CheckCircle2, FolderKanban, FileText, MessageSquare, ShieldCheck } from 'lucide-react'

interface Branding {
  project_name: string
  freelancer_name: string | null
  company_name: string | null
  logo_url: string | null
  avatar_url: string | null
}

const perks = [
  { icon: FolderKanban, label: 'Avancement du projet en temps réel' },
  { icon: FileText, label: 'Livrables et documents partagés' },
  { icon: MessageSquare, label: 'Échanges directs avec votre prestataire' },
  { icon: ShieldCheck, label: 'Accès sécurisé à tout moment' },
]

function SignupForm() {
  const searchParams = useSearchParams()
  const projectId = searchParams.get('project')
  const prefillEmail = searchParams.get('email') ?? ''
  const router = useRouter()

  const [email, setEmail] = useState(prefillEmail)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [branding, setBranding] = useState<Branding | null>(null)

  const senderDisplay = branding?.company_name ?? branding?.freelancer_name ?? 'Votre prestataire'
  const logoSrc = branding?.logo_url ?? branding?.avatar_url

  useEffect(() => {
    if (!projectId) return
    fetch(`/api/public/branding?project=${projectId}`)
      .then(r => r.json())
      .then(({ data }) => { if (data) setBranding(data) })
      .catch(() => {})
  }, [projectId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password.length < 8) { setError('Le mot de passe doit contenir au moins 8 caractères.'); return }
    setLoading(true)

    // Inscription via API admin (pas de confirmation email)
    const res = await fetch('/api/client/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, project_id: projectId ?? undefined }),
    })
    const json = await res.json() as { data?: { user_id: string }; error?: string }

    if (!res.ok) {
      setError(json.error ?? 'Une erreur est survenue.')
      setLoading(false)
      return
    }

    // Connexion immédiate avec les identifiants créés
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError) {
      setError('Compte créé mais connexion échouée. Connectez-vous manuellement.')
      setLoading(false)
      return
    }

    router.push(projectId ? `/client/projects/${projectId}` : '/client')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-sky-50/20 to-slate-100 px-4 py-8">
      <div className="w-full max-w-[900px] flex flex-col md:flex-row overflow-hidden rounded-3xl shadow-2xl bg-white">

        {/* ── Panneau gauche (branding) ── */}
        <div className="md:w-2/5 bg-gradient-to-br from-[#386FA4] to-[#2d5e8e] px-8 py-10 flex flex-col justify-between text-white">
          <div>
            {/* Logo / avatar */}
            <div className="mb-6">
              {logoSrc ? (
                <img src={logoSrc} alt={senderDisplay} className="h-12 w-12 rounded-xl object-cover bg-white/20" />
              ) : (
                <div className="h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center font-bold text-lg">
                  {senderDisplay.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            <p className="text-white/75 text-sm mb-1">{senderDisplay} vous invite</p>
            <h1 className="text-2xl font-bold leading-tight mb-1">
              {branding?.project_name
                ? <>Rejoignez le projet<br /><span className="text-white/90">{branding.project_name}</span></>
                : 'Votre espace projet vous attend'}
            </h1>
            <p className="text-white/70 text-sm mt-3 mb-8">
              Suivez l'avancement, validez les livrables et restez en contact avec votre prestataire.
            </p>

            <ul className="space-y-3">
              {perks.map(({ icon: Icon, label }) => (
                <li key={label} className="flex items-center gap-3 text-white/85 text-sm">
                  <span className="h-7 w-7 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  {label}
                </li>
              ))}
            </ul>
          </div>

          <p className="text-white/40 text-xs mt-8">Connexion sécurisée · Données hébergées en France</p>
        </div>

        {/* ── Panneau droit (formulaire) ── */}
        <div className="md:w-3/5 px-8 py-10 flex flex-col justify-center">
          <h2 className="text-xl font-bold text-gray-900 mb-1">Créer mon compte</h2>
          <p className="text-sm text-gray-500 mb-6">
            Déjà un compte ?{' '}
            <Link href={`/client/login${projectId ? '?project=' + projectId : ''}`} className="text-primary font-medium hover:underline">
              Se connecter →
            </Link>
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Adresse email</Label>
              <Input
                id="email" type="email" value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="votre@email.com" required autoComplete="email"
                readOnly={!!prefillEmail}
                className={prefillEmail ? 'bg-gray-50 text-gray-500 cursor-default' : ''}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Mot de passe</Label>
              <div className="relative">
                <Input
                  id="password" type={showPassword ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="8 caractères minimum" required autoComplete="new-password" autoFocus
                  className="pr-10"
                />
                <button type="button" tabIndex={-1} onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-gray-400">Minimum 8 caractères</p>
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2.5">
                <p className="text-sm text-red-600">{error}</p>
                {error.includes('existe déjà') && (
                  <Link href={`/client/login${projectId ? '?project=' + projectId : ''}&email=${encodeURIComponent(email)}`}
                    className="text-sm font-medium text-red-700 underline mt-1 block">
                    Se connecter →
                  </Link>
                )}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Création du compte…</>
                : <><CheckCircle2 className="h-4 w-4 mr-2" />Créer mon espace client</>}
            </Button>
          </form>

          <p className="text-xs text-gray-400 mt-6 text-center">
            Vous êtes prestataire ?{' '}
            <Link href="/login" className="text-primary hover:underline font-medium">Connexion freelance →</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function ClientSignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 animate-pulse" />}>
      <SignupForm />
    </Suspense>
  )
}
