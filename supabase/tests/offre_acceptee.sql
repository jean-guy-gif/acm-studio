-- Mission 138 — l'offre acceptée, à la SOURCE DE VÉRITÉ :
--   §1 le « Fait » : une fois par offre, sur une offre de l'agence qui a reçu sa réponse, un auteur
--      de l'agence, l'heure de la base ; jamais modifié, sauf l'auteur vidé par la suppression de
--      son compte (jamais à la main) ;
--   §2 le lien du notaire : sur une offre acceptée seulement ; il s'ajoute aux deux autres ;
--   §3 le navigateur lit son agence et n'écrit rien ; une autre agence et un membre retiré ne lisent
--      rien ;
--   §4 aucune suppression légitime bloquée (leçon de la M109) : l'auteur du « Fait » et celui du
--      lien du notaire, la fiche acquéreur (le « Fait » reste), le retrait d'un lien ; le « Fait »
--      part avec son offre.
--
--   docker exec -i supabase_db_acm-studio psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/tests/offre_acceptee.sql
-- Une transaction annulée. Chaque assertion RAISE en cas d'échec.

begin;

insert into auth.users (id) values
  ('13911111-1111-1111-1111-111111111111'),
  ('13922222-2222-2222-2222-222222222222'),
  ('13933333-3333-3333-3333-333333333333'),
  ('13944444-4444-4444-4444-444444444444');
insert into public.agencies (id, name) values
  ('139aaaaa-0000-0000-0000-000000000000', 'A139'),
  ('139bbbbb-0000-0000-0000-000000000000', 'B139');
insert into public.profiles (id, agency_id, first_name, last_name, email, role) values
  ('13911111-1111-1111-1111-111111111111', '139aaaaa-0000-0000-0000-000000000000',
   'Al', 'A', 'a139@t.l', 'manager'),
  ('13944444-4444-4444-4444-444444444444', '139aaaaa-0000-0000-0000-000000000000',
   'Cé', 'C', 'c139@t.l', 'advisor'),
  ('13922222-2222-2222-2222-222222222222', '139bbbbb-0000-0000-0000-000000000000',
   'Bo', 'B', 'b139@t.l', 'advisor');
insert into public.profiles (id, agency_id, first_name, last_name, email, role, removed_at) values
  ('13933333-3333-3333-3333-333333333333', '139aaaaa-0000-0000-0000-000000000000',
   'Ré', 'R', 'r139@t.l', 'advisor', now());
insert into public.buyers (id, agency_id, advisor_id, name, cities) values
  ('139ccccc-0000-0000-0000-000000000001', '139aaaaa-0000-0000-0000-000000000000',
   '13911111-1111-1111-1111-111111111111', 'Famille Test', array['Mougins']);
-- Trois offres : acceptée, refusée, sans réponse ; et un bon de visite.
insert into public.buyer_documents
  (id, agency_id, buyer_id, kind, template_version, fields, rendered_text, content_sha256,
   signature_paths, valid_until)
values ('139eeeee-0000-0000-0000-000000000001', '139aaaaa-0000-0000-0000-000000000000',
        '139ccccc-0000-0000-0000-000000000001', 'purchase_offer', 'v1', '{}', 'OFFRE A',
        repeat('a', 64), array['139aaaaa-0000-0000-0000-000000000000/a/signature-1.png'],
        current_date + 7),
       ('139eeeee-0000-0000-0000-000000000002', '139aaaaa-0000-0000-0000-000000000000',
        '139ccccc-0000-0000-0000-000000000001', 'purchase_offer', 'v1', '{}', 'OFFRE R',
        repeat('a', 64), array['139aaaaa-0000-0000-0000-000000000000/r/signature-1.png'],
        current_date + 7),
       ('139eeeee-0000-0000-0000-000000000003', '139aaaaa-0000-0000-0000-000000000000',
        '139ccccc-0000-0000-0000-000000000001', 'purchase_offer', 'v1', '{}', 'OFFRE S',
        repeat('a', 64), array['139aaaaa-0000-0000-0000-000000000000/s/signature-1.png'],
        current_date + 7),
       ('139eeeee-0000-0000-0000-000000000004', '139aaaaa-0000-0000-0000-000000000000',
        '139ccccc-0000-0000-0000-000000000001', 'visit_voucher', 'v1', '{}', 'BON',
        repeat('a', 64), array['139aaaaa-0000-0000-0000-000000000000/b/signature-1.png'], null);
