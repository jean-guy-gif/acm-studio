# MISSION 113 — La synthèse qui convainc

**Date** : 21/10/2026 · **Origine** : retours de Laurent après un vrai rendez-vous, le 21/10.
1. « Quand on choisit le bien le plus dangereux, à la fin, il faut pouvoir revoir les photos et les
   caractéristiques si on a oublié le bien en question avec le client. »
2. « La synthèse client est horrible. » Modèle fourni : le dossier « Villa Biot » (11 pages,
   `missions/maquettes/M113-modele-villa-biot.pdf`). Synthèse actuelle, une page de lignes de texte :
   `missions/maquettes/M113-synthese-actuelle.pdf`. Ces deux fichiers servent de référence et ne se
   commitent pas (le premier contient de vraies annonces).

Deux parties, **une branche et un `/valide` par partie**, A puis B. Pas de push forcé.
`npm run sauvegarde` avant toute migration. **Pas de `/valide` tant que l'e2e de l'essai n'est pas vert.**
La mission 112 partie B peut attendre : celle-ci passe avant, à la demande de Laurent.

## Commencer par un inventaire, sans rien coder

Dire en une ligne : ce qu'affiche aujourd'hui l'écran « Le concurrent le plus dangereux » ; ce que lit la
synthèse (`load-seller-synthesis.ts`, `seller-synthesis-document.tsx`) ; où sont les photos du bien
vendeur et celles des concurrents, et comment le Live les sert. Proposer la maquette de la synthèse
(une capture par page, sur le dossier d'exemple) et attendre l'accord de Laurent avant de la coder.

## Partie A — Revoir un concurrent avant de désigner le plus dangereux

1. Sur l'écran « Le concurrent le plus dangereux », chaque concurrent montré au Live porte « Revoir ».
   Il ouvre, en plein écran du Live, sa fiche : ses photos (comme à son écran), la grille comparée avec le
   bien du vendeur (M40, M80) et, s'il a été révélé, son prix affiché, son prix au m² et sa durée en vente.
2. Un concurrent jugé « Non » se revoit aussi, mais sans aucun prix ni durée : ils n'ont jamais été
   révélés (M41, M104).
3. « Fermer » revient à l'écran du plus dangereux, sans rien changer. Revoir n'écrit rien : aucune
   réponse, aucun prix, aucun écran gardé par l'appareil.
4. Le concurrent se nomme toujours par son libellé neutre : ni titre, ni adresse, ni lien, ni « Vendu par »
   (M107). Le test « jamais côté vendeur » couvre la fiche « Revoir ».
5. Tablette : la fiche tient en 768 × 1024 et en 1024 × 768, sans défilement de côté (M72).

## Partie B — La synthèse raconte le rendez-vous

### Le fond : le rendez-vous, dans l'ordre du Live

**Le dossier Villa Biot est un modèle de FORME, pas de contenu** (Laurent, 21/10) : « l'objectif, c'est
que le dossier représente vraiment le rendez-vous ». La synthèse suit donc l'ordre des écrans du Live
(`build-live-pages.ts`) et dit, à chaque étape, ce qui a été montré ET ce que le vendeur a répondu
(décision de Laurent, 21/10). Elle ne contient rien qui n'ait pas eu lieu pendant le rendez-vous.

**De la forme Biot, on reprend** : couverture en pleine photo, grands titres numérotés, chiffres clés en
cartes, barres de prix au m², fiches deux par page, encadré « le point à retenir », pied de page daté et
paginé. Couleurs et police de l'agence (M55, M57), pas celles du modèle.

**On retire** : la page de plan d'action du modèle (« Transformer l'analyse en décision », « revoir sous
21 jours »), et tout texte rédigé qui n'est pas tiré du rendez-vous (« atouts affichés », « risque
concurrentiel »).

**Une photo par concurrent** (décision de Laurent, 21/10), en connaissance du risque : ces photos
appartiennent à leurs auteurs. Le conseiller peut la retirer (critère 17).

