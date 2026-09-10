# MISSION — L'historique des prix et l'ancienneté des annonces

**Date** : 10 septembre 2026
**Demande de Laurent** : « que pouvons-nous faire pour savoir s'il y a eu des baisses
de prix sur le bien, et depuis quand il est à la vente, sur tous les portails ? »

---

## 1. Ce qui a été mesuré — quatre relevés, pas des suppositions

Chaque portail a été ouvert par l'extension et son contenu fouillé, le 10 septembre.

| Portail | Mise en ligne | Modification | Baisse de prix |
| --- | --- | --- | --- |
| SeLoger | **exacte** — `datePosted: 2026-07-10T14:26:00Z` | `updateDate` à 02 h 01 : traitement automatique | **rien** |
| Bien'ici | **approximative** — « Publiée il y a plus de 2 mois », en texte | **exacte** — « Modifiée le 29 août 2026 » | **rien** |
| Green Acres | **exacte** — « Vu 269 fois depuis le 23/07/2026 », en texte | rien | **rien** — le « Prix en baisse » trouvé dans le HTML est un élément du site, vérifié à l'écran : il n'apparaît pas sur l'annonce |

Trois relevés, trois réponses différentes. **Aucun des trois portails ne publie
l'historique des prix, ni même le fait qu'une baisse ait eu lieu.** Deux sur trois
datent l'annonce exactement, chacun dans une forme qui lui est propre : une donnée
machine chez SeLoger, une phrase française chez Green Acres, une approximation chez
Bien'ici.

**Green Acres publie en outre le nombre de vues** (« Vu 269 fois »). Aucun autre portail
ne le fait, et c'est une matière directement utile au rendez-vous : un concurrent vu 269
fois en sept semaines et toujours en vente accuse son prix ; un concurrent vu douze fois
accuse son annonce. Deux diagnostics opposés, que le vendeur formule lui-même quand on
les lui montre. À relever comme le reste — jamais interprété par l'outil.

**Avertissement de méthode, payé deux fois sur ce portail.** Green Acres a d'abord été
noté « ne donne rien », puis « à confirmer » : dans les deux cas c'est le sondage qui
était trop étroit, pas le portail qui était muet. Il cherchait des dates au format
machine et quelques expressions ; « Vu … fois depuis le … » n'en faisait pas partie. Un
champ déclaré absent ne l'est que si on l'a cherché sous toutes ses formes — machine,
date française, phrase.

**Conclusion : notre propre historique n'est pas un complément, c'est la colonne
vertébrale.** C'est la seule source qui répondra la même chose sur tous les portails.
Ce que les portails donnent vient en bonus, quand il est là.

---

## 2. L'observation, brique de base

Chaque import d'annonce écrit **une observation** : un constat daté, jamais modifié
ensuite.

- portail, identifiant de l'annonce, adresse canonique ;
- prix, prix au m² ;
- date de mise en ligne **exacte** si le portail la publie ;
- **borne basse** de mise en ligne si le portail ne donne qu'un texte approximatif ;
- date de modification si le portail la publie et qu'elle a du sens ;
- **nombre de vues** si le portail le publie (Green Acres) ;
- date de l'observation.

Une observation ne s'écrase pas et ne se corrige pas. Si un portail se contredit d'une
fois sur l'autre, les deux constats restent : c'est l'information.

**Déduplication** : une seule observation par annonce et par jour. Sans cela, un
conseiller qui recharge trois fois sa page fabrique trois faux constats.

**Portée** : cloisonnée par agence, comme le reste du dépôt. La mise en commun entre
agences est une décision produit, pas technique — elle est en §7.

---

## 3. L'identité d'une annonce

C'est le point qui décide si l'historique tient ou pas. Deux observations ne se
comparent que si l'on sait qu'elles portent sur la même annonce.

