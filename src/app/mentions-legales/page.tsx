import Link from "next/link"
import { APP_CONFIG } from "@/config/app.config"

export const metadata = {
  title: "Mentions légales",
  robots: { index: false },
}

export default function MentionsLegalesPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Link href="/" className="text-sm text-blue-600 hover:underline mb-8 inline-block">← Retour</Link>
        <h1 className="text-3xl font-bold mb-8">Mentions légales</h1>

        <div className="prose prose-gray max-w-none space-y-6 text-sm text-gray-700 leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Éditeur du site</h2>
            <p>
              Le site {APP_CONFIG.name} est édité par une entreprise individuelle.
              Pour toute question, contactez-nous à l&apos;adresse email disponible sur le site.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Hébergement</h2>
            <p>
              Le site est hébergé sur Vercel Inc., 340 Pine Street, Suite 701, San Francisco, CA 94104, USA.
              Les données sont stockées sur des serveurs situés en Europe (région EU).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Propriété intellectuelle</h2>
            <p>
              L&apos;ensemble du contenu de ce site (textes, graphiques, logiciels) est protégé par le droit d&apos;auteur.
              Toute reproduction sans autorisation préalable est interdite.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Données personnelles</h2>
            <p>
              Consultez notre <Link href="/confidentialite" className="text-blue-600 hover:underline">politique de confidentialité</Link> pour
              en savoir plus sur la collecte et le traitement de vos données.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Contact</h2>
            <p>
              Pour toute question relative à ces mentions légales, contactez-nous via le formulaire de contact disponible dans l&apos;application.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
