# MISSION 22 — BUILDER : DIAGNOSTICS ET COPROPRIÉTÉ

## Statut

Réalisée.

---

# Classification

MVP

---

# Objectif produit

Structurer les informations de diagnostics immobiliers et de copropriété nécessaires à la préparation du rendez-vous vendeur.

La Mission 21 a enrichi le bien vendeur.

La Mission 22 complète les données réglementaires et collectives qui influencent directement :

- la compréhension du bien ;
- le positionnement commercial ;
- les objections vendeur ;
- la crédibilité du conseiller ;
- la future présentation PDF ;
- le futur module Live.

Le logiciel prépare.

Le conseiller renseigne.

Le vendeur comprend.

L’IA n’intervient pas.

---

# Objectif métier

Permettre au conseiller de renseigner et de retrouver dans un format structuré :

- l’état des diagnostics ;
- leurs dates ;
- leurs résultats essentiels ;
- les informations principales de copropriété ;
- les procédures et travaux collectifs connus.

Cette mission ne gère pas encore les fichiers PDF ni les pièces jointes.

Elle structure uniquement les données métier.

---

# Principe fondamental

Les informations doivent être :

- structurées ;
- facultatives tant qu’elles ne sont pas connues ;
- validées ;
- réutilisables dans Builder, SellerPresentation et Live ;
- jamais inventées ;
- jamais interprétées automatiquement ;
- distinctes des documents sources.

Les pièces jointes viendront dans une mission ultérieure.

---

# Périmètre MVP

## Diagnostics

Structurer les informations suivantes :

- date du DPE ;
- consommation énergétique ;
- émissions GES ;
- diagnostic amiante ;
- diagnostic plomb ;
- diagnostic électricité ;
- diagnostic gaz ;
- diagnostic termites ;
- état des risques et pollutions ;
- date générale de réalisation ou de mise à jour des diagnostics ;
- date de validité si connue.

## Copropriété

Structurer :

- bien en copropriété ;
- nombre total de lots ;
- nombre de lots d’habitation ;
- charges annuelles ;
- fonds travaux ;
- syndic ;
- procédures en cours ;
- travaux votés ;
- travaux à prévoir ;
- impayés connus si l’information est disponible ;
- date de la dernière assemblée générale si connue.

---

# Hors périmètre

Ne pas ajouter dans cette mission :

- upload de documents ;
- stockage de PDF ;
- OCR ;
- extraction automatique ;
- lecture automatique des diagnostics ;
- calcul automatique de validité réglementaire ;
- génération de synthèse IA ;
- gestion complète des convocations ou procès-verbaux d’AG ;
- comptabilité détaillée de copropriété ;
- historique complet des diagnostics.

---

# Choix d’architecture

Créer deux tables liées à `subject_properties`.

## Table 1

```text
subject_property_diagnostics
```

Une ligne unique par bien vendeur.

## Table 2

```text
subject_property_condominiums
```

Une ligne unique par bien vendeur.

Pourquoi deux tables :

- séparation claire des domaines ;
- évolution indépendante ;
- évite de surcharger `subject_properties` ;
- facilite la lecture et les futures pièces jointes ;
- évite une colonne géante regroupant tout, cette invention humaine qui finit toujours par devenir “miscellaneous”.

Chaque table doit avoir :

```text
id uuid primary key
subject_property_id uuid not null
agency_id uuid not null
created_at timestamptz not null
updated_at timestamptz not null
```

Ajouter :

```text
UNIQUE(subject_property_id)
```

---

# Table diagnostics

Créer les colonnes suivantes :

```text
dpe_date date null
energy_consumption integer null
ges_emissions integer null

asbestos_status text null
lead_status text null
electricity_status text null
gas_status text null
termites_status text null
erp_status text null

diagnostics_completed_at date null
diagnostics_valid_until date null

notes text null
```

---

# Statuts diagnostics

Valeurs autorisées :

```text
not_required
not_done
in_progress
clear
anomaly
positive
negative
unknown
```

Règles :

- chaque diagnostic utilise ce vocabulaire commun ;
- `clear`, `negative` et `positive` doivent être utilisés avec prudence selon le diagnostic ;
- aucun calcul juridique n’est déduit automatiquement ;
- `unknown` reste acceptable tant que l’information manque.

Le but est de stocker un statut opérationnel, pas de remplacer le diagnostiqueur.

