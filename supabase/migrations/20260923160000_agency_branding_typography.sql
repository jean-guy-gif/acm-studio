-- Mission 57 — L'identité, jalon 2 : la typographie (option B, AUCUNE lecture du site).
--
-- Après mesure sur de vrais sites d'agences, l'extraction automatique est abandonnée :
--   • la couleur ne se déclarait proprement (variable CSS nommée, non-fréquentielle) que sur
--     1 site sur 4 ;
--   • la police, elle, se lit toujours — mais elle ne correspondait EXACTEMENT à une police
--     embarquée que sur 1 à 2 sites sur 4, et 2 sites sur 4 ont une police PROPRIÉTAIRE
--     (Orpi, Metropolis) qu'aucune liste ne retrouvera jamais.
-- Le rôle de la liste n'est donc pas de « retrouver » la police du site — c'est d'offrir un
-- caractère sobre qui ne jure pas avec la charte. On ne lit PAS le site : l'agence choisit
-- dans une liste COURTE de polices EMBARQUÉES (jamais chargées de l'extérieur pendant le
-- Live, §5 de la mission), avec l'aperçu. Le commit détaille les sections abandonnées.
--
-- Deux colonnes, toutes deux nullables (une agence sans choix garde la typo produit) :
--   • font_family : la clé de la police retenue. Un SLUG validé par la base — jamais une
--     valeur libre : l'application mappe la clé vers une pile de polices EN DUR (next/font),
--     une clé inconnue retombe sur le défaut produit. Le CHECK garantit qu'aucun caractère
--     ne peut s'échapper vers une feuille de style (même principe défensif que le HEX du
--     jalon 1 : une donnée venue de la base, jamais une instruction).
--   • site_url : l'adresse du site, CONSERVÉE mais JAMAIS ouverte (option B). Elle ne coûte
--     rien et ouvre la porte à une extraction plus tard — mesurée sur un échantillon plus
--     large, par un niveau 1 élargi, jamais par un navigateur. Pas de lecture ici.
--
-- Aucun rattrapage : il n'y a rien à capter (on ne lit rien). Les agences existantes restent
-- sur la typo produit tant qu'elles ne choisissent pas.
alter table public.agency_branding
  add column font_family text
    check (font_family is null or font_family ~ '^[a-z0-9-]+$'),
  add column site_url text
    check (site_url is null or site_url ~ '^https?://');
