# MISSION 112 — Les finitions de l'audit n°7

**Date** : 21/10/2026 · **Origine** : audit n°7 du 19/10/2026 (doc « Audit ACM Studio n°7 — après M109 et
M110 »), tableau « Le reste, et le chemin vers 8 ». La M111 a traité les huit P1. Celle-ci traite le reste,
plus un gain de simplicité sur les réglages de la recherche. Laurent : « ok on continue ». Aucune de ces
corrections ne bloque l'invitation des premiers conseillers : la mission peut se faire pendant la bêta.

Elle se fait en deux parties, **une branche et un `/valide` par partie**, dans l'ordre A puis B. Pas de
push forcé. `npm run sauvegarde` avant chaque migration, datée après la dernière de `main`
(`20261102090000`).

## Commencer par vérifier, sans rien coder

Relire chaque constat dans le code de `main` (commit `55b4ca4` ou suivant) et dire en une ligne s'il est
toujours présent. Les numéros de ligne datent du 19/10, avant la M111. Attendre l'accord de Laurent si
l'inventaire contredit la mission.

## Partie A — Ce que voit le vendeur, et l'argent dépensé

### A1. Le Live ne s'ouvre jamais sans ses contrôles

**Constat** : `/live/{id}` (`src/app/(stage)/live/[projectId]/page.tsx:40`) ne vérifie que le statut conclu
ou archivé. La confirmation « devant le vendeur » (M104) et le choix des 6 concurrents (M110) ne se font que
dans le navigateur (`live-launch-actions.tsx:98-104`). Une adresse tapée ou reprise de l'historique ouvre
un vrai Live sans confirmation, avec tous les concurrents.

1. Sur un vrai dossier dont le Live n'a pas commencé, `/live/{id}` sans confirmation enregistrée renvoie
   vers `/builder/{id}/lancer-le-live` (M107). Un Live commencé se reprend sans rien demander, comme
   aujourd'hui. Le dossier d'exemple n'est pas concerné.
2. Au-delà de 6 concurrents retenus, sans choix daté (`live_shortlist_at`), même renvoi.
3. Le serveur garde la trace de la confirmation (heure, conseiller), sans nouvelle question à l'écran.

### A2. Les concurrents montrés au Live ne bougent plus une fois le Live commencé

**Constat** : `save-live-shortlist.ts:31-97` vérifie « Live commencé » puis fait trois écritures
parallèles, sans transaction, et `comparables.excluded_from_live` reste modifiable depuis le navigateur.
`retain-competitor.ts` peut retenir un concurrent en plein Live : il s'insère au milieu de l'ordre et se
montre par défaut. `write-live-comparable-response.ts:44-53` accepte une réponse sur un concurrent hors
Live.

4. Le choix des concurrents montrés s'enregistre en une seule opération en base, et la base le fige une
   fois le Live commencé, comme l'ordre (M110) et le rythme (M95). Les suppressions restent permises
   (leçon de la migration 20261028).
5. Un concurrent retenu après le début du Live est hors Live, à la fin de l'ordre.
6. Une réponse du Live sur un concurrent hors Live est refusée, au serveur et en base.

### A3. La bande des prix suit le vendeur pendant la séance

**Constat** : la bande d'« Analyse des prix » n'est demandée qu'une fois (`range == null`,
`live-comparative-shell.tsx:617, 646, 695`). Un concurrent passé à « Non » après coup reste dans la bande
affichée jusqu'au rechargement, alors que le serveur l'exclut (M108).

7. Un « Non » enregistré pendant la séance redemande la bande au serveur, sans rechargement.

### A4. Le vendeur sait sur combien de concurrents porte le prix

**Constat** : « Calculé sur 8 concurrents » s'affiche quand le vendeur n'en a vu que 6
(`build-seller-presentation.ts:418-421`). C'est conforme à la M110, mais trouble le vendeur.

8. Quand des concurrents sont hors Live : « Calculé sur 8 concurrents, dont 6 vus ensemble ». Le prix ne
   change pas.

### A5. Le calcul brut ne part plus vers le navigateur sans décision

**Constat** : sans décision de prix, `competitiveMarketCentral` part quand même dans la charge du Live
(`project-live-for-seller.ts:228`). Il n'est pas affiché, mais c'est une garde de rendu, pas une garde de
donnée (M51). La phrase « Le prix des concurrents montre… » reste affichée sans décision
(`live-page-conclusion.tsx:134`).

