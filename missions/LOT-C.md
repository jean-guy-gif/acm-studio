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