---

# Table copropriété

Créer les colonnes suivantes :

```text
is_condominium boolean not null default false

total_lots integer null
residential_lots integer null

annual_charges numeric null
works_fund numeric null

syndic_name text null

ongoing_procedures boolean null
procedures_details text null

voted_works boolean null
voted_works_details text null

planned_works boolean null
planned_works_details text null

known_unpaid_charges boolean null
known_unpaid_charges_amount numeric null

last_general_assembly_date date null

notes text null
```

---

# Validations diagnostics

## Dates

- dates valides ;
- `diagnostics_valid_until >= diagnostics_completed_at` si les deux sont renseignées ;
- aucune date future excessive.

Règle MVP :

```text
date maximale = date courante + 5 ans
```

## Consommation énergétique

- entier ;
- minimum `0` ;
- maximum `2000`.

## Émissions GES

- entier ;
- minimum `0` ;
- maximum `500`.

## Notes

- maximum 2 000 caractères ;
- trim ;
- chaîne vide → `null`.

---

# Validations copropriété

## Lots

- entier ;
- minimum `0` ;
- maximum `1 000 000`.

Si total_lots et residential_lots sont renseignés :

```text
residential_lots <= total_lots
```

## Charges annuelles

- nulles ou supérieures ou égales à `0`.

## Fonds travaux

- nul ou supérieur ou égal à `0`.

## Impayés connus

- montant nul ou supérieur ou égal à `0`.

Si :

```text
known_unpaid_charges = false
```

alors :

```text
known_unpaid_charges_amount = null
```

## Copropriété inactive

Si :

```text
is_condominium = false
```

alors les autres champs de copropriété doivent être remis à `null` ou à leur valeur neutre.

Le système ne doit pas conserver des charges ou un syndic sur un bien déclaré hors copropriété.

---

# Cohérence des booléens et détails

Pour les procédures, travaux votés et travaux prévus :

- si la valeur est `true`, le champ de détail peut être renseigné ;
- si la valeur est `false`, le détail doit être normalisé à `null` ;
- si la valeur est `null`, le détail doit rester `null`.

Maximum :

```text
2 000 caractères par champ de détail
```

---

# Migration

Créer une seule migration Mission 22 contenant :

- les deux tables ;
- leurs contraintes ;
- leurs index ;
- les clés étrangères ;
- les règles RLS ;
- les valeurs par défaut ;
- les triggers `updated_at` si la convention du dépôt l’exige.

Ne pas modifier les tables d’autres missions sauf nécessité stricte.

---

# Relations

## Diagnostics

```text
subject_property_diagnostics.subject_property_id
→ subject_properties.id
```

avec :

```text
ON DELETE CASCADE
```

## Copropriété

```text
subject_property_condominiums.subject_property_id
→ subject_properties.id
```

avec :

```text
ON DELETE CASCADE
```

## Agence

```text
agency_id
→ agencies.id
```

Ne jamais accepter `agency_id` depuis le navigateur comme source de vérité.

---

# Sécurité

Activer la RLS sur les deux tables.

La lecture et l’écriture doivent être limitées à l’agence du bien vendeur.

Réutiliser la convention existante :

- dériver l’agence depuis l’utilisateur ;
- vérifier le projet et le bien ;
- ne jamais faire confiance à un identifiant d’agence envoyé par le client.

Aucune donnée d’une autre agence ne doit être visible ou modifiable.

---

# Stratégie de sauvegarde

Créer deux actions serveur dédiées si aucune action générique cohérente n’existe déjà :

```text
save-subject-property-diagnostics.ts
save-subject-property-condominium.ts
```

Chaque action doit :

1. authentifier l’utilisateur ;
2. récupérer son agence ;
3. vérifier l’accès au projet ;
4. charger le bien vendeur ;
5. valider les données ;
6. normaliser les champs ;
7. effectuer un UPSERT sur `subject_property_id` ;
8. revalider la page ;
9. retourner un résultat structuré.

Le navigateur ne doit jamais transmettre :

- agency_id ;
- created_at ;
- updated_at ;
- id.

---

# Interface Builder

Adapter la fiche bien vendeur existante ou ajouter deux sous-sections clairement intégrées au parcours existant.

Ne pas créer un module concurrent.

Ordre recommandé :

## 1. Diagnostics

Afficher :

