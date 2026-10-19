import {
  isProjectReady,
  MIN_READY_COMPARABLES,
} from '@/features/projects/services/project-readiness';
import { formatSquareMeters } from '@/lib/format';

// Mission 91 — les pastilles d'avancement de l'écran « Avant le rendez-vous ». Elles DISENT
// les critères de « prêt » (M52), elles n'en créent aucun : le verdict vient de
// `isProjectReady`, la règle unique.

export type ReadinessCheck = {
  key: 'property' | 'competitors' | 'price_and_surface' | 'decision';
  done: boolean;
  label: string;
};

export type ReadinessInput = {
  hasProperty: boolean;
  retainedCount: number;
  exploitableCount: number;
  hasDecision: boolean;
  pendingImportCount?: number;
};

function plural(count: number): string {
  return count > 1 ? 's' : '';
}

export function buildReadinessChecks(input: ReadinessInput): ReadinessCheck[] {
  const { hasProperty, retainedCount, exploitableCount, hasDecision } = input;
  const retained = `${retainedCount} concurrent${plural(retainedCount)} retenu${plural(retainedCount)}`;
  return [
    {
      key: 'property',
      done: hasProperty,
      label: hasProperty ? 'Bien vendeur' : 'Bien vendeur à renseigner',
    },
    {
      key: 'competitors',
      done: retainedCount >= MIN_READY_COMPARABLES,
      label:
        retainedCount >= MIN_READY_COMPARABLES
          ? retained
          : `${retained} — il en faut ${MIN_READY_COMPARABLES}`,
    },
    {
      key: 'price_and_surface',
      done: exploitableCount >= MIN_READY_COMPARABLES && exploitableCount === retainedCount,
      label:
        retainedCount > 0 && exploitableCount === retainedCount
          ? `Prix et surface pour ${retainedCount > 1 ? `les ${retainedCount}` : 'le concurrent'}`
          : `Prix et surface pour ${exploitableCount} sur ${retainedCount}`,
    },
    {
      key: 'decision',
      done: hasDecision,
      label: hasDecision ? 'Décision enregistrée' : 'Décision à enregistrer',
    },
  ];
}

// « Prêt » : la règle de la bascule (M52), ou un dossier que le conseiller a déclaré prêt.
export function isReadyBadge(input: ReadinessInput, projectStatus: string | null): boolean {
  return (
    projectStatus === 'ready_for_meeting' ||
    isProjectReady({
      hasProperty: input.hasProperty,
      exploitableCount: input.exploitableCount,
      hasPositioning: input.hasDecision,
      pendingImportCount: input.pendingImportCount,
    })
  );
}

// D'où vient le « Prix des concurrents » proposé, en une ligne.
export function decisionFormulaNote(sellerSurface: number, excludedOutlierCount: number): string {
  const base = `Prix médian au m² × ${formatSquareMeters(sellerSurface)}`;
  if (excludedOutlierCount <= 0) {
    return `${base}.`;
  }
  return `${base}, hors ${excludedOutlierCount} concurrent${plural(excludedOutlierCount)} atypique${plural(excludedOutlierCount)}.`;
}

// Mission 104 — « 2 écartés : prix au m² trop éloigné » : les concurrents retenus qui n'entrent
// pas dans le « Prix des concurrents ». Côté conseiller ; le vendeur lit « Calculé sur N ».
export function excludedOutliersLabel(count: number): string {
  return `${count} écarté${plural(count)} : prix au m² trop éloigné`;
}
