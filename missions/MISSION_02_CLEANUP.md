# MISSION 02 — Cleanup

Version : 1.0

Statut : Ready

Sprint : 0

Priorité : P0

---

# Objectif

Nettoyer le projet après l'initialisation Next.js.

Cette mission ne doit effectuer AUCUNE autre modification.

---

# Documents à lire

- CLAUDE.md
- DEVELOPMENT_RULES.md

---

# Travail demandé

Supprimer uniquement les fichiers inutiles générés automatiquement par Next.js :

public/file.svg

public/globe.svg

public/next.svg

public/vercel.svg

public/window.svg

Ne supprimer aucun autre fichier.

---

# Vérifications

Exécuter :

```bash
npm run lint
npm run build
```

Les deux commandes doivent réussir.

---

# Interdictions

Ne pas :

- modifier package.json
- installer une dépendance
- modifier README.md
- modifier CLAUDE.md
- modifier les fichiers docs
- modifier les routes
- modifier le code métier

---

# Commit attendu

```
chore: remove default nextjs assets
```

---

# Rapport attendu

Répondre uniquement avec :

- fichiers supprimés
- résultat du lint
- résultat du build
- commit réalisé
