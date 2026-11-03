import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

// Garantir que rotas de API nunca retornem HTML em caso de erro de payload
app.use('/api', (err: any, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err) {
    console.error('Erro de API no Express:', err.message);
    return res.status(err.status || 500).json({
      error:
        err.type === 'entity.too.large'
          ? 'O arquivo enviado é muito grande (limite de 100MB).'
          : err.message || 'Erro no processamento da requisição.',
    });
  }
  next();
});

// Cascata automática multi-modelo para blindar contra picos de demanda (503 UNAVAILABLE / 429 RESOURCE_EXHAUSTED)
const GEMINI_MODEL_CASCADE = [
  'gemini-3.8-flash',
  'gemini-3.1-flash-lite',
  'gemini-flash-latest',
];

async function callGeminiWithFallback(ai: GoogleGenAI, params: any) {
  const preferredModel = params.model || 'gemini-3.8-flash';
  const modelsToTry = [
    preferredModel,
    ...GEMINI_MODEL_CASCADE.filter((m) => m !== preferredModel),
  ];

  let lastError: any = null;

  // Duas rodadas completas pela cascata de modelos caso haja oscilação momentânea
  for (let round = 1; round <= 2; round++) {
    for (let i = 0; i < modelsToTry.length; i++) {
      const candidateModel = modelsToTry[i];
      try {
        const clonedConfig = params.config ? { ...params.config } : undefined;
        // Modelos lite/alternativos podem não suportar thinkingConfig; se não for o 3.8-flash na 2ª tentativa, garante compatibilidade máxima
        if (candidateModel !== 'gemini-3.8-flash' && clonedConfig?.thinkingConfig) {
          delete clonedConfig.thinkingConfig;
        }
        return await ai.models.generateContent({
          ...params,
          model: candidateModel,
          ...(clonedConfig ? { config: clonedConfig } : {}),
        });
      } catch (err: any) {
        lastError = err;
        const msg = String(err?.message || '');
        const isTransientOrOverload =
          msg.includes('503') ||
          msg.includes('429') ||
          msg.includes('500') ||
          msg.includes('502') ||
          msg.includes('504') ||
          msg.toLowerCase().includes('high demand') ||
          msg.toLowerCase().includes('overloaded') ||
          msg.includes('UNAVAILABLE') ||
          msg.includes('RESOURCE_EXHAUSTED') ||
          msg.includes('thinking');

        if (isTransientOrOverload) {
          console.warn(
            `[Cascata IA] Modelo ${candidateModel} sob alta demanda/indisponível (rodada ${round}). Alternando automaticamente para o próximo modelo...`
          );
          await new Promise((r) => setTimeout(r, 350));
          continue;
        }
        throw err;
      }
    }
    await new Promise((r) => setTimeout(r, 800));
  }
  throw lastError;
}

const MENU_ITEMS_SCHEMA = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING, description: 'Nome limpo do produto ou prato.' },
      price: { type: Type.NUMBER, description: 'Preço numérico em reais (ex: 34.90).' },
      cat: { type: Type.STRING, description: 'Categoria em português.' },
      isPromo: { type: Type.BOOLEAN, description: 'True se for Happy Hour, promocional ou combo com restrição.' },
    },
    required: ['name', 'price', 'cat'],
  },
};

function parseMenuTextServerFallback(rawText: string) {
  if (!rawText || !rawText.trim()) return [];
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter((l) => l.length > 1 && !/^---\s*PÁGINA\s*\d+\s*---$/i.test(l));

  const items: Array<{ name: string; price: number; cat: string; isPromo: boolean }> = [];
  const seen = new Set<string>();
  let currentCategory = 'Geral';
  let pendingName = '';

  for (const line of lines) {
    const hasPrice = /(?:R\$\s*)?\d{1,4}[,.]\d{2}\b/.test(line);
    if (!hasPrice) {
      if (/\b(happy\s*hour|promoc)/i.test(line) && line.length <= 45) currentCategory = 'Happy Hour';
      else if (/\b(petisco|porcao|porções|entradas)/i.test(line) && line.length <= 45) currentCategory = 'Petiscos';
      else if (/\b(burger|sanduiche|lanche)/i.test(line) && line.length <= 45) currentCategory = 'Burgers';
      else if (/\b(chapa|carnes|brasa|parrilla)/i.test(line) && line.length <= 45) currentCategory = 'Chapa & Carnes';
      else if (/\b(pratos?\s*principa|executivo|massas|risoto)/i.test(line) && line.length <= 45) currentCategory = 'Pratos Principais';
      else if (/\b(chopp|cerveja)/i.test(line) && line.length <= 45) currentCategory = 'Chopp & Cervejas';
      else if (/\b(drink|coquetel|caipirinha|gin)/i.test(line) && line.length <= 45) currentCategory = 'Coquetelaria';
      else if (/\b(vinho|espumante)/i.test(line) && line.length <= 45) currentCategory = 'Carta de Vinhos';
      else if (/\b(sobremesa|doce)/i.test(line) && line.length <= 45) currentCategory = 'Sobremesas';
      else if (line.length >= 3 && line.length <= 55 && line.split(' ').length <= 9) {
        pendingName = line.replace(/^[•·\-–—*0-9.)\s]+/, '').trim();
      }
      continue;
    }

    const matches = Array.from(line.matchAll(/(?:R\$\s*)?(\d{1,4})[,.](\d{2})\b/g));
    if (matches.length === 0) continue;

    const firstIdx = matches[0].index ?? 0;
    let baseName = line
      .slice(0, firstIdx)
      .replace(/^[•·\-–—*0-9.)\s]+/, '')
      .replace(/[.\-_…]{2,}/g, ' ')
      .replace(/\b(de|por|apenas|r\$)\s*:?\s*$/i, '')
      .trim();

    if ((!baseName || baseName.length < 2) && pendingName) {
      baseName = pendingName;
    }
    if (!baseName || baseName.length < 2) continue;

    const lastMatch = matches[matches.length - 1];
    const price = parseFloat(`${lastMatch[1]}.${lastMatch[2]}`);
    if (price > 0.5 && price < 5000) {
      const isPromo =
        currentCategory === 'Happy Hour' ||
        /\b(happy\s*hour|promo|combo|dobro)\b/i.test(`${baseName} ${currentCategory}`);
      const key = `${baseName.toLowerCase()}:${price.toFixed(2)}`;
      if (!seen.has(key)) {
        seen.add(key);
        items.push({ name: baseName, price, cat: currentCategory, isPromo });
      }
      pendingName = '';
    }
  }
  return items;
}

// Healthcheck
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    hasServerGeminiKey: Boolean(process.env.GEMINI_API_KEY),
  });
});

const OCR_SINGLE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    credits: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Valores de Crédito formatados com vírgula (ex: "150,50" ou "" para posição sem valor).',
    },
    debits: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Valores de Débito formatados com vírgula (ex: "80,00" ou "" para posição sem valor).',
    },
    vouchers: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Valores de Voucher/Refeição/Alimentação formatados com vírgula (ex: "45,90" ou "" para posição sem valor).',
    },
    pix: {
      type: Type.STRING,
      description: 'Valor total de Pix na maquininha formatado com vírgula (ex: "120,00" ou "").',
    },
  },
  required: ['credits', 'debits', 'vouchers', 'pix'],
};

