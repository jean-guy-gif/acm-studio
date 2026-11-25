# MISSION 148 — Le Live d'un coup d'œil : chaque écran tient sur la tablette, la réponse du vendeur se lit en couleur, la frise de la synthèse se lit

**Date** : 08/11/2026 · **Origine** : trois retours de terrain de Jean-Guy (08/11) ; mesure
`missions/M148-mesure-du-live.md` : 13 écrans du Live sur 17 défilent sur tablette en paysage,
jusqu'à 1 236 px (le plus dangereux) ; la frise de la synthèse du dossier 868af175 (essai) mêle
ses étiquettes et met deux repères hors de son échelle.

**Deux parties** (Jean-Guy, 08/11), une branche et un `/valide` chacune : **A, la frise de la
synthèse** (point 3) ; **B, le Live sans défilement et la couleur de la devinette** (points 1 et 2).
**Maquettes validées** par Jean-Guy le 08/11. **Sans migration.** Équipe allégée : relecteur une
passe, e2e joué par le chef.

## Objectif

Devant le vendeur, tout se voit d'un coup d'œil : aucun écran du Live ne défile sur tablette, sa
réponse face au prix affiché se lit en couleur, et la frise de la synthèse est lisible.

## Maquettes

`missions/maquettes/M148-1` à `M148-7` (`.png`, source `M148-generateur.mjs --png`). Avant : les
captures de la mesure (`M148-avant/`) ; après : chaque écran à sa taille réelle.

| Planche | Écran | Partie |
|---|---|---|
| 7 | Synthèse : la frise, avant / après, sur les prix du dossier 868af175 et des prix serrés | A |
| 1 | Votre bien | B |
| 2 | Un concurrent avant son prix (4 écrans et rythme accéléré) | B |
| 3 | La révélation : prix affiché, réponse en couleur, écart écrit ; présentation directe | B |
| 4 | « Pourquoi toujours en vente ? », durée révélée | B |
| 5 | Le plus dangereux, l'analyse des prix, la conclusion | B |
| 6 | Synthèse : la couleur sur chaque concurrent deviné, écran, PDF, téléphone | B |

Les planches B sont dessinées aux tailles de l'écran entier ; la partie B les ajuste aux fenêtres
de Safari (réponse 5) avant de coder, et les montre si la disposition en change.

## Partie A — la frise de la synthèse (point 3)

1. Les deux frises de la synthèse au vendeur, « L'analyse des prix » et « Le chemin de votre
   prix » : l'échelle va du plus petit au plus grand de tout ce qui est montré (prix et repères),
   et les deux bornes écrites sous la frise sont ces deux montants. Rien ne sort de l'échelle.
2. Deux repères au même montant n'ont qu'une étiquette : « Après le marché · Convenu ensemble
   129 000 € ».
3. Chaque étiquette, rangée par montant, se place au-dessus de la frise, sinon au-dessous, reliée à
   son repère par un trait ; près d'un bord, elle s'ancre du côté où elle a la place (M115). Si
   elles ne tiennent pas sur ces deux rangées, la frise porte des repères numérotés et la légende
   dessous dit chacun avec son montant. Jamais deux textes l'un sur l'autre, jamais une étiquette
   hors de la frise, à l'écran, sur téléphone (lien public) et dans le PDF.
4. Un service pur range les étiquettes à partir de leur largeur estimée et de la largeur de la
   frise ; ses tests, avec des prix à 100 € d'écart et quatre repères, prouvent à 390 et à 794 px
   qu'aucune boîte n'en touche une autre et que l'échelle contient chaque prix et chaque repère.
5. L'e2e lit la synthèse de la démo et mesure dans le navigateur : étiquettes sans chevauchement,
   dans la frise.
6. L'analyse du conseiller n'est pas un repère de la frise (réponse 8) ; la frise du Live (« Analyse
   des prix ») ne change pas ; rien d'autre de la synthèse ne change.

## Partie B — le Live sans défilement, la couleur de la devinette (points 1 et 2)

