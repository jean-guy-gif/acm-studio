# MISSION 33 — Délai de commercialisation lu dans l'annonce elle-même

**Date** : 19 août 2026
**Demande** : « le délai de commercialisation n'est jamais inscrit […] je ne veux pas
que ce soit une manipulation à faire de la part de l'utilisateur et que ça se fasse
en back par l'outil automatiquement pour chaque annonce »

---

## 1. Ce qui a été écarté, et pourquoi

Trois pistes ont été étudiées avant d'écrire une ligne de code.

### 1.1 Castorus — écarté (compte obligatoire)

Castorus expose l'historique par extension navigateur ou après connexion. Un compte
implique des identifiants à stocker et à rejouer côté serveur : refusé. Par ailleurs
Green Acres n'est pas suivi par Castorus, ce qui aurait laissé un trou de toute façon.

### 1.2 L'Acquéreur.fr — écarté (robots.txt + CGU)

Vérification faite le 19/08 sur le site lui-même.

`https://lacquereur.fr/robots.txt` :

```
User-Agent: *
Allow: /
Disallow: /account
Disallow: /listing-analysis
Disallow: /auth
Disallow: /home
Disallow: /api
```

Les deux seules portes utiles — `/listing-analysis` et `/api` — sont explicitement
interdites aux robots.

CGU, article 5 : « ne pas chercher à contourner les mesures techniques de sécurité,
à extraire massivement des données » et « utiliser le Service à des fins personnelles
et non commerciales ». Article 7 : les bases de données mises en œuvre sont protégées,
« toute reproduction, représentation, adaptation ou exploitation non autorisée est
interdite ».

Un appel automatique pour chaque annonce depuis un outil vendu à des agences est
simultanément de l'extraction massive et de l'usage commercial. Écarté.

L'article 6 des mêmes CGU indique la provenance de leurs données : « données publiques
(ADEME, DVF, INSEE) et […] fournisseurs d'annonces tiers ». Autrement dit, l'ancienneté
qu'ils affichent ne sort pas d'une source publique gratuite : elle est achetée.

### 1.3 Une capture par « Enregistrer la page » — insuffisant

Rappel de la MISSION 32 : `Cmd+S` et « afficher le code source » renvoient le HTML du
serveur, pas ce que le conseiller a sous les yeux. Sur Bien'ici, le fichier obtenu fait
15 Ko et ne contient ni annonce ni date. Seul le raccourci navigateur capture le DOM
vivant.

---

## 2. Ce qui a été trouvé

**Les portails publient eux-mêmes la date de première mise en ligne.**

Relevé dans la page SeLoger fournie par Laurent (annonce Fontmerle/Estagnol, Antibes) :

```
{"type":"datePosted","content":"2026-04-10T07:32:00.000Z"}   ← schema.org RealEstateListing
"creationDate":"2026-04-10T07:32:00Z"                        ← données applicatives SeLoger
"updateDate":"2026-07-30T01:26:58.939Z"                      ← modification, PAS une republication
```

Mise en ligne le 10 avril, relevé le 19 août : **131 jours**.

Aucun compte, aucun service tiers, aucune manipulation supplémentaire : la page que le
raccourci navigateur capture déjà contient l'information.

---

## 3. Ce qui a été implémenté

### 3.1 `utils/extract-listing-published-at.ts` (nouveau)

Deux stratégies, dans cet ordre.

**a. Lecture en clair.** Dix clés de première publication sont reconnues :
`datePosted`, `datePublished`, `dateCreated`, `creationDate`, `publicationDate`,
`firstPublicationDate`, `publishedAt`, `createdAt`, `newPropertyDate`, `dateMiseEnLigne`.
Les guillemets échappés (une ou deux couches) et la forme aplatie schema.org de SeLoger
(`{"type":…,"content":…}`) sont gérées. La date la **plus ancienne** est retenue : une
page peut dater le bien, l'agence et l'annonce.

`updateDate` et consorts sont volontairement absents de la liste. Une annonce modifiée
n'est pas une annonce republiée ; les confondre fausserait le délai montré au vendeur.

**b. Déréférencement d'un tableau aplati (Nuxt).** Le Figaro n'écrit pas la date en
clair : son bloc `__NUXT_DATA__` remplace les valeurs par leur **indice**
(`"creationDate":1020` = « la valeur est à la case 1020 »). Le module analyse le tableau
et déréférence.

Garde-fou : la date n'est acceptée que si la page n'en contient **qu'une seule**.
Mesuré sur la page d'agence fournie (Avenir Immobilier) : 31 annonces, donc 31 dates —
impossible de désigner « celle de l'annonce ». Le module renvoie alors `null` au lieu
de deviner.

