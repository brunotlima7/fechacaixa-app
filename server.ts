import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

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

// Helper de chamada Gemini com tentativas automáticas em caso de picos de tráfego (503 / alta demanda temporária)
async function callGeminiWithFallback(ai: GoogleGenAI, params: any) {
  const model = params.model || 'gemini-3.8-flash';
  let lastError: any = null;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      return await ai.models.generateContent({
        ...params,
        model,
      });
    } catch (err: any) {
      lastError = err;
      const isOverload =
        err?.message?.includes('503') ||
        err?.message?.includes('high demand') ||
        err?.message?.includes('UNAVAILABLE') ||
        err?.message?.includes('RESOURCE_EXHAUSTED');

      if (isOverload && attempt < 3) {
        console.warn(`Tentativa ${attempt} ao chamar Gemini 3.8 Flash atingiu alta demanda temporária. Retentando em breve...`);
        await new Promise((r) => setTimeout(r, attempt * 1200));
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

// Healthcheck
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    hasServerGeminiKey: Boolean(process.env.GEMINI_API_KEY),
  });
});

// OCR para uma única maquininha
app.post('/api/ocr', async (req, res) => {
  try {
    const { imageBase64, mimeType, customApiKey } = req.body;
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
            text: `Analise este comprovante impresso de fechamento/relatório de maquininha de cartão (Getnet, Cielo, Stone, etc.).
Extraia com precisão os valores monetários faturados por modalidade.
Retorne EXCLUSIVAMENTE um objeto JSON válido com a seguinte estrutura:
{
  "credits": ["15,50", "20,00"],
  "debits": ["10,00"],
  "vouchers": [],
  "pix": "0,00"
}
Se uma modalidade não tiver lançamento, deixe o array vazio ou string vazia. Não inclua texto antes ou depois do JSON.`,
          },
        ],
      },
      config: {
        responseMimeType: 'application/json',
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

// OCR em lote para múltiplas maquininhas (até 6 imagens)
app.post('/api/ocr-multi', async (req, res) => {
  try {
    const { images, customApiKey } = req.body;
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

    const parts: Array<{ inlineData?: { mimeType: string; data: string }; text?: string }> = images.map((img: { base64: string; mimeType?: string }) => ({
      inlineData: {
        mimeType: img.mimeType || 'image/jpeg',
        data: img.base64,
      },
    }));

    parts.push({
      text: `Analise estas imagens de comprovantes de fechamento de maquininhas de cartão.
Para CADA comprovante/maquininha distinta nas imagens, extraia os totais faturados em ordem.
Retorne EXCLUSIVAMENTE um array JSON contendo um objeto para cada maquininha:
[
  {
    "credits": ["15,50"],
    "debits": ["20,00"],
    "vouchers": [],
    "pix": "5,00"
  }
]
Não inclua texto adicional.`,
    });

    const response = await callGeminiWithFallback(ai, {
      model: 'gemini-3.8-flash',
      contents: { parts },
      config: {
        responseMimeType: 'application/json',
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
        responseMimeType: 'application/json',
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

// Leitura e Extração de Cardápio a partir de Texto extraído no cliente (Elimina erro HTTP 413)
app.post('/api/parse-menu-text', async (req, res) => {
  try {
    const { menuText, customApiKey } = req.body;
    const apiKey = customApiKey || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(400).json({
        error: 'Chave do Gemini não configurada. Defina na aba IA Gemini da administração ou no servidor.',
      });
    }

    if (!menuText || !menuText.trim()) {
      return res.status(400).json({ error: 'Nenhum texto de cardápio foi enviado.' });
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
5. Não invente itens. Extraia apenas o que constar no texto.

Retorne EXCLUSIVAMENTE um array JSON de objetos:
[
  { "name": "Chopp Brahma (Happy Hour)", "price": 11.90, "cat": "Happy Hour", "isPromo": true },
  { "name": "Batata Frita", "price": 34.90, "cat": "Petiscos", "isPromo": false }
]
Nenhum texto antes ou depois do JSON.`,
      config: {
        responseMimeType: 'application/json',
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
        responseMimeType: 'application/json',
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

app.put('/api/tenants/:id', (req, res) => {
  try {
    const updated = cloudDb.updateTenant(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Bar não encontrado' });
    res.json(updated);
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

app.delete('/api/tenants/:id/closings/:closingId', (req, res) => {
  try {
    const success = cloudDb.deleteClosing(req.params.id, Number(req.params.closingId));
    res.json({ success });
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
