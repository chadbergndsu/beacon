# Faculty People Messaging Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a People-first faculty email composer with authorized name autocomplete, student-to-parent expansion, multi-select chips, and existing Beacon delivery/outbox tracking.

**Architecture:** Keep the existing group composer and email infrastructure. Add a server-only People directory that derives every search and resolution from the verified sender, then expose bounded search, preview, and send server actions. The client receives display-safe identities and opaque references only; send-time authorization repeats all tenant and role checks before using `queueAndSendBatch`.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Supabase Postgres/Auth, Vitest and Testing Library, Playwright, existing Beacon email transport cascade.

## Global Constraints

- People is the default direct-recipient mode; the existing class and school audience flow remains available as Groups.
- Teachers may message any faculty member at their school and only parents or students connected to the teacher's assigned classes.
- Principals, admins, and staff may message any faculty member, parent, or active student at their school.
- Parents and unauthenticated users have no access to People messaging.
- Selecting a student sends only to that student's linked parents; Beacon never sends to a student email address.
- Search starts after two normalized characters and returns at most 20 authorized results.
- Recent references are device-local, capped at eight, contain no email addresses, and are reauthorized before display.
- A send accepts at most 50 selected references and 100 unique resolved email addresses.
- Every search, preview, and send operation derives `user_id`, `school_id`, and role from the verified server session.
- Browser input contains only `{ kind: 'profile' | 'student', id: string }` references, subject, and body; arbitrary email addresses are not accepted.
- Search and resolution use explicit `school_id` filters, empty-ID guards, and bounded bulk query waves; no query runs once per result or recipient.
- Recipient emails are deduplicated case-insensitively and each recipient receives a separate outbox/send attempt.
- Audit details record sender, mode, and aggregate counts but not message bodies or recipient email addresses.
- Touch targets are at least 44 by 44 CSS pixels and the combobox supports keyboard and screen-reader operation.
- No new message, directory, or recent-recipient database table is introduced.

### YardGUARD IT baseline applied to this feature

Beacon follows the applicable requirements from the August 7, 2026 YardGUARD leadership/IT readiness review and P0 hardening verification as a cross-project engineering baseline:

- authentication and authorization fail closed on absent, null, unassigned, or mismatched identities;
- every People read, preview, and send revalidates the server session and applies an explicit school boundary;
- cross-school access and forged references are proven with real local Supabase/PostgREST tests, not mock-only assertions;
- permissions and test fixtures use least privilege and do not mutate shared database grants;
- errors exposed to users are stable and do not reveal tenant, database, or recipient details;
- audit records identify the actor and aggregate outcome without message bodies, email addresses, recipient names, or selected IDs;
- browser fixtures remain synthetic/local and cannot send live email;
- keyboard, screen-reader, non-color, and mobile behavior are part of acceptance, not post-launch polish;
- documentation describes a controlled pilot honestly and does not imply SSO/MFA, production approval, retention, recovery, SLA, or compliance commitments that Beacon has not established.

Broader YardGUARD enterprise gates—managed SSO/MFA and provisioning, backup/restore and RTO/RPO exercises, incident response, vendor/privacy approval, penetration testing, and signed operational acceptance—remain Beacon production-launch requirements outside this bounded messaging implementation.

---

## File Structure

- Create `src/lib/email/people-types.ts` for opaque reference contracts, public result types, caps, and pure input normalization.
- Create `src/lib/email/people-directory.ts` for server-only authorized search and resolution.
- Create `src/lib/email/people-types.test.ts` and `src/lib/email/people-directory.test.ts` for pure and data-boundary behavior.
- Create `src/app/actions/people-messaging.ts` and `src/app/actions/people-messaging.test.ts` for authenticated search, preview, send, email, and audit orchestration.
- Create `src/components/comms/PeopleRecipientCombobox.tsx` and its component test for accessible search, recent references, chips, and stale-response protection.
- Create `src/components/comms/PeopleMessageForm.tsx` and its component test for preview, validation, pending state, and outcome reporting.
- Create `src/components/comms/CommunicationsComposer.tsx` and its test for People/Groups mode ownership.
- Modify `src/app/(app)/admin/emails/page.tsx` to render the new wrapper.
- Modify `src/components/comms/ComposeMessageForm.tsx` copy so it is explicitly the Groups composer.
- Modify `scripts/e2e-supabase-mock.mjs`, `playwright.config.ts`, and create `e2e/people-messaging.spec.ts` for a deterministic mobile faculty journey.
- Modify `README.md` to document direct People messaging and role boundaries.

---

### Task 1: People Messaging Contracts and Bounds

**Files:**
- Create: `src/lib/email/people-types.ts`
- Create: `src/lib/email/people-types.test.ts`

**Interfaces:**
- Produces: `PeopleRecipientRef`, `PeopleSearchResult`, `PeoplePreview`, `PeopleSelectionPreview`, `PeopleMessageResult`, `PEOPLE_SEARCH_MIN_CHARS`, `PEOPLE_SEARCH_RESULT_LIMIT`, `PEOPLE_RECENT_LIMIT`, `PEOPLE_SELECTION_LIMIT`, `PEOPLE_DELIVERY_LIMIT`, `normalizePeopleQuery()`, `peopleRefKey()`, and `normalizePeopleRefs()`.
- Consumes: `Role` from `src/lib/types.ts`.

- [ ] **Step 1: Write failing contract tests**

