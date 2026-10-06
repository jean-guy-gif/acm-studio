# Décisions produit

Une ligne par décision : date · mission · décision. Sources : les missions 37 à 70 et les messages
de commit (missions 61 à 70, essai Stream Estate fusionné le 05/10). Une décision remplacée
disparaît ; la plus récente le note (« remplace Mxx »). `/valide NN` ajoute ici les décisions de
chaque mission validée.

## Préparation

- 28/08 · M37 · Photos du bien vendeur : bucket privé, URL signées de courte durée, JPEG/PNG/WebP vérifiés côté serveur ; retirer une photo supprime le fichier ; aucune photo par défaut.
- 28/08 · M38 · Le conseiller ne ressaisit rien : il importe l'annonce en ligne ou la fiche commerciale PDF du bien, puis relit la fiche pré-remplie avant d'enregistrer.
- 28/08 · M38 · Un prix lu sur une annonce ou une fiche s'affiche « pour information » : il n'écrit aucun champ et ne pré-remplit jamais la fourchette.
- 28/08 · M38 · La fourchette du conseiller se saisit juste après l'import ; elle cible la recherche de concurrents et n'apparaît jamais devant le vendeur.
- 03/09 · M42 · Fiche PDF : d'abord le lecteur générique « Libellé : valeur », ensuite la table de correspondance ; un libellé inconnu est ignoré, jamais deviné.
- 03/09 · M42 · Les photos d'une fiche se déposent au clic du conseiller, jamais automatiquement ; à défaut, il les ajoute à la main.
- 07/09 · M43 · Le PDF se lit dans le navigateur du conseiller et n'est téléversé nulle part ; seul le texte part au serveur, qui revalide tout (remplace M42, lecture côté serveur).
- 10/09 · M44 · Taxe foncière et charges sont des montants factuels qui remplissent leurs champs ; seul le prix de vente reste « pour information ».
- 10/09 · M44 · Une quote-part de charges de copropriété trouvée met le bien en copropriété : un champ faux est pire qu'un champ vide.
- 10/09 · M44 · Les prestations de la fiche alimentent « Points forts » (10 au plus) ; rien n'alimente les « Points de vigilance ».
- 10/09 · M44 · « À compléter » porte sur la liste réelle des champs du formulaire, pas sur ce que le lecteur sait lire.
- 22/09 · M52 · Carte de Préparation : bien tel que saisi (champ absent omis, jamais « — »), fourchette ou « non saisie », avancement nommé.
- 22/09 · M52 · Prêt = bien vendeur + au moins 3 concurrents exploitables retenus + fourchette validée : la bascule dans le Live est automatique et se voit.
- 22/09 · M52 · Il manque un élément : le conseiller peut déclarer prêt lui-même ; l'outil informe, il ne barre pas la route.
- 22/09 · M52 · Un dossier prêt reste modifiable : onglet « Prêts » de Préparation, et « Remettre en préparation ».
- 24/09 · M58 · L'analyse du conseiller (son avis de valeur) se saisit au positionnement, en fin de préparation ; elle n'est pas requise pour être prêt.
- 05/10 · Stream Estate · Fiche du bien vendeur : ascenseur et piscine (oui / non / non renseigné).

## Concurrents & recherche

