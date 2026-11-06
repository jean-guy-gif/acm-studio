-- Mission 137 (partie A) — l'identité légale et le bon de visite, à la SOURCE DE VÉRITÉ :
--   §1 l'identité légale : une ligne par agence, ses bornes ;
--   §2 un document signé : l'heure de la base, jamais modifié ensuite (sauf l'auteur vidé par la
--      suppression de son compte) ; la fiche, l'auteur et les signatures de l'agence ;
--   §3 les visites d'un bon : de la même fiche seulement ; le lien : du document de l'agence ;
--   §4 le navigateur lit son agence et n'écrit rien ; une autre agence et un membre retiré ne
--      lisent rien ; le bucket des signatures est privé ;
--   §5 la fiche supprimée emporte ses documents, leurs visites et leurs liens ; un compte supprimé
--      laisse le document, sans auteur.
--
--   docker exec -i supabase_db_acm-studio psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/tests/bon_de_visite.sql
-- Une transaction annulée. Chaque assertion RAISE en cas d'échec.

begin;

insert into auth.users (id) values
  ('13711111-1111-1111-1111-111111111111'),
  ('13722222-2222-2222-2222-222222222222'),
  ('13733333-3333-3333-3333-333333333333'),
  ('13744444-4444-4444-4444-444444444444');
insert into public.agencies (id, name) values
  ('137aaaaa-0000-0000-0000-000000000000', 'A137'),
  ('137bbbbb-0000-0000-0000-000000000000', 'B137');
insert into public.profiles (id, agency_id, first_name, last_name, email, role) values
  ('13711111-1111-1111-1111-111111111111', '137aaaaa-0000-0000-0000-000000000000',
   'Al', 'A', 'a137@t.l', 'manager'),
  ('13722222-2222-2222-2222-222222222222', '137bbbbb-0000-0000-0000-000000000000',
   'Bo', 'B', 'b137@t.l', 'advisor'),
  ('13744444-4444-4444-4444-444444444444', '137aaaaa-0000-0000-0000-000000000000',
   'Pa', 'P', 'p137@t.l', 'advisor');
insert into public.profiles (id, agency_id, first_name, last_name, email, role, removed_at) values
  ('13733333-3333-3333-3333-333333333333', '137aaaaa-0000-0000-0000-000000000000',
   'Ré', 'R', 'r137@t.l', 'advisor', now());
insert into public.buyers (id, agency_id, advisor_id, name, cities) values
  ('137ccccc-0000-0000-0000-000000000001', '137aaaaa-0000-0000-0000-000000000000',
   '13711111-1111-1111-1111-111111111111', 'Famille Test', array['Mougins']),
  ('137ccccc-0000-0000-0000-000000000002', '137bbbbb-0000-0000-0000-000000000000',
   '13722222-2222-2222-2222-222222222222', 'Autre agence', array['Mougins']),
  ('137ccccc-0000-0000-0000-000000000003', '137aaaaa-0000-0000-0000-000000000000',
   '13711111-1111-1111-1111-111111111111', 'Autre fiche', array['Mougins']);
insert into public.buyer_selections (id, agency_id, buyer_id) values
  ('137eeeee-0000-0000-0000-000000000001', '137aaaaa-0000-0000-0000-000000000000',
   '137ccccc-0000-0000-0000-000000000001'),
  ('137eeeee-0000-0000-0000-000000000003', '137aaaaa-0000-0000-0000-000000000000',
   '137ccccc-0000-0000-0000-000000000003');
insert into public.buyer_selection_items (id, agency_id, selection_id, position, source, reference, label) values
  ('137fffff-0000-0000-0000-000000000001', '137aaaaa-0000-0000-0000-000000000000',
   '137eeeee-0000-0000-0000-000000000001', 1, 'listing', 'https://exemple.invalid/a', 'Maison · Mougins'),
  ('137fffff-0000-0000-0000-000000000003', '137aaaaa-0000-0000-0000-000000000000',
   '137eeeee-0000-0000-0000-000000000003', 1, 'listing', 'https://exemple.invalid/b', 'Maison · Mougins');
insert into public.buyer_visit_requests (id, agency_id, buyer_id, buyer_selection_item_id, requested_during) values
  ('13799999-0000-0000-0000-000000000001', '137aaaaa-0000-0000-0000-000000000000',
   '137ccccc-0000-0000-0000-000000000001', '137fffff-0000-0000-0000-000000000001', 'conseiller'),
  ('13799999-0000-0000-0000-000000000003', '137aaaaa-0000-0000-0000-000000000000',
   '137ccccc-0000-0000-0000-000000000003', '137fffff-0000-0000-0000-000000000003', 'conseiller');

