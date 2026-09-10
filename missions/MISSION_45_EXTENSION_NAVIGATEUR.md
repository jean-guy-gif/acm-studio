# MISSION — L'extension navigateur

**Date** : 10 septembre 2026
**Décision de Laurent** : l'accès aux portails passe par le navigateur du conseiller,
pas par un service payant. Coût récurrent : zéro.

---

## 1. Pourquoi c'est la bonne réponse

Le mur, depuis le 19 août, est toujours le même : **les portails refusent les adresses
de centre de données**. Aucun réglage de code ne le franchit, et c'est ce qui a fait
échouer l'import par adresse, puis la recherche automatique.

Dans le navigateur du conseiller, ce mur n'existe pas. C'est le même mouvement que la
mission 43 pour le PDF : le travail se déplace là où il passe.

**Et presque tout est déjà construit.** L'extension ne fait qu'automatiser le geste
`Cmd+A / Cmd+C` que le conseiller fait déjà à la main. Les actions serveur qui
reçoivent ce contenu — `importComparableHtml`, `importSearchResultsHtml` — existent,
sont testées, et tournent en production. L'extension leur fournit ce que l'humain
collait.

---

## 2. Ce que fait l'extension — et rien de plus

**Trois fonctions, aucune autre :**

1. Récupérer une page d'annonce à partir de son adresse, et renvoyer son contenu.
2. Récupérer une page de résultats de recherche, et renvoyer son contenu.
3. Répondre « je suis là » quand l'application lui demande.

**L'extension n'analyse rien.** Pas d'extracteur, pas de champs, pas de règles métier.
Elle rapporte du texte, l'application l'analyse avec le code existant. C'est la même
doctrine que la mission 43, et elle a une conséquence pratique : quand un portail
change sa mise en page, c'est l'application qu'on corrige, pas l'extension — donc
sans repasser par la validation de Google.

---

## 3. Le point technique qui décide de tout

**Un `fetch()` ne suffit pas.** Bien'ici construit sa page dans le navigateur : une
requête simple, même depuis l'extension, renvoie une coquille vide — exactement
l'échec du serveur. Et c'est vrai en partie pour SeLoger, dont la description
complète n'est pas dans le HTML d'origine.

L'extension doit donc **ouvrir réellement la page** : un onglet en arrière-plan,
attendre que le contenu soit rendu, lire `document.documentElement.outerHTML`, fermer
l'onglet. C'est ce que fait le favori « Envoyer vers ACM Studio » aujourd'hui, mais
déclenché par l'outil au lieu du conseiller.

Si cette partie est bâclée, on aura refait le même échec avec plus de code.

---

## 4. Architecture

- **Manifest V3.**
- **`externally_connectable` limité à l'origine exacte d'ACM Studio**, jamais `*`.
  L'application appelle l'extension directement depuis la page ; aucun aller-retour
  serveur, aucun intermédiaire.
- **`host_permissions` limitées aux domaines des portails retenus**, jamais
  `<all_urls>`. Une extension qui demande l'accès à tout le web ne passera ni la
  validation ni le regard d'un conseiller.
- L'extension **ne stocke rien** et **n'envoie rien ailleurs** que vers la page ACM
  Studio qui l'a appelée.
- Le dépôt de l'extension vit dans le même projet, dans un dossier séparé
  (`extension/`), avec son propre `manifest.json`. Ce n'est pas du code Next.js.

---

## 5. L'application sans l'extension

**L'outil doit rester entier quand l'extension n'est pas installée.** C'est la
majorité des conseillers au début.

- Au chargement, l'application demande à l'extension si elle est là. Sans réponse,
  elle continue comme aujourd'hui.
- Les gestes actuels ne disparaissent pas : coller l'adresse, coller la page, le
  favori, la saisie manuelle.
- La recherche automatique complète ne s'affiche que si l'extension répond. Sinon,
  l'écran propose ce qui existe déjà — les recherches pré-remplies et le collage de
  la page de résultats.

---

## 6. Politesse et cadre

C'est le point qui protège Laurent, et il ne doit pas être traité à la légère.

- **`robots.txt` continue d'être lu et respecté.** Le module `robots-policy.ts`
  existe : l'application vérifie l'autorisation **avant** de demander une page à
  l'extension. Une adresse interdite n'est jamais demandée.
- **Un rythme, pas un martèlement** : les pages sont récupérées une à une avec un
  délai entre chacune, et le nombre de pages par recherche est plafonné.
- **L'extension s'annonce** : elle ne se déguise pas en autre chose, elle n'usurpe
  aucune session, elle n'installe rien sur les pages des portails au-delà de la
  lecture.

Une honnêteté à garder en tête : le favori était défendable parce que le conseiller
regardait la page. Ici il ne la regarde pas. Le respect du `robots.txt` et le
plafonnement sont ce qui distingue un outil correct d'un aspirateur.

---

## 7. Découpage — deux temps

**Temps 1 : l'import d'une annonce par son adresse.**
L'extension récupère une page d'annonce, l'application l'analyse avec le code
existant. C'est le petit périmètre, il est testable seul, et il répare tout de suite
ce qui ne marche pas aujourd'hui : coller un lien SeLoger ou Bien'ici et voir la fiche
se remplir. À livrer et valider avant d'aller plus loin.

**Temps 2 : la recherche automatique.**
L'extension récupère les pages de résultats, l'application classe, enrichit,
présélectionne, et le conseiller valide le lot en un clic. C'est le brief de la
recherche automatique, qui reprend tel quel une fois l'accès résolu.

---

## 8. Ce qu'il faut de Laurent

- **La liste des portails** à mettre dans `host_permissions`. Aujourd'hui l'interface
  en nomme six, dont deux qui ne fonctionnent nulle part. C'est le moment de
  trancher, et de décider pour Leboncoin.
- **Un compte développeur Chrome à 5 $** — uniquement pour publier. Pas pour le
  pilote : une extension se charge « décompressée » dans Chrome, ce qui permet de la
  faire tourner chez deux ou trois conseillers sans attendre Google.

---

## 9. Barrières

`vitest` sur la partie analysable · `tsc --noEmit` · `eslint` · `prettier --check` ·
`next build` · l'extension chargée décompressée dans Chrome ·
**et l'essai sur le déploiement avec une vraie annonce de chaque portail retenu
avant de déclarer la mission finie.**