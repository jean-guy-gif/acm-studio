# MISSION 46 — L'extension qui lit vraiment la page, et sur le bon écran

**Date** : 10 septembre 2026
**Origine** : l'essai en navigateur du temps 1 de la mission 45. L'extension est
détectée, elle atteint bien la page — et l'import échoue quand même. Deux causes,
mesurées, plus un manque de fonctionnalité relevé par Laurent.

---

## 1. Ce qui a été mesuré — ce ne sont pas des hypothèses

Trois essais dans la console du service worker, sur la même annonce Bien'ici
(`apimo-85508663`, appartement 3 pièces à Villeneuve-Loubet).

| Mode d'ouverture | Délai | Taille du HTML lu | `visibilityState` |
| --- | --- | --- | --- |
| Onglet en arrière-plan (`active: false`) — le code actuel | 3,5 s | **29 264** | — |
| Onglet au premier plan (`active: true`) | 2 s | **287 833** | — |
| Fenêtre séparée non focalisée (`focused: false`) | 2 s | **286 225** | `visible` |

**Conclusion : ce n'est pas un problème de délai, c'est un problème de visibilité.**
Chrome ne construit pas la page d'un onglet que personne ne regarde. Le `SETTLE_MS`
de 3,5 s n'avait aucune chance d'y changer quoi que ce soit — trente secondes non
plus. Deux secondes suffisent dès que la page est affichée.

Deuxième observation, importante pour la suite : aux mesures suivantes la fenêtre
passe à `hidden` (elle s'est fait recouvrir) **et le HTML reste à 286 225**. Une page
construite ne se vide pas. On n'a donc besoin de la visibilité que pendant la
construction.

---

## 2. Corriger la récupération

### 2.1 Une fenêtre discrète, pas un onglet caché

Remplacer `chrome.tabs.create({ active: false })` par
`chrome.windows.create({ url, focused: false, width, height, top, left })`.

C'est le seul mode qui satisfait les deux contraintes : la page se construit, et le
conseiller ne perd ni le clavier ni son écran principal. La fenêtre est fermée dans
un `finally`, comme aujourd'hui — jamais laissée ouverte, même en cas d'erreur.

### 2.2 Attendre la page, ne plus la deviner

Le délai fixe disparaît. À la place, après `status: complete`, **surveiller la
page** : lire la taille du HTML toutes les 500 ms et s'arrêter dès qu'elle est
stable sur deux lectures consécutives (moins de 2 % d'écart). Plafond dur à 15 s.

C'est ce qui rend la correction durable : un portail lent ou rapide, une connexion
lente ou rapide, le code s'adapte au lieu de parier.

### 2.3 Un rattrapage, et un seul

Cas résiduel : si l'écran du conseiller est entièrement recouvert au moment de
l'ouverture, Chrome peut marquer la fenêtre `hidden` dès le départ et ne rien
construire.

Alors, **et seulement dans ce cas précis** — taille stabilisée sous un seuil bas
**et** `document.visibilityState === 'hidden'` —, remonter la fenêtre au premier plan
une fois (`chrome.windows.update(id, { focused: true })`), attendre à nouveau la
stabilité, puis **rendre le focus à la fenêtre d'où venait la demande**.

Le rattrapage est lié à la cause réelle et constatée, pas à un seuil de taille
arbitraire : un portail rendu côté serveur qui produit une petite page complète ne
doit pas déclencher de remontée inutile.

### 2.4 Dire ce qui s'est passé

C'est la vraie leçon de la journée. `fetchPage` n'écrit **aucun journal** et son
`catch` remplace l'erreur réelle par un message générique. Résultat : la console du
service worker était vide, et le message affiché au conseiller
(« Aucune information exploitable ») ne permettait pas de distinguer *l'extension a
échoué* de *l'extension a réussi et l'extracteur n'a rien trouvé*. C'est la même
faute que le `catch {}` vide qui a coûté quatre jours sur le PDF.

Donc :

- **chaque étape trace** : ouverture, `complete`, chaque lecture de taille, stabilité
  atteinte, rattrapage déclenché ou non, taille finale, durée totale ;
- **l'erreur réelle est conservée** dans le journal — le message montré au conseiller
  reste simple, mais l'information n'est plus détruite ;
- la réponse renvoyée à l'application porte **la taille et la durée**, pour que
  l'application puisse à son tour dire, quand l'analyse ne trouve rien, si elle a
  reçu une page complète ou une coquille.

---

## 3. Brancher l'écran qui compte

**L'extension n'est branchée que sur l'écran du bien vendeur.** L'écran
« Biens concurrents » (`builder/[projectId]/comparables/new`) appelle toujours
`importComparableUrl` en direct, donc depuis l'adresse de Vercel, donc contre le mur
du 19 août.

C'est l'inverse de l'utilité réelle : le bien vendeur arrive en fiche PDF trois fois
sur quatre ; **un concurrent n'existe jamais autrement qu'en ligne.**

Brancher l'écran concurrents sur le même chemin : détection de l'extension,
`robots.txt` lu dans le navigateur, page récupérée par l'extension, analyse par
`importComparableHtml`, et repli sur le serveur puis sur le copier-coller si
l'extension n'est pas là. C'est le même module client, les mêmes actions serveur —
il n'y a rien de nouveau à écrire, seulement à réutiliser.

**Facteur commun à extraire** : le panneau du bien vendeur et celui des concurrents
partagent désormais la même logique d'import. Sors-la dans un module partagé plutôt
que de la copier — une correction future doit se faire à un seul endroit.

---

## 4. Ce qui ne change pas

- **`robots.txt` reste lu et respecté avant toute demande de page**, et un refus
  n'est jamais lu comme une absence (`robots-decision.ts` est juste, il ne bouge pas).
- **L'extension n'analyse toujours rien.** Elle rapporte du texte, l'application
  l'analyse. Un portail qui change sa mise en page se corrige côté application, sans
  repasser par Google.
- **Rien n'est stocké, rien n'est envoyé ailleurs** qu'à la page ACM Studio qui a
  appelé.
- **Le HTML reçu est une donnée**, jamais une instruction : jamais exécuté, jamais
  réinjecté comme HTML, revalidé côté serveur.
- **L'outil reste entier sans l'extension** : les quatre gestes actuels subsistent.

---

## 5. Une note pour le temps 2

La recherche automatique ouvrira plusieurs pages de résultats à la suite.
**Une seule fenêtre réutilisée**, pas une par page : on y navigue successivement, avec
le délai entre chaque page prévu au brief de l'extension. Écris la récupération de
façon à ce que la fenêtre puisse être gardée ouverte entre deux pages — sinon il
faudra y revenir.

---

## 6. Barrières

`vitest` · `tsc --noEmit` · `eslint` · `prettier --check` · `next build` ·
l'extension rechargée dans Chrome ·
**et l'essai réel avant de déclarer la mission finie : une annonce Bien'ici et une
annonce SeLoger importées depuis l'écran du bien vendeur ET depuis l'écran
concurrents, avec la fiche qui se remplit et les photos qui remontent.**

Le repère chiffré est connu : une fiche Bien'ici complète pèse environ 286 000
caractères. En dessous de 50 000, la page n'est pas construite — et cette fois le
journal dira pourquoi.