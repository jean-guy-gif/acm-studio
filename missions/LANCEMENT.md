# Lancement — livraison du produit le vendredi 27 novembre 2026 au soir

Prévue le jeudi 26/11 au soir ; repoussée au vendredi 27/11 au soir par Jean-Guy le 25/11 au soir,
avec la refonte de l'expérience (dernière section de cette page).

La liste de Jean-Guy (23/11 au soir). On s'en tient à elle : tout le reste va dans
`missions/PLUS_TARD.md`. Tout se fait et se vérifie sur le compte normal de Jean-Guy ; la démo est
mise de côté. Les textes juridiques et de confidentialité sont validés : on n'y revient pas.

Pour chaque écran nouveau : une seule maquette dans `missions/maquettes/`, et le code part sans
attendre, sauf si Jean-Guy dit non dans l'heure.

L'état de chaque mission se tient ici : à faire, en cours, fait (avec la date).

## Dès le lundi 23/11 au soir

- **Mission 4** (voir mardi).
- **Un état des lieux d'une page** du côté acquéreur et de l'IA : ce qui existe déjà pour les missions
  2, 3, 6, 7, 8, 9 et 10, et ce qui manque (`missions/ETAT_DES_LIEUX_ACQUEREUR_IA.md`). — **fait**

## Mardi 24/11

1. **Live : le vendeur n'a aucune idée des prix.** Un bouton au début du Live ouvre le dossier avec
   le prix de chaque bien, et « Voir l'annonce » en un clic ramène à l'annonce. Partir de ce que
   « Présentation directe » fait déjà. — **fait le 24/11** : sur « Votre valeur perçue », « Voir les
   biens et leurs prix » (captures `maquettes/L1-live-*.png`)
2. **Acquéreur : après trois visites, l'outil ne suppose plus une offre.** Sans offre formulée,
   l'acquéreur reste en recherche et le conseiller continue à lui envoyer des biens. — **fait le
   24/11** (capture `maquettes/L2-fiche-acquereur-sans-offre.png`)
3. **Acquéreur : un bien déjà envoyé, visité ou refusé n'est jamais reproposé.** — **fait le
   24/11** : biens idéaux, « Proposer ce bien », lien de proposition (captures
   `maquettes/L3-biens-ideaux-non-reproposes.png`, `L3-selection-actuelle-refuse.png`,
   `L3-proposer-deja-visite.png`) ; **repris le 25/11** sur la demande de Jean-Guy : un bien déjà
   vu est reconnu aussi sous une autre annonce, rien n'est coché après une présentation (0/3),
   « Déjà vus avec lui » à part (maquette `maquettes/L3b-deja-vus-avec-lui.png`) ; **vérifié le
   25/11 sur le compte réel**, recherche du marché comprise : la maison présentée le 13/11 n'y
   est plus (capture `maquettes/L3b-compte-reel-biens-ideaux.png`)
4. **Portails : la preuve, site par site, que l'annonce s'aspire comme prévu**, et la correction de
   ceux qui échouent. — **fait le 24/11** : les cinq sites se lisent ; Figaro réparé, la ville de
   SeLoger et de Green Acres corrigée (preuve : `missions/L4-portails-preuve.md`)
5. **Plus aucun coût en euros devant le conseiller** : ni pour chercher des concurrents, ni pour une
   sélection d'acquéreur, ni pour le suivi et la veille, ni pour l'IA. Les prix des biens restent
   affichés. Les coûts et les plafonds restent visibles pour l'opérateur seul. Plafond atteint : un
   message sans montant, par exemple « Votre forfait du mois est atteint : contactez votre agence. »
   Un test parcourt les écrans du conseiller et refuse tout montant lié à l'usage. Les forfaits en
   jetons vont dans `missions/PLUS_TARD.md`. — **fait le 24/11** : une recherche « compte dans le
   forfait du mois », le manager lit une part du forfait, les montants restent sur `/erreurs`

## Mercredi 25/11

6. **Suivi de l'acquéreur** : un seul endroit par acquéreur avec les biens envoyés, refusés et
   pourquoi, visités avec leur compte rendu, pour faire le point avec lui. — **fait le 24/11** :
   « Son suivi » sur la fiche acquéreur (maquette `maquettes/L6-suivi-de-l-acquereur.png`, capture
   `L6-son-suivi-rossi.png`)
7. **Compte rendu de visite saisi en trente secondes** après la visite. — **fait le 24/11** : son
   avis et la suite en grands boutons, le reste replié, et une tâche « Saisir le compte rendu » le
   jour de la visite
8. **IA, la lecture des notes de découverte de l'acquéreur** : ouverte et vérifiée sur le compte
   normal de Jean-Guy, avec un plafond par agence. Lui dire en une ligne ce qu'il doit faire
   lui-même pour l'ouvrir à une agence. — **vérifiée le 24/11** sur le compte de Jean-Guy (12 champs
   proposés, 0,02 €, aucune fiche créée). Pour l'ouvrir à une agence : en bas de `/erreurs`, sur la
   ligne de l'agence, taper un plafond « IA » supérieur à 0 € et « Enregistrer »
9. **IA, l'analyse des annonces pour classer les biens face aux critères de l'acquéreur** : les mots
   du texte, puis les photos. D'abord, en cinq lignes, ce que l'IA lit aujourd'hui dans une annonce
   et ce qu'elle ne lit pas. Le texte de toutes les annonces est lu. Pour les photos : mesurer le
   coût sur vingt annonces réelles et donner le chiffre par acquéreur ; par défaut, elles ne sont
   lues que pour les biens les mieux classés, dans la limite du plafond de l'agence. La raison du
   classement reste pour le conseiller seul. — **fait le 24/11** : le texte de toutes les annonces
   lu dans le délai ; les photos mesurées (0,17 € par recherche et par acquéreur), codées, et
   éteintes tant que Jean-Guy n'a pas décidé la phrase de la page de confidentialité
   (`missions/L9-mesure.md`)

## Jeudi 26/11

10. **Fiche acquéreur simplifiée** : une seule « prochaine étape », comme côté vendeur. C'est la
    mission à sacrifier si le temps manque. — **fait le 24/11** : la prochaine étape juste sous les
    étapes à toutes les largeurs, la sélection fondue dans « Son suivi », le reste replié ou en liens
11. **Parcours complet sur le compte de Jean-Guy**, vendeur puis acquéreur, avec captures, et
    correction des défauts vus. — **fait le 25/11** : le parcours joué en entier sur un dossier et un
    acquéreur TEST, quatre défauts corrigés ; les deux restes du test retirés le 25/11 sur l'accord
    de Jean-Guy (dossier archivé, visite annulée) ; Belles Demeures dite avant toute lecture, et
    « L'annonce semble supprimée » qui ne se dit plus quand l'extension n'a pas lu ; les deux
    recherches du forfait jouées le 25/11 sur le compte réel (biens idéaux, concurrents)
12. **Sauvegardes quotidiennes vérifiées sur l'offre Pro, journal d'erreurs vide, suite de nuit
    verte.** — **fait le 25/11** : Supabase sauvegarde la base chaque nuit (sans les fichiers du
    stockage, que notre sauvegarde prend : faite et vérifiée par restauration le 25/11) ; journal
    vide depuis le 24/11 à 16 h 33 ; suite complète 37 sur 37
13. **Livraison.** — **prête le 25/11**, à dire « livrée » après le dernier contrôle du vendredi
    27/11 au soir (le mot de Jean-Guy : « livraison ») : le guide de prise en main pour les conseillers (`public/guide/guide-de-prise-en-main.pdf`,
    deux pages, validé par Jean-Guy le 25/11 et ouvert depuis « Aide »), la feuille de livraison (`missions/LIVRAISON.md` : les contrôles, ce qui reste
    éteint, ouvrir une agence, ce qui attend Jean-Guy)
    - Le guide, à la ligne des portails (Jean-Guy, 25/11) : Belles Demeures ne s'aspire pas (son
      site interdit la lecture de ses annonces) : le bien se saisit à la main. — **fait**, et un
      test garde la ligne alignée sur le code

## Ajouté le 25/11 par Jean-Guy

- **Le lien « Guide de prise en main » dans « Aide »**, vers le PDF. — **fait le 25/11**, vu dans
  un vrai navigateur en production ; la spec de « Aide » le prouve depuis le 25/11 au soir, sur la
  base d'essai.
