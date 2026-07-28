-- ============================================================================
-- GSR — Galerie admin (archive interne de fichiers précieux) — 2026-07-28
-- À coller après 007_realtime_notifications.sql.
--
-- Distincte de public.galerie (vitrine publique, bucket "galerie", non
-- configuré pour l'instant) : ceci concerne le bucket privé "galerie-admin"
-- (créé via scripts/setup-storage-galerie-admin.ts), accessible uniquement
-- depuis la console admin, jamais exposé publiquement. Matrice de
-- permissions §5.4 : coordonnateur/comptable/superviseur — pas chef_site,
-- pas secretaire.
-- ============================================================================

create table if not exists public.galerie_admin (
  id             serial primary key,
  storage_path   text not null,
  nom_fichier    text not null,
  taille_octets  integer,
  ajoute_par     uuid not null references public.users(id) on delete restrict,
  date_ajout     timestamptz not null default now()
);

alter table public.galerie_admin enable row level security;

drop policy if exists "galerie_admin_acces" on public.galerie_admin;
create policy "galerie_admin_acces" on public.galerie_admin
  for all using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.actif = true
        and u.role in ('coordonnateur','comptable','superviseur')
    )
  );

-- ---------------------------------------------------------------------------
-- storage.objects — policies dédiées au bucket "galerie-admin" (privé).
-- ---------------------------------------------------------------------------
drop policy if exists "galerie_admin_storage_lecture" on storage.objects;
create policy "galerie_admin_storage_lecture" on storage.objects
  for select using (
    bucket_id = 'galerie-admin' and
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.actif = true
        and u.role in ('coordonnateur','comptable','superviseur')
    )
  );

drop policy if exists "galerie_admin_storage_upload" on storage.objects;
create policy "galerie_admin_storage_upload" on storage.objects
  for insert with check (
    bucket_id = 'galerie-admin' and
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.actif = true
        and u.role in ('coordonnateur','comptable','superviseur')
    )
  );

drop policy if exists "galerie_admin_storage_suppression" on storage.objects;
create policy "galerie_admin_storage_suppression" on storage.objects
  for delete using (
    bucket_id = 'galerie-admin' and
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.actif = true
        and u.role in ('coordonnateur','comptable','superviseur')
    )
  );