- date DPE ;
- consommation énergétique ;
- émissions GES ;
- statuts amiante, plomb, électricité, gaz, termites, ERP ;
- date de réalisation ;
- date de validité ;
- notes.

## 2. Copropriété

Afficher :

- bien en copropriété ;
- lots ;
- charges annuelles ;
- fonds travaux ;
- syndic ;
- procédures ;
- travaux votés ;
- travaux prévus ;
- impayés connus ;
- dernière AG ;
- notes.

---

# Composants de saisie

Utiliser :

- champs date ;
- champs numériques avec unités ;
- sélecteurs contrôlés ;
- booléens tri-état lorsque `unknown` est nécessaire ;
- textarea court pour les détails ;
- aucune saisie libre pour les statuts.

Unités :

```text
Consommation : kWhEP/m²/an
Émissions : kgCO₂/m²/an
Charges : €/an
Fonds travaux : €
Impayés : €
```

---

# Expérience utilisateur

L’interface doit :

- accepter les données partielles ;
- masquer les champs inutiles lorsque `is_condominium = false` ;
- conserver la saisie en cas d’erreur ;
- afficher les erreurs près du champ ;
- désactiver les boutons pendant la sauvegarde ;
- confirmer la sauvegarde ;
- ne pas bloquer la fiche si les diagnostics ne sont pas encore réalisés.

---

# SellerPresentation

Adapter `buildSellerPresentation()` afin d’exposer :

## Diagnostics

- date DPE ;
- consommation ;
- émissions ;
- statut de chaque diagnostic ;
- date de réalisation ;
- date de validité ;
- notes si nécessaires.

## Copropriété

- statut copropriété ;
- lots ;
- charges ;
- fonds travaux ;
- syndic ;
- procédures ;
- travaux ;
- impayés ;
- date AG.

Ne jamais inventer une donnée absente.

---

# Live

Adapter uniquement les sections concernées.

Afficher :

- un résumé diagnostics ;
- un résumé copropriété ;
- uniquement les données utiles au rendez-vous.

Ne pas afficher les notes techniques internes si elles ne sont pas utiles au vendeur.

Live reste en lecture seule.

---

# Alertes de préparation

Ajouter des alertes déterministes dans SellerPresentation.

## Bloquantes

Aucune nouvelle alerte bloquante dans cette mission.

## Vigilance

- diagnostic DPE non réalisé ;
- anomalie électricité ;
- anomalie gaz ;
- amiante positive ;
- plomb positif ;
- termites positifs ;
- ERP inconnu ;
- copropriété avec procédure en cours ;
- travaux votés ;
- impayés connus ;
- charges annuelles manquantes sur un bien en copropriété.

## Informatives

- diagnostics en cours ;
- données copropriété incomplètes ;
- date de validité proche si cette information est explicitement renseignée.

Ne pas calculer automatiquement une date réglementaire si elle n’est pas stockée.

---

# Architecture recommandée

Créer deux features ou sous-features cohérentes avec le dépôt.

Exemple :

```text
src/features/subject-property-diagnostics/
  actions/
  components/
  services/
  types/

src/features/subject-property-condominium/
  actions/
  components/
  services/
  types/
```

Ou intégrer dans `subject-property` si l’architecture existante le rend plus simple.

Choisir une seule approche.

---

# Services purs

Créer au minimum :

```text
validate-subject-property-diagnostics.ts
normalize-subject-property-diagnostics.ts
validate-subject-property-condominium.ts
normalize-subject-property-condominium.ts
```

Les validations doivent être testables sans Supabase.

---

# Lecture serveur

Créer des services de lecture :

```text
get-subject-property-diagnostics.ts
get-subject-property-condominium.ts
```

Ils doivent :

- respecter la sécurité agence ;
- retourner `null` si aucune ligne n’existe ;
- ne jamais inventer de valeurs par défaut métier ;
- typer les résultats.

---

# Types Supabase

Après migration :

- exécuter `supabase db reset` ;
- régénérer `database.types.ts` via la CLI ;
- ne jamais modifier les types manuellement.

---

# Tests obligatoires

## Diagnostics

Tester :

- création ;
- mise à jour ;
- données partielles ;
- statuts valides ;
- statut invalide refusé ;
- consommation négative refusée ;
- consommation trop élevée refusée ;
- émissions négatives refusées ;
- émissions trop élevées refusées ;
- date de validité antérieure à la date de réalisation refusée ;
- note trop longue refusée ;
- chaîne vide normalisée à `null`.

