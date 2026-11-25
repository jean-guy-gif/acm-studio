# M130 A — Le Suivi · les états que la maquette ne montre pas, les textes exacts, les trois largeurs

Maquette de référence, validée par Jean-Guy : `M130-suivi.png` (1280 × 800, trois cartes : M. et Mme
Martin à relancer, M. Lefebvre mandat signé à Mougins, Martin mandat signé à Antibes). Ce fichier la
COMPLÈTE ; il ne la redessine pas. Contenu des exemples : la démo (Antibes, Mougins 1 639 500 €, famille
Keller). Aujourd'hui = 05/11 dans tous les exemples.

## 0. Trois corrections à reporter sur le rendu (la maquette les montre autrement)

| Où | Maquette | Rendu attendu | Pourquoi |
|---|---|---|---|
| À faire, tâche 2 | « premier point dû (tous les 15 jours) » | « Mandat signé le 15/10 · premier Point marché dû (tous les mois) » | Décision du 05/11 : mensuel. |
| Carte Martin, frise | « Point marché · le 07/11 » (signé le 23/10) | « Point marché · le 23/11 » | Un mois après la signature. |
| Carte Lefebvre, phrase | « On relit les concurrents (gratuit), puis le document part au vendeur » | « ACM relit les annonces des concurrents (gratuit), puis vous envoyez le document au vendeur. » | L'outil n'envoie rien (M122 B, M127 B) : « part au vendeur » ment. |

Date du premier point : `signed_at` + 1 mois ; un mandat signé avant la M90 n'a pas de `signed_at` :
la date du rendez-vous (`concluded_at`) + 1 mois. Ensuite : dernier point + 1 mois, même jour du mois
(le 31 → le dernier jour du mois suivant).

