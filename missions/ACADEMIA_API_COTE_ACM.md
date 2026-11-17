# Academia (Mon secteur) par API — le côté ACM

État des lieux, version 3 du 15/11/2026. Elle remplace les versions 1 et 2 du 14/11. Elle s'aligne
sur :
- le contrat « API Mon secteur × ACM Studio — v1, projet » de Laurent (14/11) ;
- la réponse finale de Jean-Guy (14/11) : les décisions D1 à D7 et les ajouts A2 à A4 ;
- les nouvelles de Laurent et la décision de Jean-Guy du 15/11 : une seule clé pour ACM, un plafond
  commun, la route bien-client ;
- la décision de Jean-Guy du 16/11 : tout en un clic dans ACM, sans ouvrir Mon secteur, et
  « Vivre ici » seulement pour le bien vendeur. Aucun bien hors mandat ne part vers Academia : ni
  bouton, ni lien collé, ni adresse (le plan : `PLAN_ACADEMIA_EN_UN_CLIC.md`).

Elle dit ce qu'ACM attend de chaque route, comment ACM reste utilisable tant qu'une marche n'est pas
ouverte, et ce qui doit être tranché avant le gel du 24/11. Rien n'est codé avant le contrat gelé,
le dépôt passé en privé (D6) et le texte de confidentialité en ligne.

## 1. Ce qui existe aujourd'hui (M147 A) — et restera le repli

- **La carte « Le bien dans Academia »**, sur Bien vendeur, pour le conseiller seul : « Dossier
  d'adresse ↗ » et « Vivre ici ↗ ». Un toucher copie l'adresse enregistrée et ouvre Academia.
- **« Ventes réelles dans Academia ↗ »**, sous « Votre analyse de valeur ».
- **Le lien client « Vivre ici »**, collé à la main sur un mandat signé
  (`projects.academia_living_here_url`, de la forme `https://app.myacademia.ai/l/<jeton>`). Il part
  vers l'acquéreur : sur son lien de dossier et dans « Confirmer la visite ».
- **La démo** ouvre la page de présentation d'Academia.
- **Un seul module, `src/lib/academia.ts`.** Le lien direct attend derrière
  `ACADEMIA_LIEN_DIRECT = false`.

**Règle du repli, pour toutes les marches.** Chaque marche et chaque appel s'allument seuls. Ce qui
est fermé, en panne, au plafond du jour, sans clé, avec une clé expirée ou révoquée, ou hors des
droits de l'offre, garde le geste d'aujourd'hui pour ce qu'il couvre. Un appel en échec n'est jamais
lu comme « aucun dossier » ou « aucune vente » (M98) : l'écran le dit, et l'erreur part au journal
(M100).

## 2. Les règles d'ACM que les décisions du 14 et du 15/11 changent

Une décision datée de Jean-Guy fait autorité. Mais chaque changement doit être écrit, avec son test,
avant le code.

| Règle d'aujourd'hui | Ce qui change | À faire côté ACM |
|---|---|---|
| CLAUDE.md : « ne jamais construire de fonction qui estime le prix du bien vendeur » ; « jamais le mot estimation à l'écran » (M105, test de vocabulaire) | **D1** : la valeur indicative d'Academia s'affiche, pour le conseiller seul, sur « Avant le rendez-vous » | Jean-Guy réécrit la règle de CLAUDE.md. Un test prouve que la valeur n'atteint ni le Live, ni la présentation, ni un document, ni un lien client, et qu'ACM ne la garde pas. Le test de vocabulaire continue de refuser « estimation » : le nom affiché est « Valeur indicative d'Academia », et la mention d'Academia est relue |
| M147 A et `never-seller-side.test.ts` : rien d'Academia devant le vendeur | **D2** : « Vivre ici » au vendeur par le lien client. **D7** : les blocs cochés par le conseiller, lus sur la route bien-client | Le test s'ouvre au lien client et aux blocs de D7, et seulement à eux. L'estimation, le DPE, un numéro de rue et une vente à l'adresse même restent interdits côté vendeur, prouvé par un test avec des valeurs pièges |
| M147 A : « ACM ne garde pas ses propres versions » | **D4** : aucune copie à l'écran, sauf dans un document remis au vendeur, où les blocs sont figés avec leur source et leur date de lecture | Une décision écrite. Le document figé suit la conservation du dossier et part avec lui ; les procédures d'effacement A et B le comptent |
| La clé par conseiller (version 2 de ce document, D3) | **15/11** : une seule clé pour tout ACM, sur un compte technique de Mon secteur. Plus de clé par conseiller, plus d'écran Profil → « Academia », plus de quota par conseiller | Plus de table ni de chiffrement : la clé est un secret du serveur, posé dans Vercel par Jean-Guy (§3.1). Aucune migration pour la clé |
| `/confidentialite` : « ACM Studio n'envoie rien à Academia » | Ce qui part : l'adresse, le type, les pièces, la surface et une référence opaque du bien, au nom d'ACM Studio. Et D7 : des données publiques choisies peuvent figurer dans le document du vendeur | Le texte proposé, mis à jour (`missions/ACADEMIA_API-confidentialite-pour-le-juriste.md`). Rien ne s'allume avant qu'il soit en ligne |

