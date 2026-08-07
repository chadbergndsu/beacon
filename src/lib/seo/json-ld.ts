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
      'Beacon is a FACTS alternative for Christian and independent schools — academics, Family Desk communications, and principal operations. Stewarded by Common Cents IP as a volunteer ministry.',
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
    description:
      'FACTS alternative for Christian and independent schools — Family Desk, Dinner Table Digests, and honest ops.',
  }
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: siteUrl(item.path),
    })),
  }
}

export function faqPageJsonLd(faqs: { question: string; answer: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: f.answer,
      },
    })),
  }
}

/** Competitive WebPage markup for /vs/facts */
export function factsCompareWebPageJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Beacon vs FACTS — FACTS alternative for Christian schools',
    url: siteUrl('/vs/facts'),
    description:
      'Honest comparison of Beacon and FACTS (Nelnet). FACTS is not a Christian ministry — Beacon is ministry-stewarded school software with Family Desk communications.',
    isPartOf: {
      '@type': 'WebSite',
      name: 'Beacon',
      url: SITE,
    },
    about: [
      { '@type': 'SoftwareApplication', name: 'Beacon' },
      { '@type': 'Organization', name: 'FACTS', parentOrganization: { '@type': 'Organization', name: 'Nelnet, Inc.' } },
    ],
  }
}

export function softwareApplicationJsonLdFactsAlt() {
  return {
    ...softwareApplicationJsonLd(),
    alternateName: ['Beacon school suite', 'FACTS alternative', 'RenWeb alternative'],
    description:
      'FACTS and RenWeb alternative for Christian and independent schools: Family Desk, Dinner Table Digests, grades, and school-owned tuition — stewarded by Common Cents IP.',
    keywords:
      'FACTS alternative, RenWeb alternative, Christian school software, faith-based SIS, Family Desk',
  }
}
