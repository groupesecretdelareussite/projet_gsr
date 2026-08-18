-- ============================================================================
-- GSR — Récompenses financières d'excellence scolaire (§discussion 2026-08-18)
-- À coller après 022_paiements_enregistre_par.sql.
--
-- Règles d'attribution :
--   - Interrogations (I1, I2, I3) en matières scientifiques (MATHS, PCT, SVT) :
--     note exacte de 20/20 requise -> 200 F.
--   - Devoirs (D1, D2) toutes matières confondues :
--     note >= 18/20 requise -> 500 F.
--
-- Traçabilité & intégrité :
--   - note_id UNIQUE sur public.recompenses : garantit de manière absolue
--     qu'une note éligible ne peut être payée qu'une seule fois.
--   - depense_id référence public.depenses_annexes : rattachement direct
--     au grand livre comptable (catégorie 'Récompense').
--
-- Idempotent : CREATE TABLE IF NOT EXISTS, DROP POLICY IF EXISTS.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Catégorie de dépense système 'Récompense'
-- ---------------------------------------------------------------------------
insert into public.categories_depenses (nom, systeme)
values ('Récompense', true)
on conflict (nom) do nothing;

-- ---------------------------------------------------------------------------
-- Table public.recompenses
-- ---------------------------------------------------------------------------
create table if not exists public.recompenses (
  id                  serial primary key,
  note_id             integer not null unique references public.notes(id) on delete cascade,
  eleve_id            integer not null references public.eleves(id) on delete cascade,
  annee_scolaire_id   integer not null references public.annees_scolaires(id) on delete cascade,
  mois                varchar(20) not null,
  type_gain           text not null check (type_gain in ('interro', 'devoir')),
  montant             integer not null check (montant in (200, 500)),
  depense_id          integer references public.depenses_annexes(id) on delete set null,
  paye_par            uuid not null references public.users(id),
  date_paiement       date not null default current_date,
  created_at          timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.recompenses enable row level security;

drop policy if exists "recompenses_acces" on public.recompenses;
create policy "recompenses_acces" on public.recompenses
  for all using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.actif = true
      and (
        u.role in ('coordonnateur', 'comptable')
        or (u.role = 'superviseur' and exists (
          select 1 from public.user_sites us
          join public.eleves e on e.id = recompenses.eleve_id
          join public.classes c on c.id = e.classe_id
          where us.user_id = auth.uid() and us.site_id = c.site_id
        ))
      )
    )
  );
