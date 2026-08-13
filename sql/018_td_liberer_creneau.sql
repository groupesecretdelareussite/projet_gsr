-- ============================================================================
-- GSR — Portail TD : libérer un créneau clôturé (désistement d'un professeur
-- validé) — voir discussion 2026-08-12. À coller après 017_programmes_publics_rls.sql.
--
-- Contexte : une fois un créneau arbitré (Règle A, sql/016), rien ne permet
-- aujourd'hui de revenir en arrière si le professeur validé se désiste. Le
-- coordonnateur est seul décisionnaire (le professeur prévient par téléphone/
-- WhatsApp, pas de self-service côté prof) : il "libère" le créneau, qui
-- redevient ouvert parmi les candidats initiaux qui sont *encore réellement
-- disponibles* sur ce créneau précis — certains ont pu depuis être validés
-- ailleurs sur un créneau qui chevauche celui-ci, ceux-là restent exclus.
--
-- Nouveau statut 'Retiree' : distinct de 'Refuse'. 'Refuse' = a perdu
-- l'arbitrage face à un autre candidat ; 'Retiree' = avait gagné puis s'est
-- désisté. Utile pour l'historique (un prof qui se désiste souvent après
-- validation, c'est une info que le coordonnateur voudra pouvoir repérer).
--
-- Nom de la contrainte CHECK retrouvé dynamiquement (pg_constraint) plutôt que
-- deviné en dur — même prudence que le DROP TABLE ... CASCADE de sql/015 pour
-- éviter de dépendre d'un nom auto-généré par Postgres.
-- ============================================================================

do $$
declare
  nom_contrainte text;
begin
  select conname into nom_contrainte
  from pg_constraint
  where conrelid = 'td.postulations'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) like '%statut_validation%';

  if nom_contrainte is not null then
    execute format('alter table td.postulations drop constraint %I', nom_contrainte);
  end if;
end $$;

alter table td.postulations
  add constraint postulations_statut_validation_check
  check (statut_validation in ('En attente','Valide','Refuse','Retiree'));

alter table td.postulations add column if not exists motif_retrait text;

-- ---------------------------------------------------------------------------
-- td.arbitrer_creneau() — garde anti-double-booking supplémentaire.
--
-- La Règle A existante (sql/016) protège le sens "aller" : valider un prof
-- sur un créneau refuse automatiquement SES AUTRES candidatures en attente
-- qui chevauchent. Mais rien n'empêchait jusqu'ici de valider un professeur
-- déjà 'Valide' ailleurs sur un créneau qui chevauche celui en cours
-- d'arbitrage — impossible à atteindre par le flux normal (une fois refusé
-- quelque part, un prof y restait refusé pour toujours), mais devient
-- atteignable dès qu'un créneau peut être rouvert (libererCreneauTD ci-
-- dessous remet d'anciens 'Refuse' à 'En attente'). Ce garde-fou protège
-- l'arbitrage lui-même, indépendamment de la fraîcheur de la liste rouverte.
-- ---------------------------------------------------------------------------
create or replace function td.arbitrer_creneau(
  p_creneau_id integer,
  p_professeur_id integer
) returns void as $$
begin
  if (select role from public.users where id = auth.uid()) != 'coordonnateur' then
    raise exception 'Non autorisé : réservé au coordonnateur';
  end if;

  if exists (
    select 1
    from td.postulations p_autre
    join td.creneaux c_autre on c_autre.id = p_autre.creneau_id
    join td.creneaux c_ref on c_ref.id = p_creneau_id
    where p_autre.professeur_id = p_professeur_id
      and p_autre.statut_validation = 'Valide'
      and c_autre.id != p_creneau_id
      and c_autre.date_td = c_ref.date_td
      and c_autre.heure_debut < c_ref.heure_fin
      and c_autre.heure_fin > c_ref.heure_debut
  ) then
    raise exception 'Ce professeur est déjà validé sur un créneau qui chevauche celui-ci.';
  end if;

  update td.postulations set statut_validation = 'Valide'
  where creneau_id = p_creneau_id and professeur_id = p_professeur_id;

  update td.postulations set statut_validation = 'Refuse'
  where creneau_id = p_creneau_id and professeur_id != p_professeur_id
    and statut_validation = 'En attente';

  -- Règle A : vrai chevauchement, pas juste même heure_debut (sql/016).
  update td.postulations
  set statut_validation = 'Refuse'
  where professeur_id = p_professeur_id
    and statut_validation = 'En attente'
    and creneau_id in (
      select c_autre.id
      from td.creneaux c_autre
      join td.creneaux c_ref on c_ref.id = p_creneau_id
      where c_autre.id != p_creneau_id
        and c_autre.date_td = c_ref.date_td
        and c_autre.heure_debut < c_ref.heure_fin
        and c_autre.heure_fin > c_ref.heure_debut
    );

  update td.creneaux set statut_creneau = 'cloture' where id = p_creneau_id;

exception when others then
  raise;
end;
$$ language plpgsql security definer;
