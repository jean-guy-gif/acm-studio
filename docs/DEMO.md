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
piscine à Mougins. Vraies communes, **rues inventées** (`DEMO_STREETS` : « allée des Cistes
Blancs », « chemin des Restanques Hautes »…), agences fictives (`DEMO_AGENCIES`), annonces sur
l'hôte réservé `annonces.demonstration.invalid` (RFC 2606 : il ne se résout jamais). Un test
(`src/features/demo/demo-dataset.test.ts`) vérifie qu'aucune rue réelle, aucune agence réelle,
aucun portail réel n'y figure, ni les anciens noms en jeux de mots (« allée du Décor »…).

Mission 147 (partie B) : les rues ont des noms crédibles de la Côte d'Azur, tous inventés. Chacun a
été cherché le 09/11/2026 dans la Base Adresse Nationale (`api-adresse.data.gouv.fr`, voies de
type `street`) dans les treize communes du jeu (Antibes, Vallauris, Biot, Villeneuve-Loubet, Vence,
Saint-Paul-de-Vence, La Colle-sur-Loup, Tourrettes-sur-Loup, Saint-Jeannet, Mougins,
Mouans-Sartoux, Valbonne, Le Cannet), et, pour les adresses de l'identité légale inventée, à Nice,
Cannes et Lyon 6e (10/11) : aucun n'y existe, même sous un autre type de voie. Écartés parce qu'ils
existent déjà dans l'une des communes : Arbousiers, Caroubiers, Lentisques, Agaves, Bigaradiers.

| Rue de la démo                  | Remplace (jeu de mots)   |
| ------------------------------- | ------------------------ |
| allée des Cistes Blancs         | allée des Trois Cadrans  |
| chemin des Restanques Hautes    | (gardée)                 |
| impasse du Moulin à Huile       | impasse de l’Essai       |
| rue du Vieux Pressoir           | rue de la Maquette       |
| avenue des Collines Douces      | avenue du Prototype      |
| traverse des Terrasses Fleuries | traverse des Exemples    |
| montée des Oliviers Bas         | montée de la Répétition  |
| boulevard des Palmiers Nains    | boulevard du Scénario    |
| chemin de la Source Haute       | chemin des Figurants     |
| allée des Orangers Amers        | allée du Décor           |
| rue des Jarres                  | rue du Brouillon         |
| placette du Lavoir Neuf         | place de la Fiction      |
| sentier des Genêts d’Or         | sentier de l’Exercice    |
| avenue des Tilleuls Hauts       | avenue de l’Entraînement |

L'agence concurrente « Azur Horizon Immobilier », trop proche d'« Agence Horizon Côte d'Azur »,
s'appelle « Brague Immobilier » (aucune entreprise ni agence à ce nom, vérifié le 09/11). Les
téléphones de la démo sont tous dans la plage 06 39 98, que l'ARCEP réserve à la fiction.

## Les photos (`public/demo/photos`)

Toutes libres de droits, sous licence **CC0 1.0** (domaine public : aucune attribution exigée,
usage commercial permis), trouvées par Openverse et rangées dans l'application en JPEG 1 024 px.
Aucune photo d'annonce réelle. Décision du 22/10 : « licences Unsplash ou Pexels » ; leurs
téléchargements automatisés étant fermés depuis le poste de travail, les photos viennent de deux
banques en CC0, plus permissive encore. À remplacer par des photos Unsplash ou Pexels si Laurent le
préfère : mêmes noms de fichiers, et ce tableau à mettre à jour.

Mission 147 (partie B, 10/11) : huit photos remplacées par des maisons, villas et rues de type
méditerranéen (les maisons américaines, bardage, brique, pelouse, sont parties) : `maison-01` à
`maison-04`, `villa-04`, `villa-05`, `appartement-06`, `appartement-08`. Mêmes banques, même
licence ; aucune façade reconnaissable d'un lieu nommé.

