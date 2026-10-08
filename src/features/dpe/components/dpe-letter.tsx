import { DPE_COLORS, type DpeClass } from '@/features/dpe/services/dpe';

const SIZES = {
  sm: 'h-5 min-w-5 px-1 text-xs',
  md: 'h-7 min-w-7 px-1.5 text-base',
  lg: 'h-14 min-w-14 px-3 text-3xl',
} as const;

// La lettre DPE dans la couleur de l'étiquette officielle (A vert → G rouge).
export function DpeLetter({
  letter,
  size = 'sm',
}: {
  letter: DpeClass;
  size?: keyof typeof SIZES;
}) {
  const colors = DPE_COLORS[letter];
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-md font-bold ${SIZES[size]}`}
      style={{ backgroundColor: colors.background, color: colors.text }}
      aria-label={`DPE ${letter}`}
    >
      {letter}
    </span>
  );
}
