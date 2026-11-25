# MISSION 130 — Une seule prochaine étape

**Date** : 05/11/2026 · **Origine** : Jean-Guy : « dans le Suivi, on ne sait pas ce qu'il faut faire et
ce n'est pas logique ; côté acquéreur, il faut revoir l'UX et l'UI ». Parcours fait sur la production
(compte de démo) le 05/11 ; maquettes validées par Jean-Guy :
- `missions/maquettes/M130-suivi.png`
- `missions/maquettes/M130-fiche-acquereur.png`
Les notes jaunes des maquettes disent l'avant et l'après ; elles ne s'affichent pas.

**Correction de la maquette** : le Point marché est **mensuel** (décision du 05/11), pas tous les 15 jours.

Deux parties, une branche et un `/valide` chacune : A (Suivi) puis B (Acquéreur). Équipe complète.
Le designer compare chaque rendu à la maquette côte à côte. Arrêt seulement si une migration devient
nécessaire.

## Le principe

Chaque vendeur et chaque acquéreur montre **une seule prochaine étape, datée, et un seul bouton plein**.
Tout le reste devient des liens. Le bouton fait ce qu'il dit.

## Partie A — Le Suivi

### Constats (production, 05/11)
- « Relancer → », bouton principal d'un vendeur à relancer, ouvre la préparation du dossier
  (`/builder/[id]`) : rien n'y parle de relance.
- Chaque carte aligne 6 à 7 actions au même niveau : Relancer, Relancé aujourd'hui, Préparer un message,
  Mettre à jour les concurrents, Changer l'issue, Voir le détail des prix, Prospecter.
- Le haut de page met en vedette « −9 % écart moyen », puis le formulaire « Rapprochement acquéreur ».
- Après la signature, rien ne dit le travail restant.
- « Le chemin parcouru 425 500 → 405 000 → 393 000 » n'a pas de libellés.
- « Prêt à lancer 7 → 10/10 » et « La relecture des annonces est gratuite ; le premier Point marché
  s'écrira à la fin de la mise à jour » sont des phrases de machine.

### Ce qui change
1. **« À faire aujourd'hui »** en tête : une ligne par tâche due (aujourd'hui ou en retard), la plus
   ancienne d'abord, chacune avec son bouton. Les tâches :
   - relancer un vendeur à relancer, à sa date de prochaine relance (M105) ;
   - faire le Point marché d'un mandat signé : le premier un mois après la signature, puis un mois après
     le dernier point ;
   - démarcher les concurrents prêts d'un mandat signé (cartes « Prêt à envoyer » de Prospection) ;
   - planifier une visite acquéreur demandée sur un mandat de l'agence (M119).
   Sans tâche : « Rien à faire aujourd'hui. Prochaine tâche : … le … ». Le compteur du menu « Suivi »
   montre le nombre de tâches dues.
2. **Les compteurs** deviennent les filtres (Tous · Mandats signés · À relancer · Vendus ailleurs). Le
   « −9 % écart moyen » quitte le Suivi pour le tableau du manager. Le formulaire « Rapprochement
   acquéreur » quitte le Suivi : il vit dans le mode Acquéreur (fiche et partie B).
3. **Chaque carte** : à gauche, le vendeur, son bien, le chemin du prix avec ses libellés (« Il voulait
   → Après le marché → Prix proposé » pour un vendeur à relancer, « … → Prix signé » pour un mandat),
   et ce qui le retient (M96). À droite, « Prochaine étape · aujourd'hui / le 07/11 », une phrase, un
   bouton plein, puis trois liens au plus (Point marché, Détail des prix, Changer l'issue).
4. **« Relancer M. Martin »** ouvre la relance sur place : le message prêt avec ses mots (M96, « Préparer
   un message »), Copier / SMS / WhatsApp / E-mail, puis « J'ai relancé » qui enregistre la relance
   (« Relancé aujourd'hui ») et demande la prochaine date (M105). Plus aucun lien vers `/builder` depuis
   ce bouton.
5. **La frise d'un mandat signé** : Mandat signé ✓ → Concurrents démarchés (n/n) → Point marché (dû /
   le JJ/MM) → Visites acquéreurs (n). L'étape du jour en bleu, les faites en vert.
6. Les phrases de machine sont réécrites pour un conseiller (le designer propose, le relecteur vérifie).

## Partie B — La fiche acquéreur et le menu

### Constats
- La recherche de l'acquéreur n'est pas en tête (« Modifier sa recherche » tout en bas) ; ni son
  téléphone ni son e-mail ne sont visibles.
- Les étapes s'arrêtent à 3 : la visite n'y est pas.
- « En visite » est un bouton bleu plein à côté de « Présenter la sélection ».
- « Avant de présenter » : 4 zones de texte et 4 boutons « Enregistrer » sur la fiche.
- Le menu « Biens idéaux » refait la liste des acquéreurs.
- Rien ne dit ce qui s'est passé (présenté le, réponse, visites).

### Ce qui change
7. **En tête** : le nom, le statut en petit menu (En recherche ▾), ses mots (« Une maison de 6 pièces à
   … »), ses critères en étiquettes (indispensables ★ en jaune), « Modifier » ; à droite, son téléphone
   (lien `tel:`) et son e-mail, et « dernier échange il y a 2 j ».
8. **Quatre étapes** : Biens idéaux → Présenter → Sa réponse → Visites, avec l'état de chacune.
9. **« Prochaine étape »**, un bloc plein qui suit l'état : trouver les biens idéaux → présenter (ou
   envoyer le lien) → relancer sa réponse → planifier la visite → noter le retour de visite.
10. **Sa sélection** : photo, critères remplis, phrase, prix et son écart au budget (M116 acquéreur) ;
    « Changer la sélection » et « Relire les phrases avant de présenter ». Les zones de texte de
    « Avant de présenter » passent dans l'écran de présentation, avant le premier bien.
11. **« Ce qui s'est passé »** : un fil daté (fiche créée, biens retenus, présenté, réponse reçue, visite
    demandée, courrier, visite faite), lu dans les tables existantes, sans nouvelle donnée.
12. **« Rapprocher »** devient un bloc à droite : « Voir les correspondances · n », gratuit.
13. **Le menu Acquéreur** : Acquéreurs · Visites · Prospection. « Biens idéaux » quitte le menu (l'adresse
    `/biens-ideaux` renvoie vers `/acquereurs`).
14. **La liste des acquéreurs** suit le même principe : chaque ligne dit sa prochaine étape et sa date.

## Preuves
- Tests : calcul des tâches du jour (relance due, Point marché à un mois de la signature puis du dernier
  point, concurrents prêts, visite demandée) ; prochaine étape d'un acquéreur selon son état.
- e2e démo et parcours mis à jour (nouveaux libellés et boutons).
- Rendus : Suivi et fiche acquéreur en 1280 × 800, 1024 × 768, 390 × 844, à côté des maquettes ;
  chaque bouton plein visible sans défiler.

## Hors périmètre
- Les notifications (e-mail, téléphone) des tâches du jour ; le tableau du manager au-delà du « −9 % »
  qu'il reçoit.
