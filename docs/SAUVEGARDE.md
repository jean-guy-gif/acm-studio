# Sauvegarde de la base

**Quand** : avant chaque migration, et une fois par semaine pendant la bêta — `npm run sauvegarde`,
puis `npm run sauvegarde:verifier`, qui doit finir par « Vérification réussie ».

**Où** : dans `~/acm-studio-sauvegardes/`, un dossier par date (`2026-10-12_0900`), hors du dépôt
et jamais commité : il contient les données des vendeurs et des jetons de connexion.

**La vraie solution** : l'offre payante de Supabase, avec ses sauvegardes quotidiennes
automatiques. Elle n'est pas activée ; cette sauvegarde à la main en tient lieu pendant la bêta.

## Ce que font les deux commandes

- `npm run sauvegarde` lit la base partagée, sans rien y écrire : la structure, les données, les
  comptes et l'index du stockage, puis les fichiers du stockage (photos, logos). Elle note le
  nombre de lignes de chaque table dans `comptes.json`. Si la base change pendant la sauvegarde,
  elle le dit : relancez-la.
- `npm run sauvegarde:verifier` restaure la dernière sauvegarde dans une base locale à part,
  créée puis supprimée (la base locale de travail n'est pas touchée), et compare les nombres de
  lignes, table par table, ainsi que les fichiers du stockage.

Il faut Docker lancé, la base locale démarrée (`supabase start`) et la CLI Supabase reliée au
projet. `ACM_SAUVEGARDES=/autre/dossier` range les sauvegardes ailleurs — jamais dans le dépôt, le
script le refuse.

## Restaurer pour de bon

Cela ne se fait pas seul : c'est une opération sur la base partagée, à mener avec Claude Code,
après accord explicite, en comptant avant et après (règle « Migrations » de CLAUDE.md). Dans
l'ordre : `schema.sql`, `data-auth-storage.sql`, `data-public.sql`, puis les fichiers de
`stockage/` renvoyés dans leurs buckets.

## Après un effacement RGPD

Les sauvegardes antérieures contiennent encore la donnée effacée : supprimez-les, puis refaites-en
une (`docs/PROCEDURE_EFFACEMENT.md`).
