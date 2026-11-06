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
import { SignaturePad } from '@/features/visit-voucher/components/signature-pad';
import { VoucherShare } from '@/features/visit-voucher/components/voucher-share';
import type { VoucherContext } from '@/features/visit-voucher/queries/get-voucher-context';
import {
  VISITOR_CIVILITIES,
  type VisitorCivility,
} from '@/features/visit-voucher/services/voucher-fields';
import {
  VISITOR_PIECE_LABELS,
  type VisitorPiece,
} from '@/features/visit-voucher/services/voucher-text';

type Visitor = { civility: VisitorCivility; name: string };

const dayLabel = (iso: string): string => {
  const [year, month, day] = iso.slice(0, 10).split('-');
  return `${day}/${month}/${year}`;
};
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
  const [biens, setBiens] = useState<Record<string, BienDraft>>(() =>
    Object.fromEntries(
      context.visits.map((visit) => [
        visit.visitId,
        {
          // Les biens visités le même jour (§ 6) : rien n'est coché d'office, sauf la visite d'où
          // l'on vient, ou la seule qui a droit au bon.
          checked:
            visit.eligible &&
            (preselected != null
              ? preselected === visit.visitId
              : context.visits.filter((entry) => entry.eligible).length === 1),
          mandate: visit.mandate ?? '',
          price: visit.price != null ? String(visit.price) : '',
          address: visit.address ?? '',
        },
      ]),
    ),
  );
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
            biens: chosen.map((visit) => {
              const draft = biens[visit.visitId]!;
              return {
                visitId: visit.visitId,
                mandate: draft.mandate,
                price: euros(draft.price) ?? 0,
                address: draft.address,
              };
            }),
            signatures: signatures.slice(0, visitors.length),
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
                    disabled={!visit.eligible}
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
                {draft.checked ? (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <label className="flex flex-col gap-1">
                      <span className={fieldLabel}>N° de mandat</span>
                      <input
                        className={inputBase}
                        value={draft.mandate}
                        maxLength={40}
                        required
                        data-testid="voucher-mandate"
                        onChange={(event) => update(visit.visitId, { mandate: event.target.value })}
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className={fieldLabel}>Prix de commercialisation (€)</span>
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
      </section>

      <section className={`${card} flex flex-col gap-3 p-5`}>
        <h2 className={sectionTitle}>Le visiteur</h2>
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
            signatures.slice(0, visitors.length).some((value) => value == null)
          }
        >
          {pending ? 'Signature…' : 'Signer le bon de visite'}
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
