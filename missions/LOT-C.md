# Lot C — La vie du mandat côté vendeur

Niveau Sensible : une migration, ce que voit le conseiller dans le dossier, le Suivi et
« Aujourd'hui ». La demande de Jean-Guy est dans `missions/APRES_LIVRAISON.md` (section « LOT C »),
avec la question 5 du 27/11 et ses réponses du 28/11. Branche `lot-c-vie-du-mandat`, partie du
lot B (la fiche acquéreur et l'offre qu'il change), qui part en production avant elle.

## La maquette (C0)

`missions/maquettes/lot-c/C0-vie-du-mandat.png` (et `.html`, et son générateur) : la fiche du
dossier à l'offre acceptée et ses trois autres états, les saisies, le Suivi et ses deux onglets, les
tâches d'« Aujourd'hui », aux trois tailles, avec les captures d'avant de l'essai (28/11).

Validée par Jean-Guy le 28/11, avec les cinq choix par défaut :

1. « Son mandat » vient avant « Son dossier ».
2. La carte du Suivi garde sa frise d'aujourd'hui tant qu'aucune offre n'est acceptée, puis suit la
   vente (Mandat signé → Offre acceptée → Compromis → Vente).
3. « Mandat terminé sans vente » rejoint « Vendus ailleurs · retirés · terminés ».
4. « Préparer l'acte » disparaît quand la vente est notée, sans bouton « Fait » ; l'acte passé sans
   vente notée, la tâche devient « Noter la vente ».
5. Une vente notée pour un acquéreur de l'agence propose « A acheté » sur sa fiche, sans le changer
   d'office.

Et quatre retouches, reportées dans la planche :

1. « Le prix » de « Son dossier » contredisait le prix du mandat à la signature. Une fois le
   rendez-vous conclu, la carte s'appelle « Prix proposé au rendez-vous » (le même montant : le prix
   décidé avant le rendez-vous). Fait le 28/11 (`overview-steps.ts`, le test d'abord ; la spec
   `vendeurs-a-faire` lit le nouveau titre).
2. « Aujourd'hui » sur téléphone : le bouton d'une tâche toujours sous son texte. C'est déjà le cas
   dans le produit (la ligne passe en colonne sous 640 px, `today-task.tsx`) : seule la maquette le
   mettait à côté, elle est corrigée. Les nouvelles tâches prennent la même ligne.
3. Le Point marché s'arrête dès « Offre acceptée », plus au compromis, et reprend si l'offre tombe.
4. « Fin du mandat » : la case « Reconduction tacite » ; cochée, la tâche devient « Faire le point
   avant la reconduction », toujours 30 jours avant la date.

La migration se joue sur la base d'essai d'abord ; puis le point du chef, avant que Jean-Guy
l'applique à la production.

## Le plan de l'architecte (28/11, vers 18 h 20)

Une migration, `20261218090000_vie_du_mandat.sql` :

- sur `project_meeting_conclusions`, la fiche du mandat, neuf colonnes nulles écrites par le serveur
  seul : la fin du mandat et la reconduction tacite, le compromis et l'acte prévu, l'origine de
  l'acquéreur (de l'agence ou venu d'ailleurs) et sa fiche, l'acte et le prix de vente, la fin sans
  vente ;
- un déclencheur qui refuse un fait posé hors d'un mandat signé, ou un acquéreur d'une autre agence ;
- une table neuve, `mandate_price_amendments`, pour les avenants de baisse, qui ne se modifient pas ;
  lue par l'agence, écrite par le serveur seul.

L'étape se calcule dans un service pur (jamais dans `projects.status`) : vente notée → « Vendu par
l'agence » ; fin notée → « Mandat terminé » ; compromis noté → « Sous compromis » ; offre acceptée
encore tenue → « Offre acceptée » ; sinon « Mandat signé ». L'offre qui tombe fait revenir l'étape
d'avant, sans rien écrire. Une lecture en échec ne fait naître aucune tâche.

Neuf morceaux d'une heure et demie (environ 13 h 30) : C1 la base ; C2 le cœur pur et la lecture ;
C3 la fiche du dossier ; C4 le côté acquéreur (et `bought` au lieu de `purchased`) ; C5 le Suivi et
le Point marché ; C6 « Aujourd'hui » et le tableau du manager ; C6 bis le prix après avenant partout
(question 15) ; C7 la démo, les specs, le relecteur, les captures (deux fois).

## Les questions du lot C (architecte, 28/11), chacune avec sa réponse par défaut

14. La démo : M. Lefebvre reste l'exemple « Offre acceptée » ; le Point marché dû passe sur M. et Mme
    Castel (Valbonne), signé il y a un mois calendaire ; les autres étapes sur des mandats sans
    parcours acquéreur.
15. L'avenant change le prix du mandat partout où il se lit aujourd'hui (la boucle, « Proposer ce
    bien », le rapprochement, une sélection neuve, l'offre et le bon pré-remplis, la fiche complète,
    le courrier de prospection, le prochain Point marché), jamais dans ce qui est figé (synthèse,
    Étude, Live, conclusion, Points écrits, sélections et offres signées). Par défaut : oui (C6 bis).
16. « Noter le compromis » n'entre pas dans « Aujourd'hui » : c'est la prochaine étape du dossier et
    de la carte du Suivi.
17. L'acquéreur du compromis : celui de l'offre acceptée, un acquéreur de l'agence qui a visité le
    bien (offre faite hors d'ACM), ou un acquéreur venu d'ailleurs ; sa fiche voit le compromis et la
    vente, sans que son statut change d'office.
18. Le compromis qui tombe : « Le compromis est tombé » ramène l'étape d'avant, le Point marché
    reprend ; côté acquéreur, « L'offre est tombée » est refusé tant qu'un compromis est noté pour
    lui.
19. Le renouvellement : aucune tâche sous compromis ; la date passée, la tâche reste en retard
    jusqu'à ce que la date soit repoussée ou la fin notée ; rien ne se reconduit seul.
20. Le tableau du manager : l'écart sur le dernier prix du mandat, avenants compris ; le délai médian
    sur tous les compromis notés.
21. La confidentialité : une phrase préparée pour la juriste dès C1 ; la production du lot C attend
    son accord.
22. Un avenant mal saisi : « Retirer le dernier avenant », confirmé dans l'écran ; le serveur refuse
    un prix qui n'est pas sous le prix du mandat.

Le chef avance avec ces réponses ; Jean-Guy corrige après.
