# M159 — Le quartier montré au vendeur : la phrase pour `/confidentialite`

Préparée, **non publiée** (décision de Jean-Guy, 17/11) : elle sera publiée à l'ouverture
d'Academia aux vraies agences (aujourd'hui, seule l'agence de démonstration y a accès). À faire
relire par la juriste avant.

## Où

Dans la section qui décrit le dossier d'adresse et « Vivre ici » d'Academia, à la suite du
paragraphe validé le 11/11.

## Proposition

> **Le quartier montré au vendeur.** Au choix du conseiller, des informations publiques sur le
> quartier du bien (urbanisme, risques, population, copropriété, permis de construire, ventes
> réelles), rassemblées par Academia à partir de sources publiques (Géoportail de l'urbanisme,
> Géorisques, Insee, registre national des copropriétés, Sitadel, DVF), peuvent être montrées au
> vendeur pendant le rendez-vous et figurer dans les documents qui lui sont remis. ACM Studio garde
> les seules informations choisies par le conseiller, le jour où il les a choisies, l'adresse, le
> type, le nombre de pièces et la surface du bien pour lesquels elles ont été calculées, et le
> conseiller qui les a choisies ; jamais le nom ni l'immatriculation d'une copropriété, ni une
> valeur du bien. Ces informations sont visibles par la seule agence et effacées avec le dossier.

## Ce que le code fait (pour vérifier la phrase)

- Table `project_neighbourhood_snapshots` (migration `20261215090000_quartier_au_vendeur`) : les
  blocs cochés, l'adresse et les caractéristiques du bien, le jour, l'auteur ; écrite par le serveur
  seul, lue par l'agence, supprimée avec le dossier (`on delete cascade`), comptée et supprimée par
  la procédure d'effacement A.
- Les ventes réelles : le mois, le type, les pièces, la surface, le prix, la distance arrondie à
  50 m et le nom de la rue, sans numéro ; les permis : la rue, sans numéro ni numéro de permis.
- Jamais la valeur indicative ni le DPE (refusés par la base, à tout niveau).
