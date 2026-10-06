// Routes that never require authentication. /design-preview is the design-review
// harness: it renders ONLY fictional demo data and self-gates with notFound() in
// production (see src/app/design-preview/page.tsx), so letting the middleware
// pass it through exposes nothing.
//
// Mission 60 — /auth/confirm est le point d'entrée PUBLIC du lien d'invitation : il vérifie le
// jeton et ÉTABLIT la session. S'il était gardé, l'invité (pas encore authentifié) serait renvoyé
// vers /login avant d'avoir pu valider son lien. /accept-invitation, lui, est déjà authentifié.
//
// Mission 73 — /confidentialite est la page de confidentialité que le Chrome Web Store exige :
// elle se lit sans compte. Liste d'autorisation, chemins exacts : rien d'autre ne s'ouvre.
const PUBLIC_PATHS = ['/login', '/design-preview', '/auth/confirm', '/confidentialite'];

// /design-preview et ses sous-pages (ex. /design-preview/app) : harnais de
// revue design auto-gardé en production (notFound sans ACM_DESIGN_PREVIEW=1).
export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.includes(pathname) || pathname.startsWith('/design-preview/');
}