function buildOcrFlagsInstruction(
  creditFlags?: string[],
  debitFlags?: string[],
  voucherNames?: string[]
): string {
  const lines: string[] = [];
  if (Array.isArray(creditFlags) && creditFlags.length > 0) {
    lines.push(
      `- CRÉDITO possui posições fixas por bandeira: ${creditFlags
        .map((f, i) => `posição [${i}] = "${f}"`)
        .join(', ')}. Se o comprovante discriminar bandeiras de crédito (ex: Visa, Mastercard/Master, Elo, Hipercard, Amex), coloque o valor exatamente na posição correspondente (usando "" nas posições sem venda). Se o comprovante trouxer apenas o total geral de Crédito sem separar bandeiras, coloque no índice [0].`
    );
  }
  if (Array.isArray(debitFlags) && debitFlags.length > 0) {
    lines.push(
      `- DÉBITO possui posições fixas por bandeira: ${debitFlags
        .map((f, i) => `posição [${i}] = "${f}"`)
        .join(', ')}. Se o comprovante discriminar bandeiras de débito (ex: Visa Electron/Visa, Maestro/Mastercard/Master, Elo), coloque o valor na posição correspondente (usando "" nas posições vazias). Se houver apenas total de Débito, coloque no índice [0].`
    );
  }
  if (Array.isArray(voucherNames) && voucherNames.length > 0) {
    lines.push(
      `- VOUCHER possui posições fixas por bandeira: ${voucherNames
        .map((f, i) => `posição [${i}] = "${f}"`)
        .join(', ')}. Mapeie Alelo, Ticket, Sodexo/Pluxee, VR, Ben etc. exatamente na posição correspondente (usando "" nas posições sem venda).`
    );
  }
  return lines.length > 0 ? `\nMAPEAMENTO DE BANDEIRAS CONFIGURADAS NO BAR:\n${lines.join('\n')}` : '';
}

// OCR Turbo (1 a 2s) para uma única maquininha com mapeamento de bandeiras
app.post('/api/ocr', async (req, res) => {
  try {
    const { imageBase64, mimeType, customApiKey, creditFlags, debitFlags, voucherNames } = req.body;
    const apiKey = customApiKey || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(400).json({
        error: 'Chave do Gemini não encontrada no servidor nem nas preferências.',
      });
    }

    if (!imageBase64) {
      return res.status(400).json({ error: 'Nenhuma imagem foi enviada.' });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const flagsInstruction = buildOcrFlagsInstruction(creditFlags, debitFlags, voucherNames);

    const response = await callGeminiWithFallback(ai, {
      model: 'gemini-3.8-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType || 'image/jpeg',
              data: imageBase64,
            },
          },
          {
            text: `Analise este comprovante impresso de fechamento/relatório de maquininha de cartão (Getnet, Cielo, Stone, Rede, PagBank, etc.).
Extraia os valores monetários líquidos/faturados por modalidade no formato brasileiro com vírgula (ex: "150,50"). Ignore quantidades de transações (QTD/DOC).${flagsInstruction}`,
          },
        ],
      },
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        temperature: 0,
        responseMimeType: 'application/json',
        responseSchema: OCR_SINGLE_SCHEMA,
      },
    });

    const text = response.text || '{}';
    const result = JSON.parse(text);
    return res.json(result);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Erro ao processar imagem via Gemini OCR.';
    console.error('Erro em /api/ocr:', errorMsg);
    return res.status(500).json({ error: errorMsg });
  }
});

// OCR Turbo em lote para múltiplas maquininhas (até 6 imagens)
app.post('/api/ocr-multi', async (req, res) => {
  try {
    const { images, customApiKey, creditFlags, debitFlags, voucherNames } = req.body;
    const apiKey = customApiKey || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(400).json({
        error: 'Chave do Gemini não encontrada no servidor nem nas preferências.',
      });
    }

    if (!Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ error: 'Nenhuma imagem válida recebida.' });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const flagsInstruction = buildOcrFlagsInstruction(creditFlags, debitFlags, voucherNames);

    const parts: Array<{ inlineData?: { mimeType: string; data: string }; text?: string }> = images.map((img: { base64: string; mimeType?: string }) => ({
      inlineData: {
        mimeType: img.mimeType || 'image/jpeg',
        data: img.base64,
      },
    }));

    parts.push({
      text: `Analise estas imagens de comprovantes de fechamento de maquininhas de cartão.
Para CADA comprovante/maquininha distinta nas imagens, extraia os totais faturados em ordem no formato brasileiro com vírgula (ex: "150,50").${flagsInstruction}`,
    });

    const response = await callGeminiWithFallback(ai, {
      model: 'gemini-3.8-flash',
      contents: { parts },
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        temperature: 0,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: OCR_SINGLE_SCHEMA,
        },
      },
    });

    const text = response.text || '[]';
    const result = JSON.parse(text);
    return res.json(Array.isArray(result) ? result : [result]);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Erro no processamento em lote via Gemini OCR.';
    console.error('Erro em /api/ocr-multi:', errorMsg);
    return res.status(500).json({ error: errorMsg });
  }
});

// Leitura e Extração de Cardápio a partir de arquivo PDF via Gemini
app.post('/api/parse-menu-pdf', async (req, res) => {
  try {
    const { pdfBase64, customApiKey } = req.body;
    const apiKey = customApiKey || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(400).json({
        error: 'Chave do Gemini não configurada. Defina na aba IA Gemini da administração ou no servidor.',
      });
    }

    let cleanBase64 = String(pdfBase64 || '').trim();
    if (cleanBase64.includes('base64,')) {
      cleanBase64 = cleanBase64.split('base64,')[1].trim();
    }

    if (!cleanBase64) {
      return res.status(400).json({ error: 'Nenhum dado de arquivo PDF válido foi enviado.' });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const response = await callGeminiWithFallback(ai, {
      model: 'gemini-3.8-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'application/pdf',
              data: cleanBase64,
            },
          },
          {
            text: `Você é um assistente especialista em digitalização e conciliação de cardápios para bares e restaurantes brasileiros.
Analise todas as páginas deste documento PDF de cardápio com máxima precisão.
Identifique cada produto, bebida, combo, prato, porção, petisco, vinho, chopp, sobremesa e serviço com seu preço correspondente e categoria.

Diretrizes obrigatórias:
1. "name": Nome do item limpo e descritivo (ex: "Chopp Brahma 300ml", "Bolinho de Carne Defumada", "Combo Onça", "Adobe Reserva Carménère"). Se houver variantes com preços distintos no mesmo item (ex: 300ml vs 500ml), gere itens separados identificados pelo nome.
2. "price": Preço numérico em ponto flutuante (ex: 11.90, 34.90, 59.90, 159.90). Se houver promoção de Happy Hour com preço 'De' e 'Por', use o preço de venda efetivo (Por) ou inclua "(Happy Hour)" no nome.
3. "cat": Categoria lógica em português (ex: "Happy Hour", "Promocionais", "Combos", "Petiscos", "Burgers", "Pratos Principais", "Chapa & Carnes", "Bebidas", "Chopp & Cervejas", "Coquetelaria", "Drinks Sem Álcool", "Sobremesas", "Carta de Vinhos", "Espumantes", "Taxas e Serviços").
4. "isPromo": booleano (true se o item for de Happy Hour, promocional, combo promocional, em dobro ou tiver restrição de horário de lançamento; false para itens normais do cardápio).
5. Não invente itens. Extraia apenas o que constar no documento.

Retorne EXCLUSIVAMENTE um array JSON de objetos:
[
  { "name": "Chopp Brahma (Happy Hour)", "price": 11.90, "cat": "Happy Hour", "isPromo": true },
  { "name": "Batata Frita", "price": 34.90, "cat": "Petiscos", "isPromo": false }
]
Nenhum texto antes ou depois do JSON.`,
          },
        ],
      },
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        temperature: 0,
        responseMimeType: 'application/json',
        responseSchema: MENU_ITEMS_SCHEMA,
      },
    });

    const text = response.text || '[]';
    let items = [];
    try {
      items = JSON.parse(text);
      if (!Array.isArray(items)) {
        items = (items as any).items || (items as any).menu || [];
      }
    } catch {
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        items = JSON.parse(jsonMatch[0]);
      }
    }

    const normalizedItems = (Array.isArray(items) ? items : [])
      .map((item: any) => ({
        name: String(item.name || '').trim(),
        price:
          typeof item.price === 'number'
            ? item.price
            : parseFloat(String(item.price || '').replace(',', '.')) || 0,
        cat: String(item.cat || 'Geral').trim(),
        ...(typeof item.isPromo === 'boolean' ? { isPromo: item.isPromo } : {}),
      }))
      .filter((i: any) => i.name && i.price > 0);

    return res.json({
      success: true,
      count: normalizedItems.length,
      items: normalizedItems,
    });
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : 'Erro ao processar o cardápio em PDF via Gemini.';
    console.error('Erro em /api/parse-menu-pdf:', errorMsg);
    return res.status(500).json({ error: errorMsg });
  }
});

