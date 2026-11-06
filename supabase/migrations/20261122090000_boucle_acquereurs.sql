-- Mission 133 — La boucle vendeur → acquéreurs.
--
-- Au Live, à partir de 5 acquéreurs de l'agence prêts à visiter qui correspondent au bien, le
-- conseiller peut les « montrer au vendeur » (des cartes anonymes : secteur, budget en fourchette,
-- financement validé, depuis quand il cherche). Le moment où il l'a fait est noté sur le Live, pour
-- le Suivi et la conclusion (« 7 acquéreurs montrés au rendez-vous »), côté conseiller seulement :
--
--   `live_seller_summary.buyers_shown_at` et `buyers_shown_count` : posés ensemble, une seule fois
--   (la première présentation est gardée : montrer de nouveau ne réécrit rien, modèle M92) ; l'heure
--   est celle de la base, quelle que soit celle envoyée (comme le début du Live, M95) ; le compte
--   vaut 5 au moins — l'action serveur le recalcule à cet instant, la base ne le recalcule pas (le
--   résumé reste écrit par le navigateur du conseiller, comme ses autres champs).
--
-- Le verrou du Live conclu (M109, `refuse_live_write_after_conclusion`) s'applique tel quel : rien
-- ne s'écrit après la conclusion ; `reopen_live` efface la ligne, comme le reste du Live.
--
-- Compatible avec le code de `main` : deux colonnes nulles qu'il ne lit ni n'écrit ; ses écritures
-- du résumé passent comme avant (le déclencheur ne touche qu'à ces deux colonnes). Aucune ligne
-- existante n'est modifiée.

alter table public.live_seller_summary
  add column buyers_shown_at timestamptz,
  add column buyers_shown_count integer,
  add constraint live_seller_summary_buyers_shown_check check (
    (buyers_shown_at is null and buyers_shown_count is null)
    or (buyers_shown_at is not null and buyers_shown_count is not null and buyers_shown_count >= 5)
  );

comment on column public.live_seller_summary.buyers_shown_at is
  'Mission 133 — le moment où le conseiller a montré au vendeur les acquéreurs prêts de l''agence (la première fois, jamais réécrit).';
comment on column public.live_seller_summary.buyers_shown_count is
  'Mission 133 — le nombre d''acquéreurs prêts montrés à cet instant, recalculé par le serveur (5 au moins).';

-- La première présentation est gardée : une fois posés, les deux champs ne bougent plus, ni
-- réécrits ni vidés (l'écriture passe, la valeur figée reste — modèle de la première note, M85).
-- Posée pour la première fois, l'heure est celle de la base, à l'insertion comme à la mise à jour
-- (`save-advisor-closest.ts` crée la ligne par INSERT quand elle n'existe pas).
create function public.keep_first_buyers_shown() returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and old.buyers_shown_at is not null then
    new.buyers_shown_at := old.buyers_shown_at;
    new.buyers_shown_count := old.buyers_shown_count;
    return new;
  end if;
  if new.buyers_shown_at is not null then
    new.buyers_shown_at := now();
  end if;
  return new;
end;
$$;

revoke all on function public.keep_first_buyers_shown() from public, anon, authenticated;

create trigger live_seller_summary_keep_first_buyers_shown
  before insert or update on public.live_seller_summary
  for each row execute function public.keep_first_buyers_shown();
