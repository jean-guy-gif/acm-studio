-- Mission 140 (partie A) — Le client dans sa langue : la langue du dossier vendeur.
--
-- Ce que voit ou reçoit le vendeur (le Live, la synthèse, le Point marché, l'Étude de marché, leurs
-- liens) s'écrit dans la langue de son dossier ; l'interface du conseiller reste en français. Les
-- mêmes langues que la fiche acquéreur (M139) : français par défaut ; anglais proposé ; italien,
-- allemand et russe écrits plus tard, une langue à la fois (décision de Jean-Guy, 06/11).
--
-- La langue change à tout moment, y compris pendant le Live (« Réglages » : ce qui a été répondu est
-- gardé) et après la conclusion (les documents d'après) ; l'action serveur la relit (un dossier de
-- l'agence, non archivé, une langue proposée ou celle déjà posée) ; la base garde la liste fermée.
--
-- Compatible avec le code de `main` : une colonne à valeur par défaut, jamais lue par lui ; aucune
-- ligne modifiée.

alter table public.projects
  add column language text not null default 'fr'
    check (language in ('fr', 'en', 'it', 'de', 'ru'));

comment on column public.projects.language is
  'Mission 140 — la langue de ce que voit ou reçoit le vendeur (Live, documents, liens) ; français par défaut ; l''interface du conseiller reste en français.';
