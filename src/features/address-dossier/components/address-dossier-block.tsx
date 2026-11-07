'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition, type ReactNode } from 'react';

import {
  btnPrimary,
  btnSecondary,
  card,
  errorText,
  hintText,
  sectionTitle,
} from '@/components/ui/styles';
import { buildAddressDossier } from '@/features/address-dossier/actions/build-address-dossier';
import {
  middleHalfLabel,
  priceLine,
  radiusLabel,
} from '@/features/address-dossier/services/dossier-texts';
import type {
  CondoData,
  DossierBlocks,
  DpeData,
  EmptyNote,
  ParcelData,
  RisksData,
  SalesData,
  SourceBlock,
  SourceKey,
  UrbanismData,
} from '@/features/address-dossier/types';
import {
  formatDay,
  formatEuro,
  formatEuroPerSquareMeter,
  formatNumber,
  formatRelativeDay,
  formatSquareMeters,
} from '@/lib/format';

// Mission 141 — le dossier d'adresse, sur l'onglet Bien vendeur : ce que les données publiques
// disent de l'adresse du bien, pour le conseiller seul (décision du 07/11 : rien dans le Live ni
// dans les documents du vendeur). Construit à la demande, gardé et daté ; « Actualiser » le refait.

export type AddressDossierView =
  | { state: 'none' }
  | { state: 'unreadable' }
  | { state: 'built'; builtAt: string; stale: boolean; blocks: DossierBlocks };

const SOURCE_TITLES: Record<SourceKey, string> = {
  sales: 'Ventes réelles autour',
  dpe: 'Le DPE à cette adresse',
  risks: 'Risques',
  urbanism: 'Urbanisme',
  parcel: 'Parcelle cadastrale',
  condo: 'Copropriété',
};

const SOURCE_NAMES: Record<SourceKey, string> = {
  sales: 'DVF, ventes enregistrées par la DGFiP (Etalab)',
  dpe: 'Base des DPE de l’ADEME',
  risks: 'Géorisques',
  urbanism: 'Géoportail de l’urbanisme (IGN)',
  parcel: 'Cadastre (IGN)',
  condo: 'Registre national des copropriétés (ANAH)',
};

const SOURCE_DATE_LABELS: Record<SourceKey, string> = {
  sales: 'ventes jusqu’au',
  dpe: 'DPE du',
  risks: '',
  urbanism: '',
  parcel: '',
  condo: 'mis à jour le',
};

const EMPTY_NOTES: Record<EmptyNote, string> = {
  street_only:
    'Adresse trouvée à la rue seulement : précisez le numéro sur la fiche pour lire cette source.',
  parcel_undetermined: 'Parcelle à vérifier au cadastre.',
  not_a_house_or_apartment: 'Seulement pour une maison ou un appartement.',
};

const EMPTY_TEXTS: Record<SourceKey, string> = {
  sales: 'Aucune vente du même type à 1 km sur les trois dernières années.',
  dpe: 'Rien trouvé à cette adresse.',
  risks: 'Rien trouvé à cette adresse.',
  urbanism: 'Rien trouvé à cette adresse.',
  parcel: 'Rien trouvé à cette adresse.',
  condo: 'Aucune copropriété immatriculée à cette adresse.',
};

const day = (iso: string) => formatDay(iso, 'fr', 'numeric');

