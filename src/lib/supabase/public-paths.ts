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
const PUBLIC_PATHS = ['/login', '/auth/confirm', '/confidentialite', '/mot-de-passe-oublie'];

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.includes(pathname);
}
