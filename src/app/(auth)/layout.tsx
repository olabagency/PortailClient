import { APP_CONFIG } from '@/config/app.config'
import Link from 'next/link'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="mb-8">
        <Link href="/" className="text-2xl font-bold text-gray-900">
          {APP_CONFIG.name}
        </Link>
      </div>
      <div className="w-full max-w-md">
        {children}
      </div>
    </div>
  )
}
