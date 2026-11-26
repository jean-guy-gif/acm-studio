# MISSION 127 — Le point marché

**Date** : 29/10/2026 · **Origine** : décision de Jean-Guy du 29/10 (« ce dont j'ai besoin de suite »).
Mode vendeur, Suivi d'un mandat signé. Suite de la M105 D (« Mettre à jour les prix des concurrents »),
de la M96 (la relance avec les mots du vendeur) et de la M113 (la synthèse qui convainc).

Première mission jouée **dans l'atelier** (M126) : architecte → designer → code → gardien-sql → accord →
relecteur → push/essai → testeur → parcoureur → designer sur les rendus → rapport. Une branche, un `/valide`.
`npm run sauvegarde` avant la migration ; c'est Jean-Guy qui l'applique dans son terminal.

## Objectif

Après un mandat signé, le conseiller met à jour les concurrents en un clic et obtient **un document client
propre, le « Point marché »**, qui montre au vendeur ce qui a bougé depuis le rendez-vous : chaque
concurrent (prix du jour du rendez-vous → prix d'aujourd'hui, baisse en %, vendu ou retiré), puis, en dernière
page, **trois lignes de prix** : où était le bien au rendez-vous, où il est aujourd'hui, et face aux
nouveaux venus. C'est l'outil de la baisse de prix et de la relance (M96) : des faits datés, jamais une
opinion.

## Commencer par un inventaire, sans rien coder (architecte)

Dire en une ligne chacun : ce que fait aujourd'hui « Mettre à jour les prix des concurrents » (M105 :
`refresh-competitor-price.ts`, `record-price-reading.ts`) ; où est conservé le prix d'un concurrent **au
jour du rendez-vous** (aujourd'hui `comparables.price` est écrasé par la relecture ; `listing_observations`
garde des lectures datées, mais seulement pour les annonces importées) ; ce que la conclusion fige
(`project_meeting_conclusions.frozen_*`, `commercialization_price`) ; d'où vient « le concurrent le plus
dangereux » (`live_seller_summary.seller_most_dangerous_comparable_id`) ; comment la recherche automatique
(M50, Stream Estate, budget `agency_search_budgets`) est lancée et ce qu'elle coûte ; comment la synthèse
(M113, `seller-synthesis-document.tsx`) est construite et imprimée. Proposer la maquette du Point marché
(une capture par page, sur le dossier d'exemple) et attendre l'accord de Jean-Guy avant de la coder.

## A. Le prix du rendez-vous ne s'efface plus

1. À la conclusion d'un rendez-vous (`conclude_meeting`), chaque concurrent retenu reçoit son **prix du
   rendez-vous** et ses **jours de commercialisation au rendez-vous**, figés : `comparables.meeting_price`,
   `comparables.meeting_days_on_market`, `comparables.meeting_frozen_at`. La relecture (M105) ne les touche
   jamais ; elle continue d'écrire `price` et les observations datées.
2. Reprise des dossiers conclus existants, dans la migration : `meeting_price` = la dernière observation
   datée au plus tard à `concluded_at` (`listing_observations`, même `listing_key`) ; à défaut, le `price`
   actuel, et la ligne porte alors `meeting_price_source = 'current'` pour que le document dise « prix au
   rendez-vous non relu » au lieu d'afficher une baisse de 0 %. Compter avant, prédire après (CLAUDE.md).
3. Jours de commercialisation : depuis `listing_published_at` quand il est connu, sinon `days_on_market` lu
   à l'import plus les jours écoulés. Toujours montrés comme « environ » quand la date de publication n'est
   qu'une borne (`published_bound_label`, M47).

## B. La mise à jour, et ce qu'elle conclut

4. « Mettre à jour les concurrents » (le bouton de la M105, renommé) enchaîne, dans l'ordre et en le
   disant : (a) relecture de chaque annonce par l'extension (M105, inchangé, aucun appel payant) ; (b) pour
   chaque annonce disparue, la conclusion de la règle ci-dessous ; (c) la proposition de chercher les
   nouveaux venus (§ C, appel payant, jamais sans le clic du conseiller).
5. **Règle des annonces disparues** (règle ACM, décidée par Jean-Guy le 29/10), d'après les jours de
   commercialisation au jour où l'annonce a disparu (`listing_gone_at`) :
   - **plus de 300 jours** : « Retiré du marché sans vente » ;
   - **de 200 à 300 jours** : « Vente probable, négociation estimée de 10 à 15 % » ;
   - **de 100 à 199 jours** : « Vente probable, négociation estimée de 5 à 10 % » ;
   - **moins de 100 jours** : « Vente probable, négociation estimée de 0 à 5 % ».
   Le prix de vente estimé est une fourchette (prix du jour du retrait moins la négociation), jamais un
   chiffre seul, et toujours accompagné du mot « estimé » : rien dans la base ne dit que le bien est vendu
   (CLAUDE.md : jamais de donnée inventée ; M103 : disparition sur preuve). Un « Retiré » reste
   « Retiré » même si l'annonce réapparaît ailleurs : une réapparition relue remet l'annonce en ligne et
   efface la conclusion (M105).
6. Chaque mise à jour laisse un **point daté** : table `project_market_updates` (`project_id`, `made_at`,
   `made_by`, `summary` jsonb : lignes par concurrent — prix du rendez-vous, prix du jour, écart en %,
   état et conclusion —, les trois lignes de prix du § D, les nouveaux venus trouvés). Le Suivi liste les
   points (« Point du 15/11 », « Point du 20/12 ») ; chacun rouvre son document tel qu'il était.
7. Sur le Suivi, sous le bouton, le résumé de la M105 s'enrichit : « 5 annonces relues · 2 baisses · 1 vente
   probable · 1 retiré sans vente · 2 nouveaux venus ». « Ont baissé depuis le rendez-vous » (M105 D 11)
   se calcule désormais sur `meeting_price`.

## C. Les nouveaux venus

8. Après la relecture, le conseiller peut « Chercher les nouveaux venus » : la recherche automatique de la
   M50, avec les critères du dossier (`search_settings` / `saved_searches`), limitée aux annonces publiées
   après `concluded_at` et absentes des concurrents, des écartés (`competitor_decisions`) et des imports en
   attente. Appel payant : le coût est dit avant, le budget de l'agence réservé puis réglé (M50), et rien
   ne part sans le clic.
9. Les résultats arrivent dans « Nouveaux sur le marché depuis le rendez-vous », avec « Retenir » /
   « Écarter » (mêmes gestes que la M50). Un nouveau venu retenu devient un concurrent du dossier
   (`is_selected`, `meeting_price` vide : il n'était pas là au rendez-vous), entre dans la troisième ligne
   de prix, et dans Prospection comme tout concurrent (M98 : une carte par bien).

## D. Le document : « Point marché »

10. Un document client, imprimé en A4 et partagé par lien comme la synthèse (M113, mêmes mentions, mêmes
    règles : jamais l'adresse d'un concurrent, photos « Sans photo » au choix, M115). Le designer propose
    la maquette ; le testeur produit PDF et captures ; Jean-Guy regarde avant l'essai.
    - **Couverture** : le bien du vendeur (sa photo principale), « Point marché du 15/11/2026 », « Depuis
      notre rendez-vous du 12/10 ». Rappel en une ligne : prix retenu ensemble, nombre de concurrents
      suivis, nombre de nouveaux venus.
    - **Une page par concurrent** : ses quatre photos principales (de l'annonce, M113), ses
      caractéristiques qui comptent face au bien du vendeur (type, surface, pièces, extérieur, état,
      DPE), puis le bloc des prix : « Au rendez-vous : 275 000 € · Aujourd'hui : 259 000 € · −5,8 % ·
      En vente depuis 142 jours ». Pour une annonce disparue : « Retirée le 03/11 après 150 jours : vente
      probable, négociation estimée de 5 à 10 %, soit entre 233 000 et 246 000 € » ou « Retirée après
      320 jours : sans vente ». Pour un prix du rendez-vous non relu (A 2) : « Prix au rendez-vous non
      relu ; prix du jour : … ».
    - **Nouveaux venus** : une page, une carte par bien retenu (photo, caractéristiques, prix, « Publié le
      … »).
    - **Dernière page, trois lignes de prix** (une ligne horizontale graduée chacune, même échelle,
      même largeur, pour que l'œil compare) :
      1. **Au rendez-vous** : le plus bas, la médiane, le plus haut des concurrents retenus (prix du
         rendez-vous) ; le plus dangereux (`live_seller_summary`) marqué ; **le prix retenu ensemble**
         (`commercialization_price`) en couleur de la M116 (vert / orange / rouge face à l'analyse du
         conseiller, `frozen_advisor_analysis`).
      2. **Aujourd'hui** : mêmes repères avec les prix du jour ; les disparus sortent de la ligne et sont
         comptés à part (« 1 vente probable, 1 retiré ») ; le prix du bien inchangé, sa couleur recalculée
         face à la médiane du jour. Une phrase de fait sous la ligne : « Vous étiez le moins cher de la
         sélection ; aujourd'hui, 2 concurrents sur 4 sont passés sous votre prix. »
      3. **Face aux nouveaux venus** : plus bas, médiane, plus haut des nouveaux venus retenus, et le prix
         du bien. Sans nouveau venu : la ligne dit « Aucun nouveau venu retenu depuis le rendez-vous » et
         ne dessine rien d'inventé.
      Les phrases sous les lignes sont des faits calculés, jamais une recommandation de prix : la décision
      de baisser reste au conseiller et au vendeur.
11. Côté conseiller, la même page des trois lignes s'affiche sur le Suivi (sans impression), avec le
    rappel de la M96 : « Ce que le vendeur a dit » juste à côté, pour préparer la relance.

## Base

- Une migration : `meeting_price`, `meeting_days_on_market`, `meeting_frozen_at`, `meeting_price_source`
  sur `comparables` ; `project_market_updates` avec RLS par agence (`get_current_agency_id()`), écritures
  serveur seulement ; `conclude_meeting` complété ; reprise des dossiers conclus (A 2). Compter avant sur la
  vraie base (dossiers conclus, concurrents retenus, observations disponibles), prédire après, transaction
  annulable, compatible avec le code de `main`.
- Aucun appel payant sans clic ni sans budget (M50) ; la relecture reste gratuite (M105).

## Preuves

- Tests unitaires purs : la règle des annonces disparues (bornes 99/100, 199/200, 300/301 jours), les
  fourchettes estimées, le calcul des trois lignes (plus bas, médiane, plus haut, position du bien,
  disparus exclus, nouveaux venus vides), la couleur du prix (M116).
- e2e sur le dossier d'exemple : conclure → relire (relecture de démonstration, M114) avec une baisse, une
  annonce disparue à 150 jours, une à 320 jours → le point daté existe → le document s'ouvre, les trois
  lignes sont là → le lien s'ouvre sans compte.
- Rendus (testeur, règle 4) : PDF A4 du Point marché, captures de chaque page et du Suivi en 1280 × 800,
  1024 × 768, 390 × 844 ; chaque action principale visible sans défiler.

## Décisions à respecter

- CLAUDE.md : jamais de donnée inventée (tout « estimé » le dit), vocabulaire (« concurrent », « bien »,
  jamais « dossier » seul), écritures serveur, RLS par agence.
- M103 (disparition sur preuve), M105 (relecture gratuite), M50 (budget de recherche), M96 (relance avec les
  mots du vendeur), M113 et M115 (document client, photos), M116 (couleur du prix), M98 (une carte par bien).

## Hors périmètre

- L'envoi automatique du document au vendeur (il part par le lien ou le PDF, comme la synthèse) ;
  une recommandation chiffrée de baisse ; la relecture des annonces sans extension.

## Essai sur l'URL d'essai

Compte de démo, dossier conclu avec mandat signé → Suivi → « Mettre à jour les concurrents » → la relecture
de démonstration joue une baisse (275 000 → 259 000), une annonce retirée à 150 jours, une à 320 jours →
« Chercher les nouveaux venus » (démo : deux biens proposés, un retenu) → « Point du … » apparaît → ouvrir
le document : une page par concurrent avec ses quatre photos et son bloc des prix, la page des nouveaux
venus, la dernière page avec les trois lignes → imprimer en A4 → ouvrir le lien sur un téléphone.
