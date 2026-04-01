// src/main.ts
import { calculateGrid, type PosterConfig } from './GridCalculator';
import { generatePdf } from './PdfBuilder';

// Referenze UI
const imageInput = document.getElementById('imageInput') as HTMLInputElement;
const targetWidthInput = document.getElementById('targetWidth') as HTMLInputElement;
const targetHeightInput = document.getElementById('targetHeight') as HTMLInputElement;
const overlapInput = document.getElementById('overlap') as HTMLInputElement;
const generateBtn = document.getElementById('generateBtn') as HTMLButtonElement;
const previewContainer = document.getElementById('previewContainer') as HTMLDivElement;

let currentImage: HTMLImageElement | null = null;
let currentFile: File | null = null;

// Funzione Core per aggiornare l'anteprima visiva
function updatePreview() {
    if (!currentImage) return;

    const config: PosterConfig = {
        imageWidthPx: currentImage.width,
        imageHeightPx: currentImage.height,
        targetWidthMm: Number(targetWidthInput.value),
        targetHeightMm: Number(targetHeightInput.value),
        overlapMm: Number(overlapInput.value),
        safeMarginMm: 5 // Fisso a 5mm per lo standard di stampa
    };

    const grid = calculateGrid(config);
    renderGridPreview(currentImage, config, grid);
}

function renderGridPreview(img: HTMLImageElement, config: PosterConfig, grid: any[]) {
    previewContainer.innerHTML = '';
    
    const cols = Math.max(...grid.map(p => p.col)) + 1;

    // Impostiamo la griglia CSS
    previewContainer.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    
    // Calcoliamo una scala per far stare l'anteprima nello schermo (max 200px a foglio)
    const previewScale = Math.min(200 / (config.targetWidthMm / cols), 1);

    grid.forEach(p => {
        const tile = document.createElement('div');
        tile.className = 'preview-tile';
        
        // Dimensioni proporzionali in anteprima
        tile.style.width = `${p.destWidthMm * previewScale}px`;
        tile.style.height = `${p.destHeightMm * previewScale}px`;
        
        tile.style.backgroundImage = `url(${img.src})`;
        
        // Calcolo della posizione del background per mostrare solo la porzione corretta
        // Usiamo le percentuali per garantire la compatibilità con il ridimensionamento
        const bgSizeX = (config.targetWidthMm / p.destWidthMm) * 100;
        const bgSizeY = (config.targetHeightMm / p.destHeightMm) * 100;
        
        const percX = (p.sourceX / (config.imageWidthPx - p.sourceWidth)) * 100 || 0;
        const percY = (p.sourceY / (config.imageHeightPx - p.sourceHeight)) * 100 || 0;

        tile.style.backgroundSize = `${bgSizeX}% ${bgSizeY}%`;
        tile.style.backgroundPosition = `${percX}% ${percY}%`;
        
        // Label con coordinate riga:colonna
        tile.setAttribute('data-coord', `${p.row + 1}:${p.col + 1}`);
        
        previewContainer.appendChild(tile);
    });
}

// Event Listeners per Reattività Immediata
imageInput.addEventListener('change', (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    
    currentFile = file;
    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
            currentImage = img;
            updatePreview();
        };
        img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
});

[targetWidthInput, targetHeightInput, overlapInput].forEach(input => {
    input.addEventListener('input', () => {
        if (currentImage) updatePreview();
    });
});

// Generazione Finale PDF
generateBtn.addEventListener('click', async () => {
    if (!currentFile || !currentImage) {
        alert("Carica prima un'immagine!");
        return;
    }

    const config: PosterConfig = {
        imageWidthPx: currentImage.width,
        imageHeightPx: currentImage.height,
        targetWidthMm: Number(targetWidthInput.value),
        targetHeightMm: Number(targetHeightInput.value),
        overlapMm: Number(overlapInput.value),
        safeMarginMm: 5
    };

    const grid = calculateGrid(config);
    
    generateBtn.innerText = "GENERAZIONE VETTORIALE...";
    generateBtn.disabled = true;

    try {
        const pdfBytes = await generatePdf(currentFile, config, grid);
        const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Poster_${config.targetWidthMm}x${config.targetHeightMm}mm.pdf`;
        a.click();
        URL.revokeObjectURL(url);
    } catch (err) {
        console.error(err);
        alert("Errore durante la generazione.");
    } finally {
        generateBtn.innerText = "Build & Download PDF";
        generateBtn.disabled = false;
    }
});