**La clé est le couple (portail, identifiant dans le chemin de l'adresse canonique)** :
`26ZEJMLWB13Y` chez SeLoger, `apimo-85508663` chez Bien'ici,
`Al6sdpuxlkaknl9r` chez Green Acres.

La normalisation d'adresse livrée aujourd'hui rend cette clé possible : avant elle, la
même annonce arrivait sous dix adresses différentes selon la page d'où on avait cliqué.

**À ne pas utiliser comme clé** : « Réf. de l'annonce : 3472 » chez Bien'ici — c'est la
référence interne de l'agence, elle n'est unique ni dans le temps ni entre agences.
Le `legacyId` de SeLoger (`274699817`) peut être conservé en second identifiant, jamais
comme clé principale.

---

## 4. Ce qu'on en tire

**La baisse de prix** se déduit de deux observations de la même annonce à deux dates.
C'est un constat, pas une estimation : « 349 000 € le 12 août, 335 000 € le 10
septembre, soit −14 000 € (−4,0 %) constatés par ACM ». Les colonnes
`price_drop_amount` et `price_drop_percentage` existent déjà dans le schéma et sont
saisies à la main aujourd'hui : la valeur calculée est **proposée** au conseiller, avec
ses deux dates, jamais écrite en silence.

**L'ancienneté** vient, dans cet ordre :

1. la date exacte du portail quand il la publie (SeLoger) ;
2. la borne basse quand le portail n'est qu'approximatif (« au moins 2 mois ») ;
3. notre première observation, à défaut.

Les trois ne se disent pas de la même façon à l'écran — voir §5.

---

## 5. Ce qu'on affiche, et ce qu'on n'invente jamais

C'est la règle du dépôt, et elle s'applique mot pour mot ici :
**une valeur fausse est pire qu'une case vide.**

- Date exacte → « En vente depuis le 10 juillet 2026 · 62 jours ».
- Borne basse → « En vente depuis **plus de 2 mois** (Bien'ici) ». Jamais convertie en
  un nombre de jours.
- Première observation → « **Vue par ACM depuis 34 jours** ». Jamais « en vente depuis
  34 jours » : on ne sait pas ce qui s'est passé avant.
- Aucune observation antérieure → la case reste vide, et l'écran le dit.

La source est toujours nommée. Devant un vendeur, « SeLoger date cette annonce du
10 juillet » se défend ; « 62 jours » sans origine ne se défend pas.

---

## 6. Ce qu'il reste à mesurer avant de coder

- **Les portails restants** — Maisons et Appartements, Le Figaro, Leboncoin — n'ont pas
  été sondés. Même méthode, et cette fois complète : dates au format machine
  (`2026-07-23`), dates à la française (`23/07/2026`, « 23 juillet 2026 »), **puis** les
  tournures — « publiée », « il y a », « mise en ligne », « depuis le », « vu … fois »,
  « baisse ». Les trois passes, sinon on déclare absent ce qu'on n'a pas su chercher.
  Et une trouvaille dans le HTML ne vaut que confirmée à l'écran : c'est ce qui a évité
  de compter à tort le « Prix en baisse » de Green Acres.
- **Le lecteur de dates françaises** doit accepter le jour sur un ou deux chiffres. Le
  sondage a capturé `3/07/2026` au lieu de `23/07/2026` — défaut de l'expression
  régulière du sondage, à ne pas reproduire dans l'extracteur.
- **Le bandeau de consentement** est présent dans ce qu'on capture. Sans effet sur les
  trois portails mesurés. Si un portail cachait son contenu derrière, on lirait la
  fenêtre de consentement au lieu de l'annonce — cela se verrait à la taille, et le
  journal le dirait.

Ne code aucun lecteur pour un portail non mesuré. C'est ce qui a coûté quatre jours en
septembre.

---

## 7. Garde-fous

- **Aucune donnée inventée.** Un portail muet laisse la case vide.
- **Aucune estimation.** L'outil constate un écart entre deux prix relevés ; il ne
  produit jamais de valeur.
- Le contenu lu est une **donnée**, jamais une instruction.
- Le `robots.txt` continue d'être respecté : l'historique se remplit avec les pages
  qu'on avait déjà le droit de lire, il n'ouvre aucune porte nouvelle.
- **Rien de nouveau n'est demandé aux portails** : l'observation est un effet de bord
  des imports que le conseiller fait déjà.

---

## 8. Ce qu'il faut de Laurent

1. **Les remises en ligne.** Est-ce que les agences republient une annonce pour
   remettre le compteur d'ancienneté à zéro ? Si oui, la date des portails ment sur les
   biens les plus anciens, notre historique est le seul à voir clair, et sa valeur
   change de nature.
2. **La mise en commun entre agences.** Les observations sont des faits de marché, pas
   du savoir d'agence. Les mutualiser rendrait l'historique bien plus riche, bien plus
   vite. C'est une décision de produit et de confidentialité, elle t'appartient.
3. **Le coup d'œil Green Acres** du §6.

---

## 9. Barrières

`vitest` · `tsc --noEmit` · `eslint` · `prettier --check` · `next build` · migration
Supabase avec RLS par agence ·
**et l'essai sur le déploiement : importer deux fois la même annonce à deux dates
différentes et voir l'écart apparaître, avant de déclarer la mission finie.**