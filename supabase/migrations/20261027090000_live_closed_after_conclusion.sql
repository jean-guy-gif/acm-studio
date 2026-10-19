-- Mission 109 — un dossier conclu ou archivé ne change plus par le Live.
--
-- Les réponses du vendeur (`live_seller_responses`) et le résumé du Live (`live_seller_summary`)
-- sont des faits du Suivi une fois le rendez-vous conclu : le sérieux d'un concurrent, les
-- commentaires, le concurrent le plus dangereux ne s'écrivent plus sur un dossier
-- `meeting_completed` ou `archived`, quel que soit le chemin — action serveur, navigateur ou
-- fonction. La réouverture par un opérateur (M104, `reopen_live`) reste le seul moyen de rouvrir
-- un Live, et elle est refusée sur un dossier conclu. Supprimer reste possible : un concurrent ou
-- un dossier supprimé emporte ses réponses (M92), et l'effacement suit sa procédure.
--
-- Compatible avec le code de `main` : il n'écrit des réponses que pendant le Live, avant la
-- conclusion ; une écriture refusée lui revient comme une erreur, que l'écran sait dire.
-- Aucune ligne existante n'est modifiée.

create function public.refuse_live_write_after_conclusion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
begin
  select p.status into v_status from public.projects p where p.id = new.project_id;
  if v_status in ('meeting_completed', 'archived') then
    raise exception 'live: le dossier % est conclu ou archivé, le Live ne change plus', new.project_id
      using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke all on function public.refuse_live_write_after_conclusion() from public, anon, authenticated;

create trigger live_seller_responses_closed_after_conclusion
  before insert or update on public.live_seller_responses
  for each row execute function public.refuse_live_write_after_conclusion();

create trigger live_seller_summary_closed_after_conclusion
  before insert or update on public.live_seller_summary
  for each row execute function public.refuse_live_write_after_conclusion();
