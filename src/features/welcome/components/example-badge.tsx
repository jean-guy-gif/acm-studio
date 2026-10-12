// Mission 97 — le badge « Exemple » : un dossier de démonstration se dit, partout où il paraît.
export function ExampleBadge() {
  return (
    <span
      data-testid="example-badge"
      className="inline-flex items-center rounded-full border border-violet-200 bg-violet-50 px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap text-violet-700 stage:border-violet-400/30 stage:bg-violet-500/10 stage:text-violet-300"
    >
      Exemple
    </span>
  );
}