**Vraisemblance.** Une date future (au-delà de deux jours de dérive d'horloge) ou
vieille de plus de dix ans est rejetée : c'est un artefact, pas une mise en ligne.

### 3.2 Chaîne d'import

`ExtractedParts.listingPublishedAt` → `ImportedComparableData.listingPublishedAt`
et `.daysOnMarket` → préremplissage du champ « Délai de commercialisation (jours) »
qui existait déjà et se saisissait à la main.

Le panneau d'import affiche la provenance :
« Mise en ligne le 10/04/2026 · 131 jours — d'après la date publiée par le portail. »

C'est volontaire : le conseiller doit pouvoir constater d'où sort le chiffre, et
vérifier lui-même quels portails la donnent.

### 3.3 Persistance : la date, pas le nombre de jours

Migration `20260819100000_comparables_listing_published_at.sql` :
colonne `listing_published_at timestamptz` sur `comparables`.

Motif : un import réalisé trois semaines avant le rendez-vous afficherait un délai
périmé. En stockant la date, le délai est **recalculé le jour du Live**.

Pas de contrainte `CHECK` fondée sur `now()` : une telle contrainte n'est pas immuable
et fragilise les restaurations de sauvegarde. La vraisemblance est vérifiée à la lecture
et à la saisie.

### 3.4 Le conseiller garde le dernier mot

Règle implémentée dans `parseComparableForm` : si le conseiller corrige le délai vers
une valeur que la date du portail ne produit pas (écart supérieur à un jour), la date
est **oubliée**. Sans cela, elle reprendrait la main au moment du Live et effacerait
silencieusement sa correction — il sait des choses que la page ignore (remise en ligne,
changement de mandat).

### 3.5 Live et présentation vendeur

`build-seller-presentation` alimente `firstSeenAt` avec `listing_published_at`.
Le fournisseur existant (`price-history-provider`) préférait déjà `firstSeenAt` au
champ saisi : rien d'autre à changer. L'invariant M27 est intact — la durée reste
révélée après l'estimation du vendeur.

---

## 4. Mesure sur les six pages réelles fournies (19/08)

| Portail                                     | Poids de la page | Date de mise en ligne                           |
| ------------------------------------------- | ---------------- | ----------------------------------------------- |
| SeLoger — Fontmerle/Estagnol                | 657 Ko           | **10/04/2026 → 131 jours**                      |
| Le Figaro — page d'agence Avenir Immobilier | 995 Ko           | présente (31 annonces) → écartée volontairement |
| Belles Demeures — villa 3 300 000 €         | 494 Ko           | aucune                                          |
| Green Acres — La Muette                     | 872 Ko           | aucune (seul `foundingDate` 2004 de l'agence)   |
| Maisons et Appartements — Jjc               | 195 Ko           | aucune                                          |
| Bien'ici — 57 m² 279 900 €                  | 15 Ko            | page vide (capture `Cmd+S`) — non concluant     |

Les trois « aucune » ne sont pas des captures ratées : les pages sont complètes
(872 Ko, 494 Ko, 195 Ko) et ne contiennent aucune date d'annonce. **Ces portails ne
publient pas l'ancienneté de leurs annonces.**

---

## 5. Ce qui reste ouvert

1. **Une vraie page d'annonce Figaro** (pas une page d'agence) pour confirmer que le
   déréférencement renvoie bien la date unique attendue.
2. **Une capture Bien'ici par le raccourci navigateur** (le `Cmd+S` ne donne rien).
3. **Les baisses de prix.** Aucune page ne les publie. `updateDate` signale une
   modification, pas une baisse : le présenter comme une baisse serait une invention.
   La seule voie propre et gratuite est l'historique construit par l'outil lui-même —
   une observation datée à chaque import, la série se remplit avec l'usage. À arbitrer.

---

## 6. Raccourci « Vérifier l'ancienneté » (ajout du 19/08)

Sur les trois portails qui ne publient aucune date, le délai se saisit à la main.
Pour que ce ne soit pas une corvée, un bouton apparaît **sous le champ, et
seulement quand le portail n'a rien publié** :

1. il copie l'adresse de l'annonce dans le presse-papiers ;
2. il ouvre L'Acquéreur dans un nouvel onglet ;
3. le conseiller colle (Cmd+V) et reporte le nombre de jours.

Ce que ce raccourci n'est pas : un appel automatisé. C'est le conseiller qui
consulte le service, dans son navigateur, avec son adresse IP, comme n'importe
quel visiteur. Nos serveurs n'interrogent rien — un appel en série depuis le
nôtre serait interdit par leurs conditions (voir §1.2) et bloqué en quelques
jours, ce qui ferait tomber la fonction en plein rendez-vous.

L'adresse de l'annonce n'est **pas** passée en paramètre d'URL : le format
attendu par le service n'est pas connu, et une adresse de travail n'a rien à
faire dans la barre d'adresse d'un tiers. Un test verrouille cette propriété.
Le jour où le format de lien direct sera connu, seule `listingAgeLookupUrl()`
changera.

---

## 7. Barrières

490 tests (dont 18 nouveaux) · `tsc --noEmit` · `eslint` · `prettier --check` ·
build de production.

Aucune requête sortante ajoutée. Aucune donnée inventée : sans date publiée,
`listing_published_at` et `days_on_market` restent nuls et le champ se saisit à la main,
comme avant.
