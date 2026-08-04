/**
 * When multiple printables share one page, scope window.print() to one section.
 * Sets body[data-print-section] so CSS can hide siblings during print.
 */
export function printScopedSection(sectionId: string) {
  if (typeof document === 'undefined') return
  document.body.dataset.printSection = sectionId
  const cleanup = () => {
    delete document.body.dataset.printSection
    window.removeEventListener('afterprint', cleanup)
  }
  window.addEventListener('afterprint', cleanup)
  window.print()
  // Fallback if afterprint is flaky (some browsers)
  window.setTimeout(cleanup, 2000)
}
