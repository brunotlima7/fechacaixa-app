import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Check,
  Lock,
  ArrowRight,
  MessageCircle,
  ShieldCheck,
  Zap,
  Globe,
  Camera,
  Mic,
  GraduationCap,
  Headphones,
  CheckCircle2
} from 'lucide-react';
import { Tenant, SaaSPlan, PLAN_DETAILS, PLAN_PRICING, getPlanCapabilities } from '../../types/saas.ts';

export type FeatureGateReason =
  | 'ai_ocr'
  | 'ai_voice'
  | 'ai_audit'
  | 'jclan_sync'
  | 'managed_menu'
  | 'general';

interface UpgradePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenant: Tenant;
  reason?: FeatureGateReason;
  onSelectPlan?: (newPlan: SaaSPlan) => Promise<void> | void;
  isMaster?: boolean;
}

export const UpgradePlanModal: React.FC<UpgradePlanModalProps> = ({
  isOpen,
  onClose,
  tenant,
  reason = 'general',
  onSelectPlan,
  isMaster = false,
}) => {
  const [selectedPlan, setSelectedPlan] = useState<SaaSPlan>(() => {
    if (reason === 'jclan_sync' || reason === 'managed_menu') return 'enterprise';
    if (reason === 'ai_ocr' || reason === 'ai_voice' || reason === 'ai_audit') return 'pro';
    return tenant.plan === 'basico' ? 'pro' : 'enterprise';
  });
  const [isUpdating, setIsUpdating] = useState(false);

  if (!isOpen) return null;

  const currentPlan = tenant.plan || 'pro';
  const formatBRL = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const getReasonBanner = () => {
    switch (reason) {
      case 'ai_ocr':
        return {
          icon: <Camera className="w-5 h-5 text-amber-400" />,
          title: 'Leitura de Comprovantes por Foto (OCR)',
          desc: 'A leitura instantânea de comprovantes por foto com IA está disponível a partir do Plano Profissional IA (R$ 200/mês).',
          recommendedPlan: 'pro' as SaaSPlan,
        };
      case 'ai_voice':
        return {
          icon: <Mic className="w-5 h-5 text-amber-400" />,
          title: 'Preenchimento por Comando de Voz',
          desc: 'Ditar valores de cartões e bandeiras por voz está liberado a partir do Plano Profissional IA (R$ 200/mês).',
          recommendedPlan: 'pro' as SaaSPlan,
        };
      case 'ai_audit':
        return {
          icon: <Sparkles className="w-5 h-5 text-amber-400" />,
          title: 'Assistente Inteligente de Auditoria',
          desc: 'A auditoria avançada com conciliação inteligente do cardápio está no Plano Profissional IA (R$ 200/mês) ou VIP (R$ 300/mês).',
          recommendedPlan: 'pro' as SaaSPlan,
        };
      case 'jclan_sync':
        return {
          icon: <Globe className="w-5 h-5 text-cyan-400" />,
          title: 'Conexão Direta Jclan AlphaX9 em 1 Clique',
          desc: 'A sincronização direta com a API AlphaX9 da Jclan é um recurso exclusivo do Plano VIP / Enterprise (R$ 300/mês).',
          recommendedPlan: 'enterprise' as SaaSPlan,
        };
      case 'managed_menu':
        return {
          icon: <GraduationCap className="w-5 h-5 text-purple-400" />,
          title: 'Cardápio Gerenciado & Treinamento de Equipe',
          desc: 'Adaptação personalizada, instalação e treinamento contínuo pela equipe do Bruno estão inclusos no Plano VIP (R$ 300/mês).',
          recommendedPlan: 'enterprise' as SaaSPlan,
        };
      default:
        return null;
    }
  };

  const reasonBanner = getReasonBanner();

  const handleWhatsAppContact = (planTarget: SaaSPlan) => {
    const targetInfo = PLAN_DETAILS[planTarget];
    const phone = '5541998821917'; // Bruno Lima
    const text = `Olá Bruno! Tudo bem? Gostaria de solicitar o upgrade do bar "${tenant.name}" para o ${targetInfo.name} (${formatBRL(targetInfo.price)}/mês). Pode me orientar na ativação?`;
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleApplyPlanDirectly = async (planTarget: SaaSPlan) => {
    if (!onSelectPlan) return;
    setIsUpdating(true);
    try {
      await onSelectPlan(planTarget);
      onClose();
    } catch {
      // handled upstream
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-3 sm:p-5 animate-fade-in overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-5xl my-auto border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden max-h-[95vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-950 text-white p-5 sm:p-6 border-b border-slate-800 flex items-start justify-between relative">
          <div className="space-y-1 pr-8">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[11px] font-black uppercase tracking-wider border border-emerald-500/30">
              <Zap className="w-3.5 h-3.5" />
              <span>Planos Comerciais FechaCaixa SaaS</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Evolua o plano de {tenant.name}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 font-medium">
              Escolha o pacote ideal para a rotina do seu bar ou restaurante. Atualização rápida e sem perda de dados.
            </p>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800/80 transition-colors cursor-pointer shrink-0"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Reason Alert Banner (se clicou em um recurso bloqueado) */}
        {reasonBanner && (
          <div className="bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-transparent border-b border-amber-500/30 px-6 py-3.5 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0">
              {reasonBanner.icon}
            </div>
            <div className="text-xs">
              <div className="flex items-center gap-2">
                <span className="font-black text-amber-800 dark:text-amber-200">
                  {reasonBanner.title}
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300">
                  <Lock className="w-3 h-3" /> Recurso Bloqueado
                </span>
              </div>
              <p className="text-slate-600 dark:text-slate-300 mt-0.5">
                {reasonBanner.desc}
              </p>
            </div>
          </div>
        )}

        {/* Plans Grid */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 bg-slate-50 dark:bg-slate-950/50 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-5">
            {/* PLANO 1: ESSENCIAL (R$ 150) */}
            {(() => {
              const info = PLAN_DETAILS.basico;
              const isCurrent = currentPlan === 'basico';
              const isSelected = selectedPlan === 'basico';

              return (
                <div
                  onClick={() => setSelectedPlan('basico')}
                  className={`rounded-2xl p-5 border-2 transition-all flex flex-col justify-between cursor-pointer relative bg-white dark:bg-slate-900 ${
                    isSelected
                      ? 'border-blue-500 shadow-lg shadow-blue-500/10 ring-2 ring-blue-500/20'
                      : isCurrent
                      ? 'border-emerald-500/60 shadow-sm'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  {isCurrent && (
                    <div className="absolute -top-3 left-4 bg-emerald-600 text-white text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full shadow-sm flex items-center gap-1">
                      <Check className="w-3 h-3" /> Seu Plano Atual
                    </div>
                  )}

                  <div>
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <span className="text-[11px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400">
                          Básico Operacional
                        </span>
                        <h3 className="text-lg font-black text-slate-900 dark:text-white">
                          {info.name}
                        </h3>
                      </div>
                    </div>

                    <p className="text-xs text-slate-500 dark:text-slate-400 min-h-[36px] mb-4">
                      {info.tagline}
                    </p>

                    <div className="mb-5 pb-5 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-black text-slate-900 dark:text-white">
                          {formatBRL(info.price)}
                        </span>
                        <span className="text-xs text-slate-500 font-semibold">/ mês</span>
                      </div>
                      <span className="text-[11px] text-slate-400">
                        Cobrança mensal automatizada
                      </span>
                    </div>

                    <div className="space-y-2.5 text-xs">
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                        O que está incluso:
                      </span>
                      {info.features.map((feat, idx) => (
                        <div key={idx} className="flex items-start gap-2">
                          <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                          <span className="text-slate-700 dark:text-slate-200 leading-tight">
                            {feat}
                          </span>
                        </div>
                      ))}

                      {info.notIncluded && (
                        <>
                          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block pt-2">
                            Não inclui:
                          </span>
                          {info.notIncluded.map((nInc, idx) => (
                            <div key={idx} className="flex items-start gap-2 opacity-60">
                              <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                              <span className="text-slate-500 dark:text-slate-400 line-through text-[11px] leading-tight">
                                {nInc}
                              </span>
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                    {isCurrent ? (
                      <div className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-center font-bold text-xs">
                        Plano Vigente
                      </div>
                    ) : isMaster && onSelectPlan ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleApplyPlanDirectly('basico');
                        }}
                        disabled={isUpdating}
                        className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors cursor-pointer"
                      >
                        Definir Plano Básico
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleWhatsAppContact('basico');
                        }}
                        className="w-full py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <MessageCircle className="w-3.5 h-3.5 text-blue-500" />
                        <span>Falar no WhatsApp</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* PLANO 2: PROFISSIONAL IA (R$ 200) */}
            {(() => {
              const info = PLAN_DETAILS.pro;
              const isCurrent = currentPlan === 'pro';
              const isSelected = selectedPlan === 'pro';

              return (
                <div
                  onClick={() => setSelectedPlan('pro')}
                  className={`rounded-2xl p-5 border-2 transition-all flex flex-col justify-between cursor-pointer relative bg-white dark:bg-slate-900 ${
                    isSelected
                      ? 'border-orange-500 shadow-xl shadow-orange-500/15 ring-2 ring-orange-500/30'
                      : isCurrent
                      ? 'border-emerald-500/60 shadow-sm'
                      : 'border-slate-200 dark:border-slate-800 hover:border-orange-300'
                  }`}
                >
                  <div className="absolute -top-3 right-4 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full shadow-md flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Mais Escolhido
                  </div>

                  {isCurrent && (
                    <div className="absolute -top-3 left-4 bg-emerald-600 text-white text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full shadow-sm flex items-center gap-1">
                      <Check className="w-3 h-3" /> Seu Plano Atual
                    </div>
                  )}

                  <div>
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <span className="text-[11px] font-black uppercase tracking-wider text-orange-600 dark:text-orange-400">
                          Automação Inteligente
                        </span>
                        <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span>{info.name}</span>
                          <Sparkles className="w-4 h-4 text-orange-500" />
                        </h3>
                      </div>
                    </div>

                    <p className="text-xs text-slate-500 dark:text-slate-400 min-h-[36px] mb-4">
                      {info.tagline}
                    </p>

                    <div className="mb-5 pb-5 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-black text-slate-900 dark:text-white text-orange-600 dark:text-orange-400">
                          {formatBRL(info.price)}
                        </span>
                        <span className="text-xs text-slate-500 font-semibold">/ mês</span>
                      </div>
                      <span className="text-[11px] text-slate-400">
                        Liberdade total com Foto OCR e Voz
                      </span>
                    </div>

                    <div className="space-y-2.5 text-xs">
                      <span className="text-[10px] font-black uppercase text-orange-600 dark:text-orange-400 tracking-wider block">
                        O que está incluso:
                      </span>
                      {info.features.map((feat, idx) => (
                        <div key={idx} className="flex items-start gap-2">
                          <Check className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                          <span className="text-slate-800 dark:text-slate-100 font-medium leading-tight">
                            {feat}
                          </span>
                        </div>
                      ))}

                      {info.notIncluded && (
                        <>
                          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block pt-2">
                            Não inclui:
                          </span>
                          {info.notIncluded.map((nInc, idx) => (
                            <div key={idx} className="flex items-start gap-2 opacity-60">
                              <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                              <span className="text-slate-500 dark:text-slate-400 line-through text-[11px] leading-tight">
                                {nInc}
                              </span>
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                    {isCurrent ? (
                      <div className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-center font-bold text-xs">
                        Plano Vigente
                      </div>
                    ) : isMaster && onSelectPlan ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleApplyPlanDirectly('pro');
                        }}
                        disabled={isUpdating}
                        className="w-full py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-black text-xs transition-colors cursor-pointer shadow-md shadow-orange-600/30"
                      >
                        Ativar Plano Profissional IA
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleWhatsAppContact('pro');
                        }}
                        className="w-full py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-black text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-orange-600/30"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>Fazer Upgrade para IA</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* PLANO 3: VIP / ENTERPRISE (R$ 300) */}
            {(() => {
              const info = PLAN_DETAILS.enterprise;
              const isCurrent = currentPlan === 'enterprise';
              const isSelected = selectedPlan === 'enterprise';

              return (
                <div
                  onClick={() => setSelectedPlan('enterprise')}
                  className={`rounded-2xl p-5 border-2 transition-all flex flex-col justify-between cursor-pointer relative bg-gradient-to-b from-purple-50/50 via-white to-white dark:from-purple-950/20 dark:via-slate-900 dark:to-slate-900 ${
                    isSelected
                      ? 'border-purple-600 shadow-xl shadow-purple-600/20 ring-2 ring-purple-600/30'
                      : isCurrent
                      ? 'border-emerald-500/60 shadow-sm'
                      : 'border-purple-200 dark:border-purple-900/60 hover:border-purple-400'
                  }`}
                >
                  <div className="absolute -top-3 right-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full shadow-md flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-amber-300" /> VIP Completo
                  </div>

                  {isCurrent && (
                    <div className="absolute -top-3 left-4 bg-emerald-600 text-white text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full shadow-sm flex items-center gap-1">
                      <Check className="w-3 h-3" /> Seu Plano Atual
                    </div>
                  )}

                  <div>
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <span className="text-[11px] font-black uppercase tracking-wider text-purple-600 dark:text-purple-400">
                          Jclan + Implantação & Treinamento
                        </span>
                        <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span>{info.name}</span>
                        </h3>
                      </div>
                    </div>

                    <p className="text-xs text-slate-500 dark:text-slate-400 min-h-[36px] mb-4">
                      {info.tagline}
                    </p>

                    <div className="mb-5 pb-5 border-b border-purple-100 dark:border-purple-900/40">
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-black text-purple-600 dark:text-purple-400">
                          {formatBRL(info.price)}
                        </span>
                        <span className="text-xs text-slate-500 font-semibold">/ mês</span>
                      </div>
                      <span className="text-[11px] text-slate-400">
                        Integração Jclan + Assessoria Direta
                      </span>
                    </div>

                    <div className="space-y-2.5 text-xs">
                      <span className="text-[10px] font-black uppercase text-purple-600 dark:text-purple-400 tracking-wider block">
                        Tudo liberado sem limites:
                      </span>
                      {info.features.map((feat, idx) => (
                        <div key={idx} className="flex items-start gap-2">
                          <Check className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
                          <span className="text-slate-900 dark:text-slate-100 font-semibold leading-tight">
                            {feat}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-purple-100 dark:border-purple-900/40">
                    {isCurrent ? (
                      <div className="w-full py-2.5 rounded-xl bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 text-center font-bold text-xs">
                        Plano VIP Vigente
                      </div>
                    ) : isMaster && onSelectPlan ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleApplyPlanDirectly('enterprise');
                        }}
                        disabled={isUpdating}
                        className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs transition-colors cursor-pointer shadow-md shadow-purple-600/30"
                      >
                        Ativar Plano VIP Enterprise
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleWhatsAppContact('enterprise');
                        }}
                        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-purple-600/30"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>Contratar Plano VIP</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Destaque do Suporte / Implantação e Contato */}
          <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 border border-slate-800">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                <Headphones className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-extrabold text-sm text-white">
                  Dúvidas sobre qual plano escolher para seu bar?
                </h4>
                <p className="text-xs text-slate-300 mt-0.5">
                  Fale diretamente com <strong>Bruno Lima (Dono do SaaS)</strong> pelo WhatsApp{' '}
                  <span className="text-emerald-400 font-mono font-bold">(41) 99882-1917</span>.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleWhatsAppContact(selectedPlan)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs py-3 px-5 rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all cursor-pointer whitespace-nowrap active:scale-95"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Chamar no WhatsApp Agora</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Faturamento seguro, cancelamento a qualquer momento e sem taxa de adesão.</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
