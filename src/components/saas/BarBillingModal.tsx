import React, { useState } from 'react';
import { X, CreditCard, QrCode, Copy, CheckCircle2, AlertTriangle, ShieldCheck, RefreshCw, Calendar, Sparkles } from 'lucide-react';
import { Tenant, Invoice } from '../../types/saas.ts';

interface BarBillingModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenant: Tenant;
  invoices: Invoice[];
  onConfirmPayment: (invoiceId: string) => Promise<void>;
  onShowToast: (msg: string) => void;
}

export const BarBillingModal: React.FC<BarBillingModalProps> = ({
  isOpen,
  onClose,
  tenant,
  invoices,
  onConfirmPayment,
  onShowToast,
}) => {
  const [copiedKey, setCopiedKey] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const currentInvoice = invoices[0];
  const isOverdue = tenant.status === 'inadimplente' || tenant.status === 'bloqueado';

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(true);
      onShowToast('Código Pix Copia e Cola copiado com sucesso!');
      setTimeout(() => setCopiedKey(false), 3000);
    } catch {
      onShowToast('Selecione e copie o código Pix manualmente.');
    }
  };

  const handleSimulatePayment = async (invId: string) => {
    setIsProcessing(true);
    try {
      await onConfirmPayment(invId);
      onShowToast('🎉 Pagamento aprovado via Webhook! Licença renovada por +30 dias.');
    } catch {
      onShowToast('Erro ao confirmar pagamento.');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatBRL = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-3 sm:p-6 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center text-white shadow-md">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg text-white">Assinatura & Faturamento SaaS</h3>
              <p className="text-slate-400 text-xs">
                {tenant.name} • Gestão automática via Asaas / Pix Instantâneo
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Status Card */}
          <div
            className={`p-5 rounded-2xl border ${
              isOverdue
                ? 'bg-rose-50 border-rose-200 text-rose-900'
                : 'bg-emerald-50 border-emerald-200 text-emerald-900'
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider block opacity-75">
                  Status da Assinatura
                </span>
                <div className="flex items-center gap-2 mt-1">
                  {isOverdue ? (
                    <AlertTriangle className="w-5 h-5 text-rose-600" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  )}
                  <span className="text-xl font-black capitalize">
                    {tenant.status === 'ativo'
                      ? 'Licença Ativa (Em dia)'
                      : tenant.status === 'bloqueado'
                      ? 'Acesso Bloqueado / Suspenso'
                      : 'Pagamento Pendente'}
                  </span>
                </div>
                <p className="text-xs mt-2 opacity-90">
                  {isOverdue
                    ? 'Efetue o pagamento via Pix para desbloquear instantaneamente o acesso da sua equipe.'
                    : `Sua licença FechaCaixa está regular. Próxima renovação em ${new Date(
                        tenant.expiresAt
                      ).toLocaleDateString('pt-BR')}.`}
                </p>
              </div>

              <div className="text-right">
                <span className="text-xs block opacity-75">Plano Contratado</span>
                <span className="text-base font-extrabold uppercase bg-white/70 px-2.5 py-1 rounded-lg border border-current inline-block mt-0.5">
                  {tenant.plan}
                </span>
                <span className="text-xs font-bold block mt-1">{formatBRL(tenant.monthlyPrice)} / mês</span>
              </div>
            </div>
          </div>

          {/* Pix Payment Box */}
          {currentInvoice && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2 text-slate-800 font-bold">
                  <QrCode className="w-5 h-5 text-teal-600" />
                  <span>Pagamento Instantâneo via Pix (Baixa Automática)</span>
                </div>
                <span className="text-sm font-black text-slate-900">{formatBRL(currentInvoice.amount)}</span>
              </div>

              {/* QR Code Demo Visual */}
              <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-4 rounded-xl border border-slate-200">
                <div className="w-28 h-28 bg-slate-900 rounded-xl p-2 shrink-0 flex items-center justify-center text-white text-center shadow-inner relative overflow-hidden">
                  <div className="w-full h-full border-2 border-dashed border-teal-400 rounded-lg flex flex-col items-center justify-center p-1">
                    <QrCode className="w-12 h-12 text-teal-400" />
                    <span className="text-[8px] font-bold tracking-tighter uppercase mt-0.5 text-slate-300">
                      PIX ASAAS
                    </span>
                  </div>
                </div>

                <div className="flex-1 space-y-2 text-center sm:text-left">
                  <p className="text-xs text-slate-600 font-medium leading-relaxed">
                    Abra o app do seu banco, escolha <strong>Pix Copia e Cola</strong> ou aponte a câmera para o QR Code. A confirmação é instantânea pelo gateway bancário.
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={currentInvoice.pixCode}
                      className="w-full bg-slate-100 border border-slate-300 rounded-lg px-2.5 py-1.5 text-[11px] font-mono text-slate-600 outline-none select-all"
                    />
                    <button
                      onClick={() => copyToClipboard(currentInvoice.pixCode)}
                      className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-bold shrink-0 flex items-center gap-1.5 shadow-sm transition-all"
                    >
                      {copiedKey ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedKey ? 'Copiado!' : 'Copiar Pix'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Botão de Simulação Asaas / Confirmação */}
              <div className="pt-2">
                <button
                  onClick={() => handleSimulatePayment(currentInvoice.id)}
                  disabled={isProcessing}
                  className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-extrabold py-3.5 rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 text-sm"
                >
                  {isProcessing ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4 text-amber-300" />
                  )}
                  <span>
                    {isProcessing ? 'Processando Webhook...' : 'Simular Confirmação de Pagamento (Webhook Asaas)'}
                  </span>
                </button>
                <p className="text-[11px] text-center text-slate-400 mt-1.5">
                  Ao identificar o crédito bancário, o webhook renova a licença por mais 30 dias na nuvem.
                </p>
              </div>
            </div>
          )}

          {/* Faturas Anteriores */}
          <div>
            <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">
              Histórico de Faturas ({invoices.length})
            </h4>
            <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 shadow-sm">
              {invoices.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">Nenhuma fatura registrada.</div>
              ) : (
                invoices.map((inv) => (
                  <div key={inv.id} className="p-3.5 flex justify-between items-center text-xs hover:bg-slate-50">
                    <div>
                      <span className="font-bold text-slate-800 block text-sm">{inv.description}</span>
                      <span className="text-slate-400 text-[11px] flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3 h-3" /> Vencimento: {inv.dueDate}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-extrabold text-slate-900 block text-sm">{formatBRL(inv.amount)}</span>
                      <span
                        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                          inv.status === 'paga'
                            ? 'bg-emerald-100 text-emerald-800'
                            : inv.status === 'vencida'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {inv.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs shadow-sm transition-all"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
