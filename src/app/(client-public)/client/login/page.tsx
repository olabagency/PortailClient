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
import { Loader2, Eye, EyeOff, CheckCircle2, ArrowRight } from 'lucide-react'

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
      <div className="text-center py-6 space-y-5">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-emerald-50 border border-emerald-100 mx-auto">
          <CheckCircle2 className="h-8 w-8 text-emerald-500" />
        </div>
        <div className="space-y-1">
          <p className="font-semibold text-gray-900">Email envoyé !</p>
          <p className="text-sm text-gray-500">
            Lien de réinitialisation envoyé à{' '}
            <span className="font-medium text-gray-800">{email}</span>.
          </p>
        </div>
        <button
          onClick={() => { setResetSent(false); setMode('login') }}
          className="text-sm text-primary hover:underline"
        >
          ← Retour à la connexion
        </button>
      </div>
    )
  }

  if (mode === 'forgot') {
    return (
      <form onSubmit={handleForgot} className="space-y-5">
        <div className="space-y-1">
          <p className="font-semibold text-gray-900">Mot de passe oublié ?</p>
          <p className="text-sm text-gray-500">Vous recevrez un lien de réinitialisation par email.</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email-r" className="text-sm font-medium text-gray-700">Adresse email</Label>
          <Input
            id="email-r" type="email" value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="votre@email.com" required autoFocus className="h-11"
          />
        </div>
        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
        <Button type="submit" className="w-full h-11 text-sm font-medium" disabled={state === 'loading'}>
          {state === 'loading'
            ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Envoi en cours…</>
            : 'Envoyer le lien'}
        </Button>
        <button
          type="button"
          onClick={() => setMode('login')}
          className="w-full text-sm text-gray-400 hover:text-gray-600 text-center"
        >
          ← Retour à la connexion
        </button>
      </form>
    )
  }

  return (
    <form onSubmit={handleLogin} className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="email" className="text-sm font-medium text-gray-700">Adresse email</Label>
        <Input
          id="email" type="email" value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="votre@email.com" required autoComplete="email"
          autoFocus={!prefillEmail} className="h-11"
        />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="password" className="text-sm font-medium text-gray-700">Mot de passe</Label>
          <button
            type="button"
            onClick={() => setMode('forgot')}
            className="text-xs text-primary hover:underline"
          >
            Mot de passe oublié ?
          </button>
        </div>
        <div className="relative">
          <Input
            id="password" type={showPassword ? 'text' : 'password'} value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••" required autoComplete="current-password"
            autoFocus={!!prefillEmail} className="h-11 pr-10"
          />
          <button
            type="button" tabIndex={-1}
            onClick={() => setShowPassword(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <Button
        type="submit"
        className="w-full h-11 text-sm font-medium gap-2"
        disabled={state === 'loading'}
      >
        {state === 'loading'
          ? <><Loader2 className="h-4 w-4 animate-spin" />Connexion en cours…</>
          : <><span>Accéder à mon espace</span><ArrowRight className="h-4 w-4" /></>
        }
      </Button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-100" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-white px-3 text-xs text-gray-400">ou</span>
        </div>
      </div>

      <p className="text-center text-sm text-gray-500">
        Pas encore de compte ?{' '}
        <Link
          href={`/client/signup${project ? '?project=' + project : ''}`}
          className="text-primary font-medium hover:underline"
        >
          Créer mon accès
        </Link>
      </p>
    </form>
  )
}

export default function ClientLoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-orange-50/20 to-slate-100 px-4 py-8">
      <div className="w-full max-w-sm">

        {/* Logo + title above card */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center h-14 w-14 rounded-2xl mb-4 shadow-md"
            style={{ background: 'linear-gradient(135deg, #E8553A, #c9402a)' }}
          >
            <span className="text-white font-bold text-xl">{APP_CONFIG.name[0]}</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Votre espace client</h1>
          <p className="text-sm text-gray-500 mt-1">Suivez l&apos;avancement de votre projet</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 px-8 py-7">
          <Suspense fallback={<div className="h-40 animate-pulse bg-gray-100 rounded-xl" />}>
            <LoginForm />
          </Suspense>
        </div>

      </div>
    </div>
  )
}
