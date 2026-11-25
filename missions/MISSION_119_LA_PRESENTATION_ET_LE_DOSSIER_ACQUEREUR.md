# MISSION 119 — La présentation et le dossier acquéreur

**Date** : 24/10/2026 · **Origine** : Jean-Guy, 24/10 : « le live pour l'acquéreur servirait en rendez-vous
de découverte à présenter les biens pour déclencher en live des visites, ou bien de pouvoir télécharger
le PDF à envoyer à l'acheteur si le client n'est pas là ». Dossier stratégique du 22/10, étapes 4 et 6.
Vient après le `/valide` de la 118 partie B (la sélection de biens existe).

Deux parties, **une branche et un `/valide` par partie**, A puis B. Pas de push forcé. `npm run sauvegarde`
avant la migration (A), soumise avant d'être appliquée, comptage avant et après. Pas de `/valide` sans CI
verte ni e2e vert.

## Décisions prises pour cette mission (Jean-Guy, 24/10)

- **Deux sorties pour la même sélection** (M118) : la **présentation**, face à l'acquéreur, et le
  **dossier**, PDF et lien, quand il n'est pas là. Une seule source : la sélection retenue.
- **Le prix affiché de chaque bien figure toujours**, à l'écran comme dans le dossier : un acquéreur à
  qui l'on cache le prix se méfie, et un document qui montre un bien sans prix peut valoir publicité
  incomplète (dossier du 22/10, §10.1).
- **Ce n'est pas le Live vendeur** : ni devinette, ni révélation, ni valeur perçue. On montre, on
  explique pourquoi ça correspond, on écoute, on note.

## Partie A — La présentation, en rendez-vous

1. Sur la fiche, **« Présenter la sélection »** ouvre, plein écran comme le Live (`/presentation/[buyerId]`,
   scène de M72, couleurs et logo de l'agence) : un écran d'ouverture (« Votre recherche », les critères
   validés, prénom de l'acquéreur), puis **un bien par écran**, dans l'ordre de la sélection :
   - photos (celles de l'annonce ou du dossier vendeur, M58), libellé neutre, commune, prix affiché, prix
     au m², surface, pièces et chambres, extérieur, parking, DPE ;
   - **« Pourquoi ce bien correspond à votre recherche »** : les indispensables satisfaits, un par ligne,
     repris des mots de la fiche (M117) ; puis **« À savoir »** : les écarts nommés par la 118, jamais
     cachés ; « affiché le [date] », jamais « disponible » ;
   - un bouton **« Demander une visite »** que le conseiller touche quand l'acquéreur le dit ; il devient
     « Visite demandée » et s'annule d'un second geste pendant la présentation ;
   - un écran de fin : « Quels biens souhaitez-vous visiter ? » qui récapitule les demandes, puis
     **« Terminer »**.
2. Jamais devant l'acquéreur : ni titre d'annonce, ni adresse exacte (commune et quartier seulement), ni
   lien, ni « Vendu par », ni nom d'agence concurrente, ni exclusivité (M75, M83, M107), ni la fourchette
   d'un dossier vendeur, ni le prix de commercialisation convenu avec un vendeur, ni « estimation ».
3. **Chaque demande de visite est un fait daté** : table `buyer_visit_requests` (buyer_id,
   buyer_selection_item_id, agency_id, requested_at, requested_during ('presentation' | 'dossier' |
   'conseiller'), cancelled_at, visited_at, feedback text, outcome ('to_plan' | 'visited' | 'declined' |
   'offer')). Migration avec RLS par agence, écriture par le serveur seul ; test SQL en CI.
4. **La page Visites** du mode Acquéreur (M118, entrée réservée) : les demandes à planifier, les visites
   faites et leur retour, par acquéreur ; « Visite faite » avec un retour libre et une issue ; une
   visite sur un **concurrent** ou une **exclusivité** porte le rappel « Propriétaire ou confrère à
   contacter » (le courrier est la M120).
5. La présentation se relit après coup (lecture seule, « Terminé le [date] »), ne se recalcule pas : prix
   et écarts figés au moment de la sélection (M111).

## Partie B — Le dossier, PDF et lien

6. Sur la fiche, **« Dossier acquéreur »** : la même sélection, dans la forme de la synthèse vendeur
   (M113) : couverture (prénom, « Votre sélection du [date] », secteur), rappel de la recherche, une
   fiche par bien (photo, prix, caractéristiques, « Pourquoi ce bien correspond », « À savoir »), et une
   dernière page **« Quels biens souhaitez-vous visiter ? »** avec les trois biens à cocher, le
   conseiller (nom, téléphone, e-mail, QR de contact, M84) et les mentions de l'agence (M102).
7. **Impression A4** propre, un bien par page ; **lien public** sans compte, 30 jours, retirable (M110),
   `noindex`, lisible sur téléphone ; les photos passent par des liens signés (M113).
8. Sur le lien public, l'acquéreur **coche les biens qu'il veut visiter** et envoie : chaque coche crée
   une demande (`requested_during = 'dossier'`), visible sur Visites, sans compte ni e-mail ; le
   conseiller est le seul à y donner suite. Aucune autre saisie que ces coches.
9. Le dossier porte « Les prix cités sont ceux des annonces. Surfaces et caractéristiques telles
   qu'annoncées, à vérifier. » ; « Sans photo » par bien, comme la synthèse (M113).
10. `/confidentialite` dit le dossier acquéreur, son lien, les coches de visite et la photo tirée de
    l'annonce. Texte signalé pour la relecture juridique.

## Preuves

11. Tests : rien n'est révélé devant l'acquéreur (test « jamais côté acquéreur » sur présentation,
    dossier et lien, titre piège M107 compris) ; demande de visite créée, annulée, datée ; retour et
    issue ; dossier et lien lisent la sélection figée ; coches du lien → demandes ; vocabulaire.
12. `npm run e2e` vert, tablette comprise : présentation de 2 biens, une visite demandée, Visites la
    montre ; dossier, lien ouvert sans compte, une coche, Visites la montre, lien retiré. L'e2e `demo`
    présente la sélection de la famille Keller.

## Décisions à respecter

- M58, M72, M75, M83, M84, M102, M107, M110, M111, M113, M117, M118. Jamais « estimation ».
- On ne modifie ni `extension/` ni le Localisateur.

## Hors périmètre

- Les courriers propriétaire et confrère issus d'une visite (M120) ; la planification d'un créneau de
  visite ; la micro-analyse de secteur ; l'apprentissage des retours.

## Essai sur l'URL d'essai

- **A**, compte démo, famille Keller avec sa sélection : « Présenter la sélection » → ouverture → un bien
  par écran, prix, « Pourquoi », « À savoir » → « Demander une visite » sur le 2e → fin → « Terminer » ;
  Visites montre la demande ; « Visite faite », retour, issue. Aucun titre, aucune adresse, aucun
  « Vendu par » à l'écran.
- **B** : « Dossier acquéreur » → imprimer en PDF, un bien par page → « Créer le lien » → l'ouvrir sans
  compte sur un téléphone → cocher un bien → Visites montre la demande « depuis le dossier » → retirer
  le lien : il ne s'ouvre plus.
