# État des lieux — côté acquéreur et IA (23/11 au soir)

Pour les missions 2, 3, 6, 7, 8, 9 et 10 de `missions/LANCEMENT.md` : ce que le code fait déjà, ce
qui manque, la taille du travail. Lu dans le code de `main` ; aucune de ces missions ne demande de
migration, sauf mention.

## 2 · Après trois visites, l'outil ne suppose plus une offre — petit

- **Déjà là** : aucun seuil de trois visites, et rien n'arrête l'envoi de biens après des visites.
  Sans offre, la prochaine étape est déjà « Lui proposer d'autres biens », et la veille de nuit
  continue (une visite compte même comme un échange).
- **Ce qui suppose encore une offre** : dès la première visite faite, la barre d'étapes de la fiche
  passe sur « 4 · Offre — à faire » ; depuis « En visite », le bouton de statut suivant est « A
  acheté » ; le bloc des bons de visite montre « Offre d'achat ».
- **À faire** : corriger ces trois signaux (l'offre n'est une étape que si elle est formulée).

## 3 · Un bien envoyé, visité ou refusé n'est jamais reproposé — moyen

- **Déjà là** : la veille de nuit exclut tout (sélections, envois, refus, biens écartés). Les biens
  écartés sont exclus partout.
- **Les trous** : les biens idéaux (agence et marché) ne regardent ni les envois, ni les anciennes
  sélections, ni les visites, ni les « Pas pour moi » ; « Proposer ce bien » ne regarde que les
  envois notés ; le lien de proposition recopie deux biens de l'ancienne sélection, même refusés ; le
  serveur accepte une sélection qui contient un bien déjà refusé.
- **À faire** : une seule règle « déjà vu par lui » (envoyé, sélectionné, visité, refusé, écarté),
  branchée sur ces portes. Limite connue : un même bien publié sur deux portails a deux identités
  (le relier demanderait une migration : dans `PLUS_TARD.md`).

## 6 · Le suivi de l'acquéreur au même endroit — moyen

- **Déjà là** : tout est sur la fiche, mais en blocs séparés : « Ce qu'il a répondu », « Ses visites
  faites », « Biens proposés », « Ce qui s'est passé ».
- **Manque** : une ligne par bien (envoyé le…, sa réponse et sa raison, visité le… avec le compte
  rendu). Les biens écartés n'apparaissent nulle part sur la fiche ; « Biens proposés » ignore les
  réponses données en présentation.
- **À faire** : un bloc « Son suivi », un bien par ligne, qui remplace les blocs en double.

## 7 · Le compte rendu de visite en trente secondes — petit

- **Déjà là** : l'écran « Visite faite » (avis, ce qui a plu, ce qui a déplu, note, suite) ; quatre
  touchers au minimum.
- **Ce qui ralentit** : 22 étiquettes à parcourir, des boutons petits pour le pouce, le passage
  forcé par la page Visites après l'enregistrement, aucun rappel le jour de la visite.
- **À faire** : l'avis et la suite d'abord, en grands boutons, les étiquettes repliées ; rester sur
  la page d'où l'on vient ; une tâche « Compte rendu à saisir » dans « Aujourd'hui ».

## 8 · IA : la lecture des notes de découverte — petit (ouverture et essai)

- **Déjà là** : tout le code (« Depuis mes notes », photo, fichier ou texte collé ; plafond par
  agence ; rien de lu n'est gardé).
- **Ce que tu dois faire toi-même pour ouvrir une agence** : sur `/erreurs`, dans la carte de
  l'agence, taper un plafond d'IA supérieur à 0 € et enregistrer.
- **À vérifier** : les clés d'Amazon dans Vercel en production, et l'essai avec un compte qui n'est
  pas opérateur (un opérateur est toujours ouvert : son essai ne prouve rien pour l'agence).

## 9 · IA : classer les annonces face aux critères — les mots sont faits, les photos : moyen à gros

Ce que l'IA lit aujourd'hui dans une annonce, et ce qu'elle ne lit pas :

1. Elle lit le **texte** de l'annonce et ses **étiquettes** (piscine, terrasse…), rien d'autre.
2. Elle ne lit **ni les photos, ni le titre, ni l'adresse, ni le lien**.
3. Elle lit les annonces du marché, les concurrents, les mandats de l'agence et la veille de nuit ;
   pas les biens démarchés.
4. Elle ne juge que « Ce qui compte pour eux » (au calme, lumineux, une vue…) ; sans ces critères
   sur la fiche, elle n'est pas appelée. Elle ne fait jamais sortir un bien : elle range.
5. « Pourquoi 1er » s'affiche pour le conseiller seul ; le jour, rien n'est gardé en base.

- **À faire** : les photos (les télécharger côté serveur, les envoyer au modèle pour les biens les
  mieux classés, dans le plafond de l'agence) ; mesurer le coût sur vingt annonces réelles.

## 10 · Fiche acquéreur simplifiée — moyen (la mission à sacrifier)

- **Déjà là** : une seule prochaine étape calculée, un seul bouton plein.
- **En trop** : jusqu'à 18 blocs et 15 à 20 boutons ; le statut, « Prêt à visiter », les visites et
  les envois sont chacun dits à deux ou trois endroits.
- **À faire** : le modèle de la Vue d'ensemble vendeur (en-tête, étapes, un bloc « Prochaine
  étape », « Autres actions » en liens, puis le suivi de la mission 6).

## Pour la mission 5 (plus aucun coût en euros devant le conseiller)

Les montants s'affichent aujourd'hui dans : la recherche de concurrents (« Coût maximal : 0,60 € »,
« Chercher encore (20 annonces, 0,20 €) », « annonces facturées (X €) »), les biens idéaux
(« Recherche payante… jusqu'à 0,60 € », « Lancer et payer »), les nouveaux venus du Point marché, et,
pour le manager, Administration (veille, IA, consommation du mois).
