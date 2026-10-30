import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  AlertTriangle,
  FileText,
  CreditCard,
  DollarSign,
  TrendingUp,
  RefreshCw,
  Copy,
  ArrowRight,
  ShieldCheck,
  Check,
  UploadCloud,
  HelpCircle
} from 'lucide-react';
import { Tenant } from '../../types/saas.ts';
import { formatCurrency } from '../../App.tsx';
import { getTheme } from '../../utils/theme.ts';

interface FinalPdvSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenant: Tenant;
  operatorName?: string;
  selectedExclusionOptions: Record<
    string,
    { title: string; instruction: string; diff: number; optionIndex?: number }
  >;
  instructions: Array<{ from: string; to: string; amount: number }>;
  getnetTotal: number;
  jclanTotal: number;
  cashTotal: number;
  expectedCash: number;
  totals: {
    credit: { card: number; pdv: number };
    debit: { card: number; pdv: number };
    pix: { card: number; pdv: number };
    voucher: { card: number; pdv: number };
    cash: { physical: number; expected: number };
  };
  voucherBreakdown?: Array<{ name: string; amount: number }>;
  onProceedToSaveClosing: () => void;
  onShowToast: (msg: string) => void;
}

export const FinalPdvSummaryModal: React.FC<FinalPdvSummaryModalProps> = ({
  isOpen,
  onClose,
  tenant,
  operatorName,
  selectedExclusionOptions,
  instructions,
  getnetTotal,
  cashTotal,
  expectedCash,
  totals,
  voucherBreakdown = [],
  onProceedToSaveClosing,
  onShowToast,
}) => {
  const [hasConfirmedInPdv, setHasConfirmedInPdv] = useState<boolean | null>(null);
  const pdvName = tenant.pdvSystemName || 'Jclan';
  const cardName = tenant.cardSystemName || 'Getnet';
  const theme = getTheme(tenant.themeColor);

  if (!isOpen) return null;

  const zeramentoEntries = Object.entries(selectedExclusionOptions);

  const handleCopySummary = async () => {
    let text = `📋 RESUMO DE LANÇAMENTOS NO PDV (${pdvName}) - ${tenant.name}\n`;
    text += `Operador: ${operatorName || 'Caixa'}\n\n`;

    if (instructions.length > 0) {
      text += `🔄 1. TRANSFERÊNCIAS ENTRE FORMAS NO ${pdvName}:\n`;
      instructions.forEach((inst, i) => {
        text += `  ${i + 1}. Alterar ${formatCurrency(inst.amount)} de [${inst.from}] para [${inst.to}]\n`;
      });
      text += `\n`;
    }

    if (zeramentoEntries.length > 0) {
      text += `🎯 2. AJUSTES E COMANDAS PARA ZERAR DIFERENÇAS:\n`;
      zeramentoEntries.forEach(([label, opt], idx) => {
        text += `  ${idx + 1}. [${label}] ${opt.title}\n`;
        text += `     ↳ ${opt.instruction}\n`;
      });
      text += `\n`;
    }

    text += `📊 3. VALORES FINAIS QUE DEVEM CONSTAR NO ${pdvName}:\n`;
    text += `  • Crédito: ${formatCurrency(totals.credit.card)}\n`;
    text += `  • Débito: ${formatCurrency(totals.debit.card)}\n`;
    text += `  • Pix: ${formatCurrency(totals.pix.card)}\n`;
    text += `  • Voucher Total: ${formatCurrency(totals.voucher.card)}\n`;
    if (voucherBreakdown.length > 0) {
      voucherBreakdown.forEach((vb) => {
        text += `     ↳ ${vb.name}: ${formatCurrency(vb.amount)}\n`;
      });
    }
    text += `  • Total Cartões: ${formatCurrency(getnetTotal)}\n`;
    text += `  • Gaveta (Dinheiro): ${formatCurrency(cashTotal)}\n`;

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        onShowToast('Resumo de lançamentos copiado para a área de transferência!');
        return;
      }
    } catch {
      // fallback
    }

    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      onShowToast('Resumo copiado com sucesso!');
    } catch {
      onShowToast('Não foi possível copiar automaticamente.');
    }
  };

  const handleAdvance = () => {
    if (hasConfirmedInPdv !== true) {
      onShowToast(`Por favor, confirme se você já conferiu no ${pdvName} antes de salvar o fechamento.`);
      return;
    }
    onClose();
    onProceedToSaveClosing();
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col my-auto max-h-[94vh]">
        {/* Cabeçalho */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-slate-700 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0 shadow-sm">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  Etapa Final de Conciliação
                </span>
                <span className="text-xs text-slate-400 font-medium hidden sm:inline">
                  {tenant.name}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-white leading-tight mt-0.5">
                O que lançar no {pdvName} para Fechamento Final
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopySummary}
              className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Copiar resumo de lançamentos para colar no WhatsApp ou bloco de notas"
            >
              <Copy className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Copiar</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              title="Fechar janela"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Corpo com Scroll */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 bg-slate-950/60 flex-1 text-slate-200">
          {/* Alerta Informativo Superior */}
          <div className="bg-blue-950/40 border border-blue-500/30 rounded-xl p-3.5 flex items-start gap-3 text-xs text-blue-200">
            <ShieldCheck className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-white">
                Execute os lançamentos abaixo no seu sistema de caixa ({pdvName}) antes de emitir a leitura Z / fechamento final:
              </p>
              <p className="text-blue-300/90 leading-relaxed">
                Após aplicar essas correções no {pdvName}, todos os valores de cartões e gaveta estarão 100% conciliados com as maquininhas {cardName}.
              </p>
            </div>
          </div>

          {/* 1. Lançamentos de Zeramento (Nova Comanda ou Comanda Reaberta) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase tracking-wider text-amber-300 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-amber-400" />
                <span>1. Lançamentos nas Comandas ({pdvName})</span>
              </h4>
              <span className="text-[11px] font-bold text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                {zeramentoEntries.length} ação(ões) calculada(s)
              </span>
            </div>

            {zeramentoEntries.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 text-xs text-slate-400 text-center">
                Nenhum lançamento adicional em comanda é necessário. Todas as divergências foram resolvidas por transferências internas ou já estão batendo 100%!
              </div>
            ) : (
              <div className="space-y-2.5">
                {zeramentoEntries.map(([label, opt], idx) => {
                  const isNovaComanda = opt.title.toLowerCase().includes('nova');
                  return (
                    <div
                      key={label}
                      className="bg-slate-900/90 border border-slate-700/80 rounded-xl p-3.5 sm:p-4 text-xs transition-all hover:border-emerald-500/50 shadow-sm"
                    >
                      <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center font-bold text-[11px] border border-slate-700">
                            {idx + 1}
                          </span>
                          <span className="font-bold text-sm text-white">{opt.title}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-[10px] font-bold uppercase border border-slate-700">
                            {label}
                          </span>
                          <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded text-[10px] font-bold">
                            Ajuste: {formatCurrency(opt.diff)}
                          </span>
                        </div>
                      </div>

                      <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-slate-200 text-xs font-mono leading-relaxed">
                        {opt.instruction}
                      </div>

                      <div className="mt-2 text-[11px] text-slate-400 flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>
                          {isNovaComanda
                            ? `Lançar no ${pdvName} SEM TAXA DE SERVIÇO (desative os 10%).`
                            : `Excluir o(s) item(ns) da comanda reaberta e finalizar a conta.`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 2. Transferências entre Formas de Pagamento (Se houver) */}
          {instructions.length > 0 && (
            <div className="space-y-2.5">
              <h4 className="text-xs font-black uppercase tracking-wider text-cyan-300 flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-cyan-400" />
                <span>2. Transferências entre Formas de Pagamento no {pdvName}</span>
              </h4>
              <div className="space-y-2">
                {instructions.map((inst, i) => (
                  <div
                    key={i}
                    className="bg-slate-900 border border-cyan-500/30 rounded-xl p-3 text-xs flex items-center justify-between gap-3 flex-wrap"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-300">Alterar forma de:</span>
                      <span className="bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded font-black">
                        {inst.from}
                      </span>
                      <span className="text-slate-400">para</span>
                      <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded font-black">
                        {inst.to}
                      </span>
                    </div>
                    <span className="text-sm font-black text-cyan-300">
                      {formatCurrency(inst.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. Valores Finais Esperados no Relatório do PDV */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-blue-400" />
              <span>3. Valores Finais Esperados no Relatório do {pdvName}</span>
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-xl text-center">
                <span className="text-[10px] font-bold text-blue-400 uppercase block">Crédito</span>
                <span className="text-xs sm:text-sm font-black text-white mt-0.5 block truncate">
                  {formatCurrency(totals.credit.card)}
                </span>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-xl text-center">
                <span className="text-[10px] font-bold text-orange-400 uppercase block">Débito</span>
                <span className="text-xs sm:text-sm font-black text-white mt-0.5 block truncate">
                  {formatCurrency(totals.debit.card)}
                </span>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-xl text-center">
                <span className="text-[10px] font-bold text-teal-400 uppercase block">Pix</span>
                <span className="text-xs sm:text-sm font-black text-white mt-0.5 block truncate">
                  {formatCurrency(totals.pix.card)}
                </span>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-xl text-center flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold text-purple-400 uppercase block">Voucher Total</span>
                  <span className="text-xs sm:text-sm font-black text-white mt-0.5 block truncate">
                    {formatCurrency(totals.voucher.card)}
                  </span>
                </div>
                {/* Valores individuais por bandeira de voucher do bar */}
                <div className="mt-2 pt-1.5 border-t border-slate-800/80 space-y-1 text-left">
                  <span className="text-[9px] font-extrabold text-purple-300 uppercase block tracking-wider text-center">
                    Bandeiras ({pdvName}):
                  </span>
                  <div className="space-y-0.5 max-h-28 overflow-y-auto pr-0.5">
                    {voucherBreakdown.length > 0 ? (
                      voucherBreakdown.map((vb, vIdx) => (
                        <div
                          key={vIdx}
                          className="flex items-center justify-between text-[10px] bg-slate-950/70 px-1.5 py-0.5 rounded border border-slate-800/70"
                        >
                          <span className="text-slate-300 font-semibold truncate max-w-[70px]" title={vb.name}>
                            {vb.name}
                          </span>
                          <span className={`font-mono font-bold ${vb.amount > 0 ? 'text-purple-300' : 'text-slate-500'}`}>
                            {formatCurrency(vb.amount)}
                          </span>
                        </div>
                      ))
                    ) : (
                      <span className="text-[9px] text-slate-500 block text-center">Nenhum voucher</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-xl text-center col-span-2 sm:col-span-1">
                <span className="text-[10px] font-bold text-emerald-400 uppercase block">Dinheiro Gaveta</span>
                <span className="text-xs sm:text-sm font-black text-white mt-0.5 block truncate">
                  {formatCurrency(cashTotal)}
                </span>
              </div>
            </div>
            <div className="text-[11px] text-slate-400 text-center">
              Total Geral em Cartões: <strong className="text-emerald-400">{formatCurrency(getnetTotal)}</strong>
            </div>
          </div>

          {/* 4. PERGUNTA DE CONFERÊNCIA OBRIGATÓRIA (REQUISITO EXPLÍCITO DO USUÁRIO) */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-950 border-2 border-amber-500/50 rounded-2xl p-4 sm:p-5 shadow-lg relative overflow-hidden">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center shrink-0 mt-0.5">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div className="space-y-2 flex-1">
                <h4 className="text-sm font-black text-white leading-snug">
                  Pergunta de Conferência Final:
                </h4>
                <p className="text-xs text-amber-200/90 leading-relaxed font-medium">
                  Você já conferiu no sistema de gestão ({pdvName}) se os valores estão batendo 100% depois de ter feito as modificações nas comandas?
                </p>

                <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setHasConfirmedInPdv(true)}
                    className={`p-3 rounded-xl border text-left text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                      hasConfirmedInPdv === true
                        ? 'bg-emerald-950/80 border-emerald-400 text-emerald-200 ring-2 ring-emerald-500/40 shadow-sm'
                        : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          hasConfirmedInPdv === true
                            ? 'border-emerald-400 bg-emerald-500 text-slate-950'
                            : 'border-slate-500'
                        }`}
                      >
                        {hasConfirmedInPdv === true && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <span>Sim, conferi no {pdvName} e está 100%!</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setHasConfirmedInPdv(false);
                      onShowToast(
                        `Mantenha esta tela aberta ou copie o resumo enquanto lança e confere no ${pdvName}.`
                      );
                    }}
                    className={`p-3 rounded-xl border text-left text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                      hasConfirmedInPdv === false
                        ? 'bg-amber-950/80 border-amber-400 text-amber-200 ring-2 ring-amber-500/40 shadow-sm'
                        : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          hasConfirmedInPdv === false
                            ? 'border-amber-400 bg-amber-500 text-slate-950'
                            : 'border-slate-500'
                        }`}
                      >
                        {hasConfirmedInPdv === false && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <span>Ainda não conferi / Estou lançando</span>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Rodapé de Ações */}
        <div className="p-4 sm:p-5 bg-slate-900 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer text-center"
          >
            Voltar e Ajustar Valores
          </button>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              onClick={handleCopySummary}
              className="flex-1 sm:flex-initial px-4 py-3 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5 text-cyan-400" />
              <span>Copiar Resumo</span>
            </button>

            <button
              onClick={handleAdvance}
              disabled={hasConfirmedInPdv !== true}
              className={`flex-1 sm:flex-initial px-5 py-3 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer ${
                hasConfirmedInPdv === true
                  ? `${theme.btnGradient} ${theme.btnHover} text-white shadow-orange-500/20 active:scale-[0.98]`
                  : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60'
              }`}
              title={
                hasConfirmedInPdv === true
                  ? 'Avançar para salvar fechamento e anexar comprovantes do PDV'
                  : 'Confirme no quadro acima se já conferiu no sistema de gestão para avançar'
              }
            >
              <UploadCloud className="w-4 h-4" />
              <span>Salvar Fechamento & Subir Extrato</span>
              <ArrowRight className="w-4 h-4 ml-0.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
