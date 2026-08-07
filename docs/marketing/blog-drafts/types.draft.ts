export type BlogBlock =
  | { type: 'p'; text: string }
  | { type: 'h2'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'quote'; text: string }

export type BlogPost = {
  slug: string
  title: string
  description: string
  /** ISO date YYYY-MM-DD */
  publishedAt: string
  keywords: string[]
  tags: string[]
  /** Short tease for index cards */
  excerpt: string
  body: BlogBlock[]
}

export function p(text: string): BlogBlock {
  return { type: 'p', text }
}
export function h2(text: string): BlogBlock {
  return { type: 'h2', text }
}
export function ul(items: string[]): BlogBlock {
  return { type: 'ul', items }
}
export function quote(text: string): BlogBlock {
  return { type: 'quote', text }
}
