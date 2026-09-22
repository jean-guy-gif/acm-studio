import type {
  PreparationProperty,
  PreparationReadiness,
} from '@/features/projects/queries/get-preparation-dossiers';
import { MIN_READY_COMPARABLES } from '@/features/projects/services/project-readiness';

// MISSION 52 — composition des libellés de la carte. PUR, donc testable. Aucune valeur
// inventée : un champ absent ne s'affiche pas, et JAMAIS un « — » systématique.

// Le bien, tel que le conseiller l'a saisi : type (TEXTE LIBRE), pièces, surface, commune.
// « Appartement · 4 pièces · 97 m² · Cagnes-sur-Mer ». Null s'il n'y a rien à dire.
export function propertyLabel(property: PreparationProperty | null): string | null {
  if (!property) {
    return null;
  }
  const parts: string[] = [];
  if (property.propertyType?.trim()) {
    parts.push(property.propertyType.trim());
  }
  if (property.roomsCount != null && property.roomsCount > 0) {
    parts.push(`${property.roomsCount} pièce${property.roomsCount > 1 ? 's' : ''}`);
  }
  if (property.surfaceArea != null && property.surfaceArea > 0) {
    parts.push(`${property.surfaceArea} m²`);
  }
  if (property.city?.trim()) {
    parts.push(property.city.trim());
  }
  return parts.length > 0 ? parts.join(' · ') : null;
}

const euro = (value: number): string => `${Math.round(value).toLocaleString('fr-FR')} €`;

// « 320 000 – 390 000 € », ou null quand la fourchette n'est pas saisie (la carte le dit
// en clair ailleurs, parce que c'est justement un des éléments qui manquent).
export function fourchetteLabel(fourchette: { low: number; high: number } | null): string | null {
  if (!fourchette) {
    return null;
  }
  return `${Math.round(fourchette.low).toLocaleString('fr-FR')} – ${euro(fourchette.high)}`;
}

// L'avancement NOMMÉ : ce qui est fait (✓) et ce qui manque, jamais un pourcentage nu.
export type AdvancementStep = { label: string; done: boolean };

export function advancementSteps(readiness: PreparationReadiness): AdvancementStep[] {
  return [
    { label: 'Bien vendeur', done: readiness.hasProperty },
    {
      label: readiness.hasProperty
        ? `${readiness.exploitableCount}/${MIN_READY_COMPARABLES} concurrents`
        : `${readiness.exploitableCount} concurrents`,
      done: readiness.exploitableCount >= MIN_READY_COMPARABLES,
    },
    { label: 'Fourchette', done: readiness.hasPositioning },
  ];
}
