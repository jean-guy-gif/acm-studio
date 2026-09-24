# MISSION 58 — L'avis du conseiller se prépare, il ne se tape pas devant le vendeur

**Date** : 24 septembre 2026
**Origine** : les trois points laissés hors périmètre de la mission 51. Laurent en
tranche deux et en abandonne un.

**Petite mission.** Laurent a dit : *« il ne faut pas que ce soit une usine à gaz. »*
Rien ici ne doit devenir un chantier.

---

## 1. Le filigrane des photos : abandonné

Les photos des concurrents gardent le filigrane de l'agence qui les a publiées. Les
concurrents *sont* les annonces d'autres agences, le vendeur le sait, et les lui montrer
fait partie de la démonstration. Aucune fonction de retrait, aucun traitement d'image.

**Et jamais d'apposition du logo de l'agence sur la photo d'un confrère** — ce serait
copier, modifier et réhéberger l'œuvre d'un tiers sous une autre marque. Que ce soit
écrit une fois pour toutes.

---

## 2. L'analyse du conseiller quitte le Live pour la préparation

Aujourd'hui, `advisor_comparative_market_price` — l'avis de valeur du conseiller — est
**tapé pendant le rendez-vous**, sur l'écran « Analyse des prix », devant le vendeur.

C'est deux problèmes en un :

- **Professionnellement**, un conseiller qui saisit son estimation sous les yeux du
  vendeur a l'air d'improviser. Un avis de valeur se prépare.
- **À l'écran**, c'est ce qui produit les deux « prix conseiller » qui se suivent sans
  se distinguer — « conseiller 372 000 » à l'analyse, « prix conseillé 498 765 » à la
  conclusion.

**Le champ déménage à la fin de la préparation**, auprès du positionnement — là où le
conseiller décide déjà sa fourchette et son prix conseillé. C'est sa place naturelle :
ce sont tous des chiffres du conseiller, décidés à froid.

Dans le Live, la valeur est **affichée, jamais saisie**. Plus aucun champ de saisie
conseiller sur un écran montré au vendeur.

**Un seul champ, rien de plus.** Pas d'assistant, pas d'étape supplémentaire, pas de
nouveau critère de préparation : un dossier sans avis de valeur reste prêt, exactement
comme aujourd'hui.

---

## 3. Un seul vocabulaire, partout

Les quatre repères ont reçu des noms clairs à la conclusion (mission 53). Ces noms
deviennent les seuls, sur tous les écrans — Live compris :

- **Marché calculé** (d'après les concurrents)
- **Analyse du conseiller** (son avis de valeur)
- **Prix conseillé** (validé au positionnement)
- **Prix de commercialisation** (convenu avec le vendeur)

Là où deux d'entre eux apparaissent ensemble, ils sont posés côte à côte et lisibles
par quelqu'un qui n'a jamais vu le code. « Conseiller » et « conseillé » ne doivent
plus jamais se croiser sans qu'on comprenne lequel est lequel.

---

## 4. Le champ de la valeur perçue : une vérification, pas un chantier

Sur l'écran « Valeur perçue », le champ avait été vu pré-rempli. Depuis la mission 51 il
est en devine-puis-révèle.

**À vérifier à l'écran, pas dans le code** : sur un dossier où le vendeur n'a jamais
répondu, le champ est-il vide ? S'il porte une valeur, d'où vient-elle ? Une réponse
déjà donnée par le vendeur est légitime ; toute autre valeur est un ancrage et doit
disparaître.

Si c'est déjà bon, dis-le et on n'y touche pas.

---

## 5. Ce qu'il faut mesurer avant d'écrire une ligne

1. **Où est saisi et lu `advisor_comparative_market_price` aujourd'hui** — tous les
   points d'écriture, tous les points de lecture.
2. **Où finit la préparation** : quel est le dernier écran, et où vit déjà la saisie du
   positionnement (fourchette, prix conseillé). Le nouveau champ va là, pas ailleurs.
3. **Le champ de l'écran valeur perçue** : vide ou non sur un dossier vierge (§4).

---

## 6. Ce qui ne change pas

- **Les valeurs figées par la mission 56 ne bougent pas.** L'historique des rendez-vous
  déjà conclus est intouchable — le déménagement concerne la saisie courante, pas les
  copies.
- **Aucun nouveau critère de préparation.** Un dossier sans avis de valeur est prêt.
- **Aucune valeur inventée** : un avis de valeur absent s'affiche « non renseigné »,
  comme aujourd'hui.

---

## 7. Barrières

`vitest` · `tsc --noEmit` · `eslint` · `prettier --check` · `next build`

Les tests qui doivent exister :

1. L'avis de valeur saisi en préparation est celui affiché dans le Live.
2. Aucun écran du Live ne porte de champ de saisie pour l'avis de valeur du conseiller.
3. Un dossier sans avis de valeur reste prêt et bascule normalement dans le Live.
4. Les valeurs figées des conclusions existantes sont inchangées après migration.

**Et l'essai à l'écran, d'une traite** : préparer un dossier, saisir l'avis de valeur à
la fin, dérouler le Live et le voir affiché — sans jamais rencontrer un champ à remplir
devant le vendeur.