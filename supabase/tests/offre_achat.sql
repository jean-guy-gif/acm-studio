-- Mission 137 (partie B) — l'offre d'achat, à la SOURCE DE VÉRITÉ :
--   §1 une offre a sa date de validité, un bon n'en a pas ;
--   §2 la réponse du vendeur : une fois, l'heure de la base, signée si elle accepte, sur une offre
--      de l'agence encore valable ; jamais modifiée ;
--   §3 le lien dit à qui il va ; la conclusion garde le n° de mandat et les honoraires, bornés ;
--   §4 le navigateur lit son agence et n'écrit rien ; une autre agence et un membre retiré ne lisent
--      rien ;
--   §5 l'offre reste quand la fiche part ; sa réponse avec elle.
--
--   docker exec -i supabase_db_acm-studio psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/tests/offre_achat.sql
-- Une transaction annulée. Chaque assertion RAISE en cas d'échec.

begin;

insert into auth.users (id) values
  ('13811111-1111-1111-1111-111111111111'),
  ('13822222-2222-2222-2222-222222222222'),
  ('13833333-3333-3333-3333-333333333333');
insert into public.agencies (id, name) values
  ('138aaaaa-0000-0000-0000-000000000000', 'A138'),
  ('138bbbbb-0000-0000-0000-000000000000', 'B138');
insert into public.profiles (id, agency_id, first_name, last_name, email, role) values
  ('13811111-1111-1111-1111-111111111111', '138aaaaa-0000-0000-0000-000000000000',
   'Al', 'A', 'a138@t.l', 'manager'),
  ('13822222-2222-2222-2222-222222222222', '138bbbbb-0000-0000-0000-000000000000',
   'Bo', 'B', 'b138@t.l', 'advisor');
insert into public.profiles (id, agency_id, first_name, last_name, email, role, removed_at) values
  ('13833333-3333-3333-3333-333333333333', '138aaaaa-0000-0000-0000-000000000000',
   'Ré', 'R', 'r138@t.l', 'advisor', now());
insert into public.buyers (id, agency_id, advisor_id, name, cities) values
  ('138ccccc-0000-0000-0000-000000000001', '138aaaaa-0000-0000-0000-000000000000',
   '13811111-1111-1111-1111-111111111111', 'Famille Test', array['Mougins']);
insert into public.projects (id, agency_id, advisor_id, seller_name, status) values
  ('138ddddd-0000-0000-0000-000000000001', '138aaaaa-0000-0000-0000-000000000000',
   '13811111-1111-1111-1111-111111111111', 'Lefebvre', 'meeting_completed');

-- §1 — la date de validité.
do $$
begin
  begin
    insert into public.buyer_documents
      (agency_id, buyer_id, kind, template_version, fields, rendered_text, content_sha256, signature_paths)
    values ('138aaaaa-0000-0000-0000-000000000000', '138ccccc-0000-0000-0000-000000000001',
            'purchase_offer', 'v1', '{}', 'OFFRE', repeat('a', 64),
            array['138aaaaa-0000-0000-0000-000000000000/o/signature-1.png']);
    raise exception 'FAIL 1: une offre sans date de validité est acceptée';
  exception when check_violation then null;
  end;
  begin
    insert into public.buyer_documents
      (agency_id, buyer_id, kind, template_version, fields, rendered_text, content_sha256,
       signature_paths, valid_until)
    values ('138aaaaa-0000-0000-0000-000000000000', '138ccccc-0000-0000-0000-000000000001',
            'visit_voucher', 'v1', '{}', 'BON', repeat('a', 64),
            array['138aaaaa-0000-0000-0000-000000000000/b/signature-1.png'], current_date);
    raise exception 'FAIL 1: un bon avec une date de validité est accepté';
  exception when check_violation then null;
  end;
  insert into public.buyer_documents
    (id, agency_id, buyer_id, kind, template_version, fields, rendered_text, content_sha256,
     signature_paths, valid_until)
  values ('138eeeee-0000-0000-0000-000000000001', '138aaaaa-0000-0000-0000-000000000000',
          '138ccccc-0000-0000-0000-000000000001', 'purchase_offer', 'v1', '{}', 'OFFRE',
          repeat('a', 64), array['138aaaaa-0000-0000-0000-000000000000/o/signature-1.png',
                                 '138aaaaa-0000-0000-0000-000000000000/o/signature-2.png'],
          current_date + 7),
         ('138eeeee-0000-0000-0000-000000000002', '138aaaaa-0000-0000-0000-000000000000',
          '138ccccc-0000-0000-0000-000000000001', 'purchase_offer', 'v1', '{}', 'OFFRE PASSÉE',
          repeat('a', 64), array['138aaaaa-0000-0000-0000-000000000000/p/signature-1.png'],
          current_date - 1);
end $$;

