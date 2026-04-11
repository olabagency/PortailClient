# ROADMAP.md — Progression du développement

> Coche chaque tâche quand elle est terminée et fonctionnelle.
> Ne passe à la phase suivante que quand la phase actuelle est complète.

---

## Phase 1 — Setup + Auth + Layout

### 1.1 Initialisation du projet
- [x] Créer le projet Next.js 14+ avec App Router et TypeScript
- [x] Installer et configurer Tailwind CSS
- [x] Installer et configurer shadcn/ui (init + composants de base : Button, Input, Card, Dialog, Toast, Dropdown, Avatar, Badge, Skeleton, Tabs, Table)
- [x] Créer `src/config/app.config.ts` avec toute la configuration centralisée
- [x] Créer `.env.example` avec toutes les variables d'environnement
- [x] Créer `.env.local` avec les vrais credentials (non committé)
- [x] Configurer Drizzle ORM + connexion Supabase
- [x] Créer la structure de dossiers complète
- [x] Configurer le `layout.tsx` racine (fonts, metadata depuis APP_CONFIG)
- [x] Vérifier que `npm run dev` fonctionne sans erreur

### 1.2 Base de données
- [x] Créer le projet Supabase (région EU)
- [x] Exécuter toutes les migrations MVP (001 à 012)
- [x] Vérifier que toutes les tables existent dans Supabase Dashboard

### 1.3 Authentification
- [ ] Configurer Supabase Auth (email + Google OAuth provider)
- [x] Créer les clients Supabase (browser + server + middleware)
- [x] Page `/login` — connexion email + Google OAuth
- [x] Page `/signup` — inscription avec nom, email, mot de passe
- [x] Page `/forgot-password` — envoi du lien de reset
- [x] Middleware Next.js pour rediriger les non-authentifiés
- [x] Hook `useAuth` — utilisateur courant, logout, session
- [ ] Vérifier : inscription → profil créé automatiquement
- [ ] Vérifier : connexion → redirection `/dashboard`
- [ ] Vérifier : déconnexion → redirection `/login`

### 1.4 Layout Dashboard
- [x] Layout `(dashboard)/layout.tsx` avec sidebar + header
- [x] Composant `Sidebar.tsx` — navigation principale
- [x] Composant `Header.tsx` — nom app (APP_CONFIG), avatar, menu dropdown
- [x] Sidebar responsive (collapse sur mobile)
- [x] Page `/dashboard` — placeholder bienvenue
- [x] Page `/dashboard/settings` — formulaire profil complet
- [ ] Upload du logo vers S3 + sauvegarde URL
- [x] Navigation entre toutes les pages fonctionne

---

## Phase 2 — Clients + Projets + Formulaire d'onboarding

### 2.1 Gestion des clients
- [x] API CRUD clients (POST, GET, GET/:id, PUT, DELETE) avec validation Zod
- [x] Page `/dashboard/clients` — liste avec recherche, filtre, tri
- [x] Page `/dashboard/clients/[id]` — fiche client + liste projets
- [x] Modal de création de client
- [x] EmptyState quand aucun client

### 2.2 Gestion des projets
- [x] API CRUD projets avec génération public_id (nanoid 12)
- [x] API duplication de projet
- [x] Vérification limites du plan avant création
- [x] Page `/dashboard/projects` — liste avec statuts, recherche, filtres
- [x] Page `/dashboard/projects/new` — formulaire création
- [x] Création client possible depuis la création projet
- [x] Création auto des 4 colonnes kanban par défaut
- [x] EmptyState quand aucun projet

### 2.3 Éditeur de formulaire d'onboarding
- [x] API CRUD champs (GET, POST, PUT, DELETE, reorder)
- [x] Page `/dashboard/projects/[id]/onboarding` — éditeur
- [x] Composant `FormEditor.tsx` — ajout/édition de champs
- [x] 9 types de champs supportés
- [x] Sections (ajouter, renommer, réordonner)
- [x] Drag & drop champs et sections (@dnd-kit)
- [x] Obligatoire/optionnel + description par champ
- [x] Vérification limites plan (max champs)
- [x] Aperçu du formulaire

