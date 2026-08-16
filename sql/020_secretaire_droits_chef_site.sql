-- ============================================================================
-- GSR — Secrétaire : mêmes droits que chef_site (pour le moment) — voir
-- discussion 2026-08-15. À coller après 019_notes_semestres.sql.
--
-- GSR_ARCHITECTURE.md (v2.0) documentait déjà secretaire comme "dashboard
-- uniquement, droits en attente de décision" (lignes 8 et 799) — ce n'est
-- donc pas une entorse à la spec, c'est le client qui prend enfin la
-- décision restée ouverte depuis la v2.0. Choix : aligner secretaire sur
-- chef_site EXACTEMENT (même périmètre site-scopé, mêmes exclusions —
-- paiements, contacts parents, exports... restent hors de portée pour les
-- deux), pas un nouveau profil de droits à inventer.
--
-- Prérequis structurel : chef_site est scope-limité via users.site_id (un
-- seul site). Pour que secretaire bénéficie du même mécanisme, secretaire
-- doit pouvoir avoir un site_id — aujourd'hui trg_users_scope_coherence
-- l'interdit explicitement (secretaire listé aux côtés de coordonnateur/
-- comptable/superviseur, qui doivent rester sans site). On sort secretaire
-- de cette liste et on l'ajoute à l'obligation "site_id requis", au même
-- titre que chef_site.
--
-- Effet de bord attendu : les comptes secretaire déjà existants ont
-- site_id = NULL (imposé par l'ancien trigger) — ce n'est pas rétroactif,
-- il faudra éditer chaque compte existant (Paramètres > Utilisateurs) pour
-- lui assigner un site, sans quoi getUserScope() lui donnera un périmètre
-- vide (siteIds = []) et non une erreur.
--
-- Idempotent : CREATE OR REPLACE pour la fonction, DROP POLICY IF EXISTS
-- avant chaque CREATE POLICY.
-- ============================================================================

create or replace function public.trg_users_scope_coherence_fn() returns trigger as $$
begin
  if new.role in ('chef_site', 'secretaire') and new.site_id is null then
    raise exception 'site_id obligatoire pour le rôle %', new.role;
  end if;

  if new.role in ('coordonnateur','comptable','superviseur') and new.site_id is not null then
    raise exception 'site_id doit être NULL pour le rôle %', new.role;
  end if;

  return new;
end;
$$ language plpgsql;

-- ---------------------------------------------------------------------------
-- eleves — même condition que la branche chef_site déjà en place.
-- ---------------------------------------------------------------------------
drop policy if exists "eleves_acces" on public.eleves;
create policy "eleves_acces" on public.eleves
  for all using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.actif = true
      and (
        u.role in ('coordonnateur','comptable')
        or (u.role = 'superviseur' and exists (
          select 1 from public.user_sites us
          join public.classes c on c.id = eleves.classe_id
          where us.user_id = auth.uid() and us.site_id = c.site_id
        ))
        or (u.role in ('chef_site','secretaire') and exists (
          select 1 from public.classes c
          where c.id = eleves.classe_id and c.site_id = u.site_id
        ))
      )
    )
  );

-- ---------------------------------------------------------------------------
-- presences
-- ---------------------------------------------------------------------------
drop policy if exists "presences_acces" on public.presences;
create policy "presences_acces" on public.presences
  for all using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.actif = true
      and (
        u.role in ('coordonnateur','comptable')
        or (u.role = 'superviseur' and exists (
          select 1 from public.user_sites us
          where us.user_id = auth.uid() and us.site_id = presences.site_id
        ))
        or (u.role in ('chef_site','secretaire') and u.site_id = presences.site_id)
      )
    )
  );

-- ---------------------------------------------------------------------------
-- notes
-- ---------------------------------------------------------------------------
drop policy if exists "notes_acces" on public.notes;
create policy "notes_acces" on public.notes
  for all using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.actif = true
      and (
        u.role in ('coordonnateur','comptable')
        or (u.role = 'superviseur' and exists (
          select 1 from public.user_sites us
          join public.eleves e on e.id = notes.eleve_id
          join public.classes c on c.id = e.classe_id
          where us.user_id = auth.uid() and us.site_id = c.site_id
        ))
        or (u.role in ('chef_site','secretaire') and exists (
          select 1 from public.eleves e
          join public.classes c on c.id = e.classe_id
          where e.id = notes.eleve_id and c.site_id = u.site_id
        ))
      )
    )
  );

-- ---------------------------------------------------------------------------
-- notifications — chef_site y a accès dans le code actuel (v2.1, canal
-- Realtime), même si la matrice §5.4 de GSR_ARCHITECTURE.md ne le montre
-- pas explicitement : le code fait foi, secretaire suit donc la même règle.
-- ---------------------------------------------------------------------------
drop policy if exists "notifications_acces" on public.notifications;
create policy "notifications_acces" on public.notifications
  for select using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.actif = true
      and (
        u.role in ('coordonnateur', 'comptable')
        or (u.role = 'superviseur' and exists (
          select 1 from public.user_sites us
          where us.user_id = auth.uid() and us.site_id = notifications.site_id
        ))
        or (u.role in ('chef_site','secretaire') and u.site_id = notifications.site_id)
      )
    )
  );

-- ---------------------------------------------------------------------------
-- moyennes_semestrielles (sql/019) — corrigée ici plutôt que dans 019 :
-- 019 est déjà appliquée telle quelle (chef_site seul) sur la base client
-- (confirmé 2026-08-15), donc l'éditer sur place ne l'aurait jamais atteinte
-- là-bas. `if not exists` sur la policy elle-même n'existe pas en Postgres —
-- DROP IF EXISTS + CREATE reste la bonne idempotence ici comme ailleurs,
-- y compris si 019 tel que réécrit dans ce dépôt (avec secretaire déjà
-- inclus) tourne un jour sur une base neuve : cette policy serait alors
-- simplement remplacée par une définition identique, sans effet.
-- ---------------------------------------------------------------------------
drop policy if exists "moyennes_semestrielles_acces" on public.moyennes_semestrielles;
create policy "moyennes_semestrielles_acces" on public.moyennes_semestrielles
  for all using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.actif = true
      and (
        u.role in ('coordonnateur','comptable')
        or (u.role = 'superviseur' and exists (
          select 1 from public.user_sites us
          join public.eleves e on e.id = moyennes_semestrielles.eleve_id
          join public.classes c on c.id = e.classe_id
          where us.user_id = auth.uid() and us.site_id = c.site_id
        ))
        or (u.role in ('chef_site','secretaire') and exists (
          select 1 from public.eleves e
          join public.classes c on c.id = e.classe_id
          where e.id = moyennes_semestrielles.eleve_id and c.site_id = u.site_id
        ))
      )
    )
  );
