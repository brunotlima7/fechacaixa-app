import { Machine } from '../types/saas.ts';

export type VoiceAction =
  | {
      type: 'set_jclan';
      field: 'credit' | 'debit' | 'pix' | 'voucher';
      value: string;
      mode?: 'set' | 'add';
      description: string;
    }
  | {
      type: 'set_machine_array';
      machineId: number;
      modality: 'credits' | 'debits' | 'vouchers';
      index?: number; // Se omitido, preenche o próximo campo vazio (ou 0)
      voucherBrandName?: string;
      flagName?: string;
      value: string;
      mode?: 'set' | 'add';
      description: string;
    }
  | {
      type: 'set_machine_pix';
      machineId: number;
      value: string;
      mode?: 'set' | 'add';
      description: string;
    }
  | {
      type: 'clear_machine';
      machineId: number;
      description: string;
    }
  | {
      type: 'set_cash_summary';
      field: 'opening' | 'jclanCash' | 'expenses';
      value: string;
      mode?: 'set' | 'add';
      description: string;
    }
  | {
      type: 'set_cash_bill';
      field: string;
      label: string;
      quantity: string;
      description: string;
    }
  | {
      type: 'undo';
      description: string;
    };

export interface ParseVoiceContext {
  defaultMachineId?: number | null;
  creditFlags?: string[];
  debitFlags?: string[];
  voucherNames?: string[];
  pdvSystemName?: string;
  cardSystemName?: string;
  machinesCount?: number;
}

const WORD_TO_NUM: Record<string, number> = {
  zero: 0,
  um: 1,
  uma: 1,
  primeiro: 1,
  primeira: 1,
  dois: 2,
  duas: 2,
  segundo: 2,
  segunda: 2,
  tres: 3,
  terceiro: 3,
  terceira: 3,
  quatro: 4,
  quarto: 4,
  quarta: 4,
  cinco: 5,
  quinto: 5,
  quinta: 5,
  seis: 6,
  sexto: 6,
  sexta: 6,
  sete: 7,
  setimo: 7,
  setima: 7,
  oito: 8,
  oitavo: 8,
  oitava: 8,
  nove: 9,
  nono: 9,
  nona: 9,
  dez: 10,
  onze: 11,
  doze: 12,
  treze: 13,
  quatorze: 14,
  catorze: 14,
  quinze: 15,
  dezesseis: 16,
  dezessete: 17,
  dezoito: 18,
  dezenove: 19,
  vinte: 20,
  trinta: 30,
  quarenta: 40,
  cinquenta: 50,
  cincoenta: 50,
  sessenta: 60,
  setenta: 70,
  oitenta: 80,
  noventa: 90,
  cem: 100,
  cento: 100,
  duzentos: 200,
  duzentas: 200,
  trezentos: 300,
  trezentas: 300,
  quatrocentos: 400,
  quatrocentas: 400,
  quinhentos: 500,
  quinhentas: 500,
  seiscentos: 600,
  seiscentas: 600,
  setecentos: 700,
  setecentas: 700,
  oitocentos: 800,
  oitocentas: 800,
  novecentos: 900,
  novecentas: 900,
  mil: 1000,
};

const NUMBER_WORDS_SET = new Set(Object.keys(WORD_TO_NUM));

const normalizeText = (str: string): string =>
  (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/r\$/g, ' ')
    // Normalizações fonéticas para ambiente de bar com ruído
    .replace(/\b(piques|picks|pics|pis|piks|pixe|pik)\b/g, 'pix')
    .replace(/\b(jota\s*cla|jota\s*clan|j\s*clan|jotacla|jotaclan)\b/g, 'jclan')
    .replace(/\b(cred|credito|creditos)\b/g, 'credito')
    .replace(/\b(deb|debito|debitos)\b/g, 'debito')
    .replace(/\b(vales?\s+refeicao|vales?\s+alimentacao|vouchers?|vales?)\b/g, 'voucher')
    .replace(/\b(maquininhas?|maquinas?|pos)\b/g, 'maquina')
    .trim();

