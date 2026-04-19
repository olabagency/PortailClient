'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { APP_CONFIG } from '@/config/app.config'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import AuthLeftPanel from '@/components/auth/AuthLeftPanel'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setError('Email ou mot de passe incorrect.')
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  async function handleGoogleLogin() {
    setGoogleLoading(true)
    setError(null)

    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (authError) {
      setError('Erreur lors de la connexion avec Google.')
      setGoogleLoading(false)
    }
  }

  return (
    <div className="h-screen overflow-hidden flex">
      {/* Left panel */}
      <AuthLeftPanel />

      {/* Right column */}
      <div className="w-full lg:w-[460px] xl:w-[500px] flex flex-col items-center justify-center bg-white px-8 overflow-y-auto">
        <div className="w-full max-w-sm py-6">
          {/* Heading */}
          <div className="mb-5">
            <h1 className="text-2xl font-bold text-gray-900 mb-0.5">Bon retour 👋</h1>
            <p className="text-gray-500 text-sm">Connectez-vous à votre espace</p>
          </div>

          {/* Google button */}
          <Button
            variant="outline"
            className="w-full mb-3 h-10 font-medium"
            onClick={handleGoogleLogin}
            disabled={googleLoading || loading}
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 mr-2 flex-shrink-0">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            {googleLoading ? 'Redirection...' : 'Continuer avec Google'}
          </Button>

          {/* Separator */}
          <div className="flex items-center gap-3 mb-3">
            <Separator className="flex-1" />
            <span className="text-xs text-gray-400">ou</span>
            <Separator className="flex-1" />
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="vous@exemple.fr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="h-10"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                  Mot de passe
                </Label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-[#386FA4] hover:underline"
                >
                  Mot de passe oublié ?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="h-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-10 bg-[#386FA4] hover:bg-[#2d5e8e] text-white font-medium"
              disabled={loading || googleLoading}
            >
              {loading ? 'Connexion...' : 'Se connecter'}
            </Button>
          </form>

          {/* Footer links */}
          <div className="mt-4 space-y-2 text-center">
            <p className="text-sm text-gray-500">
              Pas de compte ?{' '}
              <Link href="/signup" className="text-[#386FA4] hover:underline font-medium">
                S'inscrire gratuitement →
              </Link>
            </p>
            <p className="text-sm text-gray-400">
              Vous êtes client ?{' '}
              <Link href="/client/login" className="text-gray-600 hover:underline font-medium">
                Espace client →
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
