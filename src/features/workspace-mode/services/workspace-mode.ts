import type { WorkspaceMode } from '@/features/workspace-mode/types';

export type NavItem = { href: string; label: string; hint: string };

// Mode Vendeur : le menu d'aujourd'hui, à l'identique.
const SELLER_NAV: NavItem[] = [
  { href: '/builder', label: 'Préparation', hint: 'Dossiers vendeurs' },
  { href: '/live', label: 'Live', hint: 'Rendez-vous vendeur' },
  { href: '/suivi', label: 'Suivi', hint: 'Après le rendez-vous' },
  { href: '/prospection', label: 'Prospection', hint: 'Concurrents à démarcher' },
];

// Mode Acquéreur : les fiches (M117), les visites (M119), la même Prospection. Mission 130 B —
// « Biens idéaux » quitte le menu : c'était la même liste que « Acquéreurs ».
const BUYER_NAV: NavItem[] = [
  { href: '/acquereurs', label: 'Acquéreurs', hint: 'Ce que chacun cherche' },
  { href: '/visites', label: 'Visites', hint: 'À planifier, faites, retours' },
  { href: '/prospection', label: 'Prospection', hint: 'Propriétaires et confrères' },
];

// Mission 125 — le menu de gauche ne montre que le travail : les quatre espaces du mode. Tout le
// reste passe derrière la carte du conseiller, en bas (décision de Jean-Guy, 25/10) : Mon profil,
// Administration, Aide (« Bienvenue », M97), Ma démo pour l'agence de démonstration seulement (M114),
// Erreurs pour un opérateur seulement (M100). Les adresses ne changent pas ; aucun droit ne change :
// chaque page se garde seule. Sombre / Clair et Déconnexion, des gestes, sont ajoutés par la carte.
export type AccountLink = { href: string; label: string };

export function accountMenuFor({
  demo,
  operator,
}: {
  demo: boolean;
  operator: boolean;
}): AccountLink[] {
  return [
    { href: '/profil', label: 'Mon profil' },
    { href: '/admin', label: 'Administration' },
    { href: '/bienvenue', label: 'Aide' },
    ...(demo ? [{ href: '/ma-demo', label: 'Ma démo' }] : []),
    ...(operator ? [{ href: '/erreurs', label: 'Erreurs' }] : []),
  ];
}

export function navForMode(mode: WorkspaceMode): NavItem[] {
  return mode === 'buyer' ? BUYER_NAV : SELLER_NAV;
}

// La page qu'ouvre l'interrupteur : la première du mode.
export function homeForMode(mode: WorkspaceMode): string {
  return navForMode(mode)[0]!.href;
}

const under = (pathname: string, href: string): boolean =>
  pathname === href || pathname.startsWith(`${href}/`);

// Le mode d'une adresse : une page propre à un mode le désigne ; une page commune (Prospection, et
// celles du menu de la carte : profil, Administration, Aide…) ne désigne rien.
export function modeForPath(pathname: string): WorkspaceMode | null {
  for (const mode of ['buyer', 'seller'] as const) {
    for (const item of navForMode(mode)) {
      if (item.href === '/prospection') continue;
      if (under(pathname, item.href)) return mode;
    }
  }
  return null;
}

// Le mode affiché : celui de la page quand elle en a un (un lien envoyé par un collègue fonctionne,
// l'interrupteur se place sur le mode de la page), sinon le mode mémorisé.
export function effectiveMode(stored: WorkspaceMode, pathname: string): WorkspaceMode {
  return modeForPath(pathname) ?? stored;
}
