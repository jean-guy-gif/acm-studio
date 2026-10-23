-- Mission 114 — l'agence de démonstration, et elle seule. Un repère sur l'agence, posé par un
-- OPÉRATEUR (M100) depuis `/erreurs` : dans cette agence, les fournisseurs extérieurs (Stream
-- Estate, extension, Localisateur, geo.api.gouv.fr, fiche PDF) sont simulés, et la bascule se
-- décide côté serveur, sur ce seul repère. Le navigateur ne l'écrit jamais : comme le plafond de
-- recherche (M100), un manager règle sa ligne d'agence, pas ce repère.
--
-- Aucune ligne n'est modifiée : la colonne est fausse par défaut, et le code de `main` d'avant ne
-- la lit ni ne l'écrit. Compatible avec `main` : les écritures existantes du navigateur sur
-- `agencies` (nom, seuils « ce qui dort », `updated_at` — M59, M88) gardent leur droit, par
-- colonne (le modèle de `profiles`, M88) ; `is_demo` est la seule colonne retirée au rôle
-- `authenticated`. Les lectures ne changent pas.

alter table public.agencies
  add column is_demo boolean not null default false;

comment on column public.agencies.is_demo is
  'Mission 114 — vrai : agence de démonstration (données fictives, fournisseurs simulés). Posé par un opérateur, par la clé service seulement.';

-- Le droit de modifier l'agence, par colonne : tout ce que le navigateur écrivait déjà, sauf
-- `is_demo`. La politique `agencies_manager_update` (M88) continue de cadrer QUI (un manager non
-- retiré, sa ligne seulement) ; ici, QUOI.
revoke update on public.agencies from authenticated;
grant update (name, preparation_dormant_days, follow_up_dormant_days, updated_at)
  on public.agencies to authenticated;