Mission 155 (13/11) : trois photos retirées, qui ne montraient pas un logement crédible :
`appartement-04` (des objets sur une table de chevet), `appartement-06` (une rue de village et ses
voitures), `appartement-08` (une tour qui n'est pas de la Côte d'Azur). Les biens d'Antibes se
partagent les quatre photos d'appartement qui restent jusqu'au lot des photos.

| Fichier              | Titre d'origine                       | Source       | Licence                  | Page d'origine                                                                          |
| -------------------- | ------------------------------------- | ------------ | ------------------------ | --------------------------------------------------------------------------------------- |
| `appartement-01.jpg` | Free modern living room interior      | rawpixel.com | CC0 1.0 (domaine public) | https://www.rawpixel.com/image/5915137/image-light-public-domain-plants                 |
| `appartement-02.jpg` | Free minimalist living room interior  | rawpixel.com | CC0 1.0 (domaine public) | https://www.rawpixel.com/image/5927318/photo-image-public-domain-minimalist-house       |
| `appartement-03.jpg` | Free modern kitchen interior image    | rawpixel.com | CC0 1.0 (domaine public) | https://www.rawpixel.com/image/5925293/photo-image-public-domain-kitchen-living-room    |
| `appartement-05.jpg` | Free living room interior design      | rawpixel.com | CC0 1.0 (domaine public) | https://www.rawpixel.com/image/5917348/image-frame-light-public-domain                  |
| `appartement-07.jpg` | Modern bathroom, house interior       | rawpixel.com | CC0 1.0 (domaine public) | https://www.rawpixel.com/image/6043329/photo-image-public-domain-room-interior          |
| `maison-01.jpg`      | white house greenish blue shutters    | rawpixel.com | CC0 1.0 (domaine public) | https://www.rawpixel.com/image/3291661/free-photo-image-building-cc0-countryside        |
| `maison-02.jpg`      | Sans titre (mas dans la lavande)      | rawpixel.com | CC0 1.0 (domaine public) | https://www.rawpixel.com/image/5942139/free-public-domain-cc0-photo                     |
| `maison-03.jpg`      | Free Italian house Tuscany photo      | rawpixel.com | CC0 1.0 (domaine public) | https://www.rawpixel.com/image/5920499/photo-image-public-domain-white-free             |
| `maison-04.jpg`      | Sans titre (villa ocre et palmiers)   | rawpixel.com | CC0 1.0 (domaine public) | https://www.rawpixel.com/image/6070200/free-public-domain-cc0-photo                     |
| `maison-05.jpg`      | Living Room Interior of House         | rawpixel.com | CC0 1.0 (domaine public) | https://www.rawpixel.com/image/5970065/living-room-interior-house                       |
| `maison-06.jpg`      | Modern white kitchen interior         | rawpixel.com | CC0 1.0 (domaine public) | https://www.rawpixel.com/image/6039071/photo-image-public-domain-minimal-wood           |
| `maison-07.jpg`      | Bedroom Clean                         | StockSnap.io | CC0 1.0 (domaine public) | https://stocksnap.io/photo/bedroom-clean-OE0F9BHXJQ                                     |
| `maison-08.jpg`      | Free dining room image                | rawpixel.com | CC0 1.0 (domaine public) | https://www.rawpixel.com/image/5904672/photo-image-flower-public-domain-minimal         |
| `villa-01.jpg`       | Free modern house, villa, swimming    | rawpixel.com | CC0 1.0 (domaine public) | https://www.rawpixel.com/image/5907779/photo-image-public-domain-free-cc0               |
| `villa-02.jpg`       | House pool, real estate               | rawpixel.com | CC0 1.0 (domaine public) | https://www.rawpixel.com/image/6023165/photo-image-public-domain-house-summer           |
| `villa-03.jpg`       | Swimming Pool House                   | rawpixel.com | CC0 1.0 (domaine public) | https://www.rawpixel.com/image/5916870/image-aesthetic-background                       |
| `villa-04.jpg`       | Pool Backyard (Vita Vilcina)          | StockSnap.io | CC0 1.0 (domaine public) | https://stocksnap.io/photo/pool-backyard-8512A55AD8                                     |
| `villa-05.jpg`       | Sans titre (maison de pierre, cyprès) | rawpixel.com | CC0 1.0 (domaine public) | https://www.rawpixel.com/image/5934664/free-public-domain-cc0-photo                     |
| `villa-06.jpg`       | Free Mediterranean house              | rawpixel.com | CC0 1.0 (domaine public) | https://www.rawpixel.com/image/5906917/free-mediterranean-house-public-domain-cc0-photo |
| `villa-07.jpg`       | Luxury bathroom interior              | rawpixel.com | CC0 1.0 (domaine public) | https://www.rawpixel.com/image/6043330/photo-image-public-domain-living-room            |
| `villa-08.jpg`       | Free minimalist living room interior  | rawpixel.com | CC0 1.0 (domaine public) | https://www.rawpixel.com/image/5927077/photo-image-public-domain-minimalist-house       |

