import type { SellerPresentationProperty } from '@/features/seller-presentation/types/seller-presentation';

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
      </div>

      {property.features.length > 0 ? (
        <div>
          <div className="text-sm text-zinc-500">Caractéristiques principales</div>
          <div className="text-lg">{property.features.join(' · ')}</div>
        </div>
      ) : null}
    </div>
  );
}
