import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // Règles CSS : laisser Turbopack gérer nativement Tailwind v4
    // PostCSS reste actif pour les builds webpack (production)
  },
};

export default nextConfig;
