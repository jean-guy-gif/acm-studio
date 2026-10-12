import {
  READ_FAILURE_LABELS,
  type ReadFailureCause,
} from '@/features/competitor-search/services/import-listing';
import type { SearchSnapshot } from '@/features/competitor-search/services/search-snapshot';
import { displayCommune } from '@/features/competitor-search/utils/arrondissements';
import { propertyTypeLabel } from '@/features/subject-property/services/property-type-choice';
import { formatEuro, formatSquareMeters } from '@/lib/format';

// Mission 101 — les mots de « l'import en attente », côté conseiller seulement. Pur.

export const IMPORTED_FROM_SEARCH_LABEL = 'Importé depuis la recherche';
export const LISTING_WITHDRAWN_LABEL = 'Annonce retirée';
export const PENDING_RETRY_LABEL = 'Réessayer';
export const PENDING_DISMISS_LABEL = 'Ne pas importer';

// « 1 concurrent retenu n'est pas encore importé », « 3 concurrents retenus ne sont pas encore
// importés » — « concurrents retenus », jamais « biens retenus » (M97).
export function pendingImportsTitle(count: number): string {
  return count > 1
    ? `${count} concurrents retenus ne sont pas encore importés`
    : '1 concurrent retenu n’est pas encore importé';
}

export const PENDING_IMPORTS_HINT =
  'Ils sont enregistrés : rien n’est perdu. « Réessayer » relit l’annonce, et crée le concurrent depuis les données de la recherche si la page reste illisible.';

// « Appartement · 3 pièces · 65 m² · Cagnes-sur-Mer · 336 000 € » — ce que la recherche a dit du
// bien, sans le titre du portail. Un champ absent est omis.
export function pendingImportLabel(snapshot: SearchSnapshot | null): string {
  if (!snapshot) return 'Concurrent retenu';
  const parts = [
    propertyTypeLabel(snapshot.propertyType),
    snapshot.roomsCount != null
      ? `${snapshot.roomsCount} pièce${snapshot.roomsCount > 1 ? 's' : ''}`
      : null,
    snapshot.surfaceArea != null ? formatSquareMeters(snapshot.surfaceArea) : null,
    displayCommune(snapshot.city, null),
    snapshot.price != null ? formatEuro(snapshot.price) : null,
  ].filter((part): part is string => part != null && part !== '');
  return parts.length > 0 ? parts.join(' · ') : 'Concurrent retenu';
}

// « Dernier essai : le site refuse la lecture automatique de cette annonce. » — null tant
// qu'aucune lecture n'a échoué (onglet fermé avant la lecture).
export function pendingCauseLabel(cause: string | null): string | null {
  const label = cause ? READ_FAILURE_LABELS[cause as ReadFailureCause | 'no_price'] : undefined;
  return label ? `Dernier essai : ${label}.` : null;
}
