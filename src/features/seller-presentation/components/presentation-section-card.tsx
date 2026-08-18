import {
  badgeNeutral,
  badgeSelected,
  hintText,
  metaLabel,
  softPanel,
} from '@/components/ui/styles';
import type { SellerPresentationSection } from '@/features/seller-presentation/types/seller-presentation';

export function PresentationSectionCard({ section }: { section: SellerPresentationSection }) {
  const available = section.status === 'available';
  return (
    <div className={`${softPanel} flex items-start justify-between gap-4 p-3.5`}>
      <div>
        <span className={metaLabel}>Section {section.order}</span>
        <p className="font-title text-base font-semibold text-zinc-900 stage:text-white">
          {section.title}
        </p>
        {!available && section.reasonUnavailable ? (
          <p className={hintText}>{section.reasonUnavailable}</p>
        ) : null}
      </div>
      <span className={available ? `${badgeSelected} shrink-0` : `${badgeNeutral} shrink-0`}>
        {available ? 'Disponible' : 'Indisponible'}
      </span>
    </div>
  );
}
