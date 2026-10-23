# MISSION 114 — La démo des closers

**Date** : 22/10/2026, amendée le 23/10 (Jean-Guy : aucune mention de démonstration) · **Origine** : Laurent, 22/10 : des closers vont vendre la formation Start Academy et
doivent pouvoir montrer tout l'outil, de la fiche importée jusqu'aux biens à prospecter, « en simulation,
avec des données simulées, pour être sûr que ça fonctionne, même si la connexion n'est pas bonne, sans
bug, jusqu'à la fin de l'utilisation de l'outil ».

Deux parties, **une branche et un `/valide` par partie**, A puis B. Pas de push forcé. `npm run sauvegarde`
avant chaque migration. Pas de `/valide` sans CI verte ni e2e vert. La mission 113 partie B passe avant.

## Décisions de Laurent (22/10)

- **Une seule agence de démonstration, partagée par tous les closers.** Chacun a son compte. Chacun a ses
  propres dossiers de démo, et « Remettre ma démo à zéro » ne touche que les siens.
- **Vraies communes, rues fictives** : Antibes, Vence, Mougins, Cagnes-sur-Mer… avec des prix et des
  surfaces cohérents avec le marché local, mais des rues qui n'existent pas (« 12 allée des
  Démonstrations », « 4 chemin du Simulateur »). Aucune adresse réelle, aucune annonce réelle.
- **Photos libres de droits** (licences Unsplash ou Pexels), rangées dans l'application, avec la liste des
  sources et des licences dans `docs/DEMO.md`. Aucune photo d'annonce réelle.

## Ce que la démo doit permettre

Le closer se connecte et déroule l'outil comme un conseiller, sans extension, sans Localisateur, sans
Stream Estate, sans portail : tout ce qui vient de l'extérieur est simulé, et tout le reste est le vrai
outil.

1. **Importer une fiche** : « Importer une annonce » (l'adresse proposée est remplie d'avance) ou la fiche
   PDF de démo remplit la fiche du bien vendeur, avec ses photos et les pastilles « À vérifier » (M97).
2. **Chercher les concurrents** : la recherche simulée rend des biens cohérents avec le bien (type,
   secteur, prix, pièces, surface), avec le % de correspondance, les élargissements, les cartes « non
   indiqué », et les réglages de recherche qui fonctionnent (M99, M110, M111).
3. **Retenir et importer** : chaque concurrent coché s'importe en une ou deux secondes, avec photos, prix,
   durée en vente, baisses, « Vendu par » et exclusivité ; l'adresse arrive ensuite « confirmée » comme si
   le Localisateur l'avait trouvée.
4. **Avant le rendez-vous** : décision de prix, choix des 6, ordre, export (mode expert).
5. **Le Live** de bout en bout, puis la conclusion, la synthèse au vendeur et son lien.
6. **Le Suivi** : un dossier « à relancer » avec ses freins, le message de relance, « Mettre à jour les
   prix des concurrents » (une baisse simulée apparaît).
7. **La Prospection** : les biens à prospecter avec adresses localisées, cartes, courriers propriétaire et
   confrère, courriers en lot, tournée, « Ne plus solliciter ».
8. **Le tableau du manager** sur l'agence de démo.

## Partie A — Le moteur de démonstration

### A1. Une agence de démonstration, et elle seule

1. Un repère sur l'agence (`agencies.is_demo`), posé uniquement par un opérateur (M100), en bas de
   `/erreurs` : « Agence de démonstration ». Le navigateur ne peut jamais l'écrire (comme le plafond, M100).
2. **Rien ne dit « démonstration » à l'écran ni à l'impression** (décision de Jean-Guy, 23/10, qui
   remplace le bandeau, la mention sur le Live et le filigrane prévus le 22/10) : ni bandeau, ni pied
   d'écran, ni filigrane, ni pastille. Le repère ne se voit qu'en bas de `/erreurs`, côté opérateur.
3. La bascule vers les données simulées se décide **côté serveur, sur ce repère**, jamais sur un paramètre
   du navigateur. Une agence réelle n'atteint jamais un fournisseur simulé, et l'agence de démo n'atteint
   jamais un fournisseur réel : un test le prouve dans les deux sens.

### A2. Les fournisseurs simulés

4. Sont remplacés, pour l'agence de démo seulement :
   - Stream Estate (recherche, « Chercher encore ») : aucun appel, aucun budget consommé ;
   - la lecture des annonces par l'extension ACM (import, relecture des prix) : l'extension n'est pas
     requise, et son absence ne s'affiche pas ;
   - le Localisateur : les adresses des concurrents retenus arrivent « confirmées », avec leur étiquette ;
   - geo.api.gouv.fr : une table locale des communes de la démo ;
   - l'import d'une fiche PDF : la fiche de démo, lue comme une vraie.
5. Chaque réponse simulée arrive après un court délai fixe (une à deux secondes), pour que l'écran montre
   ses états réels (« Import en cours… 2 sur 5 »). Aucun ne dépend du réseau ni ne peut échouer.
6. Les données simulées passent par les mêmes chemins de code que les vraies (revalidation serveur,
   classement M71, empreinte du résultat payé, unicité des annonces) : la démo montre le vrai outil, pas
   une copie.

### A3. Le jeu de données

