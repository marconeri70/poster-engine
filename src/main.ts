import { calculateGrid, type PosterConfig } from './GridCalculator';
import { generatePdf } from './PdfBuilder';

const imageInput = document.getElementById('imageInput') as HTMLInputElement;
const targetWidthInput = document.getElementById('targetWidth') as HTMLInputElement;
const targetHeightInput = document.getElementById('targetHeight') as HTMLInputElement;
const overlapInput = document.getElementById('overlap') as HTMLInputElement;
const generateBtn = document.getElementById('generateBtn') as HTMLButtonElement;
const posterFrame = document.getElementById('posterFrame') as HTMLDivElement;
const movableImage = document.getElementById('movableImage') as HTMLImageElement;
const gridOverlay = document.getElementById('gridOverlay') as HTMLDivElement;
const scaleHandle = document.getElementById('scaleHandle') as HTMLDivElement;

let imgState = { x: 0, y: 0, scale: 0.3 };
let isDragging = false;
let isScaling = false;
let startX = 0, startY = 0;
let startScale = 0;
let currentFile: File | null = null;
const VIEW_SCALE = 0.4; // 1mm = 0.4px per l'anteprima

function syncUI() {
    const wMm = Number(targetWidthInput.value);
    const hMm = Number(targetHeightInput.value);

    posterFrame.style.width = (wMm * VIEW_SCALE).toString() + "px";
    posterFrame.style.height = (hMm * VIEW_SCALE).toString() + "px";

    const config: PosterConfig = {
        imageWidthPx: movableImage.naturalWidth,
        imageHeightPx: movableImage.naturalHeight,
        targetWidthMm: wMm,
        targetHeightMm: hMm,
        overlapMm: Number(overlapInput.value),
        safeMarginMm: 5
    };

    const grid = calculateGrid(config);
    const cols = Math.max(...grid.map(g => g.col)) + 1;
    gridOverlay.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    gridOverlay.innerHTML = '';
    grid.forEach((_, i) => {
        const line = document.createElement('div');
        line.className = 'grid-line';
        line.setAttribute('data-id', (i + 1).toString());
        gridOverlay.appendChild(line);
    });
}

const updateTransform = () => {
    movableImage.style.transform = `translate(${imgState.x}px, ${imgState.y}px) scale(${imgState.scale})`;
};

// Eventi Mouse/Touch
const onStart = (e: MouseEvent | TouchEvent, type: 'drag' | 'scale') => {
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    if (type === 'drag') {
        isDragging = true;
        startX = clientX - imgState.x;
        startY = clientY - imgState.y;
    } else {
        isScaling = true;
        startX = clientX;
        startScale = imgState.scale;
    }
};

movableImage.addEventListener('mousedown', (e) => onStart(e, 'drag'));
movableImage.addEventListener('touchstart', (e) => onStart(e, 'drag'));
scaleHandle.addEventListener('mousedown', (e) => onStart(e, 'scale'));
scaleHandle.addEventListener('touchstart', (e) => onStart(e, 'scale'));

window.addEventListener('mousemove', (e) => {
    if (isDragging) {
        imgState.x = e.clientX - startX;
        imgState.y = e.clientY - startY;
    } else if (isScaling) {
        imgState.scale = Math.max(0.05, startScale + (e.clientX - startX) * 0.002);
    }
    if (isDragging || isScaling) updateTransform();
});

window.addEventListener('touchmove', (e) => {
    if (isDragging) {
        imgState.x = e.touches[0].clientX - startX;
        imgState.y = e.touches[0].clientY - startY;
    } else if (isScaling) {
        imgState.scale = Math.max(0.05, startScale + (e.touches[0].clientX - startX) * 0.002);
    }
    if (isDragging || isScaling) updateTransform();
});

window.addEventListener('mouseup', () => { isDragging = false; isScaling = false; });
window.addEventListener('touchend', () => { isDragging = false; isScaling = false; });

imageInput.addEventListener('change', (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    currentFile = file;
    const reader = new FileReader();
    reader.onload = (ev) => {
        movableImage.src = ev.target?.result as string;
        movableImage.style.display = 'block';
        scaleHandle.style.display = 'block';
        movableImage.onload = syncUI;
    };
    reader.readAsDataURL(file);
});

[targetWidthInput, targetHeightInput, overlapInput].forEach(el => el.addEventListener('input', syncUI));

generateBtn.addEventListener('click', async () => {
    if (!currentFile || !movableImage.src) return;
    generateBtn.disabled = true;
    generateBtn.innerText = "COSTRUZIONE PDF...";
    
    const config: PosterConfig = {
        imageWidthPx: movableImage.naturalWidth,
        imageHeightPx: movableImage.naturalHeight,
        targetWidthMm: Number(targetWidthInput.value),
        targetHeightMm: Number(targetHeightInput.value),
        overlapMm: Number(overlapInput.value),
        safeMarginMm: 5
    };

    const grid = calculateGrid(config);
    const pdfBytes = await generatePdf(currentFile, config, grid, { ...imgState, viewScale: VIEW_SCALE });

    const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Poster_Ritagliato.pdf';
    a.click();
    
    generateBtn.disabled = false;
    generateBtn.innerText = "Scarica PDF Ritagliato";
});
