# MISSION 122 — Le dossier qui fait agir

**Date** : 25/10/2026 · **Origine** : Jean-Guy, 25/10, après l'essai de la 119 : « il n'y a rien de novateur,
c'est déjà des fiches que je reçois des plateformes ou des conseillers ; je veux un PDF qui donne envie au
client de passer à l'action des visites, qu'il voie tous les critères de sa recherche validés par rapport
au bien […] pense aussi au live qui doit créer l'envie du client de visiter ». Maquette retenue :
`missions/maquettes/M122-dossier-qui-fait-agir.svg` (trois écrans : la grille, un bien, la réponse).

Remplace la mise en page de la présentation (M119 A) et du dossier (M119 B) ; leurs règles restent
(rien devant l'acquéreur qui ne doive y être, prix du 24/10, lien de 30 jours, demandes datées).
Deux parties, **une branche et un `/valide` par partie**. `npm run sauvegarde` avant la migration (A).

## L'idée, en une phrase

Tout ce qui existe part du bien. Ici, tout part **de sa recherche** : il voit ses critères validés bien par
bien, et il ne lit pas, **il répond** — visiter, peut-être, pas pour moi, et quand.

## Partie A — Le moteur commun et la présentation

1. **Un seul déroulé**, servi par la présentation (en rendez-vous) et le lien (à distance), dans cet ordre :
   **ses mots → la grille → un bien par écran → sa réponse**. Un service pur construit ce déroulé depuis la
   fiche (M117) et la sélection (M118) ; présentation, lien et PDF ne font que l'afficher.
2. **Ses mots** : « Vous m'avez dit : » suivi d'une phrase bâtie depuis la fiche (type, pièces, communes,
   les indispensables, le budget plafond), relisible et modifiable par le conseiller sur la sélection.
3. **La grille** : ses critères en lignes (indispensables marqués ★, puis préférences), les biens en
   colonnes (A, B, C), et dans chaque case **✓ satisfait · ≈ proche (écart dans la marge, nommé) ·
   ✗ non (préférence non satisfaite) · ? à vérifier ensemble (non indiqué par l'annonce)**. Un indispensable
   n'est jamais ✗ (le bien serait écarté, M118). Sous la grille, une phrase : « Le bien A coche tous vos
   critères : c'est par lui que je vous propose de commencer » (le plus de ✓, à égalité l'ordre de la
   sélection) ; si aucun ne les coche tous : « Le bien A en coche le plus : 6 sur 7. »
4. **Un bien par écran**, ses critères pour description :
   - 3 à 5 photos (M58), le libellé neutre (« 3 pièces · 68 m² · Antibes ») ;
   - « **7 critères sur 7** », puis chaque critère avec son fait : « ✓ Terrasse de 12 m² », « ✓ 2 chambres,
     comme demandé », « ? Ascenseur : à vérifier à la visite » ;
   - **le budget comme un critère**, jamais en titre : « ✓ Dans votre budget : 15 000 € de marge » avec le
     prix affiché en petit dessous ; pour un vendeur à relancer, « ? Prix à confirmer avec le propriétaire »
     (décision du 24/10) ;
   - **« Pourquoi je vous le propose »** : une phrase écrite par l'outil depuis les seuls faits de la grille
     (« Il coche vos 7 critères, dont la terrasse plein sud. » ; « Il coche 6 critères sur 7 : la surface est à
     voir ensemble. »), 140 caractères au plus, **modifiable par le conseiller** avant de présenter, figée
     ensuite ; jamais un adjectif que les faits ne portent pas ;
   - **un fait daté s'il existe** : « En vente depuis 9 jours », « Baisse de prix de 10 000 € il y a 8 jours »
     (observations M47) ; sinon rien ;
   - trois boutons : **Je veux le visiter · Peut-être · Pas pour moi**.
5. **Sa réponse** : après le dernier bien, s'il veut en visiter au moins un, **ses disponibilités** en
   puces (Samedi matin, Samedi après-midi, Dimanche, En semaine en journée, En semaine en soirée) ; pour
   chaque « Pas pour moi », **une raison** en puces (Le quartier, La surface, L'extérieur, Le parking, Le
   prix, Les travaux, Les photos, Autre). Aucun texte libre. Puis **« Ce que je fais ensuite »** :
   « Je contacte les propriétaires et je vous confirme les visites sous 24 h », le conseiller, son
   téléphone. En présentation, c'est le conseiller qui touche les réponses ; « Terminer » fige.
6. **Ce qui s'enregistre** : chaque réponse est un fait daté par bien (visiter, peut-être, pas pour moi,
   raisons, d'où : présentation ou lien) ; « Je veux le visiter » crée la demande de visite de M119 avec les
   disponibilités ; « Peut-être » et « Pas pour moi » se lisent sur la fiche et sur Visites.
7. **Les réponses nourrissent la fiche, sans la changer** : la fiche montre « Ce qu'il a répondu », et si
   une même raison revient deux fois, une suggestion (« La surface a été refusée deux fois : passer la
   surface minimum à 70 m² ? ») que le conseiller accepte ou ignore. Rien ne se modifie seul.
8. Présentation plein cadre (scène M72), tablette d'abord ; relecture « Présentation terminée le » (M119).

## Partie B — Le lien et le PDF

9. **Le lien** (`/dossier/<jeton>`, M119 B) sert le même déroulé, pensé pour le téléphone : un écran à la
   fois, défilement vertical, boutons au pouce ; « Envoyer ma réponse » à la fin ; une seconde ouverture
   montre « Merci, j'ai bien reçu votre réponse » et ce qu'il a répondu, sans pouvoir répondre deux fois.
10. **Le PDF** suit la même logique sur papier : couverture (sa phrase, la photo du bien A, « Votre
    sélection du [date] »), la grille en page 2, un bien par page, et une dernière page **« Mes choix »** :
    pour chaque bien, trois cases à cocher au stylo, ses disponibilités à cocher, le conseiller et son QR.

## Base (partie A)

11. `buyer_selection_items` : `pitch` (la phrase « Pourquoi je vous le propose », modifiable) ;
    `buyer_selections` : `buyer_words` (la phrase « Vous m'avez dit ») ; une table des réponses par bien
    (`buyer_item_responses` : agency_id, buyer_id, selection_item_id, answer ('visit' | 'maybe' | 'no'),
    reasons text[], answered_during ('presentation' | 'dossier'), answered_at) ; les disponibilités sur la
    demande de visite (`availability text[]`). RLS par agence, écriture par le serveur seul, test SQL en CI ;
    passage du gardien-sql avant l'accord.

## Preuves

12. Tests : la grille (✓ ≈ ✗ ?, jamais ✗ sur un indispensable), la phrase de tête, la phrase « Pourquoi »
    tirée des seuls faits et tronquée à 140, le budget en critère et la règle du 24/10, les raisons qui se
    répètent → suggestion, une seule réponse par lien ; « jamais côté acquéreur » sur tout le déroulé.
13. `npm run e2e` vert, tablette comprise : présentation avec un « Je veux le visiter » et un « Pas pour
    moi » motivé ; lien répondu sur un écran de téléphone (390 × 844) ; la fiche montre les réponses.

## Décisions à respecter

- M58, M72, M107 (rien devant l'acquéreur), M111 (figé), M117, M118, M119 et la décision du 24/10 sur le prix.
- L'outil n'invente rien : la phrase « Pourquoi » ne dit que ce que la grille dit. Jamais « estimation ».

## Hors périmètre

- Le bon de visite (M123), le compte rendu de visite multilingue (M124), la photo des notes (M121).

## Essai sur l'URL d'essai

- **A**, compte démo, Keller : relire et modifier « Vous m'avez dit » et une phrase « Pourquoi » →
  « Présenter la sélection » → ses mots → la grille → bien A : « Je veux le visiter » → bien B : « Pas pour
  moi », raison « La surface » → disponibilités « Samedi matin » → « Terminer » → la fiche montre ses réponses.
- **B** : le lien sur un téléphone (avec le jeton de contournement de l'essai) → répondre → « Envoyer » →
  rouvrir : « Merci, j'ai bien reçu votre réponse » ; le PDF : la grille en page 2, « Mes choix » à la fin.
