-- Mission 104 — une opposition inscrite à la main quand le service des communes
-- (geo.api.gouv.fr) ne répondait pas : la commune est celle que le conseiller a tapée, non
-- vérifiée. La ligne le dit. La clé, elle, est construite comme celle des cartes : l'opposition
-- bloque de la même façon.
--
-- Compatible avec le code de `main` : une colonne qu'il ne lit ni n'écrit, fausse par défaut ;
-- l'ajout depuis le navigateur peut la poser, rien d'autre ne change (ni date, ni origine).
-- Aucune donnée modifiée : les lignes existantes sont vérifiées ou viennent d'une carte.

alter table public.prospecting_oppositions
  add column commune_unverified boolean not null default false;

comment on column public.prospecting_oppositions.commune_unverified is
  'Mission 104 — inscrite à la main sans que le service des communes réponde : commune tapée, non vérifiée.';

grant insert (commune_unverified) on public.prospecting_oppositions to authenticated;
