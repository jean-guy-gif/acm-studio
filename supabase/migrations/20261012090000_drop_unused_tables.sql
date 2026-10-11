-- Mission 91 — Simplifier avant la bêta : ce qui n'a jamais servi quitte la base.
--
-- Sept tables créées au tout premier schéma, jamais lues ni écrites par le code (aucune requête
-- ne les nomme) : audit_logs, exports, meeting_scripts, meeting_sessions, perception_results,
-- reports, seller_answers. Et une colonne devenue inutile à la mission 84 :
-- subject_properties.public_listing_url (le lien de l'annonce n'est plus demandé).
--
-- UNE SUPPRESSION NE SE RATTRAPE PAS : la migration compte d'abord, DANS la transaction, et
-- s'arrête si une seule ligne existe — rien n'est alors supprimé. Les tables sont retirées sans
-- CASCADE, dans l'ordre de leurs clés étrangères : si autre chose en dépendait, la base le
-- dirait au lieu de l'emporter en silence.
--
-- Compatible avec le code de `main` : il ne nomme aucune de ces tables ni cette colonne.

do $$
declare
  v_rows bigint;
begin
  select (select count(*) from public.audit_logs)
       + (select count(*) from public.exports)
       + (select count(*) from public.meeting_scripts)
       + (select count(*) from public.meeting_sessions)
       + (select count(*) from public.perception_results)
       + (select count(*) from public.reports)
       + (select count(*) from public.seller_answers)
       + (select count(*) from public.subject_properties where public_listing_url is not null)
    into v_rows;
  if v_rows > 0 then
    raise exception
      'Mission 91 : % ligne(s) dans ce qui devait être vide — rien n''est supprimé.', v_rows;
  end if;
end $$;

drop table public.exports;
drop table public.reports;
drop table public.perception_results;
drop table public.seller_answers;
drop table public.meeting_sessions;
drop table public.meeting_scripts;
drop table public.audit_logs;

alter table public.subject_properties
  drop constraint subject_properties_public_listing_url_check,
  drop column public_listing_url;
