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
    
    // 1. FORZIAMO SFONDO BIANCO (Pulisce eventuali residui)
    page.drawRectangle({
      x: 0, y: 0, width: A4_W_PT, height: A4_H_PT,
      color: rgb(1, 1, 1)
    });

    const dW = p.destWidthMm * MM_TO_PT;
    const dH = p.destHeightMm * MM_TO_PT;
    const offX = (A4_W_PT - dW) / 2;
    const offY = (A4_H_PT - dH) / 2;

    // 2. RITAGLIO (CLIPPING): L'immagine non potrà mai uscire dal rettangolo di taglio
    page.pushOperators();
    page.drawRectangle({ x: offX, y: offY, width: dW, height: dH });
    page.clip();

    page.drawImage(pdfImage, {
      x: offX + (imgState.x * MM_TO_PT) - (p.sourceX * (config.targetWidthMm / config.imageWidthPx) * MM_TO_PT),
      y: (A4_H_PT - offY) - (imgState.h * MM_TO_PT) - (imgState.y * MM_TO_PT) + (p.sourceY * (config.targetHeightMm / config.imageHeightPx) * MM_TO_PT),
      width: imgState.w * MM_TO_PT,
      height: imgState.h * MM_TO_PT,
    });
    page.popOperators();

    // 3. LINEE DI TAGLIO ALTA VISIBILITÀ (Verde Neon)
    // Questo colore non esiste in natura, quindi lo vedrai sempre chiaramente
    const neonGreen = rgb(0, 1, 0.4); 
    
    page.drawRectangle({
      x: offX,
      y: offY,
      width: dW,
      height: dH,
      borderColor: neonGreen,
      borderWidth: 2,
    });

    // 4. TESTI DI SERVIZIO FUORI DALL'IMMAGINE
    // Li mettiamo nel margine bianco dell'A4
    page.drawText(`FOGLIO ${i + 1} - Riga ${p.row + 1} Col ${p.col + 1}`, {
      x: offX,
      y: offY + dH + 10,
      size: 10,
      font: font,
      color: rgb(0, 0, 0)
    });

    // Indicazione della sovrapposizione (se presente)
    if (config.overlapMm > 0 && p.col > 0) {
      page.drawText(`Area Incollo (${config.overlapMm}mm)`, {
        x: offX + 2,
        y: offY + 5,
        size: 7,
        font: font,
        color: neonGreen
      });
    }
  }

  return await pdfDoc.save();
}
