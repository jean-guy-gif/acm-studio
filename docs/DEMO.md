# La démonstration des closers (mission 114)

Une **agence de démonstration**, et elle seule, partagée par tous les closers : repère
`agencies.is_demo`, posé par un opérateur (M100) en bas de `/erreurs` (« Agence de démonstration »),
jamais écrit par le navigateur. Dans cette agence, tout ce qui vient de l'extérieur est simulé,
côté serveur, sur ce seul repère ; tout le reste est le vrai outil.

## Ce qui est simulé, et comment

| Fournisseur réel                                                      | En démonstration                                                                                                                                                                                                                   | Où                                                                                         |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Stream Estate (recherche, « Chercher encore »)                        | une page de résultats construite depuis le jeu de données, mêmes paramètres, même forme (zod), aucun appel, aucun budget                                                                                                           | `src/features/demo/services/demo-stream-estate.ts`, branché dans `search-stream-estate.ts` |
| Lecture des annonces par l'extension ACM (import, relecture des prix) | l'extension n'est ni requise ni sondée ; l'import et la relecture viennent du jeu de données (`importDemoCompetitor`, `refreshDemoPrices`) puis entrent dans les mêmes services (`createImportedCompetitor`, `recordPriceReading`) | `src/features/demo/actions/`                                                               |
| Localisateur Academia                                                 | les adresses des concurrents retenus arrivent « confirmées », avec leur étiquette, par `saveCompetitorLocations` (`locateDemoCompetitors`)                                                                                         | `src/features/demo/actions/locate-demo-competitors.ts`                                     |
| geo.api.gouv.fr, api-adresse.data.gouv.fr                             | une table locale des communes des Alpes-Maritimes (`data/communes.ts`), derrière `geoProvider(isDemo)`                                                                                                                             | `src/features/demo/services/demo-geo.ts`, `competitor-search/services/geo-provider.ts`     |
| Import d'une annonce du bien vendeur                                  | l'annonce du scénario, proposée d'avance (`importDemoSubjectListing`)                                                                                                                                                              | `src/features/demo/actions/import-demo-subject.ts`                                         |
| Fiche PDF du bien vendeur                                             | une fiche de démonstration par scénario, servie par l'application et lue dans le navigateur comme une vraie (M43)                                                                                                                  | `public/demo/fiche-<scénario>.pdf`, fabriquées par `npm run demo:fiches`                   |

Chaque réponse simulée arrive après un délai fixe de 1,5 s (`DEMO_DELAY_MS`) pour que l'écran montre
ses états réels. Rien ne dépend du réseau au-delà d'ACM et de Supabase ; **une connexion à ACM reste
nécessaire** (une 4G suffit), il n'y a pas de mode hors ligne.

Rien ne dit « démonstration » à l'écran ni à l'impression (décision de Jean-Guy, 23/10, qui
remplace le bandeau, la note du Live et le filigrane prévus le 22/10) : ni bandeau, ni pied
d'écran, ni filigrane, ni pastille ; les documents de démo s'impriment comme les vrais. Le repère
ne se voit qu'en bas de `/erreurs`, côté opérateur. Un test (`demo-unspoken.test.ts`) le vérifie
sur le code, et l'e2e `demo` sur les pages.

## Le jeu de données (`src/features/demo/data/scenarios.ts`)

Trois scénarios : un appartement 3 pièces à Antibes, une maison 5 pièces à Vence, une villa avec
piscine à Mougins. Vraies communes, **rues fictives** (`DEMO_STREETS` : « allée des
Démonstrations », « chemin du Simulateur »…), agences fictives (`DEMO_AGENCIES`), annonces sur
l'hôte réservé `annonces.demonstration.invalid` (RFC 2606 : il ne se résout jamais). Un test
(`src/features/demo/demo-dataset.test.ts`) vérifie qu'aucune rue réelle, aucune agence réelle,
aucun portail réel n'y figure.

## Les photos (`public/demo/photos`)

