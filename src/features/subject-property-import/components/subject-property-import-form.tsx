'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';

import { BasculeBanner } from '@/features/projects/components/bascule-banner';
import { CondominiumForm } from '@/features/subject-property-condominium/components/condominium-form';
import type { SubjectPropertyCondominium } from '@/features/subject-property-condominium/types';
import { DiagnosticsForm } from '@/features/subject-property-diagnostics/components/diagnostics-form';
import type { SubjectPropertyDiagnostics } from '@/features/subject-property-diagnostics/types';
import type {
  DepositBrochureResult,
  ParseBrochureResult,
} from '@/features/subject-property-import/actions/import-brochure-pdf';
import { BrochureImportPanel } from '@/features/subject-property-import/components/brochure-import-panel';
import type { RecoverPropertyPhotoResult } from '@/features/subject-property-import/actions/recover-property-photos';
import { SubjectPropertyImportPanel } from '@/features/subject-property-import/components/subject-property-import-panel';
import type {
  BrochureCondominiumPrefill,
  BrochureDiagnosticsPrefill,
  SubjectPropertyImportPrefill,
} from '@/features/subject-property-import/types';
import type { ComparableImportResult } from '@/features/comparable-import/types';
import type { SaveSubjectPropertySheetResult } from '@/features/subject-property/actions/save-subject-property-sheet';
import { PropertySaveBar } from '@/features/subject-property/components/property-save-bar';
import { SubjectPropertyForm } from '@/features/subject-property/components/subject-property-form';
import { saveBarStatus } from '@/features/subject-property/services/save-bar-status';
import {
  missingForSearch,
  propertyFieldId,
  type SearchRequirement,
} from '@/features/subject-property/services/search-requirements';
import {
  buildSheetForm,
  countSheetErrors,
  NO_SHEET_ERRORS,
  type SheetFieldErrors,
  type SheetSectionHandle,
} from '@/features/subject-property/services/sheet-form';
import type { SubjectProperty } from '@/features/subject-property/types';
import type { UpdatePropertyPhotosResult } from '@/features/subject-property-photos/actions/update-property-photos';
import type { UploadPropertyPhotosResult } from '@/features/subject-property-photos/actions/upload-property-photos';
import type { SignedPhoto } from '@/features/subject-property-photos/services/property-photo-storage';

type SheetPart = 'property' | 'diagnostics' | 'condominium';

const NOTHING_DIRTY: Record<SheetPart, boolean> = {
  property: false,
  diagnostics: false,
  condominium: false,
};

function focusField(id: string): void {
  const field = document.getElementById(id);
  field?.scrollIntoView({ block: 'center' });
  field?.focus({ preventScroll: true });
}

function focusFirstError(): void {
  const holder = document.querySelector('[data-field-error]')?.closest('label, fieldset');
  holder?.scrollIntoView({ block: 'center' });
  holder?.querySelector<HTMLElement>('input, select, textarea')?.focus({ preventScroll: true });
}

