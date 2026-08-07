import type { MetadataRoute } from 'next'

const SITE =
  process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, '') ||
  'https://beacon.commoncentsip.com'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/about', '/school', '/privacy', '/terms'],
        disallow: [
          '/login',
          '/dashboard',
          '/admin',
          '/principal',
          '/teacher',
          '/students',
          '/classes',
          '/settings',
          '/desk',
          '/messages',
          '/api/',
          '/kiosk',
          '/pay/',
          '/craft',
        ],
      },
    ],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  }
}
