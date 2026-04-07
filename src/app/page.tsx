import Link from "next/link";
import { APP_CONFIG } from "@/config/app.config";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center space-y-6">
        <h1 className="text-5xl font-bold text-gray-900">{APP_CONFIG.name}</h1>
        <p className="text-xl text-gray-600 max-w-md">{APP_CONFIG.tagline}</p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/login"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Se connecter
          </Link>
          <Link
            href="/signup"
            className="px-6 py-3 bg-white text-blue-600 border border-blue-600 rounded-lg font-medium hover:bg-blue-50 transition-colors"
          >
            S&apos;inscrire
          </Link>
        </div>
      </div>
    </main>
  );
}
