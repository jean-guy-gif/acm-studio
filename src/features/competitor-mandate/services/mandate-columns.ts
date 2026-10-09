import type { ImportedComparableData } from '@/features/comparable-import/types';
import {
  isExclusivity,
  isMandateSource,
  isSoldBy,
  type Exclusivity,
  type MandateSource,
  type SoldBy,
} from '@/features/competitor-mandate/types';

// Mission 83 — les quatre colonnes de comparables, telles qu'on les écrit. Pur.

export type MandateColumns = {
  sold_by: SoldBy | null;
  sold_by_source: MandateSource | null;
  exclusivity: Exclusivity | null;
  exclusivity_source: MandateSource | null;
};

export type MandateField = 'sold_by' | 'exclusivity';

// Ce qu'une annonce importée a dit (import en lot : aucune saisie entre les deux).
export function importedMandateColumns(
  data: Pick<
    ImportedComparableData,
    'soldBy' | 'soldBySource' | 'exclusivity' | 'exclusivitySource'
  >,
): MandateColumns {
  return {
    sold_by: data.soldBy,
    sold_by_source: data.soldBy == null ? null : data.soldBySource,
    exclusivity: data.exclusivity,
    exclusivity_source: data.exclusivity == null ? null : data.exclusivitySource,
  };
}

const text = (formData: FormData, name: string): string => String(formData.get(name) ?? '').trim();

// Les mêmes valeurs, revenues du navigateur dans les champs cachés du formulaire d'import :
// revalidées. Une lecture ne dit jamais « particulier » ni « conseiller » : une valeur hors
// liste, ou sans provenance de lecture, est ignorée (inconnu), pas refusée.
export function parseImportedMandateForm(formData: FormData): MandateColumns {
  const readSource = (name: string): MandateSource | null => {
    const source = text(formData, name);
    return isMandateSource(source) && source !== 'advisor' ? source : null;
  };
  const readSoldBySource = readSource('sold_by_source');
  const soldBySource = readSoldBySource === 'no_mention' ? null : readSoldBySource;
  const exclusivitySource = readSource('exclusivity_source');
  const soldBy = text(formData, 'sold_by');
  const exclusivity = text(formData, 'exclusivity');
  const soldByRead = soldBy === 'agency' && soldBySource != null;
  // « aucune mention » ne peut dire que « non », et seulement d'une agence.
  const exclusivityRead =
    isExclusivity(exclusivity) &&
    exclusivitySource != null &&
    (exclusivitySource !== 'no_mention' || (exclusivity === 'no' && soldByRead));
  return {
    sold_by: soldByRead ? 'agency' : null,
    sold_by_source: soldByRead ? soldBySource : null,
    exclusivity: exclusivityRead ? exclusivity : null,
    exclusivity_source: exclusivityRead ? exclusivitySource : null,
  };
}

// La correction du conseiller : une valeur de la liste, ou null pour « inconnu ». Elle porte
// toujours la provenance `advisor`. Aucune lecture ne la réécrit : l'import ne fait que CRÉER un
// concurrent, et le formulaire de modification ne porte pas ces colonnes. `undefined` = valeur
// refusée.
export function advisorCorrection(
  field: MandateField,
  value: string | null,
): Partial<MandateColumns> | undefined {
  if (field === 'sold_by') {
    if (value !== null && !isSoldBy(value)) {
      return undefined;
    }
    return { sold_by: value, sold_by_source: 'advisor' };
  }
  if (value !== null && !isExclusivity(value)) {
    return undefined;
  }
  return { exclusivity: value, exclusivity_source: 'advisor' };
}

// Liste de tournée — à qui s'adresser pour ce bien.
//   confrère     : le bien est en exclusivité chez une agence
//   propriétaire : vendu par un particulier, ou mandat simple
//   à vérifier   : ACM ne sait pas
export type ProspectingStep = 'colleague' | 'owner' | 'check';

export const PROSPECTING_STEP_LABELS: Record<ProspectingStep, string> = {
  colleague: 'Exclusivité · appeler le confrère',
  owner: 'Mandat simple / particulier · aller voir le propriétaire',
  check: 'À vérifier',
};

export function prospectingStep(mandate: {
  sold_by: string | null;
  exclusivity: string | null;
}): ProspectingStep {
  if (mandate.sold_by === 'private') {
    return 'owner';
  }
  if (mandate.exclusivity === 'yes') {
    return 'colleague';
  }
  if (mandate.exclusivity === 'no') {
    return 'owner';
  }
  return 'check';
}
