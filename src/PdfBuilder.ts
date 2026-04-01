import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { type PosterConfig, type PageInstruction } from './GridCalculator';

const MM_TO_PT = 2.83465; // Fattore di conversione: da millimetri a punti tipografici

export async function generatePdf(
  file: File,
    config: PosterConfig,
      pages: PageInstruction[]
      ): Promise<Uint8Array> {
        const pdfDoc = await PDFDocument.create();
          const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

            // 1. Ingestione Immagine (1 sola volta per risparmiare RAM)
              const imageBytes = await file.arrayBuffer();
                let pdfImage;
                  if (file.type === 'image/jpeg' || file.type === 'image/jpg') {
                      pdfImage = await pdfDoc.embedJpg(imageBytes);
                        } else if (file.type === 'image/png') {
                            pdfImage = await pdfDoc.embedPng(imageBytes);
                              } else {
                                  throw new Error("Formato immagine non supportato. Usa JPG o PNG.");
                                    }

                                      const A4_W_PT = 210 * MM_TO_PT;
                                        const A4_H_PT = 297 * MM_TO_PT;

                                          // Dimensioni totali in cui il PDF disegnerà l'immagine
                                            const totalW_PT = config.targetWidthMm * MM_TO_PT;
                                              const totalH_PT = config.targetHeightMm * MM_TO_PT;

                                                const scaleX_mm = config.targetWidthMm / config.imageWidthPx;
                                                  const scaleY_mm = config.targetHeightMm / config.imageHeightPx;

                                                    // 2. Generazione delle Pagine
                                                      for (let i = 0; i < pages.length; i++) {
                                                          const p = pages[i];
                                                              const page = pdfDoc.addPage([A4_W_PT, A4_H_PT]);

                                                                  // Offset per centrare il taglio dentro il foglio A4
                                                                      const offsetX_PT = (A4_W_PT - (p.destWidthMm * MM_TO_PT)) / 2;
                                                                          const offsetY_PT = (A4_H_PT - (p.destHeightMm * MM_TO_PT)) / 2;

                                                                              const startX_mm = p.sourceX * scaleX_mm;
                                                                                  const startY_mm = p.sourceY * scaleY_mm;

                                                                                      // Calcoliamo lo spostamento per allineare il taglio (Y invertita nel PDF)
                                                                                          const drawX = offsetX_PT - (startX_mm * MM_TO_PT);
                                                                                              const topOfImageY = A4_H_PT - offsetY_PT + (startY_mm * MM_TO_PT);
                                                                                                  const drawY = topOfImageY - totalH_PT;

                                                                                                      page.drawImage(pdfImage, {
                                                                                                            x: drawX,
                                                                                                                  y: drawY,
                                                                                                                        width: totalW_PT,
                                                                                                                              height: totalH_PT,
                                                                                                                                  });

                                                                                                                                      // Stampa il numero identificativo
                                                                                                                                          page.drawText(`FOGLIO ${i + 1} - R${p.row + 1}:C${p.col + 1}`, {
                                                                                                                                                x: 10,
                                                                                                                                                      y: 10,
                                                                                                                                                            size: 10,
                                                                                                                                                                  font: font,
                                                                                                                                                                        color: rgb(0, 0, 0),
                                                                                                                                                                            });
                                                                                                                                                                              }

                                                                                                                                                                                return await pdfDoc.save();
                                                                                                                                                                                }
                                                                                                                                                                                