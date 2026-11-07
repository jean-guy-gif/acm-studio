'use client';

import { clientTexts, type TextLanguage } from '@/lib/client-texts';
import Link from 'next/link';
import { useState } from 'react';

import {
  btnPrimary,
  btnSecondary,
  card,
  hintText,
  link as linkStyle,
  sectionTitle,
} from '@/components/ui/styles';
import { prepareProposalLink, recordProposal } from '@/features/buyers/actions/proposals';
import { READY_LABEL } from '@/features/buyers/services/buyer-readiness';
import {
  proposalMessage,
  sentDayLabel,
  type LoopOrigin,
} from '@/features/buyers/services/loop-properties';
import type { BuyerLoopProperty } from '@/features/buyers/services/property-buyers';
import type { Buyer } from '@/features/buyers/types';
import { followUpShareHrefs } from '@/features/meeting-conclusion/services/follow-up-share';

export type ProposeCandidate = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  ready: boolean;
  missing: string | null;
  stars: string[];
  budgetGap: string | null;
  wants: Pick<Buyer, 'name' | 'pool' | 'outdoor' | 'parking' | 'elevator' | 'budgetMax'>;
  // Mission 140 — la langue de ses messages.
  language: TextLanguage;
};

type Prepared = { url: string; selectionItemId: string };

const EMAIL_SUBJECT = 'Un bien pour vous';

