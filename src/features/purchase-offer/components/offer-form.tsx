'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';

import {
  btnPrimary,
  btnSecondary,
  card,
  errorText,
  fieldLabel,
  hintText,
  inputBase,
  sectionTitle,
} from '@/components/ui/styles';
import { signPurchaseOffer } from '@/features/purchase-offer/actions/sign-offer';
import { OfferShare } from '@/features/purchase-offer/components/offer-share';
import type { OfferContext } from '@/features/purchase-offer/queries/get-offer-context';
import { numberInWords } from '@/features/purchase-offer/services/amount-in-words';
import { frenchDay } from '@/features/purchase-offer/services/offer-dates';
import {
  OFFRE_AVEC_PRET_VALIDEE,
  renderOffer,
} from '@/features/purchase-offer/services/offer-text';
import { documentToText } from '@/features/visit-voucher/services/voucher-text';
import {
  draftTitle,
  initialTitleDraft,
  OutsideTitleFields,
  type TitleDraft,
} from '@/features/visit-voucher/components/outside-title-fields';
import { SignaturePad } from '@/features/visit-voucher/components/signature-pad';
import { OUTSIDE_FEES_REMINDER } from '@/features/visit-voucher/services/outside-mandate';
import { parisDateLabel } from '@/features/visit-voucher/services/voucher-fields';

type Offrant = {
  civility: 'M.' | 'Mme';
  lastName: string;
  firstNames: string;
  birthDate: string;
  birthPlace: string;
  nationality: string;
  profession: string;
};
type Parcel = { prefix: string; section: string; number: string; lieudit: string; area: string };
type Lot = { number: string; description: string; shares: string; base: string };

const EMPTY_OFFRANT: Offrant = {
  civility: 'M.',
  lastName: '',
  firstNames: '',
  birthDate: '',
  birthPlace: '',
  nationality: 'française',
  profession: '',
};
const EMPTY_PARCEL: Parcel = { prefix: '', section: '', number: '', lieudit: '', area: '' };
const EMPTY_LOT: Lot = { number: '', description: '', shares: '', base: '1000' };

// « 1 639 500 », « 1 639 500,50 » : l'euro entier.
const euros = (value: string): number => {
  const clean = value.replace(/[\s  €]/g, '').replace(',', '.');
  const amount = Number(clean);
  return clean && Number.isFinite(amount) ? Math.round(amount) : 0;
};
const integer = (value: string): number => Number(value.replace(/[^\d]/g, '') || 0);

// AAAA-MM-JJ à Paris, décalé de N jours.
const parisDay = (offset: number): string => {
  const [day, month, year] = parisDateLabel(new Date(Date.now() + offset * 86_400_000)).split('/');
  return `${year}-${month}-${day}`;
};

// Le découpage que le bouton annonce, puis écrit : le dernier mot pour le nom, le reste pour les
// prénoms ; le conseiller le voit avant de toucher et le corrige ensuite (relecteur).
const splitName = (name: string): { firstNames: string; lastName: string } => {
  const words = name.trim().split(/\s+/);
  return words.length > 1
    ? { firstNames: words.slice(0, -1).join(' '), lastName: words[words.length - 1]! }
    : { firstNames: '', lastName: words[0] ?? '' };
};

// Mission 154 — un bon récent garde prénom et nom séparés : repris tels quels ; un bon plus ancien
// n'a que le nom entier, découpé comme le bouton l'annonce.
const voucherVisitorName = (entry: {
  name: string;
  firstName?: string;
  lastName?: string;
}): { firstNames: string; lastName: string } =>
  entry.firstName && entry.lastName
    ? { firstNames: entry.firstName, lastName: entry.lastName }
    : splitName(entry.name);

const visitor = (entry: { civility: string; name: string }): string =>
  `${entry.civility} ${entry.name.trim()}`;

const inWords = (value: number): string =>
  value >= 1 && value <= 9_999_999 ? `${numberInWords(value)} euros` : '';

