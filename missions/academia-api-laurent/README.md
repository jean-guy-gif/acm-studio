# API Mon secteur v1, pour ACM Studio

Cette API permet à ACM Studio de lire le dossier de marché d'une adresse calculé par Mon secteur : ventes comparables, estimation indicative, DPE, population, urbanisme, permis, risques et copropriété. Elle donne aussi la part que le conseiller peut montrer au vendeur, et crée la page « Vivre ici » à envoyer à un acquéreur.

- **Adresse de base** : `https://app.myacademia.ai/api/v1`.
- **Format** : JSON en UTF-8. Les noms des champs sont en français.
- **Réponse `/bien`** (pour le conseiller) : schéma [`schema-bien.json`](schema-bien.json), exemple [`exemple-bien.json`](exemple-bien.json).
- **Réponse `/bien-client`** (ce que le vendeur peut voir) : schéma [`schema-bien-client.json`](schema-bien-client.json), exemple [`exemple-bien-client.json`](exemple-bien-client.json).
- Les schémas suivent JSON Schema 2020-12. Les exemples sont les réponses exactes du dossier de démonstration (un appartement de 4 pièces et 80 m²).

## Deux clés

- **La clé d'essai** (`ACM_TEST_API_KEY` chez Mon secteur) marche dès aujourd'hui. Elle ne donne que le dossier de démonstration (voir plus bas). Elle ne lit et n'écrit rien d'autre, et ne compte dans aucun plafond. C'est la clé de vos tests automatiques et de vos agences de démonstration.
- **La clé réelle** est ouverte depuis le 18 novembre 2026. Elle crée et lit les vrais dossiers.

Les deux clés s'emploient de la même façon. Gardez-les côté serveur, jamais dans du code exécuté chez l'utilisateur.

