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
--
-- Idempotent : peut être rejoué sans risque à chaque itération (ON CONFLICT
-- partout où une contrainte unique existe ; garde explicite pour
-- annees_scolaires, qui n'en a pas).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 10 matières GSR (§4, table matieres)
-- ---------------------------------------------------------------------------
insert into public.matieres (nom, code, ordre) values
  ('Francais',            'FR',    1),
  ('Mathematiques',       'MATHS', 2),
  ('Anglais',             'ANG',   3),
  ('Physique-Chimie',     'PCT',   4),
  ('SVT',                 'SVT',   5),
  ('Philosophie',         'PHILO', 6),
  ('Histoire-Geographie', 'HG',    7),
  ('Economie',            'ECO',   8),
  ('Espagnol',            'ESP',   9),
  ('Allemand',            'ALL',   10)
on conflict (code) do nothing;

-- ---------------------------------------------------------------------------
-- 10 matières TD (§4, table td.matieres_td)
-- ---------------------------------------------------------------------------
insert into td.matieres_td (nom_matiere) values
  ('Francais'), ('Mathematiques'), ('Anglais'), ('Physique-Chimie'),
  ('SVT'), ('Philosophie'), ('Histoire-Geographie'), ('Economie'), ('Espagnol'), ('Allemand')
on conflict (nom_matiere) do nothing;

-- ---------------------------------------------------------------------------
-- 8 catégories de dépenses système (§4, table categories_depenses)
-- ---------------------------------------------------------------------------
insert into public.categories_depenses (nom, systeme) values
  ('Location Site', true), ('Paiement Prof', true), ('Fournitures', true), ('Transport', true),
  ('Communication', true), ('Maintenance', true), ('Frais bancaires', true),
  ('Autre', true)
on conflict (nom) do nothing;

-- ---------------------------------------------------------------------------
-- Année scolaire en cours (test — à remplacer par la vraie saisie).
-- Pas de contrainte unique sur `libelle` en base -> garde explicite par
-- select/where not exists pour rester idempotent quand même.
-- ---------------------------------------------------------------------------
insert into public.annees_scolaires (libelle, date_debut, date_fin, statut)
select '2026-2027', '2026-10-01', '2027-05-31', 'en_cours'
where not exists (
  select 1 from public.annees_scolaires where libelle = '2026-2027'
);

-- ---------------------------------------------------------------------------
-- Sites de test (2) — Jéricho va jusqu'en Terminale, Yagbé s'arrête à la
-- 3ème (pour pouvoir tester le cas "sortant fin de chaîne", §12.9)
-- ---------------------------------------------------------------------------
insert into public.sites (nom_site, initiale) values
  ('Jéricho', 'J'),
  ('Yagbé', 'Y')
on conflict (initiale) do nothing;

-- ---------------------------------------------------------------------------
-- Classes chaînées par site (§4, classe_suivante_id)
--
-- Jéricho teste le cas "choix de série" : une seule salle par niveau jusqu'en
-- 3ème (pas besoin de dédoubler ici), mais à la sortie de la 3ème chaque
-- élève choisit individuellement sa série (AB ou CD) — ce n'est pas un
-- chaînage automatique 1:1, donc classe_suivante_id de la 3ème reste
-- volontairement NULL (voir commentaire plus bas). Yagbé teste le cas "vraie
-- fin de chaîne" (§12.9, sortant) : le site s'arrête à la 3ème sans suite.
--
-- Chaque insert de classe utilise ON CONFLICT ... DO UPDATE (pas DO NOTHING)
-- pour que RETURNING renvoie toujours l'id, que la ligne vienne d'être créée
-- ou qu'elle existe déjà d'un run précédent.
-- ---------------------------------------------------------------------------
do $$
declare
  v_site_jericho integer;
  v_site_yagbe integer;
  v_6e_j integer; v_5e_j integer; v_4e_j integer; v_3e_j integer;
  v_2nd_ab_j integer; v_2nd_cd_j integer;
  v_1ere_ab_j integer; v_1ere_cd_j integer;
  v_term_a_j integer; v_term_b_j integer; v_term_c_j integer; v_term_d_j integer;
  v_6e_y integer; v_5e_y integer; v_4e_y integer; v_3e_y integer;
begin
  select id into v_site_jericho from public.sites where initiale = 'J';
  select id into v_site_yagbe from public.sites where initiale = 'Y';

  insert into public.classes (nom_classe, site_id, ordre) values ('6ème', v_site_jericho, 1)
    on conflict (nom_classe, site_id) do update set ordre = excluded.ordre returning id into v_6e_j;
  insert into public.classes (nom_classe, site_id, ordre) values ('5ème', v_site_jericho, 2)
    on conflict (nom_classe, site_id) do update set ordre = excluded.ordre returning id into v_5e_j;
  insert into public.classes (nom_classe, site_id, ordre) values ('4ème', v_site_jericho, 3)
    on conflict (nom_classe, site_id) do update set ordre = excluded.ordre returning id into v_4e_j;
  insert into public.classes (nom_classe, site_id, ordre) values ('3ème', v_site_jericho, 4)
    on conflict (nom_classe, site_id) do update set ordre = excluded.ordre returning id into v_3e_j;

  -- Séries : choix individuel de l'élève en 3ème, indépendant du nombre de
  -- salles. AB et CD ont chacune leur propre chaîne jusqu'en Terminale.
  insert into public.classes (nom_classe, site_id, ordre) values ('Seconde AB', v_site_jericho, 5)
    on conflict (nom_classe, site_id) do update set ordre = excluded.ordre returning id into v_2nd_ab_j;
  insert into public.classes (nom_classe, site_id, ordre) values ('Seconde CD', v_site_jericho, 5)
    on conflict (nom_classe, site_id) do update set ordre = excluded.ordre returning id into v_2nd_cd_j;
  insert into public.classes (nom_classe, site_id, ordre) values ('Première AB', v_site_jericho, 6)
    on conflict (nom_classe, site_id) do update set ordre = excluded.ordre returning id into v_1ere_ab_j;
  insert into public.classes (nom_classe, site_id, ordre) values ('Première CD', v_site_jericho, 6)
    on conflict (nom_classe, site_id) do update set ordre = excluded.ordre returning id into v_1ere_cd_j;
  insert into public.classes (nom_classe, site_id, ordre) values ('Terminale A', v_site_jericho, 7)
    on conflict (nom_classe, site_id) do update set ordre = excluded.ordre returning id into v_term_a_j;
  insert into public.classes (nom_classe, site_id, ordre) values ('Terminale B', v_site_jericho, 7)
    on conflict (nom_classe, site_id) do update set ordre = excluded.ordre returning id into v_term_b_j;
  insert into public.classes (nom_classe, site_id, ordre) values ('Terminale C', v_site_jericho, 7)
    on conflict (nom_classe, site_id) do update set ordre = excluded.ordre returning id into v_term_c_j;
  insert into public.classes (nom_classe, site_id, ordre) values ('Terminale D', v_site_jericho, 7)
    on conflict (nom_classe, site_id) do update set ordre = excluded.ordre returning id into v_term_d_j;

  update public.classes set classe_suivante_id = v_5e_j   where id = v_6e_j;
  update public.classes set classe_suivante_id = v_4e_j   where id = v_5e_j;
  update public.classes set classe_suivante_id = v_3e_j   where id = v_4e_j;
  -- v_3e_j.classe_suivante_id reste volontairement NULL : le passage en
  -- Seconde dépend du choix de série de chaque élève (AB ou CD), pas d'un
  -- chaînage automatique unique. La future fonctionnalité "Fin d'année" doit
  -- traiter tout élève de cette classe comme "à choisir manuellement" (AB, CD,
  -- ou sortant), pas déduire "sortant" par défaut du simple fait que
  -- classe_suivante_id est NULL ici — contrairement à v_3e_y plus bas, qui est
  -- une vraie fin de chaîne.

  update public.classes set classe_suivante_id = v_1ere_ab_j where id = v_2nd_ab_j;
  update public.classes set classe_suivante_id = v_1ere_cd_j where id = v_2nd_cd_j;

  -- Première -> Terminale : simple répartition de salle par effectif (la
  -- série est déjà fixée depuis la 3ème), pas un nouveau choix — un chaînage
  -- par défaut vers une des deux salles suffit ; le détail A/B ou C/D est
  -- administratif et n'affecte plus aucune suite (Terminale est déjà la fin
  -- de chaîne).
  update public.classes set classe_suivante_id = v_term_a_j where id = v_1ere_ab_j;
  update public.classes set classe_suivante_id = v_term_c_j where id = v_1ere_cd_j;
  -- v_term_a_j / v_term_b_j / v_term_c_j / v_term_d_j.classe_suivante_id
  -- restent NULL (fin de chaîne, "sortant" à la validation)

  insert into public.classes (nom_classe, site_id, ordre) values ('6ème', v_site_yagbe, 1)
    on conflict (nom_classe, site_id) do update set ordre = excluded.ordre returning id into v_6e_y;
  insert into public.classes (nom_classe, site_id, ordre) values ('5ème', v_site_yagbe, 2)
    on conflict (nom_classe, site_id) do update set ordre = excluded.ordre returning id into v_5e_y;
  insert into public.classes (nom_classe, site_id, ordre) values ('4ème', v_site_yagbe, 3)
    on conflict (nom_classe, site_id) do update set ordre = excluded.ordre returning id into v_4e_y;
  insert into public.classes (nom_classe, site_id, ordre) values ('3ème', v_site_yagbe, 4)
    on conflict (nom_classe, site_id) do update set ordre = excluded.ordre returning id into v_3e_y;

  update public.classes set classe_suivante_id = v_5e_y where id = v_6e_y;
  update public.classes set classe_suivante_id = v_4e_y where id = v_5e_y;
  update public.classes set classe_suivante_id = v_3e_y where id = v_4e_y;
  -- v_3e_y.classe_suivante_id reste NULL (Yagbé s'arrête à la 3ème)

  -- frais_td : tarif mensuel réel par niveau, uniforme sur tous les sites
  -- (§ discussion — pas un placeholder). Le mois offert après 3 mois payés
  -- simultanément (règle "4ème mois gratuit") n'est pas encore implémenté
  -- côté paiements — à faire plus tard.
  insert into public.frais_td (classe_id, montant) values
    (v_6e_j, 2000),      (v_6e_y, 2000),
    (v_5e_j, 3000),      (v_5e_y, 3000),
    (v_4e_j, 3000),      (v_4e_y, 3000),
    (v_3e_j, 5000),      (v_3e_y, 5000),
    (v_2nd_ab_j, 5000),  (v_2nd_cd_j, 5000),
    (v_1ere_ab_j, 6000), (v_1ere_cd_j, 6000),
    (v_term_a_j, 8000),  (v_term_b_j, 8000), (v_term_c_j, 8000), (v_term_d_j, 8000)
  on conflict (classe_id) do update set montant = excluded.montant;
end $$;
