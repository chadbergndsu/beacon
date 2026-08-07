# ADR 001 — Campus twin presence + kiosk welcome

**Status:** Accepted · **Updated:** 2026-08-07  
**Context:** Beacon badges/kiosk + integrated BeaconCraft at `/craft` (legacy external twin optional)

## Decision

When a student **scans in** at a room kiosk (or RFID device):

1. **Beacon** remains source of truth for attendance, aftercare, billing, and audit (`badge_scans`).
2. The **kiosk screen** shows a short, friendly **welcome** (name + room + IN/OUT).
3. Beacon **fans out** presence to the **campus twin** so markers appear in the matching room.
4. Scan-out clears the twin overlay for that student (badge presence is still authoritative).

**Default twin:** same-origin `/craft` using Go-live room mapping (`settings.craft.roomIdMap`) + name heuristics (`craft-demo-*` layout ids).  
**Legacy:** if `BEACONCRAFT_URL` is an **external** host and `BEACONCRAFT_SCAN_API_KEY` is set, also `POST /api/scans` to that deploy.

Public marketing tour (`/craft/tour` or `/?tour=1`) stays privacy-first (fictional student names only). Staff twin: real **teacher** names + enrollment counts; student markers anonymized (`Student`). Parents see real name + room for **linked** children only.

## Why (current)

| Concern | Choice |
|---------|--------|
| School suite + twin | **Beacon** · `/craft` integrated |
| Legacy 3D-only deploy | Optional `BEACONCRAFT_URL` external fan-out |
| Coupling | Badge DB presence + soft mock upsert; HTTP bridge only for external |

## Target experience (Chris / LCA)

1. Student taps badge at classroom kiosk.
2. Kiosk **full-screen welcome**: “Welcome, Ava!” + room name + IN.
3. Within ~1s, office/principal twin view shows Ava’s marker **inside that classroom**.
4. Teacher desk attendance can later mirror the same presence feed.
5. Aftercare rooms still bill in Beacon; twin only reflects location.

## Implementation phases

### Phase A — shipped

- [x] Beacon rooms, badges, public `/kiosk`, RFID `POST /api/kiosk/device-scan`
- [x] Integrated `/craft` walk campus + presence + mock scan
- [x] Public `/craft/tour` with guided stops
- [x] Login + school site links default same-origin
- [x] Kiosk large welcome flash after successful scan
- [x] Soft twin notify after badge scan (integrated + optional external)

### Phase B — wire real kids

- [x] Map Beacon `school_rooms.id` → craft layout room id (Go-live panel + `BEACONCRAFT_ROOM_MAP` + heuristics)
- [x] On successful `processBadgeScan`: async twin update (never block attendance write)
- [x] OUT scans: clear integrated mock overlay
- [x] Principal → Badges / Go-live: campus twin + room mapping UI
- [ ] Optional: persist `school_rooms.twin_room_id` column (settings map is enough for pilot)

### Phase C — polish

- [ ] Redis/Postgres presence store (multi-instance Vercel) beyond badge sessions + mock map
- [ ] Family portal: “where is my child” only for linked students (already filtered in craft)
- [x] Camera follow of live markers after person search (short look-at window)

## Non-goals (now)

- Replacing Beacon attendance tables with twin memory
- Putting student photos on the public tour
- Perfect 1:1 floor-plan geometry (layout is LCA-inspired abstract twin)

## Security

- External craft scans: `x-api-key` required on that deploy
- Kiosk tokens expire (migrations 015/018)
- Twin fan-out uses server-only secret when external; never expose scan key to browser
- Family views must keep RBAC filter (`presence-filter`)

## Env

```bash
# Optional explicit map (uuid → craft-demo-room-101)
BEACONCRAFT_ROOM_MAP={"…":"craft-demo-room-101"}

# Legacy external twin only
BEACONCRAFT_URL=https://beaconcraft.vercel.app
BEACONCRAFT_SCAN_API_KEY=…
```

Prefer Go-live **Craft room mapping** over env JSON when possible.

## Related code

- Beacon: `src/lib/badge/store.ts` (`processBadgeScan`), `src/components/badge/KioskScanner.tsx`, `src/lib/badge/campus-twin.ts`
- Craft: integrated `/craft`, `src/lib/craft/presence.ts`, mock scan + presence store

## Family feedback (Olivia Berg · 2026-08)

Kid review of the School Digital Twin asked for:

1. **Two floors** — already in demo layout (`Floor 1` / `Floor 2` + stairs/elevator)
2. **Walk with arrow keys** — WASD **and** arrows in in-app `/craft` (`PlayerController`)
3. **Teachers in rooms** — staff markers (prefer **real** teacher names from roster mapping)
4. **People not creepy** — low-poly block people with faces (no glowing capsules / blank spheres)

**Minor privacy (follow-up):** public/tour surfaces use fictional student names only. Staff twin shows real teachers + enrollment counts (~110 at Lighthouse, heavier younger); parents see where their linked child is. Public twin fan-out never sends real `displayName`s. Named staff: Leigh Evans (1st), Debbie (2–3), Jen Berg (4–5, blond), John/Lexie Lynn (middle/HS), Frank (HS), Marian (secretary), Will Gordon (chapel), Chris Cowan (principal, larger avatar).

In-app BeaconCraft at `/craft` is the primary surface for this feedback; external `beaconcraft.vercel.app` remains optional legacy fan-out.
