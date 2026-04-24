# CLAUDE.md — Prompt de développement principal

Tu es le développeur principal de cette application SaaS. Ce fichier contient TOUTES les instructions pour développer l'application. Lis-le en entier avant d'écrire la moindre ligne de code.

---

## 1. VISION PRODUIT

Plateforme de gestion de projet client tout-en-un pour freelances et agences. Le cycle complet : onboarding client → validation d'étapes → messagerie → stockage de documents (devis/factures) → rendez-vous (Google Calendar/Meet) → portail client dédié.

**Cible** : Freelances web/dev et community managers francophones.
**Modèle** : Freemium (gratuit limité → plans payants).
**Langue de l'interface** : Français.

---

## 2. CONFIGURATION DE L'APPLICATION

Toute la configuration est centralisée dans `src/config/app.config.ts`. **Ne jamais hardcoder** le nom de l'app, les couleurs, les limites de plans, ou les URLs dans les composants. Toujours importer depuis ce fichier.

### Plans tarifaires (valeurs actuelles)

| Plan | Prix | maxProjects | maxClientsPerProject | maxStorageGB |
|------|------|-------------|----------------------|--------------|
| free | gratuit | **1** | 1 | 1 |
| pro | **14€/mois** | Infinity | Infinity | 20 |
| agency | sur devis | Infinity | Infinity | 100 |

**Important** : Le plan gratuit est limité à **1 seul projet**. La gate UI se trouve dans `src/app/(dashboard)/dashboard/projects/new/page.tsx` et consomme l'endpoint `GET /api/projects/check`.

---

## 3. STACK TECHNIQUE

| Couche | Technologie | Version |
|--------|------------|---------|
| Framework | Next.js (App Router) | 14+ |
| Langage | TypeScript | strict mode |
| UI | Tailwind CSS + shadcn/ui | dernière |
| Auth | Supabase Auth | email + Google OAuth |
| Base de données | Supabase PostgreSQL | région EU |
| ORM | Drizzle ORM | dernière |
| Stockage fichiers | Scaleway Object Storage (S3) | fr-par |
| SDK S3 | @aws-sdk/client-s3 | v3 |
| Email | Resend | dernière |
| Paiement | Stripe (Checkout + Webhooks) | dernière |
| Kanban DnD | @dnd-kit/core + @dnd-kit/sortable | dernière |
| Validation | Zod | dernière |
| Éditeur riche | Tiptap | dernière |
| Dates | date-fns | dernière |
| Icons | Lucide React | dernière |
| Déploiement | Vercel | auto-deploy GitHub |

---

## 4. VARIABLES D'ENVIRONNEMENT

Voir `.env.example` à la racine du projet.

---

## 5. CONVENTIONS DE CODE

### Règles générales
- TypeScript strict mode, jamais de `any`
- Tous les composants en functional components avec arrow functions
- Nommer les fichiers en PascalCase pour les composants, camelCase pour les utilitaires
- Utiliser `"use client"` uniquement quand nécessaire (interactivité, hooks)
- Préférer les Server Components par défaut
- Validation Zod sur TOUTES les entrées API (body, params, query)
- Gestion d'erreurs avec try/catch sur toutes les API routes
- Toujours vérifier les limites du plan avant les actions

### Conventions UI
- Utiliser les composants shadcn/ui
- Responsive mobile-first
- États vides avec EmptyState + CTA
- Skeletons pour le chargement
- Toasts pour le feedback
- Formulaires avec react-hook-form + zod resolver

### Conventions API
- Routes API dans `/src/app/api/`
- Auth vérifiée sur chaque route protégée
- Réponse : `{ data: T }` ou `{ error: string }`
- Montants financiers en centimes (BIGINT)

### Conventions S3
- Upload via presigned URLs uniquement
- Clés : `{user_id}/{project_id}/{context}/{timestamp}_{filename}`
- Valider MIME + taille avant de générer l'URL

### Pattern Zod — URL optionnelle acceptant chaîne vide

Pour les champs URL facultatifs (ex: `meeting_url`), utiliser ce pattern pour accepter les chaînes vides comme `null` :

```ts
meeting_url: z.union([z.string().url(), z.literal('')])
  .optional().nullable()
  .transform(v => v || null),
```

Ce pattern est utilisé dans :
- `src/app/api/projects/[id]/milestones/route.ts` (CREATE)
- `src/app/api/projects/[id]/milestones/[milestoneId]/route.ts` (UPDATE)

---

## 6. PALETTE DE COULEURS

La palette principale de l'application est définie comme suit (Coolors #133c55-386fa4-59a5d8-84d2f6-91e5f6) :

| Token Tailwind (arbitraire) | Hex | Usage |
|-----------------------------|-----|-------|
| `bg-[#133C55]` | #133C55 | Fond sombre, texte titre fort, hover boutons |
| `bg-[#386FA4]` | #386FA4 | Bouton principal (réunion, CTA) |
| `bg-[#59A5D8]` | #59A5D8 | Bordures actives, accents |
| `bg-[#84D2F6]` | #84D2F6 | Arrière-plans légers, chips |
| `bg-[#91E5F6]` | #91E5F6 | Fond très léger (hover, badges) |

