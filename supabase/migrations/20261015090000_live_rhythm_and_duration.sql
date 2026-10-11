-- Mission 95 — Un Live plus court, et une durée qu'on mesure.
--
-- Trois faits de plus sur le dossier :
--   • `live_rhythm` : le rythme du Live choisi par le conseiller — « accelerated » (deux écrans
--     par concurrent à partir du 4e, le défaut) ou « complete » (quatre écrans pour tous) ;
--   • `live_started_at` : l'heure où le Live a commencé devant le vendeur ;
--   • `live_ended_at` : l'heure du « Terminer le rendez-vous ».
--
-- Deux règles tenues par la base, quoi qu'envoie l'écran :
--   • le début ne se réécrit jamais : une reprise après « Rendez-vous en pause » ne le remet pas
--     à zéro (la fin, elle, suit le dernier « Terminer ») ;
--   • le rythme ne se modifie plus une fois le Live commencé.
--
-- Les Lives DÉJÀ commencés l'ont été en rythme complet — le seul qui existait : c'est ce fait
-- qui est noté pour eux, pas le nouveau défaut (sinon un rendez-vous en cours changerait de
-- déroulé). Leur heure de début, elle, n'a jamais été relevée : elle reste vide, rien n'est
-- inventé (M56).
--
-- Compatible avec le code de `main` : trois colonnes qu'il ne lit ni n'écrit ; `updated_at`
-- n'est pas touché (« ce qui dort », M59, ne bouge pas).

alter table public.projects
  add column live_rhythm text not null default 'accelerated'
    check (live_rhythm in ('accelerated', 'complete')),
  add column live_started_at timestamptz,
  add column live_ended_at timestamptz,
  add constraint projects_live_end_after_start
    check (live_ended_at is null or live_started_at is null or live_ended_at >= live_started_at);

update public.projects p
  set live_rhythm = 'complete'
  where exists (select 1 from public.live_seller_responses r where r.project_id = p.id)
     or exists (select 1 from public.live_seller_summary s where s.project_id = p.id);

create function public.keep_live_start_and_rhythm() returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.live_started_at is not null then
    new.live_started_at := old.live_started_at;
    new.live_rhythm := old.live_rhythm;
  end if;
  return new;
end;
$$;

create trigger projects_keep_live_start_and_rhythm
  before update on public.projects
  for each row execute function public.keep_live_start_and_rhythm();
