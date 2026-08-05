-- ============================================================================
-- GSR — Actualités vitrine (gérées par le coordonnateur) — voir discussion
-- 2026-08-05. À coller après 011_coefficients.sql.
--
-- "À la une" est piloté par une seule colonne date (a_la_une_jusqu_au) plutôt
-- que par un booléen séparé : un article est à la une si et seulement si
-- cette date est renseignée et >= aujourd'hui. Calculé à la lecture, jamais
-- par une tâche planifiée — évite tout risque de désynchronisation.
--
-- Particularité par rapport aux autres tables du projet : celle-ci doit être
-- lisible SANS authentification (un visiteur du site vitrine n'a pas de
-- session), donc une policy RLS ouverte au public sur les lignes publiées.
-- Les écritures passent exclusivement par le client service role après
-- getUserScope() côté Server Action (coordonnateur uniquement), même
-- convention que sites/classes dans donnees-scolaires.ts.
--
-- Idempotent : ON CONFLICT / DROP POLICY IF EXISTS partout.
-- ============================================================================

create table if not exists public.actualites (
  id                    serial primary key,
  titre                 varchar(200) not null,
  categorie             text not null check (categorie in ('Vie scolaire', 'Événement', 'Réussite', 'Cours', 'Examens/Contrôle')),
  extrait               text not null,
  contenu               text not null,
  statut                text not null default 'brouillon' check (statut in ('brouillon', 'publie')),
  a_la_une_jusqu_au     date,
  date_publication      timestamptz not null default now(),
  cree_par              uuid references public.users(id) on delete set null
);

create table if not exists public.actualites_images (
  id              serial primary key,
  actualite_id    integer not null references public.actualites(id) on delete cascade,
  storage_path    text not null,
  ordre           integer not null default 0
);

alter table public.actualites enable row level security;
alter table public.actualites_images enable row level security;

drop policy if exists "actualites_lecture_publique" on public.actualites;
create policy "actualites_lecture_publique" on public.actualites
  for select using (statut = 'publie');

drop policy if exists "actualites_images_lecture_publique" on public.actualites_images;
create policy "actualites_images_lecture_publique" on public.actualites_images
  for select using (
    exists (select 1 from public.actualites a where a.id = actualite_id and a.statut = 'publie')
  );

