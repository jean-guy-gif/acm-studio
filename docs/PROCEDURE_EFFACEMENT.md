# Procédure d'effacement (RGPD) — pendant la bêta

Comment répondre à une demande d'effacement. Cette procédure est **exécutée par Claude Code, sur
demande de Laurent, jamais automatiquement**. « Supprimer » dans l'application n'efface rien : le
dossier est archivé (mission 93). L'effacement réel, c'est ici.

## Avant de commencer

1. Laurent confirme la demande par écrit : **qui** demande, **quoi** effacer, pour **quelle agence**
   (l'agence est responsable du traitement, Start Academy est son sous-traitant).
2. Lancer `npm run sauvegarde` (voir `docs/SAUVEGARDE.md`). Un effacement ne se rattrape pas.
3. Chaque étape suit la règle « Migrations » de CLAUDE.md : **compter avant, énoncer la prédiction,
   effacer, compter après**. Montrer les comptes à Laurent et attendre son « ok effacement » avant
   la première requête qui écrit.
4. Les requêtes se lancent sur la base partagée par la CLI épinglée (05/11) :
   `npx --yes supabase@3.0.0 db query --remote --read-only "<sql>"` pour compter,
   `npx --yes supabase@3.0.0 db query --remote --yes "<sql>"` pour écrire. Ne jamais afficher de clé
   ni de jeton dans le compte rendu.

Dans tout ce qui suit, `:agence`, `:dossier` et `:concurrent` sont des identifiants (uuid) à
remplacer. Le stockage des photos est le bucket privé `project-photos`.

## A. Un vendeur demande l'effacement de son dossier

Ce qui part : son dossier, son bien, ses photos, ses concurrents retenus, ses réponses du Live, sa
conclusion, les dossiers de prospection préparés à partir de son bien.

### 1. Retrouver le dossier

```sql
select id, agency_id, seller_name, seller_email, seller_phone, status, created_at
from projects
where seller_name ilike '%NOM%' or seller_email ilike '%EMAIL%' or seller_phone like '%TEL%';
```

Faire confirmer par Laurent la ou les lignes concernées. Un dossier archivé (`status = 'archived'`)
se trouve ici comme les autres.

### 2. Compter avant

```sql
select
  (select count(*) from projects where id = ':dossier') as dossier,
  (select count(*) from subject_properties where project_id = ':dossier') as bien,
  (select count(*) from subject_property_diagnostics d join subject_properties s
     on s.id = d.subject_property_id where s.project_id = ':dossier') as diagnostics,
  (select count(*) from subject_property_condominiums c join subject_properties s
     on s.id = c.subject_property_id where s.project_id = ':dossier') as copropriete,
  (select count(*) from comparables where project_id = ':dossier') as concurrents,
  (select count(*) from competitor_decisions where project_id = ':dossier') as decisions,
  (select count(*) from competitor_prospecting_files where project_id = ':dossier') as dossiers_prospection,
  (select count(*) from live_seller_responses where project_id = ':dossier') as reponses_live,
  (select count(*) from live_seller_summary where project_id = ':dossier') as resume_live,
  -- Mission 104 : la trace des réouvertures garde les réponses effacées ; elle part avec le dossier.
  (select count(*) from live_reopenings where project_id = ':dossier') as reouvertures_live,
  -- Mission 105 : le dernier résultat payé d'une recherche ; il part avec le dossier.
  (select count(*) from stream_estate_results where project_id = ':dossier') as resultat_recherche,
  -- Mission 110 : les liens de la synthèse laissée au vendeur ; ils partent avec le dossier.
  (select count(*) from seller_synthesis_links where project_id = ':dossier') as liens_synthese,
  -- Mission 127 : les points marché et leurs liens ; ils partent avec le dossier (cascade).
  (select count(*) from project_market_updates where project_id = ':dossier') as points_marche,
  (select count(*) from project_market_update_links where project_id = ':dossier') as liens_points_marche,
  (select count(*) from market_study_links where project_id = ':dossier') as liens_etude_de_marche,
  -- Mission 141 : le dossier d'adresse (données publiques de l'adresse) ; il part avec le dossier.
  (select count(*) from address_dossiers where project_id = ':dossier') as dossier_adresse,
  -- Mission 134 : les envois de ce bien aux acquéreurs ; ils partent avec le dossier (cascade).
  (select count(*) from buyer_proposals where project_id = ':dossier') as biens_proposes,
  -- Mission 139 : ce bien écarté pour des acquéreurs (libellé neutre, clé « project: »), à supprimer
  -- avec le dossier : delete from buyer_dismissals where property_key = 'project::dossier';
  (select count(*) from buyer_dismissals where property_key = 'project:' || ':dossier') as biens_ecartes,
  (select count(*) from project_price_positionings where project_id = ':dossier') as decision_prix,
  (select count(*) from project_meeting_conclusions where project_id = ':dossier') as conclusion,
  (select count(*) from projects) as dossiers_total;
```

Et les fichiers du stockage (bien vendeur et photos de prospection) :

```sh
npx --yes supabase@3.0.0 storage ls -r --experimental --remote "ss:///project-photos/:agence/:dossier/"
```

Prédiction : toutes les colonnes tombent à 0, `dossiers_total` baisse de 1, le dossier du stockage
est vide.

### 3. Effacer (après « ok effacement »)

Une seule transaction. L'ordre compte : les concurrents et le bien n'ont pas de suppression en
cascade depuis le dossier, ils partent d'abord ; tout le reste suit le dossier.

```sql
begin;
-- Mission 110 : les liens de la synthèse d'abord — plus aucun lien envoyé ne s'ouvre.
delete from seller_synthesis_links where project_id = ':dossier' and agency_id = ':agence';
-- Mission 127 : les liens des points marché, puis les points — plus aucun lien envoyé ne s'ouvre.
delete from project_market_update_links where project_id = ':dossier' and agency_id = ':agence';
delete from market_study_links where project_id = ':dossier' and agency_id = ':agence';
delete from project_market_updates where project_id = ':dossier' and agency_id = ':agence';
delete from address_dossiers where project_id = ':dossier' and agency_id = ':agence';
delete from comparables where project_id = ':dossier' and agency_id = ':agence';
delete from subject_properties where project_id = ':dossier' and agency_id = ':agence';
delete from projects where id = ':dossier' and agency_id = ':agence';
commit;
```

Puis le stockage :

```sh
npx --yes supabase@3.0.0 storage rm -r --experimental --remote --yes "ss:///project-photos/:agence/:dossier/"
```

### 4. Compter après

Relancer la requête du point 2 et le `storage ls` : tout doit correspondre à la prédiction. Sinon,
s'arrêter et le dire.

### Ce qui reste, et pourquoi

- `listing_observations` : des relevés d'annonces publiques (prix, date), rattachés à l'agence et
  non au vendeur. Aucune donnée du vendeur.
- Les sauvegardes déjà faites contiennent encore le dossier : les supprimer ou les refaire après
  l'effacement (`docs/SAUVEGARDE.md`), et le dire à Laurent.

## B. Le propriétaire d'un bien concurrent demande l'effacement

Ce qui part : **son adresse dans tous les dossiers**, les **dossiers de prospection** préparés pour
son bien, et les **photos copiées** de son annonce. L'annonce publique elle-même (prix, surface,
pièces) reste : elle sert au Live du vendeur, sans adresse.