---

## Phase 3 — Portail client + Upload fichiers

### 3.1 Portail d'onboarding public (sans compte)
- [x] API `GET /api/portal/[publicId]` — données formulaire (public)
- [x] API `POST /api/portal/[publicId]/submit` — soumettre réponse
- [x] Page `/p/[publicId]` — formulaire avec branding freelance
- [x] Composant `FieldRenderer.tsx` — rendu par type de champ
- [x] Sauvegarde auto de la progression (debounce 2s)
- [x] Barre de progression globale
- [ ] Protection PIN (optionnel)
- [x] Page `/p/[publicId]/success` — confirmation + invitation compte
- [x] Email au freelance quand onboarding complété

### 3.2 Upload de fichiers (Scaleway S3)
- [ ] Configurer Scaleway S3 (bucket, CORS)
- [x] Client S3 + génération presigned URLs
- [x] API presign + confirm + download + delete + zip
- [x] Composant `FileUploader.tsx` — drag & drop + progression
- [x] Upload direct vers S3 (pas de transit serveur)
- [x] Affichage fichiers dans la vue projet

### 3.3 Portail client authentifié
- [x] Page `/client/login` + `/client/signup/[token]`
- [ ] API invitation client par email
- [x] Layout client avec sidebar simplifiée
- [x] Page `/client` — dashboard (liste projets + progression)
- [x] Page `/client/projects/[id]` — vue projet (avancement, étapes, deadlines)
- [x] Page `/client/projects/[id]/files` — fichiers (download only)
- [x] Page `/client/settings` — paramètres compte
- [x] Client ne voit QUE ses projets et tâches visibles
- [ ] Notifications email au client

### 3.4 Page partage de projet
- [x] Page `/dashboard/projects/[id]/share` — lien unique
- [x] Bouton copier le lien
- [ ] Configuration PIN
- [x] Aperçu du portail
- [x] Envoi du lien par email

---

## Phase 4 — Kanban + Templates + Activité

### 4.1 Kanban
- [x] API CRUD colonnes + tâches + reorder
- [x] Page `/dashboard/projects/[id]` — vue kanban complète
- [x] Composants : KanbanBoard, KanbanColumn, TaskCard, TaskModal
- [x] Drag & drop tâches entre colonnes (@dnd-kit)
- [x] Colonnes personnalisables (ajouter, renommer, supprimer, couleur)
- [x] Toggle visibilité client par tâche
- [x] Vue liste alternative
- [x] Filtres par statut, priorité, assignation

### 4.2 Templates
- [x] API CRUD templates
- [x] Page `/dashboard/templates` — liste
- [x] Sauvegarder formulaire + kanban comme template
- [x] Créer projet depuis template
- [x] 4 templates pré-configurés injectés au premier lancement
- [x] Vérification limites plan

### 4.3 Journal d'activité
- [x] Enregistrement des actions clés dans activity_log
- [x] Affichage dans la vue projet
- [x] Affichage dans le dashboard principal

### 4.4 Dashboard principal
- [x] Métriques (projets actifs, clients, tâches en cours)
- [x] Projets récents avec progression
- [x] Activité récente
- [x] Raccourcis (créer projet, voir projets, voir clients)

---

## Phase 5 — Polish + Stripe + Landing page

### 5.1 Polish UX
- [ ] Responsive complet (4 breakpoints)
- [ ] EmptyStates sur toutes les pages
- [ ] Loading states (Skeletons)
- [ ] Messages d'erreur (toasts)
- [ ] Confirmation avant suppression
- [ ] Optimisation images + performance
- [x] Favicon + meta tags + Open Graph

### 5.2 Stripe
- [ ] Configurer Stripe (produits, prix, webhook)
- [x] API checkout + webhook + portal
- [x] Page `/dashboard/settings/billing`
- [ ] Logique de limitation par plan
- [x] Période d'essai Pro 14 jours
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
