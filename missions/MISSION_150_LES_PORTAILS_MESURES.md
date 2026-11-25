# Mission 150 — Les portails, mesurés

Demande de Jean-Guy (10/11), après le diagnostic en lecture seule des portails : seuls SeLoger et
Bien'ici servent en vrai. Petite mission, sans nouveau site ni modification de l'extension.

1. Mesurer dans le vrai Chrome de Jean-Guy, avec l'extension, sur une vraie annonce et une vraie
   recherche de chaque site : l'import par adresse collée (Green Acres, Maisons & Appartements,
   Figaro) et « Ouvrir / Lire mes recherches » (SeLoger, Maisons & Appartements, Green Acres).
2. Un site qui ne marche pas n'est plus proposé à l'écran. « Ouvrir mes recherches » ne montre que
   les portails qui s'ouvrent vraiment filtrés.
3. Si réparer SeLoger dans « Ouvrir mes recherches » prend moins d'une demi-journée, le proposer ;
   sinon, le noter dans `docs/IDEES.md`.

## 1. Les mesures (10/11, Chrome de Jean-Guy, extension 1.0.0, production, son agence)

Un dossier « TEST mesure portails » (maison, 5 pièces, 140 m², Vence 06140, 650 000 – 850 000 €),
archivé après la mesure ; aucun concurrent enregistré.

| Fonction | Site | Résultat | Pourquoi |
|---|---|---|---|
| Import par adresse collée | Green Acres | **Marche** | Titre, prix, prix au m², surface, pièces, chambres, salles de bains, ville, description, délai, photos ; le DPE manque |
| Import par adresse collée | Maisons & Appartements | **Marche** | Titre, prix, surface, pièces, ville, DPE, description, 8 photos |
| Import par adresse collée | Figaro Immobilier | **Ne marche pas** | La page est lue, mais ni le prix ni la surface (affichés « 495 000 € » et « 190 m² », jusque dans le titre de la page) : le format de la page a changé depuis la page de test du 07/10 (M76). Sans prix, un concurrent ne sert à rien |
| Ouvrir mes recherches | Bien'ici | **Marche, filtré** | Ouvert filtré ; la lecture demande un clic sur l'onglet, resté sur l'écran d'attente du portail (connu, M69) |
| Ouvrir mes recherches | SeLoger | **Ne s'ouvre pas filtré** | Sans identifiant de commune, ACM ouvre la page de la commune, que SeLoger redirige vers son nouveau format : l'identifiant est désormais dans le chemin (`…/vence-06140/ad08fr2109`), ACM le cherche dans `?locations=` et ne l'apprend jamais. L'adresse filtrée qu'ACM construit marche avec cet identifiant (`AD08FR2109` : maisons, 5 pièces, 650 000 – 850 000 €, mesuré) |
| Lire mes recherches | SeLoger | Marche, sans filtre | 30 annonces lues sur la page de la commune (prix, surface, pièces), tous types et tous prix |
| Ouvrir mes recherches | Maisons & Appartements | **Ne marche pas** | La page de la commune qu'ACM ouvre redirige vers l'accueil du site : cette adresse n'existe plus. La recherche filtrée (`Search.php?villes=`) marche (56 maisons mesurées à Nice), mais l'identifiant n'est jamais appris |
| Lire mes recherches | Maisons & Appartements | Ne lit rien | L'onglet est sur l'accueil |
| Ouvrir mes recherches | Green Acres | **Ne s'ouvre pas filtré** | ACM ouvre la page de la commune, sans filtre (193 maisons) ; son adresse ne porte pas l'identifiant (`city_7098`, présent dans la page) : jamais appris. L'adresse filtrée qu'ACM construit marche (60, 9, 14 biens selon les filtres, mesuré) |
| Lire mes recherches | Green Acres | Marche, sans filtre | 24 annonces lues sur la page de la commune |

La table des identifiants de commune appris (`portal_place_ids`) est vide, avant comme après la
lecture.

## 2. Ce qui change

- **« Ouvrir mes recherches »** n'ouvre que les portails dont l'adresse est vraiment filtrée :
  Bien'ici toujours ; SeLoger, Maisons & Appartements et Green Acres seulement quand l'identifiant
  de la commune est connu. La ligne « Première recherche à … : réglez la commune une fois » et la
  page de commune non filtrée disparaissent. « Lire mes recherches » lit toujours tout onglet de
  recherche ouvert sur les quatre portails, y compris ceux que le conseiller ouvre lui-même.
- **Une adresse Figaro collée est refusée**, à l'écran comme au serveur, avec un message qui dit de
  saisir le bien à la main. Figaro reste dans la recherche payante (décision de Jean-Guy, 10/11) :
  quand sa page ne se lit pas, le concurrent se crée depuis les données de la recherche (M101), le
  résultat reste juste, et les annonces publiées seulement sur Figaro ne sont pas perdues.
  L'extension garde son accès au site (elle n'est pas modifiée).

## 3. SeLoger, réparé (option (b) de Jean-Guy, 10/11)

- ACM apprend l'identifiant de la commune dans la nouvelle adresse de SeLoger
  (`/recherche/…/vence-06140/ad08fr2109`, écrit `AD08FR2109`), quand les cartes lues confirment la
  commune du bien (M69).
- Tant qu'il ne le connaît pas, « Ouvrir mes recherches » ouvre SeLoger une fois sur la page de la
  commune, et le dit : « SeLoger — première fois à Vence, sans filtre ». « Lire mes recherches »
  apprend alors l'identifiant ; la fois suivante, SeLoger s'ouvre filtré.

## Hors périmètre

Aucun nouveau site ; aucune modification de l'extension ; la réparation du lecteur de Figaro et
celle de Maisons & Appartements et Green Acres dans « Ouvrir mes recherches » (notées dans
`docs/IDEES.md`).
