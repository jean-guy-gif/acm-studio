-- Mission 115 (partie C) — le confrère : collaboration obtenue ou refusée.
--
-- Pour un concurrent en exclusivité (confrère, M98), après « Contacté », les choix ne sont plus
-- « Rendez-vous obtenu » mais « Collaboration obtenue » et « Collaboration refusée ». Deux FAITS
-- datés de plus, posés par le conseiller, un cran à la fois, retour d'un cran possible (M86) :
--   • `prospecting_collaboration_at` : la collaboration est obtenue, la prospection de ce
--     concurrent est close (comme un mandat rentré), comptée à part ;
--   • `prospecting_collaboration_declined_at` : refusée, le bien repasse en courrier
--     propriétaire (remis → rendez-vous → mandat), les faits d'avant le refus ne comptent plus.
--
-- Compatible avec le code de `main` : deux colonnes nullables de plus sur `comparables`, aucune
-- ligne écrite. La RLS de la table (cloisonnement par agence) couvre ces colonnes, comme les
-- quatre faits de M86.

alter table public.comparables
  add column prospecting_collaboration_at timestamptz,
  add column prospecting_collaboration_declined_at timestamptz,
  -- L'une ou l'autre, jamais les deux ; toujours après le contact ; jamais avec un mandat rentré
  -- (une collaboration obtenue clôt la prospection, un mandat ne se note plus).
  add constraint comparables_prospecting_collaboration_one_way
    check (prospecting_collaboration_at is null or prospecting_collaboration_declined_at is null),
  add constraint comparables_prospecting_collaboration_after_contact
    check (
      (prospecting_collaboration_at is null and prospecting_collaboration_declined_at is null)
      or prospecting_handed_at is not null
    ),
  add constraint comparables_prospecting_collaboration_without_mandate
    check (prospecting_collaboration_at is null or prospecting_mandate_at is null);

comment on column public.comparables.prospecting_collaboration_at is
  'Mission 115 — collaboration obtenue avec le confrère (exclusivité) : la prospection de ce concurrent est close.';
comment on column public.comparables.prospecting_collaboration_declined_at is
  'Mission 115 — collaboration refusée par le confrère : le bien repasse en courrier propriétaire.';
