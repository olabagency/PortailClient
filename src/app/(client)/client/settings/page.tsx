'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { User, Mail, Lock, Loader2, CheckCircle2 } from 'lucide-react'

type State = 'idle' | 'saving' | 'sending_email'

export default function ClientSettingsPage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [state, setState] = useState<State>('idle')
  const [emailSent, setEmailSent] = useState(false)
  const [loading, setLoading] = useState(true)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setFullName(user.user_metadata?.full_name ?? '')
        setEmail(user.email ?? '')
      }
      setLoading(false)
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault()
    if (!fullName.trim()) return
    setState('saving')

    const { error } = await supabase.auth.updateUser({
      data: { full_name: fullName.trim() },
    })

    setState('idle')
    if (error) {
      toast.error('Erreur lors de la mise à jour')
    } else {
      toast.success('Nom mis à jour')
    }
  }

  async function handleChangeEmail(e: React.FormEvent) {
    e.preventDefault()
    setState('sending_email')

    const { data: { user } } = await supabase.auth.getUser()
    const redirectTo = `${window.location.origin}/client/auth/callback`

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    })

    setState('idle')
    if (error) {
      toast.error('Erreur lors de l\'envoi du lien')
    } else {
      setEmailSent(true)
      toast.success('Lien de connexion envoyé')
    }
    void user
  }

  if (loading) {
    return (
      <div className="max-w-xl mx-auto py-6 space-y-6">
        <Skeleton className="h-7 w-48" />
        <Card><CardContent className="p-5 space-y-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-28" />
        </CardContent></Card>
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Paramètres du compte</h1>
        <p className="text-sm text-muted-foreground mt-1">Gérez les informations de votre espace client.</p>
      </div>

      {/* Nom */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <User className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-medium text-sm">Votre nom</h2>
          </div>
          <form onSubmit={handleSaveName} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Nom complet</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Votre nom"
                required
              />
            </div>
            <Button type="submit" size="sm" disabled={state === 'saving' || !fullName.trim()}>
              {state === 'saving' ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Enregistrement...</>
              ) : 'Enregistrer'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Separator />

      {/* Email / connexion */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-medium text-sm">Adresse email</h2>
          </div>

          {emailSent ? (
            <div className="flex items-start gap-3 rounded-lg border border-green-100 bg-green-50 p-4">
              <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-green-800">Lien envoyé !</p>
                <p className="text-xs text-green-700 mt-1">
                  Consultez votre boîte mail à <strong>{email}</strong> et cliquez sur le lien pour confirmer.
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleChangeEmail} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Nouvel email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre@email.com"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Un lien de connexion sera envoyé à cette adresse pour confirmer le changement.
                </p>
              </div>
              <Button type="submit" size="sm" variant="outline" disabled={state === 'sending_email' || !email.trim()}>
                {state === 'sending_email' ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Envoi...</>
                ) : (
                  <><Lock className="h-4 w-4 mr-2" />Envoyer un lien de confirmation</>
                )}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* Info */}
      <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
        <p className="font-medium mb-1">Connexion par lien magique</p>
        <p className="text-xs text-blue-700">
          Votre espace client utilise une connexion sans mot de passe. Un lien de connexion sécurisé
          vous est envoyé par email à chaque connexion.
        </p>
      </div>
    </div>
  )
}
