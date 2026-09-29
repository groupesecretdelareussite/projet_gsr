-- ============================================================================
-- Migration 028: Sécurité des fonctions SECURITY DEFINER & search_path
-- VULN-09: Empêche l'escalade de privilèges via search_path hijacking
-- VULN-05: Révoque l'accès anon à resolve_staff_email (résolution via /api/mobile-auth)
-- ============================================================================

-- 1. assigner_sites_superviseur (public)
CREATE OR REPLACE FUNCTION public.assigner_sites_superviseur(
  p_user_id uuid,
  p_site_ids integer[]
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF (SELECT role FROM public.users WHERE id = auth.uid()) != 'coordonnateur' THEN
    RAISE EXCEPTION 'Non autorisé : réservé au coordonnateur';
  END IF;

  DELETE FROM public.user_sites WHERE user_id = p_user_id;
  INSERT INTO public.user_sites (user_id, site_id)
  SELECT p_user_id, unnest(p_site_ids);
END;
$$;

-- 2. valider_fin_annee (public)
CREATE OR REPLACE FUNCTION public.valider_fin_annee(
  p_nouvelle_libelle text,
  p_nouvelle_date_debut date,
  p_nouvelle_date_fin date
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF (SELECT role FROM public.users WHERE id = auth.uid()) != 'coordonnateur' THEN
    RAISE EXCEPTION 'Non autorisé : réservé au coordonnateur';
  END IF;

  -- 1. Créer la nouvelle année scolaire
  INSERT INTO public.annees_scolaires (libelle, date_debut, date_fin, statut)
  VALUES (p_nouvelle_libelle, p_nouvelle_date_debut, p_nouvelle_date_fin, 'en_cours');

  -- 2. Clôturer l'ancienne
  UPDATE public.annees_scolaires SET statut = 'terminee' WHERE statut = 'en_pause';

  -- 3. Appliquer les décisions "passe"
  UPDATE public.eleves e
  SET classe_id = d.nouvelle_classe_id
  FROM public.decisions_passage d
  WHERE d.eleve_id = e.id
    AND d.decision = 'passe'
    AND d.nouvelle_classe_id IS NOT NULL;

  -- 4. Supprimer définitivement les élèves sortant / encore suspendus
  DELETE FROM public.eleves e
  WHERE e.id IN (SELECT eleve_id FROM public.decisions_passage WHERE decision = 'sortant')
     OR e.statut = 'suspendu';

  -- 5. Purger les logs applicatifs des élèves désormais absents de `eleves`
  DELETE FROM public.log_whatsapp
  WHERE matricule NOT IN (SELECT matricule FROM public.eleves);

  DELETE FROM public.paiements_supprimes
  WHERE matricule NOT IN (SELECT matricule FROM public.eleves);

  -- 6. Purger la table tampon des décisions
  TRUNCATE public.decisions_passage;

  -- 7. Récompenses de fin d'année
  UPDATE public.recompenses_fin_annee
  SET date_distribution = now()
  WHERE annee_scolaire_id IN (
    SELECT id FROM public.annees_scolaires WHERE statut = 'terminee'
  )
  AND date_distribution IS NULL;

EXCEPTION WHEN OTHERS THEN
  RAISE;
END;
$$;

-- 3. td.arbitrer_creneau
CREATE OR REPLACE FUNCTION td.arbitrer_creneau(
  p_creneau_id integer,
  p_professeur_id integer
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = td, public, pg_temp
AS $$
BEGIN
  IF (SELECT role FROM public.users WHERE id = auth.uid()) != 'coordonnateur' THEN
    RAISE EXCEPTION 'Non autorisé : réservé au coordonnateur';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM td.postulations p_autre
    JOIN td.creneaux c_autre ON c_autre.id = p_autre.creneau_id
    JOIN td.creneaux c_ref ON c_ref.id = p_creneau_id
    WHERE p_autre.professeur_id = p_professeur_id
      AND p_autre.statut_validation = 'Valide'
      AND c_autre.id != p_creneau_id
      AND c_autre.date_td = c_ref.date_td
      AND c_autre.heure_debut < c_ref.heure_fin
      AND c_autre.heure_fin > c_ref.heure_debut
  ) THEN
    RAISE EXCEPTION 'Ce professeur est déjà validé sur un créneau qui chevauche celui-ci.';
  END IF;

  UPDATE td.postulations SET statut_validation = 'Valide'
  WHERE creneau_id = p_creneau_id AND professeur_id = p_professeur_id;

  UPDATE td.postulations SET statut_validation = 'Refuse'
  WHERE creneau_id = p_creneau_id AND professeur_id != p_professeur_id
    AND statut_validation = 'En attente';

  -- Règle A : vrai chevauchement
  UPDATE td.postulations
  SET statut_validation = 'Refuse'
  WHERE professeur_id = p_professeur_id
    AND statut_validation = 'En attente'
    AND creneau_id IN (
      SELECT c_autre.id
      FROM td.creneaux c_autre
      JOIN td.creneaux c_ref ON c_ref.id = p_creneau_id
      WHERE c_autre.id != p_creneau_id
        AND c_autre.date_td = c_ref.date_td
        AND c_autre.heure_debut < c_ref.heure_fin
        AND c_autre.heure_fin > c_ref.heure_debut
    );

  UPDATE td.creneaux SET statut_creneau = 'cloture' WHERE id = p_creneau_id;

EXCEPTION WHEN OTHERS THEN
  RAISE;
END;
$$;

-- 4. td.affecter_directement_creneau
CREATE OR REPLACE FUNCTION td.affecter_directement_creneau(
  p_creneau_id integer,
  p_professeur_id integer
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = td, public, pg_temp
AS $$
BEGIN
  IF (SELECT role FROM public.users WHERE id = auth.uid()) != 'coordonnateur' THEN
    RAISE EXCEPTION 'Non autorisé : réservé au coordonnateur';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM td.creneaux WHERE id = p_creneau_id AND statut_creneau = 'public'
  ) THEN
    RAISE EXCEPTION 'Ce créneau n''est plus ouvert aux candidatures ou à l''affectation.';
  END IF;

  -- Garde anti-chevauchement
  IF EXISTS (
    SELECT 1
    FROM td.postulations p_autre
    JOIN td.creneaux c_autre ON c_autre.id = p_autre.creneau_id
    JOIN td.creneaux c_ref ON c_ref.id = p_creneau_id
    WHERE p_autre.professeur_id = p_professeur_id
      AND p_autre.statut_validation = 'Valide'
      AND c_autre.id != p_creneau_id
      AND c_autre.date_td = c_ref.date_td
      AND c_autre.heure_debut < c_ref.heure_fin
      AND c_autre.heure_fin > c_ref.heure_debut
  ) THEN
    RAISE EXCEPTION 'Ce professeur est déjà validé sur un créneau qui chevauche celui-ci.';
  END IF;

  -- 1. Insérer ou mettre à jour la postulation du professeur choisi à "Valide"
  INSERT INTO td.postulations (creneau_id, professeur_id, statut_validation)
  VALUES (p_creneau_id, p_professeur_id, 'Valide')
  ON CONFLICT (creneau_id, professeur_id)
  DO UPDATE SET statut_validation = 'Valide';

  -- 2. Refuser les autres candidatures en attente sur ce créneau
  UPDATE td.postulations
  SET statut_validation = 'Refuse'
  WHERE creneau_id = p_creneau_id
    AND professeur_id != p_professeur_id
    AND statut_validation = 'En attente';

  -- 3. Règle A : Refuser les autres candidatures en attente de ce même professeur sur les créneaux chevauchants
  UPDATE td.postulations
  SET statut_validation = 'Refuse'
  WHERE professeur_id = p_professeur_id
    AND statut_validation = 'En attente'
    AND creneau_id IN (
      SELECT c_autre.id
      FROM td.creneaux c_autre
      JOIN td.creneaux c_ref ON c_ref.id = p_creneau_id
      WHERE c_autre.id != p_creneau_id
        AND c_autre.date_td = c_ref.date_td
        AND c_autre.heure_debut < c_ref.heure_fin
        AND c_autre.heure_fin > c_ref.heure_debut
    );

  -- 4. Clôturer le créneau
  UPDATE td.creneaux SET statut_creneau = 'cloture' WHERE id = p_creneau_id;

EXCEPTION WHEN OTHERS THEN
  RAISE;
END;
$$;

-- 5. public.resolve_staff_email & révocation des droits anon (VULN-05 & VULN-09)
CREATE OR REPLACE FUNCTION public.resolve_staff_email(p_username text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN (SELECT email FROM public.users WHERE username = p_username AND actif = true LIMIT 1);
END;
$$;

-- Révocation de l'accès public/anonyme : la résolution se fait désormais uniquement via
-- la route serveur /api/mobile-auth ou par les rôles authentifiés/service_role.
REVOKE EXECUTE ON FUNCTION public.resolve_staff_email(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.resolve_staff_email(text) TO authenticated, service_role;
