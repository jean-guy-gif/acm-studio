-- Mission 86 — Le statut de prospection d'un concurrent.
--
-- La page « Prospection » suit chaque concurrent d'un mandat signé : adresse à confirmer →
-- prêt à envoyer → dossier remis → rendez-vous obtenu → mandat rentré, ou « pas intéressé »
-- après la remise. « À confirmer » et « prêt » se DÉDUISENT de l'adresse (locator_*), comme
-- aujourd'hui : rien à stocker. Les quatre autres sont des FAITS datés, posés par le conseiller :
-- une date par fait, null tant qu'il n'a pas eu lieu. Revenir d'un cran efface la date.
--
-- Compatible avec le code de `main` : quatre colonnes nullables de plus sur `comparables`,
-- aucune ligne écrite. La RLS de la table (cloisonnement par agence) couvre ces colonnes.

alter table public.comparables
  add column prospecting_handed_at timestamptz,
  add column prospecting_meeting_at timestamptz,
  add column prospecting_mandate_at timestamptz,
  add column prospecting_declined_at timestamptz,
  -- L'ordre des faits : pas de rendez-vous sans remise, pas de mandat sans rendez-vous, et
  -- « pas intéressé » clôt une remise restée sans rendez-vous.
  add constraint comparables_prospecting_meeting_after_handed
    check (prospecting_meeting_at is null or prospecting_handed_at is not null),
  add constraint comparables_prospecting_mandate_after_meeting
    check (prospecting_mandate_at is null or prospecting_meeting_at is not null),
  add constraint comparables_prospecting_declined_after_handed
    check (prospecting_declined_at is null
           or (prospecting_handed_at is not null and prospecting_meeting_at is null));
