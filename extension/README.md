# ACM Studio — extension navigateur

Récupère, **dans le navigateur du conseiller**, la page d'une annonce (Temps 1) ou
d'une recherche (Temps 2), pour qu'ACM Studio l'analyse avec son code existant. Les
portails refusent les adresses de centre de données ; le navigateur du conseiller,
lui, n'est pas bloqué.

L'extension **n'analyse rien**, **ne stocke rien**, et **ne renvoie qu'à la page ACM
Studio** qui l'a appelée. Trois fonctions : `ping`, `fetchPage`, rien d'autre — plus,
depuis la version 0.2.0 (mission 65), `readOpenTab` : lire la page de résultats que le
conseiller a **déjà ouverte** et filtrée lui-même. `readOpenTab` ne recharge rien, ne
navigue pas, ne clique pas et n'ouvre aucune fenêtre ; s'il y a plusieurs onglets de
recherche, elle en renvoie la liste et c'est le conseiller qui choisit. Permissions
inchangées (après mise à jour du dossier : `chrome://extensions` → « Recharger »).

Version 0.3.0 (mission 69) : `openSearchTabs` ouvre, dans la fenêtre du conseiller, des
onglets **visibles** sur les recherches déjà filtrées par ACM (adresses de recherche des
portails lisibles uniquement, jamais deux fois la même) ; `readSearchTabs` lit **tous** les
onglets de recherche d'un coup. Chrome ne construit pas un onglet que personne n'a regardé
(Bien'ici) : chaque onglet est activé le temps que sa page se construise (même attente que
la mission 46), puis ACM revient au premier plan. Un onglet resté sur l'écran d'attente est
signalé, jamais lu comme une page vide. Permissions inchangées.

## Contenu

- `manifest.json` — Manifest V3. `host_permissions` limitées aux portails retenus,
  `externally_connectable` + `content_scripts` limités à l'origine exacte d'ACM
  Studio (jamais `*` / `<all_urls>`).
- `background.js` — ouvre un onglet en arrière-plan, attend le rendu, lit
  `document.documentElement.outerHTML`, ferme l'onglet.
- `content-bridge.js` — pont `window.postMessage` entre la page ACM Studio et le
  service worker (injecté uniquement sur l'origine d'ACM Studio).

## Charger l'extension décompressée (pilote, sans Google)

1. Chrome → `chrome://extensions`.
2. Activer « Mode développeur » (en haut à droite).
3. « Charger l'extension non empaquetée » → choisir ce dossier `extension/`.
4. Ouvrir ACM Studio : le panneau d'import affiche « Extension détectée ».

## Portails autorisés (`host_permissions`)

seloger.com · bienici.com · green-acres.fr · immobilier.lefigaro.fr ·
maisonsetappartements.fr · leboncoin.fr

`leboncoin.fr` est présent **par anticipation** : son extracteur viendra dans une
mission à part. Toute modification des permissions relance la validation Google, d'où
son ajout dès maintenant.

## Origines ACM Studio autorisées

- `https://acm-studio-henna.vercel.app`
- `http://localhost:3000` (développement)

Si l'URL de production change, mettre à jour les trois listes du `manifest.json`
(`externally_connectable.matches` et `content_scripts.matches`).

## Politesse (côté application)

Le respect du `robots.txt`, le délai entre pages et le plafonnement vivent dans
**l'application**, pas ici — pour qu'un changement de portail se corrige sans
repasser par la validation de Google. L'application vérifie le `robots.txt` **avant**
de demander une page à l'extension ; une adresse interdite n'est jamais demandée.

## Publication (plus tard)

Un compte développeur Chrome (5 $) est nécessaire **uniquement pour publier** sur le
Chrome Web Store. Le pilote se fait en « non empaqueté », sans attendre Google.
