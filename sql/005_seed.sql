-- ============================================================================
-- GSR — Données de référence + jeu de test — voir GSR_ARCHITECTURE.md §4
-- À coller après 004_rls_policies.sql.
--
-- Contient : les données de référence obligatoires au déploiement (matières,
-- catégories de dépenses) + un jeu de données minimal (sites/classes/
-- frais_td/année scolaire) pour pouvoir tester la fonctionnalité "Gestion
-- des élèves" de bout en bout sans attendre la page Paramètres -> Données
-- scolaires (milestone ultérieur). À remplacer par la vraie saisie une fois
-- cette page construite.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 8 matières GSR (§4, table matieres)
-- ---------------------------------------------------------------------------
insert into public.matieres (nom, code, ordre) values
  ('Francais',            'FR',    1),
  ('Mathematiques',       'MATHS', 2),
  ('Anglais',             'ANG',   3),
  ('Physique-Chimie',     'PCT',   4),
  ('SVT',                 'SVT',   5),
  ('Philosophie',         'PHILO', 6),
  ('Histoire-Geographie', 'HG',    7),
  ('Economie',            'ECO',   8);

-- ---------------------------------------------------------------------------
-- 8 matières TD (§4, table td.matieres_td)
-- ---------------------------------------------------------------------------
insert into td.matieres_td (nom_matiere) values
  ('Francais'), ('Mathematiques'), ('Anglais'), ('Physique-Chimie'),
  ('SVT'), ('Philosophie'), ('Histoire-Geographie'), ('Economie');

-- ---------------------------------------------------------------------------
-- 7 catégories de dépenses système (§4, table categories_depenses)
-- ---------------------------------------------------------------------------
insert into public.categories_depenses (nom, systeme) values
  ('Loyer', true), ('Fournitures', true), ('Transport', true),
  ('Communication', true), ('Maintenance', true), ('Frais bancaires', true),
  ('Autre', true);

-- ---------------------------------------------------------------------------
-- Année scolaire en cours (test — à remplacer par la vraie saisie)
-- ---------------------------------------------------------------------------
insert into public.annees_scolaires (libelle, date_debut, date_fin, statut) values
  ('2025-2026', '2025-10-01', '2026-05-31', 'en_cours');

-- ---------------------------------------------------------------------------
-- Sites de test (2) — Jonquet va jusqu'en Terminale, Akpakpa s'arrête à la
-- 3ème (pour pouvoir tester le cas "sortant fin de chaîne", §12.9)
-- ---------------------------------------------------------------------------
insert into public.sites (nom_site, initiale) values
  ('Jonquet', 'J'),
  ('Akpakpa', 'A');

-- ---------------------------------------------------------------------------
-- Classes chaînées par site (§4, classe_suivante_id)
-- ---------------------------------------------------------------------------
do $$
declare
  v_site_jonquet integer;
  v_site_akpakpa integer;
  v_6e_j integer; v_5e_j integer; v_4e_j integer; v_3e_j integer;
  v_2nd_j integer; v_1ere_j integer; v_term_j integer;
  v_6e_a integer; v_5e_a integer; v_4e_a integer; v_3e_a integer;
begin
  select id into v_site_jonquet from public.sites where initiale = 'J';
  select id into v_site_akpakpa from public.sites where initiale = 'A';

  insert into public.classes (nom_classe, site_id, ordre) values ('6ème', v_site_jonquet, 1) returning id into v_6e_j;
  insert into public.classes (nom_classe, site_id, ordre) values ('5ème', v_site_jonquet, 2) returning id into v_5e_j;
  insert into public.classes (nom_classe, site_id, ordre) values ('4ème', v_site_jonquet, 3) returning id into v_4e_j;
  insert into public.classes (nom_classe, site_id, ordre) values ('3ème', v_site_jonquet, 4) returning id into v_3e_j;
  insert into public.classes (nom_classe, site_id, ordre) values ('2nde', v_site_jonquet, 5) returning id into v_2nd_j;
  insert into public.classes (nom_classe, site_id, ordre) values ('1ère', v_site_jonquet, 6) returning id into v_1ere_j;
  insert into public.classes (nom_classe, site_id, ordre) values ('Terminale', v_site_jonquet, 7) returning id into v_term_j;

  update public.classes set classe_suivante_id = v_5e_j   where id = v_6e_j;
  update public.classes set classe_suivante_id = v_4e_j   where id = v_5e_j;
  update public.classes set classe_suivante_id = v_3e_j   where id = v_4e_j;
  update public.classes set classe_suivante_id = v_2nd_j  where id = v_3e_j;
  update public.classes set classe_suivante_id = v_1ere_j where id = v_2nd_j;
  update public.classes set classe_suivante_id = v_term_j where id = v_1ere_j;
  -- v_term_j.classe_suivante_id reste NULL (fin de chaîne, "sortant" à la validation)

  insert into public.classes (nom_classe, site_id, ordre) values ('6ème', v_site_akpakpa, 1) returning id into v_6e_a;
  insert into public.classes (nom_classe, site_id, ordre) values ('5ème', v_site_akpakpa, 2) returning id into v_5e_a;
  insert into public.classes (nom_classe, site_id, ordre) values ('4ème', v_site_akpakpa, 3) returning id into v_4e_a;
  insert into public.classes (nom_classe, site_id, ordre) values ('3ème', v_site_akpakpa, 4) returning id into v_3e_a;

  update public.classes set classe_suivante_id = v_5e_a where id = v_6e_a;
  update public.classes set classe_suivante_id = v_4e_a where id = v_5e_a;
  update public.classes set classe_suivante_id = v_3e_a where id = v_4e_a;
  -- v_3e_a.classe_suivante_id reste NULL (Akpakpa s'arrête à la 3ème)

  -- frais_td : montant uniforme par classe (test)
  insert into public.frais_td (classe_id, montant)
  select id, 15000 from public.classes;
end $$;
