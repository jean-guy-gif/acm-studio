'use client';

import { useLiveTexts } from '@/features/live-seller/components/live-texts';
import { propertyTypeIn } from '@/lib/client-texts';
import { LiveGallery } from '@/features/live-seller/components/live-gallery';
import {
  choice,
  fieldInput,
  fieldLabel,
  panel,
  panelSoft,
  question,
  questionHint,
  statLabel,
  statValue,
} from '@/features/live-seller/components/live-stage';
import { PROPERTY_CONFIRMED_VALUES } from '@/features/live-seller/constants';
import type { LiveSellerSummary } from '@/features/live-seller/types';
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
}: {
  property: SellerPresentationProperty;
  summary: LiveSellerSummary | null;
  // Mission 131 — en présentation directe, le bien se montre sans rien demander au vendeur.
  asksSeller?: boolean;
}) {
  const { language, texts } = useLiveTexts();
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

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <div className="flex flex-col gap-3">
        <h2 className={question}>{t.title}</h2>
        <p className={questionHint}>{asksSeller ? t.askHint : t.showHint}</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.15fr_1fr] lg:gap-8">
        <div className="flex flex-col gap-4">
          <LiveGallery photos={property.photoUrls} alt={alt} />

          {stats.length > 0 ? (
            <div className={`${panelSoft} grid grid-cols-2 gap-4 sm:grid-cols-3`}>
              {stats.map((stat) => (
                <div key={stat.label}>
                  <div className={statLabel}>{stat.label}</div>
                  <div className={statValue}>{stat.value}</div>
                </div>
              ))}
            </div>
          ) : null}

          {property.description ? (
            <p className="text-sm whitespace-pre-wrap text-zinc-600 stage:text-white/70">
              {property.description}
            </p>
          ) : null}

          {property.features.length > 0 ? (
            <div className={panelSoft}>
              <div className={statLabel}>{t.highlights}</div>
              <div className={statValue}>{property.features.join(', ')}</div>
            </div>
          ) : null}
        </div>

        {asksSeller ? (
          <form
            onSubmit={(e) => e.preventDefault()}
            className={`${panel} flex h-fit flex-col gap-4`}
          >
            <fieldset className="flex flex-col gap-3">
              <legend className={fieldLabel}>{t.question}</legend>
              <div className="flex flex-col gap-3">
                {PROPERTY_CONFIRMED_VALUES.map((value) => (
                  <label key={value} className={choice}>
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

            <label className="flex flex-col gap-1.5">
              <span className={fieldLabel}>{t.comment}</span>
              <textarea
                name="seller_property_comment"
                rows={3}
                defaultValue={currentComment}
                className={fieldInput}
              />
            </label>
          </form>
        ) : null}
      </div>
    </div>
  );
}