## Les jeux de photos, un dossier par bien (mission 155)

Décision de Jean-Guy (13/11) : toutes les photos d'un bien montrent **le même bien**, et aucune
photo n'est partagée entre deux biens. Les photos ci-dessus, partagées par famille, sont
remplacées bien par bien ; tant qu'un bien n'a pas son jeu, il garde ses photos d'avant.

### Où déposer un jeu

Un dossier par bien : `public/demo/photos/<bien>/`. Le nom du dossier est donné par la fiche du
bien (`mandat-mougins-villa`, `mandat-antibes-appartement`… ; une annonce du marché prend son
identifiant, `mou-02`). Déposer le jeu complet dans son dossier suffit : la liste des photos est
relue avant chaque compilation et chaque test (`npm run demo:photos`), rien d'autre à toucher.

### Le format

- **JPEG**, sRGB, **1 600 × 1 200 px** (4:3, paysage), qualité 80 environ, **400 Ko au plus**
  par photo, sans métadonnées (aucune position GPS).
- **Noms** : `01-facade.jpg`, `02-sejour.jpg`, `03-cuisine.jpg`… — deux chiffres, un tiret, la
  vue en minuscules, sans accent, mots séparés par des tirets. Les numéros se suivent à partir de
  01 et donnent l'ordre d'affichage ; **la photo 01 est la photo principale** (la miniature
  partout : cartes, grille, Live, documents).
- **3 à 6 photos** : 5 à 6 pour un mandat, 3 au moins pour une annonce du marché.
- Les tests refusent un jeu hors format (nom, nombre, numéros, taille, poids) et un dossier qui
  n'est pas celui d'un bien connu.

### Ce qu'aucune photo ne montre

Aucune personne reconnaissable, aucune marque ni plaque d'immatriculation lisible, aucun numéro
ni nom de rue, aucun lieu célèbre reconnaissable, aucun texte ni filigrane. Dans un même jeu : la
même saison et la même lumière, les mêmes matériaux d'une pièce à l'autre (sol, menuiseries,
façade), et un extérieur qui est bien celui de la façade.

### Le registre

Une ligne par jeu déposé, exigée par les tests : le dossier, la source, l'auteur, la licence et
la date de téléchargement (JJ/MM/AAAA).