/**
 * Converte sequências de números por extenso em português para dígitos numéricos.
 * Suporta centenas, dezenas, unidades, milhares e centavos falados naturalmente:
 * Ex: "cento e cinquenta e dois e noventa" -> "152,90"
 * Ex: "mil duzentos e quarenta reais e cinquenta centavos" -> "1240 reais e 50 centavos"
 * Ex: "duzentos e vinte e cinco" -> "225"
 */
export function wordsToNumbersPtBr(input: string): string {
  const tokens = input.split(/(\s+)/);
  const out: string[] = [];

  // Helper que avalia uma lista de palavras numéricas (sem espaços) e retorna string numérica (ex: "152" ou "152,90")
  const evaluateNumberWords = (words: string[]): string => {
    const groups: number[] = [];
    let current = 0;
    let hasValue = false;

    for (let i = 0; i < words.length; i++) {
      const w = words[i];
      if (w === 'e') continue;
      const val = WORD_TO_NUM[w];
      if (val === undefined) continue;

      if (val === 1000) {
        current = (current === 0 ? 1 : current) * 1000;
        hasValue = true;
      } else if (val >= 100) {
        // Se já tínhamos um número completo que já possui dezena/unidade (ex: "cento e cinquenta [150] e vinte [20]"),
        // um novo grupo se inicia
        if (hasValue && (current % 100 !== 0 || current >= 1000 && current % 1000 !== 0)) {
          groups.push(current);
          current = val;
        } else {
          current += val;
          hasValue = true;
        }
      } else if (val >= 10 && val <= 90) {
        // Se current já possui dezenas ou unidades (ex: "cento e cinquenta [150] e noventa [90]" -> 150 e 90 centavos,
        // ou "oitenta e cinco [85] e cinquenta [50]" -> 85,50), separamos em novo grupo!
        if (hasValue && current % 100 !== 0) {
          groups.push(current);
          current = val;
        } else {
          current += val;
          hasValue = true;
        }
      } else {
        // val entre 0 e 9
        // Se current já possui unidade (ex: "vinte e cinco [25] e cinco [5]" ou "dez [10] e cinco [5]"), separa em novo grupo
        if (hasValue && (current % 10 !== 0 || (current % 100 >= 10 && current % 100 <= 19))) {
          groups.push(current);
          current = val;
        } else {
          current += val;
          hasValue = true;
        }
      }
    }

    if (hasValue) {
      groups.push(current);
    }

    if (groups.length === 0) return words.join(' ');
    if (groups.length === 2 && groups[0] >= 1 && groups[1] >= 1 && groups[1] <= 99) {
      // Padrão natural brasileiro: "cento e cinquenta e dois [152] e noventa [90]" -> "152,90"
      return `${groups[0]},${String(groups[1]).padStart(2, '0')}`;
    }
    return groups.map(String).join(' ');
  };

  let wordBuf: string[] = [];
  let i = 0;

  while (i < tokens.length) {
    const tok = tokens[i];
    if (/^\s+$/.test(tok)) {
      i++;
      continue;
    }

    const cleanTok = tok.replace(/[.,;!?]/g, '');
    const isNumWord = NUMBER_WORDS_SET.has(cleanTok) && !/^(primeiro|primeira|segundo|segunda|terceiro|terceira|quarto|quarta|quinto|quinta|sexto|sexta|setimo|setima|oitavo|oitava|nono|nona)$/.test(cleanTok);

    if (isNumWord) {
      wordBuf.push(cleanTok);
      i++;
      continue;
    }

    // Conector "e" entre duas palavras numéricas (ex: "cento e cinquenta")
    if (cleanTok === 'e' && wordBuf.length > 0) {
      // Olha próxima palavra não-espaço
      let nextIdx = i + 1;
      while (nextIdx < tokens.length && /^\s+$/.test(tokens[nextIdx])) nextIdx++;
      const nextClean = (tokens[nextIdx] || '').replace(/[.,;!?]/g, '');
      if (NUMBER_WORDS_SET.has(nextClean)) {
        wordBuf.push('e');
        i++;
        continue;
      }
    }

    if (wordBuf.length > 0) {
      out.push(evaluateNumberWords(wordBuf));
      wordBuf = [];
    }

    out.push(tok);
    i++;
  }

  if (wordBuf.length > 0) {
    out.push(evaluateNumberWords(wordBuf));
  }

  return out.join(' ');
}

