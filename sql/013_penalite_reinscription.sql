-- ============================================================================
-- GSR — Pénalité de réinscription (500F) + lien Présences/Paiement — voir
-- discussion 2026-08-06. À coller après 012_actualites.sql.
--
-- Règle métier : à la réinscription d'un élève suspendu (toute raison), une
-- pénalité forfaitaire de 500F est exigée en plus d'un éventuel montant dû.
-- Pour une suspension `defaut_paiement`, deux cas selon que l'élève ait
-- fréquenté ou non le mois impayé (vérifié via `presences`) :
--   - venu quand même  → montant dû ET pénalité (le montant dû part dans
--     `paiements`, avec le vrai `mois_souscription`, pour ne pas fausser
--     resteAPayer/suspension auto/graphique comptabilité qui sont tous
--     structurés autour de cette colonne) ;
--   - absent tout le mois → montant dû abandonné, tracé dans
--     `mois_exoneres` (pas simulé comme payé — sinon "Entrées" mentirait),
--     pénalité seule.
-- La pénalité, elle, ne va jamais dans `paiements` (pas de mois_souscription
-- pertinent pour un forfait hors-mois) : table dédiée `penalites_reinscription`,
-- sur le modèle de `paiements_supprimes`.
--
-- `eleves_suspendus.mois_souscription` (nouvelle colonne, nullable — une
-- suspension manuelle maladie/renvoi/autre n'a pas de mois associé) permet de
-- retrouver le mois concerné sans avoir à parser le texte libre `motif`.
--
-- Idempotent : IF NOT EXISTS / DROP POLICY IF EXISTS partout.
-- ============================================================================

alter table public.eleves_suspendus
  add column if not exists mois_souscription varchar(20)
  check (mois_souscription in
    ('Octobre','Novembre','Decembre','Janvier','Fevrier','Mars','Avril','Mai'));

-- ---------------------------------------------------------------------------
-- penalites_reinscription — forfait fixe (500F, appliqué côté application),
-- une ligne par réinscription effective.
-- ---------------------------------------------------------------------------
create table if not exists public.penalites_reinscription (
  id                  serial primary key,
  eleve_id            integer not null references public.eleves(id) on delete cascade,
  montant             integer not null default 500,
  mode_paiement       varchar(20) not null check (mode_paiement in ('MoMo','Presentiel')),
  date_paiement       date not null,
  enregistre_par      uuid not null references public.users(id),
  annee_scolaire_id   integer not null references public.annees_scolaires(id) on delete cascade
);

-- ---------------------------------------------------------------------------
-- mois_exoneres — trace explicite du mois abandonné (Cas C), consultable
-- dans l'historique paiements de l'élève, et exclu du calcul de "Paiements
-- en retard" (sans quoi il y réapparaîtrait indéfiniment une fois l'élève
-- réinscrit — resteAPayer resterait > 0 pour ce mois pour toujours).
-- ---------------------------------------------------------------------------
create table if not exists public.mois_exoneres (
  id                  serial primary key,
  eleve_id            integer not null references public.eleves(id) on delete cascade,
  mois_souscription   varchar(20) not null
                      check (mois_souscription in
                        ('Octobre','Novembre','Decembre','Janvier','Fevrier','Mars','Avril','Mai')),
  annee_scolaire_id   integer not null references public.annees_scolaires(id) on delete cascade,
  motif               text not null default 'Absence totale durant le mois suspendu — dispense du montant dû à la réinscription',
  exonere_par         uuid not null references public.users(id),
  date_exoneration    timestamptz not null default now(),
  unique (eleve_id, mois_souscription, annee_scolaire_id)
);

alter table public.penalites_reinscription enable row level security;
alter table public.mois_exoneres           enable row level security;

-- Même scope que paiements (§5.1) : coordonnateur/comptable global,
-- superviseur sur ses sites via le join eleves → classes → site_id,
-- chef_site et secretaire n'ont pas accès.

drop policy if exists "penalites_reinscription_acces" on public.penalites_reinscription;
create policy "penalites_reinscription_acces" on public.penalites_reinscription
  for all using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.actif = true
      and (
        u.role in ('coordonnateur', 'comptable')
        or (u.role = 'superviseur' and exists (
          select 1 from public.user_sites us
          join public.eleves e on e.id = penalites_reinscription.eleve_id
          join public.classes c on c.id = e.classe_id
          where us.user_id = auth.uid() and us.site_id = c.site_id
        ))
      )
    )
  );

drop policy if exists "mois_exoneres_acces" on public.mois_exoneres;
create policy "mois_exoneres_acces" on public.mois_exoneres
  for all using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.actif = true
      and (
        u.role in ('coordonnateur', 'comptable')
        or (u.role = 'superviseur' and exists (
          select 1 from public.user_sites us
          join public.eleves e on e.id = mois_exoneres.eleve_id
          join public.classes c on c.id = e.classe_id
          where us.user_id = auth.uid() and us.site_id = c.site_id
        ))
      )
    )
  );
