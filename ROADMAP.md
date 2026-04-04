# ROADMAP.md — Progression du développement

> Coche chaque tâche quand elle est terminée et fonctionnelle.
> Ne passe à la phase suivante que quand la phase actuelle est complète.

---

## Phase 1 — Setup + Auth + Layout

### 1.1 Initialisation du projet
- [ ] Créer le projet Next.js 14+ avec App Router et TypeScript
- [ ] Installer et configurer Tailwind CSS
- [ ] Installer et configurer shadcn/ui (init + composants de base : Button, Input, Card, Dialog, Toast, Dropdown, Avatar, Badge, Skeleton, Tabs, Table)
- [ ] Créer `src/config/app.config.ts` avec toute la configuration centralisée
- [ ] Créer `.env.example` avec toutes les variables d'environnement
- [ ] Créer `.env.local` avec les vrais credentials (non committé)
- [ ] Configurer Drizzle ORM + connexion Supabase
- [ ] Créer la structure de dossiers complète
- [ ] Configurer le `layout.tsx` racine (fonts, metadata depuis APP_CONFIG)
- [ ] Vérifier que `npm run dev` fonctionne sans erreur

### 1.2 Base de données
- [ ] Créer le projet Supabase (région EU)
- [ ] Exécuter toutes les migrations MVP (001 à 012)
- [ ] Vérifier que toutes les tables existent dans Supabase Dashboard

### 1.3 Authentification
- [ ] Configurer Supabase Auth (email + Google OAuth provider)
- [ ] Créer les clients Supabase (browser + server + middleware)
- [ ] Page `/login` — connexion email + Google OAuth
- [ ] Page `/signup` — inscription avec nom, email, mot de passe
- [ ] Page `/forgot-password` — envoi du lien de reset
- [ ] Middleware Next.js pour rediriger les non-authentifiés
- [ ] Hook `useAuth` — utilisateur courant, logout, session
- [ ] Vérifier : inscription → profil créé automatiquement
- [ ] Vérifier : connexion → redirection `/dashboard`
- [ ] Vérifier : déconnexion → redirection `/login`

### 1.4 Layout Dashboard
- [ ] Layout `(dashboard)/layout.tsx` avec sidebar + header
- [ ] Composant `Sidebar.tsx` — navigation principale
- [ ] Composant `Header.tsx` — nom app (APP_CONFIG), avatar, menu dropdown
- [ ] Sidebar responsive (collapse sur mobile)
- [ ] Page `/dashboard` — placeholder bienvenue
- [ ] Page `/dashboard/settings` — formulaire profil complet
- [ ] Upload du logo vers S3 + sauvegarde URL
- [ ] Navigation entre toutes les pages fonctionne

---

## Phase 2 — Clients + Projets + Formulaire d'onboarding

### 2.1 Gestion des clients
- [ ] API CRUD clients (POST, GET, GET/:id, PUT, DELETE) avec validation Zod
- [ ] Page `/dashboard/clients` — liste avec recherche, filtre, tri
- [ ] Page `/dashboard/clients/[id]` — fiche client + liste projets
- [ ] Modal de création de client
- [ ] EmptyState quand aucun client

### 2.2 Gestion des projets
- [ ] API CRUD projets avec génération public_id (nanoid 12)
- [ ] API duplication de projet
- [ ] Vérification limites du plan avant création
- [ ] Page `/dashboard/projects` — liste avec statuts, recherche, filtres
- [ ] Page `/dashboard/projects/new` — formulaire création
- [ ] Création client possible depuis la création projet
- [ ] Création auto des 4 colonnes kanban par défaut
- [ ] EmptyState quand aucun projet

### 2.3 Éditeur de formulaire d'onboarding
- [ ] API CRUD champs (GET, POST, PUT, DELETE, reorder)
- [ ] Page `/dashboard/projects/[id]/onboarding` — éditeur
- [ ] Composant `FormEditor.tsx` — ajout/édition de champs
- [ ] 9 types de champs supportés
- [ ] Sections (ajouter, renommer, réordonner)
- [ ] Drag & drop champs et sections (@dnd-kit)
- [ ] Obligatoire/optionnel + description par champ
- [ ] Vérification limites plan (max champs)
- [ ] Aperçu du formulaire

---

## Phase 3 — Portail client + Upload fichiers

### 3.1 Portail d'onboarding public (sans compte)
- [ ] API `GET /api/portal/[publicId]` — données formulaire (public)
- [ ] API `POST /api/portal/[publicId]/submit` — soumettre réponse
- [ ] Page `/p/[publicId]` — formulaire avec branding freelance
- [ ] Composant `FieldRenderer.tsx` — rendu par type de champ
- [ ] Sauvegarde auto de la progression (debounce 2s)
- [ ] Barre de progression globale
- [ ] Protection PIN (optionnel)
- [ ] Page `/p/[publicId]/success` — confirmation + invitation compte
- [ ] Email au freelance quand onboarding complété

### 3.2 Upload de fichiers (Scaleway S3)
- [ ] Configurer Scaleway S3 (bucket, CORS)
- [ ] Client S3 + génération presigned URLs
- [ ] API presign + confirm + download + delete + zip
- [ ] Composant `FileUploader.tsx` — drag & drop + progression
- [ ] Upload direct vers S3 (pas de transit serveur)
- [ ] Affichage fichiers dans la vue projet

