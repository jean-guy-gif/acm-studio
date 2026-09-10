# MISSION 44 — Étendre la table de correspondance de la fiche

**Date** : 10 septembre 2026
**Constat de Laurent** : « ça fonctionne, par contre j'ai plus d'infos dans la fiche
qui ne sont pas mises dans l'outil, peu de champs sont remplis. »

---

## 1. État des lieux

L'import PDF tourne en production. Sur la fiche de Villeneuve-Loubet, **onze champs
sont repris** : surface, chambres, code postal, ville, état général, exposition,
DPE, GES, extérieur, consommation d'énergie, émissions GES. La fiche en contient une
trentaine.

**Le lecteur générique fait son travail** — il repère bien les paires
« Libellé : valeur » et les sections. C'est la **table de correspondance** qui est
courte. Exactement ce que le brief de la mission 42 annonçait comme l'étape
suivante : « une deuxième famille demandera une nouvelle fixture, pas une
réécriture ». Ici ce n'est même pas une autre famille, ce sont les mêmes fiches avec
plus de libellés à reconnaître.

---

## 2. Deux bugs à corriger d'abord

### 2.1 La taxe foncière et les charges ne sont pas des prix

Aujourd'hui la taxe foncière est bien extraite, mais affichée dans la ligne
« Prix lu sur la fiche : 390 000 € · taxe foncière 1 243 €/an — pour information ».

C'est une sur-application de la règle. Seule **l'estimation de vente** ne doit rien
écrire, parce que l'outil ne produit jamais d'estimation. Une taxe foncière et des
charges de copropriété sont des montants factuels, qui ont leur champ dans le
formulaire.

- `Taxe foncière : 1 243 €/an` → `property_tax`
- `Charges : 255,56 €/mois` → `monthly_charges`

La ligne « pour information » ne garde plus que le prix de vente.

### 2.2 La copropriété est déclarée « Non » à tort

La fiche porte « Montant moyen de la quote-part de charges courantes 3 066,72 €/an »
dans la mention légale, et « Jardin en copropriété » / « Piscine en copropriété »
dans les prestations. Le formulaire affiche pourtant **« Bien en copropriété : Non »**.

`is_condominium` doit passer à oui dès qu'une quote-part de charges de copropriété
est trouvée, et `annual_charges` la recevoir.

**Un champ vide, le conseiller le remplit. Un champ faux, il ne le voit pas.**
C'est la correction la plus importante de la mission.

---

## 3. Les champs à ajouter à la table

| Dans la fiche | Où le lire | Champ du formulaire |
| --- | --- | --- |
| Appartement | titre de la page 1, et « Vente - Appartement » | `property_type` |
| 3 | bloc de chiffres, libellé « Pièces » | `rooms_count` |
| Rez-de-jardin | `Étage :` | `floor` |
| le paragraphe descriptif complet | page 1, sous le prix | `description` |
| 255,56 €/mois | `Charges :` | `monthly_charges` |
| 1 243 €/an | `Taxe foncière :` | `property_tax` |
| Salle de douche | section « Surfaces » | `bathrooms_count` — compter les salles de bains et salles d'eau |
| Climatisation | `Type de chauffage :` | `heating_type` — mapper les valeurs réellement rencontrées ; laisser vide plutôt que deviner |
| quote-part 3 066,72 €/an | mention légale du pied de page | `is_condominium` + `annual_charges` |
| place de parking en sous-sol | description | `parking_types` — uniquement via la déduction existante, ne rien inventer |

Le bloc de chiffres de la page 2 est structuré en paires valeur/libellé sur deux
lignes (`60.21 m²` / `Surface habitable`, `3` / `Pièces`, `2` / `Chambres`,
`Rez-de-jardin` / `Étage`). La surface et les chambres en sortent déjà : les pièces
et l'étage viennent du même endroit.

---

## 4. Les prestations comme points forts

La fiche liste **21 prestations** : air conditionné, gardien, portail électrique,
vidéo surveillance, double vitrage, fenêtres coulissantes, internet, stores,
arrosage, clôture, éclairage extérieur, jardin en copropriété, concierge, fibre
optique, alarme, interphone, service de sécurité, piscine en copropriété, salle de
sport, tennis, terrain de jeux.

C'est exactement la matière de **« Argumentaire → Points forts »**, vide aujourd'hui.
Reprends-les dans la limite du champ (10 éléments, 200 caractères chacun), en gardant
l'ordre de la fiche. Le conseiller trie et complète — c'est son argumentaire, pas
celui de l'outil.

**Ne touche pas aux « Points de vigilance ».** Rien dans une fiche commerciale ne les
alimente honnêtement : une fiche vend, elle ne signale pas les faiblesses.

---

## 5. Le résumé doit dire la vérité

Le panneau affiche « À compléter : Année de construction, Stationnement » alors qu'il
manquait dix champs. Il ne liste que ce qu'il sait chercher.

Fais-le porter sur **la liste réelle des champs du formulaire**, pas sur les seuls
libellés qu'il sait lire. Un conseiller doit pouvoir se fier à cette liste pour savoir
ce qu'il lui reste à saisir.

---

## 6. Garde-fous

- **Le lecteur générique ne change pas.** Seule la table de correspondance s'étend.
- **Aucun champ inventé.** Un libellé absent laisse la case vide.
- **Le prix de vente reste une information** et ne préremplit jamais la fourchette du
  conseiller.
- Les trois fixtures `.txt` servent de référence : après l'extension, écris pour
  chacune ce qui est repris et ce qui reste vide, et vérifie que rien de ce qui était
  déjà juste ne bouge.

---

## 7. Barrières

Fixtures · `vitest` · `tsc --noEmit` · `eslint` · `prettier --check` · `next build` ·
**et l'essai sur le déploiement avant de déclarer la mission finie.**