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
- 24/11 · Lancement 9 · À l'allumage des photos : vérifier sur une vraie recherche que les photos
  du fournisseur (`pictures`) sont dans le même ordre que celles de la fiche complète
  (`picturesRemote`), sinon « la photo 3 » ne serait pas la troisième de la fiche ; aucune sélection
  réelle ne permet de le voir aujourd'hui. Les photos des mandats et des concurrents de l'agence ne
  sont pas lues (le conseiller les connaît). Réduire les photos avant l'envoi (`sharp`) diviserait
  leur coût par 2,5. Les six critères des photos n'ont été mesurés que sur vingt annonces, sans
  corrigé écrit avant : une mesure de justesse reste à faire, comme celle du texte (M151).
- 24/11 · Lancement 7 · Relecteur : dans « Aujourd'hui », la relance d'une sélection et la reprise
  de contact d'un acquéreur en retard s'écrivent avec deux « · » devant « en retard »
  (`suivi-step-labels.ts`, le détail finit par un « · » que l'écran pose déjà). Une visite confirmée
  qui n'a pas eu lieu reste « en retard » sans geste pour la lever, hors « Changer la date ». Une
  visite confirmée À VENIR reste « à organiser » dans « Aujourd'hui » alors qu'elle l'est déjà : à
  trancher par Jean-Guy. Sur la fiche acquéreur, « Confirmer la visite » ouvert porte un second
  bouton plein (depuis le Lancement 6). À la mise en production, une seule visite confirmée et
  passée attendait son compte rendu, dans l'agence de démonstration.
- 24/11 · Lancement 9 · Relecteur : huit appels ensemble n'ont été mesurés qu'une fois (60
  annonces) ; au-delà de 64 annonces, un neuvième lot part en seconde vague. Un lot que le
  fournisseur refuse est compté au pire sur le forfait, relancé seulement s'il reste du temps, et
  ne laisse aucune trace au journal : à tracer si le classement simplifié apparaît sur de vrais
  dossiers. Sur l'essai seulement, la démo montre des photos simulées que la production n'a pas
  (précédent : le bon de la tournée, M154).