- **Mission 10 bis : la fiche acquéreur, repliée** (affichage seulement : trois blocs à
  l'ouverture, le reste sous « Tout le dossier »). — **fait le 25/11 au soir** : maquette validée
  par Jean-Guy (`maquettes/M10bis-fiche-acquereur-repliee.png`), codée et relue, ses dix specs
  vertes sur la base d'essai, **en production à 20 h 10**. Mesurée sur la fiche de M. et Mme
  Mercier : 624 px pour un écran de 771, 2 boutons (`maquettes/M10bis-production-fiche-mercier.png`).
- **La base** : une base d'essai séparée et la taille au-dessus. — **fait le 25/11 au soir**, sur
  les gestes de Jean-Guy (`missions/BASE_JEUDI_MATIN.md`) : moins de deux minutes d'arrêt, la
  production intacte, l'essai et les tests sur leur propre base.

## La refonte de l'expérience (mission de Jean-Guy, 25/11 au soir)

Acheteur puis vendeur, sur téléphone, tablette et ordinateur. Niveau Sensible. Les maquettes :
`missions/maquettes/REFONTE-1` à `REFONTE-8` (.html), référence exacte des tailles, des couleurs,
des textes et des dispositions ; les photos sont celles de `public/demo/photos`.

Ses six règles :

1. « À faire aujourd'hui » en tête de Acquéreurs et de Vendeurs : une carte par personne, avec ce
   qu'il y a à faire et son bouton.
2. Un seul bouton plein par écran ; les autres sont en contour.
3. Une « prochaine étape » par fiche et par dossier, puis trois chiffres, puis « Tout le dossier ».
4. Acquéreur : un bien à la fois, « Écarter » ou « Proposer », avec « Pourquoi celui-ci pour eux »
   dans ses mots. Jamais de pourcentage : « 8 critères sur 8 ».
5. Nouvel acquéreur : une phrase écrite ou dictée, puis « Ce que j'ai compris » en pastilles à
   corriger, en réutilisant la lecture des notes de la mission 8.
6. Les mêmes blocs aux trois tailles : téléphone = une colonne et menu en bas ; tablette = menu en
   icônes, liste, détail ; ordinateur = menu complet, liste, détail, sans changer de page.

Ce qu'on ne touche pas : le Live, les documents et PDF, le bon de visite, l'offre, les liens
publics, la base (aucune migration), les règles métier. C'est une nouvelle présentation des mêmes
données et des mêmes actions.

Les lots, un à la fois (durée prévue par le chef le 25/11, hors attente de Jean-Guy) :

| Lot | Contenu                                                                                           | Maquettes       | Durée prévue | État    |
| --- | ------------------------------------------------------------------------------------------------- | --------------- | ------------ | ------- |
| A   | Le socle : le menu aux trois tailles, la carte « à faire », les boutons plein et contour, les pastilles, les tuiles de chiffres | toutes          | 4 h          | en production le 26/11 au soir, sur le « oui » de Jean-Guy |
| B   | Acquéreurs : « à faire aujourd'hui » ; la fiche acquéreur repliée alignée sur le socle             | REFONTE-1, 4, 5, 6 | 2 h 30    | en production le 26/11 au soir, sur le « oui » de Jean-Guy |
| C   | Un bien à la fois                                                                                  | REFONTE-3, 5, 6 | 2 h 30       | en production le 26/11 au soir, sur le « oui » de Jean-Guy |
| D   | Nouvel acquéreur par une phrase                                                                    | REFONTE-2       | 2 h          | en production le 26/11 au soir, sur le « oui » de Jean-Guy |
| E   | Vendeurs : « à faire aujourd'hui », et le dossier avec sa prochaine étape et ses cinq étapes       | REFONTE-7, 8    | 3 h          | en production le 26/11 au soir, sur le « oui » de Jean-Guy |
| F   | Les pages Visites et le compte rendu de visite, alignés sur le socle                               | —               | 1 h 30       | sur l'essai depuis le 27/11 à 9 h 15, relu et corrigé à 10 h : attend le « oui » |

Pour chaque lot : sur l'essai, ses specs vertes, trois captures (téléphone, tablette, ordinateur)
dans `missions/maquettes/`, puis l'adresse à ouvrir sur l'essai. Rien ne va sur `main` sans le
« oui » de Jean-Guy, lot par lot. Une spec ne change que pour un libellé ou un emplacement, jamais
pour ce qu'elle prouve ; les specs modifiées lui sont listées.

Le calendrier (son message du 25/11 au soir) : jeudi 26/11, les lots A à E, un par un ; vendredi
27/11 au matin, le lot F, puis ses remarques de jeudi ; vendredi à 14 h, gel — plus aucune
nouveauté, la suite complète sur l'essai, le parcours complet joué aux trois tailles sur le compte
normal, le journal d'erreurs ; vendredi soir, son mot « livraison ».

Ce que montrent les maquettes, relevé le 25/11 : le menu devient Aujourd'hui · Vendeurs ·
Acquéreurs · Visites (en bas sur téléphone ; en icônes, avec Aide, sur tablette ; complet, avec
Prospection et Aide, sur ordinateur) ; une colonne « à faire aujourd'hui » de 420 px (340 sur
tablette) et le détail à droite ; la carte « à faire » (pastille aux initiales, nom, ce qu'il y a
à faire, son bouton) ; « Tous mes acquéreurs · 12 » et « Tous mes vendeurs · 18 » en ligne ;
« Bien 1 sur 4 · 0 retenu sur 3 » ; le dossier vendeur avec sa prochaine étape, trois tuiles
(concurrents retenus, prix à revérifier, acquéreurs prêts à visiter), ses cinq étapes (le bien,
les concurrents, le prix, le rendez-vous, conclure) et « Tout le dossier ».

Questions posées à Jean-Guy le 25/11 au soir, chacune avec la réponse par défaut du chef (il
avance avec elle, Jean-Guy corrige) :

1. Préparation, Live et Suivi n'ont plus d'entrée au menu : ils restent des pages, ouvertes depuis
   « Tous mes vendeurs » (trois onglets : en préparation, prêts pour le Live, conclus).
2. Le compte (Mon profil, Administration, Ma démo, Sombre / Clair, Déconnexion) n'est sur aucune
   maquette : il garde sa carte en bas du menu sur ordinateur, devient une icône en bas du menu sur
   tablette et un rond aux initiales en haut d'« Aujourd'hui » sur téléphone ; la même feuille
   porte Prospection et Aide là où le menu ne les montre pas.
3. « Aujourd'hui » garde son contenu ; il prend seulement le socle.
4. « Proposer », dans « un bien à la fois », retient le bien dans la sélection (trois au plus) :
   rien ne part vers l'acquéreur avant « Envoyer la sélection ». « Écarter » garde sa raison en un
   geste.
5. « Nouvel acquéreur par une phrase » passe par la lecture des notes, ouverte agence par agence
   (un coût) : là où elle est fermée, « Nouvel acquéreur » reste la saisie rapide d'aujourd'hui.
6. « Dicter » : la dictée de l'appareil (le micro du clavier), rien ne passe par ACM, la page de
   confidentialité ne change pas. La reconnaissance vocale du navigateur enverrait la voix à
   Google ou à Apple : elle demanderait la juriste.
7. Ce que les maquettes montrent et que la base n'a pas (la date et l'heure du rendez-vous) ne
   s'affiche pas : aucune migration.
8. Les couleurs et la police restent celles de la charte de chaque agence : le bleu nuit et Nunito
   Sans des maquettes sont ceux de l'agence de Jean-Guy ; une autre agence garde les siens (par
   défaut, le bleu de Start Academy, Montserrat et Rajdhani). Les gris, les fonds et les arrondis
   sont ceux des maquettes. Le mode sombre continue de marcher.
9. Pour regarder l'essai, Jean-Guy se connecte avec le compte de démonstration des tests
   (`E2E_DEMO_EMAIL`, dans `.env.e2e.local`) : son propre compte n'existe pas dans la base d'essai.
10. Le guide de prise en main nomme le menu d'aujourd'hui : il suit le nouveau menu avant le gel.

### Lot A — le socle (en production le 26/11 au soir)

À ouvrir sur l'essai, avec le compte de démonstration des tests (question 9) :
`https://acm-studio-essai.vercel.app/aujourdhui` (le menu aux trois tailles ; sur téléphone, le
rond du compte à droite du titre), `/builder` (les trois onglets de « Vendeurs ») et `/socle` (les
blocs : la carte « à faire », les boutons, les pastilles, les tuiles ; ouvert sur l'essai
seulement, retiré au lot F). Les captures : `missions/maquettes/REFONTE-A-telephone.png`,
`-tablette.png`, `-ordinateur.png` (l'essai tel qu'il est, à la charte de l'agence de
démonstration) ; les mêmes en `…-charte-start-academy.png` (une simulation : les couleurs et la
police de l'agence de Jean-Guy, lues en production, posées sur l'essai — ce que verra son compte) ;
`REFONTE-A-compte-telephone.png` (la feuille du compte sur téléphone).

Ce qui change, en comportement :

- **Le menu** : Aujourd'hui · Vendeurs · Acquéreurs · Visites, le même aux trois tailles — en bas
  sur téléphone (72 px), en colonne d'icônes sur tablette (88 px, avec Aide en bas), complet sur
  ordinateur (232 px, avec Prospection et Aide, le logo de l'agence en tête). La barre du haut et
  ☰ disparaissent. La pastille d'« Aujourd'hui » reste, sur l'icône. Sur téléphone, le menu du bas
  n'est que sur les pages principales ; une page intérieure (une fiche, un dossier, « Nouvel
  acquéreur ») n'a que son lien de retour, comme sur les maquettes 2, 3 et 4.
