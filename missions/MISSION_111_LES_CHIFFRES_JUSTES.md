# MISSION 111 — Les chiffres justes

**Date** : 21/10/2026 · **Origine** : audit n°7 du 19/10/2026 (doc « Audit ACM Studio n°7 — après M109 et
M110 »), section « Corrections P1 : une mission avant les premiers chiffres ». Laurent : « ok on continue »,
ce qui vaut accord pour les quatre décisions recommandées par l'audit (rappelées plus bas). C'est une
mission de corrections, sans nouvelle fonction.

La mission se lance seule, depuis `main` à jour (commit `638cb1e` ou suivant).
- Pas de push forcé.
- `npm run sauvegarde` avant la migration, datée après la dernière de `main` (`20261101090000`).

## Commencer par vérifier, sans rien coder

Relire chaque constat dans le code de `main` et dire en une ligne s'il est toujours présent. Pour le
critère A, compter aussi en base les conclusions concernées, avant toute migration.

## Critères d'acceptation

### A. « Signé au rendez-vous » se compte juste

**Constat** : quand le prix est saisi pendant le Live, `save_commercialization_price`
(`20260922120000_meeting_conclusions.sql:82-92`) crée la ligne de `project_meeting_conclusions` sans
issue. À la conclusion, `conclude_meeting` passe par `on conflict` et écrit
`first_outcome = c.first_outcome` (`20261030090000_parcours_des_issues.sql:148`) : la première issue
reste vide pour toujours, et le tableau « Prise de mandat » compte ce mandat en « parcours inconnu ».

1. À la conclusion, si la ligne existante n'a encore aucune issue (`outcome` vide), la première issue
   enregistrée devient celle de cette conclusion. Une première issue déjà posée ne se réécrit jamais.
2. Rattrapage, sans rien inventer : compter les conclusions dont l'issue est posée et la première issue
   vide. Pour chacune, ne poser la première issue que si elle se déduit avec certitude (par exemple :
   issue « signé » jamais changée et jamais passée par « à relancer »). Les autres restent « parcours
   inconnu ». Compter avant et après, et soumettre la règle à Laurent avant d'appliquer.
3. Les rendez-vous menés ne comptent que les conclusions qui ont une issue : une ligne créée par la
   seule saisie du prix au Live, sur un dossier non conclu, n'en est pas un (`build-mandate-dashboard.ts:70`).

### B. Le rang au m² montré au vendeur est juste

**Constat** : `build-seller-presentation.ts:400` appelle `revealedPricesPerSquareMeterUpTo(index)` avec
l'indice de `shownInLive`, mais la fonction (lignes 308-313) filtre `retained` par position. Dès qu'un
concurrent est hors Live, le rang se calcule sur le mauvais concurrent : le vendeur peut lire
« Position 2 / 1 ».

4. Le rang se calcule sur les seuls concurrents montrés au Live, déjà révélés à cet écran, sans les
   concurrents jugés « Non » (M104, M108).
5. Test : 8 retenus, le premier hors Live, un « Non » au milieu ; le rang affiché à chaque écran est
   celui attendu.

### C. La synthèse au vendeur dit ce qu'il a vu, et ne change plus

**Constat** : `load-seller-synthesis.ts:55-59` relit la décision de prix en direct, et
`save-price-positioning.ts` / `delete-price-positioning.ts` ne vérifient pas le statut du dossier. Le lien
déjà envoyé peut montrer, pendant 30 jours, un autre prix que celui du rendez-vous. De plus,
`seller-synthesis-document.tsx:116-123` écrit « Prix retenu par votre conseiller » sous « Le prix que nous
vous proposons » sur le prix des concurrents, et l'« Analyse du conseiller » n'y figure pas.

6. La synthèse lit les montants figés à la conclusion (`frozen_advisor_price`,
   `frozen_advisor_analysis`, prix de commercialisation). Avant la conclusion, elle lit la décision en
   cours, comme aujourd'hui.
7. La synthèse reprend les libellés du Live (M89) : « Prix des concurrents », « Analyse du conseiller »,
   « Prix de commercialisation convenu ensemble ». Un montant absent n'a pas de ligne. Le titre de la
   section ne dit plus « que nous vous proposons » au-dessus du prix des concurrents.
8. Une décision de prix ne s'enregistre ni ne se supprime sur un dossier conclu ou archivé, à l'action et
   à l'écran (« Rendez-vous conclu : la décision de prix ne se modifie plus. »).
9. Le test « jamais côté vendeur » de la synthèse reste vert, titre piège de la M107 compris.

### D. Le prix de commercialisation d'un dossier conclu ne change plus par le Live

**Constat** : `save-commercialization-price.ts` ne lit pas le statut, et la fonction SQL
`save_commercialization_price` fait un ajout ou une mise à jour sans condition. Le verrou de la M109 ne
couvre pas cette écriture. Un onglet du Live resté ouvert peut remplacer le prix d'un mandat signé, repris
par le Suivi et les courriers.

10. L'écriture est refusée hors des statuts « en préparation » et « prêt », à l'action
    (`isLiveClosed`, même message que la M109) et dans la fonction SQL.
11. « Changer l'issue » et la conclusion gardent leur droit d'écrire ce prix (M90) : rien d'autre ne
    change.

### E. Aucun courrier sur une copie dont la carte est opposée

**Constat** : `get-prospecting-file.ts:153-160` (et `build-prospecting-rows.ts:200`) ne regardent
l'opposition que sur la copie. Le lot (`courriers/page.tsx:61-67`) et la tournée (`tour.ts:85`) regardent
la carte entière. Une annonce retenue dans deux mandats, adresse confirmée sur un seul, adresse inscrite
« Ne plus solliciter » : la page du second propose encore « Préparer le dossier », et la version confrère
s'imprime et s'enregistre.

