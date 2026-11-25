# Audit UX / UI d'ACM Studio — 7 novembre 2026

Mené par Jean-Guy (avec Claude), **en production** (`acm-studio-henna.vercel.app`), compte démo, après « Remettre ma démo à zéro ».
Écrans passés : connexion, Préparation, Vue d'ensemble, Bien vendeur (+ dossier d'adresse), Concurrents, Avant le rendez-vous, Live (tablette 1024×768), Suivi (ordinateur + téléphone 390×844), Prospection, Acquéreurs (liste + fiche), Visites, dossier acquéreur + lien acquéreur (téléphone), Vivre ici, Administration, Ma démo.

Maquettes : `missions/maquettes/AUDIT-aujourdhui.png`, `AUDIT-keller.png`, `AUDIT-garcia.png` (les notes jaunes disent « avant / après »).

Classement : **B = bloquant** (faux, trompeur ou gênant devant un client) · **I = important** (fait perdre du temps ou des ventes) · **C = confort**.

---

## Ce qui marche bien — à ne pas casser

- **Avant le rendez-vous** : la liste cochée en haut, le marché en un coup d'œil, la décision de prix sur le même écran. C'est le modèle à suivre.
- **Live** : le prix perçu est confirmé en grand (« 790 000 € ? ») avant d'être figé ; « Quitter » demande confirmation.
- **Lien acquéreur sur téléphone** : sa phrase, la grille de critères ✓ ≈ ?, un bien proposé en premier, trois réponses en gros boutons (50 px). Clair.
- **Suivi sur téléphone** : 3 tâches puis « Voir les 14 autres ».
- **Bien vendeur** : un seul « Enregistrer » collé en bas, compléments repliés.

---

## B — Bloquants

### B1. La fiche acquéreur ne suit pas où il en est (maquette `AUDIT-keller.png`)
Constaté sur la démo remise à zéro : **Famille Keller** « Sous offre », « Offre acceptée le 07/11 », bon de visite et offre signés… mais :
- « Prochaine étape · **Lui présenter sa sélection** » (fiche **et** liste des acquéreurs) ;
- étapes « 2 · Présenter : à faire », « 3 · Sa réponse : lien à envoyer » alors que la visite est cochée ;
- l'outil propose « passer le budget plafond à 1 579 000 € ? » ;
- le bloc « Prêt à visiter ? » et « Rapprocher » restent affichés ;
- Visites montre à la fois « Offre envisagée » et « Offre acceptée » ;
- « Fiche créée 07/11 » apparaît après des événements du 17/10.

**À faire** : la prochaine étape et les étapes viennent de l'état **le plus avancé**. Parcours en 5 étapes : Sélection → Présentée → Visite → Offre → Compromis. Offre acceptée ⇒ prochaine étape « Lancer le compromis » (prévenir l'acquéreur, transmettre au notaire) ; sélection, « Prêt à visiter ? », Rapprocher et suggestion de budget masqués ; ils reviennent si « L'offre est tombée ». Un seul badge d'état à la fois. Historique trié par date réelle.

### B2. Le Live affiche un écran vide 3 à 4 secondes entre deux écrans
Sur tablette, après « Valider et continuer » : l'écran suivant est d'abord vide (seule la barre du haut reste), puis le contenu arrive. Devant le vendeur, ça fait « l'outil plante ».
**À faire** : garder l'écran actuel tant que le suivant n'est pas prêt (données + première photo), précharger l'écran suivant et ses photos pendant que le vendeur répond. Objectif : < 300 ms perçus.

### B3. Les boutons principaux ne se lisent pas (contraste 2,5 : 1)
Blanc sur bleu clair partout : « Se connecter », « Nouveau dossier vendeur », « Lancer le Live », « Enregistrer », « Voir ma sélection » sur le téléphone de l'acquéreur. Le minimum est 4,5 : 1 ; dehors sur un téléphone, c'est illisible.
**À faire** : bouton principal en bleu foncé de la marque (≈ `#1f4e8c`, contraste > 8 : 1) ; le bleu clair seulement pour les fonds. Vérifier aussi les textes gris clairs sur blanc.

### B4. La Vue d'ensemble d'un dossier ment sur l'avancement (maquette `AUDIT-garcia.png`)
Mme Garcia est « Prêt » : les cartes 1 à 3 n'ont pas de coche, et « Conclure » en a une alors que rien n'est conclu.
**À faire** : coché vert = fait, bleu = maintenant, gris = plus tard ; mêmes règles que la liste d'« Avant le rendez-vous ». Un seul bloc « Prochaine étape » avec un seul bouton plein.