### Les pages, dans l'ordre du rendez-vous

6. **Couverture** : la photo principale du bien vendeur (M87), « Notre rendez-vous du [date] », le type et
   la commune (« Maison · Biot »), et trois chiffres : le prix de commercialisation convenu, la surface
   habitable, les pièces et chambres. Sans photo du bien : un aplat à la couleur de l'agence.
7. **01 · Votre bien** (écran « Votre bien ») : jusqu'à trois photos, la grille de caractéristiques
   (surface, terrain pour une maison, pièces · chambres, extérieurs, DPE · GES) et « Ses atouts », repris
   des « Points forts » de la fiche (M44). Puis la carte « Votre valeur perçue en début de rendez-vous »
   (écran « Votre valeur perçue »). Jamais la fourchette du conseiller ni les points de vigilance.
8. **02 · Les biens que nous avons regardés ensemble** : une fiche par concurrent montré au Live, dans
   l'ordre du Live, deux par page. Chaque fiche reprend ses écrans :
   - sa photo, son libellé neutre (« Maison · 5 pièces · 305 m² · Mougins »), la grille comparée avec le
     bien du vendeur (M40 : avantage, équivalent, faiblesse) ;
   - « Un sérieux concurrent ? » : la réponse du vendeur ;
   - s'il a répondu oui : « Le prix que vous imaginiez » face au « Prix affiché », avec l'écart en % (celui
     du Live, M96), le prix au m², puis, si l'étape a eu lieu, la durée imaginée face à la durée en vente et
     les baisses de prix connues ;
   - s'il a répondu non : « Pas un concurrent pour vous », sans aucun prix ni durée (jamais révélés).
   Un concurrent hors Live (M110) n'y figure pas. Une donnée absente n'a pas de case (jamais « — »).
9. **03 · Le DPE face au marché** (seulement si l'écran a eu lieu, M80) : le repère, la position du bien
   vendeur, sans montant.
10. **04 · Le concurrent le plus dangereux, selon vous** : rappel de sa fiche (photo, libellé, prix
    affiché). Absent si le vendeur n'en a pas désigné.
11. **05 · Après avoir vu le marché** : « Au début : 350 000 € → Après avoir vu le marché : 325 000 € »
    (M94), ou le seul premier chiffre s'il a passé l'écran. En une ligne, le bilan de ses devinettes, avec
    les mots du Suivi (M96) : « Vous avez sous-estimé 4 concurrents sur 6, de 6 % en moyenne ».
12. **06 · L'analyse des prix** (écran « Analyse des prix ») : la bande des prix affichés des concurrents
    révélés, avec ses deux repères (prix de départ, prix après le marché) ; le prix médian, « Baisse de
    prix connue : N sur M », l'ancienneté médiane ; les barres de prix au m², du moins cher au plus cher,
    avec la médiane ; « Prix des concurrents » (« Calculé sur 8 concurrents, dont 6 vus ensemble », M112)
    et « Analyse du conseiller ». « Le point à retenir » est la justification écrite par le conseiller dans
    sa décision de prix ; sans justification, l'encadré n'existe pas.
13. **07 · Sur quel prix partons-nous ?** : le prix de commercialisation convenu ensemble, son prix au m²,
    et la phrase de position du Live (« le 3e moins cher sur 7 », M94). Tous les montants sont ceux figés à
    la conclusion (M111).
14. **Dernière page, en bas** : « Les prix cités sont ceux des annonces, pas des prix de vente. Surfaces et
    caractéristiques telles qu'annoncées, à vérifier. » Puis le conseiller (nom, téléphone, e-mail, photo,
    QR de sa carte de contact, M84) et les mentions de l'agence (M102).

Ne figurent pas : la note « Prêt à lancer » de 1 à 10 et « ce qui manquerait pour être à 10 » (côté
conseiller, M85), les freins et le motif de relance (M110), le nom du vendeur ailleurs qu'en « Pour [prénom] ».

