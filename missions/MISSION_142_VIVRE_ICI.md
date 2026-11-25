# MISSION 142 — Vivre ici

**Date** : 07/11/2026 · **Origine** : réunion Plaud du 03/11 (« Vivre ici », « justifier la sélection d'un
bien par son environnement ») et décision de Jean-Guy du 07/11 : « Vivre ici pour l'acheteur quand le bien
est retenu pour visiter ».

Équipe allégée. Données publiques et gratuites, côté serveur, jamais d'IA. Réutilise le géocodage et les
sources de la 141. Migration seulement si nécessaire.

## Quand
1. Dès qu'une visite est demandée ou planifiée pour un bien (M119), le bien gagne une fiche **« Vivre
   ici »**, visible du conseiller sur la visite et envoyée à l'acquéreur avec la confirmation de visite et
   dans son dossier (lien, M122), dans sa langue (M140, français et anglais).
2. Jamais l'adresse exacte d'un bien qui n'est pas de l'agence (M119) : les distances partent du centre du
   quartier pour un bien du marché, de l'adresse pour un mandat de l'agence.

## Ce qu'elle contient
3. **Au quotidien, à pied** : boulangerie, supermarché, pharmacie, médecin, école maternelle et
   élémentaire, collège, lycée — le plus proche de chacun, avec sa distance à pied en minutes
   (OpenStreetMap ; annuaire de l'Éducation nationale pour les écoles).
4. **Se déplacer** : arrêt de bus ou gare le plus proche, temps en voiture jusqu'à 2 lieux utiles du
   secteur (la gare TGV, l'aéroport, le centre-ville), et un lieu choisi par l'acquéreur s'il l'a donné
   (son travail, l'école de ses enfants : un champ facultatif de sa fiche).
5. **Le calme et l'environnement** : bruit (cartes de bruit si disponibles), espaces verts proches, et les
   risques de la 141 résumés en une ligne.
6. **Ce qui compte pour lui** : si sa recherche a des ★ liées au secteur (calme, écoles, commerces à pied),
   la fiche les met en tête et dit si le bien les remplit.

## Démo
« Vivre ici » pour la visite des Keller à Mougins et pour Mr and Mrs Wilson, en anglais ; pré-construites.

## Preuves
- Tests : choix du plus proche, minutes à pied, adresse exacte jamais montrée pour un bien du marché.
- e2e : une visite demandée → la fiche « Vivre ici » → le lien de l'acquéreur la montre.
