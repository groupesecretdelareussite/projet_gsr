-- ============================================================================
-- GSR — Schéma public — v2.1 (voir GSR_ARCHITECTURE.md §4)
-- À coller tel quel dans le SQL Editor du dashboard Supabase.
-- Ordre : dépendances FK respectées (sites -> classes -> ... )
-- ============================================================================

-- ---------------------------------------------------------------------------
-- sites
-- ---------------------------------------------------------------------------
create table public.sites (
  id        serial primary key,
  nom_site  varchar(100) not null,
  initiale  char(1) unique not null
);

-- ---------------------------------------------------------------------------
-- classes (§4 — ordre + classe_suivante_id par site, v1.1)
-- ---------------------------------------------------------------------------
create table public.classes (
  id                  serial primary key,
  nom_classe          varchar(50) not null,
  site_id             integer not null references public.sites(id) on delete cascade,
  ordre               integer not null default 0,
  classe_suivante_id  integer references public.classes(id) on delete set null,
  unique (nom_classe, site_id)
);

-- ---------------------------------------------------------------------------
-- frais_td (montant uniforme par classe, v1.1 — site_id supprimé)
-- ---------------------------------------------------------------------------
create table public.frais_td (
  id        serial primary key,
  classe_id integer not null unique references public.classes(id) on delete cascade,
  montant   numeric(10,2) not null
);

-- ---------------------------------------------------------------------------
-- annees_scolaires
-- ---------------------------------------------------------------------------
create table public.annees_scolaires (
  id          serial primary key,
  libelle     varchar(10) not null,
  date_debut  date not null,
  date_fin    date not null,
  statut      text not null default 'en_cours'
              check (statut in ('en_cours','en_pause','terminee'))
);

-- ---------------------------------------------------------------------------
-- users (staff interne — v2.0/v2.1, voir §4 pour la note sur le compte
-- coordonnateur initial : aucun compte hardcodé, créé via scripts/seed-admin.ts)
-- ---------------------------------------------------------------------------
create table public.users (
  id        uuid primary key default gen_random_uuid()
            references auth.users(id) on delete cascade,
  username  text unique not null,
  email     text unique not null,
  role      text not null
            check (role in ('coordonnateur','comptable','superviseur','chef_site','secretaire')),
  site_id   integer references public.sites(id) on delete set null,
  actif     boolean not null default true
);

-- ---------------------------------------------------------------------------
-- user_sites (assignation multi-sites des superviseurs — v2.0)
-- ---------------------------------------------------------------------------
create table public.user_sites (
  user_id  uuid not null references public.users(id) on delete cascade,
  site_id  integer not null references public.sites(id) on delete cascade,
  primary key (user_id, site_id)
);