| Dossier                       | Bien                                  | Source                                                                                                                                                                                                                       | Auteur                 | Licence                                                                                                                  | Téléchargé le |
| ----------------------------- | ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------- |
| `mandat-mougins-villa/`       | la villa de M. Lefebvre, Mougins      | Images générées par IA avec Runway (compte Start-academia), d'après la fiche photo ci-dessous : façade le 13/11/2026, autres vues le 14/11/2026 (séjour, cuisine, chambre, salle de bains et jardin régénérés le 14/11/2026) | Start Academy (Runway) | Conditions d'usage de Runway (« Usage rights », https://help.runwayml.com/hc/en-us/articles/18927776141715-Usage-rights) | 14/11/2026    |
| `mandat-antibes-appartement/` | l'appartement de Mme Ferrand, Antibes | Images générées par IA avec Runway (compte Start-academia), d'après la fiche photo ci-dessous : façade le 13/11/2026, autres vues le 14/11/2026 (séjour, terrasse et salle de bains régénérés le 14/11/2026)                 | Start Academy (Runway) | Conditions d'usage de Runway (« Usage rights », https://help.runwayml.com/hc/en-us/articles/18927776141715-Usage-rights) | 14/11/2026    |

### Fiche — `mandat-mougins-villa` · la villa de M. Lefebvre (mandat signé)

- **Le bien** : villa de 7 pièces, 210 m² sur deux niveaux, terrain de 1 800 m², piscine,
  quatre chambres dont une suite, trois salles de bains, garage double. Mougins, quartier des
  Collines, au calme sur un coteau, exposée plein sud. Prix de commercialisation 1 639 500 €.
- **Époque et style** : construite en 2008, provençale contemporaine — volumes simples, toiture
  en tuiles canal avec génoises, grandes baies vitrées.
- **Matériaux** : enduit ocre clair (beige rosé), volets bois gris-vert, menuiseries alu
  anthracite ; dedans, sol en pierre claire (travertin) partout, murs blancs, cheminée moderne
  dans le séjour ; cuisine blanche, îlot central, plan de travail clair.
- **Standing** : haut de gamme, sans ostentation ; état excellent.
- **Extérieur** : jardin en restanques (oliviers, lavandes, pins parasols, haie de cyprès),
  piscine de 12 × 5 m bordée de pierre claire, terrasse couverte d'une pergola ; collines boisées
  au loin, aucune autre maison au premier plan, pas de vue mer.
- **Lumière** : fin d'après-midi, en juin.
- **Les 6 vues attendues** :
  1. `01-facade.jpg` — la villa vue du jardin, la piscine au premier plan (photo principale) ;
  2. `02-sejour.jpg` — le séjour, la cheminée, les baies ouvertes sur la terrasse ;
  3. `03-cuisine.jpg` — la cuisine ouverte et son îlot ;
  4. `04-chambre.jpg` — la suite parentale, une baie sur le jardin ;
  5. `05-salle-de-bain.jpg` — double vasque, douche à l'italienne ;
  6. `06-jardin.jpg` — la terrasse couverte et le jardin en restanques, les collines au loin.

### Fiche — `mandat-antibes-appartement` · l'appartement de Mme Ferrand (mandat signé)

Un nouveau mandat du lot 1 (`FERRAND_SUBJECT`, `src/features/demo/data/seed-subjects.ts`).

- **Le bien** : appartement de 3 pièces, 74 m², deux chambres, une salle de bains, au 4e et
  dernier étage avec ascenseur, terrasse de 18 m² exposée sud-ouest, parking en sous-sol et cave.
  Antibes, quartier de la Salis, à quelques minutes à pied des plages. DPE C. Prix de
  commercialisation 439 000 €.
- **Époque et style** : résidence de 1972, façades refaites en 2020 ; appartement rénové en 2022,
  sobre et clair.
- **Matériaux** : façade en enduit blanc cassé, balcons filants, garde-corps métal blanc ;
  dedans, grès cérame clair effet pierre dans toutes les pièces, murs blancs, menuiseries alu
  blanches ; cuisine ouverte blanc mat, plan de travail chêne clair ; salle de bains en faïence
  blanche, douche à l'italienne vitrée.
- **Standing** : bon standing, sans luxe.
- **Extérieur** : la terrasse, une table et deux chaises, des pots d'agrumes ; la mer au loin
  au-dessus des pins (vue partielle, pas un panorama), aucun lieu reconnaissable ; jardin commun
  de la résidence planté de pins parasols.
- **Lumière** : matin ensoleillé, au printemps.
- **Les 6 vues attendues** :
  1. `01-facade.jpg` — la résidence vue de son jardin, les pins parasols (photo principale) ;
  2. `02-sejour.jpg` — le séjour ouvert sur la terrasse par une baie vitrée ;
  3. `03-terrasse.jpg` — la terrasse et la vue mer partielle au-dessus des pins ;
  4. `04-cuisine.jpg` — la cuisine ouverte sur le séjour ;
  5. `05-chambre.jpg` — la chambre principale ;
  6. `06-salle-de-bain.jpg` — la salle de bains et sa douche à l'italienne.

### Fiche — `mandat-vence-maison` · la maison de M. et Mme Lopez (mandat signé)

- **Le bien** : maison de 5 pièces, 135 m² sur deux niveaux, terrain de 900 m², quatre chambres,
  deux salles de bains, terrasse plein sud, garage, sans piscine. Vence, quartier de la Sine, sur
  les hauteurs. Prix de commercialisation 713 000 €.
- **Époque et style** : construite en 1994, maison provençale traditionnelle — toiture en tuiles
  canal, génoises, volets bois, une tonnelle sur la terrasse.
- **Matériaux** : enduit jaune paille, volets bleu lavande, menuiseries bois ; dedans, tomettes
  rouges anciennes au rez-de-chaussée, parquet clair à l'étage, poutres apparentes dans le séjour,
  cheminée en pierre ; cuisine en bois clair, plan de travail carrelé.
- **Standing** : bon, familial, entretenu ; sans luxe.
- **Extérieur** : jardin plat engazonné, oliviers et un figuier, haie de lauriers ; terrasse sous
  tonnelle de vigne ; les Baous au loin (sans relief reconnaissable), pas de piscine.
- **Lumière** : matin, à la fin du printemps.
- **Les 6 vues attendues** :
  1. `01-facade.jpg` — la maison vue du jardin, la terrasse et sa tonnelle (photo principale) ;
  2. `02-sejour.jpg` — le séjour, la cheminée et les poutres ;
  3. `03-cuisine.jpg` — la cuisine en bois clair ;
  4. `04-chambre.jpg` — une chambre à l'étage, parquet clair ;
  5. `05-salle-de-bain.jpg` — la salle de bains, baignoire et faïence claire ;
  6. `06-jardin.jpg` — le jardin, les oliviers et le figuier.

### Fiche — `mandat-juan-les-pins-appartement` · l'appartement de M. et Mme Delmas (mandat signé)

- **Le bien** : appartement de 3 pièces, 65 m², deux chambres, une salle de bains, au 2e étage
  avec ascenseur, balcon de 8 m² exposé sud, place de parking extérieure. Juan-les-Pins (Antibes),
  à quelques minutes à pied des plages. DPE D. Prix de commercialisation 395 000 €.
- **Époque et style** : résidence de 1988, quatre étages, balcons filants ; appartement en bon
  état, à rafraîchir par endroits.
- **Matériaux** : façade en enduit rose saumon, garde-corps en fer forgé blanc, stores bannes
  rayés ; dedans, carrelage beige 45 × 45, murs blancs, menuiseries PVC blanches ; cuisine
  séparée en mélaminé blanc ; salle de bains avec baignoire, faïence bleu pâle.
- **Standing** : moyen, propre et lumineux.
- **Extérieur** : le balcon, deux chaises et une petite table, des palmiers de la résidence ; pas
  de vue mer, la rue n'est pas lisible.
- **Lumière** : milieu de journée, en été.
- **Les 5 vues attendues** :
  1. `01-facade.jpg` — la résidence vue du parking, les palmiers (photo principale) ;
  2. `02-sejour.jpg` — le séjour ouvert sur le balcon ;
  3. `03-cuisine.jpg` — la cuisine séparée ;
  4. `04-chambre.jpg` — la chambre principale ;
  5. `05-balcon.jpg` — le balcon et sa petite table.

### Fiche — `mandat-villeneuve-loubet-appartement` · l'appartement de Mme Perrin (mandat signé)

- **Le bien** : appartement de 3 pièces, 62 m², deux chambres, une salle d'eau, au 1er étage
  d'une petite résidence de trois étages sans ascenseur, balcon exposé est, box fermé.
  Villeneuve-Loubet, près du village. DPE D. Prix de commercialisation 349 000 €.
- **Époque et style** : résidence de 1995, toits en tuiles, aspect de petit immeuble provençal ;
  appartement en bon état.
- **Matériaux** : enduit ocre clair, volets roulants, garde-corps métal vert sombre ; dedans,
  sol stratifié chêne clair, murs blancs ; cuisine ouverte en blanc et bois ; salle d'eau avec
  douche, faïence grise.
- **Standing** : simple et soigné ; un premier achat.
- **Extérieur** : le balcon donnant sur les arbres de la résidence et les collines ; pas de vue
  mer.
- **Lumière** : matin, à l'automne.
- **Les 5 vues attendues** :
  1. `01-facade.jpg` — la petite résidence et son jardin (photo principale) ;
  2. `02-sejour.jpg` — le séjour et la cuisine ouverte ;
  3. `03-chambre.jpg` — une chambre ;
  4. `04-salle-d-eau.jpg` — la salle d'eau et sa douche ;
  5. `05-balcon.jpg` — le balcon sur les arbres.

### Fiche — `mandat-la-colle-sur-loup-maison` · la maison de M. et Mme Garnier (mandat signé)

- **Le bien** : maison de 5 pièces, 145 m² sur deux niveaux, terrain de 1 100 m², piscine, quatre
  chambres, deux salles de bains, terrasse exposée sud, garage. La Colle-sur-Loup, sur les
  hauteurs, au calme. DPE C. Prix de commercialisation 785 000 €.
- **Époque et style** : construite en 2002, néo-provençale — toiture en tuiles canal, un
  pigeonnier, larges ouvertures.
- **Matériaux** : enduit ocre rosé, volets bois vert amande, menuiseries bois ; dedans, grand
  carrelage beige effet pierre au rez-de-chaussée, parquet chêne à l'étage ; cuisine ouverte
  blanche, îlot en bois ; salle de bains en carreaux de ciment gris.
- **Standing** : bon standing, familial.
- **Extérieur** : piscine de 10 × 4 m bordée de dalles claires, pelouse, oliviers et lavandes,
  terrasse couverte d'une pergola en bois ; vue sur les collines boisées.
- **Lumière** : fin d'après-midi, en été.
- **Les 6 vues attendues** :
  1. `01-facade.jpg` — la maison et la piscine, vues du jardin (photo principale) ;
  2. `02-sejour.jpg` — le séjour ouvert sur la terrasse ;
  3. `03-cuisine.jpg` — la cuisine et son îlot en bois ;
  4. `04-chambre.jpg` — une chambre à l'étage, parquet chêne ;
  5. `05-salle-de-bain.jpg` — la salle de bains en carreaux de ciment ;
  6. `06-terrasse.jpg` — la terrasse sous la pergola, les collines au loin.

### Fiche — `mandat-saint-paul-de-vence-maison` · la maison de Mme Navarro (mandat signé)

- **Le bien** : maison de plain-pied, 4 pièces, 118 m², terrain de 1 400 m², trois chambres, deux
  salles de bains, terrasse exposée sud, abri pour deux voitures, sans piscine.
  Saint-Paul-de-Vence, dans les collines, loin du village et de ses remparts (jamais visibles).
  DPE C. Prix de commercialisation 705 000 €.
- **Époque et style** : construite en 1985, rénovée ; une maison basse, en longueur, sous un toit
  de tuiles anciennes.
- **Matériaux** : murs en pierre sèche et enduit blanc cassé, volets gris clair ; dedans, sol en
  pierre claire, murs blancs, plafonds bas ; cuisine rénovée en gris clair ; salles de bains
  modernes, douche à l'italienne.
- **Standing** : bon, calme, pratique ; pensé pour une vie de plain-pied.
- **Extérieur** : terrasse dallée, jardin en pente douce, oliviers et chênes verts, potager en
  carrés ; vue dégagée sur les collines, aucune maison au premier plan.
- **Lumière** : matin ensoleillé, à l'automne.
- **Les 6 vues attendues** :
  1. `01-facade.jpg` — la maison de plain-pied et sa terrasse (photo principale) ;
  2. `02-sejour.jpg` — le séjour, de plain-pied sur la terrasse ;
  3. `03-cuisine.jpg` — la cuisine rénovée ;
  4. `04-chambre.jpg` — une chambre ouverte sur le jardin ;
  5. `05-salle-de-bain.jpg` — la salle de bains, douche à l'italienne ;
  6. `06-jardin.jpg` — le jardin, les oliviers et les collines.

### Fiche — `mandat-valbonne-villa` · la villa de M. et Mme Castel (mandat signé)

- **Le bien** : villa de 6 pièces, 195 m² sur deux niveaux, terrain de 2 300 m², piscine, quatre
  chambres, trois salles de bains, garage double. Valbonne, dans la campagne boisée. DPE C. Prix
  de commercialisation 1 590 000 €.
- **Époque et style** : construite en 1992, rénovée en 2019 — une bastide moderne : volumes
  carrés, toit en tuiles, grandes baies refaites.
- **Matériaux** : enduit blanc cassé, pierre apparente aux angles, menuiseries alu noires,
  volets bois naturel ; dedans, béton ciré clair, murs blancs, poutres blanchies ; cuisine noire
  mate, îlot en marbre blanc ; salles de bains en pierre grise.
- **Standing** : haut de gamme, contemporain.
- **Extérieur** : piscine à débordement de 12 × 5 m, plage en bois, pins et chênes autour, pelouse,
  une terrasse couverte ; forêt au loin, aucun voisin visible.
- **Lumière** : fin de matinée, en été.
- **Les 6 vues attendues** :
  1. `01-facade.jpg` — la villa et sa piscine (photo principale) ;
  2. `02-sejour.jpg` — le séjour en béton ciré, les grandes baies ;
  3. `03-cuisine.jpg` — la cuisine noire et l'îlot en marbre ;
  4. `04-chambre.jpg` — la suite parentale ;
  5. `05-salle-de-bain.jpg` — la salle de bains en pierre grise ;
  6. `06-piscine.jpg` — la piscine et le jardin boisé.

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
`services/demo-dossiers.ts`).

