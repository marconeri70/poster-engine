export interface PosterConfig {
  imageWidthPx: number;
  imageHeightPx: number;
  targetWidthMm: number;
  targetHeightMm: number;
  overlapMm: number;
  safeMarginMm: number;
}

export interface PageInstruction {
  row: number;
  col: number;
  sourceX: number;
  sourceY: number;
  sourceWidth: number;
  sourceHeight: number;
  destWidthMm: number;
  destHeightMm: number;
}

export function calculateGrid(config: PosterConfig): PageInstruction[] {
  const A4_W = 210 - (config.safeMarginMm * 2);
  const A4_H = 297 - (config.safeMarginMm * 2);
  const pages: PageInstruction[] = [];

  const scaleX = config.targetWidthMm / config.imageWidthPx;
  const scaleY = config.targetHeightMm / config.imageHeightPx;

  let currentY = 0;
  let row = 0;
  while (currentY < config.targetHeightMm) {
    let currentX = 0;
    let col = 0;
    const stepH = (currentY === 0) ? A4_H : A4_H - config.overlapMm;
    const actualH = Math.min(stepH, config.targetHeightMm - currentY);

    while (currentX < config.targetWidthMm) {
      const stepW = (currentX === 0) ? A4_W : A4_W - config.overlapMm;
      const actualW = Math.min(stepW, config.targetWidthMm - currentX);

      pages.push({
        row, col,
        sourceX: currentX / scaleX,
        sourceY: currentY / scaleY,
        sourceWidth: actualW / scaleX,
        sourceHeight: actualH / scaleY,
        destWidthMm: actualW,
        destHeightMm: actualH
      });
      currentX += stepW;
      col++;
    }
    currentY += stepH;
    row++;
  }
  return pages;
}
