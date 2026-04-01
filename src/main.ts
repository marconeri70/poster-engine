import { calculateGrid, type PosterConfig } from './GridCalculator';
import { generatePdf } from './PdfBuilder';

const imageInput = document.getElementById('imageInput') as HTMLInputElement;
const targetWidthInput = document.getElementById('targetWidth') as HTMLInputElement;
const targetHeightInput = document.getElementById('targetHeight') as HTMLInputElement;
const overlapInput = document.getElementById('overlap') as HTMLInputElement;
const generateBtn = document.getElementById('generateBtn') as HTMLButtonElement;
const posterFrame = document.getElementById('posterFrame') as HTMLDivElement;
const imageWrapper = document.getElementById('imageWrapper') as HTMLDivElement;
const movableImage = document.getElementById('movableImage') as HTMLImageElement;
const gridOverlay = document.getElementById('gridOverlay') as HTMLDivElement;

let mmState = { x: 0, y: 0, width: 0, height: 0 }; // Dimensioni reali in millimetri
let isInteracting = false;
let currentHandle: string | null = null;
let startPos = { mx: 0, my: 0, ix: 0, iy: 0, iw: 0, ih: 0 }; // Memoria dello stato iniziale al tocco
let currentFile: File | null = null;
const VIEW_SCALE = 0.5; // Scala visuale 1px = 2mm per far stare tutto a schermo

// Sincronizza Cornice e Griglia Fissa (Basata sulle misure pareti inserite)
function syncFrameAndGrid() {
    const wMm = Number(targetWidthInput.value);
    const hMm = Number(targetHeightInput.value);

    posterFrame.style.width = `${wMm * VIEW_SCALE}px`;
    posterFrame.style.height = `${hMm * VIEW_SCALE}px`;

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
    grid.forEach((_, i) => {
        const line = document.createElement('div');
        line.className = 'grid-line';
        line.setAttribute('data-id', i + 1);
        gridOverlay.appendChild(line);
    });
}

// Aggiorna l'anteprima visiva distorta dell'immagine
function updateImagePreview() {
    imageWrapper.style.transform = `translate(${mmState.x * VIEW_SCALE}px, ${mmState.y * VIEW_SCALE}px)`;
    imageWrapper.style.width = `${mmState.width * VIEW_SCALE}px`;
    imageWrapper.style.height = `${mmState.height * VIEW_SCALE}px`;
}

// GESTIONE MANIPOLAZIONE VETTORIALE (Distorzione Non-Proporzionale)
const startInteraction = (e: MouseEvent | TouchEvent) => {
    const target = e.target as HTMLElement;
    isInteracting = true;
    currentHandle = target.getAttribute('data-handle'); // TL, TM, TR, ML, MR, BL, BM, BR o null (immagine)

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    startPos = {
        mx: clientX, my: clientY, // Mouse
        ix: mmState.x, iy: mmState.y, // Immagine mm
        iw: mmState.width, ih: mmState.height // Immagine mm
    };
    e.preventDefault();
};

const doInteraction = (e: MouseEvent | TouchEvent) => {
    if (!isInteracting || !movableImage.src) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    // Delta dello spostamento in mm reali (dividiamo per VIEW_SCALE)
    const dXmm = (clientX - startPos.mx) / VIEW_SCALE;
    const dYmm = (clientY - startPos.my) / VIEW_SCALE;

    // LOGICA DI DISTORSIONE CHIRURGICA (NON PROPORZIONALE)
    if (!currentHandle) {
        // TRASCINAMENTO (Spostamento X,Y)
        mmState.x = startPos.ix + dXmm;
        mmState.y = startPos.iy + dYmm;
    } else {
        // RESIZE / DISTORSIONE
        const h = currentHandle;
        
        // Asse Orizzontale (width, x)
        if (h.includes('r')) mmState.width = Math.max(10, startPos.iw + dXmm); // Trascina lato destro
        if (h.includes('l')) { // Trascina lato sinistro
            mmState.width = Math.max(10, startPos.iw - dXmm);
            mmState.x = startPos.ix + dXmm; // Sposta X per tenere fermo l'altro lato
        }

        // Asse Verticale (height, y)
        if (h.includes('b')) mmState.height = Math.max(10, startPos.ih + dYmm); // Trascina lato basso
        if (h.includes('t')) { // Trascina lato alto
            mmState.height = Math.max(10, startPos.ih - dYmm);
            mmState.y = startPos.iy + dYmm; // Sposta Y per tenere fermo l'altro lato
        }
    }
    updateImagePreview();
};

const stopInteraction = () => { isInteracting = false; currentHandle = null; };

// Aggancio eventi
imageWrapper.addEventListener('mousedown', startInteraction);
imageWrapper.addEventListener('touchstart', startInteraction);
window.addEventListener('mousemove', doInteraction);
window.addEventListener('touchmove', doInteraction);
window.addEventListener('mouseup', stopInteraction);
window.addEventListener('touchend', stopInteraction);

// LISTENERS STANDARD (UI input)
imageInput.addEventListener('change', (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    currentFile = file;
    const reader = new FileReader();
    reader.onload = (ev) => {
        movableImage.src = ev.target?.result as string;
        imageWrapper.style.display = 'block';
        movableImage.onload = () => {
            syncFrameAndGrid();
            // Inizializza l'immagine che copre l'intera cornice
            mmState = { x: 0, y: 0, width: Number(targetWidthInput.value), height: Number(targetHeightInput.value) };
            updateImagePreview();
        };
    };
    reader.readAsDataURL(file);
});

[targetWidthInput, targetHeightInput, overlapInput].forEach(el => el.addEventListener('input', () => {
    syncFrameAndGrid();
    if (movableImage.src) updateImagePreview();
}));

// GENERAZIONE PDF CHIRURGICA
generateBtn.addEventListener('click', async () => {
    if (!currentFile || !movableImage.src) return;
    generateBtn.disabled = true;
    generateBtn.innerText = "CHIRURGIA IN CORSO...";
    
    const config = {
        imageWidthPx: movableImage.naturalWidth,
        imageHeightPx: movableImage.naturalHeight,
        targetWidthMm: Number(targetWidthInput.value),
        targetHeightMm: Number(targetHeightInput.value),
        overlapMm: Number(overlapInput.value),
        safeMarginMm: 5
    };

    const grid = calculateGrid(config);
    
    // Passiamo le misure millimetriche distorte esatte
    const pdfBytes = await generatePdf(currentFile, config, grid, {
        mmX: mmState.x,
        mmY: mmState.y,
        mmWidth: mmState.width,
        mmHeight: mmState.height
    });

    const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Poster_Distorto_${mmState.width.toFixed(0)}x${mmState.height.toFixed(0)}mm.pdf`;
    a.click();
    
    generateBtn.disabled = false;
    generateBtn.innerText = "Scarica PDF Distorto";
});
