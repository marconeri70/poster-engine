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
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
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

    // 1. DISEGNO IMMAGINE CONTINUA (Viene stampata anche nella zona di sovrapposizione)
    page.drawImage(pdfImage, {
      x: offX + (imgState.x * MM_TO_PT) - (p.sourceX * (config.targetWidthMm / config.imageWidthPx) * MM_TO_PT),
      y: (A4_H_PT - offY) - (imgState.h * MM_TO_PT) - (imgState.y * MM_TO_PT) + (p.sourceY * (config.targetHeightMm / config.imageHeightPx) * MM_TO_PT),
      width: imgState.w * MM_TO_PT,
      height: imgState.h * MM_TO_PT,
    });

    // 2. MASCHERE BIANCHE ESTERNE (Rimuovono solo lo sbordo che finirebbe nei margini non stampabili)
    const white = rgb(1, 1, 1);
    page.drawRectangle({ x: 0, y: 0, width: offX, height: A4_H_PT, color: white }); 
    page.drawRectangle({ x: offX + dW, y: 0, width: A4_W_PT - (offX + dW), height: A4_H_PT, color: white }); 
    page.drawRectangle({ x: 0, y: 0, width: A4_W_PT, height: offY, color: white }); 
    page.drawRectangle({ x: 0, y: offY + dH, width: A4_W_PT, height: A4_H_PT - (offY + dH), color: white }); 

    // 3. BORDO DI RITAGLIO CARTA (Grigio leggerissimo, serve solo per rifilare il foglio)
    page.drawRectangle({
      x: offX, y: offY, width: dW, height: dH,
      borderColor: rgb(0.8, 0.8, 0.8), borderWidth: 0.5
    });

    // 4. GUIDE DI ALLINEAMENTO SOTTILI (Non rovinano il disegno)
    const overlapPt = config.overlapMm * MM_TO_PT;
    const guideColor = rgb(1, 0, 0); // Rosso sottile

    if (config.overlapMm > 0 && p.col > 0) {
      page.drawLine({
        start: { x: offX + overlapPt, y: offY },
        end: { x: offX + overlapPt, y: offY + dH },
        thickness: 0.5, color: guideColor, dashArray: [3, 3]
      });
    }

    if (config.overlapMm > 0 && p.row > 0) {
      page.drawLine({
        start: { x: offX, y: offY + dH - overlapPt },
        end: { x: offX + dW, y: offY + dH - overlapPt },
        thickness: 0.5, color: guideColor, dashArray: [3, 3]
      });
    }

    // 5. ETICHETTE DI ASSEMBLAGGIO (Spostate nel margine bianco in alto, fuori dal poster)
    page.drawText(`FOGLIO ${i + 1} [Riga ${p.row + 1} - Col ${p.col + 1}]`, {
      x: offX, y: offY + dH + 5, size: 8, font: font, color: rgb(0, 0, 0)
    });
  }

  return await pdfDoc.save();
}
