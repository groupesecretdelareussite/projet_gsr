-- ============================================================================
-- Migration 030 : Table des codes de secours MFA (Google Authenticator / TOTP)
-- ============================================================================

create table if not exists public.mfa_backup_codes (
  id          serial primary key,
  user_id     uuid not null references public.users(id) on delete cascade,
  code_hash   text not null,
  utilise     boolean not null default false,
  utilise_le  timestamptz,
  cree_le     timestamptz not null default now()
);

-- Index pour recherche rapide lors de la validation
create index if not exists idx_mfa_backup_codes_user on public.mfa_backup_codes(user_id, utilise);

-- Activation RLS
alter table public.mfa_backup_codes enable row level security;

-- Policies RLS : l'utilisateur authentifié peut consulter l'état de ses codes de secours
create policy "mfa_backup_codes_lecture_soi"
  on public.mfa_backup_codes
  for select
  to authenticated
  using (user_id = auth.uid());

-- Permissions explicites (Breaking change Supabase post-30 Octobre)
grant select on public.mfa_backup_codes to authenticated;
grant select, insert, update, delete on public.mfa_backup_codes to service_role;
