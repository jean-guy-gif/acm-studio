-- Mission 147 (partie A) — Academia : le lien client « Vivre ici », collé une fois sur le mandat.
--
-- ACM ne garde plus ses propres versions du dossier d'adresse ni de « Vivre ici » : ce sont ceux
-- d'Academia (décision de Jean-Guy, 07/11). Sur l'onglet Bien vendeur, le conseiller colle le lien
-- client « Vivre ici » qu'Academia lui donne pour ce bien ; le lien de l'acquéreur le montre sous le
-- bien, et le message « Confirmer la visite » le reprend (décision de Jean-Guy, 09/11).
--
-- Seuls les liens d'Academia : https://app.myacademia.ai/l/<jeton>, le jeton seulement (lettres,
-- chiffres, « . », « _ », « ~ », « - » : ni « ? », ni « # », ni « / » de plus), aucun autre site,
-- 500 caractères au plus ; l'action serveur relit le lien, la base garde la règle (la colonne reste
-- modifiable par un membre de l'agence, comme `language` : `projects` est accordé à la table
-- entière, M88).
--
-- Compatible avec le code de `main` : une colonne nulle, jamais lue ni écrite par lui ; aucune ligne
-- modifiée. Les tables `address_dossiers` et `living_here_sheets` restent (suppression à part,
-- deux semaines après la production de la 147).

alter table public.projects
  add column academia_living_here_url text null
    constraint projects_academia_living_here_url_check
    check (
      academia_living_here_url ~ '^https://app\.myacademia\.ai/l/[A-Za-z0-9._~-]+$'
      and char_length(academia_living_here_url) <= 500
    );

comment on column public.projects.academia_living_here_url is
  'Mission 147 — le lien client « Vivre ici » d''Academia pour ce bien, collé par le conseiller ; montré à l''acquéreur qui le visite. Seulement https://app.myacademia.ai/l/…';
