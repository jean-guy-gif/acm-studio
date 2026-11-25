# MISSION 108 — Les finitions de l'audit n°5

**Date** : 19/10/2026 · **Origine** : audit n°5 du 19/10/2026 (doc « Audit ACM Studio n°5 — après les
finitions »), section « Corrections P1, et le chemin vers 8 ». La M107 a traité les cinq corrections
bloquantes. Celle-ci traite le reste. Laurent : « on continue ». Estimation après : environ 7,7/10.

La mission se lance seule, depuis `main` à jour (commit `1dd609d` ou suivant), dans une seule
conversation.
- Pas de push forcé.
- `npm run sauvegarde` avant chaque migration. Les migrations sont datées après la dernière de `main`.

## Commencer par vérifier, sans rien coder

Relire chaque constat dans le code de `main` (numéros de ligne du 19/10, avant la M107) et dire en
une ligne s'il est toujours présent. Attendre l'accord de Laurent si l'inventaire contredit la
mission.

## Critères d'acceptation

### A. Live : ce que le vendeur lit est juste

1. **Décision périmée.** Quand la décision de prix est périmée (`positioningStatus === 'outdated'`),
   le vendeur ne lit plus « Prix retenu par votre conseiller à partir de N concurrents »
   (`market-reading.ts:66-71`). Le lancement du Live rappelle « Décision de prix à actualiser »
   (`live-launch.ts:31-46`), sans bloquer. Quand le calcul est impossible, aucun « Calculé sur N »
   ne s'affiche sous un tiret.
2. **« Non » après la révélation.** Un concurrent que le vendeur juge « Non » sort de la bande et de
   la médiane, même s'il l'a dit après la révélation du prix (`market-reading.ts:37-38`), comme le
   prévoit la M94.

### B. Préparation : un dossier « Prêt » est vraiment prêt

3. **Imports en attente.** Un dossier ne passe pas « Prêt » tant qu'un concurrent retenu attend son
   import (`project-readiness.ts:42-85`). La carte du dossier affiche « N en attente d'import ».
4. **Une annonce, une fiche.** L'adresse d'une annonce est nettoyée de la même façon sur tous les
   chemins d'import (recherche, adresse collée, saisie à la main) avant l'unicité
   (`import-and-create-competitor.ts:72`, `import-listing-from-url.ts:41`,
   `comparable-form-fields.tsx:195`). Les doublons existants sont comptés avant, et Laurent valide la
   fusion. Un doublon n'est jamais avalé en silence : « Déjà dans le dossier (écartée) : la
   retenir ? » (`create-comparable.ts:118`, `insert-competitor.ts:44`).
5. **Un seul sens pour « Décision de prix ».** La carte d'un dossier n'affiche plus deux
   « Décision de prix » (`builder/page.tsx:137-160`). La ligne de la fourchette devient « Votre
   fourchette ». « Décision de prix » désigne seulement le prix décidé dans « Avant le rendez-vous ».
6. **Vocabulaire.** Disparaissent de l'écran :
   - « l'outil ne produit aucune estimation » (`property-price-range-step.tsx:30`) ;
   - « Origine : Import URL » (`comparable-card.tsx:102, 227`), qui devient « Importé depuis
     l'annonce » ;
   - le code INSEE à côté de la commune (`competitor-search-panel.tsx:1183`).

   Le test de vocabulaire lit aussi le texte écrit sur plusieurs lignes (`vocabulary.test.ts:165`).
7. **Résultat payé gardé à tort ou jeté à tort.** Changer la fourchette de la fiche ne jette plus un
   résultat obtenu avec des « Prix recherchés » réglés à part (`paid-search-guard.ts:51-61`).

### C. Extension : ni attente inutile ni faux « absente »

8. Après une détection réussie, deux essais au lieu d'un avant de conclure « absente »
   (`client.ts:171-177`), pour couvrir un service de l'extension en veille.
9. Sans extension, l'attente de 5 s n'a lieu qu'une fois par onglet. Les clics suivants affichent
   tout de suite le message d'installation, avec un bouton « Réessayer ».

### D. Suivi

10. **Date dès la conclusion.** Conclure « à relancer » propose déjà la date de la première relance,
    avec les mêmes règles que la M105 (`follow-up-contacts.ts:142-145`).
