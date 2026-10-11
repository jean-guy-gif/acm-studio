-- Mission 92 — Une méthode infalsifiable : ce que le vendeur a répondu ne se corrige plus.
--
-- Trois réponses mesurent la méthode : la devinette de prix d'un concurrent, la devinette de
-- durée, et la valeur perçue donnée en début de Live. Leur PREMIÈRE valeur non vide reste,
-- quoi qu'envoie l'écran ou un appel direct à la base — sur le modèle de la première note de
-- 1 à 10 (M85) : l'écriture passe, la valeur figée ne bouge pas. Les autres réponses (sérieux
-- concurrent, motifs, commentaires, concurrent le plus dangereux) restent modifiables.
--
-- Deux contournements sont fermés avec le verrou :
--   • supprimer la ligne puis la recréer : la suppression directe est retirée au navigateur
--     (la suppression d'un concurrent ou d'un dossier emporte toujours ses réponses, par la
--     clé étrangère, qui ne dépend pas de ce droit) ;
--   • rattacher la ligne à un autre concurrent ou à un autre dossier : son rattachement est
--     figé lui aussi.
--
-- Compatible avec le code de `main` : il n'a jamais supprimé ces lignes ; une correction
-- envoyée par son écran est acceptée sans erreur et laisse la première valeur en base.
-- Aucune ligne n'est écrite ni modifiée par cette migration.

create function public.keep_first_seller_guesses() returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.project_id := old.project_id;
  new.comparable_id := old.comparable_id;
  new.agency_id := old.agency_id;
  if old.seller_estimated_listing_price is not null then
    new.seller_estimated_listing_price := old.seller_estimated_listing_price;
  end if;
  if old.seller_estimated_days_on_market is not null then
    new.seller_estimated_days_on_market := old.seller_estimated_days_on_market;
  end if;
  return new;
end;
$$;

create trigger live_seller_responses_keep_first_guesses
  before update on public.live_seller_responses
  for each row execute function public.keep_first_seller_guesses();

create function public.keep_first_perceived_price() returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.project_id := old.project_id;
  new.agency_id := old.agency_id;
  if old.seller_perceived_property_price is not null then
    new.seller_perceived_property_price := old.seller_perceived_property_price;
  end if;
  return new;
end;
$$;

create trigger live_seller_summary_keep_first_perceived_price
  before update on public.live_seller_summary
  for each row execute function public.keep_first_perceived_price();

revoke delete on public.live_seller_responses from anon, authenticated;
revoke delete on public.live_seller_summary from anon, authenticated;
