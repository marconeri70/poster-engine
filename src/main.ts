import { calculateGrid, type PosterConfig } from './GridCalculator';
import { generatePdf } from './PdfBuilder';

const imageInput = document.getElementById('imageInput') as HTMLInputElement;
const targetWidthInput = document.getElementById('targetWidth') as HTMLInputElement;
const targetHeightInput = document.getElementById('targetHeight') as HTMLInputElement;
const overlapInput = document.getElementById('overlap') as HTMLInputElement;
const zoomBoard = document.getElementById('zoomBoard') as HTMLInputElement;
const generateBtn = document.getElementById('generateBtn') as HTMLButtonElement;
const posterFrame = document.getElementById('posterFrame') as HTMLDivElement;
const drawingBoard = document.getElementById('drawingBoard') as HTMLDivElement;
const imageWrapper = document.getElementById('imageWrapper') as HTMLDivElement;
const movableImage = document.getElementById('movableImage') as HTMLImageElement;
const gridOverlay = document.getElementById('gridOverlay') as HTMLDivElement;

let mmState = { x: 0, y: 0, w: 1000, h: 1000 };
let isInteracting = false;
let currentHandle: string | null = null;
let start = { mx: 0, my: 0, ix: 0, iy: 0, iw: 0, ih: 0 };
let currentFile: File | null = null;
const MM_TO_PX = 1; 

function syncUI() {
    const wMm = Number(targetWidthInput.value);
    const hMm = Number(targetHeightInput.value);
    
    posterFrame.style.width = `${wMm * MM_TO_PX}px`;
    posterFrame.style.height = `${hMm * MM_TO_PX}px`;

    const config: PosterConfig = {
        imageWidthPx: movableImage.naturalWidth || 100,
        imageHeightPx: movableImage.naturalHeight || 100,
        targetWidthMm: wMm, targetHeightMm: hMm,
        overlapMm: Number(overlapInput.value), safeMarginMm: 5
    };

    const grid = calculateGrid(config);
    gridOverlay.style.gridTemplateColumns = `repeat(${Math.max(...grid.map(g => g.col)) + 1}, 1fr)`;
    gridOverlay.innerHTML = '';
    grid.forEach(() => {
        const line = document.createElement('div');
        line.className = 'grid-line';
        gridOverlay.appendChild(line);
    });
    updateVisuals();
}

function updateVisuals() {
    drawingBoard.style.transform = `scale(${zoomBoard.value})`;
    imageWrapper.style.left = `${mmState.x * MM_TO_PX}px`;
    imageWrapper.style.top = `${mmState.y * MM_TO_PX}px`;
    imageWrapper.style.width = `${mmState.w * MM_TO_PX}px`;
    imageWrapper.style.height = `${mmState.h * MM_TO_PX}px`;
}

const onStart = (e: MouseEvent | TouchEvent) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const target = e.target as HTMLElement;
    
    isInteracting = true;
    currentHandle = target.getAttribute('data-h');
    start = { mx: clientX, my: clientY, ix: mmState.x, iy: mmState.y, iw: mmState.w, ih: mmState.h };
    e.stopPropagation();
};

const onMove = (e: MouseEvent | TouchEvent) => {
    if (!isInteracting) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const bZoom = Number(zoomBoard.value);
    const dx = (clientX - start.mx) / bZoom;
    const dy = (clientY - start.my) / bZoom;

    if (!currentHandle) {
        mmState.x = start.ix + dx;
        mmState.y = start.iy + dy;
    } else {
        if (currentHandle.includes('r')) mmState.w = Math.max(10, start.iw + dx);
        if (currentHandle.includes('l')) { mmState.w = Math.max(10, start.iw - dx); mmState.x = start.ix + dx; }
        if (currentHandle.includes('b')) mmState.h = Math.max(10, start.ih + dy);
        if (currentHandle.includes('t')) { mmState.h = Math.max(10, start.ih - dy); mmState.y = start.iy + dy; }
    }
    updateVisuals();
};

imageWrapper.addEventListener('mousedown', onStart);
imageWrapper.addEventListener('touchstart', onStart, {passive: false});
window.addEventListener('mousemove', onMove);
window.addEventListener('touchmove', onMove, {passive: false});
window.addEventListener('mouseup', () => isInteracting = false);
window.addEventListener('touchend', () => isInteracting = false);

zoomBoard.addEventListener('input', updateVisuals);

imageInput.addEventListener('change', (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    currentFile = file;
    const reader = new FileReader();
    reader.onload = (ev) => {
        movableImage.src = String(ev.target?.result);
        imageWrapper.style.display = 'block';
        movableImage.onload = () => {
            mmState = { x: 0, y: 0, w: Number(targetWidthInput.value), h: Number(targetHeightInput.value) };
            syncUI();
        };
    };
    reader.readAsDataURL(file);
});

[targetWidthInput, targetHeightInput, overlapInput].forEach(el => el.addEventListener('input', syncUI));

generateBtn.addEventListener('click', async () => {
    if (!currentFile || !movableImage.src) return;
    generateBtn.disabled = true;
    generateBtn.innerText = "ESPORTAZIONE...";
    const config = {
        imageWidthPx: movableImage.naturalWidth, imageHeightPx: movableImage.naturalHeight,
        targetWidthMm: Number(targetWidthInput.value), targetHeightMm: Number(targetHeightInput.value),
        overlapMm: Number(overlapInput.value), safeMarginMm: 5
    };
    const grid = calculateGrid(config);
    const pdfBytes = await generatePdf(currentFile, config, grid, mmState);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([pdfBytes as any], { type: 'application/pdf' }));
    a.download = 'Poster_Elite_v6.pdf';
    a.click();
    generateBtn.disabled = false;
    generateBtn.innerText = "Esporta PDF Finale";
});
