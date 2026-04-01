import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { type PosterConfig, type PageInstruction } from './GridCalculator';

const MM_TO_PT = 2.83465;

export async function generatePdf(
  file: File,
  config: PosterConfig,
  pages: PageInstruction[],
  imgTransform: { scale: number, x: number, y: number }
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const imageBytes = await file.arrayBuffer();
  let pdfImage = (file.type === 'image/png') ? await pdfDoc.embedPng(imageBytes) : await pdfDoc.embedJpg(imageBytes);

  const A4_W_PT = 210 * MM_TO_PT;
  const A4_H_PT = 297 * MM_TO_PT;

  // L'immagine nel PDF deve essere scalata esattamente come nell'anteprima
  const finalImgW = config.imageWidthPx * imgTransform.scale * MM_TO_PT;
  const finalImgH = config.imageHeightPx * imgTransform.scale * MM_TO_PT;

  for (let i = 0; i < pages.length; i++) {
    const p = pages[i];
    const page = pdfDoc.addPage([A4_W_PT, A4_H_PT]);

    const destW_PT = p.destWidthMm * MM_TO_PT;
    const destH_PT = p.destHeightMm * MM_TO_PT;
    const offsetX = (A4_W_PT - destW_PT) / 2;
    const offsetY = (A4_H_PT - destH_PT) / 2;

    // Disegno immagine con offset calcolati dal trascinamento
    page.drawImage(pdfImage, {
      x: offsetX + (imgTransform.x * MM_TO_PT) - (p.sourceX * (finalImgW / (config.imageWidthPx * imgTransform.scale))),
      y: (A4_H_PT - offsetY) - finalImgH - (imgTransform.y * MM_TO_PT) + (p.sourceY * (finalImgH / (config.imageHeightPx * imgTransform.scale))),
      width: finalImgW,
      height: finalImgH,
    });

    // LINEE DI TAGLIO (ROSSO CARICO)
    page.drawRectangle({
      x: offsetX, y: offsetY, width: destW_PT, height: destH_PT,
      borderColor: rgb(1, 0, 0), borderWidth: 1.5, borderDashArray: [2, 2]
    });

    // AREA COLLA (AZZURRO)
    const overlapPT = config.overlapMm * MM_TO_PT;
    if (p.col > 0) {
        page.drawRectangle({ x: offsetX, y: offsetY, width: overlapPT, height: destH_PT, color: rgb(0, 0.5, 1), opacity: 0.15 });
    }

    page.drawText(`FOGLIO ${i+1} [R${p.row+1}-C${p.col+1}] - TAGLIA SULLA LINEA ROSSA`, {
      x: offsetX, y: offsetY - 15, size: 8, font: font, color: rgb(1, 0, 0)
    });
  }
  return await pdfDoc.save();
}
