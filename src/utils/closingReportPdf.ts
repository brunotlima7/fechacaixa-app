import { jsPDF } from 'jspdf';
import { Tenant, AuditLogEntry } from '../types/saas.ts';

export interface ClosingPdfMachineItem {
  id: number;
  credits: string[];
  debits: string[];
  vouchers: string[];
  pix: string;
}

export interface ClosingPdfData {
  tenant: Tenant;
  operatorName: string;
  referenceDate?: string;
  shiftDurationFormatted?: string;
  shiftStartedAt?: string;
  // Totais Cartões e PDV
  getnetCredit: number;
  getnetDebit: number;
  getnetPix: number;
  getnetVoucher: number;
  getnetTotal: number;
  jclanCredit: number;
  jclanDebit: number;
  jclanPix: number;
  jclanVoucher: number;
  jclanTotal: number;
  differenceTotal: number;
  // Detalhamento por Bandeira (se configurado)
  creditBreakdown?: Array<{ name: string; amount: number }>;
  debitBreakdown?: Array<{ name: string; amount: number }>;
  voucherBreakdown?: Array<{ name: string; amount: number }>;
  // Gaveta / Dinheiro
  cashTotal: number;
  expectedCash: number;
  cashDifference: number;
  cashOpening: number;
  cashPdvSales: number;
  cashExpenses: number;
  cashCounts?: Record<string, string>;
  // Maquininhas individuais
  machines?: ClosingPdfMachineItem[];
  // Conciliação e Ajustes
  instructions?: Array<{ from: string; to: string; amount: number }>;
  selectedExclusionOptions?: Record<
    string,
    { title: string; instruction: string; diff: number }
  >;
  comments?: string;
  auditLogs?: AuditLogEntry[];
  rawReportText?: string;
}

const formatBRL = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value || 0);
};

const parseCurrencyStr = (val: string | number | undefined | null): number => {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : Math.round(val * 100) / 100;
  const str = val.toString().trim().replace(/[^\d.,-]/g, '');
  if (!str) return 0;
  const normalized =
    str.lastIndexOf(',') > str.lastIndexOf('.')
      ? str.replace(/\./g, '').replace(',', '.')
      : str.replace(/,/g, '');
  const parsed = parseFloat(normalized);
  return isNaN(parsed) ? 0 : Math.round(parsed * 100) / 100;
};

const sumStrArray = (arr: string[] = []): number => {
  const cents = arr.reduce((acc, c) => acc + Math.round(parseCurrencyStr(c) * 100), 0);
  return cents / 100;
};

// Remove emojis e símbolos fora do Latin-1 básico para evitar caracteres quebrados na fonte padrão do jsPDF
const sanitizePdfText = (text: string): string => {
  if (!text) return '';
  return text
    .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{2B50}\u{2728}\u{2705}\u{274C}\u{26A0}\u{FE0F}]/gu, '')
    .replace(/[↳•]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
};

