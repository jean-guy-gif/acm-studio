'use client';

// Le logo, la photo du bien et celle du conseiller viennent d'URL signées ou publiques de
// Supabase, à imprimer telles quelles : <img> à dessein, comme pour l'aperçu de la charte.
/* eslint-disable @next/next/no-img-element */
import { Fragment, useState } from 'react';

import { DPE_COLORS } from '@/features/dpe/services/dpe';
import { agencyMentionList } from '@/features/prospecting-file/services/build-prospecting-file';
import {
  contactAgencyLine,
  headerNameFontPt,
} from '@/features/prospecting-file/services/document-name';
import { DOCUMENT_CSS } from '@/features/prospecting-file/components/document-styles';
import { lines, paragraphs, parseEmphasis } from '@/features/prospecting-file/services/emphasis';
import { ownerLegalMention } from '@/features/prospecting-file/services/legal-mention';
import type { QrCode } from '@/features/prospecting-file/services/qr-code';
import type {
  PropertyCard,
  ProspectingFile,
  ProspectingFileTexts,
  ProspectingSender,
} from '@/features/prospecting-file/types';

// Mission 84 — le dossier de prospection tel qu'il s'imprime (A4). Composant d'affichage : tous
// ses textes viennent de `buildProspectingFile` et des textes du conseiller. Il sort de
// l'agence : aucune donnée réservée au conseiller, et la photo du concurrent seulement si le
// conseiller l'a choisie (mission 87).

// `*mot*` : couleur d'accent dans un titre (em), gras ailleurs (b).
function Emphasis({ text, as: Tag }: { text: string; as: 'em' | 'b' }) {
  return (
    <>
      {parseEmphasis(text).map((part, index) =>
        part.strong ? (
          <Tag key={index}>{part.text}</Tag>
        ) : (
          <Fragment key={index}>{part.text}</Fragment>
        ),
      )}
    </>
  );
}

function Title({ text }: { text: string }) {
  return (
    <>
      {lines(text).map((line, index) => (
        <Fragment key={index}>
          {index > 0 ? <br /> : null}
          <Emphasis text={line} as="em" />
        </Fragment>
      ))}
    </>
  );
}

function Header({ file, sender }: { file: ProspectingFile; sender: ProspectingSender }) {
  return (
    <header className="pf-head">
      <div className="pf-logo">
        {sender.logoUrl ? (
          <img src={sender.logoUrl} alt={sender.agencyName} />
        ) : (
          // Deux lignes au plus : le texte se réduit, jamais sous la taille du texte courant.
          <b style={{ fontSize: `${headerNameFontPt(sender.agencyName)}pt` }}>
            {sender.agencyName}
          </b>
        )}
      </div>
      <div className="pf-to">
        {file.addressee.lead}
        {/* Une ligne par morceau d'adresse : elle ne se coupe pas au milieu. */}
        {file.addressee.nameLines.map((line) => (
          <b key={line}>{line}</b>
        ))}
        {file.addressee.detail}
      </div>
    </header>
  );
}

// Pied de page : le nom de l'agence sur une seule ligne, puis les mentions facultatives.
function Mentions({ sender, withAddress }: { sender: ProspectingSender; withAddress: boolean }) {
  const [name, ...others] = agencyMentionList(sender, { withAddress });
  return (
    <span>
      <span className="pf-nw">{name}</span>
      {others.map((mention) => ` · ${mention}`).join('')}
    </span>
  );
}

// La photo du bien concurrent choisie par le conseiller. Si elle ne se charge pas (lien expiré,
// portail qui bloque), le cadre gris la remplace : jamais une image cassée sur la feuille.
function TheirPhoto({ url, placeholder }: { url: string | null; placeholder: string[] }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  return (
    <div className="pf-ph" data-testid="their-photo">
      {url && failedUrl !== url ? (
        <img src={url} alt="" onError={() => setFailedUrl(url)} />
      ) : (
        placeholder.map((line) => <span key={line}>{line}</span>)
      )}
    </div>
  );
}

