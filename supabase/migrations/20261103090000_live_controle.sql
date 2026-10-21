-- Mission 112, partie A — le Live ne s'ouvre jamais sans ses contrôles, et ce qu'il montre ne bouge
-- plus une fois commencé. Aucune ligne existante modifiée :
--   1. la trace de la confirmation « devant le vendeur » (M104) : `projects.live_confirmed_at` et
--      `live_confirmed_by`, posées par le serveur quand le conseiller confirme ; la page du Live
--      renvoie vers la confirmation tant qu'un vrai dossier jamais lancé n'en a pas ;
--   2. le choix des concurrents montrés (M110) en UNE opération en base (`save_live_shortlist`),
--      refusée une fois le Live commencé ; la base fige alors `excluded_from_live`, comme l'ordre
--      (M110) et le rythme (M95) ;
--   3. un concurrent retenu, ou ajouté retenu, après le début du Live est hors Live, en fin d'ordre ;
--   4. une réponse du Live sur un concurrent hors Live, ou plus retenu, est refusée en base.
-- Les suppressions restent permises : les verrous ne portent que sur l'ajout et la modification
-- (leçon de la migration 20261028).
--
-- Compatible avec le code de `main` : il ne lit ni n'écrit les deux colonnes ; il écrit le choix
-- des concurrents montrés par trois écritures, refusées par lui une fois le Live commencé ; il ne
-- répond jamais au Live pour un concurrent hors Live.

do $$
declare v_count int;
begin
  select count(*) into v_count
    from public.live_seller_responses r
    join public.comparables c on c.id = r.comparable_id
    where c.excluded_from_live or not c.is_selected;
  if v_count > 0 then
    raise exception 'réponses du Live sur un concurrent hors Live ou écarté : % — à examiner avant', v_count;
  end if;
end $$;

-- « Le Live a commencé » : la règle du rythme (M95) et de l'ordre (M110).
create function public.live_has_started(p_project_id uuid) returns boolean
language sql
stable
set search_path = public
as $$
  select exists (
    select 1 from public.projects p
    where p.id = p_project_id
      and (p.live_started_at is not null
           or exists (select 1 from public.live_seller_responses r where r.project_id = p.id))
  );
$$;

-- ---------------------------------------------------------------------------------------------
-- 1. La confirmation « devant le vendeur ».
-- ---------------------------------------------------------------------------------------------
alter table public.projects
  add column live_confirmed_at timestamptz,
  add column live_confirmed_by uuid references public.profiles (id) on delete set null;

comment on column public.projects.live_confirmed_at is
  'Quand le conseiller a confirmé être devant le vendeur avant de lancer le Live (mission 112).';

-- ---------------------------------------------------------------------------------------------
-- 2 et 3. Les concurrents montrés au Live, et leur ordre, figés une fois le Live commencé.
-- ---------------------------------------------------------------------------------------------
create or replace function public.keep_live_order_once_started() returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not public.live_has_started(new.project_id) then
    return new;
  end if;
  -- Un concurrent retenu en plein Live : hors Live, à la fin de l'ordre ; il ne change rien à ce
  -- que le vendeur voit, ni à la reprise.
  if tg_op = 'INSERT' then
    if new.is_selected then
      new.excluded_from_live := true;
    end if;
    return new;
  end if;
  if new.is_selected and not old.is_selected then
    new.excluded_from_live := true;
    new.display_order := (select coalesce(max(c.display_order), 0) + 1
                            from public.comparables c where c.project_id = new.project_id);
    return new;
  end if;
  new.display_order := old.display_order;
  new.excluded_from_live := old.excluded_from_live;
  return new;
end;
$$;

drop trigger comparables_keep_live_order_once_started on public.comparables;

create trigger comparables_keep_live_order_once_started
  before insert or update of display_order, excluded_from_live, is_selected on public.comparables
  for each row execute function public.keep_live_order_once_started();

-- Le choix des concurrents montrés, en une seule opération : les identifiants gardés, relus parmi
-- les concurrents RETENUS du dossier ; au moins un ; daté sur le dossier. Droits de l'appelant (les
-- règles de `comparables` et de `projects` s'appliquent) ; refusé une fois le Live commencé.
create function public.save_live_shortlist(p_project_id uuid, p_shown uuid[])
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_kept integer;
begin
  if public.live_has_started(p_project_id) then
    raise exception 'live_started';
  end if;
  select count(*) into v_kept
    from public.comparables c
    where c.project_id = p_project_id and c.is_selected and c.id = any (p_shown);
  if v_kept = 0 then
    raise exception 'empty_shortlist';
  end if;
  update public.comparables c
    set excluded_from_live = not (c.id = any (p_shown)), updated_at = now()
    where c.project_id = p_project_id and c.is_selected;
  update public.projects
    set live_shortlist_at = now()
    where id = p_project_id;
  if not found then
    raise exception 'not_found';
  end if;
  return v_kept;
end;
$$;

revoke all on function public.save_live_shortlist(uuid, uuid[]) from public, anon;
grant execute on function public.save_live_shortlist(uuid, uuid[]) to authenticated;

-- ---------------------------------------------------------------------------------------------
-- 4. Pas de réponse du Live pour un concurrent que le vendeur ne voit pas.
-- ---------------------------------------------------------------------------------------------
create function public.refuse_response_outside_live() returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.comparable_id is not null and exists (
    select 1 from public.comparables c
    where c.id = new.comparable_id and (c.excluded_from_live or not c.is_selected)
  ) then
    raise exception 'competitor_not_in_live';
  end if;
  return new;
end;
$$;

create trigger live_seller_responses_only_shown_competitors
  before insert or update on public.live_seller_responses
  for each row execute function public.refuse_response_outside_live();
