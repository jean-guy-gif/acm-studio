# « Vivre ici » sur tout bien d'une sélection acquéreur (A3) — périmètre

> **Abandonné le 16/11/2026 (décision de Jean-Guy)** : « Vivre ici » ne vaut plus que pour le bien
> vendeur ; aucun bien hors mandat ne part vers Academia. Cette fiche et ses maquettes `A3-*` restent
> comme archive. Le plan qui la remplace : `PLAN_ACADEMIA_EN_UN_CLIC.md`.

Préparé le 15/11/2026, à la demande de Jean-Guy. Périmètre et maquettes validés par lui le 16/11,
avec ses décisions du 15 et du 16/11, reportées ici. Numéro de mission à donner par Jean-Guy. Le code se fait
sur une branche dès que le dépôt est privé ; d'ici là, aucun commit. Rien sur `main` ni en
production sans son feu vert.

## Pourquoi

Le lien client « Vivre ici » d'Academia montre le quartier, les écoles et les commerces autour d'un
bien. Aujourd'hui, il ne se colle que sur un mandat (onglet Bien vendeur, M147 A) et ne part vers
l'acquéreur que pour un mandat signé. Or la plupart des biens d'une sélection sont hors mandat
(concurrents, biens démarchés, annonces du marché).

Décision de Jean-Guy du 15/11 : le lien se colle sur tout bien d'une sélection, hors mandat compris,
sans attendre une version « quartier » d'Academia. La page client d'Academia montre la rue sans
numéro et un repère à environ 100 m (Laurent l'a vérifié dans son code). C'est le conseiller qui
choisit de partager le lien. C'est une **exception assumée à M119** (« jamais l'adresse exacte devant
l'acquéreur ») : ACM, lui, ne montre toujours ni adresse ni rue.

Le lien se colle à la main jusqu'à la marche 2 de l'API (fiche `ACADEMIA_API_COTE_ACM.md`).

## Les maquettes

Dans `missions/maquettes/`, faites par `A3-vivre-ici-generateur.mjs --png` :

1. `A3-1-le-dossier-acquereur.png` : l'écran du conseiller au-dessus du dossier acquéreur, avec le
   nouveau bloc « « Vivre ici » de chaque bien », le message de partage du lien, les états à 26 et
   34 jours, le lien discret de la fiche acquéreur et la carte du mandat.
2. `A3-2-confirmer-la-visite.png` : « Confirmer la visite » d'un bien hors mandat, avec et sans lien.
3. `A3-3-le-lien-de-l-acquereur.png` : l'écran du bien sur le lien de l'acquéreur, en français et en
   anglais.

## Ce qui change

1. **Où le coller : la page du dossier acquéreur** (`/acquereurs/[id]/dossier`), entre « Photos des
   biens » et le lien. C'est là que le conseiller règle déjà ce qui part vers l'acquéreur.
   - **Une ligne par bien de la sélection.**
   - **Un mandat signé** garde le lien du mandat (M147 A). La ligne le dit et mène au bien vendeur
     pour le changer.
   - **Un bien hors mandat** (concurrent, bien démarché, annonce du marché) a :
     - un champ ;
     - « Enregistrer le lien », en contour ;
     - « Ouvrir Academia ↗ », qui copie l'adresse confirmée si ACM la connaît. Sinon, il dit de
       chercher le bien dans Academia ;
     - « Ouvrir ↗ » et « Retirer » une fois le lien collé.
   - **La ligne d'information**, « Ce lien montre la rue (sans numéro) et un repère à environ
     100 m. », se lit une fois en tête du bloc, jamais sous chaque bien (retouche de Jean-Guy,
     15/11).
   - **Sur la fiche acquéreur**, sous « Sa sélection », un lien discret « Ajouter « Vivre ici » »
     mène à ce bloc (Jean-Guy, 15/11). Il se montre tant qu'un bien hors mandat de la sélection n'a
     pas de lien, ou a un lien collé depuis plus de 30 jours (Jean-Guy, 16/11) ; sinon rien. Aucun autre changement sur la fiche.
2. **Un lien par bien, pour toute l'agence.**
   - Le lien vaut pour ce bien chez tous les acquéreurs de l'agence qui l'ont dans leur sélection,
     comme celui d'un mandat.
   - Il est repéré par la clé du bien de la boucle (M134, M139 : `listing:<portail>:<numéro>`, ou
     `competitor:<id>` pour un concurrent sans annonce reconnue).
   - Une nouvelle sélection, la copie d'un concurrent (M98) ou un bien démarché devenu concurrent
     (M120 A) ne le perdent donc pas.
3. **Seulement un lien d'Academia**, c'est-à-dire `https://app.myacademia.ai/l/<jeton>`. La règle de
   M147 A et son message s'appliquent à l'écran, au serveur et en base.
4. **Sur le lien de l'acquéreur** : le bloc « Vivre ici — Le quartier, les écoles, les commerces ↗ »
   (M147 A) s'affiche sous tout bien qui a son lien.
   - Il passe par la même liste d'autorisation, et le titre piège M107 est prouvé.
   - Ni la présentation plein cadre ni le PDF ne le montrent, comme aujourd'hui.
5. **« Confirmer la visite »** :
   - Le message porte le lien d'un bien hors mandat (« Vivre ici, autour du bien : … »), avec la
     ligne d'information au-dessus des boutons de partage.
   - Sans lien : « Ce bien n'a pas de lien « Vivre ici ». Le coller sur le dossier acquéreur. »
6. **Au partage**, la ligne d'information s'affiche une fois, pour les biens hors mandat qui ont leur
   lien, au-dessus de Copier / SMS / WhatsApp / E-mail :
   - au partage du lien du dossier (`DossierLinkShare`) ;
   - à la relance d'une sélection (M135) ;
   - dans « Confirmer la visite ».
7. **25 et 30 jours** (Jean-Guy, 15 et 16/11). Un lien client d'Academia vaut 30 jours (Laurent,
   15/11). ACM compte depuis le jour où le lien a été collé, l'heure de la base.
   - **Du 25e au 29e jour**, en orange : « Collé il y a 26 jours : un lien d'Academia vaut 30 jours.
     Collez bientôt un lien neuf. »
   - **À 30 jours et au-delà**, en orange : « Collé il y a 34 jours : un lien d'Academia vaut
     30 jours, il ne s'ouvre peut-être plus. Collez un lien neuf. »
   - **Le lien reste toujours montré** à l'acquéreur et reste dans les messages.
   - **ACM ne vérifie pas auprès d'Academia** qu'un lien est expiré (Jean-Guy, 16/11). Il ne fait
     aucune requête vers Academia ; la date d'expiration viendra de l'API (`expire_le`).
   - Les avertissements se lisent sur le dossier acquéreur, dans « Confirmer la visite » (sous le
     message) et sur la carte « Le bien dans Academia » du mandat.
   - **Le lien d'un mandat** (M147 A) suit la même règle, sur la carte « Le bien dans Academia »
     (Jean-Guy, 15/11). Il faut la date où il a été collé, qu'ACM ne garde pas aujourd'hui : une
     colonne de plus, dans la migration de l'A3 (Jean-Guy, 16/11). Un lien de mandat collé avant la
     mission n'a pas de date et n'est pas averti ; rien n'est inventé (M56).
