-- ===========================================================================
-- Migration 033 : Renommage du réseau Mobile Money « celtis » -> « Celtiis »
-- ===========================================================================
-- Contexte : le code applicatif (src/lib/td-finances.ts, src/actions/td-paiements.ts)
-- utilise désormais la valeur 'Celtiis'. La contrainte CHECK créée par la migration 031
-- (déjà appliquée sur les deux instances) n'accepte encore que 'celtis' : sans cette
-- migration, toute demande de retrait Celtiis Cash serait rejetée par la base.
--
-- À exécuter sur les DEUX instances Supabase (Test et Client / Prod), AVANT le
-- déploiement du code. Idempotente : peut être rejouée sans effet de bord.
-- ===========================================================================

begin;

-- 1. Supprimer l'ancienne contrainte CHECK sur reseau_momo, quel que soit son nom
--    (déclarée en ligne dans 031, son nom a été généré automatiquement par Postgres).
do $$
declare
  contrainte record;
begin
  for contrainte in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'td'
      and rel.relname = 'demandes_retrait'
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%reseau_momo%'
  loop
    execute format('alter table td.demandes_retrait drop constraint %I', contrainte.conname);
  end loop;
end $$;

-- 2. Convertir les demandes existantes enregistrées avec l'ancienne valeur
update td.demandes_retrait
set reseau_momo = 'Celtiis'
where reseau_momo = 'celtis';

-- 3. Recréer la contrainte avec un nom explicite et la nouvelle valeur
alter table td.demandes_retrait
  add constraint demandes_retrait_reseau_momo_check
  check (reseau_momo in ('mtn', 'moov', 'Celtiis'));

commit;

-- Vérification (facultative) : doit renvoyer la nouvelle définition et 0 ligne 'celtis'
-- select pg_get_constraintdef(oid) from pg_constraint where conname = 'demandes_retrait_reseau_momo_check';
-- select count(*) from td.demandes_retrait where reseau_momo = 'celtis';
