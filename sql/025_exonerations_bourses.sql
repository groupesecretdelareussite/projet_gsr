-- ============================================================================
-- GSR — Exonérations permanentes et bourses scolaires
-- À coller après 024_professeurs_validation.sql.
--
-- Règles métier :
--   - Exonération permanente : l'élève est dispensé de frais pour les 8 mois
--     de l'année scolaire en cours (Octobre à Mai).
--   - Bourse scolaire : l'élève bénéficie d'une dispense sur un nombre variable
--     de mois (1 à 8 mois) pour l'année scolaire en cours.
--   - Seul le coordonnateur est habilité à accorder, modifier ou révoquer
--     une exonération ou une bourse.
--   - Les mois couverts sont synchronisés dans public.mois_exoneres.
--
-- Idempotent : CREATE TABLE IF NOT EXISTS, DROP POLICY IF EXISTS.
-- ============================================================================

create table if not exists public.eleves_exonerations (
  id                  serial primary key,
  eleve_id            integer not null references public.eleves(id) on delete cascade,
  annee_scolaire_id   integer not null references public.annees_scolaires(id) on delete cascade,
  type_exoneration    text not null check (type_exoneration in ('permanente', 'bourse')),
  nombre_mois         integer not null check (nombre_mois between 1 and 8),
  mois_couverts       text[] not null,
  motif               text not null,
  accorde_par         uuid not null references public.users(id),
  created_at          timestamptz not null default now(),
  unique (eleve_id, annee_scolaire_id)
);

alter table public.eleves_exonerations enable row level security;

-- Lecture : coordonnateur, comptable, et superviseur sur ses sites
drop policy if exists "eleves_exonerations_lecture" on public.eleves_exonerations;
create policy "eleves_exonerations_lecture" on public.eleves_exonerations
  for select using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.actif = true
      and (
        u.role in ('coordonnateur', 'comptable')
        or (u.role = 'superviseur' and exists (
          select 1 from public.user_sites us
          join public.eleves e on e.id = eleves_exonerations.eleve_id
          join public.classes c on c.id = e.classe_id
          where us.user_id = auth.uid() and us.site_id = c.site_id
        ))
      )
    )
  );

-- Écriture (insert, update, delete) : réservée au coordonnateur uniquement
drop policy if exists "eleves_exonerations_ecriture" on public.eleves_exonerations;
create policy "eleves_exonerations_ecriture" on public.eleves_exonerations
  for all using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.actif = true
      and u.role = 'coordonnateur'
    )
  );