- 10/09 · M45 · Les portails se lisent par l'extension Chrome, dans le navigateur du conseiller : zéro service payant. L'extension rapporte la page ; l'application l'analyse.
- 10/09 · M45 · Extension : ouverte à la seule origine d'ACM, aux seuls domaines des portails ; elle ne stocke rien et n'envoie rien ailleurs.
- 10/09 · M45 · L'outil reste entier sans l'extension : coller l'adresse, coller la page, favori, saisie manuelle.
- 10/09 · M45 · `robots.txt` est lu et respecté avant toute demande de page ; un refus n'est jamais lu comme une absence ; les pages se lisent une à une, en nombre plafonné.
- 16/09 · M45 (suite) · Leboncoin n'est pas supporté (son `robots.txt` interdit `/ad/`) ; Figaro n'est plus proposé au conseiller.
- 10/09 · M46 · L'extension ouvre la page dans une fenêtre non focalisée et attend que le HTML se stabilise (15 s au plus) ; chaque étape est journalisée.
- 10/09 · M46 · L'extension sert aussi l'écran des concurrents : un concurrent n'existe qu'en ligne.
- 10/09 · M47 · Chaque import écrit une observation datée, jamais modifiée (une par annonce et par jour, par agence) ; l'identité est portail + identifiant publié, jamais la référence d'agence.
- 10/09 · M47 · Une baisse de prix se déduit de deux observations ; elle est proposée avec ses deux dates, jamais écrite en silence.
- 10/09 · M47 · Ancienneté : date exacte du portail, sinon borne basse (« plus de 2 mois »), sinon « vue par ACM depuis N jours » ; la source est toujours nommée.
- 16/09 · M48 · Rien ne se lit dans la page entière : tout se lit dans le bloc de l'annonce (une exception s'écrit en commentaire, avec sa raison).
- 16/09 · M48 · Le terrain n'apparaît dans la grille que pour une maison ; un prix au m² calculé porte « calculé par ACM ».
- 16/09 · M48 · Un bloc inconnu n'est jamais promu caractéristique : il est jeté et journalisé.
- 17/09 · M48 (suite) · Extérieurs : un portail qui publie des champs structurés coche ; sinon la prose cadrée propose « — à confirmer », sans cocher.
- 16/09 · M49 · Description et photos se choisissent par provenance (bloc de l'annonce, puis métadonnées de page), jamais par longueur ; vide plutôt qu'étrangère.
- 17/09 · M50 · Recherche sur quatre portails : SeLoger, Bien'ici, Green Acres, Maisons & Appartements (Apify abandonné).
- 17/09 · M50 · Le constructeur d'adresses refuse les formes interdites par `robots.txt` ; Green Acres à une requête par seconde ; une seule fenêtre réutilisée.
- 17/09 · M50 · Une carte se lit par le marqueur du portail, jamais par la forme de l'adresse.
- 17/09 · M50 · Validation en lot : « Retenir et importer les N cochés », import un par un, échec nommé et relançable ; rien en base avant le clic.
- 21/09 · M50 · On classe sur les seules données de la carte : l'enrichissement automatique des fiches est retiré.
- 22/09 · M54 · Le type de bien (normalisé des deux côtés) est un filtre dur, jamais desserré : maison et appartement ne se comparent pas.
- 01/10 · M61 · Secteur, prix, pièces et surface FILTRENT ; le score n'ordonne que ce qui est admis (remplace M50 « on classe, on ne filtre pas »).
- 01/10 · M61 · La fourchette du conseiller est stricte, jamais élargie (remplace M50, hors fourchette en repli).
- 01/10 · M61 · Pièces exactes puis ±1 ; surface ±5 % → ±7,5 % → ±10 % ; cible 6 ; sous 3 après le dernier cran, l'écran le dit et ne complète pas.
- 01/10 · M61 · Le desserrage est visible : bandeau, et mention sur la carte retenue grâce à lui (remplace M50, desserrage invisible).
- 01/10 · M61 · Secteur cadré à la commune ; une carte sans ville reste, une carte sans surface ou sans pièces est écartée et comptée.
- 01/10 · M61 · Dédoublonnage sur l'identité publiée (portail + clé), jamais sur une ressemblance (remplace M50, prix + surface + pièces + commune).
- 01/10 · M65 · Geste principal : le conseiller filtre son portail, ACM lit l'onglet ouvert sans aucune requête au portail ; repli : coller la page de résultats.
- 01/10 · M65 · Maisons & Appartements : la commune se lit sur la carte.
- 01/10 · M68 · « Studio », « T1 », « F1 » = 1 pièce (sur la carte ; à l'import, sur le titre seulement).
- 01/10 · M68 · La tolérance de surface n'est jamais inférieure à ±3 m² ; le bandeau dit la tolérance réellement appliquée.
- 05/10 · M69 · « Ouvrir mes recherches » : l'extension ouvre des onglets visibles, déjà filtrés (type, commune, pièces exactes, surface ±10 % plancher ±3 m², fourchette stricte).
- 05/10 · M69 · « Lire mes recherches » lit tous les onglets de recherche d'un coup, avec un récapitulatif par portail ; lire un seul onglet reste possible.
- 05/10 · M69 · Les identifiants de commune par portail s'apprennent dans l'adresse des onglets lus, jamais devinés ; la table est commune à toutes les agences.
- 05/10 · M70 · Maisons lues sur les portails ; le terrain de la carte ordonne seulement, et seulement pour une maison vendeuse ; il ne filtre jamais.
- 05/10 · Stream Estate · Recherche par l'API Stream Estate, en essai : bouton présent seulement si la clé est définie ; commune par code INSEE exact, sinon aucune recherche.
- 05/10 · Stream Estate · Filtre de mise à jour à 30 jours, biens non expirés ; l'écran dit le nombre d'annonces facturées.
- 05/10 · Stream Estate · Annonce d'origine utilisable : non expirée et revue depuis 7 jours au plus ; un bien sans origine utilisable n'est pas affiché, il est compté.
- 05/10 · Stream Estate · Seuls les biens importables : au moins une annonce sur un site que l'extension relit (SeLoger, Bien'ici, Green Acres, Figaro Immobilier, M&A) ; les autres sont écartés et comptés.
- 05/10 · Stream Estate · Champs structurés seulement ; donnée inconnue d'un côté ou de l'autre = neutre (« non indiqué ») ; la description n'est jamais lue.
- 05/10 · Stream Estate · 10 affichés et numérotés, 5 cochés d'office, le reste derrière « Voir les N autres » (remplace M50, cochés au-dessus du seuil).
- 05/10 · Stream Estate · Apprentissage sur les seuls écarts explicites (« Écarter avec un motif ») ; un importé compte comme retenu ; un non coché ne laisse aucune trace (remplace M50).
- 05/10 · Stream Estate · Le neuf n'entre qu'en complément, sous 3 concurrents dans l'ancien après desserrage complet, avec sa mention et jamais coché d'office (remplace M50, neuf écarté).
- 06/10 · M71 · Stream Estate cherche par crans et s'arrête à 10 biens anciens importables et vivants : identique (< 1 km, mêmes pièces, surface ±10 %, fourchette stricte), plus grand (+10 à +25 %), une pièce de plus, même ville < 2 km, < 5 km, 10 km communes voisines comprises, prix ±5 % hors fourchette. Jamais plus petit, jamais une pièce de moins ; les portails ne desserrent pas.
- 06/10 · M71 · « Dans la commune et à N km » = rayon moins les communes voisines (centre à moins de N + 8 km), code INSEE revérifié ; l'API ignore le rayon avec `includedInseeCodes[]`. Liste refusée ou indisponible : cercle seul, dit dans le bilan.
- 06/10 · M71 · Sans adresse géocodée sûre, pas de quartier : crans 1 à 3 sur toute la commune, 2 et 5 km sautés, 10 km depuis le centre de la commune. On géocode avec le nom officiel de la commune.
- 06/10 · M71 · Ce qui est payé et valable est gardé : un bien sans position fiable, confirmé dans la commune par son code INSEE, entre dès son cran avec « Même ville — quartier non vérifié ».
- 06/10 · M71 · Facturation : tranches disjointes (bornes entières), appels triés par mise à jour décroissante, pages d'un cran épuisées avant le suivant ; plafond automatique de 60 annonces, puis « Chercher encore » (20 annonces, 0,20 €) au choix du conseiller, qui reprend où la recherche s'est arrêtée. Le bilan dit le nombre par cran et le coût cumulé.
- 06/10 · M71 · % de correspondance sur chaque carte, portails compris : secteur 25, surface 20, prix 20, pièces 15, stationnement 5, extérieur 5, niveau 2 sur 10 ; un critère inconnu sort du calcul. La liste est triée par % ; à égalité, l'ordre en deux niveaux décide (remplace Stream Estate, ordre et barème distance).
- 06/10 · M71 · Une carte Stream Estate élargie dit son écart (distance, commune voisine, plus grand, pièce de plus, prix hors fourchette).
- 06/10 · M71 · Une seule comparaison des communes partout (accents, tirets, St/Ste) ; Stream Estate compare le code INSEE. Le bouton d'import groupé est visible dès qu'un candidat est affiché.

## Live

- 28/08 · M37 · Quatre écrans par concurrent : le code s'aligne sur le Storyboard.
- 28/08 · M39 · « Votre bien » suit l'introduction : ni prix, ni fourchette ; oui / non + commentaire ; absent sans bien vendeur.
- 28/08 · M40 · Grille : vert = avantage du concurrent, gris = équivalent, orange = faiblesse ; un critère sans donnée ne s'affiche pas.
- 28/08 · M41 · Devinette et révélation sont deux écrans ; « pas un concurrent » saute les trois suivants ; le prix ne se révèle qu'après la devinette.
- 21/09 · M51 · Avant la révélation, aucun montant, sur aucun chemin (adresse directe comprise) : libellé neutre pièces · surface · commune au lieu du titre du portail.
- 21/09 · M51 · Un seul bouton « Valider et continuer », fixé à la fenêtre ; on avance tout de suite, l'enregistrement part en fond ; un échec bloque la fin de séance.
- 21/09 · M51 · Chaque écran s'ouvre en haut ; l'adresse désigne l'écran affiché ; le plein écran défile.
- 22/09 · M51 · Valeur perçue et durée en devine-puis-révèle : le marché ne s'affiche qu'après la réponse du vendeur.
- 22/09 · M52 · La liste du Live ne contient que des dossiers prêts.
- 22/09 · M53 · Dernier écran : « Sur quel prix partons-nous ? », champ vide à l'ouverture, jamais pré-rempli ; le remplir vaut accord.
- 24/09 · M58 · Aucun champ de saisie conseiller sur un écran montré au vendeur : l'analyse du conseiller y est affichée.
- 24/09 · M58 · Un seul vocabulaire, partout : Marché calculé · Analyse du conseiller · Prix conseillé · Prix de commercialisation.
- 24/09 · M58 · Photos des concurrents telles quelles : jamais de retrait de filigrane, jamais le logo de l'agence sur la photo d'un confrère.

## Conclusion & Suivi

- 22/09 · M53 · Parcours Préparation → Live → Suivi ; l'issue se note après le Live, sur un écran conseiller : Mandat signé / À relancer + motif.
- 22/09 · M53 · La conclusion n'est jamais obligatoire : quitter sans conclure laisse le dossier dans le Live.
- 22/09 · M53 · Les montants se figent à la conclusion (copies, jamais recalculées) ; les écarts se calculent à l'affichage.
- 22/09 · M54 · Quatre issues (+ Vendu ailleurs, Retiré de la vente), modifiables depuis le Suivi sans toucher aux montants figés ni au statut ; date du dernier changement d'issue.
- 22/09 · M54 · Filtre par issue, plus « Tous » ; aucun dossier masqué sans que le filtre le dise.
- 22/09 · M54 · Recherche acheteur jetable (rien n'est enregistré), sur tout le Suivi, avec le moteur des concurrents ; la carte nomme le prix de référence (convenu, sinon conseillé).
- 22/09 · M54 · Un dossier dont le type ne se reconnaît pas est mis à part avec sa mention, jamais exclu en silence.
- 23/09 · M56 · Neuf faits figés à la conclusion, pour toutes les issues : 4 montants, prix souhaité, valeur perçue, concurrents retenus et exploitables, durée du rendez-vous.
- 23/09 · M56 · Une valeur absente reste absente ; la durée des conclusions passées n'est pas rattrapée.
- 23/09 · M56 · Pas de tableau de bord avant d'avoir des données ; s'il traverse les agences, il sera agrégé et anonyme.

## Agence & équipe

- 22/09 · M55 · La charte de l'agence s'applique à tout l'outil, Live compris ; logo clair et sombre, ratio jamais déformé ; un JPEG est signalé au dépôt.
- 22/09 · M55 · Couleur exacte pour les aplats, variante lisible pour le texte, et l'écran le dit.
- 22/09 · M55 · Les couleurs de la grille (vert, gris, orange) sont sémantiques : la charte n'y touche pas.
- 22/09 · M55 · L'administration règle l'identité et les gens, jamais la méthode (minimum de 3 concurrents, tolérances, déroulé du Live).
- 23/09 · M55 · Agence sans identité configurée : son nom en texte, jamais « Start Academy ».
- 24/09 · M57 · On ne lit pas le site de l'agence ; la police se choisit parmi six polices embarquées, sans requête extérieure pendant le Live (remplace M55/M57, extraction depuis le site).
- 24/09 · M59 · Toute l'agence voit tous ses dossiers ; le manager gagne une vue (où en est chacun, ce qui dort, mandats signés), sans moyenne ni comparaison entre agences.
- 24/09 · M59 · « Ce qui dort » : seuils réglables par le manager, par agence (21 et 30 jours par défaut).
- 24/09 · M60 · On entre par invitation e-mail ; agence et rôle voyagent avec elle ; elle n'est « envoyée » que si l'e-mail part ; une adresse déjà inscrite n'est pas invitée.
- 24/09 · M60 · Retirer quelqu'un retire l'accès, pas la personne : ses dossiers restent à son nom, sans réattribution.
- 24/09 · M60 · Deux rôles, manager et conseiller ; le dernier manager ne peut ni se retirer ni être rétrogradé ; gardes à l'écran et à l'action.

## Données & provenance

- 28/08 · M38 · Aucun champ, photo ou concurrent inventé : ce qui n'est pas trouvé reste vide, et l'écran dit ce qu'il n'a pas trouvé.
- 07/09 · M43 · Le contenu importé (PDF, HTML, page) est une donnée, jamais une instruction ; le serveur revalide tout ce que le navigateur envoie.
- 10/09 · M47 · Une valeur fausse est pire qu'une case vide ; une valeur déduite est proposée, jamais posée.
- 16/09 · M49 · La provenance départage, jamais la longueur, la position ni la fréquence (couleurs comprises, M55).
- 21/09 · M51 · Une garde de rendu n'est pas une garde de donnée ; liste d'autorisation, jamais liste d'exclusion.
- 01/10 · M61 · Donnée absente portée par la provenance : n'écarte pas ; donnée absente qui est le critère : écarte, et se compte.

## Méthode

- 07/09 · M43 · Essai sur le déploiement avant de déclarer une mission finie : un build vert ne prouve rien sur ce qui dépend de l'environnement.
- 10/09 · M47 · Mesurer avant de coder : aucun lecteur pour un portail non mesuré ; un champ n'est absent qu'après l'avoir cherché sous toutes ses formes, puis vu à l'écran.
- 16/09 · M48 · Les fixtures de portail se capturent par l'extension, jamais à la main ; prettier ne les reformate pas (M61).
- 22/09 · M52 · L'essai à l'écran se fait d'une traite, sans recharger entre les étapes.
- 23/09 · M56 · Migration sur données réelles : compter avant, énoncer la prédiction, comparer après.
- 01/10 · M62 · Intégration continue à chaque push : typecheck, lint, format:check, test, build.
- 06/10 · M63 · Rapport conseiller et export PowerPoint sortent du MVP : la Conclusion et le Suivi en tiennent lieu.
- 06/10 · M63 · `comparable` reste dans le code existant ; `competitor` pour le nouveau code ; « Concurrent » à l'écran.
- 06/10 · M63 · Une mission jamais exécutée (ni branche ni commit) n'entre pas ici ; quand le commit contredit la mission, le commit fait foi.
- 06/10 · M63 · Aucune nouvelle fonctionnalité avant le pilote ; une mission naît d'un problème vu en vrai rendez-vous ; les idées vont dans `docs/IDEES.md`.
