# Mission 148 — ce qui dépasse aujourd'hui, écran par écran (08/11/2026)

Mesure faite sans rien modifier, sur l'essai (c967018, le code de `main` après la 146 A), compte de
démo : un script Playwright hors du dépôt mène le Live interactif de Mme Garcia (Vence, 5
concurrents, rythme accéléré : 4 écrans pour les trois premiers, 2 ensuite) puis la présentation
directe de M. et Mme Bernard (dossier en anglais), et à chaque écran mesure aux trois tailles le
bas du contenu face au haut de la barre du bas (85 px). La démo est remise à zéro avant et après.

En pixels : ce qui passe sous la barre (donc ce qu'il faut faire défiler). Négatif : l'écran tient,
avec cette marge.

| Écran | 1024 × 768 | 1180 × 820 | 820 × 1180 |
| --- | ---: | ---: | ---: |
| Votre bien | **626** | **574** | **484** |
| Votre valeur perçue (saisie, puis « 350 000 € ? ») | −179 / −67 | −231 / −119 | −591 / −479 |
| Un sérieux concurrent ? (étape 1 sur 4) | **414** | **362** | **450** |
| À quel prix ? (étape 2 sur 4) | **135** | **83** | −44 |
| Ce prix vous paraît-il cohérent ? (révélation) | **246** | **194** | **317** |
| Pourquoi toujours en vente ? — avant la durée | **578** | **526** | **398** |
| Pourquoi toujours en vente ? — durée révélée | **783** | **731** | **989** |
| Rythme accéléré, écran 1 (sérieux + prix deviné) | **468** | **416** | **89** |
| Rythme accéléré, écran 2 (prix révélé, durée) | **68** | **16** | −311 |
| Le DPE face au marché | −153 | −205 | −565 |
| Le concurrent le plus dangereux (5 concurrents) | **1 236** | **1 184** | **974** |
| Prix reformulé (saisie, puis confirmation) | −179 / −67 | −231 / −119 | −591 / −479 |
| Analyse des prix | **389** | **337** | **87** |
| Conclusion (« Sur quel prix partons-nous ? ») | **487** | **435** | **240** |
| La note de 1 à 10 | −162 | −214 | −574 |
| Présentation directe : Votre bien | **626** | **574** | **130** |
| Présentation directe : un concurrent | **390** | **338** | **35** |
| Présentation directe : le plus proche | **384** | **332** | −4 |
| Présentation directe : analyse des prix | **321** | **269** | **36** |

**13 écrans sur 17 défilent en paysage, 11 en portrait.** Les quatre qui tiennent sont ceux d'une
seule question sans photo (valeur perçue, prix reformulé, DPE, note).

## Ce qui prend la place

- **Le cadre du Live** : en-tête (64 px) + progression (≈ 40 px) + barre du bas (85 px) = 189 px
  sur 768 avant le premier mot de l'écran.
- **La photo** : 352 px de haut sur tablette (`sm:h-88`), vignettes dessous (≈ 75 px).
- **La grille « Face à votre bien »** : 9 cartes de 85 px sur 3 colonnes (≈ 300 px), placée SOUS
  la photo et les réponses : en paysage, elle est entièrement sous la barre.
- **Les choix** : boutons de 56 px, et jusqu'à 80 px quand le libellé passe sur deux lignes (les
  7 raisons de la durée, les 4 réponses de « cohérent ? »).
- **Le commentaire facultatif**, toujours ouvert (≈ 90 px), sur 6 écrans.
- **« Votre bien »** : 16 caractéristiques en grandes valeurs (≈ 400 px), la description entière
  et les points forts.
- **Le plus dangereux** : une grande carte par concurrent (photo de 160 px), sur deux colonnes.

## Limites

Chromium, fenêtre aux tailles demandées (le contenu de la page, sans la barre d'adresse d'un
navigateur) ; la démo n'a que 5 concurrents (6 au plus au Live, M110) et des libellés courts ;
le Live en anglais n'a été mesuré qu'en présentation directe. La conclusion de la présentation
directe n'a pas été mesurée (le script s'est arrêté sur son bouton en anglais) : elle est la même
que celle du Live interactif.
