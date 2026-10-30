import * as pdfjsLib from 'pdfjs-dist';

// Configura o worker do PDF.js usando CDN para evitar problemas de bundling com Vite
if (typeof window !== 'undefined') {
  try {
    const workerVersion = (pdfjsLib as any).version || '4.10.38';
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${workerVersion}/pdf.worker.min.mjs`;
  } catch (e) {
    console.warn('Erro ao configurar worker do PDF.js:', e);
  }
}

export interface ExtractedPdfContent {
  text: string;
  pageCount: number;
  hasText: boolean;
  pageImages?: string[];
}

/**
 * Extrai texto e/ou imagens renderizadas de páginas de um arquivo PDF no próprio navegador.
 * Isso evita o envio de arquivos brutos gigantescos de dezenas de megabytes via POST,
 * eliminando permanentemente o erro HTTP 413 (Payload Too Large).
 */
export async function extractPdfContent(fileOrBuffer: File | ArrayBuffer): Promise<ExtractedPdfContent> {
  const arrayBuffer = fileOrBuffer instanceof File ? await fileOrBuffer.arrayBuffer() : fileOrBuffer;
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
  const pdf = await loadingTask.promise;
  const pageCount = pdf.numPages;

  let fullText = '';
  for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
    try {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => ('str' in item ? item.str : ''))
        .join(' ');
      if (pageText.trim()) {
        fullText += `\n--- PÁGINA ${pageNum} ---\n` + pageText;
      }
    } catch (pageErr) {
      console.warn(`Erro ao extrair texto da página ${pageNum}:`, pageErr);
    }
  }

  const cleanText = fullText.trim();
  const hasText = cleanText.length > 50;

  // Se o PDF for escaneado (apenas imagens de papel fotografado sem texto vetorial)
  const pageImages: string[] = [];
  if (!hasText && typeof document !== 'undefined') {
    for (let pageNum = 1; pageNum <= Math.min(pageCount, 8); pageNum++) {
      try {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (context) {
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          await (page.render({ canvasContext: context, viewport, canvas } as any)).promise;
          // Comprime para JPEG com 75% de qualidade (gera fotos leves de ~150kb)
          const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.75);
          const base64 = jpegDataUrl.split(',')[1];
          if (base64) {
            pageImages.push(base64);
          }
        }
      } catch (renderErr) {
        console.warn(`Erro ao renderizar página ${pageNum} para imagem:`, renderErr);
      }
    }
  }

  return {
    text: cleanText,
    pageCount,
    hasText,
    pageImages: pageImages.length > 0 ? pageImages : undefined,
  };
}
