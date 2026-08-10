-- ============================================================================
-- GSR — Deux contacts parents (WhatsApp + téléphonique simple) — voir
-- discussion 2026-08-10. À coller après 013_penalite_reinscription.sql.
--
-- contact_parent devient optionnel : un parent peut ne pas avoir WhatsApp, la
-- relance de paiement (RelancerWhatsAppButton) se base dessus et disparaît
-- côté app quand il est vide. contact_parent_2 est un numéro simple,
-- optionnel, sans exigence WhatsApp.
--
-- Les deux colonnes passent à varchar(15) : format normalisé sans espaces,
-- ex. Bénin +2290100000000 (14 caractères) — validé côté application
-- (src/lib/telephone.ts), pas ici, pour rester cohérent avec le reste du
-- projet où le format des champs texte n'est jamais contraint en SQL.
-- Rétrécissement sûr : base client encore vide à ce stade, aucune donnée à
-- migrer.
--
-- La contrainte CHECK ci-dessous est la seule garde posée en SQL : au moins
-- un des deux contacts doit être renseigné, quel que soit le chemin de code
-- qui écrit la ligne.
--
-- Idempotent : IF NOT EXISTS / DROP CONSTRAINT IF EXISTS partout.
-- ============================================================================

alter table public.eleves alter column contact_parent drop not null;
alter table public.eleves alter column contact_parent type varchar(15);
alter table public.eleves add column if not exists contact_parent_2 varchar(15);

alter table public.eleves drop constraint if exists eleves_au_moins_un_contact;
alter table public.eleves add constraint eleves_au_moins_un_contact
  check (contact_parent is not null or contact_parent_2 is not null);
