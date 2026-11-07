export type NavItem = { href: string; label: string; hint: string };
export type NavGroup = { label: string | null; items: NavItem[] };

// Mission 145 (partie B) — un seul menu, en trois groupes, au lieu de l'interrupteur Vendeur |
// Acquéreur (remplace M118, décision de Jean-Guy, 07/11) : « Aujourd'hui » en tête, puis Vendeurs,
// Acquéreurs, et Prospection une seule fois, sous « Les deux ». Rien ne change de mode tout seul :
// il n'y a plus de mode. Les adresses ne changent pas ; `profiles.workspace_mode` n'est plus lu.
export const NAV_GROUPS: NavGroup[] = [
  {
    label: null,
    items: [{ href: '/aujourdhui', label: 'Aujourd’hui', hint: 'Ce qu’il y a à faire' }],
  },
  {
    label: 'Vendeurs',
    items: [
      { href: '/builder', label: 'Préparation', hint: 'Dossiers vendeurs' },
      { href: '/live', label: 'Live', hint: 'Rendez-vous vendeur' },
      { href: '/suivi', label: 'Suivi', hint: 'Après le rendez-vous' },
    ],
  },
  {
    label: 'Acquéreurs',
    items: [
      { href: '/acquereurs', label: 'Acquéreurs', hint: 'Ce que chacun cherche' },
      { href: '/visites', label: 'Visites', hint: 'À planifier, faites, retours' },
    ],
  },
  {
    label: 'Les deux',
    items: [{ href: '/prospection', label: 'Prospection', hint: 'Courriers et passages' }],
  },
];

export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((group) => group.items);

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
