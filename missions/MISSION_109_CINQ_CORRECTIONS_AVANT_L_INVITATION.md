# MISSION 109 — Cinq corrections avant l'invitation

**Date** : 19/10/2026 · **Origine** : audit n°6 du 19/10/2026 (doc « Audit ACM Studio n°6 — après M107
et M108 »), section « Corrections avant d'inviter des conseillers ». Laurent : « je te suis sur tout ».
C'est une petite mission, sans nouvelle fonction.

La mission se lance seule, depuis `main` à jour (commit `f98648f` ou suivant).
- Pas de push forcé.
- `npm run sauvegarde` avant la migration éventuelle, datée après la dernière de `main`.

## Commencer par vérifier, sans rien coder

Relire chaque constat dans le code de `main` et dire en une ligne s'il est toujours présent.

## Critères d'acceptation

### A. Les réglages par défaut ne gardent que ce qui vaut pour tous les biens (P0)

**Constat** : `save-search-defaults.ts:31-33` enregistre tout `SearchSettings` (`search-settings.ts:21-27`) :
secteur, élargissement, mais aussi prix recherchés, pièces et surface. `create-project.ts:39` les recopie
dans chaque nouveau dossier. Une villa serait cherchée, et payée, avec les critères d'un appartement.
C'était une erreur de la mission 108.

1. « Garder comme mes réglages par défaut » n'enregistre que le **secteur** et l'**élargissement
   automatique**. Le libellé le dit : « Garder ce secteur et l'élargissement pour mes prochains
   dossiers ».
2. Un nouveau dossier ne reprend jamais de prix, de pièces ni de surface d'un autre dossier.
3. Les réglages par défaut déjà en base (0 au 19/10) sont comptés. S'il y en a, prix, pièces et
   surface en sont retirés, avec comptage avant et après.

### B. Jamais un prix non décidé devant le vendeur

**Constat** : `live-launch.ts:46-50` ne prévient pas quand aucune décision de prix n'est enregistrée. Le
vendeur voit alors le calcul brut comme « Prix des concurrents » (`build-seller-presentation.ts:419,
438-441`), sans validation du conseiller (CLAUDE.md).

4. Au lancement du Live, sans décision de prix : « Aucune décision de prix : le vendeur ne verra pas de
   prix final. Décidez votre prix avant le rendez-vous », avec un lien vers « Avant le rendez-vous ».
   Le lancement reste possible.
5. Sans décision de prix, l'écran du vendeur n'affiche aucun « Prix des concurrents » ni « Calculé sur
   N ». La bande des prix et la position des concurrents restent affichées.

### C. Un dossier conclu ne change plus par le Live

**Constat** : `write-live-comparable-response.ts:29-48` ne vérifie que l'agence. Sur un dossier conclu ou
archivé, le sérieux, les commentaires et le concurrent le plus dangereux changent encore, et le Suivi
les relit (`get-seller-insights.ts:47-48`).

6. L'écriture des réponses du Live est refusée sur un dossier conclu ou archivé, côté serveur. Une
   règle en base l'interdit aussi.
7. Ouvrir le Live d'un dossier conclu ou archivé mène à l'écran de pause. La réouverture par un
   opérateur (M104) reste le seul moyen de rouvrir.

### D. Une opposition garde toujours l'adresse de l'immeuble

**Constat** : `competitor-locations.ts:158-166` ignore le résultat d'`insertOppositions` quand le
Localisateur confirme l'adresse d'une annonce opposée. Si l'ajout échoue, seule l'annonce bloque, et une
autre annonce du même immeuble redevient sollicitable. `add-prospecting-opposition.ts:45` n'inscrit
aussi qu'une seule clé par carte regroupée.

8. Le résultat de l'ajout est vérifié. Un échec part au journal des erreurs.
9. Chaque nuit, avec la tâche de la M105, toute annonce opposée dont l'adresse confirmée manque à la
   liste y est ajoutée.
10. « Ne plus solliciter » sur une carte regroupée inscrit la clé de chaque copie dont l'adresse est
    confirmée.

### E. La commune tapée reste celle du courrier, avec ou sans code postal

**Constat** : sans code postal, `confirm-competitor-address.ts` écrit `decision.display` : « 12 bd X,
Juan-les-Pins » devient « 12 bd X, Antibes » sur le courrier, contrairement à la décision du 19/10.

11. La commune tapée est gardée telle quelle dans tous les cas. Seule la clé d'opposition utilise
    l'alias (Juan-les-Pins = Antibes).

### F. Le courrier au confrère, bloqué partout sur un bien opposé

**Décision de Laurent (19/10)** : pendant la bêta, aucun courrier, ni au propriétaire ni au confrère,
sur un bien inscrit « Ne plus solliciter ».

12. `file-access.ts:89-99` bloque aussi la version confrère sur un bien opposé : impression unitaire
    (`?version=colleague`), enregistrement, lot et tournée. Message : « Ce propriétaire a demandé à ne
    plus être sollicité ».

## Preuves

13. Migration seulement si la règle du critère 6 ou le rattrapage du critère 9 l'exigent. Soumise avant
    d'être appliquée, avec comptage avant et après.
14. Tests :
    - les réglages par défaut ne gardent ni prix, ni pièces, ni surface ;
    - Live sans décision : rappel au lancement, aucun prix final côté vendeur ;
    - écriture d'une réponse refusée sur un dossier conclu, à l'écran et en base ;
    - ajout de la clé qui échoue : journal, puis rattrapage la nuit ;
    - carte regroupée avec deux adresses confirmées : deux clés ;
    - « 12 bd X, Juan-les-Pins », sans code postal : le courrier garde Juan-les-Pins, la clé vaut
      Antibes ;
    - courrier au confrère refusé sur un bien opposé, par chaque chemin.
15. `npm run e2e` vert, tablette comprise.

## Décisions à respecter

- M92 (méthode infalsifiable), M104 (réouverture par un opérateur), M107 (libellé neutre, opposition par
  l'annonce), M108 (décision périmée gardée, commune tapée gardée), M99 (réglages de recherche).
- La clé d'opposition couvre tout l'immeuble pendant la bêta.
- On ne modifie ni `extension/` ni le Localisateur.

## Hors périmètre

- Les P1 de l'audit n°6 et les améliorations de la mission 110.

## Essai sur l'URL d'essai

1. Régler un rayon de 2 km et 3 à 4 pièces, puis « Garder ce secteur… ». Créer un dossier : le rayon
   est repris, les pièces non.
2. Sur le dossier d'exemple sans décision de prix, lancer le Live : le rappel s'affiche, et aucun prix
   final n'apparaît côté vendeur.
3. Ensuite, demander à Claude Code de retirer les données de test, avec comptage avant et après.
