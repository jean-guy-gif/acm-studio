'use client';

import { useLiveTexts } from '@/features/live-seller/components/live-texts';
import { propertyTypeIn } from '@/lib/client-texts';
import { LiveGallery } from '@/features/live-seller/components/live-gallery';
import { LiveCommentField } from '@/features/live-seller/components/live-comment-field';
import {
  answerColumn,
  choiceCompact,
  fieldLabel,
  navBtn,
  panelTight,
  photoColumn,
  question,
  questionHint,
  screen,
  screenBodyWideAnswers,
  screenHead,
  statLabel,
} from '@/features/live-seller/components/live-stage';
import { PROPERTY_CONFIRMED_VALUES } from '@/features/live-seller/constants';
import type { LiveSellerSummary } from '@/features/live-seller/types';
import type { NeighbourhoodLink } from '@/features/neighbourhood-link/services/neighbourhood-link';
import {
  type Exposure,
  type GeneralCondition,
  type HeatingType,
  type OutdoorSpace,
  type ParkingType,
} from '@/features/subject-property/constants/property-options';
import type { SellerPresentationProperty } from '@/features/seller-presentation/types/seller-presentation';
import { formatSquareMeters } from '@/lib/format';

// Act 1 — "Votre bien". The seller RECOGNISES the property before any competitor
// is shown. Never a price, never the advisor range, never an estimate: the whole
// point of this slide is recognition, and the seller's yes/no + free comment.
function labelOf<T extends string>(map: Record<T, string>, value: string | null): string | null {
  if (value == null) {
    return null;
  }
  return (map as Record<string, string>)[value] ?? value;
}

function joinLabels<T extends string>(map: Record<T, string>, values: string[]): string | null {
  const kept = values.filter((value) => value && value !== 'none');
  if (kept.length === 0) {
    return null;
  }
  return kept.map((value) => (map as Record<string, string>)[value] ?? value).join(', ');
}

