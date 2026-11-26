# Plus tard

Ce qui se découvre pendant une mission et n'en fait pas partie (règle de Jean-Guy, 23/11,
CLAUDE.md) : une ligne datée par point, avec la mission où il a été vu. Un cas imaginé par un
balayage se note ici, il ne se corrige pas. Les idées de produit restent dans `docs/IDEES.md`.

- 23/11 · Correctifs 163 (avis) · Étude imprimée, cas du balayage seulement, aucun vrai dossier :
  devant un classement de 11 ou 12 lignes, la page « dernier bloc et avis » reste peu remplie ; une
  page peut aussi rester peu remplie quand un long bloc insécable la suit (« La suite » d'un
  appartement avec son lien « Vivre ici »).
- 23/11 · Correctifs 163 (avis) · Relecture du calcul des hauteurs (aucun bloquant, 0 page qui
  déborde sur ses 864 Études du quartier ni sur 1 872 Études en WebKit) ; ses remarques, toutes sur
  des cas fabriqués :
  - la carte du conseiller a une hauteur fixe : avec son QR code et un e-mail de 62 caractères ou
    plus, elle prend une ligne de plus (4 mm), déjà ainsi avant la mission (`study-print.ts`) ;
  - le banc ne fabrique ni fiche avec photo, ni QR du conseiller, ni lien de démonstration, ni nom
    long (`tests/print/etude.gen.test.ts`) ; le relecteur les a mesurés à la main, justes ;
  - deux erreurs que les tests unitaires ne verraient pas : le corps compté sans Montserrat, un
    caractère inconnu compté à zéro ; rien ne relie la liste des polices de charte à la table des
    largeurs (une police ajoutée sans relancer `scripts/print-font-metrics.mjs` serait comptée en
    Montserrat) ;
  - le calcul compte parfois une ligne de trop (prudent : un peu de blanc, jamais un débordement) ;
  - devant un classement dont les lignes sont longues, le dernier bloc peut descendre avec l'avis
    dès 8 ou 9 lignes.
- 23/11 · E2E, photos du stockage · Des liens signés stables : le même lien pour une photo pendant
  sa durée de validité (signé une fois, gardé côté serveur), pour que le navigateur et le cache de
  Supabase la servent sans retourner au stockage (proposition 2 de `docs/PASSAGE_PAYANT.md`).
- 23/11 · E2E, photos du stockage · Des vignettes pour les petites images (cartes, vignettes du
  Live) au lieu de la photo entière (proposition 3 de `docs/PASSAGE_PAYANT.md`).
- 23/11 · M164 · Le panneau de l'opérateur ne dit pas que le prix part avec les réponses (« Effacer
  les réponses de ce Live ? », `reopen-live-panel.tsx`) : hors périmètre de la 164 (« changer ce
  que voit le conseiller à la réouverture »).
- 23/11 · M164 · Un onglet du Live resté ouvert peut réenregistrer un prix après la réouverture.
- 23/11 · M164 · `reopen_live` et `conclude_meeting` prennent leurs verrous dans l'ordre inverse
  (dossier puis conclusion, conclusion puis dossier) : lancés au même instant sur le même dossier,
  Postgres en annule un ; rien n'est écrit à moitié.
- 23/11 · M164 · Gardien-sql : `supabase/tests/live_closed_after_conclusion.sql` (l. 213-218) a le
  même défaut que celui corrigé dans `live_reopening.sql` (un échec levé dans le bloc qui attend le
  refus est avalé) ; et aucun test ne joue le refus de rouvrir un dossier archivé, que
  `docs/GESTES_SENSIBLES.md` annonce.
- 23/11 · Méthode · Une tâche planifiée pour la suite e2e de nuit (aujourd'hui, le chef la lance
  lui-même en fin de journée, accord de Jean-Guy du 23/11).
- 23/11 · Lancement · Les forfaits en jetons, à la place des coûts en euros (mission 5 du
  lancement : les coûts disparaissent des écrans du conseiller, les forfaits viendront après).
- 23/11 · Lancement, état des lieux · Un même bien publié sur deux portails a deux identités, et un
  mandat n'est pas relié à sa propre annonce publiée : le relier demanderait de garder l'identifiant
  du bien chez Stream Estate (une migration).
- 23/11 · Lancement, état des lieux · L'IA ne lit pas les biens démarchés ; chaque recherche relit et
  repaie les mêmes annonces (un cache des jugements par annonce demanderait une table).