11. **Relecture des prix fiable.** Une erreur d'écriture pendant « Mettre à jour les prix des
    concurrents » est comptée comme « illisible » et notée au journal. Le résumé n'annonce jamais une
    baisse non enregistrée (`refresh-competitor-price.ts:83-87, 117-121`).

### E. Prospection

12. **Adresse du conseiller avec commune.** Une adresse saisie ou corrigée par le conseiller exige une
    commune reconnue, comme une opposition à la main (`advisor-address.ts:80-84`). Sa clé est
    construite par la même fonction que celle des oppositions.
13. **Courrier au confrère.** Dans les courriers en lot, un concurrent en exclusivité dont l'adresse
    n'est pas confirmée n'est plus écarté : le courrier au confrère n'en a pas besoin
    (`batch-letters.ts:54`).
14. **Liste d'opposition complète.** La vérification d'opposition ne dépend plus d'une lecture
    plafonnée à 1 000 lignes (`get-oppositions.ts:12-15`) : elle se fait par clé, côté base, ou par
    pages.
15. **Photo d'annonce.** Réenregistrer un courrier qui portait une photo d'annonce supprime le fichier
    du stockage (`save-prospecting-file.ts:127`).

### F. Équipe et socle

16. **Réintégrer.** Le manager peut réintégrer un membre retiré de son agence (« Réintégrer »). Une
    nouvelle invitation à son adresse le propose au lieu de répondre « déjà un compte »
    (`invite-member.ts:37-45`).
17. **Invitation.** L'adresse est comparée à l'identique, sans joker (`eq` sur `lower(email)`), et
    l'erreur de lecture est traitée (`invite-member.ts:40`).
18. **Dossier de la même agence.** Les règles d'écriture de `stream_estate_results` et de
    `comparables` vérifient que le dossier appartient à l'agence (`finitions.sql:34-38`,
    `initial_schema.sql:281-285`), comme `live_seller_responses`.
19. **Fichier mort.** `src/features/search-budget/services/record-usage.ts`, qui n'est plus appelé,
    est supprimé.
20. **Tests en CI.** Les 14 tests SQL qui tournent hors CI y entrent, sauf impossibilité expliquée au
    compte rendu.

### G. Les experts gardent leurs réglages

21. Dans « Réglages de la recherche » (M99), un bouton « Garder comme mes réglages par défaut »
    enregistre les réglages pour le conseiller. Ils s'appliquent à ses nouveaux dossiers, avec la
    mention « vos réglages par défaut ». Les dossiers existants ne changent pas. « Remettre par
    défaut » revient aux valeurs de l'outil.

## Preuves

22. Migrations soumises avant d'être appliquées, avec comptages avant et après : règles
    d'écriture, réglages par défaut du conseiller, et tout ce que l'inventaire révèle.
23. Un test par critère. Aucun appel Stream Estate payant dans les tests ni dans l'e2e.
    `npm run e2e` vert, tablette comprise.

## Décisions à respecter

- M75 et M83 (ni adresse ni « Vendu par » côté vendeur), M89 (« Prix des concurrents »), M92
  (méthode infalsifiable), M94 (un « Non » n'entre pas dans la bande), M97 (lexique), M99
  (réglages), M101 (100 % des retenus importés), M102 à M107 (opposition liée au bien, commune,
  résultat payé gardé, plafond strict).
- La clé d'opposition couvre tout l'immeuble pendant la bêta.
- Jamais le mot « estimation » à l'écran.
- On ne modifie ni `extension/` ni le Localisateur.

## Hors périmètre

- Supabase Pro et la séparation des bases (décision de Laurent du 19/10 : plus tard).
- Recaler le rythme du Live : on attend les durées réelles de la bêta.

## Essai sur l'URL d'essai

1. Retenir un concurrent sans l'importer : le dossier reste « En préparation », avec « 1 en attente
   d'import ».
2. Importer deux fois la même annonce, avec et sans paramètres dans l'adresse : une seule fiche, et
   un message clair.
3. La carte d'un dossier affiche « Votre fourchette » et, une fois le prix décidé, « Décision de
   prix ».
4. Conclure un rendez-vous « à relancer » : une date de première relance est proposée.
5. Dans « Réglages de la recherche », régler un rayon de 2 km et « Garder comme mes réglages par
   défaut ». Créer un nouveau dossier : le rayon de 2 km est déjà réglé.
6. Ensuite, demander à Claude Code de retirer les données de test, avec comptage avant et après.