-- §2 — la réponse du vendeur.
do $$
begin
  begin
    insert into public.buyer_document_acceptances (agency_id, document_id, decision)
    values ('138aaaaa-0000-0000-0000-000000000000', '138eeeee-0000-0000-0000-000000000001', 'accepted');
    raise exception 'FAIL 2: une acceptation sans signature est acceptée';
  exception when check_violation then null;
  end;
  begin
    insert into public.buyer_document_acceptances (agency_id, document_id, decision)
    values ('138aaaaa-0000-0000-0000-000000000000', '138eeeee-0000-0000-0000-000000000002', 'refused');
    raise exception 'FAIL 2: une réponse sur une offre passée est acceptée';
  exception when check_violation then null;
  end;
  begin
    insert into public.buyer_document_acceptances (agency_id, document_id, decision)
    values ('138bbbbb-0000-0000-0000-000000000000', '138eeeee-0000-0000-0000-000000000001', 'refused');
    raise exception 'FAIL 2: une réponse d''une autre agence est acceptée';
  exception when check_violation then null;
  end;
  begin
    insert into public.buyer_document_acceptances (agency_id, document_id, decision, signer_name, signature_path)
    values ('138aaaaa-0000-0000-0000-000000000000', '138eeeee-0000-0000-0000-000000000001', 'accepted',
            'M. Lefebvre', '138bbbbb-0000-0000-0000-000000000000/x.png');
    raise exception 'FAIL 2: une signature hors du dossier de l''agence est acceptée';
  exception when check_violation then null;
  end;
  insert into public.buyer_document_acceptances
    (agency_id, document_id, decision, signer_name, signature_path, decided_at)
  values ('138aaaaa-0000-0000-0000-000000000000', '138eeeee-0000-0000-0000-000000000001', 'accepted',
          'M. Lefebvre', '138aaaaa-0000-0000-0000-000000000000/o/vendeur.png', now() - interval '9 days');
  if (select decided_at from public.buyer_document_acceptances) < now() - interval '1 minute' then
    raise exception 'FAIL 2: l''heure de la réponse n''est pas celle de la base';
  end if;
  begin
    insert into public.buyer_document_acceptances (agency_id, document_id, decision)
    values ('138aaaaa-0000-0000-0000-000000000000', '138eeeee-0000-0000-0000-000000000001', 'refused');
    raise exception 'FAIL 2: une seconde réponse est acceptée';
  exception when unique_violation then null;
  end;
  begin
    update public.buyer_document_acceptances set decision = 'refused';
    raise exception 'FAIL 2: une réponse se modifie';
  exception when check_violation then null;
  end;
end $$;

-- §3 — le lien et la conclusion.
do $$
begin
  insert into public.buyer_document_links (agency_id, document_id, token_hash, audience)
  values ('138aaaaa-0000-0000-0000-000000000000', '138eeeee-0000-0000-0000-000000000001',
          repeat('c', 64), 'seller');
  begin
    insert into public.buyer_document_links (agency_id, document_id, token_hash, audience)
    values ('138aaaaa-0000-0000-0000-000000000000', '138eeeee-0000-0000-0000-000000000001',
            repeat('d', 64), 'notaire');
    raise exception 'FAIL 3: un destinataire hors liste est accepté';
  exception when check_violation then null;
  end;
  insert into public.project_meeting_conclusions (project_id, agency_id, outcome, mandate_number, fees_amount, fees_paid_by)
  values ('138ddddd-0000-0000-0000-000000000001', '138aaaaa-0000-0000-0000-000000000000',
          'signed', 'M-2026-0142', 60000, 'seller');
  begin
    update public.project_meeting_conclusions set fees_paid_by = 'notaire'
    where project_id = '138ddddd-0000-0000-0000-000000000001';
    raise exception 'FAIL 3: une charge des honoraires hors liste est acceptée';
  exception when check_violation then null;
  end;
  begin
    update public.project_meeting_conclusions set fees_amount = 0
    where project_id = '138ddddd-0000-0000-0000-000000000001';
    raise exception 'FAIL 3: des honoraires à 0 € sont acceptés';
  exception when check_violation then null;
  end;
end $$;

-- §4 — le navigateur.
do $$
begin
  if has_table_privilege('authenticated', 'public.buyer_document_acceptances', 'insert')
     or has_table_privilege('authenticated', 'public.buyer_document_acceptances', 'update')
     or has_table_privilege('authenticated', 'public.buyer_document_acceptances', 'delete')
     or has_any_column_privilege('authenticated', 'public.buyer_document_acceptances', 'insert')
     or has_table_privilege('anon', 'public.buyer_document_acceptances', 'select') then
    raise exception 'FAIL 4: le navigateur écrit une réponse, ou un anonyme la lit';
  end if;
  if has_any_column_privilege('authenticated', 'public.project_meeting_conclusions', 'update') then
    raise exception 'FAIL 4: le navigateur modifie une conclusion';
  end if;
end $$;
select set_config('request.jwt.claims',
  '{"sub":"13811111-1111-1111-1111-111111111111","role":"authenticated"}', true);
set local role authenticated;
do $$
begin
  if (select count(*) from public.buyer_document_acceptances) <> 1 then
    raise exception 'FAIL 4: l''agence ne lit pas la réponse du vendeur';
  end if;
end $$;
reset role;
select set_config('request.jwt.claims',
  '{"sub":"13822222-2222-2222-2222-222222222222","role":"authenticated"}', true);
set local role authenticated;
do $$
begin
  if (select count(*) from public.buyer_document_acceptances) <> 0 then
    raise exception 'FAIL 4: une autre agence lit la réponse du vendeur';
  end if;
end $$;
reset role;
select set_config('request.jwt.claims',
  '{"sub":"13833333-3333-3333-3333-333333333333","role":"authenticated"}', true);
set local role authenticated;
do $$
begin
  if (select count(*) from public.buyer_document_acceptances) <> 0 then
    raise exception 'FAIL 4: un membre retiré lit la réponse du vendeur';
  end if;
end $$;
reset role;

-- §5 — la fiche supprimée : l'offre et sa réponse restent.
do $$
begin
  delete from public.buyers where id = '138ccccc-0000-0000-0000-000000000001';
  if (select count(*) from public.buyer_documents where kind = 'purchase_offer' and buyer_id is null) <> 2
     or (select count(*) from public.buyer_document_acceptances) <> 1 then
    raise exception 'FAIL 5: la fiche supprimée emporte l''offre ou sa réponse';
  end if;
end $$;

rollback;
