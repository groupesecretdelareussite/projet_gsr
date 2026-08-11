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

SQL migrations live in `sql/` and are applied manually to Supabase in numeric order (`001_schema_public.sql` → `017_programmes_publics_rls.sql` as of this writing); there is no migration runner. **`015`/`016`/`017` are written but not yet applied anywhere** (neither the test Supabase nor the client's) — see "Historique et points ouverts" below before assuming `td.creneaux.classe_id` already points to `public.classes` in a live database.

## Current implementation state

All 7 core phases of `GSR_ARCHITECTURE.md` are now built, plus Portail TD, Comptabilité globale, and Notes/Moyennes. As of now:
- **Vitrine** (public site): `src/app/(vitrine)/*` — complete (actualités, galerie, tarifs, sites, programmes).
- **Admin — élèves module**: login, inscription, liste, modification, suspension/réinscription, deux contacts parents (`src/app/admin/eleves/*`, `src/actions/eleves.ts`).
- **Admin — paiements module**: enregistrement, historique, à-jour, en-retard (filtre par mois, relance WhatsApp journalisée), suppression avec mot de passe+motif, pénalité de réinscription (`src/app/admin/paiements/*`, `src/actions/paiements.ts`, `src/lib/paiements.ts`).
- **Suspension automatique** (§12.3, 2026-07-28) : `src/lib/suspension-auto.ts` (logique) + `src/app/api/cron/suspension-auto/route.ts` (déclenchée par le cron Vercel défini dans `vercel.json`, `0 0 1 * *`). Authentifiée par secret partagé `CRON_SECRET` (env var — même valeur requise côté Vercel une fois déployé), pas par `getUserScope` (aucune session admin dans ce contexte). Pour tester manuellement avec une date simulée : `SIMULE_DATE=2026-11-01 npx tsx scripts/test-suspension-auto.ts` — ce n'est pas un dry-run, ça suspend réellement les élèves en défaut.
- **Admin — paramètres**: gestion utilisateurs (`src/actions/utilisateurs.ts`), coefficients (`src/actions/coefficients.ts`), données scolaires — sites/classes/frais TD (`src/actions/donnees-scolaires.ts`), tous coordonnateur-only.
- **Admin — tableau de bord**: KPIs, répartition par classe (recharts), alertes de retard (`src/app/admin/tableau-de-bord/page.tsx`).
- **Admin — présences, notes/moyennes, comptabilité (dépenses annexes), fin d'année, notifications, galerie, actualités**: each has its own `src/app/admin/<module>/*` + `src/actions/<module>.ts` + tests.
- **Portail parents** (`src/app/portail-parents/*`, `src/actions/auth-parent.ts`, `src/lib/session-parent.ts`): création de compte, dashboard.
- **Portail TD** (`src/app/td/*`, schema `td` in `sql/002_schema_td.sql` + `009_td_module.sql`+): `td/coord/{dashboard,planning,arbitrage,config,finance}` for the coordonnateur (reuses the admin session — see auth model below), `td/prof/{dashboard,candidatures,aide}` for professeurs (`src/actions/auth-td.ts`, `src/lib/session-td.ts`). Weekly schedule state lives in `src/actions/td-semaines.ts` — a "semaine" (Monday–Sunday, any day allowed for its creneaux) has creneaux and a publication state the coordonnateur controls from `td/coord/planning`. `td.creneaux.classe_id` references `public.classes` directly (not an independent TD-only list — see `sql/015_td_classes_reelles.sql`), which is what makes the public vitrine page possible: `src/app/(vitrine)/programmes/page.tsx` is a Server Component reading the currently `publiee` semaine's creneaux through the normal RLS-bound client (`anon`-scoped read policies in `sql/017_programmes_publics_rls.sql`), grouped/filterable by real site.
- When extending any module, treat `GSR_ARCHITECTURE.md` as the spec of record but verify current code state first — don't assume a table, RLS policy, or Server Action described there already exists without checking `sql/` and `src/actions/`.
- `classes.classe_suivante_id` models a simple 1:1 promotion chain only. Where a grade level is a genuine decision point (e.g. a "3ème" splitting into multiple séries at "Seconde"), leave it `NULL` and say so in a comment — see `sql/005_seed.sql`'s Jéricho block for the pattern. A future fin-d'année Server Action must treat `NULL` as "needs manual per-student review" (pick a `decisions_passage.nouvelle_classe_id`, possibly cross-site), not auto-assume `sortant` — that assumption only holds for a true end-of-chain level.
- `npm run build` and `npm run lint` are both clean as of this writing — no known build-breaking issues in the current tree.

## Historique et points ouverts

Repères pour ne pas reperdre le contexte d'une session à l'autre. Le détail fin de chaque changement reste dans `git log` — cette section ne garde que les décisions, leur "pourquoi", et ce qui reste en suspens.

### En attente / à ne pas oublier
- **`sql/015`/`016`/`017` écrits mais pas encore appliqués** — ni sur la base de test actuelle (`.env.local`), ni sur celle du client. Tant que `015` n'est pas appliqué : `npm run test:integration` échoue, et créer un créneau TD casse (l'ancienne FK vers `td.classes_td` n'existe plus côté code, mais la vraie base a encore l'ancien schéma).
- **3 fichiers vitrine annoncent encore un horaire TD obsolète** ("Mercredi · Samedi · Dimanche", alors que la règle est "n'importe quel jour de la semaine" depuis fin juillet 2026) : `src/components/vitrine/BrochurePDF.tsx`, `src/app/(vitrine)/sites/page.tsx`, `src/components/vitrine/HomeClient.tsx`. Repéré plusieurs fois, jamais corrigé — en attente d'une décision utilisateur.
- **Restriction des candidatures professeur par zone** : explicitement laissée de côté au moment de lier `td.creneaux` aux vraies classes — rien n'empêche aujourd'hui un professeur de postuler hors de sa zone d'affectation.
- **`td.zones` et `public.sites` restent deux tables séparées** bien qu'elles se recouvrent (mêmes noms de sites) — pas unifiées, à reconsidérer si ça devient gênant.
- **"Agent IA"** : item de menu grisé, scope jamais défini — ne pas construire sans reconfirmer avec l'utilisateur.
- **Galerie vitrine publique** : contenu statique, pas branchée sur Supabase Storage — différé volontairement, à ne pas confondre avec la Galerie admin interne (`/admin/galerie`), elle terminée.
- **4 documents livrables attendus par le client** (document client, guide utilisateur, contrat de maintenance, document ultra-technique pour un futur développeur humain) — pas commencés ; leur condition de déclenchement d'origine (migration Next 16 faite + infra dédiée client en place) est remplie.

