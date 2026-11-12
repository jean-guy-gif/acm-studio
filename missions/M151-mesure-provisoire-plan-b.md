# M151 — Mesure provisoire, plan B (12/11)

**Ce n'est pas la mesure qui choisit le modèle.** Le compte AWS n'a toujours pas accès à Claude 5.5
(« not available for this account », cas de support 179439470000287). En attendant, l'étape 0 tourne
sur une génération plus ancienne, pour valider le dossier d'essais, le barème et la méthode
(décision de Jean-Guy, 12/11). La fiche et le texte pour le juriste restent écrits pour Claude 5.5.

Bilan brut : `M151-essais/resultats/bilan-2026-11-12-06-24.md`. Réponses brutes et 73 annonces
hors du dépôt.

## Les conditions

- **Modèles** : `eu.anthropic.claude-sonnet-4-6` et `eu.anthropic.claude-haiku-4-5-20251001-v1:0`,
  appelés depuis l'Irlande (eu-west-1) par l'API Bedrock classique.
- **Où va la lecture** : lu par l'API (`GetInferenceProfile`, 12/11). Les deux profils envoient
  vers les six mêmes régions, **toutes dans l'Union** : Stockholm (eu-north-1), Paris (eu-west-3),
  Milan (eu-south-1), Espagne (eu-south-2), Irlande (eu-west-1), Francfort (eu-central-1). Ni
  Zurich ni Londres, contrairement au profil « EU » de Claude 5.5 (11/11).
- **Droits** : la politique en place, sans changement (`M151-etapes-aws.md`, étape 10).
- **Le dossier** : les 11 cas inventés (N1 à N6, C1 à C5), deux passes par modèle, sans photo
  (`photos/` est vide), contre les corrigés écrits avant ; le classement des 73 annonces réelles,
  une passe, 8 annonces par appel.

## Ce qui a changé dans l'outil de mesure (rien dans l'application)

- `mesure.mjs` choisit son client selon le modèle : un Claude 4 passe par l'API classique
  (`bedrock:InvokeModel`), un Claude 5.5 par `bedrock-mantle`. Tarifs des modèles 4 ajoutés
  (Sonnet 4.6 : 3 / 15 $ ; Haiku 4.5 : 1 / 5 $ par million de jetons, +10 % pour un profil
  géographique) ; un modèle sans tarif arrête la mesure. Haiku 4.5 n'a pas le réglage d'effort.
- **Le schéma de la fiche a été refusé** au premier passage : « too many parameters with union
  types (20 …, limit: 16) ». Les dix champs à liste fermée (oui / non, motif, délai, langue, DPE)
  disent désormais « ou rien » par `null` dans la liste, au lieu d'un `anyOf`. Le sens ne change
  pas, et le barème se vérifie toujours lui-même (`--essai-notation`). **À reprendre dans la
  fiche du code** : la limite vaudra aussi dans l'application.
- Modèles par défaut : Sonnet 5.5 et Haiku 5.5 **sans « eu. »**, en Irlande seule (décision du
  11/11 ; le script gardait encore les profils « eu. »). La commande des 5.5 est dans
  `M151-essais/README.md`.

## Haiku 4.5 : refusé

L'appel d'essai a répondu, puis chaque appel de la mesure a été refusé, et un nouvel essai aussi :

> 403 Model access is denied due to IAM user or service role is not authorized to perform the
> required AWS Marketplace actions (aws-marketplace:ViewSubscriptions, aws-marketplace:Subscribe)
> to enable access to this model. […] Your AWS Marketplace subscription for this model cannot be
> completed at this time. If you recently fixed this issue, try again after 5 minutes.

Ce n'est aucun des deux cas prévus (ni « not available for this account », ni « no
identity-based policy allows ») : à la première utilisation d'un modèle, AWS l'abonne au compte par
AWS Marketplace, et c'est l'appelant qui doit en avoir le droit. `acm-studio-bedrock` ne l'a pas.
Sonnet 4.6 marche, sans doute parce qu'il a déjà été ouvert dans le Playground par un compte
administrateur. **Remède sans toucher à IAM** : ouvrir Haiku 4.5 une fois dans le Playground avec
le compte administrateur, attendre 5 minutes, puis relancer la mesure de Haiku seul
(`M151_MODELES=eu.anthropic.claude-haiku-4-5-20251001-v1:0`). Le même abonnement attendra Claude
5.5 au déblocage du compte.

## Sonnet 4.6 : les fiches

| | Passe 1 | Passe 2 |
|---|---|---|
| Champs attendus justes | 104 / 105 | 104 / 105 |
| Champs faux | 2 | 1 |
| Valeurs inventées | 11 | 10 |
| Mentions personnelles | 2 | 2 |
| Critères doux manquants ou en trop | 0 | 0 |
| Notes incomplètes | 0 | 0 |

