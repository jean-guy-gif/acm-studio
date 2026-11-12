/* eslint-disable @next/next/no-img-element -- photo, logo et signatures : liens signés courts. */
import type { ReactNode } from 'react';

import type { SignedOffer } from '@/features/purchase-offer/queries/load-offer';
import { frenchDay } from '@/features/purchase-offer/services/offer-dates';
import { parisDateTimeLabel } from '@/features/visit-voucher/services/voucher-fields';

const CADASTRE_HEADINGS = ['Préfixe', 'Section', 'Numéro', 'Lieudit', 'Contenance'];

// Les paragraphes d'une section : un intertitre (« ### »), les lignes du cadastre (« | ») en un
// tableau, le reste tel quel.
function paragraphsOf(paragraphs: string[]): ReactNode[] {
  const out: ReactNode[] = [];
  let table: string[][] = [];
  const flush = (key: string) => {
    if (table.length === 0) return;
    out.push(
      <table key={key} className="w-full border-collapse text-[12px]" data-testid="offer-cadastre">
        <thead>
          <tr>
            {CADASTRE_HEADINGS.map((heading) => (
              <th
                key={heading}
                className="border border-zinc-300 px-2 py-1 text-left font-semibold"
              >
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.map((row, index) => (
            <tr key={index}>
              {row.map((cell, column) => (
                <td key={column} className="border border-zinc-300 px-2 py-1">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>,
    );
    table = [];
  };
  paragraphs.forEach((paragraph, index) => {
    if (paragraph.startsWith('| ')) {
      table.push(
        paragraph
          .slice(2)
          .split(' | ')
          .map((cell) => cell.trim()),
      );
      return;
    }
    flush(`table-${index}`);
    out.push(
      paragraph.startsWith('### ') ? (
        <h3 key={index} className="mt-1 font-title text-[13px] font-bold text-zinc-900">
          {paragraph.slice(4)}
        </h3>
      ) : (
        <p key={index} className="whitespace-pre-wrap">
          {paragraph}
        </p>
      ),
    );
  });
  flush('table-end');
  return out;
}

// Mission 137 (partie B) — l'offre d'achat signée, en A4 : la couverture (la photo du bien vendeur
// ou, sans elle, la couleur de l'agence ; le logo, le nom, l'adresse, le téléphone, l'e-mail et le
// site de l'agence ; « OFFRE D'ACHAT FERME » ; « Mandat n° … »), puis le texte figé à la signature,
// jamais recalculé ; les signatures des offrants ; la réponse du vendeur s'il y en a une ; en pied,
// l'heure et l'empreinte. Rien d'un modèle d'origine.
export function OfferDocument({ offer }: { offer: SignedOffer }) {
  const { document, header, fields } = offer;
  const cover = fields?.cover;
  return (
    <article
      className="mx-auto flex max-w-[210mm] flex-col gap-4 bg-white text-[13px] leading-relaxed text-zinc-900 shadow-sm print:max-w-none print:shadow-none"
      data-testid="offer-document"
    >
      {header.brandDeclarations ? (
        <style>{`[data-offer-brand]{${header.brandDeclarations}}`}</style>
      ) : null}
      <section
        data-offer-brand
        className="relative flex min-h-[260mm] flex-col justify-between overflow-hidden bg-brand-darker text-white print:break-after-page"
        data-testid="offer-cover"
      >
        {offer.coverPhotoUrl ? (
          <img
            src={offer.coverPhotoUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-60"
          />
        ) : null}
        <div className="relative flex items-start justify-between gap-4 p-8">
          {header.logoUrl ? (
            <img
              src={header.logoUrl}
              alt={header.name}
              className="max-h-16 max-w-[50%] rounded bg-white/90 object-contain p-2"
            />
          ) : (
            <span className="font-title text-2xl font-bold">{header.name}</span>
          )}
        </div>
        <div className="relative flex flex-col gap-3 bg-black/45 p-8">
          <h1 className="font-title text-4xl font-bold tracking-wide">OFFRE D&apos;ACHAT FERME</h1>
          {fields ? (
            <p className="font-title text-lg font-semibold" data-testid="offer-cover-mandate">
              {/* Mission 153 — hors mandat, le titre auquel l'Agence intervient. */}
              {fields.title?.kind === 'search'
                ? `Mandat de recherche n° ${fields.title.number}`
                : fields.title?.kind === 'colleague'
                  ? `En collaboration avec ${fields.title.agency} · mandat n° ${fields.title.number}`
                  : `Mandat n° ${fields.mandateNumber}`}
            </p>
          ) : null}
          {cover ? (
            <p className="text-sm text-white/90">
              {[
                cover.agencyName,
                cover.agencyAddress,
                cover.agencyPhone,
                cover.agencyEmail,
                cover.agencySite,
              ]
                .filter((part): part is string => Boolean(part && part.trim()))
                .join(' · ')}
            </p>
          ) : null}
        </div>
      </section>
      <div className="flex flex-col gap-4 p-8 print:p-0">
        <h1 className="text-center font-title text-lg font-bold tracking-wide">{document.title}</h1>
        {document.sections.map((section, index) => (
          <section key={`${section.heading}-${index}`} className="flex flex-col gap-1.5">
            {section.heading ? (
              <h2 className="font-title text-sm font-bold uppercase tracking-wide text-brand-darker">
                {section.heading}
              </h2>
            ) : null}
            {paragraphsOf(section.paragraphs)}
            {section.heading === 'Signature' ? (
              <div className="mt-2 flex flex-wrap gap-6" data-testid="offer-signatures">
                {offer.signatureUrls.map((url, signature) => (
                  <figure key={url} className="flex flex-col gap-1">
                    <img
                      src={url}
                      alt={`Signature de l'offrant ${signature + 1}`}
                      className="h-24 w-64 border-b border-zinc-400 object-contain"
                    />
                    <figcaption className="text-[11px] text-zinc-500">
                      L&apos;OFFRANT
                      {fields?.offrants[signature]
                        ? ` — ${fields.offrants[signature]!.civility} ${fields.offrants[signature]!.lastName}`
                        : ''}
                    </figcaption>
                  </figure>
                ))}
              </div>
            ) : null}
          </section>
        ))}
        {offer.answer ? (
          <section
            className="flex flex-col gap-2 rounded-lg border border-zinc-300 p-4"
            data-testid="offer-answer"
            data-decision={offer.answer.decision}
          >
            <h2 className="font-title text-sm font-bold uppercase tracking-wide text-brand-darker">
              Le VENDEUR
            </h2>
            {offer.answer.decision === 'accepted' ? (
              <>
                <p>
                  Bon pour acceptation — {offer.answer.signers.join(' et ')}, le{' '}
                  {parisDateTimeLabel(offer.answer.decidedAt)}.
                </p>
                <div className="flex flex-wrap gap-6">
                  {offer.answer.signatureUrls.map((url, signature) => (
                    <img
                      key={url}
                      src={url}
                      alt={`Signature du vendeur ${signature + 1}`}
                      className="h-24 w-64 border-b border-zinc-400 object-contain"
                    />
                  ))}
                </div>
              </>
            ) : (
              <p>Offre refusée par le vendeur le {parisDateTimeLabel(offer.answer.decidedAt)}.</p>
            )}
          </section>
        ) : null}
        <footer className="mt-4 border-t border-zinc-200 pt-2 text-[11px] text-zinc-500">
          Signée le {parisDateTimeLabel(offer.signedAt)} · valable jusqu&apos;au{' '}
          {frenchDay(offer.validUntil)} inclus · empreinte du texte signé :{' '}
          <span className="break-all font-mono">{offer.contentSha256}</span>
        </footer>
      </div>
    </article>
  );
}
