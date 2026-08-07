# ADR 002 — Store shells via Capacitor (URL-loaded)

## Status

Accepted — 2026-08-07

## Context

Beacon needs App Store and Google Play presence. The product is a multi-tenant Next.js App Router suite (Supabase auth, server actions, Stripe webhooks, Family Desk). A React Native rewrite would duplicate every surface and violate Solid Systems simplicity.

## Decision

Ship **thin Capacitor (or equivalent) native shells** that load the production HTTPS origin via `server.url`. Keep one web codebase on Vercel. Use a standard Web App Manifest so browsers can install Beacon without stores.

## Consequences

**Positive**
- One product to test for academics, money, and comms
- Store listings without rewriting Family Desk / Craft / billing
- PWA install works before developer accounts exist

**Negative / risks**
- App Review may scrutinize “web wrapper” apps — provide real native affordances (splash, status bar, deep links) and a polished mobile UX
- Offline is limited unless we add a deliberate SW strategy later
- `ios/` / `android/` projects need Mac/CI maintenance when Capacitor upgrades

**Rejected alternatives**
- Next `output: 'export'` static package — breaks auth and server actions
- Full React Native rewrite — cost and drift
- Separate “lite” native app — splits the daily driver (Desk) from the suite