// Leitura e Extração de Cardápio a partir de Texto extraído no cliente (Elimina erro HTTP 413 e conta com Fallback Local)
app.post('/api/parse-menu-text', async (req, res) => {
  const { menuText, customApiKey } = req.body;
  try {
    const apiKey = customApiKey || process.env.GEMINI_API_KEY;

    if (!menuText || !menuText.trim()) {
      return res.status(400).json({ error: 'Nenhum texto de cardápio foi enviado.' });
    }

    if (!apiKey) {
      const fallbackItems = parseMenuTextServerFallback(menuText);
      if (fallbackItems.length > 0) {
        return res.json({
          success: true,
          count: fallbackItems.length,
          items: fallbackItems,
          usedFallback: true,
        });
      }
      return res.status(400).json({
        error: 'Chave do Gemini não configurada. Defina na aba IA Gemini da administração ou no servidor.',
      });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const response = await callGeminiWithFallback(ai, {
      model: 'gemini-3.8-flash',
      contents: `Você é um assistente especialista em digitalização e conciliação de cardápios para bares e restaurantes brasileiros.
Analise com máxima precisão o texto a seguir, extraído de um documento de cardápio de restaurante:

"""
${menuText.slice(0, 50000)}
"""

Identifique cada produto, bebida, combo, prato, porção, petisco, vinho, chopp, sobremesa e serviço com seu preço correspondente e categoria.

Diretrizes obrigatórias:
1. "name": Nome do item limpo e descritivo (ex: "Chopp Brahma 300ml", "Bolinho de Carne Defumada", "Combo Onça", "Adobe Reserva Carménère"). Se houver variantes com preços distintos no mesmo item (ex: 300ml vs 500ml), gere itens separados identificados pelo nome.
2. "price": Preço numérico em ponto flutuante (ex: 11.90, 34.90, 59.90, 159.90). Se houver promoção de Happy Hour com preço 'De' e 'Por', use o preço de venda efetivo (Por) ou inclua "(Happy Hour)" no nome.
3. "cat": Categoria lógica em português (ex: "Happy Hour", "Promocionais", "Combos", "Petiscos", "Burgers", "Pratos Principais", "Chapa & Carnes", "Bebidas", "Chopp & Cervejas", "Coquetelaria", "Drinks Sem Álcool", "Sobremesas", "Carta de Vinhos", "Espumantes", "Taxas e Serviços").
4. "isPromo": booleano (true se o item for de Happy Hour, promocional, combo promocional, em dobro ou tiver restrição de horário de lançamento; false para itens normais do cardápio).
5. Não invente itens. Extraia apenas o que constar no texto.`,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        temperature: 0,
        responseMimeType: 'application/json',
        responseSchema: MENU_ITEMS_SCHEMA,
      },
    });

    const text = response.text || '[]';
    let items = [];
    try {
      items = JSON.parse(text);
      if (!Array.isArray(items)) {
        items = (items as any).items || (items as any).menu || [];
      }
    } catch {
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) items = JSON.parse(jsonMatch[0]);
    }

    const normalizedItems = (Array.isArray(items) ? items : [])
      .map((item: any) => ({
        name: String(item.name || '').trim(),
        price:
          typeof item.price === 'number'
            ? item.price
            : parseFloat(String(item.price || '').replace(',', '.')) || 0,
        cat: String(item.cat || 'Geral').trim(),
        ...(typeof item.isPromo === 'boolean' ? { isPromo: item.isPromo } : {}),
      }))
      .filter((i: any) => i.name && i.price > 0);

    if (normalizedItems.length === 0) {
      const fallbackItems = parseMenuTextServerFallback(menuText);
      if (fallbackItems.length > 0) {
        return res.json({
          success: true,
          count: fallbackItems.length,
          items: fallbackItems,
          usedFallback: true,
        });
      }
    }

    return res.json({
      success: true,
      count: normalizedItems.length,
      items: normalizedItems,
    });
  } catch (err: unknown) {
    // Se todos os modelos da cascata estiverem sob alta demanda (503), usa o extrator local de backup no servidor
    if (menuText && typeof menuText === 'string') {
      const fallbackItems = parseMenuTextServerFallback(menuText);
      if (fallbackItems.length > 0) {
        console.log(`[Fallback Local Servidor] Extraídos ${fallbackItems.length} itens do texto do PDF.`);
        return res.json({
          success: true,
          count: fallbackItems.length,
          items: fallbackItems,
          usedFallback: true,
        });
      }
    }
    const errorMsg =
      err instanceof Error ? err.message : 'Erro ao processar o texto do cardápio via Gemini.';
    console.error('Erro em /api/parse-menu-text:', errorMsg);
    return res.status(500).json({ error: errorMsg });
  }
});

// Leitura de páginas escaneadas em JPEG compactadas
app.post('/api/parse-menu-images', async (req, res) => {
  try {
    const { pageImages, customApiKey } = req.body;
    const apiKey = customApiKey || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(400).json({
        error: 'Chave do Gemini não configurada. Defina na aba IA Gemini da administração ou no servidor.',
      });
    }

    if (!Array.isArray(pageImages) || pageImages.length === 0) {
      return res.status(400).json({ error: 'Nenhuma imagem de página foi enviada.' });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const parts: any[] = pageImages.slice(0, 8).map((imgBase64: string) => {
      let clean = imgBase64;
      if (clean.includes('base64,')) clean = clean.split('base64,')[1];
      return {
        inlineData: {
          mimeType: 'image/jpeg',
          data: clean.trim(),
        },
      };
    });

    parts.push({
      text: `Você é um assistente especialista em digitalização e conciliação de cardápios para bares e restaurantes brasileiros.
Analise estas fotos de páginas escaneadas de um cardápio com máxima precisão.
Identifique cada produto, bebida, combo, prato, porção, petisco, vinho, chopp, sobremesa e serviço com seu preço correspondente e categoria.

Diretrizes obrigatórias:
1. "name": Nome do item limpo e descritivo.
2. "price": Preço numérico em ponto flutuante (ex: 11.90, 34.90).
3. "cat": Categoria lógica em português.
4. "isPromo": booleano (true se o item for de Happy Hour, promocional, combo ou tiver horário limite de lançamento; false caso contrário).
5. Retorne EXCLUSIVAMENTE um array JSON de objetos: [{ "name": "Item", "price": 10.0, "cat": "Geral", "isPromo": false }]`,
    });

    const response = await callGeminiWithFallback(ai, {
      model: 'gemini-3.8-flash',
      contents: { parts },
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        temperature: 0,
        responseMimeType: 'application/json',
        responseSchema: MENU_ITEMS_SCHEMA,
      },
    });

    const text = response.text || '[]';
    let items = [];
    try {
      items = JSON.parse(text);
      if (!Array.isArray(items)) {
        items = (items as any).items || (items as any).menu || [];
      }
    } catch {
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) items = JSON.parse(jsonMatch[0]);
    }

    const normalizedItems = (Array.isArray(items) ? items : [])
      .map((item: any) => ({
        name: String(item.name || '').trim(),
        price:
          typeof item.price === 'number'
            ? item.price
            : parseFloat(String(item.price || '').replace(',', '.')) || 0,
        cat: String(item.cat || 'Geral').trim(),
        ...(typeof item.isPromo === 'boolean' ? { isPromo: item.isPromo } : {}),
      }))
      .filter((i: any) => i.name && i.price > 0);

    return res.json({
      success: true,
      count: normalizedItems.length,
      items: normalizedItems,
    });
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : 'Erro ao processar as fotos das páginas via Gemini.';
    console.error('Erro em /api/parse-menu-images:', errorMsg);
    return res.status(500).json({ error: errorMsg });
  }
});