9. Sans décision enregistrée, ce montant n'est pas envoyé au navigateur, et la phrase ne s'affiche pas.
   Le test « jamais côté vendeur » le vérifie sur la charge.

### A6. Un résultat payé n'est jamais perdu, et le quartier ne le jette plus

**Constat** : la recherche payée ne garde rien côté serveur (`search-stream-estate.ts:116`, « Rien n'est
écrit ») ; c'est le navigateur qui l'enregistre ensuite, sans attendre ni vérifier
(`competitor-search-panel.tsx:709-712, 744`). Si la suite échoue, le résultat payé est perdu. Le quartier
entre dans l'empreinte (`load-search-criteria.ts:61`), alors que Stream Estate ne l'utilise pas
(`stream-estate-features.ts:194`).

10. Le résultat est gardé côté serveur, dans l'action qui a payé, avant de répondre au navigateur.
11. Le quartier sort de l'empreinte du résultat payé. Les résultats déjà gardés se rouvrent après la
    mission (comptage et test, comme à la M111).

### A7. « Prêt » et le Live tiennent compte des imports en attente

**Constat** : « Déclarer prêt » (`set-project-readiness.ts:21-27`) et le lancement du Live
(`live-launch.ts`, `get-live-launch-info.ts`) ignorent les concurrents retenus qui attendent leur import
(M101, M108). Un doublon déjà écarté vide la ligne d'attente (`pending-imports.ts:161-163, 195-197`).

12. « Déclarer prêt » et « Lancer le Live » rappellent « 2 concurrents retenus attendent leur import »,
    avec un lien. Ils ne bloquent pas (M52).
13. Un doublon écarté garde sa ligne d'attente tant que le conseiller n'a pas répondu à « La retenir ? ».

### A8. « Modifier » une fiche suit les mêmes règles que l'import

**Constat** : `update-comparable.ts:37-49` écrit l'adresse d'annonce sans le nettoyage de la M108. Sur un
doublon, la redirection des lignes 50-56 fait perdre la saisie.

14. L'adresse d'annonce est nettoyée comme sur les autres chemins (`parseListingUrl`). Sur un doublon, le
    formulaire reste rempli avec le message de la M108.

## Partie B — Simplicité, Suivi, Prospection, socle

### B1. Les réglages de la recherche redeviennent courts (simplicité)

**Constat** : « Réglages de la recherche » montre à tous les conseillers dix lignes, plus les recherches
nommées et les réglages par défaut (audit n°7, simplicité à 7).

15. Au premier affichage : secteur, élargissement, prix, pièces, surface (M99). Le DPE, l'étage,
    l'extérieur, le terrain et la piscine passent sous « Plus de critères », replié. Il s'ouvre seul quand
    l'un d'eux est réglé, et sa ligne résume ce qui l'est (« Plus de critères : DPE C, D · piscine »).
16. Les recherches nommées et « Garder ce secteur… » passent sous une ligne « Mes recherches », repliée
    sauf en mode expert.
17. Rien ne change dans la recherche elle-même : un test le vérifie requête par requête (comme M99).

### B2. La préparation ne cache rien d'utile au junior

**Constat** : « Tout est juste » efface aussi les pastilles « À vérifier » des compléments jamais ouverts
(`subject-property-form.tsx:252-257`). Le terrain d'une maison est dans les compléments
(`complements.ts:29, 33`), alors qu'il compte dans la recherche et le pourcentage.

18. « Tout est juste » ne valide que ce qui est affiché. Les compléments gardent leurs pastilles, et la
    ligne de résumé les compte (M110).
