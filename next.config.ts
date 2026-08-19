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
};

export default nextConfig;
