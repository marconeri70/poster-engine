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
  const imageBytes = await file.arrayBuffer();
  
  const pdfImage = file.type === 'image/png' ? 
                 await pdfDoc.embedPng(imageBytes) : 
                 await pdfDoc.embedJpg(imageBytes);

  const A4_W_PT = 210 * MM_TO_PT;
  const A4_H_PT = 297 * MM_TO_PT;

  for (let i = 0; i < pages.length; i++) {
    const p = pages[i];
    const page = pdfDoc.addPage([A4_W_PT, A4_H_PT]);
    
    const dW = p.destWidthMm * MM_TO_PT;
    const dH = p.destHeightMm * MM_TO_PT;
    const offX = (A4_W_PT - dW) / 2;
    const offY = (A4_H_PT - dH) / 2;

    // 1. DISEGNO IMMAGINE 
    page.drawImage(pdfImage, {
      x: offX + (imgState.x * MM_TO_PT) - (p.sourceX * (config.targetWidthMm / config.imageWidthPx) * MM_TO_PT),
      y: (A4_H_PT - offY) - (imgState.h * MM_TO_PT) - (imgState.y * MM_TO_PT) + (p.sourceY * (config.targetHeightMm / config.imageHeightPx) * MM_TO_PT),
      width: imgState.w * MM_TO_PT,
      height: imgState.h * MM_TO_PT,
    });

    // 2. MASCHERAMENTO (Copriamo gli sbordi con blocchi bianchi assoluti)
    const white = rgb(1, 1, 1);
    page.drawRectangle({ x: 0, y: 0, width: offX, height: A4_H_PT, color: white }); // Sinistra
    page.drawRectangle({ x: offX + dW, y: 0, width: A4_W_PT - (offX + dW), height: A4_H_PT, color: white }); // Destra
    page.drawRectangle({ x: 0, y: 0, width: A4_W_PT, height: offY, color: white }); // Sotto
    page.drawRectangle({ x: 0, y: offY + dH, width: A4_W_PT, height: A4_H_PT - (offY + dH), color: white }); // Sopra

    // 3. CORNICE PRINCIPALE (Verde Neon)
    const neonGreen = rgb(0, 1, 0.4); 
    page.drawRectangle({
      x: offX,
      y: offY,
      width: dW,
      height: dH,
      borderColor: neonGreen,
      borderWidth: 1.5,
    });

    // 4. GUIDE DI SOVRAPPOSIZIONE (Magenta Tratteggiato = Dove Incollare)
    const overlapPt = config.overlapMm * MM_TO_PT;
    const magenta = rgb(1, 0, 1);

    // Guida a SINISTRA (Se non è la prima colonna)
    if (config.overlapMm > 0 && p.col > 0) {
      page.drawLine({
        start: { x: offX + overlapPt, y: offY },
        end: { x: offX + overlapPt, y: offY + dH },
        thickness: 1.5,
        color: magenta,
        dashArray: [5, 5]
      });
      page.drawText(`ZONA COLLA`, {
        x: offX + 2,
        y: offY + dH / 2,
        size: 8,
        font: font,
        color: magenta
      });
    }

    // Guida in ALTO (Se non è la prima riga)
    if (config.overlapMm > 0 && p.row > 0) {
      page.drawLine({
        start: { x: offX, y: offY + dH - overlapPt },
        end: { x: offX + dW, y: offY + dH - overlapPt },
        thickness: 1.5,
        color: magenta,
        dashArray: [5, 5]
      });
      page.drawText(`ZONA COLLA`, {
        x: offX + dW / 2 - 20,
        y: offY + dH - overlapPt + 4,
        size: 8,
        font: font,
        color: magenta
      });
    }

    // 5. TESTI DI IDENTIFICAZIONE
    page.drawText(`FOGLIO ${i + 1} - Riga ${p.row + 1} Col ${p.col + 1}`, {
      x: offX,
      y: offY + dH + 10,
      size: 10,
      font: font,
      color: rgb(0, 0, 0)
    });
  }

  return await pdfDoc.save();
}