// Mission 134 (§ 5, 6) — la liste cochée, puis la série : un acquéreur à la fois, son message prêt
// (son nom, ce que le bien a de ce qu'il cherche, la marge sous son budget), le lien de son dossier
// avec ce bien en tête — préparé au premier geste de partage —, Copier / SMS / WhatsApp / E-mail à
// ses coordonnées. « Envoyé, suivant » note l'envoi ; « Passer » ne note rien. ACM n'envoie rien.
export function ProposeSeries({
  propertyKey,
  item,
  candidates,
  proposed,
  advisorFirstName,
}: {
  propertyKey: string;
  item: { property: BuyerLoopProperty; price: number | null; origin: LoopOrigin };
  candidates: ProposeCandidate[];
  proposed: { id: string; name: string; label: string }[];
  advisorFirstName: string | null;
}) {
  const [checked, setChecked] = useState<Set<string>>(
    () => new Set(candidates.map((candidate) => candidate.id)),
  );
  const [series, setSeries] = useState<ProposeCandidate[] | null>(null);
  const [index, setIndex] = useState(0);
  const [prepared, setPrepared] = useState<Prepared | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [sent, setSent] = useState<string[]>([]);

  if (series == null) {
    const count = checked.size;
    return (
      <div className="flex flex-col gap-4">
        <section className={`${card} flex flex-col gap-3 p-5`} data-testid="propose-list">
          <h2 className={sectionTitle}>
            {candidates.length === 0
              ? 'Plus personne à qui le proposer'
              : `${candidates.length} ${candidates.length > 1 ? 'acquéreurs correspondent' : 'acquéreur correspond'}`}
          </h2>
          <ul className="flex flex-col">
            {candidates.map((candidate) => (
              <li
                key={candidate.id}
                className="flex items-start gap-3 border-t border-zinc-100 py-2.5 first:border-0 stage:border-white/10"
                data-testid="propose-candidate"
              >
                <input
                  type="checkbox"
                  className="mt-1 size-5 accent-brand"
                  aria-label={candidate.name}
                  checked={checked.has(candidate.id)}
                  onChange={(event) =>
                    setChecked((current) => {
                      const next = new Set(current);
                      if (event.target.checked) next.add(candidate.id);
                      else next.delete(candidate.id);
                      return next;
                    })
                  }
                />
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/acquereurs/${candidate.id}`}
                      className={`${linkStyle} font-semibold`}
                    >
                      {candidate.name}
                    </Link>
                    <span
                      className={
                        candidate.ready
                          ? 'rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800'
                          : 'rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-semibold text-zinc-600'
                      }
                    >
                      {candidate.ready ? READY_LABEL : candidate.missing}
                    </span>
                  </span>
                  <span className="flex flex-wrap gap-1.5 text-sm text-zinc-600 stage:text-white/70">
                    {candidate.stars.map((star) => (
                      <span
                        key={star}
                        className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-900"
                      >
                        ★ {star}
                      </span>
                    ))}
                    {candidate.budgetGap ? <span>{candidate.budgetGap}</span> : null}
                  </span>
                </span>
              </li>
            ))}
          </ul>
          {proposed.length > 0 ? (
            <ul className="flex flex-col gap-1 border-t border-zinc-100 pt-3 text-sm text-zinc-500 stage:border-white/10 stage:text-white/60">
              {proposed.map((entry) => (
                <li key={entry.id} data-testid="propose-already">
                  {entry.name} · {entry.label}
                </li>
              ))}
            </ul>
          ) : null}
        </section>
        {candidates.length > 0 ? (
          <button
            type="button"
            className={`${btnPrimary} self-start`}
            disabled={count === 0}
            data-testid="propose-start"
            onClick={() => {
              setSeries(candidates.filter((candidate) => checked.has(candidate.id)));
              setIndex(0);
            }}
          >
            Envoyer à {count} {count > 1 ? 'acquéreurs' : 'acquéreur'}
          </button>
        ) : null}
      </div>
    );
  }

  const current = series[index];
  if (!current) {
    return (
      <section className={`${card} flex flex-col gap-3 p-5`} data-testid="propose-done">
        <h2 className={sectionTitle}>
          {sent.length === 0
            ? 'Aucun envoi noté'
            : `${sent.length} ${sent.length > 1 ? 'envois notés' : 'envoi noté'}`}
        </h2>
        <p className={hintText}>
          Chaque envoi est noté sur la fiche de l’acquéreur ; la tâche du Suivi se vide au fil des
          envois.
        </p>
        <Link href="/suivi" className={`${btnSecondary} self-start`}>
          Revenir au Suivi
        </Link>
      </section>
    );
  }

  const message = proposalMessage({
    buyer: current.wants,
    item,
    url: prepared?.url ?? '[le lien de sa sélection]',
    advisorFirstName,
    language: current.language,
  });
  const hrefs = followUpShareHrefs(
    message,
    current.phone,
    current.email,
    current.language === 'fr'
      ? EMAIL_SUBJECT
      : clientTexts(current.language).buyer.messages.proposal.subject,
  );

  // Le lien se prépare par son propre geste (une nouvelle sélection, ce bien en tête) ; les partages
  // partent ensuite tout de suite, dans le geste (Safari et iPad refusent une copie ou une fenêtre
  // ouverte après une attente). « Passer » avant de préparer ne laisse rien.
  const prepare = () => {
    setError(null);
    setPending(true);
    void prepareProposalLink(current.id, propertyKey)
      .then((result) => {
        setPending(false);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setPrepared({ url: result.url, selectionItemId: result.selectionItemId });
      })
      .catch(() => {
        setPending(false);
        setError('Connexion perdue : réessayez.');
      });
  };
  const next = () => {
    setPrepared(null);
    setCopied(false);
    setError(null);
    setIndex((value) => value + 1);
  };

  return (
    <section className={`${card} flex flex-col gap-4 p-5`} data-testid="propose-step">
      <div className="flex flex-col gap-1">
        <span className="text-xs font-semibold tracking-[0.18em] text-zinc-500 uppercase">
          {index + 1} sur {series.length}
        </span>
        <h2 className={sectionTitle} data-testid="propose-step-name">
          {current.name}
        </h2>
        <p className={hintText}>
          {[current.phone, current.email].filter(Boolean).join(' · ') ||
            'Ni téléphone ni e-mail sur sa fiche : copiez le message.'}
        </p>
      </div>
      <p
        className="rounded-xl bg-zinc-50 px-3 py-2 text-sm whitespace-pre-line text-zinc-700 stage:bg-white/5 stage:text-white/80"
        data-testid="propose-message"
      >
        {message}
      </p>
      {prepared ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={btnSecondary}
            data-testid="propose-copy"
            onClick={() => {
              navigator.clipboard
                ?.writeText(message)
                .then(() => setCopied(true))
                .catch(() => setError('La copie a échoué : sélectionnez le message ci-dessus.'));
            }}
          >
            Copier
          </button>
          {hrefs.sms ? (
            <a className={btnSecondary} href={hrefs.sms}>
              SMS
            </a>
          ) : null}
          {hrefs.whatsapp ? (
            <a
              className={btnSecondary}
              href={hrefs.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
            >
              WhatsApp
            </a>
          ) : null}
          <a className={btnSecondary} href={hrefs.email}>
            E-mail
          </a>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          <button
            type="button"
            className={`${btnSecondary} self-start`}
            disabled={pending}
            data-testid="propose-prepare"
            onClick={prepare}
          >
            {pending ? 'Préparation…' : 'Préparer son lien'}
          </button>
          <p className={hintText}>
            Une nouvelle sélection avec ce bien en tête. Son lien actuel, s’il en a un, cesse de
            marcher ; ses réponses restent.
          </p>
        </div>
      )}
      <p className={hintText} role="status">
        {copied
          ? 'Message copié, lien compris.'
          : prepared
            ? 'Le lien de sa sélection est prêt : envoyez-le, puis « Envoyé, suivant ». ACM n’envoie rien lui-même.'
            : 'Préparez son lien, envoyez-le, puis notez l’envoi.'}
      </p>
      {error ? (
        <p role="alert" className="text-sm font-semibold text-red-700">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className={btnPrimary}
          disabled={!prepared || pending}
          data-testid="propose-sent"
          onClick={() => {
            if (!prepared) return;
            setPending(true);
            void recordProposal(current.id, propertyKey, prepared.selectionItemId)
              .then((result) => {
                setPending(false);
                if (!result.ok) {
                  setError(result.error);
                  return;
                }
                setSent((list) => [...list, `${current.name} · ${sentDayLabel(result.sentAt)}`]);
                next();
              })
              .catch(() => {
                setPending(false);
                setError('Connexion perdue : réessayez.');
              });
          }}
        >
          Envoyé, suivant
        </button>
        <button
          type="button"
          className={linkStyle}
          disabled={pending}
          data-testid="propose-skip"
          onClick={next}
        >
          Passer
        </button>
      </div>
    </section>
  );
}
