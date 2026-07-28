-- ============================================================================
-- GSR — Active Supabase Realtime sur public.notifications (§5.8/§8.1)
-- À coller après 006_fin_annee_ajustements.sql. Idempotent.
--
-- La RLS existe déjà (policy "notifications_acces", 004_rls_policies.sql) —
-- il ne manquait que l'ajout de la table à la publication Realtime pour que
-- postgres_changes fonctionne réellement côté client.
-- ============================================================================

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;
