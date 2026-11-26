import type { Metadata } from 'next';

import { showsAllBuyers } from '@/features/buyers/services/buyers-page';

import { AllBuyers } from './all-buyers';
import { BuyersTodayView } from './buyers-today-view';

export const metadata: Metadata = { title: 'Acquéreurs — ACM Studio' };

type BuyersPageProps = {
  searchParams: Promise<{
    q?: string;
    archive?: string;
    vue?: string;
    etat?: string;
    tous?: string;
    personne?: string;
    biens?: string;
  }>;
};

// La refonte, lot B — Acquéreurs s'ouvre sur « à faire aujourd'hui » (maquettes REFONTE-1, 5 et
// 6) ; la liste entière des fiches (M117, M146 B) est derrière « Tous mes acquéreurs »
// (`?tous=1`). Une adresse qui porte déjà une vue, un filtre, une recherche ou l'avis d'une fiche
// archivée ouvre la liste, comme avant : un lien envoyé continue de mener au même endroit.
export default async function BuyersPage({ searchParams }: BuyersPageProps) {
  const query = await searchParams;
  if (showsAllBuyers(query)) {
    return <AllBuyers q={query.q} archive={query.archive} vue={query.vue} etat={query.etat} />;
  }
  return <BuyersTodayView personne={query.personne} biens={query.biens === '1'} />;
}
