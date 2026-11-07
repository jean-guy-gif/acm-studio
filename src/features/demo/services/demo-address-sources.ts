import 'server-only';

import type { SourceReaders } from '@/features/address-dossier/services/build-blocks';
import {
  DEMO_VENCE_RISKS,
  DEMO_VENCE_SALES,
  DEMO_VENCE_URBANISM,
} from '@/features/demo/data/address-dossier-vence';
import { DEMO_SCENARIOS } from '@/features/demo/data/scenarios';
import { demoDelay } from '@/features/demo/services/demo-delay';

// Mission 141 — le dossier d'adresse dans l'agence de démonstration (M114) : aucun appel réseau.
// Au point de la maison du scénario de Vence, le jeu relevé une fois (données publiques réelles du
// secteur) ; ailleurs, et pour le DPE, la parcelle et la copropriété d'une adresse inventée : rien
// trouvé à cette adresse.
const VENCE = DEMO_SCENARIOS.find((scenario) => scenario.id === 'vence')!.subject.location;

const atVence = (point: { lat: number; lon: number }) =>
  point.lat === VENCE.lat && point.lon === VENCE.lon;

export const demoAddressSources: SourceReaders = {
  async sales(context) {
    await demoDelay();
    return atVence(context.point) && context.propertyType === 'house' ? [...DEMO_VENCE_SALES] : [];
  },
  async dpe() {
    return null;
  },
  async risks(context) {
    return atVence(context.point) ? DEMO_VENCE_RISKS : null;
  },
  async urbanism(context) {
    return atVence(context.point) ? DEMO_VENCE_URBANISM : null;
  },
  async parcel() {
    return null;
  },
  async condo() {
    return null;
  },
};
