# ACM Studio

# Meeting State Machine

Version : 1.0

Statut : Fondation

Priorité : Critique

---

# Pourquoi

Le rendez-vous vendeur est un processus.

Un processus est une succession d'états.

Chaque état possède :

• un objectif

• une interface

• des actions

• des transitions

Le moteur Live ne pilote jamais des slides.

Il pilote des états.

---

# State 01

WELCOME

Objectif

Créer la relation.

Transition

↓

PROPERTY_DISCOVERY

---

# State 02

PROPERTY_DISCOVERY

Le vendeur découvre son bien.

Validation

↓

PROPERTY_CONFIRMED

---

# State 03

PROPERTY_CONFIRMED

↓

COMPETITOR_01

---

# State 04

COMPETITOR

Le moteur charge automatiquement

Concurrent 1

Concurrent 2

Concurrent 3

...

Chaque concurrent est une sous-machine.

---

COMPETITOR

↓

DISCOVER

↓

ASK_PRICE

↓

REVEAL_PRICE

↓

REVEAL_MARKET_TIME

↓

DISCUSSION

↓

NEXT_COMPETITOR

---

Lorsque tous les concurrents sont terminés

↓

MARKET_PERCEPTION

---

# State

MARKET_PERCEPTION

Le logiciel pose :

Quel concurrent est le plus dangereux ?

↓

Réponse

↓

Pourquoi ?

↓

Réponse

↓

Question suivante

---

Fin

↓

MARKET_ANALYSIS

---

# State

MARKET_ANALYSIS

Affichage

Prix moyen

Prix médian

Graphiques

Lecture

↓

Positionnement

---

# State

SELLER_POSITION

Question

Selon vous

Quel serait aujourd'hui

le bon prix ?

↓

Réponse

↓

Enregistrement

↓

ADVISOR_EXPERTISE

---

# State

ADVISOR_EXPERTISE

Le conseiller présente

Son expertise.

↓

MANDATE

---

# State

MANDATE

Présentation

Signature

↓

REPORT

---

# State

REPORT

Compte rendu.

IPC.

Archivage.

Fin.
