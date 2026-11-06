-- Mission 138 (suite) — « Sous offre ».
--
-- Décision de Jean-Guy (06/11) : un acquéreur dont une offre est acceptée passe « Sous offre » ; il
-- sort de « Prêt à visiter », du compteur du Live, de la veille et des tâches « N acquéreurs
-- pour… » (toutes ne lisent que « en recherche » et « en visite ») ; il y revient si l'offre tombe,
-- quand le conseiller remet son statut à la main.
--
--   1. `buyers.status` accepte 'under_offer'.
--   2. L'acceptation du vendeur (`buyer_document_acceptances`, decision 'accepted') y fait passer la
--      fiche, datée par la base, dans la même écriture, quel que soit le chemin (lien du vendeur,
--      démo) ; seulement depuis « en recherche » ou « en visite » : un acquéreur qui a acheté ou
--      abandonné ne change pas. Un refus ne change rien.
--
-- Compatible avec le code de `main` : il lit un statut hors liste comme « en recherche » (M117) et
-- ne l'écrit jamais. Aucune ligne modifiée : l'acceptation déjà en base (agence de démonstration,
-- faite par l'e2e sur le lien du vendeur) n'est pas rejouée, sa fiche reste « en recherche » jusqu'à
-- la remise à zéro de la démo, qui sème l'offre des Keller acceptée (mission 138) par ce chemin.

alter table public.buyers
  drop constraint buyers_status_check;
alter table public.buyers
  add constraint buyers_status_check
    check (status in ('searching', 'visiting', 'under_offer', 'bought', 'abandoned'));

create function public.buyer_under_offer_on_acceptance()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.decision = 'accepted' then
    update public.buyers b
    set status = 'under_offer', status_changed_at = now(), updated_at = now()
    from public.buyer_documents d
    where d.id = new.document_id
      and b.id = d.buyer_id
      and b.agency_id = new.agency_id
      and b.status in ('searching', 'visiting');
  end if;
  return new;
end $$;

revoke all on function public.buyer_under_offer_on_acceptance() from public, anon, authenticated;

create trigger buyer_document_acceptances_under_offer
  after insert on public.buyer_document_acceptances
  for each row execute function public.buyer_under_offer_on_acceptance();
