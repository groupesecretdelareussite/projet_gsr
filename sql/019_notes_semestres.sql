-- ============================================================================
-- GSR — Notes par semestre + registre des moyennes semestrielles/annuelle.
-- À coller après 018_td_liberer_creneau.sql.
--
-- Contexte produit : jusqu'ici `notes` n'avait aucune notion de semestre —
-- une ressaisie de "I1" écrasait la précédente (unique sur eleve/matiere/
-- type_note/annee). On ajoute `semestre` à la contrainte unique plutôt que de
-- vider la table entre S1 et S2 : le détail des notes des deux semestres
-- cohabite en base pour toujours, rien n'est jamais supprimé (l'écran Notes
-- gagne juste un sélecteur de semestre à la place d'un bouton de purge).
--
-- `moyennes_semestrielles` est un instantané figé (une ligne par élève par
-- semestre), écrit uniquement par l'action `cloturerSemestre()` — jamais par
-- l'écran de saisie. Le coordonnateur peut la relancer à tout moment (upsert)
-- si une note est corrigée après coup. La moyenne annuelle (MA) n'est pas
-- stockée : elle se calcule à l'affichage à partir des deux lignes S1/S2,
-- comme la moyenne générale l'est déjà aujourd'hui sur /admin/notes/moyennes.
--
-- Idempotent : DROP POLICY IF EXISTS avant chaque CREATE POLICY.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- notes.semestre
-- ---------------------------------------------------------------------------
alter table public.notes
  add column if not exists semestre smallint not null default 1 check (semestre in (1, 2));

-- Nom de l'ancienne contrainte unique retrouvé dynamiquement (pg_constraint)
-- plutôt que deviné en dur — même prudence que sql/018.
do $$
declare
  nom_contrainte text;
begin
  select conname into nom_contrainte
  from pg_constraint
  where conrelid = 'public.notes'::regclass
    and contype = 'u';

  if nom_contrainte is not null then
    execute format('alter table public.notes drop constraint %I', nom_contrainte);
  end if;
end $$;

alter table public.notes
  add constraint notes_eleve_matiere_type_annee_semestre_key
  unique (eleve_id, matiere_id, type_note, annee_scolaire_id, semestre);

-- ---------------------------------------------------------------------------
-- moyennes_semestrielles
-- ---------------------------------------------------------------------------
create table if not exists public.moyennes_semestrielles (
  id                  serial primary key,
  eleve_id            integer not null references public.eleves(id) on delete cascade,
  annee_scolaire_id   integer not null references public.annees_scolaires(id) on delete cascade,
  semestre            smallint not null check (semestre in (1, 2)),
  moyenne_generale    numeric(4,2),
  cloture_par         uuid references public.users(id),
  updated_at          timestamptz not null default now(),
  unique (eleve_id, annee_scolaire_id, semestre)
);

alter table public.moyennes_semestrielles enable row level security;

-- Même périmètre que notes_acces (§4/§5.4 GSR_ARCHITECTURE.md) : coordonnateur/
-- comptable global, superviseur sur ses sites, chef_site sur son site.
-- (secretaire aligné sur chef_site plus tard, sql/020 — pas ici : ce fichier
-- est déjà appliqué tel quel sur la base client depuis le 2026-08-15,
-- l'éditer ici ne l'aurait jamais atteinte là-bas.)
drop policy if exists "moyennes_semestrielles_acces" on public.moyennes_semestrielles;
create policy "moyennes_semestrielles_acces" on public.moyennes_semestrielles
  for all using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.actif = true
      and (
        u.role in ('coordonnateur','comptable')
        or (u.role = 'superviseur' and exists (
          select 1 from public.user_sites us
          join public.eleves e on e.id = moyennes_semestrielles.eleve_id
          join public.classes c on c.id = e.classe_id
          where us.user_id = auth.uid() and us.site_id = c.site_id
        ))
        or (u.role = 'chef_site' and exists (
          select 1 from public.eleves e
          join public.classes c on c.id = e.classe_id
          where e.id = moyennes_semestrielles.eleve_id and c.site_id = u.site_id
        ))
      )
    )
  );
