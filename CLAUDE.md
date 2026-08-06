# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project layout

This repo's working root for the Next.js app is `gsr/` (this directory) — the parent folder (`PROJET_GSR/`) is not a git repo and mostly contains loose reference images unrelated to the app. All commands below assume you're in `gsr/`.

`GSR_ARCHITECTURE.md` at the repo root (one level up, `PROJET_GSR/GSR_ARCHITECTURE.md`) is the authoritative design reference — database schema, RLS policies, business rules, and the full 20-item "interdits absolus" (absolute prohibitions) list. **Read it before touching auth, permissions, payments, suspension, TD arbitrage, or fin-d'année logic** — a lot of the business logic here is non-obvious and encoded there, not in code comments. It describes the *target* system (v2.1); see "Current implementation state" below for what actually exists in code today.

## Commands

```bash
npm run dev      # start dev server (localhost:3000)
npm run build    # production build
npm run lint     # eslint .
npm run test             # Vitest — Levels 1+2 (unit + role-guard), no network required
npm run test:watch       # Vitest watch mode, Levels 1+2
npm run test:integration # Vitest — Level 3, real network calls against the Supabase project (needs .env.local + .env.test.local)
```

Three-tier test strategy (see `*.test.ts` next to the files they cover, and `*.integration.test.ts` for Level 3): Level 1 pure `src/lib/` unit tests, Level 2 Server Action role-guard tests (`@/lib/auth-scope` mocked, no network), Level 3 integration tests against the real (current) Supabase project — treated as the de facto test environment for now; a client-owned project will be created later and migrated via the same `sql/` files.

Seeding the first admin account (one-shot, service-role key required — never run against prod carelessly):
```bash
SUPABASE_SERVICE_ROLE_KEY=xxx SEED_ADMIN_USERNAME=admin SEED_ADMIN_PASSWORD=xxx npx tsx scripts/seed-admin.ts
```

SQL migrations live in `sql/` and are applied manually to Supabase in numeric order (`001_schema_public.sql` → `005_seed.sql`); there is no migration runner.

## Current implementation state

Only a subset of `GSR_ARCHITECTURE.md`'s full vision is built. As of now:
- **Vitrine** (public site): `src/app/(vitrine)/*` — mostly complete.
- **Admin — élèves module**: login, inscription, liste, modification, suspension/réinscription (`src/app/admin/eleves/*`, `src/actions/eleves.ts`).
- **Admin — paiements module**: enregistrement, historique, à-jour, en-retard (filtre par mois, avec relance WhatsApp journalisée), suppression avec mot de passe+motif (`src/app/admin/paiements/*`, `src/actions/paiements.ts`, `src/lib/paiements.ts`).
- **Suspension automatique** (§12.3, 2026-07-28) : `src/lib/suspension-auto.ts` (logique) + `src/app/api/cron/suspension-auto/route.ts` (déclenchée par le cron Vercel défini dans `vercel.json`, `0 0 1 * *`). Authentifiée par secret partagé `CRON_SECRET` (env var — même valeur requise côté Vercel une fois déployé), pas par `getUserScope` (aucune session admin dans ce contexte). Pour tester manuellement avec une date simulée (le calendrier réel actuel est hors année scolaire) : `SIMULE_DATE=2026-11-01 npx tsx scripts/test-suspension-auto.ts` — ce n'est pas un dry-run, ça suspend réellement les élèves en défaut.
- **Admin — paramètres/gestion utilisateurs** (coordonnateur only): créer/modifier/désactiver/réactiver/supprimer un compte, réinitialiser un mot de passe (`src/app/admin/parametres/utilisateurs`, `src/actions/utilisateurs.ts`) — currently untracked in git (not yet committed).
- **Admin — tableau de bord**: KPIs (élèves actifs, non-à-jour, nouveaux ce mois), répartition par classe (recharts), panneau d'alertes de retard (`src/app/admin/tableau-de-bord/page.tsx`).
- **Not yet implemented**: portail parents, portail TD, présences, notes, statistiques financières détaillées, comptabilité (dépenses annexes), fin-d'année, notifications/Realtime, galerie admin, **gestion des données scolaires** (sites/classes/frais_td — pas de page Paramètres pour ça ; actuellement seedées à la main via `sql/005_seed.sql`, aucun coordonnateur ne peut créer une classe ou fixer un tarif TD depuis l'interface). When asked to build these, treat `GSR_ARCHITECTURE.md` as the spec, but verify current code state first since this file will go stale as features land — don't assume a table, RLS policy, or Server Action described there already exists without checking `sql/` and `src/actions/`.
- `classes.classe_suivante_id` models a simple 1:1 promotion chain only. Where a grade level is a genuine decision point (e.g. a "3ème" splitting into multiple séries at "Seconde"), leave it `NULL` and say so in a comment — see `sql/005_seed.sql`'s Jéricho block for the pattern. A future fin-d'année Server Action must treat `NULL` as "needs manual per-student review" (pick a `decisions_passage.nouvelle_classe_id`, possibly cross-site), not auto-assume `sortant` — that assumption only holds for a true end-of-chain level.
- `npm run build` and `npm run lint` are both clean as of this writing — no known build-breaking issues in the current tree.

## Architecture

**Stack**: Next.js 16 (App Router) + React 19 + Supabase (Postgres + Auth + Storage) + Tailwind + shadcn/ui-style components, deployed on Vercel.

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

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
