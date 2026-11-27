# Après la livraison — trois chantiers

Le message de Jean-Guy du 27/11, tel quel. Chaque lot se joue sur l'essai, avec ses captures aux
trois tailles, et ne part en production qu'après son « oui ».

## Sa fiche

Après la livraison : trois chantiers, dans cet ordre (A, puis B, puis C). Chacun se joue sur
l'essai, avec ses captures aux trois tailles, et ne part en production qu'après mon « oui ».

**LOT A — Les coquilles (niveau Moyen, sans migration)**

1. Live, sur chaque écran d'un concurrent : la ville est écrite deux fois (« Maison · 5 pièces ·
   135 m² · Saint-Paul-de-Vence » puis « Saint-Paul-de-Vence » dessous). Voir
   live-comparable-header.tsx:21 et neutral-comparable-label.ts:41. La ville n'apparaît qu'une
   fois. Le quartier reste, s'il existe et n'est pas déjà dans le titre.
2. Espaces insécables : aucun texte ne doit pouvoir couper une ligne avant « : ; ? ! » ni à
   l'intérieur de « ». Une seule règle pour tous les textes visibles et tous les documents
   imprimés (synthèse, étude, point marché, dossier acquéreur, courriers). Un test fait échouer
   tout texte qui y manque. Ne touche pas aux textes figés de l'offre d'achat et du bon de visite.
3. Point marché, devant le vendeur (fr.ts:858 et le libellé « Retiré du marché sans vente ») :
   « Plus de 300 jours en vente au retrait : probablement retiré sans vente. » et « Probablement
   retiré sans vente ». Même correction dans la version anglaise.

Preuve : capture du Live avant/après, et une synthèse imprimée avant/après.

**LOT B — Le mode de financement et l'offre (niveau Sensible, migration)**

1. Sur la fiche acquéreur, à côté du statut de financement : « Comment finance-t-il ? » avec
   Comptant · Avec prêt · Pas encore dit. Si « Avec prêt » : apport (€), montant du prêt (€),
   accord de principe oui/non, tous facultatifs. Les fiches existantes passent en « Pas encore
   dit ».
2. La lecture des notes par l'IA propose ce mode quand les notes le disent, en « À vérifier » avec
   sa source, comme les autres champs.
3. L'offre d'achat, tant que la clause avec prêt n'est pas active :
   - Comptant : l'offre comme aujourd'hui ;
   - Pas encore dit : l'écran demande d'abord le mode, avant tout champ ;
   - Avec prêt : l'offre est bloquée, avec ce message : « Cet acquéreur finance avec un prêt :
     l'offre avec prêt n'est pas encore disponible dans ACM. Utilisez le modèle de votre agence. »

   Le texte de l'offre ne change pas d'un mot.
4. La migration se joue d'abord sur la base d'essai, avec les droits donnés en toutes lettres. Je
   l'applique à la production après sauvegarde. La règle « Prêt à visiter » ne change pas.

