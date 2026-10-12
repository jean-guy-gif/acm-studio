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
export function homeHref(ownDossierCount: number): string {
  return ownDossierCount === 0 ? '/bienvenue' : '/builder';
}
