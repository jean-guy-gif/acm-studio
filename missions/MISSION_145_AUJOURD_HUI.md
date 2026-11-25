# MISSION 145 — Le conseiller ouvre l'outil sur ce qu'il a à faire aujourd'hui

**Date** : 07/11/2026 · **Origine** : audit UX / UI du 07/11 en production
(`missions/AUDIT_UX_UI_2026-11.md`), points **I1, I2, I3**. Point de départ :
`missions/maquettes/AUDIT-aujourdhui.png`. Le 07/11, la démo a 17 tâches dans le Suivi, dont 7
« Envoyer le point de la semaine à … » et 4 « Proposer un point avec … », et on arrive sur Préparation.

**Deux parties** (Jean-Guy, 07/11), une branche et un `/valide` chacune, livrées l'une après
l'autre sur l'essai : **A, les règles** (validée et en production le 07/11) ; **B, la page
« Aujourd'hui »**. Fait avant la A, à part
(07/11, accord de Jean-Guy) : le dossier « Martin » de la démo (mandat signé hors du jeu semé, créé le
23/10 par le compte de démo) est retiré — sauvegarde du 07/11 à 21 h 55 vérifiée, 22 lignes et
3 photos supprimées, dossiers 22 → 21, comptage conforme à la prédiction.

Équipe allégée. **Partie A sans migration** (le sixième dossier de démo reprend la marque
`demo_stage = 'signed'`, liste fermée en base, M114, M131). **Partie B : une migration, accordée par
Jean-Guy (07/11)**, deux colonnes nullables sur `project_meeting_conclusions` pour « Garder la date »
(point 16), rien d'autre : `npm run sauvegarde` avant, la migration montrée à Jean-Guy avant d'être
appliquée (gardien-sql, comptage), un test SQL dans la CI. Toute autre colonne est reportée.

**Textes juridiques** (DECISIONS, 07/11) : le courrier au propriétaire, le courrier d'une recherche
acquéreur, le dossier de collaboration au confrère et `/confidentialite` sont validés par le juriste ;
la partie B n'y touche pas.

**Règles (Jean-Guy, 07/11)** :
- Seul un bien **sous mandat signé, sans offre acceptée**, est proposé à un acquéreur, partout.
  Les concurrents et les annonces du marché restent dans les biens idéaux, avec le courrier ou le
  dossier au confrère (M120) avant toute visite.
- Un bien **sans mandat** qui correspond à des acquéreurs prêts devient une **alerte pour rentrer
  le mandat**, jamais une proposition ; les acquéreurs ne sont jamais nommés dans ce qui part vers
  le vendeur ou le propriétaire (Jean-Guy, 07/11, après le `/valide` de la A).
- Aucune tâche d'appel vers un propriétaire prospecté (démarchage téléphonique sans consentement
  interdit depuis le 11/08/2026) : courrier et passage. Un appel n'est proposé qu'à un client en
  relation : vendeur sous mandat, vendeur qui nous a reçus et a donné son numéro (« à relancer »),
  acquéreur.

## Maquette

`missions/maquettes/M145-1-ordinateur.png`, `M145-2-tablette-serie.png`, `M145-3-telephone.png`,
`M145-4-boucle-acquereur.png`, `M145-5-etats.png`, `M145-6-alertes-mandat.png` (version 6, source
`M145-generateur.mjs --png`) : les tâches réelles de la démo le 07/11 après la partie A, d'où vient
chaque ligne, une série ouverte, le téléphone, la boucle côté acquéreur, les états, les alertes pour
rentrer le mandat. La 4 est la partie A ; les autres, la partie B.

## Partie A — Les règles