## 3. Ce qu'ACM attend de chaque route (contrat §4)

**Pour toutes les routes :**
- appels de serveur à serveur seulement ;
- délai de 8 s, puis un seul nouvel essai sur un dépassement ou une erreur 5xx, jamais sur une 4xx
  (règle de M104) ;
- `429` : ACM respecte `Retry-After` et ne réessaie pas tout seul devant le conseiller.

**Ce qu'ACM envoie et ce qu'il garde :**
- **Il envoie** l'adresse, le type, les pièces, la surface et une **référence opaque du bien**,
  jamais un nom (décision de Jean-Guy, 15/11) :
  - le bien vendeur : l'identifiant du bien vendeur
    dans ACM (un UUID tiré au hasard, sans nom ni signification). Un même bien garde la même
    référence des deux côtés, donc un seul dossier Academia ;
  - aucun bien hors mandat (décision de Jean-Guy, 16/11).

  Jamais Jamais le titre, le texte ou le lien d'une annonce, ni le nom, le téléphone ou l'e-mail
  d'une personne (règle 1 du contrat). Un test d'ACM le prouve sur la charge envoyée.
- **Il garde** l'identifiant du dossier Academia et le lien client. Les blocs ne sont gardés que
  dans un document remis au vendeur (D4).

### 3.1 La clé d'ACM (15/11)

- **Une seule clé**, celle du compte technique d'ACM chez Mon secteur. Elle vit dans
  l'environnement du serveur, jamais dans la base, jamais dans le dépôt, jamais vers le navigateur,
  jamais au journal (le nettoyage de M100, prouvé par un test).
- **Le nom de variable proposé : `ACADEMIA_API_KEY`**, sur le modèle de `STREAM_ESTATE_API_KEY`,
  sans le préfixe `NEXT_PUBLIC_` qui l'enverrait au navigateur.
- **La clé d'essai (A2)**, qui ne lit que le dossier de démonstration fixe : **`ACADEMIA_API_KEY_DEMO`**.
  Le serveur la choisit pour l'agence de démonstration seulement, sur son repère `is_demo` (M114),
  jamais sur un paramètre du navigateur.
- **Où les poser** (geste de Jean-Guy, Claude Code ne touche pas à Vercel) :
  - production : `ACADEMIA_API_KEY` et `ACADEMIA_API_KEY_DEMO` (la démo de Natacha tourne en
    production) ;
  - essai : `ACADEMIA_API_KEY_DEMO` seule. Sans la vraie clé, une agence réelle sur l'essai garde
    le geste d'aujourd'hui, et l'essai ne consomme rien du plafond commun.
- **Sans clé, ou clé refusée (`401`)** : le geste d'aujourd'hui pour le conseiller (« Academia ne
  répond pas pour l'instant : ouvrez-le depuis la carte »). L'erreur part au journal et les
  opérateurs la voient sur `/erreurs`. Ils sont aussi prévenus avant l'expiration de 90 jours sans
  usage, si `GET /moi` renvoie `expire_le`.

### 3.2 `GET /moi`

**ACM attend** `{ offre, lecture_seule, droits, plafond_jour, utilises_aujourdhui, expire_le }`. Il ne
l'affiche qu'aux opérateurs, en bas de `/erreurs`, à côté des budgets (M100, M151). Plus rien sur Mon
profil.

**Le suivi des opérateurs.** Depuis le 16/11, seul le bien vendeur part vers Academia : le côté
acquéreur n'existe plus, et `GET /moi` (`utilises_aujourdhui`) suffit. `/erreurs` dit
« Aujourd'hui : 37 dossiers sur 200 ». Aucune trace propre à ACM, aucune migration pour cela.

**Ce que fait ACM selon la réponse :**
- les droits décident des boutons : sans `lien_client`, pas de « Créer le lien » ;
- en lecture seule, ACM ne propose pas de créer un dossier.

### 3.3 `POST /dossiers`, puis `GET /dossiers/{id}`

- **Déclenchement** : par un geste du conseiller seulement, jamais automatiquement, un bien à la
  fois : jamais pour tout un rapprochement d'un coup.
- **Ce qui compte (Laurent, 15/11)** : la création du dossier d'une adresse nouvelle compte, une
  fois ; un lien client ne compte pas. Un rapprochement de cinq biens jamais demandés prend donc
  cinq dossiers.
- **Le plafond commun : 200 dossiers par jour pour tout ACM.** Au-delà, un `429` avec le code
  `plafond_jour` : ACM ne réessaie pas, et dit au conseiller « Academia a atteint sa limite du
  jour : ouvrez-le depuis la carte, ou réessayez demain ». Le geste d'aujourd'hui reste.
- **Idempotence** : ACM envoie `idempotence`.
- **Réponse 200** avec `reutilise: true` : **le champ n'est jamais affiché**, ni au conseiller, ni
  dans un document. ACM le traite comme une réponse ordinaire.
- **Réponse 202** : ACM suit `etat` sur 2 minutes, puis à l'ouverture suivante (modèle du
  Localisateur, M75).
