> **ABANDONNÉE le 08/10/2026** par Laurent : la lettre DPE du bien vendeur est saisie par le
> conseiller (ou laissée vide) ; la mission 80 compare et donne une indication. Branche
> `mission-79-chauffage-dpe` non validée, jamais fusionnée dans `main`.

# MISSION 79 — Le chauffage vient de l'annonce, sinon du DPE officiel, sinon reste vide

**Date** : 08/10/2026 · **Origine** : Laurent. « Pour le chauffage, je veux que ce soit repris de
l'annonce ou du DPE, ou alors laissé vide, mais pas bloquant pour enregistrer et aller chercher les
concurrents. » La mission 78 a réglé l'annonce et le « pas bloquant » ; il manque le DPE.

## Objectif

Quand ni le conseiller, ni la fiche PDF, ni l'annonce ne donnent le chauffage, ACM le lit dans le
DPE public du bien (base de l'ADEME, gratuite, sans clé). Sinon le champ reste vide, sans gêne.

## Étape 1 — mesurer avant de coder

Sur 3 adresses réelles des Alpes-Maritimes (une maison, deux appartements en copropriété) :
jeu de données ADEME utilisé, noms exacts des champs (énergie, installation individuelle ou
collective, générateur, classes DPE et GES, surface, date), et nombre de DPE trouvés par adresse.
Recherche par l'identifiant BAN de l'adresse géocodée (même géocodage que le secteur). Rien de deviné.

## Critères d'acceptation (testables à l'écran)

1. Ordre de priorité : saisie du conseiller > fiche PDF > annonce > DPE. Le DPE n'écrit jamais
   par-dessus une valeur déjà là. Il remplit aussi la classe DPE et la classe GES si elles sont vides.
2. Il ne sert que si l'adresse est géocodée sûrement (règle de `geocode-subject.ts`), après un
   import ou quand le conseiller quitte le champ Adresse — jamais à chaque frappe.
3. Un seul DPE, ou plusieurs qui disent la même chose, ou un seul dont la surface est à 5 % près :
   le champ est rempli avec la mention « d'après le DPE du JJ/MM/AAAA ». Sinon, vide, en silence.
4. Traduction dans la liste existante (`list-values.ts`) : individuel ou collectif, électrique,
   gaz, pompe à chaleur (seulement si le générateur le dit), fioul, bois, réseau de chaleur.
5. ADEME injoignable ou lente (plus de 5 s) : rien ne se passe, aucun message d'erreur.
6. Chauffage, classe DPE et GES ne bloquent jamais « Enregistrer » ni « Trouver des concurrents »
   (test unitaire qui le prouve).
7. `/confidentialite` : l'adresse du bien vendeur est envoyée à la base publique de l'ADEME pour
   lire son DPE.

## Hors périmètre

- Les comparables et concurrents (pas de DPE pour eux), le document PDF du DPE, l'extension.

## Essai sur l'URL d'essai

Dossier avec l'adresse complète d'un bien dont le DPE existe, chauffage vide : en quittant le champ
Adresse, le chauffage se remplit « d'après le DPE du … ». Dossier sans adresse : chauffage vide,
« Enregistrer » et « Trouver des concurrents » passent.