/**
 * Converte números falados em português ("450 e 50", "cento e cinquenta e dois e noventa", "1.240,90", "150 reais e 25 centavos", "80")
 * para lista de strings monetárias formatadas no padrão brasileiro ("450,50", "152,90", "1240,90", "80,00").
 */
export function extractMonetaryValues(segment: string): string[] {
  let s = wordsToNumbersPtBr(normalizeText(segment));

  // Substitui "X reais e Y centavos" ou "X e Y centavos" por "X,Y"
  s = s.replace(
    /(\d+(?:[.,]\d{3})*)\s*(?:reais\s*)?(?:e\s*)?(\d{1,2})\s*centavos?/g,
    (_m, reais, cents) => `${reais.replace(/[.,]/g, '')},${cents.padStart(2, '0')}`
  );

  // Substitui "X virgula Y" ou "X ponto Y" por "X,Y"
  s = s.replace(/(\d+)\s*(?:virgula|ponto)\s*(\d{1,2})/g, (_m, r, c) => `${r},${c.padStart(2, '0')}`);

  // Substitui "X reais e Y" ou "X e Y" quando Y tem 1 ou 2 dígitos típicos de centavos (ex: "450 e 50", "120 reais e 90", "34 e 5")
  s = s.replace(/(\d+)\s*reais\s*e\s*(\d{1,2})\b/g, (_m, r, c) => `${r},${c.padStart(2, '0')}`);
  s = s.replace(/(\d+)\s+e\s+(\d{2})\b/g, (_m, r, c) => `${r},${c}`);

  // Remove palavras "reais", "real", "centavos", "centavo"
  s = s.replace(/\b(reais|real|centavos|centavo)\b/g, ' ');

  const matches = s.match(/\d+(?:[.,]\d+)*/g);
  if (!matches) return [];

  return matches
    .map((raw) => {
      const lastComma = raw.lastIndexOf(',');
      const lastDot = raw.lastIndexOf('.');
      let numVal = 0;

      if (lastComma !== -1 && lastDot !== -1) {
        if (lastComma > lastDot) {
          numVal = parseFloat(raw.replace(/\./g, '').replace(',', '.'));
        } else {
          numVal = parseFloat(raw.replace(/,/g, ''));
        }
      } else if (lastComma !== -1) {
        numVal = parseFloat(raw.replace(',', '.'));
      } else if (lastDot !== -1) {
        const parts = raw.split('.');
        if (parts.length === 2 && parts[1].length <= 2) {
          numVal = parseFloat(raw);
        } else {
          numVal = parseFloat(raw.replace(/\./g, ''));
        }
      } else {
        numVal = parseFloat(raw);
      }

      if (isNaN(numVal) || numVal < 0) return '';
      return numVal.toFixed(2).replace('.', ',');
    })
    .filter(Boolean);
}

