// Le logo, la photo du bien et celle du conseiller viennent d'URL signées ou publiques de
// Supabase, à imprimer telles quelles : <img> à dessein, comme pour l'aperçu de la charte.
/* eslint-disable @next/next/no-img-element */
import { Fragment } from 'react';

import { DPE_COLORS } from '@/features/dpe/services/dpe';
import { agencyMentions } from '@/features/prospecting-file/services/build-prospecting-file';
import { DOCUMENT_CSS } from '@/features/prospecting-file/components/document-styles';
import { lines, paragraphs, parseEmphasis } from '@/features/prospecting-file/services/emphasis';
import type { QrCode } from '@/features/prospecting-file/services/qr-code';
import type {
  PropertyCard,
  ProspectingFile,
  ProspectingFileTexts,
  ProspectingSender,
} from '@/features/prospecting-file/types';

// Mission 84 — le dossier de prospection tel qu'il s'imprime (A4). Composant d'affichage : tous
// ses textes viennent de `buildProspectingFile` et des textes du conseiller. Il sort de
// l'agence : aucune photo du concurrent, aucune donnée réservée au conseiller.

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
          <b>{sender.agencyName}</b>
        )}
      </div>
      <div className="pf-to">
        {file.addressee.lead}
        <b>{file.addressee.name}</b>
        {file.addressee.detail}
      </div>
    </header>
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
        Conseiller · {sender.agencyName}
        <br />
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
            <div className="pf-ph">
              {file.theirPlaceholder.map((line) => (
                <span key={line}>{line}</span>
              ))}
            </div>
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
          <span>{agencyMentions(sender, { withAddress: true })}</span>
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
          <footer className="pf-foot">
            <span>{fixed.information}</span>
            <span>
              {fixed.optOut} : {sender.phone}
            </span>
          </footer>
        </section>
      ) : null}
    </>
  );
}

function ColleaguePage({ file, texts, sender, photoUrl, qr }: ProspectingFileDocumentProps) {
  return (
    <section className="pf-page compact">
      <Header file={file} sender={sender} />
      <h1 className="pf-h1">
        <Title text={texts.title} />
      </h1>
      <Letter text={texts.letter} />

      <div className="pf-duo">
        {/* La photo de notre bien, et en face le bien du confrère sans photo. Sans photo de
            notre côté, les deux cartes s'alignent sans bandeau. */}
        <Card card={file.ours} side="ours">
          {photoUrl ? (
            <div className="pf-ph">
              <img src={photoUrl} alt="" />
            </div>
          ) : null}
        </Card>
        <Card card={file.theirs} side="yours">
          {photoUrl ? (
            <div className="pf-ph">
              {file.theirPlaceholder.map((line) => (
                <span key={line}>{line}</span>
              ))}
            </div>
          ) : null}
        </Card>
      </div>

      <Chain steps={file.fixed.chain} />
      <Proposal file={file} texts={texts} />
      <Contact sender={sender} hook={texts.contactHook} qr={qr} />
      <footer className="pf-foot">
        <span>{agencyMentions(sender, { withAddress: false })}</span>
        <span>{file.fixed.information}</span>
      </footer>
    </section>
  );
}

export type ProspectingFileDocumentProps = {
  file: ProspectingFile;
  texts: ProspectingFileTexts;
  sender: ProspectingSender;
  // La photo de NOTRE bien, sur les deux versions ; jamais celle du concurrent.
  photoUrl: string | null;
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
