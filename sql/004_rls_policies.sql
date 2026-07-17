-- ============================================================================
-- GSR — Row Level Security — voir GSR_ARCHITECTURE.md §5.1, §5.4, §5.5, §5.8
-- À coller après 003_triggers_functions.sql.
--
-- Principe (§5.1) : policies à 3 niveaux sur les tables sensibles —
--   (1) coordonnateur/comptable : accès global (pas de filtre site)
--   (2) superviseur : filtré via user_sites
--   (3) chef_site : filtré via users.site_id
-- secretaire est explicitement exclu de toutes les tables sensibles (§13.7).
--
-- Tables sans policy ci-dessous (RLS activée quand même) = accès refusé à
-- tout le monde sauf au client service role (qui bypass RLS, §5.5) : c'est
-- volontaire pour users, user_sites (écriture), comptes_parents,
-- login_attempts, paiements_supprimes (écriture), decisions_passage.
-- ============================================================================

alter table public.sites               enable row level security;
alter table public.classes             enable row level security;
alter table public.frais_td            enable row level security;
alter table public.annees_scolaires    enable row level security;
alter table public.users               enable row level security;
alter table public.user_sites          enable row level security;
alter table public.eleves              enable row level security;
alter table public.eleves_suspendus    enable row level security;
alter table public.paiements           enable row level security;
alter table public.paiements_supprimes enable row level security;
alter table public.presences           enable row level security;
alter table public.matieres            enable row level security;
alter table public.notes               enable row level security;
alter table public.notifications       enable row level security;
alter table public.log_whatsapp        enable row level security;
alter table public.comptes_parents     enable row level security;
alter table public.decisions_passage   enable row level security;
alter table public.categories_depenses enable row level security;
alter table public.depenses_annexes    enable row level security;
alter table public.galerie             enable row level security;
alter table public.login_attempts      enable row level security;

-- ---------------------------------------------------------------------------
-- users — chaque membre du staff peut lire SA PROPRE ligne (nécessaire pour
-- getUserScope(), §5.4, appelé avec le client RLS, pas le service role)
-- ---------------------------------------------------------------------------
create policy "users_lecture_soi_meme" on public.users
  for select using (id = auth.uid());

-- ---------------------------------------------------------------------------
-- user_sites — un superviseur peut lire SES PROPRES lignes (getUserScope())
-- ---------------------------------------------------------------------------
create policy "user_sites_lecture_soi_meme" on public.user_sites
  for select using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Tables de référence — lecture ouverte à tout le staff actif authentifié
-- (sites/classes/frais_td/matieres/annees_scolaires/categories_depenses ne
-- sont pas des données sensibles par élève ; nécessaires aux formulaires de
-- tous les rôles, y compris chef_site)
-- ---------------------------------------------------------------------------
create policy "sites_lecture_staff" on public.sites
  for select using (
    exists (select 1 from public.users u where u.id = auth.uid() and u.actif = true)
  );

create policy "classes_lecture_staff" on public.classes
  for select using (
    exists (select 1 from public.users u where u.id = auth.uid() and u.actif = true)
  );

create policy "frais_td_lecture_staff" on public.frais_td
  for select using (
    exists (select 1 from public.users u where u.id = auth.uid() and u.actif = true)
  );

create policy "matieres_lecture_staff" on public.matieres
  for select using (
    exists (select 1 from public.users u where u.id = auth.uid() and u.actif = true)
  );

create policy "annees_scolaires_lecture_staff" on public.annees_scolaires
  for select using (
    exists (select 1 from public.users u where u.id = auth.uid() and u.actif = true)
  );

create policy "categories_depenses_lecture_global" on public.categories_depenses
  for select using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.actif = true
        and u.role in ('coordonnateur','comptable')
    )
  );

-- galerie : table d'index de photos publiques (§4) — lecture publique, la
-- vitrine (non authentifiée) doit pouvoir les lister.
create policy "galerie_lecture_publique" on public.galerie
  for select using (true);

