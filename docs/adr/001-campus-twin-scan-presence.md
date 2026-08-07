# ADR 001 — Campus twin presence + kiosk welcome

**Status:** Accepted (product plan) · **Date:** 2026-08-05  
**Context:** Beacon badges/kiosk + BeaconCraft 3D twin (separate deploy)

## Decision

When a student **scans in** at a room kiosk (or RFID device):

1. **Beacon** remains source of truth for attendance, aftercare, billing, and audit (`badge_scans`).
2. The **kiosk screen** shows a short, friendly **welcome** (name + room + IN/OUT).
3. Beacon **fans out** a presence event to **BeaconCraft** so the 3D twin places that student **in the matching room** (live markers / glow).
4. Scan-out moves them out of the room (twin room → exit/off-campus or cleared).

Public marketing tour (`/?tour=1`) stays privacy-first (fictional student names only). Staff twin: real **teacher** names + enrollment counts; student markers anonymized (`Student`). Parents see real name + room for **linked** children only.

## Why separate apps

| Concern | Choice |
|---------|--------|
| School suite (grades, money, auth) | **Beacon** · https://beacon.commoncentsip.com |
| 3D property + live presence viz | **BeaconCraft** · https://beaconcraft.vercel.app |
| Coupling | HTTP scan bridge only (`POST /api/scans` + `SCAN_API_KEY`) — no shared DB yet |

Keeps R3F/three bundle out of the suite app and allows independent deploy.

## Target experience (Chris / LCA)

1. Student taps badge at classroom kiosk.
2. Kiosk **full-screen welcome**: “Welcome, Ava!” + room name + IN.
3. Within ~1s, office/principal twin view shows Ava’s marker **inside that classroom**.
4. Teacher desk attendance can later mirror the same presence feed.
5. Aftercare rooms still bill in Beacon; twin only reflects location.

## Implementation phases

### Phase A — shipped / in progress

- [x] Beacon rooms, badges, public `/kiosk`, RFID `POST /api/kiosk/device-scan`
- [x] BeaconCraft orbit + walk campus, SSE presence, mock `POST /api/scans`
- [x] Production fail-closed `SCAN_API_KEY` on BeaconCraft
- [x] Login + school site links to twin / tour
- [x] Kiosk large welcome flash after successful scan
- [x] Optional fire-and-forget twin notify from Beacon when env configured

### Phase B — wire real kids (next)

- [ ] Map Beacon `school_rooms.id` → craft `roomId` (`room-a101`, …)  
  - Prefer column `school_rooms.twin_room_id` (migration)  
  - Interim: `BEACONCRAFT_ROOM_MAP` JSON env `{ "<uuid>": "room-a101" }` + name heuristics
- [ ] Vercel: `BEACONCRAFT_URL`, `BEACONCRAFT_SCAN_API_KEY` (same secret as craft `SCAN_API_KEY`)
- [ ] On successful `processBadgeScan`: async POST to craft (never block attendance write)
- [ ] OUT scans: craft room `room-parking` or explicit clear API
- [ ] Principal → Badges: “Open campus twin” + room mapping UI

### Phase C — polish

- [ ] Shared auth so staff twin uses real roster (no mock seeds in prod)
- [ ] Redis/Postgres presence store (multi-instance Vercel)
- [ ] Kiosk hardware: small always-on welcome display (current tablet UI is enough for pilot)
- [ ] Family portal: “where is my child” only for linked students (already filtered in craft)

## Non-goals (now)

- Replacing Beacon attendance tables with twin memory
- Putting student photos on the public tour
- Perfect 1:1 floor-plan geometry (layout is LCA-inspired abstract twin)

## Security

- Craft scans: `x-api-key` required in production
- Kiosk tokens expire (migrations 015/018)
- Twin fan-out uses server-only secret; never expose scan key to browser
- Family views must keep RBAC filter (`presence-filter`)

## Env (Beacon → Craft)

```bash
# Beacon (server)
BEACONCRAFT_URL=https://beaconcraft.vercel.app
BEACONCRAFT_SCAN_API_KEY=<same as BeaconCraft SCAN_API_KEY>
# Optional explicit map
# BEACONCRAFT_ROOM_MAP={"uuid-of-room":"room-a101"}

# Beacon (public links)
NEXT_PUBLIC_BEACONCRAFT_URL=https://beaconcraft.vercel.app

# BeaconCraft
SCAN_API_KEY=<long random>
```

## Related code

- Beacon: `src/lib/badge/store.ts` (`processBadgeScan`), `src/components/badge/KioskScanner.tsx`, `src/lib/badge/campus-twin.ts`
- Craft: `src/app/api/scans/route.ts`, `src/lib/presence-store.ts`, `src/lib/school.ts`

## Family feedback (Olivia Berg · 2026-08)

Kid review of the School Digital Twin asked for:

1. **Two floors** — already in demo layout (`Floor 1` / `Floor 2` + stairs/elevator)
2. **Walk with arrow keys** — WASD **and** arrows in in-app `/craft` (`PlayerController`)
3. **Teachers in rooms** — staff markers (prefer **real** teacher names from roster mapping)
4. **People not creepy** — low-poly block people with faces (no glowing capsules / blank spheres)

**Minor privacy (follow-up):** public/tour surfaces use fictional student names only. Staff twin shows real teachers + enrollment counts (~110 at Lighthouse, heavier younger); parents see where their linked child is. Public twin fan-out never sends real `displayName`s. Named staff: Leigh Evans (1st), Debbie (2–3), Jen Berg (4–5, blond), John/Lexie Lynn (middle/HS), Frank (HS), Marian (secretary), Chris Cowan (principal, larger avatar).

In-app BeaconCraft at `/craft` is the primary surface for this feedback; external `beaconcraft.vercel.app` remains the marketing tour host.
