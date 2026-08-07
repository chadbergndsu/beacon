# Marketing plan — FACTS / Christian schools

**Status:** saved for later (not fully shipped)  
**Owner:** Chad / Common Cents IP  
**Last updated:** 2026-08-07

Product SEO wedges already live on the app (`/vs/facts`, `/vs/renweb`, landing CTAs). **Blog runtime is not built yet** — draft post inventory lives under `docs/marketing/blog-drafts/`.

---

## Positioning (the fight)

**Punchline:** Corporate America is taking advantage of Christian schools — that’s the FACTS.

| Fact | Use in copy |
|------|-------------|
| FACTS is **Nelnet, Inc. (NYSE: NNI)** | Not a church, denomination, or Christian ministry |
| Sells hard into private / faith-based schools | Faith *market* ≠ faith *identity* |
| Wins tuition / aid / collections depth | Concede this honestly — do not out-module fantasy |
| Weakness: family portal fatigue, dual apps, message black holes | **Beacon wedge:** Family Desk, logged replies, Dinner Table Digest |
| Beacon stewardship | Common Cents IP volunteer ministry; income → teachers / tuition support / principal care |

**Do not invent** Beacon capabilities FACTS has that we lack (aid workflows, collections muscle). Prefer phased pilots: family layer first, keep FACTS tuition for a season if needed.

---

## Already shipped (SEO attack surface)

| URL | Role |
|-----|------|
| `/` (logged-out) | FACTS-first hero + **Fun Facts** tab (mocking Nelnet / “not even Christian”) + inquiry CTA |
| `/vs/facts` | Side-by-side + “Is FACTS Christian?” + FAQPage schema |
| `/vs/renweb` | RenWeb → FACTS SIS keyword landing |
| `/about` | Ministry story + inquiry form → `BEACON_FEEDBACK_TO` |
| Sitemap / robots / proxy allowlist | Index the compare pages |

Inquiry routing: `BEACON_FEEDBACK_TO` (default `office@commoncentsip.com`). Owner-bound mail keeps school Reply-To (not inbound rewrite).

---

## Future: blog engine (to build)

**Goal:** tons of indexed posts driving Christian-school / FACTS / RenWeb search → Beacon.

Suggested shape (simplicity first):

1. Typed posts under `src/lib/blog/` (or MD in `content/blog/`)
2. Public `/blog` index + `/blog/[slug]`
3. Article + FAQ JSON-LD, sitemap entries, proxy `path.startsWith('/blog')`
4. Every post ends with CTA → `/#inquiry` + link to `/vs/facts`
5. Seed from drafts in `docs/marketing/blog-drafts/posts.draft.ts`

Guardrails: honest claims only; no doorway spam; prefer substance over thin keyword pages.

---

## Draft post inventory (ready to publish when `/blog` exists)

Source of truth for full bodies: `docs/marketing/blog-drafts/posts.draft.ts`

| Slug | Title angle | Primary keywords |
|------|-------------|------------------|
| `corporate-america-christian-schools-facts` | Flagship pun / thesis | FACTS Christian schools, Nelnet, FACTS alternative |
| `is-facts-a-christian-organization` | FAQ head-on | Is FACTS Christian |
| `renweb-alternative-christian-schools` | RenWeb → FACTS SIS | RenWeb alternative |
| `facts-family-app-portal-black-hole` | Family App fatigue | FACTS Family App alternative |
| `keep-facts-tuition-leave-family-portal` | Phased pilot | leave FACTS Family App |
| `nelnet-facts-christian-school-stewardship` | Board renewal questions | Nelnet FACTS stewardship |
| `dinner-table-digest-vs-school-portals` | Digest vs portals | Dinner Table Digest |
| `christian-school-sis-lock-in` | Suite gravity | FACTS lock-in |
| `how-to-evaluate-facts-alternative` | Buying checklist | evaluate FACTS alternative |
| `parent-replies-christian-school-email` | Reply capture | school parent email replies |
| `faith-based-schools-deserve-honest-software` | Live vs log-only | honest school software |
| `beacon-ministry-vs-public-company-sis` | Ownership contrast | ministry school software |

**More posts to write later (titles only):**

- Peak-season FACTS support vs small-school calendars  
- Why GroupMe is not a school communications strategy  
- Catholic / Protestant independent: same portal wound  
- “We already paid for the suite” — sunk-cost renewal talk track  
- QuickBooks + school-owned pay links vs third-party billers  
- Conference Brief vs printing the whole portal for PTC  

---

## Channels (later)

- [ ] Ship `/blog` + first 12 drafts  
- [ ] Submit sitemap in Google Search Console  
- [ ] LinkedIn / school-leader groups: flagship post only (not spray)  
- [ ] Email nurture: inquiry → vs/facts PDF one-pager (optional)  
- [ ] Track: inquiry form submissions tagged “on-facts” / RenWeb in message body  

---

## Related code / docs

- Compare copy: `src/lib/marketing/facts-compare.ts`  
- Pages: `src/app/vs/facts/page.tsx`, `src/app/vs/renweb/page.tsx`  
- Drafts: `docs/marketing/blog-drafts/`  
- Runbook: `README.md` (market positioning table)
