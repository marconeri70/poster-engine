import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { type PosterConfig, type PageInstruction } from './GridCalculator';

const MM_TO_PT = 2.83465;

export async function generatePdf(
  file: File,
  config: PosterConfig,
  pages: PageInstruction[]
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const imageBytes = await file.arrayBuffer();
  let pdfImage;
  if (file.type === 'image/jpeg' || file.type === 'image/jpg') {
    pdfImage = await pdfDoc.embedJpg(imageBytes);
  } else if (file.type === 'image/png') {
    pdfImage = await pdfDoc.embedPng(imageBytes);
  } else {
    throw new Error("Formato non supportato.");
  }

  const A4_W_PT = 210 * MM_TO_PT;
  const A4_H_PT = 297 * MM_TO_PT;
  const totalW_PT = config.targetWidthMm * MM_TO_PT;
  const totalH_PT = config.targetHeightMm * MM_TO_PT;

  const scaleX_mm = config.targetWidthMm / config.imageWidthPx;
  const scaleY_mm = config.targetHeightMm / config.imageHeightPx;

  for (let i = 0; i < pages.length; i++) {
    const p = pages[i];
    const page = pdfDoc.addPage([A4_W_PT, A4_H_PT]);

    const destW_PT = p.destWidthMm * MM_TO_PT;
    const destH_PT = p.destHeightMm * MM_TO_PT;
    const offsetX_PT = (A4_W_PT - destW_PT) / 2;
    const offsetY_PT = (A4_H_PT - destH_PT) / 2;

    const drawX = offsetX_PT - (p.sourceX * scaleX_mm * MM_TO_PT);
    const topOfImageY = A4_H_PT - offsetY_PT + (p.sourceY * scaleY_mm * MM_TO_PT);
    const drawY = topOfImageY - totalH_PT;

    page.drawImage(pdfImage, { x: drawX, y: drawY, width: totalW_PT, height: totalH_PT });

    // --- ISTRUZIONI DI TAGLIO AVANZATE ---
    
    // 1. Linea di TAGLIO NETTO (Rossa tratteggiata)
    page.drawRectangle({
      x: offsetX_PT, y: offsetY_PT,
      width: destW_PT, height: destH_PT,
      borderColor: rgb(1, 0, 0),
      borderWidth: 1,
      borderDashArray: [3, 3],
    });

    // 2. Area di SOVRAPPOSIZIONE (Blu sfumato)
    const overlapPT = config.overlapMm * MM_TO_PT;
    if (p.col > 0) { // Indica dove incollare il foglio precedente
        page.drawRectangle({
            x: offsetX_PT, y: offsetY_PT,
            width: overlapPT, height: destH_PT,
            color: rgb(0, 0, 1), opacity: 0.1
        });
        page.drawText('AREA DI COLLA', {
            x: offsetX_PT + 2, y: offsetY_PT + 10,
            size: 6, font: font, color: rgb(0, 0, 1),
            rotate: { angle: 90, type: 'degrees' as any }
        });
    }

    // 3. Info e Forbici
    page.drawText(`✂ TAGLIO: FOGLIO ${i+1} [Fila ${p.row+1}, Col ${p.col+1}]`, {
      x: offsetX_PT, y: offsetY_PT - 12,
      size: 10, font: font, color: rgb(1, 0, 0),
    });
  }

  return await pdfDoc.save();
}
