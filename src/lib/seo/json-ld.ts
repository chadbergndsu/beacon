const SITE =
  process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, '') ||
  'https://beacon.commoncentsip.com'

export function siteUrl(path = '/'): string {
  const p = path.startsWith('/') ? path : `/${path}`
  return `${SITE}${p === '/' ? '' : p}`
}

export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Beacon',
    legalName: 'Common Cents IP',
    url: SITE,
    logo: `${SITE}/icons/icon-512.png`,
    email: 'office@commoncentsip.com',
    description:
      'Beacon is the full school suite for independent schools — academics, family communications, and principal operations.',
    sameAs: [],
  }
}

export function softwareApplicationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Beacon',
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Web, iOS, Android',
    url: SITE,
    description:
      'School operations software with Family Desk communications, Dinner Table Digests, grades, and optional tuition payments.',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      description: 'Contact for school pilots and pricing',
    },
    provider: {
      '@type': 'Organization',
      name: 'Common Cents IP',
    },
  }
}

export function webSiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Beacon',
    url: SITE,
    description: 'The school suite families actually open.',
  }
}
