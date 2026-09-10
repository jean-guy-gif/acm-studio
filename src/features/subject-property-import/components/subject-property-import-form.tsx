'use client';

import { useState } from 'react';

import { hintText } from '@/components/ui/styles';
import { CondominiumForm } from '@/features/subject-property-condominium/components/condominium-form';
import type { SaveCondominiumResult } from '@/features/subject-property-condominium/actions/save-subject-property-condominium';
import type { SubjectPropertyCondominium } from '@/features/subject-property-condominium/types';
import { DiagnosticsForm } from '@/features/subject-property-diagnostics/components/diagnostics-form';
import type { SaveDiagnosticsResult } from '@/features/subject-property-diagnostics/actions/save-subject-property-diagnostics';
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
import type { SaveSubjectPropertyResult } from '@/features/subject-property/actions/save-subject-property';
import { SubjectPropertyForm } from '@/features/subject-property/components/subject-property-form';
import type { SubjectProperty } from '@/features/subject-property/types';
import type { UpdatePropertyPhotosResult } from '@/features/subject-property-photos/actions/update-property-photos';
import type { UploadPropertyPhotosResult } from '@/features/subject-property-photos/actions/upload-property-photos';
import type { SignedPhoto } from '@/features/subject-property-photos/services/property-photo-storage';

// Wires both imports (online listing AND agency PDF brochure) to the seller forms.
// On a successful import, the affected forms are remounted (key) with the mapped
// prefill so the advisor arrives on a pre-filled sheet he only has to re-read. A
// listing fills the property form; a brochure also fills two diagnostics fields and
// the condominium header.
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
  saveDiagnosticsAction,
  condominium,
  saveCondominiumAction,
  findHref,
}: {
  property: SubjectProperty | null;
  saveAction: (formData: FormData) => Promise<SaveSubjectPropertyResult>;
  photos: SignedPhoto[];
  uploadPhotosAction: (formData: FormData) => Promise<UploadPropertyPhotosResult>;
  updatePhotosAction: (desiredPaths: string[]) => Promise<UpdatePropertyPhotosResult>;
  importAction: (formData: FormData) => Promise<ComparableImportResult>;
  importHtmlAction: (formData: FormData) => Promise<ComparableImportResult>;
  recoverAction: (url: string) => Promise<RecoverPropertyPhotoResult>;
  parseBrochureAction: (pages: string[]) => Promise<ParseBrochureResult>;
  depositBrochureAction: (formData: FormData) => Promise<DepositBrochureResult>;
  diagnostics: SubjectPropertyDiagnostics | null;
  saveDiagnosticsAction: (formData: FormData) => Promise<SaveDiagnosticsResult>;
  condominium: SubjectPropertyCondominium | null;
  saveCondominiumAction: (formData: FormData) => Promise<SaveCondominiumResult>;
  findHref: string;
}) {
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

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      <SubjectPropertyImportPanel
        importAction={importAction}
        importHtmlAction={importHtmlAction}
        recoverAction={recoverAction}
        onImported={(prefill) => {
          setImported(prefill);
          setPropertyKey((value) => value + 1);
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
        }}
      />
      <SubjectPropertyForm
        key={propertyKey}
        property={property}
        saveAction={saveAction}
        photos={photos}
        uploadPhotosAction={uploadPhotosAction}
        updatePhotosAction={updatePhotosAction}
        imported={imported ?? undefined}
        findHref={findHref}
      />

      {property ? (
        <>
          <DiagnosticsForm
            key={diagnosticsKey}
            diagnostics={diagnostics}
            saveAction={saveDiagnosticsAction}
            imported={importedDiagnostics ?? undefined}
          />
          <CondominiumForm
            key={condominiumKey}
            condominium={condominium}
            saveAction={saveCondominiumAction}
            imported={importedCondominium ?? undefined}
          />
        </>
      ) : (
        <p className={hintText}>
          Enregistrez d’abord le bien vendeur pour renseigner les diagnostics et la copropriété.
        </p>
      )}
    </div>
  );
}
