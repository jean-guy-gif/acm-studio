'use client';

import { useState } from 'react';

import type { RecoverPropertyPhotoResult } from '@/features/subject-property-import/actions/recover-property-photos';
import { SubjectPropertyImportPanel } from '@/features/subject-property-import/components/subject-property-import-panel';
import type { SubjectPropertyImportPrefill } from '@/features/subject-property-import/types';
import type { ComparableImportResult } from '@/features/comparable-import/types';
import type { SaveSubjectPropertyResult } from '@/features/subject-property/actions/save-subject-property';
import { SubjectPropertyForm } from '@/features/subject-property/components/subject-property-form';
import type { SubjectProperty } from '@/features/subject-property/types';
import type { UpdatePropertyPhotosResult } from '@/features/subject-property-photos/actions/update-property-photos';
import type { UploadPropertyPhotosResult } from '@/features/subject-property-photos/actions/upload-property-photos';
import type { SignedPhoto } from '@/features/subject-property-photos/services/property-photo-storage';

// Wires the online-listing import to the seller-property form: on a successful
// import, the form is remounted (key) with the mapped prefill so the advisor
// arrives on a pre-filled sheet — the same gesture he knows for a competitor.
export function SubjectPropertyImportForm({
  property,
  saveAction,
  photos,
  uploadPhotosAction,
  updatePhotosAction,
  importAction,
  importHtmlAction,
  recoverAction,
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
  findHref: string;
}) {
  const [imported, setImported] = useState<SubjectPropertyImportPrefill | null>(null);
  const [importKey, setImportKey] = useState(0);

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      <SubjectPropertyImportPanel
        importAction={importAction}
        importHtmlAction={importHtmlAction}
        recoverAction={recoverAction}
        onImported={(prefill) => {
          setImported(prefill);
          setImportKey((value) => value + 1);
        }}
      />
      <SubjectPropertyForm
        key={importKey}
        property={property}
        saveAction={saveAction}
        photos={photos}
        uploadPhotosAction={uploadPhotosAction}
        updatePhotosAction={updatePhotosAction}
        imported={imported ?? undefined}
        findHref={findHref}
      />
    </div>
  );
}
