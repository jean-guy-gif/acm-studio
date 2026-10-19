'use client';

import { useEffect, useImperativeHandle, useState, type Ref } from 'react';
import { createPortal } from 'react-dom';

import { fieldLabel, formSection, formSectionTitle, inputBase } from '@/components/ui/styles';
import {
  arrondissementLabel,
  resolveArrondissement,
} from '@/features/competitor-search/utils/arrondissements';
import { DPE_CLASSES, dpeClass } from '@/features/dpe/services/dpe';
import {
  VerifyBanner,
  VerifyMark,
  VerifyProvider,
} from '@/features/imported-fields/components/verify-fields';
import {
  SUBJECT_VERIFIABLE_FIELDS,
  addImportedFields,
  importedFields,
  sanitizeFieldsToVerify,
  withoutField,
} from '@/features/imported-fields/services/fields-to-verify';
import { PropertyCharacteristicsFields } from '@/features/subject-property/components/property-characteristics-fields';
import { PropertyEnergyFields } from '@/features/subject-property/components/property-energy-fields';
import { PropertyFinancialFields } from '@/features/subject-property/components/property-financial-fields';
import { PropertyListField } from '@/features/subject-property/components/property-list-field';
import { PropertyLocationFields } from '@/features/subject-property/components/property-location-fields';
import { PropertyPriceRangeStep } from '@/features/subject-property/components/property-price-range-step';
import {
  MultiCheckField,
  NumberField,
  SelectField,
  TextField,
} from '@/features/subject-property/components/property-inputs';
import {
  EXPOSURES,
  GENERAL_CONDITIONS,
  HEATING_TYPES,
  OUTDOOR_SPACE_LABELS,
  OUTDOOR_SPACES,
} from '@/features/subject-property/constants/property-options';
import { gesListValue, listValue } from '@/features/subject-property/services/list-values';
import {
  propertyTypeLabel,
  propertyTypeOptions,
} from '@/features/subject-property/services/property-type-choice';
import { countPropertyComplements } from '@/features/subject-property/services/complements';
import { propertyFieldId } from '@/features/subject-property/services/search-requirements';
import type {
  SheetEntries,
  SheetSectionHandle,
} from '@/features/subject-property/services/sheet-form';
import type { SubjectProperty } from '@/features/subject-property/types';
import type { SubjectPropertyImportPrefill } from '@/features/subject-property-import/types';
import { SubjectPropertyPhotosField } from '@/features/subject-property-photos/components/subject-property-photos-field';
import type { UpdatePropertyPhotosResult } from '@/features/subject-property-photos/actions/update-property-photos';
import type { UploadPropertyPhotosResult } from '@/features/subject-property-photos/actions/upload-property-photos';
import type { SignedPhoto } from '@/features/subject-property-photos/services/property-photo-storage';

type ScalarState = {
  property_type: string;
  surface_area: string;
  land_area: string;
  rooms_count: string;
  bedrooms_count: string;
  bathrooms_count: string;
  address: string;
  postal_code: string;
  city: string;
  description: string;
  district: string;
  floor: string;
  building_floors: string;
  energy_rating: string;
  ges_rating: string;
  heating_type: string;
  exposure: string;
  construction_year: string;
  general_condition: string;
  has_elevator: string;
  has_pool: string;
  monthly_charges: string;
  advisor_price_min: string;
  advisor_price_max: string;
  property_tax: string;
};

const str = (value: string | number | null | undefined): string =>
  value == null ? '' : String(value);

// Ascenseur / piscine : « yes » / « no » / « » (non renseigné) dans le formulaire.
const triState = (value: boolean | null | undefined): string =>
  value == null ? '' : value ? 'yes' : 'no';