12. La page du courrier, son enregistrement et la liste du dossier lisent l'opposition de la carte
    entière, comme le lot et la tournée. Message : « Ce propriétaire a demandé à ne plus être sollicité ».
13. Test : deux mandats, une seule copie à adresse confirmée, opposition inscrite à la main ; chaque
    chemin refuse, version propriétaire comme version confrère.

### F. Affiner un critère ne fait plus perdre ni repayer en silence

**Constat** : `settingsSaved` (`competitor-search-panel.tsx:634-645`) appelle `forgetStreamEstateResult`
dès qu'un réglage est enregistré ou qu'une recherche nommée est appliquée, avant toute vérification. Si la
relance échoue ensuite (extension, budget, service des communes : lignes 691-707), il ne reste aucun
résultat, contrairement à la M107. Et la recherche suivante part sans « Relancer et payer ».

14. Quand seuls l'étage, l'extérieur, le terrain ou la piscine changent, les biens déjà reçus sont triés
    à nouveau selon les règles de la M110 (écartés et comptés, ou gardés « non indiqué »), sans aucun
    appel payant. Le bilan le dit : « Critères appliqués aux biens déjà trouvés, sans nouvelle
    recherche ». Si le critère se desserre, le conseiller lit qu'une nouvelle recherche serait
    nécessaire pour trouver d'autres biens.
15. Quand un autre réglage change (secteur, élargissement, DPE, prix, pièces, surface) et qu'un résultat
    payé existe, l'écran prévient avant d'enregistrer : « Ce changement demande une nouvelle recherche
    payante (jusqu'à 0,60 €). Le résultat actuel sera remplacé quand elle aura réussi. » Le résultat
    gardé n'est remplacé qu'après une recherche réussie (M107) ; l'empreinte du serveur (M105) continue
    de jeter un résultat qui ne correspond plus.
16. Appliquer une recherche nommée suit les mêmes règles que 14 et 15.

### G. Une autre agence n'écrit pas sur vos dossiers

**Constat** : les règles d'écriture de `subject_properties` (`initial_schema.sql:275-279`) et de
`competitor_prospecting_files` (`prospecting_file.sql:87-92`) ne vérifient que l'`agency_id` de la ligne,
pas que le dossier lui appartient. `comparables` et `stream_estate_results` ont été corrigées à la M108.

17. Ces deux règles vérifient que le dossier (ou le concurrent) appartient à l'agence, sur le modèle de
    `finitions_audit_5.sql:36-46`. La migration s'arrête si une ligne existante est rattachée à une autre
    agence (comptage avant).
18. Le test d'isolation (`agency_isolation_all_tables.sql`) ajoute le cas mixte « mon `agency_id` + le
    dossier d'une autre agence » pour toute table rattachée à un dossier, pour qu'une future table ne
    puisse plus laisser passer ce cas.

## Preuves

19. Une migration, soumise avant d'être appliquée, avec comptages avant et après : conclusions sans
    première issue et règle de rattrapage (A), fonction du prix de commercialisation (D), règles
    d'écriture (G), lignes rattachées à une autre agence (0 attendu).
20. Tests :
    - un Live avec prix saisi puis « Mandat signé » : première issue « signé », compté au rendez-vous ;
    - le rang avec un concurrent hors Live et un « Non » ;
    - synthèse : montants figés après la conclusion, libellés du Live, décision refusée sur un dossier
      conclu ;
    - prix de commercialisation refusé sur un dossier conclu, à l'action et en base ;
    - courrier refusé sur une copie dont la carte est opposée, par chaque chemin ;
    - critère trié resserré : aucun appel payant, résultat gardé ; autre réglage : avertissement, et une
      relance qui échoue ne fait rien perdre ;
    - écriture refusée sur le dossier d'une autre agence, pour les deux tables.
21. Aucun appel Stream Estate payant dans les tests ni dans l'e2e. `npm run e2e` vert, tablette comprise.

## Décisions à respecter

- Décisions de Laurent (21/10, sur recommandation de l'audit n°7) : la synthèse dit les trois prix du
  Live, figés à la conclusion ; une décision de prix ne se modifie plus après la conclusion ; un critère
  trié se réapplique sans repayer, les autres préviennent avant de perdre le résultat.
- M89 (vocabulaire des prix), M92 (méthode infalsifiable), M104 (rang), M107 (résultat payé jamais
  perdu, libellé neutre), M109 (dossier conclu figé, aucun courrier sur un bien opposé), M110 (synthèse,
  parcours des issues, critères triés).
- Jamais « estimation » à l'écran. Ni adresse, ni titre, ni lien d'annonce, ni « Vendu par » côté vendeur.
- La clé d'opposition couvre tout l'immeuble pendant la bêta.
- On ne modifie ni `extension/` ni le Localisateur.

## Hors périmètre

- Les P2 de l'audit n°7 (tableau « Le reste, et le chemin vers 8 »).
- Supabase Pro (décision de Laurent du 19/10 : plus tard).

## Essai sur l'URL d'essai

1. Sur le dossier d'exemple, saisir le prix pendant le Live, terminer, conclure « Mandat signé » : le
   tableau « Prise de mandat » le compte « signé au rendez-vous ».
2. Ouvrir la synthèse de ce dossier : « Prix des concurrents » et « Analyse du conseiller » comme au Live.
   Essayer de modifier la décision de prix : refusé.
3. Dans « Réglages de la recherche » d'un dossier qui a un résultat payé, cocher « Piscine » : les biens
   sont triés à nouveau, sans nouvelle recherche. Changer le rayon : l'avertissement s'affiche avant
   d'enregistrer.
4. Ensuite, demander à Claude Code de retirer les données de test, avec comptage avant et après.
