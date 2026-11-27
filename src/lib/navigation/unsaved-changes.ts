// Mission 93 — ne rien perdre sans prévenir. Une page qui a des modifications non enregistrées
// demande confirmation avant d'être quittée : actualisation et fermeture de l'onglet (seul le
// navigateur peut alors poser la question), et liens de l'application (menu compris).

export const UNSAVED_CHANGES_MESSAGE =
  'Des modifications ne sont pas enregistrées. Quitter cette page\u202f?';

// Ce clic va-t-il faire quitter la page ? Pur, pour être testé sans navigateur.
// Ne quittent pas : un lien ouvert dans un nouvel onglet, un téléchargement, un clic modifié
// (Cmd/Ctrl/Maj/Alt, bouton du milieu), une ancre de la même page.
export function leavesPage(
  click: {
    button: number;
    metaKey: boolean;
    ctrlKey: boolean;
    shiftKey: boolean;
    altKey: boolean;
    defaultPrevented: boolean;
  },
  link: { href: string | null; target: string | null; download: boolean },
  current: string,
): boolean {
  if (click.defaultPrevented || click.button !== 0) {
    return false;
  }
  if (click.metaKey || click.ctrlKey || click.shiftKey || click.altKey) {
    return false;
  }
  if (
    !link.href ||
    link.download ||
    (link.target != null && link.target !== '_self' && link.target !== '')
  ) {
    return false;
  }
  let next: URL;
  let here: URL;
  try {
    here = new URL(current);
    next = new URL(link.href, here);
  } catch {
    return false;
  }
  if (next.protocol !== 'http:' && next.protocol !== 'https:') {
    return false;
  }
  // Même page, autre ancre : on ne la quitte pas.
  return !(
    next.origin === here.origin &&
    next.pathname === here.pathname &&
    next.search === here.search
  );
}
