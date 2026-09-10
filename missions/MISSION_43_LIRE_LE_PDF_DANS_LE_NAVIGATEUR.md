# MISSION 43 — Lire le PDF dans le navigateur

**Date** : 7 septembre 2026
**Origine** : quatre tentatives de correctif en production sur la mission 42, toutes
échouées. On change d'endroit, pas de code.

---

## 1. Pourquoi on déplace

Ce n'est pas un bug qu'on n'arrive pas à trouver. C'est un choix d'architecture qui
coûte cher.

Faire tourner pdfjs dans une fonction serverless oblige à trois choses fragiles, et
chacune nous a mordu :

1. **Résoudre des chemins de fichiers** vers les dossiers de données de pdfjs —
   `require.resolve` a renvoyé un identifiant de module du bundler (`15728`) au lieu
   d'un chemin.
2. **Tracer ces dossiers** dans la fonction — la clé `outputFileTracingIncludes`
   ne matchait jamais, les crochets de `[projectId]` étant lus comme une classe de
   caractères en glob.
3. **Contrôler ce que le bundler fait du paquet** — d'où `serverExternalPackages`.

Dans le navigateur du conseiller, **aucun de ces trois mécanismes n'existe**. pdfjs
est une bibliothèque de navigateur : elle y est chez elle, ses fichiers de données
sont servis en statique par Next, et son worker est géré nativement.

C'est aussi déjà la doctrine du dépôt : le favori « Envoyer vers ACM Studio » et le
collage `Cmd+A / Cmd+C / Cmd+V` font exactement ça — **le navigateur produit le
contenu, le serveur l'analyse**.

---

## 2. Ce qui ne change pas

C'est le cœur de la mission : la valeur de la mission 42 est conservée intégralement.

- **`parse-agency-brochure.ts`** — le lecteur générique « Libellé : valeur » et la
  table de correspondance. Pas une ligne. Il prend du texte, il rend des champs.
- **`map-brochure-to-property.ts`** et le pré-remplissage des trois formulaires.
- **La règle du prix** : le prix lu est une information affichée, il n'écrit aucun
  champ et ne préremplit jamais la fourchette du conseiller.
- **`depositPropertyPhoto`** (mission 37) pour le dépôt des photos.
- Les **fixtures `.txt`** committées.

---

## 3. Ce qui change

**Le texte.** Un composant client lit le PDF avec pdfjs dans le navigateur et
extrait le texte page par page. Il utilise **la même fonction
`reconstructPageText`** qu'aujourd'hui — déplace-la dans un module partagé,
utilisable côté client : elle est pure, elle n'a rien de `server-only`.

Le navigateur envoie ensuite **le texte** à l'action serveur : quatre à sept
kilo-octets par fiche, contre trois à quatre mégaoctets de PDF aujourd'hui.

**Les fichiers de données de pdfjs.** Dans le navigateur ils sont récupérés en
HTTP, pas résolus sur un disque. Copie `standard_fonts/` et `cmaps/` dans
`public/pdfjs/` par un script de build, et passe `standardFontDataUrl:
'/pdfjs/standard_fonts/'` et `cMapUrl: '/pdfjs/cmaps/'`. Des fichiers statiques
servis par Next : rien à tracer, rien à résoudre.

**Le worker.** Sers-le depuis `public/` de la même façon, ou par
`new URL(..., import.meta.url)` si le bundler le gère proprement pour du code
client. Vérifie lequel des deux tient au build.

**Les images.** Le décodage et le ré-encodage passent aussi dans le navigateur — et
là, il a mieux que `jpeg-js` : rends l'image dans un `canvas` et utilise
`canvas.toBlob('image/jpeg', 0.82)`. Natif, rapide, aucune bibliothèque. Les JPEG
partent ensuite vers l'action de dépôt existante.

Cela supprime au passage la question du temps d'exécution serverless sur vingt
images : le travail se fait sur la machine du conseiller.

---

## 4. Ce qu'on supprime

- `services/pdf-document-params.ts`
- `serverExternalPackages` et `outputFileTracingIncludes` dans `next.config.ts`
  (vérifie qu'aucune autre fonctionnalité n'en dépend — rien n'en dépend)
- `extract-pdf-text.ts` et `extract-pdf-images.ts` dans leur forme serveur actuelle
- `jpeg-js` et `pdfjs-dist` en dépendance **de production serveur** — pdfjs devient
  une dépendance client

Trois sources de fragilité en moins, et une configuration de build qui redevient
lisible.

---

## 5. Garde-fous

**Le PDF ne quitte plus l'ordinateur du conseiller.** C'est un gain de
confidentialité réel, à dire aux conseillers : la fiche de leur client n'est
téléversée nulle part.

**Ne jamais faire confiance au client.** Le navigateur produit maintenant les
données, donc le serveur doit continuer de tout valider :

- longueur du texte reçu bornée côté serveur (une fiche fait quelques kilo-octets ;
  refuse au-delà d'une borne large mais réelle) ;
- chaque photo revalidée par `validatePhotoBytes` — octets magiques, format, taille,
  nombre — exactement comme un téléversement manuel ;
- le texte reçu est une **donnée** : jamais exécuté, jamais réinjecté comme HTML.

**Le conseiller relit la fiche pré-remplie avant d'enregistrer.** Inchangé.

---

## 6. Barrières

- **Les fixtures `.txt` doivent produire une sortie d'analyseur identique.** C'est
  le test de non-régression de la mission : même fonction de reconstruction, même
  texte, mêmes champs. Si la sortie bouge, la bascule a introduit une différence.
- `vitest` · `tsc --noEmit` · `eslint` · `prettier --check` · `next build`.
- **Et cette fois : essai sur le déploiement AVANT de déclarer la mission finie.**
  Quatre correctifs de la mission 42 ont été annoncés verts en local et rouges en
  production. Un build vert ne prouve rien sur une bibliothèque qui dépend de son
  environnement d'exécution.