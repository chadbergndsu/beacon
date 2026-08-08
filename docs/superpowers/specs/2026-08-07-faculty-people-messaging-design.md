# Faculty People Messaging Design

**Status:** Approved in conversation on 2026-08-07

**Delivery channel:** School-branded email through Beacon

**Primary interface:** People recipient autocomplete in Communications

## Goal

Give every faculty member a fast, safe way to email specific people from Beacon. A sender can search by faculty, parent, or student name, select one or more recipients, and send through the existing Beacon email pipeline without typing or copying email addresses.

The feature should feel like addressing a modern email: search, select recipient chips, review the resolved recipient count, write, and send. Beacon remains responsible for school boundaries, faculty permissions, parent-link resolution, delivery logging, and retry visibility.

## Scope

### Included

- A **People** mode in the existing Communications composer.
- Autocomplete across permitted faculty, parents, and students.
- Multi-select recipient chips.
- Student-name lookup that resolves to the student's linked parents.
- Teacher access to all faculty at the same school and families connected to the teacher's assigned classes.
- Principal, admin, and staff access to all faculty and families at their school.
- Existing group messaging retained as a separate **Groups** mode.
- Existing school branding, email transport cascade, outbox, delivery status, retries, and audit records.
- Keyboard, screen-reader, touch, and mobile behavior.

### Not included

- A Beacon inbox, chat threads, read receipts, reactions, attachments, or in-app replies.
- Sending to arbitrary typed email addresses.
- Student email delivery. Selecting a student is a lookup shortcut for linked parents.
- Cross-school directories or recipients.
- Changes to announcement publishing or emergency notification workflows.

## Sender and Recipient Rules

| Sender role | Faculty recipients | Parent recipients | Student lookup |
| --- | --- | --- | --- |
| Teacher | Any principal, admin, staff, or teacher at the same school | Only parents linked to students enrolled in the teacher's assigned classes | Only students enrolled in the teacher's assigned classes |
| Principal | Any faculty at the same school | Any parent at the same school | Any active student at the same school |
| Admin | Any faculty at the same school | Any parent at the same school | Any active student at the same school |
| Staff | Any faculty at the same school | Any parent at the same school | Any active student at the same school |
| Parent or unauthenticated user | No access | No access | No access |

Every search, preview, and send operation must derive the sender from the verified session and reapply these rules on the server. Client-supplied names, email addresses, roles, school IDs, or class IDs are never authorization evidence.

## User Experience

### Composer modes

The existing composer gains two recipient modes:

- **People** — the primary mode and default for direct communication.
- **Groups** — the existing class, parents, teachers, staff, and whole-school audience controls.

Changing modes clears incompatible recipient state after confirmation when a draft already has selections.

### People autocomplete

The People mode begins with a `To` combobox. Search starts after two normalized characters and returns at most 20 authorized results. Results are grouped by Faculty, Parents, and Students and include enough context to distinguish similar names:

- `Marian Gordon · Office admin`
- `Chris Reed · Parent of Ava Reed`
- `Ava Reed · Grade 5 · sends to 2 linked parents`

The list supports arrow keys, Enter to select, Escape to close, and visible focus. Touch targets are at least 44 by 44 CSS pixels.

Selecting a faculty member or parent adds a removable chip. Selecting a student adds a student chip whose subtitle states how many linked parent email recipients it represents. A details affordance reveals the resolved parent names before sending.

Recent recipient references are stored only on the sender's device, capped at eight, and re-resolved through the authorized server search before display. Stale or newly unauthorized references disappear automatically. The browser does not persist email addresses.

### Recipient preview

Beacon continuously resolves selected references and shows:

- the number of selected people or student shortcuts;
- the final unique email-recipient count;
- which student selections expand to which linked parents;
- disabled or unresolved selections with a reason;
- a warning when a person lacks a usable email address.

Duplicate email addresses are removed. Each recipient still receives an individual email through the existing batch sender; recipient lists are never exposed in To or CC headers.

The People composer accepts at most 50 selected references and 100 resolved unique email addresses per send. Larger communication should use Groups or Announcements.

### Compose and send

Subject and message fields keep the existing length limits. The send button remains disabled until the current server preview confirms at least one authorized recipient and the message fields are valid.

Submission immediately shows `Sending…`. Completion reports sent, failed, skipped, or log-only totals. Partial failures remain visible in the outbox and use the existing retry action.