Cette palette est appliquée sur :
- Les cartes de réunion du Dashboard (`src/app/(dashboard)/dashboard/page.tsx`)
- Le bouton "Rejoindre" des réunions
- La landing page (`src/app/page.tsx`) — gradient hero

### Réunions en retard

Sur le Dashboard (Server Component), les réunions affichées le jour même entre `now - 1h` et `23:59:59` :
- Si `scheduled_at < now` → badge rouge "En retard", bordure `border-red-200 bg-red-50/60`
- Si `scheduled_at >= now` → bordure `border-[#59A5D8]/30 bg-[#91E5F6]/10`
- Les réunions terminées depuis plus d'1h sont exclues de l'affichage

---

## 7. LANDING PAGE

Fichier : `src/app/page.tsx`

**Architecture** : CSS-in-JSX via balise `<style>` en haut du composant. Les classes suivent le préfixe `.lp-*`. Ne PAS utiliser Tailwind sur les éléments de la landing (les classes `.lp-*` sont définies dans le `<style>` du fichier).

### Sections (dans l'ordre)
1. **Navbar** — `.lp-nav` avec lien "Se connecter" et CTA "Essayer gratuitement"
2. **Hero** — fond gradient bleu foncé `linear-gradient(155deg, #0d2c40, #133C55, #1e4f75, #386FA4)`, H1 "Fini les allers-retours par email avec vos clients.", badge, pills features, CTA blanc vers `/signup`, trust row
3. **Features** — grille de cartes fonctionnalités
4. **Pricing** — 3 colonnes (Gratuit / Pro à **14€/mois** / Agence), CTA direct `/signup`
5. **CTA finale** — "Commencez maintenant, c'est gratuit."
6. **Footer** — 4 colonnes : Brand (logo + tagline + badges 🇫🇷 RGPD 🔒) / Produit / Compte / Légal & Contact

**Règles** :
- Pas de mock UI, pas d'images de screenshot
- CTA principal → `/signup`, jamais de waitlist
- Toujours mentionner "gratuit, sans carte bancaire"

---

## 8. TIMELINE (JALONS DE PROJET)

Fichier : `src/app/(dashboard)/dashboard/projects/[id]/milestones/page.tsx`

### Création de réunion inline dans la modal

Quand `reference_type === 'meeting'`, la modal affiche un sélecteur de mode :
- **"Réunion existante"** : sélecteur parmi les réunions du projet
- **"Créer une réunion"** : mini-formulaire inline (titre, date, heure, lien optionnel)

En mode création, `handleSave()` :
1. Valide les champs du mini-formulaire
2. Appelle `POST /api/projects/${projectId}/meetings` pour créer la réunion
3. Récupère l'`id` de la réunion créée
4. L'utilise comme `reference_id` lors de la sauvegarde du jalon

États supplémentaires : `meetingMode: 'existing' | 'new'`, `newMeetingTitle`, `newMeetingDate`, `newMeetingTime`, `newMeetingLink`.

---

## 9. ENDPOINTS API NOTABLES

### `GET /api/projects/check`
Fichier : `src/app/api/projects/check/route.ts`

Vérifie si l'utilisateur peut créer un nouveau projet selon son plan.

Réponse :
```json
{
  "plan": "free",
  "planName": "Gratuit",
  "limit": 1,
  "count": 1,
  "allowed": false
}
```

Utilisé par la page de création de projet pour afficher la gate UI avant d'afficher le formulaire.

### Gate UI — nouveau projet

`src/app/(dashboard)/dashboard/projects/new/page.tsx` :
- Au montage (`useEffect`), fetch `GET /api/projects/check`
- Si `!allowed` : affiche un écran de blocage avec Lock icon, comparaison Free vs Pro, CTA "Passer au Plan Pro" → `/dashboard/settings/billing`
- Pro affiché à **14€ / mois**

---

## 10. FLUX DE DÉVELOPPEMENT

Avant chaque feature :
1. Lire la section correspondante dans ce fichier
2. Implémenter
3. Cocher la tâche dans `ROADMAP.md`
4. Commit avec message descriptif en français

### Ordre STRICT

```
Phase 1 : Setup → Auth → Layout
Phase 2 : Clients → Projets → Formulaire onboarding
Phase 3 : Portail public → Upload → Portail client auth
Phase 5 : Polish → Stripe → Landing
Phase 6 : Bêta → Lancement
```

**NE PAS commencer une phase avant d'avoir terminé la précédente.**
**NE PAS implémenter les features v2/v3 pendant le MVP.**

---

## 11. RAPPELS IMPORTANTS

- Le nom de l'app n'est PAS encore défini. Utiliser `APP_CONFIG.name` PARTOUT.
- Interface en FRANÇAIS uniquement pour le MVP.
- La facturation = STOCKAGE de documents (upload PDF), PAS de création. Loi facturation électronique FR.
- Fichiers stockés en France. Ne JAMAIS mentionner le fournisseur technique dans l'UI.
- Portail onboarding = SANS compte. Portail client suivi = AVEC compte.
- `nanoid` 12 caractères pour les `public_id` des projets.
- Plan gratuit = **1 projet maximum**. Plan Pro = **14€/mois**.
- plan Pro — **14€/mois**.
- plan agency : 39€/mois
