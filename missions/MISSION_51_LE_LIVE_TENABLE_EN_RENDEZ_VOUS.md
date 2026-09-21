# MISSION 51 — Le Live tenable en rendez-vous

**Date** : 21 septembre 2026
**Origine** : Laurent, après un essai réel — « c'est pénible, il faut enregistrer sa
réponse puis aller en bas de la page faire Suivant, et en plein écran on ne voit même
pas le Suivant ».

Le parcours a été mesuré dans un vrai navigateur, sur la vraie session, écran par écran.
**Le défaut signalé est réel. Le rapport en a trouvé trois autres, plus graves.**

---

## 1. Ce qui a été mesuré — une séance de 5 concurrents, 20 écrans

| | |
| --- | --- |
| Clics | **70** (14 par concurrent) |
| Déplacements de souris | **70** — chaque cible est ailleurs |
| Défilements obligatoires | **30**, soit ≈ 7 300 px en 1440 × 900 (≈ 9 400 px dans la fenêtre réelle de Laurent) |
| Remontées | **20** — chaque écran s'ouvre déjà défilé |
| Enregistrements bloquants | **25**, ≈ 3 s chacun, ≈ **80 s** cumulées devant un bouton figé |

**« Suivant » est hors de la fenêtre sur 18 écrans sur 20** en 1440 × 900 — jusqu'à
771 px plus bas à l'étape 4. Même en 1920 × 1080, il n'est visible sans défiler que sur
**une étape sur quatre**.

**En plein écran, la molette ne défile pas du tout** (`overflow-hidden` sur le bloc). À
l'étape 3, « Enregistrer » est lui-même 95 px sous la fenêtre : **on ne peut ni
enregistrer ni avancer à la souris.** Les seules issues sont la flèche droite — affichée
nulle part — et la tabulation.

---

## 2. Les trois défauts qui passent avant l'ergonomie

### 2.1 Des réponses du vendeur sont perdues, sans avertissement

À l'étape 3 et sur le « pourquoi » de l'étape 4, « Suivant » n'est pas verrouillé.
Mesuré : réponse choisie, clic sur « Suivant » sans enregistrer, retour — **la réponse
avait disparu, sans le moindre message.** « Précédent » fait la même chose sur les
étapes verrouillées.

Devant un vendeur, cela veut dire lui redemander ce qu'il vient de dire. C'est une faute
de produit, pas d'ergonomie : le Live existe pour recueillir la parole du vendeur, et il
la perd.

### 2.2 Le prix fuit encore

En ouvrant l'étape 3 **directement par son adresse**, avant que l'estimation ait été
donnée, le titre brut de l'annonce affiche **« 365000 € »**.

La correction d'hier couvrait l'écran atteint par le parcours normal, pas tous les
chemins d'accès. La règle ne change pas et elle doit tenir **quel que soit le chemin** :
avant la révélation, aucun montant, d'où qu'il vienne.

### 2.3 Du texte aspiré s'affiche au vendeur

Sur l'écran « Votre bien » on lit : *« Connectez-vous pour accéder aux infos de cette
annonce… Créer un compte »*. C'est le mur d'inscription d'un portail, récupéré à
l'import et affiché tel quel au client. À traiter à la source — une description qui
contient ce genre de phrase n'est pas une description.

---

## 3. Ce qu'on change — et pourquoi ce n'est pas « déplacer le bouton »

### 3.1 Enregistrer et Suivant deviennent un seul geste

C'est la correction principale, et elle règle **deux** problèmes à la fois.

Un seul bouton — **« Valider et continuer »** — qui enregistre et passe à l'écran
suivant. Plus de « Suivant » à aller chercher en bas, et surtout **plus d'état non
enregistré à perdre** : le défaut 2.1 disparaît par construction, il n'y a plus de
moment où une réponse existe à l'écran sans exister en base.

Le compte passe de **70 clics à ≈ 25**, et les 20 remontées disparaissent.

### 3.2 L'écran ne doit jamais attendre l'enregistrement

Les 3 s de bouton figé, ×25, font 80 s de silence en rendez-vous. On avance
**immédiatement**, l'enregistrement part en arrière-plan.

**Mais rien ne se perd en silence** : si un enregistrement échoue, l'écran le dit et la
fin de séance est bloquée tant qu'il reste une réponse non enregistrée, avec le moyen de
la relancer. On gagne du temps, on ne troque pas la sécurité contre la vitesse.

**Et mesure pourquoi un enregistrement prend 3 s.** Écrire une ligne ne coûte pas trois
secondes ; c'est probablement toute la page qui se revalide. À regarder avant de
l'accepter comme une fatalité.

### 3.3 La barre d'action est fixée à la fenêtre, pas à la page

Le bouton vit dans une barre ancrée en bas de la **fenêtre**. Il est visible à toutes
les tailles, en plein écran comme ailleurs, sans jamais défiler.

### 3.4 Le plein écran doit défiler

Le contenu qui dépasse doit pouvoir défiler à la molette. Un écran où l'on ne peut ni
enregistrer ni avancer à la souris n'est pas utilisable, et c'est précisément le mode
qu'on utilise devant un client.

### 3.5 Chaque écran s'ouvre en haut

Aujourd'hui l'écran suivant arrive déjà défilé de 171, 317 puis 625 px — à l'étape 4, le
champ à remplir est au-dessus de la fenêtre à l'arrivée. Remise en haut à chaque
changement d'écran.

### 3.6 L'adresse doit suivre l'écran

Après chaque enregistrement, l'adresse revient à celle du chargement (`fiche=4` redevient
`fiche=3`). Un rechargement en plein rendez-vous renvoie donc au mauvais écran, devant le
vendeur. L'adresse doit toujours désigner l'écran affiché.

---

## 4. Ce qui ne change pas

- **La pédagogie du Live** : on observe, on estime, puis on révèle. Aucun montant avant
  la révélation, sur aucun chemin.
- **Rien n'est inventé** : une réponse absente reste absente.
- **Le contenu importé est une donnée**, jamais une instruction.

---

## 5. Hors périmètre, signalé

- Le bouton « Sommaire » ramène à la couverture — ce n'est pas un sommaire.
- Un halo décoratif déborde de 225 px en largeur et peut décaler l'écran.

---

## 6. Barrières

`vitest` · `tsc --noEmit` · `eslint` · `prettier --check` · `next build`

Les tests qui doivent exister :

1. Une réponse donnée puis « Valider et continuer » est en base — et il n'existe aucun
   chemin où une réponse affichée n'est pas enregistrée.
2. L'étape 3 ouverte **directement par son adresse**, avant estimation, ne contient
   aucun montant.
3. L'adresse après validation désigne l'écran affiché.

**Et l'essai réel avant de déclarer la mission finie** : refaire la mesure du §1 après
correction, avec les mêmes chiffres — clics, défilements, remontées, secondes d'attente.
C'est la seule façon de savoir si on a gagné, et de combien.

---

## 7. À nettoyer

Quatre réponses de test ont été enregistrées sur le concurrent 1 du dossier Colland
pendant la mesure — « Incertain », 350 000 €, « Difficile à dire », 60 jours. À écraser
si ce dossier est réel.