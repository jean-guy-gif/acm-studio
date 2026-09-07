import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Le conseiller colle une page d'annonce entière. Mesuré sur les pages
      // réelles : 195 Ko à 995 Ko selon le portail, et l'encodage du formulaire
      // gonfle encore le corps de la requête. La limite d'usine est de 1 Mo :
      // au-delà, l'action est refusée AVANT d'atteindre notre code, et l'import
      // échouait sans message compréhensible.
      bodySizeLimit: '8mb',
    },
  },
  // pdfjs doit rester un vrai module Node chargé depuis node_modules à l'exécution.
  // Empaqueté dans le chunk serveur, require.resolve renvoie un identifiant de
  // module (un nombre) au lieu d'un chemin de fichier, et la résolution des données
  // (standard_fonts, cmaps) échoue en production (« path must be a string »).
  serverExternalPackages: ['pdfjs-dist'],
  // Externe ne suffit pas : les fichiers de données de pdfjs ne sont embarqués dans
  // la fonction serverless que s'ils sont tracés explicitement. On les trace pour la
  // route du bien vendeur, la seule qui lit un PDF (mission 42).
  // The key is a GLOB matched against page routes: "[projectId]" would be read as a
  // character class, so the dynamic segment is written as "*" to match it literally.
  outputFileTracingIncludes: {
    '/builder/*/property': [
      './node_modules/pdfjs-dist/standard_fonts/**',
      './node_modules/pdfjs-dist/cmaps/**',
    ],
  },
};

export default nextConfig;
