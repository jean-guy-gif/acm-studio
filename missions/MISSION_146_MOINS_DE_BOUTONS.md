# MISSION 146 — Moins de boutons

**Date** : 08/11/2026 · **Origine** : audit UX / UI du 07/11 en production
(`missions/AUDIT_UX_UI_2026-11.md`), points **I5, I9, I10, I4, C3, C4, C9** ; ajoutés par Jean-Guy
le 08/11 : **C8** (l'accueil du Live, reporté de la 144), **le fondu de la présentation acquéreur**,
**le libellé d'« Aujourd'hui »**, **le Suivi et la liste du Live**.

**La règle (M143, Jean-Guy, 08/11), partout** : un seul bouton plein par écran, la prochaine étape ;
les autres actions en contour ou en liens discrets ; « Supprimer » jamais à côté d'une action
principale, toujours dans « … », avec une confirmation dans l'écran.

**Deux parties** (Jean-Guy, 08/11), une branche et un `/valide` chacune, livrées l'une après
l'autre : **A, côté vendeur** — Préparation, Bien vendeur, Concurrents, Avant le rendez-vous, liste
du Live, accueil du Live, Suivi, et le contrôle e2e ; **B, côté acquéreur et prospection** —
Visites, Acquéreurs, Prospection, présentation acquéreur, Aujourd'hui.

**Maquette d'abord** : aucun code avant l'accord de Jean-Guy sur les maquettes. **Sans migration ni
nouvelle fonction** (Jean-Guy, 08/11 : la 146 reste « moins de boutons ») ; tout existe :
`reorder_retained_comparables` de la M110, `scheduled_at` de la M142, les faits de prospection,
`buyers.advisor_id`. Équipe allégée : relecteur une passe, e2e joué par le chef.

**Textes juridiques** (DECISIONS, 07/11) : aucun courrier, ni `/confidentialite`, n'est touché.

## Maquettes

`missions/maquettes/M146-A1` à `M146-A7` et `M146-B1` à `M146-B5` (`.png`, source
`M146-generateur.mjs --png`, version 2). Chaque planche : l'écran touché, avant (le code de `main`,
f11ac39) et après, sur ordinateur (1280), tablette (1024) et téléphone (390), avec ses notes.
Données : la démo.

| Planche | Écran | Point |
|---|---|---|
| A1 | Préparation (la liste) | I9 |
| A2 | Bien vendeur | C3 |
| A3 | Concurrents d'un dossier | I5 |
| A4 | Avant le rendez-vous | C4 |
| A5 | Liste du Live | la règle partout |
| A6 | Accueil du Live | C8 |
| A7 | Suivi | la règle partout |
| A8 | La date du rendez-vous : hors de la 146, gardée pour une future mission | — |
| B1 | Visites | I10 |
| B2 | Acquéreurs (la liste) | I4 |
| B3 | Prospection | C9 |
| B4 | Présentation acquéreur (le fondu) | 08/11 |
| B5 | Aujourd'hui (le libellé) | 08/11 |

## Décisions de Jean-Guy (08/11)

- La synthèse des concurrents garde le mot de la M105 : « Plage des prix des concurrents :
  598 000 € à 779 000 € ».
- L'argument d'« Aujourd'hui » se dit par le type du bien, ni « leur » ni « son » : « 1 acquéreur
  prêt correspond à l'appartement », « à la maison » ; « au bien » si le type manque.
- « Déclarer prêt » : M52 gardée, toujours dans « … », suivi de ce qui manque.
- Accueil du Live sans logo : le nom de l'agence en grand dans la carte, pas de nom dans le bandeau
  sur cet écran. Un logo fictif pour l'agence de démonstration : la 147.
- Acquéreurs : tri par urgence ; la liste s'ouvre sur « Mes fiches », « Toute l'agence » à un geste ;
  le tri vaut dans les deux vues.
- Le Suivi et la liste du Live entrent dans la mission, avec le contrôle e2e « au plus un bouton
  plein par écran ».