**Démo, à trancher avec le chef** : Mougins est conclu « il y a 21 jours » (M127) ; avec un point mensuel,
la tâche « Point marché de M. Lefebvre » n'apparaîtrait que dans 9 jours, et la démo ne la montrerait
jamais à la préparation. Proposition : conclure le scénario de Mougins il y a 35 jours (les durées de
retrait de mou-09 et mou-13 se comptent au jour du retrait, pas de la conclusion : à vérifier par
l'architecte), sans migration.

## 1. Les états

### « À faire aujourd'hui »

| État | Ce qu'il dit |
|---|---|
| Des tâches (maquette) | « À faire aujourd'hui · 3 », une ligne par tâche, la plus ancienne d'abord (date due la plus ancienne ; à égalité : visite, Point marché, démarchage, relance). Au-delà de 5 : les 5 premières, puis le lien « Voir les 3 autres tâches ▾ ». |
| Rien aujourd'hui, une tâche à venir | Titre « À faire aujourd'hui », sans compteur. Texte : « Rien à faire aujourd'hui. Prochaine tâche : relancer M. et Mme Martin le 12/11. » (ou « … : Point marché de M. Lefebvre le 15/11. » ; un démarchage ou une visite n'est jamais « à venir », ils sont dus dès qu'ils existent). Aucun bouton. Le bloc garde sa place, une ligne de haut. |
| Rien aujourd'hui, rien à venir | « Rien à faire aujourd'hui, et aucune tâche prévue. » |
| Aucun dossier conclu | Le bloc n'existe pas ; l'état vide actuel reste : « Aucun dossier conclu pour le moment. » / « Un dossier arrive ici une fois le rendez-vous conclu depuis le Live. » |
| Une lecture en échec (prospection, visites) | En bas du bloc, en rouge : « Les courriers à envoyer n'ont pas pu être lus : rechargez la page. » / « Les visites demandées n'ont pas pu être lues : rechargez la page. » Une lecture en échec n'est jamais lue comme « rien à faire » (M98). Le compteur du menu ne compte que ce qui a été lu. |
| Compteur du menu « Suivi » | Le nombre de tâches dues (toutes, pas seulement les 5 affichées), orange ; absent à 0. Libellé accessible : « Suivi, 3 tâches à faire aujourd'hui ». |

### Les lignes de tâche

| Tâche | Titre | Sous-titre | Bouton plein |
|---|---|---|---|
| Relance due aujourd'hui (maquette) | Relancer M. et Mme Martin | Réfléchit au prix · dernier contact il y a 8 jours · relance prévue aujourd'hui | Relancer |
| Relance en retard | Relancer M. et Mme Martin | Réfléchit au prix · dernier contact il y a 11 jours · relance prévue le 02/11, **en retard de 3 jours** (la fin en orange) ; 1 jour : « en retard d'un jour » | Relancer |
| Relance sans date posée (avant M105) | Relancer Mme Garcia | Projet pas encore daté · dernier contact il y a 9 jours · relance prévue le 03/11 (7 jours après le dernier contact), en retard de 2 jours | Relancer |
| Point marché dû | Point marché de M. Lefebvre | Mandat signé le 15/10 · premier Point marché dû (tous les mois) — ou, après un point : « Dernier point le 05/10 · Point marché dû (tous les mois) » | Faire le point |
| Point marché en retard | Point marché de M. Lefebvre | Dernier point le 01/10 · prévu le 01/11, en retard de 4 jours | Faire le point |
| Démarchage | Démarcher 3 concurrents de Martin | 3 adresses prêtes depuis le 28/10 · courriers à imprimer (date : la plus ancienne adresse confirmée, `locator_address_at`) ; confrères seuls : « 2 confrères à contacter » | Prospecter (maquette ; voir question 3) |
| Visite acquéreur à planifier | Organiser la visite de la famille Keller chez M. Lefebvre | Maison · 7 pièces · 210 m² · Mougins · demandée le 03/11 · samedi matin, dimanche | Organiser la visite → `/visites`, ancrée sur la demande |

Une visite n'a pas de date prévue (aucune colonne) : elle ne se dit jamais « en retard », seulement
« demandée le 03/11 » ; elle quitte la liste à « Visite faite » ou quand la demande est annulée.
Le dossier d'exemple n'entre jamais dans la liste ni dans le compteur (M97).

### La colonne « Prochaine étape » d'une carte

En-tête (petites capitales grises) : « PROCHAINE ÉTAPE · AUJOURD'HUI » · « PROCHAINE ÉTAPE · LE 23/11 » ·
« PROCHAINE ÉTAPE · EN RETARD DE 3 JOURS » (la fin en orange) · « PROCHAINE ÉTAPE · AUCUNE ».
Le bouton est **plein seulement si l'étape est due** (aujourd'hui ou en retard) ; une étape à une date
future a son bouton en contour : les boutons pleins de la page sont exactement les tâches du jour.

