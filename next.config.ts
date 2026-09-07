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
  // pdfjs charge ses polices de base et ses cmaps depuis des fichiers du paquet.
  // Ils ne sont pas embarqués dans la fonction serverless à moins d'être tracés
  // explicitement : sans cela l'import PDF (action serveur de la fiche vendeur)
  // échoue en production alors qu'il passe en local. On les trace pour la route
  // du bien vendeur, la seule qui lit un PDF (mission 42).
  outputFileTracingIncludes: {
    '/builder/[projectId]/property': [
      './node_modules/pdfjs-dist/standard_fonts/**',
      './node_modules/pdfjs-dist/cmaps/**',
    ],
  },
};

export default nextConfig;
