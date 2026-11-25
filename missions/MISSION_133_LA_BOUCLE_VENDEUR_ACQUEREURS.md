# MISSION 133 — La boucle vendeur → acquéreurs

**Date** : 06/11/2026 · **Origine** : Jean-Guy, 05/11 : « à partir de 5 acquéreurs prêts dans son pipe, un
compteur caché au Live ; en dessous, rien, même pas le bouton » et « l'outil doit être une vraie boucle ».
Feuille de route : `FEUILLE_DE_ROUTE_LA_BOUCLE.md`. S'appuie sur la 132 (« Prêt à visiter »).

Équipe allégée. Pas de migration attendue (tout se calcule à la lecture) ; si une devient nécessaire,
arrêt.

## Ce qui compte
1. **Un acquéreur correspond à un bien vendeur** quand le rapprochement existant (M118) le dit sur ses
   indispensables ★ et ses critères, avec le budget : prix du bien ≤ budget max + 5 % (règle M116
   acquéreur).
2. **Le compteur** = les acquéreurs **de toute l'agence**, non archivés, qui correspondent **et** sont
   « Prêt à visiter » (132 : financement validé, échange il y a moins de 30 jours, budget max).
3. Le prix de référence du bien : le prix retenu ensemble s'il existe, sinon l'analyse du conseiller,
   sinon le haut de la fourchette du conseiller.

## A. Sur le dossier vendeur (conseiller seul)
4. Vue d'ensemble et « Avant le rendez-vous » : un bloc « Acquéreurs de l'agence pour ce bien » :
   « 7 prêts à visiter · 3 autres correspondent ». La liste : nom, secteur, budget, « prêt » ou ce qui
   manque (financement en cours, à recontacter), lien vers la fiche. Sans correspondance : « Aucun
   acquéreur de l'agence ne correspond pour l'instant ». Ce bloc est la porte vendeur → acquéreurs de la
   boucle.
5. Même bloc sur la carte d'un mandat signé, dans le Suivi (lien « Acquéreurs · 7 »), et sur la fiche
   d'un acquéreur le chemin inverse existe déjà (« Rapprocher »).

## B. Le compteur caché au Live
6. **À partir de 5 acquéreurs prêts**, une petite pastille neutre (un point, sans chiffre ni texte) dans
   un coin de l'écran du Live, sur tous les écrans après l'introduction. Le vendeur n'y voit rien de
   lisible.
7. Le conseiller la touche : une bulle, visible du seul conseiller par sa taille et sa place, dit « 7
   acquéreurs prêts » et propose **« Montrer au vendeur »** ou « Fermer ».
8. **« Montrer au vendeur »** affiche en plein écran : « 7 familles cherchent un bien comme le vôtre et
   sont prêtes à visiter », puis jusqu'à 7 cartes anonymes : le secteur cherché, le budget en fourchette
   arrondie (« 700 – 800 k€ »), « financement validé », « cherche depuis 3 semaines ». Jamais un nom, un
   téléphone ou une adresse. Retour au Live là où il était.
9. **Sous 5, rien** : ni pastille, ni bulle, ni écran.
10. Le moment où le conseiller l'a montré est noté sur le Live (un horodatage, pour le Suivi : « 7
    acquéreurs montrés au rendez-vous ») ; s'il faut une colonne, arrêt pour la migration.
11. En présentation directe (131), la pastille est la même.

## C. Le mandat signé appelle ses acquéreurs
12. À la conclusion « mandat signé », une tâche entre dans « À faire aujourd'hui » (M130) : « Proposer le
    bien de M. Bernard à 7 acquéreurs prêts », qui ouvre la liste du § A avec, pour chacun, « Envoyer le
    lien » (le dossier acquéreur de la M119/M122 avec ce bien en tête de sa sélection). L'envoi groupé et
    l'alerte à chaque nouveau bien sont la mission 134.

## Démo
Le dossier de M. et Mme Bernard (Vence, 735 000 €) a 5 acquéreurs prêts (132) : la pastille apparaît.
Un dossier de démo sous 5 (Mme Garcia, si besoin en ajustant son prix ou son secteur) montre l'absence.

## Preuves
- Tests : correspondance (budget + 5 %, indispensables, archivés exclus), seuil 4/5, prix de référence.
- e2e : Live du dossier Bernard → pastille → « Montrer au vendeur » → 5 cartes sans nom ni téléphone →
  retour au même écran ; un dossier à 4 n'a pas de pastille.
