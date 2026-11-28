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
| A1      | La ville une fois au Live ; « probablement retiré sans vente »                                                                            | 1 h                 | en production le 27/11 au soir |
| A2      | Les espaces insécables : la règle et son test, sur les textes du vendeur et ses documents (Live, synthèse, Étude, Point marché, dossier acquéreur, courriers) | 1 h 30 | en production le 27/11 au soir |
| A3      | La même règle sur tous les écrans du conseiller, le guide et le modèle d'e-mail « mot de passe oublié »                                | 1 h 30              | en production le 27/11 au soir |
| A4      | Relecteur, suite complète sur l'essai, banc de l'Étude, captures avant / après                                                           | 1 h                 | en production le 27/11 au soir |
| B1      | La migration du mode de financement, ses droits en toutes lettres, jouée sur la base d'essai, relue par le gardien-sql                   | 1 h 30              | appliquée en production le 28/11 par Jean-Guy |
| B2      | La fiche : « Comment finance-t-il ? », le prêt, la démo                                                                                   | 1 h 30              | sur l'essai le 28/11, attend le « oui » |
| B3      | L'offre : le mode demandé d'abord, bloquée avec prêt                                                                                      | 1 h                 | sur l'essai le 28/11, attend le « oui » |
| B4      | La lecture des notes, et sa mesure sur le vrai modèle                                                                                     | 1 h 30              | sur l'essai le 28/11, attend le « oui » |
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
- A2 et A3 (27/11), faits d'un seul tenant : leurs tests étaient mêlés, et le lot part entier après
  le « oui ». Une seule règle (`src/lib/typography/french-spacing.ts`) : une espace insécable
  (U+00A0) avant « : » et dans « », une espace fine insécable (U+202F) avant « ; ? ! » ; dans le
  code, `\u00a0` et `\u202f` dans une chaîne, `&nbsp;` et `&#x202f;` dans le JSX. Le test
  `french-spacing.test.ts` lit tout `src` par l'arbre de TypeScript (le texte JSX tel que React
  l'affiche, les chaînes, les gabarits, les attributs), plus le guide de prise en main et les deux
  modèles d'e-mail, et refuse toute espace où la ligne peut se couper ; un second contrôle refuse
  toute espace insécable dans le CSS écrit dans le code. Environ 890 textes convertis, le guide
  refait (deux pages), le modèle « mot de passe oublié » corrigé. Hors de la règle, avec leur
  raison dans le test : les textes figés de l'offre d'achat et du bon de visite et les deux
  documents signés ; les consignes envoyées à l'IA (et « Photo N : », envoyé au modèle) ; le CSS et
  le code (un texte qui porte une accolade) ; après « · », un « ? » qui est un symbole (la légende
  de la grille) ; les aides des tests. Le « À vérifier : … » d'avant, en base avec l'espace
  ordinaire, se relit toujours (`OLD_TO_VERIFY`).