-- §1 — l'identité légale.
do $$
begin
  insert into public.agency_legal_identities (agency_id, company_name, guarantee_amount)
  values ('137aaaaa-0000-0000-0000-000000000000', 'Société Test', 110000);
  begin
    insert into public.agency_legal_identities (agency_id, company_name)
    values ('137aaaaa-0000-0000-0000-000000000000', 'Doublon');
    raise exception 'FAIL 1: deux identités légales pour une agence';
  exception when unique_violation then null;
  end;
  begin
    update public.agency_legal_identities set guarantee_amount = 0
    where agency_id = '137aaaaa-0000-0000-0000-000000000000';
    raise exception 'FAIL 1: une garantie à 0 € est acceptée';
  exception when check_violation then null;
  end;
  begin
    update public.agency_legal_identities set company_name = repeat('x', 161)
    where agency_id = '137aaaaa-0000-0000-0000-000000000000';
    raise exception 'FAIL 1: une raison sociale trop longue est acceptée';
  exception when check_violation then null;
  end;
end $$;

-- §2 — un document signé.
do $$
declare
  v_doc uuid;
begin
  insert into public.buyer_documents
    (agency_id, buyer_id, kind, template_version, fields, rendered_text, content_sha256,
     signature_paths, signed_at, created_by)
  values ('137aaaaa-0000-0000-0000-000000000000', '137ccccc-0000-0000-0000-000000000001',
          'visit_voucher', 'bon-de-visite-1', '{"visitor": "M. Test"}', 'BON DE VISITE…',
          repeat('a', 64), array['137aaaaa-0000-0000-0000-000000000000/doc/signature-1.png'],
          now() - interval '10 days', '13744444-4444-4444-4444-444444444444')
  returning id into v_doc;
  if (select signed_at from public.buyer_documents where id = v_doc) < now() - interval '1 minute' then
    raise exception 'FAIL 2: l''heure de signature n''est pas celle de la base';
  end if;
  begin
    update public.buyer_documents set rendered_text = 'autre texte' where id = v_doc;
    raise exception 'FAIL 2: un document signé se modifie';
  exception when check_violation then null;
  end;
  begin
    update public.buyer_documents set created_by = '13711111-1111-1111-1111-111111111111' where id = v_doc;
    raise exception 'FAIL 2: l''auteur d''un document signé change';
  exception when check_violation then null;
  end;
  begin
    insert into public.buyer_documents
      (agency_id, buyer_id, kind, template_version, fields, rendered_text, content_sha256, signature_paths)
    values ('137aaaaa-0000-0000-0000-000000000000', '137ccccc-0000-0000-0000-000000000002',
            'visit_voucher', 'v1', '{}', 'x', repeat('a', 64),
            array['137aaaaa-0000-0000-0000-000000000000/x.png']);
    raise exception 'FAIL 2: un document s''écrit sur la fiche d''une autre agence';
  exception when check_violation then null;
  end;
  begin
    insert into public.buyer_documents
      (agency_id, buyer_id, kind, template_version, fields, rendered_text, content_sha256, signature_paths)
    values ('137aaaaa-0000-0000-0000-000000000000', '137ccccc-0000-0000-0000-000000000001',
            'visit_voucher', 'v1', '{}', 'x', repeat('a', 64),
            array['137bbbbb-0000-0000-0000-000000000000/x.png']);
    raise exception 'FAIL 2: une signature hors du dossier de l''agence est acceptée';
  exception when check_violation then null;
  end;
  begin
    insert into public.buyer_documents
      (agency_id, buyer_id, kind, template_version, fields, rendered_text, content_sha256, signature_paths, created_by)
    values ('137aaaaa-0000-0000-0000-000000000000', '137ccccc-0000-0000-0000-000000000001',
            'visit_voucher', 'v1', '{}', 'x', repeat('a', 64),
            array['137aaaaa-0000-0000-0000-000000000000/x.png'], '13722222-2222-2222-2222-222222222222');
    raise exception 'FAIL 2: l''auteur d''une autre agence est accepté';
  exception when check_violation then null;
  end;
  begin
    insert into public.buyer_documents
      (agency_id, buyer_id, kind, template_version, fields, rendered_text, content_sha256, signature_paths)
    values ('137aaaaa-0000-0000-0000-000000000000', '137ccccc-0000-0000-0000-000000000001',
            'offre', 'v1', '{}', 'x', repeat('a', 64), array['137aaaaa-0000-0000-0000-000000000000/x.png']);
    raise exception 'FAIL 2: un genre hors liste est accepté';
  exception when check_violation then null;
  end;
  begin
    insert into public.buyer_documents
      (agency_id, buyer_id, kind, template_version, fields, rendered_text, content_sha256, signature_paths)
    values ('137aaaaa-0000-0000-0000-000000000000', '137ccccc-0000-0000-0000-000000000001',
            'visit_voucher', 'v1', '{}', 'x', 'pas-une-empreinte',
            array['137aaaaa-0000-0000-0000-000000000000/x.png']);
    raise exception 'FAIL 2: une empreinte mal formée est acceptée';
  exception when check_violation then null;
  end;
