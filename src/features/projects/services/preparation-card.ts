import type { PreparationReadiness } from '@/features/projects/queries/get-preparation-dossiers';
import { MIN_READY_COMPARABLES } from '@/features/projects/services/project-readiness';

// MISSION 52 — les libellés PURS du bien et de la fourchette vivent dans property-label.ts
// (sans server-only, partageables côté client) ; on les ré-exporte ici pour ne pas casser
// les imports existants. advancementSteps reste ici car il dépend d'une constante de
// readiness (côté serveur).
export {
  FOURCHETTE_LABEL,
  FOURCHETTE_PENDING,
  fourchetteLabel,
  pendingImportLabel,
  propertyLabel,
} from '@/features/projects/services/property-label';

// L'avancement NOMMÉ : ce qui est fait (✓) et ce qui manque, jamais un pourcentage nu.
export type AdvancementStep = { label: string; done: boolean };

export function advancementSteps(readiness: PreparationReadiness): AdvancementStep[] {
  return [
    { label: 'Bien vendeur', done: readiness.hasProperty },
    {
      // « 2/3 concurrents » tant qu'il en manque ; atteint, le seul nombre : « 5 concurrents ✓ ».
      label:
        readiness.hasProperty && readiness.exploitableCount < MIN_READY_COMPARABLES
          ? `${readiness.exploitableCount}/${MIN_READY_COMPARABLES} concurrents`
          : `${readiness.exploitableCount} concurrents`,
      done: readiness.exploitableCount >= MIN_READY_COMPARABLES,
    },
    { label: 'Décision de prix', done: readiness.hasPositioning },
  ];
}
