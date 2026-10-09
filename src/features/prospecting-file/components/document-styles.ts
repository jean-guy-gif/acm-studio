// Mission 84 — la feuille du dossier de prospection, reprise de la maquette validée
// (missions/maquettes/M84-maquette-dossier-prospection.html). Tout est en millimètres : la page
// est une feuille A4, à l'écran comme à l'impression. Les couleurs sont celles de la charte de
// l'agence (jetons `--color-brand*`, M55) : la variante lisible pour le texte, la couleur
// exacte pour les aplats. Les couleurs du DPE restent sémantiques.
export const DOCUMENT_CSS = `
@page { size: A4; margin: 0; }
.pf-doc { --p: var(--color-brand-darker); --a: var(--color-brand-deep); --flat: var(--color-brand); --on-flat: var(--color-on-brand); --ink: #1d2530; --mute: #6b7682; --line: #e3e6ea; --soft: #f5f3ef; color: var(--ink); font-size: 10.5pt; line-height: 1.45; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.pf-doc *, .pf-doc *::before { box-sizing: border-box; }
.pf-page { width: 210mm; height: 297mm; padding: 16mm 17mm 14mm; position: relative; overflow: hidden; background: #fff; break-after: page; }
.pf-page:last-child { break-after: auto; }
.pf-head { display: flex; justify-content: space-between; align-items: center; gap: 6mm; border-bottom: 2px solid var(--p); padding-bottom: 5mm; }
.pf-logo { display: flex; align-items: center; gap: 3mm; min-width: 0; }
.pf-logo img { max-height: 13mm; max-width: 60mm; width: auto; height: auto; object-fit: contain; }
.pf-logo b { font-size: 12pt; color: var(--p); }
.pf-to { font-size: 9pt; color: var(--mute); text-align: right; }
.pf-to b { color: var(--ink); display: block; font-size: 10pt; }
.pf-h1 { font-family: var(--font-title); font-size: 20pt; line-height: 1.15; color: var(--p); margin: 7mm 0 4mm; font-weight: 700; letter-spacing: -.01em; }
.pf-h1 em { font-style: normal; color: var(--a); }
.pf-h2 { font-size: 8.5pt; letter-spacing: .14em; text-transform: uppercase; color: var(--a); margin: 0 0 3mm; font-weight: 700; }
.pf-doc p { margin: 0 0 3mm; }
.pf-duo { display: grid; grid-template-columns: 1fr 1fr; gap: 5mm; margin: 4mm 0; }
.pf-card { border: 1px solid var(--line); border-radius: 3mm; padding: 4.5mm 5mm; }
.pf-card.ours { border-top: 3px solid var(--p); }
.pf-card.yours { border-top: 3px solid var(--flat); }
.pf-lab { font-size: 8pt; letter-spacing: .12em; text-transform: uppercase; color: var(--mute); font-weight: 700; }
.pf-ph { height: 30mm; border-radius: 2mm; margin: -1mm 0 3mm; overflow: hidden; background: var(--soft); color: var(--mute); display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 9pt; text-align: center; }
.pf-ph img { width: 100%; height: 100%; object-fit: cover; }
.pf-ttl { font-size: 12.5pt; font-weight: 700; margin: 1.5mm 0 3mm; }
.pf-card table { width: 100%; border-collapse: collapse; font-size: 9.5pt; }
.pf-card td { padding: 1.1mm 0; border-bottom: 1px solid var(--line); }
.pf-card td:last-child { text-align: right; font-weight: 600; }
.pf-card tr:last-child td { border-bottom: 0; }
.pf-dpe { display: inline-block; width: 5.5mm; height: 5.5mm; border-radius: 1mm; text-align: center; line-height: 5.5mm; font-weight: 800; font-size: 8.5pt; }
.pf-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 5mm; }
.pf-box { background: var(--soft); border-radius: 3mm; padding: 4.5mm 5mm; }
.pf-box ul { margin: 0; padding: 0; list-style: none; }
.pf-box li { padding: 1.2mm 0 1.2mm 5mm; position: relative; }
.pf-box li::before { content: ""; position: absolute; left: 0; top: 3mm; width: 2mm; height: 2mm; border-radius: 50%; background: var(--p); }
.pf-box.dist li::before { background: var(--flat); }
.pf-box li b { color: var(--p); }
.pf-key { margin-top: 4mm; border-left: 3px solid var(--flat); padding: 2mm 0 2mm 5mm; font-size: 12pt; font-weight: 600; color: var(--p); line-height: 1.35; }
.pf-foot { position: absolute; left: 17mm; right: 17mm; bottom: 9mm; font-size: 7pt; color: var(--mute); border-top: 1px solid var(--line); padding-top: 2.5mm; display: flex; justify-content: space-between; gap: 6mm; }
.pf-foot span:last-child { text-align: right; white-space: nowrap; }
.pf-scheme { display: grid; grid-template-columns: 1fr 1fr; gap: 6mm; margin: 5mm 0 4mm; }
.pf-col { border: 1px solid var(--line); border-radius: 3mm; padding: 5mm; }
.pf-col.together { border-color: var(--flat); }
.pf-col .pf-lab { margin-bottom: 3mm; }
.pf-dots { display: flex; flex-wrap: nowrap; gap: 1.6mm; margin: 2mm 0 3mm; }
.pf-dot { width: 5mm; height: 5mm; border-radius: 50%; background: var(--p); }
.pf-dot.added { background: var(--flat); }
.pf-big { font-size: 20pt; font-weight: 800; color: var(--p); }
.pf-big small { font-size: 9pt; font-weight: 500; color: var(--mute); margin-left: 1mm; }
.pf-small { font-size: 8.5pt; color: var(--mute); }
.pf-chain { display: flex; align-items: center; justify-content: center; gap: 3mm; margin: 4mm 0 7mm; }
.pf-chain span { background: var(--p); color: #fff; border-radius: 10mm; padding: 2.5mm 5mm; font-weight: 600; font-size: 10pt; }
.pf-chain span:last-of-type { background: var(--flat); color: var(--on-flat); }
.pf-chain i { color: var(--a); font-style: normal; font-weight: 800; font-size: 13pt; }
.pf-steps { counter-reset: s; margin: 0; padding: 0; list-style: none; }
.pf-steps li { counter-increment: s; display: flex; gap: 4mm; padding: 2.5mm 0; border-bottom: 1px solid var(--line); }
.pf-steps li:last-child { border-bottom: 0; }
.pf-steps li::before { content: counter(s); flex: 0 0 7mm; height: 7mm; border-radius: 50%; background: var(--p); color: #fff; font-weight: 700; display: flex; align-items: center; justify-content: center; font-size: 9pt; }
.pf-contact { display: flex; gap: 6mm; align-items: center; background: var(--p); color: #fff; border-radius: 3mm; padding: 5mm 6mm; margin-top: 7mm; }
.pf-avatar { flex: 0 0 20mm; width: 20mm; height: 20mm; border-radius: 50%; overflow: hidden; }
.pf-avatar img { width: 100%; height: 100%; object-fit: cover; }
.pf-who { flex: 1; font-size: 9.5pt; line-height: 1.6; }
.pf-who b { font-size: 13pt; display: block; }
.pf-cta { font-size: 13pt; font-weight: 700; margin: 0 0 1mm; }
.pf-qr { flex: 0 0 24mm; width: 24mm; height: 24mm; background: #fff; border-radius: 2mm; padding: 2mm; }
.pf-qr svg { display: block; width: 100%; height: 100%; }
@media screen { .pf-page { box-shadow: 0 1px 3px rgb(0 0 0 / .12), 0 8px 24px rgb(0 0 0 / .08); } .pf-doc { display: flex; flex-direction: column; gap: 8mm; } }
@media print { html, body { background: #fff; } }
`;
