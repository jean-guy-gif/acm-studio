-- Mission 83 (retours d'essai) — une provenance de plus pour comparables.exclusivity_source :
-- « no_mention », vendu par une agence et aucune mention d'exclusivité dans l'annonce, donc
-- mandat simple (exclusivity = 'no').
--
-- Une seule instruction, donc atomique : la contrainte est remplacée par la même liste, plus
-- une valeur. Aucune écriture de ligne. La liste ne fait que s'ÉLARGIR : toute ligne qui
-- passait l'ancienne contrainte passe la nouvelle, quel que soit le contenu de la table. Le
-- code de main ignore cette colonne.

alter table public.comparables
  drop constraint comparables_exclusivity_source_check,
  add constraint comparables_exclusivity_source_check
    check (
      exclusivity_source is null
      or exclusivity_source in (
        'listing_data', 'badge', 'advertiser', 'title', 'description', 'no_mention', 'advisor'
      )
    );

comment on column public.comparables.exclusivity_source is
  'Provenance de exclusivity : listing_data, badge, advertiser, title, description, no_mention (agence sans aucune mention d''exclusivité : mandat simple), advisor.';
