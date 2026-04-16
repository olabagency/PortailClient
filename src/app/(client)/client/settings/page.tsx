'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { User, Mail, Lock, Loader2, Eye, EyeOff, CheckCircle2 } from 'lucide-react'

type State = 'idle' | 'saving' | 'saving_email' | 'saving_password'

export default function ClientSettingsPage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [state, setState] = useState<State>('idle')
  const [emailSuccess, setEmailSuccess] = useState(false)
  const [passwordSuccess, setPasswordSuccess] = useState(false)
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
    const { error } = await supabase.auth.updateUser({ data: { full_name: fullName.trim() } })
    setState('idle')
    if (error) toast.error('Erreur lors de la mise à jour')
    else toast.success('Nom mis à jour')
  }

  async function handleChangeEmail(e: React.FormEvent) {
    e.preventDefault()
    setState('saving_email')
    const { error } = await supabase.auth.updateUser({ email })
    setState('idle')
    if (error) {
      toast.error(error.message ?? 'Erreur lors du changement d\'email')
    } else {
      setEmailSuccess(true)
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas')
      return
    }
    if (newPassword.length < 8) {
      toast.error('Le mot de passe doit contenir au moins 8 caractères')
      return
    }
    setState('saving_password')
    // Re-authenticate then update
    const { data: { user } } = await supabase.auth.getUser()
    if (user?.email) {
      const { error: reAuthError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      })
      if (reAuthError) {
        toast.error('Mot de passe actuel incorrect')
        setState('idle')
        return
      }
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setState('idle')
    if (error) {
      toast.error(error.message ?? 'Erreur lors de la mise à jour')
    } else {
      setPasswordSuccess(true)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      toast.success('Mot de passe mis à jour')
    }
  }

  if (loading) {
    return (
      <div className="max-w-xl mx-auto space-y-6">
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
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Paramètres du compte</h1>
        <p className="text-sm text-muted-foreground mt-1">Gérez les informations de votre espace client.</p>
      </div>

      {/* Nom */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <User className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-medium text-sm">Nom affiché</h2>
          </div>
          <form onSubmit={handleSaveName} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Nom complet</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Votre nom"
                required
              />
            </div>
            <Button type="submit" size="sm" disabled={state === 'saving' || !fullName.trim()}>
              {state === 'saving'
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Enregistrement…</>
                : 'Enregistrer'
              }
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Email */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-medium text-sm">Adresse email</h2>
          </div>

          {emailSuccess ? (
            <div className="flex items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50 p-4">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-emerald-800">Confirmation envoyée</p>
                <p className="text-xs text-emerald-700 mt-1">
                  Un lien de confirmation a été envoyé à <strong>{email}</strong>.
                  Cliquez sur le lien pour valider le changement.
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleChangeEmail} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Nouvelle adresse email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="votre@email.com"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Un email de confirmation sera envoyé à la nouvelle adresse.
                </p>
              </div>
              <Button
                type="submit"
                size="sm"
                variant="outline"
                disabled={state === 'saving_email' || !email.trim()}
              >
                {state === 'saving_email'
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Envoi…</>
                  : 'Mettre à jour l\'email'
                }
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Mot de passe */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Lock className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-medium text-sm">Changer le mot de passe</h2>
          </div>

          {passwordSuccess ? (
            <div className="flex items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50 p-4">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-emerald-800">Mot de passe mis à jour</p>
                <p className="text-xs text-emerald-700 mt-1">Votre nouveau mot de passe est actif.</p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">Mot de passe actuel</Label>
                <div className="relative">
                  <Input
                    id="current-password"
                    type={showCurrent ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="pr-10"
                  />
                  <button type="button" tabIndex={-1}
                    onClick={() => setShowCurrent(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-password">Nouveau mot de passe</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showNew ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="8 caractères minimum"
                    required
                    minLength={8}
                    className="pr-10"
                  />
                  <button type="button" tabIndex={-1}
                    onClick={() => setShowNew(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirmer le mot de passe</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-xs text-red-500">Les mots de passe ne correspondent pas</p>
                )}
              </div>

              <Button
                type="submit"
                size="sm"
                disabled={
                  state === 'saving_password' ||
                  !currentPassword || !newPassword || !confirmPassword ||
                  newPassword !== confirmPassword
                }
              >
                {state === 'saving_password'
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Mise à jour…</>
                  : 'Changer le mot de passe'
                }
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