// Endpoint para obter o PDF de exemplo existente em /public/assets/aistudio/...
app.get('/api/sample-menu-pdf', (_req, res) => {
  try {
    const samplePath = path.join(
      __dirname,
      'public/assets/aistudio/Card_pio_Completo_-_Flor_de_Brasa_c96dbe44.pdf'
    );
    if (!fs.existsSync(samplePath)) {
      return res.status(404).json({ error: 'Arquivo PDF de exemplo não encontrado.' });
    }
    const fileBuffer = fs.readFileSync(samplePath);
    const base64 = fileBuffer.toString('base64');
    res.json({
      success: true,
      fileName: 'Cardapio_Completo_Flor_de_Brasa.pdf',
      base64,
      sizeBytes: fileBuffer.length,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao carregar PDF de exemplo.' });
  }
});

// ==========================================
// CONECTOR NATIVO EM TEMPO REAL JCLAN ALPHAX9 (AUTO-SYNC <= 2S + OCR TELA)
// ==========================================
interface JclanTotalsPayload {
  credit: string;
  debit: string;
  pix: string;
  voucher: string;
  cash: string;
}

interface JclanBreakdownItem {
  label: string;
  amount: number;
  formatted: string;
  category: 'credit' | 'debit' | 'pix' | 'voucher' | 'cash' | 'other';
}

interface JclanCompanyItem {
  id: string;
  name: string;
  codigoInterno?: string | number;
}

interface JclanSessionEntry {
  baseRest: string;
  grupoEmpresarialId: string;
  grupoEmpresarialName?: string;
  token: string;
  validacao: string;
  tokenSecundario: string;
  usuarioId: string;
  companies: JclanCompanyItem[];
  authenticatedAt: number;
  cookieHeader?: string;
  reportUrl?: string;
  lastHtmlHash?: string;
  lastTotals?: JclanTotalsPayload;
}

const jclanSessionCache = new Map<string, JclanSessionEntry>();

const JCLAN_TOTALS_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    credit: {
      type: Type.STRING,
      description: 'Total de vendas em Cartão de Crédito formatado com vírgula (ex: "1540,50" ou "").',
    },
    debit: {
      type: Type.STRING,
      description: 'Total de vendas em Cartão de Débito formatado com vírgula (ex: "820,00" ou "").',
    },
    pix: {
      type: Type.STRING,
      description: 'Total de vendas em Pix formatado com vírgula (ex: "640,00" ou "").',
    },
    voucher: {
      type: Type.STRING,
      description: 'Total de vendas em Voucher/Refeição/Alimentação formatado com vírgula (ex: "210,00" ou "").',
    },
    cash: {
      type: Type.STRING,
      description: 'Total de vendas em Dinheiro/Espécie formatado com vírgula (ex: "450,00" ou "").',
    },
  },
  required: ['credit', 'debit', 'pix', 'voucher', 'cash'],
};

function normalizeBrMoneyValue(raw: string | number | undefined | null): string {
  if (raw === undefined || raw === null) return '';
  if (typeof raw === 'number') {
    return raw > 0 ? raw.toFixed(2).replace('.', ',') : '';
  }
  const clean = String(raw)
    .replace(/R\$\s*/gi, '')
    .replace(/\s+/g, '')
    .trim();
  if (!clean) return '';
  if (/^\d{1,3}(\.\d{3})+,\d{2}$/.test(clean)) {
    const num = parseFloat(clean.replace(/\./g, '').replace(',', '.'));
    return num > 0 ? num.toFixed(2).replace('.', ',') : '';
  }
  if (/^\d+,\d{1,2}$/.test(clean)) {
    const num = parseFloat(clean.replace(',', '.'));
    return num > 0 ? num.toFixed(2).replace('.', ',') : '';
  }
  if (/^\d+\.\d{1,2}$/.test(clean)) {
    const num = parseFloat(clean);
    return num > 0 ? num.toFixed(2).replace('.', ',') : '';
  }
  return '';
}

function classifyJclanPaymentType(
  rawName: string
): 'credit' | 'debit' | 'pix' | 'voucher' | 'cash' | 'other' {
  const norm = String(rawName || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

  if (!norm) return 'other';
  if (
    norm.includes('pix') ||
    norm.includes('movimentacao bancaria') ||
    norm.includes('mov bancaria') ||
    norm.includes('movimentacao') ||
    norm.includes('transferencia bancaria') ||
    norm.includes('transf bancaria') ||
    norm.includes('transferencia') ||
    norm.includes('deposito bancario') ||
    norm.includes('deposito') ||
    /\bted\b/.test(norm) ||
    /\bdoc\b/.test(norm)
  ) {
    return 'pix';
  }
  if (
    norm.includes('voucher') ||
    norm.includes('vale') ||
    norm.includes('refeicao') ||
    norm.includes('alimentacao') ||
    norm.includes('alelo') ||
    norm.includes('sodexo') ||
    norm.includes('pluxee') ||
    norm.includes('ticket') ||
    /\bvr\b/.test(norm) ||
    /\bben\b/.test(norm) ||
    norm.includes('greencard') ||
    norm.includes('verocheque')
  ) {
    return 'voucher';
  }
  if (norm.includes('debito') || norm.includes('electron') || norm.includes('maestro')) {
    return 'debit';
  }
  if (
    norm.includes('credito') ||
    norm.includes('amex') ||
    norm.includes('hipercard') ||
    norm.includes('diners') ||
    norm.includes('cartao cred')
  ) {
    return 'credit';
  }
  if (norm.includes('dinheiro') || norm.includes('especie') || norm.includes('moeda')) {
    return 'cash';
  }
  return 'other';
}

function getBrazilDateParts(offsetDays = 0): { ymd: string; dmy: string; hour: number } {
  const target = new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000);
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(target);
  const year = parts.find((p) => p.type === 'year')?.value || '2026';
  const month = parts.find((p) => p.type === 'month')?.value || '01';
  const day = parts.find((p) => p.type === 'day')?.value || '01';
  const hourStr = parts.find((p) => p.type === 'hour')?.value || '00';
  const hour = parseInt(hourStr, 10) || 0;
  return {
    ymd: `${year}-${month}-${day}`,
    dmy: `${day}/${month}`,
    hour: hour === 24 ? 0 : hour,
  };
}