1. **Un bien sous mandat signé, sans offre acceptée** (corrige M134, qui laissait passer un vendeur
   à relancer, un concurrent, un nouveau venu, un bien démarché ; une offre acceptée se lit dans
   `buyer_document_acceptances`, M138), partout : la tâche `propose_buyers`, la page « Proposer ce
   bien » et son action (refus au serveur, « Ce bien n'est plus à proposer »), le bouton « Proposer
   ce bien aux acquéreurs » du dossier vendeur, « Envoyer le lien » de la M133. Un mandat dont
   l'offre tombe redevient proposable.
2. **Biens idéaux** (M118) : « Ce que l'agence a déjà » ne propose plus de vendeur à relancer, ni
   un mandat sous offre acceptée ; le serveur refuse de les retenir. Aucune sélection n'en contient
   aujourd'hui (compté le 07/11 : 10 annonces, 1 mandat signé). Le rapprochement (M86) garde ses
   trois groupes : c'est la recherche du conseiller, et « Rappeler : j'ai un acquéreur » appelle un
   vendeur en relation.
3. **La boucle côté acquéreur (I2)** : quand `propose_buyers` compte un acquéreur pour un mandat,
   sa fiche et sa ligne disent « Lui proposer la maison de M. et Mme Lopez », bouton « Proposer ce
   bien ». Elle ne remplace que « Trouver ses biens idéaux » et « Lui proposer d'autres biens »
   (M143) ; plusieurs mandats : le plus récent, « + N autres » ; l'envoi noté (M134) ou l'écart
   (M139) la retire.
4. « Acquéreurs de l'agence pour ce bien » (M133) reste sur tout dossier, Mme Garcia comprise : un
   argument pour le Live, jamais une tâche.
5. **Sixième dossier de démo** : « Conclu, mandat signé » à Vence, M. et Mme Lopez, maison de
   5 pièces, 140 m², 735 000 €, sans piscine, signée 3 jours avant « Préparer ma démo » (dates
   relatives) ; il appelle 4 acquéreurs prêts (la famille Moreau, Mme Faure, M. Girard et
   Mme Chevalier, M. et Mme Roux ; M. et Mme Lambert veulent une piscine). « Ma démo » dit six
   dossiers ; la remise à zéro le retire et le recrée.
6. **La marque partagée** : Lopez et Mougins portent tous deux `demo_stage = 'signed'`. Chaque
   endroit qui retrouve un dossier de démo par sa marque passe par son **scénario** (Vence ou
   Mougins), jamais par la marque seule : le plan de « Préparer ma démo » (`DEMO_STAGES`, la boucle
   qui retient `mouginsProjectId` pour la sélection, le bon de visite, l'offre et l'acceptation des
   Keller, `demo-dossiers.ts`), la liste et l'ordre de « Ma démo » (`get-demo-dossiers.ts`, deux
   lignes « Conclu, mandat signé », Mougins puis Vence), « Remettre ma démo à zéro » (qui retire
   tous les dossiers marqués du closer, les deux compris), les e2e (qui cherchent par le nom du
   vendeur, « M. Lefebvre », « M. et Mme Lopez »). Un test prouve que la sélection, le bon, l'offre
   acceptée et « Sous offre » des Keller restent sur Mougins, quel que soit l'ordre de création.
7. Tests écrits d'abord, rouges sur le code d'aujourd'hui : un vendeur à relancer, un concurrent,
   un nouveau venu, un bien démarché et un mandat sous offre acceptée ne sont jamais proposés
   (service, page, action, biens idéaux). E2e démo : la tâche de Vence dans le Suivi, la fiche de la
   famille Moreau, l'envoi depuis « Proposer ce bien ».

## Partie B — La page « Aujourd'hui »

8. **`/aujourdhui`**, page d'arrivée après connexion et après un nouveau mot de passe, qui passe
   par `/` (« Bienvenue » reste pour un conseiller sans dossier hors mode expert, M88, M97, M110) : la date, « N choses à faire, la plus urgente en premier »,
   un seul repère-lien « N acquéreurs prêts à visiter » (M132, vers `/acquereurs`), aucun chiffre de
   mandats ; quatre blocs, **Urgent** (réponse du vendeur, offre qui expire), **Vendeurs** (relances,
   Point marché), **Acquéreurs** (visites, biens à proposer, veille, relances, points),
   **Prospection** (démarcher : « courrier au propriétaire, dossier au confrère ») ; l'ordre de
   `KIND_ORDER` ; un bloc vide ne s'affiche pas ; jamais l'exemple (M97). **Mes tâches | Toute
   l'agence** (décision du 07/11) : par défaut, les tâches des dossiers et des acquéreurs du
   conseiller connecté (`projects.advisor_id`, `buyers.advisor_id`) ; un manager, et lui seul, passe
   à « Toute l'agence » (M59). La pastille suit « Mes tâches ».
