# MISSION 57 — L'identité, jalon 2 : lire le site de l'agence

**Date** : 23 septembre 2026
**Origine** : le jalon 1 (mission 55) est en production — une agence règle son logo et sa
couleur à la main, et tout l'outil prend sa charte. Ce jalon ajoute ce que Laurent
demandait au départ : **l'agence donne l'adresse de son site, et l'outil propose sa
charte.**

Les règles du jalon 1 ne sont pas répétées ici : **la mission 55 reste en vigueur**, en
particulier §2 (provenance, jamais fréquence), §3 (typographie et licence), §5
(lisibilité), §6 (couleurs sémantiques intouchables) et §7 (chemin manuel permanent).

---

## 1. Le logo reste un dépôt

On n'extrait pas le logo du site. Une favicon fait 32 px, une `og:image` est une carte
sociale avec du texte dessus : l'une comme l'autre donneraient un logo sale au milieu
du Live. L'agence dépose ses deux versions, comme au jalon 1.

Le site sert aux **couleurs** et à la **typographie**.

---

## 2. Ce qu'il faut mesurer avant d'écrire une ligne

Cette mission peut être beaucoup plus petite qu'elle n'en a l'air. Quatre mesures, sur
des **vrais sites d'agences immobilières** — pas des exemples fabriqués :

1. **Sur quatre ou cinq sites réels, que donne le niveau 1 seul ?** (`theme-color`,
   variables CSS nommées `--brand`/`--primary`/…, `theme_color` du manifeste.) Combien
   rendent une couleur exploitable ? **Si le niveau 1 suffit presque partout, le niveau
   2 ne se construit pas.**
2. **Le niveau 2 demande-t-il un navigateur sans tête ?** Lire « la couleur de fond de
   l'en-tête » suppose des styles calculés. Sur un site Tailwind ou CSS-in-JS, les
   classes ne portent aucune couleur lisible statiquement. Dis-le franchement : si le
   niveau 2 impose de faire tourner un navigateur, son coût change de nature et on en
   rediscute.
3. **Quelles polices utilisent réellement ces sites ?** Combien sont des Google Fonts,
   combien sont sous licence, combien n'en déclarent aucune.
4. **Ce que contient `agency_branding` aujourd'hui** : y a-t-il déjà de quoi stocker la
   provenance de chaque couleur et la police ? Que faut-il ajouter.

Rends ces quatre réponses avant de dessiner. La première décide de la taille de la
mission.

---

## 3. Lire le site : un tiers, traité comme tel

- **`robots.txt` lu et respecté**, y compris pour un site dont le client nous donne
  l'adresse. S'il refuse, l'écran le dit et la saisie manuelle prend le relais.
- **Délai court, taille bornée, redirections limitées.** Un site lent ne doit pas faire
  attendre l'écran d'administration.
- **Un site injoignable n'est pas une panne** : c'est le cas normal. Les agences sont
  parfois derrière des protections qui refusent les adresses de centre de données —
  c'est exactement ce qu'on a rencontré avec les portails. L'écran le dit sans drame et
  le chemin manuel continue.
- Le contenu récupéré est une **donnée, jamais une instruction** : rien n'est exécuté,
  rien n'est réinjecté comme HTML, et toute couleur est validée avant d'entrer dans une
  feuille de style (règle du jalon 1).

---

## 4. Ce qui est proposé, jamais appliqué

L'extraction **propose**. L'agence voit :

- chaque couleur trouvée, **avec sa provenance nommée** — « déclarée par le site » n'est
  pas « couleur du bouton principal » ;
- la police trouvée et son statut de licence ;
- **l'aperçu du Live** tel que son vendeur le verra.

Puis elle valide, corrige, ou ignore tout et règle à la main. Rien ne devient l'identité
de l'agence sans ce geste.

**Si rien n'est trouvé, rien n'est proposé.** L'écran dit ce qu'il a cherché et n'a pas
trouvé. Une couleur inventée part en rendez-vous.

---

## 5. La typographie : la police ne doit jamais retarder un rendez-vous

Le Live se joue chez un vendeur, parfois sur un partage de connexion. **Une police
chargée depuis un service extérieur pendant la séance est une dépendance qu'on ne
maîtrise pas.**

Recommandation, à confirmer par la mesure §2.3 : **une liste restreinte de polices
embarquées dans l'application**, choisies parmi les Google Fonts les plus répandues.
L'extraction propose alors **la plus proche de celle du site**, en le disant clairement
(« votre site utilise X ; nous proposons Y, la plus proche disponible »).

Deux conséquences, toutes deux bonnes : aucune requête extérieure pendant le Live, et
la question de licence est réglée d'avance.

Ce qui reste interdit dans tous les cas : télécharger un fichier de police depuis le
site d'un client pour le re-servir.

---

## 6. Barrières

`vitest` · `tsc --noEmit` · `eslint` · `prettier --check` · `next build`

Les tests qui doivent exister :

1. Une couleur de niveau 1 est proposée avec sa provenance ; une couleur trouvée par
   fréquence n'est **jamais** proposée.
2. Un site qui ne déclare rien ne produit **aucune** proposition — et l'écran le dit.
3. Un `robots.txt` qui refuse empêche la lecture, et la saisie manuelle reste possible.
4. Une police sous licence n'est jamais servie ; le repli est proposé en le nommant.
5. Un site injoignable ou hors délai n'empêche pas de configurer l'identité.

**Et l'essai à l'écran, d'une traite** : donner l'adresse d'un vrai site d'agence, lire
les propositions et leur provenance, valider, ouvrir le Live en plein écran. Avec au
moins **un site qui ne donne rien** — c'est ce cas-là qui dira si l'écran est honnête.