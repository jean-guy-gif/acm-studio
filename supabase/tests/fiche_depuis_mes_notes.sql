-- Mission 151, partie A — la fiche depuis mes notes, à la SOURCE DE VÉRITÉ :
--   §1 des ajouts seulement : une fiche écrite comme le fait `main` (sans les nouvelles colonnes)
--      prend les défauts ; `must_have` garde sa liste ; la copropriété et son ★ à part ;
--   §2 les critères doux : un tableau, 10 au plus ; les champs « À vérifier » : 60 au plus ;
--   §3 le budget : une réservation au pire cas compte dans le mois ; tout ou rien au plafond ; le
--      plafond réglé par l'opérateur l'emporte sur le défaut ; un mois passé ne compte pas ;
--   §4 le règlement : le coût réel, l'issue, les noms des champs ; une ligne réglée ne se règle
--      plus ; une lecture à zéro garde sa trace ;
--   §5 le navigateur lit son agence et n'écrit rien (ni usage, ni plafond, ni fonction) ; une autre
--      agence et un membre retiré ne lisent rien ;
--   §6 la fiche supprimée : l'usage reste à l'agence, sans fiche.
--
--   docker exec -i supabase_db_acm-studio psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/tests/fiche_depuis_mes_notes.sql
-- Une transaction annulée. Chaque assertion RAISE en cas d'échec.

begin;

insert into auth.users (id) values
  ('15111111-1111-1111-1111-111111111111'),
  ('15122222-2222-2222-2222-222222222222'),
  ('15133333-3333-3333-3333-333333333333');
insert into public.agencies (id, name) values
  ('151aaaaa-0000-0000-0000-000000000000', 'A151'),
  ('151bbbbb-0000-0000-0000-000000000000', 'B151');
insert into public.profiles (id, agency_id, first_name, last_name, email, role) values
  ('15111111-1111-1111-1111-111111111111', '151aaaaa-0000-0000-0000-000000000000',
   'Al', 'A', 'a151@t.l', 'manager'),
  ('15122222-2222-2222-2222-222222222222', '151bbbbb-0000-0000-0000-000000000000',
   'Bo', 'B', 'b151@t.l', 'advisor');
insert into public.profiles (id, agency_id, first_name, last_name, email, role, removed_at) values
  ('15133333-3333-3333-3333-333333333333', '151aaaaa-0000-0000-0000-000000000000',
   'Ré', 'R', 'r151@t.l', 'advisor', now());

-- §1 — une fiche écrite comme `main` l'écrit prend les défauts.
insert into public.buyers (id, agency_id, advisor_id, name, cities, must_have) values
  ('151ccccc-0000-0000-0000-000000000001', '151aaaaa-0000-0000-0000-000000000000',
   '15111111-1111-1111-1111-111111111111', 'Famille Un', array['Vence'], array['pool']);
do $$
declare
  b record;
begin
  select * into b from public.buyers where id = '151ccccc-0000-0000-0000-000000000001';
  if b.condominium_accepted is not null or b.condominium_must_have
     or b.soft_criteria <> '[]'::jsonb or b.fields_to_verify <> '{}' then
    raise exception 'FAIL 1: une fiche écrite sans les nouvelles colonnes ne prend pas les défauts';
  end if;
  begin
    update public.buyers set must_have = array['condominium']
      where id = '151ccccc-0000-0000-0000-000000000001';
    raise exception 'FAIL 1: la liste de must_have a changé (la copropriété y entre)';
  exception when check_violation then null;
  end;
  update public.buyers set condominium_accepted = false, condominium_must_have = true
    where id = '151ccccc-0000-0000-0000-000000000001';
end $$;

-- §2 — les critères doux et les champs « À vérifier ».
do $$
begin
  update public.buyers
    set soft_criteria = '[{"key":"calme","words":"AU CALME"}]'::jsonb,
        fields_to_verify = array['name', 'cities']
    where id = '151ccccc-0000-0000-0000-000000000001';
  begin
    update public.buyers set soft_criteria = '{"key":"calme"}'::jsonb
      where id = '151ccccc-0000-0000-0000-000000000001';
    raise exception 'FAIL 2: des critères doux qui ne sont pas un tableau passent';
  exception when check_violation then null;
  end;
  begin
    update public.buyers
      set soft_criteria = (select jsonb_agg(jsonb_build_object('key', 'calme', 'words', 'x'))
                             from generate_series(1, 11))
      where id = '151ccccc-0000-0000-0000-000000000001';
    raise exception 'FAIL 2: onze critères doux passent';
  exception when check_violation then null;
  end;
  begin
    update public.buyers set fields_to_verify = (select array_agg('f' || g) from generate_series(1, 61) g)
      where id = '151ccccc-0000-0000-0000-000000000001';
    raise exception 'FAIL 2: 61 champs à vérifier passent';
  exception when check_violation then null;
  end;
end $$;

-- §3 — le budget : 10 € par défaut (1 000 000 millièmes de centime), tout ou rien.
do $$
declare
  v_first uuid;
  v_second uuid;
  v_refused uuid;
