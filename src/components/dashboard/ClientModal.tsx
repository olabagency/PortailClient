'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type ClientType = 'individual' | 'company' | 'agency' | 'startup' | 'association' | 'other'

interface ClientFormData {
  name: string
  email: string
  phone: string
  company: string
  notes: string
  website: string
  client_type: ClientType
  billing_name: string
  billing_email: string
  vat_number: string
  address: string
  city: string
  zip_code: string
  country: string
}

interface ClientModalProps {
  open: boolean
  onClose: () => void
  onSuccess: (client: ClientFormData & { id: string }) => void
  initialData?: Partial<ClientFormData & { id: string }>
  mode?: 'create' | 'edit'
}

const empty: ClientFormData = {
  name: '',
  email: '',
  phone: '',
  company: '',
  notes: '',
  website: '',
  client_type: 'company',
  billing_name: '',
  billing_email: '',
  vat_number: '',
  address: '',
  city: '',
  zip_code: '',
  country: 'France',
}

const clientTypeLabels: Record<ClientType, string> = {
  individual: 'Particulier',
  company: 'Entreprise',
  agency: 'Agence',
  startup: 'Startup',
  association: 'Association',
  other: 'Autre',
}

export function ClientModal({ open, onClose, onSuccess, initialData, mode = 'create' }: ClientModalProps) {
  const [form, setForm] = useState<ClientFormData>({ ...empty, ...initialData })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function set(field: keyof ClientFormData) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(prev => ({ ...prev, [field]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const url = mode === 'edit' && initialData?.id
      ? `/api/clients/${initialData.id}`
      : '/api/clients'
    const method = mode === 'edit' ? 'PUT' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    const json = await res.json()

    if (!res.ok) {
      setError(json.error ?? 'Une erreur est survenue.')
      setLoading(false)
      return
    }

    onSuccess(json.data)
    setForm(empty)
    setLoading(false)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { setForm({ ...empty, ...initialData }); onClose() } }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Nouveau client' : 'Modifier le client'}</DialogTitle>
          <DialogDescription>
            {mode === 'create' ? 'Ajoutez un nouveau client à votre compte.' : 'Modifiez les informations du client.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <Tabs defaultValue="coordonnees" className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="coordonnees" className="flex-1">Coordonnées</TabsTrigger>
              <TabsTrigger value="profil" className="flex-1">Profil</TabsTrigger>
              <TabsTrigger value="facturation" className="flex-1">Facturation</TabsTrigger>
            </TabsList>

            <TabsContent value="coordonnees" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nom <span className="text-destructive">*</span></Label>
                <Input id="name" value={form.name} onChange={set('name')} placeholder="Jean Dupont" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={form.email} onChange={set('email')} placeholder="jean@exemple.fr" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Téléphone</Label>
                  <Input id="phone" value={form.phone} onChange={set('phone')} placeholder="06 00 00 00 00" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="company">Entreprise</Label>
                <Input id="company" value={form.company} onChange={set('company')} placeholder="ACME SAS" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Site web</Label>
                <Input id="website" type="url" value={form.website} onChange={set('website')} placeholder="https://exemple.fr" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" value={form.notes} onChange={set('notes')} placeholder="Informations complémentaires..." rows={3} />
              </div>
            </TabsContent>

            <TabsContent value="profil" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="client_type">Type de client</Label>
                <Select
                  value={form.client_type}
                  onValueChange={(value) => { if (value) setForm(prev => ({ ...prev, client_type: value as ClientType })) }}
                >
                  <SelectTrigger id="client_type" className="w-full">
                    <SelectValue placeholder="Sélectionner un type" />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.entries(clientTypeLabels) as [ClientType, string][]).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            <TabsContent value="facturation" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="billing_name">Raison sociale</Label>
                <Input id="billing_name" value={form.billing_name} onChange={set('billing_name')} placeholder="ACME SAS" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="billing_email">Email de facturation</Label>
                <Input id="billing_email" type="email" value={form.billing_email} onChange={set('billing_email')} placeholder="compta@exemple.fr" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vat_number">SIRET / N° TVA</Label>
                <Input id="vat_number" value={form.vat_number} onChange={set('vat_number')} placeholder="123 456 789 00012" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Adresse</Label>
                <Input id="address" value={form.address} onChange={set('address')} placeholder="12 rue de la Paix" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="city">Ville</Label>
                  <Input id="city" value={form.city} onChange={set('city')} placeholder="Paris" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zip_code">Code postal</Label>
                  <Input id="zip_code" value={form.zip_code} onChange={set('zip_code')} placeholder="75001" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">Pays</Label>
                <Input id="country" value={form.country} onChange={set('country')} placeholder="France" />
              </div>
            </TabsContent>
          </Tabs>

          {error && <p className="text-sm text-destructive mt-3">{error}</p>}

          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>Annuler</Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Enregistrement...' : mode === 'create' ? 'Créer le client' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