1. Aux fenêtres de Safari sur tablette — 1024 × 700, 1180 × 750, 820 × 1110 (réponse 5) —, aucun
   écran du Live ne défile, en Live interactif (4 écrans et rythme accéléré) comme en présentation
   directe, en français et en anglais (M140) : photo, prix quand il est montré, caractéristiques et
   leurs pastilles, réponses et « Valider » visibles ensemble. En-tête et progression sur une bande,
   barre du bas à 72 px ; la photo prend la hauteur qui reste, ses vignettes dedans. Sur téléphone,
   compacté au mieux, le défilement reste permis (réponse 1).
2. La grille « Face à votre bien » devient une bande de pastilles compactes : la couleur porte le
   statut, avec « · pour vous » / « · pour lui » dans le libellé ; jamais la couleur seule (M129).
3. « Commentaire (facultatif) » devient « + Ajouter un commentaire », qui ouvre le champ sur place
   (réponse 3) ; la description du bien quitte « Votre bien » (réponse 4) ; libellés courts devant
   le vendeur, en français et en anglais (réponse 7) : « Oui, cohérent », « Trop élevé », « Trop
   bas » ; « Rapport qualité/prix », « Localisation », « Prestations ». Rien d'autre ne disparaît ;
   aucune règle du Live ne change (M51, M82, M92, M95, M107, M110, M131) ; aucune donnée en plus
   n'est livrée au navigateur.
4. L'écart d'une devinette se calcule sur le prix affiché du concurrent : (réponse − prix affiché)
   ÷ prix affiché, et s'écrit « Votre réponse : 5,4 % en dessous du prix affiché » (réponse 2). Le
   même calcul partout : la révélation, le plus dangereux, « Revoir », la synthèse et le bilan
   (« Vous avez sous-estimé … de N % en moyenne », Suivi et synthèse). Il remplace la base de M96
   (« en % de la devinette »), ses tests suivent, et le changement entre dans DECISIONS.
5. À la révélation (« Ce prix vous paraît-il cohérent ? », « Voici son prix. »), sur les cartes du
   plus dangereux et dans « Revoir » : « Votre réponse » en couleur, l'écart écrit et son montant.
   Écart sans son signe, sans arrondi : vert sous 5 %, orange de 5 % inclus à moins de 10 %, rouge
   à 10 % et au-delà (réponse 6, comme M116). Un seul service pur, deux seuils nommés.
6. Aucune couleur pour un « Non », une réponse à 0 € (M96) ou une présentation directe.
7. La synthèse au vendeur : même règle, même service, mêmes mots, sur les montants figés (M111), à
   l'écran, sur le lien public et à l'impression ; lisible en noir et blanc.
8. E2E : une spec mène les Lives de démo (interactif et directe) et, à chaque écran traversé,
   vérifie aux trois fenêtres qu'il ne défile pas (`expectNoVerticalScroll`, à côté de
   `expectNoHorizontalScroll`) ; elle lit les trois couleurs sur les devinettes.

## Décisions à respecter

M51, M107 (rien de l'annonce), M92 et M144 (réponses figées, Live sans trou), M95 (rythme), M96
(dont la base change en partie B), M110 et M113 (6 concurrents au plus, « Revoir »), M111 (montants
figés), M113 (la synthèse, une fiche ne se coupe jamais), M115 (repères nommés), M116 (seuils), M129
(code de la grille), M131 (directe), M140 (anglais), M143 (contraste, un seul bouton plein).

## Hors périmètre

Le Point marché et l'Étude de marché ; la frise du Live, déjà juste ; la présentation acquéreur ;
une migration ; tout texte juridique. Démo : rien à changer, elle montre déjà les trois couleurs.

## Réponses de Jean-Guy (08/11)

1. Téléphone : la règle stricte vaut pour la tablette seule.
2. L'écart se calcule sur le prix affiché : « Votre réponse : 5,4 % en dessous du prix affiché » ;
   même calcul partout, M96 et ses tests adaptés, noté dans DECISIONS.
3. Oui pour « + Ajouter un commentaire ».
4. La description quitte « Votre bien ».
5. Pas de plein écran : le conseiller est dans Safari ou Chrome ; l'e2e vérifie 1024 × 700,
   1180 × 750, 820 × 1110.
6. 5 % pile en orange, 10 % pile en rouge, comme M116.
7. Libellés courts, en français et en anglais.
8. Pas d'analyse du conseiller (125 000 €) sur la frise.
9. Deux parties : A la frise, B le Live et la couleur. Maquettes validées.