### Infra de déploiement — état réel (source de confusion récurrente, à ne pas réinterpréter)
- GitHub du projet : `groupesecretdelareussite/projet_gsr` (organisation du client — le transfert depuis le compte personnel du développeur est fait).
- Vercel + Supabase dédiés au client : déjà en place et fonctionnels d'après l'utilisateur — l'assistant n'y a pas accès et n'a pas besoin de s'y connecter pour travailler.
- `.env.local` de ce dépôt local pointe **volontairement** sur un projet Supabase de dev/test séparé (données de démo, `college = 'COLLEGE DEMO'`) — ce n'est **pas** un signe que l'infra client manque ; ne pas réinterpréter cet état comme une anomalie à corriger.
- L'ancien "gel" de push (posé quand Vercel pointait encore sur ce même Supabase de test) n'a jamais été explicitement levé mais sa justification semble résolue — appliquer simplement la règle standard du projet : jamais de `git push` sans un "commit et push" explicite de l'utilisateur, à chaque fois, sans le traiter comme un gel spécial actif.

### Repères de fond
- Les 7 phases de `GSR_ARCHITECTURE.md` ont été bouclées, puis Portail TD, Comptabilité globale et Notes/Moyennes construits dans la foulée (détail dans "Current implementation state" ci-dessus).
- Le client a formulé ses exigences de livraison finale (infra dédiée, preview de recette avant prod, 4 documents livrables) après cette première vague de fonctionnalités.
- Un audit sécurité externe a été traité : headers HTTP (CSP statique sans nonce, HSTS, X-Frame-Options, nosniff), rate-limiting sur la création de compte parent.
- La migration Next.js 14→16 (API serveur asynchrones, `middleware.ts`→`proxy.ts`, React 19, ESLint flat config) est terminée — confirmé via `next: 16.3.0` dans `package.json`.
- Deux contacts parents ajoutés (WhatsApp obligatoire pour au moins un des deux, format Bénin normalisé `+229 01 XX XX XX XX`).
- Règle TD "semaine" assouplie : lundi→dimanche, n'importe quel jour autorisé pour un créneau (avant : Mercredi/Samedi/Dimanche uniquement).
- `td.creneaux.classe_id` migré de la liste indépendante `td.classes_td` vers les vraies classes de l'école (`public.classes` — site + section réels, ex. "Terminale A" à Jéricho, pas juste "6ème" générique) : ça débloque un programme TD vraiment scopé par site, et corrige un bug où deux vraies sections de même niveau au même site ne pouvaient pas avoir de créneau à la même heure. Bug préexistant corrigé au passage dans `td.arbitrer_creneau()` (Règle A) : ne détectait qu'une égalité stricte d'heure de début, pas un vrai chevauchement d'intervalles horaires.

## Architecture

**Stack**: Next.js 16 (App Router) + React 19 + Supabase (Postgres + Auth + Storage) + Tailwind + shadcn/ui-style components, deployed on Vercel.

### Two Postgres schemas in one Supabase project
`public` holds all GSR data (élèves, paiements, users, sites, classes…); `td` holds the separate TD (professeur scheduling) portal data — though `td.creneaux.classe_id` is a cross-schema FK straight into `public.classes` (see "Historique" above), so "never join across schemas" below is about Supabase-JS query joins specifically, not SQL-level FK constraints. **Never join across schemas in a single Supabase JS query** — issue two separate queries and combine in TypeScript (this is absolute prohibition #8 in the architecture doc).

### Auth model — three independent systems, all built
1. **Admin staff** (`public.users`): Supabase Auth (JWT, httpOnly cookies). The login screen asks for `username`, but Supabase Auth only knows `email` — `login()` in `src/actions/auth.ts` resolves `username → email` via the service-role client first, *then* calls `signInWithPassword`. This lookup can't be skipped or replaced by a direct Supabase Auth call.
2. **Parents** (`public.comptes_parents`): bcrypt + signed httpOnly cookie (`src/lib/session-parent.ts`), no Supabase Auth.
3. **TD professeurs** (`td.professeurs`): same custom bcrypt pattern as parents (`src/lib/session-td.ts`); the coordonnateur reuses their existing admin session inside the TD portal instead of a fourth auth system.

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