Ce qui **entre** : son adresse, sous sa forme normalisée, et l'identité de son annonce (portail +
numéro), dans la liste « Ne plus solliciter » de chaque agence concernée (missions 98 et 102).
C'est elle qui empêche qu'un conseiller le démarche de nouveau si la même annonce est retenue dans
un futur dossier. La liste ne garde que ces clés et la date de la demande — ni nom, ni lien vers
une ligne de concurrent.

**Sans demande, la base efface seule** (mission 102) : chaque nuit, l'adresse d'un bien concurrent
pour lequel rien ne s'est passé depuis **3 ans** — ni adresse connue ou corrigée, ni dossier remis,
ni rendez-vous, ni mandat, ni « pas intéressé » — est effacée avec sa position
(`purge_stale_owner_addresses`, tâche `purge-stale-owner-addresses` de `pg_cron`). Le concurrent
reste retenu, l'annonce reste, et le Localisateur n'est plus interrogé pour lui
(`locator_purged_at`). Mission 120 — même règle, deux minutes plus tard, pour l'adresse d'un bien
démarché depuis une recherche acquéreur (`purge_stale_buyer_prospect_addresses`, tâche
`purge-stale-buyer-prospect-addresses`). La liste « Ne plus solliciter » n'est jamais purgée.
Vérifier les tâches : `select jobname, schedule, active from cron.job;`.