- **Vendeurs** n'a qu'une entrée : Préparation, Live et Suivi restent des pages, jointes par trois
  onglets en tête de chacune de leurs listes (la scène du Live n'est pas touchée).
- **Le compte** (Mon profil, Administration, Ma démo, Erreurs, Sombre / Clair, Déconnexion) : sa
  carte en bas du menu sur ordinateur ; un rond à ses initiales en bas de la colonne sur tablette ;
  un rond en haut à droite d'« Aujourd'hui » sur téléphone. La même feuille porte Prospection sous
  1280 px et Aide sous 768 px, et dit qui est connecté là où le bouton n'est qu'un rond.
- **Les blocs du socle** (`src/components/socle`, jetons `socle…` de `styles.ts`) : la carte « à
  faire », la ligne d'une personne, « Tous mes … › », les boutons plein et contour (48 px) et les
  grands boutons d'une décision (54 à 58 px), les pastilles (34 px) et celles à toucher (44 px),
  les tuiles de chiffres. Aucun écran ne s'en sert encore, sauf l'aperçu : les lots B à F.
- Le fond des pages prend le gris des maquettes ; les barres fixées en bas d'un écran (fiche du
  bien, lecture des notes, « Inscrit : plus aucun courrier… ») se posent au-dessus du menu du
  téléphone.

Tranché seul par le chef, à corriger par Jean-Guy s'il le veut :

- Le rond aux initiales prend la teinte de **ce qu'il y a à faire**, comme sur les maquettes
  (orange : à regarder avant d'agir ; vert : une bonne nouvelle ; sinon la couleur de l'agence),
  jamais celle du nom. Chaque écran dira la teinte de chaque sorte de tâche (lots B et E).
- Les initiales : la fiche n'a pas de prénom, le rond prend la première lettre du premier mot et
  celle du dernier (« Mme Rossi » → MR, « M. Fontaine » → MF) ; les maquettes écrivent LR, PF.
- Sous 1280 px, ni logo ni nom d'agence au menu (comme sur les maquettes) : la feuille du compte
  les dit.
- Les titres sont en gras 700 : les polices de charte ne déclarent pas le 800 des maquettes
  (`missions/PLUS_TARD.md`).

Les specs modifiées (un libellé ou un emplacement ; ce qu'elles prouvent ne change pas) :

| Spec                    | Ce qui a changé                                                                                           |
| ----------------------- | --------------------------------------------------------------------------------------------------------- |
| `support.ts`            | le compte s'ouvre par sa carte ou son rond (plus de ☰) ; « Aide » et « Prospection » se prennent au menu quand il les montre |
| `parcours.spec.ts`      | « Vendeurs » à la place de « Suivi » et de « Live » au menu ; 6 entrées au lieu de 7 ; sur téléphone, le menu du bas à la place de ☰ (sur une page principale ; sur « Nouvel acquéreur », son lien de retour). **Ajouté** : Préparation, Live et Suivi joints par les onglets ; les flèches sautent ce que la feuille cache ; la feuille du compte sur téléphone, et « Prospection » par elle |
| `bienvenue.spec.ts`     | « Vendeurs » à la place de « Préparation » ; le titre d'une étape                                         |
| `demo.spec.ts`          | 6 entrées au lieu de 7                                                                                    |
| `live-tablette.spec.ts` | 5 entrées au lieu de 7. **Ajouté** : la feuille du compte passe au-dessus de la page, sous une couche plein écran |

Deux preuves d'avant n'ont plus d'objet (☰ visible, « un lien choisi replie le menu ») : le menu
du téléphone ne se replie plus. « Live et Suivi au menu » est remplacé par les onglets.

Relecteur, une passe : un bloquant (sur tablette, la feuille du compte passait sous les photos et
la barre « Enregistrer »), levé — la colonne passe au-dessus de la page pendant que la feuille est
ouverte, prouvé par une spec rouge avant la correction et verte après ; ses « à corriger » faits
(la teinte du rond, le message d'opposition sur le menu du téléphone, l'aperçu fermé par liste
d'autorisation, les preuves des onglets et de la feuille). Tests : barrières vertes (4 386
tests) ; la suite complète sur l'essai, le 25/11 de 23 h 31 à 0 h 07 : 37 parcours sur 37, sans
aléa ; puis, après la correction du menu du téléphone (les pages intérieures), les quatre specs
concernées, 7 parcours, vertes — le parcours complet au second passage, le premier coupé par le
réseau à l'export du comparatif (un aléa).

Avant la première mise en production de la refonte, la version à laquelle revenir en cas de
défaut (règle du 23/11) : la production sert `6bf564c6`, le déploiement Vercel du 25/11 à 21 h 30
(`5NZwEMe1H4VBrVJXGBUJfXADXGpV`, prêt, proposé au retour arrière) ; le code de l'application y est
celui de la mission 10 bis. Le message de Jean-Guy s'arrêtait à « Avant la première mise en
production, tu notes » : la fin de sa phrase lui est demandée.

À écrire dans `docs/DECISIONS.md` à la mise en production du lot (son « oui ») : le menu de quatre
entrées aux trois tailles remplace M145 B (les trois groupes), M149 (leurs titres) et M132 (la
barre du haut et ☰) ; les trois onglets de « Vendeurs » ; le compte aux trois tailles (précise
M125) ; la teinte qui suit la tâche.

### Lot B — Acquéreurs : « à faire aujourd'hui » (en production le 26/11 au soir)

À ouvrir sur l'essai : `https://acm-studio-essai.vercel.app/acquereurs` (« à faire aujourd'hui » ;
sur ordinateur et tablette, toucher une autre personne dans la liste), puis « Ouvrir sa fiche » (la
fiche alignée sur le socle) et « Tous mes acquéreurs » (la liste d'avant). Les captures :
`missions/maquettes/REFONTE-B-telephone.png`, `-tablette.png`, `-ordinateur.png` (l'essai tel
qu'il est), les mêmes en `…-charte-start-academy.png` (la simulation aux couleurs de l'agence de
Jean-Guy), `REFONTE-B-plusieurs-taches-ordinateur.png` (une personne qui a trois choses à faire),
et `REFONTE-B-fiche-telephone.png`, `-fiche-ordinateur.png`. Les captures sont celles du code
relu, sur une démo remise à zéro.

Ce qui change, en comportement :

- **Acquéreurs s'ouvre sur « à faire aujourd'hui »** : une carte par personne, avec ce qu'il y a
  à faire et son bouton. Ce sont les tâches de la page « Aujourd'hui » (« Mes tâches » : mêmes
  règles, mêmes gestes), rangées par acquéreur. Aucune règle nouvelle. La page « Aujourd'hui » ne
  change pas.
- **Une personne qui a plusieurs choses à faire les a toutes** : la plus utile fait sa carte ; les
  autres suivent sous « Aussi aujourd'hui », chacune avec son geste, en contour — dans sa carte
  sur téléphone, dans son détail sur tablette et ordinateur ; dans la liste, sa ligne dit « + 2
  autres choses à faire » (et « dont 1 en retard »). « 13 choses à faire aujourd'hui » compte
  toutes les tâches, pas les personnes.
- **Sur téléphone**, une colonne de cartes, le bouton sous chaque personne ; le nom mène à sa
  fiche. **Sur tablette et ordinateur**, la liste à gauche (340 et 420 px) et, à droite, la
  personne choisie : son nom, sa recherche en une phrase, ce qu'il y a à faire et son geste,
  « Ouvrir sa fiche » — sans changer de page.
- **Un seul bouton plein**, geste ouvert compris : celui de la première carte (sur téléphone),
  celui de la personne choisie (ailleurs). Pour la réponse du vendeur à une offre, « Prévenir
  l'acquéreur » est le bouton de la carte, ses trois autres gestes dessous. Dans une carte qui ne
  mène pas l'écran, le bouton qui conclut un geste ouvert (« J'ai relancé », « Envoyé ») reste en
  contour.
- **Choisir une personne** (tablette, ordinateur) refait son détail à neuf : un geste ouvert pour
  l'une ne suit jamais la suivante. Le toucher se voit tout de suite (le contour de la ligne), le
  temps que la page réponde. Un geste ouvert (le message d'une relance) prend la largeur de la
  carte. Sur une tablette en portrait, « Ouvrir sa fiche » passe sous le nom.
- **La liste entière** des fiches (ses vues, ses filtres, sa recherche, « Ce mois-ci ») est
  derrière « Tous mes acquéreurs · N » ; elle porte « ← À faire aujourd'hui ». Un lien d'avant
  (`?vue=agence`, `?q=`, `?etat=`, une fiche archivée) y mène toujours, et la liste garde son
  adresse : un filtre retiré ou une recherche vidée, puis la page actualisée, c'est toujours la
  liste. La tuile « N acquéreurs prêts » d'« Aujourd'hui » y mène, comme avant.
- **La fiche** : « Prochaine étape » devient la carte du socle (blanche, son grand bouton plein,
  le second geste en lien) ; « Son suivi » montre ses trois chiffres en tuiles — visités, envoyés
  en attente, refusés —, qui s'ouvrent d'un toucher comme les lignes d'avant : la tuile ouverte
  prend la largeur, les deux autres restent côte à côte au-dessus ; « Visites à organiser »,
  quand il y en a, a sa ligne entière sous les trois, dans la page comme à l'écran. Rien d'autre
  ne bouge sur la fiche.
- **Le message préparé** d'une relance ou d'une offre passe à la ligne : son lien, trop long,
  faisait défiler la page de côté sur téléphone (trouvé par la spec, geste ouvert). Cela vaut
  aussi sur « Aujourd'hui », où le même message s'affiche.

Tranché seul par le chef, à corriger par Jean-Guy s'il le veut :

- La phrase d'une carte ne redit ni le nom ni un pronom (« 4 nouveaux biens trouvés par la
  veille », « Visite demandée : la maison de Mougins », « Aucun échange depuis 34 jours ») : un
  nom de fiche ne dit ni le genre ni le nombre ; la maquette écrivait « pour eux », « Veut
  visiter ».
