import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { type PosterConfig, type PageInstruction } from './GridCalculator';

const MM_TO_PT = 2.83465;

export async function generatePdf(
  file: File,
  config: PosterConfig,
  pages: PageInstruction[],
  transform: { x: number, y: number, scale: number, viewScale: number }
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const imageBytes = await file.arrayBuffer();
  let pdfImage = file.type === 'image/png' ? await pdfDoc.embedPng(imageBytes) : await pdfDoc.embedJpg(imageBytes);

  const A4_W_PT = 210 * MM_TO_PT;
  const A4_H_PT = 297 * MM_TO_PT;

  // Convertiamo le coordinate visuali in millimetri reali per il PDF
  const mmX = transform.x / transform.viewScale;
  const mmY = transform.y / transform.viewScale;
  const realImgWidth = (config.imageWidthPx * transform.scale) / transform.viewScale;
  const realImgHeight = (config.imageHeightPx * transform.scale) / transform.viewScale;

  for (let i = 0; i < pages.length; i++) {
    const p = pages[i];
    const page = pdfDoc.addPage([A4_W_PT, A4_H_PT]);

    const destW_PT = p.destWidthMm * MM_TO_PT;
    const destH_PT = p.destHeightMm * MM_TO_PT;
    const offsetX = (A4_W_PT - destW_PT) / 2;
    const offsetY = (A4_H_PT - destH_PT) / 2;

    // L'immagine viene disegnata considerando lo spostamento fatto dall'utente
    page.drawImage(pdfImage, {
      x: offsetX + (mmX * MM_TO_PT) - (p.sourceX * (config.targetWidthMm / config.imageWidthPx) * MM_TO_PT),
      y: (A4_H_PT - offsetY) - (realImgHeight * MM_TO_PT) - (mmY * MM_TO_PT) + (p.sourceY * (config.targetHeightMm / config.imageHeightPx) * MM_TO_PT),
      width: realImgWidth * MM_TO_PT,
      height: realImgHeight * MM_TO_PT,
    });

    // LINEE DI TAGLIO ROSSE (Chiarissime)
    page.drawRectangle({
      x: offsetX, y: offsetY, width: destW_PT, height: destH_PT,
      borderColor: rgb(1, 0, 0), borderWidth: 1.5, borderDashArray: [2, 2]
    });

    // AREA COLLA BLU
    const overlapPT = config.overlapMm * MM_TO_PT;
    if (p.col > 0) {
      page.drawRectangle({ x: offsetX, y: offsetY, width: overlapPT, height: destH_PT, color: rgb(0, 0.4, 1), opacity: 0.15 });
    }

    page.drawText(`FOGLIO ${i + 1} [R${p.row + 1}-C${p.col + 1}] - TAGLIA SUL ROSSO`, {
      x: offsetX, y: offsetY - 12, size: 8, font: font, color: rgb(1, 0, 0)
    });
  }
  return await pdfDoc.save();
}
