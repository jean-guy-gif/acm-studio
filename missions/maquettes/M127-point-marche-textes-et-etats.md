# M127 — Le point marché · états, textes exacts, hiérarchie

Maquettes : `M127-point-marche-01…14.svg` (générées par `M127-point-marche-generateur.mjs`, `node` sans
dépendance). Contenu : le dossier de démonstration « Conclu, mandat signé » de Mougins — M. Lefebvre, villa
7 pièces 210 m², prix retenu ensemble 1 639 500 €, analyse du conseiller 1 642 000 € (donc vert, M116),
5 concurrents dans l'ordre du Live : C1 Valbonne 225 m² (le plus dangereux, prix du rendez-vous non relu,
1 690 000 € aujourd'hui) · C2 Mougins 212 m² (1 699 000 €, retirée le 03/11 après 150 jours → vente
probable, 5 à 10 %, soit 1 529 000 à 1 614 000 €) · C3 Mougins 220 m² (1 720 000 €, retirée le 20/10 après
320 jours → retiré sans vente) · C4 Mougins 205 m² (1 650 000 → 1 590 000 €, −3,6 %) · C5 Mougins 240 m²
(1 745 000 → 1 695 000 €, −2,9 %). Nouveaux venus retenus : Mougins 210 m² 1 830 000 € (vu depuis le
02/11), Mougins 215 m² 1 580 000 € (vu depuis le 28/10). Rendez-vous du 12/10/2026, point du 15/11/2026.
Échelle commune des trois lignes : 1 550 000 → 1 850 000 €.

Dans la vraie démo, le prix du rendez-vous de C1 serait connu (les observations sont écrites à la
création) : « non relu » illustre un dossier conclu AVANT la mission (A 2, `meeting_price_source =
'current'`). Il reste « le plus dangereux » pour montrer que le repère de la ligne 1 porte alors son prix
du jour.

## Les états

| Écran | État | Ce qu'il dit |
|---|---|---|
| Suivi, ligne mandat signé | Sans point encore (01) | Zone « Points marché » : « Aucun point marché pour ce mandat. La relecture des annonces est gratuite ; le premier Point marché s'écrira à la fin de la mise à jour. » Bouton contour « Mettre à jour les concurrents ». |
| Suivi | Relecture en cours (02 a) | Le bouton devient grisé « Relecture 3 sur 5… » avec une barre ; à droite « Par l'extension ACM, sans appel payant. Ne fermez pas l'onglet. ». « Changer l'issue » reste. |
| Suivi | Extension absente | À la place de (a) : « Installez ou activez l'extension ACM, puis réessayez. » + bouton contour « Réessayer ». Rien n'est écrit, aucun point n'est créé. (En démo, pas d'extension : la relecture simulée part.) |
| Suivi | Relecture finie (02 b) | Panneau « Point du 15/11 enregistré » + résumé + une ligne par concurrent avec sa pastille (Baisse / Vente probable / Retiré sans vente / Non relu / Inchangé) et sa phrase de fait. Puis (c) s'affiche sous le panneau. |
| Suivi | Proposition payante (02 c) | « Chercher les nouveaux venus sur le marché ? » · coût et périmètre · bouton plein « Chercher les nouveaux venus · jusqu'à 0,60 € » · texte « Pas maintenant ». |
| Suivi | Budget du mois atteint | (c) devient : « Budget de recherche du mois atteint : la recherche des nouveaux venus reviendra le 1er décembre. » — pas de bouton plein, seulement « Fermer » en texte. Le point est écrit quand même. |
| Suivi | Recherche en cours | Le bouton plein dit « Recherche en cours…», désactivé ; sous lui « Jusqu'à 0,60 € réservés sur le budget du mois. » |
| Suivi | Nouveaux venus trouvés (03) | « Nouveaux sur le marché depuis le rendez-vous · 2 trouvés · 0,20 € facturé » ; carte : libellé neutre, prix, €/m², faits, « Vu sur le marché depuis le 02/11 », « Retenir » (contour) / « Écarter » (texte). Retenu → pastille « Retenu ✓ ». |
| Suivi | Aucun nouveau venu | « Aucun nouveau venu depuis le 12/10 avec les critères du dossier · 0,20 € facturé. » Le point garde la ligne 3 vide. |
| Suivi | Après (03, 04) | « Points marché » : « Point du 15/11 · 5 annonces relues · 2 baisses · 1 vente probable · 1 retiré sans vente · 2 nouveaux venus » + « Ouvrir le Point marché → » (contour). Détail ouvert : « Ce que le vendeur a dit » à gauche, « Où en est son prix · Point du 15/11 » à droite (04). |
| Suivi | Annonce réapparue | Relecture suivante : la ligne du concurrent dit « De nouveau en ligne le 02/12 : la conclusion « vente probable » est effacée » ; un « Retiré sans vente » reste « Retiré » (règle B 5). |
| Suivi | Erreur d'écriture du point | « Le point n'a pas pu être enregistré. Réessayez. » sous le bouton, le bouton redevient actif ; la relecture des prix (M105) est acquise. |
| Écran conseiller (05) | Normal | Sélecteur « Point du 15/11 — 5 relues · 2 baisses · 2 nouveaux venus ▾ » (un point par entrée) ; « Imprimer » plein ; « Créer un lien pour le vendeur (30 jours) » contour ; « Sans photo » par concurrent et par nouveau venu ; aperçu A4 à droite. |
| Écran conseiller | Lien créé | Le lien s'affiche une fois avec « Copier », « SMS », « WhatsApp », « E-mail » (comme M122 B), « Retirer le lien » en texte. |
| Écran conseiller | Point sans nouveau venu | La section « Nouveaux venus » des cases disparaît ; l'aperçu n'a pas la page 02. |
| Document (06–13) | — | Voir les pages. Une page de concurrent « Inchangé » (non dessinée) a le bloc : « Au rendez-vous 1 690 000 € · Aujourd'hui 1 690 000 € · 0 % · Toujours en vente · depuis N jours ». Sans photo : la fiche prend toute la largeur, pas de cadre vide. |
| Lien téléphone (14) | Normal | En-tête de l'agence + « Point marché du 15/11 », puis le document en colonne ; « Télécharger en PDF » fixé en bas, la place gardée sous la page. |
| Lien téléphone | Expiré / retiré | « Ce lien n'est plus valable. » (page introuvable, comme M119). |

