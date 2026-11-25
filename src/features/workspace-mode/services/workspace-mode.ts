// La refonte, lot A (mission de Jean-Guy, 25/11 au soir ; maquettes REFONTE-1 à 8) — un menu de
// quatre entrées, le même aux trois tailles : Aujourd'hui · Vendeurs · Acquéreurs · Visites. En bas
// sur téléphone ; en icônes sur tablette, avec Aide ; complet sur ordinateur, avec Prospection et
// Aide (remplace M145 B, les trois groupes « Vendeurs / Acquéreurs / Les deux », et M149, leurs
// titres). Les adresses ne changent pas.
export type NavIcon = 'today' | 'sellers' | 'buyers' | 'visits' | 'prospecting' | 'help';

// La plus petite taille où l'entrée est au menu : le téléphone (toujours), la tablette (à partir de
// 768 px) ou l'ordinateur (à partir de 1280 px). Ailleurs, elle est dans la feuille du compte.
export type NavFrom = 'phone' | 'tablet' | 'desktop';

export type NavItem = {
  href: string;
  label: string;
  icon: NavIcon;
  from: NavFrom;
  // Les espaces que l'entrée surligne : « Vendeurs » tient Préparation, Live et Suivi.
  spaces: string[];
  // Rangée en bas du menu (tablette et ordinateur).
  pinned?: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  {
    href: '/aujourdhui',
    label: 'Aujourd’hui',
    icon: 'today',
    from: 'phone',
    spaces: ['/aujourdhui'],
  },
  {
    href: '/builder',
    label: 'Vendeurs',
    icon: 'sellers',
    from: 'phone',
    spaces: ['/builder', '/live', '/suivi'],
  },
  {
    href: '/acquereurs',
    label: 'Acquéreurs',
    icon: 'buyers',
    from: 'phone',
    spaces: ['/acquereurs'],
  },
  { href: '/visites', label: 'Visites', icon: 'visits', from: 'phone', spaces: ['/visites'] },
  {
    href: '/prospection',
    label: 'Prospection',
    icon: 'prospecting',
    from: 'desktop',
    spaces: ['/prospection'],
  },
  {
    href: '/bienvenue',
    label: 'Aide',
    icon: 'help',
    from: 'tablet',
    spaces: ['/bienvenue'],
    pinned: true,
  },
];

export function isNavItemActive(item: NavItem, pathname: string): boolean {
  return item.spaces.some((space) => pathname === space || pathname.startsWith(`${space}/`));
}

// « Vendeurs » n'a qu'une entrée au menu : ses trois espaces (CLAUDE.md) restent des pages, et se
// rejoignent par ces onglets, en tête de chacune de leurs listes.
export type SellerTab = { href: '/builder' | '/live' | '/suivi'; label: string };

export const SELLER_TABS: SellerTab[] = [
  { href: '/builder', label: 'Préparation' },
  { href: '/live', label: 'Live' },
  { href: '/suivi', label: 'Suivi' },
];

// Mission 125 — tout ce qui n'est pas le travail passe derrière le compte du conseiller (décision de
// Jean-Guy, 25/10) : Mon profil, Administration, Ma démo pour l'agence de démonstration seulement
// (M114), Erreurs pour un opérateur seulement (M100). La refonte y range aussi ce que le menu ne
// montre pas à cette taille : Prospection sous 1280 px, Aide sous 768 px (`until`). Les adresses ne
// changent pas ; aucun droit ne change : chaque page se garde seule. Sombre / Clair et Déconnexion,
// des gestes, sont ajoutés par la feuille.
export type AccountLink = { href: string; label: string; until?: 'tablet' | 'desktop' };

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
    { href: '/prospection', label: 'Prospection', until: 'desktop' },
    { href: '/bienvenue', label: 'Aide', until: 'tablet' },
    ...(demo ? [{ href: '/ma-demo', label: 'Ma démo' }] : []),
    ...(operator ? [{ href: '/erreurs', label: 'Erreurs' }] : []),
  ];
}
