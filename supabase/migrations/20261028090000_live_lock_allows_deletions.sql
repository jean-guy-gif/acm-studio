-- Mission 109 (suite) — le verrou du Live conclu (`live_closed_after_conclusion`) ne doit empêcher
-- aucune suppression légitime.
--
-- Recensement des liens qui modifient AUTOMATIQUEMENT les réponses ou le résumé du Live quand on
-- supprime ou modifie autre chose (clés étrangères, déclencheurs, fonctions), le 19/10 :
--   • concurrent supprimé → ses réponses, `on delete cascade` : une suppression, permise ;
--   • dossier supprimé → réponses et résumé, `on delete cascade` : des suppressions, permises ;
--   • concurrent supprimé → `live_seller_summary.seller_most_dangerous_comparable_id`,
--     `on delete set null` : une MODIFICATION du résumé, que le verrou refusait — supprimer le
--     concurrent le plus dangereux d'un dossier conclu, ou ce dossier entier (procédure
--     d'effacement A, nettoyage de l'agence de test), échouait ;
--   • aucune clé `on update cascade` ; les déclencheurs des deux tables ne modifient que la ligne
--     qu'on écrit ; seule `reopen_live` écrit dans ces tables depuis une autre, en supprimant.
--
-- Le verrou laisse donc passer UNE modification : le vidage du concurrent le plus dangereux quand
-- ce concurrent vient d'être supprimé (il n'existe plus). Tout autre changement du résumé ou des
-- réponses d'un dossier conclu ou archivé reste refusé, vider ce choix à la main compris.
--
-- Compatible avec le code de `main` : la même fonction, une exception de plus. Aucune ligne
-- existante n'est modifiée.

create or replace function public.refuse_live_write_after_conclusion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
begin
  select p.status into v_status from public.projects p where p.id = new.project_id;
  if v_status is null or v_status not in ('meeting_completed', 'archived') then
    return new;
  end if;
  -- Le concurrent le plus dangereux vient d'être supprimé (`on delete set null`) : seul ce vidage
  -- passe, rien d'autre ne change dans la ligne.
  -- (Deux « if » : PL/pgSQL n'évalue pas un « and » en court-circuit, et la table des réponses n'a
  -- pas cette colonne.)
  if tg_table_name = 'live_seller_summary' and tg_op = 'UPDATE' then
    if old.seller_most_dangerous_comparable_id is not null
       and new.seller_most_dangerous_comparable_id is null
       and (to_jsonb(new) - 'seller_most_dangerous_comparable_id' - 'updated_at')
           = (to_jsonb(old) - 'seller_most_dangerous_comparable_id' - 'updated_at')
       and not exists (select 1 from public.comparables c
                       where c.id = old.seller_most_dangerous_comparable_id) then
      return new;
    end if;
  end if;
  raise exception 'live: le dossier % est conclu ou archivé, le Live ne change plus', new.project_id
    using errcode = '42501';
end;
$$;

revoke all on function public.refuse_live_write_after_conclusion() from public, anon, authenticated;
