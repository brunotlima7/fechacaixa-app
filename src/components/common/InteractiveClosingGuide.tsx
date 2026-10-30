import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Minimize2,
  Maximize2,
  DollarSign,
  CreditCard,
  FileText,
  Calculator,
  ShieldCheck,
  LocateFixed,
  Lock,
  Check
} from 'lucide-react';
import { formatCurrency } from '../../App.tsx';

export interface InteractiveClosingGuideProps {
  isOpen: boolean;
  onClose: () => void;
  cardName?: string;
  pdvName?: string;
  // Métricas reais da tela para validação de cada tarefa
  cashTotal: number;
  hasCashData: boolean;
  getnetTotal: number;
  jclanTotal: number;
  hasDivergences: boolean;
  selectedExclusionCount: number;
  instructionsCount: number;
  onOpenPdvSummary?: () => void;
  onOpenSaveClosing?: () => void;
  onShowToast?: (msg: string) => void;
}

export const InteractiveClosingGuide: React.FC<InteractiveClosingGuideProps> = ({
  isOpen,
  onClose,
  cardName = 'Getnet',
  pdvName = 'Jclan',
  cashTotal,
  hasCashData,
  getnetTotal,
  jclanTotal,
  hasDivergences,
  selectedExclusionCount,
  instructionsCount,
  onOpenPdvSummary,
  onOpenSaveClosing,
  onShowToast,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);

  // Definição das etapas guiadas com alvo DOM, tarefa real e validação
  const steps = [
    {
      id: 0,
      title: '1. Gaveta Física (Dinheiro)',
      subtitle: 'Contagem das notas, moedas e conferência da gaveta',
      targetSelector: '#section-cash-drawer',
      focusInputId: 'cash-b100',
      icon: DollarSign,
      color: 'emerald',
      instruction:
        'Conte o dinheiro físico presente na gaveta e digite a quantidade de ao menos uma cédula/moeda (ex: R$ 100 ou R$ 50) ou o Fundo de Abertura.',
      hint: 'O sistema calcula o total em reais na hora e confere se há sobra ou falta no caixa.',
      isTaskCompleted: hasCashData || cashTotal > 0,
      completionMessage: `Dinheiro físico registrado: ${formatCurrency(cashTotal)}. Muito bem!`,
      pendingMessage: 'Aguardando você digitar notas, moedas ou troco inicial no campo destacado em azul.',
    },
    {
      id: 1,
      title: `2. Maquininhas de Cartão (${cardName})`,
      subtitle: 'Lançamento das vendas por maquininha ou foto/OCR',
      targetSelector: '#machine-card-1',
      focusInputId: 'input-1-credits-0',
      icon: CreditCard,
      color: 'blue',
      instruction:
        `Pegue o comprovante impresso de fechamento diário da Maquininha 1 e digite ao menos um valor de Crédito, Débito, Voucher ou Pix (ou use o botão da câmera para leitura via IA).`,
      hint: `Você pode navegar entre os campos pelas setas do teclado (←, →, ↑, ↓) para agilizar o lançamento.`,
      isTaskCompleted: getnetTotal > 0,
      completionMessage: `Maquininhas registradas: ${formatCurrency(getnetTotal)}. Tarefa concluída!`,
      pendingMessage: `Aguardando você preencher ao menos um valor de cartão na Maquininha 1 em destaque.`,
    },
    {
      id: 2,
      title: `3. Totais do Relatório do ${pdvName}`,
      subtitle: `Conferência com o sistema de gestão do bar`,
      targetSelector: '#pdv-totals-bar',
      focusInputId: 'jclan-credit',
      icon: FileText,
      color: 'orange',
      instruction:
        `Tire o relatório diário do sistema ${pdvName} e digite os valores totais nos campos "${pdvName}: R$ 0,00" na barra superior (Crédito, Débito, Pix ou Voucher).`,
      hint: `O sistema compara em tempo real ${cardName} vs ${pdvName} calculando as diferenças no centavo.`,
      isTaskCompleted: jclanTotal > 0,
      completionMessage: `Totais do ${pdvName} preenchidos: ${formatCurrency(jclanTotal)}. Ótimo!`,
      pendingMessage: `Aguardando você digitar ao menos um total do ${pdvName} na barra fixa destacada.`,
    },
    {
      id: 3,
      title: '4. Assistente de Conciliação & Zeramento',
      subtitle: 'Zerar divergências no centavo exato com itens do cardápio',
      targetSelector: '#section-reconciliation-assistant',
      focusInputId: undefined,
      icon: Calculator,
      color: 'purple',
      instruction:
        `Se houver divergência, verifique as instruções de troca de forma de pagamento ou use as calculadoras inteligentes (comanda reaberta para falta, ou nova comanda para sobra) e marque a opção usada.`,
      hint: `Se o caixa já estiver 100% batendo (diferença R$ 0,00), a tarefa é concluída automaticamente!`,
      isTaskCompleted: !hasDivergences || selectedExclusionCount > 0 || instructionsCount > 0,
      completionMessage: !hasDivergences
        ? 'Caixa 100% batendo! Nenhuma divergência a corrigir.'
        : 'Opções de zeramento e conciliação selecionadas com sucesso!',
      pendingMessage: 'Se houver diferença, selecione uma opção recomendada de zeramento nas calculadoras abaixo.',
    },
    {
      id: 4,
      title: '5. Revisão no PDV & Salvar Fechamento',
      subtitle: 'Auditoria do turno, comprovantes e envio do relatório',
      targetSelector: '#section-closing-actions',
      focusInputId: undefined,
      icon: ShieldCheck,
      color: 'emerald',
      instruction:
        `Clique em "O que Lançar no ${pdvName}" para a conferência final sobreposta na tela. Depois, clique em "Salvar Fechamento" para anexar os comprovantes das maquininhas e arquivar na nuvem.`,
      hint: `Ao salvar, o sistema grava o tempo de fechamento do operador e gera o relatório completo para o WhatsApp.`,
      isTaskCompleted: true,
      completionMessage: 'Parabéns! Você dominou o fluxo completo de fechamento de caixa sem erros.',
      pendingMessage: 'Clique nos botões de conferência ou de salvar fechamento para concluir seu turno.',
    },
  ];

  const currentStepData = steps[currentStep];

  // Efeito de Spotlight: Destaque luminoso azul piscando e scroll suave até o alvo
  const scrollToTarget = () => {
    if (!isOpen) return;
    const selector = currentStepData?.targetSelector;
    if (!selector) return;

    // Remove destaque anterior de qualquer elemento
    document.querySelectorAll('.tutorial-spotlight-active').forEach((el) => {
      el.classList.remove('tutorial-spotlight-active');
    });

    const targetEl = document.querySelector(selector) as HTMLElement | null;
    if (targetEl) {
      targetEl.classList.add('tutorial-spotlight-active');
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });

      // Foca automaticamente no input principal se definido
      if (currentStepData.focusInputId) {
        setTimeout(() => {
          const inputEl = document.getElementById(currentStepData.focusInputId!) as HTMLInputElement | null;
          if (inputEl) {
            inputEl.focus();
            inputEl.select?.();
          }
        }, 400);
      }
    }
  };

  useEffect(() => {
    scrollToTarget();

    return () => {
      document.querySelectorAll('.tutorial-spotlight-active').forEach((el) => {
        el.classList.remove('tutorial-spotlight-active');
      });
    };
  }, [currentStep, isOpen]);

  if (!isOpen) return null;

  const Icon = currentStepData.icon;
  const isUnlocked = currentStepData.isTaskCompleted;

  // Visualização Minimizada (Pílula discreta no canto inferior direito)
  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-[95] animate-in fade-in slide-in-from-bottom-2 duration-200">
        <button
          onClick={() => setIsMinimized(false)}
          className="bg-slate-900/95 hover:bg-slate-800 text-white border-2 border-blue-500 shadow-2xl rounded-2xl px-4 py-3 flex items-center gap-3 transition-all cursor-pointer hover:scale-105 active:scale-95"
          title="Expandir Tutorial Interativo"
        >
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
          </span>
          <div className="text-left">
            <span className="text-[10px] font-black uppercase tracking-wider text-blue-400 block">
              Passo {currentStep + 1} de {steps.length}
            </span>
            <span className="text-xs font-bold text-white truncate max-w-[180px] block">
              {currentStepData.title}
            </span>
          </div>
          <Maximize2 className="w-4 h-4 text-slate-400 ml-1" />
        </button>
      </div>
    );
  }

  // Caixa Flutuante Principal no Canto Inferior Direito (Sem Bloquear a Tela)
  return (
    <div className="fixed bottom-3 right-3 sm:bottom-5 sm:right-5 z-[95] w-[94vw] sm:w-[410px] max-w-[420px] animate-in fade-in slide-in-from-bottom-3 duration-200 select-none">
      <div className="bg-slate-900/95 backdrop-blur-md text-white border-2 border-blue-500/80 shadow-[0_15px_40px_rgba(0,0,0,0.6)] rounded-3xl overflow-hidden flex flex-col">
        {/* Cabeçalho Flutuante com Barra de Progresso */}
        <div className="p-4 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border-b border-slate-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.2 rounded-full">
                  Tutorial Passo a Passo
                </span>
                <span className="text-[10px] text-slate-400 font-bold">
                  {currentStep + 1} / {steps.length}
                </span>
              </div>
              <h4 className="text-xs font-black text-white leading-tight mt-0.5">
                Acompanhando a sua tarefa
              </h4>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsMinimized(true)}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Minimizar para o canto da tela"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Fechar Tutorial"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Indicador de Passos (Mini Stepper) */}
        <div className="bg-slate-950/80 px-4 py-2 border-b border-slate-800/80 flex items-center justify-between gap-1">
          {steps.map((st, idx) => {
            const isPast = idx < currentStep;
            const isCurrent = idx === currentStep;
            return (
              <button
                key={st.id}
                onClick={() => {
                  if (idx <= currentStep || st.isTaskCompleted) {
                    setCurrentStep(idx);
                  } else {
                    onShowToast?.(`Conclua o passo atual para liberar o passo ${idx + 1}.`);
                  }
                }}
                className={`flex-1 h-1.5 rounded-full transition-all cursor-pointer ${
                  isCurrent
                    ? 'bg-blue-500 ring-2 ring-blue-400/50'
                    : isPast || st.isTaskCompleted
                    ? 'bg-emerald-400'
                    : 'bg-slate-800 hover:bg-slate-700'
                }`}
                title={`Passo ${idx + 1}: ${st.title}`}
              />
            );
          })}
        </div>

        {/* Corpo da Tarefa Atual */}
        <div className="p-4 sm:p-5 space-y-3.5 max-h-[62vh] overflow-y-auto">
          {/* Título da Tarefa e Botão de Focar Alvo */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <h5 className="font-extrabold text-sm text-white leading-tight">
                  {currentStepData.title}
                </h5>
                <span className="text-[11px] text-slate-400 block leading-tight">
                  {currentStepData.subtitle}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={scrollToTarget}
              className="text-[10px] font-bold text-blue-300 hover:text-blue-200 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 px-2 py-1 rounded-lg flex items-center gap-1 transition-all shrink-0 cursor-pointer"
              title="Focar no campo destacado na tela"
            >
              <LocateFixed className="w-3 h-3 text-blue-400 animate-pulse" />
              <span>Focar Alvo</span>
            </button>
          </div>

          {/* Instrução Principal */}
          <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 text-xs text-slate-200 leading-relaxed">
            <strong className="text-blue-300 block mb-1">🎯 Sua tarefa agora:</strong>
            <p>{currentStepData.instruction}</p>
          </div>

          {/* Dica de Especialista */}
          <p className="text-[11px] text-slate-400 leading-normal pl-1">
            💡 <span className="font-semibold text-slate-300">Dica:</span> {currentStepData.hint}
          </p>

          {/* Card de Status da Ação Real (Aguardando vs Liberado) */}
          <div
            className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 transition-all ${
              isUnlocked
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-200'
            }`}
          >
            {isUnlocked ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            )}
            <div className="leading-snug">
              <strong className="font-bold block">
                {isUnlocked ? 'Tarefa Concluída!' : 'Ação Necessária:'}
              </strong>
              <span className="text-[11px] opacity-90">
                {isUnlocked ? currentStepData.completionMessage : currentStepData.pendingMessage}
              </span>
            </div>
          </div>

          {/* Ações Especiais no Passo Final */}
          {currentStep === 4 && (
            <div className="pt-2 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  onOpenPdvSummary?.();
                }}
                className="w-full bg-slate-800 hover:bg-slate-750 text-emerald-300 border border-emerald-500/40 text-xs font-bold py-2 rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-all"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Abrir Resumo do que Lançar no {pdvName}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenSaveClosing?.();
                }}
                className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-slate-950 text-xs font-black py-2.5 rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all active:scale-[0.98]"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Salvar Fechamento Agora</span>
              </button>
            </div>
          )}
        </div>

        {/* Rodapé Flutuante: Botões Anterior & Próximo (Bloqueado/Cinza até a Tarefa Real Ser Feita) */}
        <div className="p-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-2">
          <button
            type="button"
            disabled={currentStep === 0}
            onClick={() => setCurrentStep((prev) => Math.max(0, prev - 1))}
            className="px-3 py-2 rounded-xl text-xs font-bold text-slate-400 bg-slate-900 border border-slate-800 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Voltar</span>
          </button>

          {currentStep < steps.length - 1 ? (
            <button
              type="button"
              disabled={!isUnlocked}
              onClick={() => {
                if (isUnlocked) {
                  setCurrentStep((prev) => Math.min(steps.length - 1, prev + 1));
                } else {
                  onShowToast?.('Por favor, preencha o campo destacado em azul para liberar o próximo passo.');
                }
              }}
              className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 transition-all select-none ${
                isUnlocked
                  ? 'bg-emerald-400 hover:bg-emerald-300 text-slate-950 shadow-lg shadow-emerald-400/20 active:scale-95 cursor-pointer animate-pulse'
                  : 'bg-slate-800 text-slate-500 border border-slate-700/60 cursor-not-allowed opacity-60'
              }`}
              title={
                isUnlocked
                  ? 'Avançar para a próxima tarefa'
                  : 'Realize a tarefa no campo destacado para liberar o botão'
              }
            >
              <span>{isUnlocked ? 'Próximo Passo' : 'Bloqueado (Faça a tarefa)'}</span>
              {isUnlocked ? <ArrowRight className="w-4 h-4" /> : <Lock className="w-3.5 h-3.5" />}
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-black bg-emerald-400 hover:bg-emerald-300 text-slate-950 flex items-center gap-2 shadow-lg shadow-emerald-400/30 transition-all cursor-pointer active:scale-95"
            >
              <Check className="w-4 h-4" />
              <span>Concluir Tutorial</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
