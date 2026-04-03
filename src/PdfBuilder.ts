import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib';
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
  
  // MOTORE DI CONVERSIONE UNIVERSALE (Blindatura contro i formati WebP/AVIF)
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

    // 1. STAMPA IMMAGINE SOTTOSTANTE
    page.drawImage(pdfImage, {
      x: offX + (imgState.x * MM_TO_PT) - (p.sourceX * (config.targetWidthMm / config.imageWidthPx) * MM_TO_PT),
      y: (A4_H_PT - offY) - (imgState.h * MM_TO_PT) - (imgState.y * MM_TO_PT) + (p.sourceY * (config.targetHeightMm / config.imageHeightPx) * MM_TO_PT),
      width: imgState.w * MM_TO_PT,
      height: imgState.h * MM_TO_PT,
    });

    // 2. MASCHERE BIANCHE ESTERNE
    const white = rgb(1, 1, 1);
    page.drawRectangle({ x: 0, y: 0, width: offX, height: A4_H_PT, color: white });
    page.drawRectangle({ x: offX + dW, y: 0, width: A4_W_PT - (offX + dW), height: A4_H_PT, color: white });
    page.drawRectangle({ x: 0, y: 0, width: A4_W_PT, height: offY, color: white });
    page.drawRectangle({ x: 0, y: offY + dH, width: A4_W_PT, height: A4_H_PT - (offY + dH), color: white });

    // 3. LINGUETTE "ZONA COLLA"
    const overlapPt = config.overlapMm * MM_TO_PT;
    const glueColor = rgb(0.9, 0.9, 0.9);
    const textColor = rgb(0.4, 0.4, 0.4);

    if (config.overlapMm > 0 && p.col > 0) {
      page.drawRectangle({
        x: offX, y: offY, width: overlapPt, height: dH, color: glueColor
      });
      page.drawText(`ZONA COLLA - Copri con Colonna ${p.col}`, {
        x: offX + (overlapPt / 2) - 3, y: offY + 20, size: 8, font: font, color: textColor, rotate: degrees(90)
      });
    }

    if (config.overlapMm > 0 && p.row > 0) {
      page.drawRectangle({
        x: offX, y: offY + dH - overlapPt, width: dW, height: overlapPt, color: glueColor
      });
      page.drawText(`ZONA COLLA - Copri con Riga ${p.row}`, {
        x: offX + 15, y: offY + dH - (overlapPt / 2) - 3, size: 8, font: font, color: textColor
      });
    }

    // 4. LINEA DI TAGLIO
    page.drawRectangle({
      x: offX, y: offY, width: dW, height: dH,
      borderColor: rgb(0, 0, 0), borderWidth: 1, borderDashArray: [4, 4]
    });

    // 5. ISTRUZIONI DI ASSEMBLAGGIO (Senza Emoji)
    page.drawText(`[ TAGLIA LUNGO LA LINEA TRATTEGGIATA ]`, {
      x: offX, y: offY - 12, size: 8, font: font, color: rgb(0, 0, 0)
    });
    
    page.drawText(`FOGLIO ${i + 1}  [ Riga ${p.row + 1} | Colonna ${p.col + 1} ]`, {
      x: offX, y: offY + dH + 8, size: 10, font: font, color: rgb(0, 0, 0)
    });
  }

  return await pdfDoc.save();
}
