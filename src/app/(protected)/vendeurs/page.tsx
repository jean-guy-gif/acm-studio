import type { Metadata } from 'next';

import { SellersTodayView } from './sellers-today-view';

export const metadata: Metadata = { title: 'Vendeurs — ACM Studio' };

type SellersPageProps = { searchParams: Promise<{ dossier?: string }> };

// La refonte, lot E (maquettes REFONTE-7 et 8) — Vendeurs s'ouvre sur « à faire aujourd'hui » ; les
// listes de Préparation, du Live et du Suivi sont derrière « Tous mes vendeurs » (`/builder`, et
// ses trois onglets). Leurs adresses ne changent pas.
export default async function SellersPage({ searchParams }: SellersPageProps) {
  const { dossier } = await searchParams;
  return <SellersTodayView dossier={dossier} />;
}