**Coût : 0,435 $ pour 22 fiches, 0,020 $ la fiche** ; durée médiane 3,6 s. Les deux passes donnent
presque la même chose : la lecture est stable.

**Ce qui est juste** : noms, téléphones dictés en lettres, e-mails, budgets ambigus laissés vides,
la contradiction « pas de travaux / un rafraîchissement ça va », le financement, les disponibilités
dans les Notes, les critères doux (aucun manqué, aucun en trop), la piscine de N4 en champ et non en
critère doux.

**Ce qui ne va pas** — c'est ce que la mesure sur Claude 5.5 devra dire, et ce que l'application
devra rattraper :

1. **Le motif inventé** : « résidence principale » posée sur 6 cas sur 11 où les notes n'en disent
   rien, aux deux passes, sans aucune source. Le modèle remplit la liste au lieu de la laisser vide. Ce peut être en partie l'effet
   du nouveau schéma (`null` dans la liste) : la même mesure sur Claude 5.5 le dira. Le délai
   « trois mois » de N6 est aussi déduit (« acte en février »), pas écrit.
2. **Deux mentions personnelles, aux deux passes** : « cash (vente Stockholm) » recopié comme
   source du financement (N4 : patrimoine et lieu de vie) ; « pas de voiture le w-e » recopié dans
   les mots d'un critère doux (N5). La consigne interdit les sources et les mots, et le modèle le
   fait quand même : **la garde au serveur sur les sources et les mots n'est pas facultative.**
3. **Des ★ inventés** : le budget ★ sur deux exports de logiciel, une fois sur deux (C2, C4 : une
   colonne « budget max » n'est pas « indispensable ») ; le type et les communes ★ de N6, tirés de
   « maison plain-pied obligatoire ». Le type ★ se défend, les communes non. Le corrigé de N6 est
   peut-être à relire sur ce point avant la mesure sur 5.5 (`must_have_accepte`).
4. **Un nom de commune faux** : « Châteauneuf-de-Grasse » au lieu de Châteauneuf-Grasse (N4, aux
   deux passes). La commune reconnue au serveur par geo.api.gouv.fr (M103) le rattrapera.
5. **Une case non cochée lue comme un refus** : parking « non » sur C4, à la passe 1 seulement.

## Sonnet 4.6 : le classement des 73 annonces

- **Cachet : 12 / 12 conformes**, y compris les faux amis (le charme du village, le collège
  « Pierre » Bertone, la villa de 2025 « au charme provençal »).
- **Calme : 63 / 73 conformes.** Les 10 écarts :
  - 4 annonces ne disent le calme que par l'**étiquette** SeLoger « Calme » : le modèle l'ignore et
    répond « rien ». À trancher pour la fiche : une étiquette du portail vaut-elle « clairement » ?
    La consigne ne le dit pas ;
  - 2 lus « contraire » là où l'annonce ne dit rien (le modèle tire un bruit d'un passage) : le
    plus gênant, car « contraire » fait descendre un bien ;
  - 3 « rien » à tort : 2 annonces disent le calme sans le mot (le corrigé y voit un indice), 1 le
    dit en toutes lettres ; et 1 « clairement » là où le corrigé voit une réserve.
- **Citations mot pour mot : 65 / 66.** Celle qui manque (« au calme absolu, au calme et sans
  nuisance ») recolle deux passages. La vérification au serveur l'aurait refusée et le jugement
  serait tombé : la garde prévue marche.
- **Coût : 0,271 $ pour 73 annonces, ≈ 0,004 $ l'annonce.**

## Ce que la mesure valide

- **Le dossier d'essais et le barème tiennent** : ils séparent ce qui est juste, inventé, faux et
  personnel, cas par cas, et la mesure se rejoue d'une commande. Une seule réserve : le ★ de N6.
- **Le coût est dans l'ordre prévu.** Sur Sonnet 4.6, plus cher que Sonnet 5.5 (2 / 10 $), une fiche
  coûte 0,02 $ (la mesure du 10/11 l'estimait à 0,02 € pour Sonnet 5.5) et une annonce 0,004 $.
- **Rien ne choisit encore entre Sonnet et Haiku** : Haiku n'a pas répondu.

## La suite

1. Jean-Guy ouvre Haiku 4.5 une fois dans le Playground (compte administrateur), puis je relance
   Haiku seul.
2. Dès que le compte a accès à Claude 5.5 : la même mesure, d'une commande
   (`M151-essais/README.md`), qui choisit le modèle.
