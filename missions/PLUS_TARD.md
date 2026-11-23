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
