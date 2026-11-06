/* eslint-disable @next/next/no-img-element -- logo et signatures : liens signés courts, tels quels. */
import { parisDateTimeLabel } from '@/features/visit-voucher/services/voucher-fields';
import type { SignedVoucher } from '@/features/visit-voucher/queries/load-voucher';

// Mission 137 — le bon de visite signé, en A4 : l'en-tête de l'agence (son logo, sinon son nom, à
// ses couleurs, M55), puis le texte figé à la signature, ligne à ligne, jamais recalculé ; les
// signatures sous « SIGNATURE(S) » ; en pied, l'heure de la signature et l'empreinte du texte.
// Rien d'un modèle d'origine.
export function VoucherDocument({ voucher }: { voucher: SignedVoucher }) {
  const { document, header } = voucher;
  return (
    <article
      className="mx-auto flex max-w-[210mm] flex-col gap-4 bg-white p-8 text-[13px] leading-relaxed text-zinc-900 shadow-sm print:max-w-none print:p-0 print:shadow-none"
      data-testid="voucher-document"
    >
      {header.brandDeclarations ? (
        <style>{`[data-voucher-brand]{${header.brandDeclarations}}`}</style>
      ) : null}
      <header
        data-voucher-brand
        className="flex items-center justify-between gap-4 border-b border-zinc-200 pb-3"
      >
        {header.logoUrl ? (
          <img
            src={header.logoUrl}
            alt={header.name}
            className="max-h-14 max-w-[45%] object-contain"
          />
        ) : (
          <span className="font-title text-lg font-bold text-brand-darker">{header.name}</span>
        )}
      </header>
      <h1 className="text-center font-title text-lg font-bold tracking-wide">{document.title}</h1>
      {document.sections.map((section, index) => (
        <section
          key={`${section.heading}-${index}`}
          className="flex flex-col gap-1.5 break-inside-avoid-page"
        >
          {section.heading ? (
            <h2 className="font-title text-sm font-bold uppercase tracking-wide text-brand-darker">
              {section.heading}
            </h2>
          ) : null}
          {section.paragraphs.map((paragraph, line) => (
            <p key={line} className="whitespace-pre-wrap">
              {paragraph}
            </p>
          ))}
          {section.heading === 'SIGNATURE(S)' ? (
            <div className="mt-2 flex flex-wrap gap-6" data-testid="voucher-signatures">
              {voucher.signatureUrls.map((url, signature) => (
                <img
                  key={url}
                  src={url}
                  alt={`Signature ${signature + 1}`}
                  className="h-24 w-64 border-b border-zinc-400 object-contain"
                />
              ))}
            </div>
          ) : null}
        </section>
      ))}
      <footer className="mt-4 border-t border-zinc-200 pt-2 text-[11px] text-zinc-500">
        Signé le {parisDateTimeLabel(voucher.signedAt)} · empreinte du texte (SHA-256) :{' '}
        <span className="break-all font-mono">{voucher.contentSha256}</span>
      </footer>
    </article>
  );
}
