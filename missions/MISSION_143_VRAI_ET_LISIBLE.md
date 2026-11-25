# MISSION 143 — Vrai et lisible

**Date** : 07/11/2026 · **Origine** : audit UX / UI du 07/11 en production
(`missions/AUDIT_UX_UI_2026-11.md`), points **B1, B3, B4, I6, I11, C1**. Maquettes :
`missions/maquettes/AUDIT-keller.png` (B1) et `AUDIT-garcia.png` (B4). `AUDIT-aujourdhui.png` est la
mission 145 : rien de ce qu'elle montre (page « Aujourd'hui », menu en trois groupes) n'entre ici.

Équipe allégée. **Pas de migration** : tout se lit dans les tables existantes (voir « Ce qui se lit
déjà »). Si une décision demande une colonne, elle est reportée, jamais ajoutée en route. Jean-Guy ne
teste que sur la production.

Règles communes de l'audit, valables pour chaque écran touché : un seul bouton plein par écran (la
prochaine étape) ; « Supprimer » jamais à côté d'une action principale ; coché = fait.

---

## B1 — La fiche acquéreur suit où il en est (maquette `AUDIT-keller.png`)

Constaté (démo remise à zéro) : la famille Keller est « Sous offre », offre acceptée le 07/11, bon de
visite et offre signés, mais la fiche et la liste disent « Prochaine étape · Lui présenter sa
sélection », les étapes 2 et 3 sont « à faire », l'outil propose de baisser son budget, « Prêt à
visiter ? » et « Rapprocher » restent, Visites montre « Offre envisagée » et « Offre acceptée », et
« Fiche créée 07/11 » arrive après des événements du 17/10.

1. **Le parcours en cinq étapes** : Sélection → Présentée → Visite → Offre → Compromis (remplace les
   quatre de la M130 B : Biens idéaux → Présenter → Sa réponse → Visites). Chaque étape se lit à son
   **état le plus avancé** : une étape plus loin faite coche toutes celles d'avant, même si leur fait
   propre manque (une visite faite coche « Présentée » ; une offre acceptée coche « Visite »).
   - Sélection : « 3 biens » ;
   - Présentée : « le 05/11 » (présentation ou réponse par le lien) ;
   - Visite : « le 07/11 · bon signé » ;
   - Offre : « signée le … », puis « acceptée le … » ou « refusée le … » ;
   - Compromis : « à lancer » tant que l'acquéreur n'est pas « A acheté », puis coché.
2. **La prochaine étape suit l'état le plus avancé**, sur la fiche ET dans la liste des acquéreurs :
   - offre acceptée → « Lancer le compromis » : « Prévenez la famille Keller, puis envoyez le dossier
     au notaire. » ; bouton plein « Prévenir la famille Keller », lien « Transmettre au notaire »
     (les gestes de la M138, déjà écrits) ;
   - offre signée, sans réponse du vendeur → « Attendre la réponse du vendeur », jusqu'au … (la date
     de validité) ;
   - offre refusée → la prochaine étape d'avant l'offre (une nouvelle offre ou d'autres biens), comme
     aujourd'hui ;
   - sinon, la logique actuelle (M130 B, M135).
3. **Pendant une offre acceptée** (statut « Sous offre ») : la sélection, « Prêt à visiter ? »,
   « Rapprocher », les correspondances et la suggestion de budget (M122, M135) sont **masqués** ; la
   fiche dit « Recherche en pause pendant la vente · la rouvrir » (« L'offre est tombée : revenir en
   visite », M138). Tout revient si l'offre tombe.
4. **« La vente »** (bloc de la maquette) : le bien de l'offre (photo, libellé neutre, vendeur et
   type de mandat, prix affiché), le montant de l'offre lu dans l'offre signée, et les liens « Bon de
   visite signé » et « Offre d'achat signée ».
