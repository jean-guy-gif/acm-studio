'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';

import {
  badgeBrand,
  btnSecondary,
  card,
  errorText,
  fieldLabel,
  hintText,
  inputBase,
  link,
  sectionTitle,
} from '@/components/ui/styles';
import type { AddressViewState } from '@/features/academia/queries/read-address-view';
import type {
  AcademiaPropertyView,
  IndicativeValue,
  SourceInfo,
} from '@/features/academia/services/property-view';
import { groupDigits, priceDigits } from '@/features/live-seller/components/price-input';
import { saveAdvisorRange } from '@/features/subject-property/actions/save-advisor-range';
import {
  formatDay,
  formatEuro,
  formatEuroPerSquareMeter,
  formatNumber,
  formatSquareMeters,
} from '@/lib/format';

// Mission 158 — le dossier d'adresse d'Academia sur « Avant le rendez-vous », pour le conseiller
// seul (planches M158-1 et M158-2) : la valeur indicative d'Academia, jamais montrée au vendeur ni
// enregistrée ; « Votre fourchette », la même que celle de Bien vendeur (M38), vide tant que le
// conseiller ne l'a pas saisie ou reprise par son geste ; les ventes réelles et les autres blocs,
// chacun avec sa source et sa date.

const NB = ' ';
const day = (value: string | null) =>
  value && !Number.isNaN(Date.parse(value)) ? formatDay(value, 'fr', 'numeric') : null;
const andList = (items: string[]) =>
  items.length > 1
    ? `${items.slice(0, -1).join(', ')} et ${items[items.length - 1]}`
    : (items[0] ?? '');
const plural = (count: number, one: string, many: string) => (count > 1 ? many : one);
// « 4 - MOYENNE » : « zone 4, moyenne ».
const earthquakeLabel = (value: string) => {
  const match = /^(\d)\s*-\s*(.+)$/.exec(value.trim());
  return match ? `zone ${match[1]}, ${match[2].toLowerCase()}` : value.toLowerCase();
};
const meters = (value: number) => `${formatNumber(value)}${NB}m`;

function Source({ info }: { info: SourceInfo }) {
  const when = day(info.date);
  return info.source ? (
    <p className="text-xs text-zinc-500">
      {info.source}
      {when ? ` · données du ${when}` : ''}
    </p>
  ) : null;
}

function Block({
  title,
  info,
  children,
  hideNote = false,
}: {
  title: string;
  info: SourceInfo;
  children: React.ReactNode;
  // La note d'Academia déjà dite autrement dans le bloc (les permis de démolir).
  hideNote?: boolean;
}) {
  return (
    <section
      className={`${card} flex min-w-0 flex-col gap-1.5 p-4`}
      data-testid="address-view-block"
    >
      <h3 className="font-title text-base font-semibold text-zinc-900">{title}</h3>
      {info.ok ? (
        children
      ) : (
        <p className="text-sm text-amber-700">La source n’a pas pu être lue pour cette adresse.</p>
      )}
      {info.ok && info.note && !hideNote ? (
        <p className="text-sm font-medium text-amber-700">{info.note}</p>
      ) : null}
      <Source info={info} />
    </section>
  );
}

function Indicative({ value }: { value: IndicativeValue }) {
  return (
    <div className="flex flex-col gap-1.5" data-testid="indicative-value">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-title text-lg font-semibold text-zinc-900">
          Valeur indicative d’Academia
        </h3>
        <span className={badgeBrand}>Pour vous seul</span>
      </div>
      <p className="font-title text-2xl font-bold text-zinc-900">
        {formatEuro(value.low)} à {formatEuro(value.high)}
      </p>
      <p className="text-sm text-zinc-600">
        {[
          value.middle != null ? `milieu ${formatEuro(value.middle)}` : null,
          value.pricePerSquareMeter != null
            ? formatEuroPerSquareMeter(value.pricePerSquareMeter)
            : null,
          value.reliability ? `fiabilité ${value.reliability}` : null,
        ]
          .filter(Boolean)
          .join(' · ')}
      </p>
      {value.mention ? <p className="text-sm text-zinc-700">« {value.mention} »</p> : null}
      <p className="text-sm text-zinc-700">
        Calculée par Academia sur des ventes DVF autour du bien.
      </p>
      <p className="text-sm font-semibold text-indigo-800" data-testid="indicative-never-shown">
        Jamais montrée au vendeur.
      </p>
    </div>
  );
}

