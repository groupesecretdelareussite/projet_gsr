-- ===========================================================================
-- Migration 031 : Gestion des retraits et paiements des professeurs TD
-- ===========================================================================

create table if not exists td.demandes_retrait (
  id                  serial primary key,
  code_demande        varchar(30) not null unique,
  professeur_id       integer not null references td.professeurs(id) on delete restrict,
  mois                varchar(7) not null, -- Format 'YYYY-MM'
  montant_demande     numeric(10,2) not null check (montant_demande >= 5000),
  reseau_momo         text not null check (reseau_momo in ('mtn', 'moov', 'celtis')),
  numero_momo         varchar(25) not null,
  statut              text not null default 'en_attente' check (statut in ('en_attente', 'paye', 'rejete')),
  date_demande        timestamptz not null default now(),
  ip_demande          text,
  date_paiement       timestamptz,
  paye_par            uuid references public.users(id),
  reference_paiement  text,
  commentaire_admin   text,
  date_rejet          timestamptz,
  rejete_par          uuid references public.users(id)
);

-- Index d'unicité mensuelle : un professeur ne peut avoir qu'une seule demande active ou payée par mois.
-- Si une demande est rejetée, l'index partiel permet au professeur d'en soumettre une nouvelle corrigée.
create unique index if not exists idx_retrait_prof_mois_actif
  on td.demandes_retrait (professeur_id, mois)
  where statut in ('en_attente', 'paye');

-- Index de performance pour les recherches et l'historique
create index if not exists idx_demandes_retrait_statut on td.demandes_retrait(statut);
create index if not exists idx_demandes_retrait_prof on td.demandes_retrait(professeur_id);
create index if not exists idx_demandes_retrait_mois on td.demandes_retrait(mois);
create index if not exists idx_demandes_retrait_code on td.demandes_retrait(code_demande);

-- RLS — lecture réservée au coordonnateur en direct, Server Actions via service_role
alter table td.demandes_retrait enable row level security;

drop policy if exists "td_demandes_retrait_lecture_coordonnateur" on td.demandes_retrait;
create policy "td_demandes_retrait_lecture_coordonnateur" on td.demandes_retrait
  for select using (
    exists (select 1 from public.users u where u.id = auth.uid() and u.actif = true and u.role = 'coordonnateur')
  );

grant select, insert, update, delete on td.demandes_retrait to service_role, authenticated;
grant usage, select on sequence td.demandes_retrait_id_seq to service_role, authenticated;