## Copropriété

Tester :

- copropriété vraie ;
- copropriété fausse ;
- remise à zéro des champs si hors copropriété ;
- total de lots valide ;
- lots d’habitation supérieurs au total refusés ;
- charges négatives refusées ;
- fonds travaux négatif refusé ;
- impayés négatifs refusés ;
- procédure fausse → détail supprimé ;
- travaux votés faux → détail supprimé ;
- travaux prévus faux → détail supprimé ;
- détails trop longs refusés ;
- données partielles acceptées.

## Sécurité

Tester :

- utilisateur non authentifié refusé ;
- autre agence refusée ;
- projet inexistant ;
- bien vendeur inexistant ;
- lecture agence A ;
- lecture agence B refusée ;
- aucune duplication grâce à UNIQUE(subject_property_id).

## SellerPresentation

Tester :

- diagnostics exposés ;
- copropriété exposée ;
- données absentes conservées à `null` ;
- alertes générées ;
- aucune donnée inventée.

## Live

Vérifier :

- diagnostics affichés si présents ;
- copropriété affichée si présente ;
- champs absents masqués ;
- aucune action de modification ;
- aucune note interne affichée sans justification.

---

# Critères d’acceptation

La mission est validée lorsque :

- les deux tables sont créées ;
- une seule ligne active existe par bien et par domaine ;
- les validations sont déterministes ;
- les données partielles sont acceptées ;
- la sécurité multi-agence est conservée ;
- les actions serveur ne font pas confiance au client ;
- SellerPresentation expose les données ;
- Live affiche uniquement les informations utiles ;
- aucune pièce jointe n’est gérée ;
- aucune IA n’est utilisée ;
- les types Supabase sont régénérés via la CLI ;
- tous les tests sont verts ;
- lint est vert ;
- typecheck est vert ;
- build est vert ;
- `supabase db reset` est vert.

---

# Hors périmètre

## V2

- upload des diagnostics ;
- stockage des PDF ;
- échéances automatiques ;
- alertes de renouvellement ;
- historique ;
- pièces d’AG ;
- gestion documentaire ;
- suivi des travaux.

## V3

- OCR ;
- extraction automatique ;
- contrôle de cohérence IA ;
- résumé automatique ;
- recommandations de travaux ;
- prévision des coûts ;
- analyse réglementaire automatisée.

---

# Points de vigilance

Cette mission structure les données déclaratives.

Elle ne remplace ni le diagnostiqueur, ni le syndic, ni le notaire.

Les statuts stockés doivent rester descriptifs.

Le produit doit aider le conseiller à préparer son rendez-vous, pas se transformer en cabinet juridique improvisé avec un menu déroulant.

---

# Definition of Done

- migration créée ;
- deux tables créées ;
- contraintes et RLS ajoutées ;
- actions serveur créées ;
- validations et normalisations créées ;
- services de lecture créés ;
- interface Builder adaptée ;
- SellerPresentation adapté ;
- Live adapté ;
- alertes ajoutées ;
- types Supabase régénérés ;
- tests applicatifs et SQL terminés ;
- aucun fichier temporaire ;
- aucune dette bloquante connue ;
- mission laissée au statut `À réaliser.` avant revue CTO ;
- aucun commit ;
- aucun push.

---

# Contrôles obligatoires avant revue CTO

Exécuter :

```bash
npm run test
npm run lint
npm run typecheck
npm run build
npm run format:check
supabase db reset
```

Exécuter également les tests SQL de la mission.

---

# Livrables attendus

À la fin de la mission, Claude Code doit fournir :

- résumé des développements ;
- décisions techniques prises ;
- migration créée ;
- schéma exact des deux tables ;
- contraintes ;
- politiques RLS ;
- validations ;
- normalisations ;
- fichiers créés ;
- fichiers modifiés ;
- types Supabase régénérés ;
- résultats détaillés des tests SQL ;
- résultats détaillés des tests applicatifs ;
- nombre total de tests ;
- résultat du lint ;
- résultat du typecheck ;
- résultat du build ;
- résultat du format check ;
- résultat de `supabase db reset` ;
- git diff ;
- git status ;
- points de vigilance éventuels.

Aucun commit.

Aucun push.

Une revue CTO sera effectuée avant validation.