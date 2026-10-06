import type { Loosening } from '@/features/competitor-search/types';
import { formatPercent, formatSquareMeters } from '@/lib/format';

// Mission 68 — la tolérance de surface RÉELLEMENT appliquée, telle que l'écran la dit. Quand le
// plancher (±3 m²) l'emporte sur le pourcentage du cran retenu, c'est lui qui a filtré : on
// affiche « ±3 m² », pas un pourcentage qui n'a jamais servi. Sinon, le pourcentage du cran.
export function surfaceToleranceLabel(loosening: Loosening): string {
  return loosening.surfaceFloorSqm != null
    ? `±${formatSquareMeters(loosening.surfaceFloorSqm)}`
    : `±${formatPercent(loosening.surfaceTolerancePct)}`;
}
