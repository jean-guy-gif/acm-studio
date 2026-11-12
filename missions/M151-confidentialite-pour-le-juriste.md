# M151 — Pour le juriste : les notes d'un conseiller lues par un service d'intelligence artificielle


Préparé le 10/11/2026, **mis à jour le 12/11/2026** pour la relecture (régions lues chez AWS, ligne
de consommation de chaque lecture, sources jamais gardées). **Validé par la juriste** (Jean-Guy,
12/11) : les trois textes de `/confidentialite` et l'avertissement à l'écran sont publiés tels
quels, sans la mention « Texte à faire relire par un juriste ». La fonction reste fermée aux agences avant cet accord : elle
n'est ouverte qu'à l'agence de démonstration, où rien n'est lu pour de vrai, et aux comptes
d'exploitation d'ACM Studio pour un essai sur des notes inventées (décision de Jean-Guy, 12/11).

## Ce que fait la fonction

Un conseiller rencontre un acquéreur et prend des notes : sur papier, dans le CRM de son agence ou
dans un texte. Pour ne pas les ressaisir, il peut :

- photographier ses notes manuscrites ;
- déposer la fiche de l'acquéreur exportée de son CRM (PDF ou capture d'écran) ;
- coller un texte.

ACM Studio envoie cette photo, ce fichier ou ce texte à un service d'intelligence artificielle, qui
**propose** une fiche acquéreur : nom, téléphone, e-mail, ce qu'il cherche (type de bien, communes,
budget, pièces, surface, équipements) et « ce qui compte pour lui » (au calme, sans vis-à-vis, une
maison de caractère…), avec ses mots. Le conseiller relit chaque champ ; **rien n'est enregistré
sans sa validation**, et chaque champ proposé reste marqué « à vérifier » jusqu'à ce qu'il le
confirme. Sous chaque champ, l'écran montre la courte ligne des notes d'où il vient : elle sert à
la vérification et **n'est jamais gardée**. L'écran prévient le conseiller : « Cette proposition
n'est pas gardée : si vous quittez ou rechargez la page, elle sera perdue. »

Ensuite, quand ACM Studio cherche des biens pour cet acquéreur, le même service lit **les
descriptions publiques des annonces** trouvées et dit, en citant l'annonce, si elle parle de ce qui
compte pour lui. Pour cette seconde lecture, seuls ces critères partent (« au calme », « sans
vis-à-vis »), **jamais le nom ni les coordonnées de l'acquéreur**. L'outil classe les biens ; il
n'en écarte aucun et ne décide rien.

## Ce qui part, ce qui est gardé

