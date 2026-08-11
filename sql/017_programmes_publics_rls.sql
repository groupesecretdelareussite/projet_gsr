-- ============================================================================
-- GSR — Page vitrine "Programmes" : lecture publique (anon) de la semaine TD
-- publiée. À coller après 016_td_arbitrage_chevauchement.sql.
--
-- Le schéma td n'accorde aujourd'hui aucun droit à anon (contrairement à
-- public, cf. sql/010_td_grants.sql). On ouvre ICI, explicitement et
-- étroitement, uniquement ce qui est nécessaire à l'affichage public :
--   - td.semaines : uniquement les semaines statut = 'publiee'.
--   - td.creneaux : colonnes restreintes (JAMAIS montant_prevu, rémunération
--     professeur — donnée interne) et uniquement les créneaux 'public' ou
--     'cloture' d'une semaine publiée. Inclure aussi 'cloture' est
--     volontaire : dans une semaine publiée, un créneau clôturé signifie
--     "professeur validé", pas "annulé" — l'exclure ferait disparaître les
--     séances les plus sûres de la page publique.
--   - td.matieres_td / public.sites / public.classes : lecture ouverte
--     (non sensible).
--   - td.professeurs / td.postulations : AUCUN accès (ni grant ni policy) —
--     l'identité du professeur n'a pas à apparaître sur la page publique.
--
-- Volontairement PAS de "grant all"/"alter default privileges" façon
-- 010_td_grants.sql : on ne veut pas qu'une future table td devienne
-- automatiquement lisible par anon.
--
-- Policies "to anon" UNIQUEMENT (pas "authenticated") : authenticated a déjà
-- un grant colonnes-complètes sur td.creneaux (010_td_grants.sql, hérité
-- pour tout le schéma). Ouvrir l'accès en lignes à authenticated ici
-- exposerait montant_prevu à des rôles staff non-coordonnateur (comptable,
-- superviseur...) qui n'ont normalement aucun accès au portail TD.
-- Conséquence acceptée : un membre du staff connecté visitant /programmes
-- verrait une page vide plutôt que le contenu public (cosmétique, sans
-- risque) — le coordonnateur n'est pas concerné, sa policy dédiée
-- (sql/009_td_module.sql) couvre déjà tout indépendamment de celle-ci.
--
-- Idempotent : GRANT rejouable sans risque, DROP POLICY IF EXISTS avant
-- chaque CREATE POLICY.
-- ============================================================================

grant usage on schema td to anon;

grant select on td.semaines to anon;

grant select (
  id, semaine_id, classe_id, matiere_id, date_td, heure_debut, heure_fin, statut_creneau
) on td.creneaux to anon;  -- exclut délibérément montant_prevu

grant select on td.matieres_td to anon;

-- public.sites / public.classes ont déjà un grant anon automatique
-- (Supabase, cf. commentaire sql/010_td_grants.sql) — GRANT explicite ici
-- en filet de sécurité, sans coût si déjà présent.
grant select on public.sites to anon;
grant select on public.classes to anon;

drop policy if exists "td_semaines_lecture_publique" on td.semaines;
create policy "td_semaines_lecture_publique" on td.semaines
  for select
  to anon
  using (statut = 'publiee');

drop policy if exists "td_creneaux_lecture_publique" on td.creneaux;
create policy "td_creneaux_lecture_publique" on td.creneaux
  for select
  to anon
  using (
    statut_creneau in ('public', 'cloture')
    and exists (
      select 1 from td.semaines s
      where s.id = creneaux.semaine_id and s.statut = 'publiee'
    )
  );

drop policy if exists "td_matieres_td_lecture_publique" on td.matieres_td;
create policy "td_matieres_td_lecture_publique" on td.matieres_td
  for select
  to anon
  using (true);

drop policy if exists "sites_lecture_publique" on public.sites;
create policy "sites_lecture_publique" on public.sites
  for select
  to anon
  using (true);

drop policy if exists "classes_lecture_publique" on public.classes;
create policy "classes_lecture_publique" on public.classes
  for select
  to anon
  using (true);