- A4 (27/11) · Le relecteur, une passe : un bloquant, `@page :first` du CSS de la synthèse, du
  Point marché et du dossier acquéreur avait reçu une espace insécable, Chromium jetait la règle et
  la couverture imprimée débordait (que ni l'e2e ni le banc, qui n'imprime que l'Étude, ne voient)
  — corrigé, et gardé par le test du CSS ; ses « à corriger » faits (les anciens Points marché
  disent aussi « probablement retiré sans vente », comme leur note ; les tests du texte signé du
  bon reprennent l'espace exacte ; deux vérifications négatives retrouvent leur sens ; deux regex
  des specs). Barrières vertes (4 585 tests), banc de l'Étude vert (aucune page qui déborde, six
  polices). Suite e2e complète sur l'essai : 42 parcours sur 42 ; un défaut de spec trouvé et
  corrigé (`parcours`, une regex avec l'ancienne espace), un aléa de l'essai (16 h 30 à 16 h 52, la
  remise à zéro de la démo restée bloquée sans erreur : vert au second passage) ; la démo rejouée
  après les corrections.
- Les preuves, dans `missions/maquettes/lot-a/` : le Live avant / après aux trois tailles, l'écran
  « Un sérieux concurrent ? » et la révélation (« Maison · 5 pièces · 135 m² ·
  Saint-Paul-de-Vence », la ville redite dessous, puis une fois) ; la synthèse de Mme Ferrand sur
  téléphone avant / après (« Terrasse (vous » puis « : Terrasse) » à la ligne, puis le deux-points
  gardé) ; la page 3 de la synthèse imprimée de M. Lefebvre avant / après (7 pages les deux) ; le
  relevé des lignes coupées sur les dix synthèses de la démo (avant : de 49 à 77 endroits à risque
  par synthèse, 13 lignes coupées sur téléphone ; après : aucun texte, seule la règle CSS
  `@page :first` garde son espace).

### Les questions du lot A, après la relecture

6. Réponse de Jean-Guy (27/11) : oui. Les anciens Points marché : un point écrit avant le lot disait « Retiré du marché sans vente »,
   au-dessus de la note neuve « … : probablement retiré sans vente ». Par défaut, fait : le libellé
   d'une annonce retirée se recompose à l'ouverture, comme la note ; les autres libellés restent
   tels qu'écrits (M127, « chacun rouvre son document tel qu'il était »).
7. Réponse de Jean-Guy (27/11) : on prévient après, aucun accord à attendre. La question 1, relue : la décision du 07/11 dit que les textes validés par la juriste ne
   changent pas sans son accord ; seules des espaces y changent, aucun mot. Par défaut : la juriste
   est prévenue après, avec l'avertissement des notes ; si Jean-Guy préfère son accord avant, le
   lot A attend.


## Lot B — ce qui est fait

Le découpage, revu par l'architecte (28/11) : la phrase pour la juriste dès B1, puisque c'est elle
qui retient la production ; une planche de maquette en tête de B2 (la fiche change d'écran), la démo
passant en B3 ; B4 mesuré sur neuf notes inventées, deux passes, environ 0,35 €. B1 à B4 en 1 h 30
chacun, B5 en 1 h : 7 h au lieu de 6 h 30.

- B1 (28/11) · La migration `supabase/migrations/20261217090000_mode_de_financement.sql`, sur la
  seule table `buyers` (la fiche acquéreur), qui n'ajoute que quatre colonnes : le mode
  (`financing_mode` : `cash` comptant, `loan` avec prêt, `not_said` pas encore dit, le défaut) et,
  avec un prêt seulement, l'apport (`loan_contribution`, de 0 à 99 999 999 €), le montant du prêt
  (`loan_amount`, de 1 à 99 999 999 €) et l'accord de principe (`loan_agreement`, oui / non / non
  dit), tous facultatifs ; la base refuse un apport, un prêt ou un accord sans prêt. Les fiches
  existantes prennent « Pas encore dit », rien n'est reconstitué (M56). Les droits, redits en toutes
  lettres en fin de fichier, sont ceux d'aujourd'hui : anon rien, le navigateur la lecture seule
  (sa politique le borne à son agence, M117), le serveur l'écriture ; une garde annule tout si un
  droit n'est plus celui-là, PUBLIC et droits d'une seule colonne compris. Compatible avec le code
  de `main`, qui ne lit ni n'écrit ces colonnes. Le statut de financement (M132) et la règle « Prêt
  à visiter » ne changent pas.
- Son test `supabase/tests/mode_de_financement.sql`, dans la CI (`sql.yml`) : le défaut, les refus
  (hors liste, vide, détails sans prêt, hors bornes, « Comptant » qui garderait les détails d'un
  prêt), chacun par son code exact ; les droits ; le navigateur qui lit son agence et n'écrit rien ;
  une autre agence et un membre retiré qui ne lisent rien ; le mode et le statut indépendants. Vert
  sur la base locale, avec les 25 autres tests SQL qui touchent la fiche acquéreur ; six migrations
  sabotées exprès, toutes vues (quatre par la garde, deux par le test).