```ts
import { describe, expect, it } from 'vitest'
import {
  normalizePeopleQuery,
  normalizePeopleRefs,
  peopleRefKey,
  PEOPLE_RECENT_LIMIT,
  PEOPLE_SELECTION_LIMIT,
} from './people-types'

describe('people messaging contracts', () => {
  it('normalizes whitespace without accepting one-character search', () => {
    expect(normalizePeopleQuery('  Ava   Reed ')).toBe('Ava Reed')
    expect(normalizePeopleQuery(' A ')).toBe('')
  })

  it('deduplicates opaque references and rejects malformed or oversized input', () => {
    const profile = { kind: 'profile' as const, id: '11111111-1111-4111-8111-111111111111' }
    expect(normalizePeopleRefs([profile, profile])).toEqual([profile])
    expect(peopleRefKey(profile)).toBe('profile:11111111-1111-4111-8111-111111111111')
    expect(normalizePeopleRefs([{ kind: 'profile', id: 'not-a-uuid' }])).toEqual([])
    expect(
      normalizePeopleRefs(
        Array.from({ length: PEOPLE_SELECTION_LIMIT + 1 }, (_, index) => ({
          kind: 'student',
          id: `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
        }))
      )
    ).toHaveLength(0)
    expect(PEOPLE_RECENT_LIMIT).toBe(8)
  })
})
```

- [ ] **Step 2: Run the test and capture RED**

Run: `npx vitest run src/lib/email/people-types.test.ts`

Expected: FAIL because `people-types.ts` does not exist.

- [ ] **Step 3: Implement the contracts and pure guards**

```ts
import type { Role } from '@/lib/types'

export const PEOPLE_SEARCH_MIN_CHARS = 2
export const PEOPLE_SEARCH_RESULT_LIMIT = 20
export const PEOPLE_RECENT_LIMIT = 8
export const PEOPLE_SELECTION_LIMIT = 50
export const PEOPLE_DELIVERY_LIMIT = 100

export type FacultyRole = Extract<Role, 'admin' | 'staff' | 'principal' | 'teacher'>
export type PeopleRecipientRef =
  | { kind: 'profile'; id: string }
  | { kind: 'student'; id: string }

export type PeopleSearchResult = {
  key: string
  ref: PeopleRecipientRef
  group: 'Faculty' | 'Parents' | 'Students'
  label: string
  context: string
  recipientCount: number
  disabledReason: string | null
}

export type PeopleSelectionPreview = PeopleSearchResult & {
  recipientNames: string[]
}

export type PeoplePreview = {
  selectedCount: number
  recipientCount: number
  selections: PeopleSelectionPreview[]
  unavailableCount: number
}

export type PeopleMessageResult =
  | { ok: true; sent: number; failed: number; skipped: number; note?: string }
  | { ok: false; error: string }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function normalizePeopleQuery(value: unknown): string {
  const query = typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, 80) : ''
  return query.length >= PEOPLE_SEARCH_MIN_CHARS ? query : ''
}

export function peopleRefKey(ref: PeopleRecipientRef): string {
  return `${ref.kind}:${ref.id}`
}

export function normalizePeopleRefs(value: unknown): PeopleRecipientRef[] {
  if (!Array.isArray(value) || value.length > PEOPLE_SELECTION_LIMIT) return []
  const refs = new Map<string, PeopleRecipientRef>()
  let invalid = false
  for (const candidate of value) {
    if (!candidate || typeof candidate !== 'object') {
      invalid = true
      continue
    }
    const kind = Reflect.get(candidate, 'kind')
    const id = Reflect.get(candidate, 'id')
    if ((kind !== 'profile' && kind !== 'student') || typeof id !== 'string' || !UUID.test(id)) {
      invalid = true
      continue
    }
    const ref = { kind, id } as PeopleRecipientRef
    refs.set(peopleRefKey(ref), ref)
  }
  return invalid ? [] : [...refs.values()]
}
```

- [ ] **Step 4: Run the focused test and typecheck**

Run: `npx vitest run src/lib/email/people-types.test.ts && npm run typecheck`

Expected: PASS.

- [ ] **Step 5: Commit the contracts**

```bash
git add src/lib/email/people-types.ts src/lib/email/people-types.test.ts
git commit -m "feat: define people messaging contracts"
```

---

### Task 2: Authorized People Directory and Recipient Resolution

**Files:**
- Create: `src/lib/email/people-directory.ts`
- Create: `src/lib/email/people-directory.test.ts`
- Modify: `src/lib/test/mock-supabase.ts`

**Interfaces:**
- Consumes: `FacultyRole`, `PeopleRecipientRef`, `PeopleSearchResult`, `PeoplePreview`, and caps from `people-types.ts`.
- Produces: `PeopleSender`, `ResolvedPeopleDelivery`, `ResolvedPeopleDirectory`, `searchPeopleDirectory()`, and `resolvePeopleDirectory()`.

- [ ] **Step 1: Extend the fluent database mock and write failing authorization tests**

Add `or()` and `is()` filters to the mock so tests can assert the exact tenant-bound query shape:

```ts
api.or = (value: string) => {
  state.filters.or = value
  return chain()
}
api.is = (column: string, value: unknown) => {
  state.filters[`is:${column}`] = value
  return chain()
}
```

Create tests with two schools, two teachers, three students, and linked parents. Assert all of these behaviors explicitly:

```ts
it('lets a teacher find all same-school faculty and only assigned families', async () => {
  const results = await searchPeopleDirectory(teacherSender, 'Reed')
  expect(results.map((result) => result.label)).toEqual(['Riley Reed', 'Ava Reed'])
  expect(results.map((result) => result.label)).not.toContain('Outside Parent')
  expect(results.map((result) => result.label)).not.toContain('Unassigned Student')
})

