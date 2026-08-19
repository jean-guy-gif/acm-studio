# MISSION 32 — Import assisté : « Envoyer vers ACM Studio »

Date : 18/08/2026 · Demande de Laurent : « quand le conseiller met un lien
d'annonce, les caractéristiques, le prix, le prix au m², le quartier, la ville
et les photos doivent être aspirés — de la même façon quand c'est l'outil qui
va chercher les biens concurrents ».

## 1. État des lieux honnête

**Le pipeline extrait déjà TOUS ces champs** : titre, prix, prix au m² (celui du
portail ET celui recalculé par ACM), surface, terrain, pièces, chambres, salles
de bains, DPE, GES, année, chauffage, énergie, adresse, code postal, ville,
quartier, description, caractéristiques, photos, plus les valeurs structurées
déduites (état général, exposition, extérieurs, stationnements). Ce n'est pas
l'extraction qui manque.

**Ce qui bloque, c'est l'ACCÈS à la page.** Depuis le Mac de Laurent (adresse
résidentielle) l'import direct passe souvent. Depuis Vercel (adresse de
datacenter) SeLoger et Bien'ici renvoient une page de blocage : il n'y a rien à
lire. Aucun réglage de code ne change cela, et le contournement d'anti-bot reste
interdit (PRD, et bon sens juridique).

Cette mission attaque donc l'accès, sans rien contourner.

## 2. Le raccourci « Envoyer vers ACM Studio »

Un favori à glisser UNE FOIS dans la barre de favoris du navigateur. Ensuite,
sur n'importe quelle annonce : un clic, et la page part dans ACM Studio qui
l'analyse et pré-remplit la fiche.

**Pourquoi c'est légitime.** Le conseiller consulte l'annonce dans SON
navigateur, avec SA session, sur une page qu'il a le droit de voir. Le raccourci
reprend cette page telle qu'elle s'affiche à lui. Nos serveurs n'interrogent pas
le portail, aucune protection n'est contournée, aucune session n'est usurpée.
C'est exactement le collage de code manuel déjà livré (Mission 26), ramené à un
clic.

**Enchaînement.**

1. Le conseiller clique sur le favori depuis l'annonce.
2. Le favori ouvre `/import-assistant` et lui envoie l'adresse et le code de la
   page, en plusieurs tentatives espacées (voir § 4 bis) — ciblé sur l'origine
   ACM Studio exacte, jamais sur `*`.
3. L'assistant affiche l'annonce reçue et demande dans quel dossier vendeur
   l'ajouter.
4. Au choix du dossier, la page part dans le formulaire d'ajout qui lance
   l'analyse tout seul : le conseiller arrive sur une fiche déjà remplie, qu'il
   vérifie avant d'enregistrer.

**Fichiers.**

