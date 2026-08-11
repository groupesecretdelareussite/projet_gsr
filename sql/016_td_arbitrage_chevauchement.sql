-- ============================================================================
-- GSR — td.arbitrer_creneau : correction Règle A (chevauchement horaire réel)
-- voir GSR_ARCHITECTURE.md §10.4, §12.6 — À coller après
-- 015_td_classes_reelles.sql.
--
-- Bug : la Règle A ("refuser les autres candidatures En attente du même
-- professeur au même horaire") ne comparait que heure_debut = heure_debut,
-- ratant les chevauchements réels à horaires décalés — ex. un créneau
-- validé 14h-17h et un créneau En attente 15h-16h se chevauchent réellement
-- (le professeur ne peut pas être aux deux) mais n'étaient pas détectés car
-- 14:00 != 15:00.
--
-- Remplacé par un vrai test de chevauchement d'intervalles demi-ouverts :
-- c_autre.heure_debut < c_ref.heure_fin ET c_autre.heure_fin > c_ref.heure_debut
-- — deux créneaux consécutifs (14h-16h puis 16h-18h) restent correctement
-- considérés comme non conflictuels.
--
-- CREATE OR REPLACE : remplace la fonction en place, aucun DROP nécessaire
-- (même nom, même signature). Corps identique à sql/003_triggers_functions.sql
-- sauf l'étape 3.
-- ============================================================================

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

  -- 3. Règle A — Refuser les autres candidatures En attente du même prof
  --    dont le créneau chevauche réellement celui-ci (même date, intervalles
  --    horaires qui se recoupent), pas seulement même heure_debut.
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
