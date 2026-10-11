// Les polices EMBARQUÉES : leurs fichiers sont DANS le dépôt, une feuille par famille, et chaque
// feuille définit sa variable `--font-*` sur `:root`.
//
// Mission 57 §5 — aucune requête vers un service extérieur pendant le Live, et la question de
// licence est réglée d'avance (SIL Open Font License, OFL.txt dans chaque dossier). Le
// navigateur ne télécharge un fichier que lorsqu'un texte rendu en a besoin (unicode-range) :
// embarquer sept familles ne coûte rien au vendeur, seule la police active de l'agence part.
//
// Mission 90 (Inter), puis mission 95 (les six autres) — plus AUCUNE police n'est téléchargée
// à la compilation : le chargeur de polices Google de Next allait les chercher à chaque build, et ce
// téléchargement a fait échouer plusieurs déploiements. Un test l'interdit désormais.
// Pour ajouter une famille : scripts/embed-google-fonts.mjs, puis une ligne ici et dans
// font-registry.ts (les noms de variables doivent rester alignés avec `cssVar`).

// Défaut produit Start Academy : Montserrat (corps/interface) + Rajdhani (titres).
import './montserrat/montserrat.css';
import './rajdhani/rajdhani.css';
// Les cinq autres de la liste proposée à l'agence (Montserrat y figure aussi).
import './inter/inter.css';
import './poppins/poppins.css';
import './source-sans/source-sans.css';
import './work-sans/work-sans.css';
import './nunito-sans/nunito-sans.css';
