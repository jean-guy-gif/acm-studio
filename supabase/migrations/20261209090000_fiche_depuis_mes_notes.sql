-- Mission 151, partie A — L'acquéreur depuis mes notes.
--
-- UNIQUEMENT DES AJOUTS (décision de Jean-Guy, 12/11) : des colonnes nulles ou avec défaut, deux
-- tables et trois fonctions nouvelles ; rien n'est modifié ni supprimé, aucune ligne existante
-- n'est réécrite au-delà des défauts. La version en production (`main`) continue de marcher : elle
-- ne lit ni n'écrit rien de ce qui suit, et ses insertions dans `buyers` prennent les défauts.
--
--   1. `buyers` : la copropriété acceptée (oui / non / non renseigné) et son ★, à part de
--      `must_have` (dont la contrainte ne change pas) ; « Ce qui compte pour eux » (les critères
--      doux, avec leurs mots) ; les champs « À vérifier » d'une fiche née d'une lecture (M97).
--   2. `ai_usage` : chaque lecture par l'IA, ligne de consommation ET trace (CLAUDE.md : « ses
--      sorties sont tracées ») — qui, quand, quel modèle, quel coût, l'issue (fiche créée,
--      complétée, lecture annulée, échouée), la sorte de source et les NOMS des champs proposés et
--      gardés. Jamais une valeur lue, jamais une ligne des notes (principe 2 de la fiche). La ligne
--      reste à l'agence quand la fiche est supprimée (M100 : la consommation ne part pas).
--   3. `agency_ai_budgets` : le plafond mensuel d'IA d'une agence, réglé par un opérateur (M100) ;
--      sans ligne, le défaut du code (10 €). Table à part : le manager ne le modifie pas (M55).
--   4. `reserve_ai_budget` / `settle_ai_budget` : la réservation avant l'appel et le règlement
--      après (M105), sous le verrou de l'agence ; `ai_usage_since` : la consommation du mois.

-- L'`alter` de `buyers` prend un verrou exclusif : l'attente est bornée, comme les dernières
-- migrations.
set local lock_timeout = '5s';

-- ---------------------------------------------------------------------------------------------
-- 1. La fiche acquéreur
-- ---------------------------------------------------------------------------------------------
alter table public.buyers
  add column condominium_accepted boolean,
  add column condominium_must_have boolean not null default false,
  add column soft_criteria jsonb not null default '[]'::jsonb
    check (jsonb_typeof(soft_criteria) = 'array' and jsonb_array_length(soft_criteria) <= 10),
  add column fields_to_verify text[] not null default '{}'
    check (cardinality(fields_to_verify) <= 60);

comment on column public.buyers.condominium_accepted is
  'Mission 151 — copropriété acceptée : true, false (refusée), null (non renseigné).';
comment on column public.buyers.condominium_must_have is
  'Mission 151 — ★ sur la copropriété, à part de must_have (migration en ajouts seulement).';
comment on column public.buyers.soft_criteria is
  'Mission 151 — « Ce qui compte pour eux » : [{key, words}], 10 au plus, clés de la liste fermée, leurs mots (80 caractères). Relu par liste d''autorisation à l''écriture et à la lecture.';
comment on column public.buyers.fields_to_verify is
  'Mission 151 — les champs proposés par une lecture, « À vérifier » jusqu''à ce que le conseiller les touche ou dise « Tout est juste » (M97). Des noms de champs, jamais une valeur.';

-- ---------------------------------------------------------------------------------------------
-- 2. ai_usage — consommation et trace de chaque lecture
-- ---------------------------------------------------------------------------------------------
create table public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  buyer_id uuid references public.buyers (id) on delete set null,
  purpose text not null check (purpose in ('notes', 'ranking')),
  model text not null check (char_length(model) between 1 and 120),
  source text check (source is null or source in ('photo', 'file', 'text', 'listings')),
  -- Le coût en millièmes de centime d'euro (1 € = 100 000), compté à 1 $ = 1 € (prudent).
  cost_millicents integer not null check (cost_millicents >= 0),
  reserved boolean not null default false,
  outcome text not null default 'pending'
    check (outcome in ('pending', 'created', 'completed', 'cancelled', 'failed', 'ranked')),
  fields_proposed text[] not null default '{}' check (cardinality(fields_proposed) <= 60),
  fields_kept text[] not null default '{}' check (cardinality(fields_kept) <= 60),
  personal_mentions_skipped integer
    check (personal_mentions_skipped is null or personal_mentions_skipped between 0 and 99)
);

comment on table public.ai_usage is
  'Mission 151 — une ligne par lecture par l''IA : qui, quand, modèle, coût, issue, noms des champs proposés et gardés. Jamais de contenu lu. Écrite par le serveur seul.';

create index ai_usage_agency_month_idx on public.ai_usage (agency_id, created_at);
create index ai_usage_buyer_idx on public.ai_usage (buyer_id) where buyer_id is not null;

-- La base vérifie l'agence de la fiche et de l'auteur (modèle M134, M135), et FIGE la trace une
-- fois l'issue posée : seule la suppression de la fiche peut encore vider `buyer_id`.
create function public.check_ai_usage()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and old.outcome <> 'pending' and not old.reserved then
    if new.buyer_id is null and old.buyer_id is not null
       and (to_jsonb(new) - 'buyer_id' - 'updated_at') = (to_jsonb(old) - 'buyer_id' - 'updated_at') then
      return new;
    end if;
    raise exception 'ai_usage : une lecture close ne se modifie plus' using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' and (new.agency_id <> old.agency_id or new.created_at <> old.created_at) then
    raise exception 'ai_usage : l''agence et la date d''une lecture sont figées' using errcode = '42501';
  end if;
  if new.buyer_id is not null and not exists (
    select 1 from public.buyers b where b.id = new.buyer_id and b.agency_id = new.agency_id
  ) then
    raise exception 'ai_usage : la fiche n''est pas de cette agence' using errcode = '42501';
  end if;
  if new.user_id is not null and not exists (
    select 1 from public.profiles p where p.id = new.user_id and p.agency_id = new.agency_id
  ) then
    raise exception 'ai_usage : l''auteur n''est pas de cette agence' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger ai_usage_check
  before insert or update on public.ai_usage
  for each row execute function public.check_ai_usage();