- `services/build-bookmarklet.ts` — code du favori, isolé et **testé**
  (7 tests, dont l'exécution simulée sur une page de portail).
- `components/import-bookmarklet.tsx` — bouton à glisser + mode d'emploi.
  Affiché sur « Ajouter un bien concurrent » (dans le repli collage de code),
  sur « Trouver des concurrents », et sur l'assistant lui-même.
- `components/import-assistant-panel.tsx` — réception et choix du dossier.
- `components/import-transfer.ts` — passage de la page au formulaire par le
  stockage de session (même onglet), avec refus propre si le quota est dépassé.
- `app/(protected)/import-assistant/page.tsx` — page d'atterrissage, dans le
  shell protégé (session exigée, dossiers cloisonnés par agence).
- Formulaire d'ajout : analyse automatique à l'arrivée (`?assistant=1`).

## 3. Garde-fous

- **Le contenu reçu est une DONNÉE, jamais une instruction.** Il n'est ni
  exécuté, ni réinjecté comme HTML : il part dans l'analyse serveur existante,
  qui en sort des champs typés que le conseiller relit avant d'enregistrer.
- **Origine vérifiée** : l'assistant n'accepte que ce qui vient de la fenêtre
  qui l'a ouvert (`event.source === window.opener`), et le favori n'envoie qu'à
  l'origine ACM Studio. Si le navigateur a coupé ce lien (`window.opener` nul),
  un message bien formé est accepté : sans danger, ce contenu n'étant jamais
  exécuté et la fiche étant relue par le conseiller avant enregistrement.
- **La page du portail n'est jamais touchée** : aucun écouteur n'y est installé,
  aucun message ne lui est envoyé (voir § 4 bis).
- **Taille bornée** à 4 Mo, comme l'action serveur ; au-delà, message explicite
  et repli sur le collage manuel.
- **Rejeu impossible** : la page transférée est consommée (retirée du stockage)
  dès sa lecture, donc un rechargement ne relance pas d'import.
- **Aucune requête sortante** ajoutée : `importComparableHtml` n'appelle aucun
  portail, il analyse ce qu'on lui donne.

## 4. Vérifications faites

- **Essai réel de bout en bout** (build de production, navigateur) : une fausse
  page de portail servie sur une AUTRE origine exécute le favori → l'assistant
  s'ouvre, reçoit l'annonce (`portail-test.example` identifié), propose les
  3 dossiers ; au choix du dossier, l'adresse et le code de la page sont bien
  transmis au formulaire par le stockage de session.
- **En-têtes vérifiés** : aucune politique `Cross-Origin-Opener-Policy` sur
  l'application — le lien entre l'onglet du portail et la fenêtre ACM Studio
  n'est pas coupé.
- `vitest` **464/464** ✔ · `tsc` ✔ · `eslint` ✔ (dont les règles React
  Compiler) · `prettier` ✔ · `next build` ✔ (route `/import-assistant`).
- Aperçu design : `/design-preview/app?screen=assistant`.

## 4 bis. Correctifs après le premier essai terrain (19/08)

**Bien'ici affichait sa page d'erreur, SeLoger ne renvoyait rien.** Même cause :
l'échange se faisait en deux temps — l'assistant répétait un signal « je suis
prêt » VERS l'onglet du portail, qui devait répondre en envoyant la page. Sur
Bien'ici, un de leurs écouteurs `message` ne supporte pas ce format et leur
application est tombée ; sur SeLoger le signal n'a jamais abouti, donc rien
n'est parti.

**Correction : on ne touche plus du tout à la page du portail.** Le raccourci
n'y installe plus aucun écouteur et ne lui envoie plus rien. Il envoie
directement la page vers la fenêtre ACM Studio, en 8 tentatives espacées sur
13 secondes (0, 0,6, 1,4, 2,6, 4,2, 6,5, 9,5 et 13 s) — le temps que la fenêtre
soit prête. L'assistant se contente d'écouter et ne retient que le premier envoi
reçu. Couvert par 7 tests, dont un qui vérifie explicitement qu'aucun écouteur
n'est posé sur la page du portail et qu'aucun message ne lui est adressé.

**Galerie photo (SeLoger).** En collant le code d'une annonce, seule la photo de
couverture remontait : les portails modernes n'écrivent qu'elle en HTML, le
reste de la galerie vit dans un bloc de données JavaScript. Nouveau lecteur
`extract-embedded-image-urls.ts` : il relève les adresses d'images dans le texte
de la page, y compris échappées à la mode JSON (`https:\/\/…`). Filtre de
sûreté : seules sont retenues les adresses servies par le MÊME hébergeur que la
photo de couverture déjà identifiée — sinon on ramasserait bandeaux, avatars et
visuels de partenaires. Sans photo de couverture identifiée, aucune photo n'est
ajoutée. Mécanisme indépendant du portail : il vaut pour SeLoger, Bien'ici,
Figaro, Green Acres et Maisons et Appartements.

**Cinquième portail : Maisons et Appartements.** Ajouté à la détection de source
(libellé « Maisons et Appartements »), à la recherche de concurrents (URL de
recherche par ville/département) et au motif de reconnaissance des fiches
annonces.

## 4 ter. Analyse d'une VRAIE annonce SeLoger (19/08)

Laurent a fourni une annonce SeLoger réelle (Antibes, T3, 52,82 m², 303 000 €).
Le pipeline a été exécuté dessus, et les écarts mesurés — puis corrigés, chacun
couvert par un test de non-régression.

| Champ | Avant | Après |
| --- | --- | --- |
| Photos | 1 (couverture) | **11** (galerie complète, logos d'agence exclus) |
| Description | 148 car. tronqués | **1 023 car.** (texte réel de l'annonce) |
| DPE / GES | absents | **B / A** |
| Extérieurs | rien coché | **terrasse, véranda** |
| Stationnement | rien coché | **box fermé** |

Restent non détectés : nombre de salles de bains (absent de la page).

**Quatre corrections.**

1. **Description longue** (`extract-embedded-description.ts`) — la balise `meta`
   n'est qu'un résumé tronqué ; la vraie description vit dans un bloc de données
   aux guillemets DOUBLEMENT échappés. On retient désormais la description la
   PLUS LONGUE parmi les sources, jamais la première. C'est elle qui alimente la
   déduction des extérieurs et stationnements — d'où les cases enfin cochées.
2. **DPE / GES SeLoger** — ils ne sont écrits nulle part en clair : la note vit
   dans `efficiencyClass.rating`, et c'est le libellé qui SUIT qui dit s'il
   s'agit du DPE ou du GES. On retient le libellé le plus proche de la note. Un
   test synthétique a d'ailleurs révélé que la première version ne marchait sur
   la vraie page que par chance (fenêtre de lecture trop large) : corrigé.
3. **Adresses de photos tronquées** — l'échappement fermant la chaîne restait
   collé à la fin (`…ci_seal=abc\`), rendant la photo introuvable.
4. **Logos d'agence pris pour des photos** — ils sont de vraies balises `<img>`
   de la page, servies par un CDN distinct. Le filtre d'hébergeur s'applique
   maintenant à TOUTES les candidates et se cale sur la photo de référence (la
   source la plus fiable), et non plus sur l'ensemble des hébergeurs vus.

**Découverte importante sur la façon de capturer une page.** La page Bien'ici
enregistrée par « Cmd+S → Page web, HTML seul » est **vide de contenu** : c'est
la coquille de leur application, tout étant construit ensuite par JavaScript.
Même chose pour la description complète de SeLoger, absente du HTML serveur.
Autrement dit : **« afficher le code source » et « enregistrer la page » ne
donnent PAS ce que le conseiller voit**, alors que le raccourci « Envoyer vers
ACM Studio » capture le document tel qu'affiché, JavaScript exécuté. C'est ce
qui rend le raccourci indispensable — et pas seulement plus confortable — pour
Bien'ici, et nettement plus riche partout ailleurs.

## 5. Reste à faire (humain)

1. Après déploiement, glisser le bouton dans la barre de favoris depuis
   « Ajouter un bien concurrent », puis l'essayer sur une **vraie annonce
   SeLoger et Bien'ici** — les deux portails qui bloquent l'import direct
   depuis Vercel. Vérifier que prix, prix au m², surface, pièces, quartier,
   ville, caractéristiques et photos remontent.
2. **Être connecté à ACM Studio avant de cliquer sur le favori.** Si la session
   a expiré, l'assistant renvoie vers la connexion et l'envoi doit être refait
   (limitation connue, non bloquante).
3. Autoriser les fenêtres surgissantes pour le domaine ACM Studio (le favori
   ouvre une fenêtre ; un message l'indique si elle est bloquée).

## 6. Suite — points ouverts remontés du terrain (19/08)

1. **Extérieurs et stationnements jamais cochés (Green Acres).** La déduction
   (`map-comparable-characteristics`) travaille sur le titre, la description et
   la liste de caractéristiques. Or l'extracteur Green Acres ne remplit PAS de
   liste de caractéristiques — seule la description arrive, souvent tronquée.
   Il n'y a donc rien à lire. Correction possible : lire le tableau de
   caractéristiques de leurs fiches. **Nécessite une vraie page en fixture**
   pour être écrite juste et testée, comme tous les extracteurs du dépôt.
2. **Délai de commercialisation jamais renseigné.** Aucun portail ne le publie ;
   il est aujourd'hui saisi à la main. Laurent demande de le récupérer
   automatiquement via Castorus, qui suit l'historique d'une annonce à partir de
   son adresse. Techniquement faisable (même schéma que l'import par adresse :
   une requête serveur, une analyse déterministe). **Deux réserves à trancher
   avant de coder** : (a) les conditions d'utilisation de Castorus autorisent-
   elles une interrogation automatique et systématique par un outil tiers —
   c'est une décision d'entreprise, pas technique ; (b) depuis Vercel, le même
   filtrage d'adresse de datacenter que les portails est probable, donc une
   fiabilité incertaine — à mesurer avant de promettre la fonction aux
   conseillers.