function Card({
  card,
  side,
  children,
}: {
  card: PropertyCard;
  side: 'ours' | 'yours';
  children?: React.ReactNode;
}) {
  return (
    <div className={`pf-card ${side}`}>
      {children}
      <div className="pf-lab">{card.label}</div>
      <div className="pf-ttl">{card.title}</div>
      {card.rows.length > 0 ? (
        <table>
          <tbody>
            {card.rows.map((row) => (
              <tr key={row.label}>
                <td>{row.label}</td>
                <td>
                  {row.dpe ? (
                    <span
                      className="pf-dpe"
                      style={{
                        backgroundColor: DPE_COLORS[row.dpe].background,
                        color: DPE_COLORS[row.dpe].text,
                      }}
                    >
                      {row.dpe}
                    </span>
                  ) : (
                    row.value
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </div>
  );
}

function Proposal({ file, texts }: { file: ProspectingFile; texts: ProspectingFileTexts }) {
  return (
    <>
      <h2 className="pf-h2">{file.fixed.proposalTitle}</h2>
      <ol className="pf-steps">
        {texts.proposals.map((proposal, index) => (
          <li key={index}>
            <div>
              <Emphasis text={proposal} as="b" />
            </div>
          </li>
        ))}
      </ol>
    </>
  );
}

function Chain({ steps }: { steps: [string, string, string] }) {
  return (
    <div className="pf-chain">
      {steps.map((step, index) => (
        <Fragment key={step}>
          {index > 0 ? <i>→</i> : null}
          <span>{step}</span>
        </Fragment>
      ))}
    </div>
  );
}

function Contact({ sender, hook, qr }: { sender: ProspectingSender; hook: string; qr: QrCode }) {
  const reach = [sender.phone, sender.email].filter(Boolean).join(' · ');
  // « Conseiller · [agence] » tient sur une ligne, quel que soit le nom de l'agence.
  const agencyLine = contactAgencyLine(sender.agencyName);
  return (
    <div className="pf-contact">
      {sender.photoUrl ? (
        <div className="pf-avatar">
          <img src={sender.photoUrl} alt={sender.advisorName} />
        </div>
      ) : null}
      <div className="pf-who">
        <div className="pf-cta">{hook}</div>
        <b>{sender.advisorName}</b>
        <span className="pf-nw" style={{ fontSize: `${agencyLine.fontPt}pt` }}>
          {agencyLine.text}
        </span>
        {reach}
      </div>
      <div className="pf-qr">
        <svg viewBox={`0 0 ${qr.size} ${qr.size}`} role="img" aria-label="Carte de contact">
          <path d={qr.path} fill="#000" />
        </svg>
      </div>
    </div>
  );
}

function Letter({ text }: { text: string }) {
  return (
    <>
      {paragraphs(text).map((paragraph, index) => (
        <p key={index}>{paragraph}</p>
      ))}
    </>
  );
}

function OwnerPages({
  file,
  texts,
  sender,
  photoUrl,
  theirPhotoUrl,
  qr,
}: Omit<ProspectingFileDocumentProps, 'file'> & { file: ProspectingFile }) {
  const { fixed } = file;
  const back = fixed.back;
  return (
    <>
      <section className="pf-page">
        <Header file={file} sender={sender} />
        <h1 className="pf-h1">
          <Title text={texts.title} />
        </h1>
        <Letter text={texts.letter} />

        <div className="pf-duo">
          <Card card={file.ours} side="ours">
            {photoUrl ? (
              <div className="pf-ph">
                <img src={photoUrl} alt="" />
              </div>
            ) : null}
          </Card>
          <Card card={file.theirs} side="yours">
            <TheirPhoto url={theirPhotoUrl} placeholder={file.theirPlaceholder} />
          </Card>
        </div>

        <div className="pf-grid2">
          {file.closeness.length > 0 ? (
            <div className="pf-box">
              <h2 className="pf-h2">{fixed.closenessTitle}</h2>
              <ul>
                {file.closeness.map((item) => (
                  <li key={item}>
                    <Emphasis text={item} as="b" />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {file.differences.length > 0 ? (
            <div className="pf-box dist">
              <h2 className="pf-h2">{fixed.differencesTitle}</h2>
              <ul>
                {file.differences.map((item) => (
                  <li key={item}>
                    <Emphasis text={item} as="b" />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        {texts.keyMessage ? <div className="pf-key">{texts.keyMessage}</div> : null}
        <footer className="pf-foot">
          <Mentions sender={sender} withAddress />
          <span>{fixed.turnPage}</span>
        </footer>
      </section>

      {back ? (
        <section className="pf-page">
          <h2 className="pf-h2" style={{ marginTop: '2mm' }}>
            {back.kicker}
          </h2>
          <h1 className="pf-h1" style={{ marginTop: 0 }}>
            <Title text={back.title} />
          </h1>

          <div className="pf-scheme">
            {[back.alone, back.together].map((column, columnIndex) => (
              <div key={column.label} className={`pf-col ${columnIndex === 1 ? 'together' : ''}`}>
                <div className="pf-lab">{column.label}</div>
                <div className="pf-dots">
                  {Array.from({ length: column.visits }, (_, index) => (
                    <span
                      key={index}
                      className={`pf-dot ${index >= back.alone.visits ? 'added' : ''}`}
                    />
                  ))}
                </div>
                <div className="pf-big">
                  {column.visits}
                  <small>{column.caption}</small>
                </div>
                <p className="pf-small">{column.note}</p>
              </div>
            ))}
          </div>
          <Chain steps={fixed.chain} />

          <Proposal file={file} texts={texts} />
          <Contact sender={sender} hook={texts.contactHook} qr={qr} />
          {/* Mission 90 — la mention sur le traitement de l'adresse : responsable, opposition,
              CNIL. Deux lignes au plus. */}
          <footer className="pf-foot pf-legal" data-testid="legal-mention">
            {ownerLegalMention(sender)}
          </footer>
        </section>
      ) : null}
    </>
  );
}

function ColleaguePage({
  file,
  texts,
  sender,
  photoUrl,
  theirPhotoUrl,
  qr,
}: ProspectingFileDocumentProps) {
  return (
    <section className="pf-page compact">
      <Header file={file} sender={sender} />
      <h1 className="pf-h1">
        <Title text={texts.title} />
      </h1>
      <Letter text={texts.letter} />

      <div className="pf-duo">
        {/* La photo de notre bien, et en face celle que le conseiller a choisie pour le bien
            du confrère (ou le cadre gris). Sans aucune photo, les deux cartes s'alignent sans
            bandeau. */}
        <Card card={file.ours} side="ours">
          {photoUrl ? (
            <div className="pf-ph">
              <img src={photoUrl} alt="" />
            </div>
          ) : null}
        </Card>
        <Card card={file.theirs} side="yours">
          {photoUrl || theirPhotoUrl ? (
            <TheirPhoto url={theirPhotoUrl} placeholder={file.theirPlaceholder} />
          ) : null}
        </Card>
      </div>

      <Chain steps={file.fixed.chain} />
      <Proposal file={file} texts={texts} />
      <Contact sender={sender} hook={texts.contactHook} qr={qr} />
      <footer className="pf-foot">
        <Mentions sender={sender} withAddress={false} />
        <span>{file.fixed.information}</span>
      </footer>
    </section>
  );
}

export type ProspectingFileDocumentProps = {
  file: ProspectingFile;
  texts: ProspectingFileTexts;
  sender: ProspectingSender;
  // La photo de NOTRE bien, sur les deux versions.
  photoUrl: string | null;
  // La photo du bien concurrent, seulement si le conseiller l'a choisie ; null = cadre gris.
  theirPhotoUrl: string | null;
  qr: QrCode;
};

export function ProspectingFileDocument(props: ProspectingFileDocumentProps) {
  return (
    <div className="pf-doc">
      {/* Feuille constante du dépôt, sans aucune donnée : rien d'extérieur n'y entre. */}
      <style dangerouslySetInnerHTML={{ __html: DOCUMENT_CSS }} />
      {props.file.version === 'owner' ? <OwnerPages {...props} /> : <ColleaguePage {...props} />}
    </div>
  );
}
