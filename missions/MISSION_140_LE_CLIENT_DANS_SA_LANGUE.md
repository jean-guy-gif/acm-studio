# MISSION 140 — Le client dans sa langue

**Date** : 06/11/2026 · **Origine** : Jean-Guy, 06/11 : « pour l'intégralité de l'outil, vendeur ou
acheteur, tous les Live et documents générés : possibilité de changer la langue ». Suite de la 139 (langue
de l'acquéreur, modèles relus, jamais d'IA, 23/10).

Équipe allégée. Une migration probable (langue du dossier vendeur) : gardien-sql, arrêt. Plusieurs parties
si nécessaire (A vendeur, B acquéreur), une branche et un `/valide` chacune.

## Règles
1. **Une langue par client** : sur le dossier vendeur (nouvelle) et sur la fiche acquéreur (139). Français
   par défaut. **L'interface du conseiller reste en français** : seul ce que voit ou reçoit le client change.
2. **Langues proposées** : français et anglais dès cette mission ; italien, allemand, russe écrits et
   testés, cachés par une constante chacune jusqu'à la relecture d'un natif (`docs/MODELES_A_RELIRE.md`).
3. **Textes écrits et relus, jamais générés par une IA.** Tous les textes client sortent du code vers des
   fichiers de traduction par langue (un par langue, mêmes clés), pour qu'un relecteur relise un seul
   fichier. Un test échoue si une clé manque dans une langue proposée.
4. **Les chiffres, dates et montants suivent la langue** (« 1 639 500 € » / « €1,639,500 », « 6 novembre » /
   « 6 November »), les surfaces restent en m².

## A. Côté vendeur
5. **Le Live** (interactif et présentation directe), tous ses écrans vus par le vendeur, dans la langue du
   dossier. Le menu « Réglages » du Live permet de **changer de langue en direct** (le vendeur préfère
   l'anglais) ; ce qui a déjà été répondu est gardé.
6. **Les documents et liens** : synthèse (M113), Point marché (M127/129), Étude de marché (M131), et leurs
   liens publics, avec leurs messages d'envoi.
7. **Le courrier au propriétaire et le dossier confrère** restent en français (destinataire de langue
   inconnue, confrère français).

## B. Côté acquéreur
8. **Le dossier acquéreur et son lien** (M119/122), la présentation (M119), les messages de proposition
   (M134), de relance (M135), de compte rendu et de point hebdomadaire (M139), les messages « offre
   acceptée / refusée » (M138).
9. **Bon de visite et offre d'achat** (M137) : **la version française reste celle qui est signée.** Si le
   client n'est pas francophone, une traduction est jointe, marquée en tête « Traduction pour information —
   seule la version française fait foi ». **En attente de la validation du juriste** : codée mais
   désactivée (constante `TRADUCTION_DOCUMENTS_JURIDIQUES_VALIDEE`).

## Démo
Le dossier vendeur des Bernard en anglais (« Mr and Mrs Bernard » préfèrent l'anglais) : Live, synthèse et
Point marché en anglais ; Mr and Mrs Wilson (139) reçoivent tout en anglais.

## Preuves
- Test : chaque clé existe dans chaque langue proposée ; aucun texte client en dur hors des fichiers de
  langue (recherche dans les composants client).
- e2e : un Live des Bernard passé en anglais en cours de route ; la synthèse et le lien en anglais.
- Rendus : captures du Live et des PDF en anglais, relues par Jean-Guy et son relecteur produit.
