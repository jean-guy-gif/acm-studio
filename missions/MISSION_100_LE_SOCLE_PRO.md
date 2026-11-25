# MISSION 100 — Le socle pro (version gratuite)

**Date** : 12/10/2026 · **Origine** : feuille de route « 8 sur 10 » (projet ACM), ordre 7. Décision
de Laurent du 12/10 : « Gratuite d'abord ». Les offres payantes (Supabase Pro avec base séparée,
Vercel Pro) viendront juste avant d'inviter des conseillers. Cette mission les prépare, sans rien
activer.

La mission se lance seule, depuis `main` à jour, dans une seule conversation.
- Pas de push forcé.
- `npm run sauvegarde` avant toute migration et avant tout nettoyage.

## Objectif

Savoir tout de suite quand quelque chose casse chez un conseiller. Ne jamais dépenser sans limite.
Garder une base propre. Prouver que les gestes sensibles font ce qu'ils doivent.

## Étape 0 : vérifier la production

Avant tout, vérifier que la production (`acm-studio-henna.vercel.app`) sert bien le dernier commit
de `main`, avec la mission 99 : déploiement « Ready », et une page de la 99 qui répond. Le dire en
une ligne.

## Critères d'acceptation

### A. Savoir quand ça casse

1. Toute erreur inattendue est enregistrée dans une table `app_errors`. Cela couvre :
   - les erreurs côté serveur : actions, pages, routes ;
   - les erreurs côté navigateur : la page d'erreur et le Live.

   Chaque enregistrement contient :
   - la date ;
   - l'agence et l'utilisateur (identifiants seulement) ;
   - la page ;
   - le message ;
   - la version du code.

   Jamais de contenu saisi, de prix ni d'adresse : le message est tronqué et nettoyé.
2. Une page « Erreurs » est réservée aux adresses listées dans une variable d'environnement (au
   départ, celle de Laurent). Elle montre :
   - les erreurs des 7 derniers jours, regroupées par message ;
   - le nombre de fois que chaque erreur s'est produite ;
   - les agences touchées ;
   - la dernière occurrence.
3. Le menu de ces mêmes comptes porte une pastille « N erreurs depuis hier ». Pas d'e-mail.
4. Une erreur pendant le Live n'affiche jamais rien de technique au vendeur. L'écran reste celui de
   la M92 : « touchez Réessayer ».
5. Le cloisonnement par agence s'applique : un conseiller ne lit jamais cette table.

### B. Ne jamais dépenser sans limite (Stream Estate)

6. Chaque annonce facturée est comptée par agence et par mois.
7. Un plafond mensuel par agence, réglable seulement par les comptes de l'étape A.2.
   - Valeur par défaut : 30 € par mois. Le compte rendu dit si c'est réaliste au vu de la
     consommation réelle depuis le 05/10.
   - À 80 % du plafond, le manager de l'agence voit « 80 % du budget de recherche du mois utilisé ».
   - Plafond atteint : « Chercher les concurrents » est remplacé par « Budget de recherche du mois
     atteint ». Aucun appel ne part. « Ouvrir mes recherches » et l'import par l'extension restent
     possibles.
8. Le manager voit la consommation du mois, sur la page de l'agence.

### C. Une base propre

9. L'e2e **supprime** à la fin de chaque passage ce qu'il a créé : dossiers, biens, concurrents,
   réponses, relances, oppositions, exemples. Il ne se contente plus d'archiver. Seulement dans
   l'agence « TEST AUTOMATIQUE », et même en cas d'échec.
10. Un script de nettoyage unique, `npm run nettoyer:test`, supprime ce que les passages
    précédents ont laissé dans l'agence « TEST AUTOMATIQUE », et nulle part ailleurs.
    - Avant de le lancer : comptage par table, puis l'accord de Laurent.
    - Après : nouveau comptage.
    - Il refuse de tourner si l'agence ciblée n'est pas celle de test.

### D. Prouver les gestes sensibles

11. Faire l'inventaire des actions qui écrivent en base, avec pour chacune les tests qui la couvrent
    déjà. Compléter ce qui manque, au moins pour :
    - conclure et changer l'issue d'un rendez-vous ;
    - archiver ;
    - figer les réponses (M92, M94) et le prix révélé (M96) ;
    - « Ne plus solliciter » ;
    - relance ;
    - invitation ;
    - réglages de recherche ;
    - plafond.
12. Un test SQL parcourt **toutes** les tables publiques et vérifie qu'un membre d'une agence ne
    lit ni n'écrit rien d'une autre agence. Une nouvelle table sans cloisonnement fait échouer la CI.

### E. Vérifier chaque déploiement

13. Une route `/api/version` renvoie le commit déployé. Elle ne renvoie aucune autre information.
14. `npm run verifier:production` attend que la production serve le commit de `main`. Elle le dit,
    ou elle échoue après 10 minutes. `/valide` l'utilise désormais à la place de « je n'ai pas
    vérifié le déploiement ».

### F. Préparer le payant, sans rien activer

15. `docs/PASSAGE_PAYANT.md` décrit pas à pas, pour Laurent :
    - Supabase Pro : une base de production séparée de l'essai, les sauvegardes quotidiennes, la
      copie des données, les variables à changer sur Vercel ;
    - Vercel Pro.

    Il donne les coûts, l'ordre des étapes, et ce que Claude Code fera ensuite.

### G. Preuves

16. Migration soumise avant d'être appliquée, avec comptages avant et après :
    - `app_errors` ;
    - la consommation Stream Estate ;
    - le plafond par agence.
17. Tests de chaque critère. `npm run e2e` vert, tablette comprise.
18. Après le passage de l'e2e, un comptage de l'agence de test montre zéro dossier restant.

## Décisions à respecter

- M88 (droits), M92 (fin du Live), M93 (extension vérifiée avant l'appel, sauvegarde), M98 et M99.
- Clé Stream Estate, `.env.local`, `.env.e2e.local` : jamais affichés, jamais commités.

## Hors périmètre

- Activer Supabase Pro ou Vercel Pro (décision de Laurent : plus tard).
- Un outil de suivi d'erreurs externe payant.

## Essai sur l'URL d'essai

1. Avec le compte de Laurent, la page « Erreurs » s'affiche. Avec un compte de conseiller, elle est
   inaccessible.
2. Page de l'agence : la consommation Stream Estate du mois et le plafond s'affichent.
3. Mettre le plafond de l'agence de test à 0 € : « Budget de recherche du mois atteint » apparaît,
   et aucune recherche ne part. Remettre le plafond.
4. Après `npm run e2e`, l'agence « TEST AUTOMATIQUE » n'a plus aucun dossier.
5. `npm run verifier:production` répond « production à jour ».
