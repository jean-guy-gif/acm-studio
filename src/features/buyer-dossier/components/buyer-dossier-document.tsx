import { DossierVisitForm } from '@/features/buyer-dossier/components/dossier-visit-form';
import {
  DOSSIER_DISCLAIMER,
  DOSSIER_VISIT_QUESTION,
  type BuyerDossier,
  type DossierItem,
} from '@/features/buyer-dossier/types';
import { PRICE_TO_CONFIRM } from '@/features/buyer-presentation/services/agency-price';
import { KNOW_TITLE, WHY_TITLE } from '@/features/buyer-presentation/services/build-presentation';
import { buyerDateLabel } from '@/features/buyers/services/buyer-criteria';
import { formatEuro, formatEuroPerSquareMeter } from '@/lib/format';

// Mission 119 (partie B) — le dossier acquéreur, dans la forme de la synthèse vendeur (M113) :
// couverture, rappel de la recherche, une fiche par bien (une page chacune à l'impression), la
// dernière page « Quels biens souhaitez-vous visiter ? », le conseiller et les mentions de l'agence
// (M84, M102). Le même document à l'écran du conseiller, à l'impression et sur le lien public.

const kicker = 'text-[0.62rem] font-semibold tracking-[0.14em] text-zinc-500 uppercase';
const card = 'border border-zinc-200 bg-white px-3.5 py-3 break-inside-avoid';

const cssString = (value: string): string => `"${value.replace(/["\\]/g, '')}"`;

function Photo({ url, alt }: { url: string | null; alt: string }) {
  if (!url) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt={alt} className="h-56 w-full object-cover sm:h-72" />;
}

