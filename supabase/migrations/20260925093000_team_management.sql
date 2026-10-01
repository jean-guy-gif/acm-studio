-- Mission 60 — inviter / retirer / donner le rôle : le socle de données.
--
-- RETIRER = retirer l'ACCÈS, pas supprimer la personne. Son profil reste (sinon son nom
-- disparaît des dossiers qu'il a préparés, et on découvrirait la perte des mois plus tard). On
-- marque le profil `removed_at` ; le travail reste à l'agence, à son nom, repris par tout le monde.
alter table public.profiles add column removed_at timestamptz;

-- L'accès se ferme À L'ADRESSE, pas seulement à l'écran : get_current_agency_id() ignore un
-- profil retiré → toute la RLS cadrée sur l'agence ne renvoie plus rien pour lui. SECURITY
-- DEFINER, donc pas de récursion sur la policy de profiles.
create or replace function public.get_current_agency_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select agency_id from public.profiles where id = auth.uid() and removed_at is null
$$;

-- Mais un utilisateur doit pouvoir lire SON PROPRE profil même retiré, pour que l'application
-- lui dise « vous avez été retiré » au lieu de le renvoyer bootstraper une agence. Policy de
-- lecture de soi, en plus de l'isolation par agence (les policies permissives s'additionnent).
create policy profiles_self_read on public.profiles
  for select
  to authenticated
  using (id = auth.uid());

-- Les invitations en attente. L'agence et le rôle VOYAGENT avec l'invitation (une personne
-- invitée n'atterrit jamais ailleurs). `sent_at` NULL = « non envoyée » : une invitation dont
-- l'e-mail n'est jamais parti ne se fait jamais passer pour envoyée (échec de livraison =
-- issue visible, de première classe). `accepted_at` NULL = encore en attente.
create table public.agency_invitations (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  email text not null,
  role text not null check (role in ('manager', 'advisor')),
  invited_by uuid not null references public.profiles (id),
  auth_user_id uuid references auth.users (id),
  sent_at timestamptz,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Une seule invitation EN ATTENTE par adresse (un profil appartient à une seule agence).
create unique index idx_agency_invitations_pending_email
  on public.agency_invitations (email)
  where accepted_at is null;
create index idx_agency_invitations_agency on public.agency_invitations (agency_id);

-- RLS : les membres de l'agence LISENT les invitations de leur agence (la liste des « en
-- attente »). Aucune écriture directe — tout passe par le Server Action (service role), après
-- le garde de rôle manager. L'acceptation lit par service role (l'invité n'a pas encore de
-- profil, donc pas d'agence côté RLS).
alter table public.agency_invitations enable row level security;
create policy agency_invitations_select_own on public.agency_invitations
  for select to authenticated using (agency_id = public.get_current_agency_id());
revoke insert, update, delete, truncate on public.agency_invitations from authenticated;
revoke all on public.agency_invitations from anon;

-- Acceptation : l'invité authentifié (via le lien e-mail) crée SON profil dans l'agence et avec
-- le rôle de SON invitation en attente — l'agence et le rôle viennent de l'invitation, jamais du
-- client. SECURITY DEFINER (l'invité n'a pas encore d'agence, donc pas d'accès RLS). L'identité
-- (uid, e-mail) vient du JWT ; l'invité ne fournit que son nom.
create or replace function public.accept_invitation(first_name text, last_name text)
returns table (profile_id uuid, agency_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_email text;
  v_first text;
  v_last text;
  v_inv public.agency_invitations;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;
  if exists (select 1 from public.profiles where id = v_uid) then
    raise exception 'Profile already exists for this user' using errcode = '23505';
  end if;

  select email into v_email from auth.users where id = v_uid;
  if v_email is null or btrim(v_email) = '' then
    raise exception 'No email available' using errcode = '22023';
  end if;

  v_first := btrim(first_name);
  v_last := btrim(last_name);
  if v_first = '' or v_last = '' then
    raise exception 'Name is required' using errcode = '22023';
  end if;

  -- L'invitation en attente pour CETTE adresse (insensible à la casse).
  select * into v_inv from public.agency_invitations
    where lower(email) = lower(v_email) and accepted_at is null
    order by created_at desc limit 1;
  if v_inv.id is null then
    raise exception 'No pending invitation for this address' using errcode = 'P0002';
  end if;

  insert into public.profiles (id, agency_id, first_name, last_name, email, role)
  values (v_uid, v_inv.agency_id, v_first, v_last, v_email, v_inv.role);

  update public.agency_invitations
    set accepted_at = now(), auth_user_id = v_uid, updated_at = now()
    where id = v_inv.id;

  profile_id := v_uid;
  agency_id := v_inv.agency_id;
  return next;
end;
$$;

revoke all on function public.accept_invitation(text, text) from public, anon;
grant execute on function public.accept_invitation(text, text) to authenticated;
