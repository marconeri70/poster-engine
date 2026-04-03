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
  
  // CONVERTITORE UNIVERSALE IMMAGINI
  const imgBitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  canvas.width = imgBitmap.width;
  canvas.height = imgBitmap.height;
  const ctx = canvas.getContext('2d');
  ctx?.drawImage(imgBitmap, 0, 0);
  const jpgUrl = canvas.toDataURL('image/jpeg', 0.95);
  const jpgBytes = await fetch(jpgUrl).then(res => res.arrayBuffer());
  const pdfImage = await pdfDoc.embedJpg(jpgBytes);

  const A4_W_PT = 210 * MM_TO_PT;
  const A4_H_PT = 297 * MM_TO_PT;

  for (let i = 0; i < pages.length; i++) {
    const p = pages[i];
    const page = pdfDoc.addPage([A4_W_PT, A4_H_PT]);
    
    const dW = p.destWidthMm * MM_TO_PT;
    const dH = p.destHeightMm * MM_TO_PT;
    const offX = (A4_W_PT - dW) / 2;
    const offY = (A4_H_PT - dH) / 2;

    // 1. STAMPA IMMAGINE (Stampata per intero, l'immagine riempie anche le zone di colla)
    page.drawImage(pdfImage, {
      x: offX + (imgState.x * MM_TO_PT) - (p.sourceX * (config.targetWidthMm / config.imageWidthPx) * MM_TO_PT),
      y: (A4_H_PT - offY) - (imgState.h * MM_TO_PT) - (imgState.y * MM_TO_PT) + (p.sourceY * (config.targetHeightMm / config.imageHeightPx) * MM_TO_PT),
      width: imgState.w * MM_TO_PT,
      height: imgState.h * MM_TO_PT,
    });

    // 2. MASCHERE BIANCHE ESTERNE (Rifilano l'immagine al rettangolo esatto del foglio)
    const white = rgb(1, 1, 1);
    page.drawRectangle({ x: 0, y: 0, width: offX, height: A4_H_PT, color: white });
    page.drawRectangle({ x: offX + dW, y: 0, width: A4_W_PT - (offX + dW), height: A4_H_PT, color: white });
    page.drawRectangle({ x: 0, y: 0, width: A4_W_PT, height: offY, color: white });
    page.drawRectangle({ x: 0, y: offY + dH, width: A4_W_PT, height: A4_H_PT - (offY + dH), color: white });

    // 3. CORNICE DI RITAGLIO (Linea continua nera per togliere il bordo bianco della stampante)
    page.drawRectangle({
      x: offX, y: offY, width: dW, height: dH,
      borderColor: rgb(0, 0, 0), borderWidth: 1
    });

    // 4. GUIDE DI SOVRAPPOSIZIONE E COLLA (Linee rosse tratteggiate interne)
    const overlapPt = config.overlapMm * MM_TO_PT;
    
    if (config.overlapMm > 0) {
      // Linea a DESTRA (Indica fin dove arriverà la colonna successiva)
      page.drawLine({
        start: { x: offX + dW - overlapPt, y: offY },
        end: { x: offX + dW - overlapPt, y: offY + dH },
        thickness: 1, color: rgb(1, 0, 0), dashArray: [4, 4]
      });
      
      // Linea in BASSO (Indica fin dove arriverà la riga successiva)
      page.drawLine({
        start: { x: offX, y: offY + overlapPt },
        end: { x: offX + dW, y: offY + overlapPt },
        thickness: 1, color: rgb(1, 0, 0), dashArray: [4, 4]
      });
    }

    // 5. ETICHETTE E ISTRUZIONI (Stampate fuori dall'area del poster, verranno buttate a fine lavoro)
    page.drawText(`FOGLIO ${i + 1}  [ Riga ${p.row + 1} | Colonna ${p.col + 1} ]`, {
      x: offX, y: offY + dH + 12, size: 10, font: font, color: rgb(0, 0, 0)
    });
    
    page.drawText(`1. Ritaglia tutto il bordo bianco seguendo la linea nera continua.`, {
      x: offX, y: offY - 15, size: 7, font: font, color: rgb(0.3, 0.3, 0.3)
    });
    page.drawText(`2. Metti la colla tra la linea rossa tratteggiata e il bordo del foglio.`, {
      x: offX, y: offY - 25, size: 7, font: font, color: rgb(0.3, 0.3, 0.3)
    });
  }

  return await pdfDoc.save();
}