5. **« Avant le compromis »**, une liste cochée, lue dans ce qui existe (aucune colonne) :
   - Offre signée ✓ ;
   - Acceptée par le vendeur ✓ ;
   - Acquéreur prévenu : coché quand un lien vers sa copie a été créé APRÈS la réponse du vendeur
     (le geste « Prévenir l'acquéreur » de la M138 en crée un) ;
   - Dossier transmis au notaire : coché quand le lien du notaire existe (M138).
   « Date de signature » n'y est pas : elle demande une colonne (question 1).
6. **Un seul badge d'état à la fois**, celui de l'état le plus avancé : « Offre acceptée le 07/11 »
   remplace « Sous offre » et « Prêt à visiter » en tête de fiche ; sur Visites, une visite dont
   l'offre est acceptée montre « Offre acceptée le … » et plus « Offre envisagée ».
7. **« Ce qui s'est passé » trié par date réelle**, la plus récente en haut ; la démo crée la fiche
   des Keller avant leur première sélection (aujourd'hui « Fiche créée 07/11 » après le 17/10).

## B3 — Les boutons principaux se lisent (contraste ≥ 4,5 : 1)

Constaté : blanc sur bleu clair (`bg-brand`, #3ea9ff), contraste 2,5 : 1, partout — « Se
connecter », « Nouveau dossier vendeur », « Lancer le Live », « Enregistrer », « Voir ma sélection »
sur le téléphone de l'acquéreur.

8. Le bouton plein prend la **variante foncée de la marque** (`brand-deep` : #00527a par défaut,
   contraste > 8 : 1 avec le blanc ; pour une agence qui a sa charte, la variante lisible que la M55
   calcule déjà). Le bleu clair de la marque ne sert plus qu'aux fonds et aux décors.
9. Partout où un texte blanc est posé sur `bg-brand` : `btnPrimary` et les boutons propres (lien de
   l'acquéreur, scène du Live, présentation, documents à l'écran — jamais imprimés : les documents
   gardent leurs aplats).
10. Les textes gris clairs sur blanc sous 4,5 : 1 passent au gris lisible le plus proche
    (`text-zinc-400` sur blanc → `zinc-500` ou `zinc-600`).
11. Un test calcule le contraste des couleurs par défaut des boutons et des textes (aucune paire
    sous 4,5 : 1), et un test interdit `text-white` sur `bg-brand` (hors décor).

## B4 — La Vue d'ensemble dit vrai (maquette `AUDIT-garcia.png`)

Constaté : Mme Garcia est « Prêt » ; les cartes 1 à 3 n'ont pas de coche, « Conclure » en a une alors
que rien n'est conclu ; « Lancer le Live » à plusieurs endroits.

12. **Cinq étapes** en tête de la Vue d'ensemble : 1 · Le bien → 2 · Concurrents → 3 · Décision de
    prix → 4 · Live → 5 · Conclure. Vert coché = fait, bleu = maintenant, gris = plus tard ; les
    mêmes règles que la liste d'« Avant le rendez-vous » (M91, M110), lues sur le même calcul
    (`readiness`, la décision de prix, le début et la fin du Live, la conclusion). Sous chaque titre,
    son fait : « fiche complète · 3 photos », « 5 retenus », « 740 000 € » (le prix décidé), « à faire
    devant le vendeur », « après le Live ». Chaque carte mène à son écran.
13. **Un seul bloc « Prochaine étape », un seul bouton plein**, l'étape suivante de la M110
    (« Saisir le bien vendeur », « Chercher les concurrents », « Décider votre prix », « Lancer le
    Live », « Reprendre le Live », « Conclure le rendez-vous », « Voir le Suivi ») ; pour « Lancer le
    Live », une phrase (« Tablette, environ 37 minutes. Ses réponses sont enregistrées pour de
    bon. ») et le lien « S'entraîner sur le dossier d'exemple ». Les autres boutons du Live de la Vue
    d'ensemble disparaissent (la barre des étapes en haut reste, M97).
14. Les autres actions, en liens discrets sous le bloc : « Télécharger l'Étude de marché » ;
    « Supprimer le dossier… » en rouge, loin du bouton, avec la confirmation existante (M93).
    « Dupliquer » de la maquette n'existe pas : hors périmètre.
15. « Ce que le vendeur va découvrir » (la maquette) reprend « Le marché en un coup d'œil » d'Avant
    le rendez-vous (M91) : plage des prix des concurrents retenus, médiane au m², ancienneté médiane ;
    absent sous 1 concurrent. Le bloc « Acquéreurs de l'agence pour ce bien » (M133) ne change pas.

## I6 — Le prix se saisit lisiblement dans le Live

Constaté : on tape « 790000 » sans espaces ; « Valider » est actif champ vide ; champ `type=number`.

16. Tous les champs de prix du Live (valeur perçue, devinettes, prix reformulé, prix de
    commercialisation, présentation directe comprise) : champ texte `inputmode="numeric"`, chiffres
    seuls, affichés groupés pendant la frappe (« 790 000 »), le curseur gardé à sa place ; la valeur
    envoyée reste un nombre entier, relue au serveur comme aujourd'hui.
17. « Valider » (et « Confirmer et continuer ») grisé tant que le champ est vide ou à zéro ; un champ
    vide n'enregistre rien (M85) ; « Passer » reste actif là où il existe (M94).
18. En anglais (M140), le groupement suit la langue du dossier (« 790,000 ») ; la saisie accepte les
    deux séparateurs.

## I11 — Le lien de l'acquéreur : appeler le conseiller

Constaté : le numéro est du texte, pas un lien `tel:`.

19. Sur chaque écran du lien `/dossier/<jeton>` (couverture, grille, biens, sa réponse, merci, « Ce
    que nous avons vu ensemble ») et en bas de la présentation : le numéro du conseiller en lien
    `tel:` et son e-mail en `mailto:`, en bas de l'écran, cibles de 44 px au moins. Le numéro reste
    écrit en clair à côté (un `tel:` ne marche pas partout, M137). Aucun autre lien ne s'ajoute.

## C1 — Des dates qui se lisent

Constaté : « 07/11/2026 12:32:23 » (secondes), « depuis le 07/11/2026 ».

20. **Côté conseiller seulement**, un seul formateur (`src/lib/format`) : « aujourd'hui »,
    « hier », « il y a 3 jours » (jusqu'à 6 jours), puis « le 07/11 » dans l'année, « le 07/11/2025 »
    au-delà ; avec l'heure : « aujourd'hui à 12 h 32 », « le 07/11 à 12 h 32 », jamais de secondes ;
    à l'heure de Paris.
21. Il remplace `formatDateTime` et les `toLocaleDateString` des écrans du conseiller (« Décision
    enregistrée le … », « Créé le … », « depuis le … », Suivi, Visites, Prospection, Administration).
    Ne changent pas : les documents remis au client (synthèse, Point marché, Étude, dossier
    acquéreur, bon, offre : des dates absolues, dans la langue du client, M140), les journaux et
    exports, les dates saisies.
22. Le test qui interdit `toLocaleString(` hors de `src/lib/format` (M74) s'étend à
    `toLocaleDateString(`.

---

## Ce qui se lit déjà (aucune migration)

- Offre : `buyer_documents` (genre `purchase_offer`, champs figés dont le montant, `valid_until`),
  `buyer_document_acceptances` (décision et date), `buyer_document_links` (audience `offerors`,
  `notary`, dates de création), `buyer_offer_follow_ups` (M138).
- Acquéreur : `buyers.status` (`under_offer`, `bought`), ses sélections, présentations, réponses et
  visites (M117 à M139).
- Dossier vendeur : `readiness` (M52, M91), la décision de prix (M91), `live_started_at`,
  `live_ended_at` (M95), la conclusion (M53).

## Hors périmètre

La page « Aujourd'hui » et le menu en trois groupes (M145) ; le Live sans trou (B2, M144) ; les
autres points de l'audit ; « Dupliquer » un dossier ; la date de signature du compromis (question 1).

## Questions à Jean-Guy

1. **Date de signature du compromis** : la noter demande une colonne, donc une migration. Proposition :
   hors de la 143 ; la liste « Avant le compromis » s'arrête au notaire.
2. **« Acquéreur prévenu »** se lit au lien neuf vers sa copie, créé après la réponse du vendeur par
   « Prévenir l'acquéreur » (M138) ; s'il prévient par téléphone sans créer le lien, la case reste
   vide. Proposition : accepté tel quel ; le « Fait » de la M138 ne coche rien de plus (il ferme
   la tâche, il ne dit pas que l'acquéreur a été prévenu).
3. **B3 et la charte** : le bouton plein prend la variante foncée de la couleur de l'agence, et non
   plus la couleur exacte (M55 : « couleur exacte pour les aplats »). Proposition : accepté pour les
   boutons ; les aplats décoratifs et les documents imprimés gardent la couleur exacte.
4. **C1 et le client** : les dates relatives restent côté conseiller ; le client garde des dates
   absolues. Proposition : accepté.

## Preuves

- Tests :
  - le parcours et la prochaine étape de l'acquéreur pour chaque état (sans sélection, sélection,
    présentée, visite faite, offre signée, acceptée, refusée, tombée, a acheté), toujours l'état le
    plus avancé, un seul badge ;
  - ce qui est masqué « Sous offre » et revient après « L'offre est tombée » ;
  - les cinq étapes de la Vue d'ensemble pour un dossier vide, prêt, Live commencé, conclu ;
  - contraste des couleurs par défaut, aucun `text-white` sur `bg-brand` ;
  - la saisie groupée (« 790000 » → « 790 000 », « 790,000 » en anglais), « Valider » grisé vide ;
  - `tel:` et `mailto:` sur chaque écran du lien ;
  - le formateur de dates (aujourd'hui, hier, il y a N jours, dans l'année, au-delà, l'heure à Paris).
- e2e, sur la démo remise à zéro :
  - la famille Keller : « Offre acceptée le … », cinq étapes dont Compromis « à lancer », prochaine
    étape « Lancer le compromis », ni sélection, ni « Rapprocher », ni suggestion de budget ;
  - Mme Garcia : 1 à 3 cochés, 4 en cours, 5 à venir, un seul bouton plein « Lancer le Live » ;
  - le Live : taper 790000 affiche « 790 000 », « Valider » grisé quand le champ est vide ;
  - le lien d'un acquéreur sur téléphone : le numéro du conseiller est un lien `tel:`.

## Réponses de Jean-Guy (07/11)

1. La date de signature du compromis sort de la 143 ; « Avant le compromis » s'arrête au notaire ;
   notée dans `docs/IDEES.md`.
2. « Acquéreur prévenu » se coche par « Prévenir l'acquéreur » ; prévenu seulement par téléphone, la
   case reste vide pour l'instant.
3. Les boutons pleins prennent la variante foncée de la couleur de l'agence, calculée pour garantir
   au moins 4,5 : 1 avec le blanc pour TOUTE couleur d'agence ; le test le vérifie sur plusieurs
   couleurs claires. Aplats décoratifs et documents imprimés gardent la couleur exacte.
4. Dates relatives côté conseiller seulement, jamais devant le client ni dans les documents.
5. « Dupliquer » hors périmètre.