- Les gestes sont ceux d'aujourd'hui : « Organiser la visite », « Voir sa fiche », « Relancer »…
  La maquette écrivait « Proposer un créneau », « L'appeler » : ce seraient d'autres gestes.
- « Financement à valider avant de visiter », sur la maquette, n'est pas une tâche d'aujourd'hui :
  ce serait une règle nouvelle. Elle n'est pas ajoutée.
- Au lot B, le détail de droite montre la tâche et son geste ; « un bien à la fois » (maquettes 5
  et 6) y vient au lot C.
- Sur la fiche, le lien de retour garde « ← Acquéreurs », comme toutes les pages ; les titres
  de la fiche ne sont pas refaits.
- **À trancher par Jean-Guy — les cartes suivent « Mes tâches »**, la règle d'« Aujourd'hui »
  (M145 B) : une visite demandée sur un mandat, ou un bien à proposer, est la tâche du conseiller
  du MANDAT. Dans une agence à plusieurs conseillers, celui qui tient le mandat voit donc une
  carte au nom de l'acquéreur d'un collègue, et le collègue n'a pas de carte pour son propre
  acquéreur. Par défaut, rien ne change : c'est la règle d'aujourd'hui, et la changer serait une
  règle nouvelle. L'autre choix : sur Acquéreurs, montrer les tâches de MES acquéreurs, quel que
  soit le mandat.
- « Visites à organiser » vient sous les trois chiffres ; dans la fiche repliée d'avant, elle
  était la deuxième ligne (Lancement 6). L'ordre de la page suit celui de l'écran.
- Choisir une personne relit ses tâches au serveur : 1,3 s mesurée sur l'essai, dont la base est
  la plus petite. Le contour de la ligne répond tout de suite ; aller plus vite se décide avec le
  lot C, qui met « un bien à la fois » dans ce détail (`missions/PLUS_TARD.md`).

