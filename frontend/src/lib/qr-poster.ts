import QRCode from 'qrcode';
import { BRAND } from '../config/brand';

export const groupUrl = (token: string): string => `${BRAND.publicUrl}/r/${token}`;

/** QR solo (para la vista previa). */
export const qrDataUrl = (url: string, size = 320): Promise<string> =>
  QRCode.toDataURL(url, { width: size, margin: 1, errorCorrectionLevel: 'M', color: { dark: '#1F2A1C', light: '#FFFFFF' } });

/** Cartel imprimible (PNG 1200×1600) con el QR del grupo, listo para descargar. */
export async function downloadPoster(groupName: string, token: string, color: string): Promise<void> {
  const url = groupUrl(token);
  const W = 1200, H = 1600;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  if (!ctx) throw new Error('El navegador no pudo crear la imagen.');
  ctx.fillStyle = '#FFF9EE'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = color; ctx.fillRect(0, 0, W, 260);
  ctx.textAlign = 'center'; ctx.fillStyle = '#FFFFFF';
  ctx.font = '700 84px Georgia, serif'; ctx.fillText(BRAND.businessName, W / 2, 150);
  ctx.font = '500 40px Arial, sans-serif'; ctx.fillText(BRAND.programName, W / 2, 215);
  ctx.fillStyle = '#1F2A1C';
  ctx.font = '700 72px Arial, sans-serif'; ctx.fillText(groupName, W / 2, 400);
  ctx.font = '400 40px Arial, sans-serif'; ctx.fillStyle = '#6B7466';
  ctx.fillText('Escanea y saca tu tarjeta de lealtad', W / 2, 470);
  const qr = new Image();
  qr.src = await QRCode.toDataURL(url, { width: 820, margin: 2, errorCorrectionLevel: 'M', color: { dark: '#1F2A1C', light: '#FFFFFF' } });
  await qr.decode();
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(170, 540, 860, 860);
  ctx.drawImage(qr, 190, 560, 820, 820);
  ctx.font = '400 30px Arial, sans-serif'; ctx.fillStyle = '#6B7466';
  ctx.fillText(url.replace(/^https:\/\//, ''), W / 2, 1480);
  ctx.fillText(BRAND.handle, W / 2, 1530);
  const a = document.createElement('a');
  a.href = cv.toDataURL('image/png');
  a.download = `QR-${groupName.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '-')}.png`;
  document.body.appendChild(a); a.click(); a.remove();
}
