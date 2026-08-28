Missions 37 à 41 — briefs prêts à coller dans missions/

Décisions produit du 28 août 2026 :

Gris = équivalent. Un critère dont la donnée manque ne s'affiche pas.
Quatre écrans par concurrent. On aligne le code sur le Storyboard.
Le conseiller ne ressaisit rien s'il a déjà une fiche commerciale ou une annonce en ligne du bien : il l'importe.
La fourchette de prix du conseiller se demande juste après l'import, pour guider la recherche automatique de concurrents.

Ordre imposé par les dépendances : le stockage des photos (37) avant l'import qui en produit (38), avant la slide qui les affiche (39).

MISSION 37 — Les photos du bien vendeur

Date : 28 août 2026 Pourquoi maintenant : préalable non négociable à l'import et à la slide « Votre bien ».

1. État des lieux honnête

subject_properties.photo_urls existe depuis le schéma initial. buildSellerPresentation le lit déjà et presentation-property.tsx l'affiche.

Mais rien ne le remplit. Le formulaire du bien vendeur n'a aucun champ photos : ni téléversement, ni saisie d'adresses. La colonne est vide sur tous les dossiers.

Et Supabase Storage n'est utilisé nulle part dans le dépôt. Les photos des concurrents sont des adresses distantes, servies par les CDN des portails. Ce mécanisme ne vaut rien pour le bien du vendeur : le conseiller a des fichiers sur son ordinateur, ou dans une fiche commerciale PDF.

2. Ce qu'on fait

Un vrai téléversement, le premier du dépôt.

Bucket privé project-photos. Chemin {agency_id}/{project_id}/property/{uuid}.{ext}.
Politiques RLS Storage par agence, sur le même principe que les tables : un conseiller ne voit que les fichiers de son agence.
Action serveur de téléversement : types image/jpeg, image/png, image/webp uniquement, taille par photo bornée, nombre de photos borné. Le type est vérifié côté serveur, jamais sur la seule extension du nom de fichier.
URL signées à la lecture, de courte durée, générées côté serveur à chaque rendu. Jamais de bucket public.
Composant subject-property-photos-field.tsx : glisser-déposer et sélecteur de fichiers, miniatures, suppression, réordonnancement. Le même geste que photo-urls-field.tsx côté concurrents, mais avec des fichiers.
Une fonction de dépôt réutilisable côté serveur : la mission 38 y enverra les images extraites d'un PDF. Ne pas l'enfermer dans le composant.
Retirer une photo supprime aussi le fichier dans le bucket. Pas de fichiers orphelins qui gonflent la facture.
3. Garde-fous
Aucune photo inventée, aucune photo par défaut. Un dossier sans photo reste valide.
Vérifier ce que fait déjà build-seller-presentation quand photoUrls est vide : il calcule un indicateur de complétude autour de cette liste, il ne doit pas changer de comportement.
Le champ s'ajoute au formulaire, il ne le restructure pas.
4. Barrières

Migration + test SQL des politiques Storage · tests unitaires sur la validation des fichiers · vitest · tsc --noEmit · eslint · prettier --check · next build.

MISSION 38 — Importer la fiche du bien vendeur, ne rien ressaisir

Date : 28 août 2026 Demande de Laurent : « si le conseiller a déjà une fiche commerciale du bien, il faut juste qu'il l'importe plutôt que de refaire la saisie, et que ça récupère toutes les infos et les photos ; et qu'il marque la fourchette large de ce qu'il pense, pour guider la recherche automatique de concurrents. »

1. État des lieux

Le moteur d'aspiration existe déjà, et il est bon. fetchListingPage, extractListingData (extracteurs SeLoger, Bien'ici, Green Acres, Figaro, plus JSON-LD, Open Graph et HTML générique), normalizeListingData, mapComparableCharacteristics, la galerie photo avec exclusion des logos d'agence, le collage Cmd+A / Cmd+C / Cmd+V, le favori « Envoyer vers ACM Studio ».

importComparableUrl ne fait que lire et retourner des champs — il n'écrit rien en base. Il est réutilisable tel quel.

Il n'est simplement branché que sur les concurrents. Le formulaire du bien vendeur, lui, se remplit intégralement à la main : une quarantaine de champs, plus les photos. C'est le moment où un conseiller abandonne.

La fourchette du conseiller existe déjà (mission 36 : advisor_price_min, advisor_price_max), avec le bon libellé et le bon avertissement. Rien à créer : elle est seulement au mauvais endroit du parcours, en bas de « Données financières ».

