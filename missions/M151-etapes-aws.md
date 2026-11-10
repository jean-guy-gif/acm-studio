# M151 — Ouvrir le compte AWS et l'accès à Claude (à faire par Jean-Guy)

Étape 0 de la mission 151 (décision de Jean-Guy, 10/11 : il crée lui-même le compte et ouvre
l'accès). Claude Code ne touche ni à AWS ni à Vercel. Ne jamais coller le secret de la clé dans une
conversation.

1. **Le compte** : aws.amazon.com → « Créer un compte AWS », avec une adresse e-mail de la
   société, une carte bancaire, la vérification par téléphone ; support « Basic » (gratuit).
2. **La sécurité** : double authentification (MFA) sur le compte principal, qui ne sert plus au
   quotidien ; un utilisateur administrateur dans IAM pour Jean-Guy, avec sa propre MFA.
3. **Les informations fiscales** : Billing and Cost Management → **Tax settings** → renseigner la
   raison sociale, l'adresse, le **SIRET** et le **numéro de TVA intracommunautaire** de la société
   (si aucun champ ne demande le SIRET, le numéro de TVA suffit à la facturation entre entreprises).
4. **Une alerte de dépense** : Billing → Budgets → budget mensuel de 20 €, alertes à 50, 80 et
   100 %. AWS prévient sans bloquer ; le plafond de 10 € par agence d'ACM bloque.
5. **La région** : en haut à droite, « Europe (Paris) eu-west-3 ».
6. **L'accès aux modèles** : Amazon Bedrock → catalogue de modèles → Anthropic → Claude Sonnet 5.5,
   puis Claude Haiku 5.5. À la première utilisation d'un modèle d'Anthropic, AWS demande un court
   formulaire de cas d'usage, une fois par compte (« Lecture de notes d'agents immobiliers pour
   pré-remplir une fiche client, vérifiée par l'agent »). Si une page « Model access » s'affiche, y
   demander l'accès aux deux modèles.
7. **Le profil UE** : Bedrock → « Cross-region inference » → vérifier qu'un profil « EU » existe
   pour chacun des deux modèles et noter leurs identifiants (ils commencent par `eu.`). S'il en
   manque un, s'arrêter et le dire.
8. **Vérifier que « Model invocation logging » est désactivé** : Bedrock → Settings → « Model
   invocation logging » doit être éteint (c'est le réglage par défaut). Allumé, AWS garderait dans
   le compte les notes envoyées et les réponses : il reste éteint.
9. **L'essai** : dans le « Playground » de Bedrock, choisir le profil EU de Sonnet 5.5 et coller
   un texte inventé ; une réponse prouve l'accès.
10. **L'accès de l'application** : IAM → Utilisateurs → créer `acm-studio-bedrock`, sans accès à la
    console, avec cette seule autorisation (remplacer `TON_NUMERO_DE_COMPTE`) :

    ```json
    { "Version": "2012-10-17", "Statement": [{ "Effect": "Allow",
      "Action": ["bedrock:InvokeModel", "bedrock:InvokeModelWithResponseStream"],
      "Resource": ["arn:aws:bedrock:eu-west-3:TON_NUMERO_DE_COMPTE:inference-profile/eu.anthropic.*",
                   "arn:aws:bedrock:eu-*::foundation-model/anthropic.*"] }] }
    ```

11. **La clé** : sur cet utilisateur, « Security credentials » → « Create access key » →
    « Application running outside AWS ». Copier l'identifiant et le secret (affiché une seule fois).
12. **La poser** dans `.env.local` et dans Vercel (production et essai) : `ACM_AWS_ACCESS_KEY_ID`,
    `ACM_AWS_SECRET_ACCESS_KEY`, `ACM_AWS_REGION=eu-west-3`. Pas les noms `AWS_…`, que Vercel
    réserve ; jamais de `NEXT_PUBLIC_`.
13. **Donner au chef** les deux identifiants de profil `eu.…` (ce ne sont pas des secrets).

Plus tard, avant de faire payer les agences : remplacer cette clé par un lien OIDC Vercel → AWS
(`docs/IDEES.md`, 10/11).
