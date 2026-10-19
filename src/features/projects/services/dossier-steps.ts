// Mission 97 — les étapes d'un dossier, en barre en haut de chacun de ses écrans, et « l'étape à
// faire » où mène un clic dans la liste. Pur. `MIN_READY_COMPARABLES` est rappelé ici en clair
// pour que ce module reste partageable avec le navigateur (project-readiness est côté serveur).
const MIN_COMPETITORS = 3;

export type DossierStepKey = 'overview' | 'property' | 'competitors' | 'before' | 'live';

export type DossierStep = { key: DossierStepKey; label: string; href: string };

export function dossierSteps(projectId: string): DossierStep[] {
  const base = `/builder/${projectId}`;
  return [
    { key: 'overview', label: 'Vue d’ensemble', href: base },
    { key: 'property', label: 'Bien vendeur', href: `${base}/property` },
    { key: 'competitors', label: 'Concurrents', href: `${base}/comparables` },
    { key: 'before', label: 'Avant le rendez-vous', href: `${base}/avant-rendez-vous` },
    // Mission 107 — par l'étape de lancement : le même contrôle que « Lancer le Live » (M104).
    { key: 'live', label: 'Live', href: launchLiveHref(projectId) },
  ];
}

// Mission 107 — l'étape qui ouvre le Live d'un dossier : le contrôle « devant le vendeur » d'abord.
export function launchLiveHref(projectId: string): string {
  return `/builder/${projectId}/lancer-le-live`;
}

// L'onglet de l'écran affiché ; null sur un écran qui n'est aucune étape (conclusion).
export function activeDossierStep(pathname: string, projectId: string): DossierStepKey | null {
  const base = `/builder/${projectId}`;
  if (pathname === base) {
    return 'overview';
  }
  if (pathname.startsWith(`${base}/property`)) {
    return 'property';
  }
  if (pathname.startsWith(`${base}/comparables`)) {
    return 'competitors';
  }
  if (pathname.startsWith(`${base}/lancer-le-live`)) {
    return 'live';
  }
  if (
    pathname.startsWith(`${base}/avant-rendez-vous`) ||
    pathname.startsWith(`${base}/presentation`)
  ) {
    return 'before';
  }
  return null;
}

// L'étape à faire : la première qui manque, dans l'ordre de la préparation. Un dossier complet
// ouvre « Avant le rendez-vous » (la dernière relecture) ; un dossier conclu, sa vue d'ensemble.
export function nextDossierStep(input: {
  status: string;
  hasProperty: boolean;
  exploitableCount: number;
}): DossierStepKey {
  if (input.status === 'meeting_completed') {
    return 'overview';
  }
  if (!input.hasProperty) {
    return 'property';
  }
  if (input.exploitableCount < MIN_COMPETITORS) {
    return 'competitors';
  }
  return 'before';
}

export function nextDossierStepHref(
  projectId: string,
  input: Parameters<typeof nextDossierStep>[0],
): string {
  const key = nextDossierStep(input);
  return dossierSteps(projectId).find((step) => step.key === key)?.href ?? `/builder/${projectId}`;
}

// Mission 110 — « Étape suivante » : un seul bouton principal par écran du dossier, qui dit quoi
// faire maintenant. Pur : l'état du dossier décide, dans l'ordre du parcours.
export type NextDossierAction = { key: string; label: string; href: string };

export function nextDossierAction(
  projectId: string,
  input: {
    status: string;
    hasProperty: boolean;
    exploitableCount: number;
    hasDecision: boolean;
    liveStarted: boolean;
    liveEnded: boolean;
  },
): NextDossierAction {
  const base = `/builder/${projectId}`;
  if (input.status === 'meeting_completed') {
    return { key: 'suivi', label: 'Voir le Suivi', href: '/suivi' };
  }
  if (input.liveEnded) {
    return { key: 'conclude', label: 'Conclure le rendez-vous', href: `${base}/conclusion` };
  }
  if (input.liveStarted) {
    return { key: 'resume', label: 'Reprendre le Live', href: launchLiveHref(projectId) };
  }
  if (!input.hasProperty) {
    return { key: 'property', label: 'Saisir le bien vendeur', href: `${base}/property` };
  }
  if (input.exploitableCount < MIN_COMPETITORS) {
    return {
      key: 'competitors',
      label: 'Chercher les concurrents',
      href: `${base}/comparables/find`,
    };
  }
  if (!input.hasDecision) {
    return { key: 'decision', label: 'Décider votre prix', href: `${base}/avant-rendez-vous` };
  }
  return { key: 'launch', label: 'Lancer le Live', href: launchLiveHref(projectId) };
}

// L'en-tête ne répète pas l'écran où l'on est déjà, ni la fiche du bien, dont la barre fixée porte
// l'enregistrement et « Trouver des concurrents » (M77).
export function showsNextAction(
  pathname: string,
  projectId: string,
  action: NextDossierAction,
): boolean {
  const base = `/builder/${projectId}`;
  if (pathname.startsWith(`${base}/property`)) return false;
  const target = action.href.split('#')[0];
  return !(pathname === target || (target !== base && pathname.startsWith(`${target}/`)));
}
