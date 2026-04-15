'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { APP_CONFIG } from '@/config/app.config'
import { Loader2, Eye, EyeOff, CheckCircle2, FolderKanban, FileText, MessageSquare } from 'lucide-react'

type State = 'idle' | 'loading' | 'done'

const perks = [
  { icon: FolderKanban, label: 'Avancement du projet en temps réel' },
  { icon: FileText, label: 'Livrables et documents partagés' },
  { icon: MessageSquare, label: 'Échanges directs avec votre prestataire' },
]

function SignupForm() {
  const searchParams = useSearchParams()
  const project = searchParams.get('project')
  const prefillEmail = searchParams.get('email') ?? ''

  const [email, setEmail] = useState(prefillEmail)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [state, setState] = useState<State>('idle')
  const [error, setError] = useState<string | null>(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password.length < 8) { setError('Le mot de passe doit contenir au moins 8 caractères.'); return }
    if (password !== confirmPassword) { setError('Les mots de passe ne correspondent pas.'); return }
    setState('loading')
    const redirectTo = `${APP_CONFIG.url}/client/auth/callback${project ? '?project=' + project : ''}`
    const { error: authError } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: redirectTo } })
    if (authError) {
      setError(authError.message === 'User already registered' ? 'Un compte existe déjà. Connectez-vous.' : 'Une erreur est survenue.')
      setState('idle')
      return
    }
    setState('done')
  }

  if (state === 'done') {
    return (
      <div className="text-center py-6 space-y-4">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-emerald-50 mx-auto">
          <CheckCircle2 className="h-8 w-8 text-emerald-500" />
        </div>
        <div>
          <p className="text-lg font-semibold text-gray-900">Vérifiez votre boîte mail</p>
          <p className="text-sm text-gray-500 mt-1 max-w-xs mx-auto">
            Un lien de confirmation a été envoyé à <span className="font-medium text-gray-800">{email}</span>. Cliquez dessus pour activer votre compte.
          </p>
        </div>
        <p className="text-xs text-gray-400">Pensez à vérifier vos spams.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="email" className="text-sm font-medium text-gray-700">Adresse email</Label>
        <Input
          id="email" type="email" value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="votre@email.com" required autoComplete="email"
          readOnly={!!prefillEmail}
          className={`h-10 ${prefillEmail ? 'bg-gray-50 text-gray-500 cursor-default' : ''}`}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password" className="text-sm font-medium text-gray-700">Mot de passe</Label>
        <div className="relative">
          <Input
            id="password" type={showPassword ? 'text' : 'password'} value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="8 caractères minimum" required autoComplete="new-password" autoFocus
            className="h-10 pr-10"
          />
          <button type="button" tabIndex={-1} onClick={() => setShowPassword(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="confirm" className="text-sm font-medium text-gray-700">Confirmer le mot de passe</Label>
        <Input
          id="confirm" type={showPassword ? 'text' : 'password'} value={confirmPassword}
          onChange={e => setConfirmPassword(e.target.value)}
          placeholder="Répétez le mot de passe" required autoComplete="new-password"
          className="h-10"
        />
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <Button type="submit" className="w-full h-10" disabled={state === 'loading'}>
        {state === 'loading' ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Création…</> : 'Créer mon espace client'}
      </Button>

      <p className="text-center text-sm text-gray-500 pt-1">
        Déjà un compte ?{' '}
        <Link href={`/client/login${project ? '?project=' + project : ''}`} className="text-primary font-medium hover:underline">
          Se connecter →
        </Link>
      </p>
    </form>
  )
}

export default function ClientSignupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-orange-50/30 to-slate-100 px-4 py-8">
      <div className="w-full max-w-md">

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden">

          {/* Branded header */}
          <div className="bg-gradient-to-br from-[#E8553A] to-[#c9402a] px-8 pt-8 pb-6">
            <div className="inline-flex items-center justify-center h-11 w-11 rounded-2xl bg-white/20 mb-4">
              <span className="text-white font-bold text-lg">C</span>
            </div>
            <h1 className="text-xl font-bold text-white">Votre espace projet vous attend</h1>
            <p className="text-white/75 text-sm mt-1">Créez votre compte pour accéder à tout ça :</p>

            {/* Perks */}
            <ul className="mt-3 space-y-1.5">
              {perks.map(({ icon: Icon, label }) => (
                <li key={label} className="flex items-center gap-2 text-white/85 text-sm">
                  <Icon className="h-3.5 w-3.5 text-white/60 shrink-0" />
                  {label}
                </li>
              ))}
            </ul>
          </div>

          {/* Form */}
          <div className="px-8 py-6">
            <Suspense fallback={<div className="h-48 animate-pulse bg-gray-100 rounded-xl" />}>
              <SignupForm />
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