9. **Une ligne par sorte de tâche** dès qu'il y en a deux, ouverte sur place, chaque tâche avec son
   geste d'aujourd'hui (M130 A, M135, M138, M139), la plus en retard en tête, « dont N en retard » ;
   une tâche faite quitte la série ; l'Urgent n'est jamais regroupé. Un seul bouton plein, celui de
   la première ligne ; « en retard » en orange, jamais en rouge.
10. **Pastille** sur « Aujourd'hui » = le nombre de lignes, muette sur une lecture en échec (M98) ;
   plus de pastille sur « Suivi ». Une lecture en échec le dit dans son bloc, jamais « rien à
   faire » ; sans tâche, « Rien à faire aujourd'hui. Prochaine tâche : … le … ».
11. **Le point de la semaine** : dû le lundi, retiré le mercredi soir (Paris), jamais « en retard »
    (précise M139).
12. **Fait aujourd'hui** : en bas, barré, avec l'heure, jusqu'à minuit, même périmètre que les tâches,
    lu dans `follow_up_contacts`, `project_market_updates`, `buyer_events`, `buyer_offer_follow_ups`,
    `buyer_proposals`, les dates de prospection et la visite faite (`buyer_visit_requests`) ; dans
    « Toute l'agence », chaque ligne porte le prénom de qui l'a fait (son auteur en base), pour ne
    pas contacter deux fois le même client ; une lecture en échec ne l'affiche pas.
13. **Le Suivi perd son bloc « À faire aujourd'hui »** (remplace M130 A) : un lien vers Aujourd'hui,
    puis les filtres et les cartes, inchangés.
14. **Menu en trois groupes**, partout (bureau, tablette, barre compacte) : Aujourd'hui · VENDEURS
    Préparation, Live, Suivi · ACQUÉREURS Acquéreurs, Visites · LES DEUX Prospection. Plus
    d'interrupteur ni de couleur de mode (remplace M118) ; `profiles.workspace_mode` n'est plus lu ;
    adresses et carte du conseiller inchangées.
15. **Aucun appel vers un propriétaire prospecté** : un test refuse tout lien `tel:` dans
    Prospection, la tournée, les courriers et les lignes de démarchage.
16. **Rentrer le mandat d'un vendeur à relancer** (M145-6, 1, 2 et 7) : quand des acquéreurs prêts
    correspondent à son bien — la règle de la boucle (M133, au prix de la M133 ; acquéreurs écartés
    exclus, M139) — :
    - relance due : elle porte l'argument « N acquéreurs prêts correspondent à votre bien » et passe
      en tête du bloc Vendeurs ;
    - relance pas encore due : la date du conseiller ne change pas (M105), mais « Aujourd'hui » montre
      tout de suite « Relancer plus tôt ? 1 acquéreur prêt correspond au bien des Lambert-Duval ·
      relance prévue le 20/11 », « Relancer » et le lien « Garder la date », qui cache la ligne
      jusqu'à la date prévue, pour toute l'agence : le moment du geste et le nombre d'acquéreurs prêts
      à cet instant sont gardés sur la conclusion (deux colonnes nullables, écrites par le serveur
      seul) ; un acquéreur prêt de plus, ou une nouvelle relance, fait revenir la ligne (décisions
      du 07/11) ;
    - le message de relance gagne une phrase anonyme et modifiable : « Depuis notre rendez-vous, un
      acquéreur prêt à visiter cherche un bien comme le vôtre » (« 3 acquéreurs prêts à visiter
      cherchent … ») ; jamais un nom, un budget ni une commune d'acquéreur (décision du 07/11) ;
    - son dossier, dans « Acquéreurs de l'agence pour ce bien » : « 1 acquéreur prêt correspond à ce
      bien », « Rentrez le mandat pour pouvoir le proposer », et le bouton « Relancer … » (la relance de
      la M130 A, appel compris) à la place de l'ancien « Proposer ce bien aux acquéreurs » ; la carte
      du Suivi le dit aussi.
