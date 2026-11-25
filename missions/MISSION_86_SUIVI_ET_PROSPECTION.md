# MISSION 86 — Un Suivi clair, une page Prospection, et l'acheteur rapproché partout

**Date** : 10/10/2026 · **Origine** : Laurent. « Pour retrouver l'endroit des adresses localisées et
ma liste de biens à prospecter, c'est pas hyper simple… la partie Suivi pas très belle et facile
d'utilisation en UX et UI. » Puis : « on est d'accord que ma liste de prospection mentionne toujours
pour quel bien vendeur », et « n'oublie pas dans le Suivi la possibilité de faire des rapprochements
pour mes acquéreurs ». Maquettes validées le 10/10/2026 : `missions/maquettes/M86-suivi.png` et
`missions/maquettes/M86-prospection.png` (sources HTML à côté, données d'exemple).

## Objectif

1. Le Suivi se lit d'un coup d'œil : une ligne courte par dossier, une seule action selon l'issue.
2. La liste des concurrents à prospecter a sa propre page, « Prospection », dans le menu, avec
   toutes les adresses de tous les mandats signés. Chaque ligne dit pour quel bien vendeur.
3. La recherche acheteur existante (M54, « Un acheteur dans le pipe ? ») cherche aussi dans les
   concurrents à prospecter, et range ses résultats en trois groupes avec l'action qui va avec.

## Critères d'acceptation (testables à l'écran)

### A. Le Suivi (`/suivi`) — maquette M86-suivi.png

1. En haut, quatre compteurs cliquables qui filtrent la liste : « Mandats signés », « À relancer »,
   « Vendus ailleurs · retirés », plus un compteur sombre « Écart moyen : prix du vendeur → prix de
   commercialisation » (moyenne en %, mandats signés seulement ; masqué s'il n'y a aucun mandat).
2. Sous les compteurs, le panneau « Un acheteur dans le pipe ? » (voir C), puis des filtres en
   pastilles : Tous / Mandats signés / À relancer / Vendus ailleurs · retirés.
3. Une ligne par dossier, avec une barre de couleur à gauche selon l'issue (vert = mandat signé,
   bleu = à relancer, gris = vendu ailleurs ou retiré) :
   - nom du dossier et badge de l'issue ; en dessous « type · pièces · surface · commune · conclu
     le JJ/MM » ;
   - « Le chemin parcouru » : prix de départ du vendeur → prix de commercialisation, avec l'écart
     en % (M82) ; « → — » s'il n'y a pas de prix de commercialisation ;
   - « Prêt à lancer » : « 7 → 10/10 », ou « 10/10 » si la note n'a pas changé (M85) ; rien si
     aucune note ;
   - une seule action, à droite :
     - mandat signé → bouton « Prospecter · N concurrents → » qui ouvre la page Prospection
       filtrée sur ce bien, avec en dessous l'avancement (« 1 prêt · 3 adresses à confirmer ·
       1 remis ») ;
     - à relancer → « Relancer → » (l'action d'aujourd'hui), avec en dessous « Ce qui le retient :
       « … » » (réponse M85, ou motif de refus) ;
     - vendu ailleurs ou retiré → seulement « Voir le détail des prix ▾ ».
4. Le détail des prix (marché calculé, analyse du conseiller, prix conseillé, convenu vs
   conseillé) est replié sous « Voir le détail des prix ▾ » sur chaque ligne. Rien ne disparaît
   par rapport à aujourd'hui : tout ce que montrent les cartes actuelles reste accessible ici.
5. Changer l'issue d'un dossier (formulaire actuel) reste possible depuis la ligne dépliée.
6. Tablette (M72) : la ligne passe sur deux niveaux sans couper les prix ni les badges
   (`white-space: nowrap` sur les montants et badges).

### B. La page Prospection (`/prospection`) — maquette M86-prospection.png

7. Nouvelle entrée du menu entre Suivi et Administration : « Prospection » avec le sous-titre
   « Concurrents à démarcher » (badge « NOUVEAU » pendant le pilote).
8. Elle liste tous les concurrents à prospecter de tous les mandats signés de l'agence, pour le
   conseiller connecté et son agence (RLS existante). Mêmes données que la section « Concurrents à
   prospecter » du dossier (M75, M83, M84), sans calcul en double : on réutilise
   `get-prospecting-rows` et `build-prospecting-rows`.
9. **Chaque carte rappelle toujours le bien vendeur** en pied de carte : « Pour : [nom du dossier]
   · [type pièces · commune] », lien vers le dossier.
10. En haut : un filtre « Bien vendeur : tous / [chaque mandat signé] » (le bouton « Prospecter »
    du Suivi ouvre la page filtrée), un filtre « Confrères et propriétaires / Confrères /
    Propriétaires », et le bouton « Imprimer ma tournée » (impression navigateur de la liste
    filtrée, comme M75).
11. Quatre compteurs : à démarcher, dossiers remis, rendez-vous obtenus, mandats rentrés.
12. Quatre colonnes (vue tableau). Sur tablette en portrait, les colonnes s'empilent :
    - **Adresse à confirmer** : les boutons existants « C'est la bonne adresse / Localiser
      moi-même / Saisir l'adresse » (M84), sans changement de comportement ;
    - **Prêt à envoyer** : « Préparer le dossier » (M84, version propriétaire ou confrère selon
      M83) et « Marquer remis » ;
    - **Dossier remis** : date de remise, « RDV obtenu » ;
    - **Rendez-vous & mandats** : « RDV obtenu » puis « Mandat rentré » (badge vert).
13. Sur chaque carte : l'adresse, le badge M83 (« Exclusivité · appeler le confrère » en orange,
    « Propriétaire · aller sonner » en bleu), la ligne du concurrent (type · pièces · surface ·
    prix · portail). Les prix ne coupent jamais à la ligne.
