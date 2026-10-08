import { hintText } from '@/components/ui/styles';
import { countDpe, dpeCountLabel } from '@/features/dpe/services/dpe';

// Mission 80 — Préparation, sous les concurrents retenus : « DPE de vos concurrents : 2 C, 4 D,
// 1 E, 3 non indiqués ». Réservé au conseiller. Rien sans concurrent retenu.
export function DpeCountLine({ energyRatings }: { energyRatings: (string | null)[] }) {
  const label = dpeCountLabel(countDpe(energyRatings));
  if (label == null) return null;
  return <p className={hintText}>DPE de vos concurrents : {label}</p>;
}
