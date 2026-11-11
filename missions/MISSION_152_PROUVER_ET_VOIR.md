# MISSION 152 — Prouver et voir : la preuve du prix au Live, ce qui a changé avant le rendez-vous, la fiche complète d'un bien

**Date** : 11/11/2026 · **Origine** : demande de Jean-Guy (11/11), pendant que la 151 attend
l'ouverture des modèles par AWS (cas 179439470000287 ; sa branche n'est pas touchée). Mesure :
`missions/M152-mesure.md`.

**Statut** : réponses de Jean-Guy du 11/11 reçues et reportées ici (fin du fichier). **Maquettes
M152-1 à M152-5 validées par Jean-Guy le 11/11.** Partie 0 faite et en production le 11/11 (main
9f66062). Partie A lancée le 11/11. Fiche et maquettes sur la branche `mission-152-prouver-et-voir`.

**Trois parties**, une branche et un `/valide` chacune, dans cet ordre (Jean-Guy, 11/11) :
**0, l'effacement des anciennes tables de la M147 et la page de confidentialité** — en production
avant le **23/11/2026** ; **A, côté vendeur** (la preuve du prix au Live, ce qui a changé avant le
rendez-vous) ; **B, côté acquéreur et agence** (la fiche complète d'un bien). Une migration en 0
(suppressions) et une en A (la copie de l'annonce) : architecte et gardien-sql pour chacune.

## Objectif

Le vendeur qui doute d'un prix voit, sans que le Live s'arrête, que ce prix était bien affiché et
quand ; le conseiller arrive au rendez-vous en sachant ce qui a bougé depuis sa préparation ; et il
juge un bien sur sa fiche entière avant de le proposer.

## Maquettes

`missions/maquettes/M152-1` à `M152-5` (`.png`, source `M152-generateur.mjs --png`), chacune sur
ordinateur, tablette et téléphone, notes avant / après à droite. Biens, prix, textes et dates
inventés ; photos de la démo. La partie 0 ne change aucun écran : dispensée. **Validées par
Jean-Guy le 11/11.**

| Planche | Écran | Partie |
|---|---|---|
| 1 | Live : « Voir l'annonce » sur la révélation du prix | A |
| 2 | Live : « Voir l'annonce » sur l'écran de la durée | A |
| 3 | Live : l'annonce telle qu'ACM l'a enregistrée — prix et dates, photos, caractéristiques, pas le texte — puis en ligne | A |
| 4 | Avant le rendez-vous : ce qui a changé depuis la préparation | A |
| 5 | La fiche complète d'un bien, pour le conseiller seul, avec « Retenir ce bien » | B |

## Partie 0 — effacer ce qui ne sert plus, et la page de confidentialité (avant le 23/11)

**Ce qui part** (M147 A, DECISIONS du 09/11) : les tables `address_dossiers` et
`living_here_sheets`, les colonnes `buyers.sector_priorities`, `buyers.living_place`,
`buyer_visit_requests.living_place_trip`, avec leurs données, leurs contraintes, leurs
déclencheurs (`address_dossiers_check`, `living_here_sheets_dated` et leurs fonctions) et leurs
règles. `buyer_visit_requests.scheduled_at` reste (« Confirmer la visite », M147 A).

**Qui les touche encore** (vérifié le 11/11 sur `main`) — **plus rien ne les lit** ; restent :

| Où | Quoi | Ce qu'on en fait |
|---|---|---|
| `src/features/comparables/services/delete-living-here-sheets.ts` et ses trois appels (`delete-comparable.ts`, `bulk-comparable-actions.ts`, `demo-dossiers.ts`) | efface les fiches « Vivre ici » d'un concurrent supprimé et à la remise à zéro de la démo | retirés |
| `scripts/nettoyer-test.mjs` | les compte et les vide dans l'agence de test | lignes retirées |
| `docs/PROCEDURE_EFFACEMENT.md` | les compte et les efface (A et C) | lignes retirées |
| `supabase/tests/dossier_adresse.sql`, `supabase/tests/vivre_ici.sql`, et leurs deux étapes dans `.github/workflows/sql.yml` | testent les tables et les colonnes | retirés ; ce que `vivre_ici.sql` prouve de `scheduled_at` passe dans un test gardé |
| `supabase/tests/agency_isolation_all_tables.sql` | sait remplir `living_here_sheets` | lignes retirées |
| `src/lib/database.types.ts` | les types | régénéré (`npm run gen:types`) |

**L'ordre, imposé par la base partagée** : le code de production efface encore
`living_here_sheets` à la suppression d'un concurrent. Donc (1) le code sans ces appels part en
production (`/valide`, production vérifiée) ; (2) puis la migration est appliquée, après
sauvegarde et comptage prédit (lignes de chaque table et colonnes non vides, relus en base) ;
la migration n'est compatible qu'avec le code d'après (1).

**La page `/confidentialite`** : le juriste a validé les textes (Jean-Guy, 11/11). Elle reçoit les
changements de `missions/M147-confidentialite-pour-le-juriste.md` — un paragraphe supprimé (le
dossier d'adresse construit par ACM), un remplacé (Academia : le dossier d'adresse et « Vivre
ici »), avec les dates remplies : mise en service le **09/11/2026**, effacement **au plus tard le
23/11/2026**. La phrase prévue pour le jour du lien direct vers Academia attend ce jour-là
(`ACADEMIA_LIEN_DIRECT`, M147 A). Le texte de la M151 (les notes lues par une IA) n'est pas mis en
ligne : sa fonction n'existe pas encore.

## Partie A — prouver

### 1. « Voir l'annonce » au Live (planches 1 à 3)

1. **À quoi il sert** : confirmer le prix au vendeur qui doute, et rien d'autre (Jean-Guy, 11/11).
2. **Où** : l'écran de la révélation du prix et l'écran suivant (la durée), qui rappelle le prix ;
   l'écran 2 du rythme accéléré ; l'écran d'un bien en présentation directe ; « Revoir » (M113) pour
   un concurrent dont le prix a été révélé. Jamais avant la révélation, jamais pour un « Non ». En
   contour : le seul plein reste « Valider et continuer » (M146). Aucune preuve de la durée.
3. **La couche** : les photos (M58), le prix affiché **et ses dates** — le relevé à l'import (la
   copie, point 6), la dernière relecture, la baisse connue (`listing_observations`, M47) —, les
   caractéristiques. **Pas le texte de l'annonce**, qui cite souvent l'agence concurrente et
   parfois l'adresse (32, 19 et 6 sur 73, mesure §2) ; jamais le titre ni l'adresse (M83, M107) :
   le libellé neutre reste. « Fermer » rend l'écran inchangé ; rien n'est écrit, l'adresse du Live
   ne change pas, les flèches du clavier sont suspendues (comme « Revoir »).
4. **« Ouvrir l'annonce en ligne ↗ »**, en contour, si le conseiller veut tout montrer : nouvel
   onglet, sans confirmation ; l'adresse n'arrive au navigateur qu'à ce toucher, par une action qui
   revérifie la révélation (garde de donnée, M51). Annonce retirée (M103) : « L'annonce n'est plus
   en ligne depuis le … : il reste la copie enregistrée ».
5. **La garde** : rien de l'annonce (dates, caractéristiques, photos de la copie, lien) n'est livré
   au navigateur avant la révélation du prix de ce concurrent ; le texte ne l'est jamais. Le test
   « jamais côté vendeur » le vérifie sur la charge, titre et texte pièges compris (M107).
6. **La copie de l'annonce** (une migration) : une table où l'on n'écrit qu'une fois, remplie à
   l'import d'une annonce lue — date, portail et identité de l'annonce (M47), prix, **texte**,
   adresses des photos (jamais copiées, M58), étiquettes et caractéristiques ; cloisonnée par
   agence, écrite par le serveur seul, ni modifiée ni retirée depuis le navigateur, effacée avec le
   concurrent et par les procédures d'effacement. Rien n'est reconstitué pour les concurrents déjà
   importés : leur couche montre le premier relevé de prix et la fiche actuelle, « telle
   qu'enregistrée », sans « à l'import ». Une photo retirée par le portail laisse le cadre gris (M87).
7. **Sans annonce lue** : un concurrent saisi à la main n'a pas de bouton ; un concurrent créé
   depuis la recherche (M101) montre le prix lu dans la recherche Stream Estate, sa date et ses
   photos. Au vendeur, jamais « saisi par votre conseiller ».

### 2. Ce qui a changé depuis la préparation (planche 4)

1. **« Vérifier les annonces »** sur « Avant le rendez-vous » : la relecture de la M105, par
   l'extension et sans appel payant, ouverte aux dossiers en préparation et prêts, sur les seuls
   concurrents retenus.
2. **Le bloc « Depuis la préparation »** dit : **Prix baissé** ou **monté** (ancien → nouveau,
   l'écart, la date du constat) ; **Annonce retirée**, sur preuve (M103), avec « Écarter » ou « La
   garder » (qui redit l'avertissement de la M103) ; le compte des inchangées et des illisibles.
3. **Un prix relu met à jour le concurrent**, comme au Suivi, et **l'ancien prix reste dans son
   historique** (Jean-Guy, 11/11 : les relevés datés, M47, et la copie de l'import) ; la décision de
   prix devient « à actualiser », avec son lien (M108).
4. **Le rappel** : sans vérification depuis plus de 24 h, le bloc le dit et « Lancer le Live » le
   rappelle, sans bloquer (M52).

## Partie B — voir : la fiche complète d'un bien (planche 5)

1. **Pour le conseiller seul**, pour qu'il soit sûr des biens qu'il propose (Jean-Guy, 11/11) :
   rien n'en part vers un acquéreur.
2. **Où** : les biens idéaux, la sélection d'une fiche acquéreur, « Proposer ce bien », **et les
   mandats de l'agence** ; panneau à droite sur ordinateur, plein écran sur tablette et à 390 px.
3. **Tout** : les photos en carrousel (glisser au doigt, flèches, « 1 / 20 », vignettes), le prix
   et ses dates, la raison du rang (M151, quand elle existe), toutes les caractéristiques connues
   (une absente n'a pas de case, jamais « — »), **le texte complet** (« Voir plus » du portail
   retiré), « Voir l'annonce en ligne ↗ ».
4. **« Retenir ce bien »**, le seul plein, dans une barre fixée en bas, là où se fait une sélection
   (les biens idéaux) : il ajoute le bien à la sélection (M118, trois au plus) et compte « 2 biens
   retenus sur 3 » ; retenu : « Retenu ✓ · Retirer » en contour. Ailleurs, la fiche se lit sans
   bouton plein.
5. **Par source** : concurrent importé (sa copie et sa fiche) ; annonce Stream Estate (le résultat
   payé garde désormais la description et les photos d'origine, `picturesRemote`, jusqu'à 20, sans
   appel ni coût de plus) ; mandat de l'agence (ses photos, sa description, ses points forts) ; bien
   démarché (ses faits et ses photos, jamais son texte, M120 A).
6. **L'annonce en ligne, pour le conseiller** (Jean-Guy, 11/11) : sur un bien qui n'est pas de
   l'agence (concurrent, annonce du marché, bien démarché), la fiche complète porte « Voir l'annonce
   en ligne ↗ », nouvel onglet ; un mandat de l'agence n'en a pas besoin.
7. **La page de l'acquéreur ne change pas** (Jean-Guy, 11/11) : jamais de lien vers l'annonce d'une
   autre agence. C'est déjà le cas, vérifié dans le code le 11/11 : le lien du dossier acquéreur
   (`/dossier/<jeton>`) montre, pour chaque bien, ses photos (la copie gardée à la sélection),
   son libellé neutre, ses critères face à sa recherche, son prix ou « Prix à confirmer », « Pourquoi
   je vous le propose » et un fait daté, puis « Je veux le visiter », « Peut-être », « Pas pour moi »,
   ses créneaux et « Envoyer ma réponse », qui crée la demande de visite que le conseiller lit sur
   Visites (M119, M122 B) ; ses seuls liens sont le téléphone et l'e-mail du conseiller, et « Vivre
   ici » d'Academia sous un mandat signé de l'agence (M147 A) ; jamais le titre, l'adresse, le lien,
   « Vendu par » ni l'exclusivité (liste d'autorisation, M119). La partie B n'y ajoute rien de la
   fiche complète ; le test « jamais côté acquéreur » le garde.

## Critères d'acceptation (testables)

1. **0** : plus aucune référence aux tables et colonnes retirées dans `src/`, `scripts/`,
   `supabase/tests/`, la CI et la procédure d'effacement (un test le cherche) ; le comptage après la
   migration est conforme à la prédiction ; `/confidentialite` porte le texte validé, dates
   remplies ; en production avant le 23/11.
2. **A** : rien de l'annonce dans la charge du Live avant la révélation, jamais le texte ni le
   titre (test « jamais côté vendeur ») ; la couche montre la copie de l'import, même après une
   modification à la main de la fiche ; « Ouvrir l'annonce en ligne » n'arrive qu'au toucher ; la
   vérification d'avant rendez-vous ne facture rien, met le prix à jour et garde l'ancien ; la démo
   joue le tout sans appel extérieur (M114).
3. **B** : la fiche complète s'ouvre depuis les quatre endroits, tient sans défilement horizontal à
   390 px et sur tablette, « Retenir ce bien » sous le pouce ; aucune donnée de la fiche dans ce qui
   part vers l'acquéreur.

## Décisions à respecter

M47, M51, M52, M58, M83, M87, M96, M101, M103, M105, M107, M108, M113, M114, M118, M120 A, M127,
M146, M147 A, et la démo miroir (CLAUDE.md, 05/11).

**Décisions qui changent (Jean-Guy, 11/11)** : la description d'une annonce Stream Estate est
gardée dans le résultat payé, pour le conseiller seul (précise le 05/10 et la M151) ; la relecture
des annonces s'ouvre aux dossiers en préparation et prêts (précise la M105).

## Réponses de Jean-Guy (11/11)

1. « Voir l'annonce » sert uniquement à confirmer le prix : prix et dates, photos, caractéristiques,
   **pas le texte** ; « Ouvrir l'annonce en ligne » reste disponible si le conseiller veut tout
   montrer.
2. Le lien en ligne n'arrive qu'au toucher : oui.
3. La table écrite une seule fois : oui, **avec le texte**.
4. à 8. Oui (photos non copiées ; concurrents sans annonce lue comme proposé ; un bouton et un
   rappel à 24 h ; au 7, l'ancien prix garde sa place dans l'historique ; description et photos
   d'origine de Stream Estate gardées).
9. La fiche complète est pour le conseiller seul, avec tout, texte compris ; elle s'ouvre aussi pour
   les mandats de l'agence.
10. Le bien démarché reste sans texte. 11. A puis B.
12. La suppression des anciennes tables passe **avant** la partie A, en production avant le 23/11,
    après avoir vérifié que plus rien ne les lit ; et la page `/confidentialite` à jour part avec
    elle, le juriste ayant validé les textes.
