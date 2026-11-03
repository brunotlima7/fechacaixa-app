import React, { useState, useMemo } from 'react';
import {
  X,
  FileText,
  Download,
  Printer,
  Copy,
  Check,
  AlertTriangle,
  Building2,
  Calendar,
  Clock,
  User,
  ShieldAlert,
  Send,
  MessageSquare,
  HelpCircle,
  Hash,
  Layers,
  ArrowRight
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { Tenant, TenantUser, Machine, AuditLogEntry } from '../../types/saas.ts';
import { formatCurrency, sumArray, parseValue } from '../../App.tsx';

interface SupportDivergenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenant: Tenant;
  currentOperator: TenantUser | null;
  machines: Machine[];
  jclan: Record<'credit' | 'debit' | 'pix' | 'voucher', string>;
  getnetCredit: number;
  getnetDebit: number;
  getnetVoucher: number;
  getnetPix: number;
  getnetTotal: number;
  jclanTotal: number;
  differenceTotal: number;
  cashDifference: number;
  cashTotal: number;
  expectedCash: number;
  instructions: Array<{ from: string; to: string; amount: number }>;
  unresolvable: Array<{ type: 'sobra' | 'falta'; label: string; amount: number }>;
  auditLogs: AuditLogEntry[];
  onShowToast: (msg: string) => void;
}

