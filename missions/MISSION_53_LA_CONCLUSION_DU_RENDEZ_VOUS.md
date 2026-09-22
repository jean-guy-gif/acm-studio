# MISSION 53 — La conclusion du rendez-vous, et le Suivi

**Date** : 22 septembre 2026
**Origine** : Laurent — « à la fin, une fois que le vendeur a choisi le prix de
commercialisation, il faut quelque chose qui aide le conseiller à proposer un mandat.
Subtilement. Si c'est oui, on renote le prix de commercialisation, et ça nous permet de
voir l'écart en pourcentage avec le prix conseillé et avec la moyenne de l'ACM. Si
c'est non, le dossier passe en Suivi, à relancer, et on demande pourquoi. »

Le parcours devient **Préparation → Live → Suivi**.

---

## 1. La subtilité : on ne demande pas un mandat, on demande un prix

Un écran qui afficherait « Proposer le mandat » devant un vendeur ruinerait vingt
minutes de pédagogie. Le dernier écran du Live ne pose donc **qu'une question, celle
qui vient naturellement après l'analyse** :

> **Sur quel prix partons-nous ?**

Avec, au-dessus, les repères que le vendeur a déjà vus — rien de nouveau, rien de caché.
Et un champ vide.

**Remplir ce champ, c'est l'accord.** Il n'y a pas de case « oui » à cocher sous les
yeux du vendeur : l'engagement se note comme un prix, pas comme une signature. Si le
vendeur n'est pas prêt, le conseiller ne remplit rien et quitte l'écran. Rien de
gênant ne s'est produit à l'écran.

**Le champ est vide à l'ouverture.** Jamais pré-rempli avec le prix conseillé — ce
serait ancrer le vendeur sur notre chiffre au moment précis où on lui demande le sien.
C'est la règle de la mission 51, appliquée au dernier écran.

---

## 2. L'issue se note côté conseiller, après

Une fois le Live quitté, un écran **que le vendeur ne voit pas** :

> Comment s'est conclu ce rendez-vous ?
> **Mandat signé** · **À relancer**

Si **à relancer** : un champ libre, « qu'est-ce qui retient le vendeur ? », tapé par le
conseiller. C'est une note de travail, jamais affichée au vendeur.

Pourquoi séparer : un prix donné n'est pas un mandat signé. Le vendeur peut annoncer un
prix et ne pas signer le jour même. Le prix est **ce que le vendeur a dit** ; l'issue
est **ce que le conseiller constate**. Deux faits différents, deux saisies.

**La conclusion n'est jamais obligatoire.** Un conseiller qui quitte sans conclure
laisse le dossier dans le Live. On ne force pas une signature par un écran.

---

## 3. Les trois chiffres, figés au moment de la conclusion

C'est ce que Laurent veut pouvoir lire ensuite : *à combien de pour cent étions-nous ?*

Trois montants sont enregistrés **en copie, à l'instant de la conclusion** :

1. la moyenne de marché issue de l'analyse comparative ;
2. le prix conseillé par le conseiller ;
3. le prix de commercialisation convenu avec le vendeur.

**Figés, pas recalculés.** Si le dossier est modifié six mois plus tard, la réponse à
« quel était l'écart ce jour-là » ne doit pas changer. Les écarts en pourcentage se
calculent à l'affichage à partir de ces trois copies — on stocke les faits, pas les
résultats.

**Et une question à trancher avant d'écrire** : la mission 51 a signalé deux « prix
conseiller » différents sur deux écrans consécutifs (analyse : 372 000 ; conclusion :
498 765). Tant qu'on ne sait pas lequel est « le prix conseillé par l'agent », l'écart
en pourcentage ne veut rien dire. **C'est ici que ça se règle** — voir §5.

---

## 4. Suivi — la troisième section, minimale

Une section de plus dans la navigation, deux états :

- **Signé** — le mandat est pris.
- **À relancer** — avec le motif saisi par le conseiller.

La carte montre l'essentiel : le bien, le prix convenu (ou son absence), les trois
chiffres et les écarts, la date du rendez-vous, et le motif pour les à-relancer.

**Rien de plus dans cette mission.** Pas de rappels, pas de dates de relance, pas de
statistiques d'agence, pas de pipeline. Laurent a dit : *« une fois qu'on a fait ça, je
te parlerai du suivi plus tard. »* Le Suivi complet est une mission à lui seul.

---

## 5. Ce qu'il faut mesurer avant d'écrire une ligne

1. **Où le Live se termine-t-il aujourd'hui ?** Quel est le dernier écran, et que fait
   « Quitter » exactement.
2. **Les deux « prix conseiller » : lequel est lequel ?** `advisor_comparative_market_price`
   et `advisorDecision.advisorPrice` affichent 372 000 et 498 765 sur deux écrans qui
   se suivent. Dis lequel est la moyenne de marché, lequel est le prix de mise en vente
   recommandé, et si les libellés à l'écran les distinguent pour quelqu'un qui n'a pas
   lu le code. Le calcul d'écart en dépend entièrement.
3. **L'enum `projects.status`** : quelles valeurs, lesquelles sont écrites, et ce qu'il
   faut ajouter pour « signé » et « à relancer ». `meeting_completed` et `archived`
   existent sans usage — dis si l'une convient plutôt que d'en créer une de plus.

Rends ces trois réponses avant de dessiner.

---

## 6. Ce qui ne change pas

- **`projects.status` reste la seule vérité**, et **aucun dossier ne devient invisible** :
  toute valeur écrite a un écran qui la montre. La règle inscrite au CLAUDE.md en
  mission 52 s'étend aux nouveaux états, elle ne se contourne pas.
- **Aucune valeur inventée.** Le champ du prix de commercialisation est vide tant que
  le vendeur n'a pas parlé ; un dossier sans conclusion reste sans conclusion.
- **L'écran de conclusion est face au vendeur** : la fourchette du conseiller n'y a
  aucune place, et rien n'y apparaît que le vendeur n'ait déjà vu.
- **Le motif de relance est une note de travail**, jamais montrée au vendeur.

---

## 7. Barrières

`vitest` · `tsc --noEmit` · `eslint` · `prettier --check` · `next build`

Les tests qui doivent exister :

1. Un prix de commercialisation saisi est enregistré, et les trois montants sont figés
   à cet instant.
2. Une conclusion « à relancer » envoie le dossier en Suivi avec son motif, et il sort
   du Live.
3. Une conclusion « signé » envoie le dossier en Suivi à l'état signé.
4. Un Live quitté sans conclusion laisse le dossier dans le Live.
5. Le champ du prix de commercialisation est vide à l'ouverture, quel que soit le
   dossier.

**Et l'essai à l'écran, d'une traite, sans recharger** : dérouler un Live complet,
saisir un prix, conclure « signé », le retrouver en Suivi ; puis un second dossier
conclu « à relancer » avec un motif. C'est la leçon de la mission 51 — une mesure qui
recharge entre les étapes ne mesure pas ce que vit le conseiller.