Toutes libres de droits, sous licence **CC0 1.0** (domaine public : aucune attribution exigée,
usage commercial permis), trouvées par Openverse et rangées dans l'application en JPEG 1 024 px.
Aucune photo d'annonce réelle. Décision du 22/10 : « licences Unsplash ou Pexels » ; leurs
téléchargements automatisés étant fermés depuis le poste de travail, les photos viennent de deux
banques en CC0, plus permissive encore. À remplacer par des photos Unsplash ou Pexels si Laurent le
préfère : mêmes noms de fichiers, et ce tableau à mettre à jour.

| Fichier              | Titre d'origine                      | Source       | Licence                  | Page d'origine                                                                          |
| -------------------- | ------------------------------------ | ------------ | ------------------------ | --------------------------------------------------------------------------------------- |
| `appartement-01.jpg` | Free modern living room interior     | rawpixel.com | CC0 1.0 (domaine public) | https://www.rawpixel.com/image/5915137/image-light-public-domain-plants                 |
| `appartement-02.jpg` | Free minimalist living room interior | rawpixel.com | CC0 1.0 (domaine public) | https://www.rawpixel.com/image/5927318/photo-image-public-domain-minimalist-house       |
| `appartement-03.jpg` | Free modern kitchen interior image   | rawpixel.com | CC0 1.0 (domaine public) | https://www.rawpixel.com/image/5925293/photo-image-public-domain-kitchen-living-room    |
| `appartement-04.jpg` | Bedroom White                        | StockSnap.io | CC0 1.0 (domaine public) | https://stocksnap.io/photo/bedroom-white-8RWPJ5Q6OZ                                     |
| `appartement-05.jpg` | Free living room interior design     | rawpixel.com | CC0 1.0 (domaine public) | https://www.rawpixel.com/image/5917348/image-frame-light-public-domain                  |
| `appartement-06.jpg` | Building Balcony                     | StockSnap.io | CC0 1.0 (domaine public) | https://stocksnap.io/photo/building-balcony-KQJG1TKMNJ                                  |
| `appartement-07.jpg` | Modern bathroom, house interior      | rawpixel.com | CC0 1.0 (domaine public) | https://www.rawpixel.com/image/6043329/photo-image-public-domain-room-interior          |
| `appartement-08.jpg` | Free apartment building image        | rawpixel.com | CC0 1.0 (domaine public) | https://www.rawpixel.com/image/5926811/photo-image-public-domain-windows-white          |
| `maison-01.jpg`      | white house garden                   | rawpixel.com | CC0 1.0 (domaine public) | https://www.rawpixel.com/image/5921823/photo-image-flowers-public-domain-house          |
| `maison-02.jpg`      | Stone house lawn                     | rawpixel.com | CC0 1.0 (domaine public) | https://www.rawpixel.com/image/5903486/photo-image-flowers-public-domain-tree           |
| `maison-03.jpg`      | Free house image                     | rawpixel.com | CC0 1.0 (domaine public) | https://www.rawpixel.com/image/5922266/photo-image-public-domain-tree-house             |
| `maison-04.jpg`      | Free beautiful real estate image     | rawpixel.com | CC0 1.0 (domaine public) | https://www.rawpixel.com/image/5914396/image-public-domain-trees-plants                 |
| `maison-05.jpg`      | Living Room Interior of House        | rawpixel.com | CC0 1.0 (domaine public) | https://www.rawpixel.com/image/5970065/living-room-interior-house                       |
| `maison-06.jpg`      | Modern white kitchen interior        | rawpixel.com | CC0 1.0 (domaine public) | https://www.rawpixel.com/image/6039071/photo-image-public-domain-minimal-wood           |
| `maison-07.jpg`      | Bedroom Clean                        | StockSnap.io | CC0 1.0 (domaine public) | https://stocksnap.io/photo/bedroom-clean-OE0F9BHXJQ                                     |
| `maison-08.jpg`      | Free dining room image               | rawpixel.com | CC0 1.0 (domaine public) | https://www.rawpixel.com/image/5904672/photo-image-flower-public-domain-minimal         |
| `villa-01.jpg`       | Free modern house, villa, swimming   | rawpixel.com | CC0 1.0 (domaine public) | https://www.rawpixel.com/image/5907779/photo-image-public-domain-free-cc0               |
| `villa-02.jpg`       | House pool, real estate              | rawpixel.com | CC0 1.0 (domaine public) | https://www.rawpixel.com/image/6023165/photo-image-public-domain-house-summer           |
| `villa-03.jpg`       | Swimming Pool House                  | rawpixel.com | CC0 1.0 (domaine public) | https://www.rawpixel.com/image/5916870/image-aesthetic-background                       |
| `villa-04.jpg`       | Modern house, real estate image      | rawpixel.com | CC0 1.0 (domaine public) | https://www.rawpixel.com/image/6018409/photo-image-aesthetic-public-domain-house        |
| `villa-05.jpg`       | Minimal square modern house          | rawpixel.com | CC0 1.0 (domaine public) | https://www.rawpixel.com/image/6042800/photo-image-public-domain-minimal-house          |
| `villa-06.jpg`       | Free Mediterranean house             | rawpixel.com | CC0 1.0 (domaine public) | https://www.rawpixel.com/image/5906917/free-mediterranean-house-public-domain-cc0-photo |
| `villa-07.jpg`       | Luxury bathroom interior             | rawpixel.com | CC0 1.0 (domaine public) | https://www.rawpixel.com/image/6043330/photo-image-public-domain-living-room            |
| `villa-08.jpg`       | Free minimalist living room interior | rawpixel.com | CC0 1.0 (domaine public) | https://www.rawpixel.com/image/5927077/photo-image-public-domain-minimalist-house       |

