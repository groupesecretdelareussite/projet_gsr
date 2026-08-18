-- ============================================================================
-- GSR — Paiements : traçabilité de l'agent ayant enregistré le paiement
-- (colonne enregistre_par sur public.paiements) — voir discussion 2026-08-18.
-- À coller après 021_galerie_admin_chef_site_secretaire.sql.
--
-- Permet d'identifier quel membre du staff (coordonnateur, comptable ou
-- superviseur) a validé l'encaissement d'un paiement.
--
-- Idempotent : ADD COLUMN IF NOT EXISTS, DROP POLICY IF EXISTS.
-- ============================================================================

alter table public.paiements
  add column if not exists enregistre_par uuid references public.users(id) on delete set null;

-- ---------------------------------------------------------------------------
-- users — permet au staff actif de lire le nom d'utilisateur (username)
-- des autres membres du staff (utilisé pour afficher l'auteur dans l'historique
-- des paiements et dans la galerie admin sans recourir au service-role).
-- ---------------------------------------------------------------------------
drop policy if exists "users_lecture_soi_meme" on public.users;
drop policy if exists "users_lecture_staff" on public.users;
create policy "users_lecture_staff" on public.users
  for select using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.actif = true
    )
  );