19. Pour une maison, le terrain passe dans « L'essentiel ».
20. Un seul libellé pour la recherche de concurrents : « Trouver des concurrents », partout (bouton
    d'étape suivante compris).

### B3. Le mode expert, sans trou

21. L'export du comparatif n'écrit jamais l'adresse d'un bien « Ne plus solliciter » : la cellule dit
    « Ne plus solliciter » (`comparison-csv.ts:121`).
22. L'éditeur de l'ordre se met à jour quand la liste des retenus change ailleurs, au lieu d'échouer sur un
    message général (`live-order-editor.tsx:33`).
23. « Enregistrer cette recherche » ne lit plus les bornes de prix : une seule borne saisie ne la refuse
    plus (`saved-searches.ts:60`). Un nom déjà pris demande « Remplacer « Villas Vence » ? ».

### B4. Le Suivi garde ce que le conseiller a décidé

**Constat** : « Changer l'issue » renvoie toujours une date de relance par défaut
(`suivi-issue-form.tsx:74-85`, `outcome-choice.tsx:82-87, 174-181`), qui écrase celle choisie. Le message de
relance ne suit pas un changement de freins sans rechargement (`follow-up-message.tsx:12`). Le motif « Prix
accepté » et le frein « Projet pas mûr » donnent un message contradictoire (`follow-up-message.ts:60, 80`).
Si une lecture échoue, le tableau du manager disparaît sans rien dire (`get-mandate-dashboard.ts:36`).

24. « Changer l'issue » propose la date déjà posée ; elle ne change que si le conseiller la modifie.
25. Le message de relance se recalcule quand les freins ou le motif changent.
26. Avec « Prix accepté, signature à venir », la phrase du frein « Projet pas mûr » n'entre pas dans le
    message.
27. Tableau illisible : « Chiffres de la prise de mandat indisponibles pour le moment », au lieu de rien.

### B5. La Prospection ne se tait jamais sur une erreur

28. Une lecture en échec des alertes « commune inconnue » le dit sur Administration, au lieu d'une liste
    vide (`get-unknown-commune-oppositions.ts:21-33`).
29. Le secret de la tâche de nuit est comparé en temps constant (`opposition-recheck.ts:41`).
30. La tâche de nuit ne peut plus dépasser son délai : le rattrapage des clés d'adresse (M109) passe en
    premier, la revérification des communes est bornée, et les lignes déjà dites « inconnues » ne
    reviennent pas devant les autres à chaque nuit.
31. Le serveur refuse le choix « photo de l'annonce » tant que l'option est retirée (M105,
    `their-photo.ts:79-91`).

### B6. Le socle et la page de confidentialité

32. Les liens de synthèse expirés sont supprimés par la purge de la nuit (M100).
33. `/confidentialite` décrit les recherches nommées (supprimées avec le compte) et donne une durée de
    conservation pour les freins et leur ligne libre. Le texte nouveau est signalé dans le compte rendu,
    pour la relecture juridique.
34. `conclude_meeting` vérifie que le dossier appartient à l'agence avant d'écrire.

## Preuves

35. Migrations soumises avant d'être appliquées, avec comptages avant et après : confirmation du Live,
    choix figé des concurrents montrés, réponses hors Live, purge des liens, `conclude_meeting`.
36. Un test par critère. En particulier :
    - `/live/{id}` sans confirmation renvoie vers la confirmation ; un Live commencé se reprend ;
    - concurrent retenu en plein Live : hors Live, en fin d'ordre ; réponse hors Live refusée en base ;
    - résultat payé gardé même si la suite échoue ; quartier corrigé sans perte ;
    - « Changer l'issue » garde la date posée ;
    - export sans adresse d'un bien opposé.
37. Aucun appel Stream Estate payant dans les tests ni dans l'e2e. `npm run e2e` vert, tablette comprise,
    à chaque partie.

## Décisions à respecter

- M51 (garde de donnée, pas de rendu), M52 (l'outil informe, ne barre pas la route), M92 (méthode
  infalsifiable), M104 (confirmation devant le vendeur), M107 (résultat payé jamais perdu), M108 (une
  annonce, une fiche), M109 (dossier conclu figé), M110 et M111 (choix des 6, critères triés, empreinte).
- Jamais « estimation » à l'écran. Ni adresse, ni titre, ni lien d'annonce, ni « Vendu par » côté vendeur.
- La clé d'opposition couvre tout l'immeuble pendant la bêta.
- On ne modifie ni `extension/` ni le Localisateur.

## Hors périmètre

- Supabase Pro et l'e2e dans la CI (décision de Laurent du 19/10 : plus tard).
- Recaler le rythme du Live et la durée estimée : on attend les durées réelles de la bêta.

## Essai sur l'URL d'essai

- **A** : coller l'adresse `/live/{id}` d'un vrai dossier prêt dans un nouvel onglet : la confirmation
  s'affiche. Sur le dossier d'exemple, dire « Non » à un concurrent après « Analyse des prix », revenir :
  la bande ne le montre plus.
- **B** : « Réglages de la recherche » affiche cinq lignes et « Plus de critères ». Conclure « à relancer »
  avec une date choisie, puis « Changer l'issue » en ajoutant un frein : la date reste.
- Ensuite, demander à Claude Code de retirer les données de test, avec comptage avant et après.