## Les fiches PDF (`public/demo/fiche-*.pdf`)

Fabriquées par `npm run demo:fiches` (Chromium, via Playwright) depuis le jeu de données, avec la
mise en page qu'attend le lecteur de fiche (« Vente - Appartement », « Honoraires à la charge du
vendeur », bloc « Surface habitable / Pièces », paires « Libellé : valeur », sections Prestations et
Surfaces, mention légale avec le DPE) et les photos du scénario en pleine page, pour « Déposer les
photos de la fiche ». Chaque page porte « DÉMONSTRATION — FICHE FICTIVE ». Un test
(`src/features/demo/demo-brochures.test.ts`) relit chaque PDF comme le navigateur le ferait et
vérifie ce que la fiche remplit.

## Les dossiers de chaque closer (partie B)

« Ma démo » (`/ma-demo`, au menu de l'agence de démo et sur « Bienvenue ») : « Préparer ma démo »
crée pour le closer connecté quatre dossiers marqués (`projects.demo_stage`), un par étape —
« À préparer » (Antibes, le bien à importer), « Prêt pour le Live » (Vence : cinq concurrents
importés, adresses confirmées, décision de prix), « Conclu, mandat signé » (Mougins : Live mené,
synthèse, concurrents à prospecter, courriers prêts, une adresse « Ne plus solliciter »), « À
relancer » (Antibes : conclu avec freins, une relance d'il y a huit jours, un concurrent qui a
baissé depuis). « Remettre ma démo à zéro », avec confirmation, supprime les siens (photos du
stockage comprises) et en recrée quatre ; les dossiers des autres closers ne bougent pas, la liste
« Ne plus solliciter » de l'agence reste. Tout passe par la clé service après le garde « agence
de démo », dans les mêmes tables et par les mêmes services que l'outil (`demo-seed.ts`,
`actions/demo-dossiers.ts`).

## Ce que Laurent fait (mission 114)

1. Créer le compte de l'agence de démo dans la console Supabase, l'ouvrir par `/onboarding` sous le
   nom « Agence Démo Côte d'Azur », puis la marquer « Agence de démonstration » dans `/erreurs`.
2. Créer un compte par closer dans cette agence (invitation, rôle conseiller).