The email uses the school's branding and Reply-To configuration. Replies go to the configured school reply address; the interface must not imply that replies appear inside Beacon.

## Architecture

### Existing systems reused

- `profiles` supplies faculty and parent identities.
- `students`, `parent_students`, `enrollments`, and `classes` supply student aliases and teacher-family scope.
- `queueAndSendBatch` sends one school-branded email per unique recipient.
- `email_outbox` records attempts and delivery state.
- `audit_logs` records the sender, mode, counts, and outcome without copying message bodies or recipient email addresses into audit details.

No new message or directory table is required for the first version.

### Recipient references

The browser holds opaque references rather than delivery addresses:

```ts
type PeopleRecipientRef =
  | { kind: 'profile'; id: string }
  | { kind: 'student'; id: string }
```

Search results may include display labels and non-sensitive school context, but send requests contain only these references plus the subject and body.

### Server operations

The feature exposes three bounded server operations:

1. `searchPeopleRecipients(query)` authenticates the sender, applies tenant and role scope, and returns at most 20 display results.
2. `previewPeopleRecipients(refs)` re-resolves every reference, expands students to linked parents, removes duplicates, and returns the display-safe resolution summary.
3. `sendPeopleMessage(input)` repeats the full resolution rather than trusting the preview, validates caps and content, queues individual emails, writes an audit record, and revalidates Communications.

Shared recipient-resolution code is a server-only module used by both preview and send so their rules cannot drift. Queries use explicit `school_id` filters and bounded bulk reads; they must not perform one query per result or recipient.

## Error and Safety Behavior

- Missing or revoked session: return `Not signed in` and send nothing.
- Missing school or unsupported role: fail closed and send nothing.
- Cross-school or unauthorized reference: omit it from preview; reject the send if any submitted reference cannot be authorized at send time.
- Missing parent link or usable email: show the student as unavailable before send.
- No authorized recipients after resolution: send nothing and explain how to fix the selection.
- Transport partial failure: report exact aggregate counts and retain each outbox row for retry.
- Search failure: preserve the draft and selected chips, show a retryable inline error, and do not expose database details.
- Rapid or stale search responses: cancel or ignore older results so they cannot replace a newer query.

The directory does not provide a general email-address export. Search results are bounded, require authentication, and expose only same-school identities permitted for the sender.

## Accessibility and Mobile

- Use a semantic combobox/listbox pattern with `aria-expanded`, `aria-controls`, active-descendant or roving focus, and an accessible result count announcement.
- Recipient chips have named remove buttons.
- Status changes use a polite live region; send failures use an alert.
- Search, selection, removal, mode changes, and submission work without a pointer.
- Mobile layout keeps the To field, selected chips, preview, fields, and send button in a single readable column without horizontal overflow.

## Testing

### Unit and server tests

- Query normalization, minimum length, result cap, and empty states.
- Teacher access to all same-school faculty.
- Teacher parent/student results restricted to assigned classes.
- Leadership access to all same-school families.
- Cross-school profile, student, class, and parent-link denial.
- Student-to-parent expansion and no-parent/no-email states.
- Duplicate removal across direct parent and student selections.
- Selection and resolved-recipient caps.
- Preview/send parity and send-time reauthorization.
- Outbox and audit metadata contain the intended counts without recipient email leakage.

### Component tests

- Keyboard combobox behavior and result announcements.
- Multi-select chips and removal.
- Stale search result suppression.
- Disabled/unavailable result explanations.
- Pending, success, partial failure, and error states.
- People/Groups mode switching.

### Browser journey

A deterministic authenticated journey covers:

1. Teacher opens Communications on mobile.
2. Teacher searches a colleague and a student from an assigned class.
3. Student selection previews linked parents.
4. Duplicate parent delivery is removed.
5. Teacher sends and sees the completion state.
6. Outbox shows individual delivery records.
7. Teacher cannot find or submit a family outside assigned classes.

Leadership coverage verifies school-wide family access, while parent and unauthenticated sessions remain denied.

## Success Criteria

- Any faculty member can reach the People composer from the existing Comms navigation.
- An authorized recipient can be found and selected by name without typing an email address.
- Student lookup accurately and visibly resolves to linked parents.
- Teacher and tenant boundaries hold in search, preview, and send paths.
- Multi-recipient sends never expose recipient lists to other recipients.
- Every delivery attempt remains visible in the existing outbox.
- The complete test suite, database authorization tests, production build, and mobile browser journey pass before release.