function buildBrandPattern(rawName: string): string {
  const bNorm = normalizeText(rawName);
  if (!bNorm) return '';
  if (bNorm === 'visa' || bNorm === 'visa electron') return '(?:visa(?:\\s+electron)?|viza)';
  if (bNorm === 'master' || bNorm === 'mastercard' || bNorm === 'maestro') {
    return '(?:mastercard|master|maestro)';
  }
  if (bNorm === 'elo') return '(?:elo|ello|helo)';
  if (bNorm === 'amex' || bNorm === 'american express') return '(?:amex|american(?:\\s+express)?)';
  if (bNorm === 'hiper' || bNorm === 'hipercard') return '(?:hipercard|hiper)';
  if (bNorm === 'alelo') return '(?:alelo|allelo|alelu)';
  if (bNorm === 'ticket') return '(?:ticket|tiquete|tiket|tiquet)';
  if (bNorm === 'sodexo' || bNorm === 'pluxee') return '(?:sodexo|sodekso|pluxee|pluxe)';
  if (bNorm === 'vr') return '(?:vr|v\\s*r)';
  if (bNorm === 'ben') return '(?:ben|bem\\s+visa|ben\\s+visa)';
  return bNorm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Interpreta uma frase em português falada pelo operador e retorna uma lista de ações estruturadas.
 */
export function parseVoiceCommand(
  rawTranscript: string,
  context: ParseVoiceContext
): VoiceAction[] {
  const actions: VoiceAction[] = [];
  const normRaw = normalizeText(rawTranscript);
  if (!normRaw) return actions;

  // 1. Comando de Desfazer
  if (/\b(desfazer|desfaz|voltar|volta|cancelar ultimo|apagar ultimo|corrigir ultimo)\b/.test(normRaw)) {
    return [{ type: 'undo', description: 'Desfazer último comando de voz' }];
  }

  // Converte números por extenso mantendo estrutura da frase
  const norm = wordsToNumbersPtBr(normRaw);

  // Detecta se é comando aditivo ("somar 50 no pix", "mais 120 no crédito", "adicionar 80")
  const isAdditiveCommand = /\b(somar|soma|adicionar|adiciona|acrescentar|acrescenta|mais)\b/.test(normRaw);
  const actionMode: 'set' | 'add' = isAdditiveCommand ? 'add' : 'set';

  const configuredCredits = context.creditFlags || [];
  const configuredDebits = context.debitFlags || [];
  const configuredVouchers =
    context.voucherNames && context.voucherNames.length > 0
      ? context.voucherNames
      : ['Alelo', 'Ticket', 'Sodexo', 'VR', 'Ben'];

  const pdvName = context.pdvSystemName || 'Jclan';
  const pdvNorm = normalizeText(pdvName);

  // 2. Comando de limpar maquininha: "limpar máquina 2"
  const clearMatch = norm.match(
    /\b(?:limpar|zerar|apagar)\s+(?:a\s+)?maquina\s+(\d+|um|uma|dois|duas|tres|quatro|cinco|seis|sete|oito|nove)\b/
  );
  if (clearMatch) {
    const mToken = clearMatch[1];
    const mId = parseInt(mToken, 10) || WORD_TO_NUM[mToken] || 1;
    return [
      {
        type: 'clear_machine',
        machineId: mId,
        description: `Limpar Máquina #${mId}`,
      },
    ];
  }

  // 3. Contagem de Notas e Moedas na Gaveta:
  // Ex: "5 notas de 100", "doze notas de 50", "10 moedas de 1 real", "8 moedas de 50 centavos"
  const billPatterns: Array<{ regex: RegExp; field: string; label: string }> = [
    { regex: /(\d+)\s*notas?\s*(?:de)?\s*200\b/g, field: 'b200', label: 'Notas de R$ 200' },
    { regex: /(\d+)\s*notas?\s*(?:de)?\s*100\b/g, field: 'b100', label: 'Notas de R$ 100' },
    { regex: /(\d+)\s*notas?\s*(?:de)?\s*50\b/g, field: 'b50', label: 'Notas de R$ 50' },
    { regex: /(\d+)\s*notas?\s*(?:de)?\s*20\b/g, field: 'b20', label: 'Notas de R$ 20' },
    { regex: /(\d+)\s*notas?\s*(?:de)?\s*10\b/g, field: 'b10', label: 'Notas de R$ 10' },
    { regex: /(\d+)\s*notas?\s*(?:de)?\s*5\b/g, field: 'b5', label: 'Notas de R$ 5' },
    { regex: /(\d+)\s*notas?\s*(?:de)?\s*2\b/g, field: 'b2', label: 'Notas de R$ 2' },
    { regex: /(\d+)\s*moedas?\s*(?:de)?\s*(?:1\s*real|1\b|um\s*real)/g, field: 'c1', label: 'Moedas de R$ 1,00' },
    { regex: /(\d+)\s*moedas?\s*(?:de)?\s*50\b/g, field: 'c050', label: 'Moedas de R$ 0,50' },
    { regex: /(\d+)\s*moedas?\s*(?:de)?\s*25\b/g, field: 'c025', label: 'Moedas de R$ 0,25' },
    { regex: /(\d+)\s*moedas?\s*(?:de)?\s*10\b/g, field: 'c010', label: 'Moedas de R$ 0,10' },
    { regex: /(\d+)\s*moedas?\s*(?:de)?\s*(?:5\s*centavos|05\b|5\b)/g, field: 'c005', label: 'Moedas de R$ 0,05' },
  ];

  let matchedBills = false;
  for (const bp of billPatterns) {
    let match: RegExpExecArray | null;
    while ((match = bp.regex.exec(norm)) !== null) {
      matchedBills = true;
      const qtyRaw = match[1];
      const qtyNum = parseInt(qtyRaw, 10) || WORD_TO_NUM[qtyRaw] || 0;
      actions.push({
        type: 'set_cash_bill',
        field: bp.field,
        label: bp.label,
        quantity: String(qtyNum),
        description: `Gaveta: ${qtyNum}x ${bp.label}`,
      });
    }
  }
  if (matchedBills) return actions;

  // 4. Resumo da Gaveta (Abertura, Vendas Dinheiro no PDV, Sangrias/Pagamentos)
  const cashSummaryTriggers: Array<{ regex: RegExp; field: 'opening' | 'jclanCash' | 'expenses'; label: string }> = [
    {
      regex: /\b(?:abertura(?:\s+de\s+caixa)?|fundo(?:\s+de\s+caixa|\s+de\s+abertura)?|troco\s+inicial)\b([^a-z]*)/,
      field: 'opening',
      label: 'Abertura de Caixa',
    },
    {
      regex: new RegExp(`\\b(?:vendas?\\s+(?:em\\s+)?dinheiro|dinheiro\\s+(?:no\\s+)?(?:sistema|pdv|jclan|colibri|${pdvNorm})|(?:sistema|pdv|jclan|colibri|${pdvNorm})\\s+dinheiro)\\b([^a-z]*)`),
      field: 'jclanCash',
      label: `${pdvName} (Dinheiro)`,
    },
    {
      regex: /\b(?:pagamentos?|sangrias?|despesas?|retiradas?)\b([^a-z]*)/,
      field: 'expenses',
      label: 'Pagamentos / Sangrias',
    },
  ];

  for (const cs of cashSummaryTriggers) {
    const m = norm.match(cs.regex);
    if (m) {
      const afterText = norm.slice((m.index || 0) + m[0].length - (m[1]?.length || 0));
      const vals = extractMonetaryValues(afterText);
      if (vals.length > 0) {
        actions.push({
          type: 'set_cash_summary',
          field: cs.field,
          value: vals[0],
          mode: actionMode,
          description: `${cs.label}: ${actionMode === 'add' ? '+ ' : ''}R$ ${vals[0]}`,
        });
        return actions;
      }
    }
  }

  // 5. Identifica se o comando é direcionado ao PDV (Jclan / Colibri / Sistema / PDV) ou às Maquininhas
  const isPdvTarget =
    new RegExp(`\\b(jclan|colibri|totvs|zig|saipos|sistema|pdv|computador|${pdvNorm})\\b`).test(norm) &&
    !/\bmaquina\b/.test(norm);

  // Detecta número da máquina se falado ("máquina 1", "maquininha dois", "getnet 3")
  let targetMachineId = context.defaultMachineId || 1;
  let workingNorm = norm;
  const machineMatch = norm.match(
    /\b(?:maquina|getnet|cielo|stone|rede|pagbank)\s*(?:numero\s*)?(\d+|um|uma|dois|duas|tres|quatro|cinco|seis|sete|oito|nove)\b/
  );
  if (machineMatch) {
    const tok = machineMatch[1];
    targetMachineId = parseInt(tok, 10) || WORD_TO_NUM[tok] || 1;
    // Substitui o trecho "maquina X" por espaços do mesmo tamanho para que o número da máquina não seja confundido com valor monetário
    const start = machineMatch.index || 0;
    const len = machineMatch[0].length;
    workingNorm =
      workingNorm.slice(0, start) + ' '.repeat(len) + workingNorm.slice(start + len);
  }

  interface ModalityToken {
    pos: number;
    endPos: number;
    kind: 'credit' | 'debit' | 'pix' | 'voucher' | 'credit_brand' | 'debit_brand' | 'voucher_brand';
    brandIndex?: number;
    brandName?: string;
  }

  const tokens: ModalityToken[] = [];

  const findAllMatches = (
    regex: RegExp,
    kind: ModalityToken['kind'],
    brandIndex?: number,
    brandName?: string
  ) => {
    let m: RegExpExecArray | null;
    while ((m = regex.exec(workingNorm)) !== null) {
      tokens.push({
        pos: m.index,
        endPos: m.index + m[0].length,
        kind,
        brandIndex,
        brandName,
      });
    }
  };

  // Verifica combinações explícitas de Modalidade + Bandeira primeiro (ex: "crédito visa", "débito master", "débito elo")
  configuredCredits.forEach((cName, idx) => {
    const pat = buildBrandPattern(cName);
    if (!pat) return;
    findAllMatches(new RegExp(`\\b(?:credito\\s+)?${pat}\\b`, 'g'), 'credit_brand', idx, cName);
  });

  configuredDebits.forEach((dName, idx) => {
    const pat = buildBrandPattern(dName);
    if (!pat) return;
    // Se a mesma bandeira existir no crédito e débito (ex: Visa), "débito visa" casa explicitamente com debit_brand
    findAllMatches(new RegExp(`\\bdebito\\s+${pat}\\b`, 'g'), 'debit_brand', idx, dName);
  });

  configuredVouchers.forEach((vName, idx) => {
    const pat = buildBrandPattern(vName);
    if (!pat) return;
    findAllMatches(new RegExp(`\\b(?:voucher\\s+)?${pat}\\b`, 'g'), 'voucher_brand', idx, vName);
  });

  findAllMatches(/\bcredito\b/g, 'credit');
  findAllMatches(/\bdebito\b/g, 'debit');
  findAllMatches(/\bpix\b/g, 'pix');
  findAllMatches(/\bvoucher\b/g, 'voucher');

  // Ordena por posição inicial; se empatar na posição inicial, prioriza o token mais longo (ex: "debito visa" > "debito")
  tokens.sort((a, b) => a.pos - b.pos || (b.endPos - b.pos) - (a.endPos - a.pos));

  // Remove sobreposições mantendo o match mais específico
  const cleanTokens: ModalityToken[] = [];
  for (const tok of tokens) {
    if (cleanTokens.length === 0 || tok.pos >= cleanTokens[cleanTokens.length - 1].endPos) {
      cleanTokens.push(tok);
    }
  }

  // Se o operador falou "Débito: Visa 100, Master 80", os tokens de bandeira logo após "Débito" devem ir para debit_brand
  let activeParentModality: 'credit' | 'debit' | 'voucher' | null = null;
  for (let i = 0; i < cleanTokens.length; i++) {
    const tok = cleanTokens[i];
    if (tok.kind === 'credit') activeParentModality = 'credit';
    else if (tok.kind === 'debit') activeParentModality = 'debit';
    else if (tok.kind === 'voucher') activeParentModality = 'voucher';
    else if (tok.kind === 'credit_brand' && activeParentModality === 'debit') {
      // Verifica se existe essa bandeira em configuredDebits
      const debIdx = configuredDebits.findIndex(
        (d) => buildBrandPattern(d) === buildBrandPattern(tok.brandName || '')
      );
      if (debIdx !== -1) {
        tok.kind = 'debit_brand';
        tok.brandIndex = debIdx;
        tok.brandName = configuredDebits[debIdx];
      }
    }
  }

  if (cleanTokens.length > 0) {
    for (let i = 0; i < cleanTokens.length; i++) {
      const currentTok = cleanTokens[i];
      const nextTokPos = i + 1 < cleanTokens.length ? cleanTokens[i + 1].pos : workingNorm.length;
      const segmentText = workingNorm.slice(currentTok.endPos, nextTokPos);
      const values = extractMonetaryValues(segmentText);

      if (values.length === 0) continue;

      const prefixPlus = actionMode === 'add' ? '+ ' : '';

      if (isPdvTarget) {
        const pdvField =
          currentTok.kind === 'credit' || currentTok.kind === 'credit_brand'
            ? 'credit'
            : currentTok.kind === 'debit' || currentTok.kind === 'debit_brand'
            ? 'debit'
            : currentTok.kind === 'pix'
            ? 'pix'
            : 'voucher';
        const fieldLabel =
          pdvField === 'credit'
            ? 'Crédito'
            : pdvField === 'debit'
            ? 'Débito'
            : pdvField === 'pix'
            ? 'Pix'
            : 'Voucher';

        actions.push({
          type: 'set_jclan',
          field: pdvField,
          value: values[0],
          mode: actionMode,
          description: `${pdvName} ${fieldLabel}: ${prefixPlus}R$ ${values[0]}`,
        });
      } else {
        // Maquininha de Cartão
        if (currentTok.kind === 'pix') {
          actions.push({
            type: 'set_machine_pix',
            machineId: targetMachineId,
            value: values[0],
            mode: actionMode,
            description: `Máquina #${targetMachineId} • Pix: ${prefixPlus}R$ ${values[0]}`,
          });
        } else if (
          (currentTok.kind === 'voucher_brand' ||
            currentTok.kind === 'credit_brand' ||
            currentTok.kind === 'debit_brand') &&
          currentTok.brandIndex !== undefined
        ) {
          const modality =
            currentTok.kind === 'credit_brand'
              ? 'credits'
              : currentTok.kind === 'debit_brand'
              ? 'debits'
              : 'vouchers';
          const modPrefix =
            modality === 'credits' ? 'Crédito' : modality === 'debits' ? 'Débito' : 'Voucher';

          actions.push({
            type: 'set_machine_array',
            machineId: targetMachineId,
            modality,
            index: currentTok.brandIndex,
            voucherBrandName: modality === 'vouchers' ? currentTok.brandName : undefined,
            flagName: currentTok.brandName,
            value: values[0],
            mode: actionMode,
            description: `Máquina #${targetMachineId} • ${modPrefix} ${currentTok.brandName}: ${prefixPlus}R$ ${values[0]}`,
          });
        } else {
          const modality =
            currentTok.kind === 'credit'
              ? 'credits'
              : currentTok.kind === 'debit'
              ? 'debits'
              : 'vouchers';
          const modLabel =
            modality === 'credits' ? 'Crédito' : modality === 'debits' ? 'Débito' : 'Voucher';

          // Verifica se o operador especificou "campo 2" / "linha 3" ou se ditou vários valores seguidos
          const fieldIdxMatch = segmentText.match(/\b(?:campo|linha|item)\s*(\d+|um|dois|tres|quatro|cinco)\b/);
          let explicitIdx: number | undefined = undefined;
          let valsToUse = values;

          if (fieldIdxMatch && values.length > 1) {
            const fTok = fieldIdxMatch[1];
            const fNum = parseInt(fTok, 10) || WORD_TO_NUM[fTok] || 1;
            explicitIdx = Math.max(0, fNum - 1);
            valsToUse = values.slice(1);
          }

          valsToUse.forEach((val, vOffset) => {
            actions.push({
              type: 'set_machine_array',
              machineId: targetMachineId,
              modality,
              index: explicitIdx !== undefined ? explicitIdx + vOffset : undefined,
              value: val,
              mode: actionMode,
              description: `Máquina #${targetMachineId} • ${modLabel}: ${prefixPlus}R$ ${val}`,
            });
          });
        }
      }
    }
  }

  return actions;
}

export interface ShiftSnapshot {
  jclan: { credit: string; debit: string; pix: string; voucher: string };
  machines: Machine[];
  cash: Record<string, string>;
  cashSummary: { opening: string; jclanCash: string; expenses: string };
}
