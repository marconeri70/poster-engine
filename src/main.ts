import { calculateGrid, type PosterConfig } from './GridCalculator';
import { generatePdf } from './PdfBuilder';

const imageInput = document.getElementById('imageInput') as HTMLInputElement;
const generateBtn = document.getElementById('generateBtn') as HTMLButtonElement;
const previewContainer = document.getElementById('previewContainer') as HTMLDivElement;

function updatePreview(img: HTMLImageElement, config: PosterConfig, grid: any[]) {
    previewContainer.innerHTML = '';
    const cols = Math.max(...grid.map(p => p.col)) + 1;
    const rows = Math.max(...grid.map(p => p.row)) + 1;

    previewContainer.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    
    grid.forEach(p => {
        const tile = document.createElement('div');
        tile.className = 'preview-tile';
        tile.style.width = `${p.destWidthMm / 2}px`; // Scala ridotta per anteprima
        tile.style.height = `${p.destHeightMm / 2}px`;
        tile.style.backgroundImage = `url(${img.src})`;
        
        // Calcolo posizione background per simulare il taglio
        const bgSizeX = (config.targetWidthMm / p.destWidthMm) * 100;
        const bgSizeY = (config.targetHeightMm / p.destHeightMm) * 100;
        const bgPosX = (p.sourceX / (config.imageWidthPx - p.sourceWidth)) * 100 || 0;
        const bgPosY = (p.sourceY / (config.imageHeightPx - p.sourceHeight)) * 100 || 0;

        tile.style.backgroundSize = `${bgSizeX}% ${bgSizeY}%`;
        tile.style.backgroundPosition = `${bgPosX}% ${bgPosY}%`;
        tile.setAttribute('data-coord', `${p.row+1}:${p.col+1}`);
        previewContainer.appendChild(tile);
    });
}

// ... aggancia l'evento change di imageInput per chiamare updatePreview