**Une clé ne s'écrit jamais dans le dépôt d'ACM Studio, qui est public : elle se pose dans les réglages de votre hébergeur (variables d'environnement).**

## Accès

- L'API se lit **de serveur à serveur seulement**. Un appel venu d'un navigateur (en-tête `Origin` ou `Sec-Fetch-Site`) est refusé (403), et l'API n'envoie aucun en-tête CORS.
- Chaque appel porte la clé : `Authorization: Bearer <clé>`. Une clé absente ou fausse donne 401.
- Tous les dossiers créés par l'API appartiennent au compte technique « ACM Studio ». L'API ne lit jamais le dossier d'un conseiller : un identifiant inconnu ou d'un autre compte donne 404.
- **Limites** : 120 appels par minute, avec l'une ou l'autre clé. Avec la clé réelle, 200 dossiers neufs par période de 24 heures (un dossier déjà prêt rendu de nouveau ne compte pas, une page « Vivre ici » non plus). Au-delà : 429, avec l'en-tête `Retry-After` en secondes.

## Le dossier de démonstration (clé d'essai)

- **Adresse** : `12 Avenue de la Démonstration, 06800 Cagnes-sur-Mer`. La rue est inventée ; la commune est réelle.
- **Identifiant** : `0de30000-0000-4000-8000-000000000001`.
- Les chiffres viennent d'un jeu de test anonymisé, passé dans le même calcul que les vrais dossiers. Les huit blocs sont remplis. Ce ne sont pas les chiffres d'un vrai bien : ne les présentez jamais comme tels.
- `POST /dossiers` avec cette adresse rend tout de suite le dossier prêt (200). Une autre adresse donne 422.
- `POST /dossiers/{id}/liens-client` rend toujours la même page : `https://app.myacademia.ai/l/demonstration`, marquée « Démonstration ».
- `GET /etat` rend `"essai": true`, l'adresse et l'identifiant de démonstration.

## Ce qui entre, ce qui sort

- **Entrée** : l'adresse, et si vous le voulez le bien (type, nombre de pièces, surface). Rien d'autre : pas de texte d'annonce, pas de nom, pas de téléphone, pas d'e-mail. Un champ en trop, ou une adresse qui contient un téléphone, un e-mail ou un lien, donne 400.
- **Sortie** : aucun numéro de téléphone et aucun nom de personne. Une vente donne sa voie **sans numéro** (`rue`), jamais son adresse complète. Le demandeur d'un permis n'est donné que si c'est une société (SIREN).
- Le prix et l'estimation de `/bien` sont des **données de travail pour le conseiller**. Ne les publiez jamais avec l'adresse exacte d'un bien. C'est vrai en particulier de `venteALAdresse` et des ventes marquées `aLAdresse: true` : elles associent un prix à l'adresse même.
- **L'estimation** s'affiche pour le conseiller seul, sous le nom « Valeur indicative d'Academia », avec sa `mention`. Jamais dans le Live, la présentation, un PDF ou un lien client.
- **Ce que le vendeur voit** vient de `/bien-client` seulement (voir plus bas).

## Durée de vie : 90 jours

**Les dossiers et leurs liens client sont effacés 90 jours après la création du dossier.** La date figure dans chaque réponse (`effaceLe`).

- Un lien client vit 30 jours. Il cesse de répondre plus tôt si le dossier est effacé.
- Quand vous recevez un **404** sur un dossier ou un lien que vous connaissiez, il a été effacé. **Redemandez le dossier** (`POST /dossiers`), puis **un nouveau lien** (`POST /dossiers/{id}/liens-client`).
- **Ne gardez pas un vieux lien pour l'envoyer à un acquéreur** : créez-en un au moment de l'envoi.

## Routes

### `GET /etat`

Vérifie que l'API répond et que la clé est bonne.

```json
{ "ok": true, "version": "1", "plafondDossiersParJour": 200, "appelsParMinute": 120, "conservationJours": 90 }
```

### `POST /dossiers`

```http
POST /api/v1/dossiers
Authorization: Bearer <clé>
Content-Type: application/json

{ "adresse": "12 Avenue de la Démonstration, 06800 Cagnes-sur-Mer", "bien": { "type": "appartement", "pieces": 3, "surface": 65 } }
```

- `bien` est facultatif. `type` vaut `appartement` ou `maison` ; `pieces` est un entier de 1 à 20 (6 et plus sont comptés ensemble, comme à l'écran) ; `surface` est en m², de 9 à 1 000.
- `surfaceMin` et `surfaceMax` (facultatifs, en m², de 9 à 1 000) choisissent la fourchette de surface des ventes comparables. Sans eux : la surface du bien à 25 % près. Le minimum doit rester plus petit que le maximum, sinon 400.
- **200** : un dossier prêt de moins de 30 jours existe pour cette adresse. Il est rendu (`"reutilise": true`), avec les blocs du bien si `bien` est donné. N'affichez pas `reutilise` : il dit seulement que l'adresse a déjà été demandée.
- **202** : le dossier est neuf. La collecte des données publiques dure de 20 à 60 secondes. L'en-tête `Location` donne l'adresse à suivre.
- **422** : adresse introuvable. **400** : adresse refusée par le service d'adresses, ou demande invalide.
- Après un 202, suivez le dossier avec `GET /dossiers/{id}` ; ne renvoyez pas `POST /dossiers` pendant la collecte.

```json
{ "id": "6f0c…", "statut": "en_cours", "adresse": "12 Avenue de la Démonstration, 06800 Cagnes-sur-Mer", "creeLe": "2026-11-17T10:00:00Z", "actualiseLe": null, "effaceLe": "2027-02-15" }
```

### `GET /dossiers/{id}`

Rend le même objet. `statut` vaut `en_cours`, `pret` ou `echec`. Interrogez toutes les 5 secondes au plus, et pendant 2 minutes au plus. Si le statut est `echec`, refaites un `POST /dossiers` plus tard.

### `GET /dossiers/{id}/bien?type=appartement&pieces=3&surface=65`

Les blocs du bien, **pour le conseiller** (voir [`exemple-bien.json`](exemple-bien.json)). `type`, `pieces` et `surface` sont obligatoires. En option : `&surfaceMin=50&surfaceMax=80`, la fourchette de surface des ventes comparables (voir le bloc `ventes`). Le dossier doit être prêt (sinon **409**, code `pas_pret`). Les chiffres sont exactement ceux que le conseiller voit dans Mon secteur pour ce bien : estimateur v1, cercle de 300 m autour de l'adresse.

### `GET /dossiers/{id}/bien-client?type=appartement&pieces=3&surface=65`

**Ce que le conseiller peut montrer au vendeur**, dans la présentation et le document final (voir [`exemple-bien-client.json`](exemple-bien-client.json)). Mêmes paramètres (fourchette de surface comprise), mêmes chiffres que `/bien`, mais seulement :

- **six blocs** : `ventes` ; `urbanisme`, `permis` et `risques` ; `population` et `copropriete`. Jamais l'estimation, jamais le DPE ;
- **pour les ventes** : l'anneau est choisi sans les ventes du bien ni de son immeuble, pour qu'un immeuble très vendu ne vide pas la liste ; il peut donc être plus large que celui de `/bien` ;
- **pour une vente** : la voie sans numéro (`rue`), la distance arrondie à 50 m (50 m au moins), le mois de la vente (`mois`, AAAA-MM, jamais le jour), le type, les pièces, la surface et le prix. Jamais une vente du bien ni de son immeuble (même parcelle, ou à moins de 40 m d'une adresse sans numéro) ;
- **pour un permis** : la voie sans numéro, jamais l'adresse complète ;
- **un bloc `non_verifie` arrive vide** : il ne peut pas être montré. Chaque bloc garde sa `source` et sa `date`, à afficher avec lui.

Le conseiller coche ce qu'il montre, bloc par bloc ; ACM n'affiche au vendeur que des champs de cette réponse.

### `POST /dossiers/{id}/liens-client`

Crée la page client « Vivre ici » de l'adresse et rend son lien.

- La page est **neutre** : elle ne porte ni marque, ni nom, ni coordonnées de conseiller.
- Elle est en **version « quartier »** : la commune seule, jamais la rue ni le numéro ; pas de repère d'adresse sur la carte ; un centre ramené à une grille d'environ 500 m ; des distances arrondies à 400 m près (7 minutes à pied, puis 14…). Un acquéreur ne peut pas retrouver l'adresse du bien, même hors mandat.
- La première demande pour un dossier prépare la page (de 5 à 15 secondes). Les suivantes sont immédiates.
- **201** : `{ "url": "https://app.myacademia.ai/l/…", "expireLe": "2026-12-17T10:00:00Z", "effaceLe": "2027-02-15" }`
- **409**, code `limite` : 10 liens actifs au plus par dossier.

## Les blocs de `/bien`

Chaque bloc porte :

- `etat` :
  - `ok` : la donnée existe.
  - `aucun` : la source a répondu et il n'y a rien.
  - `non_verifie` : la source n'a pas répondu, ou la donnée n'a pas été lue. **Ce n'est jamais un « rien à signaler ».**
- `source` : la source publique, en mots.
- `date` : la date de la donnée (AAAA-MM-JJ).
- `note` : une phrase quand l'état demande une explication, sinon `null`.

| Bloc | Contenu |
|---|---|
| `ventes` | Ventes du même type, **toutes pièces confondues**, dont la surface est dans la fourchette `surfaceMin`–`surfaceMax` (bornes comprises) : la surface du bien à 25 % près (arrondie au m²), ou la fourchette passée dans la demande, telle quelle. `pieces` rappelle les pièces du bien ; chaque vente garde les siennes. Elles sont comptées par anneaux de 50, 100, 250, 300, 500 et 800 m autour de l'adresse. `anneau` est le premier anneau qui réunit 5 ventes ; `liste` donne ses ventes, les plus récentes d'abord, chacune avec sa voie sans numéro (`rue`). Une vente à l'adresse même porte `aLAdresse: true`. La dernière vente à l'adresse, de tout type, est dans `venteALAdresse`. |
| `estimation` | Prix, fourchette basse et haute, prix au m², nombre de comparables et fiabilité. La `mention` (« Valeur indicative : elle ne remplace pas un avis de valeur. ») doit accompagner tout affichage de l'estimation. |
| `dpe` | `dernier` : le dernier DPE de l'adresse. `aLAdresse` : les DPE de la même adresse. Chacun porte `correspond` (même type que le bien et surface à 10 % près) et l'écart de surface. |
| `population` | Habitants et ménages dans le cercle de 300 m (Insee, carreaux de 200 m, valeurs arrondies). |
| `urbanisme` | Éléments du plan local d'urbanisme à trois distances : sur la parcelle (`parcelle`), à moins de 40 m (`a40m`) et jusqu'à 300 m (`a300m`). Ils sont comptés par catégorie : voirie, alignement, équipement, logements, attente de projet, OAP et périmètre. |
| `permis` | Permis de construire dans le cercle de 300 m, avec leur état (`autorise`, `chantier_ouvert`, `termine`), et permis de démolir. |
| `risques` | Argile, séisme, radon, territoire à risque d'inondation, arrêtés de catastrophe naturelle et zonage du PLU. Ce qui n'a pas pu être lu est listé dans `nonLus`. |
| `copropriete` | Copropriété immatriculée rattachée à l'adresse, ou la plus proche (`rattachement`). |

## Codes d'erreur

Chaque erreur a la forme `{ "erreur": "phrase en français", "code": "…" }`.

| Statut | Code | Que faire |
|---|---|---|
| 400 | `demande`, `adresse` | Corriger la demande (champs attendus seulement) ou l'adresse. |
| 401 | `cle` | Vérifier la clé. |
| 403 | `navigateur` | Appeler depuis votre serveur. |
| 404 | `introuvable` | Dossier inconnu ou effacé : le redemander. Si **toutes** les routes, `/etat` compris, répondent 404, l'API est fermée. |
| 409 | `pas_pret`, `limite` | Attendre la fin de la collecte ; désactiver d'anciens liens. |
| 422 | `adresse` | Adresse introuvable : vérifier le numéro, la rue, le code postal et la ville. Avec la clé d'essai : seule l'adresse de démonstration répond. |
| 429 | `trop_rapide`, `plafond_jour` | Attendre la durée de `Retry-After`. |
| 503 | `indisponible` | Réessayer dans un instant. |
