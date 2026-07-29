-- ============================================================================
-- GSR — Portail TD : RLS + données de référence — voir GSR_ARCHITECTURE.md §5.3/§10
-- À coller après 008_galerie_admin.sql.
--
-- Rappel important (étape manuelle, pas du SQL) : le schéma `td` doit être
-- ajouté à la liste des "Exposed schemas" dans Supabase Dashboard ->
-- Project Settings -> Data API, sinon PostgREST renverra 404 sur toute
-- requête `.schema('td')` malgré ce script.
--
-- Idempotent : ON CONFLICT partout, DROP POLICY IF EXISTS avant chaque
-- CREATE POLICY.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- RLS — lecture réservée au coordonnateur (§1.1 : le portail TD n'est
-- accessible qu'au coordonnateur + aux professeurs ; les professeurs n'ont
-- pas de session Supabase Auth donc RLS ne les concerne jamais — leur accès
-- passe systématiquement par le client service role dans les Server Actions,
-- même raisonnement que public.comptes_parents). Les écritures passent
-- toutes par le client service role après getUserScope() (même convention
-- que sites/classes dans donnees-scolaires.ts) — ces policies sont donc du
-- SELECT uniquement, en défense en profondeur (§5.5).
-- ---------------------------------------------------------------------------

alter table td.zones enable row level security;
alter table td.classes_td enable row level security;
alter table td.matieres_td enable row level security;
alter table td.professeurs enable row level security;
alter table td.semaines enable row level security;
alter table td.creneaux enable row level security;
alter table td.postulations enable row level security;

drop policy if exists "td_zones_lecture_coordonnateur" on td.zones;
create policy "td_zones_lecture_coordonnateur" on td.zones
  for select using (
    exists (select 1 from public.users u where u.id = auth.uid() and u.actif = true and u.role = 'coordonnateur')
  );

drop policy if exists "td_classes_td_lecture_coordonnateur" on td.classes_td;
create policy "td_classes_td_lecture_coordonnateur" on td.classes_td
  for select using (
    exists (select 1 from public.users u where u.id = auth.uid() and u.actif = true and u.role = 'coordonnateur')
  );

drop policy if exists "td_matieres_td_lecture_coordonnateur" on td.matieres_td;
create policy "td_matieres_td_lecture_coordonnateur" on td.matieres_td
  for select using (
    exists (select 1 from public.users u where u.id = auth.uid() and u.actif = true and u.role = 'coordonnateur')
  );

drop policy if exists "td_professeurs_lecture_coordonnateur" on td.professeurs;
create policy "td_professeurs_lecture_coordonnateur" on td.professeurs
  for select using (
    exists (select 1 from public.users u where u.id = auth.uid() and u.actif = true and u.role = 'coordonnateur')
  );

drop policy if exists "td_semaines_lecture_coordonnateur" on td.semaines;
create policy "td_semaines_lecture_coordonnateur" on td.semaines
  for select using (
    exists (select 1 from public.users u where u.id = auth.uid() and u.actif = true and u.role = 'coordonnateur')
  );

drop policy if exists "td_creneaux_lecture_coordonnateur" on td.creneaux;
create policy "td_creneaux_lecture_coordonnateur" on td.creneaux
  for select using (
    exists (select 1 from public.users u where u.id = auth.uid() and u.actif = true and u.role = 'coordonnateur')
  );

drop policy if exists "td_postulations_lecture_coordonnateur" on td.postulations;
create policy "td_postulations_lecture_coordonnateur" on td.postulations
  for select using (
    exists (select 1 from public.users u where u.id = auth.uid() and u.actif = true and u.role = 'coordonnateur')
  );

-- ---------------------------------------------------------------------------
-- Données de référence — zones + classes TD (matières déjà seedées en 005)
-- ---------------------------------------------------------------------------

insert into td.zones (nom_zone) values
  ('Jéricho'), ('Yagbé')
on conflict (nom_zone) do nothing;

insert into td.classes_td (nom_classe) values
  ('6ème'), ('5ème'), ('4ème'), ('3ème'), ('Seconde'), ('Première'), ('Terminale')
on conflict (nom_classe) do nothing;
