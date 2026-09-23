# MISSION 56 — Capter avant de perdre

**Date** : 23 septembre 2026
**Origine** : Laurent veut, plus tard, pouvoir communiquer avec des chiffres sur ce que
l'outil produit. Le tableau de bord se construira le jour où il y aura des données —
**mais une donnée non figée le jour du rendez-vous est perdue pour toujours.**

Cette mission ne construit aucun écran. Elle s'assure que les faits du rendez-vous sont
capturés maintenant.

---

## 1. Ce qui manque, et pourquoi c'est celui-là qui compte

La mission 53 fige quatre montants à la conclusion : marché calculé, analyse du
conseiller, prix conseillé, prix convenu.

**Le chiffre le plus vendeur n'en fait pas partie.** Ce qui convaincra une agence, ce
n'est pas la beauté de l'écran — c'est : *« le vendeur voulait 555 000, il a estimé son
bien à 400 000 après l'analyse, il a signé à 512 000. »* Le mouvement que le Live produit
sur l'idée qu'un vendeur se fait de son bien.

Deux des trois points de cette phrase ne sont pas figés :

| | Où il vit aujourd'hui | Modifiable après le rendez-vous |
| --- | --- | --- |
| Le prix souhaité par le vendeur **avant** le Live | `project_price_positionings` | oui |
| La valeur perçue par le vendeur **pendant** le Live | `live_seller_summary` | oui |

Tant qu'ils restent là, la phrase sera fausse dans six mois.

---

## 2. Ce qu'on fige en plus

Trois valeurs rejoignent les quatre existantes, **au même instant, avec le même patron
de figeage définitif** (`COALESCE`, jamais réécrit) :

1. **Le prix souhaité par le vendeur au départ** — le point de départ du mouvement.
2. **La valeur perçue par le vendeur pendant le Live** — le point d'arrivée de la
   pédagogie, avant la négociation.
3. **Le nombre de concurrents retenus** — le poids de l'analyse. Dérivable aujourd'hui,
   perdu le jour où un concurrent est supprimé du dossier.

**Pour toutes les issues**, pas seulement les signés. Un dossier « à relancer » est
précisément celui dont on voudra savoir à quelle distance on était.

**Une valeur absente reste absente.** Un vendeur qui n'a pas donné sa valeur perçue
laisse la case vide — comme l'analyse manuelle du conseiller, qui affiche déjà
« Non renseigné » sans que ça pose problème.

---

## 3. Le rattrapage des dossiers déjà conclus

Il y a déjà des conclusions en base. Leurs valeurs d'origine existent encore et n'ont
pas bougé — **c'est le dernier moment où elles sont vraies.**

Le backfill les capture. Il est lui-même un acte de captation : demain, un conseiller
rouvre un dossier, corrige un chiffre, et l'histoire de ce rendez-vous est perdue.

Même discipline que d'habitude : **le compte avant d'écrire**, la prédiction énoncée,
la comparaison après.

---

## 4. Ce que cette mission ne fait pas

**Aucun tableau de bord.** Pas d'écran, pas d'agrégat, pas de pourcentage affiché. Les
données s'accumulent ; l'écran se construira le jour où il aura quelque chose à montrer.

Et quand il viendra : ce tableau de bord **traversera les agences**, alors que tout le
reste de l'outil est cloisonné. C'est un chemin d'accès à part, et les chiffres publiés
devront être agrégés et anonymes — jamais « l'agence X signe 12 % sous le prix
conseillé ». À garder en tête, rien à faire maintenant.

---

## 5. Une question ouverte, à trancher et non à supposer

**La durée du rendez-vous** serait un chiffre utile — « un Live ACM dure N minutes ».
Mais elle n'est capturée nulle part, et la capturer demande d'instrumenter le début et
la fin de la séance, pas seulement de figer une valeur existante.

Dis si tu la veux, et à quel prix en complexité. **Ne l'ajoute pas de ton propre chef** :
cette mission est une captation, pas une instrumentation.

---

## 6. Ce qu'il faut mesurer avant d'écrire une ligne

1. **Où vivent exactement** le prix souhaité du vendeur et la valeur perçue, et par
   quels chemins ils peuvent changer après la conclusion. Nomme-les.
2. **Le nombre de concurrents retenus** : quelle définition exacte fait foi (les
   exploitables ? ceux jugés sérieux par le vendeur ?). Prends celle qui a un sens pour
   « le poids de l'analyse », et dis laquelle tu as prise.
3. **Le compte en staging** : combien de conclusions existent, et leurs valeurs
   actuelles pour ces trois champs. C'est ce que le rattrapage va capturer.

Rends ces trois réponses avant de dessiner.

---

## 7. Ce qui ne change pas

- **Les quatre montants déjà figés ne sont jamais recalculés.** Cette mission en ajoute,
  elle ne retouche rien.
- **`projects.status` porte la position, jamais l'issue** (règle mission 53).
- **Aucune valeur inventée** : une case vide reste vide et l'écran le dit.

---

## 8. Barrières

`vitest` · `tsc --noEmit` · `eslint` · `prettier --check` · `next build`

Les tests qui doivent exister :

1. Les trois nouvelles valeurs sont figées à la conclusion, pour les quatre issues.
2. Une valeur absente au moment du rendez-vous reste absente — rien n'est inventé.
3. Modifier le dossier après la conclusion ne change **aucune** des sept valeurs figées.
4. Le rattrapage capture les conclusions existantes sans toucher aux quatre montants
   déjà figés.

**Et la vérification en base après le rattrapage** : les sept valeurs présentes sur
chaque conclusion existante, comparées à la prédiction écrite avant d'appliquer.