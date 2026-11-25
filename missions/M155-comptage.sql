select
  (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public') as fonctions,
  (select count(*) from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and not t.tgisinternal) as declencheurs,
  (select count(*) from pg_tables where schemaname='public') as tables,
  (select count(*) from pg_policies where schemaname='public') as politiques,
  (select count(*) from cron.job) as taches_nuit,
  (select count(*) from public.buyer_proposals) as envois,
  (select md5(coalesce(string_agg(id::text||sent_at::text||created_at::text, ',' order by id), '')) from public.buyer_proposals) as empreinte_envois,
  (select md5(prosrc) from pg_proc where oid='public.check_buyer_proposal()'::regprocedure) as corps_fonction,
  (select proconfig::text||'|'||prosecdef::text||'|'||coalesce(proacl::text,'') from pg_proc where oid='public.check_buyer_proposal()'::regprocedure) as reglages_droits,
  (select tgenabled from pg_trigger where tgname='buyer_proposals_check') as declencheur_actif,
  (select count(*) from public.agencies where is_demo) as agences_demo,
  (select string_agg(privilege_type, ',' order by privilege_type) from information_schema.role_table_grants where table_schema='public' and table_name='buyer_proposals' and grantee='authenticated') as droits_navigateur;
