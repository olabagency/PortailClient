export const APP_CONFIG = {
  name: "ClientFlow",
  tagline: "Gérez vos projets clients de A à Z",
  description: "Plateforme de gestion de projet client tout-en-un pour freelances et agences.",
  url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",

  // Plans
  plans: {
    free: {
      name: "Gratuit",
      maxProjects: 3,
      maxClientsPerProject: 1,
      maxFormFields: 10,
      maxStorageGB: 1,
      maxTemplates: 1,
    },
    pro: {
      name: "Pro",
      maxProjects: Infinity,
      maxClientsPerProject: Infinity,
      maxFormFields: Infinity,
      maxStorageGB: 20,
      maxTemplates: Infinity,
    },
    agency: {
      name: "Agence",
      maxProjects: Infinity,
      maxClientsPerProject: Infinity,
      maxFormFields: Infinity,
      maxStorageGB: 100,
      maxTemplates: Infinity,
    },
  },

  // Stripe price IDs (à remplir)
  stripe: {
    proPriceId: process.env.STRIPE_PRO_PRICE_ID || "",
    agencyPriceId: process.env.STRIPE_AGENCY_PRICE_ID || "",
    trialDays: 14,
  },

  // Kanban par défaut
  defaultKanbanColumns: [
    { name: "À faire", color: "#6B7280", order: 0 },
    { name: "En cours", color: "#3B82F6", order: 1 },
    { name: "En revue", color: "#F59E0B", order: 2 },
    { name: "Terminé", color: "#10B981", order: 3 },
  ],

  // Types de champs formulaire
  formFieldTypes: [
    { type: "text", label: "Texte court" },
    { type: "textarea", label: "Texte long" },
    { type: "email", label: "Email" },
    { type: "phone", label: "Téléphone" },
    { type: "url", label: "URL / Lien" },
    { type: "date", label: "Date" },
    { type: "select", label: "Liste déroulante" },
    { type: "multiselect", label: "Sélection multiple" },
    { type: "file", label: "Fichier" },
    { type: "password", label: "Mot de passe" },
  ],

  // Metadata
  meta: {
    themeColor: "#3B82F6",
    twitterHandle: "",
  },
} as const;

export type PlanName = keyof typeof APP_CONFIG.plans;
export type FormFieldType = typeof APP_CONFIG.formFieldTypes[number]["type"];
