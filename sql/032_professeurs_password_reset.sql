-- ===========================================================================
-- Migration 032 : Réinitialisation autonome de mot de passe professeurs TD
-- ===========================================================================

-- 1. Ajout des colonnes pour le jeton de réinitialisation sécurisé
--    Le jeton est haché en SHA-256 (reset_token_hash) pour protéger la base
--    en cas d'accès non autorisé. Expiration stricte (15 min).
alter table td.professeurs
  add column if not exists reset_token_hash text,
  add column if not exists reset_token_expires_at timestamptz;

-- 2. Index partiel pour les requêtes rapides lors de la validation du lien
create index if not exists idx_professeurs_reset_token_hash
  on td.professeurs (reset_token_hash)
  where reset_token_hash is not null;
