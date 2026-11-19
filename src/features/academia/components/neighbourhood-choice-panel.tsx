'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { saveNeighbourhoodChoice } from '@/features/academia/actions/save-neighbourhood-choice';
import { MINUTES_PER_SCREEN } from '@/features/before-meeting/services/live-sequence';
import {
  NEIGHBOURHOOD_BLOCK_KEYS,
  type NeighbourhoodBlockKey,
  type NeighbourhoodBlocks,
  type NeighbourhoodBlockStatus,
} from '@/features/neighbourhood-link/services/neighbourhood-blocks';
import { neighbourhoodView } from '@/features/neighbourhood-link/services/neighbourhood-view';
import { btnSecondary, card, hintText, sectionTitle } from '@/components/ui/styles';
import { CLIENT_TEXTS } from '@/lib/client-texts';

// Mission 159 — « Ce que verra le vendeur : le quartier » (planche M159-1, validée par Jean-Guy le
// 17/11) : rien n'est montré par défaut, le conseiller coche bloc par bloc ; chaque bloc coché
// devient un écran du Live et une page de l'Étude de marché et de la synthèse. « Enregistrer le
// choix » garde un instantané ; le Live commencé, le choix ne change plus. Jamais la valeur
// indicative, jamais le DPE : la vue « bien-client » ne les porte pas.
const NAMES: Record<NeighbourhoodBlockKey, string> = {
  urbanisme: 'Urbanisme',
  risques: 'Risques',
  population: 'Population',
  copropriete: 'Copropriété',
  permis: 'Permis autour',
  ventes: 'Ventes réelles autour du bien',
};

export function NeighbourhoodChoicePanel({
  projectId,
  blocks,
  statuses,
  savedKeys,
  stale,
  locked,
}: {
  projectId: string;
  blocks: NeighbourhoodBlocks;
  // Mission 161 — ce que la source a dit de chaque bloc : un bloc qui ne se propose pas dit pourquoi.
  statuses?: Record<NeighbourhoodBlockKey, NeighbourhoodBlockStatus>;
  savedKeys: NeighbourhoodBlockKey[];
  stale: boolean;
  locked: boolean;
}) {
  const router = useRouter();
  const available = NEIGHBOURHOOD_BLOCK_KEYS.filter(
    (key) => neighbourhoodView(blocks, key, CLIENT_TEXTS.fr, 'fr') != null,
  );
  const unavailable = NEIGHBOURHOOD_BLOCK_KEYS.filter((key) => !available.includes(key));
  const [checked, setChecked] = useState<NeighbourhoodBlockKey[]>(
    savedKeys.filter((key) => available.includes(key)),
  );
  const [saved, setSaved] = useState<NeighbourhoodBlockKey[]>(savedKeys);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const changed = checked.length !== saved.length || checked.some((key) => !saved.includes(key));
  const minutes = Math.round(checked.length * MINUTES_PER_SCREEN);

  const toggle = (key: NeighbourhoodBlockKey) => {
    setMessage(null);
    setChecked((current) =>
      current.includes(key) ? current.filter((k) => k !== key) : [...current, key],
    );
  };
  const save = () =>
    start(async () => {
      const result = await saveNeighbourhoodChoice(projectId, checked);
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      // Ce que le serveur a gardé : un bloc qu'il a écarté ne reste pas coché.
      const kept = checked.filter((key) => result.keys.includes(key));
      setChecked(kept);
      setSaved(kept);
      setMessage('Choix enregistré : le Live et les documents montreront ces blocs.');
      router.refresh();
    });

  return (
    <section className={`${card} flex flex-col gap-3 p-5`} data-testid="neighbourhood-choice">
      <h2 className={sectionTitle}>Ce que verra le vendeur : le quartier</h2>
      <p className={hintText}>
        Rien n’est montré par défaut : cochez bloc par bloc. Chaque bloc coché devient un écran du
        Live et une page de l’Étude de marché et de la synthèse. Jamais la valeur indicative, jamais
        le DPE.
      </p>
      {stale ? (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 stage:bg-amber-500/10 stage:text-amber-200">
          L’adresse, le type, les pièces ou la surface du bien ont changé depuis votre choix : il
          n’est plus montré au vendeur. Cochez de nouveau, puis enregistrez.
        </p>
      ) : null}
      {locked ? (
        <p className={hintText}>
          Le Live a commencé : le quartier montré au vendeur ne se modifie plus.
        </p>
      ) : null}
      <ul className="flex flex-col gap-2">
        {available.map((key) => {
          const view = neighbourhoodView(blocks, key, CLIENT_TEXTS.fr, 'fr');
          const on = checked.includes(key);
          return (
            <li key={key}>
              <label
                className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 ${
                  on ? 'border-brand/50 bg-brand/5' : 'border-zinc-200 stage:border-white/10'
                } ${locked ? 'cursor-not-allowed opacity-70' : ''}`}
              >
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4"
                  checked={on}
                  disabled={locked || pending}
                  onChange={() => toggle(key)}
                  data-testid={`neighbourhood-choice-${key}`}
                />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="font-semibold">{NAMES[key]}</span>
                  <span className="text-sm text-zinc-500 stage:text-white/60">
                    {view?.headline}
                  </span>
                </span>
                <span className="shrink-0 rounded-full bg-brand/10 px-2 py-0.5 text-xs text-brand-deep stage:text-brand">
                  {key === 'ventes'
                    ? 'à la fin, avec « Analyse des prix »'
                    : 'après « Votre valeur perçue »'}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
      <p
        className="text-sm font-semibold text-brand-deep stage:text-brand"
        data-testid="neighbourhood-choice-count"
      >
        {checked.length === 0
          ? 'Aucun écran ajouté au Live'
          : `${checked.length} ${checked.length > 1 ? 'écrans ajoutés' : 'écran ajouté'} au Live · environ ${minutes} ${minutes > 1 ? 'minutes' : 'minute'} de plus`}
      </p>
      {unavailable.length > 0 ? (
        <ul className="flex flex-col gap-1" data-testid="neighbourhood-choice-unavailable">
          {unavailable.map((key) => (
            <li
              key={key}
              className="flex items-start gap-3 px-4 text-sm text-zinc-500 stage:text-white/50"
            >
              <span
                className="mt-0.5 inline-block h-4 w-4 shrink-0 rounded border border-zinc-300"
                aria-hidden
              />
              <span>
                <span className="font-semibold">{NAMES[key]}</span> —{' '}
                {key === 'ventes' && blocks.ventes != null && blocks.ventes.listRadius == null
                  ? 'moins de 5 ventes comparables autour du bien : Academia ne donne pas de liste'
                  : statuses?.[key] === 'unchecked'
                    ? 'non vérifié par la source : jamais proposé au vendeur'
                    : statuses?.[key] === 'unread'
                      ? 'la source n’a pas pu être lue pour cette adresse'
                      : 'rien à montrer pour cette adresse'}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      <p className={hintText}>
        Ordre au Live : Introduction → Votre bien → Votre valeur perçue →{' '}
        <b>les blocs du quartier cochés</b> → les concurrents → … → <b>Ventes réelles</b> → Analyse
        des prix → Conclusion.
      </p>
      {!locked ? (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className={btnSecondary}
            disabled={pending || !changed}
            onClick={save}
          >
            {pending ? 'Enregistrement…' : 'Enregistrer le choix'}
          </button>
          {message ? (
            <span role="status" className="text-sm text-zinc-600 stage:text-white/70">
              {message}
            </span>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
