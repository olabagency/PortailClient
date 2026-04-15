'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { APP_CONFIG } from '@/config/app.config'
import { Loader2, Eye, EyeOff, CheckCircle2 } from 'lucide-react'

type State = 'idle' | 'loading'
type Mode = 'login' | 'forgot'

function LoginForm() {
  const searchParams = useSearchParams()
  const project = searchParams.get('project')
  const prefillEmail = searchParams.get('email') ?? ''
  const router = useRouter()

  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState(prefillEmail)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [state, setState] = useState<State>('idle')
  const [error, setError] = useState<string | null>(null)
  const [resetSent, setResetSent] = useState(false)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setState('loading')
    setError(null)
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError) { setError('Email ou mot de passe incorrect.'); setState('idle'); return }
    router.push(project ? `/client/projects/${project}` : '/client')
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault()
    setState('loading')
    setError(null)
    const redirectTo = `${APP_CONFIG.url}/client/auth/callback${project ? '?project=' + project : ''}`
    const { error: authError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
    if (authError) { setError('Vérifiez votre adresse email.'); setState('idle'); return }
    setResetSent(true)
    setState('idle')
  }

  if (resetSent) {
    return (
      <div className="text-center py-4 space-y-4">
        <div className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-emerald-50 mx-auto">
          <CheckCircle2 className="h-7 w-7 text-emerald-500" />
        </div>
        <div>
          <p className="font-semibold text-gray-900">Email envoyé !</p>
          <p className="text-sm text-gray-500 mt-1">Lien de réinitialisation envoyé à <span className="font-medium text-gray-800">{email}</span>.</p>
        </div>
        <button onClick={() => { setResetSent(false); setMode('login') }} className="text-sm text-primary hover:underline">
          ← Retour
        </button>
      </div>
    )
  }

  if (mode === 'forgot') {
    return (
      <form onSubmit={handleForgot} className="space-y-4">
        <div>
          <p className="font-semibold text-gray-900 text-sm">Réinitialiser le mot de passe</p>
          <p className="text-xs text-gray-500 mt-0.5">Vous recevrez un lien par email.</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email-r" className="text-sm font-medium text-gray-700">Email</Label>
          <Input id="email-r" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="votre@email.com" required autoFocus className="h-10" />
        </div>
        {error && <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2"><p className="text-sm text-red-600">{error}</p></div>}
        <Button type="submit" className="w-full h-10" disabled={state === 'loading'}>
          {state === 'loading' ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Envoi…</> : 'Envoyer le lien'}
        </Button>
        <button type="button" onClick={() => setMode('login')} className="w-full text-sm text-gray-400 hover:text-gray-600 text-center">
          ← Retour à la connexion
        </button>
      </form>
    )
  }

  return (
    <form onSubmit={handleLogin} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="email" className="text-sm font-medium text-gray-700">Adresse email</Label>
        <Input
          id="email" type="email" value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="votre@email.com" required autoComplete="email"
          autoFocus={!prefillEmail} className="h-10"
        />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="password" className="text-sm font-medium text-gray-700">Mot de passe</Label>
          <button type="button" onClick={() => setMode('forgot')} className="text-xs text-primary hover:underline">
            Mot de passe oublié ?
          </button>
        </div>
        <div className="relative">
          <Input
            id="password" type={showPassword ? 'text' : 'password'} value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••" required autoComplete="current-password"
            autoFocus={!!prefillEmail} className="h-10 pr-10"
          />
          <button type="button" tabIndex={-1} onClick={() => setShowPassword(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {error && <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2"><p className="text-sm text-red-600">{error}</p></div>}

      <Button type="submit" className="w-full h-10" disabled={state === 'loading'}>
        {state === 'loading' ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Connexion…</> : 'Accéder à mon espace'}
      </Button>

      <p className="text-center text-sm text-gray-500 pt-1">
        Pas de compte ?{' '}
        <Link href={`/client/signup${project ? '?project=' + project : ''}`} className="text-primary font-medium hover:underline">
          Créer mon espace →
        </Link>
      </p>
    </form>
  )
}

export default function ClientLoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-orange-50/30 to-slate-100 px-4 py-8">
      <div className="w-full max-w-md">

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden">

          {/* Branded header */}
          <div className="bg-gradient-to-br from-[#E8553A] to-[#c9402a] px-8 pt-7 pb-5 text-center">
            <div className="inline-flex items-center justify-center h-11 w-11 rounded-2xl bg-white/20 mb-3">
              <span className="text-white font-bold text-lg">C</span>
            </div>
            <h1 className="text-xl font-bold text-white">Bienvenue sur votre espace</h1>
            <p className="text-white/70 text-sm mt-1">Connectez-vous pour suivre votre projet</p>
          </div>

          {/* Form */}
          <div className="px-8 py-6">
            <Suspense fallback={<div className="h-40 animate-pulse bg-gray-100 rounded-xl" />}>
              <LoginForm />
            </Suspense>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-5">
          Vous êtes prestataire ?{' '}
          <Link href="/login" className="text-primary hover:underline font-medium">Connexion freelance →</Link>
        </p>
      </div>
    </div>
  )
}
