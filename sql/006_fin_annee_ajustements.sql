-- ============================================================================
-- GSR — Ajustements pour la construction de l'écran Fin d'année (§8.10/§12.9)
-- À coller après 005_seed.sql. Idempotent.
--
-- v2.2 (2026-07-28, décision explicite de l'utilisateur — override de
-- GSR_ARCHITECTURE.md §12.9) : `classes.classe_suivante_id = NULL` ne
-- déclenche plus jamais une décision `sortant` automatique. Ça reste un vrai
-- point de décision manuelle (choix de série, ou véritable fin de chaîne) que
-- le coordonnateur doit trancher élève par élève dans l'écran de revue avant
-- de pouvoir valider — jamais une suppression silencieuse.
--
-- La fonction `public.valider_fin_annee()` (sql/003_triggers_functions.sql)
-- n'a PAS besoin de changer : elle n'a jamais elle-même décidé du `sortant`
-- automatique — c'était fait côté application au moment de créer la ligne
-- `decisions_passage`. Le nouveau flux applicatif (src/actions/fin-annee.ts)
-- pré-remplit une décision "passe" par défaut pour chaque élève actif dont la
-- classe a une `classe_suivante_id`, et bloque la validation tant qu'un
-- élève d'une classe à `classe_suivante_id = NULL` n'a pas de décision
-- explicite. La fonction SQL applique simplement ce qui existe dans
-- `decisions_passage` au moment de la validation, ce qui reste correct.
--
-- Seul changement nécessaire : une contrainte unique sur `eleve_id` pour
-- pouvoir upserter proprement une décision par élève (le schéma d'origine
-- n'en avait pas, une décision "en cours de saisie" ne devant jamais être
-- dupliquée pour le même élève).
-- ============================================================================

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'decisions_passage_eleve_id_key'
  ) then
    alter table public.decisions_passage
      add constraint decisions_passage_eleve_id_key unique (eleve_id);
  end if;
end $$;
