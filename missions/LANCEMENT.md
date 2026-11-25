# Lancement — livraison du produit le jeudi 26 novembre 2026 au soir

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
   « Déjà vus avec lui » à part (maquette `maquettes/L3b-deja-vus-avec-lui.png`)
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
    « L'annonce semble supprimée » qui ne se dit plus quand l'extension n'a pas lu
12. **Sauvegardes quotidiennes vérifiées sur l'offre Pro, journal d'erreurs vide, suite de nuit
    verte.** — **fait le 25/11** : Supabase sauvegarde la base chaque nuit (sans les fichiers du
    stockage, que notre sauvegarde prend : faite et vérifiée par restauration le 25/11) ; journal
    vide depuis le 24/11 à 16 h 33 ; suite complète 37 sur 37
13. **Livraison.** — à faire
    - Le guide, à la ligne des portails (Jean-Guy, 25/11) : Belles Demeures ne s'aspire pas (son
      site interdit la lecture de ses annonces) : le bien se saisit à la main.

## Chaque soir

La suite e2e complète, lancée par le chef en fin de journée (accord de Jean-Guy, 23/11), puis le
point du soir en dix lignes.
