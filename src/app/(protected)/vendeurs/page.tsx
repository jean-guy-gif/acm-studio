import type { Metadata } from 'next';

import { scopeFromQuery } from '@/features/today/services/today-scope';

import { SellersTodayView } from './sellers-today-view';

export const metadata: Metadata = { title: 'Vendeurs — ACM Studio' };

type SellersPageProps = { searchParams: Promise<{ vendeur?: string; agence?: string }> };

// La refonte, lot E (maquettes REFONTE-7 et 8) — Vendeurs s'ouvre sur « à faire aujourd'hui » ; les
// listes de Préparation, du Live et du Suivi sont derrière « Tous mes vendeurs » (`/builder`, et
// ses trois onglets). Leurs adresses ne changent pas. Remarques de Jean-Guy (26/11) — `?agence=1` :
// la vue « Toute l'agence », pour un manager.
export default async function SellersPage({ searchParams }: SellersPageProps) {
  const { vendeur, agence } = await searchParams;
  return <SellersTodayView selectedId={vendeur} scope={scopeFromQuery(agence)} />;
}
