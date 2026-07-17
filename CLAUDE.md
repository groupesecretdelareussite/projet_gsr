# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project layout

This repo's working root for the Next.js app is `gsr/` (this directory) — the parent folder (`PROJET_GSR/`) is not a git repo and mostly contains loose reference images unrelated to the app. All commands below assume you're in `gsr/`.

`GSR_ARCHITECTURE.md` at the repo root (one level up, `PROJET_GSR/GSR_ARCHITECTURE.md`) is the authoritative design reference — database schema, RLS policies, business rules, and the full 20-item "interdits absolus" (absolute prohibitions) list. **Read it before touching auth, permissions, payments, suspension, TD arbitrage, or fin-d'année logic** — a lot of the business logic here is non-obvious and encoded there, not in code comments. It describes the *target* system (v2.1); see "Current implementation state" below for what actually exists in code today.

## Commands

```bash
npm run dev      # start dev server (localhost:3000)
npm run build    # production build
npm run lint     # next lint
```

No test framework is configured in this repo (no jest/vitest, no `*.test.*` files).

Seeding the first admin account (one-shot, service-role key required — never run against prod carelessly):
```bash
SUPABASE_SERVICE_ROLE_KEY=xxx SEED_ADMIN_USERNAME=admin SEED_ADMIN_PASSWORD=xxx npx tsx scripts/seed-admin.ts
```

SQL migrations live in `sql/` and are applied manually to Supabase in numeric order (`001_schema_public.sql` → `005_seed.sql`); there is no migration runner.

## Current implementation state

Only a subset of `GSR_ARCHITECTURE.md`'s full vision is built. As of now:
- **Vitrine** (public site): `src/app/(vitrine)/*` — mostly complete.
- **Admin — élèves module**: login, inscription, liste, modification, suspension/réinscription (`src/app/admin/eleves/*`, `src/actions/eleves.ts`).
- **Not yet implemented**: portail parents, portail TD, paiements, présences, notes, statistiques, comptabilité, fin-d'année, notifications/Realtime, galerie admin, paramètres/gestion utilisateurs. When asked to build these, treat `GSR_ARCHITECTURE.md` as the spec, but verify current code state first since this file will go stale as features land — don't assume a table, RLS policy, or Server Action described there already exists without checking `sql/` and `src/actions/`.

## Architecture

**Stack**: Next.js 14 (App Router) + Supabase (Postgres + Auth + Storage) + Tailwind + shadcn/ui-style components, deployed on Vercel.

### Two Postgres schemas in one Supabase project
`public` holds all GSR data (élèves, paiements, users, sites…); `td` will hold the separate TD (professeur scheduling) portal data. **Never join across schemas in a single Supabase JS query** — issue two separate queries and combine in TypeScript (this is absolute prohibition #8 in the architecture doc).

### Auth model — three independent systems (only one is built so far)
1. **Admin staff** (`public.users`, built): Supabase Auth (JWT, httpOnly cookies). The login screen asks for `username`, but Supabase Auth only knows `email` — `login()` in `src/actions/auth.ts` resolves `username → email` via the service-role client first, *then* calls `signInWithPassword`. This lookup can't be skipped or replaced by a direct Supabase Auth call.
2. **Parents** (not yet built): planned to be bcrypt + signed httpOnly cookie, no Supabase Auth.
3. **TD professeurs** (not yet built): same custom bcrypt pattern as parents; the coordonnateur reuses their existing admin session inside the TD portal.

All three are meant to share a 1200s (20 min) inactivity timeout and a brute-force guard via `public.login_attempts` (5 failed attempts / 15 min per identifiant+portail) — see `tropDeTentatives()` in `src/actions/auth.ts` for the pattern already implemented for the admin portal.

### Two Supabase clients with very different guarantees
- `src/lib/supabase/server.ts` / `client.ts` — anon key, **RLS enforced** by Postgres. Default choice for reads.
- `src/lib/supabase/admin.ts` (`createServiceRoleClient()`) — **bypasses RLS entirely**. Only ever imported from `src/actions/*.ts` or `src/app/api/*` route handlers (server-only). Every Server Action that uses it **must call `getUserScope()` before any read/write** — there is no RLS safety net if that check is skipped or misplaced after a query.

### Role & scope model (`src/lib/auth-scope.ts`, `src/lib/constants.ts`)
Five roles: `coordonnateur`, `comptable` (both global scope), `superviseur` (multi-site via `public.user_sites` join table), `chef_site` (single site via `users.site_id`), `secretaire` (dashboard only, no other rights). `getUserScope(supabase)` returns `{ userId, role, siteId, siteIds, isGlobal }`; `siteInScope(scope, siteId)` is the standard guard. Every Server Action that touches scoped data follows the same shape: resolve scope → assert role is allowed → assert the target site is in scope → only then read/write. See `src/actions/eleves.ts` for the reference pattern (`getScopeAndAssert()` + `siteInScope()` before every mutation).

Client-side, `useUserScope()` (`src/hooks/useUserScope.ts`) reads scope from `ScopeProvider` context (`src/components/admin/ScopeProvider.tsx`) — used to conditionally render UI, but this is UI polish only, never a security boundary; the real enforcement is RLS + the Server Action checks above.

### Key business-rule invariants (see `GSR_ARCHITECTURE.md` §12–13 for the full list)
- `eleves.statut` (`actif`/`suspendu`) is a column, **not** a row move between tables — suspension is `UPDATE`, never `DELETE`, specifically to avoid cascading away a student's `paiements`/`presences`/`notes` history. `eleves_suspendus` is a lightweight metadata table (one row per *active* suspension), not the student record itself.
- `matricule` is generated once (`src/lib/matricule.ts`, format `[INITIALE][MM][AA][XXXX]`) and is immutable thereafter — no UI or Server Action may ever change it.
- Payment deletion requires password + motif verified server-side, and is restricted to `coordonnateur`/`comptable` — never `superviseur`, even though `superviseur` can record payments.
- `chef_site` never sees: contacts parents, paiements, financial stats, exports, WhatsApp button, élèves suspendus, comptabilité, paramètres, fin d'année.
- Money amounts are FCFA integers; timezone is `Africa/Porto-Novo`.

### UI conventions
- Interface is French-only (labels, messages, routes) — technical tokens like `MoMo` or subject codes are the only exception.
- Admin/TD portals use system font stack (`Segoe UI, Tahoma, Geneva, Verdana, sans-serif`); vitrine/parents portal uses `Inter`.
- Brand green `#12AA00` / `#0e8f00` gradient on primary buttons, page headers, and the admin sidebar; `#f6b40a` accent is vitrine-only.
- Recurring admin patterns to follow when adding pages: gradient `PageHeader`, `ActionsBar` (icon+label buttons, label hidden on mobile), responsive `DataTable` (cards on mobile via `data-label`), `EmptyState`, colored pill `Badge`s — all already implemented in `src/components/admin/`.