## Textes exacts (écran · élément · texte)

| Écran | Élément | Texte |
|---|---|---|
| Suivi | Bouton (contour) | Mettre à jour les concurrents |
| Suivi | Bouton pendant la relecture | Relecture 3 sur 5… |
| Suivi | Zone | POINTS MARCHÉ |
| Suivi | Zone vide | Aucun point marché pour ce mandat. La relecture des annonces est gratuite ; le premier Point marché s'écrira à la fin de la mise à jour. |
| Suivi (b) | Titre | Point du 15/11 enregistré |
| Suivi (b) | Résumé | 5 annonces relues · 2 baisses · 1 vente probable · 1 retiré sans vente · 1 prix au rendez-vous non relu |
| Suivi (b) | Pastilles | Baisse · Vente probable · Retiré sans vente · Non relu · Inchangé · Réapparue |
| Suivi (b) | Ligne baisse | 1 650 000 € au rendez-vous → 1 590 000 € aujourd'hui · −3,6 % · baisse vue le 03/11 |
| Suivi (b) | Ligne vente probable | Retirée le 03/11 après 150 jours : vente probable, négociation estimée de 5 à 10 % (1 529 000 à 1 614 000 €) |
| Suivi (b) | Ligne retiré | Retirée le 20/10 après 320 jours : retiré du marché sans vente |
| Suivi (b) | Ligne non relu | Prix au rendez-vous non relu ; prix du jour : 1 690 000 € · en vente depuis environ 160 jours |
| Suivi (b) | Note | « Ont baissé depuis le rendez-vous : 2 sur 5 » se calcule sur le prix du rendez-vous. |
| Suivi (c) | Titre | Chercher les nouveaux venus sur le marché ? |
| Suivi (c) | Texte | Recherche payante sur le marché : jusqu'à 0,60 €. Les critères du dossier, les annonces vues sur le marché depuis le 12/10 seulement, sans celles déjà retenues ou écartées. Budget de recherche du mois : 4,20 € sur 30 €. |
| Suivi (c) | Bouton plein | Chercher les nouveaux venus · jusqu'à 0,60 € |
| Suivi (c) | Texte discret | Pas maintenant |
| Suivi (c) | Budget atteint | Budget de recherche du mois atteint : la recherche des nouveaux venus reviendra le 1er décembre. |
| Suivi | Panneau résultats | Nouveaux sur le marché depuis le rendez-vous · 2 trouvés · 0,20 € facturé · critères du dossier · vus sur le marché après le 12/10 |
| Suivi | Carte nouveau venu | Vu sur le marché depuis le 02/11 (jamais « Publié le ») |
| Suivi | Boutons carte | Retenir (contour) · Écarter (texte) · Retenu ✓ (pastille) |
| Suivi | Aucun résultat | Aucun nouveau venu depuis le 12/10 avec les critères du dossier · 0,20 € facturé. |
| Suivi | Liste des points | Point du 15/11 · 5 annonces relues · 2 baisses · 1 vente probable · 1 retiré sans vente · 2 nouveaux venus |
| Suivi | Bouton (contour) | Ouvrir le Point marché → |
| Suivi | Sous la liste | Ont baissé depuis le rendez-vous : 2 sur 5 |
| Suivi détail | Colonne droite | OÙ EN EST SON PRIX · POINT DU 15/11 |
| Suivi détail | Titres des lignes | 1 · Au rendez-vous du 12/10 · 2 · Aujourd'hui · 3 · Face aux nouveaux venus |
| Suivi détail | Phrases courtes | Le moins cher des 6 biens comparés. · 1 concurrent sur 3 passé sous son prix · 2e moins cher sur 4 · 2 disparus : 1 vente probable, 1 retiré. · 2 nouveaux venus retenus : 1 sous son prix, 1 au-dessus · médiane 65 500 € au-dessus. |
| Suivi détail | Repères | Le plus bas · Médiane · Le plus haut · Le plus dangereux · Prix retenu |
| Écran conseiller | Titre | Point marché |
| Écran conseiller | Sous-titre | M. Lefebvre · Villa · 7 pièces · 210 m² · Mougins · mandat signé le 12/10 |
| Écran conseiller | Retour | ← Retour au Suivi |
| Écran conseiller | Sélecteur | Point du 15/11 — 5 relues · 2 baisses · 2 nouveaux venus |
| Écran conseiller | Explication | Ce document montre au vendeur ce qui a bougé depuis le rendez-vous du 12/10 : chaque concurrent, son prix d'alors et d'aujourd'hui, les annonces disparues, les nouveaux venus, puis où en est son prix. Ni adresse, ni titre, ni lien d'annonce ; « estimé » partout où l'outil déduit. |
| Écran conseiller | Bouton plein | Imprimer |
| Écran conseiller | Bouton contour | Créer un lien pour le vendeur (30 jours) |
| Écran conseiller | Sous le bouton | Sans compte, jamais indexé, 30 jours ; l'outil n'envoie rien. |
| Écran conseiller | Cases | Sans photo · Concurrent 1 · Villa · 7 pièces · 225 m² · Valbonne (une par concurrent et par nouveau venu) |
| Écran conseiller | Aide des cases | Cochez « Sans photo » pour retirer la photo du document imprimé et du lien. · Rien ici n'est imprimé. |
| Document couverture | Étiquette | POINT MARCHÉ |
| Document couverture | Sur-titre | VILLA · MOUGINS |
| Document couverture | Titre | Point marché du 15 novembre 2026 |
| Document couverture | Ligne | Depuis notre rendez-vous du 12 octobre 2026 · Pour M. Lefebvre |
| Document couverture | Chiffres | PRIX RETENU ENSEMBLE 1 639 500 € · CONCURRENTS SUIVIS 5 · NOUVEAUX VENUS RETENUS 2 |
| Document 01 | Titre | 01 · Les concurrents, depuis le rendez-vous — Pour chaque bien regardé ensemble : son prix au rendez-vous, son prix aujourd'hui, et ce qu'il est devenu. |
| Document 01 | Surtitre de fiche | CONCURRENT 1 · LE PLUS DANGEREUX, SELON VOUS |
| Document 01 | Grille | SES CARACTÉRISTIQUES FACE À VOTRE BIEN · Surface · Terrain · Pièces · chambres · Extérieur · État · DPE · badges Équivalent / Avantage pour lui / Avantage pour vous (M40) |
| Document 01 | Bloc des prix | LE PRIX, DEPUIS LE RENDEZ-VOUS · AU RENDEZ-VOUS 1 650 000 € le 12/10 · AUJOURD'HUI 1 590 000 € baisse vue le 03/11 · ÉCART −3,6 % soit 60 000 € de moins · Toujours en vente · depuis 142 jours · 7 756 €/m² aujourd'hui |
| Document 01 | Vente probable | AUJOURD'HUI Retirée le 03/11, après 150 jours · CONCLUSION Vente probable, négociation estimée de 5 à 10 % · Prix de vente estimé : entre 1 529 000 € et 1 614 000 € · Une estimation d'après la durée de commercialisation au retrait, selon la règle de l'agence : rien ne dit que ce bien est vendu, ni à quel prix. |
| Document 01 | Retiré | AUJOURD'HUI Retirée le 20/10, après 320 jours · CONCLUSION Retiré sans vente · plus de 300 jours en vente |
| Document 01 | Non relu | AU RENDEZ-VOUS Non relu · le prix d'alors n'a pas été relevé · PRIX DU JOUR 1 690 000 € relu le 15/11 · ÉCART — sans prix du rendez-vous, pas d'écart |
| Document 01 | Durée « environ » | depuis environ 160 jours (quand la date de publication n'est qu'une borne, M47) |
| Document 02 | Titre | 02 · Nouveaux sur le marché depuis le rendez-vous — Les biens apparus depuis le 12 octobre et retenus par votre conseiller pour la comparaison. |
| Document 02 | Carte | NOUVEAU VENU 1 · libellé neutre · 4 photos · faits · 1 830 000 € · 8 714 €/m² · Vu sur le marché depuis le 02/11 |
| Document 02 | Note | Ces annonces n'étaient pas en vente au rendez-vous : elles n'entrent pas dans les lignes « Au rendez-vous » et « Aujourd'hui » de la page suivante. |
| Document 03 | Titre | 03 · Où en est votre prix — Trois lignes, à la même échelle, pour comparer d'un coup d'œil. |
| Document 03 | Ligne 1 | 1 · Au rendez-vous du 12 octobre · 5 concurrents · prix du rendez-vous · repères Le plus bas / Prix médian / Le plus haut / Le plus dangereux, selon vous / Prix retenu ensemble |
| Document 03 | Phrase 1 | Au rendez-vous, votre prix retenu était sous le plus bas des 5 concurrents : le moins cher des 6 biens comparés. |
| Document 03 | Ligne 2 | 2 · Aujourd'hui, 15 novembre · 3 concurrents encore en vente · 2 annonces disparues, comptées à part · pastille « 1 vente probable · 1 retiré sans vente » · repère « Votre prix, inchangé » |
| Document 03 | Phrase 2 | Aujourd'hui, 1 concurrent sur 3 est passé sous votre prix : vous êtes le 2e moins cher des 4 biens encore en vente. 2 annonces ont disparu : 1 vente probable, 1 retirée sans vente. |
| Document 03 | Ligne 3 | 3 · Face aux nouveaux venus · 2 nouveaux venus retenus · vus sur le marché après le 12 octobre · repère « Votre prix » |
| Document 03 | Phrase 3 | 2 nouveaux venus retenus depuis le rendez-vous : 1 est sous votre prix, 1 au-dessus. Leur prix médian est 65 500 € au-dessus du vôtre. |
| Document 03 | Ligne 3 vide | Aucun nouveau venu retenu depuis le rendez-vous (cadre pointillé, rien de dessiné) |
| Document 03 | Légende | plus bas · plus haut · prix médian · le plus dangereux, selon vous · votre prix retenu ensemble · Couleur de votre prix : vert, sous +5 % de l'analyse de votre conseiller (ici « Prix aligné sur le marché ») · orange, de +5 à +10 % · rouge, au-delà. La même sur les trois lignes. |
| Document dernière page | Titre | POUR LIRE CE DOCUMENT |
| Document dernière page | Texte | Les prix cités sont ceux des annonces, pas des prix de vente. Une annonce disparue n'est pas une vente constatée : « vente probable » et la négociation « estimée » sont déduites de la durée de commercialisation au retrait, selon la règle de l'agence ; « retiré sans vente » dit une annonce retirée après plus de 300 jours. Rien ici n'affirme qu'un bien est vendu, ni à quel prix. Surfaces et caractéristiques telles qu'annoncées, à vérifier. « Vu sur le marché depuis le … » est la date à laquelle l'annonce a été vue pour la première fois, pas sa date de publication. |
| Document dernière page | Conseiller | VOTRE CONSEILLER · nom · téléphone · e-mail · photo · QR carte de contact (M84) ; mentions de l'agence (M102) |
| Document pied | Pied de page | ÉTUDE CONFIDENTIELLE · MOUGINS · 15 NOVEMBRE 2026 · 02 / 09 |
| Lien téléphone | En-tête | logo · Point marché du 15/11 |
| Lien téléphone | Bouton fixé | Télécharger en PDF (contour, seul bouton, la place gardée sous la page) |