function buildJclanDateRange(params: {
  dateMode?: 'turno_auto' | 'hoje' | 'ontem' | 'custom';
  customStartDate?: string;
  customStartTime?: string;
  customEndDate?: string;
  customEndTime?: string;
}): Array<{ dataInicio: string; dataFim: string; label: string }> {
  const mode = params.dateMode || 'turno_auto';
  const today = getBrazilDateParts(0);
  const yesterday = getBrazilDateParts(-1);

  if (mode === 'custom' && params.customStartDate && params.customEndDate) {
    const sTime = params.customStartTime || '00:00';
    const eTime = params.customEndTime || '23:59';
    return [
      {
        dataInicio: `${params.customStartDate}T${sTime}:00-03:00`,
        dataFim: `${params.customEndDate}T${eTime}:59-03:00`,
        label: `Personalizado (${params.customStartDate.split('-').reverse().slice(0, 2).join('/')} ${sTime} até ${params.customEndDate.split('-').reverse().slice(0, 2).join('/')} ${eTime})`,
      },
    ];
  }

  if (mode === 'hoje') {
    return [
      {
        dataInicio: `${today.ymd}T00:00:00-03:00`,
        dataFim: `${today.ymd}T23:59:59-03:00`,
        label: `Hoje (${today.dmy} · 00:00 às 23:59)`,
      },
    ];
  }

  if (mode === 'ontem') {
    return [
      {
        dataInicio: `${yesterday.ymd}T00:00:00-03:00`,
        dataFim: `${yesterday.ymd}T23:59:59-03:00`,
        label: `Ontem (${yesterday.dmy} · 00:00 às 23:59)`,
      },
    ];
  }

  // Modo 'turno_auto' (Inteligente para fechamento de bar):
  // Se for de madrugada (entre 00:00 e 06:59), o caixa sendo fechado iniciou ontem!
  // Consultamos primeiro o dia de ontem + madrugada (ou ontem completo) e, se vazio, hoje.
  // Se for após as 07:00, consultamos Hoje primeiro e, se ainda estiver zerado (ex: conferência do turno anterior pela manhã), tentamos Ontem.
  if (today.hour < 7) {
    return [
      {
        dataInicio: `${yesterday.ymd}T00:00:00-03:00`,
        dataFim: `${today.ymd}T06:59:59-03:00`,
        label: `Turno Madrugada (${yesterday.dmy} a ${today.dmy})`,
      },
      {
        dataInicio: `${yesterday.ymd}T00:00:00-03:00`,
        dataFim: `${yesterday.ymd}T23:59:59-03:00`,
        label: `Turno Ontem (${yesterday.dmy})`,
      },
      {
        dataInicio: `${today.ymd}T00:00:00-03:00`,
        dataFim: `${today.ymd}T23:59:59-03:00`,
        label: `Hoje (${today.dmy})`,
      },
    ];
  }

  return [
    {
      dataInicio: `${today.ymd}T00:00:00-03:00`,
      dataFim: `${today.ymd}T23:59:59-03:00`,
      label: `Hoje (${today.dmy} · 00:00 às 23:59)`,
    },
    {
      dataInicio: `${yesterday.ymd}T00:00:00-03:00`,
      dataFim: `${yesterday.ymd}T23:59:59-03:00`,
      label: `Ontem (${yesterday.dmy} · último turno com movimento)`,
    },
  ];
}

function parseAlphaX9PaymentReport(rawData: any): {
  totals: JclanTotalsPayload;
  breakdown: JclanBreakdownItem[];
  totalAmount: number;
  foundAny: boolean;
} {
  let creditCents = 0;
  let debitCents = 0;
  let pixCents = 0;
  let voucherCents = 0;
  let cashCents = 0;

  const breakdownMap = new Map<
    string,
    { label: string; cents: number; category: JclanBreakdownItem['category'] }
  >();

  const addPaymentEntry = (rawLabel: any, rawVal: any) => {
    const label = String(rawLabel || '').trim();
    if (!label) return;
    const num =
      typeof rawVal === 'number'
        ? rawVal
        : parseFloat(String(rawVal || '0').replace(/\./g, '').replace(',', '.')) ||
          parseFloat(String(rawVal || '0')) ||
          0;
    const cents = Math.round(num * 100);
    if (cents <= 0) return;

    const category = classifyJclanPaymentType(label);
    if (category === 'credit') creditCents += cents;
    else if (category === 'debit') debitCents += cents;
    else if (category === 'pix') pixCents += cents;
    else if (category === 'voucher') voucherCents += cents;
    else if (category === 'cash') cashCents += cents;

    const key = label.toUpperCase();
    const existing = breakdownMap.get(key);
    if (existing) {
      existing.cents += cents;
    } else {
      breakdownMap.set(key, { label, cents, category });
    }
  };

  const list = Array.isArray(rawData) ? rawData : [];
  for (const item of list) {
    if (!item || typeof item !== 'object') continue;
    // Ignora linha sintética de "Total Geral" (empresa._id === 1) caso já venha duplicada
    if (item?.empresa?._id === 1 || item?.empresa?.nomeFantasia === 'Total Geral') {
      continue;
    }

    if (Array.isArray(item.listaTipoPagamento) && item.listaTipoPagamento.length > 0) {
      for (const sub of item.listaTipoPagamento) {
        addPaymentEntry(
          sub?.tipoPagamento || sub?.descricao || sub?.formaPagamento || sub?.nome,
          sub?.total ?? sub?.valor ?? sub?.valorLiquido
        );
      }
    } else if (item.tipoPagamento || item.formaPagamento || item.descricao) {
      addPaymentEntry(
        item.tipoPagamento || item.formaPagamento || item.descricao,
        item.total ?? item.valor ?? item.valorLiquido ?? item.valorBruto
      );
    }
  }

  const formatCents = (c: number) => (c > 0 ? (c / 100).toFixed(2).replace('.', ',') : '');

  const totals: JclanTotalsPayload = {
    credit: formatCents(creditCents),
    debit: formatCents(debitCents),
    pix: formatCents(pixCents),
    voucher: formatCents(voucherCents),
    cash: formatCents(cashCents),
  };

  const breakdown: JclanBreakdownItem[] = Array.from(breakdownMap.values()).map((b) => ({
    label: b.label,
    amount: b.cents / 100,
    formatted: (b.cents / 100).toFixed(2).replace('.', ','),
    category: b.category,
  }));

  const totalCents = creditCents + debitCents + pixCents + voucherCents + cashCents;
  const foundAny = totalCents > 0 || breakdown.length > 0;

  return {
    totals,
    breakdown,
    totalAmount: totalCents / 100,
    foundAny,
  };
}

async function resolveAlphaX9BaseRest(portalUrl: string): Promise<string> {
  const clean = String(portalUrl || 'https://gestao.flordebrasacuritiba.com.br/').trim();
  const withProto = clean.startsWith('http') ? clean : `https://${clean}`;
  if (withProto.includes('-ws')) {
    return withProto.endsWith('/') ? withProto : `${withProto}/`;
  }
  try {
    const u = new URL(withProto);
    const cfgUrl = `${u.origin}/config.json?_=${Date.now()}`;
    const cfgRes = await fetch(cfgUrl, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(3500),
    });
    if (cfgRes.ok) {
      const cfgJson: any = await cfgRes.json();
      if (cfgJson?.baseRest && typeof cfgJson.baseRest === 'string') {
        return cfgJson.baseRest.endsWith('/') ? cfgJson.baseRest : `${cfgJson.baseRest}/`;
      }
    }
  } catch {
    // Fallback para o endpoint oficial do Flor de Brasa Curitiba na Jclan AlphaX9
  }
  return 'https://alphax9.jclan.com.br/flordebrasacuritiba-ws/';
}

