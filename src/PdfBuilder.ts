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

    page.drawImage(pdfImage, {
      x: offX + (imgState.x * MM_TO_PT) - (p.sourceX * (config.targetWidthMm / config.imageWidthPx) * MM_TO_PT),
      y: (A4_H_PT - offY) - (imgState.h * MM_TO_PT) - (imgState.y * MM_TO_PT) + (p.sourceY * (config.targetHeightMm / config.imageHeightPx) * MM_TO_PT),
      width: imgState.w * MM_TO_PT,
      height: imgState.h * MM_TO_PT,
    });

    // Taglio Rosso (Safe Zone)
    page.drawRectangle({ x: offX, y: offY, width: dW, height: dH, borderColor: rgb(1, 0, 0), borderWidth: 1.5, borderDashArray: [2, 2] });
    
    // Colla Blu
    if (p.col > 0) page.drawRectangle({ x: offX, y: offY, width: config.overlapMm * MM_TO_PT, height: dH, color: rgb(0, 0.4, 1), opacity: 0.15 });

    // Numerazione Protetta Interna
    const label = `FOGLIO ${i + 1} [R:${p.row + 1} C:${p.col + 1}]`;
    page.drawText(label, { x: offX + 15, y: offY + 15, size: 10, font: font, color: rgb(0, 1, 0.5) });
  }
  return await pdfDoc.save();
}