Mission 147 (partie B) : la préparation et la remise à zéro se font en étapes courtes, appelées
l'une après l'autre par l'écran (`actions/demo-setup.ts`) : supprimer puis recompter à zéro, chacun
des six dossiers, les neuf acquéreurs, vérifier. La barre dit « Dossier 4 sur 6 » ; « Votre démo est
prête » ne s'affiche que si la base relue compte six dossiers (un par étape attendue, deux mandats
signés) et neuf acquéreurs, sinon le message dit ce qui manque, avec « Recommencer ». Une lecture
en échec n'est jamais une absence. Toutes les dates partent du jour de la remise à zéro (prouvé par
`demo-relative-dates.test.ts`). L'agence reçoit un logo inventé (`public/demo/logo-horizon-*.svg`,
tracé en chemins depuis Montserrat, licence OFL) si elle n'en a aucun, et le closer le téléphone
06 39 98 00 01 s'il n'en a pas (ou l'ancien 06 00 00 00 01).

## Ce que Laurent fait (mission 114)

1. Créer le compte de l'agence de démo dans la console Supabase, l'ouvrir par `/onboarding` sous le
   nom « Agence Démo Côte d'Azur », puis la marquer « Agence de démonstration » dans `/erreurs`.
2. Créer un compte par closer dans cette agence (invitation, rôle conseiller).