it('lets leadership resolve school-wide families but never another school', async () => {
  const resolution = await resolvePeopleDirectory(principalSender, [
    { kind: 'student', id: assignedStudentId },
    { kind: 'profile', id: outsideParentId },
  ])
  expect(resolution.preview.recipientCount).toBe(2)
  expect(resolution.rejectedKeys).toEqual([`profile:${outsideParentId}`])
})

it('expands a student to linked parents and deduplicates a directly selected parent', async () => {
  const resolution = await resolvePeopleDirectory(teacherSender, [
    { kind: 'student', id: assignedStudentId },
    { kind: 'profile', id: assignedParentId },
  ])
  expect(resolution.deliveries).toHaveLength(2)
  expect(new Set(resolution.deliveries.map((delivery) => delivery.email)).size).toBe(2)
  expect(resolution.preview.selectedCount).toBe(2)
})

it('marks students without a linked parent email unavailable', async () => {
  const resolution = await resolvePeopleDirectory(teacherSender, [
    { kind: 'student', id: noEmailStudentId },
  ])
  expect(resolution.preview.selections[0].disabledReason).toBe('No linked parent email')
  expect(resolution.preview.recipientCount).toBe(0)
})
```

Also assert query counts remain bounded as selected recipients grow: one scope wave, one referenced-profile wave, one student wave, one parent-link wave, and one linked-parent wave.

- [ ] **Step 2: Run the directory tests and capture RED**

Run: `npx vitest run src/lib/email/people-directory.test.ts`

Expected: FAIL because the directory module does not exist.

- [ ] **Step 3: Implement server-only search and resolution**

Start the module with `import 'server-only'`. Define exact public interfaces:

```ts
export type PeopleSender = { id: string; schoolId: string; role: FacultyRole }

export type ResolvedPeopleDelivery = {
  email: string
  name: string | null
  role: string
  sourceKeys: string[]
}

export type ResolvedPeopleDirectory = {
  preview: PeoplePreview
  deliveries: ResolvedPeopleDelivery[]
  rejectedKeys: string[]
}

export async function searchPeopleDirectory(
  sender: PeopleSender,
  query: string,
  recentRefs: PeopleRecipientRef[] = []
): Promise<PeopleSearchResult[]>

export async function resolvePeopleDirectory(
  sender: PeopleSender,
  refs: PeopleRecipientRef[]
): Promise<ResolvedPeopleDirectory>
```

Implement a shared scope loader with explicit empty guards:

```ts
async function loadSenderScope(admin: ReturnType<typeof createAdminClient>, sender: PeopleSender) {
  if (sender.role !== 'teacher') return { studentIds: null, parentIds: null }
  const { data: classes } = await admin
    .from('classes')
    .select('id')
    .eq('school_id', sender.schoolId)
    .eq('teacher_id', sender.id)
  const classIds = (classes ?? []).map((row) => row.id)
  if (classIds.length === 0) return { studentIds: new Set<string>(), parentIds: new Set<string>() }
  const { data: enrollments } = await admin
    .from('enrollments')
    .select('student_id')
    .in('class_id', classIds)
  const studentIds = new Set((enrollments ?? []).map((row) => row.student_id))
  if (studentIds.size === 0) return { studentIds, parentIds: new Set<string>() }
  const { data: links } = await admin
    .from('parent_students')
    .select('parent_id, student_id')
    .in('student_id', [...studentIds])
  return {
    studentIds,
    parentIds: new Set((links ?? []).map((row) => row.parent_id)),
  }
}
```

For search, query same-school faculty by normalized name, query permitted parents, and query permitted active students with a bounded `or(first_name.ilike...,last_name.ilike...)`. Escape `%`, `_`, comma, and parentheses before building the PostgREST filter. Resolve matching student and parent context in bulk, merge groups in Faculty → Parents → Students order, and slice once to `PEOPLE_SEARCH_RESULT_LIMIT`.

For recent references, ignore query search and call the same resolver on at most `PEOPLE_RECENT_LIMIT` references, then convert authorized selections to search results. Never echo a stale or rejected reference.

For resolution, load referenced profiles with both `.eq('school_id', sender.schoolId)` and `.in('id', profileIds)`. Load student references with `.eq('school_id', sender.schoolId)`, `.eq('active', true)`, and `.in('id', studentIds)`. Intersect teacher results with the scope sets, expand student links to same-school `role = parent` profiles, normalize emails to lowercase, and deduplicate with a `Map<string, ResolvedPeopleDelivery>`.

Return one selection preview per submitted reference. Use `No usable email address` for a direct profile without email and `No linked parent email` for a student without deliverable linked parents. Put missing, cross-school, and teacher-out-of-scope references in `rejectedKeys` without revealing why.

- [ ] **Step 4: Run directory, existing recipient-boundary tests, and typecheck**

Run: `npx vitest run src/lib/email/people-directory.test.ts src/lib/email/recipients.school-bind.test.ts && npm run typecheck`

Expected: PASS with bounded query-count assertions.

- [ ] **Step 5: Commit the directory**

```bash
git add src/lib/email/people-directory.ts src/lib/email/people-directory.test.ts src/lib/test/mock-supabase.ts
git commit -m "feat: add authorized people directory"
```

---

### Task 3: Guarded Search, Preview, and Send Actions

**Files:**
- Create: `src/app/actions/people-messaging.ts`
- Create: `src/app/actions/people-messaging.test.ts`

**Interfaces:**
- Consumes: `searchPeopleDirectory()`, `resolvePeopleDirectory()`, `normalizePeopleQuery()`, `normalizePeopleRefs()`, `queueAndSendBatch()`, `familyMessageBodies()`, `loadSchoolBrand()`, and `subjectTag()`.
- Produces: `searchPeopleRecipients()`, `previewPeopleRecipients()`, and `sendPeopleMessage()` server actions.

- [ ] **Step 1: Write failing action tests**

Mock session auth, the profile lookup, directory functions, email batching, branding, and audit insert. Cover these exact cases:

```ts
const validInput = {
  refs: [{ kind: 'student', id: '33333333-3333-4333-8333-333333333333' }],
  subject: 'Field trip reminder',
  body: 'Please return the form Friday.',
}

