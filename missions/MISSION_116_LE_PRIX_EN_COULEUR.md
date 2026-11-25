# MISSION 116 — Le prix de commercialisation en couleur

**Date** : 24/10/2026 · **Origine** : Jean-Guy, 24/10 : « lorsque le client donne le prix qu'il pense de
commercialisation et que je valide, l'écran d'après m'affiche le prix de commercialisation en plus gros,
pourrait-on prévoir qu'en plus d'être plus gros il soit en couleur avec le titre […] rouge car il est
très éloigné du prix, il se rapproche en orange et il est prêt en vert ».

## Objectif

Dès que le prix de commercialisation est enregistré, le vendeur et le conseiller voient d'un coup d'œil
s'il est aligné sur l'analyse du conseiller, proche, ou éloigné.

## Critères d'acceptation (testables à l'écran)

1. **La règle**, dans un service pur (pas dans le composant), avec ses tests :
   écart = (prix de commercialisation − analyse du conseiller) / analyse du conseiller.
   - **vert** « Prix aligné sur le marché » : écart strictement inférieur à **+5 %** (4,99 % est vert),
     y compris tout prix inférieur à l'analyse du conseiller ;
   - **orange** « Proche du marché » : de **+5 % inclus** à strictement moins de **+10 %** (5 % pile est
     orange, 9,99 % est orange) ;
   - **rouge** « Éloigné du marché » : **+10 % inclus** et au-delà (10 % pile est rouge).
   Les seuils sont deux constantes nommées, au même endroit. Le calcul reprend
   `calculatePriceDeviation` (M-positionnement), jamais une nouvelle formule.
2. **Où** : sur l'écran qui suit la Conclusion du Live (le prix de commercialisation figé, « en plus
   gros »), le titre « Prix de commercialisation » ET le montant prennent la couleur, avec le libellé à
   côté du titre ; même chose dans la synthèse au vendeur, section 07 (M113), à l'écran, à l'impression
   et sur le lien public, avec les montants figés à la conclusion (M111).
3. **Sans analyse du conseiller enregistrée** (M109) : aucune couleur, aucun libellé, l'écran reste tel
   qu'aujourd'hui. Sans prix de commercialisation : rien non plus.
4. **Jamais la couleur seule** : le libellé est toujours là, lisible sur fond clair comme sur la scène
   sombre du Live (`stage:`), et à l'impression noir et blanc le libellé suffit.
5. Rien ne se recalcule après le rendez-vous : la couleur de la synthèse vient des montants figés.
6. Tablette : 768 × 1024 et 1024 × 768 sans défilement de côté (M72).
7. Vocabulaire : jamais « estimation » ; « Analyse du conseiller » reste le nom de la référence (M89).

## Preuves

8. Tests du service : 4,99 % vert, 5 % orange, 9,99 % orange, 10 % rouge, −20 % vert, référence absente
   → null, référence 0 → null ; tests du composant : titre et montant colorés, libellé présent, rien
   sans décision ; vocabulaire étendu aux trois libellés.
9. `npm run e2e` vert, tablette comprise : le parcours lit le libellé après la conclusion et dans la
   synthèse ; l'e2e `demo` aussi.

## Décisions à respecter

- M89 (un seul prix calculé devant le vendeur, « Analyse du conseiller »), M109 (sans décision, pas de
  prix final), M111 (montants figés), M113 (synthèse), M72 (tablette).
- Pas de migration : rien de nouveau en base, la couleur se déduit.
- On ne modifie ni `extension/` ni le Localisateur.

## Hors périmètre

- Une couleur sur « Votre valeur perçue » ou sur le prix révisé : seul le prix de commercialisation.
- Un seuil réglable par agence : les deux constantes suffisent, à revoir après le pilote.

## Essai sur l'URL d'essai

Sur le dossier d'exemple, analyse du conseiller à 400 000 € : conclure à 419 000 € → vert « Prix aligné
sur le marché » ; rouvrir (M104), conclure à 420 000 € → orange « Proche du marché » ; à 439 000 € →
orange ; à 440 000 € → rouge « Éloigné du marché » ; à 380 000 € → vert. Ouvrir la synthèse après le
dernier : section 07 en rouge avec le libellé, impression lisible. Sur un dossier sans décision de prix :
aucune couleur.
