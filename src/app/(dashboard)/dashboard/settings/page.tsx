'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { APP_CONFIG } from '@/config/app.config'
import type { Metadata } from 'next'

interface Profile {
  full_name: string | null
  email: string
  avatar_url: string | null
  plan: string
}

export default function SettingsPage() {
  const { user } = useAuth()
  const supabase = createClient()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [fullName, setFullName] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Changer mot de passe
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSaved, setPasswordSaved] = useState(false)

  useEffect(() => {
    if (!user) return

    supabase
      .from('profiles')
      .select('full_name, email, avatar_url, plan')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setProfile(data)
          setFullName(data.full_name ?? '')
        }
      })
  }, [user])

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSaved(false)

    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName })
      .eq('id', user!.id)

    if (error) {
      setError('Erreur lors de la sauvegarde.')
    } else {
      // Mettre à jour les metadata Supabase Auth aussi
      await supabase.auth.updateUser({ data: { full_name: fullName } })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }
    setSaving(false)
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    setPasswordError(null)
    setPasswordSaved(false)

    if (newPassword.length < 8) {
      setPasswordError('Le mot de passe doit contenir au moins 8 caractères.')
      return
    }

    setChangingPassword(true)

    const { error } = await supabase.auth.updateUser({ password: newPassword })

    if (error) {
      setPasswordError('Erreur lors du changement de mot de passe.')
    } else {
      setPasswordSaved(true)
      setCurrentPassword('')
      setNewPassword('')
      setTimeout(() => setPasswordSaved(false), 3000)
    }
    setChangingPassword(false)
  }

  const initials = fullName
    ? fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() ?? '?'

  const planConfig = profile?.plan ? APP_CONFIG.plans[profile.plan as keyof typeof APP_CONFIG.plans] : null

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Paramètres</h1>
        <p className="text-muted-foreground text-sm mt-1">Gérez votre profil et vos préférences.</p>
      </div>

      {/* Profil */}
      <Card>
        <CardHeader>
          <CardTitle>Profil</CardTitle>
          <CardDescription>Vos informations personnelles</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={profile?.avatar_url ?? undefined} />
                <AvatarFallback className="text-lg bg-primary text-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="text-sm text-muted-foreground">
                <p>Photo de profil</p>
                <p className="text-xs">Disponible prochainement</p>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="fullName">Nom complet</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jean Dupont"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={user?.email ?? ''}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">L'email ne peut pas être modifié ici.</p>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex items-center gap-3">
              <Button type="submit" disabled={saving}>
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
              {saved && <p className="text-sm text-green-600">Profil mis à jour ✓</p>}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Plan */}
      <Card>
        <CardHeader>
          <CardTitle>Plan</CardTitle>
          <CardDescription>Votre abonnement actuel</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{planConfig?.name ?? 'Gratuit'}</p>
              {profile?.plan === 'free' && (
                <p className="text-sm text-muted-foreground">
                  {APP_CONFIG.plans.free.maxProjects} projets · {APP_CONFIG.plans.free.maxStorageGB} Go de stockage
                </p>
              )}
            </div>
            <Badge variant={profile?.plan === 'free' ? 'secondary' : 'default'}>
              {planConfig?.name ?? 'Gratuit'}
            </Badge>
          </div>
          <a href="/dashboard/settings/billing">
            <Button variant={profile?.plan === 'free' ? 'default' : 'outline'} size="sm">
              {profile?.plan === 'free' ? 'Passer au plan Pro' : 'Gérer l\'abonnement'}
            </Button>
          </a>
        </CardContent>
      </Card>

      {/* Sécurité */}
      <Card>
        <CardHeader>
          <CardTitle>Sécurité</CardTitle>
          <CardDescription>Modifiez votre mot de passe</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">Nouveau mot de passe</Label>
              <Input
                id="newPassword"
                type="password"
                placeholder="8 caractères minimum"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>

            {passwordError && <p className="text-sm text-destructive">{passwordError}</p>}

            <div className="flex items-center gap-3">
              <Button type="submit" variant="outline" disabled={changingPassword}>
                {changingPassword ? 'Modification...' : 'Changer le mot de passe'}
              </Button>
              {passwordSaved && <p className="text-sm text-green-600">Mot de passe modifié ✓</p>}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
