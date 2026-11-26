# MISSION 131 — La présentation directe

**Date** : 05/11/2026 · **Origine** : Jean-Guy : « certains vendeurs ne veulent pas jouer, dès le départ
ou en cours de route ; je dois pouvoir télécharger le PDF avec tous les concurrents, ou continuer le Live
sans interactivité, avec une formule qui ne vexe pas le client ». Feuille de route : `FEUILLE_DE_ROUTE_LA_BOUCLE.md`.

Équipe allégée (CLAUDE.md). Une branche, un `/valide`. Arrêt seulement si une migration est nécessaire.

## Le principe
Le conseiller ne dit jamais « vous ne voulez pas jouer » : il dit « je vous montre directement ». C'est
lui qui change de rythme ; rien à l'écran ne dit au vendeur qu'il a refusé quoi que ce soit.

## A. Trois façons de présenter
1. Sur « Avant le rendez-vous », un choix, mémorisé sur le dossier : **Live interactif** (par défaut,
   comme aujourd'hui) · **Présentation directe** · **Document seul**.
2. **Présentation directe** : le même Live, sans aucun écran qui demande quelque chose au vendeur
   (pas de valeur perçue, pas de devinette, pas de note de 1 à 10, pas de « le plus dangereux » à
   désigner). Chaque concurrent arrive avec son prix affiché d'emblée et sa grille comparée ; le
   conseiller commente. Le plus dangereux est proposé par le conseiller (un choix sur sa vue, le vendeur
   voit « Le concurrent le plus proche de votre bien »). Le prix et la conclusion restent identiques ; le
   Suivi fonctionne pareil, sans les mots du vendeur qui n'ont pas été recueillis (rien n'est inventé).
3. **Document seul** : pas de Live ; le conseiller télécharge l'« Étude de marché » (§ B) et conclut le
   rendez-vous depuis le dossier.

## B. Changer en cours de route
4. Dans le Live, un menu discret côté conseiller (le même que pour les réglages du Live) propose
   « Passer en présentation directe » : les écrans suivants deviennent directs ; ce qui a déjà été
   répondu est gardé. Retour possible (« Reprendre le Live interactif »).
5. Le même menu propose « Télécharger l'Étude de marché ».

## C. Le PDF « Étude de marché »
6. Un document A4, construit comme la synthèse (M113) et le Point marché (M127/M129) : couverture (le
   bien, la date, le conseiller), une fiche par concurrent retenu (photos au choix « Sans photo », grille
   comparée, prix affiché, jours en vente), la page « Où en est votre prix » au jour J (le classement de la
   M129, avec la position du prix proposé par le conseiller si elle existe, sinon sans verdict), les
   mentions. Jamais l'adresse d'un concurrent.
7. Téléchargeable depuis le dossier (Vue d'ensemble et Avant le rendez-vous) et depuis le menu du Live.
   Lien de partage comme la synthèse.

## Démo
Mettre à jour la démo (miroir du produit) : un dossier en « Présentation directe » jouable.

## Preuves
- Tests : le parcours de la présentation directe ne crée aucune réponse du vendeur ; le passage en cours
  de route garde les réponses déjà données.
- e2e : un Live passé en présentation directe au 3e concurrent va jusqu'à la conclusion ; le PDF se
  télécharge depuis le dossier et depuis le Live.
- Rendus : le PDF A4 (aucune page blanche ni coupée), le Live direct sur tablette.
