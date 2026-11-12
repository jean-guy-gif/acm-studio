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
import { signVisitVoucher } from '@/features/visit-voucher/actions/sign-voucher';
import {
  draftTitle,
  initialTitleDraft,
  OutsideTitleFields,
  type TitleDraft,
} from '@/features/visit-voucher/components/outside-title-fields';
import { SignaturePad } from '@/features/visit-voucher/components/signature-pad';
import { initiallyChecked } from '@/features/visit-voucher/services/voucher-defaults';
import { VoucherShare } from '@/features/visit-voucher/components/voucher-share';
import type { VoucherContext } from '@/features/visit-voucher/queries/get-voucher-context';
import {
  OUTSIDE_COLLEAGUE_ONE,
  OUTSIDE_ONE_SEARCH,
  OUTSIDE_TITLE_MIXED,
  severalSearches,
  tourVersion,
  VOUCHER_TOUR_COMMITMENTS,
  voucherSaleLine,
  voucherOutsideLine,
  withBuyer,
} from '@/features/visit-voucher/services/outside-mandate';
import {
  parisDateLabel,
  VISITOR_CIVILITIES,
  voucherPrice,
  type VisitorCivility,
} from '@/features/visit-voucher/services/voucher-fields';
import {
  VISITOR_PIECE_LABELS,
  type VisitorPiece,
} from '@/features/visit-voucher/services/voucher-text';

type Visitor = { civility: VisitorCivility; name: string };

// Le jour de la visite, à Paris (une visite tard le soir n'est pas datée de la veille).
const dayLabel = (iso: string): string => parisDateLabel(new Date(iso));
type BienDraft = { checked: boolean; mandate: string; price: string; address: string };

// « 1 639 500 », « 1 639 500,50 » : l'euro entier, la virgule décimale lue comme telle.
const euros = (value: string): number | null => {
  const clean = value.replace(/[\s\u00a0\u202f€]/g, '').replace(',', '.');
  const amount = Number(clean);
  return clean && Number.isFinite(amount) ? Math.round(amount) : null;
};

