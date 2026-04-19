'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Eye, EyeOff, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { APP_CONFIG } from '@/config/app.config'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import AuthLeftPanel from '@/components/auth/AuthLeftPanel'

function getPasswordStrength(password: string): { level: 0 | 1 | 2 | 3; label: string; color: string } {
  if (password.length === 0) return { level: 0, label: '', color: '' }
  if (password.length < 6) return { level: 1, label: 'Faible', color: 'bg-red-500' }
  if (password.length < 10) return { level: 2, label: 'Moyen', color: 'bg-orange-400' }
  return { level: 3, label: 'Fort', color: 'bg-green-500' }
}

export default function SignupPage() {
  const supabase = createClient()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const strength = getPasswordStrength(password)

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.')
      setLoading(false)
      return
    }

    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (authError) {
      setError(authError.message === 'User already registered'
        ? 'Un compte existe déjà avec cet email.'
        : 'Une erreur est survenue. Veuillez réessayer.')
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
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

          {success ? (
            /* Success state */
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-5">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Vérifiez votre email</h2>
              <p className="text-gray-500 text-sm mb-2">
                Un lien de confirmation a été envoyé à
              </p>
              <p className="font-semibold text-gray-900 mb-6">{email}</p>
              <p className="text-gray-400 text-xs mb-8">
                Cliquez sur le lien dans l'email pour activer votre compte. Pensez à vérifier vos spams.
              </p>
              <Link
                href="/login"
                className="text-sm text-[#386FA4] hover:underline font-medium"
              >
                ← Retour à la connexion
              </Link>
            </div>
          ) : (
            <>
              {/* Heading */}
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-0.5">
                  <h1 className="text-2xl font-bold text-gray-900">Créez votre compte</h1>
                  <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                    Gratuit
                  </span>
                </div>
                <p className="text-gray-500 text-sm">Commencez à gérer vos clients en quelques minutes</p>
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
              <form onSubmit={handleSignup} className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="fullName" className="text-sm font-medium text-gray-700">
                    Nom complet
                  </Label>
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="Jean Dupont"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    autoComplete="name"
                    className="h-10"
                  />
                </div>

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
                  <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                    Mot de passe
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="8 caractères minimum"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="new-password"
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

                  {/* Password strength indicator */}
                  {password.length > 0 && (
                    <div className="space-y-1">
                      <div className="flex gap-1">
                        {([1, 2, 3] as const).map((lvl) => (
                          <div
                            key={lvl}
                            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                              strength.level >= lvl ? strength.color : 'bg-gray-200'
                            }`}
                          />
                        ))}
                      </div>
                      <p className="text-xs text-gray-500">{strength.label}</p>
                    </div>
                  )}
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
                  {loading ? 'Création...' : 'Créer mon compte gratuitement'}
                </Button>

                <p className="text-xs text-center text-gray-400">
                  En créant un compte, vous acceptez nos{' '}
                  <Link href="/legal/cgv" className="hover:underline text-gray-500">CGV</Link>
                  {' '}et notre{' '}
                  <Link href="/legal/confidentialite" className="hover:underline text-gray-500">
                    politique de confidentialité
                  </Link>.
                </p>
              </form>

              {/* Footer */}
              <div className="mt-4 text-center">
                <p className="text-sm text-gray-500">
                  Déjà un compte ?{' '}
                  <Link href="/login" className="text-[#386FA4] hover:underline font-medium">
                    Se connecter →
                  </Link>
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