// Mission 137 (partie B) — l'offre d'achat, sur un seul écran : la visite « Offre envisagée » d'un
// bien en mandat signé ; les offrants (deux au plus, pré-remplis depuis la dernière offre de la
// fiche) ; le prix offert (le prix de commercialisation pour départ, en lettres calculé par ACM), les
// honoraires et leur charge, l'acompte ; le financement (sans prêt : l'option « avec prêt » attend le
// juriste) ; les dates ; le cadastre et les lots d'une copropriété ; l'agent commercial s'il y en a
// un ; la signature au doigt de chaque offrant.
export function OfferForm({
  context,
  preselected,
}: {
  context: OfferContext;
  preselected: string | null;
}) {
  const eligible = context.visits.filter((visit) => visit.eligible);
  const [visitId, setVisitId] = useState<string>(
    preselected && eligible.some((visit) => visit.visitId === preselected)
      ? preselected
      : (eligible[0]?.visitId ?? ''),
  );
  const visit = context.visits.find((entry) => entry.visitId === visitId) ?? null;
  const [offrants, setOffrants] = useState<Offrant[]>(
    context.last?.offrants.map((offrant) => ({ ...offrant })) ?? [{ ...EMPTY_OFFRANT }],
  );
  // Mission 154 — l'adresse des offrants : celle de la dernière offre, sinon du dernier bon.
  const [address, setAddress] = useState(
    context.last?.address ?? context.lastVoucher?.address ?? '',
  );
  const [matrimonial, setMatrimonial] = useState(context.last?.matrimonial ?? '');
  const [fiscalFrance, setFiscalFrance] = useState(context.last?.fiscalResidenceFrance ?? true);
  const [mandateNumber, setMandateNumber] = useState(visit?.mandateNumber ?? '');
  // Mission 153 — un bien hors mandat : le titre (repris du bon de la visite s'il y en a un) et
  // l'adresse du bien, saisie quand ACM ne la connaît pas.
  const [title, setTitle] = useState<TitleDraft>(() =>
    initialTitleDraft(visit?.suggestion ?? null, context.lastSearchTitle),
  );
  const [outsideAddress, setOutsideAddress] = useState(visit?.propertyAddress ?? '');
  const [outsideCondominium, setOutsideCondominium] = useState(false);
  const validTitle = visit?.outside ? draftTitle(title) : null;
  const [withAgent, setWithAgent] = useState(false);
  const [agent, setAgent] = useState({ name: '', rsac: '' });
  const [parcels, setParcels] = useState<Parcel[]>([{ ...EMPTY_PARCEL }]);
  const [totalArea, setTotalArea] = useState('');
  const [lots, setLots] = useState<Lot[]>([{ ...EMPTY_LOT }]);
  const [price, setPrice] = useState(visit?.price != null ? String(Math.round(visit.price)) : '');
  const [fees, setFees] = useState(visit?.fees != null ? String(Math.round(visit.fees)) : '');
  const [feesPaidBy, setFeesPaidBy] = useState<'seller' | 'buyer'>(visit?.feesPaidBy ?? 'seller');
  const [deposit, setDeposit] = useState('');
  const [validUntil, setValidUntil] = useState(parisDay(7));
  const [contractDeadline, setContractDeadline] = useState(parisDay(45));
  const [signatures, setSignatures] = useState<(string | null)[]>([null, null]);
  // « Lu et approuvé » vaut pour le texte relu : s'il change ensuite, la case se décoche.
  const [approvedText, setApprovedText] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{
    documentId: string;
    buyerLinkPath: string;
    sellerLinkPath: string;
  } | null>(null);

  if (done) {
    return (
      <section className={`${card} flex flex-col gap-3 p-5`} data-testid="offer-signed">
        <h2 className={sectionTitle}>Offre d’achat signée</h2>
        <p className={hintText}>Elle est gardée sur la fiche. Envoyez-la au vendeur.</p>
        {done.buyerLinkPath && done.sellerLinkPath ? (
          <OfferShare
            buyerLinkPath={done.buyerLinkPath}
            sellerLinkPath={done.sellerLinkPath}
            buyerEmail={context.buyer.email}
            sellerEmail={visit?.sellerEmail ?? null}
            sellerPhone={visit?.sellerPhone ?? null}
            sellerVia={validTitle?.kind === 'colleague' ? validTitle.agency : null}
            validUntil={frenchDay(validUntil)}
            advisorFirstName={context.advisorFirstName}
          />
        ) : (
          <p role="alert" className={errorText}>
            Les liens n’ont pas pu être créés : rechargez la page de l’offre.
          </p>
        )}
        <Link
          href={`/acquereurs/${context.buyer.id}/offre/${done.documentId}`}
          className={`${btnSecondary} self-start`}
        >
          Voir et imprimer l’offre
        </Link>
      </section>
    );
  }

  const outside = visit?.outside === true;
  const condominium = outside ? outsideCondominium : visit?.condominium === true;
  const propertyAddress = outside
    ? visit?.propertyAddress?.trim() || outsideAddress.trim() || null
    : (visit?.propertyAddress ?? null);
  // Le texte tel qu'il sera signé : le même rendu que le serveur, relu avant de signer.
  const preview =
    context.agency &&
    visit &&
    propertyAddress &&
    (!outside || validTitle) &&
    euros(price) > 0 &&
    euros(fees) > 0 &&
    euros(deposit) > 0
      ? documentToText(
          renderOffer({
            agency: context.agency,
            offrants: offrants.map((offrant) => ({
              ...offrant,
              birthDate: offrant.birthDate ? frenchDay(offrant.birthDate) : '',
            })),
            address,
            matrimonial: matrimonial.trim() ? matrimonial : null,
            fiscalResidenceFrance: fiscalFrance,
            mandateNumber: outside ? '' : visit.mandateNumber?.trim() || mandateNumber,
            agent: withAgent ? agent : null,
            condominium,
            propertyAddress,
            parcels,
            totalArea,
            lots: condominium
              ? lots.map((lot) => ({
                  number: Math.max(1, integer(lot.number)),
                  description: lot.description,
                  shares: Math.max(1, integer(lot.shares)),
                  base: Math.max(1, integer(lot.base)),
                }))
              : [],
            price: Math.min(euros(price), 9_999_999),
            feesPaidBy,
            fees: Math.min(euros(fees), 9_999_999),
            financing: 'cash',
            loan: null,
            validUntil: frenchDay(validUntil),
            contractDeadline: frenchDay(contractDeadline),
            deposit: Math.min(euros(deposit), 9_999_999),
            title: validTitle,
          }),
        )
      : null;

  const approved = preview != null && approvedText === preview;

  const setOffrant = (index: number, patch: Partial<Offrant>) =>
    setOffrants((current) =>
      current.map((entry, at) => (at === index ? { ...entry, ...patch } : entry)),
    );
  const ready =
    visit != null &&
    (!outside || validTitle != null) &&
    approved &&
    signatures.slice(0, offrants.length).every((value) => value != null) &&
    euros(price) > 0 &&
    euros(fees) > 0 &&
    euros(deposit) > 0;

  const input = (
    label: string,
    value: string,
    onChange: (value: string) => void,
    options: { type?: string; testId?: string; hint?: string; inputMode?: 'numeric' } = {},
  ) => (
    <label className="flex flex-col gap-1">
      <span className={fieldLabel}>{label}</span>
      <input
        className={inputBase}
        type={options.type ?? 'text'}
        inputMode={options.inputMode}
        value={value}
        data-testid={options.testId}
        onChange={(event) => onChange(event.target.value)}
      />
      {options.hint ? <span className="text-xs text-zinc-500">{options.hint}</span> : null}
    </label>
  );

  return (
    <form
      className="flex flex-col gap-5"
      data-testid="offer-form"
      onSubmit={(event) => {
        event.preventDefault();
        if (!visit) return;
        setError(null);
        startTransition(async () => {
          const result = await signPurchaseOffer({
            buyerId: context.buyer.id,
            visitId: visit.visitId,
            offrants,
            address,
            matrimonial: matrimonial.trim() ? matrimonial : null,
            fiscalResidenceFrance: fiscalFrance,
            mandateNumber: outside ? '' : mandateNumber,
            title: validTitle,
            propertyAddress: outside ? propertyAddress : null,
            condominium: outside ? outsideCondominium : false,
            agent: withAgent ? agent : null,
            parcels,
            totalArea,
            lots: condominium
              ? lots.map((lot) => ({
                  number: integer(lot.number),
                  description: lot.description,
                  shares: integer(lot.shares),
                  base: integer(lot.base),
                }))
              : [],
            price: euros(price),
            fees: euros(fees),
            feesPaidBy,
            deposit: euros(deposit),
            financing: 'cash',
            validUntil,
            contractDeadline,
            signatures: signatures.slice(0, offrants.length),
            approved,
          }).catch(() => ({ ok: false as const, error: 'Connexion perdue : réessayez.' }));
          if (!result.ok) {
            setError(result.error);
            return;
          }
          setDone(result);
        });
      }}
    >
      <section className={`${card} flex flex-col gap-3 p-5`}>
        <h2 className={sectionTitle}>Le bien</h2>
        {eligible.length > 1 ? (
          <select
            className={inputBase}
            value={visitId}
            aria-label="Le bien de l’offre"
            onChange={(event) => {
              // Un autre bien : son n° de mandat, son prix et ses honoraires (rien du précédent).
              const next = context.visits.find((entry) => entry.visitId === event.target.value);
              setVisitId(event.target.value);
              setMandateNumber(next?.mandateNumber ?? '');
              setPrice(next?.price != null ? String(Math.round(next.price)) : '');
              setFees(next?.fees != null ? String(Math.round(next.fees)) : '');
              setFeesPaidBy(next?.feesPaidBy ?? 'seller');
              setTitle(initialTitleDraft(next?.suggestion ?? null, context.lastSearchTitle));
              setOutsideAddress(next?.propertyAddress ?? '');
              setOutsideCondominium(false);
            }}
          >
            {eligible.map((entry) => (
              <option key={entry.visitId} value={entry.visitId}>
                {entry.label}
              </option>
            ))}
          </select>
        ) : null}
        {visit ? (
          <p className="text-sm text-zinc-700" data-testid="offer-property">
            {visit.label} ·{' '}
            {outside
              ? 'hors mandat de l’agence'
              : (visit.propertyAddress ?? 'adresse à compléter sur la fiche du bien')}
            {condominium ? ' · en copropriété' : ''}
          </p>
        ) : null}
        {/* Mission 138 — une offre déjà acceptée sur ce bien : l'écran prévient, rien n'est bloqué. */}
        {visit?.acceptedOfferOn ? (
          <p
            className="text-sm font-semibold text-amber-800"
            role="status"
            data-testid="offer-already-accepted"
          >
            Une offre acceptée existe déjà sur ce bien (le {visit.acceptedOfferOn}).
          </p>
        ) : null}
        {outside ? (
          <>
            <OutsideTitleFields
              draft={title}
              onChange={setTitle}
              missingText="Choisissez à quel titre vous intervenez : sans lui, l’offre ne se prépare pas."
              colleagueHint={
                visit?.suggestion?.kind === 'colleague' && !visit.suggestion.agency
                  ? 'Collaboration obtenue, sur sa carte de Prospection.'
                  : visit?.suggestion
                    ? 'Repris du bon de visite.'
                    : null
              }
              searchHint={visit?.suggestion?.kind === 'search' ? 'Repris du bon de visite.' : null}
            />
            {visit?.propertyAddress ? (
              <p className="text-sm text-zinc-700" data-testid="offer-outside-address-known">
                Adresse du bien : {visit.propertyAddress}
              </p>
            ) : (
              input('Adresse du bien', outsideAddress, setOutsideAddress, {
                testId: 'offer-outside-address',
              })
            )}
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={outsideCondominium}
                data-testid="offer-outside-condominium"
                onChange={(event) => setOutsideCondominium(event.target.checked)}
              />
              Le bien est en copropriété (les lots se saisissent avec le cadastre)
            </label>
          </>
        ) : visit?.mandateNumber ? (
          <p className="text-sm text-zinc-700" data-testid="offer-mandate-known">
            N° de mandat : {visit.mandateNumber}
          </p>
        ) : (
          input('N° de mandat', mandateNumber, setMandateNumber, { testId: 'offer-mandate' })
        )}
      </section>

      <section className={`${card} flex flex-col gap-3 p-5`}>
        <h2 className={sectionTitle}>Les offrants</h2>
        {offrants.map((offrant, index) => (
          <fieldset
            key={index}
            className="grid grid-cols-1 gap-2 rounded-xl border border-zinc-200 p-3 sm:grid-cols-2"
          >
            <legend className="px-1 text-sm font-semibold text-zinc-800">
              Offrant {index + 1}
            </legend>
            {/* Mission 154 — le visiteur du dernier bon : une suggestion à confirmer d'un geste,
                jamais découpée en silence (le bon ne sépare pas nom et prénoms). */}
            {!context.last &&
            !offrant.lastName.trim() &&
            !offrant.firstNames.trim() &&
            context.lastVoucher?.visitors[index] ? (
              <button
                type="button"
                className={`${btnSecondary} self-start px-3 py-1.5 text-sm sm:col-span-2`}
                data-testid={`offer-take-visitor-${index + 1}`}
                onClick={() =>
                  setOffrant(index, {
                    civility: context.lastVoucher!.visitors[index]!.civility,
                    ...voucherVisitorName(context.lastVoucher!.visitors[index]!),
                  })
                }
              >
                Reprendre « {visitor(context.lastVoucher.visitors[index]!)} » du bon de visite :
                prénoms « {voucherVisitorName(context.lastVoucher.visitors[index]!).firstNames} »,
                nom « {voucherVisitorName(context.lastVoucher.visitors[index]!).lastName} »
              </button>
            ) : null}
            <label className="flex flex-col gap-1">
              <span className={fieldLabel}>Civilité</span>
              <select
                className={inputBase}
                value={offrant.civility}
                onChange={(event) =>
                  setOffrant(index, { civility: event.target.value as Offrant['civility'] })
                }
              >
                <option value="M.">M.</option>
                <option value="Mme">Mme</option>
              </select>
            </label>
            {input('Nom', offrant.lastName, (value) => setOffrant(index, { lastName: value }), {
              testId: `offer-lastname-${index + 1}`,
            })}
            {input(
              'Prénoms',
              offrant.firstNames,
              (value) => setOffrant(index, { firstNames: value }),
              {
                testId: `offer-firstnames-${index + 1}`,
              },
            )}
            {input(
              'Né(e) le',
              offrant.birthDate,
              (value) => setOffrant(index, { birthDate: value }),
              {
                type: 'date',
                testId: `offer-birthdate-${index + 1}`,
              },
            )}
            {input('À', offrant.birthPlace, (value) => setOffrant(index, { birthPlace: value }), {
              testId: `offer-birthplace-${index + 1}`,
            })}
            {input('Nationalité', offrant.nationality, (value) =>
              setOffrant(index, { nationality: value }),
            )}
            {input(
              'Profession',
              offrant.profession,
              (value) => setOffrant(index, { profession: value }),
              {
                testId: `offer-profession-${index + 1}`,
              },
            )}
          </fieldset>
        ))}
        {offrants.length < 2 ? (
          <button
            type="button"
            className={`${btnSecondary} self-start`}
            onClick={() =>
              setOffrants((current) => [...current, { ...EMPTY_OFFRANT, civility: 'Mme' }])
            }
          >
            Ajouter un second offrant
          </button>
        ) : (
          <button
            type="button"
            className={`${btnSecondary} self-start`}
            onClick={() => setOffrants((current) => current.slice(0, 1))}
          >
            Un seul offrant
          </button>
        )}
        {input('Adresse des offrants', address, setAddress, { testId: 'offer-address' })}
        {input('Situation matrimoniale et régime (facultatif)', matrimonial, setMatrimonial, {
          hint: '« mariés sous le régime de la communauté réduite aux acquêts le 12/06/2010 à Lyon »',
        })}
        <fieldset className="flex flex-wrap gap-4 text-sm">
          <legend className={fieldLabel}>Résidence fiscale</legend>
          <label className="flex items-center gap-2">
            <input type="radio" checked={fiscalFrance} onChange={() => setFiscalFrance(true)} />
            En France
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" checked={!fiscalFrance} onChange={() => setFiscalFrance(false)} />
            Hors de France
          </label>
        </fieldset>
      </section>

      <section className={`${card} flex flex-col gap-3 p-5`}>
        <h2 className={sectionTitle}>Le prix, les honoraires, l’acompte</h2>
        {input('Prix offert (€)', price, setPrice, {
          inputMode: 'numeric',
          testId: 'offer-price',
          hint: inWords(euros(price)),
        })}
        {input('Honoraires de l’agence (€)', fees, setFees, {
          inputMode: 'numeric',
          testId: 'offer-fees',
          hint: inWords(euros(fees)),
        })}
        <fieldset className="flex flex-wrap gap-4 text-sm">
          <legend className={fieldLabel}>Honoraires à la charge du</legend>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={feesPaidBy === 'seller'}
              onChange={() => setFeesPaidBy('seller')}
            />
            Vendeur
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={feesPaidBy === 'buyer'}
              onChange={() => setFeesPaidBy('buyer')}
            />
            Acquéreur
          </label>
        </fieldset>
        {/* Mission 153 — à l'écran seulement, jamais dans l'offre (Jean-Guy, 12/11). */}
        {outside && validTitle?.kind === 'search' && visit?.soldByAgency ? (
          <p
            className="rounded-lg border border-dashed border-amber-600 bg-amber-50 px-3 py-2 text-sm text-amber-800"
            role="note"
            data-testid="offer-fees-reminder"
          >
            {OUTSIDE_FEES_REMINDER}
          </p>
        ) : null}
        {input('Acompte (€)', deposit, setDeposit, {
          inputMode: 'numeric',
          testId: 'offer-deposit',
          hint: inWords(euros(deposit)),
        })}
        <p className={hintText}>
          Financement : sans prêt.
          {OFFRE_AVEC_PRET_VALIDEE
            ? ''
            : ' L’offre avec prêt sera proposée une fois sa clause validée par le juriste.'}
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {input('Offre valable jusqu’au', validUntil, setValidUntil, { type: 'date' })}
          {input('Avant-contrat au plus tard le', contractDeadline, setContractDeadline, {
            type: 'date',
          })}
        </div>
      </section>

      <section className={`${card} flex flex-col gap-3 p-5`}>
        <h2 className={sectionTitle}>La désignation cadastrale</h2>
        {parcels.map((parcel, index) => (
          <div key={index} className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {(['prefix', 'section', 'number', 'lieudit', 'area'] as const).map((key) => (
              <label key={key} className="flex flex-col gap-1">
                <span className={fieldLabel}>
                  {
                    {
                      prefix: 'Préfixe',
                      section: 'Section',
                      number: 'Numéro',
                      lieudit: 'Lieudit',
                      area: 'Contenance',
                    }[key]
                  }
                </span>
                <input
                  className={inputBase}
                  value={parcel[key]}
                  data-testid={`offer-parcel-${key}-${index + 1}`}
                  onChange={(event) =>
                    setParcels((current) =>
                      current.map((entry, at) =>
                        at === index ? { ...entry, [key]: event.target.value } : entry,
                      ),
                    )
                  }
                />
              </label>
            ))}
          </div>
        ))}
        <button
          type="button"
          className={`${btnSecondary} self-start`}
          onClick={() => setParcels((current) => [...current, { ...EMPTY_PARCEL }])}
        >
          Ajouter une parcelle
        </button>
        {input('Contenance totale', totalArea, setTotalArea, {
          testId: 'offer-total-area',
          hint: '« 18 a 40 ca »',
        })}
        {condominium ? (
          <>
            <h3 className="font-title text-base font-semibold text-zinc-900">Les lots</h3>
            {lots.map((lot, index) => (
              <div key={index} className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {input('N° du lot', lot.number, (value) =>
                  setLots((current) =>
                    current.map((entry, at) =>
                      at === index ? { ...entry, number: value } : entry,
                    ),
                  ),
                )}
                {input('Description', lot.description, (value) =>
                  setLots((current) =>
                    current.map((entry, at) =>
                      at === index ? { ...entry, description: value } : entry,
                    ),
                  ),
                )}
                {input('Tantièmes', lot.shares, (value) =>
                  setLots((current) =>
                    current.map((entry, at) =>
                      at === index ? { ...entry, shares: value } : entry,
                    ),
                  ),
                )}
                {input('Sur', lot.base, (value) =>
                  setLots((current) =>
                    current.map((entry, at) => (at === index ? { ...entry, base: value } : entry)),
                  ),
                )}
              </div>
            ))}
            <button
              type="button"
              className={`${btnSecondary} self-start`}
              onClick={() => setLots((current) => [...current, { ...EMPTY_LOT }])}
            >
              Ajouter un lot
            </button>
          </>
        ) : null}
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={withAgent}
            onChange={(event) => setWithAgent(event.target.checked)}
          />
          Le mandat a été apporté par un agent commercial
        </label>
        {withAgent ? (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {input('Nom de l’agent commercial', agent.name, (value) =>
              setAgent((current) => ({ ...current, name: value })),
            )}
            {input('N° RSAC', agent.rsac, (value) =>
              setAgent((current) => ({ ...current, rsac: value })),
            )}
          </div>
        ) : null}
      </section>

      <section className={`${card} flex flex-col gap-3 p-5`}>
        <h2 className={sectionTitle}>Signature des offrants</h2>
        {preview ? (
          <details className="rounded-xl border border-zinc-200 p-3" data-testid="offer-preview">
            <summary className="cursor-pointer text-sm font-semibold text-brand-darker">
              Lire l’offre avant de signer
            </summary>
            <div className="mt-2 flex max-h-96 flex-col gap-1.5 overflow-y-auto text-[13px] leading-relaxed">
              {preview.split('\n').map((line, index) => (
                <p
                  key={index}
                  className={
                    line.startsWith('#') ? 'font-title font-bold text-zinc-900' : 'text-zinc-700'
                  }
                >
                  {line.replace(/^#+ /, '').replace(/^\| /, '')}
                </p>
              ))}
            </div>
          </details>
        ) : null}
        <label className="flex items-center gap-2 text-sm font-medium text-zinc-800">
          <input
            type="checkbox"
            className="h-5 w-5 accent-brand"
            checked={approved}
            disabled={preview == null}
            data-testid="offer-approved"
            onChange={(event) => setApprovedText(event.target.checked ? preview : null)}
          />
          Lu et approuvé
        </label>
        {offrants.map((offrant, index) => (
          <SignaturePad
            key={index}
            label={`Signature de ${[offrant.civility, offrant.firstNames, offrant.lastName].filter((part) => part.trim()).join(' ') || `l’offrant ${index + 1}`}`}
            testId={`offer-signature-${index + 1}`}
            onChange={(value) =>
              setSignatures((current) => current.map((entry, at) => (at === index ? value : entry)))
            }
          />
        ))}
        <button
          type="submit"
          className={`${btnPrimary} self-start`}
          disabled={pending || !ready}
          data-testid="offer-sign"
        >
          {pending ? 'Signature…' : 'Signer l’offre d’achat'}
        </button>
        {error ? (
          <p role="alert" className={errorText}>
            {error}
          </p>
        ) : null}
      </section>
    </form>
  );
}