- 24/11 · Lancement 4 · Maisons & Appartements : une annonce périmée garde son prix à l'écran sous le
  bandeau « Cette annonce périmée n'est plus diffusée » ; ACM l'importe comme une annonce en ligne
  (la preuve de retrait n'est lue que sur une page sans prix, M103). Ce site n'apparaît dans aucun
  vrai dossier.
- 24/11 · Lancement 4 · SeLoger : 5 pages restées illisibles en 14 jours (« réseau » : l'extension
  n'a pas obtenu la page en trois essais) ; le concurrent est alors créé depuis la recherche (M101).
  À regarder si le nombre monte. Bien'ici ne publie pas le quartier dans ce que lit ACM.
- 24/11 · Méthode · L'extension n'accepte ni les prévisualisations Vercel ni un autre site que la
  production, l'essai et le poste local : un changement qui passe par elle ne s'essaie dans un vrai
  navigateur qu'une fois en production (ou sur l'essai, où le Chrome de Jean-Guy n'est pas connecté).
- 24/11 · Lancement 1 · Relecteur, cas qu'aucun vrai rendez-vous ne montre : un prix tapé puis
  « Voir les biens et leurs prix », puis retour en Live interactif : « 350 000 € ? » réapparaît
  au-dessus d'un champ vide ; « Précédent » et « Valider » restent actifs pendant les 20 secondes
  au plus de l'enregistrement du changement ; l'échec du changement n'a pas de test (le chemin
  heureux est joué par l'e2e).
- 24/11 · Lancement 2 · Sur la fiche acquéreur, le bouton « Offre d'achat » reste dans « Ses bons de
  visite » dès qu'une visite existe, et depuis « En visite » le statut suivant proposé est « A
  acheté » : deux signaux laissés tels quels (ils ne bloquent rien) ; à revoir avec la fiche
  simplifiée (mission 10).
- 24/11 · Lancement 5 · Les forfaits en jetons (demande de Jean-Guy, 23/11) : aujourd'hui « le
  forfait » est le plafond mensuel en euros que l'opérateur règle sur `/erreurs` ; ce qu'une agence
  achète (jetons, paliers, dépassement) reste à définir. Quand le manager reprend une veille coupée,
  elle retrouve le plafond par défaut (10 €), pas celui que l'opérateur avait réglé (aucune colonne
  pour le retenir). Sur la recherche, le message du plafond atteint dit « contactez votre agence »
  même au manager ; Administration lui dit de contacter l'équipe ACM Studio.
- 24/11 · Lancement 5 · La veille : un interrupteur à part pour le manager (une colonne, donc une
  migration), pour que « Reprendre la veille » rende le plafond réglé par l'opérateur au lieu du
  plafond par défaut, et ne lève pas un 0 € posé par lui. Relecteur, cas imaginés : « forfait du
  mois » nomme trois plafonds (recherche, veille, IA), le bandeau du classement peut dire « forfait
  du mois atteint » sous une recherche qui vient de réussir ; le test des coûts pourra refuser à
  tort « stationnement payant », « coût des travaux » ou « charges … € par mois » dans un futur
  texte ; l'e2e ne relit pas à l'écran « Depuis mes notes », la fiche acquéreur ni « Aujourd'hui »
  (le test unitaire lit leurs textes).
- 24/11 · Lancement 3 · Restent hors de la règle « jamais reproposé » : le rapprochement
  (`/acquereurs/rapprochement`, recherche libre du conseiller) ; le serveur accepte encore une
  sélection qui contiendrait un bien refusé (l'écran ne permet plus de le cocher) et un lien de
  proposition pour un acquéreur qui a déjà le bien (page restée ouverte) ; un même bien publié sur
  deux portails a deux identités, et la clé change quand une annonce devient un mandat ou qu'un
  concurrent est supprimé (les relier demande une migration).
- 24/11 · Lancement 3 · Relecteur, cas qu'aucun vrai dossier ne montre : une réponse reçue par le
  lien sans partage noté ne marque « envoyé » que le bien répondu ; un bien retiré de la sélection
  après l'envoi passe pour non vu ; un bien envoyé puis sorti de la sélection ne peut plus être
  repris depuis les biens idéaux (il faudrait un geste « le reproposer quand même »).
- 24/11 · Lancement 3 · La règle lit sept tables à chaque page qui s'en sert, en une vague, pour
  toute l'agence ; elle part deux fois sur « Aujourd'hui », sa pastille et le Suivi, une fois à
  l'ouverture du Live : à mesurer, et à lire une seule fois par page si cela ralentit.
- 24/11 · Méthode · Pour que la prévisualisation d'une branche suffise à toutes les specs : déduire
  l'adresse du site de celle que Vercel donne à la branche quand `NEXT_PUBLIC_SITE_URL` manque, et
  poser la clé de recherche sur les prévisualisations (geste de Jean-Guy dans Vercel) ; d'ici là,
  quatre specs se jouent sur l'essai (`docs/APPRENTISSAGES.md`, 24/11).
- 24/11 · Lancement 6 · Relecteur, cas rares ou finitions : un bien envoyé (voire refusé) puis
  écarté par le conseiller se range sous « Écartés pour lui, sans lui en parler », titre alors
  inexact (données d'avant le Lancement 3) ; « Son suivi » ajoute sept lectures à la fiche, à
  mesurer ; le rangement des réponses par sélection (`answers-by-selection`, `AnswerGroupView`)
  n'a plus d'usage sur la fiche, à retirer avec la fiche simplifiée (mission 10).
- 24/11 · Lancement 7 · La tâche « Saisir le compte rendu » d'« Aujourd'hui » n'est prouvée que par
  ses tests unitaires : la démo n'a pas de visite confirmée dans le passé (celle des Moreau est pour
  demain). Une visite jamais confirmée (sans jour ni heure) n'a pas de rappel de compte rendu.
- 24/11 · Lancement 8 · Vu sur le compte réel : les deux communes lues dans les notes (Vence,
  Saint-Paul-de-Vence) sont sorties « commune non vérifiée ». La vérification demande la liste des
  communes de chaque département de l'agence (quatre au plus) et renonce à tout si une seule liste
  manque : vérifier contre les listes reçues, et regarder au parcours du jeudi si le service des
  communes répond depuis la production. Une lecture de classement du 13/11 est restée « en cours »
  dans la trace, comptée au pire (0,64 €) : à régler ou à purger.
- 24/11 · Correctif du règlement de l'IA · Les deux classements restés « en cours » (13/11, 24/11)
  sont comptés au pire dans le forfait d'IA de novembre de Start Academy (1,29 €) : les solder
  demande une écriture en base, sur l'ordre de Jean-Guy. Aucun test ne joue la vraie base pour un
  appel de fonction : un argument oublié ne se voit qu'en production — un test SQL qui appelle
  chaque fonction avec les arguments que le code envoie le verrait.
- 24/11 · Lancement 7 · Relecteur : dans « Aujourd'hui », la relance d'une sélection et la reprise
  de contact d'un acquéreur en retard s'écrivent avec deux « · » devant « en retard »
  (`suivi-step-labels.ts`, le détail finit par un « · » que l'écran pose déjà). Une visite confirmée
  qui n'a pas eu lieu reste « en retard » sans geste pour la lever, hors « Changer la date ». Une
  visite confirmée À VENIR reste « à organiser » dans « Aujourd'hui » alors qu'elle l'est déjà : à
  trancher par Jean-Guy. Sur la fiche acquéreur, « Confirmer la visite » ouvert porte un second
  bouton plein (depuis le Lancement 6). À la mise en production, une seule visite confirmée et
  passée attendait son compte rendu, dans l'agence de démonstration.
- 24/11 · Lancement 9 · À l'allumage des photos : vérifier sur une vraie recherche que les photos
  du fournisseur (`pictures`) sont dans le même ordre que celles de la fiche complète
  (`picturesRemote`), sinon « la photo 3 » ne serait pas la troisième de la fiche ; aucune sélection
  réelle ne permet de le voir aujourd'hui. Les photos des mandats et des concurrents de l'agence ne
  sont pas lues (le conseiller les connaît). Réduire les photos avant l'envoi (`sharp`) diviserait
  leur coût par 2,5. Les six critères des photos n'ont été mesurés que sur vingt annonces, sans
  corrigé écrit avant : une mesure de justesse reste à faire, comme celle du texte (M151).
- 24/11 · Lancement 9 · Relecteur : huit appels ensemble n'ont été mesurés qu'une fois (60
  annonces) ; au-delà de 64 annonces, un neuvième lot part en seconde vague. Un lot que le
  fournisseur refuse est compté au pire sur le forfait, relancé seulement s'il reste du temps, et
  ne laisse aucune trace au journal : à tracer si le classement simplifié apparaît sur de vrais
  dossiers. Sur l'essai seulement, la démo montre des photos simulées que la production n'a pas
  (précédent : le bon de la tournée, M154).
- 24/11 · Lancement 10 · Relecteur : sur la fiche, « Rapprocher » ne dit plus « Ne compte pas dans
  le forfait » (c'est un lien, plus un bloc) ; seuls les biens idéaux le disent : à trancher par
  Jean-Guy. Pour un acquéreur prêt, changer son financement ou noter « J'ai eu l'acquéreur
  aujourd'hui » coûte un toucher de plus (ouvrir « Prêt à visiter ? »). Au clavier, sur ordinateur,
  « Autres actions » vient après toute la colonne, alors qu'à l'œil elle est sous la prochaine
  étape. « Archiver » reste un bouton sous le statut (la maquette en faisait un lien). La fiche
  complète d'un bien n'est plus ouverte depuis le bloc « Sa sélection » par aucune spec.
  « Offre d'achat » reste proposée dès la première visite, et le rangement des réponses par
  sélection (`answers-by-selection`) n'a toujours plus d'usage : à retirer.
- 25/11 · Lancement 11 · Vu pendant le parcours sur le compte de Jean-Guy, pas corrigé :
  - Live : la révélation d'un prix a mis 5 à 8 secondes à s'afficher (réseau du poste ce matin-là ?
    à remesurer) ; le dernier écran (« Qu'est-ce qui vous manquerait ? ») défile en lui-même à
    1512 × 771 ; sur « Merci », le logo n'est pas centré ; sur « Conclusion », « Enregistrer le
    prix » et « Valider et continuer » ont le même poids (deux boutons blancs).
  - Import d'une annonce : le message d'attente dit « aspirés pour vous » ; une photo entièrement
    noire publiée par l'annonce (5 Ko) est gardée telle quelle et se voit dans la présentation.
  - Biens idéaux : dans « Sélection actuelle », un concurrent à prospecter porte « Dans l'agence »
    (« Son suivi » dit bien « Concurrent à prospecter »).
  - « Confirmer la visite » : une heure déjà passée aujourd'hui est refusée avec « La visite se
    confirme d'aujourd'hui à un an », qui ne dit pas que c'est l'heure ; une visite confirmée pour
    plus tard reste comptée « à organiser » dans la ligne de « Son suivi ».
  - Fiche acquéreur : pour une visite sur un mandat de l'agence, la prochaine étape dit « contactez
    le propriétaire ou le confrère ».
  - Le message au vendeur après une visite reprend le nom du dossier tel que tapé (« Bonjour
    deborah, », sans majuscule).
  - Un dossier conclu ne se supprime pas depuis l'écran (M93) : un rendez-vous conclu par erreur,
    ou un dossier d'essai, reste dans le Suivi et dans le tableau du manager. À trancher par
    Jean-Guy : un « Supprimer le dossier… » sur un dossier conclu ?
  - Le Suivi compte les visites FAITES d'un acquéreur archivé (`visitCounts`), alors que Visites
    ne les montre plus : voulu (la visite a eu lieu) ou non ? À trancher par Jean-Guy.
  - geo.api.gouv.fr a dépassé son délai deux fois le 24/11 : garder en cache la liste des communes
    d'un département éviterait l'appel.
- 25/11 · Lancement 3 (suite) · L'acquéreur ne retrouve plus sur son lien un bien resté en
  « Peut-être » (ou envoyé sans réponse) : un bien déjà vu ne se retient plus, et le lien d'une
  nouvelle sélection remplace le précédent (M122 B). Accepté par Jean-Guy le 25/11 ; à revoir si
  un vrai acquéreur le demande.
- 25/11 · Lancement 3 (suite) · Relecteur, laissé tel quel :
  - la ressemblance (commune, prix, pièces, surface) ne reconnaît plus un bien dont le prix a
    baissé depuis la sélection : l'identifiant du bien chez le fournisseur reste la première
    preuve ; élargir le prix multiplierait les faux positifs. `isSameStreamEstateProperty`
    (doublons d'une réponse, M78) compare le code INSEE, la ressemblance des biens vus la commune
    écrite : deux règles proches, à réunir un jour ;
  - la page des biens idéaux lit toutes les visites de l'agence (`readVisitLines`), comme la fiche
    acquéreur : léger aujourd'hui ;
  - dans la spec `demo`, la preuve que les photos d'un mandat ne disparaissent pas après une
    réponse (Lancement 11) ne joue que si la page est rendue de nouveau dans les 15 secondes.
- 25/11 · Lancement 11 (suite) · Belles Demeures : seul un accord du site (son robots.txt)
  permettrait de lire ses annonces ; l'extension ne lit pas ce site non plus, et toute
  modification de l'extension repasse par Google. Les autres sites qu'aucun lecteur ne connaît
  (le site d'une agence) se lisent désormais par le serveur seul, sans solliciter l'extension :
  aucun vrai dossier ne l'a encore montré.
- 25/11 · Vu sur le compte réel en jouant les deux recherches, laissé tel quel :
  - « Son suivi » dit « Envoyé le 13/11, par le lien » là où les biens idéaux disent « Présenté
    le 13/11 » pour le même bien (le lien partagé trois minutes avant la fin de la présentation) :
    à aligner sur la présentation, comme « Déjà vus avec lui » ;
  - sur les biens idéaux, deux maisons proches de celle qu'il a déjà vue (même commune, 1 ou 2 m²
    d'écart, un autre prix) restent proposées : ce sont d'autres maisons, la ressemblance exige le
    même prix. Si un bien déjà vu revient un jour avec un autre prix ET un autre identifiant chez le
    fournisseur, il ne sera pas reconnu : à regarder si un vrai dossier le montre ;
  - la recherche de concurrents sur un bien sans adresse dit « Secteur non utilisé : la fiche du
    bien vendeur n'a pas d'adresse » et « 2 biens neufs non proposés » : deux bandeaux jaunes l'un
    sous l'autre, avant le premier concurrent.
- 25/11 · Lancement 13 · Notés en préparant la livraison :
  - le guide de prise en main n'est pas ouvert depuis l'outil : un lien depuis « Aide » le
    donnerait à chaque conseiller sans envoi (à décider par Jean-Guy) ;
  - seule la ligne des portails et le message du forfait du guide sont gardés par un test ; garder
    aussi les mots des boutons qu'il cite ferait échouer la CI à chaque libellé changé : une règle
    nouvelle, à décider par Jean-Guy ;
  - `docs/ETAT_DU_PRODUIT.md` a été relevé le 6 octobre : il est à refaire ;
  - sur l'essai, deux fois en deux jours pendant les tests (24/11 à 16 h 33, 25/11 à 12 h 45),
    « Aujourd'hui » de la démo n'a pas pu lire la liste « Ne plus solliciter », et une page de
    dossier a perdu sa connexion à la base une fois (25/11 à 12 h 55, « other side closed ») ; la
    cause de l'échec de lecture n'entre pas au journal (`get-oppositions.ts` ne garde que son
    message) : la journaliser dirait si c'est le réseau ou la base. Jamais vu en production ;
  - le journal d'erreurs et les erreurs de l'hébergeur mêlent l'essai et la production (base et
    projet partagés) : une colonne « essai / production » sur `/erreurs` éviterait de chercher le
    commit de chaque ligne.
- 25/11 · Lancement 13 · La base se fige sous la charge des tests (lu dans les journaux de Supabase,
  `edge_logs` et `postgrest_logs`) : dix à vingt secondes le 25/11 à 14 h 10, 14 h 13 et 14 h 51,
  une minute et demie à 11 h (« Timed out acquiring connection from connection pool », réponses
  504 et 500), et quatre à dix fois par heure de tests la veille. Chaque fois juste après une
  remise à zéro de la démo par une spec : douze dossiers créés en deux groupes de six en même
  temps (M155), environ 450 écritures et 60 photos en 30 secondes, puis les pages qui se
  réaffichent. La base est la plus petite de l'offre Pro (1 Go de mémoire, 60 connexions) et elle
  est commune à la production, à l'essai et à la démo. Rien la nuit ni en usage normal d'un seul
  compte ; mais un closer qui remet sa démo à zéro, ou plusieurs conseillers ensemble sur des
  pages lourdes, feraient attendre tout le monde. À décider par Jean-Guy (des coûts) : une base
  plus puissante ; la base d'essai séparée (`docs/PASSAGE_PAYANT.md`, étapes 3 à 7). Dans le
  code, à mesurer : créer les dossiers de la démo un par un ; faire lire moins aux pages lourdes
  — « Aujourd'hui », la liste des dossiers : plusieurs centaines de lectures par affichage sur un
  vrai compte (23 dossiers, 153 concurrents), dont une lecture des concurrents par dossier ; la
  règle « déjà vu » y lit sept tables deux fois (Lancement 3).
- 25/11 · Lancement 13 · La connexion des specs e2e attend désormais 45 secondes au lieu de 20
  (`tests/e2e/support.ts`) : cela évite une spec tombée quand la base se fige après une remise à
  zéro, pas le figement lui-même ; une action faite pendant ce moment peut encore tomber (vu une
  fois : « Un incident est survenu » au changement de langue, vert au rejeu).
- 25/11 · Base d'essai · Après la séparation, restent à faire plus tard :
  - les prévisualisations des autres branches lisent encore la base de la production (les trois
    entrées communes de Vercel) : les passer sur la base d'essai demande de modifier ces entrées,
    valeur comprise pour la clé secrète ; d'ici là, aucune spec sur une prévisualisation (confirmé
    par Jean-Guy le 25/11 au soir : les specs ne se jouent que sur l'essai) ;
  - l'agence des tests (vide) et l'agence de démonstration du compte de test (douze dossiers)
    restent dans la production — à ne pas confondre avec l'agence de démonstration des closers,
    qui porte le même nom et ne change pas : leur retrait est une suppression de données, par la
    procédure d'effacement, sur décision de Jean-Guy ;
  - les modèles d'e-mail et l'adresse du site de la base d'essai (invitation, mot de passe
    oublié) ne sont pas réglés : aucune spec n'envoie d'e-mail ;
  - le compte de Jean-Guy n'existe pas dans la base d'essai : à créer le jour où une mission
    Sensible lui demande d'essayer lui-même sur l'essai (`missions/BASE_JEUDI_MATIN.md`) ;
  - `CLAUDE.md` dit encore « La base Supabase est partagée entre la production, l'essai et les
    prévisualisations » : la phrase est à Jean-Guy, à lui proposer une fois la séparation faite.
- 25/11 · Supabase, deux échéances lues dans sa documentation (relecture de la base d'essai) :
  - **les clés** : les anciennes clés (« anon », « service_role ») fonctionnent jusqu'à la fin de
    2026, puis laissent la place aux nouvelles (« Publishable », « Secret »). Si les variables de
    la production portent des anciennes clés (une valeur qui commence par « eyJ »), elles sont à
    remplacer avant le 31/12/2026 : deux valeurs dans Vercel et un redéploiement, par Jean-Guy.
    La base d'essai, créée le 26/11, prend les nouvelles : c'est la répétition ; le code ne fait
    que passer les clés au client Supabase (relu le 25/11) ;
  - **les droits par défaut** : Supabase a annoncé pour le 30/10/2026 le retrait, sur les projets
    existants aussi, des droits donnés d'office aux trois rôles de l'application sur ce que crée
    une migration ; le 25/11, il n'était pas encore appliqué à la production : c'est d'un jour à
    l'autre. Ce qui existe garde ses droits. Son annonce parle des tables et des séquences, sa
    documentation aussi des fonctions : par prudence, la prochaine migration donne en toutes
    lettres les droits de tout ce qu'elle crée, rôle du serveur compris — sans quoi sa table
    serait hors d'atteinte de l'application en production. La CI ne verrait pas l'oubli : sa base
    locale donne encore ces droits d'office. Proposition, à valider par Jean-Guy (pas de règle
    nouvelle sans lui) : le gardien-sql le vérifie à chaque migration.

- 25/11 · Mission 10 bis (la fiche acquéreur repliée) · Notés à la relecture et à l'écran, sans les
  corriger :
  - pendant une vente, « la rouvrir » ouvre « Tout le dossier » sur le statut ; si le conseiller
    referme le pli à la main, un second toucher sur le même lien ne le rouvre pas (l'adresse ne
    change pas) ;
  - les titres des plis (« Ses critères et ce qui compte pour eux », « Tout le dossier », les
    lignes du suivi) sont dans la ligne qu'on touche : à écouter avec un lecteur d'écran ;
  - dans « Tout le dossier », « Sa sélection » garde sa carte : une carte dans une carte ;
  - un acquéreur pas encore prêt montre « Prêt à visiter ? » ouvert, avec ses quatre boutons : le
    critère « trois boutons au plus » ne tient que pour un acquéreur prêt (gardé ainsi par
    Jean-Guy, 25/11 au soir) ;
  - « Tout le dossier » voisine avec « Dossier acquéreur et lien » : deux notions, un même mot
    (les mots de la fiche sont ceux de Jean-Guy).
- 25/11 · Base d'essai, le soir même · Restent, sans urgence : `langue-du-vendeur` a échoué une
  fois dans la suite du soir (le passage du Live en anglais par « Réglages »), puis est passée au
  rejeu et cinq fois de suite à 21 h 12 : on n'y touche pas (ordre de Jean-Guy) ; si elle
  retombe, la cause se cherche avant toute correction — l'aléa n'était pas la base commune. Les
  deux agences des tests restées dans la production n'y servent plus (leur retrait : sa
  décision). Les anciennes clés de Supabase de la production : après la livraison, pas avant.
- 26/11 · Refonte, lot A · Notés par le relecteur ou vus en route, sans les corriger :
  - les titres des maquettes sont en gras 800 ; les polices de charte ne déclarent que 400 à 700
    (700 s'affiche à la place). Mesuré le 26/11 : les fichiers de Nunito Sans, Montserrat, Source
    Sans, Work Sans et Inter portent pourtant le gras jusqu'à 900 (il suffirait de le déclarer,
    sans rien télécharger) ; Rajdhani et Poppins non. Mais le déclarer changerait aussi les
    courriers de prospection, qui écrivent déjà `font-extrabold` (`document-styles.ts`) : à
    décider avec Jean-Guy, hors de la refonte ;
  - les initiales du rond commencent presque toutes par « M » (la civilité) : la fiche n'a pas
    de prénom (M119) ; séparer le nom du dossier et l'identité est déjà dans `docs/IDEES.md` ;
  - sur téléphone, le compte ne s'ouvre que depuis « Aujourd'hui », et la pastille des erreurs
    d'un opérateur ne se voit que là ;
  - l'aide des specs `openAccountMenu` change de page sans le dire sur téléphone (elle va à
    « Aujourd'hui ») ;
  - sur l'essai, l'agence de démonstration des tests garde la charte par défaut (bleu pétrole,
    Montserrat) : les écrans n'y ont pas le bleu nuit des maquettes, qui est la charte de
    l'agence de Jean-Guy. Lui donner cette charte demanderait de rejouer la suite (des specs
    peuvent lire une couleur) : à faire seulement s'il le demande.
  - vu en mesurant le téléphone : dans l'agence de démonstration, « Nouvel acquéreur » déborde de
    12 px à 390 px de large (le bouton « Lire cette photo » du bloc des notes de démonstration
    sort de sa carte). D'avant la refonte, et seulement dans la démo : repris avec le lot D, qui
    refait cet écran.
- 26/11 · Refonte, lot B · Vus en route, sans les corriger :
  - deux fiches peuvent porter les mêmes initiales (« M. et Mme Rossi » et « M. et Mme Roux » :
    MR) : le rond ne distingue pas, le nom oui ;
  - « N choses à faire aujourd'hui » compte toutes les tâches des acquéreurs ; la pastille
    d'« Aujourd'hui » compte ses lignes, vendeurs compris : les deux nombres diffèrent ;
  - sur la fiche, le lien de retour reste « ← Acquéreurs » (la maquette 4 dessine un chevron),
    et la carte du haut garde ses titres d'avant : seule « Prochaine étape » et les trois chiffres
    ont pris le socle ;
  - le bloc « Dernière visite » de la maquette 4 n'existe pas : la tuile « Visités » dit la
    dernière visite, et sa ligne ouverte le compte rendu.
- 26/11 · Refonte, lot B, après la relecture · Notés, sans les corriger :
  - sur « Aujourd'hui », les tâches d'une ligne groupée ont leur rang pour clé
    (`aujourdhui/page.tsx`, la série) : une tâche faite peut léguer son geste ouvert à la suivante
    de la série — le défaut que la relecture a trouvé sur Acquéreurs, en plus rare. D'avant la
    refonte ;
  - choisir une personne (tablette, ordinateur) relit toutes les tâches au serveur : 1,3 s sur
    l'essai. Deux pistes : rendre d'avance le détail de chacun et changer côté navigateur, ou ne
    relire que la personne. À décider avec le lot C, qui met « un bien à la fois » dans ce
    détail ;
  - deux mandats de même type dans la même commune se disent pareil (« la maison de Vence ») :
    pour un bien à proposer, la surface et le prix les distinguent ; pour une visite demandée,
    rien. Aucun cas dans les vrais dossiers pour l'instant ;
  - les autres messages préparés (le lien du dossier acquéreur, du Point marché, de l'Étude,
    « Confirmer la visite », « Proposer ce bien ») ont le même paragraphe que la relance, sans
    passage à la ligne forcé : un lien long peut y faire défiler le téléphone de côté. À mesurer
    geste ouvert, avec le lot F (Visites) et le lot C (« Proposer ce bien ») ;
  - la relance demande deux touchers avant le message (« Relancer », puis « Préparer le
    message ») : d'avant la refonte, le geste d'« Aujourd'hui » ;
  - dans une carte, les trois autres gestes de la réponse du vendeur à une offre (« Transmettre
    au notaire », « Voir l'offre », « Fait ») gardent les petits boutons d'avant ;
  - `OfferMessagePanel` garde un ton sombre que plus personne n'appelle : à retirer au nettoyage.
- 26/11 · Refonte, lot C · Notés, sans les corriger :
  - un bien de l'agence (mandat, concurrent à prospecter) n'a pas sa photo dans « un bien à la
    fois » : la liste des biens idéaux ne la lit pas non plus. La lire demanderait une lecture de
    plus par bien (les photos d'un mandat sont signées) ;
  - « un bien à la fois » n'a que deux gestes (« Écarter », « Proposer ») : pas de « plus tard »
    tant que la sélection a de la place. Si les conseillers le demandent, « Passer ce bien »
    existe déjà pour la sélection complète ;
  - dans l'ordre d'« Aujourd'hui », « Un bien à proposer » passe avant les biens de la veille :
    une personne qui a les deux voit d'abord le mandat, et ses nouveaux biens derrière « Aussi
    aujourd'hui », sur leur page. À revoir si Jean-Guy veut les biens de la veille en premier ;
  - la démo remise à zéro ne montre « un bien à la fois » pour personne (seuls les Keller ont des
    biens de la veille, et ils sont « Sous offre ») : un acquéreur de démo prêt, avec des biens
    trouvés et une sélection vide, le montrerait d'emblée — à faire avec la démo, pas seule ;
  - le marché, cherché depuis la liste, entre dans « un bien à la fois » de la même page, mais
    pas dans le détail d'Acquéreurs (qui ne lance pas de recherche) ;
  - Vercel n'a pas déployé un commit poussé sur `essai` (07 h 10, aucun déploiement créé) : un
    commit vide l'a relancé. À surveiller si cela se reproduit.
- 26/11 · Refonte, lot C (relecture) · Notés, sans les corriger :
  - une veille illisible se lit comme « aucun bien de la veille », sur la liste des biens idéaux
    (depuis la M136) comme dans « un bien à la fois » : `getBuyerWatchFinds` ne distingue pas
    l'échec de l'absence. Les deux autres lectures (ce qu'il a déjà vu, les mandats) se disent ;
  - dans le détail d'Acquéreurs, les biens idéaux de la personne choisie se lisent à chaque
    relecture de la page, et sur téléphone aussi, où le détail est caché : la même lecture que sa
    page, ni plus ni moins, mais faite pour rien sous 768 px. À revoir si la page d'Acquéreurs
    devient lente (le serveur ne connaît pas la largeur de l'écran) ;
  - « Proposer » nomme deux gestes voisins : ici, retenir dans la sélection ; pour un mandat,
    l'envoi noté de « Proposer ce bien » (M134). L'en-tête dit « 2 retenus sur 3 » (la maquette),
    la fiche complète de la liste « 2 biens sélectionnés sur 3 ». À unifier si cela gêne ;
  - « Écarté pour lui » (les mots d'aujourd'hui, M139) voisine avec « Pourquoi celui-ci pour
    eux » (la maquette) : un nom de fiche ne dit ni le genre ni le nombre ;
  - la question « Quitter sans retenir la sélection ? » ne couvre pas le bouton « Précédent » du
    navigateur (comme partout, M93), ni la liste des biens idéaux, qui n'a jamais demandé avant de
    quitter une sélection cochée et non retenue ;
  - une personne tenue sur ses biens par l'adresse, qui n'a plus rien à faire, n'a plus de ligne
    dans la liste : le détail reste sous son nom, rien n'est surligné à gauche.