// L'état d'un permis, tel que la source le code (« termine »), écrit en français.
const PERMIT_STATES: Record<string, string> = {
  autorise: 'autorisé',
  commence: 'travaux commencés',
  termine: 'terminé',
};
function permitStateLabel(state: string | null): string | null {
  if (!state) return null;
  return PERMIT_STATES[state] ?? null;
}

// « Votre fourchette » : vide tant que le conseiller ne l'a pas saisie ou reprise lui-même.
function YourRange({
  projectId,
  saved,
  indicative,
}: {
  projectId: string;
  saved: { min: number | null; max: number | null };
  indicative: IndicativeValue | null;
}) {
  const [min, setMin] = useState(saved.min != null ? String(saved.min) : '');
  const [max, setMax] = useState(saved.max != null ? String(saved.max) : '');
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const save = () =>
    startTransition(async () => {
      const result = await saveAdvisorRange(projectId, min, max);
      setMessage(
        result.ok
          ? { ok: true, text: 'Fourchette enregistrée' }
          : { ok: false, text: result.error },
      );
    });
  return (
    <div className="flex flex-col gap-2 border-t border-zinc-200 pt-3" data-testid="your-range">
      {indicative ? (
        <button
          type="button"
          className={`${btnSecondary} self-start text-sm`}
          onClick={() => {
            setMin(String(indicative.low));
            setMax(String(indicative.high));
            setMessage(null);
          }}
          data-testid="take-indicative"
        >
          Reprendre comme point de départ de votre fourchette
        </button>
      ) : null}
      {/* Les deux montants toujours sur la même ligne, écrits avec l'espace des milliers
          (« 690 000 »), comme partout ailleurs ; la valeur envoyée reste le nombre seul. */}
      <label htmlFor="your-range-min" className={fieldLabel}>
        Votre fourchette
      </label>
      <div className="flex flex-nowrap items-center gap-2">
        <input
          id="your-range-min"
          inputMode="numeric"
          autoComplete="off"
          className={`${inputBase} w-32 min-w-0 text-right tabular-nums`}
          value={groupDigits(min, 'fr')}
          placeholder="—"
          aria-label="Bas de votre fourchette"
          onChange={(event) => setMin(priceDigits(event.target.value))}
          data-testid="your-range-min"
        />
        <span className="text-sm text-zinc-600">à</span>
        <input
          inputMode="numeric"
          autoComplete="off"
          className={`${inputBase} w-32 min-w-0 text-right tabular-nums`}
          value={groupDigits(max, 'fr')}
          placeholder="—"
          aria-label="Haut de votre fourchette"
          onChange={(event) => setMax(priceDigits(event.target.value))}
          data-testid="your-range-max"
        />
        <span className="text-sm text-zinc-600">€</span>
      </div>
      <button
        type="button"
        className={`${btnSecondary} self-start text-sm`}
        disabled={pending}
        onClick={save}
        data-testid="your-range-save"
      >
        {pending ? 'Enregistrement…' : 'Enregistrer la fourchette'}
      </button>
      <p className={hintText}>Modifiable, c’est la seule enregistrée.</p>
      {message ? (
        <p
          className={message.ok ? 'text-sm font-medium text-emerald-700' : errorText}
          role={message.ok ? 'status' : 'alert'}
        >
          {message.text}
        </p>
      ) : null}
    </div>
  );
}

