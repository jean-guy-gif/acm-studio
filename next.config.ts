import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Mission 114 — les photos de démonstration sont lues sur le disque par l'action qui dépose les
  // photos du bien vendeur (page de la fiche) : elles voyagent avec cette route.
  outputFileTracingIncludes: {
    '/builder/[projectId]/property': ['./public/demo/photos/**/*'],
  },
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
  // Mission 110 — la synthèse laissée au vendeur n'est jamais indexée ni gardée en cache partagé.
  async headers() {
    return [
      {
        source: '/synthese/:token',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' },
          { key: 'Referrer-Policy', value: 'no-referrer' },
          { key: 'Cache-Control', value: 'private, no-store' },
        ],
      },
      // Mission 119 — le dossier acquéreur, par son lien : mêmes règles.
      {
        source: '/dossier/:token',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' },
          { key: 'Referrer-Policy', value: 'no-referrer' },
          { key: 'Cache-Control', value: 'private, no-store' },
        ],
      },
    ];
  },
  // Mission 43 : pdfjs tourne désormais dans le navigateur du conseiller. Plus rien
  // à externaliser ni à tracer côté serveur — la config redevient lisible.
};

export default nextConfig;
