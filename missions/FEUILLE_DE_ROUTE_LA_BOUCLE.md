# Feuille de route — La boucle

**Date** : 05/11/2026 · **Décidée par** : Jean-Guy.

ACM n'est pas deux outils côte à côte (vendeur, acquéreur) : c'est **une boucle d'intelligence
commerciale**. Chaque objet mène aux autres, en un clic, dans les deux sens :

```
        ┌──────────── Dossier vendeur / mandat ─────────────┐
        │  « 7 acquéreurs correspondent » (compteur, liste) │
        ▼                                                   │
   Acquéreurs  ──── biens de l'agence (mandats, vendeurs ───┘
        │           à relancer) et biens du marché
        │
        ▼
   Prospection (propriétaires, confrères) ── courrier « j'ai un acquéreur » ──► nouveau mandat ──┐
        ▲                                                                                        │
        └────────────── concurrents d'un mandat signé ◄──────────────────────────────────────────┘
```

Règles de la boucle :
- Un dossier vendeur montre ses acquéreurs correspondants ; un acquéreur montre ses biens (agence,
  marché) ; un bien du marché voulu par un acquéreur mène à la prospection ; un mandat rentré par la
  prospection redevient un dossier vendeur, qui rapproche à nouveau ses acquéreurs.
- La **Prospection** est dans les deux menus (vendeur et acquéreur), une seule liste filtrée par origine
  (M120 A).
- « À faire aujourd'hui » (M130) rassemble les tâches nées de la boucle.

## Décisions du 05/11
- **Le compteur compte les acquéreurs de toute l'agence.**
- **« Prêt à visiter »** = financement validé + acquéreur actif (un échange il y a moins de 30 jours) +
  budget compatible. **Pas de condition de délai d'achat.**
- Sous 5 acquéreurs prêts, aucun compteur ni bouton au Live.

## Les missions, dans l'ordre
| # | Mission | Statut |
|---|---|---|
| 131 | Présentation directe + PDF « Étude de marché » (le vendeur qui ne veut pas jouer) | écrite |
| 132 | La fiche en 30 secondes + « prêt à visiter » (financement, actif) | écrite |
| 133 | La boucle vendeur → acquéreurs : compteur caché au Live (≥ 5), « acquéreurs correspondants » sur le dossier vendeur et le mandat | à écrire |
| 134 | « Nouveau bien → n acquéreurs » dans À faire aujourd'hui, envoi groupé des liens personnalisés | à écrire |
| 135 | Les liens sans réponse à 48 h deviennent des relances ; les refus proposent d’affiner la recherche ; taux fiches → visites | écrite |
| 136 | Veille automatique des « Prêts à visiter », plafond mensuel par agence | faite |
| 141 | Le dossier d’adresse (conseiller, prix d’estimation) | écrite |
| 142 | Vivre ici (acquéreur, bien retenu pour visiter) | écrite |
