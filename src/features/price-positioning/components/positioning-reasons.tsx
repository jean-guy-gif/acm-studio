import { card, sectionTitle } from '@/components/ui/styles';

export function PositioningReasons({ reasons }: { reasons: string[] }) {
  if (reasons.length === 0) {
    return null;
  }
  return (
    <section className={`${card} flex flex-col gap-3 p-5 sm:p-6`}>
      <h2 className={sectionTitle}>Constats</h2>
      <ul className="flex flex-col gap-1 text-sm text-zinc-600 stage:text-white/65">
        {reasons.map((reason) => (
          <li key={reason}>{reason}</li>
        ))}
      </ul>
    </section>
  );
}
