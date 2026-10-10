'use client';

import { useRouter } from 'next/navigation';

import { inputBase } from '@/components/ui/styles';
import { prospectionHref } from '@/features/prospecting/services/filter-prospecting';
import {
  PROSPECTING_TARGETS,
  PROSPECTING_TARGET_LABELS,
  type ProspectingSeller,
  type ProspectingTarget,
} from '@/features/prospecting/types';

// Mission 86 — les deux filtres de la page Prospection. Le choix vit dans l'adresse (« ?bien= »,
// « ?cible= ») : le bouton « Prospecter » du Suivi ouvre la page déjà filtrée, et l'impression
// de la tournée reprend le même filtre.
export function ProspectionFilters({
  sellers,
  sellerId,
  target,
}: {
  sellers: ProspectingSeller[];
  sellerId: string | null;
  target: ProspectingTarget;
}) {
  const router = useRouter();
  const select = `${inputBase} w-auto max-w-full py-2 text-sm font-semibold`;

  return (
    <>
      <select
        aria-label="Bien vendeur"
        value={sellerId ?? ''}
        onChange={(event) => router.push(prospectionHref(event.target.value || null, target))}
        className={select}
      >
        <option value="">Bien vendeur : tous</option>
        {sellers.map((seller) => (
          <option key={seller.projectId} value={seller.projectId}>
            {seller.name}
          </option>
        ))}
      </select>
      <select
        aria-label="Confrères ou propriétaires"
        value={target}
        onChange={(event) =>
          router.push(prospectionHref(sellerId, event.target.value as ProspectingTarget))
        }
        className={select}
      >
        {PROSPECTING_TARGETS.map((value) => (
          <option key={value} value={value}>
            {PROSPECTING_TARGET_LABELS[value]}
          </option>
        ))}
      </select>
    </>
  );
}
