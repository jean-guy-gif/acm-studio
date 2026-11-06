// Les chemins qui s'ouvrent sans connexion. Liste d'autorisation, chemins EXACTS : rien d'autre
// ne s'ouvre, et aucun préfixe (mission 91 : le harnais /design-preview a été supprimé).
//
// Mission 60 — /auth/confirm est le point d'entrée PUBLIC du lien d'invitation : il vérifie le
// jeton et ÉTABLIT la session. S'il était gardé, l'invité (pas encore authentifié) serait renvoyé
// vers /login avant d'avoir pu valider son lien. /accept-invitation, lui, est déjà authentifié.
//
// Mission 73 — /confidentialite est la page de confidentialité que le Chrome Web Store exige :
// elle se lit sans compte. Liste d'autorisation, chemins exacts : rien d'autre ne s'ouvre.
//
// Mission 88 — /mot-de-passe-oublie se demande sans être connecté, par définition. La page
// « Choisir un nouveau mot de passe », elle, exige la session ouverte par le lien reçu.
//
// Mission 100 — /api/version ne dit que le commit déployé : `npm run verifier:production`
// l'interroge sans compte.
const PUBLIC_PATHS = [
  '/login',
  '/auth/confirm',
  '/confidentialite',
  '/mot-de-passe-oublie',
  '/api/version',
  // Mission 105 — la tâche planifiée de la nuit : elle n'a pas de session, son jeton (CRON_SECRET)
  // est vérifié par la route elle-même.
  '/api/cron/verifier-oppositions',
  // Mission 136 — la veille des acquéreurs, la nuit : pas de session non plus, le même jeton.
  '/api/cron/veille-acquereurs',
];

// Mission 110 — la synthèse laissée au vendeur, ouverte par son lien sans compte : un chemin de la
// forme EXACTE « /synthese/ » suivi d'un jeton de 43 caractères ; la page vérifie le jeton.
const PUBLIC_SYNTHESIS = /^\/synthese\/[A-Za-z0-9_-]{43}$/;

// Mission 119 — le dossier acquéreur, ouvert par son lien sans compte, de la même forme exacte :
// « /dossier/ » suivi d'un jeton de 43 caractères ; la page vérifie le jeton.
const PUBLIC_BUYER_DOSSIER = /^\/dossier\/[A-Za-z0-9_-]{43}$/;

// Mission 127 — le Point marché remis au vendeur, ouvert par son lien sans compte, de la même
// forme exacte : « /point-marche/ » suivi d'un jeton de 43 caractères ; la page vérifie le jeton.
const PUBLIC_MARKET_UPDATE = /^\/point-marche\/[A-Za-z0-9_-]{43}$/;

// Mission 131 — l'Étude de marché remise au vendeur, ouverte par son lien sans compte, de la même
// forme exacte : « /etude-de-marche/ » suivi d'un jeton de 43 caractères ; la page vérifie le jeton.
const PUBLIC_MARKET_STUDY = /^\/etude-de-marche\/[A-Za-z0-9_-]{43}$/;

// Mission 137 — le bon de visite signé envoyé au visiteur, ouvert par son lien sans compte, de la
// même forme exacte : « /bon-de-visite/ » suivi d'un jeton de 43 caractères ; la page le vérifie.
const PUBLIC_VISIT_VOUCHER = /^\/bon-de-visite\/[A-Za-z0-9_-]{43}$/;

// Mission 137 B — l'offre d'achat signée, par ses liens (la copie des offrants, celui du vendeur qui
// l'accepte ou la refuse), de la même forme exacte ; la page vérifie le jeton.
const PUBLIC_PURCHASE_OFFER = /^\/offre\/[A-Za-z0-9_-]{43}$/;

export function isPublicPath(pathname: string): boolean {
  return (
    PUBLIC_PATHS.includes(pathname) ||
    PUBLIC_SYNTHESIS.test(pathname) ||
    PUBLIC_BUYER_DOSSIER.test(pathname) ||
    PUBLIC_MARKET_UPDATE.test(pathname) ||
    PUBLIC_MARKET_STUDY.test(pathname) ||
    PUBLIC_VISIT_VOUCHER.test(pathname) ||
    PUBLIC_PURCHASE_OFFER.test(pathname)
  );
}