it('rejects parents and profiles without a school before directory access', async () => {
  mocks.profile = { id: parentId, school_id: schoolId, role: 'parent' }
  await expect(searchPeopleRecipients({ query: 'Ava', recent_refs: [] })).resolves.toEqual({
    ok: false,
    error: 'Only faculty can use People messaging.',
  })
  expect(mocks.searchPeopleDirectory).not.toHaveBeenCalled()
})

it('fails closed when the verified faculty profile has no school', async () => {
  mocks.profile = { id: teacherId, school_id: null, role: 'teacher' }
  await expect(searchPeopleRecipients({ query: 'Ava', recent_refs: [] })).resolves.toEqual({
    ok: false,
    error: 'Profile or school not set up.',
  })
  expect(mocks.searchPeopleDirectory).not.toHaveBeenCalled()
})

it('passes only the verified sender identity into search', async () => {
  await searchPeopleRecipients({ query: 'Ava', recent_refs: [] })
  expect(mocks.searchPeopleDirectory).toHaveBeenCalledWith(
    { id: teacherId, schoolId, role: 'teacher' },
    'Ava',
    []
  )
})

it('fails the whole send when any reference is rejected at send time', async () => {
  mocks.resolvePeopleDirectory.mockResolvedValue({
    preview: { selectedCount: 2, recipientCount: 1, selections: [], unavailableCount: 0 },
    deliveries: [{ email: 'parent@school.test', name: 'Parent', role: 'parent', sourceKeys: [] }],
    rejectedKeys: ['profile:22222222-2222-4222-8222-222222222222'],
  })
  const result = await sendPeopleMessage(validInput)
  expect(result).toEqual({ ok: false, error: 'One or more recipients is no longer available.' })
  expect(mocks.queueAndSendBatch).not.toHaveBeenCalled()
})

it('queues one branded email per unique resolved recipient and audits counts only', async () => {
  const result = await sendPeopleMessage(validInput)
  expect(mocks.queueAndSendBatch).toHaveBeenCalledWith(
    expect.arrayContaining([
      expect.objectContaining({ kind: 'message', to_email: 'parent@school.test' }),
    ]),
    expect.objectContaining({ brand: expect.any(Object) })
  )
  expect(mocks.auditInsert).toHaveBeenCalledWith(
    expect.objectContaining({
      action: 'comms.people',
      details: expect.objectContaining({ mode: 'people', selected: 1, recipients: 1 }),
    })
  )
  expect(JSON.stringify(mocks.auditInsert.mock.calls)).not.toContain('parent@school.test')
  expect(JSON.stringify(mocks.auditInsert.mock.calls)).not.toContain(validInput.body)
  expect(result).toEqual({ ok: true, sent: 1, failed: 0, skipped: 0 })
})
```

Add cases for an absent user, one-character search, malformed references, more than 50 refs, more than 100 resolved deliveries, missing subject/body, subject over 200 characters, body over 20,000 characters, and log-only/partial-failure counts.

- [ ] **Step 2: Run action tests and capture RED**

Run: `npx vitest run src/app/actions/people-messaging.test.ts`

Expected: FAIL because the actions do not exist.

- [ ] **Step 3: Implement session-derived faculty access**

```ts
async function requireFacultyMessagingAccess() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, error: 'Not signed in.' }
  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('id, school_id, role, full_name')
    .eq('id', user.id)
    .maybeSingle()
  if (!profile?.school_id) return { ok: false as const, error: 'Profile or school not set up.' }
  if (!['admin', 'staff', 'principal', 'teacher'].includes(profile.role)) {
    return { ok: false as const, error: 'Only faculty can use People messaging.' }
  }
  return {
    ok: true as const,
    admin,
    user,
    profile,
    sender: { id: user.id, schoolId: profile.school_id, role: profile.role as FacultyRole },
  }
}
```

- [ ] **Step 4: Implement bounded search and preview actions**

`searchPeopleRecipients()` normalizes the query and at most eight recent refs. If both are empty, return `{ ok: true, results: [] }`. `previewPeopleRecipients()` rejects malformed or oversized arrays and returns the public preview only. Both catch internal exceptions, call `reportError()` with a surface and operation but no query or names, and return a stable client-safe error.

```ts
function parseSubmittedRefs(value: unknown):
  | { ok: true; refs: PeopleRecipientRef[] }
  | { ok: false; error: string } {
  if (!Array.isArray(value) || value.length > PEOPLE_SELECTION_LIMIT) {
    return { ok: false, error: 'Choose no more than 50 recipients.' }
  }
  const refs = normalizePeopleRefs(value)
  if (value.length > 0 && refs.length === 0) {
    return { ok: false, error: 'One or more recipients is invalid.' }
  }
  return { ok: true, refs }
}