export function AddressDossierBlock({
  projectId,
  view,
  advisorAnalysis,
  surface,
  energyRating,
}: {
  projectId: string;
  view: AddressDossierView;
  // L'analyse de valeur ENREGISTRÉE (décision du 07/11), pour la situer.
  advisorAnalysis: number | null;
  surface: number | null;
  // La classe DPE saisie sur la fiche : comparée, jamais réécrite (décision du 07/11).
  energyRating: string | null;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const build = () =>
    startTransition(async () => {
      setError(null);
      const result = await buildAddressDossier(projectId).catch(() => ({
        ok: false as const,
        error: 'Connexion perdue — réessayez.',
      }));
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });

  return (
    <section className={`${card} flex flex-col gap-5 p-5 sm:p-6`} data-testid="address-dossier">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className={sectionTitle}>Dossier d’adresse</h2>
          <p className={hintText}>
            Ce que les données publiques disent de l’adresse du bien : pour vous seul, rien n’en est
            montré au vendeur.
          </p>
          {view.state === 'built' ? (
            <p
              className="text-xs text-zinc-500 stage:text-white/50"
              data-testid="address-dossier-built"
            >
              Construit {formatRelativeDay(view.builtAt)}.
            </p>
          ) : null}
        </div>
        <button
          type="button"
          className={view.state === 'built' ? btnSecondary : btnPrimary}
          disabled={pending}
          onClick={build}
          data-testid="address-dossier-build"
        >
          {pending
            ? 'Lecture des sources…'
            : view.state === 'built'
              ? 'Actualiser'
              : 'Construire le dossier d’adresse'}
        </button>
      </div>
      {error ? (
        <p role="alert" className={errorText}>
          {error}
        </p>
      ) : null}
      {view.state === 'unreadable' ? (
        <p role="alert" className={errorText}>
          Le dossier d’adresse n’a pas pu être lu : rechargez la page.
        </p>
      ) : null}
      {view.state === 'built' && view.stale ? (
        <p className="text-sm font-medium text-amber-700" data-testid="address-dossier-stale">
          L’adresse ou le type du bien a changé depuis : actualisez le dossier d’adresse.
        </p>
      ) : null}
      {view.state === 'built' ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <SourceCard source="sales" block={view.blocks.sales}>
            {(data) => <Sales data={data} advisorAnalysis={advisorAnalysis} surface={surface} />}
          </SourceCard>
          <SourceCard source="dpe" block={view.blocks.dpe}>
            {(data) => <Dpe data={data} energyRating={energyRating} />}
          </SourceCard>
          <SourceCard source="risks" block={view.blocks.risks}>
            {(data) => <Risks data={data} />}
          </SourceCard>
          <SourceCard source="urbanism" block={view.blocks.urbanism}>
            {(data) => <Urbanism data={data} />}
          </SourceCard>
          <SourceCard source="parcel" block={view.blocks.parcel}>
            {(data) => <Parcel data={data} />}
          </SourceCard>
          <SourceCard source="condo" block={view.blocks.condo}>
            {(data) => <Condo data={data} />}
          </SourceCard>
        </div>
      ) : null}
    </section>
  );
}

function SourceCard<T>({
  source,
  block,
  children,
}: {
  source: SourceKey;
  block: SourceBlock<T>;
  children: (data: T) => ReactNode;
}) {
  const dateLabel = SOURCE_DATE_LABELS[source];
  const sourceLine = [
    `Source : ${SOURCE_NAMES[source]}`,
    block.state !== 'unavailable' && block.sourceDate && dateLabel
      ? `${dateLabel} ${day(block.sourceDate)}`
      : null,
    `lu le ${day(block.readAt)}`,
  ]
    .filter(Boolean)
    .join(' · ');
  return (
    <div
      className="flex flex-col gap-2 rounded-xl border border-zinc-200 p-4 stage:border-white/10"
      data-testid={`address-dossier-${source}`}
      data-state={block.state}
    >
      <h3 className="font-title text-base font-semibold text-zinc-900 stage:text-white">
        {SOURCE_TITLES[source]}
      </h3>
      {block.state === 'ok' ? (
        <>
          {children(block.data)}
          {block.failedAt ? (
            <p className="text-xs font-medium text-amber-700">
              La source n’a pas répondu le {day(block.failedAt)} : voici la lecture du{' '}
              {day(block.readAt)}.
            </p>
          ) : null}
        </>
      ) : block.state === 'empty' ? (
        <p className="text-sm text-zinc-600 stage:text-white/70">
          {block.note ? EMPTY_NOTES[block.note] : EMPTY_TEXTS[source]}
        </p>
      ) : (
        <p className="text-sm font-medium text-amber-700">
          La source n’a pas répondu : réessayez avec « Actualiser ».
        </p>
      )}
      <p className="text-xs text-zinc-500 stage:text-white/50">{sourceLine}</p>
    </div>
  );
}

