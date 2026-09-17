-- ============================================================================
-- GSR — Schéma td : Plafond de 3 candidatures & Affectation directe
-- À appliquer après 025_exonerations_bourses.sql.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Trigger anti-concurrence : maximum 3 candidatures "En attente" par créneau
-- Ne s'applique que sur INSERT (nouvelle candidature prof), garantissant
-- zéro impact sur les créneaux passés, les arbitrages ou les libérations de créneaux.
-- ---------------------------------------------------------------------------
create or replace function td.check_max_postulations()
returns trigger as $$
declare
  v_count integer;
begin
  if NEW.statut_validation = 'En attente' then
    select count(*) into v_count
    from td.postulations
    where creneau_id = NEW.creneau_id
      and statut_validation = 'En attente'
      and id != coalesce(NEW.id, 0);

    if v_count >= 3 then
      raise exception 'Ce créneau a déjà atteint le nombre maximal de candidatures (3).'
        using errcode = '23514';
    end if;
  end if;
  return NEW;
end;
$$ language plpgsql;

drop trigger if exists trg_check_max_postulations on td.postulations;
create trigger trg_check_max_postulations
  before insert on td.postulations
  for each row
  execute function td.check_max_postulations();

-- ---------------------------------------------------------------------------
-- 2. td.affecter_directement_creneau()
-- Nouvelle fonction indépendante : ne modifie ni n'écrase arbitrer_creneau().
-- Permet au coordonnateur d'assigner directement un professeur sur un créneau public.
-- ---------------------------------------------------------------------------
create or replace function td.affecter_directement_creneau(
  p_creneau_id integer,
  p_professeur_id integer
) returns void as $$
begin
  if (select role from public.users where id = auth.uid()) != 'coordonnateur' then
    raise exception 'Non autorisé : réservé au coordonnateur';
  end if;

  if not exists (
    select 1 from td.creneaux where id = p_creneau_id and statut_creneau = 'public'
  ) then
    raise exception 'Ce créneau n''est plus ouvert aux candidatures ou à l''affectation.';
  end if;

  -- Garde anti-chevauchement : le professeur ne doit pas être déjà validé sur un créneau chevauchant
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

  -- 1. Insérer ou mettre à jour la postulation du professeur choisi à "Valide"
  insert into td.postulations (creneau_id, professeur_id, statut_validation)
  values (p_creneau_id, p_professeur_id, 'Valide')
  on conflict (creneau_id, professeur_id)
  do update set statut_validation = 'Valide';

  -- 2. Refuser les autres candidatures en attente sur ce créneau
  update td.postulations
  set statut_validation = 'Refuse'
  where creneau_id = p_creneau_id
    and professeur_id != p_professeur_id
    and statut_validation = 'En attente';

  -- 3. Règle A : Refuser les autres candidatures en attente de ce même professeur sur les créneaux chevauchants
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

  -- 4. Clôturer le créneau
  update td.creneaux set statut_creneau = 'cloture' where id = p_creneau_id;

exception when others then
  raise;
end;
$$ language plpgsql security definer;

-- ---------------------------------------------------------------------------
-- 3. Droits d'exécution PostgREST (idempotent)
-- ---------------------------------------------------------------------------
grant execute on function td.affecter_directement_creneau(integer, integer) to authenticated, service_role;
