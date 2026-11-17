# Academia en un clic — le plan (16/11/2026)

Demandes de Jean-Guy du 16/11 : plus de copier-coller ni de passage par Mon secteur ; « Vivre ici »
seulement pour le bien vendeur. Sources : le contrat de Laurent du 14/11 (« API Mon secteur × ACM
Studio — v1, projet ») et `ACADEMIA_API_COTE_ACM.md`.

Règles qui tiennent :
- une seule clé (`ACADEMIA_API_KEY`, `ACADEMIA_API_KEY_DEMO`), posée par Jean-Guy dans Vercel ;
- seul le bien vendeur part vers Academia : aucun bien hors mandat, ni bouton, ni lien collé, ni
  adresse envoyée (Jean-Guy, 16/11) ;
- sans clé, ou Academia en panne, ACM garde le geste d'aujourd'hui (le lien du mandat à coller) ;
- pas d'ouverture à de vraies agences avant la référence du bien côté Laurent, ni avant le texte de
  confidentialité de l'API en ligne ;
- la démo n'invente aucun lien : elle attend la clé d'essai de Laurent ;
- rien sur `main` ni en production sans le feu vert de Jean-Guy.

## Lot 1 — « Vivre ici » en un clic, sur le bien vendeur (mission 157)

Maquette : `missions/maquettes/M157-1-bien-vendeur.png`.

Sur Bien vendeur, « Créer le lien « Vivre ici » » demande le dossier de l'adresse
(`POST /dossiers`), suit sa préparation (`GET /dossiers/{id}`, 2 minutes au plus), puis le lien
client (`POST /dossiers/{id}/liens-client`), et le range sur le mandat avec sa date d'expiration.
Le lien sert au vendeur et à chaque acquéreur à qui ce bien est proposé, comme le lien d'un mandat
aujourd'hui (son lien de dossier, « Confirmer la visite »). Expiré, il n'est plus montré.

**Codé maintenant, contre un faux serveur Academia :**
- le client de l'API, côté serveur seul : la clé choisie au serveur (vraie agence ou démo), le délai
  de 8 s et un seul nouvel essai, l'idempotence, les codes 401, 402, 403, 404, 422 (adresse
  ambiguë, propositions) et 429 (`Retry-After`), chaque réponse relue par une liste
  d'autorisation ;
- la carte « Le bien dans Academia » de la maquette : le bouton, l'attente, le lien et sa date, les
  erreurs, le repli ;
- une migration : une table pour le dossier Academia du mandat (son identifiant, son état,
  l'adresse envoyée, le lien créé et son expiration), lue par l'agence, écrite par le serveur seul.

**Attend Laurent :**
- **pour le voir dans la démo** : la clé d'essai, et l'adresse fictive de son dossier de
  démonstration fixe (A2) : la démo n'envoie que celle-là ;
- **pour une vraie agence** : la vraie clé, ses routes `[API-BIEN]` (sa mi-décembre), la référence du
  bien de son côté, et la confirmation que `liens-client` rend `expire_le`.

**Attend la juriste** : le texte de l'API (l'adresse du bien vendeur part vers Academia). Les vraies
agences restent fermées jusque-là, par un interrupteur.

## Lot 1 bis — Le lien montré au vendeur (décision de Jean-Guy du 14/11) — maquette d'abord

**Où, au plus tôt :**
- **Le Live** : sur « Votre bien », le deuxième écran, juste après l'introduction : « Vivre ici — le
  quartier, les écoles, les commerces ↗ », en contour sous la photo, qui ouvre Academia dans un
  nouvel onglet ouvert dans le geste, comme « Voir l'annonce » (M152 A). En Live interactif et en
  présentation directe. Absent sans lien ou lien expiré.
- **Le document final** : dans la synthèse, section « Votre bien » (et dans l'Étude de marché en
  « Document seul », sous la photo du bien) : le lien, cliquable sur la page publique, avec un QR
  code à l'impression, et « valable jusqu'au … » (un document imprimé survit au lien).

**Ce que ça change pour `never-seller-side.test.ts`** : aujourd'hui il refuse toute mention
d'Academia côté vendeur. Il s'ouvrirait au seul lien client, et à un seul module (le composant du
lien), avec un test sur la charge : seul un lien `https://app.myacademia.ai/l/<jeton>` relu y passe ;
une adresse, l'URL du dossier d'adresse, une valeur ou un DPE pièges ne passent pas. Tout le reste
d'Academia reste interdit côté vendeur.

## Lot 2 — Le dossier d'adresse lu dans ACM, pour le conseiller (mission 158)

Sur « Avant le rendez-vous », « Faire venir le dossier d'adresse » (le même dossier que le lot 1,
puis `GET /dossiers/{id}/bien`) : ventes, DPE, urbanisme, construction, risques, population,
copropriété, et la « Valeur indicative d'Academia », pour le conseiller seul ; chaque bloc avec ses
trois états, sa source et sa date ; « Source indisponible », jamais « aucun ».

- **Codable tout de suite** : l'écran et la lecture, sur l'exemple écrit dans le contrat (§4.3), sans
  migration de plus. Maquette d'abord.
- **Attend Laurent** : l'exemple et le schéma définitifs, la route `/bien`, la clé.
- **Attend Jean-Guy** : la règle de `CLAUDE.md` sur l'estimation, réécrite pour la valeur indicative
  (D1), avec son test.

## Lot 3 — Les pièces montrées au vendeur (mission 159)

Le conseiller coche : urbanisme, risques, population et copropriété dans le Live après la valeur
perçue ; les ventes avec « Analyse des prix » ; le document final, où les pièces sont figées avec
leur source et leur date.

- **Codable tout de suite** : les cases, les écrans, la section du document, sur l'exemple du
  contrat. Une migration : les pièces figées du document. Maquette d'abord.
- **Attend Laurent** : la route bien-client, et s'il faut nommer Academia à côté de la source.
- **Attend la juriste** : les ventes montrées au vendeur (la rue sans numéro et la distance
  suffisent-elles ?).
- **Attend Jean-Guy** : `never-seller-side` ouvert pièce par pièce, la conservation du document
  figé (D4).

## La mission 156 : ce que je propose (rien n'est supprimé sans l'accord de Jean-Guy)

**À garder** (repris par la 157) :
- la date du lien du mandat (`projects.academia_living_here_pasted_at`, posée par la base) et les
  avertissements aux 25e et 30e jours, pour un lien collé à la main (le repli) ;
- le champ partagé du lien et la carte « Le bien dans Academia » avec l'âge du lien ;
- la date du lien du mandat lue avec le lien (« Confirmer la visite ») ;
- la spec démo à 10 minutes.

**À retirer** :
- la table `property_living_here_links`, vide, avec ses deux fonctions et sa tâche de nuit : une
  migration, après comptage, que Jean-Guy applique ;
- le bloc « « Vivre ici » de chaque bien » du dossier acquéreur, l'action qui y enregistre, sa
  lecture, le lien discret de la fiche, la ligne d'information et l'interrupteur du hors mandat ;
- les lectures et refus ajoutés pour le hors mandat dans la relance, « Préparer son lien » et
  « Confirmer la visite » ;
- la suppression des liens dans la remise à zéro de la démo, l'exception du test « jamais côté
  vendeur », la spec e2e `vivre-ici-tout-bien`, et les lignes de `nettoyer-test`, de la procédure
  d'effacement (B), du test de cloisonnement et des gestes sensibles ;
- le périmètre A3 et ses maquettes passent au rang d'archive.