async function authenticateAlphaX9(
  baseRest: string,
  username: string,
  password: string
): Promise<{
  ok: boolean;
  session?: JclanSessionEntry;
  errorMessage?: string;
}> {
  // Passo 1: Buscar Grupo Empresarial em getGrupoEmpresarialLista
  const grpRes = await fetch(`${baseRest}getGrupoEmpresarialLista`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-gestao': 'true',
    },
    body: JSON.stringify({}),
    signal: AbortSignal.timeout(5000),
  });

  if (!grpRes.ok) {
    return {
      ok: false,
      errorMessage: `Servidor Jclan AlphaX9 respondeu com status ${grpRes.status} ao buscar Grupo Empresarial.`,
    };
  }

  const grpJson: any = await grpRes.json();
  const grupos = Array.isArray(grpJson?.data) ? grpJson.data : [];
  if (!grpJson?.valido || grupos.length === 0) {
    return {
      ok: false,
      errorMessage:
        grpJson?.data?.message ||
        'Não foi encontrado nenhum Grupo Empresarial cadastrado no servidor Jclan.',
    };
  }

  const grupoEmpresarialId = String(grupos[0]._id || '');
  const grupoEmpresarialName = String(grupos[0].descricao || '');

  // Passo 2: Autenticar em loginGestao com senha em hash MD5 e cabeçalho x-gestao: true
  const rawPass = String(password || '');
  const md5Password = /^[a-f0-9]{32}$/i.test(rawPass)
    ? rawPass.toLowerCase()
    : crypto.createHash('md5').update(rawPass).digest('hex');

  const loginRes = await fetch(`${baseRest}loginGestao`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-gestao': 'true',
    },
    body: JSON.stringify({
      email: String(username || '').trim(),
      senha: md5Password,
      grupoEmpresarial: grupoEmpresarialId,
    }),
    signal: AbortSignal.timeout(5500),
  });

  const loginJson: any = await loginRes.json().catch(() => null);
  if (!loginRes.ok || !loginJson?.valido || !loginJson?.data) {
    const serverMsg =
      loginJson?.data?.mensagem ||
      loginJson?.data?.message ||
      loginJson?.message ||
      'E-mail ou senha inválidos no portal Jclan.';
    return {
      ok: false,
      errorMessage: `Recusado pela Jclan: ${serverMsg}`,
    };
  }

  const userData = loginJson.data;
  const token = String(userData.token || '');
  const validacao = String(userData.validacao || '');
  const tokenSecundario = String(userData.tokenSecundario || '');
  const usuarioId = String(
    userData?.usuario?._id || userData?.usuario || userData?.pessoaId || userData?._id || ''
  );

  if (!token || !usuarioId) {
    return {
      ok: false,
      errorMessage: 'Login aceito pela Jclan, porém o token de acesso não foi retornado.',
    };
  }

  // Passo 3: Buscar empresas vinculadas ao usuário (getEmpresasUsuario)
  const empRes = await fetch(`${baseRest}getEmpresasUsuario`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-gestao': 'true',
      'x-access-token': token,
      'x-versao': '1.0.43',
      'x-grupo-empresarial': grupoEmpresarialId,
      'x-validacao': validacao,
      'x-token-secundario': tokenSecundario,
    },
    body: JSON.stringify({
      grupoEmpresarialId,
      pessoaId: usuarioId,
    }),
    signal: AbortSignal.timeout(5000),
  });

  const empJson: any = await empRes.json().catch(() => null);
  const rawCompanies = Array.isArray(empJson?.data) ? empJson.data : [];
  const companies: JclanCompanyItem[] = rawCompanies
    .map((item: any) => {
      const empObj = item?.empresa && typeof item.empresa === 'object' ? item.empresa : item;
      const id = String(empObj?._id || item?._id || '');
      const codigoInterno = empObj?.codigoInterno ?? item?.codigoInterno;
      const name = String(
        empObj?.nomeFantasia ||
          empObj?.descricao ||
          empObj?.razaoSocial ||
          item?.nomeFantasia ||
          item?.descricao ||
          'Unidade Jclan'
      ).trim();
      return { id, name, codigoInterno };
    })
    .filter((c: JclanCompanyItem) => Boolean(c.id));

  if (companies.length === 0) {
    return {
      ok: false,
      errorMessage: 'Este usuário não está vinculado a nenhuma empresa ativa no portal Jclan.',
    };
  }

  const session: JclanSessionEntry = {
    baseRest,
    grupoEmpresarialId,
    grupoEmpresarialName,
    token,
    validacao,
    tokenSecundario,
    usuarioId,
    companies,
    authenticatedAt: Date.now(),
  };

  return { ok: true, session };
}

app.post('/api/jclan/sync', async (req, res) => {
  try {
    const {
      tenantId,
      tenantName,
      portalUrl,
      username,
      password,
      forceRelogin,
      dateMode,
      customStartDate,
      customStartTime,
      customEndDate,
      customEndTime,
      selectedEmpresaId,
    } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        needsAuth: true,
        message: 'Informe seu E-mail e Senha do portal Jclan para sincronizar os totais.',
        error: 'Informe seu E-mail e Senha do portal Jclan para sincronizar os totais.',
      });
    }

    const cleanUser = String(username).trim();
    const cleanPortalUrl = String(portalUrl || 'https://gestao.flordebrasacuritiba.com.br/').trim();
    const cacheKey = `${tenantId || 'default'}::${cleanPortalUrl}::${cleanUser.toLowerCase()}`;

    let session = jclanSessionCache.get(cacheKey);
    const now = Date.now();
    // Renova token a cada 25 minutos ou quando solicitado forceRelogin
    const isExpired = !session || now - session.authenticatedAt > 25 * 60 * 1000;

    if (forceRelogin || isExpired || !session) {
      const baseRest = await resolveAlphaX9BaseRest(cleanPortalUrl);
      const authResult = await authenticateAlphaX9(baseRest, cleanUser, String(password));
      if (!authResult.ok || !authResult.session) {
        jclanSessionCache.delete(cacheKey);
        return res.status(401).json({
          success: false,
          needsAuth: true,
          message: authResult.errorMessage || 'Falha na autenticação com o portal Jclan.',
          error: authResult.errorMessage || 'Falha na autenticação com o portal Jclan.',
        });
      }
      session = authResult.session;
      jclanSessionCache.set(cacheKey, session);
    }

    // Seleciona a filial/empresa automaticamente (ou respeita a escolha do usuário)
    const companies = session.companies || [];
    let targetCompanies: JclanCompanyItem[] = [];

    if (selectedEmpresaId === 'ALL') {
      targetCompanies = companies;
    } else if (selectedEmpresaId) {
      const found = companies.find((c) => c.id === selectedEmpresaId);
      if (found) targetCompanies = [found];
    }

    if (targetCompanies.length === 0 && tenantName && companies.length > 1) {
      const normTenant = String(tenantName)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
      const matchedByName = companies.find((c) =>
        c.name
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .includes(normTenant)
      );
      if (matchedByName) targetCompanies = [matchedByName];
    }

    if (targetCompanies.length === 0 && companies.length > 0) {
      targetCompanies = [companies[0]];
    }

    const empresaIds = targetCompanies.map((c) => c.id);
    const primaryEmpresaId = empresaIds[0] || '';

    // Monta as janelas de data/hora conforme modo selecionado ('turno_auto' | 'hoje' | 'ontem' | 'custom')
    const candidateRanges = buildJclanDateRange({
      dateMode,
      customStartDate,
      customStartTime,
      customEndDate,
      customEndTime,
    });

    const queryReportForRange = async (
      activeSession: JclanSessionEntry,
      range: { dataInicio: string; dataFim: string; label: string }
    ) => {
      const repRes = await fetch(`${activeSession.baseRest}getRelatorioVendasTipoPagamento`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-gestao': 'true',
          'x-access-token': activeSession.token,
          'x-versao': '1.0.43',
          'x-empresa': primaryEmpresaId,
          'x-grupo-empresarial': activeSession.grupoEmpresarialId,
          'x-validacao': activeSession.validacao,
          'x-token-secundario': activeSession.tokenSecundario,
        },
        body: JSON.stringify({
          dataInicio: range.dataInicio,
          dataFim: range.dataFim,
          grupoEmpresarial: activeSession.grupoEmpresarialId,
          empresas: empresaIds,
          tipoEmpresa: ['Matriz', 'Filial', 'Franquia'],
        }),
        signal: AbortSignal.timeout(5000),
      });
      const repJson: any = await repRes.json().catch(() => null);
      return { status: repRes.status, ok: repRes.ok, json: repJson };
    };

    let chosenRange = candidateRanges[0];
    let parsedResult = {
      totals: { credit: '', debit: '', pix: '', voucher: '', cash: '' } as JclanTotalsPayload,
      breakdown: [] as JclanBreakdownItem[],
      totalAmount: 0,
      foundAny: false,
    };

    for (let i = 0; i < candidateRanges.length; i++) {
      const range = candidateRanges[i];
      let attempt = await queryReportForRange(session, range);

      // Se o token expirou no servidor Jclan, refaz o login transparente uma vez
      if (attempt.status === 401 || attempt.status === 403 || (attempt.json && attempt.json.valido === false && /token|sess[aã]o|autentica/i.test(JSON.stringify(attempt.json)))) {
        const relogin = await authenticateAlphaX9(session.baseRest, cleanUser, String(password));
        if (relogin.ok && relogin.session) {
          session = relogin.session;
          jclanSessionCache.set(cacheKey, session);
          attempt = await queryReportForRange(session, range);
        }
      }

      if (attempt.ok && attempt.json?.valido) {
        const currentParsed = parseAlphaX9PaymentReport(attempt.json.data);
        if (i === 0) {
          chosenRange = range;
          parsedResult = currentParsed;
        }
        if (currentParsed.foundAny) {
          chosenRange = range;
          parsedResult = currentParsed;
          break;
        }
      }
    }

    session.lastTotals = parsedResult.totals;
    jclanSessionCache.set(cacheKey, session);

    return res.json({
      success: true,
      totals: parsedResult.totals,
      breakdown: parsedResult.breakdown,
      totalAmount: parsedResult.totalAmount,
      foundAny: parsedResult.foundAny,
      periodLabel: chosenRange.label,
      dataInicio: chosenRange.dataInicio,
      dataFim: chosenRange.dataFim,
      companies,
      selectedEmpresaId: selectedEmpresaId === 'ALL' ? 'ALL' : primaryEmpresaId,
      selectedEmpresaName:
        selectedEmpresaId === 'ALL'
          ? `Todas as Unidades (${companies.length})`
          : targetCompanies[0]?.name || session.grupoEmpresarialName || 'Flor de Brasa',
      syncedAt: Date.now(),
    });
  } catch (err: any) {
    console.error('Erro em /api/jclan/sync:', err?.message || err);
    const msg =
      err?.name === 'TimeoutError'
        ? 'O servidor AlphaX9 da Jclan demorou mais de 5 segundos para responder.'
        : err?.message || 'Não foi possível conectar ao servidor da Jclan.';
    return res.status(500).json({
      success: false,
      message: msg,
      error: msg,
    });
  }
});

