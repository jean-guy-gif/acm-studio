import type { SellerPresentationProperty } from '@/features/seller-presentation/types/seller-presentation';
import {
  EXPOSURE_LABELS,
  GENERAL_CONDITION_LABELS,
  HEATING_TYPE_LABELS,
  OUTDOOR_SPACE_LABELS,
  PARKING_TYPE_LABELS,
  type Exposure,
  type GeneralCondition,
  type HeatingType,
  type OutdoorSpace,
  type ParkingType,
} from '@/features/subject-property/constants/property-options';

function labelList<T extends string>(codes: string[], labels: Record<T, string>): string | null {
  const mapped = codes.map((code) => labels[code as T] ?? code);
  return mapped.length > 0 ? mapped.join(' · ') : null;
}

// Read-only. Only present values are rendered — no repeated dashes, nothing
// invented.
function Fact({ label, value }: { label: string; value: string | number | null }) {
  if (value == null || value === '') {
    return null;
  }
  return (
    <div>
      <div className="text-sm text-zinc-500">{label}</div>
      <div className="text-xl font-medium">{value}</div>
    </div>
  );
}

export function LivePropertySection({ property }: { property: SellerPresentationProperty | null }) {
  if (property == null) {
    return <p className="text-lg text-zinc-500">Aucun bien vendeur n’est renseigné.</p>;
  }

  const [main, ...gallery] = property.photoUrls;

  return (
    <div className="flex flex-col gap-6">
      {main ? (
        <div className="flex flex-col gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={main}
            alt="Bien vendeur"
            className="max-h-[45vh] w-full rounded-lg object-cover"
          />
          {gallery.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {gallery.slice(0, 5).map((url) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={url}
                  src={url}
                  alt="Bien vendeur"
                  className="h-20 w-28 rounded object-cover"
                />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-3">
        <Fact label="Type de bien" value={property.propertyType} />
        <Fact label="Ville" value={property.city} />
        <Fact label="Quartier" value={property.district} />
        <Fact
          label="Surface"
          value={property.surfaceArea != null ? `${property.surfaceArea} m²` : null}
        />
        <Fact label="Pièces" value={property.roomsCount} />
        <Fact label="Chambres" value={property.bedroomsCount} />
        <Fact label="DPE" value={property.energyRating} />
        <Fact label="GES" value={property.gesRating} />
        <Fact
          label="Étage"
          value={
            property.floor != null
              ? property.buildingFloors != null
                ? `${property.floor} / ${property.buildingFloors}`
                : property.floor
              : null
          }
        />
        <Fact
          label="Exposition"
          value={property.exposure ? EXPOSURE_LABELS[property.exposure as Exposure] : null}
        />
        <Fact label="Année de construction" value={property.constructionYear} />
        <Fact
          label="État général"
          value={
            property.generalCondition
              ? GENERAL_CONDITION_LABELS[property.generalCondition as GeneralCondition]
              : null
          }
        />
        <Fact
          label="Chauffage"
          value={
            property.heatingType ? HEATING_TYPE_LABELS[property.heatingType as HeatingType] : null
          }
        />
        <Fact
          label="Charges"
          value={property.monthlyCharges != null ? `${property.monthlyCharges} €/mois` : null}
        />
        <Fact
          label="Taxe foncière"
          value={property.propertyTax != null ? `${property.propertyTax} €/an` : null}
        />
        <Fact
          label="Extérieurs"
          value={labelList<OutdoorSpace>(property.outdoorSpaces, OUTDOOR_SPACE_LABELS)}
        />
        <Fact
          label="Stationnements"
          value={labelList<ParkingType>(property.parkingTypes, PARKING_TYPE_LABELS)}
        />
      </div>

      {property.features.length > 0 ? (
        <div>
          <div className="text-sm text-zinc-500">Points forts</div>
          <div className="text-lg">{property.features.join(' · ')}</div>
        </div>
      ) : null}

      {property.watchPoints.length > 0 ? (
        <div>
          <div className="text-sm text-zinc-500">Points de vigilance</div>
          <div className="text-lg">{property.watchPoints.join(' · ')}</div>
        </div>
      ) : null}
    </div>
  );
}