### 3.3 Portail client authentifié
- [ ] Page `/client/login` + `/client/signup/[token]`
- [ ] API invitation client par email
- [ ] Layout client avec sidebar simplifiée
- [ ] Page `/client` — dashboard (liste projets + progression)
- [ ] Page `/client/projects/[id]` — vue projet (avancement, étapes, deadlines)
- [ ] Page `/client/projects/[id]/files` — fichiers (download only)
- [ ] Page `/client/settings` — paramètres compte
- [ ] Client ne voit QUE ses projets et tâches visibles
- [ ] Notifications email au client

### 3.4 Page partage de projet
- [ ] Page `/dashboard/projects/[id]/share` — lien unique
- [ ] Bouton copier le lien
- [ ] Configuration PIN
- [ ] Aperçu du portail
- [ ] Envoi du lien par email

---

## Phase 4 — Kanban + Templates + Activité

### 4.1 Kanban
- [ ] API CRUD colonnes + tâches + reorder
- [ ] Page `/dashboard/projects/[id]` — vue kanban complète
- [ ] Composants : KanbanBoard, KanbanColumn, TaskCard, TaskModal
- [ ] Drag & drop tâches entre colonnes (@dnd-kit)
- [ ] Colonnes personnalisables (ajouter, renommer, supprimer, couleur)
- [ ] Toggle visibilité client par tâche
- [ ] Vue liste alternative
- [ ] Filtres par statut, priorité, assignation

### 4.2 Templates
- [ ] API CRUD templates
- [ ] Page `/dashboard/templates` — liste
- [ ] Sauvegarder formulaire + kanban comme template
- [ ] Créer projet depuis template
- [ ] 4 templates pré-configurés injectés au premier lancement
- [ ] Vérification limites plan

### 4.3 Journal d'activité
- [ ] Enregistrement des actions clés dans activity_log
- [ ] Affichage dans la vue projet
- [ ] Affichage dans le dashboard principal

### 4.4 Dashboard principal
- [ ] Métriques (projets actifs, clients, complétion)
- [ ] Projets récents avec progression
- [ ] Activité récente
- [ ] Raccourcis (créer projet, voir projets, voir clients)

---

## Phase 5 — Polish + Stripe + Landing page

### 5.1 Polish UX
- [ ] Responsive complet (4 breakpoints)
- [ ] EmptyStates sur toutes les pages
- [ ] Loading states (Skeletons)
- [ ] Messages d'erreur (toasts)
- [ ] Confirmation avant suppression
- [ ] Optimisation images + performance
- [ ] Favicon + meta tags + Open Graph

### 5.2 Stripe
- [ ] Configurer Stripe (produits, prix, webhook)
- [ ] API checkout + webhook + portal
- [ ] Page `/dashboard/settings/billing`
- [ ] Logique de limitation par plan
- [ ] Période d'essai Pro 14 jours
- [ ] Gestion du downgrade

### 5.3 Landing page
- [ ] Intégrer la landing page en Next.js
- [ ] Connecter waitlist à Supabase
- [ ] Page pricing
- [ ] SEO (meta, sitemap, robots.txt)
- [ ] Pages légales (mentions, confidentialité, CGV)

---

## Phase 6 — Bêta + Lancement

### 6.1 Pré-lancement
- [ ] Tests end-to-end manuels
- [ ] Tests mobile
- [ ] Vérifier emails, presigned URLs, RLS
- [ ] Configurer backup Supabase
- [ ] Déployer sur Vercel + pointer domaine
- [ ] Configurer Resend avec domaine

### 6.2 Bêta privée
- [ ] Inviter 15-20 freelances
- [ ] Collecter retours (2 semaines)
- [ ] Corriger bugs critiques
- [ ] Ajuster UX

### 6.3 Lancement public
- [ ] Landing page mise à jour (screenshots, témoignages)
- [ ] 2 articles SEO
- [ ] Product Hunt + Reddit + Twitter/X + LinkedIn
- [ ] Communautés freelances FR

---

## [FUTUR] v2 — Validation + Documents + Messagerie

> NE PAS IMPLÉMENTER AVANT LA FIN DU MVP

- [ ] Deliverables : table + API + workflow validation + interface review client
- [ ] Messages : table + API + chat par projet + internes vs client
- [ ] Documents : upload devis/factures PDF + suivi statuts
- [ ] Notifications email par changement de statut

## [FUTUR] v3 — Google Workspace + Réunions

> NE PAS IMPLÉMENTER AVANT LA FIN DE LA V2

- [ ] Google OAuth (Calendar + Meet scopes) + tokens chiffrés
- [ ] Sync Google Calendar + création Meet auto
- [ ] Réservation créneaux côté client
- [ ] Comptes rendus (Tiptap) + points d'action → tâches
- [ ] Vue calendrier (FullCalendar)

## [FUTUR] v4 — Scale + Intégrations

> NE PAS IMPLÉMENTER AVANT LA FIN DE LA V3

- [ ] Marque blanche + multi-utilisateurs + rôles
- [ ] Paiement Stripe des factures + webhooks Zapier/Make
- [ ] Relances auto + export données + analytics + API publique