// Leitura Turbo (1 a 2s) de Print ou Foto da Tela do Sistema Jclan
app.post('/api/jclan/ocr-screen', async (req, res) => {
  try {
    const { imageBase64, mimeType, customApiKey } = req.body;
    const apiKey = customApiKey || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(400).json({
        error: 'Chave do Gemini não encontrada no servidor nem nas preferências.',
      });
    }
    if (!imageBase64) {
      return res.status(400).json({ error: 'Nenhuma imagem/print da tela do Jclan foi enviada.' });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
    });

    const response = await callGeminiWithFallback(ai, {
      model: 'gemini-3.8-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType || 'image/jpeg',
              data: imageBase64,
            },
          },
          {
            text: `Analise este print ou foto da tela do sistema de gestão/PDV Jclan (gestao.flordebrasacuritiba.com.br).
Extraia os valores monetários totais faturados de:
- credit: Cartão de Crédito
- debit: Cartão de Débito
- pix: Pix e Movimentação Bancária (ATENÇÃO: no sistema Jclan, as vendas via Pix aparecem rotuladas como "Movimentação Bancária", "Movimentacao Bancaria" ou "Mov. Bancária". Extraia e totalize esses valores obrigatoriamente no campo pix)
- voucher: Voucher / Vale Refeição / Alimentação
- cash: Vendas em Dinheiro / Espécie
Formate cada valor no padrão brasileiro com vírgula (ex: "1540,50") ou "" caso não apareça na imagem.`,
          },
        ],
      },
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        temperature: 0,
        responseMimeType: 'application/json',
        responseSchema: JCLAN_TOTALS_SCHEMA,
      },
    });

    const raw = JSON.parse(response.text || '{}');
    const totals: JclanTotalsPayload = {
      credit: normalizeBrMoneyValue(raw.credit),
      debit: normalizeBrMoneyValue(raw.debit),
      pix: normalizeBrMoneyValue(raw.pix),
      voucher: normalizeBrMoneyValue(raw.voucher),
      cash: normalizeBrMoneyValue(raw.cash),
    };

    return res.json({
      success: true,
      totals,
      syncedAt: Date.now(),
    });
  } catch (err: any) {
    console.error('Erro em /api/jclan/ocr-screen:', err?.message || err);
    return res.status(500).json({
      error: err?.message || 'Erro ao ler a imagem da tela do Jclan.',
    });
  }
});

// ==========================================
// SAAS CLOUD MULTI-TENANT API ENDPOINTS
// ==========================================
import { cloudDb } from './server/db.ts';

