# MISSION 31 — Correctifs V2 issus du smoke test staging (Mission 28)

Date : 18/08/2026 · Origine : les 4 bugs mineurs relevés par le smoke test
staging du 18/08 sur https://acm-studio-henna.vercel.app, tous classés « non
bloquants — V2 » et validés comme tels en revue CTO.

Aucun bug bloquant n'était ouvert : cette mission est du durcissement, pas du
sauvetage. Aucune migration, aucun changement de schéma, aucune règle métier
touchée (protocole ACM inchangé : pas de prix avant la devinette, durée et
baisses révélées seulement après l'estimation enregistrée).

## 1. Photos parasites quand l'extraction échoue (bug 1)

**Constat terrain.** Import URL d'une annonce Bien'ici réelle depuis Vercel :
aucun champ métier extrait (le portail sert une page de blocage aux IP de
datacenter), mais le champ Photos se remplissait de pixels de suivi et d'icônes
de navigateur présentés comme « photos détectées ».

**Correctif.** `normalize-listing-data.ts` : les photos ne sont conservées que
si la page porte au moins UN champ métier dur — prix, surface, nombre de pièces
ou titre non générique (`hasListingSignal`). Sinon la liste est vide et
`photoUrls` est annoncé comme manquant. Une photo fausse est pire qu'aucune
photo.

**Portée.** Ne change rien aux imports qui réussissent : dès qu'un seul champ
dur est extrait, les photos passent comme avant (couvert par un test paramétré
sur les 4 champs).

## 2. Prix non lu dans le second schéma JSON-LD (bug 2)

**Constat terrain.** Au collage de code d'une page Bien'ici, le prix ne
remontait pas alors qu'il figure dans les données structurées.

**Cause.** Bien'ici publie deux blocs : le bien dans un nœud `Accommodation`
SANS prix, et le prix dans un nœud `Product` dont l'offre le loge sous
`priceSpecification`. L'extracteur ne lisait que `offers.price` /
`offers.lowPrice`.

**Correctif.** `json-ld-extractor.ts` : nouvelle fonction `resolveNodePrice`
qui balaie, dans l'ordre, `offers.price`, `offers.lowPrice`,
`offers.priceSpecification.(price|minPrice)`, les offres imbriquées d'un
`AggregateOffer`, puis à défaut d'offre les mêmes clés sur le nœud lui-même.
Trois tests ajoutés (deux blocs séparés, AggregateOffer, priceSpecification nu).

## 3. Photo affichée en icône cassée (bug 3)

**Constat terrain.** Une photo importée s'affichait en icône cassée dans la
liste des comparables et dans le Live, alors qu'elle s'affichait correctement
en vignette dans le formulaire d'édition.

**Cause identifiée dans le code** (et non supposée) : les balises image étaient
dispersées sur 8 écrans avec des attributs incohérents — `referrerPolicy` posé
sur 3 d'entre eux seulement, `loading` sur certains, et AUCUN repli en cas
d'échec. Les CDN des portails filtrent selon l'en-tête `Referer` ; un écran sans
politique de referer envoie l'origine Vercel et peut se faire refuser, là où un
autre passe.

**Correctif.** Nouveau composant partagé `src/components/ui/remote-image.tsx`
(`RemoteImage`), utilisé par les 8 écrans qui affichent une photo d'annonce
(carte concurrent, champ photos, galerie et visionneuse du Live, photo du Live,
recherche de concurrents, comparables influents, présentation vendeur, bien
vendeur) :

- `referrerPolicy="no-referrer"` appliqué PARTOUT, de façon uniforme ;
- repli propre : plus jamais d'icône cassée — un cadre « Photo indisponible »
  de la même taille prend la place. Décisif en rendez-vous vendeur : une annonce
  retirée ou un CDN qui refuse ne se voit plus comme un défaut du logiciel.

**Piège rencontré et traité.** Un simple `onError` ne suffisait pas : le rendu
venant du serveur, l'échec de chargement survient souvent AVANT que React
n'attache ses écouteurs, et l'événement ne se rejoue jamais. Le composant
contrôle donc aussi l'état réel de l'image au montage
(`complete && naturalWidth === 0`). Vérifié en build de production avec toutes
les requêtes d'images bloquées : **0 image cassée**, replis affichés partout
(avant correctif : 3 / 3 / 5 icônes cassées sur les trois écrans testés).

## 4. Le Live repartait à l'intro après rechargement (bug 4)

**Constat terrain.** Après un rechargement complet, la présentation revenait à
l'écran d'introduction (les réponses, elles, restaient bien enregistrées).

**Correctif.** La fiche courante est reflétée dans l'URL (`?fiche=N`) par la
présentation elle-même, via `history.replaceState` — donc sans aller-retour
serveur ni saut de défilement pendant le rendez-vous, et sans que le bouton
Précédent du navigateur ne fasse sortir du Live fiche par fiche. La page serveur
relit ce paramètre et rouvre au bon endroit. Bonus : un lien direct vers une
fiche devient possible.

Tolérance volontaire : un paramètre absurde ou hors bornes ne produit jamais
d'erreur devant le vendeur — on retombe sur l'introduction, et l'index est
borné au nombre réel de fiches (auto-correction de l'URL).

Vérifié en build de production : URL sans paramètre à l'intro → `?fiche=3`
après deux fiches (kicker « Concurrent 1 sur 3 · Étape 3 sur 3 ») → paramètre
retiré au retour au sommaire.

## 5. Contrôles qualité (état final)

- `vitest run` : **451/451** ✔ (444 avant + 7 tests ajoutés)
- `tsc --noEmit` ✔ · `eslint .` ✔ (dont react-hooks/preserve-manual-memoization)
- `prettier --check src supabase` ✔
- `next build` ✔ · vérifications navigateur en build de production (repli photo,
  reprise du Live) exécutées et reproduites ci-dessus.
- `layout.tsx` non modifié (fontes réelles intactes).

## 6. Reste à faire (humain)

1. Revue puis commit. Message suggéré :
   `fix(import,live): photos fiables et reprise du Live après rechargement (V2 Mission 28)`
2. Après déploiement, revérifier en staging les deux points qui ne se
   reproduisent QUE depuis une IP de datacenter :
   - import URL d'une annonce Bien'ici → aucune photo proposée, message honnête
     sur les champs manquants (au lieu des pixels de suivi) ;
   - collage de code de la même page → le prix doit désormais remonter.
3. Mettre à jour MISSION_28 : les 4 bugs V2 sont traités.

## 7. Non traité volontairement

- `src/features/live-presentation/` reste du code mort (13 composants non
  importés depuis la Mission 24) : suppression à faire dans un commit dédié, pas
  au milieu de correctifs.
- Le champ « Type de bien » du bien vendeur affiche toujours la valeur brute
  (`apartment`) : ce n'est pas un des 4 bugs, et le corriger touche à la
  normalisation — à traiter séparément.