### Les règles qui ne bougent pas

15. Jamais côté vendeur : ni titre, ni adresse, ni lien ou QR vers une annonce, ni « Vendu par », ni
    exclusivité, ni nom d'agence concurrente dans le texte (M75, M83, M107) ; ni la fourchette du
    conseiller ; jamais le mot « estimation ». Le test « jamais côté vendeur » de la synthèse couvre toutes
    les pages, titre piège de la M107 compris.
16. Tout ce que dit la synthèse vient des réponses figées du Live (M92, M96) et des montants figés à la
    conclusion (M111) : elle ne se recalcule pas après le rendez-vous.
17. Sur l'écran conseiller de la synthèse, chaque concurrent porte « Sans photo » : décoché par défaut, il
    retire sa photo du document et du lien.
18. La photo d'un concurrent est celle que montre le Live, telle quelle (M58). Elle n'est pas copiée dans
    le stockage. Une photo qui ne se charge pas laisse un cadre gris, à l'écran comme à l'impression (M87).
19. Les photos du bien vendeur passent par des liens signés à chaque ouverture de la page publique.
20. Impression A4 : une section par page, fiches deux par page sans coupure, pied de page « Étude
    confidentielle · [commune] · [date] » et numéro de page. La page publique a la même mise en page,
    lisible sur téléphone. Le lien, son expiration et son retrait ne changent pas (M110).
21. `/confidentialite` dit que la synthèse reprend les réponses du vendeur pendant le rendez-vous et une
    photo de chaque concurrent tirée de son annonce, que le conseiller peut retirer. Texte nouveau signalé
    pour la relecture juridique.

## Preuves

22. Migration seulement si « Sans photo » doit être gardé en base ; soumise avant d'être appliquée, avec
    comptage avant et après.
23. Tests :
    - « Revoir » : rien n'est écrit, aucun prix pour un « Non », libellé neutre ;
    - synthèse : pages dans l'ordre du Live, réponses du vendeur fidèles aux réponses figées, un « Non »
      sans prix, un concurrent hors Live absent, cases absentes sans « — », « Sans photo » respecté sur le
      lien et l'impression, aucun interdit côté vendeur sur toutes les pages, liens signés ;
    - vocabulaire étendu aux nouveaux textes.
24. `npm run e2e` vert, tablette comprise, à chaque partie : l'e2e ouvre « Revoir » sur l'écran du plus
    dangereux, puis la synthèse, et vérifie la présence des fiches de concurrents.

## Décisions à respecter

- M40, M41, M51, M58, M72, M80 (Live) ; M75, M83, M107 (rien de trop devant le vendeur) ; M89 et M111
  (vocabulaire et prix figés) ; M110 (lien de 30 jours, colonnes autorisées) ; M102 (mentions).
- Jamais « estimation » à l'écran ; l'outil n'estime jamais un bien.
- On ne modifie ni `extension/` ni le Localisateur.

## Hors périmètre

- Les P2 de la mission 112 partie B.
- Toute analyse rédigée automatiquement sur les concurrents (« atouts », « risque concurrentiel ») :
  seuls les faits et les réponses du rendez-vous figurent dans la synthèse.

## Essai sur l'URL d'essai

- **A** : sur le dossier d'exemple, à l'écran « Le concurrent le plus dangereux », ouvrir « Revoir » sur un
  concurrent révélé (photos, grille, prix), puis sur un « Non » (aucun prix). Fermer : rien n'a changé.
- **B** : mener le dossier d'exemple avec un « Non » et un concurrent désigné le plus dangereux, conclure,
  ouvrir la synthèse : elle suit le rendez-vous écran par écran, avec les réponses données. L'imprimer en
  PDF et comparer la FORME au dossier Villa Biot ; cocher « Sans photo » sur un concurrent et rouvrir le lien.
- Ensuite, demander à Claude Code de retirer les données de test, avec comptage avant et après.