export async function previewPeopleRecipients(input: { refs: unknown }) {
  const access = await requireFacultyMessagingAccess()
  if (!access.ok) return access
  const parsed = parseSubmittedRefs(input.refs)
  if (!parsed.ok) return parsed
  if (parsed.refs.length === 0) return { ok: true as const, preview: emptyPeoplePreview() }
  const resolution = await resolvePeopleDirectory(access.sender, parsed.refs)
  return { ok: true as const, preview: resolution.preview }
}
```

- [ ] **Step 5: Implement send-time reauthorization and existing delivery integration**

```ts
export async function sendPeopleMessage(input: {
  refs: unknown
  subject: unknown
  body: unknown
}): Promise<PeopleMessageResult> {
  const access = await requireFacultyMessagingAccess()
  if (!access.ok) return access
  const parsed = parseSubmittedRefs(input.refs)
  if (!parsed.ok) return parsed
  const refs = parsed.refs
  const subject = typeof input.subject === 'string' ? input.subject.trim() : ''
  const body = typeof input.body === 'string' ? input.body.trim() : ''
  if (refs.length === 0) return { ok: false, error: 'Choose at least one recipient.' }
  if (!subject || !body) return { ok: false, error: 'Subject and message are required.' }
  if (subject.length > 200) return { ok: false, error: 'Subject is too long.' }
  if (body.length > 20_000) return { ok: false, error: 'Message is too long.' }

  const resolution = await resolvePeopleDirectory(access.sender, refs)
  if (resolution.rejectedKeys.length > 0) {
    return { ok: false, error: 'One or more recipients is no longer available.' }
  }
  if (resolution.deliveries.length === 0) {
    return { ok: false, error: 'No selected recipient has a usable email address.' }
  }
  if (resolution.deliveries.length > PEOPLE_DELIVERY_LIMIT) {
    return { ok: false, error: 'Use Groups or Announcements for more than 100 recipients.' }
  }

  const brand = await loadSchoolBrand(access.sender.schoolId)
  const author = access.profile.full_name || 'School faculty'
  const bodies = familyMessageBodies({
    brand,
    subject,
    body,
    author,
    appUrl: `${appBaseUrl()}/announcements`,
  })
  const emails = resolution.deliveries.map((recipient) => ({
    school_id: access.sender.schoolId,
    kind: 'message' as const,
    to_email: recipient.email,
    to_name: recipient.name,
    subject: `[${subjectTag(brand)}] ${subject}`,
    body_text: bodies.text,
    body_html: bodies.html,
    meta: { people_message: true, recipient_role: recipient.role },
  }))
  const delivery = await queueAndSendBatch(emails, { brand })
  await access.admin.from('audit_logs').insert({
    school_id: access.sender.schoolId,
    user_id: access.user.id,
    action: 'comms.people',
    table_name: 'email_outbox',
    details: {
      mode: 'people',
      selected: refs.length,
      recipients: emails.length,
      sent: delivery.sent,
      failed: delivery.failed,
      skipped: delivery.skipped,
    },
  })
  revalidatePath('/admin/emails')
  return {
    ok: true,
    sent: delivery.sent,
    failed: delivery.failed,
    skipped: delivery.skipped,
    note: delivery.note,
  }
}
```

- [ ] **Step 6: Run action and email tests**

Run: `npx vitest run src/app/actions/people-messaging.test.ts src/lib/email/templates.test.ts src/lib/email/send.test.ts && npm run typecheck`

Expected: PASS.

- [ ] **Step 7: Commit actions**

```bash
git add src/app/actions/people-messaging.ts src/app/actions/people-messaging.test.ts
git commit -m "feat: send authorized people messages"
```

---

### Task 4: Accessible Recipient Autocomplete

**Files:**
- Create: `src/components/comms/PeopleRecipientCombobox.tsx`
- Create: `src/components/comms/PeopleRecipientCombobox.test.tsx`

**Interfaces:**
- Consumes: `searchPeopleRecipients()`, `PeopleRecipientRef`, `PeopleSearchResult`, `peopleRefKey()`, and `PEOPLE_RECENT_LIMIT`.
- Produces: `PeopleRecipientCombobox({ selected, onChange, disabled })`.

- [ ] **Step 1: Write failing component tests**

Use jsdom, Testing Library, fake timers for the 250 ms debounce, and `userEvent`. Cover:

```tsx
it('searches after two characters and supports keyboard selection', async () => {
  mocks.searchPeopleRecipients.mockResolvedValue({ ok: true, results: [avaStudent] })
  const onChange = vi.fn()
  render(<PeopleRecipientCombobox selected={[]} onChange={onChange} />)
  const input = screen.getByRole('combobox', { name: 'To' })
  await user.type(input, 'Av')
  await vi.advanceTimersByTimeAsync(250)
  expect(mocks.searchPeopleRecipients).toHaveBeenCalledWith({ query: 'Av', recent_refs: [] })
  await user.keyboard('{ArrowDown}{Enter}')
  expect(onChange).toHaveBeenCalledWith([avaStudent])
})

it('announces results, renders contextual chips, and removes by keyboard', async () => {
  render(<PeopleRecipientCombobox selected={[avaStudent]} onChange={onChange} />)
  expect(screen.getByRole('status').textContent).toContain('1 selected')
  const remove = screen.getByRole('button', { name: 'Remove Ava Reed' })
  expect(remove.className).toContain('min-h-11')
  await user.click(remove)
  expect(onChange).toHaveBeenCalledWith([])
})