// An imported value (when present) pre-fills the field; otherwise the saved
// property value is kept. GUARDRAIL: the SALE PRICE and the advisor RANGE are never
// seeded from an import — the range is the advisor's opinion, and a read sale price
// writes no field. Factual amounts a fiche carries (property type, floor, taxe
// foncière, charges) DO pre-fill their field (Mission 44).
//
// MISSION 77 — this component no longer saves: it is one section of the sheet. The
// save bar reads its values (`ref`) and hands back the field errors.
function initialScalars(
  property: SubjectProperty | null,
  imported?: SubjectPropertyImportPrefill,
): ScalarState {
  const pick = (
    importedValue: string | number | null | undefined,
    propertyValue: string | number | null | undefined,
  ): string => (imported && importedValue != null ? String(importedValue) : str(propertyValue));

  // MISSION 77 — le type s'affiche dans le bon choix de la liste : « appartement T3 » déjà
  // enregistré se lit « Appartement ». Un texte qui ne se reconnaît pas est gardé tel quel.
  const propertyType = pick(imported?.property_type, property?.property_type);
  // MISSION 78 — un menu ne garde jamais une valeur qu'il ne sait pas afficher : hors liste, le
  // champ est vide (il affichait « Non renseigné » en gardant la valeur cachée).
  const inList = (value: string, list: readonly string[]): string => listValue(value, list) ?? '';

  return {
    property_type: propertyTypeLabel(propertyType) ?? propertyType,
    surface_area: pick(imported?.surface_area, property?.surface_area),
    land_area: pick(imported?.land_area, property?.land_area),
    rooms_count: pick(imported?.rooms_count, property?.rooms_count),
    bedrooms_count: pick(imported?.bedrooms_count, property?.bedrooms_count),
    bathrooms_count: pick(imported?.bathrooms_count, property?.bathrooms_count),
    address: pick(imported?.address, property?.address),
    postal_code: pick(imported?.postal_code, property?.postal_code),
    city: pick(imported?.city, property?.city),
    description: pick(imported?.description, property?.description),
    district: pick(imported?.district, property?.district),
    floor: pick(imported?.floor, property?.floor),
    building_floors: pick(imported?.building_floors, property?.building_floors),
    energy_rating: dpeClass(pick(imported?.energy_rating, property?.energy_rating)) ?? '',
    ges_rating: gesListValue(pick(imported?.ges_rating, property?.ges_rating)) ?? '',
    heating_type: inList(pick(imported?.heating_type, property?.heating_type), HEATING_TYPES),
    exposure: inList(pick(imported?.exposure, property?.exposure), EXPOSURES),
    construction_year: pick(imported?.construction_year, property?.construction_year),
    general_condition: inList(
      pick(imported?.general_condition, property?.general_condition),
      GENERAL_CONDITIONS,
    ),
    has_elevator: triState(property?.has_elevator),
    has_pool: triState(property?.has_pool),
    monthly_charges: pick(imported?.monthly_charges, property?.monthly_charges),
    advisor_price_min: str(property?.advisor_price_min),
    advisor_price_max: str(property?.advisor_price_max),
    property_tax: pick(imported?.property_tax, property?.property_tax),
  };
}

function initialArray(
  importedValue: string[] | undefined,
  propertyValue: string[] | null | undefined,
): string[] {
  if (importedValue && importedValue.length > 0) {
    return importedValue;
  }
  return propertyValue ?? [];
}

