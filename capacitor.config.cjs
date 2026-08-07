/**
 * Capacitor store shells — thin native wrappers around the live Beacon web app.
 *
 * Why server.url (not static export):
 * Beacon is an authenticated App Router app (server actions, Supabase, APIs).
 * Shipping a static snapshot would break auth and money paths.
 *
 * Setup (machine with Xcode / Android Studio):
 *   npm i -D @capacitor/cli @capacitor/core
 *   npm i @capacitor/ios @capacitor/android
 *   npx cap add ios && npx cap add android
 *   npm run cap:sync
 *
 * See docs/store-launch.md and docs/adr/002-store-shells-capacitor.md
 *
 * @type {import('@capacitor/cli').CapacitorConfig}
 */
const prodUrl =
  process.env.BEACON_CAPACITOR_SERVER_URL?.trim() ||
  process.env.NEXT_PUBLIC_APP_URL?.trim() ||
  'https://beacon.commoncentsip.com'

/** @type {import('@capacitor/cli').CapacitorConfig} */
const config = {
  appId: 'com.commoncentsip.beacon',
  appName: 'Beacon',
  webDir: 'public',
  server: {
    url: prodUrl.replace(/\/$/, ''),
    cleartext: false,
    allowNavigation: [
      'beacon.commoncentsip.com',
      '*.vercel.app',
      '*.supabase.co',
    ],
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      backgroundColor: '#0a1628',
    },
  },
  ios: {
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
    scheme: 'Beacon',
  },
  android: {
    allowMixedContent: false,
    backgroundColor: '#0a1628',
  },
}

module.exports = config
