'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { CheckCircle2, Loader2, User, Building2, MapPin, FileText, Mail, Phone } from 'lucide-react'

export default function ClientInfosPage() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    billing_address: '',
    siret: '',
    vat_number: '',
  })
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)

  function setField(key: keyof typeof form, value: string) {
    setForm(f => ({ ...f, [key]: value }))
  }

  const hasChanges = Object.values(form).some(v => v.trim().length > 0) || message.trim().length > 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!hasChanges) return
    setSubmitting(true)
    try {
      // Filter only filled fields
      const fields: Record<string, string> = {}
      for (const [k, v] of Object.entries(form)) {
        if (v.trim()) fields[k] = v.trim()
      }

      const res = await fetch('/api/client/infos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields, message: message.trim() || null }),
      })
      if (!res.ok) throw new Error()
      setSent(true)
      toast.success('Demande envoyée à votre prestataire')
    } catch {
      toast.error('Erreur lors de l\'envoi')
    } finally {
      setSubmitting(false)
    }
  }

  if (sent) {
    return (
      <div className="max-w-xl mx-auto py-12 text-center space-y-4">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-emerald-50 border border-emerald-100 mx-auto">
          <CheckCircle2 className="h-8 w-8 text-emerald-500" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Demande envoyée</h2>
          <p className="text-sm text-gray-500 mt-1">
            Votre prestataire a été notifié et traitera vos modifications dans les meilleurs délais.
          </p>
        </div>
        <Button variant="outline" onClick={() => { setSent(false); setForm({ name: '', email: '', phone: '', company: '', billing_address: '', siret: '', vat_number: '' }); setMessage('') }}>
          Soumettre une autre demande
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Mes informations</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Indiquez les champs que vous souhaitez modifier. Votre prestataire sera notifié et appliquera les changements.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Identity */}
        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <User className="h-4 w-4 text-muted-foreground" />
              <h2 className="font-medium text-sm">Identité</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs text-muted-foreground">Nom complet</Label>
                <Input id="name" placeholder="Jean Dupont" value={form.name} onChange={e => setField('name', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email-info" className="text-xs text-muted-foreground">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input id="email-info" type="email" placeholder="jean@exemple.com" className="pl-8" value={form.email} onChange={e => setField('email', e.target.value)} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-xs text-muted-foreground">Téléphone</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input id="phone" placeholder="+33 6 00 00 00 00" className="pl-8" value={form.phone} onChange={e => setField('phone', e.target.value)} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Company / Billing */}
        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <h2 className="font-medium text-sm">Société &amp; Facturation</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="company" className="text-xs text-muted-foreground">Nom de la société</Label>
                <Input id="company" placeholder="Ma Société SAS" value={form.company} onChange={e => setField('company', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="siret" className="text-xs text-muted-foreground">SIRET</Label>
                <div className="relative">
                  <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input id="siret" placeholder="12345678901234" className="pl-8" value={form.siret} onChange={e => setField('siret', e.target.value)} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="vat" className="text-xs text-muted-foreground">N° TVA intracommunautaire</Label>
                <Input id="vat" placeholder="FR12345678901" value={form.vat_number} onChange={e => setField('vat_number', e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="billing" className="text-xs text-muted-foreground">Adresse de facturation</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-3.5 w-3.5 text-muted-foreground" />
                <Textarea id="billing" placeholder="1 rue de la Paix, 75001 Paris" className="pl-8 resize-none" rows={2} value={form.billing_address} onChange={e => setField('billing_address', e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Message libre */}
        <div className="space-y-1.5">
          <Label htmlFor="msg" className="text-sm font-medium">Message additionnel</Label>
          <Textarea
            id="msg"
            placeholder="Précisez toute autre information à mettre à jour…"
            rows={3}
            className="resize-none"
            value={message}
            onChange={e => setMessage(e.target.value)}
          />
        </div>

        <Button type="submit" disabled={submitting || !hasChanges} className="w-full">
          {submitting
            ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Envoi en cours…</>
            : 'Envoyer la demande de modification'
          }
        </Button>
      </form>
    </div>
  )
}
