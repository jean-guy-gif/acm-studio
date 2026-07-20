// Progress indicator: "Section X / N" among navigable sections. When the current
// section is unavailable (opened from the summary), no number is shown.
export function LiveSectionProgress({
  position,
  total,
}: {
  position: number | null;
  total: number;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm text-zinc-500">
        {position != null ? `Section ${position} / ${total}` : 'Section indisponible'}
      </span>
      <div className="h-1 w-full overflow-hidden rounded bg-zinc-200 dark:bg-zinc-800">
        <div
          className="h-full bg-zinc-500"
          style={{ width: position != null && total > 0 ? `${(position / total) * 100}%` : '0%' }}
        />
      </div>
    </div>
  );
}
