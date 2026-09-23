-- ============================================================================
-- GSR — Notifications ciblées par rôles
-- 1. Réinscription d'un élève suspendu (Coordonnateur, Superviseur, Comptable, Chef de site)
-- 2. Suppression d'un paiement (Coordonnateur, Comptable uniquement)
-- 3. Alerte d'assiduité : 2 absences dans le même mois (Coordonnateur, Superviseur, Chef de site)
-- À appliquer après 026_td_max_postulations_et_affectation_directe.sql.
-- ============================================================================

-- 1. Ajout de la colonne optionnelle roles_cibles sur public.notifications
-- NULL = notification visible selon le périmètre de site habituel (comportement historique)
-- Défini = restreint strictement la visibilité aux rôles énumérés
alter table public.notifications
  add column if not exists roles_cibles text[] default null;

-- 2. Mise à jour de la politique RLS "notifications_acces"
-- Remplace la version de 020_secretaire_droits_chef_site.sql pour intégrer
-- la condition : (notifications.roles_cibles is null or u.role = any(notifications.roles_cibles))
drop policy if exists "notifications_acces" on public.notifications;

create policy "notifications_acces" on public.notifications
  for select using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.actif = true
      and (notifications.roles_cibles is null or u.role = any(notifications.roles_cibles))
      and (
        u.role in ('coordonnateur', 'comptable')
        or (u.role = 'superviseur' and exists (
          select 1 from public.user_sites us
          where us.user_id = auth.uid() and us.site_id = notifications.site_id
        ))
        or (u.role in ('chef_site', 'secretaire') and u.site_id = notifications.site_id)
      )
    )
  );
