'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { APP_CONFIG } from '@/config/app.config'
import { ArrowLeft, Loader2, Mail, CheckCircle2 } from 'lucide-react'

type State = 'idle' | 'loading' | 'sent'

export default function ClientLoginPage() {
  const searchParams = useSearchParams()
  const project = searchParams.get('project')

  const [email, setEmail] = useState('')
  const [state, setState] = useState<State>('idle')
  const [error, setError] = useState<string | null>(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setState('loading')
    setError(null)

    const redirectTo = `${APP_CONFIG.url}/client/auth/callback${project ? '?project=' + project : ''}`

    const { error: authError } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    })

    if (authError) {
      setError('Une erreur est survenue. Veuillez réessayer.')
      setState('idle')
      return
    }

    setState('sent')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-bold text-gray-900 hover:text-gray-700 transition-colors">
            {APP_CONFIG.name}
          </Link>
          <p className="text-gray-500 mt-1 text-sm">Espace client</p>
        </div>

        <Card className="shadow-sm border border-gray-100">
          <CardHeader className="pb-4">
            <CardTitle className="text-center text-lg">Connexion à votre portail</CardTitle>
          </CardHeader>
          <CardContent>
            {state === 'sent' ? (
              <div className="text-center space-y-4 py-4">
                <div className="flex justify-center">
                  <div className="h-14 w-14 rounded-full bg-green-50 flex items-center justify-center">
                    <CheckCircle2 className="h-7 w-7 text-green-500" />
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="font-medium text-gray-900">Lien envoyé !</p>
                  <p className="text-sm text-gray-500">
                    Un lien de connexion a été envoyé à{' '}
                    <span className="font-medium text-gray-700">{email}</span>.
                    Vérifiez votre boîte mail.
                  </p>
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setState('idle')
                    setEmail('')
                  }}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Renvoyer un lien
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email">Adresse email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="votre@email.com"
                    required
                    autoComplete="email"
                    autoFocus
                  />
                </div>

                {error && (
                  <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3">
                    <p className="text-sm text-destructive">{error}</p>
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={state === 'loading'}>
                  {state === 'loading' ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Envoi en cours...
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4 mr-2" />
                      Recevoir le lien de connexion
                    </>
                  )}
                </Button>
              </form>
            )}

            <div className="mt-6 pt-6 border-t text-center">
              <p className="text-sm text-muted-foreground">
                Vous êtes freelance ?{' '}
                <Link href="/login" className="text-primary font-medium hover:underline">
                  Se connecter ici →
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
