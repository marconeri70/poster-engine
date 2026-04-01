// src/GridCalculator.ts

export interface PosterConfig {
  imageWidthPx: number;
    imageHeightPx: number;
      targetWidthMm: number;
        targetHeightMm: number;
          overlapMm: number;
            safeMarginMm: number;   // Margine hardware (es. 5mm per lato)
            }

            export interface PageInstruction {
              row: number;
                col: number;
                  sourceX: number;       // Da dove iniziare a tagliare l'immagine (Pixel)
                    sourceY: number;
                      sourceWidth: number;   // Quanto tagliare (Pixel)
                        sourceHeight: number;
                          destWidthMm: number;   // Dimensioni di rendering sul foglio A4 (Millimetri)
                            destHeightMm: number;
                            }

                            export function calculateGrid(config: PosterConfig): PageInstruction[] {
                              const A4_WIDTH_MM = 210;
                                const A4_HEIGHT_MM = 297;

                                  // Sottraiamo i margini hardware in cui la stampante non arriva
                                    const printableW = A4_WIDTH_MM - (config.safeMarginMm * 2);
                                      const printableH = A4_HEIGHT_MM - (config.safeMarginMm * 2);

                                        // Calcoliamo lo spazio effettivo coperto per ogni nuovo foglio, al netto della sovrapposizione
                                          const stepW = printableW - config.overlapMm;
                                            const stepH = printableH - config.overlapMm;

                                              // Calcolo dei fattori di scala per la deformazione richiesta
                                                const scaleX = config.imageWidthPx / config.targetWidthMm;
                                                  const scaleY = config.imageHeightPx / config.targetHeightMm;

                                                    const pages: PageInstruction[] = [];
                                                      let currentY = 0;
                                                        let row = 0;

                                                          while (currentY < config.targetHeightMm) {
                                                              let currentX = 0;
                                                                  let col = 0;

                                                                      const segmentHeightMm = Math.min(printableH, config.targetHeightMm - currentY);

                                                                          while (currentX < config.targetWidthMm) {
                                                                                const segmentWidthMm = Math.min(printableW, config.targetWidthMm - currentX);

                                                                                      pages.push({
                                                                                              row,
                                                                                                      col,
                                                                                                              sourceX: currentX * scaleX,
                                                                                                                      sourceY: currentY * scaleY,
                                                                                                                              sourceWidth: segmentWidthMm * scaleX,
                                                                                                                                      sourceHeight: segmentHeightMm * scaleY,
                                                                                                                                              destWidthMm: segmentWidthMm,
                                                                                                                                                      destHeightMm: segmentHeightMm
                                                                                                                                                            });

                                                                                                                                                                  currentX += stepW;
                                                                                                                                                                        col++;
                                                                                                                                                                            }
                                                                                                                                                                                currentY += stepH;
                                                                                                                                                                                    row++;
                                                                                                                                                                                      }

                                                                                                                                                                                        return pages;
                                                                                                                                                                                        }
                                                                                                                                                                                        