export const generateClosingReportPdf = (data: ClosingPdfData): string => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let y = 0;

  const pdvName = data.tenant.pdvSystemName || 'PDV';
  const cardName = data.tenant.cardSystemName || 'Maquininhas';
  const now = new Date();
  const refDateStr =
    data.referenceDate ||
    `${now.toLocaleDateString('pt-BR')} ${now.toLocaleTimeString('pt-BR').slice(0, 5)}`;
  const protocolCode = `FC-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(
    now.getDate()
  ).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;

  const ensureSpace = (neededMm: number) => {
    if (y + neededMm > pageHeight - 20) {
      doc.addPage();
      y = 18;
    }
  };

  // =========================================================================
  // 1. CABEÇALHO CORPORATIVO (DARK NAVY BANNER)
  // =========================================================================
  doc.setFillColor(15, 23, 42); // Slate-900
  doc.rect(0, 0, pageWidth, 38, 'F');

  // Faixa de destaque superior Laranja/Esmeralda
  const isAllBalanced =
    Math.abs(data.differenceTotal) < 0.01 && Math.abs(data.cashDifference) < 0.01;
  if (isAllBalanced) {
    doc.setFillColor(16, 185, 129); // Emerald-500
  } else {
    doc.setFillColor(234, 88, 12); // Orange-600
  }
  doc.rect(0, 0, pageWidth, 2.5, 'F');

  // Título Principal
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('RELATORIO DE FECHAMENTO E CONCILIACAO DE CAIXA', margin, 13);

  // Subtítulo com Nome do Bar e CNPJ/Cidade
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(203, 213, 225);
  const barInfoParts = [
    sanitizePdfText(data.tenant.name),
    data.tenant.cnpj ? `CNPJ: ${data.tenant.cnpj}` : '',
    data.tenant.city ? sanitizePdfText(data.tenant.city) : '',
  ].filter(Boolean);
  doc.text(barInfoParts.join('  |  '), margin, 20);

  // Metadados do Turno no Cabeçalho
  doc.setFontSize(8.5);
  doc.setTextColor(148, 163, 184);
  const metaLine = [
    `Data/Turno: ${refDateStr}`,
    `Operador(a): ${(data.operatorName || 'Operador').toUpperCase()}`,
    data.shiftDurationFormatted ? `Tempo de Fechamento: ${data.shiftDurationFormatted}` : '',
    `Protocolo: ${protocolCode}`,
  ]
    .filter(Boolean)
    .join('   |   ');
  doc.text(metaLine, margin, 27);

  // Badge de Status Geral no canto superior direito
  const badgeText = isAllBalanced ? 'CAIXA 100% CONCILIADO' : 'FECHAMENTO COM AJUSTE / DIVERGENCIA';
  const badgeWidth = isAllBalanced ? 48 : 66;
  const badgeX = pageWidth - margin - badgeWidth;
  if (isAllBalanced) {
    doc.setFillColor(6, 95, 70);
  } else {
    doc.setFillColor(154, 52, 18);
  }
  doc.roundedRect(badgeX, 8, badgeWidth, 7, 1.5, 1.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text(badgeText, badgeX + badgeWidth / 2, 12.7, { align: 'center' });

  y = 45;

  // =========================================================================
  // 2. QUADRO EXECUTIVO (RESUMO DE CARTÕES E GAVETA)
  // =========================================================================
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('1. RESUMO EXECUTIVO DO TURNO', margin, y);
  y += 4;

  const boxWidth = (contentWidth - 4) / 2;
  const boxHeight = 26;

  // Card Esquerdo: Cartões + Pix
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, y, boxWidth, boxHeight, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 64, 175);
  doc.text(`CONFERENCIA DE CARTOES (${cardName.toUpperCase()} x ${pdvName.toUpperCase()})`, margin + 4, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Total ${cardName}:`, margin + 4, y + 12);
  doc.text(`Total ${pdvName}:`, margin + 4, y + 17);
  doc.text('Diferenca Cartoes:', margin + 4, y + 22.5);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(formatBRL(data.getnetTotal), margin + boxWidth - 4, y + 12, { align: 'right' });
  doc.text(formatBRL(data.jclanTotal), margin + boxWidth - 4, y + 17, { align: 'right' });

  const cardDiffStatus =
    Math.abs(data.differenceTotal) < 0.01
      ? '(Batendo 100%)'
      : data.differenceTotal > 0
      ? '(Sobra)'
      : '(Falta)';
  if (Math.abs(data.differenceTotal) < 0.01) {
    doc.setTextColor(5, 150, 105);
  } else if (data.differenceTotal > 0) {
    doc.setTextColor(217, 119, 6);
  } else {
    doc.setTextColor(220, 38, 38);
  }
  doc.text(`${formatBRL(data.differenceTotal)} ${cardDiffStatus}`, margin + boxWidth - 4, y + 22.5, {
    align: 'right',
  });

  // Card Direito: Gaveta (Dinheiro Físico)
  const rightBoxX = margin + boxWidth + 4;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(rightBoxX, y, boxWidth, boxHeight, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(4, 120, 87);
  doc.text('CONFERENCIA DA GAVETA (DINHEIRO FISICO)', rightBoxX + 4, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Fisico Contado na Gaveta:', rightBoxX + 4, y + 12);
  doc.text('Saldo Esperado em Caixa:', rightBoxX + 4, y + 17);
  doc.text('Diferenca Gaveta:', rightBoxX + 4, y + 22.5);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(formatBRL(data.cashTotal), rightBoxX + boxWidth - 4, y + 12, { align: 'right' });
  doc.text(formatBRL(data.expectedCash), rightBoxX + boxWidth - 4, y + 17, { align: 'right' });

  const cashDiffStatus =
    Math.abs(data.cashDifference) < 0.01
      ? '(Batendo 100%)'
      : data.cashDifference > 0
      ? '(Sobra)'
      : '(Falta)';
  if (Math.abs(data.cashDifference) < 0.01) {
    doc.setTextColor(5, 150, 105);
  } else if (data.cashDifference > 0) {
    doc.setTextColor(217, 119, 6);
  } else {
    doc.setTextColor(220, 38, 38);
  }
  doc.text(`${formatBRL(data.cashDifference)} ${cashDiffStatus}`, rightBoxX + boxWidth - 4, y + 22.5, {
    align: 'right',
  });

  y += boxHeight + 8;

  // =========================================================================
  // 3. TABELA DE CONCILIAÇÃO POR MODALIDADE (CRÉDITO, DÉBITO, PIX, VOUCHER)
  // =========================================================================
  ensureSpace(50);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(`2. DETALHAMENTO POR MODALIDADE (${cardName.toUpperCase()} vs ${pdvName.toUpperCase()})`, margin, y);
  y += 3.5;

  // Cabeçalho da Tabela
  doc.setFillColor(30, 41, 59);
  doc.rect(margin, y, contentWidth, 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');

  const colModX = margin + 3;
  const colCardX = margin + 78;
  const colPdvX = margin + 116;
  const colDiffX = margin + 152;
  const colStatusX = margin + contentWidth - 3;

  doc.text('MODALIDADE / BANDEIRA', colModX, y + 4.8);
  doc.text(cardName.toUpperCase(), colCardX, y + 4.8, { align: 'right' });
  doc.text(pdvName.toUpperCase(), colPdvX, y + 4.8, { align: 'right' });
  doc.text('DIFERENCA', colDiffX, y + 4.8, { align: 'right' });
  doc.text('STATUS', colStatusX, y + 4.8, { align: 'right' });
  y += 7;

  const modalities = [
    {
      label: 'Credito',
      card: data.getnetCredit,
      pdv: data.jclanCredit,
      breakdown: data.creditBreakdown || [],
    },
    {
      label: 'Debito',
      card: data.getnetDebit,
      pdv: data.jclanDebit,
      breakdown: data.debitBreakdown || [],
    },
    {
      label: 'Pix (Maquininha)',
      card: data.getnetPix,
      pdv: data.jclanPix,
      breakdown: [],
    },
    {
      label: 'Voucher / Refeicao',
      card: data.getnetVoucher,
      pdv: data.jclanVoucher,
      breakdown: data.voucherBreakdown || [],
    },
  ];

  modalities.forEach((mod, idx) => {
    ensureSpace(10);
    const diff = Math.round((mod.card - mod.pdv) * 100) / 100;
    const isRowEven = idx % 2 === 0;
    doc.setFillColor(isRowEven ? 255 : 248, isRowEven ? 255 : 250, isRowEven ? 255 : 252);
    doc.setDrawColor(226, 232, 240);
    doc.rect(margin, y, contentWidth, 6.8, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(mod.label, colModX, y + 4.7);

    doc.setFont('helvetica', 'normal');
    doc.text(formatBRL(mod.card), colCardX, y + 4.7, { align: 'right' });
    doc.text(formatBRL(mod.pdv), colPdvX, y + 4.7, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    if (Math.abs(diff) < 0.01) {
      doc.setTextColor(5, 150, 105);
      doc.text(formatBRL(0), colDiffX, y + 4.7, { align: 'right' });
      doc.text('OK (100%)', colStatusX, y + 4.7, { align: 'right' });
    } else if (diff > 0) {
      doc.setTextColor(217, 119, 6);
      doc.text(`+${formatBRL(diff)}`, colDiffX, y + 4.7, { align: 'right' });
      doc.text('SOBRA', colStatusX, y + 4.7, { align: 'right' });
    } else {
      doc.setTextColor(220, 38, 38);
      doc.text(formatBRL(diff), colDiffX, y + 4.7, { align: 'right' });
      doc.text('FALTA', colStatusX, y + 4.7, { align: 'right' });
    }
    y += 6.8;

    // Sub-linhas por bandeira caso existam valores > 0
    const activeFlags = mod.breakdown.filter((b) => b.amount > 0);
    activeFlags.forEach((flag) => {
      ensureSpace(6);
      doc.setFillColor(241, 245, 249);
      doc.setDrawColor(226, 232, 240);
      doc.rect(margin, y, contentWidth, 5.5, 'FD');
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      doc.text(`   - Bandeira ${sanitizePdfText(flag.name)}`, colModX, y + 3.9);
      doc.setFont('helvetica', 'bold');
      doc.text(formatBRL(flag.amount), colCardX, y + 3.9, { align: 'right' });
      y += 5.5;
    });
  });

  // Linha de Total Geral de Cartões
  ensureSpace(8);
  doc.setFillColor(226, 232, 240);
  doc.rect(margin, y, contentWidth, 7.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('TOTAL GERAL DE CARTOES + PIX', colModX, y + 5.1);
  doc.text(formatBRL(data.getnetTotal), colCardX, y + 5.1, { align: 'right' });
  doc.text(formatBRL(data.jclanTotal), colPdvX, y + 5.1, { align: 'right' });

  if (Math.abs(data.differenceTotal) < 0.01) {
    doc.setTextColor(5, 150, 105);
    doc.text(formatBRL(0), colDiffX, y + 5.1, { align: 'right' });
    doc.text('BATENDO 100%', colStatusX, y + 5.1, { align: 'right' });
  } else if (data.differenceTotal > 0) {
    doc.setTextColor(217, 119, 6);
    doc.text(`+${formatBRL(data.differenceTotal)}`, colDiffX, y + 5.1, { align: 'right' });
    doc.text('SOBRA', colStatusX, y + 5.1, { align: 'right' });
  } else {
    doc.setTextColor(220, 38, 38);
    doc.text(formatBRL(data.differenceTotal), colDiffX, y + 5.1, { align: 'right' });
    doc.text('FALTA', colStatusX, y + 5.1, { align: 'right' });
  }
  y += 12;

  // =========================================================================
  // 4. COMPOSIÇÃO DA GAVETA (ABERTURA, VENDAS EM DINHEIRO, SANGRIAS & CÉDULAS)
  // =========================================================================
  ensureSpace(32);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('3. DEMONSTRATIVO FINANCEIRO DA GAVETA (ESPECIE)', margin, y);
  y += 3.5;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, y, contentWidth, 20, 1.5, 1.5, 'FD');

  const fourthW = contentWidth / 4;
  const cashMetrics = [
    { label: '(+) Abertura / Troco', val: formatBRL(data.cashOpening), color: [15, 23, 42] },
    { label: `(+) Dinheiro ${pdvName}`, val: formatBRL(data.cashPdvSales), color: [15, 23, 42] },
    { label: '(-) Sangrias / Despesas', val: formatBRL(data.cashExpenses), color: [220, 38, 38] },
    { label: '(=) Caixa Esperado', val: formatBRL(data.expectedCash), color: [4, 120, 87] },
  ];

  cashMetrics.forEach((cm, i) => {
    const cellX = margin + i * fourthW + 4;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(cm.label, cellX, y + 6.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(cm.color[0], cm.color[1], cm.color[2]);
    doc.text(cm.val, cellX, y + 13);
  });

  // Se houver contagem de notas/moedas, lista na linha inferior da caixa
  if (data.cashCounts) {
    const denomMap: Array<{ key: string; label: string }> = [
      { key: 'b200', label: 'R$200' },
      { key: 'b100', label: 'R$100' },
      { key: 'b50', label: 'R$50' },
      { key: 'b20', label: 'R$20' },
      { key: 'b10', label: 'R$10' },
      { key: 'b5', label: 'R$5' },
      { key: 'b2', label: 'R$2' },
      { key: 'c1', label: 'R$1' },
      { key: 'c050', label: 'R$0,50' },
      { key: 'c025', label: 'R$0,25' },
      { key: 'c010', label: 'R$0,10' },
      { key: 'c005', label: 'R$0,05' },
    ];
    const countedItems = denomMap
      .map((d) => ({ label: d.label, qty: parseInt(data.cashCounts?.[d.key] || '0', 10) || 0 }))
      .filter((d) => d.qty > 0)
      .map((d) => `${d.qty}x ${d.label}`);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    const billsLine =
      countedItems.length > 0
        ? `Contagem fisica de cedulas/moedas: ${countedItems.join('  |  ')}`
        : 'Contagem detalhada por cedula nao informada.';
    doc.text(billsLine, margin + 4, y + 18, { maxWidth: contentWidth - 8 });
  }

  y += 25;

  // =========================================================================
  // 5. DETALHAMENTO INDIVIDUAL POR MAQUININHA (APENAS MÁQUINAS COM MOVIMENTO)
  // =========================================================================
  const activeMachines = (data.machines || [])
    .map((m) => {
      const cred = sumStrArray(m.credits);
      const deb = sumStrArray(m.debits);
      const vouc = sumStrArray(m.vouchers);
      const px = parseCurrencyStr(m.pix);
      const tot = Math.round((cred + deb + vouc + px) * 100) / 100;
      return { id: m.id, cred, deb, vouc, px, tot };
    })
    .filter((m) => m.tot > 0);

  if (activeMachines.length > 0) {
    ensureSpace(25);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(`4. APURACAO INDIVIDUAL POR MAQUININHA (${activeMachines.length} ATIVA[S])`, margin, y);
    y += 3.5;

    doc.setFillColor(51, 65, 85);
    doc.rect(margin, y, contentWidth, 6.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7.5);
    doc.text('MAQUININHA', margin + 3, y + 4.5);
    doc.text('CREDITO', margin + 55, y + 4.5, { align: 'right' });
    doc.text('DEBITO', margin + 90, y + 4.5, { align: 'right' });
    doc.text('VOUCHER', margin + 125, y + 4.5, { align: 'right' });
    doc.text('PIX', margin + 155, y + 4.5, { align: 'right' });
    doc.text('SUBTOTAL', margin + contentWidth - 3, y + 4.5, { align: 'right' });
    y += 6.5;

    activeMachines.forEach((m, idx) => {
      ensureSpace(6.5);
      const isEven = idx % 2 === 0;
      doc.setFillColor(isEven ? 255 : 248, isEven ? 255 : 250, isEven ? 255 : 252);
      doc.setDrawColor(226, 232, 240);
      doc.rect(margin, y, contentWidth, 6, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text(`Maquina #${String(m.id).padStart(2, '0')}`, margin + 3, y + 4.2);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      doc.text(formatBRL(m.cred), margin + 55, y + 4.2, { align: 'right' });
      doc.text(formatBRL(m.deb), margin + 90, y + 4.2, { align: 'right' });
      doc.text(formatBRL(m.vouc), margin + 125, y + 4.2, { align: 'right' });
      doc.text(formatBRL(m.px), margin + 155, y + 4.2, { align: 'right' });

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 64, 175);
      doc.text(formatBRL(m.tot), margin + contentWidth - 3, y + 4.2, { align: 'right' });
      y += 6;
    });

    y += 6;
  }

  // =========================================================================
  // 6. AJUSTES, TRANSFERÊNCIAS E OPÇÕES DE ZERAMENTO APLICADAS NO PDV
  // =========================================================================
  const instructions = data.instructions || [];
  const exclusionEntries = Object.entries(data.selectedExclusionOptions || {});

  if (instructions.length > 0 || exclusionEntries.length > 0) {
    ensureSpace(26);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(`5. CONCILIACAO E LANCAMENTOS DE AJUSTE NO ${pdvName.toUpperCase()}`, margin, y);
    y += 4;

    if (instructions.length > 0) {
      instructions.forEach((inst, i) => {
        ensureSpace(7);
        doc.setFillColor(240, 249, 255);
        doc.setDrawColor(186, 230, 253);
        doc.roundedRect(margin, y, contentWidth, 6.5, 1, 1, 'FD');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(3, 105, 161);
        doc.text(
          `${i + 1}. Transferencia de Forma de Pagamento: Alterar ${formatBRL(inst.amount)} de [${sanitizePdfText(
            inst.from
          )}] para [${sanitizePdfText(inst.to)}]`,
          margin + 3,
          y + 4.4
        );
        y += 8;
      });
    }

    if (exclusionEntries.length > 0) {
      exclusionEntries.forEach(([label, opt]) => {
        const cleanInstruction = sanitizePdfText(opt.instruction);
        const splitLines = doc.splitTextToSize(cleanInstruction, contentWidth - 8);
        const cardH = 10 + splitLines.length * 4;
        ensureSpace(cardH + 3);

        doc.setFillColor(240, 253, 244);
        doc.setDrawColor(167, 243, 208);
        doc.roundedRect(margin, y, contentWidth, cardH, 1.5, 1.5, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(6, 95, 70);
        doc.text(
          `[${sanitizePdfText(label).toUpperCase()}] ${sanitizePdfText(opt.title)} (Ajuste/Desc: ${formatBRL(opt.diff)})`,
          margin + 3,
          y + 5.2
        );

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(30, 41, 59);
        doc.text(splitLines, margin + 3, y + 10);

        y += cardH + 2.5;
      });
    }
    y += 3;
  }

  // =========================================================================
  // 7. OBSERVAÇÕES DO OPERADOR E ASSINATURAS DE CONFERÊNCIA
  // =========================================================================
  if (data.comments && data.comments.trim()) {
    const cleanComments = sanitizePdfText(data.comments);
    const commentLines = doc.splitTextToSize(cleanComments, contentWidth - 8);
    const obsHeight = 10 + commentLines.length * 4.2;
    ensureSpace(obsHeight + 6);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text('OBSERVACOES DO OPERADOR:', margin, y);
    y += 3;

    doc.setFillColor(254, 252, 232);
    doc.setDrawColor(253, 224, 71);
    doc.roundedRect(margin, y, contentWidth, obsHeight - 3, 1.5, 1.5, 'FD');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    doc.text(commentLines, margin + 3.5, y + 5.5);
    y += obsHeight + 3;
  }

  // Bloco de Assinaturas Físicas
  ensureSpace(30);
  y += 12;
  const sigLineWidth = 72;
  const leftSigX = margin + 8;
  const rightSigX = pageWidth - margin - sigLineWidth - 8;

  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.35);
  doc.line(leftSigX, y, leftSigX + sigLineWidth, y);
  doc.line(rightSigX, y, rightSigX + sigLineWidth, y);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text(
    `OPERADOR(A): ${(data.operatorName || 'OPERADOR').toUpperCase()}`,
    leftSigX + sigLineWidth / 2,
    y + 4.5,
    { align: 'center' }
  );
  doc.text('GERENCIA / CONFERENTE DE CAIXA', rightSigX + sigLineWidth / 2, y + 4.5, {
    align: 'center',
  });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('Responsavel pela contagem e fechamento', leftSigX + sigLineWidth / 2, y + 8.5, {
    align: 'center',
  });
  doc.text('Visto de auditoria e recebimento do malote', rightSigX + sigLineWidth / 2, y + 8.5, {
    align: 'center',
  });

  // =========================================================================
  // 8. RODAPÉ EM TODAS AS PÁGINAS
  // =========================================================================
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `FechaCaixa SaaS - Documento Oficial de Conciliacao • ${sanitizePdfText(data.tenant.name)} • Emitido em ${refDateStr}`,
      margin,
      pageHeight - 7.5
    );
    doc.text(`Pagina ${p} de ${totalPages}`, pageWidth - margin, pageHeight - 7.5, {
      align: 'right',
    });
  }

  const safeSlug = (data.tenant.slug || data.tenant.name || 'caixa')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_');
  const datePart = refDateStr.slice(0, 10).replace(/\//g, '-');
  const filename = `fechamento_caixa_${safeSlug}_${datePart}.pdf`;

  doc.save(filename);
  return filename;
};
