# MISSION 36 — La recherche de concurrents qui apprend

**Date** : 19 août 2026
**Demande** : « que la plateforme aille seule rechercher des biens en concurrence
avec le bien de mon client […] rajouter dans le bien du client ce que pense
l'agent en terme de prix, fourchette même si c'est un peu large […] que l'agent
n'ait plus qu'à dire oui c'est un concurrent ou non et pourquoi, pour que si une
nouvelle recherche elle soit encore mieux adaptée. Tout ce travail se fait au
bureau, sans le client. »

---

## 1. La fourchette du conseiller

Nouveau champ sur le bien vendeur : **« Votre fourchette de prix »**, de X à Y.

Ce n'est **pas** une estimation produite par l'outil — le protocole ACM l'interdit
et rien n'a changé sur ce point. C'est l'avis d'un professionnel, saisi par lui,
qui ne sert qu'à cibler la recherche de concurrents. Il n'apparaît nulle part
devant le vendeur.

Une fourchette large est utile : c'est elle qui définit le centre du classement.
Une fourchette à l'envers est refusée à la saisie — c'est une faute de frappe,
pas une opinion.

---

## 2. On classe, on ne filtre pas

Chaque annonce trouvée reçoit une note de **ressemblance sur 100** avec le bien du
client :

| Critère                        | Poids |
| ------------------------------ | ----- |
| Prix dans la fourchette        | 30    |
| Surface                        | 25    |
| Quartier (ou commune à défaut) | 20    |
| Type de bien                   | 15    |
| Nombre de pièces               | 10    |

Deux principes tenus :

**Une donnée absente n'est pas une faute.** Une annonce qui ne publie pas sa
surface n'est pas pénalisée : le critère sort du calcul, et la note est ramenée
sur les seuls critères comparables. Sans cela, les portails avares en données
seraient systématiquement relégués.

**Rien n'est masqué.** Une annonce hors fourchette descend dans la liste, elle ne
disparaît pas : un concurrent atypique existe, et c'est le conseiller qui
tranche, pas l'outil. La carte affiche en clair ce qui rapproche l'annonce
(« Dans la fourchette », « Même quartier ») et ce qui l'en éloigne
(« Surface très différente ») — le classement doit pouvoir être contesté.

Les paliers sont tolérants aux bords : un bien 3 % au-dessus de la fourchette
reste « proche de la fourchette » et garde la moitié des points. Un concurrent
direct ne se joue pas à 10 000 €.

---

## 3. Les fiches se remplissent toutes seules

Après la recherche, l'outil va chercher la fiche complète des **12 premières**
annonces : photos, quartier, DPE, caractéristiques, délai de commercialisation
(MISSION 33). Le conseiller voit les cartes se compléter au fur et à mesure —
trois appels en parallèle, jamais plus : assez pour que l'écran se remplisse
vite, assez peu pour rester un visiteur poli.

Les enchaîner dans une seule action serveur dépasserait la limite d'exécution et
figerait l'écran ; c'est le navigateur qui pilote la file. Une fiche qui échoue
est laissée en l'état, sans bloquer les autres.

---

## 4. « Oui / Non, et pourquoi »

Sous chaque annonce : **Oui, c'est un concurrent** — qui enregistre la décision et
ouvre l'import — ou **Non**, qui demande un motif.

Huit motifs fermés : trop cher, trop bon marché, surface trop différente, mauvais
quartier, type de bien différent, état sans rapport, doublon, autre. Plus un
commentaire libre pour ce qui ne rentre dans aucune case.

C'est la liste fermée que l'outil sait exploiter ; le commentaire, lui, reste
lisible par un humain.

Un instantané de l'annonce (prix, surface, quartier) est conservé avec la
décision : sans lui, l'apprentissage perdrait son sens dès que l'annonce
disparaît du portail.

---

## 5. Ce que l'outil retient — et comment il le dit

Deux principes, non négociables :

**Rien n'est deviné.** Chaque règle vient d'un motif explicitement coché, jamais
d'une corrélation trouvée toute seule.

**Rien n'est caché.** Chaque règle apprise produit une phrase affichée en haut de
la recherche : _« Vous avez écarté 3 annonces jugées trop chères, dès
420 000 € »_. Le conseiller doit pouvoir contester ce que l'outil croit avoir
compris.

Les règles :

| Ce que fait le conseiller                      | Ce que l'outil en fait                                  |
| ---------------------------------------------- | ------------------------------------------------------- |
| 2 annonces « trop cher »                       | Plafond = le plus BAS de ces prix ; au-delà, −25 points |
| 2 annonces « trop bon marché »                 | Plancher = le plus HAUT ; en deçà, −25 points           |
| 2 annonces « mauvais quartier », même quartier | −30 points sur ce quartier                              |
| 2 annonces « type différent », même type       | −30 points sur ce type                                  |
| 3 refus sur un portail, aucun accord           | −10 points sur ce portail                               |

**Il faut deux décisions concordantes** pour qu'une règle naisse : un clic isolé,
ou une erreur de manipulation, ne doit pas déformer les recherches suivantes.

Trois garde-fous :

- Un quartier où un concurrent a **déjà été retenu** n'est jamais déclassé.
- Des décisions de prix **contradictoires** (un plancher au-dessus du plafond)
  annulent les deux limites, avec la phrase qui l'explique.
- Une annonce **déjà tranchée** n'est pas re-proposée comme neuve : elle est
  marquée « déjà retenu » / « déjà écarté » et passe derrière les autres.

**Portée agence**, comme demandé : les conseillers d'une même agence alimentent le
même apprentissage. Aucune donnée ne traverse les agences (RLS + écritures par le
seul client de service, après contrôle d'appartenance du dossier).

---

## 6. Base de données

`subject_properties` : `advisor_price_min`, `advisor_price_max` (+ contraintes).

`competitor_decisions` : dossier, annonce, décision, motif, commentaire, et
l'instantané du bien. Une seule décision par annonce et par dossier — y revenir
la remplace. RLS en lecture limitée à l'agence ; aucune politique d'écriture, les
privilèges par défaut sont révoqués.

Commande : `npx supabase db push`.

---

## 7. Ce qui reste ouvert

- **Le quartier et le type de bien ne comptent qu'après enrichissement** : les
  pages de résultats des portails ne les publient pas de façon fiable. Le
  classement initial repose donc sur prix, surface, pièces et commune ; il
  s'affine quand les fiches se complètent.
- **Belles Demeures, Maisons et Appartements, Le Figaro** n'ont toujours pas
  d'extracteur dédié (MISSION 34, §5) : leurs fiches enrichies restent partielles.
- **Le re-classement après enrichissement** n'est pas encore fait : les cartes se
  complètent, mais l'ordre reste celui du premier calcul.

---

## 8. Barrières

546 tests (dont 23 nouveaux sur le classement et l'apprentissage) ·
`tsc --noEmit` · `eslint` · `prettier --check` · build de production.