it('ignores a slow response for an older query', async () => {
  mocks.searchPeopleRecipients
    .mockReturnValueOnce(firstDeferred.promise)
    .mockResolvedValueOnce({ ok: true, results: [newerResult] })
  await user.type(input, 'Av')
  await vi.advanceTimersByTimeAsync(250)
  await user.type(input, 'a')
  await vi.advanceTimersByTimeAsync(250)
  firstDeferred.resolve({ ok: true, results: [olderResult] })
  expect(await screen.findByRole('option', { name: /newer result/i })).toBeVisible()
  expect(screen.queryByRole('option', { name: /older result/i })).toBeNull()
})
```

Add tests for one-character no-search, group headings, disabled no-email results, Escape, duplicate selection prevention, local recent reference persistence without email fields, and reauthorization of recent references on mount.

- [ ] **Step 2: Run the component test and capture RED**

Run: `npx vitest run src/components/comms/PeopleRecipientCombobox.test.tsx`

Expected: FAIL because the component does not exist.

- [ ] **Step 3: Implement the combobox state machine**

Use a controlled `selected: PeopleSearchResult[]` prop. Keep query, results, open state, active index, pending state, and error locally. Use a monotonically increasing request sequence in a ref; apply results only when the response sequence equals the newest sequence.

```tsx
<div>
  <Label htmlFor={inputId}>To</Label>
  <div className="mt-1 flex min-h-12 flex-wrap items-center gap-2 rounded-lg border border-input bg-background p-2">
    {selected.map((item) => (
      <span key={item.key} className="inline-flex min-h-11 items-center gap-1 rounded-full bg-muted px-3">
        <span>
          <span className="block text-sm font-medium">{item.label}</span>
          <span className="block text-xs text-muted-foreground">{item.context}</span>
        </span>
        <button type="button" aria-label={`Remove ${item.label}`} className="min-h-11 min-w-11" />
      </span>
    ))}
    <input
      id={inputId}
      role="combobox"
      aria-autocomplete="list"
      aria-expanded={open}
      aria-controls={listboxId}
      aria-activedescendant={activeResult ? `${listboxId}-${activeResult.key}` : undefined}
      value={query}
      disabled={disabled}
      onChange={(event) => setQuery(event.target.value)}
      onKeyDown={handleKeyDown}
    />
  </div>
  {open ? <div id={listboxId} role="listbox">{renderGroupedResults(results)}</div> : null}
  <p role="status" aria-live="polite" className="sr-only">{announcement}</p>
</div>
```

Store recent refs under `beacon:people-message-recents:v1` as JSON containing only `kind` and `id`. Cap to eight, catch storage errors, and never persist labels, context, recipient names, or email addresses. On mount, call search with an empty query and those recent refs so the server drops stale entries.

- [ ] **Step 4: Run component tests, accessibility-focused assertions, and typecheck**

Run: `npx vitest run src/components/comms/PeopleRecipientCombobox.test.tsx && npm run typecheck`

Expected: PASS with no act warnings.

- [ ] **Step 5: Commit the autocomplete**

```bash
git add src/components/comms/PeopleRecipientCombobox.tsx src/components/comms/PeopleRecipientCombobox.test.tsx
git commit -m "feat: add people recipient autocomplete"
```

---

### Task 5: People Composer and Groups Integration

**Files:**
- Create: `src/components/comms/PeopleMessageForm.tsx`
- Create: `src/components/comms/PeopleMessageForm.test.tsx`
- Create: `src/components/comms/CommunicationsComposer.tsx`
- Create: `src/components/comms/CommunicationsComposer.test.tsx`
- Modify: `src/components/comms/ComposeMessageForm.tsx`
- Modify: `src/app/(app)/admin/emails/page.tsx`

**Interfaces:**
- Consumes: `PeopleRecipientCombobox`, `previewPeopleRecipients()`, `sendPeopleMessage()`, existing `ComposeMessageForm`, and existing UI primitives.
- Produces: `PeopleMessageForm({ onDirtyChange })`, `ComposeMessageForm({ classes, canSchoolWide, onDirtyChange })`, and a People-default `CommunicationsComposer` rendered by the Comms page.

- [ ] **Step 1: Write failing People form tests**

```tsx
it('previews selected references and blocks send until server resolution is ready', async () => {
  mocks.previewPeopleRecipients.mockResolvedValue({
    ok: true,
    preview: {
      selectedCount: 1,
      recipientCount: 2,
      unavailableCount: 0,
      selections: [{ ...avaStudent, recipientNames: ['Pat Parent', 'Chris Parent'] }],
    },
  })
  render(<PeopleMessageForm />)
  await selectResult('Ava Reed')
  expect(await screen.findByText('2 unique email recipients')).toBeVisible()
  expect(screen.getByRole('button', { name: 'Send to 2 recipients' })).toBeDisabled()
  await user.type(screen.getByLabelText('Subject'), 'Field trip reminder')
  await user.type(screen.getByLabelText('Message'), 'Please return the form Friday.')
  expect(screen.getByRole('button', { name: 'Send to 2 recipients' })).toBeEnabled()
})