export function SubjectPropertyForm({
  property,
  photos,
  uploadPhotosAction,
  updatePhotosAction,
  imported,
  errors = {},
  onDirty,
  complementsSlot,
  onComplementsCount,
  ref,
}: {
  property: SubjectProperty | null;
  photos: SignedPhoto[];
  uploadPhotosAction: (formData: FormData) => Promise<UploadPropertyPhotosResult>;
  updatePhotosAction: (desiredPaths: string[]) => Promise<UpdatePropertyPhotosResult>;
  // Pre-fill coming from an online-listing import (Mission 38). Optional: absent
  // for a purely manual sheet and for the design preview.
  imported?: SubjectPropertyImportPrefill;
  errors?: Record<string, string>;
  onDirty?: () => void;
  // Mission 91 — où se rangent données financières et argumentaire : dans le bloc
  // « Compléments (facultatif) » de la fiche, que la page tient avec diagnostics et
  // copropriété. Les valeurs restent ici ; seul leur emplacement à l'écran change.
  complementsSlot: HTMLElement | null;
  // Mission 110 — ce que la ligne de résumé des compléments compte, tenu à jour à la saisie.
  onComplementsCount?: (counts: { filled: number; toVerify: number }) => void;
  ref?: Ref<SheetSectionHandle>;
}) {
  const [scalars, setScalars] = useState<ScalarState>(() => initialScalars(property, imported));
  const arrondissement = resolveArrondissement(scalars.city, scalars.postal_code);
  const [outdoorSpaces, setOutdoorSpaces] = useState<string[]>(() =>
    initialArray(imported?.outdoor_spaces, property?.outdoor_spaces),
  );
  const [parkingTypes, setParkingTypes] = useState<string[]>(() =>
    initialArray(imported?.parking_types, property?.parking_types),
  );
  const [strengths, setStrengths] = useState<string[]>(
    initialArray(imported?.strengths, property?.strengths),
  );
  // Watch points are NEVER seeded from a fiche: a commercial sheet sells, it does not
  // flag weaknesses honestly (Mission 44 §4).
  const [watchPoints, setWatchPoints] = useState<string[]>(property?.watch_points ?? []);

  // Mission 97 — ce qui vient d'un import se vérifie : ce qui restait à relire (en base), plus ce
  // que l'import affiché vient de remplir. Un champ modifié est un champ relu.
  const [toVerify, setToVerify] = useState<string[]>(() =>
    addImportedFields(
      sanitizeFieldsToVerify(property?.fields_to_verify ?? [], SUBJECT_VERIFIABLE_FIELDS),
      importedFields(imported, SUBJECT_VERIFIABLE_FIELDS),
      SUBJECT_VERIFIABLE_FIELDS,
    ),
  );
  const reviewed = (name: string) =>
    setToVerify((current) => (current.includes(name) ? withoutField(current, name) : current));

  const setField = (name: string, value: string) => {
    setScalars((previous) => ({ ...previous, [name]: value }));
    reviewed(name);
    onDirty?.();
  };
  const setArray = (name: string, value: string[]) => {
    if (name === 'outdoor_spaces') setOutdoorSpaces(value);
    else if (name === 'parking_types') setParkingTypes(value);
    reviewed(name);
    onDirty?.();
  };

  const { filled: complementsFilled, toVerify: complementsToVerify } = countPropertyComplements(
    { ...scalars, parking_types: parkingTypes, strengths, watch_points: watchPoints },
    toVerify,
  );
  useEffect(() => {
    onComplementsCount?.({ filled: complementsFilled, toVerify: complementsToVerify });
  }, [onComplementsCount, complementsFilled, complementsToVerify]);

  useImperativeHandle(ref, () => ({
    entries: (): SheetEntries => [
      ...Object.entries(scalars),
      ...outdoorSpaces.map((value): [string, string] => ['outdoor_spaces', value]),
      ...parkingTypes.map((value): [string, string] => ['parking_types', value]),
      ...strengths.map((value): [string, string] => ['strengths', value]),
      ...watchPoints.map((value): [string, string] => ['watch_points', value]),
      ...toVerify.map((value): [string, string] => ['fields_to_verify', value]),
    ],
  }));

  return (
    <VerifyProvider fields={toVerify}>
      <div className="flex max-w-3xl flex-col gap-5">
        <VerifyBanner
          count={toVerify.length}
          onAllCorrect={() => {
            setToVerify([]);
            onDirty?.();
          }}
        />
        {/* Mission 110 — une fiche courte : 8 champs au plus au premier affichage (type, surface,
            pièces, commune et code postal, adresse, fourchette, DPE, extérieurs) ; le reste est
            dans « Compléments (facultatif) ». */}
        <section className={formSection} data-testid="essential-fields">
          <h2 className={formSectionTitle}>L’essentiel</h2>
          <SelectField
            id={propertyFieldId('property_type')}
            label="Type de bien"
            value={scalars.property_type}
            onChange={(v) => setField('property_type', v)}
            field="property_type"
            options={propertyTypeOptions(scalars.property_type)}
            error={errors.property_type}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <NumberField
              label="Surface"
              value={scalars.surface_area}
              min={0}
              suffix="m²"
              onChange={(v) => setField('surface_area', v)}
              field="surface_area"
              error={errors.surface_area}
            />
            <NumberField
              label="Pièces"
              value={scalars.rooms_count}
              step={1}
              min={0}
              onChange={(v) => setField('rooms_count', v)}
              field="rooms_count"
              error={errors.rooms_count}
            />
          </div>
          <TextField
            label="Adresse"
            value={scalars.address}
            onChange={(v) => setField('address', v)}
            field="address"
            error={errors.address}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField
              label="Code postal"
              value={scalars.postal_code}
              onChange={(v) => setField('postal_code', v)}
              field="postal_code"
              error={errors.postal_code}
            />
            <TextField
              id={propertyFieldId('city')}
              label="Ville"
              value={scalars.city}
              onChange={(v) => setField('city', v)}
              field="city"
              error={errors.city}
            />
          </div>
          {/* Mission 99 — Paris, Lyon, Marseille : le bien est rattaché à son arrondissement, lu dans
              le code postal ou dans la ville. */}
          {arrondissement ? (
            <p className="text-sm text-zinc-500 stage:text-white/60" data-arrondissement>
              Arrondissement : {arrondissementLabel(arrondissement)}
            </p>
          ) : null}
          <SelectField
            label="Classe DPE"
            value={scalars.energy_rating}
            onChange={(v) => setField('energy_rating', v)}
            field="energy_rating"
            options={DPE_CLASSES.map((value) => ({ value, label: value }))}
            error={errors.energy_rating}
          />
          <MultiCheckField
            label="Extérieurs"
            values={outdoorSpaces}
            onChange={(values) => setArray('outdoor_spaces', values)}
            field="outdoor_spaces"
            options={OUTDOOR_SPACES.map((value) => ({ value, label: OUTDOOR_SPACE_LABELS[value] }))}
            error={errors.outdoor_spaces}
          />
        </section>
        {/* Mission 38 — la fourchette du conseiller, juste sous les champs essentiels. */}
        <PropertyPriceRangeStep
          advisorPriceMin={scalars.advisor_price_min}
          advisorPriceMax={scalars.advisor_price_max}
          onField={setField}
          errors={errors}
        />

        <section className={formSection}>
          <h2 className={formSectionTitle}>Photos du bien vendeur</h2>
          <SubjectPropertyPhotosField
            photos={photos}
            uploadAction={uploadPhotosAction}
            updateAction={updatePhotosAction}
          />
        </section>

        {complementsSlot
          ? createPortal(
              <div className="flex max-w-3xl flex-col gap-5">
                {/* Mission 110 — déplacés de la première vue de la fiche ; rien n'est supprimé. */}
                <section className={formSection}>
                  <h2 className={formSectionTitle}>Le bien en détail</h2>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <NumberField
                      label="Terrain"
                      value={scalars.land_area}
                      min={0}
                      suffix="m²"
                      onChange={(v) => setField('land_area', v)}
                      field="land_area"
                      error={errors.land_area}
                    />
                    <NumberField
                      label="Chambres"
                      value={scalars.bedrooms_count}
                      step={1}
                      min={0}
                      onChange={(v) => setField('bedrooms_count', v)}
                      field="bedrooms_count"
                      error={errors.bedrooms_count}
                    />
                  </div>
                  <label className="flex flex-col gap-1.5">
                    <span className={fieldLabel}>
                      Description
                      <VerifyMark field="description" />
                    </span>
                    <textarea
                      rows={4}
                      value={scalars.description}
                      onChange={(event) => setField('description', event.target.value)}
                      className={inputBase}
                    />
                  </label>
                </section>
                <PropertyLocationFields
                  district={scalars.district}
                  floor={scalars.floor}
                  buildingFloors={scalars.building_floors}
                  onField={setField}
                  errors={errors}
                />
                <PropertyEnergyFields
                  withDpe={false}
                  energyRating={scalars.energy_rating}
                  gesRating={scalars.ges_rating}
                  heatingType={scalars.heating_type}
                  onField={setField}
                  errors={errors}
                />
                <PropertyCharacteristicsFields
                  withOutdoor={false}
                  exposure={scalars.exposure}
                  constructionYear={scalars.construction_year}
                  generalCondition={scalars.general_condition}
                  hasElevator={scalars.has_elevator}
                  hasPool={scalars.has_pool}
                  outdoorSpaces={outdoorSpaces}
                  parkingTypes={parkingTypes}
                  onField={setField}
                  onArray={setArray}
                  errors={errors}
                />
                {/* Mission 97 — ni la recherche, ni le Live, ni les courriers ne lisent ce champ :
                  il vit dans les compléments. Rien n'est supprimé en base. */}
                <section className={formSection}>
                  <h2 className={formSectionTitle}>Autres caractéristiques</h2>
                  <NumberField
                    label="Salles de bains"
                    value={scalars.bathrooms_count}
                    step={1}
                    min={0}
                    onChange={(v) => setField('bathrooms_count', v)}
                    field="bathrooms_count"
                    error={errors.bathrooms_count}
                  />
                </section>
                <PropertyFinancialFields
                  monthlyCharges={scalars.monthly_charges}
                  propertyTax={scalars.property_tax}
                  onField={setField}
                  errors={errors}
                />

                <section className={formSection}>
                  <h2 className={formSectionTitle}>Argumentaire</h2>
                  <PropertyListField
                    label="Points forts"
                    items={strengths}
                    onChange={(items) => {
                      setStrengths(items);
                      reviewed('strengths');
                      onDirty?.();
                    }}
                    field="strengths"
                    error={errors.strengths}
                  />
                  <PropertyListField
                    label="Points de vigilance"
                    items={watchPoints}
                    onChange={(items) => {
                      setWatchPoints(items);
                      onDirty?.();
                    }}
                    error={errors.watch_points}
                  />
                </section>
              </div>,
              complementsSlot,
            )
          : null}
      </div>
    </VerifyProvider>
  );
}