---

## I — Importants

### I1. Pas de page « Aujourd'hui » (maquette `AUDIT-aujourdhui.png`)
On arrive sur Préparation. Les tâches vendeurs sont dans Suivi (« À faire aujourd'hui · 17 »), celles des acquéreurs dans leur liste. Dans les 17 : 7 lignes « Envoyer le point de la semaine à … » (semaine du 26/10 au 01/11, encore là le 07/11) et 4 « Proposer un point avec … ».
**À faire** : page d'accueil « Aujourd'hui », trois blocs (Urgent · Vendeurs · Acquéreurs). **Une ligne par type de tâche** qui ouvre la série (« Envoyer les 7 points de la semaine »). Une tâche d'une semaine passée disparaît ou devient « en retard », pas les deux. Badge du menu = nombre de lignes, pas de tâches unitaires.

### I2. La boucle ne se voit pas côté acquéreur
4 acquéreurs « Prêt à visiter » (Moreau, Faure, Girard et Chevalier, Roux) correspondent à la maison de Mme Garcia — l'écran vendeur le dit — mais leur fiche dit « Prochaine étape · Trouver ses biens idéaux ».
**À faire** : quand un bien de l'agence correspond à un acquéreur prêt à visiter, sa prochaine étape devient « Lui proposer la maison de [vendeur] », et une tâche groupée apparaît dans Aujourd'hui.

### I3. Le menu change de mode tout seul
« Prospection » est dans les deux menus ; cliquée depuis Vendeur, l'outil bascule en mode Acquéreur (vert). Administration et Ma démo restent en mode Acquéreur.
**À faire** : un seul menu en 3 groupes (Vendeurs · Acquéreurs · Les deux) au lieu de l'interrupteur, ou au minimum ne jamais changer de mode sans clic sur l'interrupteur.

### I4. Liste des acquéreurs
- Pas triée par urgence (M. et Mme Roux, en attente depuis le 18/09, sont 7ᵉ) → trier par « en retard » puis date.
- L'action (« Présenter maintenant → ») flotte au milieu de la carte → à droite, comme un bouton.
- L'étiquette « Ma fiche » est ambiguë (c'est **sa** fiche) → « Fiche » ou supprimer (le nom est déjà un lien).
- La recherche demande de cliquer « Rechercher » → filtrer en tapant ; ajouter des filtres d'état (Prêt à visiter, Sous offre…).

