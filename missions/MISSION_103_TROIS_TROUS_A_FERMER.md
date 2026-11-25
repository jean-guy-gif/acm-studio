# MISSION 103 — Trois trous à fermer

**Date** : 13/10/2026 · **Origine** : audit n°4 du 12/10/2026 (doc « Audit ACM Studio n°4 — après les
P0 »), les trois corrections P0. Laurent : « ok go ». Les trois défauts sont nés des missions 101 et
102. C'est une petite mission : pas de nouvelle fonction.

La mission se lance seule, depuis `main` à jour.
- Pas de push forcé.
- `npm run sauvegarde` avant la migration éventuelle.

## Objectif

Une opposition bloque toujours ce qu'elle annonce. La mention légale dit toujours la vraie source de
l'adresse. Un concurrent retenu n'est jamais écarté à tort.

## 1. L'opposition inscrite à la main bloque vraiment

**Constat** : `manual-opposition.ts:15-16` accepte une adresse de 4 mots avec un numéro, sans commune.
Le code postal est retiré de la clé (M102). « 14 chemin des Oliviers 06800 » donne donc la clé
« 14 chemin des oliviers », alors que la carte du bien donne « 14 chemin des oliviers cagnes sur
mer ». Les deux ne se rejoignent jamais, mais l'écran annonce que le propriétaire ne sera plus
sollicité.

**Critères** :
1. L'inscription à la main exige une commune reconnue, soit tapée, soit déduite du code postal par le
   référentiel déjà utilisé (geo.api.gouv.fr, gratuit). Un code postal à plusieurs communes demande de
   choisir la commune.
2. La clé enregistrée est construite **exactement** comme celle des cartes, par la même fonction, alias
   et arrondissements compris.
3. Avant d'enregistrer, l'écran montre l'adresse comprise : « 14 chemin des Oliviers, Cagnes-sur-Mer —
   Inscrire ? ».
4. Les oppositions déjà inscrites à la main (0 en base au 12/10) sont relues : le compte rendu dit
   combien n'ont pas de commune.
5. Sur le bouton « Ne plus solliciter » d'une carte, après « Confirmer », un message bref confirme
   l'enregistrement : « Inscrit : plus aucun courrier pour cette adresse ». Aujourd'hui, la carte
   disparaît sans rien dire, et l'essai du 12/10 a montré que ce n'est pas clair.

## 2. La mention légale dit la vraie source

**Constat** : « C'est la bonne adresse » sur une proposition du Localisateur enregistre
`locator_source = 'vous'` (`advisor-address.ts:61`). Le courrier dit alors « relevée par notre
conseiller » (`legal-mention.ts:25`), alors que l'adresse vient du DPE, du registre des copropriétés
ou du cadastre.

**Critères** :
6. **Confirmer** l'adresse proposée garde sa source d'origine et ajoute seulement « confirmée par le
   conseiller ». Seule une **correction** ou une **saisie** fait passer la source à « conseiller ».
7. La mention lit la source d'origine :
   - adresse du Localisateur, confirmée ou non : « déterminée à partir de données publiques… » ;
   - adresse saisie ou corrigée par le conseiller : « relevée par notre conseiller… ».
8. Les adresses déjà confirmées en base : si l'ancienne source n'est plus connue, la mention retombe
   sur une formule vraie dans les deux cas : « Votre adresse a été déterminée à partir de l'annonce de
   votre bien et de données publiques, puis vérifiée par notre conseiller. ». Le compte rendu dit
   combien de lignes sont concernées et donne la phrase, pour le juriste.

## 3. Un concurrent retenu n'est jamais écarté par erreur

**Constat** : une page lue sans prix est traitée comme une annonce retirée, sans deuxième lecture
(`import-listing.ts:129` : `listing_empty` devient `withdrawn`). Le concurrent est créé non retenu
(`pending-imports.ts:173`), avec un faux badge « Annonce retirée ». Une page captcha ou un gabarit de
portail modifié produit exactement ce cas. Cela contredit la règle de Laurent : 100 % des biens
retenus importés.

**Critères** :
9. « Annonce retirée » seulement sur une preuve : redirection hors de l'annonce (déjà détectée), page
   404 ou 410, ou mention explicite du portail (« annonce n'est plus disponible », etc., une liste par
   portail). Une page vide **sans preuve** est un échec de lecture ordinaire.
10. Un échec de lecture suit le chemin de la M101 : nouvelle lecture, puis création depuis les données
    de la recherche, **retenue**, avec le badge « Importé depuis la recherche ».
11. Une page vide sans preuve est comptée dans « Échecs de lecture par portail » sous la cause « page
    sans données (captcha ?) ». Un pic sur un portail signale un changement de gabarit.
12. Une annonce retirée recochée par le conseiller : un avertissement « Cette annonce n'est plus en
    ligne : elle sera présentée au vendeur comme un bien en vente. Continuer ? ». Le choix reste au
    conseiller.

## 4. Preuves

13. Migration soumise avant d'être appliquée, seulement si la source d'origine demande une colonne.
    Comptage avant et après.
14. Tests :
    - opposition à la main sans commune refusée, avec code postal et commune déduite, avec code postal
      à plusieurs communes ;
    - la même adresse à la main et sur une carte donne la même clé, alias compris ;
    - confirmer garde la source, corriger la change ;
    - mention pour chaque cas, dont l'ancien cas sans source ;
    - page captcha (sans prix, sans redirection) : retenue, créée depuis la recherche ;
    - redirection, 404 et mention explicite : « Annonce retirée » ;
    - recocher une annonce retirée affiche l'avertissement.
15. `npm run e2e` vert, tablette comprise.

## Décision de Laurent à inscrire

- La clé d'opposition couvre tout l'immeuble : un refus bloque toute la résidence, et le 8 bis bloque
  le 8. **Gardé ainsi pour la bêta** (prudence), à revoir avec les retours des conseillers.

## Hors périmètre

- Les P1 de l'audit n°4 (mission « Finitions »).
- On ne modifie pas l'extension.

## Essai sur l'URL d'essai

1. En bas de `/prospection`, inscrire « 1 rue de l'Essai 06600 » : la commune Antibes est proposée,
   puis « Inscrire ? », puis le message. Dans un dossier, saisir « 1 rue de l'Essai, Antibes » sur une
   carte : le badge « Ne plus solliciter » apparaît.
2. Sur une carte, « Ne plus solliciter » puis « Confirmer » : le message « Inscrit… » s'affiche.
3. Sur un concurrent dont le Localisateur propose une adresse, « C'est la bonne adresse », puis
   préparer le courrier : la mention dit « déterminée à partir de données publiques ».
4. Corriger une adresse à la main, puis préparer le courrier : la mention dit « relevée par notre
   conseiller ».
5. Recocher une annonce retirée : l'avertissement s'affiche.
6. Ensuite, demander à Claude Code de retirer les oppositions de test, avec comptage avant et après.