- Maquettes de la partie A validées, avec deux précisions : le Point marché ouvert est le seul plein
  de l'écran du Suivi (la première carte due passe en contour) ; la liste du Live met d'abord les
  dossiers prêts pour le Live, puis les autres, chacun du plus récemment modifié au plus ancien.
- La date du rendez-vous (planche A8) n'est pas dans la 146 : une future mission, pensée avec
  « Aujourd'hui », la liste du Live triée par date et un rappel la veille (`docs/IDEES.md`).

## Partie A — Côté vendeur

### Deux composants partagés

1. **Un menu « … »** (`src/components/ui/more-menu.tsx` ; il n'en existe aucun dans `src`) : un
   bouton « … » (libellé accessible « Plus d'actions »), une liste d'entrées ; Échap, un clic dehors
   et le choix d'une entrée le ferment, les flèches le parcourent (comme le menu de la carte du
   conseiller, M125). Une entrée « danger » est en rouge, en bas, séparée.
2. **Une confirmation dans l'écran** (`src/components/ui/confirm-dialog.tsx`), tirée de celle de
   « Supprimer le dossier » (M93, `archive-project-button.tsx`, qui la reprend) : titre, phrase,
   « Annuler » (le focus), le geste en contour rouge. Elle remplace `window.confirm` sur ces écrans.

### Préparation (I9, planche A1)

3. Par carte : **la prochaine étape**, en contour, à droite — `nextDossierAction` (M110), la même que
   le bouton d'étape suivante du dossier (« Saisir le bien vendeur », « Chercher les concurrents »,
   « Décider votre prix », « Lancer le Live », « Ouvrir l'Étude de marché »). Le nom du vendeur
   devient le lien vers la Vue d'ensemble ; « Ouvrir le dossier » disparaît.
4. **« … »** : « Déclarer prêt », suivi de ce qui manque (`buildReadinessChecks`, M91), puis
   « Supprimer le dossier… » (M93 inchangé) ; sur un dossier prêt, « Remettre en préparation ».
5. L'onglet choisi (« En cours » / « Prêts ») passe en bleu clair : le seul plein est « Nouveau
   dossier vendeur ».

### Bien vendeur (C3, planche A2)

6. Fiche déjà enregistrée : les deux blocs d'import se replient en une ligne, « Importer à
   nouveau », qui les déplie sur place ; leurs boutons y passent en contour, « Enregistrer » (la
   barre, M77) est le seul plein. Fiche jamais enregistrée : inchangé. Démo : les choix de la M114
   sont dans le pli.

### Concurrents (I5, planche A3)

7. Par carte de concurrent retenu : **« Écarter »** visible (« Réintégrer » sur un écarté), et
   **« … »** : Modifier la fiche · Monter d'un cran · Descendre d'un cran · Supprimer… Les pastilles
   « Vendu par » et « Exclusivité » restent (des réponses, M83). Monter et Descendre gardent leurs
   règles (désactivés une fois le Live commencé, « Ordre figé »).
8. **Réordonner en glissant** la poignée ⋮⋮ sur ordinateur et tablette : le glisser-déposer de
   « Ordre des concurrents au Live » (M110, `live-order-editor.tsx`, action `reorderLiveCompetitors`,
   fonction `reorder_retained_comparables`), repris sur la liste des retenus pour tous les
   conseillers, pas seulement en mode expert ; chaque dépôt s'enregistre (« Ordre enregistré ») ;
   ordre figé une fois le Live commencé (M110), refus au serveur inchangé. Sur téléphone, pas de
   poignée : « … ».
9. « Supprimer… » ouvre la confirmation : « Supprimer ce concurrent ? », ce que la suppression emporte,
   et qu'« Écarter » garde le bien. La barre de lot garde ses deux gestes ; « Écarter les N biens
   sélectionnés » passe en contour.
10. **La synthèse en trois chiffres** : « Plage des prix des concurrents » (« 598 000 € à
    779 000 € », M105), « Prix médian au m² », « Surface moyenne ». Les quatre autres chiffres
    quittent l'écran (le calcul reste, il sert ailleurs).
11. En-tête : le bouton d'étape suivante reste le seul plein ; « Trouver des concurrents » en contour,
    absent quand l'étape suivante est déjà « Chercher les concurrents » ; « Ajouter un bien » en lien ;
    « Avant le rendez-vous → » retiré (il est dans la barre des étapes).

### « Lancer le Live » une fois par écran (C4, planche A4)

12. « Avant le rendez-vous » : le bouton du bloc « Ce que verra le vendeur » disparaît ; reste celui de
    l'en-tête, qui passe par « Lancer le Live » (M107) et ses rappels. Tant que la prochaine étape
    est « Décider votre prix » ou « Chercher les concurrents », elle garde le bouton plein, et le bloc
    porte dessous un lien discret, « Lancer le Live quand même », qui passe par « Lancer le Live » et
    son rappel « Aucune décision de prix » (M109) : au rendez-vous, le conseiller ne cherche pas le
    lancement ailleurs (décision de Jean-Guy, 08/11). « Document seul » (M131) inchangé. La Vue
    d'ensemble n'en a déjà plus qu'un (M143) ; l'onglet « Live » de la barre est la navigation, il
    reste.

### Liste du Live (planche A5)

13. **D'abord les dossiers prêts pour le Live** — ceux dont « Lancer le Live » s'ouvre : au moins un
    concurrent retenu, pas en « Document seul » (M104, M131), Live commencé compris (« Reprendre ») —,
    **puis les autres** ; dans chaque groupe, du plus récemment modifié au plus ancien. Le premier
    dossier garde son « Lancer le Live → » plein (ou « Reprendre (écran N sur M) → », M92) ; les
    suivants passent en contour, mêmes vérifications au clic (M104, M107, M112).

### Accueil du Live (C8, planche A6)

14. **Avec un logo** : le bandeau dit le nom de l'agence en texte, « Rendez-vous vendeur » à côté, sur
    tous les écrans du Live ; la carte porte le logo (fond sombre, ratio gardé, M55).
15. **Sans logo** : sur cet écran, le bandeau ne dit que « Rendez-vous vendeur » et le nom de l'agence
    est en grand en haut de la carte ; les écrans suivants gardent le nom dans le bandeau (le repli de
    M55, tronqué comme M72).
16. **La carte prend toute la hauteur** sous le bandeau, tablette, ordinateur et téléphone : le logo ou
    le nom en haut, la phrase et le vendeur au milieu, « Démarrer la présentation » en bas.
    « Rendez-vous vendeur » ne se dit plus qu'une fois, dans le bandeau. Aucun montant (M51) ; la
    langue du vendeur (M140 A).

### Suivi (planche A7)

17. La **première carte due**, dans l'ordre du Suivi (M96), garde son bouton plein, comme « Aujourd'hui »
    (M145). Les autres étapes dues passent en contour, leur « aujourd'hui » / « en retard » au-dessus
    inchangé. Un filtre change la première carte due : le plein la suit. **Quand le panneau du Point
    marché est ouvert** sur une carte, son bouton est le seul plein de l'écran : la première carte due
    passe alors en contour (précision de Jean-Guy, 08/11) ; le contrôle e2e le vérifie.
18. La pastille de filtre choisie passe en bleu clair (comme l'onglet de Préparation).

### Le contrôle e2e

19. **`expectOneFilled(page)`** dans `tests/e2e/support.ts` : au plus un bouton plein visible (le
    style `btnPrimary` gagne une classe repère sans effet, `btn-filled`, posée une fois dans
    `styles.ts`, que le contrôle compte ; les boutons pleins écrits à la main, hors `btnPrimary`,
    la reçoivent aussi). Appelé sur chaque écran **côté vendeur** traversé par les specs (parcours, démo,
    bienvenue, présentation directe, Live tablette, langue du vendeur) : Préparation, Vue d'ensemble,
    Bien vendeur, Concurrents, Avant le rendez-vous, Lancer le Live, liste du Live, accueil du Live,
    conclusion, Suivi, Aujourd'hui. La partie B l'étend à ses écrans. Un autre écran vendeur que le
    contrôle trouve en défaut est corrigé s'il ne s'agit que du style, sinon noté dans `docs/IDEES.md`
    (Jean-Guy, 08/11).

### Tests de la partie A

- Écrits d'abord, rouges sur le code d'aujourd'hui : `more-menu` (clavier, Échap, clic dehors) ;
  `confirm-dialog` (focus sur « Annuler ») ; la synthèse en trois chiffres et son libellé ; la
  prochaine étape d'une carte de Préparation ; « Déclarer prêt » avec ce qui manque ; « Lancer le
  Live » une seule fois sur la Vue d'ensemble, « Avant le rendez-vous » et Concurrents ; aucune
  `window.confirm` dans `src/features/comparables` ; le plein de la liste du Live et du Suivi sur la
  première ligne due seulement, et le Point marché ouvert seul plein ; le tri de la liste du Live
  (prêts pour le Live d'abord, puis du plus récemment modifié) ; l'accueil du Live avec et sans logo (le nom une seule fois).
- Vocabulaire : « fourchette » refusé dans la synthèse des concurrents (M105).
- E2E : le contrôle du point 19 ; le parcours écarte puis réintègre par la carte, supprime par « … » et
  la confirmation, glisse un concurrent et relit l'ordre ; le Live tablette mesure la carte d'accueil
  en pleine hauteur (768 × 1024 et 1024 × 768) et le nom de l'agence une seule fois.

## Partie B — Côté acquéreur et prospection

Elle part de `main` après le `/valide` de la A, et reprend `more-menu`, `confirm-dialog` et
`expectOneFilled`.

### Visites (I10, planche B1)

20. **Le chemin d'une visite**, un service pur (`visitNextStep`) testé seul :
    - bien qui n'est pas à l'agence (concurrent, annonce, bien démarché sans mandat rentré ni
      collaboration obtenue) : écrire au propriétaire ou au confrère (« À qui écrire ? » quand
      l'exclusivité est inconnue, M120 B), puis l'attente lue sur la carte (« En attente du
      propriétaire · remis le … », « Suivre dans Prospection → »), puis confirmer la visite, puis
      visite faite ;
    - bien de l'agence (mandat signé, mandat rentré, collaboration obtenue, M137 A) : confirmer la
      visite (jour et heure, M142), signer le bon de visite, visite faite (le compte rendu, M139) ;
    - visite faite : « Offre d'achat » si « Offre envisagée », sinon « Messages prêts ».
21. La carte montre ce chemin en pastilles (vert fait, bleu maintenant, gris à venir, M143) et **une
    seule étape en contour** ; le reste en liens : « Vivre ici » replié, « Confirmer la visite » ou
    « Changer la date », « Visite faite » (toujours possible), « Proposer une visite au vendeur »
    (mandat signé, M86). Visites n'a aucun bouton plein (M120 B).
22. « Bon de visite » quitte l'en-tête du groupe : c'est l'étape d'une visite d'un bien de l'agence,
    qui ouvre la page du bon la visite cochée (plusieurs biens le même jour, comme M137 A).
23. **« Ses autres réponses » quittent Visites** : la fiche les montre déjà (« Ce qu'il a répondu »,
    M122).

### Acquéreurs (I4, planche B2)

24. La liste s'ouvre sur **« Mes fiches »** (celles dont le conseiller est le titulaire,
    `buyers.advisor_id`, M145 B) ; **« Toute l'agence »** à un geste, pour tous (M117 : l'agence
    partage les fiches) ; `?vue=agence` garde le choix dans l'adresse.
25. **Trié par urgence**, dans les deux vues : la vente en cours en tête (offre acceptée à traiter,
    réponse du vendeur), puis les fiches en retard — les échéances d'« Aujourd'hui », la relance
    d'une sélection sans réponse (M135) et le contact à reprendre à 30 jours (M132), la plus en retard
    d'abord —, puis la prochaine étape la plus ancienne (remplace M117, « les miennes en tête »).
26. L'action : un **bouton en contour, à droite**, sous la prochaine étape ; « en retard de N jours »
    en orange. « Ma fiche » disparaît.
27. La recherche **filtre en tapant** (nom, sans accent ni casse, M117), sans bouton ; `?q=` garde le
    lien. **Filtres d'état**, comptés dans la vue choisie : Toutes · Prêts à visiter · À recontacter ·
    Sous offre ; un filtre à zéro ne s'affiche pas. « Ce mois-ci » inchangé (M135).

### Prospection (C9, planche B3)

28. Les compteurs sur une ligne, de même poids (« Mandats rentrés » n'est plus plein) ; « déclarés par
    vous » une fois.
29. Une colonne vide ne s'affiche pas ; les autres prennent la place.
30. Par carte, **une prochaine étape en contour et au plus un lien** : à confirmer → « Confirmer
    l'adresse » (ses choix de M84) ; prêt → « Préparer le dossier », lien « Marquer remis » (confrère :
    « Marquer contacté ») ; remis → « RDV obtenu » (confrère : « Collaboration obtenue », lien
    « Refusée ») ; rendez-vous → « Mandat rentré ». « … » : Corriger l'adresse · Pas intéressé ·
    Annuler · Ne plus solliciter… (sa confirmation de M98). Une carte « à vérifier » garde ses
    pastilles « Vendu par » / « Exclusivité » comme étape. Aucun bouton plein sur les cartes ; le seul
    plein reste « Préparer tous les courriers » (M98). Jamais de `tel:` (M145).

### Présentation acquéreur (planche B4)

31. Le changement d'écran de `/presentation` prend **le fondu du Live** (`live-enter`, M144) : 150 ms
    depuis 60 %, à chaque écran, au lieu de `live-fade-up` (0,45 s depuis un écran transparent).
    « Mouvement réduit » : aucun. Le lien sur téléphone, sans fondu, ne change pas.

### Aujourd'hui (planche B5)

32. L'argument d'une relance, côté conseiller, sans guillemets, **par le type du bien** :
    « 1 acquéreur prêt correspond à l'appartement », « … à la maison », « au terrain », « à
    l'immeuble », « au local commercial », « au parking » ; **« au bien »** si le type manque ou ne se
    reconnaît pas (le type normalisé de M54). « votre » reste au message envoyé au vendeur (M145 B),
    inchangé.

### Le Suivi, suite (décision de Jean-Guy, 08/11)

32 bis. Après « J'ai relancé » sur la carte qui porte le bouton plein, la carte due suivante le
    reprend aussitôt, sans rechargement (le plein suit les cartes encore dues, `relancedOn` compris).

### Le contrôle e2e, suite

33. `expectOneFilled` s'étend aux écrans de la partie B traversés par les specs : Visites, Acquéreurs,
    fiche acquéreur, biens idéaux, Prospection, présentation, lien du dossier.

### Tests de la partie B

- Écrits d'abord, rouges sur le code d'aujourd'hui : `visitNextStep` (chaque chemin, chaque état de
  courrier, bon signé, visite faite, offre) ; le tri des acquéreurs (vente en cours, retard,
  ancienneté) dans les deux vues, et ses filtres ; l'argument par le type (chaque type, et « au
  bien ») ; une colonne vide de Prospection absente ; aucun `tel:` dans la prospection (M145).
- E2E : le contrôle du point 33 ; la démo suit le chemin d'une visite (Wilson : « À qui écrire ? » ;
  Keller : visite faite, « Offre d'achat ») ; la liste des acquéreurs ouverte sur « Mes fiches »,
  triée, filtrée en tapant ; une carte de Prospection n'a qu'une étape et « … ».

## Hors périmètre

Vivre ici, la démo crédible (dont un logo fictif pour l'agence de démonstration, noté pour la 147),
Administration, Ma démo (mission 147) ; la date du rendez-vous (planche A8, future mission,
`docs/IDEES.md`) ; annuler une visite depuis l'écran (l'action existe, aucun écran
ne l'appelle) ; les autres compteurs de l'outil.