| | Part vers le service d'IA | Gardé par ACM Studio | Gardé par le service d'IA |
|---|---|---|---|
| Photo, fichier ou texte des notes | Oui, une fois | **Non** : ni stockage, ni base, ni journal | Non (conditions d'AWS, ci-dessous) |
| Fiche proposée | (réponse du service) | Seulement ce que le conseiller valide | Non |
| Ligne de chaque lecture (consommation et trace) | — | Qui (le conseiller), quand, le modèle, le coût, l'issue (fiche créée, fiche complétée, lecture annulée, lecture échouée), la sorte de source (photo, fichier, texte), le nombre de mentions personnelles écartées et les **noms** des champs proposés et gardés ; jamais une valeur lue, jamais une ligne des notes. Elle reste à l'agence si la fiche est supprimée, sans lien vers elle (c'est sa consommation du mois, comme celle des recherches) | — |
| Ligne des notes d'où vient chaque champ | (réponse du service) | **Non** : montrée au conseiller à la validation, jamais enregistrée | Non |
| Description d'une annonce publique | Oui, avec les critères de l'acquéreur | Une citation courte de l'annonce, par critère, montrée au conseiller seul ; jamais une citation qui contient une adresse. Pour la veille de la nuit, le jugement et sa citation sont gardés avec le passage et la citation est effacée au bout de 3 ans | Non |

**Ce que l'outil refuse de relever** : toute donnée sensible (santé, grossesse, handicap, religion,
origine, opinions, vie sexuelle, situation familiale) et tout jugement sur la personne (« pressé »,
« difficile »). Le besoin peut être gardé (« de plain-pied »), jamais sa raison. Trois gardes : la
consigne donnée au service, une réponse limitée à une liste fermée de champs, et une liste de mots
refusés vérifiée par ACM Studio. L'écran dit seulement « 2 mentions personnelles n'ont pas été
relevées », sans les répéter.

## Le service d'IA (choisi par Jean-Guy le 10/11, profil précisé le 11/11, régions lues le 12/11)

Claude, modèle d'Anthropic, utilisé par **Amazon Web Services (Amazon Bedrock)**, appelé depuis
l'Irlande (eu-west-1) par son **profil « EU »**, qui répartit les lectures entre plusieurs régions
d'Europe d'AWS (décision de Jean-Guy, 11/11 au soir).

**Le modèle utilisé aujourd'hui : Claude Sonnet 4.6** (`eu.anthropic.claude-sonnet-4-6`), le compte
AWS n'ayant pas encore accès aux modèles plus récents. **Ses régions de destination ont été lues
chez AWS le 12/11/2026** (`GetInferenceProfile`, depuis l'Irlande) : **Stockholm (Suède), Paris
(France), Milan (Italie), Espagne, Irlande et Francfort (Allemagne)** — **toutes dans l'Union
européenne**, ni la Suisse ni le Royaume-Uni. **Les notes sont donc lues uniquement dans l'Union
européenne.**

Quand le modèle changera (Claude Sonnet 5.5, dès que le compte y aura accès), ses régions de
destination seront lues de la même façon **avant** tout changement, et ce texte vous reviendra si
elles diffèrent : la documentation d'AWS indique que le profil « EU » de ces modèles plus récents
peut inclure Zurich et Londres.

Selon les conditions d'AWS (à vérifier sur le contrat signé), les contenus envoyés ne sont ni
gardés par le service, ni utilisés pour entraîner un modèle, ni transmis à Anthropic. Le contrat
d'AWS comprend son avenant RGPD (DPA).

L'API d'Anthropic en direct a été écartée : elle traite les données hors de l'Union européenne.

Deux garanties de plus (Jean-Guy, 10/11) :

- **Le fichier n'est pas gardé.** La photo, le PDF ou le texte collé passe par la mémoire du serveur
  le temps de la lecture, puis disparaît : rien n'est écrit dans le stockage, en base, au journal
  d'erreurs ni dans la trace. Seuls les champs que le conseiller valide sont enregistrés ; les
  lignes des notes montrées à côté de chaque champ ne le sont jamais (vérifié par un test, qui les
  cherche dans toute la base après la création d'une fiche).
- **La journalisation des appels est désactivée chez AWS.** Amazon Bedrock ne garde ni les
  contenus envoyés ni les réponses, et ne s'en sert pas pour entraîner un modèle. La seule façon de
  les garder est un réglage du client, « Model invocation logging », désactivé par défaut : il est
  vérifié désactivé à l'ouverture du compte et le reste.

Sources AWS :

- Conservation des données par Amazon Bedrock :
  https://docs.aws.amazon.com/bedrock/latest/userguide/data-protection.html
- La journalisation des appels, réglage du client, désactivée par défaut :
  https://docs.aws.amazon.com/bedrock/latest/userguide/model-invocation-logging.html
- Ce que fait le profil réparti entre plusieurs régions d'une même géographie (« EU ») :
  https://docs.aws.amazon.com/bedrock/latest/userguide/geographic-cross-region-inference.html
- Le contrat de traitement des données d'AWS (DPA, article 28 du RGPD) :
  https://d1.awsstatic.com/legal/aws-dpa/aws-dpa.pdf ; le centre RGPD d'AWS :
  https://aws.amazon.com/compliance/gdpr-center/ ; les conditions de service :
  https://aws.amazon.com/service-terms/

## Les questions pour vous

1. **Une photo qui contient une donnée sensible.** Si le conseiller a écrit « Madame enceinte » sur
   ses notes et les photographie, la photo part vers le service d'IA, même si rien n'en est gardé.
   Suffit-il d'avertir le conseiller à l'écran (texte proposé ci-dessous), ou faut-il autre chose ?
2. **L'information de l'acquéreur** (articles 13 et 14 du RGPD) : c'est l'agence, responsable du
   traitement, qui informe l'acquéreur. Faut-il fournir aux agences une phrase à lui dire ou à mettre
   dans leurs documents ?
3. **Le sous-traitant ultérieur** : Amazon Web Services devient sous-traitant ultérieur d'ACM
   Studio (Anthropic ne reçoit rien, selon les conditions d'AWS). Faut-il mettre à jour le contrat avec les agences ?
4. **Plusieurs pays de l'Union** : les notes sont lues dans l'une des six régions d'AWS de l'Union
   (dont la France), choisie par AWS à chaque lecture. Faut-il les nommer sur la page, ou
   « dans l'Union européenne » suffit-il ?
5. **Le règlement européen sur l'IA** : le service propose et le conseiller valide ; rien n'est
   décidé sur une personne. Faut-il dire autre chose que la phrase proposée ?
6. **La ligne de chaque lecture** (qui, quand, le modèle, le coût, l'issue, les noms des champs) :
   elle reste à l'agence quand la fiche est supprimée, sans lien vers elle, comme la consommation
   des recherches. Est-ce acceptable, ou faut-il l'effacer avec la fiche ?

## Textes proposés

### À l'écran, au-dessus de « Prendre une photo » (pour le conseiller)

> Vos notes sont lues par un service d'intelligence artificielle, qui propose une fiche : vous la
> vérifiez avant de l'enregistrer. La photo n'est pas gardée. Ne photographiez pas d'information
> sur la santé, la religion ou la vie privée de vos clients : l'outil ne la relève pas, mais elle
> serait envoyée.

### `/confidentialite`, « Ce qu'ACM Studio conserve », à la fin du paragraphe des fiches acquéreur

> Pour créer ou compléter une fiche, le conseiller peut photographier ses notes, déposer la fiche
> exportée de son logiciel ou coller un texte : ce contenu est envoyé une fois à un service
> d'intelligence artificielle, Claude, d'Anthropic, utilisé par Amazon Web Services, qui le lit
> uniquement dans l'Union européenne, et propose une fiche ; le
> conseiller la vérifie, et seul ce qu'il valide est enregistré. La photo, le fichier ou le texte
> ne sont pas gardés par ACM Studio, ni les extraits des notes montrés au conseiller pour vérifier. Le service ne relève aucune donnée sur la santé, la religion,
> les origines, les opinions ou la vie privée, ni aucun jugement sur la personne ; dans les notes
> de la fiche, il ne propose que des faits pratiques (disponibilités pour visiter, contraintes),
> que le conseiller vérifie. Pour chaque lecture, ACM Studio garde la date, le conseiller qui l'a
> faite, le modèle utilisé, son coût, son issue (fiche créée ou complétée, lecture annulée) et le
> nom des champs proposés, jamais leur contenu ; cette ligne reste à l'agence, comme la
> consommation des recherches. Quand l'outil cherche des biens pour l'acquéreur, ce qui compte pour lui (le calme,
> l'absence de vis-à-vis, le caractère du bien…) est comparé aux descriptions publiques des annonces
> par le même service, sans son nom ni ses coordonnées ; l'outil range les biens et cite l'annonce
> au conseiller, il n'en écarte aucun. Pour la veille de la nuit, ce jugement et sa citation courte
> sont gardés avec le passage, et la citation est effacée au bout de 3 ans ; une citation qui
> contient une adresse n'est jamais gardée. Texte à faire relire par un juriste.

### `/confidentialite`, « Où sont les données », une ligne de plus

> Amazon Web Services (Amazon Bedrock), avec le modèle Claude d'Anthropic : la lecture des notes
> d'un conseiller et des descriptions d'annonces, uniquement dans l'Union européenne ; le service
> ne garde pas ce qu'il lit.

### `/confidentialite`, « Qui est responsable », une phrase de plus

> Pour lire les notes d'un conseiller, {éditeur} fait appel à Amazon Web Services, son propre
> sous-traitant.

Les phrases « jamais par une intelligence artificielle » de la page (messages aux clients, langues,
M139, M140) restent vraies : la fonction n'écrit aucun message.
