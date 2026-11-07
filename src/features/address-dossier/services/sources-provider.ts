import 'server-only';

import type { SourceReaders } from '@/features/address-dossier/services/build-blocks';
import { liveSources } from '@/features/address-dossier/services/live-sources';
import { demoAddressSources } from '@/features/demo/services/demo-address-sources';

// Mission 141 — les sources du dossier d'adresse derrière UNE porte (le modèle de geo-provider.ts,
// M114) : les services publics pour une agence réelle, le jeu figé pour l'agence de démo ; le choix
// se fait côté serveur, sur le repère de l'agence lu en base.
export function addressSources(isDemo: boolean): SourceReaders {
  return isDemo ? demoAddressSources : liveSources;
}