- **Réponse 422** avec `propositions` : le conseiller choisit une adresse, ACM ne devine jamais. Il
  ne réécrit pas non plus l'adresse du bien sans son geste.
- **Ce qu'ACM garde** : l'`id` du dossier et la date, sur le dossier vendeur. Changer l'adresse du
  bien l'oublie.

### 3.4 `GET /dossiers/{id}/bien` et la route bien-client

**Pour le conseiller**, sur la carte « Le bien dans Academia » (`/bien`) :
- chaque bloc, avec ses trois états (`ok`, `aucun`, `non_verifie`), sa source et sa date de
  lecture ;
- `non_verifie` se dit « Source indisponible », jamais « aucun » ;
- un bloc inconnu du schéma n'est ni montré ni deviné : il est journalisé (règle de M48) ;
- une réponse relue par zod, champ par champ, sur une liste d'autorisation.

**Les ventes** sont aussi lues par « Ventes réelles », sur « Avant le rendez-vous ». **La valeur
indicative (D1)** n'est affichée que là, avec la mention d'Academia, jamais copiée dans « Votre
analyse de valeur ».

**Le DPE de l'adresse** : le conseiller choisit lui-même. ACM ne recopie rien dans la fiche du bien
sans son geste.

**La route bien-client (D7, 15/11)** ne rend que ce que le vendeur peut voir : les ventes avec la rue
sans numéro, l'urbanisme, les permis, les risques, la population, la copropriété. Ni l'estimation,
ni le DPE, ni une vente à l'adresse même. ACM l'utilise pour **tout** ce qui part vers le vendeur,
et la relit à son tour par sa propre liste d'autorisation : la garantie est doublée. ACM refuse en
plus, à la lecture :
- un numéro de rue, ou un champ `adresse` complet, s'il en arrivait un ;
- un bloc `non_verifie`.

L'exception « dans votre immeuble » demandée le 14/11 tombe : la route ne rend aucune vente à
l'adresse même.

### 3.5 `POST /dossiers/{id}/liens-client`

**ACM attend** l'url de la forme `https://app.myacademia.ai/l/<jeton>`, qui passe le contrôle
d'aujourd'hui sans le changer, et `expire_le`. **Un lien client dure 30 jours** ; Jean-Guy a demandé
à Laurent de pouvoir le prolonger.

**Ce que fait ACM :**
- **pour un mandat signé**, il pose le lien sur le dossier vendeur ;
- **un lien expiré** n'est plus envoyé. ACM propose de le prolonger si Laurent l'ouvre, sinon d'en
  créer un nouveau, et le dit au conseiller (« Le lien « Vivre ici » a expiré le … »). La date vient
  de `expire_le`, jamais d'un calcul d'ACM.

**Sans le droit `lien_client`** (`403`) : le champ « Collez le lien » d'aujourd'hui.

### 3.6 Essai et démonstration (A2)

- **La clé d'essai** ne lit que le dossier de démonstration fixe. Elle sert à l'e2e sur l'essai et à
  la démo, en production comme sur l'essai.
- **Les tests unitaires** n'appellent jamais Mon secteur : ils jouent l'exemple et le schéma livrés
  par Laurent (`docs/api/v1/exemple-bien.json`).
- **La démo** n'ouvre que ce dossier fixe, sur l'adresse fictive de l'exemple. C'est la seule
  exception à M114, décidée par Jean-Guy le 14/11. Aucune autre adresse ne part de l'agence de
  démonstration.

## 4. Les écrans touchés (maquette d'abord)

Aucun code avant l'accord sur les maquettes, sur tablette, téléphone et ordinateur.

1. La carte « Le bien dans Academia », avec ses blocs et leurs états.
2. « Avant le rendez-vous » : « Ventes réelles » et la « Valeur indicative d'Academia » (D1).
3. **D7, le choix des blocs à montrer** : une case par bloc ouvert, rien de coché d'avance, et
   l'aperçu de ce que le vendeur verra.