-- ---------------------------------------------------------------------------
-- eleves (v2.1 — colonne `statut` remplace le pattern DELETE + eleves_suspendus
-- dupliqué ; voir §4 pour la justification complète du fix)
-- ---------------------------------------------------------------------------
create table public.eleves (
  id                serial primary key,
  matricule         varchar(9) unique not null,
  nom               varchar(100) not null,
  prenoms           varchar(150) not null,
  contact_parent    varchar(25) not null,
  classe_id         integer not null references public.classes(id) on delete cascade,
  college           varchar(150) not null,
  option_m          varchar(10),
  statut            text not null default 'actif'
                    check (statut in ('actif','suspendu')),
  date_inscription  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- eleves_suspendus (v2.1 — table de métadonnées légère, référence eleve_id,
-- ne duplique plus les champs de l'élève. Voir §4.)
-- ---------------------------------------------------------------------------
create table public.eleves_suspendus (
  id                 serial primary key,
  eleve_id           integer not null unique references public.eleves(id) on delete cascade,
  site_id            integer not null references public.sites(id) on delete cascade,
  raison             text not null
                     check (raison in ('maladie','renvoi','defaut_paiement','autre')),
  motif              text not null,
  montant_du         integer not null default 0,
  date_suspension    timestamptz not null default now(),
  suspendu_par       uuid not null references public.users(id),
  annee_scolaire_id  integer not null references public.annees_scolaires(id)
);

-- ---------------------------------------------------------------------------
-- paiements
-- ---------------------------------------------------------------------------
create table public.paiements (
  id                  serial primary key,
  eleve_id            integer not null references public.eleves(id) on delete cascade,
  mois_souscription   varchar(20) not null
                      check (mois_souscription in
                        ('Octobre','Novembre','Decembre','Janvier','Fevrier','Mars','Avril','Mai')),
  montant_paye        integer not null,
  date_paiement       date not null,
  mode_paiement       varchar(20) not null check (mode_paiement in ('MoMo','Presentiel')),
  annee_scolaire_id   integer not null references public.annees_scolaires(id) on delete cascade
);

-- ---------------------------------------------------------------------------
-- paiements_supprimes (traçabilité — pas de FK sur matricule, voir §4)
-- ---------------------------------------------------------------------------
create table public.paiements_supprimes (
  id                  serial primary key,
  matricule           varchar(9) not null,
  mois_souscription   varchar(20) not null,
  montant_paye        integer not null,
  date_paiement       date not null,
  mode_paiement       varchar(20) not null,
  admin_id            uuid not null references public.users(id) on delete restrict,
  date_suppression    timestamptz not null default now(),
  motif               text not null
);

-- ---------------------------------------------------------------------------
-- presences
-- ---------------------------------------------------------------------------
create table public.presences (
  id                  serial primary key,
  eleve_id            integer not null references public.eleves(id) on delete cascade,
  date_presence       date not null,
  site_id             integer not null references public.sites(id) on delete cascade,
  classe_id           integer not null references public.classes(id) on delete cascade,
  present             boolean not null default true,
  annee_scolaire_id   integer not null references public.annees_scolaires(id) on delete cascade,
  unique (eleve_id, date_presence)
);

-- ---------------------------------------------------------------------------
-- matieres
-- ---------------------------------------------------------------------------
create table public.matieres (
  id     serial primary key,
  nom    varchar(100) not null,
  code   varchar(10) unique not null,
  ordre  integer not null default 0,
  actif  boolean not null default true
);

-- ---------------------------------------------------------------------------
-- notes
-- ---------------------------------------------------------------------------
create table public.notes (
  id                  serial primary key,
  eleve_id            integer not null references public.eleves(id) on delete cascade,
  matiere_id          integer not null references public.matieres(id) on delete cascade,
  type_note           text not null check (type_note in ('I1','I2','I3','D1','D2','Ctrl')),
  valeur              numeric(4,2) not null check (valeur >= 0 and valeur <= 20),
  annee_scolaire_id   integer not null references public.annees_scolaires(id) on delete cascade,
  updated_at          timestamptz not null default now(),
  unique (eleve_id, matiere_id, type_note, annee_scolaire_id)
);

-- ---------------------------------------------------------------------------
-- notifications
-- ---------------------------------------------------------------------------
create table public.notifications (
  id              serial primary key,
  site_id         integer not null references public.sites(id) on delete cascade,
  contenu         text not null,
  lu              boolean not null default false,
  date_creation   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- log_whatsapp (pas de FK sur matricule, voir §4)
-- ---------------------------------------------------------------------------
create table public.log_whatsapp (
  id                  serial primary key,
  matricule           varchar(9) not null,
  mois_souscription   varchar(20) not null,
  montant_restant     integer not null,
  contact_parent      varchar(25) not null,
  envoye_par          uuid not null references public.users(id),
  date_envoi          timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- comptes_parents (pas de FK sur matricule, voir §4)
-- ---------------------------------------------------------------------------
create table public.comptes_parents (
  id                   serial primary key,
  matricule            varchar(9) unique not null,
  mot_de_passe         text not null,
  date_creation        timestamptz not null default now(),
  derniere_connexion   timestamptz
);

-- ---------------------------------------------------------------------------
-- decisions_passage (v2.1 — ajout du statut `sortant`, voir §4/§12.9)
-- ---------------------------------------------------------------------------
create table public.decisions_passage (
  id                  serial primary key,
  eleve_id            integer not null references public.eleves(id) on delete cascade,
  decision            text not null check (decision in ('passe','redouble','sortant')),
  nouvelle_classe_id  integer references public.classes(id),
  annee_scolaire_id   integer not null references public.annees_scolaires(id),
  date_decision       timestamptz not null default now(),
  decide_par          uuid not null references public.users(id)
);

-- ---------------------------------------------------------------------------
-- categories_depenses
-- ---------------------------------------------------------------------------
create table public.categories_depenses (
  id       serial primary key,
  nom      varchar(100) unique not null,
  systeme  boolean not null default false
);

-- ---------------------------------------------------------------------------
-- depenses_annexes
-- ---------------------------------------------------------------------------
create table public.depenses_annexes (
  id                  serial primary key,
  categorie_id        integer not null references public.categories_depenses(id) on delete restrict,
  libelle             varchar(255) not null,
  montant             numeric(10,2) not null,
  date_depense        date not null,
  saisi_par           uuid not null references public.users(id) on delete restrict,
  date_saisie         timestamptz not null default now(),
  annee_scolaire_id   integer not null references public.annees_scolaires(id) on delete restrict
);

-- ---------------------------------------------------------------------------
-- galerie
-- ---------------------------------------------------------------------------
create table public.galerie (
  id               serial primary key,
  storage_path     text not null,
  date_insertion   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- login_attempts (v2.1 §5.6 — anti brute-force sur les 3 systèmes de login)
-- ---------------------------------------------------------------------------
create table public.login_attempts (
  id               serial primary key,
  identifiant      text not null,
  portail          text not null check (portail in ('admin','parent','td')),
  reussi           boolean not null,
  ip               inet,
  date_tentative   timestamptz not null default now()
);

create index idx_login_attempts_lookup
  on public.login_attempts (identifiant, portail, date_tentative);
