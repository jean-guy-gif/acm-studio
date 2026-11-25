# MISSION 107 — Rien de trop devant le vendeur

**Date** : 19/10/2026 · **Origine** : audit n°5 du 19/10/2026 (doc « Audit ACM Studio n°5 — après les
finitions »). Ce sont les cinq corrections à faire avant d'inviter les premiers conseillers. Laurent :
« ok on fait les modifs ». C'est une petite mission, sans nouvelle fonction.

La mission se lance seule, depuis `main` à jour.
- Pas de push forcé.
- `npm run sauvegarde` avant la migration éventuelle, datée après la dernière de `main`.

## Objectif

Le vendeur ne voit rien d'autre que ce que la méthode prévoit. Un propriétaire qui refuse d'être
contacté est inscrit tout de suite, et son inscription se corrige. Une recherche payée n'est jamais
perdue.

## Commencer par vérifier, sans rien coder

Relire chaque constat dans le code de `main` (commit `fde0a9a`) et dire en une ligne s'il est
toujours présent.

## Critères d'acceptation

### A. Le titre de l'annonce ne s'affiche jamais devant le vendeur (P0)

**Constat** : `project-live-for-seller.ts:126` envoie `title` à l'écran du vendeur une fois le prix
révélé. Il est affiché dans `live-page-quick-reveal.tsx:34`, `live-page-price-reveal-pilot.tsx:80-82`,
`live-page-duration.tsx:64-66`, `live-page-dangerous.tsx:74-79` et `live-page-conclusion.tsx:88, 113,
117`. Ce titre peut contenir « EXCLUSIVITÉ », le nom de l'agence ou, en saisie à la main (« Titre ou
référence »), une référence ou une rue. `listingUrl` est aussi envoyé (ligne 129) : le domaine d'un
site d'agence dit qui vend.

1. Partout dans le Live, le concurrent est désigné par le libellé neutre déjà utilisé avant la
   révélation (`neutralComparableLabel`), avant comme après la révélation du prix.
2. `title` et `listingUrl` sont retirés de ce que reçoit l'écran du vendeur
   (`AuthorizedSellerComparable` et sa projection).
3. Le test `never-seller-side` couvre le titre et l'adresse de l'annonce, avec un titre piège
   (« EXCLUSIVITÉ Agence Dupont 12 rue des Lilas »).
4. Le champ de saisie à la main s'appelle « Titre (pour vous seul) ».

### B. Le Live ne s'ouvre jamais sur un vrai dossier sans la confirmation

**Constat** : l'onglet « Live » de la barre d'étapes (`dossier-steps.ts:17`, présent sur tous les
écrans d'un dossier) et le bandeau « Ouvrir dans le Live » (`bascule-banner.tsx:16-21`) ouvrent
`/live/{id}` sans passer par la confirmation « devant le vendeur » de la M104.

5. Ces deux liens passent par le même contrôle que le bouton « Lancer le Live » : 0 concurrent,
   rappels « à vérifier », confirmation sur un vrai dossier.
6. Un Live déjà commencé se reprend sans nouvelle confirmation, comme aujourd'hui.

### C. « Ne plus solliciter » toujours possible, même avant l'adresse confirmée

**Constat** : `add-prospecting-opposition.ts:49-55` refuse l'opposition tant que l'adresse n'est pas
confirmée, et `prospecting-card.tsx:162` cache le bouton. Pourtant `insert-oppositions.ts:115-128`
sait inscrire une opposition sur la seule annonce.

7. « Ne plus solliciter » est proposé sur toute carte. Sans adresse confirmée, l'opposition est
   inscrite sur les annonces de la carte. Quand l'adresse sera confirmée plus tard, la clé d'adresse
   s'ajoute à l'opposition existante.
8. La confirmation d'une adresse sur un bien déjà opposé reste refusée (M102).

### D. Une opposition « commune inconnue » se corrige

**Constat** : `admin/page.tsx:83-85` et `get-unknown-commune-oppositions.ts:12-15` n'affichent que la
commune tapée, sans l'adresse, l'auteur ni la date, et l'alerte ne disparaît jamais.

9. Le manager voit, pour chaque alerte : l'adresse tapée, qui l'a inscrite, quand.
10. Il peut corriger la commune. La clé est alors reconstruite par la même fonction que les cartes,
    et l'alerte disparaît. Il peut aussi la marquer traitée. L'opposition n'est jamais retirée ni
    affaiblie par ces gestes.

### E. Une relance de recherche qui échoue ne fait rien perdre

**Constat** : `competitor-search-panel.tsx:601-608` efface le résultat payé avant de savoir si la
nouvelle recherche réussit (budget atteint, service des communes en panne, refus du fournisseur). Et
`:657-659` lie la réouverture du résultat gardé au bouton de recherche, qui disparaît quand le budget
est atteint.

11. L'ancien résultat n'est remplacé qu'après une recherche réussie.
12. Le résultat gardé se rouvre même quand le budget du mois est atteint.

## Preuves

13. Migration seulement si l'opposition par annonce, puis complétée par la clé (critère 7), l'exige.
    Soumise avant d'être appliquée, avec comptage avant et après.
14. Tests :
    - aucun écran du Live ne reçoit ni n'affiche le titre ou l'adresse de l'annonce, avec le titre
      piège ;
    - l'onglet « Live » et le bandeau passent par la confirmation sur un vrai dossier, pas sur
      l'exemple ;
    - opposition sur une carte sans adresse confirmée, puis adresse confirmée : la carte reste
      bloquée partout (courrier, lot, tournée) ;
    - correction de la commune d'une alerte : la clé rejoint celle de la carte ;
    - relance qui échoue (budget atteint, refus du fournisseur) : l'ancien résultat est toujours là ;
    - budget atteint : le résultat gardé se rouvre.
15. `npm run e2e` vert, tablette comprise.

## Décisions à respecter

- M75 et M83 (ni adresse ni « Vendu par » côté vendeur), M92 (méthode infalsifiable), M98 et M102
  (opposition liée au bien), M103 et M104 (opposition à la main, commune non vérifiée), M104
  (confirmation « devant le vendeur »), M105 (résultat payé gardé, plafond).
- La clé d'opposition couvre tout l'immeuble pendant la bêta.
- On ne modifie ni `extension/` ni le Localisateur.

## Hors périmètre

- Les autres P1 de l'audit n°5 (mission suivante).

## Essai sur l'URL d'essai

1. Dans le dossier d'exemple, ajouter à la main un concurrent titré « EXCLUSIVITÉ Agence Test » et le
   retenir. Lancer le Live : après la révélation du prix, ce titre n'apparaît nulle part.
2. Sur un vrai dossier, cliquer l'onglet « Live » de la barre d'étapes : la confirmation s'affiche.
3. Sur une carte de Prospection sans adresse confirmée, « Ne plus solliciter » est proposé ; après
   « Confirmer », la carte est marquée.
4. Dans Administration, une alerte « commune inconnue » montre l'adresse, l'auteur et la date ; la
   corriger la fait disparaître.
5. Mettre le plafond de l'agence de test à 0 € : le résultat gardé d'un dossier se rouvre quand même.
   Remettre le plafond.
6. Ensuite, demander à Claude Code de retirer les données de test, avec comptage avant et après.