17. **Démarcher un bien que veulent des acquéreurs prêts** (M145-6, 3 et 4) : un concurrent d'un
    mandat signé (carte de Prospection « Prêt à envoyer ») ou un bien démarché, en mandat simple ou
    chez un particulier, auquel des acquéreurs prêts correspondent (même calcul) : une ligne
    « Démarcher N biens : des acquéreurs prêts y correspondent » dans le bloc Prospection, chaque bien
    avec son nombre et « Préparer le courrier » (version propriétaire, M84 ; courrier au propriétaire
    d'une recherche, M120), jamais un appel ; la ligne « Démarcher les autres concurrents » ne les
    compte plus ; la carte de Prospection porte « N acquéreurs prêts correspondent · courrier ou
    passage ». Une carte « Adresse à confirmer » qui a des acquéreurs prêts entre aussi dans la série,
    avec « Confirmer l'adresse » comme premier geste (décision du 07/11). Un concurrent en exclusivité ne déclenche rien. Un concurrent dont l'exclusivité est
    « à vérifier » ne déclenche rien dans « Aujourd'hui », mais sa carte dit « N acquéreurs prêts
    correspondent : précisez le mandat », avec les choix de la M83 (décision du 07/11). Le texte des
    courriers ne change pas : validé par le juriste (DECISIONS, 07/11).
18. **« Proposer ce bien » compte comme la tâche** (M145-6, 5) : « 4 acquéreurs prêts à visiter »,
    cochés ; ceux qui correspondent sans être prêts à part, « Correspond aussi, pas encore prêt »,
    décochés, avec ce qui leur manque (remplace M134, « tous cochés »).
19. **La carte du Suivi d'un mandat sous offre acceptée** (M145-6, 6) : « Acquéreurs · N » reste
    masqué ; « Offre acceptée · famille Keller » à sa place (un seul libellé), vers la fiche des Keller.
20. **Démo** (décision du 07/11) : M. et Mme Rossi « Prêt à visiter » (financement validé, contact il
    y a 3 jours, fiche créée à la préparation), pour que la relance des Lambert-Duval porte « 1 acquéreur prêt
    correspond à votre bien » ; les concurrents en mandat simple de M. et Mme Lopez (ven-01, ven-07,
    ven-12) portent déjà l'alerte de démarchage, sans rien changer au jeu.
21. Tests : regroupement, ordre, retrait du mercredi, pastille = lignes, « Fait aujourd'hui », menu
    sans mode, alertes (relance due ou « Relancer plus tôt ? », « Garder la date », concurrent en
    mandat simple, « à vérifier » sur la carte seulement, exclusivité sans alerte, jamais
    un nom d'acquéreur dans un message au vendeur ni dans un courrier), compte de « Proposer ce
    bien » (services purs et rendus) ; e2e démo : arrivée sur Aujourd'hui, 8 lignes le jour du relevé,
    une série ouverte, une tâche faite qui passe en bas, l'argument de la relance des Lambert-Duval,
    la série « Démarcher 3 biens », le Suivi sans bloc, le menu.

## Décisions à respecter

M59, M97, M98, M118 (remplacée : l'interrupteur), M125, M130 A (remplacée : bloc et pastille du
Suivi), M83 (exclusivité, « Vendu par »), M84 (version du courrier), M96 (le message de relance),
M120, M132, M133, M134 (corrigée par la A ; « tous cochés » remplacé), M135, M138, M139 (précisée :
le point de la semaine), M143, M145 A.

## Hors périmètre

I4, I5, I9, I10, C3, C4, C9 (M146) ; la case « Accepte d'être recontacté » et une visite demandée
sur une annonce du marché (`docs/IDEES.md`, 07/11) ; la veille (M136), inchangée.

## Essai

Interne (e2e sur l'essai), A puis B ; Jean-Guy : un test court en production après chaque `/valide`.
