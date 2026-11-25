# MISSION 120 — « J'ai un acquéreur pour votre bien »

**Date** : 26/10/2026 · **Origine** : dossier stratégique du 22/10 (§10.2 et §10.3) et décision de Jean-Guy du
24/10 : « une seule découverte acquéreur produit des visites, des courriers propriétaire et des collaborations
confrère ». Quatrième mission du mode acquéreur (117 fiche → 118 biens idéaux → 119/122 présentation et
dossier → **120 actions dérivées**). La 121 (photo des notes) attend toujours.

Une branche, un `/valide`. `npm run sauvegarde` avant la migration, gardien-sql avant mon accord. Relecteur,
testeur et rendus ; Jean-Guy et son relecteur produit font le parcours dans le navigateur avant l'essai.

## Objectif

Quand un acquéreur veut visiter un bien qui n'est pas un mandat de l'agence, le conseiller prépare en un clic
le bon courrier : au **propriétaire** (bien sans exclusivité) ou au **confrère** (bien en exclusivité), à
partir de la visite demandée, et le retrouve dans la même Prospection que le mode vendeur.

## Ce qui déclenche, et pour quel bien

1. Sur **Visites** (M119) et sur la fiche acquéreur, chaque visite demandée porte l'action qui convient à
   l'origine du bien :
   - **mandat signé de l'agence** : aucune action nouvelle (« Proposer une visite », M86) ;
   - **vendeur à relancer** : « Rappeler : j'ai un acquéreur » (M86, inchangé) ;
   - **concurrent à prospecter** ou **annonce du marché**, **sans exclusivité** : « Préparer le courrier au
     propriétaire » ;
   - **en exclusivité** : « Préparer le dossier de collaboration au confrère » ;
   - **exclusivité inconnue** : le conseiller choisit l'un ou l'autre, rien n'est supposé (CLAUDE.md : jamais
     de donnée inventée).
2. Un même bien n'a qu'**une** carte de Prospection (M98, M111) : s'il y est déjà comme concurrent d'un
   dossier vendeur, la carte existante reçoit en plus l'origine « Recherche acquéreur : [nom de la fiche] » ;
   sinon une carte naît, rattachée à la fiche acquéreur et au bien retenu (la ligne de sélection, M118 : pas
   de concurrent sans dossier vendeur).

## Les deux documents

3. **Courrier au propriétaire** — reprend le courrier de prospection existant (M90, M102, M115 : mentions,
   carte professionnelle, opposition, photo au choix) avec un texte propre à l'acquéreur, modifiable :
   « J'accompagne une recherche qui correspond aux caractéristiques de votre bien : [type, pièces, surface,
   extérieurs que la fiche demande et que le bien a]. Je souhaiterais vérifier avec vous si une visite est
   envisageable. » Jamais le nom de l'acquéreur, jamais son budget, jamais « acquéreur certain », « offre »,
   « visite prête » (dossier du 22/10, §10.2, garde-fou). Adresse : celle du Localisateur (M75), confirmée
   comme pour tout courrier propriétaire ; sans adresse confirmée, la carte attend (« Adresse à confirmer »).
4. **Dossier de collaboration au confrère** — reprend la version confrère (M98) : identification du
   conseiller et de l'agence, projet anonymisé (type, secteur, critères qui correspondent), la question précise
   (« Votre mandat est-il ouvert à la collaboration pour une visite de mon acquéreur ? »), aucune condition
   présumée (ni partage d'honoraires, ni droit de visite). Pas d'adresse requise (M98, M108). La suite est
   celle de la 115 C : contacté → collaboration obtenue (la visite s'organise) ou refusée (le bien repasse
   en courrier propriétaire, avec la phrase de refus).
5. Les deux s'impriment à l'unité et en lot, entrent dans la tournée (propriétaire), respectent « Ne plus
   solliciter » partout (M109, M111), et la photo de l'annonce reste au choix du conseiller (M115).

## Le suivi

6. Prospection montre l'origine de chaque carte (« Dossier vendeur : M. Lefebvre » / « Recherche acquéreur :
   Famille Keller ») et un filtre par origine ; le tableau du manager compte à part les courriers issus d'une
   recherche acquéreur et leurs suites (rendez-vous, mandat, collaboration).
7. Sur la visite (Visites et fiche), l'état du courrier est relu : « Courrier prêt », « Remis le … »,
   « Collaboration obtenue », « Mandat rentré ». Quand la collaboration est obtenue ou le mandat rentré, la
   visite passe à « À planifier » sans autre geste.

## Reprises de la partie A (parcours de Jean-Guy en production, 29/10)

À faire **en tête de la partie B**, avant le confrère. Constats faits sur `acm-studio-henna.vercel.app`, compte
de démo, après le passage du testeur (rendus `acm-studio-rendus/mission-120/`).

