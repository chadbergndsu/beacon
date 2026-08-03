/**
 * School-branded email shells — families see their school, not a faceless portal.
 */

import type { SchoolBrand } from '@/lib/school-brand'
import type { DinnerTableDigest } from '@/lib/insights/dinner-table'

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function subjectTag(brand: Pick<SchoolBrand, 'shortName' | 'name'>): string {
  return brand.shortName || brand.name || 'Beacon'
}

/** Display From: "Lighthouse Academy via Beacon <office@…>" */
export function fromDisplayName(brand: Pick<SchoolBrand, 'name' | 'shortName'>): string {
  const name = brand.name || brand.shortName || 'Beacon'
  return `${name} via Beacon`
}

export function resolveReplyTo(brand: Pick<SchoolBrand, 'email'>): string | undefined {
  const e = brand.email?.trim()
  if (e && e.includes('@')) return e
  const envReply = process.env.EMAIL_REPLY_TO?.trim()
  if (envReply && envReply.includes('@')) return envReply
  return undefined
}

export function brandedEmailShell(opts: {
  brand: Pick<SchoolBrand, 'name' | 'shortName' | 'email' | 'phone' | 'websiteUrl'>
  eyebrow: string
  title?: string
  bodyHtml: string
  footerNote?: string
  ctaLabel?: string
  ctaHref?: string
}): string {
  const school = escapeHtml(opts.brand.name || 'Your school')
  const contactBits: string[] = []
  if (opts.brand.email) {
    contactBits.push(
      `<a href="mailto:${escapeHtml(opts.brand.email)}" style="color:#0369a1;text-decoration:none">${escapeHtml(opts.brand.email)}</a>`
    )
  }
  if (opts.brand.phone) contactBits.push(escapeHtml(opts.brand.phone))
  if (opts.brand.websiteUrl) {
    contactBits.push(
      `<a href="${escapeHtml(opts.brand.websiteUrl)}" style="color:#0369a1;text-decoration:none">Website</a>`
    )
  }

  const cta =
    opts.ctaHref && opts.ctaLabel
      ? `<p style="margin:24px 0 8px">
          <a href="${escapeHtml(opts.ctaHref)}"
             style="display:inline-block;background:#0369a1;color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 20px;border-radius:10px">
            ${escapeHtml(opts.ctaLabel)}
          </a>
        </p>`
      : ''

  const footer =
    opts.footerNote ||
    (opts.brand.email
      ? `Questions? Reply to this email or contact ${opts.brand.email}.`
      : 'Open Beacon for the full school picture.')

  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f1f5f9">
  <div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:560px;margin:0 auto;padding:24px 16px">
    <div style="background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 1px 3px rgba(15,23,42,.06)">
      <div style="background:linear-gradient(135deg,#0c4a6e,#0369a1);padding:18px 22px">
        <p style="margin:0;color:#bae6fd;font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase">
          ${escapeHtml(opts.eyebrow)}
        </p>
        <p style="margin:6px 0 0;color:#fff;font-size:18px;font-weight:700">${school}</p>
      </div>
      <div style="padding:22px;line-height:1.55;color:#0f172a">
        ${opts.title ? `<h1 style="font-size:20px;margin:0 0 14px;font-weight:700;line-height:1.3">${escapeHtml(opts.title)}</h1>` : ''}
        ${opts.bodyHtml}
        ${cta}
      </div>
      <div style="padding:14px 22px 18px;background:#f8fafc;border-top:1px solid #e2e8f0">
        <p style="margin:0;color:#64748b;font-size:12px;line-height:1.5">${escapeHtml(footer)}</p>
        ${
          contactBits.length
            ? `<p style="margin:8px 0 0;color:#94a3b8;font-size:12px">${contactBits.join(' · ')}</p>`
            : ''
        }
        <p style="margin:10px 0 0;color:#cbd5e1;font-size:11px">Sent with Beacon school suite</p>
      </div>
    </div>
  </div>
</body>
</html>`
}

export function plainFooter(brand: Pick<SchoolBrand, 'name' | 'email' | 'phone'>): string {
  const lines = [`— ${brand.name || 'Your school'}`]
  if (brand.email) lines.push(brand.email)
  if (brand.phone) lines.push(brand.phone)
  lines.push('', 'Sent with Beacon school suite')
  return lines.join('\n')
}

export function announcementBodies(opts: {
  brand: SchoolBrand
  title: string
  body: string
  author: string
  appUrl?: string
}): { text: string; html: string } {
  const text = [
    opts.title,
    '',
    opts.body,
    '',
    `— ${opts.author}`,
    plainFooter(opts.brand),
  ].join('\n')

  const html = brandedEmailShell({
    brand: opts.brand,
    eyebrow: 'School announcement',
    title: opts.title,
    bodyHtml: `
      <div style="white-space:pre-wrap;color:#0f172a;font-size:15px">${escapeHtml(opts.body)}</div>
      <p style="margin-top:20px;color:#64748b;font-size:13px">— ${escapeHtml(opts.author)}</p>
    `,
    ctaLabel: opts.appUrl ? 'Open in Beacon' : undefined,
    ctaHref: opts.appUrl,
    footerNote: opts.brand.email
      ? `Questions? Reply to this email or write ${opts.brand.email}.`
      : undefined,
  })

  return { text, html }
}

export function familyMessageBodies(opts: {
  brand: SchoolBrand
  subject: string
  body: string
  author: string
  appUrl?: string
}): { text: string; html: string } {
  const text = [
    `Hello,`,
    '',
    opts.body,
    '',
    `— ${opts.author}`,
    plainFooter(opts.brand),
  ].join('\n')

  const html = brandedEmailShell({
    brand: opts.brand,
    eyebrow: 'Message from school',
    title: opts.subject,
    bodyHtml: `
      <div style="white-space:pre-wrap;color:#0f172a;font-size:15px">${escapeHtml(opts.body)}</div>
      <p style="margin-top:20px;color:#64748b;font-size:13px">— ${escapeHtml(opts.author)}</p>
    `,
    ctaLabel: opts.appUrl ? 'Open Beacon' : undefined,
    ctaHref: opts.appUrl,
  })

  return { text, html }
}

export function gradeNoticeBodies(opts: {
  brand: SchoolBrand
  parentName: string
  studentName: string
  className: string
  overall: string
  formula: string
  appUrl?: string
}): { text: string; html: string } {
  const text = [
    `Hello ${opts.parentName || 'Parent'},`,
    '',
    `Grades were updated for ${opts.studentName} in ${opts.className}.`,
    '',
    `Current overall: ${opts.overall}`,
    '',
    opts.formula,
    '',
    'Open Beacon to see the full transparent breakdown.',
    '',
    plainFooter(opts.brand),
  ].join('\n')

  const html = brandedEmailShell({
    brand: opts.brand,
    eyebrow: 'Grade update',
    bodyHtml: `
      <p>Hello ${escapeHtml(opts.parentName || 'Parent')},</p>
      <p>Grades were updated for <strong>${escapeHtml(opts.studentName)}</strong> in <strong>${escapeHtml(opts.className)}</strong>.</p>
      <p style="font-size:22px;font-weight:700;margin:16px 0;color:#0c4a6e">Current overall: ${escapeHtml(opts.overall)}</p>
      <p style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:13px;background:#f8fafc;padding:12px;border-radius:8px;border:1px solid #e2e8f0">${escapeHtml(opts.formula)}</p>
    `,
    ctaLabel: opts.appUrl ? 'View transparent grades' : undefined,
    ctaHref: opts.appUrl,
  })

  return { text, html }
}

export function attendanceNoticeBodies(opts: {
  brand: SchoolBrand
  parentName: string
  studentName: string
  className: string
  date: string
  statusLabel: string
  note?: string
  appUrl?: string
}): { text: string; html: string } {
  const text = [
    `Hello ${opts.parentName || 'Parent'},`,
    '',
    `Attendance update for ${opts.studentName} in ${opts.className}:`,
    `${opts.statusLabel} on ${opts.date}`,
    opts.note ? `Note: ${opts.note}` : '',
    '',
    plainFooter(opts.brand),
  ]
    .filter(Boolean)
    .join('\n')

  const html = brandedEmailShell({
    brand: opts.brand,
    eyebrow: 'Attendance notice',
    bodyHtml: `
      <p>Hello ${escapeHtml(opts.parentName || 'Parent')},</p>
      <p>Attendance update for <strong>${escapeHtml(opts.studentName)}</strong> in <strong>${escapeHtml(opts.className)}</strong>.</p>
      <div style="margin:16px 0;padding:14px 16px;border-radius:12px;background:#fff7ed;border:1px solid #fed7aa">
        <p style="margin:0;font-size:18px;font-weight:700;color:#9a3412">${escapeHtml(opts.statusLabel)}</p>
        <p style="margin:6px 0 0;color:#9a3412;font-size:14px">${escapeHtml(opts.date)}</p>
        ${opts.note ? `<p style="margin:10px 0 0;color:#78350f;font-size:13px">Note: ${escapeHtml(opts.note)}</p>` : ''}
      </div>
      <p style="color:#64748b;font-size:13px">If this is unexpected, please contact the school office.</p>
    `,
    ctaLabel: opts.appUrl ? 'Open Beacon' : undefined,
    ctaHref: opts.appUrl,
  })

  return { text, html }
}

export function dinnerDigestBodies(opts: {
  brand: SchoolBrand
  parentName: string
  digest: DinnerTableDigest
  appUrl?: string
}): { text: string; html: string } {
  const d = opts.digest
  const text = [
    `Hello ${opts.parentName || 'Parent'},`,
    '',
    `Dinner Table Digest · ${d.studentName} · ${d.weekLabel}`,
    '',
    'CELEBRATE',
    ...(d.celebrate.length ? d.celebrate.map((c) => `• ${c}`) : ['• No new wins logged yet']),
    '',
    'GENTLY WATCH',
    ...(d.watch.length ? d.watch.map((w) => `• ${w}`) : ['• Nothing flagged']),
    '',
    `GRADES: ${d.gradesLine}`,
    `PRESENCE: ${d.presenceLine}`,
    '',
    ...(d.comingUp.length ? ['COMING UP', ...d.comingUp.map((c) => `• ${c}`), ''] : []),
    'ASK AT DINNER',
    ...d.conversationStarters.map((q, i) => `${i + 1}. ${q}`),
    '',
    plainFooter(opts.brand),
  ].join('\n')

  const list = (items: string[], empty: string, bg: string, border: string, color: string) =>
    items.length
      ? `<ul style="margin:8px 0 0;padding:0;list-style:none">${items
          .map(
            (line) =>
              `<li style="margin:0 0 8px;padding:10px 12px;border-radius:10px;background:${bg};border:1px solid ${border};color:${color};font-size:14px">${escapeHtml(line)}</li>`
          )
          .join('')}</ul>`
      : `<p style="margin:8px 0 0;color:#64748b;font-size:14px">${escapeHtml(empty)}</p>`

  const html = brandedEmailShell({
    brand: opts.brand,
    eyebrow: 'Dinner Table Digest · 60 seconds',
    title: `Talk about school with ${d.studentName}`,
    bodyHtml: `
      <p style="margin:0 0 4px;color:#64748b;font-size:13px">${escapeHtml(d.weekLabel)}${d.gradeLevel ? ` · Grade ${escapeHtml(d.gradeLevel)}` : ''}</p>
      <p>Hello ${escapeHtml(opts.parentName || 'Parent')},</p>
      <p style="color:#475569;font-size:14px">A calm, plain-English snapshot — not another portal of tables.</p>

      <h2 style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#047857;margin:20px 0 0">Celebrate</h2>
      ${list(d.celebrate, 'No new wins logged yet — teachers add these via Beacon Pulse.', '#ecfdf5', '#a7f3d0', '#064e3b')}

      <h2 style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#b45309;margin:20px 0 0">Gently watch</h2>
      ${list(d.watch, 'Nothing flagged — enjoy the calm.', '#fffbeb', '#fde68a', '#78350f')}

      <table style="width:100%;margin:18px 0 0;border-collapse:separate;border-spacing:0 8px">
        <tr>
          <td style="width:50%;vertical-align:top;padding-right:6px">
            <div style="border:1px solid #e2e8f0;border-radius:12px;padding:12px;background:#f8fafc">
              <p style="margin:0;font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#64748b">Grades</p>
              <p style="margin:6px 0 0;font-size:14px;color:#0f172a">${escapeHtml(d.gradesLine)}</p>
            </div>
          </td>
          <td style="width:50%;vertical-align:top;padding-left:6px">
            <div style="border:1px solid #e2e8f0;border-radius:12px;padding:12px;background:#f8fafc">
              <p style="margin:0;font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#64748b">Presence</p>
              <p style="margin:6px 0 0;font-size:14px;color:#0f172a">${escapeHtml(d.presenceLine)}</p>
            </div>
          </td>
        </tr>
      </table>

      ${
        d.comingUp.length
          ? `<h2 style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#0369a1;margin:18px 0 0">Coming up</h2>
             <ul style="margin:8px 0 0;padding-left:18px;color:#0f172a;font-size:14px">${d.comingUp.map((c) => `<li style="margin-bottom:4px">${escapeHtml(c)}</li>`).join('')}</ul>`
          : ''
      }

      <div style="margin-top:20px;padding:14px 16px;border-radius:14px;background:#f0f9ff;border:1px solid #bae6fd">
        <p style="margin:0;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#0369a1">Ask at dinner</p>
        <ol style="margin:10px 0 0;padding-left:18px;color:#0c4a6e;font-size:14px">
          ${d.conversationStarters.map((q) => `<li style="margin-bottom:8px">${escapeHtml(q)}</li>`).join('')}
        </ol>
      </div>
    `,
    ctaLabel: opts.appUrl ? 'Open full student picture' : undefined,
    ctaHref: opts.appUrl,
  })

  return { text, html }
}

export function appBaseUrl(): string {
  const fromEnv =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() ||
    process.env.VERCEL_URL?.trim()
  if (fromEnv) {
    const withProto = fromEnv.startsWith('http') ? fromEnv : `https://${fromEnv}`
    return withProto.replace(/\/$/, '')
  }
  return 'https://beacon.commoncentsip.com'
}