end $$;

-- §3 — les visites d'un bon, son lien.
do $$
declare
  v_doc uuid := (select id from public.buyer_documents limit 1);
begin
  insert into public.buyer_document_visits (document_id, visit_request_id, agency_id)
  values (v_doc, '13799999-0000-0000-0000-000000000001', '137aaaaa-0000-0000-0000-000000000000');
  begin
    insert into public.buyer_document_visits (document_id, visit_request_id, agency_id)
    values (v_doc, '13799999-0000-0000-0000-000000000003', '137aaaaa-0000-0000-0000-000000000000');
    raise exception 'FAIL 3: la visite d''une autre fiche est acceptée';
  exception when check_violation then null;
  end;
  insert into public.buyer_document_links (agency_id, document_id, token_hash)
  values ('137aaaaa-0000-0000-0000-000000000000', v_doc, repeat('b', 64));
  begin
    insert into public.buyer_document_links (agency_id, document_id, token_hash)
    values ('137bbbbb-0000-0000-0000-000000000000', v_doc, repeat('c', 64));
    raise exception 'FAIL 3: un lien d''une autre agence est accepté';
  exception when check_violation then null;
  end;
  if (select expires_at from public.buyer_document_links where token_hash = repeat('b', 64))
     < now() + interval '29 days' then
    raise exception 'FAIL 3: le lien ne vaut pas 30 jours';
  end if;
end $$;

-- §4 — le navigateur.
do $$
declare
  v_table text;
begin
  foreach v_table in array array['agency_legal_identities', 'buyer_documents', 'buyer_document_visits', 'buyer_document_links'] loop
    if has_table_privilege('authenticated', 'public.' || v_table, 'insert')
       or has_table_privilege('authenticated', 'public.' || v_table, 'update')
       or has_table_privilege('authenticated', 'public.' || v_table, 'delete')
       or has_table_privilege('anon', 'public.' || v_table, 'select') then
      raise exception 'FAIL 4: le navigateur écrit dans %, ou un anonyme la lit', v_table;
    end if;
  end loop;
  if not exists (select 1 from storage.buckets where id = 'signed-documents' and public = false) then
    raise exception 'FAIL 4: le bucket des signatures n''est pas privé';
  end if;
  if exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and qual ilike '%signed-documents%'
  ) then
    raise exception 'FAIL 4: une règle ouvre le bucket des signatures au navigateur';
  end if;
end $$;
select set_config('request.jwt.claims',
  '{"sub":"13744444-4444-4444-4444-444444444444","role":"authenticated"}', true);
set local role authenticated;
do $$
begin
  if (select count(*) from public.agency_legal_identities) <> 1
     or (select count(*) from public.buyer_documents) <> 1
     or (select count(*) from public.buyer_document_visits) <> 1
     or (select count(*) from public.buyer_document_links) <> 1 then
    raise exception 'FAIL 4: l''agence ne lit pas ses documents';
  end if;
end $$;
reset role;
select set_config('request.jwt.claims',
  '{"sub":"13722222-2222-2222-2222-222222222222","role":"authenticated"}', true);
set local role authenticated;
do $$
begin
  if (select count(*) from public.agency_legal_identities) <> 0
     or (select count(*) from public.buyer_documents) <> 0
     or (select count(*) from public.buyer_document_links) <> 0 then
    raise exception 'FAIL 4: une autre agence lit les documents';
  end if;
end $$;
reset role;
select set_config('request.jwt.claims',
  '{"sub":"13733333-3333-3333-3333-333333333333","role":"authenticated"}', true);
set local role authenticated;
do $$
begin
  if (select count(*) from public.buyer_documents) <> 0
     or (select count(*) from public.agency_legal_identities) <> 0 then
    raise exception 'FAIL 4: un membre retiré lit les documents';
  end if;
end $$;
reset role;

-- §5 — les suppressions.
do $$
begin
  -- Le compte de l'auteur supprimé : le document reste, sans auteur.
  delete from public.profiles where id = '13744444-4444-4444-4444-444444444444';
  if (select created_by from public.buyer_documents limit 1) is not null then
    raise exception 'FAIL 5: l''auteur supprimé reste sur le document';
  end if;
  if (select count(*) from public.buyer_documents) <> 1 then
    raise exception 'FAIL 5: la suppression d''un compte emporte le document';
  end if;
  -- La fiche supprimée emporte ses documents, leurs visites et leurs liens.
  delete from public.buyers where id = '137ccccc-0000-0000-0000-000000000001';
  if exists (select 1 from public.buyer_documents)
     or exists (select 1 from public.buyer_document_visits)
     or exists (select 1 from public.buyer_document_links) then
    raise exception 'FAIL 5: la fiche supprimée laisse ses documents';
  end if;
end $$;

rollback;
