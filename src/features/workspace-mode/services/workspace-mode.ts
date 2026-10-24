import type { WorkspaceMode } from '@/features/workspace-mode/types';

export type NavItem = { href: string; label: string; hint: string };

// Mode Vendeur : le menu d'aujourd'hui, à l'identique.
const SELLER_NAV: NavItem[] = [
  { href: '/builder', label: 'Préparation', hint: 'Dossiers vendeurs' },
  { href: '/live', label: 'Live', hint: 'Rendez-vous vendeur' },
  { href: '/suivi', label: 'Suivi', hint: 'Après le rendez-vous' },
  { href: '/prospection', label: 'Prospection', hint: 'Concurrents à démarcher' },
];

// Mode Acquéreur : les fiches (M117), les biens idéaux (M118), les visites (M119), la même
// Prospection.
const BUYER_NAV: NavItem[] = [
  { href: '/acquereurs', label: 'Acquéreurs', hint: 'Ce que chacun cherche' },
  { href: '/biens-ideaux', label: 'Biens idéaux', hint: 'Ce qui leur correspond' },
  { href: '/visites', label: 'Visites', hint: 'Demandes et retours' },
  { href: '/prospection', label: 'Prospection', hint: 'Concurrents à démarcher' },
];

// Communs aux deux modes (Erreurs et Ma démo s'ajoutent selon le compte, dans le menu lui-même).
export const SHARED_NAV: NavItem[] = [
  { href: '/admin', label: 'Administration', hint: 'Agence et équipe' },
  // Mission 97 — « Bienvenue », où l'on revient quand on veut.
  { href: '/bienvenue', label: 'Aide', hint: 'Premiers pas' },
];

export function navForMode(mode: WorkspaceMode): NavItem[] {
  return mode === 'buyer' ? BUYER_NAV : SELLER_NAV;
}

// La page qu'ouvre l'interrupteur : la première du mode.
export function homeForMode(mode: WorkspaceMode): string {
  return navForMode(mode)[0]!.href;
}

const under = (pathname: string, href: string): boolean =>
  pathname === href || pathname.startsWith(`${href}/`);

// Le mode d'une adresse : une page propre à un mode le désigne ; une page commune (Prospection,
// Administration, Aide, profil…) ne désigne rien.
export function modeForPath(pathname: string): WorkspaceMode | null {
  const shared = new Set(SHARED_NAV.map((item) => item.href));
  for (const mode of ['buyer', 'seller'] as const) {
    for (const item of navForMode(mode)) {
      if (shared.has(item.href) || item.href === '/prospection') continue;
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
