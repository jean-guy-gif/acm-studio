# Fiche Chrome Web Store — extension ACM Studio

Prête à copier dans le tableau de bord développeur du Chrome Web Store. Visibilité :
**non répertorié** (accessible par le lien seulement). Le paquet à déposer se fabrique avec
`npm run extension:zip` → `dist/acm-studio-extension-<version>.zip`. Le dépôt est fait par
Laurent, avec son compte développeur.

## Fiche

**Nom**

```
ACM Studio — Accès annonces
```

**Description courte** (132 caractères au plus — la même que dans `manifest.json`)

```
Lit, à la demande du conseiller, les annonces immobilières des portails pour ACM Studio. Ne stocke rien, n'envoie rien ailleurs.
```

**Description longue**

```
ACM Studio aide le conseiller immobilier à préparer puis à conduire son rendez-vous vendeur. Cette extension est son complément : elle permet à ACM Studio de lire, dans le navigateur du conseiller, les annonces et les recherches qu'il consulte sur les portails immobiliers.

Ce que fait l'extension, et seulement quand le conseiller clique dans ACM Studio :
• importer une annonce : elle lit la page de l'annonce et la transmet à ACM Studio, qui remplit la fiche du bien ou du concurrent ;
• ouvrir mes recherches : elle ouvre, dans des onglets visibles, les recherches déjà filtrées sur les portails ;
• lire mes recherches : elle lit les onglets de recherche ouverts et transmet leurs résultats à ACM Studio.

Sites lus : SeLoger, Bien'ici, Green Acres, Figaro Immobilier, Maisons et Appartements. Aucun autre.

Ce que l'extension ne fait pas : elle ne lit ni l'historique, ni les autres onglets, ni les mots de passe ; elle n'analyse rien, ne conserve rien et n'envoie rien ailleurs qu'à ACM Studio. Elle respecte le fichier robots.txt des portails.

L'extension ne sert qu'avec un compte ACM Studio, réservé aux agences clientes.

Éditeur : SAS Start Academy — formation@start-academy.fr
```

**Catégorie** : Outils · **Langue** : Français

**Adresse de la politique de confidentialité**

```
https://acm-studio-henna.vercel.app/confidentialite
```

**Adresse de contact** : `formation@start-academy.fr`

## Pratiques de confidentialité

**Objet unique**

```
Permettre à ACM Studio de lire, à la demande du conseiller immobilier, les pages d'annonces et de recherche des portails immobiliers ouvertes dans son navigateur, afin de préparer son rendez-vous vendeur.
```

**Justification de `tabs`**

```
Retrouver, parmi les onglets ouverts, ceux qui affichent une recherche sur les portails immobiliers autorisés (adresse et titre), ouvrir les onglets de recherche demandés par le conseiller, attendre la fin du chargement d'une page et revenir à l'onglet ACM Studio une fois la lecture terminée. Aucun autre onglet n'est consulté.
```

**Justification de `scripting`**

```
Lire le contenu HTML (document.documentElement.outerHTML) de la page d'annonce ou de recherche que le conseiller a demandé à importer, sur les seuls portails autorisés. Le script injecté lit la page ; il ne la modifie pas, ne clique pas et ne saisit rien.
```

**Justification des autorisations d'hôte** — chaque site autorisé

| Site autorisé (`host_permissions`)                                           | Pourquoi                                                                                                                   |
| ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `https://seloger.com/*`, `https://*.seloger.com/*`                           | SeLoger : lire les annonces et les pages de résultats, ouvrir la recherche filtrée, lire son `robots.txt`.                 |
| `https://bienici.com/*`, `https://*.bienici.com/*`                           | Bien'ici : lire les annonces et les pages de résultats, ouvrir la recherche filtrée, lire son `robots.txt`.                |
| `https://green-acres.fr/*`, `https://*.green-acres.fr/*`                     | Green Acres : lire les annonces et les pages de résultats, ouvrir la recherche filtrée, lire son `robots.txt`.             |
| `https://immobilier.lefigaro.fr/*`                                           | Figaro Immobilier : lire une annonce que le conseiller importe, lire son `robots.txt`.                                     |
| `https://maisonsetappartements.fr/*`, `https://*.maisonsetappartements.fr/*` | Maisons et Appartements : lire les annonces et les pages de résultats, ouvrir la recherche filtrée, lire son `robots.txt`. |

Texte à coller dans le champ unique du Store :

```
L'extension lit des pages d'annonces et de résultats de recherche sur cinq portails immobiliers, et sur aucun autre site : SeLoger (seloger.com), Bien'ici (bienici.com), Green Acres (green-acres.fr), Figaro Immobilier (immobilier.lefigaro.fr) et Maisons et Appartements (maisonsetappartements.fr). Pour chacun, l'autorisation sert à lire la page que le conseiller demande d'importer et le fichier robots.txt du site ; pour SeLoger, Bien'ici, Green Acres et Maisons et Appartements, elle sert aussi à ouvrir et à lire les onglets de recherche du conseiller. Le script de contenu, lui, ne s'exécute que sur ACM Studio : il relie la page ACM Studio à l'extension.
```

**Code distant** : Non, l'extension n'utilise aucun code distant (tout le code est dans le paquet).

**Utilisation des données** — cases à cocher

- Collecte de données utilisateur : **aucune case cochée** pour les informations personnelles,
  de santé, financières, d'authentification, les communications personnelles, la localisation,
  l'historique Web et l'activité de l'utilisateur.
- **Contenu de sites Web** : coché. Le contenu des pages d'annonces et de recherche des portails
  autorisés est lu, et transmis uniquement à ACM Studio, uniquement sur une action du conseiller.
  L'extension elle-même ne conserve rien.

**Déclarations** — les trois cases sont cochées

- Je ne vends ni ne transfère les données des utilisateurs à des tiers, en dehors des cas
  d'utilisation approuvés.
- Je n'utilise ni ne transfère les données des utilisateurs à des fins sans rapport avec l'objet
  unique de l'extension.
- Je n'utilise ni ne transfère les données des utilisateurs pour déterminer leur solvabilité ou à
  des fins de prêt.

En clair : rien n'est collecté par l'extension, rien n'est vendu ; la page lue part seulement vers
ACM Studio, et seulement sur une action du conseiller.

## Éléments graphiques

- Icône 128 × 128 : `extension/icons/icon-128.png` (régénérée par `npm run extension:icons`).
- Captures d'écran (1280 × 800 ou 640 × 400, une au moins) : à faire par Laurent sur l'écran des
  concurrents, avec un dossier nommé « TEST ».

## Après le dépôt

L'identifiant de l'extension publiée diffère de celui du mode développeur : l'ancienne extension
non empaquetée se retire de `chrome://extensions` avant d'installer celle du Store. Toute
modification des permissions relance la validation de Google.