export const SupportDivergenceModal: React.FC<SupportDivergenceModalProps> = ({
  isOpen,
  onClose,
  tenant,
  currentOperator,
  machines,
  jclan,
  getnetCredit,
  getnetDebit,
  getnetVoucher,
  getnetPix,
  getnetTotal,
  jclanTotal,
  differenceTotal,
  cashDifference,
  cashTotal,
  expectedCash,
  instructions,
  unresolvable,
  auditLogs,
  onShowToast,
}) => {
  if (!isOpen) return null;

  const cardName = tenant.cardSystemName || 'Getnet';
  const pdvName = tenant.pdvSystemName || 'Jclan';

  // Opção de Destino do Chamado
  const [targetSupport, setTargetSupport] = useState<'jclan' | 'getnet' | 'ambos'>('ambos');
  const [operatorNotes, setOperatorNotes] = useState('');
  const [terminalId, setTerminalId] = useState('');
  const [posSerial, setPosSerial] = useState('');
  const [urgencyLevel, setUrgencyLevel] = useState<'alta' | 'media' | 'baixa'>('alta');
  const [isCopied, setIsCopied] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Gera número único de protocolo estável
  const protocolNumber = useMemo(() => {
    const d = new Date();
    const datePart = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    const randPart = Math.floor(1000 + Math.random() * 9000);
    const tenantSlug = tenant.name.replace(/[^A-Za-z0-9]/g, '').slice(0, 4).toUpperCase() || 'LOJA';
    return `CH-${datePart}-${tenantSlug}-${randPart}`;
  }, [tenant.name]);

  const reportDate = useMemo(() => new Date().toLocaleDateString('pt-BR'), []);
  const reportTime = useMemo(() => new Date().toLocaleTimeString('pt-BR').slice(0, 5), []);

  const jclanCreditVal = parseValue(jclan.credit);
  const jclanDebitVal = parseValue(jclan.debit);
  const jclanPixVal = parseValue(jclan.pix);
  const jclanVoucherVal = parseValue(jclan.voucher);

  // Modalidades com divergência
  const modalDivergences = useMemo(() => [
    {
      name: 'Crédito',
      cardVal: getnetCredit,
      pdvVal: jclanCreditVal,
      diff: getnetCredit - jclanCreditVal,
    },
    {
      name: 'Débito',
      cardVal: getnetDebit,
      pdvVal: jclanDebitVal,
      diff: getnetDebit - jclanDebitVal,
    },
    {
      name: 'Pix',
      cardVal: getnetPix,
      pdvVal: jclanPixVal,
      diff: getnetPix - jclanPixVal,
    },
    {
      name: 'Voucher',
      cardVal: getnetVoucher,
      pdvVal: jclanVoucherVal,
      diff: getnetVoucher - jclanVoucherVal,
    },
  ], [getnetCredit, jclanCreditVal, getnetDebit, jclanDebitVal, getnetPix, jclanPixVal, getnetVoucher, jclanVoucherVal]);

  const onlyDivergentModals = useMemo(
    () => modalDivergences.filter((m) => Math.abs(m.diff) >= 0.01),
    [modalDivergences]
  );

  // Formata texto estruturado para cópia em WhatsApp ou abertura de Ticket
  const generateSupportTicketText = () => {
    const targetLabel =
      targetSupport === 'jclan'
        ? `SUPORTE TÉCNICO ${pdvName.toUpperCase()}`
        : targetSupport === 'getnet'
        ? `SUPORTE TÉCNICO ${cardName.toUpperCase()}`
        : `CONFRONTO TÉCNICO (${cardName.toUpperCase()} x ${pdvName.toUpperCase()})`;

    let t = `🚨 *LAUDO DE DIVERGÊNCIA DE FECHAMENTO DE CAIXA*\n`;
    t += `📌 *Destinatário:* ${targetLabel}\n`;
    t += `📋 *Protocolo do Chamado:* ${protocolNumber}\n`;
    t += `🏢 *Estabelecimento:* ${tenant.name} (${tenant.city || 'Matriz'})\n`;
    t += `📅 *Data do Turno:* ${reportDate} às ${reportTime}\n`;
    t += `👤 *Operador Responsável:* ${currentOperator?.name?.toUpperCase() || 'OPERADOR'}\n`;
    t += `⚠️ *Prioridade:* ${urgencyLevel.toUpperCase()}\n`;
    if (terminalId.trim()) t += `📟 *Terminal / Lógica:* ${terminalId}\n`;
    if (posSerial.trim()) t += `🔢 *Nº de Série POS:* ${posSerial}\n`;
    t += `\n───────────────────────────────\n`;
    t += `💰 *RESUMO GERAL DAS DIVERGÊNCIAS:*\n`;
    t += `• Total Maquininhas (${cardName}): ${formatCurrency(getnetTotal)}\n`;
    t += `• Total Sistema PDV (${pdvName}): ${formatCurrency(jclanTotal)}\n`;
    t += `• Diferença Líquida: *${formatCurrency(differenceTotal)}* (${
      Math.abs(differenceTotal) < 0.01 ? 'Zerado' : differenceTotal > 0 ? `Sobra no ${cardName}` : `Falta no ${cardName}`
    })\n`;

    if (Math.abs(cashDifference) >= 0.01) {
      t += `• Gaveta Dinheiro: Físico ${formatCurrency(cashTotal)} x Esperado ${formatCurrency(expectedCash)} (Dif: ${formatCurrency(cashDifference)})\n`;
    }

    t += `\n📊 *ANALÍTICO POR FORMA DE PAGAMENTO:*\n`;
    if (onlyDivergentModals.length === 0) {
      t += `• Sem divergências apuradas nas formas de pagamento.\n`;
    } else {
      onlyDivergentModals.forEach((m) => {
        const status =
          m.diff > 0
            ? `SOBRA de ${formatCurrency(m.diff)} nas maquininhas (não computado no PDV)`
            : `FALTA de ${formatCurrency(Math.abs(m.diff))} nas maquininhas (computado a mais no PDV)`;
        t += `• *${m.name}:*\n  ↳ ${cardName}: ${formatCurrency(m.cardVal)} | ${pdvName}: ${formatCurrency(m.pdvVal)}\n  ↳ Divergência: *${formatCurrency(m.diff)}* (${status})\n`;
      });
    }

    // Detalhamento das Maquininhas
    t += `\n📟 *APURAÇÃO POR MAQUININHA FÍSICA:*\n`;
    machines.forEach((m) => {
      const cr = sumArray(m.credits);
      const db = sumArray(m.debits);
      const vc = sumArray(m.vouchers);
      const px = parseValue(m.pix);
      const tot = cr + db + vc + px;
      if (tot > 0) {
        t += `• Máquina #${m.id}: Total ${formatCurrency(tot)} [Crédito: ${formatCurrency(cr)} | Débito: ${formatCurrency(db)} | Pix: ${formatCurrency(px)} | Voucher: ${formatCurrency(vc)}]\n`;
      }
    });

    if (operatorNotes.trim()) {
      t += `\n📝 *RELATO DO OPERADOR / MOTIVO DA DIVERGÊNCIA:*\n${operatorNotes.trim()}\n`;
    }

    t += `\nSolicitamos a auditoria do lote ou extrato de transações pelo suporte técnico.\n`;
    t += `Documento gerado automaticamente pelo FechaCaixa SaaS.`;
    return t;
  };

  const handleCopyTicket = async () => {
    const text = generateSupportTicketText();
    try {
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      onShowToast('Texto do chamado copiado com sucesso para o WhatsApp!');
      setTimeout(() => setIsCopied(false), 3000);
    } catch {
      onShowToast('Erro ao copiar. Selecione o texto na tela para copiar.');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Gerador Oficial de PDF usando jsPDF
  const handleDownloadPdf = () => {
    try {
      setIsGeneratingPdf(true);
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const primaryColor: [number, number, number] = [15, 23, 42]; // Slate 900
      const accentColor: [number, number, number] = [234, 88, 12]; // Orange 600
      const redColor: [number, number, number] = [225, 29, 72]; // Rose 600
      const greenColor: [number, number, number] = [16, 185, 129]; // Emerald 500

      let y = 18;

      // 1. Cabeçalho Oficial
      doc.setFillColor(...primaryColor);
      doc.rect(14, y, 182, 28, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('LAUDO TÉCNICO DE DIVERGÊNCIA DE FECHAMENTO', 20, y + 9);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(226, 232, 240);
      const targetStr =
        targetSupport === 'jclan'
          ? `DESTINADO AO SUPORTE TÉCNICO ${pdvName.toUpperCase()}`
          : targetSupport === 'getnet'
          ? `DESTINADO AO SUPORTE TÉCNICO ${cardName.toUpperCase()}`
          : `CONFRONTO TÉCNICO: ${cardName.toUpperCase()} x ${pdvName.toUpperCase()}`;
      doc.text(targetStr, 20, y + 16);
      doc.text(`Protocolo Oficial: ${protocolNumber} | Emissão: ${reportDate} às ${reportTime}`, 20, y + 22);

      y += 36;

      // 2. Quadro de Identificação do Estabelecimento
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(14, y, 182, 22, 2, 2, 'FD');

      doc.setTextColor(...primaryColor);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('DADOS DA OPERAÇÃO', 18, y + 6);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      doc.text(`Empresa / Bar: ${tenant.name} (${tenant.city || 'Brasil'})`, 18, y + 12);
      doc.text(`Operador de Caixa: ${currentOperator?.name?.toUpperCase() || 'OPERADOR'}`, 18, y + 17);

      doc.text(`Prioridade: ${urgencyLevel.toUpperCase()}`, 115, y + 12);
      if (terminalId || posSerial) {
        doc.text(`Terminal: ${terminalId || 'N/I'} | Série POS: ${posSerial || 'N/I'}`, 115, y + 17);
      } else {
        doc.text(`Status do Caixa: Em divergência no fechamento`, 115, y + 17);
      }

      y += 28;

      // 3. Resumo da Divergência (Cards no PDF)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...primaryColor);
      doc.text('CONFRONTO GERAL DE VALORES', 14, y);
      y += 4;

      const cardW = 58;
      const cardH = 20;

      // Card Getnet
      doc.setFillColor(241, 245, 249);
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(14, y, cardW, cardH, 2, 2, 'FD');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(`TOTAL MAQUININHAS (${cardName.toUpperCase()})`, 18, y + 6);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...primaryColor);
      doc.text(formatCurrency(getnetTotal), 18, y + 15);

      // Card Jclan
      doc.setFillColor(241, 245, 249);
      doc.roundedRect(76, y, cardW, cardH, 2, 2, 'FD');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text(`TOTAL SISTEMA (${pdvName.toUpperCase()})`, 80, y + 6);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...primaryColor);
      doc.text(formatCurrency(jclanTotal), 80, y + 15);

      // Card Diferença
      const isDiffZero = Math.abs(differenceTotal) < 0.01;
      doc.setFillColor(isDiffZero ? 236 : 255, isDiffZero ? 253 : 241, isDiffZero ? 245 : 242);
      doc.setDrawColor(isDiffZero ? greenColor[0] : redColor[0], isDiffZero ? greenColor[1] : redColor[1], isDiffZero ? greenColor[2] : redColor[2]);
      doc.roundedRect(138, y, cardW, cardH, 2, 2, 'FD');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(isDiffZero ? 5 : 190, isDiffZero ? 150 : 18, isDiffZero ? 105 : 60);
      doc.text(differenceTotal > 0 ? 'SOBRA LÍQUIDA' : 'FALTA LÍQUIDA', 142, y + 6);
      doc.setFontSize(12);
      doc.text(formatCurrency(Math.abs(differenceTotal)), 142, y + 15);

      y += cardH + 8;

      // 4. Tabela Analítica por Forma de Pagamento
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...primaryColor);
      doc.text('DETALHAMENTO ANALÍTICO POR MODALIDADE', 14, y);
      y += 4;

      // Header da Tabela
      doc.setFillColor(...primaryColor);
      doc.rect(14, y, 182, 8, 'F');
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.text('Modalidade', 18, y + 5.5);
      doc.text(`Maquininhas (${cardName})`, 60, y + 5.5);
      doc.text(`Sistema (${pdvName})`, 105, y + 5.5);
      doc.text('Divergência Apurada', 150, y + 5.5);
      y += 8;

      // Linhas da Tabela
      modalDivergences.forEach((m, idx) => {
        const hasDiff = Math.abs(m.diff) >= 0.01;
        doc.setFillColor(idx % 2 === 0 ? 255 : 248, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 252);
        doc.rect(14, y, 182, 8, 'F');
        doc.setFont('helvetica', hasDiff ? 'bold' : 'normal');
        doc.setTextColor(hasDiff ? redColor[0] : 51, hasDiff ? redColor[1] : 65, hasDiff ? redColor[2] : 85);
        doc.setFontSize(8.5);

        doc.text(m.name, 18, y + 5.5);
        doc.text(formatCurrency(m.cardVal), 60, y + 5.5);
        doc.text(formatCurrency(m.pdvVal), 105, y + 5.5);

        const diffStr = hasDiff
          ? `${formatCurrency(m.diff)} (${m.diff > 0 ? 'Sobra' : 'Falta'})`
          : 'R$ 0,00 (Exato)';
        doc.text(diffStr, 150, y + 5.5);

        y += 8;
      });

      // Linha de Gaveta (Dinheiro) se houver diferença
      if (Math.abs(cashDifference) >= 0.01) {
        doc.setFillColor(254, 242, 242);
        doc.rect(14, y, 182, 8, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...redColor);
        doc.text('Gaveta (Dinheiro)', 18, y + 5.5);
        doc.text(`Físico: ${formatCurrency(cashTotal)}`, 60, y + 5.5);
        doc.text(`Esperado: ${formatCurrency(expectedCash)}`, 105, y + 5.5);
        doc.text(`${formatCurrency(cashDifference)} (${cashDifference > 0 ? 'Sobra' : 'Falta'})`, 150, y + 5.5);
        y += 8;
      }

      y += 6;

      // 5. Apuração Individual por Maquininha
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...primaryColor);
      doc.text('DISTRIBUIÇÃO POR TERMINAL / MAQUININHA FÍSICA', 14, y);
      y += 4;

      doc.setFillColor(241, 245, 249);
      doc.rect(14, y, 182, 7, 'F');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      doc.text('Terminal', 18, y + 4.5);
      doc.text('Crédito', 50, y + 4.5);
      doc.text('Débito', 82, y + 4.5);
      doc.text('Pix', 114, y + 4.5);
      doc.text('Voucher', 142, y + 4.5);
      doc.text('Total Maquininha', 168, y + 4.5);
      y += 7;

      machines.forEach((m, idx) => {
        const cr = sumArray(m.credits);
        const db = sumArray(m.debits);
        const vc = sumArray(m.vouchers);
        const px = parseValue(m.pix);
        const tot = cr + db + vc + px;

        doc.setFillColor(idx % 2 === 0 ? 255 : 248, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 252);
        doc.rect(14, y, 182, 6.5, 'F');
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(51, 65, 85);

        doc.text(`Máquina #${m.id}`, 18, y + 4.5);
        doc.text(formatCurrency(cr), 50, y + 4.5);
        doc.text(formatCurrency(db), 82, y + 4.5);
        doc.text(formatCurrency(px), 114, y + 4.5);
        doc.text(formatCurrency(vc), 142, y + 4.5);
        doc.setFont('helvetica', 'bold');
        doc.text(formatCurrency(tot), 168, y + 4.5);

        y += 6.5;
      });

      y += 6;

      // 6. Relato do Operador / Observações Técnicas
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...primaryColor);
      doc.text('PARECER & RELATO DO OPERADOR DO TURNO', 14, y);
      y += 4;

      doc.setFillColor(254, 252, 232);
      doc.setDrawColor(253, 224, 71);
      doc.roundedRect(14, y, 182, 22, 1.5, 1.5, 'FD');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(113, 63, 18);

      const notesToPrint =
        operatorNotes.trim() ||
        'O operador fechou a rotina de conferência constatando divergência de valores entre o relatório financeiro impresso nas maquininhas e o relatório de vendas do PDV. Solicita-se verificação de conciliação de lote e auditoria de cancelamentos/estornos pelo suporte técnico especializado.';

      const splitNotes = doc.splitTextToSize(notesToPrint, 174);
      doc.text(splitNotes, 18, y + 6);

      y += 26;

      // 7. Rodapé e Assinaturas
      doc.setDrawColor(203, 213, 225);
      doc.line(14, y, 90, y);
      doc.line(106, y, 182, y);

      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text(`Assinatura do Operador (${currentOperator?.name || 'Operador'})`, 14, y + 4);
      doc.text('Recebido pelo Suporte Técnico (Data e Carimbo)', 106, y + 4);

      // Rodapé inferior
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text(`FechaCaixa SaaS • Laudo Oficial para Abertura de Chamado Técnico • Protocolo ${protocolNumber}`, 14, 288);
      doc.text('Página 1 de 1', 180, 288);

      // Salva arquivo PDF no cliente
      const fileName = `Laudo_Divergencia_${protocolNumber}.pdf`;
      doc.save(fileName);
      onShowToast(`Laudo técnico em PDF baixado com sucesso (${fileName})!`);
    } catch (e: any) {
      console.error('Erro ao gerar PDF:', e);
      onShowToast(`Erro ao gerar PDF: ${e.message}`);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-3 sm:p-5 overflow-y-auto animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header Superior com Tema Técnico */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 p-5 border-b border-slate-700/80 flex items-center justify-between gap-3 text-white">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-orange-400 shrink-0">
              <ShieldAlert className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="bg-orange-500/20 text-orange-300 border border-orange-500/30 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full">
                  Suporte & Chamados Técnicos
                </span>
                <span className="text-slate-400 text-xs font-mono">Protocolo: {protocolNumber}</span>
              </div>
              <h3 className="text-lg font-black text-white mt-0.5 flex items-center gap-2">
                <span>Laudo Técnico de Divergência de Fechamento</span>
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
            title="Fechar Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo com Scroll */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 text-slate-200 text-xs bg-slate-900/60">
          {/* 1. Escolha do Destinatário do Chamado */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Send className="w-4 h-4 text-orange-400" /> Destinatário do Chamado Técnico
              </span>
              <span className="text-[10px] text-slate-400">
                O relatório será formatado especificamente para o suporte selecionado
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setTargetSupport('ambos')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  targetSupport === 'ambos'
                    ? 'bg-orange-500/15 border-orange-500 text-orange-300 ring-1 ring-orange-500/40'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-850'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm text-white">Ambos os Sistemas</span>
                  {targetSupport === 'ambos' && <Check className="w-4 h-4 text-orange-400" />}
                </div>
                <p className="text-[10px] leading-tight text-slate-400">
                  Confronto total {cardName} x {pdvName} para conciliação cruzada.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setTargetSupport('jclan')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  targetSupport === 'jclan'
                    ? 'bg-blue-500/15 border-blue-500 text-blue-300 ring-1 ring-blue-500/40'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-850'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm text-white">Suporte {pdvName} (PDV)</span>
                  {targetSupport === 'jclan' && <Check className="w-4 h-4 text-blue-400" />}
                </div>
                <p className="text-[10px] leading-tight text-slate-400">
                  Focado em conferência de comandas, lançamentos e relatórios internos do PDV.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setTargetSupport('getnet')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  targetSupport === 'getnet'
                    ? 'bg-rose-500/15 border-rose-500 text-rose-300 ring-1 ring-rose-500/40'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-850'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm text-white">Suporte {cardName}</span>
                  {targetSupport === 'getnet' && <Check className="w-4 h-4 text-rose-400" />}
                </div>
                <p className="text-[10px] leading-tight text-slate-400">
                  Focado em conferência de lotes de maquininhas, desfazimentos e NSUs.
                </p>
              </button>
            </div>
          </div>

          {/* 2. Informações do Estabelecimento e Chamado */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Estabelecimento</span>
              <p className="text-white font-bold text-sm">{tenant.name}</p>
              <span className="text-[10px] text-slate-400">{tenant.city || 'Matriz'}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Operador / Turno</span>
              <p className="text-white font-bold text-sm capitalize">{currentOperator?.name || 'Operador'}</p>
              <span className="text-[10px] text-slate-400">{reportDate} às {reportTime}</span>
            </div>
            <div>
              <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Terminal / Lógica (Opcional)</label>
              <input
                type="text"
                placeholder="Ex: POS-01 / 18492"
                value={terminalId}
                onChange={(e) => setTerminalId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs font-semibold text-white outline-none focus:ring-1 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Prioridade do Chamado</label>
              <select
                value={urgencyLevel}
                onChange={(e) => setUrgencyLevel(e.target.value as any)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs font-bold text-white outline-none focus:ring-1 focus:ring-orange-500 cursor-pointer"
              >
                <option value="alta">🔴 Alta (Impacta Fechamento)</option>
                <option value="media">🟡 Média (Divergência Parcial)</option>
                <option value="baixa">🟢 Baixa (Apenas Registro)</option>
              </select>
            </div>
          </div>

          {/* 3. Resumo Visual das Divergências */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" /> Resumo das Divergências Apuradas no Turno
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Total {cardName} (Maquininhas)</span>
                <span className="text-xl font-black text-white">{formatCurrency(getnetTotal)}</span>
              </div>
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Total {pdvName} (Sistema)</span>
                <span className="text-xl font-black text-white">{formatCurrency(jclanTotal)}</span>
              </div>
              <div
                className={`p-3.5 rounded-xl border ${
                  Math.abs(differenceTotal) < 0.01
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                    : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                }`}
              >
                <span className="text-[10px] font-bold uppercase block mb-1">
                  {differenceTotal > 0 ? `Sobra no ${cardName}` : `Falta no ${cardName}`}
                </span>
                <span className="text-xl font-black">{formatCurrency(Math.abs(differenceTotal))}</span>
              </div>
            </div>

            {/* Tabela Comparativa Detalhada */}
            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800 font-bold text-[11px]">
                  <tr>
                    <th className="p-3">Modalidade</th>
                    <th className="p-3">{cardName} (Maquininhas)</th>
                    <th className="p-3">{pdvName} (PDV)</th>
                    <th className="p-3">Divergência</th>
                    <th className="p-3 text-right">Diagnóstico Técnico</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {modalDivergences.map((m, idx) => {
                    const hasDiff = Math.abs(m.diff) >= 0.01;
                    return (
                      <tr key={idx} className={hasDiff ? 'bg-rose-950/15' : ''}>
                        <td className="p-3 font-bold text-white flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${hasDiff ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                          <span>{m.name}</span>
                        </td>
                        <td className="p-3 font-semibold text-slate-200">{formatCurrency(m.cardVal)}</td>
                        <td className="p-3 font-semibold text-slate-200">{formatCurrency(m.pdvVal)}</td>
                        <td className={`p-3 font-black ${hasDiff ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {formatCurrency(m.diff)}
                        </td>
                        <td className="p-3 text-right font-medium">
                          {hasDiff ? (
                            <span className="text-rose-300 text-[11px] bg-rose-950/60 px-2 py-0.5 rounded border border-rose-800/50">
                              {m.diff > 0 ? `Sobra no ${cardName} (não lançado no PDV)` : `Falta no ${cardName} (excesso no PDV)`}
                            </span>
                          ) : (
                            <span className="text-emerald-400 text-[11px]">Batendo 100%</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {Math.abs(cashDifference) >= 0.01 && (
                    <tr className="bg-amber-950/15">
                      <td className="p-3 font-bold text-amber-300">Gaveta (Dinheiro)</td>
                      <td className="p-3 font-semibold text-slate-300">Físico: {formatCurrency(cashTotal)}</td>
                      <td className="p-3 font-semibold text-slate-300">Esperado: {formatCurrency(expectedCash)}</td>
                      <td className="p-3 font-black text-amber-400">{formatCurrency(cashDifference)}</td>
                      <td className="p-3 text-right text-amber-300 text-[11px]">
                        {cashDifference > 0 ? 'Sobra em Dinheiro' : 'Falta em Dinheiro'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 4. Campo de Parecer / Relato do Operador */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-orange-400" /> Parecer e Observações para o Suporte Técnico
              </label>
              <span className="text-[10px] text-slate-400">Descreva se houve queda de sinal, erro de cartão ou transação duplicada</span>
            </div>
            <textarea
              rows={3}
              value={operatorNotes}
              onChange={(e) => setOperatorNotes(e.target.value)}
              placeholder="Ex: Por volta das 23h30 ocorreu uma falha de conexão na Maquininha 2. O cliente realizou uma tentativa de débito que foi debitada na conta dele mas não gerou comprovante impresso..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-slate-100 outline-none focus:ring-2 focus:ring-orange-500 placeholder:text-slate-600 leading-relaxed"
            />
          </div>

          {/* 5. Prévia do Relatório Formatado */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Prévia da Mensagem Estruturada para Abertura de Ticket / WhatsApp
              </span>
              <button
                type="button"
                onClick={handleCopyTicket}
                className="text-xs text-orange-400 hover:text-orange-300 font-bold flex items-center gap-1 cursor-pointer transition-colors"
              >
                {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{isCopied ? 'Copiado!' : 'Copiar Texto Completo'}</span>
              </button>
            </div>
            <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-[11px] text-slate-300 whitespace-pre-wrap font-mono leading-relaxed max-h-48 overflow-y-auto shadow-inner">
              {generateSupportTicketText()}
            </pre>
          </div>
        </div>

        {/* Rodapé de Ações: Baixar PDF, Imprimir, Copiar */}
        <div className="p-4 sm:p-5 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-[11px] text-slate-400 text-center sm:text-left">
            <span>Protocolo gerado: </span>
            <strong className="text-orange-300 font-mono">{protocolNumber}</strong>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end flex-wrap">
            <button
              type="button"
              onClick={handleCopyTicket}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Copy className="w-4 h-4 text-orange-400" />
              <span>{isCopied ? 'Copiado p/ WhatsApp!' : 'Copiar Texto WhatsApp'}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Printer className="w-4 h-4 text-slate-300" />
              <span>Imprimir / Salvar PDF</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white text-xs font-black shadow-lg shadow-orange-600/30 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{isGeneratingPdf ? 'Gerando Laudo...' : 'Baixar Laudo Oficial (.PDF)'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
