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