begin
  -- Un mois passé ne compte pas.
  insert into public.ai_usage (agency_id, purpose, model, cost_millicents, created_at)
  values ('151aaaaa-0000-0000-0000-000000000000', 'notes', 'eu.anthropic.claude-sonnet-4-6',
          900000, date_trunc('month', now()) - interval '1 day');
  v_first := public.reserve_ai_budget('151aaaaa-0000-0000-0000-000000000000',
    '15111111-1111-1111-1111-111111111111', 'notes', 'eu.anthropic.claude-sonnet-4-6', 'photo',
    600000, date_trunc('month', now()), 1000);
  if v_first is null then
    raise exception 'FAIL 3: la première réservation est refusée';
  end if;
  if not exists (select 1 from public.ai_usage where id = v_first and reserved
                   and outcome = 'pending' and source = 'photo') then
    raise exception 'FAIL 3: la réservation n''est pas marquée';
  end if;
  -- 600 000 + 500 000 > 1 000 000 : tout ou rien, refusée, rien d'écrit.
  v_refused := public.reserve_ai_budget('151aaaaa-0000-0000-0000-000000000000',
    '15111111-1111-1111-1111-111111111111', 'notes', 'eu.anthropic.claude-sonnet-4-6', 'text',
    500000, date_trunc('month', now()), 1000);
  if v_refused is not null then
    raise exception 'FAIL 3: une réservation franchit le plafond';
  end if;
  if (select count(*) from public.ai_usage where agency_id = '151aaaaa-0000-0000-0000-000000000000') <> 2 then
    raise exception 'FAIL 3: une réservation refusée a laissé une ligne';
  end if;
  -- Le plafond réglé par l'opérateur l'emporte : 20 €.
  insert into public.agency_ai_budgets (agency_id, monthly_cap_cents)
  values ('151aaaaa-0000-0000-0000-000000000000', 2000);
  v_second := public.reserve_ai_budget('151aaaaa-0000-0000-0000-000000000000',
    '15111111-1111-1111-1111-111111111111', 'notes', 'eu.anthropic.claude-sonnet-4-6', 'text',
    500000, date_trunc('month', now()), 1000);
  if v_second is null then
    raise exception 'FAIL 3: le plafond de l''opérateur n''est pas lu';
  end if;
  -- Rien de demandé : rien de réservé.
  if public.reserve_ai_budget('151aaaaa-0000-0000-0000-000000000000', null, 'notes', 'm', null,
       0, date_trunc('month', now()), 1000) is not null then
    raise exception 'FAIL 3: une réservation de zéro écrit une ligne';
  end if;

  -- §4 — le règlement.
  perform public.settle_ai_budget(v_first, 2100, 'pending', array['name', 'cities', 'budget_max'], 2);
  if not exists (select 1 from public.ai_usage where id = v_first and not reserved
                   and cost_millicents = 2100 and fields_proposed = array['name', 'cities', 'budget_max']
                   and personal_mentions_skipped = 2) then
    raise exception 'FAIL 4: le règlement ne s''applique pas';
  end if;
  -- Une ligne réglée ne se règle plus.
  perform public.settle_ai_budget(v_first, 999999, 'failed', null, null);
  if (select cost_millicents from public.ai_usage where id = v_first) <> 2100 then
    raise exception 'FAIL 4: une ligne réglée a été réglée de nouveau';
  end if;
  -- Une lecture échouée garde sa trace, à zéro.
  perform public.settle_ai_budget(v_second, 0, 'failed', null, null);
  if not exists (select 1 from public.ai_usage where id = v_second and cost_millicents = 0
                   and outcome = 'failed' and user_id = '15111111-1111-1111-1111-111111111111') then
    raise exception 'FAIL 4: une lecture échouée perd sa trace';
  end if;
  begin
    insert into public.ai_usage (agency_id, purpose, model, cost_millicents, outcome)
    values ('151aaaaa-0000-0000-0000-000000000000', 'notes', 'm', 0, 'inventée');
    raise exception 'FAIL 4: une issue hors liste passe';
  exception when check_violation then null;
  end;
  update public.ai_usage set buyer_id = '151ccccc-0000-0000-0000-000000000001',
                             outcome = 'created', fields_kept = array['name']
    where id = v_first;
end $$;

-- §4 bis — la base vérifie l'agence, fige la trace, refuse un plafond illisible.
do $$
declare
  v_id uuid;
