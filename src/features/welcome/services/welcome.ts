// Mission 97 — l'écran « Bienvenue » : ce qu'il faut, et les quatre étapes. Pur.

// Les 4 étapes, une ligne chacune.
export const WELCOME_STEPS: readonly { title: string; line: string }[] = [
  {
    title: 'Le bien du vendeur',
    line: 'Importez l’annonce ou la fiche du bien, relisez, puis donnez votre fourchette de prix.',
  },
  {
    title: 'Les concurrents',
    line: 'Cherchez les biens en vente qui lui ressemblent et retenez-en au moins trois.',
  },
  {
    title: 'Avant le rendez-vous',
    line: 'Relisez le marché, enregistrez votre décision de prix et voyez ce que verra le vendeur.',
  },
  {
    title: 'Le Live et le suivi',
    line: 'Menez le rendez-vous face au vendeur, puis notez son issue et relancez.',
  },
];

// Chrome, d'après ce que le navigateur dit de lui-même. Edge et Opera se présentent aussi comme
// « Chrome » : ils sont écartés par leur propre marque.
export function isChromeBrowser(userAgent: string): boolean {
  return /\bChrome\/\d+/.test(userAgent) && !/\b(Edg|OPR|SamsungBrowser)\//.test(userAgent);
}

// Où mène l'entrée de l'application : « Bienvenue » tant que le conseiller n'a aucun dossier.
// Mission 110 — jamais en mode expert : ses dossiers (« Aide » reste au menu).
export function homeHref(ownDossierCount: number, expert = false): string {
  return ownDossierCount === 0 && !expert ? '/bienvenue' : '/builder';
}

// Mission 106 — la page du Localisateur Academia sur le Chrome Web Store : c'est la version
// distribuée aux conseillers, pont vers ACM compris (jamais le build propre à ACM). Une adresse
// publique de page ; l'identifiant qui sert à lui parler reste lu dans l'environnement (M75).
export const LOCALISATEUR_STORE_URL =
  'https://chromewebstore.google.com/detail/fpnimjhhiagpfjodphjddobegnelckeg';

// La ligne se coche dès qu'un Localisateur répond, partage allumé ou non.
export function locatorInstalled(
  availability: 'ready' | 'sharing_off' | 'unavailable' | null,
): boolean {
  return availability === 'ready' || availability === 'sharing_off';
}
