-- Mission 94 — Le Live qui convainc : après avoir vu le marché, le vendeur reformule son prix.
--
-- « Après avoir vu ces biens, à quel prix mettriez-vous votre bien en vente ? » (Acte 5 du
-- Storyboard). La réponse est facultative, et elle mesure la méthode : sa PREMIÈRE valeur non
-- vide reste, comme la valeur perçue du début du Live (M92). Le même verrou la tient : la
-- fonction `keep_first_perceived_price` est étendue, son déclencheur ne change pas.
--
-- Compatible avec le code de `main` : une colonne nullable de plus, aucune ligne écrite ; il ne
-- la lit ni ne l'écrit.

alter table public.live_seller_summary
  add column seller_revised_property_price numeric
    check (seller_revised_property_price is null or seller_revised_property_price > 0);

create or replace function public.keep_first_perceived_price() returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.project_id := old.project_id;
  new.agency_id := old.agency_id;
  if old.seller_perceived_property_price is not null then
    new.seller_perceived_property_price := old.seller_perceived_property_price;
  end if;
  if old.seller_revised_property_price is not null then
    new.seller_revised_property_price := old.seller_revised_property_price;
  end if;
  return new;
end;
$$;