function ItemPage({ item }: { item: DossierItem }) {
  return (
    <section
      className="flex flex-col gap-4 break-inside-avoid break-after-page"
      data-testid="dossier-item"
    >
      <div className="flex flex-col gap-1">
        <span className={kicker}>Bien {item.position}</span>
        <h2 className="font-title text-2xl font-bold text-brand-darker">{item.label}</h2>
        {item.where ? <p className="text-sm text-zinc-600">{item.where}</p> : null}
      </div>
      <Photo url={item.photoUrl} alt="" />
      <div className="grid gap-3 sm:grid-cols-[1.2fr_2fr]">
        <div className={card}>
          <div className={kicker}>Prix affiché</div>
          {item.price != null ? (
            <div
              className="font-title text-3xl font-bold text-brand-darker"
              data-testid="dossier-price"
            >
              {formatEuro(item.price)}
            </div>
          ) : (
            <div className="font-title text-base font-semibold text-brand-darker">
              {PRICE_TO_CONFIRM}
            </div>
          )}
          <div className="text-xs text-zinc-500">
            {[
              item.pricePerSqm != null ? formatEuroPerSquareMeter(item.pricePerSqm) : null,
              item.seenOnLabel,
            ]
              .filter((part): part is string => part != null)
              .join(' · ')}
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 border border-zinc-200 bg-white px-3.5 py-3 sm:grid-cols-3">
          {item.facts.map((fact) => (
            <div key={fact.label} className="flex flex-col">
              <dt className={kicker}>{fact.label}</dt>
              <dd className="font-semibold">{fact.value}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className={card}>
          <div className={kicker}>{WHY_TITLE}</div>
          {item.why.length > 0 ? (
            <ul className="mt-1 flex flex-col gap-1 text-sm">
              {item.why.map((line) => (
                <li key={line}>✓ {line}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-sm text-zinc-500">
              Aucun critère indispensable sur votre recherche.
            </p>
          )}
        </div>
        <div className={card}>
          <div className={kicker}>{KNOW_TITLE}</div>
          {item.gaps.length > 0 ? (
            <ul className="mt-1 flex flex-col gap-1 text-sm">
              {item.gaps.map((gap) => (
                <li key={gap}>{gap}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-sm text-zinc-500">Rien de particulier à signaler.</p>
          )}
        </div>
      </div>
    </section>
  );
}

export function BuyerDossierDocument({
  dossier,
  token = null,
}: {
  dossier: BuyerDossier;
  // Le jeton du lien public : les coches de la dernière page s'envoient ; absent, elles sont inertes.
  token?: string | null;
}) {
  const { agency } = dossier;
  const day = buyerDateLabel(dossier.selectedAt);
  const footer = `Sélection confidentielle · ${dossier.sector} · ${day}`;
  const pageRules = `@page{size:A4;margin:12mm 0 16mm 0;@bottom-left{content:${cssString(footer)};padding-left:14mm;font-size:7.5pt;letter-spacing:.08em;text-transform:uppercase;color:#64748b}@bottom-right{content:counter(page,decimal-leading-zero) " / " counter(pages,decimal-leading-zero);padding-right:14mm;font-size:7.5pt;color:#64748b}}@page :first{margin:0;@bottom-left{content:none}@bottom-right{content:none}}`;
  const cover = dossier.items.find((item) => item.photoUrl)?.photoUrl ?? null;

  return (
    <article
      className="mx-auto flex w-full max-w-[210mm] flex-col gap-0 bg-zinc-50 text-zinc-800 [print-color-adjust:exact] print:max-w-none print:bg-white"
      data-testid="buyer-dossier"
      data-dossier=""
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `${pageRules}${dossier.brandDeclarations ? `[data-dossier]{${dossier.brandDeclarations}}` : ''}`,
        }}
      />

      <section className="relative flex min-h-[150mm] flex-col overflow-hidden bg-brand-deep text-white break-after-page print:h-[297mm] print:min-h-0">
        {cover ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={cover} alt="" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-x-0 bottom-0 h-[65%] bg-gradient-to-b from-transparent via-brand-darker/75 to-brand-darker/95" />
          </>
        ) : null}
        <div className="relative flex items-center justify-between gap-4 px-8 pt-8 sm:px-12">
          {agency.logoUrl ? (
            <span className="bg-white/95 px-3 py-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={agency.logoUrl}
                alt={agency.name}
                className="max-h-10 max-w-40 object-contain"
              />
            </span>
          ) : (
            <span className="font-title text-lg font-semibold">{agency.name}</span>
          )}
          <span className="text-xs tracking-[0.16em] uppercase">{day}</span>
        </div>
        <div className="flex-1" />
        <div className="relative flex flex-col gap-3 px-8 pb-12 sm:px-12">
          <span className="self-start border border-white/80 px-3 py-1 text-[0.65rem] tracking-[0.2em] uppercase">
            Dossier acquéreur
          </span>
          <h1 className="font-title text-4xl leading-tight font-bold sm:text-5xl">
            Votre sélection
            <br />
            du {day}
          </h1>
          <p className="text-sm opacity-90">Pour {dossier.buyerName}</p>
          <p className="text-sm opacity-90">
            {dossier.sector} · {dossier.items.length} bien{dossier.items.length > 1 ? 's' : ''}
          </p>
        </div>
      </section>

      <div className="flex flex-col gap-6 p-5 sm:p-8 print:px-[14mm] print:py-0">
        <section
          className="flex flex-col gap-3 break-inside-avoid break-after-page"
          data-testid="dossier-search"
        >
          <h2 className="font-title text-2xl font-bold text-brand-darker">Votre recherche</h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {dossier.criteria.map((line) => (
              <li key={line} className={card}>
                {line}
              </li>
            ))}
          </ul>
        </section>

        {dossier.items.map((item) => (
          <ItemPage key={item.itemId} item={item} />
        ))}

        <section className="flex flex-col gap-4 break-inside-avoid" data-testid="dossier-last-page">
          <h2 className="font-title text-2xl font-bold text-brand-darker">
            {DOSSIER_VISIT_QUESTION}
          </h2>
          <DossierVisitForm items={dossier.items} token={token} />
          <footer className="mt-2 flex flex-col gap-2 break-inside-avoid">
            <p className="border-t border-zinc-200 pt-3 text-xs text-zinc-500">
              {DOSSIER_DISCLAIMER}
            </p>
            {agency.advisorName ? (
              <div className="flex items-center gap-4 border border-zinc-200 bg-white px-4 py-3">
                {agency.advisorPhotoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={agency.advisorPhotoUrl}
                    alt={agency.advisorName}
                    className="h-14 w-14 shrink-0 rounded-full object-cover"
                  />
                ) : null}
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className={kicker}>Votre conseiller</span>
                  <span className="font-semibold">{agency.advisorName}</span>
                  <span className="text-sm text-zinc-500">
                    {[agency.advisorPhone, agency.advisorEmail].filter(Boolean).join(' · ')}
                  </span>
                </div>
                {agency.advisorQr ? (
                  <svg
                    viewBox={`0 0 ${agency.advisorQr.size} ${agency.advisorQr.size}`}
                    className="h-16 w-16 shrink-0"
                    role="img"
                    aria-label="Carte de contact du conseiller"
                    shapeRendering="crispEdges"
                  >
                    <path d={agency.advisorQr.path} fill="currentColor" />
                  </svg>
                ) : null}
              </div>
            ) : null}
            <p className="text-xs leading-relaxed text-zinc-500">
              {[
                agency.name,
                agency.postalAddress,
                agency.professionalCard
                  ? `Carte professionnelle ${agency.professionalCard}${agency.professionalCardIssuer ? ` délivrée par ${agency.professionalCardIssuer}` : ''}`
                  : null,
                agency.financialGuarantee?.trim() || 'Ne peut recevoir aucun fonds',
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </footer>
        </section>
      </div>
    </article>
  );
}
