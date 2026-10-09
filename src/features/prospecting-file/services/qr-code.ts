import QRCode from 'qrcode';

// Mission 84 — le QR code du dossier, en tracé SVG : aucune image, aucun service extérieur.
// `size` est le côté en modules ; `path` trace un carré d'un module par case noire.
export type QrCode = { size: number; path: string };

export function buildQrCode(text: string): QrCode {
  const { modules } = QRCode.create(text, { errorCorrectionLevel: 'M' });
  const { size, data } = modules;
  let path = '';
  for (let row = 0; row < size; row += 1) {
    for (let column = 0; column < size; column += 1) {
      if (data[row * size + column]) {
        path += `M${column} ${row}h1v1h-1z`;
      }
    }
  }
  return { size, path };
}