revoke all on function public.check_ai_usage() from public, anon, authenticated;

alter table public.ai_usage enable row level security;

create policy ai_usage_agency_read on public.ai_usage
  for select
  to authenticated
  using (agency_id = public.get_current_agency_id());

revoke all on public.ai_usage from anon, authenticated;
grant select on public.ai_usage to authenticated;

-- ---------------------------------------------------------------------------------------------
-- 3. agency_ai_budgets — le plafond mensuel d'IA, réglé par un opérateur
-- ---------------------------------------------------------------------------------------------
create table public.agency_ai_budgets (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  agency_id uuid not null unique references public.agencies (id) on delete cascade,
  monthly_cap_cents integer not null check (monthly_cap_cents between 0 and 100000),
  updated_by uuid references auth.users (id) on delete set null
);

alter table public.agency_ai_budgets enable row level security;

create policy agency_ai_budgets_agency_read on public.agency_ai_budgets
  for select
  to authenticated
  using (agency_id = public.get_current_agency_id());

revoke all on public.agency_ai_budgets from anon, authenticated;
grant select on public.agency_ai_budgets to authenticated;

-- ---------------------------------------------------------------------------------------------
-- 4. Le budget : réserver avant l'appel, régler après (M105)
-- ---------------------------------------------------------------------------------------------
-- La réservation est une ligne `ai_usage` marquée `reserved`, au coût le pire : elle compte dans le
-- mois comme une dépense. Une réservation à la fois par agence (verrou de transaction) : deux
-- lectures simultanées ne franchissent pas le plafond. Rien de réservé : aucune ligne, aucun appel.
create function public.reserve_ai_budget(
  p_agency_id uuid,
  p_user_id uuid,
  p_purpose text,
  p_model text,
  p_source text,
  p_wanted_millicents integer,
  p_since timestamptz,
  p_default_cap_cents integer
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cap bigint;
  v_spent bigint;
  v_id uuid;
begin
  if p_wanted_millicents is null or p_wanted_millicents <= 0 then
    return null;
  end if;
  perform pg_advisory_xact_lock(hashtextextended('ai_budget:' || p_agency_id::text, 0));

  select coalesce(
           (select b.monthly_cap_cents from public.agency_ai_budgets b
             where b.agency_id = p_agency_id),
           p_default_cap_cents)::bigint * 1000
    into v_cap;
  select coalesce(sum(u.cost_millicents), 0) into v_spent
    from public.ai_usage u
    where u.agency_id = p_agency_id and u.created_at >= p_since;

  -- Tout ou rien : une lecture ne part pas à moitié payée.
  -- Un plafond illisible n'est pas un budget libre (M100).
  if v_cap is null then
    return null;
  end if;
  if v_spent + p_wanted_millicents > v_cap then
    return null;
  end if;
  insert into public.ai_usage (agency_id, user_id, purpose, model, source, cost_millicents, reserved)
  values (p_agency_id, p_user_id, p_purpose, p_model, p_source, p_wanted_millicents, true)
  returning id into v_id;
  return v_id;
end;
$$;

-- Le règlement : le coût réel, l'issue de la lecture et les noms des champs proposés. Une lecture
-- qui n'a rien coûté garde sa ligne, à zéro : la trace reste (qui, quand, quel modèle, l'issue).
create function public.settle_ai_budget(
  p_usage_id uuid,
  p_cost_millicents integer,
  p_outcome text,
  p_fields_proposed text[],
  p_personal_mentions_skipped integer
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.ai_usage
    set cost_millicents = greatest(coalesce(p_cost_millicents, 0), 0),
        reserved = false,
        outcome = coalesce(p_outcome, outcome),
        fields_proposed = coalesce(p_fields_proposed, fields_proposed),
        personal_mentions_skipped = p_personal_mentions_skipped,
        updated_at = now()
    where id = p_usage_id and reserved;
end;
$$;

-- La consommation depuis une date, par agence. SECURITY INVOKER : un membre n'obtient que son
-- agence (la politique de lecture s'applique) ; le serveur, avec la clé service, les obtient toutes.
create function public.ai_usage_since(p_since timestamptz)
returns table (agency_id uuid, cost_millicents bigint)
language sql
stable
security invoker
set search_path = public
as $$
  select u.agency_id, sum(u.cost_millicents)::bigint
    from public.ai_usage u
    where u.created_at >= p_since
    group by u.agency_id
$$;

revoke all on function public.reserve_ai_budget(uuid, uuid, text, text, text, integer, timestamptz, integer)
  from public, anon, authenticated;
revoke all on function public.settle_ai_budget(uuid, integer, text, text[], integer)
  from public, anon, authenticated;
grant execute on function public.reserve_ai_budget(uuid, uuid, text, text, text, integer, timestamptz, integer)
  to service_role;
grant execute on function public.settle_ai_budget(uuid, integer, text, text[], integer)
  to service_role;
revoke all on function public.ai_usage_since(timestamptz) from public, anon;
grant execute on function public.ai_usage_since(timestamptz) to authenticated, service_role;
