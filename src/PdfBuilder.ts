import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { type PosterConfig, type PageInstruction } from './GridCalculator';

const MM_TO_PT = 2.83465;

export async function generatePdf(
  file: File,
  config: PosterConfig,
  pages: PageInstruction[],
  imgState: { x: number, y: number, w: number, h: number }
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // LOGICA DI COMPATIBILITÀ UNIVERSALE ORIGINALE
  const imgBitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  canvas.width = imgBitmap.width;
  canvas.height = imgBitmap.height;
  const ctx = canvas.getContext('2d');
  ctx?.drawImage(imgBitmap, 0, 0);
  
  const jpgUrl = canvas.toDataURL('image/jpeg', 0.95);
  const jpgBytes = await fetch(jpgUrl).then(res => res.arrayBuffer());
  const pdfImage = await pdfDoc.embedJpg(jpgBytes);

  const A4_W_PT = 210 * MM_TO_PT;
  const A4_H_PT = 297 * MM_TO_PT;

  for (let i = 0; i < pages.length; i++) {
    const p = pages[i];
    const page = pdfDoc.addPage([A4_W_PT, A4_H_PT]);
    const dW = p.destWidthMm * MM_TO_PT;
    const dH = p.destHeightMm * MM_TO_PT;
    const offX = (A4_W_PT - dW) / 2;
    const offY = (A4_H_PT - dH) / 2;

    // 1. DISEGNO IMMAGINE (Identico al tuo originale)
    page.drawImage(pdfImage, {
      x: offX + (imgState.x * MM_TO_PT) - (p.sourceX * (config.targetWidthMm / config.imageWidthPx) * MM_TO_PT),
      y: (A4_H_PT - offY) - (imgState.h * MM_TO_PT) - (imgState.y * MM_TO_PT) + (p.sourceY * (config.targetHeightMm / config.imageHeightPx) * MM_TO_PT),
      width: imgState.w * MM_TO_PT,
      height: imgState.h * MM_TO_PT,
    });

    // MASCHERAMENTO BIANCO ESTERNO (Evita che l'immagine sporchi l'intero foglio A4)
    const white = rgb(1, 1, 1);
    page.drawRectangle({ x: 0, y: 0, width: offX, height: A4_H_PT, color: white });
    page.drawRectangle({ x: offX + dW, y: 0, width: A4_W_PT - (offX + dW), height: A4_H_PT, color: white });
    page.drawRectangle({ x: 0, y: 0, width: A4_W_PT, height: offY, color: white });
    page.drawRectangle({ x: 0, y: offY + dH, width: A4_W_PT, height: A4_H_PT - (offY + dH), color: white });

    // 2. CORNICE ORIGINALE ROSSA (Usa questa per RITAGLIARE)
    page.drawRectangle({ 
      x: offX, y: offY, width: dW, height: dH, 
      borderColor: rgb(1, 0, 0), borderWidth: 1.5, borderDashArray: [2, 2] 
    });

    // 3. NUOVA AGGIUNTA: LINEE BLU DI SOVRAPPOSIZIONE
    const overlapPt = config.overlapMm * MM_TO_PT;
    const blue = rgb(0, 0.4, 1); // Colore a contrasto

    // Se c'è una colonna precedente, disegna la guida di sovrapposizione a SINISTRA
    if (config.overlapMm > 0 && p.col > 0) {
      page.drawLine({
        start: { x: offX + overlapPt, y: offY },
        end: { x: offX + overlapPt, y: offY + dH },
        thickness: 1.5, color: blue, dashArray: [4, 4]
      });
    }

    // Se c'è una riga precedente, disegna la guida di sovrapposizione in ALTO
    if (config.overlapMm > 0 && p.row > 0) {
      page.drawLine({
        start: { x: offX, y: offY + dH - overlapPt },
        end: { x: offX + dW, y: offY + dH - overlapPt },
        thickness: 1.5, color: blue, dashArray: [4, 4]
      });
    }

    // 4. TESTO ORIGINALE (Identico al tuo)
    const label = `FOGLIO ${i + 1} [R:${p.row + 1} C:${p.col + 1}]`;
    page.drawText(label, { x: offX + 15, y: offY + 15, size: 10, font: font, color: rgb(0, 1, 0.5) });
  }

  return await pdfDoc.save();
}
