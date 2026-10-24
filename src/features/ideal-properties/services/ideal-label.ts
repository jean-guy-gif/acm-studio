import { propertyTypeDisplay } from '@/features/subject-property/services/property-type-display';
import { formatSquareMeters } from '@/lib/format';

// Mission 118 — le libellé neutre d'un bien (type · pièces · surface · commune), le même pour un
// bien de l'agence et une annonce du marché ; un champ absent est omis.
export function idealLabel(bien: {
  propertyType: string | null;
  roomsCount: number | null;
  surfaceArea: number | null;
  city: string | null;
}): string {
  const parts = [
    propertyTypeDisplay(bien.propertyType),
    bien.roomsCount != null ? `${bien.roomsCount} pièce${bien.roomsCount > 1 ? 's' : ''}` : null,
    bien.surfaceArea != null ? formatSquareMeters(Math.round(bien.surfaceArea)) : null,
    bien.city?.trim() || null,
  ].filter((part): part is string => part != null && part !== '');
  return parts.length > 0 ? parts.join(' · ') : 'Bien';
}