insert into public.buyer_document_acceptances
  (agency_id, document_id, decision, signer_names, signature_paths)
values ('139aaaaa-0000-0000-0000-000000000000', '139eeeee-0000-0000-0000-000000000001', 'accepted',
        array['M. Lefebvre'], array['139aaaaa-0000-0000-0000-000000000000/a/vendeur-1.png']);
insert into public.buyer_document_acceptances (agency_id, document_id, decision)
values ('139aaaaa-0000-0000-0000-000000000000', '139eeeee-0000-0000-0000-000000000002', 'refused');

-- §1 — le « Fait ».
do $$
declare
  v_done_at timestamptz;
begin
  begin
    insert into public.buyer_offer_follow_ups (agency_id, document_id, done_by)
    values ('139aaaaa-0000-0000-0000-000000000000', '139eeeee-0000-0000-0000-000000000003',
            '13911111-1111-1111-1111-111111111111');
    raise exception 'FAIL 1: un « Fait » sur une offre sans réponse est accepté';
  exception when check_violation then null;
  end;
  begin
    insert into public.buyer_offer_follow_ups (agency_id, document_id, done_by)
    values ('139aaaaa-0000-0000-0000-000000000000', '139eeeee-0000-0000-0000-000000000004',
            '13911111-1111-1111-1111-111111111111');
    raise exception 'FAIL 1: un « Fait » sur un bon de visite est accepté';
  exception when check_violation then null;
  end;
  begin
    insert into public.buyer_offer_follow_ups (agency_id, document_id, done_by)
    values ('139aaaaa-0000-0000-0000-000000000000', '139eeeee-0000-0000-0000-000000000001', null);
    raise exception 'FAIL 1: un « Fait » sans auteur est accepté';
  exception when check_violation then null;
  end;
  begin
    insert into public.buyer_offer_follow_ups (agency_id, document_id, done_by)
    values ('139bbbbb-0000-0000-0000-000000000000', '139eeeee-0000-0000-0000-000000000001',
            '13922222-2222-2222-2222-222222222222');
    raise exception 'FAIL 1: un « Fait » d''une autre agence est accepté';
  exception when check_violation then null;
  end;
  begin
    insert into public.buyer_offer_follow_ups (agency_id, document_id, done_by)
    values ('139aaaaa-0000-0000-0000-000000000000', '139eeeee-0000-0000-0000-000000000001',
            '13922222-2222-2222-2222-222222222222');
    raise exception 'FAIL 1: un auteur d''une autre agence est accepté';
  exception when check_violation then null;
  end;
  -- L'heure de la base, quoi qu'on envoie.
  insert into public.buyer_offer_follow_ups (agency_id, document_id, done_by, done_at)
  values ('139aaaaa-0000-0000-0000-000000000000', '139eeeee-0000-0000-0000-000000000001',
          '13911111-1111-1111-1111-111111111111', now() - interval '3 days');
  select done_at into v_done_at from public.buyer_offer_follow_ups
  where document_id = '139eeeee-0000-0000-0000-000000000001';
  if v_done_at < now() - interval '1 minute' then
    raise exception 'FAIL 1: la date du « Fait » vient de l''appelant';
  end if;
  insert into public.buyer_offer_follow_ups (agency_id, document_id, done_by)
  values ('139aaaaa-0000-0000-0000-000000000000', '139eeeee-0000-0000-0000-000000000002',
          '13944444-4444-4444-4444-444444444444');
  begin
    insert into public.buyer_offer_follow_ups (agency_id, document_id, done_by)
    values ('139aaaaa-0000-0000-0000-000000000000', '139eeeee-0000-0000-0000-000000000001',
            '13911111-1111-1111-1111-111111111111');
    raise exception 'FAIL 1: un second « Fait » sur la même offre est accepté';
  exception when unique_violation then null;
  end;
  begin
    update public.buyer_offer_follow_ups set done_at = now() - interval '1 day'
    where document_id = '139eeeee-0000-0000-0000-000000000001';
    raise exception 'FAIL 1: la date d''un « Fait » se modifie';
  exception when check_violation then null;
  end;
  begin
    update public.buyer_offer_follow_ups set done_by = null
    where document_id = '139eeeee-0000-0000-0000-000000000001';
    raise exception 'FAIL 1: l''auteur d''un « Fait » se vide à la main';
  exception when check_violation then null;
  end;
  begin
    update public.buyer_offer_follow_ups set done_by = '13944444-4444-4444-4444-444444444444'
    where document_id = '139eeeee-0000-0000-0000-000000000001';
    raise exception 'FAIL 1: un auteur se réécrit sur un « Fait »';
  exception when check_violation then null;
  end;
