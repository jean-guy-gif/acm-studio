import type { SellerPresentationProperty } from '@/features/seller-presentation/types/seller-presentation';

function line(label: string, value: string | number | null): string {
  return value != null && value !== '' ? `${label} : ${value}` : `${label} : —`;
}

export function PresentationProperty({
  property,
}: {
  property: SellerPresentationProperty | null;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-medium">Bien vendeur</h2>
      {property == null ? (
        <p className="text-zinc-500">Aucun bien vendeur renseigné.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 text-sm text-zinc-600 sm:grid-cols-3 dark:text-zinc-400">
            <span>{line('Type', property.propertyType)}</span>
            <span>{line('Ville', property.city)}</span>
            <span>{line('Quartier', property.district)}</span>
            <span>
              {line('Surface', property.surfaceArea != null ? `${property.surfaceArea} m²` : null)}
            </span>
            <span>{line('Pièces', property.roomsCount)}</span>
            <span>{line('Chambres', property.bedroomsCount)}</span>
            <span>{line('DPE', property.energyRating)}</span>
            <span>{line('GES', property.gesRating)}</span>
            <span>{line('Adresse', property.address)}</span>
          </div>

          {property.features.length > 0 ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Caractéristiques : {property.features.join(', ')}
            </p>
          ) : null}

          {property.photoUrls.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {property.photoUrls.slice(0, 6).map((url) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={url}
                  src={url}
                  alt="Bien vendeur"
                  className="h-24 w-32 rounded object-cover"
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-zinc-500">Aucun visuel disponible.</p>
          )}
        </>
      )}
    </section>
  );
}
