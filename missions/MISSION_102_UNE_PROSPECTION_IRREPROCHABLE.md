# MISSION 102 — Une prospection irréprochable

**Date** : 12/10/2026 · **Origine** : audit n°3 du 12/10/2026 (doc « Audit ACM Studio n°3 — après la
feuille de route 8/10 »), les trois corrections P0. Elles conditionnent l'invitation des premiers
conseillers, parce que les courriers partent chez de vrais propriétaires.

La mission se lance seule, depuis `main` à jour, après le `/valide 101`.
- Pas de push forcé.
- `npm run sauvegarde` avant la migration éventuelle.

## Objectif

Un propriétaire qui a dit « ne plus me solliciter » ne reçoit plus jamais rien. Chaque courrier dit
vrai sur l'origine de l'adresse, et porte les mentions obligatoires de l'agence.

## Constats (audit n°3, vérifiés dans le code)

1. `prospecting-list.tsx:65` propose « Corriger l'adresse » même sur une ligne marquée « Ne plus
   solliciter ». `confirm-competitor-address.ts:58-67` réécrit l'adresse sur toutes les copies sans
   regarder l'opposition. La clé d'adresse change, et le propriétaire revient dans les courriers et la
   tournée.
2. La clé d'opposition est une chaîne exacte (`address-key.test.ts:26`) : « Juan-les-Pins » au lieu
   d'« Antibes », ou un étage ajouté, suffit à y échapper.
3. `legal-mention.ts:20` dit « Votre adresse provient d'une annonce publiée. ». En réalité, l'adresse
   est déduite par le Localisateur (DPE, copropriété, cadastre…) ou saisie par le conseiller. Il manque
   aussi la durée de conservation et le lien vers la page de confidentialité.
4. La carte professionnelle n'est pas exigée pour imprimer un courrier (`file-access.ts:358-362`) et
   n'est imprimée que si elle est renseignée (`build-prospecting-file.ts:226`).

## Critères d'acceptation

### A. L'opposition ne se contourne plus

1. Une ligne « Ne plus solliciter » ne propose plus « Corriger l'adresse ». Côté serveur, corriger ou
   confirmer l'adresse d'un bien opposé est refusé, avec le message « Ce propriétaire a demandé à ne
   plus être sollicité ».
2. L'opposition est rattachée au **bien** et non à l'écriture de son adresse. Toutes les copies de la
   carte (M98) sont concernées, y compris celles des futurs dossiers qui désignent la même annonce.
3. La clé d'adresse est normalisée avant comparaison :
   - alias de communes de la M86 (Juan-les-Pins et Cap d'Antibes = Antibes, etc.) ;
   - arrondissements de la M99 ;
   - étage, bâtiment, appartement, « bis » et « ter » retirés de la clé, sans être retirés de
     l'adresse affichée ;
   - abréviations courantes (av., bd, ch., rte, all., imp.).

   Les oppositions déjà en base sont relues avec la nouvelle clé. Le compte rendu dit combien de
   cartes changent de statut.
4. Une opposition peut aussi être inscrite à la main, pour une adresse tapée qui n'est sur aucune
   carte : par exemple un propriétaire qui appelle.

### B. Une mention légale exacte

5. La mention dit la vraie source de l'adresse, selon `locator_source` et la saisie :
   - Localisateur : « Votre adresse a été déterminée à partir de données publiques (diagnostic de
     performance énergétique, registre des copropriétés ou cadastre) et de l'annonce de votre bien. » ;
   - saisie ou confirmation par le conseiller : « Votre adresse a été relevée par notre conseiller à
     partir de l'annonce de votre bien. ».
6. La mention comprend aussi :
   - la finalité : vous proposer nos services pour la vente de votre bien ;
   - la durée de conservation (voir Décision de Laurent) ;
   - les droits d'accès, d'opposition et d'effacement, avec le moyen de les exercer (téléphone ou
     e-mail de l'agence) ;
   - le droit de saisir la CNIL ;
   - l'adresse de la page `/confidentialite`.

   La mention reste lisible et tient sur le courrier, sans page de plus.
7. Le compte rendu donne le texte final de chaque variante, pour le juriste.

### C. Les mentions de l'agence

8. Le numéro de carte professionnelle et la préfecture ou la CCI qui l'a délivrée sont **exigés**
   avant l'impression d'un courrier, comme le téléphone et l'adresse (M90). Message : « Renseignez la
   carte professionnelle de l'agence (Administration → Agence) ».
9. Le courrier imprime la carte professionnelle, la mention « Ne peut recevoir aucun fonds » ou la
   garantie financière si elle est renseignée, et le nom sur les documents (M87).
10. Les courriers en lot (M98) appliquent les mêmes blocages, listés en tête avec leur raison.

### D. La durée de conservation

11. La durée retenue par Laurent est appliquée. Une adresse de propriétaire sans aucun contact ni
    statut depuis cette durée est effacée automatiquement, avec la même purge nocturne que la M100.
    Une adresse sur la liste « Ne plus solliciter » est gardée, réduite à sa clé, pour que l'opposition
    tienne.
12. `/confidentialite` et la procédure d'effacement (M93) sont mises à jour.

### E. Preuves

13. Migration soumise avant d'être appliquée, avec comptage avant et après, si la clé ou la purge
    l'exige.
14. Tests :
    - correction d'adresse refusée sur un bien opposé, à l'écran et côté serveur ;
    - normalisation de la clé (alias, étage, abréviations, arrondissements) ;
    - opposition manuelle ;
    - chaque variante de la mention ;
    - courrier bloqué sans carte professionnelle, unitaire et en lot ;
    - purge à la bonne durée, opposition conservée.
15. `npm run e2e` vert, tablette comprise.

## Décision de Laurent à inscrire

- Durée de conservation des adresses de propriétaires sans contact : **[à confirmer par Laurent —
  proposition : 3 ans]**.

## Décisions à respecter

- M86 (alias), M87 (nom sur les documents), M88 (droits), M90 (mention légale, blocages), M93
  (procédure d'effacement), M98 (carte par bien, opposition), M99 (arrondissements), M100 (purge
  nocturne, journal).
- On ne modifie pas l'extension.

## Hors périmètre

- Les autres P1 de l'audit n°3 (mission « Finitions »).

## Essai sur l'URL d'essai

1. Sur une carte « Ne plus solliciter » : plus de « Corriger l'adresse ».
2. Écrire la même adresse avec « Juan-les-Pins » au lieu d'« Antibes » dans un autre dossier : le
   badge « Ne plus solliciter » apparaît.
3. Inscrire une opposition à la main : l'adresse est bloquée partout.
4. Retirer la carte professionnelle dans Administration : le courrier est refusé avec le message. La
   remettre : le courrier l'imprime.
5. Lire la mention légale d'un courrier dont l'adresse vient du Localisateur, puis d'un courrier dont
   l'adresse a été saisie : chaque mention dit la bonne source.