it('preserves the draft and reports pending, partial failure, and success counts', async () => {
  mocks.sendPeopleMessage.mockResolvedValue({ ok: true, sent: 1, failed: 1, skipped: 0 })
  await fillValidPeopleMessage()
  await user.click(screen.getByRole('button', { name: 'Send to 2 recipients' }))
  expect(await screen.findByRole('status')).toHaveTextContent('Sent 1 · 1 failed')
  expect(screen.getByLabelText('Subject')).toHaveValue('Field trip reminder')
})
```

Add tests for student expansion disclosure, unavailable selections, selected/reference cap copy, generic send-time reauthorization error, log-only counts, and full-success form reset.

- [ ] **Step 2: Write failing mode-wrapper tests**

```tsx
it('opens in People mode and preserves the existing Groups composer', async () => {
  render(<CommunicationsComposer classes={classes} canSchoolWide />)
  expect(screen.getByRole('tab', { name: 'People' })).toHaveAttribute('aria-selected', 'true')
  expect(screen.getByText('Message specific people')).toBeVisible()
  await user.click(screen.getByRole('tab', { name: 'Groups' }))
  expect(screen.getByText('Compose to groups')).toBeVisible()
})
```

Add tests that changing modes with a non-empty People or Groups draft asks for confirmation, leaves the draft in place when canceled, and clears the previous mode after confirmation.

- [ ] **Step 3: Run both component suites and capture RED**

Run: `npx vitest run src/components/comms/PeopleMessageForm.test.tsx src/components/comms/CommunicationsComposer.test.tsx`

Expected: FAIL because both components do not exist.

- [ ] **Step 4: Implement People preview and send flow**

Keep selected display results controlled by the form. Debounce preview by 150 ms and suppress stale responses with the same request-sequence pattern as search. Render selected count, unique email count, student expansion names, and unavailable reasons. Use `role="alert"` for failures and `role="status"` for pending/success.

On complete success (`failed === 0` and `skipped === 0`), clear refs, subject, and body. On partial failure or log-only delivery, retain the draft so the sender can inspect the outbox and retry.

- [ ] **Step 5: Implement the People/Groups wrapper and page integration**

```tsx
export function CommunicationsComposer(props: {
  classes: { id: string; name: string }[]
  canSchoolWide: boolean
}) {
  const [mode, setMode] = useState<'people' | 'groups'>('people')
  const [peopleDirty, setPeopleDirty] = useState(false)
  const [groupsDirty, setGroupsDirty] = useState(false)
  function chooseMode(next: 'people' | 'groups') {
    const currentDirty = mode === 'people' ? peopleDirty : groupsDirty
    if (
      next !== mode &&
      currentDirty &&
      !window.confirm('Switch modes? Your current draft will be cleared.')
    ) {
      return
    }
    if (mode === 'people') setPeopleDirty(false)
    if (mode === 'groups') setGroupsDirty(false)
    setMode(next)
  }
  return (
    <div>
      <div role="tablist" aria-label="Message recipients" className="mb-5 grid grid-cols-2 gap-2">
        <button role="tab" aria-selected={mode === 'people'} onClick={() => chooseMode('people')}>
          People
        </button>
        <button role="tab" aria-selected={mode === 'groups'} onClick={() => chooseMode('groups')}>
          Groups
        </button>
      </div>
      {mode === 'people' ? (
        <PeopleMessageForm onDirtyChange={setPeopleDirty} />
      ) : (
        <ComposeMessageForm
          classes={props.classes}
          canSchoolWide={props.canSchoolWide}
          onDirtyChange={setGroupsDirty}
        />
      )}
    </div>
  )
}
```

Change the existing group heading from `Compose to families` to `Compose to groups`. Add optional `onDirtyChange` to the existing form, set it on the first field/audience change, and clear it after a complete successful send. Replace the page's direct `ComposeMessageForm` render with `CommunicationsComposer`. Keep the page's current faculty role guard and teacher class scoping unchanged.

- [ ] **Step 6: Run Comms component/page tests and typecheck**

Run: `npx vitest run src/components/comms/PeopleMessageForm.test.tsx src/components/comms/CommunicationsComposer.test.tsx src/components/comms/PeopleRecipientCombobox.test.tsx && npm run typecheck`

Expected: PASS.

- [ ] **Step 7: Commit the composer integration**

```bash
git add src/components/comms/PeopleMessageForm.tsx src/components/comms/PeopleMessageForm.test.tsx src/components/comms/CommunicationsComposer.tsx src/components/comms/CommunicationsComposer.test.tsx src/components/comms/ComposeMessageForm.tsx 'src/app/(app)/admin/emails/page.tsx'
git commit -m "feat: make People the default Comms composer"
```

---

### Task 6: Deterministic Faculty Browser Journey and Documentation

**Files:**
- Create: `e2e/people-messaging.spec.ts`
- Modify: `scripts/e2e-supabase-mock.mjs`
- Modify: `playwright.config.ts`
- Modify: `README.md`

**Interfaces:**
- Consumes: the authenticated teacher fixture, People composer, Supabase REST mock, email outbox path, and existing Playwright configuration.
- Produces: a mobile end-to-end proof covering search, selection, expansion, deduplication, send state, outbox, and denied unassigned family lookup.

- [ ] **Step 1: Write the failing browser journey**

Reuse the authenticated-cookie helper pattern from `e2e/pilot-scorecard.spec.ts`. Add one serial local-only test:

```ts
test('teacher messages a colleague and assigned family by People autocomplete', async ({ page }, testInfo) => {
  const baseURL = configuredBaseURL(testInfo.project.use.baseURL)
  await page.setViewportSize({ width: 390, height: 844 })
  await openAs(page, 'teacher', '/admin/emails', baseURL)

  await expect(page.getByRole('tab', { name: 'People' })).toHaveAttribute('aria-selected', 'true')
  const to = page.getByRole('combobox', { name: 'To' })
  await to.fill('Pri')
  await page.getByRole('option', { name: /Priya Principal/ }).click()
  await to.fill('Sam')
  await page.getByRole('option', { name: /Sam Student.*sends to 1 linked parent/ }).click()

  await expect(page.getByText('2 unique email recipients')).toBeVisible()
  await page.getByLabel('Subject').fill('Friday reminder')
  await page.getByLabel('Message').fill('Please check the Friday schedule.')
  await page.getByRole('button', { name: 'Send to 2 recipients' }).click()
  await expect(page.getByRole('status')).toContainText('log-only')

  await to.fill('Outside')
  await expect(page.getByText('No permitted people found')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false)
})
```

Add a parent-role assertion that `/admin/emails` redirects to `/dashboard` and never renders the People tab.

- [ ] **Step 2: Run the journey and capture RED**

Run: `npm run build && npx playwright test e2e/people-messaging.spec.ts`

Expected: FAIL because the mock does not yet supply directory, class, enrollment, parent-link, outbox insert, and audit rows needed by the feature.

- [ ] **Step 3: Extend the local Supabase fixture without weakening remote-mode tests**

Add one same-school assigned child, one unassigned child, one second linked parent sharing the first parent's email for deduplication coverage, and one outside-school family. Enhance `profileRows()`, `tableRows('classes')`, `tableRows('enrollments')`, `tableRows('parent_students')`, `tableRows('students')`, and write handling for `email_outbox` so they honor `eq`, `in`, and `or` filters used by production code.

Record inserted outbox rows in memory and return `{ id, status }` for `.insert().select().maybeSingle()`. Reset the in-memory outbox when the mock process starts. Do not add any fixture-only branch to application code.

Set this only in the local Playwright web-server environment:

```ts
EMAIL_TRANSPORTS: 'log',
```

Keep `test.skip(Boolean(process.env.PLAYWRIGHT_BASE_URL), ...)` so fixture-authenticated tests cannot forge cookies against a hosted environment.

- [ ] **Step 4: Update product documentation**

Add this Communications bullet to `README.md`:

```markdown
- **People messaging:** faculty can search and select same-school recipients by name. Teachers can reach all faculty and families in their assigned classes; leadership can reach the full school. Student selections resolve to linked parent emails. Every delivery remains individually visible in the Comms outbox.
```

- [ ] **Step 5: Run focused and complete verification**

Run in this order:

```bash
npx vitest run \
  src/lib/email/people-types.test.ts \
  src/lib/email/people-directory.test.ts \
  src/app/actions/people-messaging.test.ts \
  src/components/comms/PeopleRecipientCombobox.test.tsx \
  src/components/comms/PeopleMessageForm.test.tsx \
  src/components/comms/CommunicationsComposer.test.tsx