// 1. Tenants (Bares & Restaurantes)
app.get('/api/tenants', (_req, res) => {
  try {
    const tenants = cloudDb.getTenants();
    res.json(tenants);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/tenants/:id', (req, res) => {
  try {
    const tenant = cloudDb.getTenantById(req.params.id);
    if (!tenant) return res.status(404).json({ error: 'Bar não encontrado' });
    res.json(tenant);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/tenants', (req, res) => {
  try {
    const newTenant = cloudDb.createTenant(req.body);
    res.status(201).json(newTenant);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/tenants/sync', (req, res) => {
  try {
    const incoming = req.body.tenants || req.body;
    const usersByTenant = req.body.usersByTenant;
    const menusByTenant = req.body.menusByTenant;
    const closingsByTenant = req.body.closingsByTenant;
    const deletedTenantIds = req.body.deletedTenantIds;
    const deletedClosingIdsByTenant = req.body.deletedClosingIdsByTenant;
    if (!Array.isArray(incoming)) {
      return res.status(400).json({ error: 'Lista de bares deve ser um array.' });
    }
    const synced = cloudDb.syncTenants(
      incoming,
      usersByTenant,
      menusByTenant,
      closingsByTenant,
      deletedTenantIds,
      deletedClosingIdsByTenant
    );
    res.json(synced);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/tenants/:id', (req, res) => {
  try {
    const updated = cloudDb.updateTenant(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Bar não encontrado' });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/tenants/:id', (req, res) => {
  try {
    const deleted = cloudDb.deleteTenant(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Bar não encontrado' });
    res.json({ success: true, message: 'Bar removido com sucesso' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/tenants/:id/toggle-block', (req, res) => {
  try {
    const updated = cloudDb.toggleBlockTenant(req.params.id);
    if (!updated) return res.status(404).json({ error: 'Bar não encontrado' });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Cardápios Dinâmicos por Bar
app.get('/api/tenants/:id/menu', (req, res) => {
  try {
    const menu = cloudDb.getMenu(req.params.id);
    res.json(menu);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/tenants/:id/menu', (req, res) => {
  try {
    const items = req.body.items || req.body;
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: 'Itens do cardápio devem ser um array' });
    }
    const updated = cloudDb.setMenu(req.params.id, items);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/tenants/:id/menu/item', (req, res) => {
  try {
    const { name, price, cat } = req.body;
    if (!name || price === undefined) {
      return res.status(400).json({ error: 'Nome e preço são obrigatórios' });
    }
    const updated = cloudDb.addMenuItem(req.params.id, { name, price: Number(price), cat: cat || 'Geral' });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/tenants/:id/menu/item/:name', (req, res) => {
  try {
    const updated = cloudDb.removeMenuItem(req.params.id, decodeURIComponent(req.params.name));
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Fechamentos na Nuvem (Isolamento por Bar)
app.get('/api/tenants/:id/closings', (req, res) => {
  try {
    const closings = cloudDb.getClosings(req.params.id);
    res.json(closings);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/tenants/:id/closings', (req, res) => {
  try {
    const record = cloudDb.addClosing(req.params.id, req.body);
    res.status(201).json(record);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/tenants/:id/closings/sync', (req, res) => {
  try {
    const records = Array.isArray(req.body.closings)
      ? req.body.closings
      : Array.isArray(req.body)
      ? req.body
      : [];
    const deletedIds = Array.isArray(req.body.deletedIds) ? req.body.deletedIds : [];
    const merged = cloudDb.syncClosings(req.params.id, records, deletedIds);
    res.json(merged);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/tenants/:id/closings/:closingId', (req, res) => {
  try {
    const success = cloudDb.deleteClosing(req.params.id, Number(req.params.closingId));
    res.json({ success });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3.5. Sincronização em Tempo Real de Turno em Andamento (Celular <-> Computador)
interface ConnectedClient {
  deviceId: string;
  deviceType: 'mobile' | 'desktop';
  operator: string;
  res: express.Response;
}
const tenantDraftStreams = new Map<string, Map<string, ConnectedClient>>();

function broadcastToTenantRoom(tenantId: string, eventType: string, payload: any) {
  const room = tenantDraftStreams.get(tenantId);
  if (!room) return;
  const connectedDevices = Array.from(room.values()).map((c) => ({
    deviceId: c.deviceId,
    deviceType: c.deviceType,
    operator: c.operator,
  }));
  const dataStr = JSON.stringify({ type: eventType, payload, connectedDevices });
  room.forEach((client, key) => {
    try {
      client.res.write(`data: ${dataStr}\n\n`);
    } catch {
      room.delete(key);
    }
  });
}

app.get('/api/tenants/:id/draft/stream', (req, res) => {
  const tenantId = req.params.id;
  const deviceId = String(req.query.deviceId || `dev_${Date.now()}`);
  const deviceType = (req.query.deviceType === 'mobile' ? 'mobile' : 'desktop') as 'mobile' | 'desktop';
  const operator = String(req.query.operator || 'Operador');

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  if (!tenantDraftStreams.has(tenantId)) {
    tenantDraftStreams.set(tenantId, new Map());
  }
  const room = tenantDraftStreams.get(tenantId)!;
  room.set(deviceId, { deviceId, deviceType, operator, res });

  const currentDraft = cloudDb.getDraft(tenantId);
  const connectedDevices = Array.from(room.values()).map((c) => ({
    deviceId: c.deviceId,
    deviceType: c.deviceType,
    operator: c.operator,
  }));

  // Envia o estado inicial imediatamente ao conectar
  res.write(
    `data: ${JSON.stringify({
      type: 'draft:init',
      payload: currentDraft,
      connectedDevices,
    })}\n\n`
  );

  // Notifica outros aparelhos que este dispositivo entrou na sessão
  broadcastToTenantRoom(tenantId, 'presence:update', currentDraft);

  const heartbeat = setInterval(() => {
    try {
      res.write(`: heartbeat\n\n`);
    } catch {
      clearInterval(heartbeat);
    }
  }, 20000);

  req.on('close', () => {
    clearInterval(heartbeat);
    const r = tenantDraftStreams.get(tenantId);
    if (r) {
      r.delete(deviceId);
      broadcastToTenantRoom(tenantId, 'presence:update', cloudDb.getDraft(tenantId));
    }
  });
});

app.get('/api/tenants/:id/draft', (req, res) => {
  try {
    const tenantId = req.params.id;
    const draft = cloudDb.getDraft(tenantId);
    const room = tenantDraftStreams.get(tenantId);
    const connectedDevices = room
      ? Array.from(room.values()).map((c) => ({
          deviceId: c.deviceId,
          deviceType: c.deviceType,
          operator: c.operator,
        }))
      : [];
    res.json({ draft, connectedDevices });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/tenants/:id/draft', (req, res) => {
  try {
    const tenantId = req.params.id;
    const saved = cloudDb.saveDraft(tenantId, req.body);
    broadcastToTenantRoom(tenantId, 'draft:updated', saved);
    const room = tenantDraftStreams.get(tenantId);
    const connectedDevices = room
      ? Array.from(room.values()).map((c) => ({
          deviceId: c.deviceId,
          deviceType: c.deviceType,
          operator: c.operator,
        }))
      : [];
    res.json({ draft: saved, connectedDevices });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/tenants/:id/draft', (req, res) => {
  try {
    const tenantId = req.params.id;
    const deviceId = String(req.query.deviceId || '');
    const updatedBy = String(req.query.updatedBy || 'Operador');
    cloudDb.clearDraft(tenantId);
    broadcastToTenantRoom(tenantId, 'draft:cleared', {
      tenantId,
      deviceId,
      updatedBy,
      updatedAt: Date.now(),
    });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Operadores por Bar
app.get('/api/tenants/:id/users', (req, res) => {
  try {
    const users = cloudDb.getUsers(req.params.id);
    res.json(users);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/tenants/:id/users', (req, res) => {
  try {
    const users = req.body.users || req.body;
    if (!Array.isArray(users)) {
      return res.status(400).json({ error: 'Lista de operadores deve ser um array.' });
    }
    const saved = cloudDb.setUsers(req.params.id, users);
    res.json(saved);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/tenants/:id/users', (req, res) => {
  try {
    const { name, pin, isAdmin } = req.body;
    if (!name || !pin) return res.status(400).json({ error: 'Nome e PIN são obrigatórios' });
    const user = cloudDb.addUser(req.params.id, { name, pin, isAdmin: Boolean(isAdmin) });
    res.status(201).json(user);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/tenants/:id/users/:userId', (req, res) => {
  try {
    const updated = cloudDb.updateUser(req.params.id, Number(req.params.userId), req.body);
    if (!updated) return res.status(404).json({ error: 'Operador não encontrado' });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/tenants/:id/users/:userId', (req, res) => {
  try {
    cloudDb.deleteUser(req.params.id, Number(req.params.userId));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Cobrança & Faturamento (Asaas / Stripe / Pix)
app.get('/api/tenants/:id/billing/invoices', (req, res) => {
  try {
    const invoices = cloudDb.getInvoices(req.params.id);
    res.json(invoices);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/tenants/:id/billing/create-invoice', (req, res) => {
  try {
    const invoice = cloudDb.createInvoice(req.params.id, req.body.amount);
    res.status(201).json(invoice);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/billing/confirm-payment', (req, res) => {
  try {
    const { invoiceId } = req.body;
    if (!invoiceId) return res.status(400).json({ error: 'ID da fatura é obrigatório' });
    const result = cloudDb.confirmPayment(invoiceId);
    if (!result) return res.status(404).json({ error: 'Fatura não encontrada' });
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Painel Master (Dono do SaaS)
app.post('/api/master/login', (req, res) => {
  try {
    const { email, pin } = req.body;
    const isValid = cloudDb.verifyMasterLogin(email, pin);
    if (!isValid) {
      return res.status(401).json({ error: 'Credenciais de Dono Master inválidas' });
    }
    const owner = cloudDb.getMasterOwner();
    res.json({ success: true, token: 'master-auth-token-valid', owner });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/master/profile', (_req, res) => {
  try {
    const owner = cloudDb.getMasterOwner();
    res.json(owner);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/master/profile', (req, res) => {
  try {
    const updated = cloudDb.updateMasterOwner(req.body);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/master/stats', (_req, res) => {
  try {
    const stats = cloudDb.getMasterStats();
    res.json(stats);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Configuração do Vite em desenvolvimento ou estáticos em produção
const isProd = process.env.NODE_ENV === 'production';
if (!isProd) {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
} else {
  app.use(express.static(path.resolve(__dirname, 'dist')));
  app.get('*', (_req, res) => {
    res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Flor de Brasa Server running at http://0.0.0.0:${PORT}`);
});
