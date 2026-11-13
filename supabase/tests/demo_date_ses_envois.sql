-- Mission 155 — l'agence de démonstration date ses envois (`buyer_proposals.sent_at`) :
--   §1 dans une agence repérée « démonstration », une heure passée fournie est gardée ;
--   §2 une heure future y prend l'heure de la base ;
--   §3 dans toute autre agence, l'heure de la base, quelle que soit celle envoyée (M134 inchangée) ;
--   §4 une mise à jour ne change jamais l'heure de l'envoi, démo comprise ;
--   §5 sans heure fournie (le code de `main`), l'heure de la base, démo comprise ;
--   §6 le navigateur n'écrit toujours rien, démo comprise ;
--   §7 la fonction en base est celle du fichier (empreinte de son corps).
--
--   docker exec -i supabase_db_acm-studio psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/tests/demo_date_ses_envois.sql
-- Une transaction annulée. Chaque assertion RAISE en cas d'échec.

begin;

insert into auth.users (id) values
  ('15511111-1111-1111-1111-111111111111'),
  ('15522222-2222-2222-2222-222222222222');
insert into public.agencies (id, name, is_demo) values
  ('155aaaaa-0000-0000-0000-000000000000', 'Démo 155', true),
  ('155bbbbb-0000-0000-0000-000000000000', 'Réelle 155', false);
insert into public.profiles (id, agency_id, first_name, last_name, email, role) values
  ('15511111-1111-1111-1111-111111111111', '155aaaaa-0000-0000-0000-000000000000',
   'Na', 'D', 'd155@t.l', 'manager'),
  ('15522222-2222-2222-2222-222222222222', '155bbbbb-0000-0000-0000-000000000000',
   'Re', 'R', 'r155@t.l', 'advisor');
insert into public.buyers (id, agency_id, advisor_id, name, cities) values
  ('155ccccc-0000-0000-0000-000000000001', '155aaaaa-0000-0000-0000-000000000000',
   '15511111-1111-1111-1111-111111111111', 'Famille Démo', array['Vence']),
  ('155ccccc-0000-0000-0000-000000000002', '155bbbbb-0000-0000-0000-000000000000',
   '15522222-2222-2222-2222-222222222222', 'Famille Réelle', array['Vence']);

-- §1 — démonstration : l'heure passée fournie est gardée.
insert into public.buyer_proposals
  (agency_id, buyer_id, property_key, source, reference, origin, label, sent_at, sent_by)
values
  ('155aaaaa-0000-0000-0000-000000000000', '155ccccc-0000-0000-0000-000000000001',
   'listing:demo:1', 'listing', 'https://exemple.invalid/1', 'competitor', 'Maison · Vence',
   now() - interval '3 days', '15511111-1111-1111-1111-111111111111');
do $$
begin
  if (select sent_at from public.buyer_proposals where property_key = 'listing:demo:1')
     <> now() - interval '3 days' then
    raise exception 'FAIL 1: la démo ne garde pas l''heure passée de son envoi';
  end if;
end $$;

-- §2 — démonstration : une heure future prend l'heure de la base.
insert into public.buyer_proposals
  (agency_id, buyer_id, property_key, source, reference, origin, label, sent_at)
values
  ('155aaaaa-0000-0000-0000-000000000000', '155ccccc-0000-0000-0000-000000000001',
   'listing:demo:2', 'listing', 'https://exemple.invalid/2', 'competitor', 'Maison · Vence',
   now() + interval '2 days');
do $$
begin
  if (select sent_at from public.buyer_proposals where property_key = 'listing:demo:2') <> now() then
    raise exception 'FAIL 2: une heure future gardée dans la démo';
  end if;
end $$;

-- §3 — une autre agence : l'heure de la base, quelle que soit celle envoyée.
insert into public.buyer_proposals
  (agency_id, buyer_id, property_key, source, reference, origin, label, sent_at)
values
  ('155bbbbb-0000-0000-0000-000000000000', '155ccccc-0000-0000-0000-000000000002',
   'listing:reel:1', 'listing', 'https://exemple.invalid/3', 'competitor', 'Maison · Vence',
   now() - interval '3 days');
do $$
begin
  if (select sent_at from public.buyer_proposals where property_key = 'listing:reel:1') <> now() then
    raise exception 'FAIL 3: une agence réelle a daté son envoi elle-même';
  end if;
end $$;

-- §4 — une mise à jour ne change jamais l'heure, démo comprise.
update public.buyer_proposals set sent_at = now() - interval '9 days'
  where property_key in ('listing:demo:1', 'listing:reel:1');
do $$
begin
  if (select sent_at from public.buyer_proposals where property_key = 'listing:demo:1')
     <> now() - interval '3 days' then
    raise exception 'FAIL 4: l''heure d''un envoi de la démo a été réécrite';
  end if;
  if (select sent_at from public.buyer_proposals where property_key = 'listing:reel:1') <> now() then
    raise exception 'FAIL 4: l''heure d''un envoi réel a été réécrite';
  end if;
end $$;

-- §5 — sans heure fournie : l'heure de la base, démo comprise.
insert into public.buyer_proposals
  (agency_id, buyer_id, property_key, source, reference, origin, label)
values
  ('155aaaaa-0000-0000-0000-000000000000', '155ccccc-0000-0000-0000-000000000001',
   'listing:demo:3', 'listing', 'https://exemple.invalid/4', 'competitor', 'Maison · Vence');
do $$
begin
  if (select sent_at from public.buyer_proposals where property_key = 'listing:demo:3') <> now() then
    raise exception 'FAIL 5: sans heure fournie, l''heure de la base n''est pas posée';
  end if;
end $$;

-- §6 — le navigateur n'écrit rien, démo comprise.
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"15511111-1111-1111-1111-111111111111","role":"authenticated"}', true);
do $$
begin
  begin
    insert into public.buyer_proposals (agency_id, buyer_id, property_key, source, reference, origin, label, sent_at)
      values ('155aaaaa-0000-0000-0000-000000000000', '155ccccc-0000-0000-0000-000000000001',
              'listing:demo:4', 'listing', 'https://exemple.invalid/5', 'competitor', 'Maison',
              now() - interval '1 day');
    raise exception 'FAIL 6: le navigateur a écrit un envoi';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

-- §7 — la fonction en base est celle du fichier (empreinte du corps, relue par le gardien-sql).
do $$
begin
  if (select md5(prosrc) from pg_proc where oid = 'public.check_buyer_proposal()'::regprocedure)
     <> '1cfa85b35c78d117e2e0df001f742ce1' then
    raise exception 'FAIL 7: la fonction en base n''est pas celle de la migration';
  end if;
end $$;

do $$ begin raise notice 'demo_date_ses_envois : OK'; end $$;

rollback;
