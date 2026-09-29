-- ============================================================================
-- Migration 029: Protection contre les conditions de concurrence (TOCTOU) sur les paiements
-- VULN-07: Empêche les doubles paiements et dépassements par exécution atomique avec SELECT ... FOR UPDATE
-- ============================================================================

CREATE OR REPLACE FUNCTION public.enregistrer_paiement_atomique(
  p_eleve_id integer,
  p_mois_souscription text,
  p_montant_paye numeric,
  p_date_paiement date,
  p_mode_paiement text,
  p_enregistre_par uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_classe_id integer;
  v_statut text;
  v_college text;
  v_montant_frais numeric;
  v_annee_id integer;
  v_annee_libelle text;
  v_exo_motif text;
  v_total_deja_paye numeric;
  v_reste numeric;
  v_nouveau_paiement_id integer;
  v_total_apres numeric;
  v_reste_apres numeric;
BEGIN
  -- 1. Verrouiller la ligne de l'élève pour sérialiser tout paiement sur cet élève
  SELECT classe_id, statut, college INTO v_classe_id, v_statut, v_college
  FROM public.eleves
  WHERE id = p_eleve_id
  FOR UPDATE;

  IF NOT FOUND OR v_statut <> 'actif' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Élève introuvable ou suspendu');
  END IF;

  -- 2. Récupérer l'année scolaire en cours
  SELECT id, libelle INTO v_annee_id, v_annee_libelle
  FROM public.annees_scolaires
  WHERE statut = 'en_cours'
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Aucune année scolaire en cours');
  END IF;

  -- 3. Vérifier les frais TD configurés
  SELECT montant INTO v_montant_frais
  FROM public.frais_td
  WHERE classe_id = v_classe_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Aucun montant de frais TD configuré pour cette classe');
  END IF;

  -- 4. Vérifier exonération
  SELECT motif INTO v_exo_motif
  FROM public.mois_exoneres
  WHERE eleve_id = p_eleve_id
    AND mois_souscription = p_mois_souscription
    AND annee_scolaire_id = v_annee_id;

  IF FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Ce mois est exonéré ou déjà pris en charge (' || v_exo_motif || '). Aucun paiement requis.');
  END IF;

  -- 5. Calculer le total déjà payé (grâce au FOR UPDATE sur eleves, aucun paiement concurrent n'a pu s'insérer)
  SELECT COALESCE(SUM(montant_paye), 0) INTO v_total_deja_paye
  FROM public.paiements
  WHERE eleve_id = p_eleve_id
    AND mois_souscription = p_mois_souscription
    AND annee_scolaire_id = v_annee_id;

  v_reste := GREATEST(0, v_montant_frais - v_total_deja_paye);

  IF p_montant_paye > v_reste THEN
    RETURN jsonb_build_object('success', false, 'error', 'Le montant dépasse le reste dû (' || v_reste || ' F)');
  END IF;

  -- 6. Insérer le paiement
  INSERT INTO public.paiements (
    eleve_id,
    mois_souscription,
    montant_paye,
    date_paiement,
    mode_paiement,
    annee_scolaire_id,
    enregistre_par
  ) VALUES (
    p_eleve_id,
    p_mois_souscription,
    p_montant_paye,
    p_date_paiement,
    p_mode_paiement,
    p_annee_id,
    p_enregistre_par
  ) RETURNING id INTO v_nouveau_paiement_id;

  v_total_apres := v_total_deja_paye + p_montant_paye;
  v_reste_apres := GREATEST(0, v_montant_frais - v_total_apres);

  RETURN jsonb_build_object(
    'success', true,
    'last_paiement_id', v_nouveau_paiement_id,
    'reste_apres_paiement', v_reste_apres,
    'montant_attendu', v_montant_frais,
    'college', v_college,
    'annee_libelle', v_annee_libelle
  );
END;
$$;

-- Droits d'exécution PostgREST
GRANT EXECUTE ON FUNCTION public.enregistrer_paiement_atomique(integer, text, numeric, date, text, uuid) TO authenticated, service_role;