end $$;

-- §2 — le lien du notaire.
do $$
begin
  begin
    insert into public.buyer_document_links (agency_id, document_id, created_by, token_hash, audience)
    values ('139aaaaa-0000-0000-0000-000000000000', '139eeeee-0000-0000-0000-000000000002',
            '13911111-1111-1111-1111-111111111111', repeat('b', 64), 'notary');
    raise exception 'FAIL 2: un lien de notaire sur une offre refusée est accepté';
  exception when check_violation then null;
  end;
  begin
    insert into public.buyer_document_links (agency_id, document_id, created_by, token_hash, audience)
    values ('139aaaaa-0000-0000-0000-000000000000', '139eeeee-0000-0000-0000-000000000003',
            '13911111-1111-1111-1111-111111111111', repeat('c', 64), 'notary');
    raise exception 'FAIL 2: un lien de notaire sur une offre sans réponse est accepté';
  exception when check_violation then null;
  end;
  begin
    insert into public.buyer_document_links (agency_id, document_id, created_by, token_hash, audience)
    values ('139aaaaa-0000-0000-0000-000000000000', '139eeeee-0000-0000-0000-000000000004',
            '13911111-1111-1111-1111-111111111111', repeat('d', 64), 'notary');
    raise exception 'FAIL 2: un lien de notaire sur un bon de visite est accepté';
  exception when check_violation then null;
  end;
  begin
    insert into public.buyer_document_links (agency_id, document_id, created_by, token_hash, audience)
    values ('139aaaaa-0000-0000-0000-000000000000', '139eeeee-0000-0000-0000-000000000001',
            '13911111-1111-1111-1111-111111111111', repeat('e', 64), 'clerc');
    raise exception 'FAIL 2: une audience hors liste est acceptée';
  exception when check_violation then null;
  end;
  insert into public.buyer_document_links (agency_id, document_id, created_by, token_hash, audience)
  values ('139aaaaa-0000-0000-0000-000000000000', '139eeeee-0000-0000-0000-000000000001',
          '13911111-1111-1111-1111-111111111111', repeat('1', 64), 'visitor'),
         ('139aaaaa-0000-0000-0000-000000000000', '139eeeee-0000-0000-0000-000000000001',
          '13911111-1111-1111-1111-111111111111', repeat('2', 64), 'seller'),
         ('139aaaaa-0000-0000-0000-000000000000', '139eeeee-0000-0000-0000-000000000001',
          '13944444-4444-4444-4444-444444444444', repeat('3', 64), 'notary');
  -- Le bon de visite garde son lien au visiteur.
  insert into public.buyer_document_links (agency_id, document_id, created_by, token_hash, audience)
  values ('139aaaaa-0000-0000-0000-000000000000', '139eeeee-0000-0000-0000-000000000004',
          '13911111-1111-1111-1111-111111111111', repeat('4', 64), 'visitor');
  if (select count(distinct audience) from public.buyer_document_links
      where document_id = '139eeeee-0000-0000-0000-000000000001') <> 3 then
    raise exception 'FAIL 2: les trois liens de l''offre ne coexistent pas';
  end if;
