import { z } from 'zod'

export const designPartnerInquirySchema = z.object({
  name: z.string().trim().min(2).max(80),
  role: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email().max(160),
  school: z.string().trim().min(2).max(120),
  enrollment: z.string().trim().max(40).optional(),
  currentSystems: z.string().trim().max(240).optional(),
  priority: z.string().trim().min(10).max(1200),
  website: z.string().max(200).optional(),
})

function safeSchoolKey(value: string | undefined): string | null {
  const normalized = value?.trim()
  if (!normalized || normalized.length > 120 || !/^[a-zA-Z0-9_-]+$/.test(normalized)) {
    return null
  }
  return normalized
}

export function buildSchoolContextLinks(input: {
  school?: string
  slug?: string
}): { schoolHref: string; beaconHref: string; trustHref: string } {
  const school = safeSchoolKey(input.school)
  if (school) {
    const query = `school=${encodeURIComponent(school)}`
    return {
      schoolHref: `/school?${query}`,
      beaconHref: `/about?${query}`,
      trustHref: `/privacy?${query}`,
    }
  }

  const slug = safeSchoolKey(input.slug)
  if (slug) {
    const query = `slug=${encodeURIComponent(slug)}`
    return {
      schoolHref: `/school?${query}`,
      beaconHref: `/about?${query}`,
      trustHref: `/privacy?${query}`,
    }
  }

  return { schoolHref: '/school', beaconHref: '/about', trustHref: '/privacy' }
}