- Le gardien-sql : aucun bloquant ; ses quatre corrections faites (la garde et le test lisent aussi
  PUBLIC, les droits d'une seule colonne et le droit de vider la table ; un refus de la RLS ne passe
  plus pour un droit qui manque ; un NULL ne passe plus le premier contrôle). Sa prédiction, la
  mienne, confirmée sur la base d'essai.
- Jouée sur la base d'essai le 28/11 à 11 h 30, après une simulation qui ne listait qu'elle :
  migrations 110 → 111, `buyers` 40 → 44 colonnes et 28 → 32 contraintes, les 9 fiches en « Pas
  encore dit », aucun détail de prêt, 7 « financement validé » inchangées ; l'empreinte des 40
  colonnes d'avant identique (`bbc4571f…`) : aucune ligne modifiée ; les droits identiques ; tout le
  reste identique (53 tables, 58 politiques, 69 fonctions, 38 déclencheurs, 171 index, droits
  639 / 27 / 115 / 0, 18 fonctions ouvertes à tous). Puis deux specs sur l'essai, qui sert encore le
  code de `main` : `suivi-de-l-acquereur` et `depuis-mes-notes`, 3 sur 3.
- La phrase pour la juriste : `missions/LOT-B-confidentialite-pour-le-juriste.md` (avant / après ;
  non publiée, elle part avec le code du lot B).
- B1, en production (28/11) · Appliquée par Jean-Guy après la sauvegarde `2026-11-28_1318`
  (vérifiée) ; relue en lecture seule ensuite, exactement la prédiction : 111 migrations, `buyers`
  44 colonnes et 32 contraintes, les 24 fiches en « Pas encore dit », aucun détail de prêt, 17
  « financement validé » inchangées, l'empreinte des 40 colonnes d'avant identique
  (`3b40c630…`) : aucune ligne modifiée ; les droits et tout le reste identiques.
- La sauvegarde (28/11, demande de Jean-Guy) · Deux échecs à midi, à l'étape 3 (les fichiers du
  stockage) : la copie d'un bucket s'arrêtait au premier fichier en erreur. Elle se reprend
  désormais, jusqu'à trois fois, sur les seuls fichiers manquants ou tronqués ; un défaut trouvé en
  l'éprouvant avec la vraie CLI (elle refuse d'écrire par-dessus un fichier) et corrigé. Dans
  `main` le 28/11, sur l'ordre de Jean-Guy.
- B2 (28/11) · La planche `missions/maquettes/lot-b/LB2-comment-finance-t-il.png`, faite sur la
  vraie fiche de M. Fontaine à l'essai, aux trois tailles (la question insérée avec les classes de
  l'application, `LB2-generateur.mjs`). Puis la fiche : sous l'état du financement, « Comment
  finance-t-il ? » — Comptant · Avec prêt · Pas encore dit, un toucher l'enregistre ; avec un
  prêt, l'apport, le montant du prêt et l'accord de principe, tous facultatifs, « Enregistrer le
  prêt » ; quitter « Avec prêt » efface ce qui est noté, l'écran le demande d'abord ; « À vérifier
  · lu dans vos notes » prêt pour B4. Un geste à part (`setBuyerFinancingMode`), relu au serveur ;
  ni l'état du financement ni « Prêt à visiter » ne le lisent ; jamais au vendeur (un piège sur les
  cartes du Live). La démo : Keller et Wilson comptant, Lambert avec prêt et accord (250 000 € et
  540 000 €), Fontaine avec prêt sans accord (120 000 € et 650 000 €), les autres « Pas encore
  dit ». Tests : 4 620 au total ; CI verte. Sur l'essai : la spec `mode-de-financement` (le prêt
  corrigé et gardé, « Comptant » qui demande d'abord, les Rossi en « Pas encore dit ») et ses
  captures de la vraie fiche (`LB2-apres-*-avec-pret.png`), puis `suivi-de-l-acquereur`,
  `acquereur-sans-offre`, `depuis-mes-notes`, `parcours` et `demo` : 7 sur 7, sans aléa.

- B2, retouche de Jean-Guy (28/11) · Planche et fiche validées, les trois choix restent visibles.
  Avec un prêt dont l'accord de principe est « Oui » et un financement pas encore « Validé », une
  ligne sous le prêt : « Accord de principe obtenu : passer le financement en « Validé » ? », un
  bouton en contour « Passer en Validé » ; aucun changement automatique, rien dans l'autre sens.
