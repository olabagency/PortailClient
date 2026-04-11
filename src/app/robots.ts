import { MetadataRoute } from 'next'
import { APP_CONFIG } from '@/config/app.config'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/login', '/signup', '/mentions-legales', '/confidentialite'],
        disallow: ['/dashboard/', '/client/', '/api/', '/p/'],
      },
    ],
    sitemap: `${APP_CONFIG.url}/sitemap.xml`,
  }
}
