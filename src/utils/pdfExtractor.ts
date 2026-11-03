import * as pdfjsLib from 'pdfjs-dist';
import { MenuItem, isHappyHourOrPromoItem } from '../types/saas.ts';

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
 * Extrai texto preservando a estrutura de linhas (eixo Y) e/ou imagens renderizadas de páginas de um arquivo PDF no navegador.
 * Isso evita o envio de arquivos brutos gigantescos via POST (eliminando HTTP 413) e melhora drasticamente a precisão da extração.
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

      // Agrupa fragmentos de texto pela coordenada Y (mesma linha visual no PDF)
      const rowsMap = new Map<number, Array<{ x: number; str: string }>>();
      for (const rawItem of textContent.items as any[]) {
        if (!('str' in rawItem) || !String(rawItem.str).trim()) continue;
        const transform = Array.isArray(rawItem.transform) ? rawItem.transform : [1, 0, 0, 1, 0, 0];
        const x = Number(transform[4]) || 0;
        const y = Math.round((Number(transform[5]) || 0) / 4) * 4; // tolerância de 4px para mesma linha
        if (!rowsMap.has(y)) {
          rowsMap.set(y, []);
        }
        rowsMap.get(y)!.push({ x, str: String(rawItem.str) });
      }

      // Ordena de cima para baixo (Y decrescente no PDF) e da esquerda para a direita (X crescente)
      const sortedYs = Array.from(rowsMap.keys()).sort((a, b) => b - a);
      const pageLines: string[] = [];
      for (const y of sortedYs) {
        const rowItems = rowsMap.get(y)!.sort((a, b) => a.x - b.x);
        const lineStr = rowItems
          .map((r) => r.str.trim())
          .filter(Boolean)
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();
        if (lineStr) {
          pageLines.push(lineStr);
        }
      }

      if (pageLines.length > 0) {
        fullText += `\n--- PÁGINA ${pageNum} ---\n` + pageLines.join('\n');
      }
    } catch (pageErr) {
      console.warn(`Erro ao extrair texto da página ${pageNum}:`, pageErr);
    }
  }

  const cleanText = fullText.trim();
  const hasText = cleanText.length > 40;

  // Se o PDF for escaneado (apenas imagens sem texto vetorial)
  const pageImages: string[] = [];
  if (!hasText && typeof document !== 'undefined') {
    for (let pageNum = 1; pageNum <= Math.min(pageCount, 8); pageNum++) {
      try {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1.4 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (context) {
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          await (page.render({ canvasContext: context, viewport, canvas } as any)).promise;
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

const KNOWN_CATEGORY_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\b(happy\s*hour|promoc|dose\s*dupla|em\s*dobro)\b/i, label: 'Happy Hour' },
  { pattern: /\b(combo|combos)\b/i, label: 'Combos' },
  { pattern: /\b(petisco|petiscos|porcao|porcoes|porções|entradas|aperitivo|para\s*compartilhar)\b/i, label: 'Petiscos' },
  { pattern: /\b(burger|burgers|hamburguer|sanduiche|sanduíches|lanche)\b/i, label: 'Burgers' },
  { pattern: /\b(chapa|carnes|brasa|parrilla|churrasco|grelhados|cortes)\b/i, label: 'Chapa & Carnes' },
  { pattern: /\b(pratos?\s*principa|executivo|almoço|jantar|massas|risoto|peixes|frutos\s*do\s*mar)\b/i, label: 'Pratos Principais' },
  { pattern: /\b(chopp|chope|cerveja|cervejas|long\s*neck)\b/i, label: 'Chopp & Cervejas' },
  { pattern: /\b(drink|drinks|coquetel|coqueteis|coquetelaria|caipirinha|gin|autoral|autorais)\b/i, label: 'Coquetelaria' },
  { pattern: /\b(sem\s*alcool|sem\s*álcool|refrigerante|suco|agua|água|energetico|energético|soft\s*drink)\b/i, label: 'Bebidas' },
  { pattern: /\b(vinho|vinhos|espumante|espumantes|adega|carta\s*de\s*vinhos)\b/i, label: 'Carta de Vinhos' },
  { pattern: /\b(whisky|whiskey|destilado|destilados|dose|doses|tequila|vodka|cachaca|cachaça|licor)\b/i, label: 'Destilados & Doses' },
  { pattern: /\b(sobremesa|sobremesas|doce|doces)\b/i, label: 'Sobremesas' },
];

/**
 * Extrator local inteligente de cardápio (Backup Instantâneo Zero-Erro caso os modelos da IA estejam sob alta demanda 503).
 */
export function parseMenuTextLocally(rawText: string): MenuItem[] {
  if (!rawText || !rawText.trim()) return [];

  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter((l) => l.length > 1 && !/^---\s*PÁGINA\s*\d+\s*---$/i.test(l));

  const items: MenuItem[] = [];
  const seenKey = new Set<string>();
  let currentCategory = 'Geral';
  let pendingCandidateName = '';

  const cleanItemName = (raw: string): string => {
    return raw
      .replace(/^[•·\-–—*0-9.)\s]+/, '')
      .replace(/[.\-_…]{2,}/g, ' ')
      .replace(/\bR\$\s*$/i, '')
      .replace(/\b(por|apenas|de)\s*$/i, '')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const isLikelyDescriptionOnly = (str: string): boolean => {
    const words = str.split(' ');
    if (words.length > 12) return true;
    if (/^(acompanha|servido\s+com|feita?\s+com|pao\s+brioche|ingredientes|opcoes|opções|consulte)/i.test(str)) {
      return true;
    }
    return false;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Verifica se a linha é um título de categoria (sem números de preço)
    const hasPriceNumber = /(?:R\$\s*)?\d{1,4}[,.]\d{2}\b/.test(line);
    if (!hasPriceNumber) {
      for (const catRule of KNOWN_CATEGORY_PATTERNS) {
        if (catRule.pattern.test(line) && line.length <= 45) {
          currentCategory = catRule.label;
          pendingCandidateName = '';
          break;
        }
      }
      // Se for uma linha curta que parece título de prato antes do preço na linha seguinte
      if (line.length >= 3 && line.length <= 60 && !isLikelyDescriptionOnly(line)) {
        pendingCandidateName = cleanItemName(line);
      }
      continue;
    }

    // Procura todos os preços monetários na linha (ex: "R$ 34,90" ou "34,90")
    const priceRegex = /(?:R\$\s*)?(\d{1,4})[,.](\d{2})\b/g;
    const matches = Array.from(line.matchAll(priceRegex));
    if (matches.length === 0) continue;

    // Caso "De R$ XX,XX Por R$ YY,YY" -> utiliza o último preço (preço promocional efetivo)
    const isDePor = /\bde\s+(?:R\$\s*)?\d+[,.]\d{2}\s+por\b/i.test(line);

    const firstMatchIndex = matches[0].index ?? 0;
    let rawPrefix = line.slice(0, firstMatchIndex).trim();
    rawPrefix = rawPrefix.replace(/\b(de|por|apenas|valor|preco|preço)\s*:?\s*$/i, '').trim();

    let baseName = cleanItemName(rawPrefix);
    if ((!baseName || baseName.length < 2 || isLikelyDescriptionOnly(baseName)) && pendingCandidateName) {
      baseName = pendingCandidateName;
    }

    if (!baseName || baseName.length < 2) continue;
    // Ignora linhas de rodapé/avisos (ex: "Taxa de serviço 10%", "Couvert artístico")
    if (/^(taxa\s+de|total|subtotal|troco|desconto|cnpj|telefone|whatsapp)/i.test(baseName)) {
      continue;
    }

    const effectiveMatches = isDePor ? [matches[matches.length - 1]] : matches;

    if (effectiveMatches.length === 1) {
      const m = effectiveMatches[0];
      const priceVal = parseFloat(`${m[1]}.${m[2]}`);
      if (priceVal > 0.5 && priceVal < 5000) {
        const finalName =
          currentCategory === 'Happy Hour' && !/happy\s*hour/i.test(baseName)
            ? `${baseName} (Happy Hour)`
            : baseName;
        const tempItem: MenuItem = {
          name: finalName,
          price: priceVal,
          cat: currentCategory,
        };
        tempItem.isPromo = isHappyHourOrPromoItem(tempItem);
        const key = `${tempItem.name.toLowerCase()}:${tempItem.price.toFixed(2)}`;
        if (!seenKey.has(key)) {
          seenKey.add(key);
          items.push(tempItem);
        }
        pendingCandidateName = '';
      }
    } else {
      // Múltiplos preços na mesma linha (ex: 300ml R$ 11,90 / 500ml R$ 16,90)
      effectiveMatches.forEach((m, idx) => {
        const priceVal = parseFloat(`${m[1]}.${m[2]}`);
        if (priceVal > 0.5 && priceVal < 5000) {
          const variantLabel = effectiveMatches.length > 1 ? ` (Opção ${idx + 1})` : '';
          const finalName = `${baseName}${variantLabel}`;
          const tempItem: MenuItem = {
            name: finalName,
            price: priceVal,
            cat: currentCategory,
          };
          tempItem.isPromo = isHappyHourOrPromoItem(tempItem);
          const key = `${tempItem.name.toLowerCase()}:${tempItem.price.toFixed(2)}`;
          if (!seenKey.has(key)) {
            seenKey.add(key);
            items.push(tempItem);
          }
        }
      });
      pendingCandidateName = '';
    }
  }

  return items;
}