export function LivePageProperty({
  property,
  summary,
  asksSeller = true,
  neighbourhood = null,
}: {
  property: SellerPresentationProperty;
  summary: LiveSellerSummary | null;
  // Mission 131 — en présentation directe, le bien se montre sans rien demander au vendeur.
  asksSeller?: boolean;
  // Mission 157 B — le lien « Vivre ici » du bien (planche M157B-1) ; null sans lien valable.
  neighbourhood?: NeighbourhoodLink | null;
}) {
  const { language, texts } = useLiveTexts();
  const n = texts.neighbourhood;
  const t = texts.live.property;
  const currentAnswer = summary?.seller_property_confirmed ?? '';
  const currentComment = summary?.seller_property_comment ?? '';

  const floors =
    property.floor != null
      ? property.buildingFloors != null
        ? `${property.floor}/${property.buildingFloors}`
        : String(property.floor)
      : null;

  // Recognition characteristics only — deliberately no price, charges or tax.
  const stats: { label: string; value: string | null }[] = [
    { label: t.stats.type, value: propertyTypeIn(property.propertyType, texts) },
    {
      label: t.stats.surface,
      value:
        property.surfaceArea != null
          ? formatSquareMeters(property.surfaceArea, { language })
          : null,
    },
    {
      label: t.stats.rooms,
      value: property.roomsCount != null ? String(property.roomsCount) : null,
    },
    {
      label: t.stats.bedrooms,
      value: property.bedroomsCount != null ? String(property.bedroomsCount) : null,
    },
    { label: t.stats.floor, value: floors },
    { label: t.stats.exposure, value: labelOf<Exposure>(texts.labels.exposure, property.exposure) },
    {
      label: t.stats.condition,
      value: labelOf<GeneralCondition>(texts.labels.condition, property.generalCondition),
    },
    {
      label: t.stats.construction,
      value: property.constructionYear != null ? String(property.constructionYear) : null,
    },
    {
      label: t.stats.heating,
      value: labelOf<HeatingType>(texts.labels.heating, property.heatingType),
    },
    { label: t.stats.energy, value: property.energyRating },
    { label: t.stats.ges, value: property.gesRating },
    {
      label: t.stats.outdoor,
      value: joinLabels<OutdoorSpace>(texts.labels.outdoor, property.outdoorSpaces),
    },
    {
      label: t.stats.parking,
      value: joinLabels<ParkingType>(texts.labels.parking, property.parkingTypes),
    },
    { label: t.stats.district, value: property.district },
    { label: t.stats.city, value: property.city },
    { label: t.stats.address, value: property.address },
  ].filter((stat) => stat.value != null && stat.value !== '');

  const alt =
    [propertyTypeIn(property.propertyType, texts), property.city].filter(Boolean).join(' · ') ||
    t.fallbackAlt;

  // Mission 148 — « Votre bien » tient sur un écran (planche 1) : la photo prend la hauteur qui
  // reste, ses vignettes dedans ; à côté, la question, les caractéristiques en pastilles compactes
  // (une valeur longue passe à la ligne, jamais coupée) et les points forts sous la photo. La
  // description quitte l'écran : c'est le texte de la fiche, que le vendeur connaît (réponse 4).
  return (
    <div className={screen}>
      <div className={screenHead}>
        <h2 className={question}>{t.title}</h2>
        <p className={questionHint}>{asksSeller ? t.askHint : t.showHint}</p>
      </div>

      {/* Les caractéristiques ont la colonne la plus large : une valeur longue (le chauffage,
          l'adresse) passe à la ligne sans pousser l'écran sous la barre. */}
      <div className={screenBodyWideAnswers}>
        <div className={photoColumn}>
          <LiveGallery photos={property.photoUrls} alt={alt} fill />
          {property.features.length > 0 ? (
            <p className="shrink-0 text-sm text-zinc-700 stage:text-white/80">
              <span className={statLabel}>{t.highlights}</span> {property.features.join(' · ')}
            </p>
          ) : null}
        </div>

        <div className={answerColumn}>
          {asksSeller ? (
            <form
              onSubmit={(e) => e.preventDefault()}
              className={`${panelTight} flex flex-col gap-2`}
            >
              <fieldset className="flex flex-col gap-2">
                <legend className={`${fieldLabel} mb-1.5`}>{t.question}</legend>
                <div className="grid grid-cols-1 gap-2 md:portrait:grid-cols-2">
                  {PROPERTY_CONFIRMED_VALUES.map((value) => (
                    <label key={value} className={choiceCompact}>
                      <input
                        type="radio"
                        name="seller_property_confirmed"
                        value={value}
                        defaultChecked={currentAnswer === value}
                        className="sr-only"
                      />
                      {t.confirmed[value]}
                    </label>
                  ))}
                </div>
              </fieldset>
              <LiveCommentField name="seller_property_comment" defaultValue={currentComment} />
            </form>
          ) : null}

          {stats.length > 0 ? (
            <dl
              className="grid shrink-0 grid-cols-2 gap-1.5 sm:grid-cols-3 md:portrait:grid-cols-4"
              data-property-stats
            >
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="flex min-w-0 flex-col rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1 stage:border-white/15 stage:bg-white/5"
                >
                  <dt className="text-[0.6rem] leading-tight font-semibold tracking-[0.1em] text-zinc-500 uppercase stage:text-white/55">
                    {stat.label}
                  </dt>
                  <dd className="font-title text-sm leading-tight font-semibold break-words text-zinc-900 stage:text-white">
                    {stat.value}
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}

          {/* Mission 157 B — « Vivre ici » : la page du quartier s'ouvre dans un nouvel onglet,
              dans le geste du conseiller ; le Live reste là, rien n'est écrit. En contour : le
              seul plein reste « Valider et continuer » (M146). */}
          {neighbourhood ? (
            <a
              href={neighbourhood.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`${navBtn} shrink-0 justify-between px-3.5 py-2 text-left`}
              data-testid="live-neighbourhood"
            >
              <span className="flex min-w-0 flex-col">
                <span className="font-title text-base font-semibold">{n.title}</span>
                <span className="text-xs opacity-80">{n.subtitle}</span>
              </span>
              <span aria-hidden className="text-lg">
                ↗
              </span>
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}
