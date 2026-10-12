# Les opérateurs

Un **opérateur** est un compte qui exploite l'outil, toutes agences confondues. Lui seul :

- voit « Erreurs » dans le menu, avec la pastille « N erreurs depuis hier » ;
- ouvre la page `/erreurs` (pour tout autre compte, elle n'existe pas) ;
- règle le plafond mensuel de recherche de chaque agence, en bas de cette page.

Ce n'est pas un rôle d'agence : un manager n'est pas opérateur, et rien n'en est écrit en base. La
liste tient dans une variable d'environnement de Vercel, `ACM_OPERATOR_EMAILS`.

## Ajouter un opérateur

1. La personne doit déjà avoir un compte ACM Studio, **non retiré** de son agence, quelle que soit
   l'agence et quel que soit son rôle. L'adresse à inscrire est celle avec laquelle elle se connecte.
2. Vercel → le projet → **Settings** → **Environment Variables** → `ACM_OPERATOR_EMAILS`.
   Ajoutez l'adresse à la suite, séparée par une virgule :

   ```
   laurent@start-academy.fr,jean-guy@start-academy.fr
   ```

   Majuscules et espaces autour des virgules sont sans effet. Faites-le pour **Preview** (l'essai)
   **et** pour **Production**.

3. **Redéployez** : une variable modifiée n'est lue que par un nouveau déploiement. Vercel →
   **Deployments** → le dernier déploiement de chaque environnement → **Redeploy**. (Toute mission
   poussée sur `essai`, puis validée, redéploie aussi.)
4. La personne se reconnecte ou recharge la page : « Erreurs » apparaît dans son menu.

## Retirer un opérateur

Ôtez son adresse de la variable, dans les deux environnements, puis redéployez. Retirer la personne
de son agence (Administration → L'équipe) lui ferme aussi la page, tout de suite.

## À savoir

- Variable vide ou absente : il n'y a aucun opérateur, la page est fermée à tous.
- Ne préfixez jamais la variable par `NEXT_PUBLIC_` : la liste ne doit pas partir au navigateur.
- En local, la variable se met dans `.env.local`.
