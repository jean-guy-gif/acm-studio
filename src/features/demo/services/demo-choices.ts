import { DEMO_SCENARIOS } from '@/features/demo/data/scenarios';
import { demoSubjectListingUrl } from '@/features/demo/services/demo-urls';

// Mission 114 — ce que l'écran du bien vendeur propose d'avance en démonstration : l'annonce de
// chaque scénario (remplie d'avance, la première), et sa fiche PDF (servie par l'application,
// `public/demo`, lue dans le navigateur comme une vraie fiche, M43).
export type DemoChoice = { label: string; url: string };

export function demoSubjectListingChoices(): DemoChoice[] {
  return DEMO_SCENARIOS.map((scenario) => ({
    label: scenario.label,
    url: demoSubjectListingUrl(scenario.id),
  }));
}

export const DEMO_BROCHURES_PATH = '/demo';

export function demoBrochureFile(scenarioId: string): string {
  return `fiche-${scenarioId}.pdf`;
}

export function demoBrochureChoices(): DemoChoice[] {
  return DEMO_SCENARIOS.map((scenario) => ({
    label: scenario.label,
    url: `${DEMO_BROCHURES_PATH}/${demoBrochureFile(scenario.id)}`,
  }));
}