-- ---------------------------------------------------------------------------
-- eleves (§5.1, v2.1 — filtre via classe_id -> classes.site_id)
-- ---------------------------------------------------------------------------
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
        or (u.role = 'chef_site' and exists (
          select 1 from public.classes c
          where c.id = eleves.classe_id and c.site_id = u.site_id
        ))
      )
    )
  );

-- ---------------------------------------------------------------------------
-- eleves_suspendus (même scope que eleves, via site_id direct — interdit au
-- chef_site, §13.6/§8.4)
-- ---------------------------------------------------------------------------
create policy "eleves_suspendus_acces" on public.eleves_suspendus
  for all using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.actif = true
      and (
        u.role in ('coordonnateur','comptable')
        or (u.role = 'superviseur' and exists (
          select 1 from public.user_sites us
          where us.user_id = auth.uid() and us.site_id = eleves_suspendus.site_id
        ))
      )
    )
  );

-- ---------------------------------------------------------------------------
-- paiements (exemple exact du §5.1 — chef_site et secretaire n'ont pas accès)
-- ---------------------------------------------------------------------------
create policy "paiements_acces" on public.paiements
  for all using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.actif = true
      and (
        u.role in ('coordonnateur', 'comptable')
        or (u.role = 'superviseur' and exists (
          select 1 from public.user_sites us
          join public.eleves e on e.id = paiements.eleve_id
          join public.classes c on c.id = e.classe_id
          where us.user_id = auth.uid() and us.site_id = c.site_id
        ))
      )
    )
  );

-- ---------------------------------------------------------------------------
-- presences (accessible aussi au chef_site, sur son site — §5.4 matrice)
-- ---------------------------------------------------------------------------
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
        or (u.role = 'chef_site' and u.site_id = presences.site_id)
      )
    )
  );

-- ---------------------------------------------------------------------------
-- notes (accessible aussi au chef_site, sur son site — §5.4 matrice)
-- ---------------------------------------------------------------------------
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
        or (u.role = 'chef_site' and exists (
          select 1 from public.eleves e
          join public.classes c on c.id = e.classe_id
          where e.id = notes.eleve_id and c.site_id = u.site_id
        ))
      )
    )
  );

-- ---------------------------------------------------------------------------
-- notifications (v2.1 §5.8 — pour que le canal Realtime respecte le scope,
-- pas seulement un filtrage côté client)
-- ---------------------------------------------------------------------------
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
        or (u.role = 'chef_site' and u.site_id = notifications.site_id)
      )
    )
  );

-- ---------------------------------------------------------------------------
-- log_whatsapp (lecture par rôles globaux + superviseur scoped via matricule
-- -> eleves -> classes ; chef_site et secretaire exclus, §13.6)
-- ---------------------------------------------------------------------------
create policy "log_whatsapp_acces" on public.log_whatsapp
  for select using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.actif = true
      and (
        u.role in ('coordonnateur','comptable')
        or (u.role = 'superviseur' and exists (
          select 1 from public.user_sites us
          join public.eleves e on e.matricule = log_whatsapp.matricule
          join public.classes c on c.id = e.classe_id
          where us.user_id = auth.uid() and us.site_id = c.site_id
        ))
      )
    )
  );

-- ---------------------------------------------------------------------------
-- paiements_supprimes (lecture coordonnateur/comptable uniquement, §5.4)
-- ---------------------------------------------------------------------------
create policy "paiements_supprimes_lecture" on public.paiements_supprimes
  for select using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.actif = true and u.role in ('coordonnateur','comptable')
    )
  );

-- ---------------------------------------------------------------------------
-- decisions_passage (lecture coordonnateur uniquement, §8.10/§12.9)
-- ---------------------------------------------------------------------------
create policy "decisions_passage_lecture" on public.decisions_passage
  for select using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.actif = true and u.role = 'coordonnateur'
    )
  );

-- ---------------------------------------------------------------------------
-- depenses_annexes (lecture coordonnateur/comptable uniquement, §11)
-- ---------------------------------------------------------------------------
create policy "depenses_annexes_lecture" on public.depenses_annexes
  for select using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.actif = true and u.role in ('coordonnateur','comptable')
    )
  );