| Cas | Titre | Phrase | Bouton | Liens (3 au plus) |
|---|---|---|---|---|
| À relancer, dû (maquette) | Le relancer | Message prêt avec ses mots · vous notez la relance et la suivante | Relancer M. et Mme Martin (plein) | Point marché · Détail des prix · Changer l'issue |
| À relancer, à une date future | Le relancer | Relancé le 05/11 · « rappelle après les vacances » (sa note, s'il y en a une) | Relancer M. et Mme Martin (contour) | idem |
| À relancer, sans date posée | Le relancer | Aucune date n'avait été posée : relance 7 jours après le dernier contact. | plein si dû | idem |
| À relancer, sans motif (avant M96) | Le relancer | Pourquoi le relancer ? Non noté. | plein si dû | Point marché · Détail des prix · **Compléter** (remplace « Changer l'issue ») |
| Mandat signé, Point marché dû (maquette) | Faire son premier Point marché (ou « Faire son Point marché ») | ACM relit les annonces des concurrents (gratuit), puis vous envoyez le document au vendeur. | Faire le point marché (plein) | Prospection · Détail des prix · Changer l'issue |
| Mandat signé, point fait, prochain futur | Prochain Point marché | Dernier point le 05/11 : 5 annonces relues · 2 baisses · 1 vente probable. | Voir le Point du 05/11 (contour) | Prospection · Détail des prix · Changer l'issue |
| Mandat signé, démarchage dû (maquette) | Démarcher ses 3 concurrents | Adresses prêtes · 1 a dit « pas intéressé » | Prospecter (plein) | Point marché · Détail des prix · Changer l'issue |
| Mandat signé, visite à organiser | Organiser une visite | La famille Keller veut visiter · demandée le 03/11 · samedi matin, dimanche | Organiser la visite (plein) | Point marché · Prospection · Changer l'issue |
| Mandat sans concurrent retenu | Rien à faire pour l'instant | Aucun concurrent retenu : rien à démarcher ni à relire. Les visites demandées s'afficheront ici. | aucun | Détail des prix · Changer l'issue |
| Mandat signé sans type (avant M90) | (l'étape du cas) | (la phrase du cas) | (le bouton du cas) | … · **Compléter le type de mandat** (remplace « Changer l'issue ») |
| Vendu ailleurs | Aucune | Vendu par une autre agence (noté le 28/10). Rien à faire. | aucun | Détail des prix · Changer l'issue |
| Retiré de la vente | Aucune | Le vendeur a retiré son bien (noté le 28/10). Rien à faire tant qu'il ne revient pas. | aucun | Détail des prix · Changer l'issue |
| Dossier d'exemple | (l'étape normale, sans date) | Dossier d'exemple : ses étapes n'entrent pas dans « À faire aujourd'hui ». | contour, jamais plein | idem cas |

Un mandat sans concurrent n'a pas de tâche Point marché (rien à relire) ; sa frise : « Concurrents ·
aucun » et « Point marché · sans objet » en gris. Plusieurs étapes dues sur un même mandat : la carte
montre la plus ancienne (ordre de la liste « À faire »), les autres se lisent sur la frise.

### La frise d'un mandat signé

| Étape | Faite (vert) | Du jour (bleu) | À venir (gris) |
|---|---|---|---|
| 1 | Mandat signé ✓ | — | — |
| 2 | Concurrents démarchés · 4/4 | Concurrents · 3 à démarcher | Concurrents · 2 adresses à confirmer · ou · Concurrents · aucun |
| 3 | Point marché ✓ 05/11 (dessous : « prochain le 05/12 ») | Point marché · dû · ou · Point marché · en retard de 4 jours (la fin en orange) | Point marché · le 23/11 |
| 4 | Visites acquéreurs · 2 faites | Visites acquéreurs · 1 à organiser | Visites acquéreurs · 0 |

« Démarchés » = cartes remises, confrère contacté ou plus loin, « pas intéressé » compris ; le total ne
compte pas les « Ne plus solliciter ». Le segment de l'étape du jour est bleu même en retard : seul le
texte du retard est orange.

## 2. La relance sur place

**Un panneau qui s'ouvre DANS la carte**, sous ses deux colonnes, sur toute sa largeur — jamais une
fenêtre : le conseiller garde sous les yeux le prix, « ce qui le retient » et le téléphone ; c'est le
modèle des confirmations dans l'écran de l'outil (M92, M93). « Relancer » dans « À faire aujourd'hui »
ramène à la carte (filtre « Tous » si besoin), ouvre le panneau et met le focus sur le message. Pendant
que le panneau est ouvert, le bouton de la carte devient le lien « Fermer la relance » : un seul bouton
plein, « J'ai relancé ».

| Élément | Texte |
|---|---|
| Titre du panneau | Relancer M. et Mme Martin |
| Ligne de contact | le téléphone (lien `tel:`) et l'e-mail (lien `mailto:`) du dossier vendeur, `seller_phone` et `seller_email` ; sans rien : « Ni téléphone ni e-mail dans le dossier vendeur. » |
| Étape 1 | 1 · Votre message |
| Aide | Modifiez-le si besoin. ACM ne l'envoie pas et ne le garde pas. |
| Champ | le message de M96, tel que proposé (« Bonjour, … ») |
| Boutons contour | Copier · SMS · WhatsApp · E-mail (comme le lien M122 B, M127 B : ils ouvrent l'application avec le message ; SMS et WhatsApp au numéro du dossier, E-mail à son adresse) |
| Lien texte | Reprendre le texte proposé |
| Sans téléphone | SMS et WhatsApp grisés, avec dessous « Pas de numéro dans le dossier vendeur. » ; sans e-mail, E-mail ouvre la messagerie sans destinataire |
| Copie réussie / échouée | Message copié. / La copie a échoué : sélectionnez le texte et copiez-le à la main. |
| Étape 2 | 2 · Après votre appel ou votre message |
| Note | Note (facultative), 200 caractères, exemple grisé : « Rappelle après les vacances » |
| Date | Prochaine relance le [05/12], pré-remplie (M105) ; dessous : « Proposée dans 1 mois : il réfléchit au prix. » ou « Proposée dans 7 jours. » |
| Bouton plein | J'ai relancé |
| Lien texte | Annuler |
| En cours | J'enregistre… (bouton grisé) |
| Date hors bornes | Choisissez une date entre aujourd'hui et le 05/11/2027. |
| Échec | La relance n'a pas été enregistrée. Réessayez. (le message du serveur s'il en a un ; le panneau reste ouvert, rien n'est perdu) |
| Terminé | Le panneau se ferme ; à sa place, en vert, quelques secondes puis gardé en ligne : « Relancé aujourd'hui. Prochaine relance le 05/12. » L'en-tête devient « PROCHAINE ÉTAPE · LE 05/12 », le bouton passe en contour, la tâche quitte « À faire aujourd'hui » et le compteur du menu baisse d'un, sans rechargement (leçon du correctif 128 : l'e2e le prouve). |

« J'ai relancé » ne demande pas d'avoir touché Copier ou SMS : un appel est une relance. Aucun lien vers
`/builder` dans ce panneau ; « Ouvrir le dossier » reste dans « Détail des prix ».

## 3. Les phrases de machine, réécrites

| Où | Avant | Après |
|---|---|---|
| Carte | Prêt à lancer 7 → 10/10 | Quitte la carte. Dans « Détail des prix » : « Sa note pour lancer la vente : 7 sur 10 au début, 10 sur 10 à la fin » (un seul chiffre : « Sa note pour lancer la vente : 8 sur 10 ») |
| Détail | Ce qui manquait pour être à 10 : … | Ce qui lui manquait pour être à 10 : « … » |
| Points marché, vide | Aucun point marché pour ce mandat. La relecture des annonces est gratuite ; le premier Point marché s'écrira à la fin de la mise à jour. | Pas encore de Point marché. Le premier est prévu le 15/11 : ACM relit les annonces des concurrents (gratuit) et prépare le document pour le vendeur. (dû : « Le premier est à faire aujourd'hui : … ») |
| Bouton | Mettre à jour les concurrents | Faire le point marché (c'est ce qu'il fait : relecture puis point) |
| Pendant | Le point marché s'écrit… · Par l'extension ACM, sans appel payant. Ne fermez pas l'onglet. | Préparation du Point marché… · Gratuit. Gardez cet onglet ouvert pendant la relecture. (démo : « Gratuit. ») |
| Fin | Point du 05/11 enregistré · Ouvrir le Point marché → | Point marché du 05/11 prêt · Voir le Point marché |
| Concurrent | Prix au rendez-vous non relu ; prix du jour : 1 690 000 € | Prix du rendez-vous inconnu ; aujourd'hui 1 690 000 € (pastille « Non relu » → « Prix d'origine inconnu » ; remplace le libellé M127) |
| Concurrent | Retirée le 03/11 : durée en vente inconnue, aucune conclusion | Retirée le 03/11. Durée en vente inconnue : impossible de dire si elle est vendue. |
| Dangereux | choix du vendeur, gardé | son choix au rendez-vous |
| Nouveaux venus | Retenu ✓ · créé depuis la recherche (page illisible) · dans le dossier et dans Prospection | Retenu ✓ : ajouté au dossier et à Prospection (annonce illisible : chiffres de la recherche, à vérifier) |
| Nouveaux venus | N annonce(s) sans date de première vue : non proposée(s). | 1 annonce écartée : on ne sait pas depuis quand elle est en ligne. |
| Nouveaux venus | élargissement non lancé : le budget du mois n'a pas pu être lu | recherche non élargie : budget du mois illisible, réessayez plus tard |
| Carte | Freins : Le prix · Le délai | Quitte la carte ; dans le détail : « Ce qui le freine : le prix, le délai » |
| Carte | Motif de relance non renseigné | Pourquoi le relancer ? Non noté. |
| Carte | Aucun concurrent retenu à prospecter | Aucun concurrent à démarcher |
| Carte | Live du 22/10 (maquette) / conclu le 22/10 | rendez-vous du 22/10 |
| Message | Message de relance — modifiez-le avant de le copier ; il n'est ni envoyé ni enregistré. | Modifiez-le si besoin. ACM ne l'envoie pas et ne le garde pas. |
| Relance | Relancé aujourd'hui / Enregistrer la relance | J'ai relancé (le bouton dit ce qui s'est passé) |
| Détail | Le chemin parcouru pendant le rendez-vous · Prix du vendeur en début de rendez-vous | Son prix pendant le rendez-vous · Il voulait (début du rendez-vous) |
| Filtre motif | À relancer, par motif : | (seulement sous « À relancer » actif) Pourquoi : Réfléchit au prix · 1 |
| Liste vide | Aucun dossier pour ce filtre. | Aucun vendeur dans ce filtre. |
| En-tête | Vos rendez-vous conclus, et ce qu'il reste à faire pour chacun. | Ce que vous avez à faire, puis chaque vendeur. (maquette) |

Le chemin du prix : « Il voulait → Après le marché → Prix proposé » (à relancer) ou « … → Prix signé »
(mandat) ; une étape absente est omise, jamais « — » ; sans aucun prix, la ligne disparaît. Le badge de
pourcentage du chemin quitte la carte (il reste dans le détail).

## 4. Les trois largeurs

| | 1280 × 800 | 1024 × 768 | 390 × 844 |
|---|---|---|---|
| Menu | à gauche (maquette) | à gauche, 240 px | barre du haut ; le compteur sur l'entrée « Suivi » du menu ouvert et une pastille sur le bouton du menu |
| À faire | ligne : pastille · texte · bouton à droite | idem, sous-titre sur 2 lignes au plus | idem, bouton compact à droite (44 px de haut), titre sur 2 lignes au plus ; aucun défilement de côté |
| Filtres | une ligne | une ligne | passent à la ligne (jamais de défilement de côté) ; le filtre par motif dessous |
| Carte | deux colonnes : vendeur 1fr, prochaine étape 380 px | deux colonnes : 1fr / 300 px ; montants du chemin en 18 px | **une colonne, dans cet ordre** : nom et badges · bien · bloc « Prochaine étape » (en-tête, titre, phrase, bouton plein pleine largeur) · chemin du prix · frise · ce qui le retient · liens |
| Chemin du prix | trois montants, flèches | idem, 18 px | trois colonnes sans flèches, libellé au-dessus, 15 px ; sous 360 px, en liste |
| Frise | 4 segments + 4 libellés (maquette) | idem, libellés sur 2 lignes | 4 segments seuls, puis une ligne : le libellé de l'étape du jour (« Point marché · dû »), et dessous en petit « Mandat signé ✓ · Démarchés 4/4 ✓ · Visites 0 » |
| Liens | sous le bouton, une ligne | une ligne, peut passer à deux | à la ligne, 44 px de haut chacun |
| Panneau de relance | sous la carte, message à gauche, étape 2 à droite | sous la carte, en colonne | en colonne ; « J'ai relancé » pleine largeur, au bas du panneau, pas en barre fixe |

Bouton plein sans défiler : à 1280 et 1024, « Relancer » de la tâche 1 et « Relancer M. et Mme Martin »
de la première carte sont dans l'écran ; à 390, le bouton de la tâche 1 (≈ 300 px) et celui de la
première carte (≈ 720 px avec 3 tâches), grâce au bloc « Prochaine étape » placé avant le chemin du prix.

## 5. Badges et couleurs

| Élément | Règle |
|---|---|
| Barre de gauche (M86) | vert mandat signé · **orange à relancer** (maquette) · gris vendu ailleurs ou retiré. Remplace le bleu de M86 : le bleu est désormais l'action et l'étape du jour (boutons, frise) ; l'orange dit « attention » (M129). À noter au `/valide` (« remplace M86, barre bleue »). |
| Pastilles numérotées d'« À faire » | la couleur du groupe du vendeur (orange à relancer, vert mandat) ; jamais rouge, même en retard. |
| Badge d'issue | « À relancer » orange clair (texte orange foncé) ; « Mandat signé · exclusif » / « Mandat signé · simple » vert clair, un seul badge (remplace les deux badges de M90, la règle « exclusif ou simple » ne change pas) ; « Mandat signé » seul quand le type manque ; « Vendu ailleurs » et « Retiré de la vente » gris (plus d'orange : rien n'est à surveiller). |
| Motif | gris neutre (« Réfléchit au prix ») ; badge « Exemple » (M97) inchangé. |
| Pastille « À relancer aujourd'hui » (M96) | disparaît : l'en-tête « PROCHAINE ÉTAPE · AUJOURD'HUI » et « À faire » la remplacent ; la tuile « 3 vendeurs à relancer aujourd'hui » aussi. |
| Dernier montant du chemin (M116) | **jamais vert par décor** : il prend la couleur de M116 avec son libellé à côté de l'étiquette (« Prix signé · aligné sur le marché » vert, « · proche du marché » orange, « · éloigné du marché » rouge) ; sans analyse du conseiller, noir, sans libellé. Le vert de la maquette n'est juste que pour un prix aligné. |
| « Ce qui le retient » | fond orange très clair (maquette). |
| Frise | vert fait, bleu du jour, gris à venir ; le retard en texte orange seulement. |
| « dont N exclusifs » (M90) | quitte le Suivi avec le « −9 % » : le tableau du manager porte déjà la part d'exclusifs (M110). |

## 6. Questions tranchées par le designer, à confirmer par le chef

1. Bouton plein seulement pour une étape due, contour pour une étape future (§1). Proposition : oui.
2. Démo de Mougins conclue il y a 35 jours pour montrer la tâche Point marché (§0).
3. Démarchage : « Prospecter » (maquette, ouvre Prospection filtrée) ou « Préparer les 3 courriers »
   (ouvre `/prospection/courriers?bien=…`, le résultat). Proposition : garder « Prospecter » (validé),
   le lot reste à un clic dans Prospection.
4. Nom dans le bouton : le nom tel que saisi (« Relancer M. et Mme Martin »), jamais raccourci par
   l'outil (« M. Martin » de la maquette oublie Mme), coupé avec « … » au-delà de la largeur.
5. Un acquéreur qui veut visiter le bien d'un vendeur à relancer : proposition, une ligne de plus dans
   le panneau de relance, « Un acquéreur veut visiter (demandé le 03/11). », jamais dans le message
   envoyé ; pas de tâche à part.
