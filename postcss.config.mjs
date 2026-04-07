// Tailwind v4 via PostCSS — requis pour la génération des classes utilitaires
// (scan des fichiers source + résolution des @import depuis node_modules)
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
