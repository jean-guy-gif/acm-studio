-- Lot B (Jean-Guy, 27/11) — le mode de financement de l'acquéreur.
--
--   « Comment finance-t-il ? » : Comptant · Avec prêt · Pas encore dit, à côté du statut de
--   financement (M132, validé / en cours / inconnu), qui ne change pas. Avec un prêt : l'apport
--   (€), le montant du prêt (€) et l'accord de principe (oui / non), tous facultatifs. Les fiches
--   existantes passent en « Pas encore dit » (le défaut) ; rien n'est reconstitué (M56), même
--   d'une offre comptant déjà signée.
--
-- Quatre colonnes sur `buyers`, à côté de `financing` : la même lecture (la politique d'agence ne
-- change pas, toute l'agence lit la fiche, M117), la même écriture (le serveur seul, après son
-- garde), effacées avec la fiche. Une table à part n'ouvrirait aucun droit plus fin.
--
-- Compatible avec le code de `main` : `main` ne lit ni n'écrit ces colonnes ; ses insertions
-- prennent le défaut (« not_said », les trois détails nuls). Aucune ligne existante n'est modifiée
-- au-delà du défaut. La règle « Prêt à visiter » ne change pas : elle ne lit pas le mode.
--
-- Les droits sont redits en toutes lettres à la fin (exigence de Jean-Guy) : ils sont ceux
-- d'aujourd'hui, relevés sur la production le 28/11 — anon aucun, le navigateur la seule lecture,
-- le serveur tout —, et une garde annule la migration s'ils ne le sont plus après coup.

set local lock_timeout = '5s';

alter table public.buyers
  add column financing_mode text not null default 'not_said'
    constraint buyers_financing_mode_check
      check (financing_mode in ('cash', 'loan', 'not_said')),
  add column loan_contribution integer
    constraint buyers_loan_contribution_check
      check (loan_contribution between 0 and 99999999),
  add column loan_amount integer
    constraint buyers_loan_amount_check
      check (loan_amount between 1 and 99999999),
  add column loan_agreement boolean,
  add constraint buyers_loan_details_only_with_loan
    check (
      financing_mode = 'loan'
      or (loan_contribution is null and loan_amount is null and loan_agreement is null)
    );

comment on column public.buyers.financing_mode is
  'Lot B — comment l''acquéreur finance : cash (comptant), loan (avec prêt), not_said (pas encore dit, défaut). Écrit par le serveur seul.';
comment on column public.buyers.loan_contribution is
  'Lot B — avec un prêt : l''apport, en euros, facultatif ; nul sans prêt.';
comment on column public.buyers.loan_amount is
  'Lot B — avec un prêt : le montant du prêt, en euros, facultatif ; nul sans prêt.';
comment on column public.buyers.loan_agreement is
  'Lot B — avec un prêt : l''accord de principe de la banque (vrai, faux), nul s''il n''est pas dit ; nul sans prêt.';

-- Les droits, en toutes lettres : anon n'a rien ; le navigateur lit (sa politique le borne à son
-- agence, M117) et n'écrit rien ; le serveur écrit.
revoke all on table public.buyers from anon, authenticated;
grant select on table public.buyers to authenticated;
grant select, insert, update, delete on table public.buyers to service_role;

-- La garde : si un droit n'est pas celui-là, la migration s'annule. Elle lit aussi ce qui viendrait
-- de PUBLIC et des droits posés sur une seule colonne (`has_any_column_privilege`), les quatre
-- nouvelles comprises, et le droit de vider la table.
do $$
begin
  if has_any_column_privilege('anon', 'public.buyers', 'SELECT')
     or has_any_column_privilege('anon', 'public.buyers', 'INSERT')
     or has_any_column_privilege('anon', 'public.buyers', 'UPDATE')
     or has_table_privilege('anon', 'public.buyers', 'DELETE')
     or has_table_privilege('anon', 'public.buyers', 'TRUNCATE') then
    raise exception 'mode_de_financement : anon a un droit sur les fiches acquéreur';
  end if;
  if not has_table_privilege('authenticated', 'public.buyers', 'SELECT') then
    raise exception 'mode_de_financement : le navigateur ne lit plus les fiches acquéreur';
  end if;
  if has_any_column_privilege('authenticated', 'public.buyers', 'INSERT')
     or has_any_column_privilege('authenticated', 'public.buyers', 'UPDATE')
     or has_table_privilege('authenticated', 'public.buyers', 'DELETE')
     or has_table_privilege('authenticated', 'public.buyers', 'TRUNCATE') then
    raise exception 'mode_de_financement : le navigateur peut écrire une fiche acquéreur';
  end if;
  if not (
    has_table_privilege('service_role', 'public.buyers', 'SELECT')
    and has_table_privilege('service_role', 'public.buyers', 'INSERT')
    and has_table_privilege('service_role', 'public.buyers', 'UPDATE')
    and has_table_privilege('service_role', 'public.buyers', 'DELETE')
  ) then
    raise exception 'mode_de_financement : le serveur ne peut plus écrire les fiches acquéreur';
  end if;
end $$;
