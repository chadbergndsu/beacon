/**
 * Send family invoice email with pay portal link (no principal session required).
 * Used by office actions, aftercare billing, and future cron digests.
 */

import {
  ensureInvoicePortalToken,
  formatMoney,
  loadBillingState,
  markInvoiceReminded,
} from '@/lib/billing/store'
import { familyPayUrl } from '@/lib/billing/portal-token'
import { queueAndSendEmail } from '@/lib/email/send'
import { loadSchoolBrand } from '@/lib/school-brand'
import { createAdminClient } from '@/lib/supabase/admin'

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export async function sendInvoiceEmailForSchool(
  schoolId: string,
  invoiceId: string,
  opts?: { actorUserId?: string | null; reason?: string }
): Promise<{ ok: true; payUrl: string; status: string } | { ok: false; error: string }> {
  const state = await loadBillingState(schoolId)
  const inv = state.invoices.find((i) => i.id === invoiceId)
  if (!inv) return { ok: false, error: 'Invoice not found.' }
  if (!inv.parentEmail?.includes('@')) {
    return { ok: false, error: 'Invoice has no parent email.' }
  }
  if (inv.status === 'paid' || inv.status === 'void') {
    return { ok: false, error: 'Invoice is not open for collection.' }
  }

  const token = await ensureInvoicePortalToken(schoolId, inv.id)
  const payUrl = familyPayUrl(token)
  const brand = await loadSchoolBrand(schoolId)

  const result = await queueAndSendEmail(
    {
      school_id: schoolId,
      kind: 'invoice',
      to_email: inv.parentEmail.trim(),
      to_name: inv.familyName,
      subject: `${brand.shortName || brand.name}: Invoice · ${inv.description}`,
      body_text: [
        `Hello ${inv.familyName},`,
        '',
        `${brand.name} has an invoice ready for you:`,
        `${inv.description}`,
        `Amount: ${formatMoney(inv.amountCents, inv.currency)}`,
        inv.dueDate ? `Due: ${inv.dueDate}` : '',
        '',
        `View and pay: ${payUrl}`,
        '',
        '— Beacon family billing (school-owned portal)',
      ]
        .filter(Boolean)
        .join('\n'),
      body_html: `<p>Hello ${escapeHtml(inv.familyName)},</p>
<p><strong>${escapeHtml(brand.name)}</strong> has an invoice ready:</p>
<p>${escapeHtml(inv.description)}<br/>
<strong>${escapeHtml(formatMoney(inv.amountCents, inv.currency))}</strong>
${inv.dueDate ? `<br/>Due ${escapeHtml(inv.dueDate)}` : ''}</p>
<p><a href="${payUrl}">View &amp; pay online</a></p>
<p style="color:#64748b;font-size:12px">Beacon family portal — owned by your school.</p>`,
      related_table: 'billing_invoices',
      related_id: inv.id,
      meta: { portal: true, reason: opts?.reason || 'manual' },
    },
    { brand }
  )

  await markInvoiceReminded(schoolId, inv.id)

  const admin = createAdminClient()
  await admin.from('audit_logs').insert({
    school_id: schoolId,
    user_id: opts?.actorUserId || null,
    action: 'billing.invoice_emailed',
    table_name: 'billing_invoices',
    record_id: inv.id,
    details: {
      status: result.status,
      payUrl,
      reason: opts?.reason || 'manual',
    },
  })

  if (result.status === 'failed') {
    return { ok: false, error: result.error || 'Email failed.' }
  }
  return { ok: true, payUrl, status: result.status }
}

/** Open invoices for a parent email at a school (family dashboard). */
export async function listOpenInvoicesForParentEmail(
  schoolId: string,
  parentEmail: string
): Promise<
  {
    id: string
    description: string
    familyName: string
    amountCents: number
    currency: string
    status: string
    dueDate: string | null
    payUrl: string | null
    createdAt: string
  }[]
> {
  const email = parentEmail.trim().toLowerCase()
  if (!email.includes('@')) return []
  const state = await loadBillingState(schoolId)
  const open = state.invoices.filter(
    (i) =>
      i.parentEmail?.toLowerCase() === email &&
      (i.status === 'open' || i.status === 'overdue' || i.status === 'paid')
  )
  const out = []
  for (const inv of open.slice(0, 30)) {
    let payUrl: string | null = null
    if (inv.status === 'open' || inv.status === 'overdue') {
      try {
        const token = await ensureInvoicePortalToken(schoolId, inv.id)
        payUrl = familyPayUrl(token)
      } catch {
        payUrl = inv.portalToken ? familyPayUrl(inv.portalToken) : null
      }
    }
    out.push({
      id: inv.id,
      description: inv.description,
      familyName: inv.familyName,
      amountCents: inv.amountCents,
      currency: inv.currency,
      status: inv.status,
      dueDate: inv.dueDate,
      payUrl,
      createdAt: inv.createdAt,
    })
  }
  return out
}
