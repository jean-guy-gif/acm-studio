-- Mission 97 — Le junior autonome.
--
-- Deux repères, aucune ligne existante modifiée :
--   1. `projects.is_example` : le dossier d'exemple d'un conseiller (bien et concurrents fictifs,
--      identifiés comme tels par le badge « Exemple »). Il est exclu des compteurs, des mesures
--      et de la Prospection ; aucun dossier existant n'en est un.
--   2. `fields_to_verify`, sur le bien vendeur et sur les concurrents : les champs remplis par un
--      import que le conseiller n'a pas encore relus (pastille « À vérifier »). Vide pour tout ce
--      qui existe déjà : on ne sait pas, après coup, ce qui venait d'un import — rien n'est
--      inventé.
--
-- Compatible avec le code de `main` : trois colonnes NEUVES, avec une valeur par défaut, que
-- `main` n'écrit pas ; ses lectures (`select *` compris) les reçoivent sans s'en servir.

alter table public.projects
  add column is_example boolean not null default false;

comment on column public.projects.is_example is
  'Dossier d''exemple (données fictives, badge « Exemple ») : exclu des compteurs, des mesures et de la Prospection (mission 97).';

alter table public.subject_properties
  add column fields_to_verify text[] not null default '{}'
    check (cardinality(fields_to_verify) <= 60);

comment on column public.subject_properties.fields_to_verify is
  'Champs remplis par un import et pas encore relus par le conseiller (mission 97).';

alter table public.comparables
  add column fields_to_verify text[] not null default '{}'
    check (cardinality(fields_to_verify) <= 60);

comment on column public.comparables.fields_to_verify is
  'Champs remplis par un import et pas encore relus par le conseiller (mission 97).';
