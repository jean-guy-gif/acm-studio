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
| A   | Le socle : le menu aux trois tailles, la carte « à faire », les boutons plein et contour, les pastilles, les tuiles de chiffres | toutes          | 4 h          | à faire |
| B   | Acquéreurs : « à faire aujourd'hui » ; la fiche acquéreur repliée alignée sur le socle             | REFONTE-1, 4, 5, 6 | 2 h 30    | à faire |
| C   | Un bien à la fois                                                                                  | REFONTE-3, 5, 6 | 2 h 30       | à faire |
| D   | Nouvel acquéreur par une phrase                                                                    | REFONTE-2       | 2 h          | à faire |
| E   | Vendeurs : « à faire aujourd'hui », et le dossier avec sa prochaine étape et ses cinq étapes       | REFONTE-7, 8    | 3 h          | à faire |
| F   | Les pages Visites et le compte rendu de visite, alignés sur le socle                               | —               | 1 h 30       | à faire |

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
8. Les couleurs et la police restent celles de la charte de l'agence ; le bleu nuit et Nunito Sans
   des maquettes sont la charte par défaut. Le mode sombre continue de marcher.
9. Pour regarder l'essai, Jean-Guy se connecte avec le compte de démonstration des tests
   (`E2E_DEMO_EMAIL`, dans `.env.e2e.local`) : son propre compte n'existe pas dans la base d'essai.
10. Le guide de prise en main nomme le menu d'aujourd'hui : il suit le nouveau menu avant le gel.

## Chaque soir

La suite e2e complète, lancée par le chef en fin de journée (accord de Jean-Guy, 23/11), puis le
point du soir en dix lignes. Depuis le 25/11 au soir, elle tourne sur la base d'essai : elle ne
pèse plus sur la production. Le 25/11 : de 20 h 17 à 20 h 57, 37 parcours sur 37, un aléa.
