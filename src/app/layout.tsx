import type { Metadata } from "next";
import { Inter, DM_Sans, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { APP_CONFIG } from "@/config/app.config";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({ subsets: ["latin"] });

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  variable: "--font-instrument-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: APP_CONFIG.name,
    template: `%s | ${APP_CONFIG.name}`,
  },
  description: APP_CONFIG.description,
  keywords: ["gestion projet", "portail client", "freelance", "onboarding client", "kanban"],
  authors: [{ name: APP_CONFIG.name }],
  creator: APP_CONFIG.name,
  metadataBase: new URL(APP_CONFIG.url),
  openGraph: {
    type: "website",
    siteName: APP_CONFIG.name,
    title: APP_CONFIG.name,
    description: APP_CONFIG.description,
    locale: "fr_FR",
  },
  twitter: {
    card: "summary",
    title: APP_CONFIG.name,
    description: APP_CONFIG.description,
    ...(APP_CONFIG.meta.twitterHandle ? { site: APP_CONFIG.meta.twitterHandle } : {}),
  },
  themeColor: APP_CONFIG.meta.themeColor,
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className={`${inter.className} ${dmSans.variable} ${instrumentSerif.variable}`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
