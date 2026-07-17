-- ============================================================================
-- GSR — Triggers & fonctions stockées — voir GSR_ARCHITECTURE.md §4, §8.9,
-- §8.10, §10.4, §12.6, §12.9, §12.11
-- À coller après 002_schema_td.sql.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- trg_users_scope_coherence (§4, table users)
-- chef_site => site_id obligatoire ; coordonnateur/comptable/secretaire/
-- superviseur => site_id doit être NULL (le superviseur utilise user_sites).
-- ---------------------------------------------------------------------------
create or replace function public.trg_users_scope_coherence_fn() returns trigger as $$
begin
  if new.role = 'chef_site' and new.site_id is null then
    raise exception 'site_id obligatoire pour le rôle chef_site';
  end if;

  if new.role in ('coordonnateur','comptable','secretaire','superviseur') and new.site_id is not null then
    raise exception 'site_id doit être NULL pour le rôle %', new.role;
  end if;

  return new;
end;
$$ language plpgsql;

create trigger trg_users_scope_coherence
  before insert or update on public.users
  for each row execute function public.trg_users_scope_coherence_fn();

-- ---------------------------------------------------------------------------
-- trg_unique_annee_en_cours (§4, table annees_scolaires)
-- Une seule ligne 'en_cours' à la fois.
-- ---------------------------------------------------------------------------
create or replace function public.trg_unique_annee_en_cours_fn() returns trigger as $$
begin
  if new.statut = 'en_cours' and exists (
    select 1 from public.annees_scolaires
    where statut = 'en_cours' and id <> new.id
  ) then
    raise exception 'Une année scolaire est déjà en_cours';
  end if;

  return new;
end;
$$ language plpgsql;

create trigger trg_unique_annee_en_cours
  before insert or update on public.annees_scolaires
  for each row execute function public.trg_unique_annee_en_cours_fn();

-- ---------------------------------------------------------------------------
-- trg_frais_td_lock_period (v2.1 §12.11)
-- Le montant d'un frais_td existant ne peut pas changer pendant que l'année
-- scolaire en_cours est active — uniquement en période de vacances.
-- Ne bloque que l'UPDATE du montant, jamais l'INSERT (nouvelle classe).
-- ---------------------------------------------------------------------------
create or replace function public.trg_frais_td_lock_period_fn() returns trigger as $$
declare
  v_debut date;
  v_fin   date;
begin
  select date_debut, date_fin into v_debut, v_fin
  from public.annees_scolaires where statut = 'en_cours';

  if v_debut is not null and current_date between v_debut and v_fin then
    raise exception 'Modification du montant interdite pendant l''année scolaire en cours — uniquement en période de vacances, après l''arbitrage de fin d''année';
  end if;

  return new;
end;
$$ language plpgsql;

create trigger trg_frais_td_lock_period
  before update of montant on public.frais_td
  for each row execute function public.trg_frais_td_lock_period_fn();

-- ---------------------------------------------------------------------------
-- assigner_sites_superviseur (§8.9) — coordonnateur uniquement
-- ---------------------------------------------------------------------------
create or replace function public.assigner_sites_superviseur(
  p_user_id uuid,
  p_site_ids integer[]
) returns void as $$
begin
  if (select role from public.users where id = auth.uid()) != 'coordonnateur' then
    raise exception 'Non autorisé : réservé au coordonnateur';
  end if;

  delete from public.user_sites where user_id = p_user_id;
  insert into public.user_sites (user_id, site_id)
  select p_user_id, unnest(p_site_ids);
end;
$$ language plpgsql security definer;

-- ---------------------------------------------------------------------------
-- valider_fin_annee (§8.10, §12.9) — coordonnateur uniquement
-- v2.1 : supprime définitivement les élèves `sortant` et les élèves encore
-- suspendus non réinscrits (CASCADE nettoie paiements/présences/notes/
-- eleves_suspendus/decisions_passage automatiquement).
-- ---------------------------------------------------------------------------
create or replace function public.valider_fin_annee(
  p_nouvelle_libelle text,
  p_nouvelle_date_debut date,
  p_nouvelle_date_fin date
) returns void as $$
begin
  if (select role from public.users where id = auth.uid()) != 'coordonnateur' then
    raise exception 'Non autorisé : réservé au coordonnateur';
  end if;

  -- 1. Créer la nouvelle année scolaire
  insert into public.annees_scolaires (libelle, date_debut, date_fin, statut)
  values (p_nouvelle_libelle, p_nouvelle_date_debut, p_nouvelle_date_fin, 'en_cours');

  -- 2. Clôturer l'ancienne
  update public.annees_scolaires set statut = 'terminee' where statut = 'en_pause';

  -- 3. Appliquer les décisions "passe"
  update public.eleves e
  set classe_id = d.nouvelle_classe_id
  from public.decisions_passage d
  where d.eleve_id = e.id
    and d.decision = 'passe'
    and d.nouvelle_classe_id is not null;

  -- 4. Supprimer définitivement les élèves sortant / encore suspendus
  delete from public.eleves e
  where e.id in (select eleve_id from public.decisions_passage where decision = 'sortant')
     or e.statut = 'suspendu';

  -- 5. Purger les logs applicatifs des élèves désormais absents de `eleves`
  delete from public.log_whatsapp
  where matricule not in (select matricule from public.eleves);

  delete from public.paiements_supprimes
  where matricule not in (select matricule from public.eleves);

  -- 6. Purger la table tampon des décisions
  truncate public.decisions_passage;

exception when others then
  raise;
end;
$$ language plpgsql security definer;

-- ---------------------------------------------------------------------------
-- td.arbitrer_creneau (§10.4, §12.6 — Règle A) — coordonnateur uniquement
-- NB : correction v2.1 appliquée ici — le §10.4 du document utilisait
-- 'Cloture' (majuscule) alors que la contrainte CHECK sur statut_creneau
-- n'accepte que des minuscules ('brouillon','public','cloture') ; utiliser
-- 'Cloture' aurait fait échouer la fonction en production.
-- ---------------------------------------------------------------------------
create or replace function td.arbitrer_creneau(
  p_creneau_id integer,
  p_professeur_id integer
) returns void as $$
begin
  if (select role from public.users where id = auth.uid()) != 'coordonnateur' then
    raise exception 'Non autorisé : réservé au coordonnateur';
  end if;

  -- 1. Valider la postulation choisie
  update td.postulations
  set statut_validation = 'Valide'
  where creneau_id = p_creneau_id and professeur_id = p_professeur_id;

  -- 2. Refuser les autres candidats sur ce créneau
  update td.postulations
  set statut_validation = 'Refuse'
  where creneau_id = p_creneau_id and professeur_id != p_professeur_id;

  -- 3. Règle A — Refuser les autres candidatures En attente du même prof au même horaire
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
        and c_autre.heure_debut = c_ref.heure_debut
    );

  -- 4. Clôturer le créneau
  update td.creneaux set statut_creneau = 'cloture' where id = p_creneau_id;

exception when others then
  raise;
end;
$$ language plpgsql security definer;