### 1. Retrouver son bien, dans tous les dossiers

Par l'adresse et, si on l'a, par l'adresse de l'annonce :

```sql
select c.id as concurrent, c.project_id as dossier, c.agency_id as agence, c.address,
       c.locator_address, c.listing_url, c.is_selected, c.prospecting_handed_at
from comparables c
where c.address ilike '%RUE%' or c.locator_address ilike '%RUE%'
   or c.listing_url ilike '%IDENTIFIANT_ANNONCE%';
```

Faire confirmer par Laurent les lignes concernées. Un même bien peut figurer dans plusieurs
dossiers, et dans plusieurs agences : chaque agence est responsable des siennes.

### 2. Compter avant

Avec la liste des concurrents confirmés (`:liste` = `'uuid1','uuid2',…`) :

```sql
select
  (select count(*) from comparables where id in (:liste)) as concurrents,
  (select count(*) from comparables where id in (:liste)
     and (address is not null or locator_address is not null
          or locator_latitude is not null)) as avec_adresse,
  (select count(*) from competitor_prospecting_files where comparable_id in (:liste)) as dossiers_prospection,
  (select count(*) from comparables where id in (:liste) and is_selected) as retenus,
  -- Mission 120 — les courriers d'une recherche acquéreur qui visent ce bien : par son concurrent,
  -- ou par son annonce (un bien démarché sans concurrent, `buyer_prospects`).
  (select count(*) from buyer_prospect_origins where comparable_id in (:liste)) as courriers_acquereur,
  (select count(*) from buyer_prospects where listing_key in
     (select listing_key from buyer_prospects p join comparables c
        on c.listing_url = p.listing_url where c.id in (:liste))) as biens_demarches;
```

Et les biens démarchés depuis une recherche acquéreur qui portent cette adresse ou cette annonce,
même sans concurrent (`:prospects` = leurs `id`) :

```sql
select id, agency_id, listing_url, locator_address, prospecting_handed_at
from buyer_prospects
where locator_address ilike '%RUE%' or listing_url ilike '%IDENTIFIANT_ANNONCE%';
```

Et, pour chaque concurrent, ses photos copiées :

```sh
npx --yes supabase@3.0.0 storage ls -r --experimental --remote "ss:///project-photos/:agence/:dossier/prospecting/:concurrent/"
```

Prédiction : `concurrents` inchangé ; `avec_adresse`, `dossiers_prospection` et `retenus` à 0 ;
chaque dossier `prospecting/:concurrent/` vide.

### 3. Inscrire l'adresse sur la liste « Ne plus solliciter » (après « ok effacement »)

À faire **avant** d'effacer : après, l'adresse n'est plus en base. Pour chaque adresse distincte
relevée au point 1 (`locator_address`, et `address` si elle diffère), calculer sa clé avec la
normalisation de l'application — jamais à la main :

```sh
npm run cle-adresse -- "8 avenue du Docteur Hochet, 2e étage, 06160 Juan-les-Pins"
# → 8 avenue du docteur hochet antibes
```

La clé désigne l'**immeuble** (mission 102) : ni code postal, ni étage, ni bâtiment, ni
appartement, ni « bis » ou « ter » ; le nom d'usage d'une commune vaut la commune, et un
arrondissement s'écrit « paris 15 ».

