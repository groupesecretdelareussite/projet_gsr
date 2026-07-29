-- ============================================================================
-- GSR — Portail TD : droits Postgres manquants sur le schéma td
-- À coller après 009_td_module.sql.
--
-- Contexte : contrairement à `public` (dont les droits sont configurés
-- automatiquement par Supabase à la création du projet), un schéma créé à la
-- main (`create schema if not exists td;`, voir 002_schema_td.sql) n'accorde
-- par défaut AUCUN droit aux rôles PostgREST (`anon`, `authenticated`,
-- `service_role`) — y compris `service_role`, qui contourne RLS mais reste
-- soumis au système de GRANT Postgres, ce sont deux couches différentes.
-- Sans ce script, toute requête `.schema('td')` échoue en 403
-- "permission denied for schema td" (code 42501), même une fois le schéma
-- `td` ajouté aux "Exposed schemas" du Dashboard.
--
-- Idempotent : GRANT peut être rejoué sans risque.
-- ============================================================================

grant usage on schema td to authenticated, service_role;

grant all on all tables in schema td to authenticated, service_role;
grant all on all sequences in schema td to authenticated, service_role;
grant execute on all routines in schema td to authenticated, service_role;

-- Pour toute table/séquence/fonction créée plus tard dans td (au cas où).
alter default privileges in schema td grant all on tables to authenticated, service_role;
alter default privileges in schema td grant all on sequences to authenticated, service_role;
alter default privileges in schema td grant execute on routines to authenticated, service_role;
