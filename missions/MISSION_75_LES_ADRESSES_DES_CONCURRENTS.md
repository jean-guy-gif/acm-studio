# MISSION 75 — Chaque concurrent retenu a son adresse, et le mandat signé ouvre la prospection

**Date** : 06/10/2026 · **Origine** : Laurent. « Maîtriser la concurrence plutôt que la subir. » Un
acquéreur qui arrive sur mon mandat peut visiter les biens concurrents. Je veux donc leurs adresses
pour aller voir leurs propriétaires : ça fait rentrer des mandats.

## Prérequis

Le Localisateur Academia **3.1.1-acm1** (branche `acm` du projet OUTILS AGENTS, distincte de la
bêta gelée rc5.9) répond aux pages ACM. Son identifiant est fixe (clé du manifeste) :
`bjoapcmbjmollccjocdacbobdpfekmgk`, lu depuis `NEXT_PUBLIC_LOCALISATEUR_ID` et jamais écrit en dur.

- **Origines acceptées** : l'URL de travail et l'URL d'essai. Pas `localhost` dans le paquet : on
  essaie sur l'URL d'essai.
- **Les 3 messages**, via `chrome.runtime.sendMessage(id, …)` :
  - `ACM_PING` → `{ ok, version, betaTerminee, partage }` (répond même partage éteint) ;
  - `ACM_BIENS_PAR_URL { urls }` (50 au plus) → `{ ok, biens: { [url]: { etat, etiquette,
    etiquetteCle, adresse, source, confirme, bienId, lat, lon, libelle, analyseLe } } }`.
    Interrupteur « Partager avec ACM Studio » éteint (défaut) → `{ ok: false, partage: false }` ;
  - `ACM_OUVRIR_BIEN { url }` → ouvre la vue du Localisateur, une fois toutes les 2 s au plus.
    Cette ouverture compte dans son plafond quotidien de vues 3D.
- **Aucun chiffre de certitude** : l'étiquette affichée, sa clé stable `etiquetteCle` et `confirme`.
  ACM décide sur `etiquetteCle` et `confirme`, jamais en lisant le texte de l'étiquette.
- **Valeurs livrées par OUTILS AGENTS (3.1.1-acm1, commit `ebaea9c`, 09/10/2026)** :
  - `etat` : `inconnu` (jamais vu ce lien) · `en-cours` · `fiche` (il faut ouvrir l'annonce) · `pret`.
  - `etiquetteCle` (null si l'état n'est pas `pret`) : `confirmee` · `pistes` · `copro` · `rien` · `vous`.
  - `etiquette` (texte affiché, null si pas `pret`) : « Adresse confirmée », « À vérifier · N
    piste(s) », « Maison à repérer · N du cercle », « Copropriété trouvée · maison à repérer »,
    « Pas trouvée », « Recherche incomplète », « Confirmée par vous », « Confirmée par vous ·
    maison à préciser ». ACM l'affiche telle quelle, ne la lit jamais pour décider.
  - `source` : `vous` · `dpe` · `copropriete` · `residence` · `terrain` · `meme-bien` · `cercle`,
    ou null quand il n'y a pas d'adresse unique. Pas de valeur `autre` à prévoir.
  - Partage éteint : `ACM_BIENS_PAR_URL` **et** `ACM_OUVRIR_BIEN` répondent `{ ok: false, partage: false }`.
- **Selon l'état** : `inconnu` ou `fiche` → bouton « Trouver l'adresse » qui ouvre simplement
  l'annonce dans un onglet (le Localisateur l'analyse tout seul, sans vue 3D), puis ACM relit au
  retour ; `en-cours` → critère 2 ; `pret` → critère 3.

## Critères d'acceptation

1. **Migration** sur `comparables`, soumise avant d'être appliquée. Colonnes : adresse localisée,
   étiquette, source, confirmée, état, identifiant Localisateur, latitude, longitude, date d'analyse.
   La RLS ne change pas.
2. **Après chaque import** d'un concurrent, ACM interroge le Localisateur.
   - Si l'analyse est « en cours », ACM redemande toutes les 10 s pendant 2 min, puis à la prochaine
     ouverture du dossier.
   - Une adresse confirmée ne se redemande plus.
3. **Le Localisateur décide de la certitude**, ACM n'invente aucun seuil.
   - `confirme` vrai : l'adresse est retenue en silence.
   - Sinon (étiquette autre que confirmée : pistes, adresse à vérifier, rien), le concurrent porte
     le bouton « Localiser moi-même », qui envoie `ACM_OUVRIR_BIEN`. ACM relit le résultat quand le
     conseiller revient sur l'onglet.
   - Si le plafond de vues est atteint, ACM affiche le message renvoyé, sans insister.
4. **Jamais côté vendeur** : ni Live, ni présentation, ni aucune page montrée au client. Un test le
   vérifie.
5. **Dossier conclu « mandat signé » → section « Concurrents à prospecter ».**
   - Pour chaque concurrent : adresse, étiquette du Localisateur, prix, surface, pièces, en ligne
     depuis, baisses de prix, agence ou particulier, et « exclusivité » si l'annonce le dit.
   - La section a une version imprimable A4 sobre : la liste de tournée.
6. **Sans Localisateur** (absent, ou bêta terminée) : une ligne discrète, « Installez le Localisateur
   Academia pour retrouver les adresses des concurrents ». **Partage éteint** : « Activez « Partager
   avec ACM Studio » dans le Localisateur ». Rien d'autre ne change.
7. **`/confidentialite`** mentionne ce traitement : adresses des biens concurrents, usage interne de
   prospection par l'agence.

## Hors périmètre

Le dossier remis au propriétaire concurrent (mission suivante, après travail du fond avec Laurent),
tout courrier ou envoi automatique, toute recherche du nom d'un propriétaire.

## Essai sur l'URL d'essai

Le Localisateur 3.1.1-acm1 est installé. Sur le dossier de test, retenir et importer 3 concurrents : les
adresses arrivent, avec « Localiser moi-même » sur les incertains. Conclure le dossier « mandat
signé » : « Concurrents à prospecter » apparaît, imprimable. Le Live n'affiche aucune adresse.
`npm run e2e` reste vert.
