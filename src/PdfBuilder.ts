// src/PdfBuilder.ts
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { type PosterConfig, type PageInstruction } from './GridCalculator';

const MM_TO_PT = 2.83465; // Conversione Millimetri -> Punti PDF

export async function generatePdf(
  file: File,
  config: PosterConfig,
  pages: PageInstruction[]
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // 1. Ingestione Immagine (Ottimizzata: incorporata una sola volta)
  const imageBytes = await file.arrayBuffer();
  let pdfImage;
  if (file.type === 'image/jpeg' || file.type === 'image/jpg') {
    pdfImage = await pdfDoc.embedJpg(imageBytes);
  } else if (file.type === 'image/png') {
    pdfImage = await pdfDoc.embedPng(imageBytes);
  } else {
    throw new Error("Formato non supportato. Usa JPG o PNG.");
  }

  const A4_W_PT = 210 * MM_TO_PT;
  const A4_H_PT = 297 * MM_TO_PT;

  const totalW_PT = config.targetWidthMm * MM_TO_PT;
  const totalH_PT = config.targetHeightMm * MM_TO_PT;

  const scaleX_mm = config.targetWidthMm / config.imageWidthPx;
  const scaleY_mm = config.targetHeightMm / config.imageHeightPx;

  // 2. Generazione Pagine
  for (let i = 0; i < pages.length; i++) {
    const p = pages[i];
    const page = pdfDoc.addPage([A4_W_PT, A4_H_PT]);

    // Coordinate di destinazione sul foglio (centrate)
    const destW_PT = p.destWidthMm * MM_TO_PT;
    const destH_PT = p.destHeightMm * MM_TO_PT;
    const offsetX_PT = (A4_W_PT - destW_PT) / 2;
    const offsetY_PT = (A4_H_PT - destH_PT) / 2;

    const startX_mm = p.sourceX * scaleX_mm;
    const startY_mm = p.sourceY * scaleY_mm;

    // Calcolo posizione immagine per il clipping naturale della pagina
    const drawX = offsetX_PT - (startX_mm * MM_TO_PT);
    const topOfImageY = A4_H_PT - offsetY_PT + (startY_mm * MM_TO_PT);
    const drawY = topOfImageY - totalH_PT;

    // Disegno Immagine
    page.drawImage(pdfImage, {
      x: drawX,
      y: drawY,
      width: totalW_PT,
      height: totalH_PT,
    });

    // --- EFFETTO WOW: LINEE DI TAGLIO E INFO TECNICHE ---

    // 1. Cornice tratteggiata di taglio (Dash 5,5)
    page.drawRectangle({
      x: offsetX_PT,
      y: offsetY_PT,
      width: destW_PT,
      height: destH_PT,
      borderColor: rgb(0.7, 0.7, 0.7),
      borderWidth: 0.5,
      borderDashArray: [5, 5],
    });

    // 2. Etichetta Identificativa Neon
    const label = `PAGE ${i + 1} - ROW: ${p.row + 1} | COL: ${p.col + 1}`;
    page.drawText(label, {
      x: offsetX_PT,
      y: offsetY_PT - 15, // Posizionata appena sotto l'area di taglio
      size: 9,
      font: font,
      color: rgb(0, 0.8, 0.4), // Verde smeraldo tecnico
    });

    // 3. Info Dimensioni e Overlap
    const details = `${p.destWidthMm.toFixed(0)}x${p.destHeightMm.toFixed(0)}mm (Overlap: ${config.overlapMm}mm)`;
    page.drawText(details, {
      x: offsetX_PT,
      y: offsetY_PT - 28,
      size: 7,
      font: font,
      color: rgb(0.5, 0.5, 0.5),
    });

    // 4. Indicatori ai quattro angoli (Crocini semplificati)
    const crossSize = 10;
    const drawCross = (x: number, y: number) => {
      page.drawLine({ start: { x: x-crossSize, y }, end: { x: x+crossSize, y }, color: rgb(0,0,0), borderWidth: 0.2 });
      page.drawLine({ start: { x, y: y-crossSize }, end: { x, y: y+crossSize }, color: rgb(0,0,0), borderWidth: 0.2 });
    };
    
    drawCross(offsetX_PT, offsetY_PT); // Angolo Basso-SX
    drawCross(offsetX_PT + destW_PT, offsetY_PT); // Angolo Basso-DX
    drawCross(offsetX_PT, offsetY_PT + destH_PT); // Angolo Alto-SX
    drawCross(offsetX_PT + destW_PT, offsetY_PT + destH_PT); // Angolo Alto-DX
  }

  return await pdfDoc.save();
}