npm run ci
npm run test:e2e
PLAYWRIGHT_BASE_URL=https://beacon.commoncentsip.com npx playwright test e2e/public-smoke.spec.ts
git diff --check
```

Expected:

- All focused tests pass.
- Lint, typecheck, full coverage suite, and production build pass.
- The local People journey and existing browser journeys pass.
- Hosted public smoke passes without running fixture-authenticated People tests.
- The worktree contains only intended source, test, documentation, and fixture changes.

- [ ] **Step 6: Review security and privacy boundaries**

Inspect the final diff and verify:

- every service-role profiles/students/classes/links query has a sender-derived `school_id` boundary or an ID set proven through a school-bound parent query;
- teacher parent and student resolution intersects assigned-class scope during search, preview, and send;
- forged references fail the whole send with a generic error;
- client actions never accept or return a recipient email address;
- local storage contains only kind/id references;
- audit details contain no body, email, recipient name, or selected ID;
- no live email is attempted by the Playwright fixture;
- no Supabase migration is introduced.

- [ ] **Step 7: Commit the browser proof and docs**

```bash
git add e2e/people-messaging.spec.ts scripts/e2e-supabase-mock.mjs playwright.config.ts README.md
git commit -m "test: verify faculty People messaging journey"
```

---

### Task 7: Final Review and Branch Handoff

**Files:**
- Review all files changed by Tasks 1-6.
- Update this plan's checkboxes as work completes.

**Interfaces:**
- Consumes: the complete People messaging implementation and all verification evidence.
- Produces: a clean, reviewed branch ready for a dedicated pull request after its base dependency is resolved.

- [ ] **Step 1: Confirm base dependency and branch history**

Run:

```bash
git status --short --branch
git log --oneline --decorate -12
git merge-base feature/faculty-people-messaging origin/main
git log --oneline origin/main..feature/faculty-people-messaging
```

Expected: the branch includes the approved pilot/performance commits plus the People messaging commits. Do not open the People PR against `main` until PR #29 is merged, or rebase the People branch onto the updated `origin/main` after that merge.

- [ ] **Step 2: Run the final completion gate on the exact tree**

Run:

```bash
npm run ci
npm run test:e2e
git diff --check
git status --short --branch
```

Expected: all commands pass and the worktree is clean.

- [ ] **Step 3: Review the full feature diff**

Run:

```bash
git diff --stat a7334f0..HEAD
git diff --check a7334f0..HEAD
git diff a7334f0..HEAD -- \
  src/lib/email/people-types.ts \
  src/lib/email/people-directory.ts \
  src/app/actions/people-messaging.ts \
  src/components/comms \
  'src/app/(app)/admin/emails/page.tsx' \
  scripts/e2e-supabase-mock.mjs \
  e2e/people-messaging.spec.ts \
  README.md
```

Expected: no unrelated edits, no debug output, no secrets, and no generated artifacts.

- [ ] **Step 4: Apply the finishing workflow**

Use `superpowers:finishing-a-development-branch`. Preserve this worktree for review. After PR #29 lands, update from `origin/main`, re-run the exact-tree completion gate, push `feature/faculty-people-messaging`, and open a dedicated People messaging pull request.