R1. **Courrier au propriétaire : « Télécharger le PDF » et « Enregistrer » sont inatteignables en 1280 × 800
    et en 1024 × 768.** Le panneau de gauche est `sticky` ; avec le titre, la lettre, l'accroche et les
    photos, ses deux boutons tombent sous le pli (haut du bouton à 801 px) et le défilement de la page ne
    les ramène jamais. Un MacBook Air est en 1280 × 800. Attendu : les boutons toujours visibles (barre
    d'actions en haut du panneau ou fixée en bas), et le panneau qui défile lui-même s'il dépasse la hauteur
    de la fenêtre. Le testeur n'a pas vu le défaut parce que sa capture est « pleine page » : ajouter à
    `.claude/agents/testeur.md` une vérification que toute action principale est dans la fenêtre sans
    défilement aux trois tailles (`getBoundingClientRect` dans le viewport).
R2. **Aperçu A4 coupé à droite** en 1024 × 768 (colonne de 568 px pour une feuille de 794 px) et en
    390 × 844. Attendu : la feuille réduite à l'échelle de la colonne (`transform: scale`), jamais coupée,
    jamais de défilement horizontal.
R3. **Photos de la démo liées à l'hôte de la remise à zéro.** « Remettre ma démo à zéro » enregistre les
    photos des annonces en URL absolue de l'hôte courant (`https://acm-studio-essai.vercel.app/demo/photos/…`).
    Faite depuis l'essai (protégé par Vercel), la démo montre ensuite « Photo indisponible » en production :
    lien acquéreur (biens B et C), vignettes B et C de la grille des critères, « Photo de son bien » du
    courrier. Attendu : chemins relatifs (`/demo/photos/villa-05.jpg`) résolus à l'affichage, ou l'hôte de
    production fixé en configuration. Vérifier aussi les autres chemins que la remise à zéro écrit.
R4. **Carte de Prospection à deux origines** (concurrent d'un dossier vendeur *et* recherche acquéreur) :
    le bouton bleu est « Préparer le dossier » (synthèse vendeur) et le courrier acquéreur n'est qu'un mot
    souligné dans la ligne d'origine. Attendu : les deux actions au même rang, « Préparer le dossier » et
    « Préparer le courrier ».
R5. Page du dossier acquéreur d'une fiche qui n'existe plus (supprimée par une remise à zéro pendant qu'elle
    était ouverte) : « Créer un nouveau lien » répond « Pas de dossier sans sélection retenue ». Attendu :
    « Cette fiche n'existe plus » et retour à la liste.

Conforme au parcours, à garder tel quel : couverture du lien, grille des critères, réponse en une fois
(B à visiter, créneau, A peut-être, C « Le prix »), Visites « À planifier · Samedi matin », lettre sans nom ni
budget ni promesse, Prospection « Prêt à envoyer » → « Marquer remis » → « Remis le 29/10 · relance le 05/11 »,
visite « En attente du propriétaire · Remis le 29/10 · Ouvrir le courrier », origine rattachée au comparable
existant (une carte par bien), feuille A4 avec QR et mentions.

## Base

8. Ce qu'il faut pour rattacher une carte de Prospection à une ligne de sélection acquéreur (origine, fiche,
   bien retenu) sans créer de concurrent sans dossier vendeur ; RLS par agence, écriture par le serveur ;
   test SQL en CI ; gardien-sql avant l'accord.

## Preuves

9. Tests : l'action proposée selon l'origine et l'exclusivité ; une seule carte par bien ; les textes ne
   contiennent ni nom, ni budget, ni « certain », « offre », « prête » ; opposition et carte professionnelle
   bloquent comme aujourd'hui ; la collaboration refusée rebascule en propriétaire avec sa phrase.
10. e2e : depuis la visite de la démo (Keller, bien C en annonce du marché), préparer le courrier au
    propriétaire, le retrouver dans Prospection avec son origine, le marquer remis ; un bien en exclusivité,
    le dossier confrère, « Collaboration obtenue » → la visite passe « À planifier ». Rendus du courrier et
    du dossier confrère en A4.

## Décisions à respecter

- M75, M83, M86, M90, M98, M102, M107, M108, M109, M111, M115 (photo et collaboration), M118, M119, M122.
- Jamais « estimation ». Aucune promesse sur l'acquéreur. On ne modifie ni `extension/` ni le Localisateur.

## Hors périmètre

- Le bon de visite (M123) et le compte rendu de visite multilingue (M124) ; la planification d'un créneau ;
  les honoraires ; la photo des notes (M121).

## Essai sur l'URL d'essai

Compte démo, après « Remettre ma démo à zéro » : Keller → lien répondu « visiter » sur un bien du marché →
Visites → « Préparer le courrier au propriétaire » → le courrier (texte, mentions, sans nom ni budget de
l'acquéreur) → Prospection : la carte « Recherche acquéreur : Famille Keller » → « Marquer remis ». Puis un
bien en exclusivité : « Préparer le dossier de collaboration » → « Contacté » → « Collaboration obtenue » →
Visites : « À planifier ».
