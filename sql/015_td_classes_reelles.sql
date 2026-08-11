-- ============================================================================
-- GSR — Portail TD : td.creneaux.classe_id référence désormais public.classes
-- (au lieu de td.classes_td) — voir discussion du 2026-08-11.
-- À coller après 014_deux_contacts_parents.sql.
--
-- Contexte : td.classes_td (id, nom_classe) ne portait ni site_id ni
-- distinction de section, ce qui causait deux problèmes réels :
--   (a) aucun moyen de savoir à quel site un créneau appartient (nécessaire
--       pour la page vitrine "Programmes par site") ;
--   (b) la contrainte UNIQUE(classe_id, date_td, heure_debut) (Règle B,
--       sql/002_schema_td.sql) bloquait à tort deux créneaux légitimes de
--       même niveau (ex. deux sections "6ème") au même site ou sur des
--       sites différents à la même heure — classes_td n'ayant qu'une seule
--       ligne par niveau, tous sites confondus.
-- public.classes porte déjà site_id ET une vraie distinction de section
-- (ex. "Terminale A"/"B"/"C"/"D" à Jéricho, cf. sql/005_seed.sql) — c'est
-- la bonne granularité.
--
-- NB : la contrainte UNIQUE(classe_id, date_td, heure_debut) n'a pas besoin
-- de changer de forme. Elle exprimait déjà la bonne intention ("un même
-- groupe d'élèves ne peut pas avoir deux créneaux au même moment") ; elle
-- était seulement trop grossière parce que classe_id désignait un niveau,
-- pas un groupe réel. Une fois classe_id réel (site + section inclus), la
-- contrainte devient correcte sans aucune modification de sa définition —
-- seule la cible de la clé étrangère change.
--
-- Données existantes : cette base est un environnement de test/dev jetable
-- (confirmé) — td.creneaux.classe_id contient des ids de l'ancien espace
-- td.classes_td (1..7) qui n'ont aucune correspondance fiable vers
-- public.classes (site ambigu). Plutôt qu'un backfill hasardeux, on
-- supprime les créneaux existants (cascade -> td.postulations) avant de
-- reposer la contrainte de clé étrangère. Si ce script est un jour rejoué
-- sur une base contenant de vraies données à préserver, remplacer cette
-- suppression par un vrai backfill (mapping manuel ancien-id -> nouveau-id
-- par site) AVANT de continuer.
--
-- DROP TABLE ... CASCADE fait tomber l'ancienne contrainte de clé étrangère
-- sur td.creneaux.classe_id quel que soit son nom exact (auto-généré par
-- Postgres), sans avoir à le deviner — ainsi que la policy RLS de
-- classes_td (sql/009_td_module.sql), déjà inutile une fois la table
-- supprimée.
--
-- Idempotent : IF EXISTS partout, sûr à rejouer.
-- ============================================================================

delete from td.creneaux;

drop table if exists td.classes_td cascade;

alter table td.creneaux
  add constraint creneaux_classe_id_fkey
  foreign key (classe_id) references public.classes(id) on delete restrict;