- B3 (28/11) · L'offre d'achat selon comment il finance, tant que la clause avec prêt n'est pas
  validée : « Comptant », l'offre d'aujourd'hui ; « Pas encore dit », ou lu dans ses notes et encore
  « À vérifier », l'écran demande d'abord le mode, avant tout champ (« Comment finance-t-il ? »,
  Comptant ou Avec prêt, le choix s'écrit sur sa fiche) ; « Avec prêt », l'offre est bloquée avec
  le message de Jean-Guy, mot pour mot. Une seule règle, pure (`offer-gate.ts`) : la page l'applique
  en tête, la signature de nouveau, sur la fiche relue en base, l'offre hors mandat comprise. Le
  texte de l'offre ne change pas d'un mot (son instantané n'a pas bougé). Le message dit
  « disponible » sans exception au test de vocabulaire : il vit avec l'offre d'achat, hors de ce que
  le test relit (réponse 12). Tests : 4 633 ; sur l'essai, `mode-de-financement` (la question des
  Rossi, le blocage de M. Fontaine, l'offre des Keller) et ses captures aux trois tailles
  (`LB3-*-question.png`, `LB3-*-bloquee.png`), puis `hors-mandat`, `acquereur-sans-offre`,
  `presentation-directe` : 11 sur 11, sans aléa.
- B4 (28/11) · La lecture des notes propose comment il finance, quand les notes le disent :
  « Comptant » ou « Avec prêt », « À vérifier », avec la ligne d'où il vient (« d'après : … ») ;
  la garde du serveur ne le garde que si cette ligne le dit, et « sans prêt », « pas de banque »
  ne sont jamais un prêt. L'état du financement (validé, en cours) reste à part ; « Comptant, à
  vérifier » de la M151 devient le mode « Comptant », le geste « Le noter « Validé » » à côté
  (réponse 9). La fiche créée porte le mode, « À vérifier · lu dans vos notes » ; un toucher sur
  le bon choix, ou « Tout est juste », le confirme (l'e2e a trouvé que « Tout est juste » ne
  retirait pas la pastille du mode sans recharger : corrigé). La démo des Arnaud lit « accord
  banque OK » : « Avec prêt ». Mesure sur le vrai modèle (`missions/LB4-mesure.md`) : neuf notes
  inventées, deux passes, 18 lectures justes sur 18, aucun mode inventé, 0,39 €. Tests : 4 635 ;
  sur l'essai, `depuis-mes-notes` (le mode lu, sa ligne, la fiche, « Tout est juste ») et
  `mode-de-financement` : 3 sur 3.

### Les questions du lot B (architecte, 28/11), chacune avec sa réponse par défaut

8. Le statut et le mode restent indépendants : « Avec prêt · accord oui » ne pose pas « Validé ».
   Par défaut : oui, sans coût. Sinon : une ligne qui propose « Validé », sans migration.
9. « Comptant, à vérifier », que propose aujourd'hui la lecture des notes (M151), devient le mode
   « Comptant », à vérifier, et le geste « financement validé » reste à côté. Par défaut : oui.
10. Un mode lu par l'IA, encore « À vérifier », se confirme d'un toucher avant l'offre (la
    validation du conseiller avant un résultat final). Par défaut : oui, sans coût. Sinon : il
    compte comme dit.
11. Avec un prêt, « Préparer son offre d'achat » mène à l'écran bloqué ; l'offre faite sur le modèle
    de l'agence n'existe pas dans ACM, et la fiche ne passe jamais « Sous offre ». Par défaut :
    rien au lot B, une ligne dans `PLUS_TARD` pour le lot C. L'adapter : environ 30 min, sans
    migration.
12. Le message de l'offre bloquée contient « disponible », que le test de vocabulaire refuse côté
    acquéreur (M118). Par défaut : le message mot pour mot, avec une exception pour cette seule
    phrase dans le test (comme la M152 B).
