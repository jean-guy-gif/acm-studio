-- Mission 155 — une démo qui fait vrai : l'agence de démonstration date ses envois.
--
-- « Préparer ma démo » sème le parcours des acquéreurs (décision de Jean-Guy, 13/11) : la
-- sélection des Lambert partagée il y a 3 jours, celle de la famille Moreau présentée il y a
-- 6 jours… et, comme l'outil le fait, le mandat proposé noté « Envoyé » (`buyer_proposals`, M134).
-- La base posait toujours l'heure de l'envoi à l'insertion : semé ainsi, chaque envoi disait
-- « proposé aujourd'hui », démenti par la sélection et son lien datés de quelques jours.
--
-- Une fonction modifiée, rien d'autre : dans une agence repérée « démonstration » (`is_demo`,
-- M114), et là seulement, l'heure fournie à l'insertion est gardée si elle est passée ; une heure
-- future, ou toute autre agence, prend l'heure de la base, comme avant. Une modification ne
-- change toujours pas l'heure de l'envoi. La table reste écrite par le serveur seul (le navigateur
-- n'a que la lecture) ; le précédent est `buyer_events.occurred_at` (M135), non forcé pour que la
-- démo date ses faits. Compatible avec le code de `main`, qui n'envoie jamais `sent_at` : il n'y a
-- pas d'heure fournie, la valeur par défaut est `now()`.

set local lock_timeout = '5s';

create or replace function public.check_buyer_proposal()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (select 1 from public.buyers b where b.id = new.buyer_id and b.agency_id = new.agency_id) then
    raise exception 'buyer_proposals : la fiche n''est pas de cette agence' using errcode = 'check_violation';
  end if;
  if new.project_id is not null and not exists (
    select 1 from public.projects p where p.id = new.project_id and p.agency_id = new.agency_id
  ) then
    raise exception 'buyer_proposals : le dossier n''est pas de cette agence' using errcode = 'check_violation';
  end if;
  -- La ligne de sélection est de cette fiche (sa réponse est celle de cet acquéreur, M122 B).
  if new.selection_item_id is not null and not exists (
    select 1 from public.buyer_selection_items i
    join public.buyer_selections s on s.id = i.selection_id
    where i.id = new.selection_item_id and i.agency_id = new.agency_id
      and s.buyer_id = new.buyer_id
  ) then
    raise exception 'buyer_proposals : la ligne de sélection n''est pas de cette fiche' using errcode = 'check_violation';
  end if;
  if new.sent_by is not null and not exists (
    select 1 from public.profiles p where p.id = new.sent_by and p.agency_id = new.agency_id
  ) then
    raise exception 'buyer_proposals : l''auteur n''est pas de cette agence' using errcode = 'check_violation';
  end if;
  if tg_op = 'INSERT' then
    -- Mission 155 — l'agence de démonstration, et elle seule, garde l'heure passée qu'elle fournit.
    if new.sent_at is null or new.sent_at > now() or not exists (
      select 1 from public.agencies a where a.id = new.agency_id and a.is_demo
    ) then
      new.sent_at := now();
    end if;
  else
    new.sent_at := old.sent_at;
  end if;
  return new;
end $$;

revoke all on function public.check_buyer_proposal() from public, anon, authenticated;
