export function PositioningReasons({ reasons }: { reasons: string[] }) {
  if (reasons.length === 0) {
    return null;
  }
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-lg font-medium">Constats</h2>
      <ul className="flex flex-col gap-1 text-sm text-zinc-600 dark:text-zinc-400">
        {reasons.map((reason) => (
          <li key={reason}>{reason}</li>
        ))}
      </ul>
    </section>
  );
}
