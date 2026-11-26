# MISSION 96 — La relance qui rapporte

**Date** : 11/10/2026 · **Origine** : feuille de route « 8 sur 10 » (projet ACM), ordre 3, décidée
par Laurent. Pistes de l'audit n°2 : Suivi 6 → 8, aide à la prise de mandat 6 → 8.

Cette mission tourne **en parallèle de la fin de la mission 95**, à quatre conditions :
- elle travaille dans son propre `git worktree` (`../acm-studio-m96`) ;
- une seule mission à la fois sur l'essai ;
- une seule migration à la fois : la sienne attend le `/valide 95` ;
- elle repart ensuite de `main` à jour. **La migration doit être datée après celle de la 95**
  (`20261015090000`), par exemple `20261016090000`, sinon Supabase la refusera.

La 95 ajoute « Durée du Live » au Suivi et à la conclusion : ne pas y toucher, la reprendre au
rebase.

## Objectif

Après le rendez-vous, le conseiller relance avec les propres mots du vendeur, et aucun dossier « À
relancer » ne reste oublié.

## Constats

- Les réponses du vendeur sont en base et figées, mais dispersées. Le dossier conclu ne les présente
  nulle part ensemble :
  - valeur perçue (M82) ;
  - prix reformulé (M94) ;
  - devinettes et prix réels ;
  - concurrent le plus dangereux ;
  - note de 1 à 10 (M85).
- « À relancer » ne dit ni pourquoi, ni depuis quand. Un dossier peut dormir des semaines sans que
  rien ne le signale.
- Le conseiller rédige sa relance de mémoire.

## Critères d'acceptation

### A. « Ce que le vendeur a dit »

1. Sur un dossier conclu, côté conseiller (conclusion et fiche du Suivi), un bloc « Ce que le
   vendeur a dit ». Il affiche :
   - « Au début : 350 000 € → Après avoir vu le marché : 325 000 € → Prix retenu : 330 000 € » ;
   - ses devinettes face aux prix réels : « Il a sous-estimé 4 concurrents sur 6, de 6 % en
     moyenne » ;
   - le concurrent le plus dangereux qu'il a choisi, avec son prix ;
   - sa note de 1 à 10 et ce qui lui manquait, si la réponse existe ;
   - la durée du Live (M95).

   Une donnée absente ne s'affiche pas. Rien n'est jamais inventé ni recalculé à partir d'autre
   chose.
2. Jamais côté vendeur. Aucune adresse concurrente (`never-seller-side.test.ts`).

### B. Pourquoi relancer

3. Passer un dossier en « À relancer » demande un motif, à choisir parmi des boutons :
   - « Prix accepté, signature à venir » ;
   - « Réfléchit au prix » ;
   - « Veut en parler à un proche » ;
   - « Attend une autre estimation » ;
   - « Projet pas encore daté » ;
   - « Autre », avec une ligne de texte.
4. Le motif s'affiche sur la ligne du Suivi. Un filtre par motif est disponible.

### C. Rien ne dort

5. Chaque dossier « À relancer » a un bouton « Relancé aujourd'hui ». Il enregistre la date et une
   note facultative d'une ligne. L'historique des relances se lit sur la fiche : date, note, auteur.
6. Le Suivi affiche « Dernier contact il y a 12 jours ». La date de conclusion compte comme premier
   contact.
   - Au-delà de 7 jours sans contact, une pastille « À relancer aujourd'hui » apparaît.
   - Par défaut, la liste « À relancer » est triée du plus ancien contact au plus récent.
7. Un compteur en haut du Suivi : « 3 vendeurs à relancer aujourd'hui ».

### D. Le message de relance

8. Sur un dossier « À relancer », « Préparer un message » propose un texte court, prêt à copier,
   pour un SMS ou un e-mail :
   - signé du prénom du conseiller et du nom sur les documents (M87) ;
   - reprenant ce que le vendeur a dit lui-même, par exemple « Vous m'aviez dit qu'après avoir vu le
     marché, 325 000 € vous semblait cohérent » ;
   - adapté au motif choisi.

   Un bouton « Copier ». Rien n'est envoyé par l'outil.
9. Le ton reste factuel : aucune formule de pression, aucune urgence inventée (M85). Aucune adresse
   ni aucun prix de concurrent nommé.
10. Le conseiller peut modifier le texte avant de copier. Le texte modifié n'est pas enregistré.

### E. Preuves

11. Migration soumise avant d'être appliquée, avec comptages avant et après :
    - le motif de relance sur le dossier ;
    - l'historique des relances, avec cloisonnement par agence comme les autres tables (M88).
12. Tests :
    - le bloc n'affiche que des données existantes ;
    - le calcul « sous-estimé 4 sur 6, de 6 % » est juste ;
    - le motif est obligatoire pour « À relancer » ;
    - le délai et la pastille à 7 jours ;
    - le tri ;
    - le message ne contient aucune adresse ni aucun prix de concurrent ;
    - un test SQL vérifie qu'une agence ne lit pas les relances d'une autre.
13. `npm run e2e` vert, tablette comprise.

## Décisions à respecter

- M85 (pas de pression), M86 (Suivi en lignes), M87 (nom sur les documents), M88 (droits), M90
  (`mandate_type`, `signed_at`, `concluded_at` figé), M92 et M94 (réponses figées), M95 (durée du
  Live).
- Vocabulaire : « Concurrent », jamais « comparable » à l'écran.

## Hors périmètre

- Envoi de SMS ou d'e-mails par l'outil, rappels automatiques par e-mail.
- Calendrier.

## Essai sur l'URL d'essai

1. Ouvrir un dossier conclu : le bloc « Ce que le vendeur a dit » montre :
   - le chemin des prix ;
   - les devinettes ;
   - le concurrent le plus dangereux ;
   - la note ;
   - la durée.
2. Passer un dossier en « À relancer » : le motif est demandé. Choisir « Réfléchit au prix ».
3. Dans le Suivi, « Dernier contact il y a N jours », le tri du plus ancien au plus récent, le
   filtre par motif.
4. « Relancé aujourd'hui » avec une note : le délai revient à 0, et l'historique montre la note.
5. « Préparer un message » : le texte reprend le prix dit par le vendeur. Le modifier, puis le
   copier.