function Sales({ sales }: { sales: NonNullable<AcademiaPropertyView['sales']> }) {
  const [all, setAll] = useState(false);
  const shown = all ? sales.list : sales.list.slice(0, 8);
  const what = [
    sales.type === 'maison' ? 'Maisons' : sales.type === 'appartement' ? 'Appartements' : 'Biens',
    sales.rooms != null ? `de ${sales.rooms} pièces` : null,
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <section className={`${card} flex flex-col gap-2 p-4 sm:p-5`} data-testid="address-view-sales">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-title text-lg font-semibold text-zinc-900">
          Ventes réelles autour du bien
        </h3>
        {sales.since ? (
          <span className="text-sm text-zinc-500">
            {what.toLowerCase()} · depuis {sales.since}
          </span>
        ) : null}
      </div>
      {!sales.ok ? (
        <p className="text-sm text-amber-700">La source n’a pas pu être lue pour cette adresse.</p>
      ) : (
        <>
          {sales.atAddress ? (
            <p className="rounded-lg bg-zinc-100 px-3 py-1.5 text-sm text-zinc-800">
              À l’adresse même :{' '}
              {[
                sales.atAddress.type,
                sales.atAddress.rooms != null ? `${sales.atAddress.rooms} pièces` : null,
                sales.atAddress.surface != null
                  ? formatSquareMeters(sales.atAddress.surface)
                  : null,
              ]
                .filter(Boolean)
                .join(', ')}
              , {sales.atAddress.type === 'maison' ? 'vendue' : 'vendu'}{' '}
              {formatEuro(sales.atAddress.price)}
              {day(sales.atAddress.date) ? ` le ${day(sales.atAddress.date)}` : ''}
              {sales.atAddress.pricePerSquareMeter != null
                ? ` (${formatEuroPerSquareMeter(sales.atAddress.pricePerSquareMeter)})`
                : ''}
              .
            </p>
          ) : null}
          {sales.rings.length > 0 ? (
            <div
              className="flex flex-wrap items-center gap-1.5 text-sm"
              data-testid="address-view-rings"
            >
              <span className="text-zinc-600">
                {what} {sales.type === 'maison' ? 'vendues' : 'vendus'}
                {sales.since ? ` depuis ${sales.since}` : ''}, à moins de
              </span>
              {sales.rings.map((ring) => (
                <span
                  key={ring.radius}
                  className={`rounded-full border px-2 py-0.5 text-xs ${
                    ring.radius === sales.listRadius
                      ? 'border-indigo-200 bg-indigo-50'
                      : 'border-zinc-200 bg-zinc-50'
                  }`}
                >
                  {meters(ring.radius)} · <b>{ring.sales}</b>
                </span>
              ))}
              {sales.listRadius != null ? (
                <span className="text-zinc-600">
                  la liste ci-dessous : celles à moins de {meters(sales.listRadius)}
                </span>
              ) : null}
            </div>
          ) : null}
          {shown.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="text-left text-xs tracking-wide text-zinc-500 uppercase">
                    <th className="py-1 pr-2 font-medium">Date</th>
                    <th className="py-1 pr-2 font-medium">Rue</th>
                    <th className="py-1 pr-2 font-medium">Pièces</th>
                    <th className="py-1 pr-2 font-medium">Surface</th>
                    <th className="py-1 pr-2 font-medium">Terrain</th>
                    <th className="py-1 pr-2 font-medium">Prix</th>
                    <th className="py-1 pr-2 font-medium">€/m²</th>
                    <th className="py-1 font-medium">Distance</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((sale, index) => (
                    <tr key={`${sale.date}-${index}`} className="border-t border-zinc-100">
                      <td className="py-1 pr-2">{day(sale.date)}</td>
                      <td className="py-1 pr-2">{sale.street ?? ''}</td>
                      <td className="py-1 pr-2">{sale.rooms ?? ''}</td>
                      <td className="py-1 pr-2">
                        {sale.surface != null ? formatSquareMeters(sale.surface) : ''}
                      </td>
                      <td className="py-1 pr-2">
                        {sale.land != null ? formatSquareMeters(sale.land) : ''}
                      </td>
                      <td className="py-1 pr-2 font-semibold">{formatEuro(sale.price)}</td>
                      <td className="py-1 pr-2">
                        {sale.pricePerSquareMeter != null
                          ? formatEuroPerSquareMeter(sale.pricePerSquareMeter)
                          : ''}
                      </td>
                      <td className="py-1">{sale.distance != null ? meters(sale.distance) : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className={hintText}>Aucune vente comparable relevée autour du bien.</p>
          )}
          {sales.list.length > 8 ? (
            <button
              type="button"
              className={`${link} self-start text-sm`}
              onClick={() => setAll((value) => !value)}
            >
              {all ? 'Voir moins' : `+ ${sales.list.length - 8} autres ventes · Voir tout`}
            </button>
          ) : null}
        </>
      )}
      <Source info={sales} />
    </section>
  );
}

function OtherBlocks({ view, demo }: { view: AcademiaPropertyView; demo: boolean }) {
  const { dpe, planning, permits, risks, population, condominium } = view;
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {dpe ? (
        <Block title="DPE de l’adresse" info={dpe}>
          {dpe.latest ? (
            <p className="text-sm text-zinc-800">
              {[
                dpe.latest.label ? `Étiquette ${dpe.latest.label}` : null,
                day(dpe.latest.date) ? `le ${day(dpe.latest.date)}` : null,
                dpe.latest.type,
                dpe.latest.surface != null ? formatSquareMeters(dpe.latest.surface) : null,
                dpe.latest.year != null ? `construit en ${dpe.latest.year}` : null,
              ]
                .filter(Boolean)
                .join(', ')}
            </p>
          ) : (
            <p className="text-sm text-zinc-800">Aucun DPE relevé à l’adresse.</p>
          )}
        </Block>
      ) : null}
      {planning ? (
        <Block title="Urbanisme" info={planning}>
          {planning.sentence ? <p className="text-sm text-zinc-800">{planning.sentence}</p> : null}
          {planning.parcel || risks?.planningZone ? (
            <p className="text-sm text-zinc-500">
              {[planning.parcel ? `Parcelle ${planning.parcel}` : null, risks?.planningZone]
                .filter(Boolean)
                .join(' · ')}
            </p>
          ) : null}
        </Block>
      ) : null}
      {permits ? (
        <Block title="Permis autour" info={permits} hideNote={permits.demolitionUnchecked}>
          <p className="text-sm text-zinc-800">
            {permits.build.length === 0
              ? `Aucun permis de construire relevé${permits.radius ? ` à moins de ${meters(permits.radius)}` : ''}.`
              : `${permits.build.length} permis de construire${permits.radius ? ` à moins de ${meters(permits.radius)}` : ''}${permits.since ? ` depuis ${permits.since}` : ''} : ${permits.build
                  .map((permit) =>
                    [
                      permit.dwellings != null
                        ? `${permit.dwellings} logement${permit.dwellings > 1 ? 's' : ''}`
                        : null,
                      permit.address,
                      permitStateLabel(permit.state),
                      permit.distance != null ? `à ${meters(permit.distance)}` : null,
                    ]
                      .filter(Boolean)
                      .join(', '),
                  )
                  .join(' ; ')}.`}
          </p>
          {permits.demolitionUnchecked ? (
            <p className="text-sm font-medium text-amber-700">Permis de démolir non vérifiés.</p>
          ) : null}
        </Block>
      ) : null}
      {risks ? (
        <Block title="Risques" info={risks}>
          <p className="text-sm text-zinc-800">
            {[
              risks.clay ? `Argiles (à l’adresse du bien) : ${risks.clay.toLowerCase()}` : null,
              risks.earthquake
                ? `Séisme (la commune) : ${earthquakeLabel(risks.earthquake)}`
                : null,
              risks.radon ? `Radon (la commune) : catégorie ${risks.radon}` : null,
              risks.floodArea ? `Inondation : commune classée, ${risks.floodArea}` : null,
              risks.disasters
                ? `${risks.disasters.count} catastrophe${risks.disasters.count > 1 ? 's' : ''} naturelle${risks.disasters.count > 1 ? 's' : ''} reconnue${risks.disasters.count > 1 ? 's' : ''}${risks.disasters.latest ? `, la dernière le ${day(risks.disasters.latest)}` : ''} (la commune)`
                : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </Block>
      ) : null}
      {population ? (
        <Block
          title={`Population${population.radius ? ` à ${meters(population.radius)}` : ''}`}
          info={population}
        >
          <p className="text-sm text-zinc-800">
            {[
              population.inhabitants != null
                ? `${formatNumber(population.inhabitants)} habitants`
                : null,
              population.households != null
                ? `${formatNumber(population.households)} ménages`
                : null,
              population.peoplePerHousehold != null
                ? `${formatNumber(population.peoplePerHousehold)} personnes par ménage`
                : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </Block>
      ) : null}
      {condominium ? (
        <Block title="Copropriété" info={condominium}>
          <p className="text-sm text-zinc-800">
            {[
              // Le nom de la copropriété fictive de la démo n'est pas écrit (M114).
              !demo && condominium.name ? condominium.name : null,
              condominium.dwellingLots != null
                ? `${condominium.dwellingLots} ${plural(condominium.dwellingLots, 'lot', 'lots')} d’habitation`
                : null,
              condominium.builtPeriod
                ? `construite entre ${condominium.builtPeriod.replace('-', ' et ')}`
                : null,
              condominium.syndicMandateEnded
                ? `mandat de syndic ${condominium.syndicMandateActive ? 'jusqu’au' : 'terminé le'} ${day(condominium.syndicMandateEnded)}`
                : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </Block>
      ) : null}
    </div>
  );
}

export function AddressViewPanel({
  projectId,
  state,
  savedRange,
  demo,
}: {
  projectId: string;
  state: AddressViewState;
  savedRange: { min: number | null; max: number | null };
  demo: boolean;
}) {
  // Sans accès à Academia (une vraie agence, tant que l'interrupteur est éteint) : rien, comme sur
  // la maquette (« jamais un bloc vide »).
  if (state.kind === 'closed') return null;
  const view = state.kind === 'ready' ? state.view : null;
  return (
    <section className="@container flex flex-col gap-3" data-testid="address-view">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className={sectionTitle}>Dossier d’adresse</h2>
        <span className={badgeBrand}>Pour vous seul</span>
      </div>
      {state.kind === 'ready' ? (
        <p className={hintText}>
          Ce qu’Academia sait de l’adresse du bien, calculé pour{' '}
          {state.facts.type === 'maison' ? 'une maison' : 'un appartement'} de {state.facts.rooms}{' '}
          {plural(state.facts.rooms, 'pièce', 'pièces')} et{' '}
          {formatSquareMeters(state.facts.surface)}. Rien de ce bloc ne part vers le vendeur.
        </p>
      ) : null}
      {state.kind === 'none' ? (
        <p className={hintText} data-testid="address-view-none">
          Le dossier d’adresse d’Academia arrive avec le lien « Vivre ici ».{' '}
          <Link href={`/builder/${projectId}/property`} className={link}>
            Créez le dossier d’adresse depuis Bien vendeur
          </Link>
        </p>
      ) : null}
      {state.kind === 'waiting' ? (
        <p className={hintText} data-testid="address-view-waiting">
          Academia prépare le dossier d’adresse : il apparaîtra ici à la prochaine ouverture de la
          page.
        </p>
      ) : null}
      {state.kind === 'request_failed' ? (
        <p className={hintText} data-testid="address-view-request-failed">
          Academia n’a pas pu préparer le dossier d’adresse.{' '}
          <Link href={`/builder/${projectId}/property`} className={link}>
            Recréez le lien « Vivre ici » depuis Bien vendeur
          </Link>
        </p>
      ) : null}
      {state.kind === 'missing_facts' ? (
        <p className={hintText} data-testid="address-view-missing">
          Pour lire le dossier d’adresse, indiquez sur{' '}
          <Link href={`/builder/${projectId}/property`} className={link}>
            Bien vendeur
          </Link>{' '}
          {andList(
            state.missing.map((missing) =>
              missing === 'type'
                ? 'le type (maison ou appartement)'
                : missing === 'rooms'
                  ? 'le nombre de pièces'
                  : 'la surface',
            ),
          )}
          .
        </p>
      ) : null}
      {state.kind === 'failed' ? (
        <p className={errorText} role="alert" data-testid="address-view-failed">
          Le dossier d’adresse d’Academia n’a pas pu être lu : rechargez la page dans un moment.
        </p>
      ) : null}
      {view ? (
        <div className="grid grid-cols-1 gap-3 @4xl:grid-cols-[minmax(0,26rem)_1fr]">
          <section className={`${card} flex flex-col gap-3 p-4 sm:p-5`}>
            {view.indicative ? <Indicative value={view.indicative} /> : null}
            <YourRange projectId={projectId} saved={savedRange} indicative={view.indicative} />
            {view.indicative ? (
              <p className="text-xs text-zinc-500">
                Academia · calcul sur les ventes DVF
                {day(view.indicative.date) ? ` · ${day(view.indicative.date)}` : ''}
              </p>
            ) : null}
          </section>
          <OtherBlocks view={view} demo={demo} />
        </div>
      ) : null}
      {view?.sales ? <Sales sales={view.sales} /> : null}
    </section>
  );
}
