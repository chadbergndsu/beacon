# Soft pilot go-live

Ordered path before inviting families. In-app: **Principal → Go-live** (Pilot path card).

Local/env gate:

```bash
npm run pilot:check
```

## 1. Migrations 001–023

```bash
DATABASE_URL='postgresql://…' npm run db:migrate
# or
POSTGRES_PASSWORD='…' SUPABASE_PROJECT_REF='…' npm run db:migrate
```

Confirm `beacon_schema_migrations` includes through `023_office_admin.sql`. Critical: **016** RLS, **017** billing, **018** tokens, **019–021** money/portal, **022** craft realtime, **023** office admin seed.

## 2. Production env (Vercel)

| Required | Why |
|----------|-----|
| `NEXT_PUBLIC_SUPABASE_URL` | Auth / data |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser client |
| `SUPABASE_SERVICE_ROLE_KEY` | Server writes |
| `UPSTASH_REDIS_REST_URL` + `TOKEN` | Multi-instance rate limits (or `RATE_LIMIT_ALLOW_MEMORY=1` break-glass only) |
| `EMAIL_FROM` on **verified** domain | Family/teacher mail (not `onboarding@resend.dev`) |
| `RESEND_API_KEY` and/or `SMTP_*` | Live delivery |
| `NEXT_PUBLIC_APP_URL` | Absolute links in email |

Optional: `BEACON_FEEDBACK_TO`, `BEACON_PRINCIPAL_EMAIL`, `BEACON_OFFICE_ADMIN_EMAIL`, `BEACON_SLACK_WEBHOOK_URL`, Sentry, Stripe, Intuit.

## 3. Chris, Marian, teacher accounts

1. Create Auth users in Supabase (Authentication → Users).
2. Ensure each has a `profiles` row (trigger or manual insert with Auth UUID).
3. Run `scripts/seed-pilot-accounts.sql` in the SQL Editor (binds `school_id` + roles).
4. Sign-in checks:
   - Chris → `/login?as=principal` → `/principal`
   - Marian → `/login?as=office` → school office daily tasks
   - Teacher → class + Quick Mode on a phone

**023 alone is not enough** — it only upgrades role/name when the profile already exists; it does not create Auth users or set `school_id`.

## 4. Comms email test

1. Sign in as Marian or Chris  
2. **Comms** → Send live test  
3. Confirm inbox delivery (and spam once)  
4. Tick Go-live checklist **Email delivery path ready**

## 5. Go-live health

Open `/principal/release`:

- Set school name / mission / contact email  
- Ready score healthy; no red platform checks  
- Tick migrations + brand + principal/teacher login items  

## 6. Parent links

- Roster: ≥1 student, ≥1 parent profile, `parent_students` link  
- Parent login sees only linked children  
- Tick **Parent login** + FERPA access review  

## 7. Soft launch

- Phone smoke: login + dashboard + Quick Mode  
- Leadership okays teachers/parents  
- Tick **Soft launch approved**  

## Explicitly optional for academics-first pilot

Stripe, QuickBooks, Craft twin smoke, Slack, Twilio SMS, cameras — mark N/A on the checklist or configure later.

## Production URLs

- App: https://beacon.commoncentsip.com  
- Go-live: https://beacon.commoncentsip.com/principal/release  
- Preview branch: see PR #16 Vercel comment  
