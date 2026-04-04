# CLAUDE.md — Prompt de développement principal

Tu es le développeur principal de cette application SaaS. Ce fichier contient TOUTES les instructions pour développer l'application. Lis-le en entier avant d'écrire la moindre ligne de code.

---

## 1. VISION PRODUIT

Plateforme de gestion de projet client tout-en-un pour freelances et agences. Le cycle complet : onboarding client → suivi de projet (kanban) → validation d'étapes → messagerie → stockage de documents (devis/factures) → rendez-vous (Google Calendar/Meet) → portail client dédié.

**Cible** : Freelances web/dev et community managers francophones.
**Modèle** : Freemium (gratuit limité → plans payants).
**Langue de l'interface** : Français.

---

## 2. CONFIGURATION DE L'APPLICATION

Toute la configuration est centralisée dans `src/config/app.config.ts`. **Ne jamais hardcoder** le nom de l'app, les couleurs, les limites de plans, ou les URLs dans les composants. Toujours importer depuis ce fichier. Voir le fichier `src/config/app.config.ts` pour le contenu complet.

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

---

## 6. FLUX DE DÉVELOPPEMENT

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
Phase 4 : Kanban → Templates → Activité
Phase 5 : Polish → Stripe → Landing
Phase 6 : Bêta → Lancement
```

**NE PAS commencer une phase avant d'avoir terminé la précédente.**
**NE PAS implémenter les features v2/v3 pendant le MVP.**

---

## 7. RAPPELS IMPORTANTS

- Le nom de l'app n'est PAS encore défini. Utiliser `APP_CONFIG.name` PARTOUT.
- Interface en FRANÇAIS uniquement pour le MVP.
- La facturation = STOCKAGE de documents (upload PDF), PAS de création. Loi facturation électronique FR.
- Fichiers stockés en France. Ne JAMAIS mentionner le fournisseur technique dans l'UI.
- Portail onboarding = SANS compte. Portail client suivi = AVEC compte.
- `nanoid` 12 caractères pour les `public_id` des projets.
- Colonnes kanban par défaut créées automatiquement ("À faire", "En cours", "En revue", "Terminé").
