# Store launch — Apple App Store, Google Play, Microsoft (PWA), web install

Beacon stays one Next.js web app. Store builds are **thin Capacitor shells** that load production HTTPS — not a separate native rewrite.

**Privacy URL:** `https://beacon.commoncentsip.com/privacy`  
**Terms URL:** `https://beacon.commoncentsip.com/terms`  
**Support:** `office@commoncentsip.com`  
**App ID:** `com.commoncentsip.beacon`

---

## 1. In-repo prep (done / regenerate anytime)

```bash
npm run icons:generate   # PWA + store icons under public/icons/
npm run store:check      # checklist of files + blockers
```

| Asset | Path |
|-------|------|
| Web manifest | `/manifest.webmanifest` via `src/app/manifest.ts` |
| Icons 192 / 512 / maskable | `public/icons/icon-*.png` |
| Apple touch | `public/icons/apple-touch-icon.png` |
| App Store 1024 | `public/icons/app-store-1024.png` |
| Play icon 512 | `public/icons/play-icon-512.png` |
| Play feature 1024×500 | `public/icons/play-feature-1024x500.png` |
| Capacitor config | `capacitor.config.cjs` (`server.url` → production) |

---

## 2. Web install (no developer accounts)

1. Deploy production with HTTPS.
2. On iPhone Safari: Share → **Add to Home Screen**.
3. On Android Chrome: Install app / Add to Home screen.
4. Confirm standalone display, login, Desk, parent Messages.

Optional later: lightweight service worker for shell cache only — **do not** offline the gradebook/money paths without an explicit design.

---

## 3. Capacitor shells (Apple + Google)

On a Mac with Xcode (iOS) and/or Android Studio:

```bash
npm i -D @capacitor/cli @capacitor/core
npm i @capacitor/ios @capacitor/android @capacitor/splash-screen
npx cap add ios
npx cap add android
# Point shells at production (or preview):
BEACON_CAPACITOR_SERVER_URL=https://beacon.commoncentsip.com npx cap sync
npx cap open ios      # Archive → App Store Connect
npx cap open android # Bundle → Play Console
```

`ios/` and `android/` are gitignored by default until you intentionally commit them for CI.

**ADR:** `docs/adr/002-store-shells-capacitor.md`

---

## 4. Listing copy (starter)

**Name:** Beacon  
**Subtitle:** School suite for any school  
**Short description:** Academics, family notes, payments, and principal tools — built for real schools.  
**Category:** Education  

**Full description (draft):**  
Beacon is the full school suite for any school. Teachers run classroom grades and Quick Mode. Families get Notes from school and Dinner Table Digests. The office runs Family Desk, tuition, and go-live health — with honest email and payment modes (log-only until configured). Sign in with your school account.

**Keywords (Apple):** school, grades, parents, education, private school, tuition, attendance  

---

## 5. Screenshots to capture (manual)

Use a real phone or simulator against production/preview:

| Shot | Screen |
|------|--------|
| 1 | Login |
| 2 | Parent home / Notes from school |
| 3 | Family Desk (staff) |
| 4 | Teacher Quick Mode |
| 5 | Dinner Table Digest / student overview |
| 6 | Principal office or Go-live (optional) |

Store sizes change — export current required iPhone/Android sizes from App Store Connect / Play Console when uploading.

Save drafts under `docs/store-assets/` (create locally; large PNGs need not live in git).

---

## 6. Account blockers (cannot finish in-repo)

| Need | Owner |
|------|--------|
| Apple Developer Program ($99/yr) + App Store Connect app | Chad / org |
| Google Play Console (one-time fee) + app listing | Chad / org |
| Signing certs / Play App Signing | Local CI secrets — never commit |
| Age rating + Privacy Nutrition Labels / Data safety forms | Align with `/privacy` |
| Counsel review of privacy/terms if required by schools | Optional but recommended |
| Microsoft Store via [PWABuilder](https://www.pwabuilder.com/) | After PWA installs cleanly |

---

## 7. Review tips

- Demo account for reviewers (principal + parent) with `school_id` set.
- Note in review notes: native shell loads HTTPS web app; auth is Supabase email.
- Do not claim offline-first or unrelated medical/finance certifications.
- Payment features: disclose Stripe; sandbox test mode for review if needed.

---

## 8. Go-live checklist item

Principal → Go-live includes **Mobile / store shells ready (or N/A)** — mark when PWA smoke + listing drafts are done, even before store approval.
