import { TEXT_TONES, type Tone } from '@/components/socle/tone';

// La refonte, lot A — les tuiles de chiffres (maquettes REFONTE-4 et 8) : trois chiffres sous la
// prochaine étape d'une fiche ou d'un dossier. Un chiffre peut prendre une teinte (orange : à
// regarder ; verte : bon signe) ; son libellé dit toujours ce qu'il compte.
export type StatTile = {
  value: number | string;
  label: string;
  tone?: Tone;
  testId?: string;
};

export function StatTiles({
  tiles,
  testId = 'stat-tiles',
}: {
  tiles: StatTile[];
  testId?: string;
}) {
  return (
    <div className="grid grid-cols-3 gap-2.5 xl:gap-3.5" data-testid={testId}>
      {tiles.map((tile) => (
        <div
          key={tile.label}
          data-testid={tile.testId}
          className="flex flex-col gap-0.5 rounded-2xl border border-[#E3E6F0] bg-white px-3 py-3.5 xl:px-[18px] xl:py-4 stage:border-white/10 stage:bg-white/5"
        >
          <span
            className={`text-[26px] leading-tight font-extrabold xl:text-[28px] ${TEXT_TONES[tile.tone ?? 'plain']}`}
          >
            {tile.value}
          </span>
          <span className="text-sm text-[#5B6380] xl:text-[15px] stage:text-white/60">
            {tile.label}
          </span>
        </div>
      ))}
    </div>
  );
}
