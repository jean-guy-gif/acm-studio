import { GridLegend, MustHaveStar, markClass } from '@/features/buyer-deck/components/deck-marks';
import { criteriaCountLabel, markSymbol } from '@/features/buyer-deck/services/buyer-deck';
import { AVAILABILITY_SLOTS, ITEM_ANSWERS, type DeckItem } from '@/features/buyer-deck/types';
import type { BuyerDossier } from '@/features/buyer-dossier/types';
import { clientTexts, type TextLanguage } from '@/lib/client-texts';
import { buyerDateIn } from '@/features/buyers/services/buyer-criteria';
import { displayPhotoUrl } from '@/lib/photo-url';
import { withFrenchSpacing } from '@/lib/typography/french-spacing';

// Mission 122 (partie B) — le PDF du dossier qui fait agir : la même logique sur papier. Couverture
// (sa phrase, la photo du bien A, « Votre sélection du [date] »), la grille en page 2, un bien par
// page décrit par ses critères, et la dernière page « Mes choix » : pour chaque bien, trois cases à
// cocher au stylo, ses disponibilités à cocher, le conseiller et son QR, les mentions de l'agence
// (M84, M102). Imprimé par le navigateur (M84), aux couleurs de l'agence (M55).
// Essai de Jean-Guy (25/10) : la couverture porte la photo du bien A en pleine page (sinon la
// première photo de la sélection), sa phrase, la date et le conseiller ; chaque bien commence une
// page et ne se coupe jamais, photos comprises ; l'étoile des indispensables est dessinée ; le
// budget prend les couleurs de la M116.

const kicker = 'text-[0.62rem] font-semibold tracking-[0.14em] text-zinc-500 uppercase';

const cssString = (value: string): string => `"${value.replace(/["\\]/g, '')}"`;

// Une case à cocher au stylo.
function Box({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-2" data-testid="dossier-choice-box">
      <span aria-hidden className="inline-block h-4 w-4 shrink-0 border-2 border-zinc-700" />
      <span>{label}</span>
    </span>
  );
}

function ItemPage({ entry, language }: { entry: DeckItem; language: TextLanguage }) {
  const { item } = entry;
  const t = clientTexts(language).buyer.screens;
  const where = [item.district, item.city]
    .filter((part): part is string => part != null && part !== '')
    .join(' · ');
  return (
    <section
      className="flex flex-col gap-4 break-before-page break-inside-avoid print:pt-[4mm]"
      data-testid="dossier-item"
    >
      <div className="flex flex-col gap-1">
        <span className={kicker}>
          {t.kickerItem(entry.letter, criteriaCountLabel(entry, language))}
        </span>
        <h2 className="font-title text-2xl font-bold text-brand-darker">{item.label}</h2>
        {where ? <p className="text-sm text-zinc-600">{where}</p> : null}
      </div>
      {entry.photos.length > 0 ? (
        <div className="grid grid-cols-3 gap-2 break-inside-avoid" data-testid="dossier-photos">
          {entry.photos.slice(0, 3).map((photo, index) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={photo}
              src={displayPhotoUrl(photo)}
              alt=""
              className={`h-40 w-full bg-zinc-100 object-cover ${index === 0 ? 'col-span-3 h-64' : ''}`}
            />
          ))}
        </div>
      ) : null}
      <ul className="flex flex-col gap-1.5 border border-zinc-200 bg-white px-4 py-3">
        {entry.marks.map((mark) => (
          <li
            key={mark.criterion}
            data-testid="dossier-mark"
            data-mark={mark.mark}
            data-tone={mark.tone ?? undefined}
          >
            <span className={`font-medium ${markClass(mark)}`}>
              {markSymbol(mark.mark)} {mark.text}
            </span>
            {mark.criterion === 'budget' && entry.priceLine ? (
              <span className="block pl-5 text-xs text-zinc-500">{entry.priceLine}</span>
            ) : null}
          </li>
        ))}
        {!entry.marks.some((mark) => mark.criterion === 'budget') && entry.priceLine ? (
          <li className="text-xs text-zinc-500">{entry.priceLine}</li>
        ) : null}
      </ul>
      {entry.pitch ? (
        <div className="border-l-4 border-brand bg-white px-4 py-3" data-testid="dossier-pitch">
          <div className={kicker}>{t.pitchTitle}</div>
          <p className="mt-1 text-base">«&nbsp;{withFrenchSpacing(entry.pitch)}&nbsp;»</p>
        </div>
      ) : null}
      {entry.datedFact ? <p className="text-sm text-zinc-600">● {entry.datedFact}</p> : null}
    </section>
  );
}

