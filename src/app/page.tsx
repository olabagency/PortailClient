import Link from "next/link"
import { APP_CONFIG } from "@/config/app.config"
import {
  CheckCircle2, Kanban, ClipboardList, FolderOpen, Users,
  ArrowRight, Star, Zap, Crown, Building2,
} from "lucide-react"

// ── Features ─────────────────────────────────────────────────────────────────

const features = [
  {
    icon: <ClipboardList className="h-6 w-6 text-blue-600" />,
    title: "Onboarding automatisé",
    desc: "Créez des questionnaires personnalisés. Le client remplit tout — sans créer de compte.",
  },
  {
    icon: <Kanban className="h-6 w-6 text-purple-600" />,
    title: "Kanban en temps réel",
    desc: "Gérez vos tâches en kanban ou en liste, avec visibilité client configurable.",
  },
  {
    icon: <FolderOpen className="h-6 w-6 text-green-600" />,
    title: "Documents & livrables",
    desc: "Partagez fichiers et livrables directement depuis le projet. Votre client valide en un clic.",
  },
  {
    icon: <Users className="h-6 w-6 text-orange-600" />,
    title: "Portail client dédié",
    desc: "Chaque client accède à un espace sécurisé pour suivre l'avancement, donner des retours, et télécharger.",
  },
]

const testimonials = [
  {
    name: "Sophie M.",
    role: "Freelance web",
    text: "Avant, j'envoyais des emails en boucle pour récupérer les infos de mes clients. Maintenant, tout arrive directement dans le projet.",
  },
  {
    name: "Thomas R.",
    role: "Community manager",
    text: "Le portail client a changé la donne. Mes clients voient l'avancement en temps réel, les retards de réponse ont disparu.",
  },
]