2. Ce qu'on fait — trois sources, une seule cible

a. L'annonce en ligne. Si le bien est déjà commercialisé — re-estimation, fin de mandat chez un confrère, changement d'agence — on rebranche sur le bien vendeur les trois gestes qui marchent déjà côté concurrents : coller l'adresse, coller la page, ou le favori.

b. La fiche commerciale PDF, celle que le conseiller sort de son logiciel d'agence. Nouvelle branche : extraction du texte et des images embarquées. Les champs passent par le même normalizeListingData que les portails ; les images partent dans le bucket de la mission 37.

c. La saisie manuelle, inchangée, toujours disponible.

Après l'import, le conseiller arrive sur une fiche pré-remplie qu'il relit et corrige avant d'enregistrer. Exactement le geste qu'il connaît déjà pour un concurrent.

3. La fourchette, au bon moment

Elle quitte le bas du formulaire et devient l'étape qui suit immédiatement l'import :

Voilà ce qu'on a récupéré. À votre avis, ce bien vaut entre combien et combien ?

Puis « Trouver des concurrents » devient l'action évidente de fin d'écran. Le conseiller enchaîne import → fourchette → recherche sans jamais chercher où cliquer.

4. La règle qui ne bouge pas

CLAUDE.md : l'outil ne produit jamais d'estimation.

Si la fiche ou l'annonce contient un prix, il est montré au conseiller comme information — « prix lu sur la fiche : 420 000 € » — et n'écrit aucun champ.
Il ne pré-remplit pas la fourchette. Le conseiller la saisit lui-même : c'est son avis de professionnel, pas celui d'un document.
Aucun prix du bien vendeur n'entre dans le Live. La fourchette ne sert qu'à cibler la recherche de concurrents, et n'apparaît jamais devant le vendeur.
5. Fichiers
features/subject-property-import/ — nouvelle fonctionnalité qui appelle les services de comparable-import sans les dupliquer.
services/extract-pdf-listing.ts — texte et images embarquées d'un PDF.
actions/import-subject-property.ts — lecture seule, retourne les champs, n'écrit rien. Même contrat que importComparableUrl.
Le formulaire du bien vendeur reçoit le pré-remplissage, sur le modèle du ?assistant=1 déjà en place côté concurrents.
6. Garde-fous
Le PDF est une donnée, jamais une instruction. Rien n'est exécuté, rien n'est réinjecté comme HTML.
Taille du fichier, nombre de pages et nombre d'images bornés.
Un PDF scanné — image pure, sans couche texte — doit échouer proprement avec un message qui dit quoi faire, pas planter ni rendre des champs vides sans explication. L'OCR n'est pas dans cette mission.
Aucun champ inventé : ce qui n'est pas trouvé reste vide, et l'écran dit ce qu'il n'a pas trouvé.
Ne pas dupliquer comparable-import. L'appeler.
7. Ce qu'il faut de Laurent avant de coder

Une vraie fiche commerciale au format PDF, sortie d'un logiciel d'agence. C'est la fixture de la mission : comme tous les extracteurs du dépôt, celui-ci ne peut pas être écrit juste sans une vraie page à lire. Deux ou trois fiches de logiciels différents vaudraient mieux qu'une.

8. Barrières

Fixture PDF réelle · vitest · tsc --noEmit · eslint · prettier --check · next build.

MISSION 39 — La slide « Votre bien » (acte 1)

Date : 28 août 2026 Demande de Laurent : « la première page, c'est les caractéristiques du bien, et on demande au client : est-ce que ça correspond ? »

1. État des lieux

Le Storyboard officiel (docs/01_Method/Storyboard.md, acte 1, slide 2) prévoit une slide de reconnaissance avant tout concurrent. La machine à états (Meeting_State_Machine.md) l'appelle PROPERTY_DISCOVERY puis PROPERTY_CONFIRMED.

Le Live passe aujourd'hui de l'introduction directement au premier concurrent. Le vendeur n'a jamais l'occasion de reconnaître son bien avant qu'on lui montre la concurrence.