begin
  insert into public.buyers (id, agency_id, advisor_id, name, cities) values
    ('151ccccc-0000-0000-0000-000000000009', '151bbbbb-0000-0000-0000-000000000000',
     '15122222-2222-2222-2222-222222222222', 'Autre agence', array['Nice']);
  begin
    insert into public.ai_usage (agency_id, buyer_id, purpose, model, cost_millicents)
    values ('151aaaaa-0000-0000-0000-000000000000', '151ccccc-0000-0000-0000-000000000009',
            'notes', 'm', 0);
    raise exception 'FAIL 4b: une lecture pointe vers la fiche d''une autre agence';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.ai_usage (agency_id, user_id, purpose, model, cost_millicents)
    values ('151aaaaa-0000-0000-0000-000000000000', '15122222-2222-2222-2222-222222222222',
            'notes', 'm', 0);
    raise exception 'FAIL 4b: une lecture a pour auteur un membre d''une autre agence';
  exception when insufficient_privilege then null;
  end;
  select id into v_id from public.ai_usage where outcome = 'created';
  begin
    update public.ai_usage set cost_millicents = 1 where id = v_id;
    raise exception 'FAIL 4b: une lecture close se réécrit';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.ai_usage set outcome = 'cancelled' where id = v_id;
    raise exception 'FAIL 4b: l''issue d''une lecture close se réécrit';
  exception when insufficient_privilege then null;
  end;
  if public.reserve_ai_budget('151bbbbb-0000-0000-0000-000000000000', null, 'notes', 'm', null,
       10, date_trunc('month', now()), null) is not null then
    raise exception 'FAIL 4b: un plafond illisible laisse réserver';
  end if;
  delete from public.buyers where id = '151ccccc-0000-0000-0000-000000000009';
end $$;

-- §5 — le navigateur.
do $$
begin
  if has_function_privilege('authenticated',
       'public.reserve_ai_budget(uuid,uuid,text,text,text,integer,timestamptz,integer)', 'execute')
     or has_function_privilege('anon',
       'public.reserve_ai_budget(uuid,uuid,text,text,text,integer,timestamptz,integer)', 'execute')
     or has_function_privilege('authenticated',
       'public.settle_ai_budget(uuid,integer,text,text[],integer)', 'execute')
     or has_function_privilege('anon',
       'public.settle_ai_budget(uuid,integer,text,text[],integer)', 'execute') then
    raise exception 'FAIL 5: le navigateur réserve ou règle le budget';
  end if;
end $$;
select set_config('request.jwt.claims',
  '{"sub":"15111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
set local role authenticated;
do $$
begin
  if (select count(*) from public.ai_usage) <> 3 then
    raise exception 'FAIL 5: l''agence ne lit pas ses lectures';
  end if;
  if (select count(*) from public.agency_ai_budgets) <> 1 then
    raise exception 'FAIL 5: l''agence ne lit pas son plafond';
  end if;
  if (select cost_millicents from public.ai_usage_since(date_trunc('month', now()))) <> 2100 then
    raise exception 'FAIL 5: la consommation du mois est fausse';
  end if;
  begin
    insert into public.ai_usage (agency_id, purpose, model, cost_millicents)
    values ('151aaaaa-0000-0000-0000-000000000000', 'notes', 'm', 0);
    raise exception 'FAIL 5: le navigateur écrit une lecture';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.agency_ai_budgets set monthly_cap_cents = 100000;
    raise exception 'FAIL 5: un manager relève son plafond d''IA depuis le navigateur';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.buyers set soft_criteria = '[]'::jsonb;
    raise exception 'FAIL 5: le navigateur écrit les critères doux';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
select set_config('request.jwt.claims',
  '{"sub":"15122222-2222-2222-2222-222222222222","role":"authenticated"}', true);
set local role authenticated;
do $$
begin
  if (select count(*) from public.ai_usage) <> 0 or (select count(*) from public.agency_ai_budgets) <> 0 then
    raise exception 'FAIL 5: une autre agence lit les lectures ou le plafond';
  end if;
end $$;
reset role;
select set_config('request.jwt.claims',
  '{"sub":"15133333-3333-3333-3333-333333333333","role":"authenticated"}', true);
set local role authenticated;
do $$
begin
  if (select count(*) from public.ai_usage) <> 0 then
    raise exception 'FAIL 5: un membre retiré lit les lectures';
  end if;
end $$;
reset role;

-- §6 — la fiche supprimée, puis le compte de l'auteur supprimé : l'usage reste à l'agence, sans
-- fiche ni auteur ; le verrou de la trace ne bloque aucune suppression (M110).
do $$
begin
  delete from public.buyers where id = '151ccccc-0000-0000-0000-000000000001';
  if (select count(*) from public.ai_usage where agency_id = '151aaaaa-0000-0000-0000-000000000000') <> 3 then
    raise exception 'FAIL 6: la suppression de la fiche emporte la consommation';
  end if;
  if exists (select 1 from public.ai_usage where buyer_id is not null
               and agency_id = '151aaaaa-0000-0000-0000-000000000000') then
    raise exception 'FAIL 6: l''usage pointe encore vers la fiche supprimée';
  end if;
  delete from public.profiles where id = '15111111-1111-1111-1111-111111111111';
  delete from auth.users where id = '15111111-1111-1111-1111-111111111111';
  if exists (select 1 from public.ai_usage where user_id is not null
               and agency_id = '151aaaaa-0000-0000-0000-000000000000') then
    raise exception 'FAIL 6: l''usage pointe encore vers le compte supprimé';
  end if;
  if (select count(*) from public.ai_usage where agency_id = '151aaaaa-0000-0000-0000-000000000000') <> 3 then
    raise exception 'FAIL 6: la suppression du compte emporte la consommation';
  end if;
end $$;

rollback;
