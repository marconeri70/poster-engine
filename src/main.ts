import { calculateGrid, type PosterConfig } from './GridCalculator';
import { generatePdf } from './PdfBuilder';

const imageInput = document.getElementById('imageInput') as HTMLInputElement;
const targetWidthInput = document.getElementById('targetWidth') as HTMLInputElement;
const targetHeightInput = document.getElementById('targetHeight') as HTMLInputElement;
const overlapInput = document.getElementById('overlap') as HTMLInputElement;
const generateBtn = document.getElementById('generateBtn') as HTMLButtonElement;
const previewContainer = document.getElementById('previewContainer') as HTMLDivElement;
const resizeHandle = document.getElementById('resizeHandle') as HTMLDivElement;
const wrapper = document.getElementById('interactWrapper') as HTMLDivElement;

let currentImage: HTMLImageElement | null = null;
let currentFile: File | null = null;
let isDragging = false;

function updatePreview() {
    if (!currentImage) return;

    const config: PosterConfig = {
        imageWidthPx: currentImage.width,
        imageHeightPx: currentImage.height,
        targetWidthMm: Number(targetWidthInput.value),
        targetHeightMm: Number(targetHeightInput.value),
        overlapMm: Number(overlapInput.value),
        safeMarginMm: 5
    };

    const grid = calculateGrid(config);
    renderGridPreview(currentImage, config, grid);
}

function renderGridPreview(img: HTMLImageElement, config: PosterConfig, grid: any[]) {
    previewContainer.innerHTML = '';
    const cols = Math.max(...grid.map(p => p.col)) + 1;
    previewContainer.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    
    // Scala fissa per l'anteprima (1px = 1mm per comodità di calcolo nel wrapper)
    const scale = 0.5; 

    grid.forEach(p => {
        const tile = document.createElement('div');
        tile.className = 'preview-tile';
        tile.style.width = `${p.destWidthMm * scale}px`;
        tile.style.height = `${p.destHeightMm * scale}px`;
        tile.style.backgroundImage = `url(${img.src})`;
        
        const bgSizeX = (config.targetWidthMm / p.destWidthMm) * 100;
        const bgSizeY = (config.targetHeightMm / p.destHeightMm) * 100;
        const percX = (p.sourceX / (config.imageWidthPx - p.sourceWidth)) * 100 || 0;
        const percY = (p.sourceY / (config.imageHeightPx - p.sourceHeight)) * 100 || 0;

        tile.style.backgroundSize = `${bgSizeX}% ${bgSizeY}%`;
        tile.style.backgroundPosition = `${percX}% ${percY}%`;
        tile.setAttribute('data-coord', `${p.row + 1}:${p.col + 1}`);
        previewContainer.appendChild(tile);
    });
}

// GESTIONE RESIZE INTERATTIVO
const startResize = (e: MouseEvent | TouchEvent) => {
    if (!currentImage) return;
    isDragging = true;
    wrapper.classList.add('active');
    e.preventDefault();
};

const doResize = (e: MouseEvent | TouchEvent) => {
    if (!isDragging) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    const rect = previewContainer.getBoundingClientRect();
    const newWidthMm = Math.round((clientX - rect.left) * 2); // Invertiamo la scala 0.5
    const newHeightMm = Math.round((clientY - rect.top) * 2);

    if (newWidthMm > 100) targetWidthInput.value = newWidthMm.toString();
    if (newHeightMm > 100) targetHeightInput.value = newHeightMm.toString();
    
    updatePreview();
};

const stopResize = () => {
    isDragging = false;
    wrapper.classList.remove('active');
};

resizeHandle.addEventListener('mousedown', startResize);
resizeHandle.addEventListener('touchstart', startResize);
window.addEventListener('mousemove', doResize);
window.addEventListener('touchmove', doResize);
window.addEventListener('mouseup', stopResize);
window.addEventListener('touchend', stopResize);

// LISTENERS STANDARD
imageInput.addEventListener('change', (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    currentFile = file;
    const reader = new FileReader();
    reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => { currentImage = img; updatePreview(); };
        img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
});

[targetWidthInput, targetHeightInput, overlapInput].forEach(input => {
    input.addEventListener('input', updatePreview);
});

generateBtn.addEventListener('click', async () => {
    if (!currentFile || !currentImage) return;
    const config = {
        imageWidthPx: currentImage.width,
        imageHeightPx: currentImage.height,
        targetWidthMm: Number(targetWidthInput.value),
        targetHeightMm: Number(targetHeightInput.value),
        overlapMm: Number(overlapInput.value),
        safeMarginMm: 5
    };
    const grid = calculateGrid(config);
    generateBtn.innerText = "COSTRUZIONE PDF...";
    const pdfBytes = await generatePdf(currentFile, config, grid);
    const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Poster_Pro_${config.targetWidthMm}mm.pdf`;
    a.click();
    generateBtn.innerText = "Scarica PDF per Stampa";
});
