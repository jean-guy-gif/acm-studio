import {
  shortLinkAddress,
  type NeighbourhoodDocumentLink,
} from '@/features/neighbourhood-link/services/neighbourhood-link';
import { clientTexts, type TextLanguage } from '@/lib/client-texts';
import { formatDay } from '@/lib/format';

// Mission 157 B — le lien « Vivre ici » dans un document du vendeur (planche M157B-2) : à l'écran et
// sur son lien, « Ouvrir la page du quartier ↗ » ; à l'impression, le QR code et l'adresse courte à
// taper ; la date de validité quand elle est connue (un document imprimé survit au lien). Jamais le
// nom du service (Jean-Guy, 17/11).
export function NeighbourhoodLinkBlock({
  link,
  language,
  printed = false,
}: {
  link: NeighbourhoodDocumentLink;
  language: TextLanguage;
  // Correctifs 163 — la copie des pages imprimées de l'Étude, sans repère de test.
  printed?: boolean;
}) {
  const texts = clientTexts(language).neighbourhood;
  const day = link.validUntil ? formatDay(link.validUntil, language, 'long') : null;
  return (
    <div
      className="flex items-center gap-4 border border-l-4 border-zinc-200 border-l-brand-deep bg-white px-5 py-3.5 break-inside-avoid"
      data-testid={printed ? undefined : 'neighbourhood-link'}
    >
      <svg
        viewBox={`0 0 ${link.qr.size} ${link.qr.size}`}
        className="hidden h-20 w-20 shrink-0 text-zinc-900 print:block"
        role="img"
        aria-label={texts.heading}
        shapeRendering="crispEdges"
      >
        <path d={link.qr.path} fill="currentColor" />
      </svg>
      <div className="flex min-w-0 flex-col gap-1 text-sm">
        <div className="font-title text-base font-bold text-brand-deep">{texts.heading}</div>
        <a
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="self-start font-semibold text-brand-deep underline underline-offset-2 print:hidden"
        >
          {texts.open} ↗
        </a>
        <span className="hidden break-all text-zinc-700 print:inline">
          {link.printAddress ? texts.scan(shortLinkAddress(link.url)) : texts.scanOnly}
        </span>
        {day ? <span className="text-xs text-zinc-500">{texts.validUntil(day)}</span> : null}
      </div>
    </div>
  );
}
