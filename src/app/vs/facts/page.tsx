import { redirect } from 'next/navigation'

/** Canonical compare lives on About — keep /vs/facts as a stable SEO/share URL. */
export default function VsFactsRedirectPage() {
  redirect('/about#vs-facts')
}