### I5. Concurrents : trop de boutons
11 boutons par carte (55 à l'écran pour 5 biens), « Supprimer » rouge à côté de « Modifier », « Monter / Descendre » pour l'ordre.
**À faire** : par carte, un bouton « Écarter » visible ; le reste dans un menu « … » (Modifier, Supprimer avec confirmation) ; réordonner en glissant. La synthèse (7 chiffres) se résume à 3 : fourchette de prix, médiane au m², surface moyenne.

### I6. Saisie du prix dans le Live
On tape « 790000 » sans espaces ; le bouton « Valider » est actif champ vide ; champ `type=number`.
**À faire** : afficher « 790 000 » pendant la frappe, `inputmode="numeric"`, Valider grisé tant que le champ est vide.

### I7. Vivre ici : des données brutes montrées à l'acquéreur
Exemples (bien à Mougins) : « Ecole 2nd degré général privée **privée** Mougins School », collège = école privée à **48 min à pied**, arrêt de bus « Qui Vend Bon », « Espace vert » sans nom, et 8 risques communaux en liste brute (« rupture de barrage », « transport de marchandises dangereuses »…).
**À faire** : nettoyer les libellés (doublons, majuscules, « Ecole » → « École ») ; montrer d'abord l'établissement **public** le plus proche ; au-delà de 20 min à pied, donner le temps en voiture ; masquer un lieu sans nom ; risques regroupés en une phrase neutre « Risques recensés sur la commune (Géorisques) : … — le détail figure dans l'état des risques remis avec le compromis ».

### I8. La démo ne fait pas « vrai »
- Photos de maisons américaines (bardage, brique, pelouse) pour Vence et Saint-Paul-de-Vence → villas provençales libres de droits.
- Adresses-jeux de mots dans Prospection : rue du **Brouillon**, place de la **Fiction**, allée du **Décor**, chemin des **Figurants**, boulevard du **Scénario**, allée des Trois Cadrans → noms plausibles (chemin des Oliviers, avenue des Mimosas…) en vérifiant qu'ils n'existent pas dans la commune, ou sans numéro.
- « Exemple — M. et Mme Démo » dans Préparation.
- Téléphone du conseiller « 06 00 00 00 01 » sur le lien acquéreur → plage fictive `06 39 98 xx xx` comme le reste.
- Dossier d'adresse non construit chez Mme Garcia (dossier « prêt ») → le construire dans la démo.
- Acquéreurs « M. et Mme Lambert » et vendeurs « M. et Mme Lambert-Duval » : trop proches → renommer l'un des deux.
- Concurrents sans photo (gris) dans Concurrents.

### I9. Préparation
« Déclarer prêt » proposé sur un dossier vide ; « Supprimer » rouge au même niveau que les actions ; pas de prochaine étape.
**À faire** : une prochaine étape par carte (« Compléter le bien », « Trouver les concurrents »…) ; « Déclarer prêt » seulement si la liste d'Avant le rendez-vous est toute cochée ; Supprimer dans « … » avec confirmation.

### I10. Visites
Carte « à planifier » (Mr and Mrs Wilson) : 5 boutons de même poids, pas de date/heure de visite, « Bon de visite » proposé avant que la visite soit confirmée. « Ses autres réponses » (des « pas pour moi ») mélangées aux visites.
**À faire** : une prochaine étape par visite (Confirmer avec date et heure → Bon de visite → Retour de visite) ; le reste en liens ; « autres réponses » sur la fiche acquéreur seulement.

### I11. Lien acquéreur : on ne peut pas appeler le conseiller
Le numéro est du texte, pas un lien `tel:`. Sur téléphone, c'est le geste n° 1.
**À faire** : numéro cliquable (et e-mail `mailto:`), en bas de chaque écran du lien.

---

## C — Confort

- **C1. Dates** : « 07/11/2026 12:32:23 » (secondes) et « depuis le 07/11/2026 » → « aujourd'hui », « il y a 3 jours », « le 07/11 à 12 h 32 ».
- **C2. Couleurs** : l'orange (alerte) sert aussi pour des infos neutres (« Affiché au vendeur à la fin du Live ») → gris ; orange réservé à « à faire / en retard ».
- **C3. Bien vendeur** : « Importer depuis une annonce » et « depuis votre fiche PDF » restent en tête d'une fiche déjà remplie → repliés quand la fiche est remplie.
- **C4.** « Lancer le Live » à 3 endroits (barre d'onglets, Vue d'ensemble ×2) → une fois.
- **C5. Téléphone** : nom d'agence tronqué « AGENCE HORIZON C… » ; sur Suivi, 15 cibles sur 41 font moins de 32 px de haut → 44 px minimum.
- **C6. Administration** : absente du menu ; libellé « Veille des acquéreurs : jusqu'à … € par mois » (points de suspension affichés) ; le texte 30 € / 15 € / 10 € est difficile à suivre → une phrase : « Veille : 10 € par mois au plus, pris dans le budget de recherche (30 €) ».
- **C7. Ma démo** : la remise à zéro prend ~20 s sans message de fin → barre de progression puis « Démo remise à neuf ».
- **C8. Accueil du Live** : nom d'agence affiché deux fois, moitié basse vide.
- **C9.** Les cartes de Prospection affichent 6 actions, et 5 compteurs (dont un en bleu plein sans raison) passent sur deux lignes à 1280 px ; colonne « Adresse à confirmer » vide = moitié de l'écran → masquer les colonnes vides.

---

## Ordre proposé pour Claude Code

1. **Mission 143 — « Vrai et lisible »** : B1, B3, B4, I6, I11, C1. Peu de travail, beaucoup d'effet ; pas de migration a priori (B1 = calcul de la prochaine étape).
2. **Mission 144 — « Le Live sans trou »** : B2 (préchargement), C8.
3. **Mission 145 — « Aujourd'hui »** : I1, I2, I3 (page d'accueil + menu en 3 groupes + boucle côté acquéreur).
4. **Mission 146 — « Moins de boutons »** : I5, I9, I10, I4, C3, C4, C9.
5. **Mission 147 — « Vivre ici propre » + « Démo crédible »** : I7, I8, C6, C7.

Règles communes : un seul bouton plein par écran (la prochaine étape) ; « Supprimer » jamais à côté d'une action principale ; coché = fait ; tests en production uniquement.