const TYPE_PLURAL = { house: 'maisons', apartment: 'appartements' } as const;

function Sales({
  data,
  advisorAnalysis,
  surface,
}: {
  data: SalesData;
  advisorAnalysis: number | null;
  surface: number | null;
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className={hintText}>
        Ventes de {TYPE_PLURAL[data.propertyType]} à {radiusLabel(data.radiusM)}, sur les trois
        dernières années{data.radiusM === 1000 ? ' (moins de 5 ventes à 500 m)' : ''}.
      </p>
      {data.stats ? (
        <div className="flex flex-col gap-0.5">
          <p className="font-title text-lg font-semibold text-zinc-900 stage:text-white">
            Médiane {formatEuroPerSquareMeter(data.stats.median)}
          </p>
          <p className="text-sm text-zinc-700 stage:text-white/80">
            {middleHalfLabel(data.stats)} · {formatNumber(data.stats.count)} ventes
          </p>
        </div>
      ) : null}
      <p
        className="text-sm text-zinc-700 stage:text-white/80"
        data-testid="address-dossier-placement"
      >
        {priceLine(
          { radiusM: data.radiusM, count: data.count, stats: data.stats, surface },
          advisorAnalysis,
        )}
      </p>
      {data.recent.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[28rem] text-left text-sm">
            <thead className="text-xs text-zinc-500 stage:text-white/50">
              <tr>
                <th className="py-1 pr-3 font-medium">Date</th>
                <th className="py-1 pr-3 font-medium">Prix</th>
                <th className="py-1 pr-3 font-medium">Surface</th>
                <th className="py-1 pr-3 font-medium">Prix au m²</th>
                <th className="py-1 pr-3 font-medium">Pièces</th>
                <th className="py-1 font-medium">Distance</th>
              </tr>
            </thead>
            <tbody>
              {data.recent.map((sale, index) => (
                <tr
                  key={`${sale.date}-${index}`}
                  className="border-t border-zinc-100 stage:border-white/10"
                >
                  <td className="py-1 pr-3">{day(sale.date)}</td>
                  <td className="py-1 pr-3">{formatEuro(sale.price)}</td>
                  <td className="py-1 pr-3">{formatSquareMeters(sale.surface)}</td>
                  <td className="py-1 pr-3">{formatEuroPerSquareMeter(sale.pricePerM2)}</td>
                  <td className="py-1 pr-3">{sale.rooms ?? ''}</td>
                  <td className="py-1">{formatNumber(sale.distanceM)} m</td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.count > data.recent.length ? (
            <p className="mt-1 text-xs text-zinc-500 stage:text-white/50">
              Les {data.recent.length} plus récentes sur {formatNumber(data.count)}.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

const BUILDING_TYPES = {
  maison: 'une maison',
  appartement: 'un appartement',
  immeuble: 'l’immeuble',
};

function Dpe({ data, energyRating }: { data: DpeData; energyRating: string | null }) {
  const entered = energyRating && /^[A-G]$/.test(energyRating) ? energyRating : null;
  const facts = [
    data.ges ? `GES ${data.ges}` : null,
    `du ${day(data.date)}`,
    data.surface ? formatSquareMeters(data.surface) : null,
    data.buildingType ? BUILDING_TYPES[data.buildingType] : null,
  ].filter(Boolean);
  return (
    <div className="flex flex-col gap-1">
      <p className="font-title text-lg font-semibold text-zinc-900 stage:text-white">
        DPE {data.energy}
      </p>
      <p className="text-sm text-zinc-700 stage:text-white/80">
        Le plus récent : {facts.join(', ')}
        {data.count > 1 ? ` · ${formatNumber(data.count)} DPE à cette adresse` : ''}.
      </p>
      <p
        className="text-sm text-zinc-700 stage:text-white/80"
        data-testid="address-dossier-dpe-compare"
      >
        {entered == null
          ? 'Aucune classe DPE saisie sur la fiche.'
          : `Vous avez saisi ${entered}, ${data.buildingType === 'maison' ? 'l’ADEME indique' : 'le DPE le plus récent de l’adresse (peut-être un autre logement) indique'} ${entered === data.energy ? 'la même classe' : data.energy}.`}
      </p>
    </div>
  );
}

function Risks({ data }: { data: RisksData }) {
  const lines = [
    data.communeRisks.length > 0
      ? `Risques connus sur la commune : ${data.communeRisks.join(', ')}`
      : null,
    data.seismicZone ? `Sismicité : zone ${data.seismicZone.toLowerCase()}` : null,
    data.radonClass ? `Radon : potentiel de catégorie ${data.radonClass} (sur 3)` : null,
    data.clayExposure
      ? `Retrait-gonflement des argiles : ${data.clayExposure.toLowerCase()}`
      : null,
    `Sites pollués ou anciens sites industriels à moins de 500 m : ${formatNumber(data.pollutedSites)}`,
    `Mouvements de terrain recensés à moins de 500 m : ${formatNumber(data.groundMovements)}`,
  ].filter((line): line is string => line != null);
  return (
    <div className="flex flex-col gap-1">
      <ul className="flex list-disc flex-col gap-0.5 pl-5 text-sm text-zinc-700 stage:text-white/80">
        {lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      <p className="text-xs text-zinc-500 stage:text-white/50">
        Ce que l’acquéreur retrouvera dans l’état des risques remis à la vente.
      </p>
    </div>
  );
}

function Urbanism({ data }: { data: UrbanismData }) {
  return (
    <div className="flex flex-col gap-1 text-sm text-zinc-700 stage:text-white/80">
      <p>
        {data.zone
          ? `Zone du PLU : ${data.zone.code}${data.zone.label ? ` — ${data.zone.label}` : ''}`
          : 'Zone du PLU non publiée à cette adresse.'}
      </p>
      {data.servitudes.length > 0 ? (
        <ul className="flex list-disc flex-col gap-0.5 pl-5">
          {data.servitudes.map((servitude) => (
            <li key={`${servitude.code}-${servitude.name ?? ''}`}>
              {servitude.label}
              {servitude.name ? ` : ${servitude.name}` : ''}
            </li>
          ))}
        </ul>
      ) : (
        <p>Aucune servitude d’utilité publique publiée à cette adresse.</p>
      )}
    </div>
  );
}

function Parcel({ data }: { data: ParcelData }) {
  return (
    <p className="text-sm text-zinc-700 stage:text-white/80">
      Section {data.section}, n° {data.number}
      {data.area ? `, ${formatSquareMeters(data.area)}` : ''}.
    </p>
  );
}

function Condo({ data }: { data: CondoData }) {
  const lots =
    data.lots != null
      ? `${formatNumber(data.lots)} lots${data.housingLots != null ? `, dont ${formatNumber(data.housingLots)} d’habitation` : ''}`
      : null;
  const syndic =
    data.syndic.kind === 'professional'
      ? `Syndic professionnel${data.syndic.name ? ` : ${data.syndic.name}` : ''}`
      : data.syndic.kind === 'volunteer'
        ? 'Syndic bénévole'
        : 'Syndic non connu du registre';
  return (
    <ul className="flex list-disc flex-col gap-0.5 pl-5 text-sm text-zinc-700 stage:text-white/80">
      {data.name ? <li>{data.name}</li> : null}
      {lots ? <li>{lots}</li> : null}
      {data.period ? <li>Construite {data.period}</li> : null}
      <li>{syndic}</li>
      <li>Procédures : non publiées par le registre</li>
    </ul>
  );
}
