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

import {
  DIAGNOSTIC_STATUS_LABELS,
  type DiagnosticStatus,
} from '@/features/subject-property-diagnostics/constants/diagnostic-statuses';
import type { SubjectPropertyCondominium } from '@/features/subject-property-condominium/types';
import type { SubjectPropertyDiagnostics } from '@/features/subject-property-diagnostics/types';

function statusLabel(value: string | null): string | null {
  if (value == null) {
    return null;
  }
  return DIAGNOSTIC_STATUS_LABELS[value as DiagnosticStatus] ?? value;
}

function boolLabel(value: boolean | null): string | null {
  if (value == null) {
    return null;
  }
  return value ? 'Oui' : 'Non';
}

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

export function LivePropertySection({
  property,
  diagnostics,
  condominium,
}: {
  property: SellerPresentationProperty | null;
  diagnostics: SubjectPropertyDiagnostics | null;
  condominium: SubjectPropertyCondominium | null;
}) {
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

      {diagnostics ? (
        <div className="flex flex-col gap-3 border-t border-zinc-200 pt-4 dark:border-zinc-800">
          <h3 className="text-lg font-medium">Diagnostics</h3>
          <div className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-3">
            <Fact label="Date DPE" value={diagnostics.dpe_date} />
            <Fact
              label="Consommation"
              value={
                diagnostics.energy_consumption != null
                  ? `${diagnostics.energy_consumption} kWhEP/m²/an`
                  : null
              }
            />
            <Fact
              label="Émissions"
              value={
                diagnostics.ges_emissions != null
                  ? `${diagnostics.ges_emissions} kgCO₂/m²/an`
                  : null
              }
            />
            <Fact label="Amiante" value={statusLabel(diagnostics.asbestos_status)} />
            <Fact label="Plomb" value={statusLabel(diagnostics.lead_status)} />
            <Fact label="Électricité" value={statusLabel(diagnostics.electricity_status)} />
            <Fact label="Gaz" value={statusLabel(diagnostics.gas_status)} />
            <Fact label="Termites" value={statusLabel(diagnostics.termites_status)} />
            <Fact label="Risques et pollutions" value={statusLabel(diagnostics.erp_status)} />
            <Fact label="Réalisés le" value={diagnostics.diagnostics_completed_at} />
            <Fact label="Valides jusqu’au" value={diagnostics.diagnostics_valid_until} />
          </div>
        </div>
      ) : null}

      {condominium ? (
        <div className="flex flex-col gap-3 border-t border-zinc-200 pt-4 dark:border-zinc-800">
          <h3 className="text-lg font-medium">Copropriété</h3>
          {condominium.is_condominium ? (
            <div className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-3">
              <Fact label="Copropriété" value="Oui" />
              <Fact
                label="Lots"
                value={
                  condominium.total_lots != null
                    ? `${condominium.total_lots}${
                        condominium.residential_lots != null
                          ? ` dont ${condominium.residential_lots} hab.`
                          : ''
                      }`
                    : null
                }
              />
              <Fact
                label="Charges annuelles"
                value={
                  condominium.annual_charges != null ? `${condominium.annual_charges} €/an` : null
                }
              />
              <Fact
                label="Fonds travaux"
                value={condominium.works_fund != null ? `${condominium.works_fund} €` : null}
              />
              <Fact label="Syndic" value={condominium.syndic_name} />
              <Fact label="Procédure en cours" value={boolLabel(condominium.ongoing_procedures)} />
              <Fact label="Travaux votés" value={boolLabel(condominium.voted_works)} />
              <Fact label="Travaux à prévoir" value={boolLabel(condominium.planned_works)} />
              <Fact
                label="Impayés connus"
                value={
                  condominium.known_unpaid_charges === true
                    ? condominium.known_unpaid_charges_amount != null
                      ? `Oui (${condominium.known_unpaid_charges_amount} €)`
                      : 'Oui'
                    : condominium.known_unpaid_charges === false
                      ? 'Non'
                      : null
                }
              />
              <Fact label="Dernière AG" value={condominium.last_general_assembly_date} />
            </div>
          ) : (
            <p className="text-lg text-zinc-600 dark:text-zinc-400">Bien hors copropriété.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