7. Trois scénarios, chacun avec un bien vendeur, sa fiche à importer (adresse d'annonce de démo et PDF),
   3 à 5 photos libres, et 12 à 15 biens que la recherche peut proposer :
   - un appartement 3 pièces à Antibes ;
   - une maison 5 pièces à Vence ;
   - une villa avec piscine à Mougins.

   Les prix au m², surfaces, DPE, durées en vente et baisses sont cohérents avec le marché de chaque
   commune. Chaque concurrent a 2 à 4 photos, un « Vendu par » et une exclusivité variés (pour montrer la
   version propriétaire et la version confrère du courrier).
8. Le jeu de données est dans le code, relu par un test : aucune adresse ne correspond à une rue réelle de
   la commune (liste des rues fictives tenue dans le test), aucun nom de vraie agence, aucune adresse
   d'annonce de vrai portail.

## Partie B — Les dossiers de chaque closer, et la remise à zéro

9. « Préparer ma démo » (sur « Bienvenue » et dans le menu de l'agence de démo) crée, pour le closer
   connecté, quatre dossiers à quatre étapes :
   - **À préparer** : le bien vendeur à importer (scénario Antibes) ;
   - **Prêt pour le Live** : concurrents retenus et importés, adresses confirmées, décision de prix
     (scénario Vence) ;
   - **Conclu, mandat signé** : Live mené, synthèse, concurrents à prospecter avec adresses, courriers
     prêts, un « Ne plus solliciter » (scénario Mougins) ;
   - **À relancer** : conclu avec des freins, une relance passée, une baisse de prix depuis le rendez-vous.
10. « Remettre ma démo à zéro », avec confirmation, supprime les dossiers de démo du closer connecté et en
    recrée quatre neufs. Les dossiers des autres closers ne bougent pas.
11. Les dossiers de démo ne comptent dans aucune agence réelle, et l'agence de démo n'apparaît dans aucune
    statistique d'opérateur autre que la sienne.
12. Pas d'envoi d'e-mail d'invitation depuis l'agence de démo (les closers sont invités par un
    opérateur). Les documents de démo s'impriment comme les vrais, sans filigrane ni mention
    (décision de Jean-Guy, 23/10).

## Robustesse

13. **Connexion faible** : la démo ne dépend que de l'accès à ACM. Pas d'extension, de portail, de Stream
    Estate ni de geo.api. Le compte rendu dit clairement qu'une connexion à ACM reste nécessaire : une 4G
    suffit, mais il n'y a pas de mode hors ligne.
14. **Sans bug** : un e2e à part, `demo`, joue le parcours complet du closer (points 1 à 8), sur
    acm-studio-essai.vercel.app, en bureau et en tablette. Il bloque toute requête vers un autre hôte
    qu'ACM et Supabase, pour prouver qu'aucune étape ne dépend de l'extérieur. Il finit par « Remettre ma
    démo à zéro » et vérifie que les dossiers d'un autre compte de démo n'ont pas bougé.

## Preuves

15. Migrations soumises avant d'être appliquées, avec comptages avant et après (repère de l'agence,
    marque des dossiers de démo s'il en faut une).
16. Tests :
    - bascule décidée au serveur, sur le repère de l'agence, dans les deux sens ;
    - aucun appel réseau sortant pour l'agence de démo (fournisseurs simulés seuls) ;
    - jeu de données sans rue réelle, sans agence réelle, sans annonce réelle ;
    - aucune mention de démonstration dans les pages ni les impressions de l'agence de démo ;
    - remise à zéro limitée au closer connecté.
17. `npm run e2e` vert, tablette comprise, et le nouvel e2e `demo` vert, à chaque partie.

## Décisions à respecter

- CLAUDE.md : aucune fausse donnée hors de l'agence de démo, reconnue au serveur seulement (23/10).
- M97 (dossier d'exemple : il reste tel quel, pour les conseillers), M100 (opérateurs, plafond), M102 à
  M111 (règles de la prospection, du Live et de la synthèse, inchangées dans la démo).
- Jamais « estimation » à l'écran. Ni adresse, ni titre, ni lien d'annonce, ni « Vendu par » côté vendeur,
  démo comprise.
- On ne modifie ni `extension/` ni le Localisateur : la démo s'en passe.

## Hors périmètre

- Un mode hors ligne.
- Une démo sans compte (lien public).

## Ce que Laurent fait

- Créer le compte de l'agence de démo dans la console Supabase (« Create new user »), l'ouvrir par
  `/onboarding` sous le nom « Agence Démo Côte d'Azur », puis la marquer « Agence de démonstration » dans
  `/erreurs`.
- Créer un compte par closer dans cette agence (invitation, rôle conseiller).

## Essai sur l'URL d'essai

- **A** : avec un compte de l'agence de démo, Chrome sans aucune extension : importer la fiche d'Antibes,
  chercher, retenir et importer 5 concurrents, voir les adresses arriver, décider le prix, mener le Live.
- **B** : « Préparer ma démo », ouvrir chacun des quatre dossiers, imprimer un courrier (sans mention),
  « Remettre ma démo à zéro ». Avec un compte réel, vérifier qu'une recherche part toujours chez Stream
  Estate (sans la lancer) et que rien ne parle de démo.
