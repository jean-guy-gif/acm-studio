# MISSION 60 — Inviter, retirer, donner le rôle

**Date** : 24 septembre 2026
**Origine** : jalon 2 de la mission 59. La vue manager est en production ; restent les
gestes qui font vivre une équipe de plus d'une personne.

**Décidé** : l'entrée se fait par **invitation par e-mail**. Quand un conseiller part,
**ses dossiers restent à son nom, sans réattribution** — toute l'agence les voit déjà
(mission 59), donc n'importe qui peut les reprendre sans qu'on ait à les transférer.

---

## 1. Inviter

Le manager saisit une adresse. La personne reçoit un lien, choisit son mot de passe, et
arrive **dans la bonne agence, avec le rôle prévu**. L'agence et le rôle voyagent avec
l'invitation — une personne invitée n'atterrit jamais ailleurs.

**Les invitations en attente sont visibles**, avec la date et de quoi les annuler. Sans
ça, un manager qui ne voit rien réinvite en boucle et ne sait jamais où il en est.

**L'adresse a déjà un compte** : ça arrivera dès les premiers essais. Un profil
appartient à une seule agence, donc on ne déplace personne en silence. L'écran le dit
en clair et n'invite pas.

---

## 2. Retirer

Retirer quelqu'un, c'est lui **retirer l'accès à l'agence**, pas supprimer la personne.

**Son profil n'est pas supprimé** — sinon son nom disparaît des dossiers qu'il a
préparés, et on découvrirait la perte des mois plus tard. Le travail reste à l'agence,
à son nom, visible et reprenable par tout le monde.

---

## 3. Le rôle

Un manager peut donner le rôle de manager à quelqu'un, et le reprendre.

**Deux gardes, et elles ne sont pas négociables :**

- **Le dernier manager ne peut ni se retirer ni être rétrogradé.** Une agence sans
  manager ne peut plus jamais inviter personne — elle est fermée à clé de l'intérieur,
  et personne ne peut la rouvrir.
- Un manager peut se retirer lui-même **seulement s'il en reste un autre**.

---

## 4. Le nettoyage de l'enum

L'enum des rôles porte trois valeurs, `{owner, admin, advisor}`, pour deux concepts. La
mission 59 a lu la correspondance sans y toucher, en notant que **le jalon 2 devrait
trancher au moment d'écrire un rôle** — c'est maintenant.

Nettoyage vers **`{manager, advisor}`**, `owner` et `admin` devenant `manager`. Une
seule source, comme en mission 55 avec les colonnes dormantes.

C'est une migration sur des données réelles : **compte avant d'écrire, prédiction
énoncée, comparaison après.** Si le compte révèle autre chose que ce qu'on croit, on
s'arrête.

---

## 5. Ce qu'il faut mesurer avant d'écrire une ligne

1. **L'application envoie-t-elle des e-mails aujourd'hui, et par quoi ?** Le service
   intégré de Supabase est limité et déconseillé en production. S'il n'y a rien de
   configuré, **dis-le avant de commencer** : c'est une dépendance d'infrastructure, pas
   du code, et Laurent devra la brancher.
2. **Comment un profil est rattaché à une agence**, et ce qui arrive aux dossiers si le
   profil disparaît — clé étrangère, cascade ? C'est ce qui décide si « détacher sans
   perdre le nom » est possible tel quel ou demande un ajustement.
3. **L'enum des rôles sur la vraie base** : combien de `owner`, de `admin`, de
   `advisor`. C'est le compte du §4.

Rends ces trois réponses avant de dessiner. La première peut arrêter la mission avant
qu'elle commence.

---

## 6. Ce qui ne change pas

- **La visibilité des dossiers ne bouge pas** : toute l'agence continue de voir tout
  (mission 59).
- **Le travail d'un partant reste**, à son nom.
- **Aucune valeur inventée**, aucune invitation envoyée en silence.
- Les gardes de rôle tiennent **à l'écran et à l'adresse**, comme la vue manager.

---

## 7. Barrières

`vitest` · `tsc --noEmit` · `eslint` · `prettier --check` · `next build`

Les tests qui doivent exister :

1. Une personne invitée arrive dans **l'agence de celui qui l'a invitée**, avec le rôle
   prévu — jamais ailleurs.
2. Un conseiller retiré ne peut plus accéder à l'agence, **et ses dossiers sont toujours
   là, avec son nom**.
3. Le dernier manager ne peut ni se retirer ni être rétrogradé — refusé à l'écran **et**
   par l'action appelée directement.
4. Un conseiller ne peut ni inviter, ni retirer, ni donner un rôle — écran et adresse.
5. Une adresse qui a déjà un compte n'est pas invitée en silence ; l'écran le dit.

**Et l'essai à l'écran, d'une traite** : inviter une adresse, accepter l'invitation
depuis l'autre bout, voir la personne apparaître dans l'équipe, lui donner le rôle, le
lui reprendre, la retirer — et vérifier que ses dossiers sont toujours là avec son nom.