const PLANS_DISPLAY = [
  {
    key: "free",
    name: "Gratuit",
    price: "0",
    icon: <Zap className="h-5 w-5 text-gray-500" />,
    features: ["3 projets", "10 champs formulaire", "1 Go stockage", "1 template"],
    cta: "Démarrer gratuitement",
    href: "/signup",
    highlight: false,
  },
  {
    key: "pro",
    name: "Pro",
    price: "29",
    badge: `${APP_CONFIG.stripe.trialDays} jours offerts`,
    icon: <Crown className="h-5 w-5 text-blue-600" />,
    features: ["Projets illimités", "Champs illimités", "20 Go stockage", "Templates illimités", "Portail client auth."],
    cta: "Essayer Pro",
    href: "/signup",
    highlight: true,
  },
  {
    key: "agency",
    name: "Agence",
    price: "79",
    icon: <Building2 className="h-5 w-5 text-purple-600" />,
    features: ["Tout Pro inclus", "100 Go stockage", "Multi-utilisateurs (bientôt)", "Support prioritaire"],
    cta: "Démarrer",
    href: "/signup",
    highlight: false,
  },
]

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Nav */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <span className="font-bold text-lg">{APP_CONFIG.name}</span>
          <nav className="hidden md:flex items-center gap-6 text-sm text-gray-600">
            <a href="#features" className="hover:text-gray-900 transition-colors">Fonctionnalités</a>
            <a href="#pricing" className="hover:text-gray-900 transition-colors">Tarifs</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900 transition-colors hidden sm:block">
              Connexion
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center gap-1.5 bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Démarrer gratuitement
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 py-20 md:py-28 text-center">
        <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 text-xs font-medium px-3 py-1.5 rounded-full mb-6">
          <Star className="h-3.5 w-3.5" />
          Essai gratuit — aucune carte bancaire requise
        </div>
        <h1 className="text-4xl md:text-6xl font-bold text-gray-900 leading-tight mb-6">
          Le portail client qui fait<br />
          <span className="text-blue-600">gagner du temps aux freelances</span>
        </h1>
        <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto mb-8">
          {APP_CONFIG.description} Onboarding, kanban, livrables, documents — tout dans un seul outil.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/signup"
            className="inline-flex items-center justify-center gap-2 bg-blue-600 text-white font-semibold px-8 py-3.5 rounded-xl hover:bg-blue-700 transition-colors text-base shadow-sm"
          >
            Créer mon compte gratuitement
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 bg-gray-50 text-gray-800 font-medium px-8 py-3.5 rounded-xl hover:bg-gray-100 transition-colors text-base border border-gray-200"
          >
            Se connecter
          </Link>
        </div>
        <p className="text-xs text-gray-400 mt-4">
          Gratuit jusqu'à 3 projets · Pas de carte requise
        </p>
      </section>

      {/* Features */}
      <section id="features" className="bg-gray-50 py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">Tout ce qu'il vous faut</h2>
            <p className="text-gray-600 max-w-xl mx-auto">
              De l'onboarding jusqu'à la livraison, gérez chaque projet client sans jongler entre 5 outils différents.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {features.map((f) => (
              <div key={f.title} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center mb-4">
                  {f.icon}
                </div>
                <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 md:py-24">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Ce qu'en disent les freelances</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {testimonials.map((t) => (
              <div key={t.name} className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                <div className="flex gap-0.5 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-700 text-sm leading-relaxed mb-4">&ldquo;{t.text}&rdquo;</p>
                <div>
                  <p className="font-semibold text-sm">{t.name}</p>
                  <p className="text-xs text-gray-500">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="bg-gray-50 py-16 md:py-24">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">Des tarifs simples et transparents</h2>
            <p className="text-gray-600">Commencez gratuitement, passez au Pro quand vous êtes prêt.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PLANS_DISPLAY.map((plan) => (
              <div
                key={plan.key}
                className={`relative rounded-2xl p-6 flex flex-col gap-5 ${
                  plan.highlight
                    ? "bg-blue-600 text-white shadow-xl scale-[1.02] border-0"
                    : "bg-white border border-gray-200"
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-yellow-400 text-yellow-900 text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap">
                      ✨ {plan.badge}
                    </span>
                  </div>
                )}
                <div>
                  <div className={`flex items-center gap-2 mb-2 ${plan.highlight ? "text-blue-200" : "text-gray-700"}`}>
                    {plan.icon}
                    <span className="font-semibold">{plan.name}</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold">{plan.price}€</span>
                    <span className={`text-sm ${plan.highlight ? "text-blue-200" : "text-gray-500"}`}>/mois</span>
                  </div>
                </div>
                <ul className="space-y-2.5 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className={`h-4 w-4 shrink-0 ${plan.highlight ? "text-blue-200" : "text-green-500"}`} />
                      <span className={plan.highlight ? "text-blue-100" : "text-gray-700"}>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href={plan.href}
                  className={`inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-semibold text-sm transition-colors ${
                    plan.highlight
                      ? "bg-white text-blue-600 hover:bg-blue-50"
                      : "bg-blue-600 text-white hover:bg-blue-700"
                  }`}
                >
                  {plan.cta}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-24">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Prêt à simplifier votre relation client ?
          </h2>
          <p className="text-gray-600 mb-8">
            Rejoignez les freelances qui ont arrêté de perdre du temps sur l'administratif client.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 bg-blue-600 text-white font-semibold px-8 py-3.5 rounded-xl hover:bg-blue-700 transition-colors text-base shadow-sm"
          >
            Créer mon compte gratuitement
            <ArrowRight className="h-4 w-4" />
          </Link>
          <p className="text-xs text-gray-400 mt-4">Gratuit · Sans carte bancaire · Prêt en 2 minutes</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-500">
          <span className="font-semibold text-gray-700">{APP_CONFIG.name}</span>
          <p>© {new Date().getFullYear()} {APP_CONFIG.name}. Tous droits réservés.</p>
          <div className="flex gap-4">
            <Link href="/login" className="hover:text-gray-900 transition-colors">Connexion</Link>
            <Link href="/signup" className="hover:text-gray-900 transition-colors">Inscription</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
