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
5. **La région** : en haut à droite, **« Europe (Ireland) eu-west-1 »** (corrigé le 11/11 : Claude 5.5
   passe par le service `bedrock-mantle`, qui n'a pas de point d'accès à Paris ; mesuré, l'adresse
   `bedrock-mantle.eu-west-3.api.aws` n'existe pas, celles de l'Irlande, Francfort, Stockholm et
   Milan oui).
6. **L'accès aux modèles** : Amazon Bedrock → catalogue de modèles → Anthropic → Claude Sonnet 5.5,
   puis Claude Haiku 5.5. À la première utilisation d'un modèle d'Anthropic, AWS demande un court
   formulaire de cas d'usage, une fois par compte (« Lecture de notes d'agents immobiliers pour
   pré-remplir une fiche client, vérifiée par l'agent »). Si une page « Model access » s'affiche, y
   demander l'accès aux deux modèles.
7. **Où la lecture se fait** — **décidé le 11/11 : l'Irlande seule.** Le profil « EU » de Claude sur Bedrock
   répartit les lectures entre les régions européennes d'AWS, **Zurich (Suisse) et Londres
   (Royaume-Uni) comprises**, hors de l'Union (doc « Claude in Amazon Bedrock », Regions). L'autre
   choix, retenu, est l'Irlande seule (« In-region only ») : le modèle s'appelle alors
   `anthropic.claude-sonnet-5-5` / `anthropic.claude-haiku-5-5`, sans `eu.`, depuis eu-west-1.
8. **Vérifier que « Model invocation logging » est désactivé** : Bedrock → Settings → « Model
   invocation logging » doit être éteint (c'est le réglage par défaut). Allumé, AWS garderait dans
   le compte les notes envoyées et les réponses : il reste éteint.
9. **L'essai** : dans le « Playground » de Bedrock, choisir Sonnet 5.5 (selon l'étape 7) et coller
   un texte inventé ; une réponse prouve l'accès.
10. **L'accès de l'application** : IAM → Utilisateurs → `acm-studio-bedrock`, sans accès à la
    console. **La politique en place** (relevée dans la console par Jean-Guy le 12/11 ; le dépôt
    décrivait à tort une version au seul `bedrock-mantle`), `TON_NUMERO_DE_COMPTE` à la place du
    numéro :

    ```json
    {
      "Version": "2012-10-17",
      "Statement": [
        {
          "Sid": "ClaudeProfilUE",
          "Effect": "Allow",
          "Action": ["bedrock:InvokeModel", "bedrock:InvokeModelWithResponseStream"],
          "Resource": [
            "arn:aws:bedrock:eu-west-1:TON_NUMERO_DE_COMPTE:inference-profile/eu.anthropic.*",
            "arn:aws:bedrock:eu-west-3:TON_NUMERO_DE_COMPTE:inference-profile/eu.anthropic.*",
            "arn:aws:bedrock:eu-*::foundation-model/anthropic.*"
          ]
        },
        {
          "Sid": "ClaudeIrlandeSeulement",
          "Effect": "Allow",
          "Action": "bedrock-mantle:CreateInference",
          "Resource": "arn:aws:bedrock-mantle:eu-west-1:TON_NUMERO_DE_COMPTE:project/*"
        },
        {
          "Sid": "LireLesProfils",
          "Effect": "Allow",
          "Action": ["bedrock:GetInferenceProfile", "bedrock:ListInferenceProfiles"],
          "Resource": "*"
        }
      ]
    }
    ```

    - `ClaudeProfilUE` : l'API Bedrock classique (`bedrock:InvokeModel`), qui sert les modèles
      d'avant la génération 5.5 par leurs profils « EU » (`eu.anthropic.…`), appelés depuis l'Irlande
      ou Paris, et les modèles eux-mêmes dans les régions `eu-*` où le profil les envoie. C'est elle
      qui sert la mesure provisoire du plan B (Sonnet 4.6 et Haiku 4.5, 12/11). Attention :
      `eu-*` couvre aussi Zurich (`eu-central-2`) et Londres (`eu-west-2`), hors de l'Union ; c'est
      le profil qui décide où va la lecture, et ses régions de destination se lisent par l'API
      (`GetInferenceProfile`) avant tout appel.
    - `ClaudeIrlandeSeulement` : le service `bedrock-mantle`, seul valable pour Claude 5.5, en
      Irlande seulement (décision du 11/11). Sans lui, AWS refusait l'appel (403 : « not authorized
      to perform: bedrock-mantle:CreateInference on resource: …:project/default »).
    - `LireLesProfils` : lire les profils et leurs régions de destination.

    Restreindre aux seuls modèles retenus demande une condition sur le modèle, à écrire une fois le
    choix fait ; d'ici là, l'alerte de dépense (étape 4) et le plafond d'ACM bornent le coût.

11. **La clé** : sur cet utilisateur, « Security credentials » → « Create access key » →
    « Application running outside AWS ». Copier l'identifiant et le secret (affiché une seule fois).
12. **La poser** dans `.env.local` et dans Vercel (production et essai) : `ACM_AWS_ACCESS_KEY_ID`,
    `ACM_AWS_SECRET_ACCESS_KEY`, `ACM_AWS_REGION=eu-west-1` — sans point final (le 11/11,
    `.env.local` portait « eu-west-3. »). Pas les noms `AWS_…`, que Vercel réserve ; jamais de
    `NEXT_PUBLIC_`.
13. **Prévenir le chef** quand c'est fait (fait le 11/11 : droit, région, variables dans le projet
    Vercel `acm-studio`, Production et Preview).

Plus tard, avant de faire payer les agences : remplacer cette clé par un lien OIDC Vercel → AWS
(`docs/IDEES.md`, 10/11).