-- ---------------------------------------------------------------------------
-- Seed : les 3 articles déjà rédigés (2026-08-05), migrés depuis
-- src/lib/actualites.ts pour ne pas repartir d'une page vide. Images
-- pointant vers des photos déjà présentes dans le bucket public "galerie"
-- (réutilisées en attendant de vraies photos d'événement).
-- ---------------------------------------------------------------------------

do $$
declare
  v_cip_id integer;
  v_bepc_id integer;
  v_coaching_id integer;
begin
  if not exists (select 1 from public.actualites where titre = 'Démarrage des Cours Intensifs Préparatoires — Édition 2026') then
    insert into public.actualites (titre, categorie, extrait, contenu, statut, a_la_une_jusqu_au, date_publication)
    values (
      'Démarrage des Cours Intensifs Préparatoires — Édition 2026',
      'Cours',
      'Le GSR lance sa nouvelle édition des Cours Intensifs Préparatoires sur ses 3 sites. Un programme pensé pour combler les lacunes et aborder la suite de l''année en confiance.',
      E'Le Groupe Secret de la Réussite ouvre officiellement sa nouvelle édition des Cours Intensifs Préparatoires, sur ses trois sites de Jéricho, Yagbé et Vèdoko. Ce programme, pensé pour la période de vacances, s''adresse à tous les élèves de la 6ème à la Terminale qui souhaitent consolider leurs acquis avant la reprise.\n\nL''objectif est simple : identifier les lacunes accumulées durant l''année écoulée et les corriger méthodiquement, tout en abordant en douceur les nouvelles notions du programme à venir. Chaque séance s''appuie sur des documents de cours structurés et des évaluations ciblées, pour que chaque élève progresse à son rythme sans se sentir dépassé.\n\nNos enseignants, sélectionnés pour leur rigueur et leur pédagogie, encadrent des groupes à taille humaine afin d''assurer un vrai suivi individuel. Les tarifs, accessibles et adaptés à chaque niveau, sont disponibles en détail sur notre page Tarifs.\n\nLes places étant limitées sur chaque site, nous invitons les parents à inscrire rapidement leurs enfants en se rendant directement sur l''un de nos trois centres, ou en nous contactant par téléphone pour toute question sur le programme et les horaires.',
      'publie',
      current_date + interval '14 days',
      now()
    ) returning id into v_cip_id;

    insert into public.actualites_images (actualite_id, storage_path, ordre) values
      (v_cip_id, 'vitrine/accueil/img_cip.jpg', 0);
  end if;

  if not exists (select 1 from public.actualites where titre = 'Démarrage des séances de révision BEPC 2026') then
    insert into public.actualites (titre, categorie, extrait, contenu, statut, date_publication)
    values (
      'Démarrage des séances de révision BEPC 2026',
      'Examens/Contrôle',
      'À l''approche des épreuves, le GSR met en place un dispositif de révision intensif et méthodique dédié aux candidats au BEPC 2026.',
      E'À quelques mois d''une échéance décisive, le Groupe Secret de la Réussite lance ses séances de révision dédiées aux candidats au BEPC 2026. Ce dispositif vise à consolider les acquis sur l''ensemble du programme officiel, avec un accent particulier sur les matières fondamentales : Mathématiques, Français, Physique-Chimie, SVT et Anglais.\n\nLe format retenu combine rappels de cours structurés, exercices ciblés et examens blancs réguliers, chacun suivi d''une correction méthodique en groupe. Cette approche permet à chaque candidat de mesurer précisément ses progrès et d''identifier les points qui demandent encore du travail avant le jour J.\n\nNos enseignants, habitués aux exigences de l''examen, accompagnent les élèves avec des conseils pratiques de gestion du temps et de méthodologie de rédaction, deux facteurs qui font souvent la différence le jour de l''épreuve.\n\nLes séances se déroulent sur nos trois sites, selon un calendrier communiqué aux familles inscrites. Pour rejoindre le dispositif ou obtenir plus d''informations, contactez-nous ou rendez-vous directement sur l''un de nos centres.',
      'publie',
      now() - interval '7 days'
    ) returning id into v_bepc_id;

    insert into public.actualites_images (actualite_id, storage_path, ordre) values
      (v_bepc_id, 'vitrine/accueil/img_prepa.jpg', 0);
  end if;

  if not exists (select 1 from public.actualites where titre = 'Séance de Coaching et de Motivation des candidats aux examens 2026') then
    insert into public.actualites (titre, categorie, extrait, contenu, statut, date_publication)
    values (
      'Séance de Coaching et de Motivation des candidats aux examens 2026',
      'Vie scolaire',
      'Au-delà des révisions académiques, le GSR accompagne aussi ses candidats sur le plan psychologique avec une séance de coaching et de motivation.',
      E'La réussite aux examens ne se joue pas uniquement sur les connaissances académiques : la confiance en soi, la gestion du stress et la discipline personnelle jouent un rôle tout aussi déterminant. C''est dans cet esprit que le Groupe Secret de la Réussite a organisé une séance de coaching et de motivation dédiée à ses candidats aux examens 2026.\n\nAnimée par notre équipe pédagogique, cette rencontre a permis d''aborder des sujets essentiels à l''approche des épreuves : techniques de gestion du stress, organisation efficace du temps de révision, et surtout, comment garder confiance face à la pression des examens.\n\nLes élèves ont pu échanger librement sur leurs appréhensions et repartir avec des outils concrets pour aborder sereinement les semaines à venir. Cette dimension d''accompagnement humain fait partie intégrante de notre philosophie : préparer nos élèves non seulement académiquement, mais aussi mentalement, à affronter les moments décisifs de leur parcours scolaire.\n\nD''autres séances de ce type seront organisées à l''approche des sessions d''examens. Les élèves inscrits dans nos programmes en seront informés directement sur leur site.',
      'publie',
      now() - interval '14 days'
    ) returning id into v_coaching_id;

    insert into public.actualites_images (actualite_id, storage_path, ordre) values
      (v_coaching_id, 'vitrine/sites/img_site_jericho.jpg', 0);
  end if;
end $$;