end $$;

-- §3 — le navigateur.
do $$
begin
  if has_table_privilege('authenticated', 'public.buyer_offer_follow_ups', 'insert')
     or has_table_privilege('authenticated', 'public.buyer_offer_follow_ups', 'update')
     or has_table_privilege('authenticated', 'public.buyer_offer_follow_ups', 'delete')
     or has_any_column_privilege('authenticated', 'public.buyer_offer_follow_ups', 'insert')
     or has_any_column_privilege('authenticated', 'public.buyer_offer_follow_ups', 'update')
     or has_table_privilege('anon', 'public.buyer_offer_follow_ups', 'select') then
    raise exception 'FAIL 3: le navigateur écrit un « Fait », ou un anonyme le lit';
  end if;
  if has_function_privilege('authenticated', 'public.check_buyer_offer_follow_up()', 'execute')
     or has_function_privilege('anon', 'public.check_buyer_offer_follow_up()', 'execute') then
    raise exception 'FAIL 3: la fonction du déclencheur est ouverte au navigateur';
  end if;
end $$;
select set_config('request.jwt.claims',
  '{"sub":"13911111-1111-1111-1111-111111111111","role":"authenticated"}', true);
set local role authenticated;
do $$
begin
  if (select count(*) from public.buyer_offer_follow_ups) <> 2 then
    raise exception 'FAIL 3: l''agence ne lit pas ses « Fait »';
  end if;
end $$;
reset role;
select set_config('request.jwt.claims',
  '{"sub":"13922222-2222-2222-2222-222222222222","role":"authenticated"}', true);
set local role authenticated;
do $$
begin
  if (select count(*) from public.buyer_offer_follow_ups) <> 0 then
    raise exception 'FAIL 3: une autre agence lit les « Fait »';
  end if;
end $$;
reset role;
select set_config('request.jwt.claims',
  '{"sub":"13933333-3333-3333-3333-333333333333","role":"authenticated"}', true);
set local role authenticated;
do $$
begin
  if (select count(*) from public.buyer_offer_follow_ups) <> 0 then
    raise exception 'FAIL 3: un membre retiré lit les « Fait »';
  end if;
end $$;
reset role;

-- §4 — l'auteur supprimé, puis l'offre supprimée.
do $$
begin
  delete from public.profiles where id = '13944444-4444-4444-4444-444444444444';
  if (select done_by from public.buyer_offer_follow_ups
      where document_id = '139eeeee-0000-0000-0000-000000000002') is not null then
    raise exception 'FAIL 4: la suppression du compte n''a pas vidé l''auteur du « Fait »';
  end if;
  if (select done_by from public.buyer_offer_follow_ups
      where document_id = '139eeeee-0000-0000-0000-000000000001') is null then
    raise exception 'FAIL 4: un « Fait » a perdu son auteur sans suppression de compte';
  end if;
  if exists (select 1 from public.buyer_document_links
             where audience = 'notary' and created_by is not null) then
    raise exception 'FAIL 4: la suppression du compte n''a pas vidé l''auteur du lien du notaire';
  end if;
  -- Le retrait d'un lien (son expiration avancée) passe.
  update public.buyer_document_links set expires_at = now()
  where document_id = '139eeeee-0000-0000-0000-000000000001' and audience = 'notary';
  -- La fiche supprimée : l'offre, sa réponse et son « Fait » restent.
  delete from public.buyers where id = '139ccccc-0000-0000-0000-000000000001';
  if (select count(*) from public.buyer_offer_follow_ups) <> 2 then
    raise exception 'FAIL 4: la fiche supprimée emporte un « Fait »';
  end if;
  delete from public.buyer_documents where id = '139eeeee-0000-0000-0000-000000000002';
  if (select count(*) from public.buyer_offer_follow_ups) <> 1 then
    raise exception 'FAIL 4: le « Fait » ne part pas avec son offre';
  end if;
end $$;

rollback;