export function BuyerDossierDocument({ dossier }: { dossier: BuyerDossier }) {
  const { agency, deck } = dossier;
  // Mission 140 — dans la langue de l'acquéreur ; les mentions légales de l'agence en français.
  const language: TextLanguage = deck.language ?? 'fr';
  const texts = clientTexts(language);
  const t = texts.buyer.screens;
  const day = buyerDateIn(dossier.selectedAt, language);
  const footer = `${t.confidential} · ${dossier.sector} · ${day}`;
  const pageRules = `@page{size:A4;margin:12mm 0 16mm 0;@bottom-left{content:${cssString(footer)};padding-left:14mm;font-size:7.5pt;letter-spacing:.08em;text-transform:uppercase;color:#64748b}@bottom-right{content:counter(page,decimal-leading-zero) " / " counter(pages,decimal-leading-zero);padding-right:14mm;font-size:7.5pt;color:#64748b}}@page :first{margin:0;@bottom-left{content:none}@bottom-right{content:none}}`;
  // La photo du bien A en pleine page ; s'il est « Sans photo » ou n'en a pas, la première photo de
  // la sélection — un aplat seulement quand aucun bien n'a de photo, et jamais vide : sa phrase,
  // la date et le conseiller y sont toujours.
  const cover = deck.items.flatMap((entry) => entry.photos)[0] ?? null;

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

      <section
        className="relative flex min-h-[150mm] flex-col overflow-hidden bg-brand-deep text-white break-after-page print:h-[297mm] print:min-h-0"
        data-testid="dossier-cover"
      >
        {cover ? (
          <>
            {/* Essai de Jean-Guy (25/10) : la photo cadrée sur le bien, pas sur le ciel — plus haute
                que la page et posée en bas, son haut est rogné ; le dégradé sombre n'est qu'en
                bas, sous le texte ; jamais de voile sur la photo. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={displayPhotoUrl(cover)}
              alt=""
              className="absolute inset-x-0 bottom-0 h-[135%] w-full object-cover object-bottom"
              data-testid="dossier-cover-photo"
            />
            <div className="absolute inset-x-0 bottom-0 h-[42%] bg-gradient-to-b from-transparent to-brand-darker/95" />
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
            <span className="rounded bg-brand-darker/80 px-3 py-1.5 font-title text-lg font-semibold">
              {agency.name}
            </span>
          )}
          <span className="rounded bg-brand-darker/80 px-3 py-1.5 text-xs tracking-[0.16em] uppercase">
            {day}
          </span>
        </div>
        <div className="flex-1" />
        <div className="relative flex flex-col gap-3 px-8 pb-12 sm:px-12">
          <h1 className="font-title text-4xl leading-tight font-bold sm:text-5xl">
            {t.selectionOf(day)}
          </h1>
          <p className="text-xs tracking-[0.16em] uppercase opacity-90">{t.wordsTitle}</p>
          <p className="font-title text-xl leading-snug font-semibold" data-testid="dossier-words">
            «&nbsp;{withFrenchSpacing(deck.words)}&nbsp;»
          </p>
          <p className="text-sm opacity-90">
            {t.propertiesCount(deck.items.length)} · {dossier.sector}
          </p>
          {agency.advisorName ? (
            <p className="mt-2 text-sm font-semibold" data-testid="dossier-cover-advisor">
              {t.advisorLabel}
              {[agency.advisorName, agency.advisorPhone].filter(Boolean).join(' · ')}
            </p>
          ) : null}
        </div>
      </section>

      <div className="flex flex-col gap-6 p-5 sm:p-8 print:px-[14mm] print:py-0">
        <section
          className="flex flex-col gap-3 break-inside-avoid print:pt-[4mm]"
          data-testid="dossier-grid"
        >
          <h2 className="font-title text-2xl font-bold text-brand-darker">{t.kickerCriteria}</h2>
          <table className="w-full border-collapse border border-zinc-200 bg-white text-left">
            <thead>
              <tr>
                <th className={`${kicker} border-b border-zinc-200 px-3 py-2`}>{t.criterion}</th>
                {deck.items.map((entry) => (
                  <th
                    key={entry.item.itemId}
                    className="border-b border-zinc-200 px-3 py-3 text-center align-bottom font-title text-lg font-bold text-brand-darker"
                    data-testid="dossier-grid-head"
                  >
                    {/* La miniature du bien et sa lettre (essai de Jean-Guy, 25/10). */}
                    <span className="flex flex-col items-center gap-1.5">
                      {entry.photos[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={displayPhotoUrl(entry.photos[0])}
                          alt=""
                          className="h-24 w-36 bg-zinc-100 object-cover"
                          data-testid="dossier-grid-thumb"
                        />
                      ) : null}
                      <span>{entry.letter}</span>
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {deck.criteria.map((row, rowIndex) => (
                <tr key={row.criterion} data-testid="dossier-grid-row">
                  <th
                    scope="row"
                    className="border-t border-zinc-100 px-4 py-3.5 text-base font-medium"
                  >
                    {row.label}
                    {row.mustHave ? (
                      <>
                        {' '}
                        <MustHaveStar language={language} />
                      </>
                    ) : null}
                  </th>
                  {deck.items.map((entry) => {
                    const mark = entry.marks[rowIndex]!;
                    return (
                      <td
                        key={entry.item.itemId}
                        title={mark.text}
                        data-tone={mark.tone ?? undefined}
                        className={`border-t border-zinc-100 px-3 py-3.5 text-center font-title text-2xl font-bold ${markClass(mark)}`}
                      >
                        {markSymbol(mark.mark)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <GridLegend className="text-sm text-zinc-500" language={language} />
          {deck.lead ? (
            <p className="mt-4 border-l-4 border-brand bg-white px-5 py-4 font-title text-2xl font-semibold text-brand-darker">
              {deck.lead}
            </p>
          ) : null}
        </section>

        {deck.items.map((entry) => (
          <ItemPage key={entry.item.itemId} entry={entry} language={language} />
        ))}

        <section
          className="flex flex-col gap-4 break-before-page break-inside-avoid print:pt-[4mm]"
          data-testid="dossier-choices"
        >
          <h2 className="font-title text-2xl font-bold text-brand-darker">{t.choicesTitle}</h2>
          <ul className="flex flex-col gap-2">
            {deck.items.map((entry) => (
              <li
                key={entry.item.itemId}
                className="flex flex-col gap-2 border border-zinc-200 bg-white px-4 py-3"
                data-testid="dossier-choice-row"
              >
                <span className="font-semibold">
                  {t.kickerItem(entry.letter, entry.item.label)}
                </span>
                <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                  {ITEM_ANSWERS.map((answer) => (
                    <Box key={answer} label={t.answers[answer]} />
                  ))}
                </div>
              </li>
            ))}
          </ul>
          <div className="flex flex-col gap-2 border border-zinc-200 bg-white px-4 py-3">
            <span className="font-semibold">{t.when}</span>
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
              {AVAILABILITY_SLOTS.map((slot) => (
                <Box key={slot} label={t.slots[slot]} />
              ))}
            </div>
          </div>
          <footer className="mt-2 flex flex-col gap-2 break-inside-avoid">
            <p className="border-t border-zinc-200 pt-3 text-xs text-zinc-500">{t.disclaimer}</p>
            {agency.advisorName ? (
              <div
                className="flex items-center gap-4 border border-zinc-200 bg-white px-4 py-3"
                data-testid="dossier-advisor"
              >
                {agency.advisorPhotoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={agency.advisorPhotoUrl}
                    alt={agency.advisorName}
                    className="h-14 w-14 shrink-0 rounded-full object-cover"
                  />
                ) : null}
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className={kicker}>{texts.documents.common.advisor}</span>
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
                    aria-label={texts.documents.common.contactCard}
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
