import type { Metadata, Viewport } from 'next'
import { cookies } from 'next/headers'
import { Geist, Geist_Mono } from 'next/font/google'
import { DEFAULT_SKIN, SKIN_COOKIE, parseSkinId } from '@/lib/skins/catalog'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL?.trim() || 'https://beacon.commoncentsip.com'
  ),
  applicationName: 'Beacon',
  title: {
    default: 'Beacon · FACTS Alternative for Christian Schools',
    template: '%s · Beacon',
  },
  description:
    'Beacon — FACTS & RenWeb alternative for Christian and independent schools: Family Desk, Dinner Table Digests, grades, and principal operations. Ministry-stewarded by Common Cents IP.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Beacon',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  openGraph: {
    type: 'website',
    siteName: 'Beacon',
    title: 'Beacon · School Suite',
    description:
      'The full school suite for independent schools — academics, family communications, and principal operations.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Beacon · School Suite',
    description:
      'The school suite families actually open — Family Desk, Dinner Table Digests, and honest ops.',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#0a1628' },
    { media: '(prefers-color-scheme: dark)', color: '#020617' },
  ],
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const jar = await cookies()
  const skin = parseSkinId(jar.get(SKIN_COOKIE)?.value || DEFAULT_SKIN)

  return (
    <html
      lang="en"
      data-skin={skin}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* Prevent FOUC: re-apply stored skin before paint when cookie lag */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var k='beacon.skin';var s=localStorage.getItem(k);if(s)document.documentElement.setAttribute('data-skin',s);}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-full min-h-[100dvh] flex flex-col overflow-x-hidden">
        {children}
      </body>
    </html>
  )
}
