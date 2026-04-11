import Link from "next/link"
import { APP_CONFIG } from "@/config/app.config"

export const metadata = {
  title: "Politique de confidentialité",
  robots: { index: false },
}

export default function ConfidentialitePage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Link href="/" className="text-sm text-blue-600 hover:underline mb-8 inline-block">← Retour</Link>
        <h1 className="text-3xl font-bold mb-8">Politique de confidentialité</h1>
        <p className="text-sm text-gray-500 mb-8">Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}</p>

        <div className="space-y-6 text-sm text-gray-700 leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">1. Données collectées</h2>
            <p>Nous collectons les informations suivantes lors de votre utilisation de {APP_CONFIG.name} :</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Adresse email et nom (inscription)</li>
              <li>Données de projets et clients que vous créez</li>
              <li>Fichiers uploadés dans le cadre de vos projets</li>
              <li>Données de navigation (logs serveur)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">2. Utilisation des données</h2>
            <p>Vos données sont utilisées uniquement pour :</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Fournir le service {APP_CONFIG.name}</li>
              <li>Vous envoyer des notifications liées à votre compte</li>
              <li>Gérer votre abonnement (via Stripe)</li>
              <li>Améliorer le service</li>
            </ul>
            <p className="mt-2">Nous ne vendons jamais vos données à des tiers.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">3. Stockage et sécurité</h2>
            <p>
              Vos données sont stockées sur des serveurs sécurisés en Europe via Supabase (région EU).
              Les fichiers sont stockés en France via un prestataire de stockage objet sécurisé.
              L&apos;accès est protégé par authentification et chiffrement HTTPS.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">4. Sous-traitants</h2>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Supabase</strong> — base de données et authentification (EU)</li>
              <li><strong>Stripe</strong> — traitement des paiements</li>
              <li><strong>Resend</strong> — envoi d&apos;emails transactionnels</li>
              <li><strong>Vercel</strong> — hébergement de l&apos;application</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">5. Vos droits (RGPD)</h2>
            <p>Conformément au RGPD, vous disposez des droits suivants :</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Droit d&apos;accès à vos données</li>
              <li>Droit de rectification</li>
              <li>Droit à l&apos;effacement (&quot;droit à l&apos;oubli&quot;)</li>
              <li>Droit à la portabilité</li>
              <li>Droit d&apos;opposition</li>
            </ul>
            <p className="mt-2">
              Pour exercer ces droits, contactez-nous via votre espace de paramètres ou par email.
              Vous pouvez supprimer votre compte à tout moment depuis les paramètres.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">6. Cookies</h2>
            <p>
              Nous utilisons uniquement des cookies de session nécessaires au fonctionnement du service
              (authentification). Aucun cookie publicitaire ou de tracking n&apos;est utilisé.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">7. Contact DPO</h2>
            <p>
              Pour toute question relative à vos données personnelles, contactez-nous via les paramètres de l&apos;application.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
