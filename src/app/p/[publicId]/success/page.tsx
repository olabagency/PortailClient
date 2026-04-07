import Link from 'next/link'
import { CheckCircle2 } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { APP_CONFIG } from '@/config/app.config'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: `Formulaire envoyé — ${APP_CONFIG.name}`,
}

export default function SuccessPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
        <div className="flex justify-center mb-6">
          <div className="rounded-full bg-green-100 p-4">
            <CheckCircle2 className="h-12 w-12 text-green-600" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Merci !</h1>
        <p className="text-gray-600 mb-8">
          Votre formulaire a bien été envoyé. Vous serez contacté prochainement.
        </p>
        <div className="space-y-3">
          <Link href="/login" className={buttonVariants({ variant: 'default' }) + ' w-full justify-center'}>
            Accéder à mon espace client
          </Link>
          <p className="text-xs text-muted-foreground">
            Créez un compte pour suivre l'avancement de votre projet en temps réel.
          </p>
        </div>
        <p className="mt-8 text-xs text-muted-foreground">
          Propulsé par{' '}
          <Link href="/" className="hover:underline font-medium">
            {APP_CONFIG.name}
          </Link>
        </p>
      </div>
    </div>
  )
}