Les specs modifiées (un emplacement ; ce qu'elles prouvent ne change pas) :

| Spec                                | Ce qui a changé                                                                                 |
| ----------------------------------- | ----------------------------------------------------------------------------------------------- |
| `demo.spec.ts` (2 endroits)         | la liste des acquéreurs s'ouvre par `/acquereurs?tous=1` (avant : `/acquereurs`)                  |
| `parcours.spec.ts` (1)              | idem                                                                                            |
| `presentation-directe.spec.ts` (11) | idem                                                                                            |
| `langue-de-l-acquereur.spec.ts` (1) | idem                                                                                            |
| `acquereurs-a-faire.spec.ts`        | **nouvelle** : « à faire aujourd'hui » aux trois tailles et sur la tablette en portrait, la personne choisie sans changer de page et son détail neuf, le seul bouton plein (deux gestes ouverts compris), les autres tâches d'une personne, la fiche et ses trois tuiles, « Tous mes acquéreurs », son adresse gardée et son retour |

Non modifiée, mais elle passe désormais par le nouvel écran : `parcours.spec.ts` — le lien
« Acquéreurs » du menu et l'ancienne adresse `/biens-ideaux` arrivent sur « à faire aujourd'hui »
(elle attend toujours `/acquereurs`), et « Nouvel acquéreur » y est le « + » de l'en-tête, trouvé
par son nom. Ce qu'elle prouve ne change pas.

Le relecteur, une passe : un bloquant, levé — sur tablette et ordinateur, le geste ouvert pour une
personne (son message préparé, « J'ai relancé ») restait affiché sous le nom de la suivante — ;
ses cinq « à corriger » faits (deux boutons pleins sur téléphone, la tuile d'« Aujourd'hui », la
liste qui perdait son adresse, les preuves que les tâches portent leurs acquéreurs, une tâche due
cachée derrière la première) ; ses remarques prises ou notées dans `missions/PLUS_TARD.md`.

Tests : barrières vertes (4 439 tests). Sur l'essai, le 26/11 : d'abord 24 parcours sur 24 (0 h 45
à 1 h 18) ; puis, après la relecture (2 h 03 à 2 h 47), la spec du lot et les six autres
concernées, 14 parcours sur 14 (`acquereurs-a-faire`, `suivi-de-l-acquereur`, `fiche-complete`,
`hors-mandat`, `presentation-directe`, `demo`, `parcours`). La spec du lot a trouvé un défaut
d'écran (le lien du message qui faisait défiler le téléphone de côté), corrigé, et une attente
fausse de la spec elle-même (écrite sur une démo déjà utilisée). Hors du lot : « Le Live sans
trou », rouge deux fois de suite sur la 4G rapide (même étape : après « Valider », l'écran suivant
n'arrivait pas en 60 s), vert au troisième passage sur les deux réseaux ; les lots A et B ne
touchent pas le Live (aucun fichier), le journal d'erreurs de l'essai est vide.

À écrire dans `docs/DECISIONS.md` à la mise en production du lot : « à faire aujourd'hui » en tête
d'Acquéreurs, une carte par personne ; la liste derrière « Tous mes acquéreurs » (précise M117,
M146 B) ; le détail à droite sur tablette et ordinateur ; la carte « Prochaine étape » et les
trois tuiles de la fiche (précise la Mission 10 bis et le Lancement 10, « bloc plein ») ; une
personne a toutes ses tâches du jour, la première en carte, les autres sous « Aussi aujourd'hui » ;
un seul bouton plein, geste ouvert compris ; « Visites à organiser » sous les trois chiffres
(remplace l'ordre du Lancement 6) ; le message préparé passe à la ligne.

### Lot C — un bien à la fois (en production le 26/11 au soir)

À ouvrir sur l'essai : `https://acm-studio-essai.vercel.app/acquereurs`, puis la famille Keller
(« 2 nouveaux biens trouvés par la veille ») : sur ordinateur et tablette, le bien s'affiche à
droite ; sur téléphone, « Voir les biens » ouvre la page. La démo de l'essai est laissée dans cet
état (la veille des Keller réveillée, une place libre dans leur sélection) : une démo remise à
zéro les montre « Sous offre », sans bien à voir. Les captures :
`missions/maquettes/REFONTE-C-telephone.png`, `-tablette.png`, `-ordinateur.png`, les mêmes en
`…-charte-start-academy.png`, et deux états sur ordinateur : `REFONTE-C-ecarter-ordinateur.png`
(les raisons d'« Écarter ») et `REFONTE-C-a-enregistrer-ordinateur.png` (un bien proposé, pas
encore enregistré).

Ce qui change, en comportement :

- **Les nouveaux biens d'un acquéreur se voient un par un** (maquettes REFONTE-3, 5 et 6) : sa
  photo et « 10 critères sur 10 », son prix et la pastille du budget (« 230 000 € sous le
  budget », verte ; au-dessus, orange, jamais rouge), son libellé neutre, « affiché le … », puis
  « Pourquoi celui-ci pour eux » en pastilles, et deux gestes : « Écarter » ou « Proposer ».
  Jamais un pourcentage.
- **La tâche dit « 2 nouveaux biens », le parcours dit « Bien 1 sur 2 »** : depuis la tâche de la
  veille (le détail sur tablette et ordinateur, « Voir les biens » sur téléphone), on voit ces
  biens-là, et eux seuls, comme sur les maquettes (« 4 nouveaux biens » → « Bien 1 sur 4 »).
- **« Pourquoi celui-ci pour eux », dans ses mots** : ses indispensables (★) satisfaits d'abord,
  en orange (« Piscine », « Mouans-Sartoux ») ; ce que l'annonce dit de ce qui compte pour eux,
  en vert (« « au calme » dans l'annonce » — le critère, jamais la citation) ; puis ses autres
  souhaits satisfaits (« Extérieur », « 2 pièces de plus », « Pas de travaux annoncés »). Ni le
  type ni le budget : le libellé et la pastille du prix les disent déjà. Ce qui est à savoir (un
  écart, « Extérieur : à vérifier ») reste dit dessous : « À savoir : … ».
- **« Proposer » retient le bien dans la sélection** (trois au plus) : c'est le « Retenir » des
  biens idéaux, rien ne part vers l'acquéreur. **Dès le premier bien proposé**, l'écran dit
  « 2 biens dans la sélection, pas encore enregistrée » et offre « Retenir la sélection (2/3) »,
  en contour ; quitter l'écran par un lien (sa fiche, une autre personne, le menu) avant de
  l'avoir enregistrée le demande d'abord : « Quitter sans retenir la sélection ? », « Rester » ou
  « Quitter ». Rien de proposé ne se perd sans le dire.
- **« Écarter » demande sa raison**, en un toucher — c'est « Écarter pour lui » : le bien ne lui
  sera plus proposé, veille comprise. Les raisons s'ouvrent au-dessus des deux gestes ;
  « Garder », à la place exacte d'« Écarter », revient au bien. « Annuler », juste après, ramène
  le bien à l'écran.
- **Un second toucher parti trop vite ne décide de rien** : pendant un court instant après
  l'arrivée d'un bien (0,4 s), les gestes n'entendent rien — deux touchers de suite sur
  « Proposer » ne retiennent qu'un bien, deux sur « Écarter » n'écartent rien ; une flèche du
  clavier tenue enfoncée non plus.
- **Sans changer de page**, sur tablette et ordinateur : le détail d'Acquéreurs montre les biens de
  la personne dont la première chose à faire est « N nouveaux biens trouvés par la veille », et
  l'adresse la tient sur ses biens (`?personne=…&biens=1`) — quand le dernier bien est écarté, la
  tâche quitte la liste, le détail reste sous son nom, avec « Annuler » et la fin du parcours.
  Tous les biens vus : « Retenir la sélection », puis, sur place, « Présenter » et « Dossier
  acquéreur et lien ». Sur téléphone, « Voir les biens » ouvre la page
  (`…/biens-ideaux?un=veille`), sans menu, avec son retour vers la fiche.
- **Ce sont les biens idéaux** : les mêmes biens, la même sélection, les mêmes règles. La page des
  biens idéaux garde sa liste, à son adresse ; elle gagne « Les voir un par un · N » — tous ses
  biens ouverts, un par un : ce que la veille a trouvé, ce que l'agence a déjà, le marché s'il a
  été cherché —, et « un bien à la fois » y ramène par « Toute la liste et le marché ».
- **Sélection déjà complète** (trois biens) : chaque bien se voit quand même ; « Proposer » attend
  une place, l'écran dit comment la libérer (« retirez-en un dans toute la liste ») et « Passer
  ce bien » mène au suivant.
- **Au clavier**, sur ordinateur : flèche gauche pour écarter, flèche droite pour proposer, Échap
  pour garder.

Tranché seul par le chef, à corriger par Jean-Guy s'il le veut :

- « Proposer » ne fait qu'UN geste : retenir dans la sélection. La maquette n'en dit pas plus ;
  envoyer le bien tout de suite à l'acquéreur serait un autre geste (la série de « Proposer ce
  bien », pour un mandat). Le même mot nomme donc deux gestes voisins (ici, et l'envoi noté d'un
  mandat) : à renommer si cela gêne.
- La sélection ne s'enregistre pas à chaque « Proposer » : chaque enregistrement crée une
  sélection en base (M118), et trois « Proposer » en feraient trois. D'où la ligne « pas encore
  enregistrée » et la question avant de quitter.
- Le détail d'Acquéreurs ne montre que les biens de la veille ; les biens de l'agence (mandats,
  concurrents à prospecter) et le marché se voient depuis la liste entière (« Les voir un par
  un »). Deux portes pour la même tâche : depuis Acquéreurs, « un bien à la fois » ; depuis
  « Aujourd'hui », la liste des biens idéaux, comme avant.
- La pastille dit « sous le budget », pas « sous leur budget » : un nom de fiche ne dit ni le
  genre ni le nombre (la règle du lot B) ; le titre « Pourquoi celui-ci pour eux » est celui de
  Jean-Guy, comme « Ce qui compte pour eux » ; « Écarté pour lui » garde les mots d'aujourd'hui.
- L'en-tête dit « 2 retenus sur 3 » (la maquette) ; la liste, elle, dit « 2 biens sélectionnés
  sur 3 » sur la fiche complète, comme avant.
- Le lien de la fiche complète s'appelle « Voir l'annonce complète » (la maquette) : il ouvre la
  fiche complète du bien (ses photos, ses caractéristiques, son texte), à lire seulement — c'est
  « Proposer » qui retient, un seul bouton plein ; un bien de l'agence dit « Voir la fiche du
  bien ».
- Un bien de l'agence (un mandat, un concurrent à prospecter) n'a ni sa photo ni son compte de
  critères dans « un bien à la fois » : la liste d'aujourd'hui ne les lit pas non plus ; ils sont
  sur sa fiche.
- « Passer ce bien » n'existe que sélection complète : avec de la place, un bien se propose ou
  s'écarte.
- « un bien à la fois » ne redit pas les biens déjà vus avec lui (« 3 biens ne lui sont pas
  reproposés ») : la liste entière le dit.
- Sur tablette, « Pourquoi celui-ci pour eux » n'a pas de cadre ni de titre visible (REFONTE-6) ;
  le lien de l'annonce complète y reste, que la maquette ne dessinait pas.
- La photo prend la hauteur que l'écran lui laisse (410 px au plus sur ordinateur, 290 sur
  tablette, jamais moins de 140) : sur un écran moins haut que la maquette, les deux gestes
  restent visibles — mesuré à 1024 × 700, la fenêtre de Safari sur une tablette.
- **À dire à Jean-Guy** : dans l'ordre d'« Aujourd'hui », « Un bien à proposer » (un mandat de
  l'agence) passe avant les biens de la veille. Une personne qui a les deux voit d'abord le
  mandat ; ses nouveaux biens sont sous « Aussi aujourd'hui », et leur bouton les ouvre sur
  place, à droite (sur leur page, depuis un téléphone).

Les specs modifiées : aucune. Une nouvelle, `un-bien-a-la-fois.spec.ts` (deux parcours) : dans le
détail sur ordinateur — le bien, la fiche complète, deux touchers de suite sur « Écarter » puis
sur « Proposer », « Garder » à la place d'« Écarter », le clavier, « Annuler » qui ramène le bien,
la ligne « pas encore enregistrée », la question avant de quitter (« Rester », puis « Quitter »),
« Retenir la sélection » sans attendre la fin, le dernier bien de la veille écarté (le parcours
reste), la fin sur place — ; sur tablette dans les deux sens et à 1024 × 700 ; et la page sur
téléphone (« Voir les biens », « Toute la liste », une place libérée, « Les voir un par un »,
« Proposer », la question avant de quitter, la sélection enregistrée).

Le relecteur, une passe : deux bloquants, levés — dans le détail, des biens proposés se perdaient
sans rien dire en quittant l'écran (la ligne « pas encore enregistrée », « Retenir la sélection »
dès le premier bien, la question avant de quitter) ; écarter le dernier bien de la veille faisait
disparaître le parcours sous le doigt (l'adresse tient la personne sur ses biens). Ses « à
corriger », faits : le second toucher parti trop vite ; les mandats illisibles dits dans le
parcours comme sur la liste (jamais « aucun bien » après une lecture en échec) ; on reste sur
place après « Retenir » ; « Pas de travaux annoncés » (les mots du dossier acquéreur) au lieu de
« Sans travaux à prévoir » ; les preuves qui manquaient (la carte d'un bien, le détail tenu par
l'adresse, 1024 × 700). Reste noté dans `missions/PLUS_TARD.md` : une veille illisible, que la
liste ne dit pas non plus.

Les tests : 4 496 tests unitaires, barrières vertes. Sur l'essai, après les corrections : neuf
parcours rejoués, verts au premier passage — `un-bien-a-la-fois` (deux), `acquereurs-a-faire`,
`fiche-complete`, `jamais-repropose`, `classement`, `copropriete`, `demo`, `parcours`. Avant la
relecture, dix-neuf parcours sur la première version (les mêmes, plus `langue-de-l-acquereur`,
`presentation-directe` et `suivi-de-l-acquereur`).

### Lot D — nouvel acquéreur par une phrase (en production le 26/11 au soir)

À ouvrir sur l'essai : `https://acm-studio-essai.vercel.app/acquereurs/nouveau` (ou « + » en haut
d'Acquéreurs). La phrase des Arnaud est d'avance dans l'écran : « Voir ce que j'ai compris », puis
touchez une pastille. Les captures, prises sur le code relu : `missions/maquettes/REFONTE-D-telephone.png`,
`-tablette.png`, `-ordinateur.png`, les mêmes en `…-charte-start-academy.png`, et deux états sur
téléphone : `REFONTE-D-avant-telephone.png` (avant la lecture) et
`REFONTE-D-corriger-telephone.png` (une pastille touchée).

Ce qui change, en comportement :

- **« Nouvel acquéreur » est une phrase** (maquette REFONTE-2) : « Que cherche-t-il ? », « Écrivez-le
  comme il vous l'a dit. Une phrase suffit. », une zone de texte, « Dicter » et « Photo de mes
  notes ». Le bouton plein dit « Voir ce que j'ai compris » ; la lecture faite, « Ce que j'ai
  compris » s'affiche en pastilles — « À vérifier : touchez pour corriger » — et le bouton plein
  devient « Trouver ses biens ».
- **C'est la lecture des notes de la mission 8** (M151), telle quelle : la même action, les mêmes
  gardes (aucune mention personnelle relevée, « 2 mentions personnelles n'ont pas été relevées »),
  le même forfait, le même avertissement validé avant tout envoi, mot pour mot. Rien n'est
  enregistré avant « Trouver ses biens » ; la proposition n'est gardée nulle part (« Cette
  proposition n'est pas gardée… ») et la quitter le demande d'abord (« Quitter sans créer la
  fiche ? »). Aucune ligne des notes n'est écrite en base.
- **Les pastilles** : son nom, le type, « Jusqu'à 750 000 € », « 4 pièces et plus », ses communes ;
  en vert, ce qui compte pour eux (« Au calme ») ; en orange, ses indispensables (« Indispensable :
  extérieur »). Ce qui manque pour créer la fiche tient sa place en pointillé orange (« Son
  nom ? », « Sa commune ? ») et « Trouver ses biens » attend.
- **Toucher pour corriger** : une valeur se retape (le nom, un montant — « 1,5 M » ou « 750 k » se
  lisent —, les communes), le type se choisit, un équipement se dit « Souhaité » ou
  « Indispensable » (deux au plus) ; une pastille se retire, sauf le nom (il se corrige) et
  « Commune à préciser » (elle se saisit). Un plafond retiré emporte son étoile (« une ★ sur le
  budget exige un montant », M132). La correction montre la ligne d'où elle vient (« d'après :
  « jusqu'à 750 000 € » »), jamais gardée, et « À vérifier » tant que le champ n'est pas retapé.
  Un champ retapé par le conseiller ne porte plus « À vérifier » sur la fiche ; les autres le
  portent, comme après toute lecture.
- **Les communes** : une commune lue sous un autre nom le dit (« Tourrettes-sur-Loup : lu
  « Tourettes » ») ; une commune que le service des communes n'a pas pu vérifier reste en
  pointillé, « … : à vérifier » (M104, M151).
- **« Trouver ses biens » crée la fiche** et ouvre ses biens idéaux, qui disent « Fiche
  enregistrée. » : ce que l'agence a déjà pour lui, la recherche du marché à lancer, puis « Les
  voir un par un ». Rien ne se vide pendant que la page se charge.
- **« Dicter »** met le curseur dans la phrase et dit comment faire : c'est la dictée de l'appareil
  (le micro du clavier) ; rien ne passe par l'outil.
- **« Photo de mes notes »** ouvre l'appareil photo ; « ou déposer un fichier (PDF, image) » reste.
  Lue, la photo le dit (« D'après la photo de vos notes. ») et offre « Lire ma phrase à la
  place ». La phrase accepte aussi un texte collé de plusieurs lignes : sa zone grandit avec lui.
- **La saisie rapide** (M132) reste, derrière « Saisir à la main ». Là où la lecture des notes
  n'est pas ouverte pour l'agence, « Nouvel acquéreur » est la saisie rapide, comme avant. Depuis
  le rapprochement (« Enregistrer cette recherche »), le formulaire complet, comme avant.
- **« Compléter depuis mes notes »**, sur une fiche existante, garde l'écran de vérification champ
  par champ de la M151.
- **Démo** : la phrase « M. et Mme Arnaud. Une maison de 4 pièces ou plus… » est d'avance dans
  l'écran ; sa lecture est simulée, chaque ligne d'origine prise dans la phrase. La photo des notes
  inventées garde sa lecture (ses cinq souhaits, son financement, ses deux mentions personnelles
  non relevées). Un texte qui n'est ni l'un ni l'autre ne cite plus aucune ligne : « d'après » ne
  cite jamais un mot absent de ce qui a été tapé.

Tranché seul par le chef, à corriger par Jean-Guy s'il le veut :

- Le bouton plein a deux temps : « Voir ce que j'ai compris », puis « Trouver ses biens ». La
  maquette montre l'écran une fois la phrase comprise ; une lecture compte dans le forfait, elle
  ne part donc qu'à la demande, jamais à chaque lettre tapée. La phrase retouchée ensuite, l'écran
  offre « Relire ma phrase », en contour.
- « Trouver ses biens » mène à la LISTE de ses biens idéaux, pas à « un bien à la fois » (la
  maquette menait à « un bien à la fois ») : pour un acquéreur neuf, les biens du marché demandent
  une recherche, comptée dans le forfait, que le conseiller lance lui-même ; les biens de l'agence
  n'ont ni photo ni compte de critères dans « un bien à la fois » (lot C).
- Le nom a sa pastille, que la maquette ne dessine pas : il est obligatoire pour créer la fiche,
  comme une commune (M117).
- Pour une fiche neuve, l'écran de vérification champ par champ (la planche 2 de la M151) laisse
  la place aux pastilles ; « À vérifier » se lit dans l'en-tête et sur chaque pastille touchée, et
  reste sur la fiche créée, avec « Tout est juste ». Le bouton qui écrit dit « Trouver ses biens »
  (la maquette), plus « Créer la fiche ».
- « Touchez pour corriger » (la maquette) devient « À vérifier : touchez pour corriger » : la M151
  veut que chaque champ proposé se dise « À vérifier ».
- Dans la démo, la phrase est d'avance dans l'écran ; la photo des notes inventées est dessous (la
  M151 la proposait en premier).
- Sur tablette et ordinateur, les mêmes blocs dans une colonne de 560 px (la maquette n'existe que
  pour le téléphone).
- **À dire à Jean-Guy, pour la juriste** : l'avertissement validé (« Ne photographiez pas
  d'information sur la santé… ») ne parle que de photos ; une phrase dictée part aussi à la
  lecture. Le texte n'est pas touché.

La spec modifiée : `depuis-mes-notes` (l'écran de la fiche neuve a changé). Ce qu'elle prouvait
l'est encore, à son nouvel endroit : la lecture de la photo, la fiche proposée « À vérifier » (dans
l'en-tête et sur la pastille touchée), la ligne d'origine, les mentions personnelles non relevées,
« Cette proposition n'est pas gardée », la confirmation avant de quitter (un lien, puis
« Annuler »), la fiche créée — « Fiche enregistrée. », ses communes, « À vérifier · N », « Ce qui
compte pour eux » —, aucune ligne des notes gardée en base, « Tout est juste ». S'y ajoutent : la
phrase lue, « Dicter », « Saisir à la main », un montant retapé (« À vérifier » tombe sur lui
seul), une pastille retirée, le focus rendu, les trois tailles ; et un second parcours, la fiche
créée depuis la phrase (ce qu'elle a compris est écrit, aucune ligne de la phrase n'est gardée, le
champ retapé n'est plus à vérifier).

Le relecteur, une passe (sur Opus : la limite de Fable était atteinte) : deux bloquants, levés —
une commune non vérifiée s'affichait comme reconnue (et une commune corrigée perdait « lu : … ») ;
une étoile « budget » restait sans plafond. Ses « à corriger », faits : « À vérifier » ne tombe
que sur un champ retapé, et la trace (`ai_usage`) compte les champs gardés, corrigés compris ; rien
ne se vide avant de partir ; après une photo, l'écran le dit et la phrase se lit à la place ; la
spec reprouve tout ce qu'elle prouvait ; « À vérifier » et « Fiche enregistrée. » sont de retour à
l'écran ; le focus revient à la pastille ; « 1er étage », la surface comme partout, « 1,5 M » se
lit. Restent dans `missions/PLUS_TARD.md` : le même « vider avant de partir » dans « Compléter
depuis mes notes » (M151) ; « deux ★ au plus » et « une ★ sur le budget exige un montant », tenus
par l'écran, pas par le serveur, sur le chemin de la lecture des notes (comme pour la M151).

Les tests : barrières vertes (4 558 tests unitaires, avec le lot E). Sur l'essai, après la
relecture, la spec du lot, `depuis-mes-notes` : ses deux parcours verts, sur le code du lot D seul
(`3d7f9747`) puis sur le dernier essai, qui porte aussi le lot E (`f9f929f2`). La spec avait trouvé
deux attentes fausses d'elle-même, pas de l'écran : un texte réservé aux lecteurs d'écran, lu avec
la pastille (il passe dans son nom accessible : le texte visible reste la pastille seule) ; la
fiche lue en base, dont la sortie échappe les guillemets.

### Lot E — Vendeurs : « à faire aujourd'hui » et le dossier (en production le 26/11 au soir)

À ouvrir sur l'essai, avec le compte de démonstration des tests :
`https://acm-studio-essai.vercel.app/vendeurs` (touchez M. Lefebvre, puis « Tout le dossier »).
Les captures, prises sur le code relu : `missions/maquettes/REFONTE-E-telephone.png`,
`-tablette.png`, `-ordinateur.png`, la page d'un dossier en `REFONTE-E-dossier-telephone.png` et
`-dossier-ordinateur.png`, les mêmes en `…-charte-start-academy.png`.

Ce qui change, en comportement :

- **« Vendeurs » s'ouvre sur « à faire aujourd'hui »** (maquettes REFONTE-7 et 8) : une carte par
  vendeur, ce qu'il y a à faire et son bouton — la relance d'un vendeur à relancer (« Préparer la
  relance », avec son argument quand des acquéreurs prêts correspondent), « Relancer plus tôt ? »,
  le Point marché d'un mandat signé (« Faire le point marché »). Ce sont les tâches du bloc
  « Vendeurs » d'« Aujourd'hui », dans son ordre (la relance qui porte l'argument en tête, M145 B),
  avec les mêmes gestes : la carte du Suivi s'ouvre sur la relance ou le Point marché. Un seul
  bouton plein, celui de la première carte ; « + » crée un dossier vendeur.
- **Sur tablette et ordinateur**, la liste à gauche et le vendeur choisi à droite, sans changer de
  page (`/vendeurs?vendeur=…`) : son nom, son bien, son état ; « À faire aujourd'hui » et son
  bouton ; trois chiffres (concurrents retenus, prix ou surface à vérifier, acquéreurs prêts à
  visiter) ; « Son dossier », ses cinq étapes ; « Tout le dossier », qui ouvre sa page dépliée. Sur
  téléphone, une colonne de cartes ; le nom mène au dossier.
- **« Tous mes vendeurs · 12 »** mène aux listes de Préparation, du Live et du Suivi (leurs trois
  onglets) et compte ce qu'elles montrent ensemble : les dossiers de l'agence, hors archivés et
  hors dossier d'exemple (M59, M97).
- **La page du dossier** (la Vue d'ensemble) : son nom, son bien, son état en pastille ; sa
  prochaine étape et son bouton, le seul plein (M143, la même règle) ; les trois chiffres ; « Son
  dossier », ses cinq étapes, sous les mots de la maquette — Le bien, Les concurrents, Le prix, Le
  rendez-vous (« Étude de marché » en document seul), Conclure — ; puis « Tout le dossier »,
  replié, qui garde tout ce que la page montrait sous ses étapes : le marché en un coup d'œil,
  l'Étude de marché, « Voir ou corriger l'issue », « Supprimer le dossier… », les acquéreurs de
  l'agence, les concurrents à prospecter, la réouverture du Live. Rien n'est retiré. L'adresse
  `?tout=1` l'ouvre : c'est ainsi que le Suivi mène au bloc des acquéreurs. Le lien de retour dit
  « ← Vendeurs ».
- Rien ne change à la Préparation, au Live, au Suivi ni à « Aujourd'hui ».

Tranché seul par le chef, à corriger par Jean-Guy s'il le veut :

- Un dossier en préparation n'a pas de tâche du jour : la date du rendez-vous n'est pas en base
  (question 7, aucune migration). La carte « Rendez-vous demain · 2 prix ont changé » de la
  maquette n'existe donc pas ; un dossier prêt se rejoint par « Tous mes vendeurs », puis l'onglet
  du Live (trois touchers).
- Le détail dit « À faire aujourd'hui », comme Acquéreurs au lot B ; la page du dossier dit
  « Prochaine étape ». Pour un mandat signé, la tâche du jour (le Point marché) n'est pas la
  prochaine étape du dossier (« Voir le Suivi », M110) : deux mots pour deux choses.
- Les boutons disent les mots de la maquette, « Préparer la relance » et « Faire le point
  marché » ; « Aujourd'hui » garde les siens (« Relancer », « Faire le point ») pour le même geste.
- La deuxième tuile compte les concurrents retenus dont le prix ou la surface importés sont « À
  vérifier » (M104), sous ce nom. La maquette dit « Prix à revérifier », qui parlerait plutôt des
  annonces à relire avant le rendez-vous (« Vérifier les annonces », M152 A).
- « Concurrents retenus » dit le nombre de l'étape « Les concurrents » (les exploitables, M52) :
  jamais deux nombres « retenus » différents sur un même écran.
- « Tous mes vendeurs » compte les dossiers de toute l'agence, comme les listes qu'il ouvre
  (M59), pas les seuls dossiers du conseiller.

Les specs modifiées (un libellé ou un emplacement ; ce qu'elles prouvent ne change pas) :

| Spec                           | Ce qui a changé                                                                                    |
| ------------------------------ | -------------------------------------------------------------------------------------------------- |
| `parcours.spec.ts`             | « Vendeurs » mène à « à faire aujourd'hui » : « Tous mes vendeurs » pour rejoindre les listes (sur ordinateur et sur téléphone). **Ajouté** : « Tout le dossier » ouvert, toujours un seul bouton plein |
| `presentation-directe.spec.ts` | les acquéreurs de l'agence et l'Étude sont sous « Tout le dossier », ouvert avant de les lire. **Ajouté** : un seul bouton plein, le pli ouvert |
| `demo.spec.ts`                 | les acquéreurs de l'agence et les concurrents à prospecter sont sous « Tout le dossier » (ouvert ; par l'adresse `?tout=1` pour corriger l'exclusivité, qui recharge la page) |
| `vendeurs-a-faire.spec.ts`     | **nouvelle** : Vendeurs aux trois tailles, un autre vendeur sans changer de page, « Tous mes vendeurs », la page du dossier et « Tout le dossier » |

Le relecteur, une passe (sur Opus) : deux bloquants, levés — « Bien vendeur non renseigné »
s'affichait le temps de lire le dossier (un bien pas encore lu n'a plus de ligne) ; les liens du
Suivi vers les acquéreurs de l'agence menaient à un pli fermé (ils l'ouvrent : `?tout=1`). Ses « à
corriger », faits : l'ordre d'« Aujourd'hui » ; « À faire aujourd'hui » dans le détail ; « Tous mes
vendeurs » compte ce que le lien ouvre ; « Tout le dossier » s'ouvre déplié ; la confirmation du
Live prend toute la largeur de la carte ; « Relancer plus tôt ? » à l'allure du socle ; le nombre
de retenus ; une lecture en échec ne fait plus dire « 0 » à la tuile des prix à vérifier ; le code
dit `project`, l'adresse `?vendeur=` (CLAUDE.md : `dossier` ne désigne que le Dossier acquéreur) ;
les specs reprouvent le bouton plein, le pli ouvert ; la spec de Vendeurs accepte un Point marché
en retard (un 29, 30 ou 31). Restent dans `missions/PLUS_TARD.md` : les lectures en double des
acquéreurs à chaque affichage de Vendeurs.

Les tests : barrières vertes (4 558 tests unitaires). Sur l'essai, sur le code relu (`f9f929f2`,
lots D et E) : `vendeurs-a-faire`, `live-tablette` (trois), `parcours`, `presentation-directe`
(huit), `demo`, 14 parcours, verts. Deux attentes fausses des specs, pas de l'écran, corrigées en
route : la démo cherchait l'exclusivité hors du pli ; le parcours, sur téléphone, attendait
encore « Vendeurs » → Préparation.

### Remarques de Jean-Guy du 26/11 sur les lots D et E (sur l'essai, attend le « oui »)

Son « oui » pour les lots A à E (26/11 au soir) venait avec cinq réponses : 2 et 4, « oui » (la
tuile « Prix ou surface à vérifier », « À faire aujourd'hui » dans le détail de Vendeurs) ; 1, 3
et 5 se corrigent ici. À ouvrir sur l'essai, avec le compte de démonstration des tests (il est
manager) : `https://acm-studio-essai.vercel.app/vendeurs` (la carte de M. et Mme Martin, puis
« Toute l'agence ») et `/acquereurs` (« Toute l'agence »). Les captures :
`missions/maquettes/REFONTE-R-telephone.png`, `-tablette.png`, `-ordinateur.png` (Vendeurs),
`REFONTE-R-vendeurs-toute-l-agence-ordinateur.png`, `REFONTE-R-mes-fiches-ordinateur.png` et
`REFONTE-R-toute-l-agence-ordinateur.png` (Acquéreurs).

Ce qui change, en comportement :

- **Un dossier en préparation a sa carte dans « à faire aujourd'hui »** (réponse 1) : « Préparation
  en cours », et « Reprendre la préparation », qui mène à son étape à faire (le bien vendeur, les
  concurrents ou la décision de prix, M97, M110). Sans la date du rendez-vous (pas en base) :
  seulement les dossiers en préparation modifiés dans les 14 derniers jours, ceux de la vue choisie,
  jamais un dossier d'exemple ; après les tâches du jour, le plus récemment modifié d'abord. Le
  sous-titre les compte à part : « 2 choses à faire aujourd'hui · 1 préparation en cours ». Dans
  le détail (tablette, ordinateur), son dossier, comme pour les autres vendeurs.
- **Vendeurs et Acquéreurs suivent la vue choisie** (réponse 3) : un manager choisit « Mes
  dossiers » (Acquéreurs : « Mes fiches ») ou « Toute l'agence », comme sur « Aujourd'hui » (M145
  B) ; la vue change les tâches montrées, et le lien d'en bas compte ce qu'il dit : « Tous mes
  vendeurs · N » (les dossiers dont il est le titulaire) ou « Tous les vendeurs de l'agence · N » ;
  « Tous mes acquéreurs · N » ou « Tous les acquéreurs de l'agence · N », qui ouvre la liste dans
  la vue « Toute l'agence ». Choisir une personne garde la vue. Un conseiller n'a pas le choix : ses
  tâches, ses dossiers, ses fiches.
- **L'avertissement de la lecture des notes** (réponse 5) : « N'écrivez, ne dictez ni ne
  photographiez d'information sur la santé, la religion ou la vie privée de vos clients : l'outil
  ne la relève pas, mais elle serait envoyée. » ; le reste du texte ne bouge pas, sur « Nouvel
  acquéreur » comme sur « Compléter depuis mes notes ».
- Dans `missions/PLUS_TARD.md` : un critère « jardin » distinct d'« extérieur » ; la date du
  rendez-vous en base.

Tranché seul par le chef, à corriger par Jean-Guy s'il le veut :

- La vue des pages « à faire » se dit `?agence=1` : sur Acquéreurs, `?vue=agence` ouvre déjà la
  liste entière des fiches (lot B), et treize specs s'en servent ; rien n'y change.
- Le choix de vue n'est qu'au manager, comme sur « Aujourd'hui » (M145 B). Sur Acquéreurs, il dit
  « Mes fiches », le mot de la liste des fiches (M146 B).
- « Préparation en cours » ne compte que les dossiers « En cours » de Préparation ; un dossier prêt
  pour le Live n'a pas de carte (son étape est « Lancer le Live », pas une préparation).
- La carte d'un dossier en préparation ne compte pas dans « choses à faire » : ce ne sont pas des
  tâches d'« Aujourd'hui » (ce que demande le point a du lot F).

Les specs modifiées (ce qu'elles prouvent ne change pas ; elles prouvent en plus les remarques) :

| Spec                         | Ce qui a changé                                                                                   |
| ---------------------------- | ------------------------------------------------------------------------------------------------- |
| `vendeurs-a-faire.spec.ts`   | le sous-titre compte à part la préparation de M. et Mme Martin. **Ajouté** : sa carte, « Reprendre la préparation » vers son étape à faire, le seul bouton plein ; la vue « Toute l'agence », son lien et son nombre, la vue gardée d'un vendeur à l'autre |
| `acquereurs-a-faire.spec.ts` | **Ajouté** : la vue « Toute l'agence », « Tous les acquéreurs de l'agence » et la liste ouverte dans cette vue |

Les tests : barrières vertes (4 568 tests unitaires). Sur l'essai : `vendeurs-a-faire`,
`acquereurs-a-faire`, `depuis-mes-notes` (deux) et `parcours`, 5 parcours, verts au premier
passage.

### Lot F — Visites sur le socle, et les ajouts du 26/11 (sur l'essai, attend le « oui »)

À ouvrir sur l'essai, avec le compte de démonstration des tests :
`https://acm-studio-essai.vercel.app/visites`, puis `/aujourdhui`, `/acquereurs` (la famille Keller
choisie d'emblée) et `/vendeurs`. Les captures, avant et après, pour a, b et d :
`missions/maquettes/REFONTE-F-avant-…` et `REFONTE-F-apres-…` (`aujourdhui-ordinateur`,
`acquereurs-ordinateur`, `-tablette`, `-telephone`, `vendeurs-ordinateur`) ; Visites aux trois
tailles : `REFONTE-F-apres-visites-telephone.png`, `-tablette.png`, `-ordinateur.png`. La branche
part des remarques (`refonte-remarques`) : un « oui » pour le lot F les emporte avec lui.

Ce qui change, en comportement :

- **a. Un même chiffre partout** : le badge d'« Aujourd'hui », sa ligne (« 25 choses à faire ») et
  les en-têtes de ses blocs comptent les tâches que la page liste, plus ses lignes (une série de
  trois relances en compte trois) ; « N choses à faire » de Vendeurs et d'Acquéreurs dit sa part de
  ces mêmes tâches, comptée pareil : une tâche qui concerne deux acquéreurs a deux cartes, mais
  compte une fois. L'écart d'avant, en une ligne : le badge comptait les lignes d'« Aujourd'hui »,
  Acquéreurs chaque tâche, « Aussi aujourd'hui » compris. Dans la démo, le badge passe de 10 à 25 :
  les tâches de démarchage, regroupées en séries, se comptent une par une.
- **b. Les initiales des noms de famille**, jamais « M. », « Mme » ni « Famille » :
  Lambert-Duval → LD, Girard et Chevalier → GC, Keller → K, Rossi → R ; un nom composé seul donne
  ses deux lettres ; plusieurs mots, une lettre chacun, deux au plus (le compte de Jean-Guy redit
  JO).
- **c. Un geste, un nom** : « Préparer la relance » dans la liste de Vendeurs (« Relancer plus
  tôt ? » compris) et sur la page du dossier ; le titre de l'étape reste « Relancer M. et Mme … ».
- **d. Sur ordinateur et tablette, une personne sans bien à voir** : juste sous sa tâche du jour,
  sa prochaine étape et ses trois chiffres (visités, envoyés en attente, refusés), lus sur les
  mêmes faits que sa fiche repliée ; la carte de la fiche est partagée (`BuyerNextStepCard`), son
  bouton en contour (la tâche du jour garde le seul bouton plein), sans les gestes du compromis,
  qui sont ceux de la tâche.
- **Visites et le compte rendu de visite, sur le socle** : le titre et sa ligne (« 6 visites à
  planifier · 3 faites »), les deux groupes sous leur sur-titre, chaque acquéreur avec son rond
  aux initiales, chaque visite dans la carte du socle, ses pastilles, ses gestes avec les boutons
  du socle (contour 48 px ; « Enregistrer le compte rendu » et « Préparer le message » pleins sur
  Visites, en contour sur la fiche, comme avant) ; les choix de l'avis et de la suite, en pastilles
  à toucher (44 px) ou en grands boutons, le choisi plein. Aucune logique ne change.
- **L'aperçu `/socle`** est retiré ; **le guide de prise en main** dit le nouveau menu
  (« Vendeurs », « Tous mes vendeurs », le + de « Nouveau », la phrase de « Nouvel acquéreur »),
  toujours sur deux pages.

Tranché seul par le chef, à corriger par Jean-Guy s'il le veut :

- « Préparer la relance » vaut dans la liste et sur le dossier, comme demandé ; « Aujourd'hui »
  garde « Relancer » pour le même geste.
- La prochaine étape de la personne vient sous sa tâche, avant « Aussi aujourd'hui ».
- Le dossier en préparation (remarque 1) se juge sur sa dernière activité — la plus récente des
  dates du dossier, de son bien, de ses concurrents, de sa décision de prix et de ses imports — :
  la date du seul dossier ne bouge pas quand on travaille son bien (trouvé par la relecture).

Les specs modifiées (lot F) :

| Spec                         | Ce qui a changé                                                                                   |
| ---------------------------- | ------------------------------------------------------------------------------------------------- |
| `acquereurs-a-faire.spec.ts` | « N choses à faire » prouve la nouvelle règle (sa part des tâches d'« Aujourd'hui », comptée pareil) au lieu de « cartes + autres choses » : c'est le point a. **Ajouté** : le badge égal à la ligne d'« Aujourd'hui » et à ses tâches ; les initiales K, GC, R ; la prochaine étape et les trois chiffres de la personne choisie, toujours un seul bouton plein |
| `vendeurs-a-faire.spec.ts`   | **Ajouté** : les initiales LD et L                                                                |
| `demo.spec.ts`               | « Préparer la relance » à la place de « Relancer » sur la page du dossier (un libellé)            |

Le relecteur, une passe sur les remarques et le lot F (sur Opus) : un bloquant, levé — « modifié
dans les 14 derniers jours » se lisait sur la seule date du dossier. Ses « à corriger », faits : les
en-têtes d'« Aujourd'hui » comptent les tâches ; le prénom composé ne coupe plus les initiales du
compte (JO) ; la lecture des dossiers en préparation dit son échec ; le guide dit le menu à chaque
taille ; la prochaine étape sous la tâche ; Visites ne redit pas « aucune » ; deux commentaires
périmés. Restent dans `missions/PLUS_TARD.md` ses remarques et une question à Jean-Guy (« Tous mes
vendeurs · N » compte les siens, la liste ouverte montre l'agence).

Les tests : barrières vertes (4 569 tests unitaires). Sur l'essai (`aa86c9d4`) : `vendeurs-a-faire`,
`acquereurs-a-faire`, `parcours`, `demo` ; avant la relecture, sur `98945f8c`, `hors-mandat`,
`confirmer-la-visite`, `bon-de-la-tournee`, `suivi-de-l-acquereur`, `acquereur-sans-offre`,
`fiche-complete`, `bienvenue`, `presentation-directe` (huit) : 24 parcours, verts au premier
passage.

## Chaque soir

La suite e2e complète, lancée par le chef en fin de journée (accord de Jean-Guy, 23/11), puis le
point du soir en dix lignes. Depuis le 25/11 au soir, elle tourne sur la base d'essai : elle ne
pèse plus sur la production. Le 25/11 : de 20 h 17 à 20 h 57, 37 parcours sur 37, un aléa. Le 26/11, sur le code des lots A à E mis en production : de 19 h 31 à 7 h 20 le 27/11 (le Mac
s'est endormi pendant la nuit, la tranche en cours s'est arrêtée là), 42 parcours sur 42, un aléa
— `suivi-de-l-acquereur`, le réseau coupé par la mise en veille (`ERR_NETWORK_IO_SUSPENDED`), vert
au rejeu.
