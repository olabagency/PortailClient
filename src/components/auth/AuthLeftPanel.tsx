import { APP_CONFIG } from '@/config/app.config'
import { CheckCircle2 } from 'lucide-react'

const features = [
  { title: 'Onboarding client automatisé', description: 'Collectez infos et documents en un formulaire intelligent' },
  { title: 'Suivi de projet en temps réel', description: 'Timeline, livrables et réunions centralisés' },
  { title: 'Portail client dédié', description: 'Votre client suit son projet sans vous déranger' },
  { title: 'Documents hébergés en France', description: 'Devis, factures et fichiers en sécurité' },
]

export default function AuthLeftPanel() {
  return (
    <div className="hidden lg:flex flex-col flex-1 relative overflow-hidden bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] px-10 py-8 xl:px-12">
      {/* Orange accent overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 60% 50% at 0% 0%, rgba(232,85,58,0.22) 0%, transparent 70%)' }}
      />

      <div className="relative z-10 flex flex-col h-full justify-between">
        {/* Brand */}
        <span className="text-xl font-bold text-white tracking-tight">{APP_CONFIG.name}</span>

        {/* Main content */}
        <div className="space-y-5">
          <h2 className="text-2xl xl:text-3xl font-bold text-white leading-snug">
            La plateforme tout-en-un<br />pour gérer vos clients<br />comme un pro.
          </h2>

          <ul className="space-y-3">
            {features.map((f) => (
              <li key={f.title} className="flex items-start gap-2.5">
                <span className="mt-0.5 flex-shrink-0 rounded-full bg-[#E8553A]/20 p-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#E8553A]" />
                </span>
                <div>
                  <p className="text-white font-medium text-sm leading-tight">{f.title}</p>
                  <p className="text-white/55 text-xs">{f.description}</p>
                </div>
              </li>
            ))}
          </ul>

          {/* Single testimonial */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <p className="text-white/80 text-sm leading-relaxed mb-3">
              &ldquo;L&apos;onboarding client prend maintenant 10 minutes au lieu de 2 heures. Mes clients adorent.&rdquo;
            </p>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-semibold text-sm">Thomas R.</p>
                <p className="text-white/50 text-xs">Développeur freelance</p>
              </div>
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <svg key={i} className="h-3 w-3 fill-[#E8553A]" viewBox="0 0 20 20" aria-hidden="true">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Trust badges */}
        <div className="flex flex-wrap gap-4 text-xs text-white/45">
          <span>🔒 Données en France</span>
          <span>✓ Gratuit sans CB</span>
          <span>🚀 Accès immédiat</span>
        </div>
      </div>
    </div>
  )
}
