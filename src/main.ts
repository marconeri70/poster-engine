import { calculateGrid, type PosterConfig } from './GridCalculator';
import { generatePdf } from './PdfBuilder';

const imageInput = document.getElementById('imageInput') as HTMLInputElement;
const generateBtn = document.getElementById('generateBtn') as HTMLButtonElement;

generateBtn.addEventListener('click', async () => {
  const file = imageInput.files?.[0];
    
      if (!file) {
          alert("ERRORE: Devi prima caricare un'immagine.");
              return;
                }

                  const img = new Image();
                    const objectUrl = URL.createObjectURL(file);

                      img.onload = async () => {
                          const config: PosterConfig = {
                                imageWidthPx: img.width,
                                      imageHeightPx: img.height,
                                            targetWidthMm: Number((document.getElementById('targetWidth') as HTMLInputElement).value),
                                                  targetHeightMm: Number((document.getElementById('targetHeight') as HTMLInputElement).value),
                                                        overlapMm: Number((document.getElementById('overlap') as HTMLInputElement).value),
                                                              safeMarginMm: Number((document.getElementById('margin') as HTMLInputElement).value)
                                                                  };

                                                                      // 1. Calcola la matematica
                                                                          const grid = calculateGrid(config);
                                                                              
                                                                                  // UI Feedback
                                                                                      generateBtn.innerText = "GENERAZIONE PDF IN CORSO...";
                                                                                          generateBtn.style.background = "#555";
                                                                                              generateBtn.disabled = true;

                                                                                                  try {
                                                                                                        // 2. Costruisci il PDF
                                                                                                              const pdfBytes = await generatePdf(file, config, grid);
                                                                                                                    
                                                                                                                          // 3. Forza il download nel browser
                                                                                                                                const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
                                                                                                                                      const url = URL.createObjectURL(blob);
                                                                                                                                            const a = document.createElement('a');
                                                                                                                                                  a.href = url;
                                                                                                                                                        a.download = 'Mio_Poster_Suddiviso.pdf';
                                                                                                                                                              a.click();
                                                                                                                                                                    
                                                                                                                                                                          URL.revokeObjectURL(url);
                                                                                                                                                                              } catch (error) {
                                                                                                                                                                                    alert("Si è verificato un errore durante la creazione del PDF.");
                                                                                                                                                                                          console.error(error);
                                                                                                                                                                                              } finally {
                                                                                                                                                                                                    // Ripristina il bottone
                                                                                                                                                                                                          generateBtn.innerText = "CALCOLA MATRICE";
                                                                                                                                                                                                                generateBtn.style.background = "#000";
                                                                                                                                                                                                                      generateBtn.disabled = false;
                                                                                                                                                                                                                            URL.revokeObjectURL(objectUrl);
                                                                                                                                                                                                                                }
                                                                                                                                                                                                                                  };

                                                                                                                                                                                                                                    img.src = objectUrl;
                                                                                                                                                                                                                                    });
