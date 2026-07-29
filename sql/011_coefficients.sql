-- ============================================================================
-- GSR — Coefficients par matière/classe, pour l'estimation de moyenne
-- (Notes > Moyennes). À coller après 010_td_grants.sql.
--
-- Absence de ligne = "non configuré" (garde-fou dans l'app). coefficient > 0
-- imposé par contrainte : un coefficient nul/négatif ne peut structurellement
-- jamais être enregistré, pas besoin de le distinguer d'une valeur "réelle"
-- de 1 (qui est un coefficient valide pour certaines matières).
--
-- Idempotent : DROP POLICY IF EXISTS avant chaque CREATE POLICY.
-- ============================================================================

create table if not exists public.coefficients (
  id            serial primary key,
  classe_id     integer not null references public.classes(id) on delete cascade,
  matiere_id    integer not null references public.matieres(id) on delete cascade,
  coefficient   numeric(4,2) not null check (coefficient > 0),
  updated_at    timestamptz not null default now(),
  unique (classe_id, matiere_id)
);

alter table public.coefficients enable row level security;

-- Même politique que sites/classes/matieres (§4/§5.1 GSR_ARCHITECTURE.md) :
-- lecture ouverte à tout le staff actif, écritures via service role après
-- vérification coordonnateur côté Server Action (coefficients.ts).
drop policy if exists "coefficients_lecture_staff" on public.coefficients;
create policy "coefficients_lecture_staff" on public.coefficients
  for select using (
    exists (select 1 from public.users u where u.id = auth.uid() and u.actif = true)
  );
