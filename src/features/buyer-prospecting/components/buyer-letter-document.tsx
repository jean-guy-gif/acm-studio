'use client';

// Le logo et la photo du conseiller viennent d'URL signées ou publiques, à imprimer telles quelles :
// <img> à dessein, comme le courrier de prospection.
/* eslint-disable @next/next/no-img-element */
import { DOCUMENT_CSS } from '@/features/prospecting-file/components/document-styles';
import {
  Contact,
  Letter,
  Mentions,
  TheirPhoto,
  Title,
} from '@/features/prospecting-file/components/prospecting-file-document';
import { professionalMentions } from '@/features/prospecting-file/services/build-prospecting-file';
import { headerNameFontPt } from '@/features/prospecting-file/services/document-name';
import {
  BUYER_SEARCH_PURPOSE,
  ownerLegalMention,
} from '@/features/prospecting-file/services/legal-mention';
import type { BuyerLetterTexts } from '@/features/buyer-prospecting/services/buyer-letter';
import type { QrCode } from '@/features/contact-card/services/qr-code';
import type { AddressSource, ProspectingSender } from '@/features/prospecting-file/types';

export type BuyerLetterDocumentProps = {
  addressee: { lead: string; nameLines: string[] };
  addressSource: AddressSource;
  texts: BuyerLetterTexts;
  sender: ProspectingSender;
  // La photo de son bien, seulement si le conseiller l'a choisie (M115) ; null = aucun cadre.
  theirPhotoUrl: string | null;
  qr: QrCode;
};

// Mission 120 — le courrier au propriétaire né d'une recherche acquéreur, tel qu'il s'imprime (A4,
// une page). Composant d'affichage : ses textes viennent du service et du conseiller. Il sort de
// l'agence : ni le nom de l'acquéreur, ni son budget, ni une promesse ; les mentions de tout
// courrier propriétaire (carte professionnelle, garantie, origine de l'adresse, droits, CNIL ;
// M90, M102, M103), avec sa propre finalité.
export function BuyerLetterDocument({
  addressee,
  addressSource,
  texts,
  sender,
  theirPhotoUrl,
  qr,
}: BuyerLetterDocumentProps) {
  return (
    <div className="pf-doc" data-testid="buyer-letter-document">
      {/* Feuille constante du dépôt, sans aucune donnée : rien d'extérieur n'y entre. */}
      <style dangerouslySetInnerHTML={{ __html: DOCUMENT_CSS }} />
      <section className="pf-page compact">
        <header className="pf-head">
          <div className="pf-logo">
            {sender.logoUrl ? (
              <img src={sender.logoUrl} alt={sender.agencyName} />
            ) : (
              <b style={{ fontSize: `${headerNameFontPt(sender.agencyName)}pt` }}>
                {sender.agencyName}
              </b>
            )}
          </div>
          <div className="pf-to" data-testid="buyer-letter-addressee">
            {addressee.lead}
            {addressee.nameLines.map((line) => (
              <b key={line}>{line}</b>
            ))}
          </div>
        </header>
        <h1 className="pf-h1">
          <Title text={texts.title} />
        </h1>
        {theirPhotoUrl ? (
          <div className="pf-card yours" style={{ margin: '4mm 0' }}>
            <TheirPhoto url={theirPhotoUrl} placeholder={[]} />
          </div>
        ) : null}
        <div data-testid="buyer-letter-body">
          <Letter text={texts.letter} />
        </div>
        <Contact sender={sender} hook={texts.contactHook} qr={qr} />
        <footer className="pf-foot pf-legal" data-testid="legal-mention">
          <Mentions sender={sender} withAddress withCard={false} />{' '}
          {professionalMentions(sender).join(' · ')}.{' '}
          {ownerLegalMention(sender, addressSource, BUYER_SEARCH_PURPOSE)}
        </footer>
      </section>
    </div>
  );
}
