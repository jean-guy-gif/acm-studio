# MISSION 163 A — L'Étude de marché se lit comme un fil conducteur : une idée par page, la conclusion en titre

**Date** : 20/11/2026 · **Origine** : décision de Jean-Guy (20/11), sur les dossiers Academia Secteur
(Cannes, Lord Byron) et « Mon secteur 2 » (Cagnes) : « pas une usine à gaz, un fil conducteur
logique, facile et adapté à tous les conseillers ». Remplace les variantes A et B de la maquette M163.

## Objectif

L'Étude de marché imprimée, et son lien public, suit l'ordre des questions du vendeur. D'abord ce
que voient ses acheteurs, puis ce qu'ils ont payé, puis la place de son prix, ce que l'acheteur
demandera, et enfin la suite.

## Maquette

Validée par Jean-Guy le 20/11/2026 : `missions/maquettes/M163-fil-conducteur/` (`etude.pdf`,
`planche-etude.png`, `NOTES.md` avant / après). Le générateur de la maquette (`build.py`, `style.css`)
y est rangé, avec les textes exacts.

## Critères d'acceptation (testables à l'écran et sur le PDF A4)

1. **Les pages, dans l'ordre.**
   - Couverture.
   - « Quatre choses que cette étude vous apprend ».
   - 01 Les biens en vente.
   - 02 Les ventes réelles.
   - 03 Où se place votre prix.
   - 04 Ce que votre acheteur demandera.
   - La suite.
   Chaque chapitre a un titre qui est sa conclusion, recomposé depuis les chiffres (« À 745 000 €, trois maisons en vente sont moins chères que la vôtre »). Sur chaque page : un bandeau, le détail, « L'avis de [conseiller], votre conseiller(ère) », la source.
2. **La couverture n'a plus de verdict.** Elle porte la photo du bien, « Votre [maison/appartement] à [commune] face au marché », la ligne du bien, « Préparée pour », le conseiller (photo, nom, agence, date, téléphone, e-mail). Remplace M129 pour l'Étude seulement ; le Point marché garde son verdict en couverture.
3. **La page 2 résume tout.**
   - 4 chiffres : les biens en vente, les ventes réelles, la place du prix, les sources.
   - Les conclusions numérotées avec leur page ; celle du prix arrive en tête, encadrée à la couleur de son tiers (M129).
   - « Comment cette étude est faite ».
   - « Et la valeur de votre [maison] ? » : l'étude ne la calcule pas. Avec un prix convenu, « nous l'avons retenu ensemble : X € » ; sinon « le prix, nous le fixons ensemble ».
4. **Concurrents, 3 par page**, une fiche jamais coupée, avec :
   - photo, libellé neutre, prix affiché, prix au m², jours en vente ;
   - « Face à votre [maison] » : SEULEMENT les lignes qui diffèrent, avec leur pastille (M129) ;
   - puis « Équivalent sur : … » ;
   - un bien sans différence : « Équivalent(e) à votre [maison] sur tous les critères. »
   « Sans photo » reste respecté.
5. **Ventes réelles.**
   - La frise montre toutes les ventes. Celles que le conseiller a cochées (M163 B) y sont numérotées et listées, sans limite : au-delà d'une page, le tableau continue sur la suivante, en-tête répété (M162).
   - Sans M163 B, la liste montre les 6 ventes les plus proches du bien en surface et en pièces.
   - « Comment lire ces chiffres », 3 lignes.
   - Aucune moyenne ni médiane (M159).
6. **Le classement** reste celui de la M129, sous son titre-conclusion, avec le verdict en encadré.
7. **Le quartier tient sur UNE page, à la fin.**
   - L'urbanisme et les permis en deux cases d'une phrase, les risques en grille, les habitants en une ligne, la copropriété en une case si le bien en a une.
   - « Comment en parler à un acheteur », 3 lignes.
   - Vivre ici (QR à l'impression, lien à l'écran).
   - Ni anneaux ni jauges à l'impression (remplace M162 pour l'Étude).
8. **La suite.**
   - 3 étapes : Aujourd'hui, La mise en vente, Chaque mois.
   - « Les papiers à réunir », selon le type : copropriété (PV d'AG, règlement) pour un appartement, assainissement pour une maison.
   - « Vos questions pour notre prochain échange » : lignes à l'impression seulement.
   - Le conseiller et son QR (M84), « Ce que cette étude est, et ce qu'elle n'est pas », les sources en tableau, les mentions de l'agence (M102).
9. **Un chapitre sans données disparaît** du résumé et de la numérotation : pas d'Academia, aucun bloc coché, pas de ventes, pas de prix pour le classement (remplace M162, « le titre reste »).
10. **Les phrases « L'avis de … », les titres-conclusions et les textes fixes** sont dans `src/lib/client-texts` (fr, en). Ils sont écrits, jamais par une IA, et composés depuis les chiffres : avantages du bien, nombre plus chers ou moins chers, inondation ou non. L'anglais va dans `docs/MODELES_A_RELIRE.md`. Le mot « estimation » n'apparaît jamais ; le test « jamais côté vendeur » passe.
11. **Le lien public** se lit sur téléphone (390 px) sans défilement de côté. L'écran conseiller de l'Étude ne change pas.

## Décisions à respecter

M51, M107 (liste d'autorisation, titre piège), M113 et M131 (Sans photo, ce qui n'est jamais montré),
M129 (tiers, couleurs), M140 A (langue), M159 et Correctifs 161 (échelles, rue de démonstration),
M162 (impression A4). Règle absolue : ni la valeur indicative ni le DPE de la vue « bien-client ».

## Hors périmètre

- Cocher les ventes une par une (M163 B).
- La synthèse et le Point marché, qui suivront les mêmes règles dans une mission à part.
- Rendre les avis modifiables par le conseiller (migration, `docs/IDEES.md`).

## Essai sur l'URL d'essai

E2E au premier plan, sur la démo remise à zéro, dossier de Mme Garcia :
- ouvrir l'Étude, l'imprimer en A4 et compter 8 pages dans l'ordre ;
- lire les titres-conclusions ;
- vérifier qu'aucune fiche n'est coupée ;
- ouvrir le lien public en 390 px ;
- refaire le tout sur le dossier des Bernard (en anglais).
