# MISSION 132 — La fiche en 30 secondes, et « prêt à visiter »

**Date** : 05/11/2026 · **Origine** : Jean-Guy, retours des agences : « leur CRM est si complexe qu'ils
n'y rentrent même plus leurs contacts, donc aucun rapprochement ne marche ». Feuille de route :
`FEUILLE_DE_ROUTE_LA_BOUCLE.md`. Prépare la 133 (compteur au Live).

Équipe allégée. Une migration probable : gardien-sql, arrêt, Jean-Guy applique.

## A. La fiche en 30 secondes
1. « Nouvel acquéreur » ouvre d'abord une **saisie rapide**, pensée pour le téléphone en sortant d'un
   appel, un seul écran : nom, téléphone, type de bien, secteur (villes), budget max, et deux ★ au plus
   (indispensables). Tout le reste est facultatif et se complète plus tard (« Compléter sa recherche »).
2. Les champs se remplissent au pouce : villes proposées depuis celles de l'agence, budgets en paliers,
   types en boutons. Objectif mesuré : une fiche créée en moins de 30 secondes (e2e chronométré).
3. Dès l'enregistrement, la fiche montre « n biens de l'agence correspondent » (le rapprochement
   existant) : le conseiller voit tout de suite que saisir rapporte.

## B. « Prêt à visiter »
4. Sur la fiche, deux informations nouvelles :
   - **Financement** : validé (accord de principe ou apport suffisant) · en cours · inconnu ;
   - **Dernier échange** : posé automatiquement par chaque geste daté (présentation, lien répondu,
     visite, relance) et par « J'ai eu l'acquéreur aujourd'hui » sur la fiche.
5. **Prêt à visiter** = financement validé + dernier échange il y a moins de 30 jours + au moins une
   recherche avec un budget. **Aucune condition de délai d'achat** (décision du 05/11). Un acquéreur
   prêt porte un badge « Prêt à visiter » dans la liste et sur sa fiche.
6. Sans échange depuis 30 jours, la fiche passe « À recontacter » et une tâche entre dans « À faire
   aujourd'hui » (M130) : « Reprendre contact avec la famille Keller ».

## Démo
La démo montre au moins 6 acquéreurs crédibles autour de Mougins, dont 5 prêts à visiter (pour que la
133 se démontre), téléphones en 06 39 98, e-mails en example.com.

## Preuves
- Tests : règle « prêt à visiter » (bornes 29/30 jours, financement en cours, sans budget) ; passage à
  « À recontacter ».
- e2e : saisie rapide sur 390 × 844 en moins de 30 s ; badge visible ; tâche de recontact.