4. **D7, le ou les écrans du Live** qui montrent ces blocs. Leur place est à trancher (§5, point 1).
5. **D7, la section du document final** (synthèse ou Étude de marché), avec sa source et sa date.
6. Le lien « Vivre ici » du mandat montré au vendeur, dans la présentation et le document final
   (décision de Jean-Guy du 14/11).
7. `/erreurs`, pour les opérateurs : l'offre, le plafond du jour et ce qui en est utilisé.

L'écran Mon profil → « Academia » disparaît du périmètre.

## 5. À trancher avant le gel du 24/11

1. **La place des ventes dans le Live (D7). C'est le point qui touche la méthode.** La valeur perçue
   ne doit rien révéler du marché (M82, M92), et le vendeur devine le prix de chaque concurrent
   avant de le voir (CLAUDE.md). Montrer des prix de ventes avant ces deux moments donnerait la
   réponse avant la question.

   **Ma recommandation :**
   - l'urbanisme, les permis, les risques, la population et la copropriété : avant les concurrents,
     mais après « Votre valeur perçue » ;
   - les ventes autour : après le dernier concurrent, avec « Analyse des prix ».
2. **Les ventes montrées au client** : la rue, la date, la surface et le prix ensemble peuvent
   suffire à retrouver une vente dans une petite rue. La réutilisation des données DVF interdit de
   ré-identifier les personnes. **Question pour la juriste** : la rue sans numéro, la distance et
   le prix suffisent-ils ? Faut-il un nombre minimal de ventes dans la rue, ou seulement la
   distance ?
3. **Le partage du plafond commun** : réglé le 15/11 (ci-dessous).
4. **D7** : Academia est-il nommé à côté de la source publique dans ce que voit le vendeur ? C'est
   la question posée à Laurent. Si oui, `never-seller-side` s'ouvre à ce nom aussi.
5. **La prolongation d'un lien client** : la réponse de Laurent décide si ACM propose « Prolonger »
   ou seulement « Créer un nouveau lien ».
6. **D4** : un document remis au vendeur fige ses blocs. Gardés combien de temps ? Ma proposition :
   comme la synthèse, avec le dossier, et effacés avec lui.
7. **A4** : la conservation chez Mon secteur du dossier et de l'adresse du bien vendeur. C'est la réponse de Laurent, attendue pour le texte de
   la juriste.
8. **L'éditeur des deux outils** (contrat §6) : s'ils ne sont pas la même société, il faut un
   accord entre les deux éditeurs. Cela conditionne le texte de confidentialité.

Réglés le 15/11 :
- les ventes à l'adresse même, absentes de la route bien-client ;
- le plafond commun : rien pendant la bêta, les opérateurs suivent la consommation (§3.2). Un lien ne compte pas, la création du dossier d'une adresse nouvelle
  compte une fois (Laurent) ;
- les noms des clés : `ACADEMIA_API_KEY` et `ACADEMIA_API_KEY_DEMO`, posées par Jean-Guy dans
  Vercel quand Laurent les donnera.

Réglé le 16/11 : « Vivre ici » seulement pour le bien vendeur ; le lien créé par l'API sert au
vendeur et à chaque acquéreur à qui le bien est proposé. Un lien collé à la main (le repli, sans
clé) n'a pas de date d'expiration connue : ACM prévient le conseiller aux 25e et 30e jours ; un lien
créé par l'API suit `expire_le` (§3.5).

## 6. La mission côté ACM, une fois le contrat gelé

- **Marche 0** : basculer `ACADEMIA_LIEN_DIRECT` le jour où `/app/ouvrir` existe et où le texte de
  confidentialité est en ligne.
- **Lot A** : le client de Mon secteur (`src/lib/academia.ts`), la clé lue dans l'environnement,
  `GET /moi` et le plafond sur `/erreurs`. Sans migration. Les deux clés posées par Jean-Guy dans
  Vercel.
- **Lot B** (maquette d'abord), avec une migration (la trace des dossiers créés, §3.2) : le dossier, ses blocs pour le conseiller, « Ventes réelles », la
  valeur indicative (D1, avec la règle de CLAUDE.md réécrite et son test).
- **Lot C** (maquette d'abord) : D7. Le choix des blocs, le Live, le document figé, la route
  bien-client doublement relue, et `never-seller-side` ouvert bloc par bloc.
Le découpage en lots du 16/11 (« Vivre ici » en un clic d'abord, puis le dossier d'adresse pour le
conseiller, puis les pièces montrées au vendeur) remplace celui-ci : `PLAN_ACADEMIA_EN_UN_CLIC.md`.