14. Le statut de prospection (à confirmer → prêt → remis → RDV obtenu → mandat rentré) et ses
    dates sont enregistrés par concurrent. « À confirmer » et « prêt » se déduisent de l'adresse,
    comme aujourd'hui ; seuls « remis », « RDV obtenu » et « mandat rentré » sont nouveaux.
    **Migration soumise avant d'être appliquée** (compter avant/après, `supabase db push --linked`).
    On peut revenir en arrière d'un cran (erreur de clic).
15. La section « Concurrents à prospecter » du dossier reste, en plus court : les 3 premières
    lignes et « Tout voir dans Prospection → ».
16. Jamais côté vendeur : aucune adresse concurrente dans le Live ni dans ce qu'on lui montre
    (`never-seller-side.test.ts` reste vert et couvre la nouvelle page).

### C. Le rapprochement acheteur — dans le Suivi

17. On garde le panneau M54 « Un acheteur dans le pipe ? » : mêmes six champs, rien n'est
    enregistré, aucune fiche acheteur. Le bouton devient « Rapprocher ». Mise en page sur une
    ligne en grand écran (maquette).
18. Il cherche dans trois listes et range les résultats en trois groupes, chacun avec son action :
    - **Mes mandats** (dossiers signés) → « Proposer une visite » (ouvre le dossier) ;
    - **Mes vendeurs à relancer** → « Rappeler : j'ai un acheteur » (ouvre la relance du dossier) ;
    - **Concurrents à prospecter** (ceux de la page Prospection, prix = prix affiché de l'annonce)
      → « Ajouter à la tournée » pour un propriétaire, « Appeler le confrère » pour une
      exclusivité (M83). Chaque concurrent rappelle son bien vendeur (« Pour : … »).
    En tête : « N biens correspondent à cet acheteur ».
19. Règles validées par Laurent pour « correspond » :
    - type identique (règle M54 conservée : le type filtre, il ne pondère pas) ;
    - commune identique, plusieurs communes possibles séparées par des virgules ; Juan-les-Pins
      compte comme Antibes (s'il existe déjà une table des quartiers ou communes associées,
      on la réutilise, sinon on s'en tient à cette égalité) ;
    - pièces : au moins le nombre demandé ;
    - surface : au moins celle demandée, avec 5 % de marge (60 m² demandés → 57 m² acceptés) ;
    - prix : entre le budget min et le budget max + 5 % (négociation) ;
    - un champ laissé vide ne filtre pas.
    Le moteur reste celui de M54 (`buyer-match.ts`, `scoreCandidate`) pour classer à l'intérieur
    de chaque groupe ; ces règles décident seulement qui entre dans « correspond ».
20. Les biens proches mais hors règles ne disparaissent pas : un repli « Proches mais hors
    critères (N) » en dessous, avec l'écart chiffré déjà produit par M54 (« 12 000 € au-dessus du
    budget », « 6 m² de moins »). Les dossiers sans type restent à part, comme aujourd'hui.
21. Rien trouvé : le message actuel (« Votre Suivi ne contient aucune maison — 3 appartements… »)
    reste, en comptant aussi les concurrents.
22. Tests unitaires des règles 19 (bornes 5 % surface et budget, champ vide, plusieurs communes),
    en complément de `buyer-match.test.ts`.

### D. Pour finir

23. `npm run e2e` vert, tablette comprise ; ajouter un parcours : Suivi → « Prospecter » →
    page Prospection filtrée sur le bien → « Marquer remis » → la carte passe dans « Dossier
    remis ».

## Décisions à respecter

- M54 (recherche acheteur jetable, le type filtre), M72 (tablette), M75 (Localisateur, adresses
  jamais côté vendeur), M83 (exclusivité ; agence sans mention = mandat simple), M84 (dossier de
  prospection, confirmation d'adresse), M85 (note de closing).
- Vocabulaire produit : « Concurrent », jamais « comparable » à l'écran.
- « Pas d'usine à gaz » : une action principale par ligne et par carte.
- On ne modifie pas l'extension ni le Localisateur.

## Hors périmètre

- Fiche acheteur enregistrée, import d'acquéreurs depuis le logiciel d'agence.
- Glisser-déposer entre colonnes (les boutons suffisent pour le pilote).
- Statistiques de prospection par conseiller.

## Essai sur l'URL d'essai

1. Ouvrir Suivi : les compteurs, les lignes compactes, « Voir le détail des prix » se déplie.
2. Sur un mandat signé, « Prospecter · N concurrents → » : la page Prospection s'ouvre filtrée sur
   ce bien ; chaque carte affiche « Pour : … ». Confirmer une adresse, préparer un dossier,
   « Marquer remis », « RDV obtenu », « Mandat rentré » ; recharger : les statuts restent.
3. Menu « Prospection » : toutes les adresses de tous les mandats, filtre bien vendeur, impression.
4. Dans Suivi, acheteur « Appartement · 3 pièces · 60 m² · 280 000 – 340 000 € · Antibes » :
   les trois groupes apparaissent avec leurs boutons ; un 3 pièces à 350 000 € est dans
   « Proches mais hors critères » avec l'écart chiffré.
5. Sur tablette : rien ne déborde, aucun prix coupé.
