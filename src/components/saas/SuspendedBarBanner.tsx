import React, { useState } from 'react';
import { Lock, AlertCircle, QrCode, Copy, CheckCircle2, MessageCircle, ArrowRight, ShieldCheck, Sparkles, RefreshCw } from 'lucide-react';
import { Tenant, Invoice } from '../../types/saas.ts';

interface SuspendedBarBannerProps {
  tenant: Tenant;
  invoice?: Invoice;
  onConfirmPayment: (invoiceId: string) => Promise<void>;
  onOpenMasterPanel: () => void;
  onSwitchTenant: () => void;
  onShowToast: (msg: string) => void;
}

export const SuspendedBarBanner: React.FC<SuspendedBarBannerProps> = ({
  tenant,
  invoice,
  onConfirmPayment,
  onOpenMasterPanel,
  onSwitchTenant,
  onShowToast,
}) => {
  const [copiedKey, setCopiedKey] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const formatBRL = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

  const pixCode = invoice?.pixCode || '00020126580014br.gov.bcb.pix0136fechacaixa-cwb@banco.com5204000053039865406249.005802BR5915FECHACAIXA SAAS6008CURITIBA62070503***6304E8A1';
  const amount = invoice?.amount || tenant.monthlyPrice || 249.0;

  const handleCopyPix = async () => {
    try {
      await navigator.clipboard.writeText(pixCode);
      setCopiedKey(true);
      onShowToast('Código Pix Copia e Cola copiado para a área de transferência!');
      setTimeout(() => setCopiedKey(false), 3000);
    } catch {
      onShowToast('Selecione e copie o código Pix manualmente.');
    }
  };

  const handlePayNow = async () => {
    if (!invoice?.id) {
      onShowToast('Fatura não localizada. Regularizando direto via SaaS...');
      return;
    }
    setIsProcessing(true);
    try {
      await onConfirmPayment(invoice.id);
      onShowToast('🎉 Pagamento identificado com sucesso! O bar foi desbloqueado.');
    } catch {
      onShowToast('Erro ao confirmar pagamento.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="bg-white border-2 border-rose-300 rounded-3xl shadow-2xl p-6 sm:p-10 max-w-xl w-full text-center relative overflow-hidden animate-fade-in">
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-rose-100 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-amber-100 rounded-full blur-2xl pointer-events-none" />

        {/* Icon & Title */}
        <div className="w-20 h-20 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-rose-200 shadow-sm">
          <Lock className="w-10 h-10" />
        </div>

        <span className="text-[11px] font-black uppercase tracking-widest text-rose-600 bg-rose-50 border border-rose-200 px-3 py-1 rounded-full inline-block mb-2">
          Acesso Temporariamente Suspenso
        </span>

        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          {tenant.name}
        </h2>
        <p className="text-slate-500 text-xs sm:text-sm mt-2 max-w-md mx-auto">
          A assinatura deste estabelecimento encontra-se suspensa ou em atraso. Para continuar utilizando o fechamento de caixa e conciliação Getnet x Jclan, regularize a mensalidade.
        </p>

        {/* Card de Fatura Pix */}
        <div className="my-6 bg-slate-50 border border-slate-200 rounded-2xl p-5 text-left space-y-3">
          <div className="flex justify-between items-center border-b border-slate-200 pb-2">
            <span className="text-xs font-bold text-slate-500">Valor da Mensalidade:</span>
            <span className="text-lg font-black text-slate-900">{formatBRL(amount)}</span>
          </div>

          <div className="flex items-center gap-2">
            <QrCode className="w-4 h-4 text-teal-600 shrink-0" />
            <span className="text-xs font-semibold text-slate-700">Chave Pix Copia e Cola:</span>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={pixCode}
              className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-[11px] font-mono text-slate-600 outline-none select-all"
            />
            <button
              onClick={handleCopyPix}
              className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-bold shrink-0 flex items-center gap-1 shadow-sm transition-all"
            >
              {copiedKey ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedKey ? 'Copiado' : 'Copiar'}</span>
            </button>
          </div>
        </div>

        {/* Botão de regularização instantânea */}
        <button
          onClick={handlePayNow}
          disabled={isProcessing}
          className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold py-3.5 rounded-xl shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 text-sm active:scale-[0.99]"
        >
          {isProcessing ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4 text-amber-300" />
          )}
          <span>
            {isProcessing ? 'Verificando Pagamento...' : 'Regularizar Agora (Simular Baixa Asaas / Pix)'}
          </span>
        </button>

        {/* Links de navegação secundária */}
        <div className="mt-6 pt-5 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs">
          <button
            onClick={onSwitchTenant}
            className="text-slate-600 hover:text-slate-900 font-bold flex items-center gap-1"
          >
            <span>Alternar para outro Bar</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onOpenMasterPanel}
            className="text-amber-700 hover:text-amber-900 font-bold flex items-center gap-1 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Sou o Fundador SaaS (Painel Master)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