Compter avant (`select count(*) from prospecting_oppositions where agency_id = ':agence';`), puis
inscrire la clé pour chaque agence concernée. Une adresse déjà inscrite (par le bouton « Ne plus
solliciter » d'une carte) ne l'est pas deux fois :

```sql
insert into prospecting_oppositions (agency_id, address_key, source)
values (':agence', ':cle', 'erasure')
on conflict (agency_id, address_key) do nothing;
```

Si le concurrent a une annonce reconnue (SeLoger, Bien'ici, Green Acres, Maisons et Appartements),
inscrire aussi son identité, `portail:numéro` — le numéro est le dernier segment du chemin de
`listing_url` (`seloger`, `bienici`, `greenacres`, `maisonsetappartements`). Une ligne porte l'une
des deux clés, jamais les deux :

```sql
insert into prospecting_oppositions (agency_id, listing_key, source)
select ':agence', ':portail:numero', 'erasure'
where not exists (select 1 from prospecting_oppositions
                  where agency_id = ':agence' and listing_key = ':portail:numero');
```

Prédiction : le compte de l'agence monte de 1 par clé nouvelle (adresse ou annonce), de 0 pour une
clé déjà inscrite. Compter après.

Si le concurrent n'a aucune adresse en base, il n'y a rien à inscrire : le dire à Laurent, qui
prévient l'agence.

### 4. Effacer

```sql
begin;
delete from competitor_prospecting_files where comparable_id in (:liste);
update comparables set
  address = null,
  locator_address = null, locator_latitude = null, locator_longitude = null,
  locator_property_id = null, locator_label = null, locator_label_key = null,
  locator_source = null, locator_state = null, locator_confirmed = null,
  locator_analyzed_at = null,
  -- Sorti des concurrents retenus : il quitte la Prospection, et le Localisateur ne redemande
  -- son adresse que pour les concurrents retenus.
  is_selected = false,
  updated_at = now()
where id in (:liste);
commit;
```

Puis, pour chaque concurrent :

```sh
npx --yes supabase@3.0.0 storage rm -r --experimental --remote --yes "ss:///project-photos/:agence/:dossier/prospecting/:concurrent/"
```

Mission 120 — les courriers d'une recherche acquéreur (leurs textes et la photo copiée) et
l'adresse des biens démarchés sans concurrent. Les origines se listent AVANT (leurs dossiers de
stockage portent leur `id`) :

```sql
select id, agency_id from buyer_prospect_origins
where comparable_id in (:liste) or prospect_id in (:prospects);
begin;
update buyer_prospect_origins set
  letter_title = null, letter_body = null, letter_contact_hook = null,
  their_photo_mode = 'none', their_photo_source_url = null, their_photo_path = null,
  updated_at = now()
where comparable_id in (:liste) or prospect_id in (:prospects);
update buyer_prospects set
  locator_address = null, locator_latitude = null, locator_longitude = null,
  locator_property_id = null, locator_label = null, locator_label_key = null,
  locator_source = null, locator_state = null, locator_confirmed = null,
  locator_analyzed_at = null, locator_purged_at = now(), updated_at = now()
where id in (:prospects);
commit;
```

Puis, pour chaque origine listée :

```sh
npx --yes supabase@3.0.0 storage rm -r --experimental --remote --yes "ss:///project-photos/:agence/buyer-prospecting/:origine/"
```

La carte « Recherche acquéreur » reste, sans adresse ni courrier : elle porte « Ne plus
solliciter » dès le point 3, et le courrier est refusé.

### 5. Compter après

Relancer la requête du point 2 et les `storage ls`. Vérifier aussi qu'il n'est plus sur la page
Prospection de l'agence, et que sa clé d'adresse est dans `prospecting_oppositions`.

### Les limites, à dire à Laurent

- Si un dossier où il figurait est déjà conclu, les réponses du vendeur à son sujet restent (elles
  ne portent ni son nom ni son adresse).
- Un autre conseiller de l'agence peut retenir de nouveau la même annonce dans un nouveau
  dossier : dès que son annonce ou son adresse est connue, la carte porte « Ne plus solliciter
  (demandé le JJ/MM) », le courrier au propriétaire est refusé, l'adresse ne se corrige plus et
  elle sort de la tournée. La liste vaut par agence : il n'existe pas de liste commune à toutes
  les agences.
- La liste reconnaît une adresse écrite autrement (abréviations, accents, ponctuation, code
  postal, nom d'usage de la commune, arrondissement, étage, bâtiment, appartement, « bis »), pas
  une adresse différente : un autre numéro ou une autre rue, et ce n'est plus la même clé. Elle
  vaut donc pour tout l'immeuble.
- Retirer une adresse de la liste (erreur de saisie) ne se fait pas depuis l'écran : c'est une
  requête, sur demande de Laurent, avec comptage avant et après.
- Un courrier déjà imprimé et remis ne peut pas être repris.
- Les sauvegardes déjà faites contiennent encore l'adresse : les supprimer ou les refaire.
- Mission 136 — la veille des acquéreurs a pu trouver son annonce : les passages
  (`buyer_watch_runs.finds`) gardent ce que la recherche publie de l'annonce (prix, surface,
  photos, lien), jamais une adresse ; comme l'annonce publique, ils restent, et partent avec la
  fiche de l'acquéreur (cascade). À compter, s'il faut les citer :
  `select count(*) from buyer_watch_runs where finds::text ilike '%IDENTIFIANT_ANNONCE%';`

## C. Les documents signés (bon de visite ; offre d'achat, mission 137 B)

Décision de Jean-Guy du 06/11 : un document signé (`buyer_documents`) prouve le droit de l'agence à
sa rémunération. Il est **gardé cinq ans à compter de la visite** (`signed_at` : le bon se signe le
jour de la visite), même quand le visiteur demande l'effacement de ses données — article 17.3.e du
RGPD (constatation, exercice ou défense de droits en justice) et prescription de cinq ans —, puis
il est effacé. Il ne disparaît ni avec la fiche de l'acquéreur (`buyer_id` devient vide, le
document garde ses propres champs), ni avec le compte du conseiller (`created_by` devient vide) ;
les images de signature restent dans le bucket privé `signed-documents`.

