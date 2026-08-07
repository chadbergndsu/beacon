# LBC Snack Shack

**What:** Kids buy food at the LBC (snack shack). Parents load prepaid funds. Office charges purchases.

**Tables (migration 023):** `snack_accounts`, `snack_ledger` — first-class money, not `schools.settings`.

**Flows:**
1. Parent dashboard → **LBC Snack Shack** → pick child + amount → Stripe pay link (`snack_topup:…` invoice) → wallet credited on settle
2. Principal → **Tuition & LBC** → charge purchase / cash load / open wallet

**vs FACTS:** Their Financial Intelligence includes incidental billing / prepay accounts inside the Nelnet suite. Beacon keeps snack money **school-owned** next to family billing — same Stripe rails, no third-party snack vendor.