**LOT C — La vie du mandat côté vendeur (niveau Sensible, maquette d'abord, migration)**

Aujourd'hui, le dossier vendeur s'arrête à « Mandat signé ». Il doit suivre le mandat jusqu'au
bout :

1. Les étapes après le mandat : Mandat signé → Offre acceptée → Sous compromis → Vendu par
   l'agence. Et la sortie : mandat terminé sans vente.
2. Ce qu'on saisit : la durée ou la date de fin du mandat ; un avenant de baisse (date et nouveau
   prix, l'historique gardé) ; la date du compromis et la date prévue de l'acte ; la date de l'acte
   et le prix de vente.
3. Le lien avec le côté acquéreur : une offre acceptée sur ce bien par un acquéreur de l'agence
   fait passer le dossier en « Offre acceptée », et « Lancer le compromis » le fait passer en
   « Sous compromis ». Le conseiller peut aussi saisir une vente à un acquéreur venu d'ailleurs.
4. Le Suivi gagne deux onglets, « Sous offre · compromis » et « Vendus par l'agence ». Le point
   marché mensuel s'arrête au compromis.
5. Dans « Aujourd'hui » : « Préparer le renouvellement », 30 jours avant la fin d'un mandat ;
   « Préparer l'acte », 15 jours avant la date prévue.
6. Le tableau du manager ajoute les mandats vendus, le délai du mandat au compromis, et l'écart
   entre le prix du mandat et le prix de vente.

D'abord la maquette (la fiche du dossier, le Suivi, une tâche d'« Aujourd'hui »), sur les trois
tailles et dans le socle de la refonte. Je la valide, puis tu codes.

Pour commencer : tu me donnes la durée prévue de chaque lot, puis tu lances le lot A.

## Le découpage et les durées (chef, 27/11)

Une mission tient en une heure et demie (CLAUDE.md) : chaque lot se découpe en morceaux.

| Morceau | Ce qu'il fait                                                                                                                             | Durée prévue        | État                    |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------- | ----------------------- |
| A1      | La ville une fois au Live ; « probablement retiré sans vente »                                                                            | 1 h                 | sur la branche, le 27/11 |
| A2      | Les espaces insécables : la règle et son test, sur les textes du vendeur et ses documents (Live, synthèse, Étude, Point marché, dossier acquéreur, courriers) | 1 h 30 | à faire |
| A3      | La même règle sur tous les écrans du conseiller, le guide et le modèle d'e-mail « mot de passe oublié »                                | 1 h 30              | à faire                 |
| A4      | Relecteur, suite complète sur l'essai, banc de l'Étude, captures avant / après                                                           | 1 h                 | à faire                 |
| B1      | La migration du mode de financement, ses droits en toutes lettres, jouée sur la base d'essai, relue par le gardien-sql                   | 1 h 30              | à faire                 |
| B2      | La fiche : « Comment finance-t-il ? », le prêt, la démo                                                                                   | 1 h 30              | à faire                 |
| B3      | L'offre : le mode demandé d'abord, bloquée avec prêt                                                                                      | 1 h                 | à faire                 |
| B4      | La lecture des notes, et sa mesure sur le vrai modèle                                                                                     | 1 h 30              | à faire                 |
| B5      | Relecteur, specs, captures                                                                                                                | 1 h                 | à faire                 |
| C0      | La maquette : la fiche du dossier, le Suivi, une tâche d'« Aujourd'hui », aux trois tailles                                              | 1 h 30              | à faire                 |
| C1 à C7 | La base ; les étapes et la fiche ; les saisies ; le lien avec l'offre et le compromis ; le Suivi et le Point marché ; « Aujourd'hui » et le tableau du manager ; la démo, relecteur, specs, captures | 1 h 30 chacun | à faire |

Lot A : environ 5 h. Lot B : environ 6 h 30. Lot C : environ 12 h. Au total, environ 23 h 30,
hors les validations de Jean-Guy et l'application des deux migrations.

## Les questions du 27/11, chacune avec sa réponse par défaut

1. Lot A, point 2 : les courriers (validés par la juriste le 07/11) et la page de confidentialité
   reçoivent les espaces insécables, sans qu'un mot change. Par défaut : oui, et Jean-Guy le dit à
   la juriste avec l'avertissement des notes.
2. Lot A, point 3 : côté conseiller, le Point marché du Suivi disait aussi « retiré du marché sans
   vente » et « Retiré sans vente ». Par défaut : alignés sur « probablement retiré sans vente ».
3. Lot B : la fiche gardera l'apport et le montant du prêt ; la page de confidentialité doit le
   dire. Par défaut : la phrase est préparée pour la juriste, et le lot B attend son accord avant la
   production.
4. Lot B : la consigne de la lecture des notes change ; elle se mesure sur le vrai modèle, avec des
   notes inventées, pour moins de 0,50 €. Par défaut : oui.
5. Lot C : « Mandat terminé sans vente » est une nouvelle sortie de la vie du mandat ; « Vendu
   ailleurs » et « Retiré de la vente », les issues d'aujourd'hui, ne bougent pas ; la maquette
   montre comment elles se côtoient. Par défaut : oui.

Un détail tranché par le chef : le modèle d'e-mail « mot de passe oublié » a une espace à
corriger ; il est corrigé dans le dépôt, et Jean-Guy le recollera dans Supabase quand il voudra.

## Lot A — ce qui est fait

- A1 (27/11) · Au Live, la ligne du lieu, sous le libellé neutre d'un concurrent, ne redit jamais
  ce que le libellé dit déjà (`locationBelowLabel`) : sans quartier, le libellé finit par la ville
  et rien ne suit ; avec un quartier, la ville seule dessous, sauf si son nom est déjà dans celui
  du quartier ; ni ville ni quartier, « Localisation inconnue », comme avant. Les cinq écrans d'un
  concurrent passent par le même en-tête. « Probablement retiré sans vente » : la note et le
  libellé du Point marché devant le vendeur, la note « Pour lire ce document » qui cite le
  libellé, en français et en anglais ; côté conseiller, le panneau du Point marché, l'étiquette
  et la ligne du Suivi. Les anciens points recomposent leur libellé à l'ouverture : ils disent
  aussi la nouvelle formule. Captures avant / après du Live dans `missions/maquettes/lot-a/`.