Mots interdits, vérifiés : jamais « estimation » (on dit « estimé », « une estimation d'après la durée… »
est à remplacer par « déduit d'après la durée… » si le test de vocabulaire refuse le nom — voir question 4),
jamais « Publié le », jamais « disponible », jamais d'adresse, de titre ni de « Vendu par ».

## Hiérarchie

- **Suivi** : on voit d'abord le nom et « Prospecter · 5 concurrents → » (plein), puis la barre
  (« Changer l'issue », « Mettre à jour les concurrents », en contour), puis « Points marché » en
  dessous ; le panneau de l'enchaînement s'insère entre la barre et les points et porte, à lui seul, un
  bouton plein ((c) « Chercher les nouveaux venus »). Le détail déplié met « Ce que le vendeur a dit » à
  gauche et les trois lignes à droite, à la même largeur de colonne. En 1024 × 768 le détail passe sur
  deux rangées (les lignes sous « ce que le vendeur a dit »), jamais de défilement de côté.
- **Écran conseiller** : panneau de réglage à gauche (le point, l'explication, « Imprimer » plein,
  « Créer un lien » contour, les cases), l'aperçu à droite ; « Imprimer » est visible sans défiler.
- **Document** : couverture bord à bord ; une fiche par page qui ne se coupe jamais ; sur chaque fiche,
  l'ordre est photos → caractéristiques → prix, le bloc des prix étant ce que l'œil cherche (trois cartes,
  la carte du jour en couleur : vert baisse, orange vente probable, gris retiré, ambre non relu) ; la
  page des trois lignes garde les prix des concurrents en gris et le prix du vendeur seul en couleur ;
  la phrase de fait est encadrée, sous chaque ligne.
- **Téléphone** : rien de côté ; les libellés des repères quittent la ligne (trop étroite) pour une liste
  dessous ; le seul bouton est en bas, fixé, et la page garde sa place sous lui (M122 B).

---

# Partie B — « Les nouveaux venus » (mission 127 B, 29/10)

Les maquettes 02 (c), 03, 11, 12 et 14 restent la référence ; cette section dit ce qui change ou se
confirme, sur le code livré le 29/10 (`market-update/`, `refresh-prices-button.tsx`, le document, la page
conseiller, le lien). Une seule maquette nouvelle : **15 · « Ce lien n'est plus valable »** (390 × 844),
`M127-point-marche-15-lien-plus-valable-telephone.svg`. Contenu : les mêmes Lefebvre à Mougins ; nouveaux
venus Mougins 210 m² 1 830 000 € (vu depuis le 02/11) et Mougins 215 m² 1 580 000 € (vu depuis le 28/10).

## Ce que les rendus du 29/10 montrent déjà (écarts avec les maquettes de la partie A)

| Rendu | Écart | Verdict |
|---|---|---|
| `suivi-ligne-lefebvre-1280x800` | Les repères des lignes compactes sont listés SOUS la ligne (maquette 04 : sur la ligne). | Amélioration : lisible, aucun chevauchement, même motif que le téléphone. À garder pour la ligne 3. |
| `suivi-ligne-lefebvre-1280x800` | « Mise à jour faite le 15/11 à 10:42 » (maquette 03) n'existe pas ; « Point du 29/10/2026 » le dit. | Dérive acceptée : ne pas l'ajouter. |
| `suivi-ligne-lefebvre-1024x768` | Le détail passe en une colonne (lignes sous « Ce que le vendeur a dit »). | Conforme à la hiérarchie écrite en A. |
| `point-marche-conseiller-1280x800` | Réglages en en-tête sur toute la largeur, aperçu dessous (maquette 05 : panneau à gauche, aperçu à droite) ; « Imprimer » plein en haut à droite, « Créer un lien » contour visible sans défiler (y = 464). | Amélioration : la page est la même que la synthèse (M113). La B ajoute dans cet en-tête : les cases « Sans photo » des nouveaux venus et la zone de partage. |
| `point-marche-lien-public-390x844` | La couverture porte « NOUVEAUX VENUS RETENUS 0 » : la capture est d'avant le correctif du soir (le code ne l'affiche plus à 0). | La B ne montre ce chiffre qu'après une recherche faite (voir « Couverture »). |
| `point-marche-lien-public-390x844` | Pas de barre d'en-tête « Point marché du 15/11 » (maquette 14) : la couverture dit l'agence et la date. | Dérive acceptée : la maquette 14 se lit sans sa barre. |
| `point-marche-lien-public-390x844` | « Pour lire ce document » ne dit pas encore la phrase « Vu sur le marché depuis le … est la date à laquelle l'annonce a été vue pour la première fois ». | À ajouter en B, seulement quand la page 02 existe. |

## Les états (B)

| Écran | État | Ce qu'il dit |
|---|---|---|
| Suivi (c), sous « Point du 15/11 enregistré » | Proposition payante | Carte à barre verte : titre « Chercher les nouveaux venus sur le marché ? » · « Recherche payante sur le marché : jusqu'à 0,60 €. Les critères du dossier, les annonces vues sur le marché depuis le 12/10 seulement, sans celles déjà retenues ou écartées. » · bouton plein « Chercher les nouveaux venus · jusqu'à 0,60 € » · texte « Pas maintenant ». **Pas de montant consommé** (M100 : seul le manager voit la consommation) ; pour un manager à 80 % ou plus, la ligne de M100 s'ajoute : « 86 % du budget de recherche du mois utilisé ». Tant que (c) est ouvert, « Prospecter » passe en contour (question 1). |
| Suivi (c) | « Pas maintenant » | Le panneau (c) se ferme ; le point reste ; sur la ligne du dernier point, à côté d'« Ouvrir le Point marché → », un lien texte « Chercher les nouveaux venus · jusqu'à 0,60 € » tant qu'aucune recherche n'a été faite pour ce point (question 4). |
| Suivi (c) | Budget du mois atteint | À la place du bouton plein : « Budget de recherche du mois atteint : la recherche des nouveaux venus reviendra le 1er décembre. » + « Fermer » en texte. Le point est écrit ; rien n'est réservé. |
| Suivi (c) | Budget illisible | « Le budget de recherche du mois n'a pas pu être vérifié : aucune recherche lancée. Réessayez. » (M100, mot pour mot) ; le bouton plein reste. |
| Suivi (c) | Extension absente ou sans accès | « Installez ou activez l'extension ACM, puis réessayez : la recherche passe par elle. » + « Réessayer » en contour ; rien n'est facturé (M93). En démo : rien de tout cela, la recherche simulée part. |
| Suivi (c) | Recherche en cours | Bouton plein grisé « Recherche en cours… » ; sous lui « Jusqu'à 0,60 € réservés sur le budget du mois ; la part non utilisée est rendue. » ; « Pas maintenant » disparaît. |
| Suivi (c) | Recherche en échec (fournisseur) | « La recherche des nouveaux venus n'a pas abouti. Rien n'est gardé ; réessayez. » ; le bouton plein redevient actif ; le point est intact (M107). |
| Suivi, panneau résultats | Nouveaux venus trouvés | Titre « Nouveaux sur le marché depuis le rendez-vous » · sous-ligne « 2 trouvés · 20 annonces facturées (0,20 €) · critères du dossier · vus sur le marché après le 12/10 » (formateur de M71, le même qu'en préparation) · une carte par bien. S'il y en a : « 3 annonces sans date de première vue : non proposées » (M61, la donnée absente EST le critère). |
| Suivi, panneau résultats | Aucun nouveau venu | « Aucun nouveau venu depuis le 12/10 avec les critères du dossier · 20 annonces facturées (0,20 €). » + « Fermer » texte. Le point du jour est réécrit « recherche faite » : la liste dit « · aucun nouveau venu », la ligne 3 et la couverture le disent (ci-dessous). |
| Suivi, carte d'un nouveau venu | À décider | Vignette · libellé neutre (Maison · 7 pièces · 210 m² · Mougins) · « 1 830 000 € · 8 714 €/m² » · faits (terrain, chambres, DPE, extérieur, piscine) · « Vu sur le marché depuis le 02/11 » en couleur de l'agence · « Retenir » (contour) · « Écarter » (texte). Jamais « Publié le », jamais « disponible », jamais le titre ni l'adresse. |
| Suivi, carte | Retenir en cours | Le bouton dit « Import… » ; la carte reste. L'annonce est relue par l'extension (M101) ; page illisible : créé depuis la recherche, « Importé depuis la recherche », pastilles « À vérifier » (M101, M103). |
| Suivi, carte | Retenu | Pastille « Retenu ✓ » + « Concurrent 6 du dossier · dans Prospection » ; **plus d'« Écarter »** sur une carte retenue (change la maquette 03 : retirer un concurrent se fait sur la page des concurrents, pas ici). Sous le panneau : « Point du 15/11 mis à jour : 1 nouveau venu retenu. » et la liste « Points marché » se réécrit. |
| Suivi, carte | Écarter | Comme M50 : la carte déplie « Motif » (liste de M50 : Trop cher, Trop bon marché, Surface trop différente, Mauvais quartier, Type de bien différent, État sans rapport, Doublon, Autre raison) + « Précision (facultatif) » + « Enregistrer » (plein, dans la carte) / « Annuler » ; enregistré, la carte sort, « Écarté » reste une ligne grise une seconde puis disparaît ; ne sera plus proposé (question 3). |
| Suivi, carte | Retenir en échec | « Le concurrent n'a pas pu être créé. Réessayez. » sous la carte, « Retenir » redevient actif ; la carte reste. |
| Suivi, liste des points | Avec recherche | « Point du 15/11 · 5 annonces relues · 2 baisses · 1 vente probable · 1 retiré sans vente · 2 nouveaux venus » (retenus) ; recherche à zéro : « … · aucun nouveau venu » ; sans recherche : rien de plus (comme aujourd'hui). |
| Suivi détail, ligne 3 | Pleine | « 3 · Face aux nouveaux venus » · la bande avec Le plus bas / Prix médian / Le plus haut / Votre prix (pas de « plus dangereux » sur cette ligne) · phrase : « 2 nouveaux venus retenus depuis le rendez-vous : 1 est sous votre prix, 1 au-dessus. Leur prix médian est 65 500 € au-dessus du vôtre. » (le service existe). |
| Suivi détail, ligne 3 | Recherche faite, aucun | « Aucun nouveau venu sur le marché depuis le 12/10, avec les critères du dossier. » |
| Suivi détail, ligne 3 | Sans recherche | « Aucun nouveau venu retenu depuis le rendez-vous » (inchangé). |
| Écran conseiller, en-tête | Point avec nouveaux venus | Ligne du point « Point du 15/11 — 5 annonces relues · 2 baisses · 1 vente probable · 1 retiré sans vente · 2 nouveaux venus » ; l'explication ajoute « les nouveaux venus » ; « Photos des concurrents » devient « Photos du document » et liste aussi « Sans photo — Nouveau venu 1 · Maison · 7 pièces · 210 m² · Mougins ». |
| Écran conseiller, lien | Lien créé | Exactement la zone de M122 B (`dossier-link-button`) : l'adresse · le message prérempli dans un cadre gris · « Copier » (plein) · « SMS » · « WhatsApp » · « E-mail » (contour) · dessous, en gris : « Le lien ne s'affichera plus. Il expire dans 30 jours ; l'outil n'envoie rien. » ; après copie : « Message copié, lien compris. » ; échec : « La copie a échoué : sélectionnez le message ci-dessus. ». « Imprimer » reste plein en haut : « Copier » est l'action du moment, comme sur la fiche acquéreur. |
| Écran conseiller, lien | Lien existant | Le bouton dit « Créer un nouveau lien » ; dessous : « Le lien ne s'affiche qu'à sa création. Un nouveau lien remplace l'ancien, qui cesse de marcher. » ; la ligne « Lien créé le 15/11, valable jusqu'au 15/12 · Retirer le lien » reste. Un seul lien vivant par point. |
| Écran conseiller, lien | Retiré | « Lien retiré : il ne s'ouvre plus. » |
| Document, couverture | Recherche faite | Trois chiffres : PRIX RETENU ENSEMBLE · CONCURRENTS SUIVIS · NOUVEAUX VENUS RETENUS (2, ou 0 après une recherche à zéro) ; sans recherche : deux chiffres (comme le code du soir). |
| Document, page 02 | Nouveaux venus retenus | Maquette 11. Titre « 02 · Nouveaux sur le marché depuis le rendez-vous — Les biens vus sur le marché depuis le 12 octobre et retenus par votre conseiller pour la comparaison. » (« vus », plus « apparus » : Stream Estate ne connaît pas la date de publication) ; une carte par bien : NOUVEAU VENU 1 · libellé neutre · 3 à 5 photos (M113) · faits · « 1 830 000 € · 8 714 €/m² » · « Vu sur le marché depuis le 02/11 » ; note sous les cartes : « Ces annonces n'étaient pas en vente au rendez-vous : elles n'entrent pas dans les lignes « Au rendez-vous » et « Aujourd'hui » de la page suivante. » ; « Sans photo » coché : la carte prend toute la largeur. La page n'existe pas sans nouveau venu retenu ; « Où en est votre prix » redevient 02. |
| Document, ligne 3 | Pleine | Maquette 12 : « 3 · Face aux nouveaux venus · 2 nouveaux venus retenus · vus sur le marché après le 12 octobre » · bande · phrase encadrée. |
| Document, ligne 3 | Recherche faite, aucun | Cadre pointillé : « Aucun nouveau venu sur le marché depuis le 12 octobre, avec les critères de votre bien. » |
| Document, ligne 3 | Sans recherche | Cadre pointillé : « Aucun nouveau venu retenu depuis le rendez-vous » (inchangé, question 7). |
| Document, dernière page | Avec page 02 | « Pour lire ce document » gagne : « « Vu sur le marché depuis le … » est la date à laquelle l'annonce a été vue pour la première fois, pas sa date de publication. » |
| Lien (téléphone) | Normal | Maquette 14 sans sa barre d'en-tête ; la page 02 avant les trois lignes, une carte par écran de large, photos en pleine largeur ; « Télécharger en PDF » fixé en bas, la place gardée. |
| Lien | Expiré, retiré, inconnu | **Maquette 15** : « Ce lien n'est plus valable » · « Le Point marché a été retiré, ou son lien a expiré : il est valable 30 jours. Pour le recevoir de nouveau, demandez-le à votre conseiller. » · aucun bouton, ni « Revenir à mes dossiers », ni « agence » ; couleurs par défaut de l'app (le lien ne lit rien de l'agence) ; jamais indexée. Remplace la page introuvable de M88 sur `/point-marche/…`. |

## Textes exacts (B) — écran · élément · texte

| Écran | Élément | Texte |
|---|---|---|
| Suivi (c) | Titre | Chercher les nouveaux venus sur le marché ? |
| Suivi (c) | Texte | Recherche payante sur le marché : jusqu'à 0,60 €. Les critères du dossier, les annonces vues sur le marché depuis le 12/10 seulement, sans celles déjà retenues ou écartées. |
| Suivi (c) | Manager, ≥ 80 % | 86 % du budget de recherche du mois utilisé |
| Suivi (c) | Bouton plein | Chercher les nouveaux venus · jusqu'à 0,60 € |
| Suivi (c) | Texte discret | Pas maintenant |
| Suivi (c) | Pendant | Recherche en cours… · Jusqu'à 0,60 € réservés sur le budget du mois ; la part non utilisée est rendue. |
| Suivi (c) | Budget atteint | Budget de recherche du mois atteint : la recherche des nouveaux venus reviendra le 1er décembre. · Fermer |
| Suivi (c) | Budget illisible | Le budget de recherche du mois n'a pas pu être vérifié : aucune recherche lancée. Réessayez. |
| Suivi (c) | Extension | Installez ou activez l'extension ACM, puis réessayez : la recherche passe par elle. · Réessayer |
| Suivi (c) | Échec | La recherche des nouveaux venus n'a pas abouti. Rien n'est gardé ; réessayez. |
| Suivi, dernier point | Lien texte (après « Pas maintenant ») | Chercher les nouveaux venus · jusqu'à 0,60 € |
| Suivi, résultats | Titre | Nouveaux sur le marché depuis le rendez-vous |
| Suivi, résultats | Sous-ligne | 2 trouvés · 20 annonces facturées (0,20 €) · critères du dossier · vus sur le marché après le 12/10 |
| Suivi, résultats | Sans date | 3 annonces sans date de première vue : non proposées |
| Suivi, résultats | Aucun | Aucun nouveau venu depuis le 12/10 avec les critères du dossier · 20 annonces facturées (0,20 €). · Fermer |
| Suivi, carte | Date | Vu sur le marché depuis le 02/11 |
| Suivi, carte | Boutons | Retenir (contour) · Écarter (texte) · Import… · Retenu ✓ · Concurrent 6 du dossier · dans Prospection |
| Suivi, carte | Motif | Motif · Précision (facultatif) · Enregistrer · Annuler |
| Suivi, carte | Échec | Le concurrent n'a pas pu être créé. Réessayez. |
| Suivi, sous les cartes | Point réécrit | Point du 15/11 mis à jour : 1 nouveau venu retenu. |
| Suivi, liste | Ligne | Point du 15/11 · 5 annonces relues · 2 baisses · 1 vente probable · 1 retiré sans vente · 2 nouveaux venus |
| Suivi, liste | Recherche à zéro | … · aucun nouveau venu |
| Suivi détail, ligne 3 | Repères | Le plus bas · Prix médian · Le plus haut · Votre prix |
| Suivi détail, ligne 3 | Phrase | 2 nouveaux venus retenus depuis le rendez-vous : 1 est sous votre prix, 1 au-dessus. Leur prix médian est 65 500 € au-dessus du vôtre. |
| Suivi détail, ligne 3 | Recherche à zéro | Aucun nouveau venu sur le marché depuis le 12/10, avec les critères du dossier. |
| Écran conseiller | Cases | Photos du document · Sans photo — Nouveau venu 1 · Maison · 7 pièces · 210 m² · Mougins |
| Écran conseiller | Explication | … chaque concurrent, son prix d'alors et d'aujourd'hui, les annonces disparues, les nouveaux venus, puis où en est son prix. Ni adresse, ni titre, ni lien d'annonce ; « estimé » partout où l'outil déduit. |
| Écran conseiller | Bouton (contour) | Créer un lien pour le vendeur (30 jours) · Créer un nouveau lien |
| Écran conseiller | Sous le bouton (lien existant) | Le lien ne s'affiche qu'à sa création. Un nouveau lien remplace l'ancien, qui cesse de marcher. |
| Écran conseiller | Message prérempli | Bonjour, voici le Point marché depuis notre rendez-vous du 12/10 : [lien] ⏎ Il montre ce qui a bougé chez les biens que nous avons regardés ensemble, et où en est votre prix. ⏎ Natacha |
| Écran conseiller | Objet de l'e-mail | Point marché du 15/11 |
| Écran conseiller | Partage | Copier (plein) · SMS · WhatsApp · E-mail (contour) · Le lien ne s'affichera plus. Il expire dans 30 jours ; l'outil n'envoie rien. · Message copié, lien compris. · La copie a échoué : sélectionnez le message ci-dessus. |
| Écran conseiller | Lien existant | Lien créé le 15/11, valable jusqu'au 15/12 · Retirer le lien · Lien retiré : il ne s'ouvre plus. |
| Document couverture | Chiffre | NOUVEAUX VENUS RETENUS 2 (ou 0, seulement après une recherche) |
| Document 02 | Titre | 02 · Nouveaux sur le marché depuis le rendez-vous — Les biens vus sur le marché depuis le 12 octobre et retenus par votre conseiller pour la comparaison. |
| Document 02 | Carte | NOUVEAU VENU 1 · Maison · 7 pièces · 210 m² · Mougins · 1 830 000 € · 8 714 €/m² · Vu sur le marché depuis le 02/11 |
| Document 02 | Note | Ces annonces n'étaient pas en vente au rendez-vous : elles n'entrent pas dans les lignes « Au rendez-vous » et « Aujourd'hui » de la page suivante. |
| Document 03 | Ligne 3 | 3 · Face aux nouveaux venus · 2 nouveaux venus retenus · vus sur le marché après le 12 octobre |
| Document 03 | Ligne 3 à zéro | Aucun nouveau venu sur le marché depuis le 12 octobre, avec les critères de votre bien. |
| Document dernière page | Ajout | « Vu sur le marché depuis le … » est la date à laquelle l'annonce a été vue pour la première fois, pas sa date de publication. |
| Lien plus valable | Titre | Ce lien n'est plus valable |
| Lien plus valable | Texte | Le Point marché a été retiré, ou son lien a expiré : il est valable 30 jours. Pour le recevoir de nouveau, demandez-le à votre conseiller. |

Mots interdits, inchangés : « estimation », « Publié le », « disponible », une adresse, un titre, « Vendu par »,
une exclusivité ; dans le message prérempli, aucune formule de pression ni d'urgence (M85, M96) et aucun
montant.

## Hiérarchie (B)

- **Suivi, bureau** : la ligne du mandat garde un seul bouton plein. Pendant (c), c'est « Chercher les
  nouveaux venus » et « Prospecter » passe en contour (question 1) ; (c) fermé ou recherche faite,
  « Prospecter » redevient plein. Le panneau des résultats s'insère entre le panneau du point et
  « Points marché » ; chaque carte : vignette à gauche, faits au milieu, « Retenir » / « Écarter » à
  droite, « Vu sur le marché depuis le … » en couleur de l'agence sous les faits.
- **Suivi, téléphone (390)** : (c) en carte pleine largeur, bouton plein sur toute la largeur, « Pas
  maintenant » centré dessous ; les cartes de nouveaux venus empilées, photo en bandeau, « Retenir » et
  « Écarter » sous les faits, côte à côte ; rien de côté, aucune barre fixe sur le Suivi.
- **Écran conseiller** : l'en-tête garde l'ordre Retour · Imprimer / titre / point / explication / cases
  « Sans photo » (concurrents puis nouveaux venus) / lien ; la zone de partage se déplie sous le bouton du
  lien sans pousser « Imprimer » hors de l'écran (il est en haut).
- **Document** : page 02 entre les concurrents et les trois lignes ; sur la ligne 3, les nouveaux venus
  en gris comme tout concurrent, le prix du vendeur seul en couleur, sans repère « plus dangereux ».
- **Lien plus valable** : une phrase centrée, rien d'autre ; aucun bouton.

## Questions à Jean-Guy (B), avec ma proposition

1. Pendant (c), deux boutons pleins sur la ligne du mandat (« Prospecter » et « Chercher les nouveaux
   venus ») ? Proposition : « Prospecter » passe en contour tant que (c) est affiché — un écran, une
   décision.
2. Le conseiller voit-il la consommation du mois dans (c) (« 4,20 € sur 30 € », ma maquette 02) ?
   Proposition : non, M100 la réserve au manager ; (c) dit « jusqu'à 0,60 € », et le manager lit le
   pourcentage à partir de 80 %.
3. « Écarter » un nouveau venu : avec motif (liste de M50) ou d'un seul geste ? Proposition : avec motif,
   le même sélecteur qu'en préparation — c'est l'écart explicite qui apprend (Stream Estate, 05/10) ; un
   nouveau venu écarté ne revient pas au point suivant.
4. Après « Pas maintenant », la recherche reste-t-elle possible sans relire les annonces ? Proposition :
   oui, un lien texte « Chercher les nouveaux venus · jusqu'à 0,60 € » sur le dernier point, tant
   qu'aucune recherche n'a été faite pour lui ; le point suivant repropose (c).
5. « Chercher encore (20 annonces, 0,20 €) » sur les nouveaux venus, comme en préparation ?
   Proposition : non en B ; une recherche par point, à revoir après les premiers mandats suivis.
6. La page « Ce lien n'est plus valable » (maquette 15) vaut-elle aussi pour `/synthese/…` (M110) et
   `/dossier/…` (M119), qui tombent aujourd'hui sur « Page introuvable … depuis votre agence · Revenir à
   mes dossiers » ? Proposition : oui, une seule page pour les trois liens, dans la B si c'est le même
   composant, sinon aux finitions.
7. Sans recherche faite, la ligne 3 du document dit « Aucun nouveau venu retenu depuis le rendez-vous »
   (comme ce soir) ou la page omet la ligne ? Proposition : garder la ligne, qui ne dit pas « recherche
   non faite » au vendeur ; après une recherche à zéro, « Aucun nouveau venu sur le marché depuis le
   12 octobre, avec les critères de votre bien. », qui est un fait.

## Partie B · les trois lignes (décision de Jean-Guy du 29/10 ; maquettes `M127B-lignes.svg`, `M127B-lignes-vide.svg`, générées par `M127B-lignes-generateur.mjs`)

- **Ordre du document** : couverture · une fiche par concurrent déjà présenté (prix mis à jour) · une fiche par nouveau venu retenu, même forme, « Vu sur le marché depuis le … » à la place du prix du rendez-vous · la page « Où en est votre prix » · les mentions. Sans nouveau venu retenu, la page des nouveaux venus n'existe pas et la ligne 3 est un cadre pointillé « Aucun nouveau venu retenu depuis le rendez-vous » sous l'axe (`-vide`).
- **Cotes A4 (794 px, marges 56 px)** : colonne des titres 56 → 220 px (titre Rajdhani 14 px, sous-titres 9,5 px gris) ; échelle 220 → 738 px (518 px), bornée du plus bas au plus haut de tout, nouveaux venus compris, graduée tous les 100 000 € (traits de grille #eef2f6 sur toute la hauteur, axe et chiffres 9 px dessinés UNE fois en bas) ; bande du marché 16 px de haut, bouts ronds, #d4e4f3 ; ligne de base 1 px #e4e4e7 ; points gris r = 5 #94a3b8, point vide = blanc cerclé 1,6 px ; médiane trait 1,5 px brand, prolongé jusqu'à son étiquette ; losange rouge #dc2626 16 × 16 ; barre du prix 5 px pleine, emerald-700 #047857 (orange/rouge M116 selon l'écart), de 214 px jusqu'à 8 px sous l'axe ; étiquettes 9 px capitales espacées, chiffres 14 px gras ; « VOTRE PRIX » 17 px gras une fois en haut de la barre avec le libellé M116 dessous ; légende 9,5 px sur deux rangées sous le sous-titre ; phrase de fait 11,5 px (poids 500) bornée à gauche de la barre (62 caractères par ligne, ≤ 4 lignes).
- **Rythme vertical** : ligne 1 à y = 300 ; étiquettes au-dessus sur deux niveaux (PLUS BAS / PLUS HAUT à −32/−18, MÉDIANE à −66/−52) ; PLUS DANGEREUX sous la bande à +26/+41 ; la flèche du concurrent qui a bougé descend du point jusqu'à +58 puis file à gauche jusqu'au nouveau prix, son texte à +73 (« A baissé : 1 650 000 € → 1 554 000 € · −5,8 % ») ; la phrase 1 à +96 ; ligne suivante = fin de la phrase + 80 px (≈ 190 px d'une ligne à l'autre). Sur la ligne 2 les disparus restent à leur prix du rendez-vous en points vides, mention italique 9,5 px dessous (« 1 475 000 € · retiré sans vente », « 1 480 000 € · vente probable »).
- **Règle de placement, un seul principe** : une étiquette ne passe jamais sur la barre ni hors de l'échelle ; elle essaie son ancrage préféré (plus bas → début, plus haut → début puis fin, médiane → centré puis début), sinon l'autre côté ; MÉDIANE est toujours au niveau haut, PLUS BAS et PLUS HAUT au niveau bas, pour que les trois lignes se lisent pareil. Même rendu en noir et blanc : barre épaisse, trait fin, losange, point plein, point vide, bande grise.
- **Téléphone (390 px, lien public)** : la colonne des titres passe au-dessus de l'échelle (titre + sous-titre sur une ligne), l'échelle prend 390 − 2 × 16 = 358 px avec ses graduations, la barre verte traverse toujours les trois lignes ; les chiffres ne restent sur la bande que pour la barre (en tête) ; PLUS BAS / MÉDIANE / PLUS HAUT / PLUS DANGEREUX quittent la ligne pour une liste de quatre lignes sous chaque bande (icône · étiquette · chiffre 14 px, comme les rendus du 29/10), la flèche devient une ligne de cette liste (« ← A baissé : 1 650 000 → 1 554 000 € · −5,8 % »), les disparus aussi ; la phrase de fait en pleine largeur dessous ; rien de côté, « Télécharger en PDF » reste fixé en bas, la place gardée.
- **Suivi, détail déplié (compact, colonne de ≈ 440 px en 1280 × 800)** : même figure sans l'en-tête de page, légende sur une rangée en 9 px, échelle sur toute la colonne, bande 10 px, points r = 4, chiffres 12 px ; les quatre repères sous chaque bande sur une seule ligne (« Plus bas 1 475 000 € · Médiane 1 650 000 € · Plus haut 1 699 000 € · ◆ 1 690 000 € »), la phrase 10,5 px ; en 1024 × 768 (colonne pleine largeur sous « Ce que le vendeur a dit ») rien ne change que la largeur ; à 390 px le Suivi adopte la version téléphone ci-dessus.
- **À l'écran (page conseiller et lien bureau)** : la page A4 telle quelle, mise à l'échelle de la colonne, jamais plus large que la fenêtre (M72) ; l'impression A4 garde la figure insécable (une seule page, comme le bloc des prix de la synthèse, M113).
