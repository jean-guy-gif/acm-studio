# MISSION 92 — Une méthode infalsifiable et une fin de Live irréprochable

**Date** : 11/10/2026 · **Origine** : audit n°2 du 11/10/2026 (doc « Audit ACM Studio n°2 — après
corrections »), décisions 1 et 2, validées par Laurent : « valider ».

## Objectif

1. Ce que le vendeur a répondu pendant le Live ne peut plus être corrigé après coup, et les chiffres
   de la bêta restent vrais.
2. Le vendeur ne voit jamais un écran réservé au conseiller, ni le nom d'un autre client.
3. Le Live perd ses écrans inutiles.

## Constats de l'audit (code de `main` au 11/10 au soir)

- « Précédent » après la révélation rouvre « À quel prix ? » avec la devinette modifiable. La
  nouvelle valeur écrase l'ancienne en base (`write-live-comparable-response.ts:90-114`), sans aucun
  verrou. Même chose pour la durée devinée et pour la valeur perçue.
- « Recommencer depuis le début » (`live-launch-actions.tsx:87-89`) n'est qu'un lien vers le premier
  écran : les réponses restent en base, les prix déjà révélés aussi. Un conseiller qui s'entraîne
  pollue définitivement les mesures de la bêta.
- « Terminer le rendez-vous » mène directement à `/builder/[id]/conclusion`
  (`live-comparative-shell.tsx:219`) : repères, menu, lien vers la préparation, alors que la
  tablette est encore tournée vers le vendeur.
- L'écran « Sur quel prix partons-nous ? » dit au vendeur « le chiffre vient du vendeur »
  (`meeting-conclusion/components/live-commercialization-price.tsx:68-69`). Le test de vocabulaire ne
  lit que `live-seller/components` (`live-wording.test.ts`).
- « Quitter » ramène à la liste `/live`, qui affiche les noms des autres vendeurs de l'agence
  (`(protected)/live/page.tsx:59`).
- Un enregistrement en arrière-plan qui a échoué bloque le passage à la conclusion **sans message**
  (`live-comparative-shell.tsx`, autour de la garde de `pendingBeforeAnalysis`).
- Quand un concurrent n'a ni durée ni historique de prix, le vendeur doit quand même deviner une
  durée, puis lit « Non disponible ».

## Critères d'acceptation

### A. Les réponses du vendeur sont figées

1. La première valeur non vide de chacune de ces réponses ne peut plus être remplacée, ni par
   l'écran, ni par un appel direct à la base :
   - la devinette de prix d'un concurrent ;
   - la devinette de durée d'un concurrent ;
   - la valeur perçue en début de Live.

   Le verrou est en base, sur le modèle de la première note de 1 à 10 (M85).
2. En revenant en arrière, le vendeur voit sa réponse en lecture seule : « Votre réponse :
   320 000 € ». « Valider et continuer » avance sans rien réécrire.
3. Les autres réponses (sérieux concurrent, motifs, commentaires, concurrent le plus dangereux,
   prix de commercialisation) restent modifiables, comme aujourd'hui.
4. Faute de frappe sur la valeur perçue : avant d'enregistrer, l'écran affiche le montant formaté en
   grand (« 350 000 € ? ») pour que le conseiller le vérifie. Une seule confirmation, pas de pop-up
   du navigateur.

### B. « Recommencer »

5. Le lien « Recommencer depuis le début » disparaît pour la bêta. Seul « Reprendre (écran N sur
   M) » reste. Pour s'entraîner, le conseiller utilise un dossier d'entraînement : le dire dans le
   compte rendu, pour l'aide aux conseillers.

### C. La fin du Live

6. « Terminer le rendez-vous » ouvre un écran neutre, sur le fond du Live, aux couleurs de l'agence :
   - logo ;
   - « Merci pour cet échange » ;
   - le prénom du conseiller.

   Aucun chiffre, aucun menu. En bas, un bouton discret « Accès conseiller » mène à la conclusion.
7. « Quitter » (après sa confirmation actuelle) ouvre le même type d'écran neutre, « Rendez-vous en
   pause », avec « Reprendre » et « Accès conseiller ». Jamais la liste des autres clients.
8. « Le chiffre vient du vendeur » devient « Le prix que nous retenons ensemble. Rien n'est
   pré-rempli. ». Le test de vocabulaire couvre aussi les composants de `meeting-conclusion` affichés
   dans le Live.
9. Si un enregistrement en arrière-plan a échoué, le passage à la conclusion affiche un message :
   « Une réponse n'a pas pu être enregistrée — touchez Réessayer ». Jamais un bouton qui ne fait rien.

### D. Moins d'écrans inutiles

10. Quand un concurrent n'a ni durée connue ni historique de prix, l'étape « Durée » est sautée
    pour lui. L'information « la durée est connue » est un simple oui/non : on ne livre aucune
    donnée avant la devinette.
11. Sur « Avant le rendez-vous », au-delà de 6 concurrents retenus, un avertissement côté conseiller
    : « 7 concurrents : environ 60 minutes de Live. Nous conseillons 6 au plus. » Rien n'est bloqué.

### E. Preuves

12. Migration soumise avant d'être appliquée, comptages avant et après.
13. Test SQL en CI : réécrire une devinette ou une valeur perçue déjà enregistrée est refusé, et la
    première écriture passe.
14. E2E :
    - après la révélation, « Précédent » montre la devinette en lecture seule ;
    - « Terminer » mène à l'écran « Merci », puis « Accès conseiller » à la conclusion ;
    - « Quitter » ne montre aucun nom de client.
15. `npm run e2e` vert, tablette comprise. Le contrôle serveur « jamais le prix avant la devinette »
    ne bouge pas.

## Décisions à respecter

- M51, M81, M82 (valeur perçue en début de Live), M85, M89 (confirmation de « Quitter », reprise,
  2e personne), M91.
- « Prix des concurrents » reste calculé et modifiable (décision de Laurent).

## Hors périmètre

- Rythme en 2 écrans par concurrent, reformulation du prix par le vendeur avant l'analyse : après
  les premiers rendez-vous réels.

## Essai sur l'URL d'essai

1. Lancer un Live, deviner 300 000 € sur le 1er concurrent, voir le prix, revenir en arrière : la
   devinette est en lecture seule.
2. Sur la valeur perçue, taper 35000 : l'écran affiche « 35 000 € ? » avant d'enregistrer.
3. « Quitter » : la confirmation, puis « Rendez-vous en pause », sans aucun nom de client.
   « Reprendre » relance le Live au bon écran.
4. Aller jusqu'au bout et toucher « Terminer » : l'écran « Merci » s'affiche, puis « Accès
   conseiller » ouvre la conclusion.
5. Un concurrent sans durée ni historique : pas d'écran Durée pour lui.
6. Sur `/live`, plus de « Recommencer depuis le début ».
