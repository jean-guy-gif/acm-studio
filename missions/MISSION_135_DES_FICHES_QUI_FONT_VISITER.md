# MISSION 135 — Des fiches qui font visiter

**Date** : 06/11/2026 · **Origine** : retours des agences relayés par Jean-Guy : « beaucoup de fiches
envoyées, peu de visites générées ». Feuille de route : `FEUILLE_DE_ROUTE_LA_BOUCLE.md`. Suite des 122
(dossier qui fait agir), 132 (échange), 134 (biens proposés).

Équipe allégée. Pas de migration attendue : tout se lit dans les tables existantes (liens, réponses,
propositions, visites). Arrêt si une devient nécessaire.

## A. Un lien sans réponse devient une relance
1. Un lien de dossier acquéreur envoyé (une proposition notée, M134, ou un lien créé et partagé, M122)
   **sans réponse après 48 h** fait naître une tâche dans « À faire aujourd'hui » : « Relancer M. et Mme
   Lambert : sélection envoyée le 04/11, pas de réponse ». Une seule tâche par acquéreur.
2. La tâche ouvre sur place un message prêt (Copier / SMS / WhatsApp / E-mail) : court, avec le bien qui
   coche le plus de ses ★ (« la maison de Vence avec piscine est toujours disponible ; voulez-vous la
   visiter samedi ? ») et le même lien. « J'ai relancé » note un échange (132) ; une 2e relance est
   proposée 5 jours plus tard, pas au-delà.
3. Un lien expiré (30 jours) sans réponse propose « Envoyer un nouveau lien » à la place.

## B. Les refus affinent la recherche
4. Quand un acquéreur répond « Pas pour moi » avec des raisons (M122), la fiche compte les raisons sur
   ses derniers refus. À partir de 2 refus pour la même raison, la fiche propose un ajustement concret,
   jamais appliqué sans le conseiller :
   - « Le prix » ×2 → « Ses refus disent le prix : proposer des biens jusqu'à 720 000 € au lieu de
     800 000 € ? » (le prix moyen des biens refusés pour cette raison, arrondi) ;
   - « La surface » → « surface minimum à 120 m² ? » ;
   - « Le quartier » → « retirer La Colle-sur-Loup ? » (la commune des biens refusés) ;
   - « Le parking », « L'extérieur », « Les travaux » → en faire un indispensable ★ ?
   « Appliquer » modifie la recherche, note l'ajustement dans « Ce qui s'est passé », et relance le
   rapprochement ; « Ignorer » l'écarte pour ces refus.
5. Une raison « Autre » ne propose rien.

## C. Ce que le conseiller voit de son efficacité
6. Sur la liste des acquéreurs, en tête : « Ce mois-ci : 24 biens proposés · 9 réponses · 4 visites ».
   Par acquéreur, la ligne dit sa dernière réponse. Rien d'autre (pas de classement entre conseillers).

## Démo
Les Lambert ont une sélection envoyée il y a 3 jours sans réponse (la tâche de relance apparaît) ; les
Keller ont deux refus « Le prix » (l'ajustement apparaît sur leur fiche).

## Preuves
- Tests : naissance des relances (47 h / 48 h, une par acquéreur, 2e relance à 5 jours, lien expiré) ;
  ajustements (seuil 2, prix moyen arrondi, « Autre » ignoré).
- e2e : la relance des Lambert se fait sur place ; l'ajustement des Keller s'applique et change leurs
  correspondances.