// Wires both imports (online listing AND agency PDF brochure) to the seller sheet.
// On a successful import, the affected sections are remounted (key) with the mapped
// prefill so the advisor arrives on a pre-filled sheet he only has to re-read. A
// listing fills the property section; a brochure also fills two diagnostics fields and
// the condominium header.
//
// MISSION 77 — the sheet is saved in ONE gesture: the three sections keep their own
// values, the bar fixed to the window collects them and saves them together, and both
// ways out (back to the dossier, on to the competitor search) save before leaving.
export function SubjectPropertyImportForm({
  property,
  saveAction,
  photos,
  uploadPhotosAction,
  updatePhotosAction,
  importAction,
  importHtmlAction,
  recoverAction,
  parseBrochureAction,
  depositBrochureAction,
  diagnostics,
  condominium,
  findHref,
  backHref,
  projectId,
}: {
  property: SubjectProperty | null;
  saveAction: (formData: FormData) => Promise<SaveSubjectPropertySheetResult>;
  photos: SignedPhoto[];
  uploadPhotosAction: (formData: FormData) => Promise<UploadPropertyPhotosResult>;
  updatePhotosAction: (desiredPaths: string[]) => Promise<UpdatePropertyPhotosResult>;
  importAction: (formData: FormData) => Promise<ComparableImportResult>;
  importHtmlAction: (formData: FormData) => Promise<ComparableImportResult>;
  recoverAction: (url: string) => Promise<RecoverPropertyPhotoResult>;
  parseBrochureAction: (pages: string[]) => Promise<ParseBrochureResult>;
  depositBrochureAction: (formData: FormData) => Promise<DepositBrochureResult>;
  diagnostics: SubjectPropertyDiagnostics | null;
  condominium: SubjectPropertyCondominium | null;
  findHref: string;
  backHref: string;
  projectId: string;
}) {
  const router = useRouter();
  const [imported, setImported] = useState<SubjectPropertyImportPrefill | null>(null);
  const [importedDiagnostics, setImportedDiagnostics] = useState<BrochureDiagnosticsPrefill | null>(
    null,
  );
  const [importedCondominium, setImportedCondominium] = useState<BrochureCondominiumPrefill | null>(
    null,
  );
  const [propertyKey, setPropertyKey] = useState(0);
  const [diagnosticsKey, setDiagnosticsKey] = useState(0);
  const [condominiumKey, setCondominiumKey] = useState(0);

  const propertyRef = useRef<SheetSectionHandle>(null);
  const diagnosticsRef = useRef<SheetSectionHandle>(null);
  const condominiumRef = useRef<SheetSectionHandle>(null);
  const [dirty, setDirty] = useState(NOTHING_DIRTY);
  const [saved, setSaved] = useState(property != null);
  const [errors, setErrors] = useState<SheetFieldErrors>(NO_SHEET_ERRORS);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [missing, setMissing] = useState<SearchRequirement[]>([]);
  const [becameReady, setBecameReady] = useState(false);
  const [pending, startTransition] = useTransition();

  // Arrivée depuis la recherche de concurrents (« il manque la ville ») : l'adresse désigne le
  // champ, la fiche s'ouvre dessus.
  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (id !== '') {
      focusField(id);
    }
  }, []);

  function markDirty(...parts: SheetPart[]) {
    setDirty((previous) =>
      parts.every((part) => previous[part])
        ? previous
        : { ...previous, ...Object.fromEntries(parts.map((part) => [part, true])) },
    );
    // Ce qui manquait ou a échoué vient peut-être d'être corrigé : la barre le redira au
    // prochain essai.
    setMissing((previous) => (previous.length === 0 ? previous : []));
    setSaveError(null);
  }

  const isDirty = dirty.property || dirty.diagnostics || dirty.condominium;

  async function save(staying: boolean): Promise<boolean> {
    // Une partie que le conseiller n'a pas touchée n'est pas envoyée (voir sheet-form).
    const result = await saveAction(
      buildSheetForm({
        property: propertyRef.current?.entries() ?? [],
        diagnostics: dirty.diagnostics ? (diagnosticsRef.current?.entries() ?? null) : null,
        condominium: dirty.condominium ? (condominiumRef.current?.entries() ?? null) : null,
      }),
    );
    if (!result.ok) {
      const fieldErrors = result.fieldErrors ?? NO_SHEET_ERRORS;
      setErrors(fieldErrors);
      setSaveError(
        countSheetErrors(fieldErrors) > 0 ? null : (result.error ?? 'L’enregistrement a échoué.'),
      );
      return false;
    }
    setErrors(NO_SHEET_ERRORS);
    setSaveError(null);
    setDirty(NOTHING_DIRTY);
    setSaved(true);
    if (result.becameReady) {
      setBecameReady(true);
    }
    if (staying) {
      router.refresh();
    }
    return true;
  }

  function onSave() {
    setMissing([]);
    startTransition(async () => {
      await save(true);
    });
  }

  // Les deux sorties enregistrent avant de partir ; une saisie à corriger retient sur la fiche.
  function leave(href: string, towardsSearch: boolean) {
    startTransition(async () => {
      const values = new Map(propertyRef.current?.entries() ?? []);
      const lacking = towardsSearch
        ? missingForSearch({
            property_type: values.get('property_type'),
            city: values.get('city'),
          })
        : [];
      if (isDirty && !(await save(lacking.length > 0))) {
        return;
      }
      // Ville ou type manquant : la recherche n'a pas de quoi partir, on reste et on le dit.
      if (lacking.length > 0) {
        setMissing(lacking);
        return;
      }
      router.push(href);
    });
  }

  const status = saveBarStatus({
    pending,
    dirty: isDirty,
    saved,
    errorCount: countSheetErrors(errors),
    missing,
    error: saveError,
  });

  function onStatusClick() {
    if (status.target === 'first_error') {
      focusFirstError();
    } else if (status.target != null) {
      focusField(propertyFieldId(status.target));
    }
  }

  return (
    // Le bas de la fiche reste lisible au-dessus de la barre fixée.
    <div className="flex flex-col gap-6 pb-28 md:gap-8">
      <SubjectPropertyImportPanel
        importAction={importAction}
        importHtmlAction={importHtmlAction}
        recoverAction={recoverAction}
        onImported={(prefill) => {
          setImported(prefill);
          setPropertyKey((value) => value + 1);
          markDirty('property');
        }}
      />
      <BrochureImportPanel
        parseAction={parseBrochureAction}
        depositAction={depositBrochureAction}
        onImported={(data) => {
          setImported(data.property);
          setImportedDiagnostics(data.diagnostics);
          setImportedCondominium(data.condominium);
          setPropertyKey((value) => value + 1);
          setDiagnosticsKey((value) => value + 1);
          setCondominiumKey((value) => value + 1);
          markDirty('property', 'diagnostics', 'condominium');
        }}
      />
      <SubjectPropertyForm
        key={propertyKey}
        ref={propertyRef}
        property={property}
        photos={photos}
        uploadPhotosAction={uploadPhotosAction}
        updatePhotosAction={updatePhotosAction}
        imported={imported ?? undefined}
        errors={errors.property}
        onDirty={() => markDirty('property')}
      />
      <DiagnosticsForm
        key={`diagnostics-${diagnosticsKey}`}
        ref={diagnosticsRef}
        diagnostics={diagnostics}
        imported={importedDiagnostics ?? undefined}
        errors={errors.diagnostics}
        onDirty={() => markDirty('diagnostics')}
      />
      <CondominiumForm
        key={`condominium-${condominiumKey}`}
        ref={condominiumRef}
        condominium={condominium}
        imported={importedCondominium ?? undefined}
        errors={errors.condominium}
        onDirty={() => markDirty('condominium')}
      />

      <PropertySaveBar
        status={status}
        pending={pending}
        onSave={onSave}
        onBack={() => leave(backHref, false)}
        onFind={() => leave(findHref, true)}
        onStatusClick={onStatusClick}
      >
        {becameReady ? <BasculeBanner projectId={projectId} /> : null}
      </PropertySaveBar>
    </div>
  );
}
