import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { type PosterConfig, type PageInstruction } from './GridCalculator';

const MM_TO_PT = 2.83465; // Conversione Millimetri -> Punti tipografici PDF

export async function generatePdf(
  file: File,
  config: PosterConfig,
  pages: PageInstruction[],
  imgTransform: { mmX: number, mmY: number, mmWidth: number, mmHeight: number }
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const imageBytes = await file.arrayBuffer();
  let pdfImage = file.type === 'image/png' ? await pdfDoc.embedPng(imageBytes) : await pdfDoc.embedJpg(imageBytes);

  const A4_W_PT = 210 * MM_TO_PT;
  const A4_H_PT = 297 * MM_TO_PT;

  // Dimensioni finali distorte dell'immagine nel PDF (in punti)
  const finalW_PT = imgTransform.mmWidth * MM_TO_PT;
  const finalH_PT = imgTransform.mmHeight * MM_TO_PT;

  for (let i = 0; i < pages.length; i++) {
    const p = pages[i];
    const page = pdfDoc.addPage([A4_W_PT, A4_H_PT]);

    const destW_PT = p.destWidthMm * MM_TO_PT;
    const destH_PT = p.destHeightMm * MM_TO_PT;
    const offsetX = (A4_W_PT - destW_PT) / 2;
    const offsetY = (A4_H_PT - destH_PT) / 2;

    // Magia Nera del PDF: Calcolo della posizione con asse Y invertito.
    // L'immagine viene disegnata considerando lo spostamento fatto dall'utente (mmX, mmY)
    page.drawImage(pdfImage, {
      x: offsetX + (imgTransform.mmX * MM_TO_PT) - (p.sourceX * (config.targetWidthMm / config.imageWidthPx) * MM_TO_PT),
      y: (A4_H_PT - offsetY) - finalH_PT - (imgTransform.mmY * MM_TO_PT) + (p.sourceY * (config.targetHeightMm / config.imageHeightPx) * MM_TO_PT),
      width: finalW_PT,
      height: finalH_PT,
    });

    // --- ISTRUZIONI DI TAGLIO (Evidenti) ---

    // 1. LINEA DI TAGLIO (ROSSO PURE - Spessa e tratteggiata)
    page.drawRectangle({
      x: offsetX, y: offsetY, width: destW_PT, height: destH_PT,
      borderColor: rgb(1, 0, 0), borderWidth: 2, borderDashArray: [3, 3],
    });

    // 2. AREA COLLA (BLU INTENSO - Opacità 20%)
    const overlapPT = config.overlapMm * MM_TO_PT;
    if (p.col > 0) { // Indica dove incollare il foglio precedente
        page.drawRectangle({
            x: offsetX, y: offsetY,
            width: overlapPT, height: destH_PT,
            color: rgb(0, 0.2, 1), opacity: 0.2
        });
        page.drawText('INCOLLA QUI', {
            x: offsetX + 5, y: offsetY + destH_PT - 15,
            size: 8, font: font, color: rgb(0, 0.2, 1),
            rotate: { angle: -90, type: 'degrees' as any }
        });
    }

    // 3. Info e Istruzioni
    page.drawText(`FOGLIO ${i+1} [Fila ${p.row+1}, Col ${p.col+1}] - TAGLIA SULLA LINEA ROSSA`, {
      x: offsetX, y: offsetY - 18,
      size: 10, font: font, color: rgb(1, 0, 0),
    });
  }

  return await pdfDoc.save();
}
