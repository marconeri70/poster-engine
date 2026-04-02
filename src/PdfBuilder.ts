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
    
    // Forza sfondo bianco su tutta la pagina
    page.drawRectangle({
      x: 0, y: 0, width: A4_W_PT, height: A4_H_PT,
      color: rgb(1, 1, 1)
    });

    const dW = p.destWidthMm * MM_TO_PT;
    const dH = p.destHeightMm * MM_TO_PT;
    const offX = (A4_W_PT - dW) / 2;
    const offY = (A4_H_PT - dH) / 2;

    // Disegno dell'immagine con ritaglio preciso
    page.pushOperators();
    page.drawRectangle({ x: offX, y: offY, width: dW, height: dH, color: rgb(1, 1, 1) });
    page.clip();

    page.drawImage(pdfImage, {
      x: offX + (imgState.x * MM_TO_PT) - (p.sourceX * (config.targetWidthMm / config.imageWidthPx) * MM_TO_PT),
      y: (A4_H_PT - offY) - (imgState.h * MM_TO_PT) - (imgState.y * MM_TO_PT) + (p.sourceY * (config.targetHeightMm / config.imageHeightPx) * MM_TO_PT),
      width: imgState.w * MM_TO_PT,
      height: imgState.h * MM_TO_PT,
    });
    page.popOperators();

    // LINEE DI TAGLIO ALTA VISIBILITÀ (Verde Fluo)
    const strokeColor = rgb(0, 1, 0.5); 
    page.drawRectangle({
      x: offX, y: offY, width: dW, height: dH,
      borderWidth: 1.5,
      borderColor: strokeColor,
    });

    // ETICHETTA DI POSIZIONAMENTO
    page.drawText(`FOGLIO: Riga ${p.row + 1} - Colonna ${p.col + 1}`, {
      x: offX + 5,
      y: offY + dH + 10,
      size: 10,
      font: font,
      color: rgb(0, 0, 0),
    });

    // Indicatori di sovrapposizione (Overlap)
    if (config.overlapMm > 0) {
      page.drawText(`SOVRAPPOSIZIONE: ${config.overlapMm}mm`, {
        x: offX + dW - 120,
        y: offY - 15,
        size: 8,
        color: rgb(0.5, 0.5, 0.5),
      });
    }
  }

  return await pdfDoc.save();
}
