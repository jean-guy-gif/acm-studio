-- Mission 83 — qui vend un concurrent, et sous quel mandat.
--
-- Quatre colonnes NULLABLES sur comparables, PAS de backfill : une ligne existante reste à
-- null (« inconnu ») et le conseiller la complète d'un clic. Aucune écriture dans cette
-- migration : rien ne dépend de l'ordre des opérations, et le code de main, qui ignore ces
-- colonnes, continue de fonctionner. Les contraintes CHECK ne portent que sur ces colonnes
-- neuves : aucune ligne existante ne peut les violer (null est admis).
--
-- La valeur vient de l'ANNONCE (donnée structurée, badge, bloc annonceur, titre, description)
-- ou du CONSEILLER ; la colonne *_source dit laquelle. `advisor` prime : aucune lecture ne
-- l'écrase. « private » n'est jamais lu, seul le conseiller le pose.
--
-- Réservées au conseiller : jamais dans le Live ni dans une page montrée au vendeur.
--
-- La RLS ne change pas : les politiques de comparables couvrent la ligne entière.

alter table public.comparables
  add column sold_by text,
  add column sold_by_source text,
  add column exclusivity text,
  add column exclusivity_source text,
  add constraint comparables_sold_by_check
    check (sold_by is null or sold_by in ('agency', 'private')),
  add constraint comparables_exclusivity_check
    check (exclusivity is null or exclusivity in ('yes', 'no')),
  add constraint comparables_sold_by_source_check
    check (
      sold_by_source is null
      or sold_by_source in ('listing_data', 'badge', 'advertiser', 'title', 'description', 'advisor')
    ),
  add constraint comparables_exclusivity_source_check
    check (
      exclusivity_source is null
      or exclusivity_source in ('listing_data', 'badge', 'advertiser', 'title', 'description', 'advisor')
    );

comment on column public.comparables.sold_by is
  'Qui vend le bien concurrent : agency, private. Null = inconnu. « private » n''est posé que par le conseiller.';
comment on column public.comparables.sold_by_source is
  'Provenance de sold_by : listing_data, badge, advertiser, title, description, advisor. « advisor » avec sold_by null = le conseiller a répondu « inconnu ».';
comment on column public.comparables.exclusivity is
  'Mandat exclusif : yes, no. Null = inconnu. « no » seulement si la source le dit explicitement, ou le conseiller.';
comment on column public.comparables.exclusivity_source is
  'Provenance de exclusivity : listing_data, badge, advertiser, title, description, advisor.';
