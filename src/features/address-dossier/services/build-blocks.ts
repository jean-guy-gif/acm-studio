import { salesData } from '@/features/address-dossier/services/sales-stats';
import type {
  CondoData,
  DossierBlocks,
  DossierPropertyType,
  DpeData,
  EmptyNote,
  ParcelData,
  RealSale,
  RisksData,
  SalesData,
  SourceBlock,
  UrbanismData,
} from '@/features/address-dossier/types';
import type { GeoPoint } from '@/features/competitor-search/types';

// Mission 141 — le dossier d'adresse, source par source. Les sources sont lues ensemble ; une
// source en panne n'empêche pas les autres (point 8 de la fiche) et, à l'actualisation, garde sa
// dernière lecture réussie avec sa date (décision du 07/11). Sans réseau ici : les lectures sont
// données par l'appelant (les services publics, ou le jeu figé de la démo).

export type AddressContext = {
  point: GeoPoint;
  // L'adresse trouvée au numéro (`housenumber`) ou seulement à la rue (`street`) : le DPE, la
  // parcelle et la copropriété ne se lisent qu'au numéro.
  precision: 'housenumber' | 'street';
  // L'identifiant de l'adresse dans la Base Adresse Nationale : c'est lui qui désigne le DPE.
  banId: string | null;
  inseeCode: string;
  address: string;
  city: string;
  propertyType: DossierPropertyType | null;
};

// Chaque lecture rend sa donnée, null quand la source ne dit rien de l'adresse, ou lève une erreur
// quand la source est en panne.
export type SourceReaders = {
  sales: (context: AddressContext & { propertyType: DossierPropertyType }) => Promise<RealSale[]>;
  dpe: (banId: string) => Promise<DpeData | null>;
  risks: (context: AddressContext) => Promise<RisksData | null>;
  urbanism: (context: AddressContext) => Promise<UrbanismData | null>;
  parcel: (context: AddressContext) => Promise<ParcelData | null>;
  condo: (context: AddressContext) => Promise<CondoData | null>;
};

export type SourceFailure = { source: keyof DossierBlocks; error: unknown };

// Mission 142 — partagée avec « Vivre ici ».
export async function readSource<T>(
  readAt: string,
  previous: SourceBlock<T> | undefined,
  run: () => Promise<{ data: T | null; sourceDate: string | null; note?: EmptyNote }>,
  onFailure: (error: unknown) => void,
): Promise<SourceBlock<T>> {
  try {
    const { data, sourceDate, note } = await run();
    if (data == null) return { state: 'empty', readAt, sourceDate, ...(note ? { note } : {}) };
    return { state: 'ok', readAt, sourceDate, data };
  } catch (error) {
    onFailure(error);
    // La dernière lecture réussie reste, datée ; l'écran dit que la source n'a pas répondu.
    if (previous?.state === 'ok') return { ...previous, failedAt: readAt };
    return { state: 'unavailable', readAt };
  }
}

const empty = (note: EmptyNote) => async () => ({ data: null, sourceDate: null, note });

export async function buildBlocks(input: {
  context: AddressContext;
  readers: SourceReaders;
  previous: DossierBlocks | null;
  now: Date;
}): Promise<{ blocks: DossierBlocks; failures: SourceFailure[] }> {
  const { context, readers, previous } = input;
  const readAt = input.now.toISOString();
  const failures: SourceFailure[] = [];
  const failed = (source: keyof DossierBlocks) => (error: unknown) =>
    failures.push({ source, error });
  const atNumber = context.precision === 'housenumber';
  const propertyType = context.propertyType;

  const [sales, dpe, risks, urbanism, parcel, condo] = await Promise.all([
    readSource<SalesData>(
      readAt,
      previous?.sales,
      propertyType == null
        ? empty('not_a_house_or_apartment')
        : async () => {
            const data = salesData(await readers.sales({ ...context, propertyType }), propertyType);
            return { data: data.count > 0 ? data : null, sourceDate: data.latestSaleDate };
          },
      failed('sales'),
    ),
    readSource<DpeData>(
      readAt,
      previous?.dpe,
      !atNumber
        ? empty('street_only')
        : async () => {
            // Sans identifiant d'adresse, aucun DPE ne se rattache à elle : rien trouvé.
            const data = context.banId == null ? null : await readers.dpe(context.banId);
            return { data, sourceDate: data?.date ?? null };
          },
      failed('dpe'),
    ),
    readSource<RisksData>(
      readAt,
      previous?.risks,
      async () => ({ data: await readers.risks(context), sourceDate: null }),
      failed('risks'),
    ),
    readSource<UrbanismData>(
      readAt,
      previous?.urbanism,
      async () => ({ data: await readers.urbanism(context), sourceDate: null }),
      failed('urbanism'),
    ),
    readSource<ParcelData>(
      readAt,
      previous?.parcel,
      !atNumber
        ? empty('street_only')
        : async () => {
            const data = await readers.parcel(context);
            return data
              ? { data, sourceDate: null }
              : { data: null, sourceDate: null, note: 'parcel_undetermined' as const };
          },
      failed('parcel'),
    ),
    readSource<CondoData>(
      readAt,
      previous?.condo,
      !atNumber
        ? empty('street_only')
        : async () => {
            const data = await readers.condo(context);
            return { data, sourceDate: data?.updatedOn ?? null };
          },
      failed('condo'),
    ),
  ]);
  return { blocks: { sales, dpe, risks, urbanism, parcel, condo }, failures };
}

// L'adresse et le type du moment : si elles changent, le dossier d'adresse dit de l'actualiser.
export function addressFingerprint(input: {
  address: string | null;
  postalCode: string | null;
  city: string | null;
  propertyType: string | null;
}): string {
  return [input.address, input.postalCode, input.city, input.propertyType]
    .map((part) => (part ?? '').trim().toLowerCase())
    .join('|')
    .slice(0, 600);
}