// Mission 137 — le bon de visite, sur un seul écran, au pouce : les biens visités (plusieurs le
// même jour), ce qu'ACM sait déjà rempli (prix, adresse, n° de mandat déjà saisi, le conseiller,
// la ville), le reste saisi une fois (le visiteur, son adresse, le type de sa pièce d'identité —
// jamais son numéro) ; puis « Lu et approuvé » et la signature au doigt de chaque visiteur.
export function VoucherForm({
  context,
  preselected,
}: {
  context: VoucherContext;
  preselected: string | null;
}) {
  const [visitors, setVisitors] = useState<Visitor[]>(
    context.lastVisitor?.visitors ?? [{ civility: 'M.', name: '' }],
  );
  const [address, setAddress] = useState(context.lastVisitor?.address ?? '');
  const [piece, setPiece] = useState<VisitorPiece>(context.lastVisitor?.piece ?? 'cni');
  const [city, setCity] = useState(context.city);
  // Mission 154 — les biens de la tournée cochés d'office : toutes les visites demandées ou
  // confirmées (pas encore faites) qui ont droit au bon, sous un même régime (Mission 153 : un bon
  // ne réunit jamais un bien sous mandat et un bien hors mandat) — celui de la visite d'où l'on vient,
  // sinon les biens sous mandat d'abord. Sans visite à venir : la seule qui a droit au bon.
  // Mission 154 (point 3) — le bon de la tournée ouvert : tous les biens à venir, quel que soit leur
  // titre.
  const tour = context.tourOpen;
  const defaultChecked = initiallyChecked(context.visits, preselected, tour);
  const [biens, setBiens] = useState<Record<string, BienDraft>>(() =>
    Object.fromEntries(
      context.visits.map((visit) => [
        visit.visitId,
        {
          checked: defaultChecked.has(visit.visitId),
          mandate: visit.mandate ?? '',
          price: visit.price != null ? String(visit.price) : '',
          address: visit.address ?? '',
        },
      ]),
    ),
  );
  // Mission 153 — hors mandat : le titre auquel l'Agence intervient, un seul pour le bon.
  const [title, setTitle] = useState<TitleDraft>(() => {
    const first = context.visits.find(
      (visit) =>
        visit.outside && visit.eligible && (preselected ?? visit.visitId) === visit.visitId,
    );
    return initialTitleDraft(first?.suggestion ?? null, context.lastSearchTitle);
  });
  // Mission 154 (point 3) — le bon de la tournée : un titre par bien hors mandat.
  const [titles, setTitles] = useState<Record<string, TitleDraft>>(() =>
    Object.fromEntries(
      context.visits
        .filter((visit) => visit.outside)
        .map((visit) => [
          visit.visitId,
          initialTitleDraft(visit.suggestion ?? null, context.lastSearchTitle),
        ]),
    ),
  );
  // Un seul mandat de recherche par acquéreur : choisi sur un bien, il se propose sur les autres.
  const setTitleFor = (visitId: string, next: TitleDraft) =>
    setTitles((current) => {
      const shared = Object.entries(current).find(
        ([id, draft]) => id !== visitId && draft.kind === 'search' && draftTitle(draft) != null,
      )?.[1];
      const copied =
        next.kind === 'search' && current[visitId]?.kind !== 'search' && shared
          ? { ...next, searchNumber: shared.searchNumber, signedOn: shared.signedOn }
          : next;
      return { ...current, [visitId]: copied };
    });
  const [signatures, setSignatures] = useState<(string | null)[]>([null, null]);
  const [approved, setApproved] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ documentId: string; linkPath: string } | null>(null);

  if (done) {
    return (
      <section className={`${card} flex flex-col gap-3 p-5`} data-testid="voucher-signed">
        <h2 className={sectionTitle}>Bon de visite signé</h2>
        <p className={hintText}>Il est gardé sur la fiche. Envoyez-le au visiteur.</p>
        <VoucherShare
          documentId={done.documentId}
          initialLinkPath={done.linkPath || null}
          email={context.buyer.email}
          advisorFirstName={context.advisorName.split(' ')[0] ?? null}
        />
        <Link
          href={`/acquereurs/${context.buyer.id}/bon-de-visite/${done.documentId}`}
          className={`${btnSecondary} self-start`}
        >
          Voir et imprimer le bon
        </Link>
      </section>
    );
  }

  const chosen = context.visits.filter((visit) => biens[visit.visitId]?.checked);
  // Un bon est sous mandat OU hors mandat : le premier bien coché décide (Mission 153).
  const outside = chosen[0]?.outside ?? null;
  const firstOutside = chosen.find((visit) => visit.outside) ?? null;
  const validTitle = !tour && outside ? draftTitle(title) : null;
  const colleagueTooMany = !tour && validTitle?.kind === 'colleague' && chosen.length > 1;
  // La tournée : le titre de chaque bien coché (null : sous mandat de l'agence), ceux qui manquent,
  // et si le bon réunit plusieurs titres.
  const tourTitles = chosen.map((visit) =>
    visit.outside ? draftTitle(titles[visit.visitId]!) : null,
  );
  const missingTitles = tour
    ? chosen.filter((visit, index) => visit.outside && tourTitles[index] == null)
    : [];
  const severalTitles = tour && tourVersion(tourTitles);
  const searchConflict = tour && severalSearches(tourTitles);
  const searchHint =
    context.lastSearchTitle &&
    title.searchNumber === context.lastSearchTitle.number &&
    title.signedOn === context.lastSearchTitle.signedOn
      ? `Repris du dernier document de ${withBuyer(context.buyer.name)}.`
      : null;
  const update = (visitId: string, patch: Partial<BienDraft>) =>
    setBiens((current) => ({ ...current, [visitId]: { ...current[visitId]!, ...patch } }));

  return (
    <form
      className="flex flex-col gap-5"
      data-testid="voucher-form"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        startTransition(async () => {
          const result = await signVisitVoucher({
            buyerId: context.buyer.id,
            visitors,
            visitorAddress: address,
            piece,
            city,
            biens: chosen.map((visit, index) => {
              const draft = biens[visit.visitId]!;
              return {
                visitId: visit.visitId,
                mandate: draft.mandate,
                price: euros(draft.price) ?? 0,
                address: draft.address,
                title: tour ? tourTitles[index] : null,
              };
            }),
            signatures: signatures.slice(0, visitors.length),
            title: tour ? null : validTitle,
            approved,
          }).catch(() => ({ ok: false as const, error: 'Connexion perdue : réessayez.' }));
          if (!result.ok) {
            setError(result.error);
            return;
          }
          setDone({ documentId: result.documentId, linkPath: result.linkPath });
        });
      }}
    >
      <section className={`${card} flex flex-col gap-3 p-5`}>
        <h2 className={sectionTitle}>Les biens visités</h2>
        <ul className="flex flex-col gap-3">
          {context.visits.map((visit) => {
            const draft = biens[visit.visitId]!;
            const mixed = !tour && outside != null && visit.outside !== outside;
            return (
              <li
                key={visit.visitId}
                className="flex flex-col gap-2 rounded-xl border border-zinc-200 p-3 stage:border-white/10"
                data-testid="voucher-visit"
              >
                <label className="flex items-center gap-2 font-medium text-zinc-900 stage:text-white">
                  <input
                    type="checkbox"
                    className="h-5 w-5 accent-brand"
                    checked={draft.checked}
                    disabled={!visit.eligible || (!draft.checked && mixed)}
                    onChange={(event) => update(visit.visitId, { checked: event.target.checked })}
                  />
                  {visit.label}
                </label>
                <span className={hintText}>
                  {visit.visited ? 'Visité le ' : 'Visite demandée le '}
                  {dayLabel(visit.day)}
                </span>
                {visit.note ? (
                  <span className={visit.eligible ? hintText : 'text-sm text-amber-700'}>
                    {visit.note}
                  </span>
                ) : null}
                {visit.eligible && !draft.checked && mixed ? (
                  <span className="text-sm text-amber-700" data-testid="voucher-mixed">
                    {OUTSIDE_TITLE_MIXED}
                  </span>
                ) : null}
                {draft.checked && visit.outside && tour ? (
                  <OutsideTitleFields
                    draft={titles[visit.visitId]!}
                    onChange={(next) => setTitleFor(visit.visitId, next)}
                    missingText="Choisissez à quel titre vous intervenez pour ce bien : sans lui, le bon ne se signe pas."
                    searchHint={
                      titles[visit.visitId]!.kind === 'search' &&
                      draftTitle(titles[visit.visitId]!) != null
                        ? 'Le même mandat de recherche pour tous ses biens.'
                        : null
                    }
                    colleagueHint={
                      visit.suggestion?.kind === 'colleague'
                        ? 'Collaboration obtenue, sur sa carte de Prospection.'
                        : null
                    }
                  />
                ) : draft.checked && visit.outside ? (
                  firstOutside?.visitId === visit.visitId ? (
                    <OutsideTitleFields
                      draft={title}
                      onChange={setTitle}
                      missingText="Choisissez à quel titre vous intervenez : sans lui, le bon ne se signe pas."
                      searchHint={searchHint}
                      colleagueHint={
                        visit.suggestion?.kind === 'colleague'
                          ? 'Collaboration obtenue, sur sa carte de Prospection.'
                          : null
                      }
                    />
                  ) : (
                    <span className={hintText}>Au même titre que le bien ci-dessus.</span>
                  )
                ) : null}
                {draft.checked ? (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {visit.outside ? null : (
                      <label className="flex flex-col gap-1">
                        <span className={fieldLabel}>N° de mandat</span>
                        <input
                          className={inputBase}
                          value={draft.mandate}
                          maxLength={40}
                          required
                          data-testid="voucher-mandate"
                          onChange={(event) =>
                            update(visit.visitId, { mandate: event.target.value })
                          }
                        />
                      </label>
                    )}
                    <label className="flex flex-col gap-1">
                      <span className={fieldLabel}>
                        {visit.outside ? 'Prix affiché (€)' : 'Prix de commercialisation (€)'}
                      </span>
                      <input
                        className={inputBase}
                        inputMode="numeric"
                        value={draft.price}
                        required
                        readOnly={visit.price != null}
                        onChange={(event) => update(visit.visitId, { price: event.target.value })}
                      />
                    </label>
                    <label className="flex flex-col gap-1 sm:col-span-3">
                      <span className={fieldLabel}>Adresse du bien</span>
                      <input
                        className={inputBase}
                        value={draft.address}
                        maxLength={300}
                        required
                        readOnly={Boolean(visit.address)}
                        data-testid="voucher-bien-address"
                        onChange={(event) => update(visit.visitId, { address: event.target.value })}
                      />
                    </label>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
        {colleagueTooMany ? (
          <p className="text-sm font-semibold text-amber-800" data-testid="voucher-colleague-one">
            {OUTSIDE_COLLEAGUE_ONE}
          </p>
        ) : null}
        {tour &&
        chosen.length > 0 &&
        missingTitles.length === 0 &&
        chosen.some((v) => v.outside) ? (
          <div
            className="flex flex-col gap-1 rounded-lg border border-l-4 border-zinc-200 border-l-brand-deep bg-white px-3 py-2 stage:border-white/10 stage:bg-white/5"
            data-testid="voucher-outside-preview"
          >
            <span className="text-xs font-bold text-brand-deep stage:text-brand">Sur le bon</span>
            {chosen.map((visit, index) => {
              const draft = biens[visit.visitId]!;
              const bien = {
                price: voucherPrice(euros(draft.price) ?? 0),
                address: draft.address.trim() || '…',
              };
              const line = tourTitles[index]
                ? voucherOutsideLine(tourTitles[index]!, bien)
                : severalTitles
                  ? voucherSaleLine(draft.mandate.trim() || '…', bien)
                  : `Numéro du mandat : ${draft.mandate.trim() || '…'} · Prix de commercialisation : ${bien.price} € · Adresse du bien : ${bien.address}`;
              return (
                <p
                  key={visit.visitId}
                  className="font-serif text-sm text-zinc-700 stage:text-white/80"
                >
                  « {line} »
                </p>
              );
            })}
            {severalTitles ? (
              <>
                <span className="mt-1 text-xs font-bold text-zinc-600 stage:text-white/70">
                  Et, une fois chacune, les phrases des titres présents
                </span>
                {(['sale', 'search', 'colleague'] as const)
                  .filter((kind) => tourTitles.some((entry) => (entry?.kind ?? 'sale') === kind))
                  .map((kind) => (
                    <p
                      key={kind}
                      className="text-xs text-zinc-600 stage:text-white/70"
                      data-testid={`voucher-tour-phrase-${kind}`}
                    >
                      « {VOUCHER_TOUR_COMMITMENTS[kind]} »
                    </p>
                  ))}
              </>
            ) : null}
          </div>
        ) : null}
        {validTitle ? (
          <div
            className="flex flex-col gap-1 rounded-lg border border-l-4 border-zinc-200 border-l-brand-deep bg-white px-3 py-2 stage:border-white/10 stage:bg-white/5"
            data-testid="voucher-outside-preview"
          >
            <span className="text-xs font-bold text-brand-deep stage:text-brand">Sur le bon</span>
            {chosen.map((visit) => {
              const draft = biens[visit.visitId]!;
              return (
                <p
                  key={visit.visitId}
                  className="font-serif text-sm text-zinc-700 stage:text-white/80"
                >
                  «{' '}
                  {voucherOutsideLine(validTitle, {
                    price: voucherPrice(euros(draft.price) ?? 0),
                    address: draft.address.trim() || '…',
                  })}{' '}
                  »
                </p>
              );
            })}
          </div>
        ) : null}
      </section>

      <section className={`${card} flex flex-col gap-3 p-5`}>
        <h2 className={sectionTitle}>Le visiteur</h2>
        {/* Mission 154 — le nom de la fiche, jamais rempli d'office ni découpé : une suggestion à
            confirmer d'un geste, tant que le premier visiteur n'a pas de nom. */}
        {visitors[0] && !visitors[0].name.trim() && context.buyer.name.trim() ? (
          <button
            type="button"
            className={`${btnSecondary} self-start px-3 py-1.5 text-sm`}
            data-testid="voucher-take-buyer-name"
            onClick={() =>
              setVisitors((current) =>
                current.map((entry, at) =>
                  at === 0 ? { ...entry, name: context.buyer.name.trim() } : entry,
                ),
              )
            }
          >
            Reprendre « {context.buyer.name.trim()} »
          </button>
        ) : null}
        {visitors.map((visitor, index) => (
          <div key={index} className="grid grid-cols-[auto_1fr] gap-2">
            <select
              className={inputBase}
              value={visitor.civility}
              aria-label={`Civilité du visiteur ${index + 1}`}
              onChange={(event) =>
                setVisitors((current) =>
                  current.map((entry, at) =>
                    at === index
                      ? { ...entry, civility: event.target.value as VisitorCivility }
                      : entry,
                  ),
                )
              }
            >
              {VISITOR_CIVILITIES.map((civility) => (
                <option key={civility} value={civility}>
                  {civility}
                </option>
              ))}
            </select>
            <input
              className={inputBase}
              value={visitor.name}
              placeholder="Prénom et nom"
              maxLength={120}
              required
              aria-label={`Prénom et nom du visiteur ${index + 1}`}
              data-testid={`voucher-visitor-${index + 1}`}
              onChange={(event) =>
                setVisitors((current) =>
                  current.map((entry, at) =>
                    at === index ? { ...entry, name: event.target.value } : entry,
                  ),
                )
              }
            />
          </div>
        ))}
        {visitors.length < 2 ? (
          <button
            type="button"
            className={`${btnSecondary} self-start`}
            onClick={() => setVisitors((current) => [...current, { civility: 'Mme', name: '' }])}
          >
            Ajouter un second visiteur
          </button>
        ) : (
          <button
            type="button"
            className={`${btnSecondary} self-start`}
            onClick={() => setVisitors((current) => current.slice(0, 1))}
          >
            Un seul visiteur
          </button>
        )}
        <label className="flex flex-col gap-1">
          <span className={fieldLabel}>Adresse du visiteur</span>
          <input
            className={inputBase}
            value={address}
            maxLength={300}
            required
            data-testid="voucher-visitor-address"
            onChange={(event) => setAddress(event.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className={fieldLabel}>Pièce d’identité présentée (le type seul)</span>
          <select
            className={inputBase}
            value={piece}
            onChange={(event) => setPiece(event.target.value as VisitorPiece)}
          >
            {Object.entries(VISITOR_PIECE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className={fieldLabel}>Fait à</span>
          <input
            className={inputBase}
            value={city}
            maxLength={80}
            required
            readOnly={Boolean(context.city)}
            onChange={(event) => setCity(event.target.value)}
          />
        </label>
        <p className={hintText}>Présenté par {context.advisorName || 'vous'}.</p>
      </section>

      <section className={`${card} flex flex-col gap-3 p-5`}>
        <h2 className={sectionTitle}>Signature</h2>
        <label className="flex items-center gap-2 text-sm font-medium text-zinc-800 stage:text-white/85">
          <input
            type="checkbox"
            className="h-5 w-5 accent-brand"
            checked={approved}
            data-testid="voucher-approved"
            onChange={(event) => setApproved(event.target.checked)}
          />
          Lu et approuvé
        </label>
        {visitors.map((visitor, index) => (
          <SignaturePad
            key={index}
            label={`Signature de ${visitor.name.trim() || `visiteur ${index + 1}`}`}
            testId={`voucher-signature-${index + 1}`}
            onChange={(value) =>
              setSignatures((current) => current.map((entry, at) => (at === index ? value : entry)))
            }
          />
        ))}
        <button
          type="submit"
          className={`${btnPrimary} self-start`}
          data-testid="voucher-sign"
          disabled={
            pending ||
            !approved ||
            chosen.length === 0 ||
            (!tour && outside === true && validTitle == null) ||
            missingTitles.length > 0 ||
            searchConflict ||
            colleagueTooMany ||
            signatures.slice(0, visitors.length).some((value) => value == null)
          }
        >
          {pending ? 'Signature…' : 'Signer le bon de visite'}
        </button>
        {searchConflict ? (
          <p className="text-sm font-semibold text-amber-800" data-testid="voucher-one-search">
            {OUTSIDE_ONE_SEARCH}
          </p>
        ) : null}
        {missingTitles.length > 0 ? (
          <p className="text-sm font-semibold text-amber-800" data-testid="voucher-missing-titles">
            Il manque : le titre pour{' '}
            {missingTitles.map((visit) => `« ${visit.label} »`).join(', ')}
          </p>
        ) : null}
        {error ? (
          <p role="alert" className={errorText}>
            {error}
          </p>
        ) : null}
      </section>
    </form>
  );
}
