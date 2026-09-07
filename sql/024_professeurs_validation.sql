-- ===========================================================================
-- Migration 024 : Validation des inscriptions de professeurs en libre-service
-- ===========================================================================

-- 1. Ajout de la colonne valide à la table td.professeurs
--    Par défaut true pour tous les professeurs déjà existants.
alter table td.professeurs
  add column if not exists valide boolean not null default true;

-- 2. Index pour optimiser la récupération des inscriptions en attente
create index if not exists idx_professeurs_valide
  on td.professeurs (valide)
  where valide = false;
