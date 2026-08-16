-- ============================================================================
-- GSR — Galerie admin : ouverte à chef_site/secretaire, suppression limitée
-- à ses propres uploads pour ces deux rôles — voir discussion 2026-08-16.
-- À coller après 020_secretaire_droits_chef_site.sql.
--
-- sql/008 réservait explicitement cette page à coordonnateur/comptable/
-- superviseur ("pas chef_site, pas secretaire"). Le client a changé d'avis :
-- chef_site/secretaire peuvent désormais consulter ET ajouter des photos,
-- mais ne peuvent supprimer que ce qu'ils ont eux-mêmes uploadé — les 3
-- rôles historiques gardent un droit de suppression illimité. La policy
-- `FOR ALL` unique de 008 ne peut plus exprimer cette nuance (une condition
-- différente pour DELETE que pour SELECT/INSERT) : on la scinde en 3.
--
-- Idempotent : DROP POLICY IF EXISTS avant chaque CREATE POLICY.
-- ============================================================================

drop policy if exists "galerie_admin_acces" on public.galerie_admin;

create policy "galerie_admin_lecture" on public.galerie_admin
  for select using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.actif = true
        and u.role in ('coordonnateur','comptable','superviseur','chef_site','secretaire')
    )
  );

create policy "galerie_admin_ajout" on public.galerie_admin
  for insert with check (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.actif = true
        and u.role in ('coordonnateur','comptable','superviseur','chef_site','secretaire')
    )
  );

create policy "galerie_admin_suppression" on public.galerie_admin
  for delete using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.actif = true
      and (
        u.role in ('coordonnateur','comptable','superviseur')
        or (u.role in ('chef_site','secretaire') and galerie_admin.ajoute_par = auth.uid())
      )
    )
  );

-- ---------------------------------------------------------------------------
-- storage.objects — même nuance. `owner` : colonne remplie automatiquement
-- par Supabase Storage à l'upload (client RLS, jamais service role ici) avec
-- l'auth.uid() de l'uploadeur — pas besoin de rejoindre galerie_admin.
-- ---------------------------------------------------------------------------
drop policy if exists "galerie_admin_storage_lecture" on storage.objects;
create policy "galerie_admin_storage_lecture" on storage.objects
  for select using (
    bucket_id = 'galerie-admin' and
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.actif = true
        and u.role in ('coordonnateur','comptable','superviseur','chef_site','secretaire')
    )
  );

drop policy if exists "galerie_admin_storage_upload" on storage.objects;
create policy "galerie_admin_storage_upload" on storage.objects
  for insert with check (
    bucket_id = 'galerie-admin' and
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.actif = true
        and u.role in ('coordonnateur','comptable','superviseur','chef_site','secretaire')
    )
  );

drop policy if exists "galerie_admin_storage_suppression" on storage.objects;
create policy "galerie_admin_storage_suppression" on storage.objects
  for delete using (
    bucket_id = 'galerie-admin' and
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.actif = true
      and (
        u.role in ('coordonnateur','comptable','superviseur')
        or (u.role in ('chef_site','secretaire') and storage.objects.owner = auth.uid())
      )
    )
  );
