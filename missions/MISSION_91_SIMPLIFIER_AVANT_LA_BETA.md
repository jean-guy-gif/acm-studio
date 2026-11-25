# MISSION 91 — Simplifier avant la bêta

**Date** : 11/10/2026 · **Origine** : audit stratégique du 11/10/2026, section « À simplifier,
regrouper, supprimer ou reporter ». Laurent a retenu la liste ci-dessous et validé la maquette
`missions/maquettes/M91-avant-le-rdv.png` (source HTML à côté, données d'exemple) : « je valide ».

## Objectif

Moins d'écrans et moins de champs pour le conseiller, sans rien retirer à la méthode du Live :
- un seul écran « Avant le rendez-vous » à la place de trois ;
- une fiche du bien qui montre d'abord l'essentiel ;
- du code et des libellés en moins.

## Critères d'acceptation

### A. Un seul écran « Avant le rendez-vous » (maquette M91)

1. Un nouvel écran, `/builder/[id]/avant-rendez-vous`, remplace « Analyse des comparables »,
   « Positionnement du prix » et « Présentation vendeur ». Les trois anciennes adresses redirigent
   vers lui. Sur la page du dossier, les étapes 3, 4 et 5 deviennent une seule étape, « Avant le
   rendez-vous ».
2. En haut : le nom du dossier, puis des pastilles d'avancement (bien vendeur, concurrents retenus,
   prix et surface, décision enregistrée). Chaque pastille est cochée ou à faire. Un badge résume :
   « Prêt » ou « Presque prêt ».
3. Bloc « Le marché en un coup d'œil », calculé sur les concurrents retenus :
   - quatre chiffres : prix médian au m², prix affichés (le plus bas et le plus haut), ancienneté
     médiane, nombre de concurrents qui ont déjà baissé ;
   - le prix au m² de chaque concurrent, en points, autour de la médiane ;
   - « Voir l'analyse détaillée ▾ » déplie le contenu actuel de l'analyse (tableaux, valeurs
     aberrantes), sans rien perdre.

   Un chiffre qui manque ne s'affiche pas, il n'est jamais inventé.
4. Bloc « Votre décision » :
   - « Prix des concurrents » (calculé, modifiable), avec sa formule en petit ;
   - « Votre analyse de valeur » ;
   - « Justification ».

   Sous les deux derniers champs : « Affiché au vendeur à la fin du Live ». Bouton « Enregistrer la
   décision ». Les règles de « prêt » ne changent pas.
5. Bloc « Ce que verra le vendeur » :
   - le déroulé du Live calculé pour ce dossier, avec le nombre d'écrans par partie et le total ;
   - une durée estimée, « environ », sur la base de 1,25 à 1,7 minute par écran. C'est une
     estimation, à recaler sur les vrais rendez-vous ;
   - les avertissements de l'actuelle page « Présentation vendeur » (par exemple « 1 concurrent
     sans DPE ») ;
   - le bouton principal « Lancer le Live → ».
6. « Aperçu côté vendeur » : si un aperçu sans enregistrement existe déjà, il l'ouvre. Sinon, le
   bouton déplie la liste des écrans avec leurs titres, sans aucun prix. Ne pas créer de nouveau
   mode d'aperçu : le dire dans le compte rendu.
7. Tablette (M72) : les blocs passent l'un sous l'autre, rien ne déborde.

### B. La fiche du bien vendeur

8. Visibles d'emblée : l'import, puis les champs utiles au Live et à la recherche (type, surface,
   pièces, chambres, étage, ville et adresse, DPE, extérieur, stationnement, état), puis la
   fourchette du conseiller **juste en dessous** (M38).
9. Diagnostics, copropriété, données financières et argumentaire sont repliés sous
   « Compléments (facultatif) ». Le bloc s'ouvre seul si l'un de ses champs est rempli. Rien n'est
   supprimé en base.

### C. « Prix souhaité vendeur »

10. Le champ disparaît de la préparation, et la ligne « Votre prix souhaité (enregistré) » disparaît
    de la fin du Live. La valeur perçue recueillie au début du Live suffit (M82). La colonne reste en
    base, sans migration, et les valeurs déjà saisies ne s'affichent plus.

### D. Prospection et Suivi

11. Il ne reste qu'une seule tournée imprimable : `/prospection/tournee`, avec le filtre par bien
    vendeur. L'adresse `/builder/[id]/prospection` y redirige, filtrée sur ce bien.
12. Le compteur « Mandat rentré grâce à la prospection » devient « Mandats rentrés (déclarés) ».
13. Le badge « NOUVEAU » disparaît de la barre latérale.
14. Le rapprochement acquéreur ne change pas.

### E. Nettoyage du code

15. Supprimés :
    - `src/features/live-presentation/` (code mort) ;
    - `src/app/design-preview/` et son entrée dans `public-paths.ts` ;
    - `projects/queries/get-projects.ts` ;
    - `comparables/actions/move-comparable.ts`.

    Avant chaque suppression, vérifier qu'aucun import ne subsiste.
16. Les tables créées au départ et jamais lues ni écrites (`audit_logs`, `exports`,
    `meeting_scripts`, `meeting_sessions`, `perception_results`, `reports`, `seller_answers`) :
    - compter leurs lignes ;
    - si toutes sont vides, les supprimer par une migration soumise avant d'être appliquée ;
    - s'il y a des lignes, ne rien supprimer et le dire.

    Même chose pour la colonne `public_listing_url`.

### F. Fin

17. Si les déploiements Vercel ont encore échoué sur une autre police depuis la mission 90,
    embarquer aussi les autres polices. Sinon, ne rien faire.
18. Les tests e2e sont adaptés au nouvel écran. `npm run e2e` vert, tablette comprise.

## Décisions à respecter

- Méthode du Live intacte : le Live lui-même ne change pas. Seule la ligne « prix souhaité »
  disparaît de sa fin.
- M38 (fourchette juste après l'import), M77 (enregistrement en un geste), M89 (« Prix des
  concurrents », mentions « Affiché au vendeur »), M90.
- Vocabulaire : « Concurrent », jamais « comparable » à l'écran.

## Hors périmètre (reporté après la bêta, décision du 11/10)

- « Chercher encore », biens neufs en complément, apprentissage par motif d'exclusion.
- Rythme accéléré du Live, réglage des critères de recherche.

## Essai sur l'URL d'essai

1. Ouvrir un dossier : une seule étape « Avant le rendez-vous », et l'écran ressemble à la
   maquette.
2. Les anciennes adresses d'analyse, de positionnement et de présentation y mènent.
3. Enregistrer une décision : le dossier passe « Prêt ». « Lancer le Live » ouvre le Live.
4. Sur la fiche du bien, les compléments sont repliés, et la fourchette est juste sous les champs
   essentiels.
5. Plus aucun « Prix souhaité vendeur », ni en préparation ni à la fin du Live.
6. Prospection : une seule tournée, « Mandats rentrés (déclarés) », plus de badge « NOUVEAU ».
7. Sur tablette, l'écran « Avant le rendez-vous » est lisible.
