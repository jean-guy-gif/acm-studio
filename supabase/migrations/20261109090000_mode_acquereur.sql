-- Mission 118 (partie A) — l'interrupteur Vendeur | Acquéreur, mémorisé par conseiller.
--
-- `profiles.workspace_mode` : 'seller' (le menu d'aujourd'hui) ou 'buyer' (Acquéreurs, Biens
-- idéaux, Prospection). Il ne change que le menu, jamais les droits ni les données. Comme le mode
-- expert (M110), la colonne n'est pas modifiable par le navigateur (liste des colonnes, M88) : seul
-- le serveur l'écrit, sur le profil de l'appelant.
--
-- Compatible avec le code de `main` : une colonne avec valeur par défaut, aucune ligne modifiée.

alter table public.profiles
  add column workspace_mode text not null default 'seller'
    check (workspace_mode in ('seller', 'buyer'));

comment on column public.profiles.workspace_mode is
  'Mission 118 — le mode du menu, Vendeur (seller) ou Acquéreur (buyer), mémorisé par conseiller ; écrit par le serveur seul.';