2. Ce qu'on fait
Nouveau type de page subject_property dans build-live-pages.ts, inséré entre intro et la première boucle concurrent.
Composant live-page-property.tsx : grande photo, galerie et visionneuse plein écran (réutiliser live-gallery.tsx et gallery-model.ts), caractéristiques, description.
Jamais de prix. Jamais la fourchette du conseiller. Jamais d'estimation. C'est l'acte 1 : le vendeur reconnaît son bien, rien d'autre.
Question : « Est-ce que cette présentation correspond bien à votre bien ? » Réponse oui / non, plus un commentaire libre — c'est souvent là que le vendeur lâche ce qu'il pense valoriser.
Persistance : deux colonnes sur live_seller_summary, seller_property_confirmed (contrainte yes / no) et seller_property_comment (2 000 caractères max, comme les autres commentaires).
can-advance-live-page.ts : on n'avance pas tant que la réponse n'est pas donnée, même règle que les autres écrans.
Si le dossier n'a pas de bien vendeur renseigné, la page ne s'insère pas — même logique que « le concurrent le plus dangereux », absent quand il n'y a aucun concurrent.
3. Garde-fous
Test explicite : la fourchette de prix du conseiller n'apparaît à aucun moment dans le Live.
Test sur buildLivePages : position de la page, et absence de la page quand il n'y a pas de bien vendeur.
4. Barrières

Migration + test SQL · vitest · tsc --noEmit · eslint · prettier --check · next build.

MISSION 40 — Le code couleur de la comparaison

Date : 28 août 2026 Décision produit : gris = équivalent ; un critère sans donnée ne s'affiche pas.

1. État des lieux

ComparisonStatus produit quatre valeurs : same, competitor_advantage, competitor_weakness, unknown. À l'écran, same s'affiche en gras noir et unknown en gris avec la mention « Non renseigné ».

Deux problèmes. Le gris veut dire « je ne sais pas » alors que Laurent l'enseigne comme « c'est pareil ». Et une grille où des cases annoncent « non renseigné » devant un vendeur affaiblit la démonstration : on montre nos trous.

2. Ce qu'on fait
same prend le gris neutre, libellé « Équivalent ».
Les critères unknown sont filtrés à l'affichage. Le moteur continue de les produire : c'est l'interface qui les masque, pour que le rapport conseiller puisse plus tard dire « surface non comparable » sans recalculer quoi que ce soit.
Nouvelle légende : vert = avantage du concurrent · gris = équivalent · orange = faiblesse.
Cas limite : si tous les critères sont inconnus, une phrase honnête plutôt qu'une grille vide.
3. Garde-fous
Le contrat de build-comparable-feature-comparison ne change pas. Seuls l'affichage et les couleurs bougent.
Contraste vérifié en thème clair et sombre : le gris « équivalent » doit rester lisible sur la scène sombre du Live sans se confondre avec le fond.
4. Barrières

vitest · tsc --noEmit · eslint · prettier --check · next build.

MISSION 41 — Le quatrième écran par concurrent

Date : 28 août 2026 Décision produit : on aligne le code sur le Storyboard.

1. État des lieux

build-live-pages.ts produit trois écrans par concurrent : comparable_competition, comparable_price, comparable_duration. Le Storyboard en prévoit quatre (slides A, B, C, D). L'écran « prix » fait aujourd'hui deux choses : recueillir l'estimation du vendeur, puis révéler le prix réel.

Le Storyboard sépare les deux, et il a raison : entre la devinette et la révélation, il y a le temps de réaction du vendeur, et c'est ce temps-là qui produit la prise de conscience.

2. Ce qu'on fait

Découper l'écran prix en deux.

Écran	Titre	Contenu
1	Un sérieux concurrent ?	Fiche, photos, comparaison. Prix et délai masqués.
2	À quel prix ?	Le vendeur devine. Le prix reste masqué.
3	Ce prix vous paraît-il cohérent ?	Révélation : prix réel, écart en € et en %, rang au prix/m². Le vendeur réagit.
4	Pourquoi toujours en vente ?	Durée devinée puis révélée, baisses de prix, motif.
Persistance : colonne seller_price_coherence sur live_seller_responses (contrainte coherent / too_high / too_low / unsure) et son commentaire.
Le saut existant est conservé et étendu : « ce n'est pas un concurrent » sur l'écran 1 saute les écrans 2, 3 et 4.
can-advance-live-page.ts : le verrou actuel — le prix ne se révèle qu'après la saisie de l'estimation du vendeur — doit survivre au nouveau découpage. C'est la règle la plus importante du protocole, elle ne doit pas se perdre dans le refactoring.
3. Garde-fous
Test de non-régression sur le verrou de révélation.
Test sur le nombre de pages produites : 4 par concurrent retenu, 1 pour un concurrent écarté par le vendeur.
4. Barrières

Migration + test SQL · vitest · tsc --noEmit · eslint · prettier --check · next build.