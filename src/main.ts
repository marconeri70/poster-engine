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

let imgState = { x: 0, y: 0, scale: 0.5 };
let isDragging = false;
let isScaling = false;
let startX = 0, startY = 0;
let currentFile: File | null = null;

// Sincronizza Cornice e Griglia
function syncUI() {
    const wMm = Number(targetWidthInput.value);
    const hMm = Number(targetHeightInput.value);
    const scaleFactor = 0.5; // Scala visuale 1px = 2mm per far stare tutto a schermo

    posterFrame.style.width = `${wMm * scaleFactor}px`;
    posterFrame.style.height = `${hMm * scaleFactor}px`;

    const config: PosterConfig = {
        imageWidthPx: movableImage.naturalWidth,
        imageHeightPx: movableImage.naturalHeight,
        targetWidthMm: wMm,
        targetHeightMm: hMm,
        overlapMm: Number(overlapInput.value),
        safeMarginMm: 5
    };

    const grid = calculateGrid(config);
    const cols = Math.max(...grid.map(p => p.col)) + 1;
    gridOverlay.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    gridOverlay.innerHTML = '';
    grid.forEach((p, i) => {
        const line = document.createElement('div');
        line.className = 'grid-line';
        line.setAttribute('data-id', i + 1);
        gridOverlay.appendChild(line);
    });
}

// Manipolazione Immagine
movableImage.addEventListener('mousedown', (e) => { isDragging = true; startX = e.clientX - imgState.x; startY = e.clientY - imgState.y; e.preventDefault(); });
scaleHandle.addEventListener('mousedown', (e) => { isScaling = true; startX = e.clientX; startY = imgState.scale; e.preventDefault(); });

window.addEventListener('mousemove', (e) => {
    if (isDragging) {
        imgState.x = e.clientX - startX;
        imgState.y = e.clientY - startY;
    } else if (isScaling) {
        const delta = (e.clientX - startX) * 0.005;
        imgState.scale = Math.max(0.1, startY + delta);
    }
    if (isDragging || isScaling) {
        movableImage.style.transform = `translate(${imgState.x}px, ${imgState.y}px) scale(${imgState.scale})`;
    }
});

window.addEventListener('mouseup', () => { isDragging = false; isScaling = false; });

// Mobile Touch
movableImage.addEventListener('touchstart', (e) => { isDragging = true; startX = e.touches[0].clientX - imgState.x; startY = e.touches[0].clientY - imgState.y; });
scaleHandle.addEventListener('touchstart', (e) => { isScaling = true; startX = e.touches[0].clientX; startY = imgState.scale; });
window.addEventListener('touchmove', (e) => {
    if (isDragging) {
        imgState.x = e.touches[0].clientX - startX;
        imgState.y = e.touches[0].clientY - startY;
    } else if (isScaling) {
        const delta = (e.touches[0].clientX - startX) * 0.005;
        imgState.scale = Math.max(0.1, startY + delta);
    }
    if (isDragging || isScaling) {
        movableImage.style.transform = `translate(${imgState.x}px, ${imgState.y}px) scale(${imgState.scale})`;
    }
});

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

[targetWidthInput, targetHeightInput, overlapInput].forEach(i => i.addEventListener('input', syncUI));

generateBtn.addEventListener('click', async () => {
    if (!currentFile || !movableImage.src) return;
    generateBtn.disabled = true;
    generateBtn.innerText = "COSTRUZIONE...";
    
    const wMm = Number(targetWidthInput.value);
    const hMm = Number(targetHeightInput.value);
    const config = {
        imageWidthPx: movableImage.naturalWidth,
        imageHeightPx: movableImage.naturalHeight,
        targetWidthMm: wMm,
        targetHeightMm: hMm,
        overlapMm: Number(overlapInput.value),
        safeMarginMm: 5
    };

    const grid = calculateGrid(config);
    // Passiamo le trasformazioni (scale, x, y) convertite in mm per il PDF
    const pdfBytes = await generatePdf(currentFile, config, grid, {
        scale: imgState.scale * 2, // Riportiamo alla scala mm reale
        x: imgState.x * 2,
        y: imgState.y * 2
    });

    const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'Poster_Chirurgico.pdf'; a.click();
    
    generateBtn.disabled = false;
    generateBtn.innerText = "Costruisci & Scarica PDF";
});