Supprimer le compte d'un conseiller : ses fiches acquéreur passent à un manager de l'agence (sinon à
un autre membre non retiré), ses bons signés restent sans auteur ; ses dossiers vendeur, eux,
bloquent toujours la suppression (`projects.advisor_id` sans action) — les réattribuer d'abord, sur
demande de Laurent.

### Quand un visiteur demande l'effacement

1. Effacer la fiche acquéreur comme d'habitude (elle emporte sélections, réponses, visites et leurs
   comptes rendus, biens écartés pour lui et envois notés, missions 135 et 139).
2. Ses documents signés de moins de cinq ans **restent** : le dire au demandeur (« conservés jusqu'au
   JJ/MM/AAAA au titre de la preuve du droit à commission, art. 17.3.e RGPD »), avec la date.
3. Compter avant et après (`:nom` = le nom tel qu'il est sur le bon) :

```sql
select id, agency_id, kind, signed_at, signed_at + interval '5 years' as efface_le
from buyer_documents
where fields::text ilike '%' || :nom || '%';
```

### Chaque année : les documents de plus de cinq ans

Compter, faire confirmer par Laurent, puis effacer les lignes ET leurs images (après « ok
effacement ») :

```sql
-- Compter, et relever les chemins des images à retirer du stockage.
select id, agency_id, signed_at, signature_paths
from buyer_documents
where signed_at < now() - interval '5 years';
-- Effacer (leurs liens — notaire compris —, la réponse du vendeur à une offre et son « Fait »,
-- mission 138, partent avec eux, en cascade).
-- Relever d'abord les signatures du vendeur d'une offre :
-- select signature_paths from buyer_document_acceptances where document_id in (…);
delete from buyer_documents where signed_at < now() - interval '5 years';
```

```sh
# Pour chaque chemin relevé (`agence/document/signature-1.png`) :
npx --yes supabase@3.0.0 storage rm --experimental --remote "ss:///signed-documents/:chemin"
```

Prédiction : aucune ligne de plus de cinq ans restante ; chaque image relevée absente du bucket.

## Après chaque effacement

1. Rendre à Laurent le tableau « avant / prédit / après ».
2. Laurent répond au demandeur (délai légal : un mois).
3. Noter la demande et sa date dans le registre de l'agence concernée — hors d'ACM Studio.
