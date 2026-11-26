# MISSION 128 B — Moins d'allers-retours avec la base

**Date** : 05/11/2026 · **Origine** : Jean-Guy, après le diagnostic de la M128
(`missions/M128-diagnostic-lenteur.md`, points 2 à 8). Arbitrage du 05/11 : les lots 1 et 2 du
diagnostic ; le lot 3 est refusé. Fiche écrite par le chef, à relire par Jean-Guy avant le
`/mission`.

Une branche, un `/valide`. Pas de migration. Aucun comportement ne change : c'est un refactoring
(CLAUDE.md), chaque écran affiche exactement ce qu'il affiche aujourd'hui, les mêmes 404 et les mêmes
redirections (M128). Barrières et suite e2e complète (la mission change `src/`).

## Mesurer d'abord

1. Avant tout code, sur l'essai, compte démo, chargement complet (comme la M128) : `/suivi`,
   `/builder`, `/builder/[id]` (Vue d'ensemble), `/builder/[id]/avant-rendez-vous`, `/acquereurs`.
   Trois mesures par page, la médiane. Compter aussi, par page, les requêtes à la base (journal des
   requêtes de Supabase ou trace locale). Les mêmes mesures après déploiement, dans le rapport.

## Lot 1 — Ne lire qu'une fois par requête ce que toutes les pages lisent

2. `getUser` (`src/lib/auth/get-user.ts`), `getProfile` (`src/lib/auth/get-profile.ts`), `getAgency`
   (`src/lib/auth/get-agency.ts`) et la charte de l'agence
   (`src/features/branding/queries/get-agency-branding.ts`) sont mémorisés pour la durée d'UNE requête
   (`cache` de React) : la mise en page (`src/app/(protected)/layout.tsx`) et la page les lisent
   aujourd'hui chacune de leur côté (28 pages appellent `getProfile`). Jamais d'un utilisateur à
   l'autre ni d'une requête à l'autre : rien n'est gardé au-delà de la requête.
3. **On garde `getUser` à chaque page** (décision de Jean-Guy, 05/11) : la vérification de la session
   auprès de Supabase Auth reste faite une fois par requête, jamais remplacée par la lecture du
   cookie (`getSession`, `getClaims`).
4. Une action serveur qui modifie le profil, l'agence ou la charte relit la valeur à jour dans la même
   requête (le cache de React ne vit pas d'une requête à l'autre : vérifier qu'aucune action ne lit,
   écrit, puis relit dans le même appel).

## Lot 2 — Lire en parallèle ce qui ne dépend pas d'autre chose

5. Vue d'ensemble d'un dossier (`src/app/(protected)/builder/[projectId]/page.tsx`, lignes 53 à 68) :
   après le dossier, la conclusion, le lancement du Live, les réouvertures et les lignes de
   prospection partent ensemble (`Promise.all`) ; seul ce qui a besoin du dossier l'attend.
6. « Avant le rendez-vous » (`…/avant-rendez-vous/page.tsx`, lignes 119 à 249) : les imports en
   attente, le lancement du Live, le profil (mode expert) et le choix des six rejoignent le
   `Promise.all` de la ligne 125.
7. Suivi (`src/app/(protected)/suivi/page.tsx`, lignes 86 à 104) : l'acquéreur, les dossiers, l'agence
   et les points marché partent en parallèle de ce dont ils ne dépendent pas ; l'agence vient du
   profil déjà lu (lot 1).
8. zod hors du navigateur : la liste des composants client (`'use client'`) qui importent zod,
   directement ou par un service, est dressée d'abord (avec le poids gagné, `next build`) ; la
   validation reste au serveur (CLAUDE.md : tout ce qui vient du navigateur est revalidé côté
   serveur), le composant ne reçoit que des types ou une fonction pure sans zod.

## Le faux client des tests

9. `src/test-fixtures/fake-supabase.ts` répond d'après la dernière table appelée : dans un
   `Promise.all`, toutes les lectures reçoivent la réponse de la dernière table. Une lecture que la
   mise en parallèle rend intestable avec lui passe dans une fonction pure, testée seule ; aucun test
   existant n'est affaibli pour passer.

## Hors périmètre

- **Lot 3, refusé** (Jean-Guy, 05/11) : remplacer `getUser` par une lecture locale de la session ; le
  chantier `select('*')` (colonnes lues en trop).
- Les rafraîchissements du Localisateur, le poids des photos, tout changement d'écran ou de texte.
