-- ============================================================================
-- GSR — Schéma td (Portail TD) — voir GSR_ARCHITECTURE.md §4
-- À coller après 001_schema_public.sql.
-- ============================================================================

create schema if not exists td;

-- ---------------------------------------------------------------------------
-- td.zones (informatif uniquement)
-- ---------------------------------------------------------------------------
create table td.zones (
  id        serial primary key,
  nom_zone  varchar(100) not null unique
);

-- ---------------------------------------------------------------------------
-- td.classes_td (indépendant de public.classes)
-- ---------------------------------------------------------------------------
create table td.classes_td (
  id          serial primary key,
  nom_classe  varchar(50) not null unique
);

-- ---------------------------------------------------------------------------
-- td.matieres_td (indépendant de public.matieres)
-- ---------------------------------------------------------------------------
create table td.matieres_td (
  id            serial primary key,
  nom_matiere   varchar(100) not null unique
);

-- ---------------------------------------------------------------------------
-- td.professeurs (jamais de suppression — uniquement désactivation)
-- ---------------------------------------------------------------------------
create table td.professeurs (
  id                       serial primary key,
  nom                      varchar(100) not null,
  prenom                   varchar(100) not null,
  telephone                varchar(25) not null unique,
  email                    varchar(150) not null unique,
  mot_de_passe             text not null,
  zone_id                  integer not null references td.zones(id) on delete restrict,
  matiere_principale_id    integer not null references td.matieres_td(id) on delete restrict,
  actif                    boolean not null default true,
  date_inscription         timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- td.semaines (cycle brouillon -> publiee -> cloturee)
-- ---------------------------------------------------------------------------
create table td.semaines (
  id              serial primary key,
  libelle         varchar(100) not null,
  date_debut      date not null,
  date_fin        date not null,
  statut          text not null default 'brouillon'
                  check (statut in ('brouillon','publiee','cloturee')),
  date_creation   timestamptz not null default now(),
  date_cloture    timestamptz
);

-- ---------------------------------------------------------------------------
-- td.creneaux (Règle B — UNIQUE(classe_id, date_td, heure_debut))
-- NB : les valeurs de statut_creneau sont toutes en minuscules, alignées sur
-- td.semaines.statut (voir correction apportée dans 003_triggers_functions.sql
-- où arbitrer_creneau() met 'cloture' et non 'Cloture').
-- ---------------------------------------------------------------------------
create table td.creneaux (
  id                serial primary key,
  semaine_id        integer not null references td.semaines(id) on delete cascade,
  classe_id         integer not null references td.classes_td(id) on delete restrict,
  matiere_id        integer not null references td.matieres_td(id) on delete restrict,
  date_td           date not null,
  heure_debut       time not null,
  heure_fin         time not null,
  montant_prevu     numeric(10,2) not null default 0,
  statut_creneau    text not null default 'brouillon'
                    check (statut_creneau in ('brouillon','public','cloture')),
  unique (classe_id, date_td, heure_debut)
);

-- ---------------------------------------------------------------------------
-- td.postulations
-- ---------------------------------------------------------------------------
create table td.postulations (
  id                    serial primary key,
  creneau_id            integer not null references td.creneaux(id) on delete cascade,
  professeur_id         integer not null references td.professeurs(id) on delete cascade,
  statut_validation     text not null default 'En attente'
                        check (statut_validation in ('En attente','Valide','Refuse')),
  date_postulation      timestamptz not null default now(),
  unique (creneau_id, professeur_id)
);