8. **Démo** : rien n'est semé, ce serait une fausse source (M147 A). « Ouvrir Academia » ouvre la
   page de présentation sans rien copier.

## Ce qui ne change pas

- Le lien d'un mandat se colle toujours sur le bien vendeur.
- Le dossier imprimé, la présentation plein cadre et les documents du vendeur ne changent pas.
- ACM n'envoie toujours rien à Academia : c'est le conseiller qui colle l'adresse dans Academia.
- Les écrans du Live ne changent pas.

## L'ordre, après le feu vert

1. **L'exception à M119 dans DECISIONS.md**, datée et signée Jean-Guy, avec son test. Le test refuse
   toujours une adresse et une rue venant d'ACM sur le lien de l'acquéreur. Il n'admet qu'un lien
   d'Academia relu, sous un bien de sa sélection.
2. **La migration**, relue par le gardien-sql, puis appliquée par Jean-Guy après sauvegarde et
   comptage.
   - Elle crée une table, nommée par exemple `property_living_here_links`. Ses colonnes :
     - l'agence ;
     - la clé du bien, de forme fermée, vérifiée par la base comme une clé de cette agence ;
     - le lien, avec la contrainte de `projects.academia_living_here_url` ;
     - qui l'a collé, et quand (l'heure de la base).
   - Elle ajoute à `projects` la date où le lien du mandat a été collé, posée par la base quand le
     lien change, nulle pour les liens d'avant.
   - Elle est lue par l'agence et écrite par le serveur seul.
   - La ligne d'un concurrent (`competitor:`) part avec lui.
   - Une purge à 3 ans, comme la copie de l'annonce (M152 A), est à juger par le gardien-sql.
   - `PROCEDURE_EFFACEMENT.md` (B), `nettoyer-test` et le test de cloisonnement de toutes les tables
     la connaissent.
   - La CI joue son test SQL.
3. **Le code**, avec ses tests.
4. **`/confidentialite`**. Le texte validé le 11/11 dit que le lien « Vivre ici » ne vaut que pour
   un bien dont l'agence a le mandat. Le changement proposé est dans
   `ACADEMIA_API-confidentialite-pour-le-juriste.md`, partie « A3 ». **Aucun lien hors mandat ne
   part vers un acquéreur avant que ce texte soit validé et en ligne.** Une constante coupe la
   fonction jusque-là, sur le modèle de `HORS_MANDAT_OUVERT` (M153).
5. **Le relecteur, puis l'e2e au premier plan.** Une spec colle un lien sur un bien hors mandat des
   Keller et le lit sur le lien du téléphone. Elle vérifie la ligne d'information au partage et dans
   « Confirmer la visite », puis retire le lien.

## Réglé par Jean-Guy les 15 et 16/11

1. Prévenir en orange du 25e au 29e jour, puis à partir du 30e ; le lien reste toujours montré.
2. Aucune vérification d'expiration auprès d'Academia ; la date viendra de l'API.
3. Le même avertissement pour le lien d'un mandat, sur la carte « Le bien dans Academia », avec la
   colonne de sa date dans la migration de l'A3.
4. Le seul endroit où coller : la page du dossier acquéreur, avec le lien discret « Ajouter « Vivre
   ici » » sous « Sa sélection » sur la fiche, seulement quand un bien hors mandat de la sélection
   n'a pas de lien ou a un lien de plus de 30 jours.
5. La ligne d'information une fois en tête du bloc et une fois au partage, plus sous chaque bien.

## Reste ouvert

- La validation par la juriste du texte A3 de `/confidentialite` (la constante coupe la fonction
  jusque-là).
- Le dépôt privé, avant le premier commit : le code se fait sur une branche à partir de là.
