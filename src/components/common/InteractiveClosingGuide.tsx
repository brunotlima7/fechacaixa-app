import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
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
  Check,
  BookOpen,
  HelpCircle,
  Lightbulb,
  ChevronRight,
  Download,
  Layers,
  ListChecks,
  Compass,
  Plus,
  Mic
} from 'lucide-react';
import { formatCurrency } from '../../App.tsx';

export interface InteractiveClosingGuideProps {
  isOpen: boolean;
  onClose: () => void;
  cardName?: string;
  pdvName?: string;
  // Métricas reais da tela para diagnóstico e ensino em tempo real
  cashTotal: number;
  hasCashData: boolean;
  cashOpening?: number;
  cashPdvSales?: number;
  cashExpenses?: number;
  cashDifference?: number;
  machinesCount?: number;
  filledMachinesCount?: number;
  getnetTotal: number;
  jclanTotal: number;
  jclanCredit?: number;
  jclanDebit?: number;
  jclanPix?: number;
  jclanVoucher?: number;
  differenceTotal?: number;
  hasDivergences: boolean;
  unresolvableCount?: number;
  selectedExclusionCount: number;
  instructionsCount: number;
  onOpenPdvSummary?: () => void;
  onOpenSaveClosing?: () => void;
  onDownloadPdf?: () => void;
  onAddMachine?: () => void;
  onOpenVoice?: () => void;
  onShowToast?: (msg: string) => void;
}

interface SubTaskItem {
  label: string;
  done: boolean;
  detail: string;
  focusId?: string;
  targetSelector?: string;
}

export const InteractiveClosingGuide: React.FC<InteractiveClosingGuideProps> = ({
  isOpen,
  onClose,
  cardName = 'Getnet',
  pdvName = 'Jclan',
  cashTotal,
  hasCashData,
  cashOpening = 0,
  cashPdvSales = 0,
  cashExpenses = 0,
  cashDifference = 0,
  machinesCount = 0,
  filledMachinesCount = 0,
  getnetTotal,
  jclanTotal,
  jclanCredit = 0,
  jclanDebit = 0,
  jclanPix = 0,
  jclanVoucher = 0,
  differenceTotal = 0,
  hasDivergences,
  unresolvableCount = 0,
  selectedExclusionCount,
  instructionsCount,
  onOpenPdvSummary,
  onOpenSaveClosing,
  onDownloadPdf,
  onAddMachine,
  onOpenVoice,
  onShowToast,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [viewMode, setViewMode] = useState<'copilot' | 'expanded' | 'minimized'>('copilot');
  const [activeTab, setActiveTab] = useState<'step' | 'checklist' | 'faq'>('step');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const hasCashSummaryFilled = cashOpening > 0 || cashPdvSales > 0 || cashExpenses > 0;
  const isCashStepDone = cashTotal > 0;
  const isCashSummaryStepDone = hasCashSummaryFilled || (cashTotal > 0 && Math.abs(cashDifference) < 0.01);
  const isMachinesStepDone = getnetTotal > 0 || filledMachinesCount > 0;
  const isPdvStepDone = jclanTotal > 0;
  const isReconciliationStepDone =
    (isMachinesStepDone || isPdvStepDone || isCashStepDone) &&
    (!hasDivergences ||
      (unresolvableCount === 0 && instructionsCount > 0) ||
      (unresolvableCount > 0 && selectedExclusionCount >= unresolvableCount));

  // Definição pedagógica completa das 6 etapas para operadores inexperientes
  const steps = useMemo(
    () => [
      {
        id: 0,
        shortLabel: '1. Contar Notas',
        title: 'Passo 1: Contagem Física da Gaveta',
        subtitle: 'Conte as cédulas e moedas que estão fisicamente na gaveta',
        targetSelector: '#section-cash-drawer',
        focusInputId: 'cash-b100',
        icon: DollarSign,
        isCompleted: isCashStepDone,
        whereToFind:
          'Abra a gaveta física do caixa. Separe as notas por valor (R$ 200, R$ 100, R$ 50, R$ 20, R$ 10, R$ 5 e R$ 2) e as moedas. Atenção: nos campos da esquerda você digita a QUANTIDADE de notas (ex: "3" notas de R$ 50), e não R$ 150,00.',
        instruction:
          'Conte cada pilha de cédulas e moedas da gaveta e digite a quantidade correspondente nos campos da Seção 1.',
        proTip:
          'Use as setas para cima (↑) e para baixo (↓) do teclado para descer rapidamente de R$ 200 até R$ 0,05.',
        subTasks: [
          {
            label: 'Contar e digitar quantidade de cédulas/moedas na gaveta',
            done: cashTotal > 0,
            detail: cashTotal > 0 ? `Total contado: ${formatCurrency(cashTotal)}` : 'Nenhuma nota contada ainda',
            focusId: 'cash-b100',
            targetSelector: '#section-cash-drawer',
          },
        ] as SubTaskItem[],
        statusSummary:
          cashTotal > 0
            ? `Dinheiro contado na gaveta: ${formatCurrency(cashTotal)}.`
            : 'Digite a quantidade de notas ou moedas para calcular o total da gaveta.',
      },
      {
        id: 1,
        shortLabel: '2. Troco & Sangrias',
        title: 'Passo 2: Abertura, Vendas em Espécie e Sangrias',
        subtitle: 'Informe quanto deveria haver na gaveta para o sistema comparar',
        targetSelector: '#section-cash-drawer',
        focusInputId: 'cash-summary-opening',
        icon: Calculator,
        isCompleted: isCashSummaryStepDone,
        whereToFind:
          `• Abertura de Caixa: É o fundo de troco que já estava na gaveta no início do turno.\n• ${pdvName} (Dinheiro): Olhe no relatório impresso do sistema ${pdvName} a linha "Dinheiro / Espécie".\n• Pagamentos (Sangrias): Some todos os vales, recibos de gelo, limão, motoboy ou retiradas pagas com dinheiro da gaveta.`,
        instruction:
          `No quadro escuro à direita da Gaveta, preencha a Abertura de Caixa, o valor de Dinheiro que consta no ${pdvName} e o total de Pagamentos/Sangrias.`,
        proTip:
          'Fórmula automática do sistema: Caixa Esperado = Abertura + Vendas em Dinheiro - Pagamentos. Se bater com o dinheiro contado, ficará Verde (100%)!',
        subTasks: [
          {
            label: 'Informar Abertura de Caixa (Fundo de Troco)',
            done: cashOpening > 0,
            detail: cashOpening > 0 ? formatCurrency(cashOpening) : 'R$ 0,00 (ou digite se houve fundo)',
            focusId: 'cash-summary-opening',
            targetSelector: '#section-cash-drawer',
          },
          {
            label: `Informar Vendas em Dinheiro no ${pdvName}`,
            done: cashPdvSales > 0,
            detail: cashPdvSales > 0 ? formatCurrency(cashPdvSales) : 'Aguardando valor do relatório PDV',
            focusId: 'cash-summary-jclanCash',
            targetSelector: '#section-cash-drawer',
          },
          {
            label: 'Conferir Sangrias / Despesas pagas em espécie',
            done: cashExpenses > 0 || cashOpening > 0 || cashPdvSales > 0,
            detail: cashExpenses > 0 ? `Saídas: ${formatCurrency(cashExpenses)}` : 'R$ 0,00 sem saídas registradas',
            focusId: 'cash-summary-expenses',
            targetSelector: '#section-cash-drawer',
          },
        ] as SubTaskItem[],
        statusSummary:
          hasCashSummaryFilled
            ? `Gaveta conferida! Diferença atual em dinheiro: ${formatCurrency(cashDifference)}.`
            : 'Preencha os campos de Abertura, Dinheiro do PDV e Pagamentos no quadro à direita da Gaveta.',
      },
      {
        id: 2,
        shortLabel: `3. Maquininhas`,
        title: `Passo 3: Fechamento das Maquininhas (${cardName})`,
        subtitle: 'Lance os comprovantes impressos de cada maquininha de cartão',
        targetSelector: '#machine-card-1',
        focusInputId: 'input-1-credits-0',
        icon: CreditCard,
        isCompleted: isMachinesStepDone,
        whereToFind:
          `Em cada maquininha física (${cardName}), imprima o "Relatório de Fechamento / Subtotal do Dia". Procure os totais separados por modalidade: Crédito, Débito, Voucher (Alelo, Ticket, VR, Sodexo) e Pix QR Code passado na máquina.`,
        instruction:
          'Para cada maquininha usada no turno, digite os valores de Crédito, Débito, Voucher e Pix — ou clique no ícone azul de Upload/Câmera na maquininha para leitura automática.',
        proTip:
          'Se uma maquininha teve mais de 5 bandeiras, clique no botão "+" ao lado de Crédito, Débito ou Voucher para abrir mais campos.',
        subTasks: [
          {
            label: 'Ter ao menos 1 maquininha adicionada na grade',
            done: machinesCount > 0,
            detail: machinesCount > 0 ? `${machinesCount} maquininha(s) na tela` : 'Clique em "+ Nova Máquina"',
            targetSelector: '#machine-card-1',
          },
          {
            label: `Lançar valores das maquininhas (${cardName})`,
            done: getnetTotal > 0,
            detail:
              getnetTotal > 0
                ? `${filledMachinesCount} máquina(s) preenchida(s) • Total: ${formatCurrency(getnetTotal)}`
                : 'Aguardando preenchimento das máquinas',
            focusId: 'input-1-credits-0',
            targetSelector: '#machine-card-1',
          },
        ] as SubTaskItem[],
        statusSummary:
          getnetTotal > 0
            ? `Soma das maquininhas (${cardName}): ${formatCurrency(getnetTotal)} (${filledMachinesCount} de ${machinesCount} com movimento).`
            : 'Adicione ou preencha os valores impressos nas maquininhas de cartão.',
      },
      {
        id: 3,
        shortLabel: `4. Totais ${pdvName}`,
        title: `Passo 4: Relatório do Sistema (${pdvName})`,
        subtitle: 'Digite o que o sistema de computador do bar registrou em cartões',
        targetSelector: '#pdv-totals-bar',
        focusInputId: 'jclan-credit',
        icon: FileText,
        isCompleted: isPdvStepDone,
        whereToFind:
          `No computador do caixa (${pdvName}), emita a conferência de caixa / leitura X do turno. Localize o resumo por forma de pagamento: Total em Cartão de Crédito, Cartão de Débito, Pix e Vouchers.`,
        instruction:
          `Na barra superior fixa da tela, preencha os 4 campos "${pdvName}: R$ 0,00" (Crédito, Débito, Pix e Voucher). O sistema calculará na hora a diferença contra as maquininhas.`,
        proTip:
          'Entenda as cores abaixo de cada cartão: VERDE/CINZA (Dif R$ 0,00 = Batendo 100%), VERDE CLARO (Sobra na maquininha) e VERMELHO (Falta na maquininha).',
        subTasks: [
          {
            label: `Preencher Crédito do ${pdvName}`,
            done: jclanCredit > 0,
            detail: jclanCredit > 0 ? formatCurrency(jclanCredit) : 'R$ 0,00',
            focusId: 'jclan-credit',
            targetSelector: '#pdv-totals-bar',
          },
          {
            label: `Preencher Débito do ${pdvName}`,
            done: jclanDebit > 0,
            detail: jclanDebit > 0 ? formatCurrency(jclanDebit) : 'R$ 0,00',
            focusId: 'jclan-debit',
            targetSelector: '#pdv-totals-bar',
          },
          {
            label: `Preencher Pix e Voucher do ${pdvName}`,
            done: jclanPix > 0 || jclanVoucher > 0,
            detail: `Pix: ${formatCurrency(jclanPix)} • Voucher: ${formatCurrency(jclanVoucher)}`,
            focusId: 'jclan-pix',
            targetSelector: '#pdv-totals-bar',
          },
        ] as SubTaskItem[],
        statusSummary:
          jclanTotal > 0
            ? `Total no ${pdvName}: ${formatCurrency(jclanTotal)} • Diferença de Cartões: ${formatCurrency(differenceTotal)}.`
            : `Digite os valores do relatório do ${pdvName} na barra superior para comparar com as maquininhas.`,
      },
      {
        id: 4,
        shortLabel: '5. Conciliação',
        title: 'Passo 5: Assistente de Conciliação & Zeramento',
        subtitle: 'Resolva trocas de bandeira, sobras ou faltas no centavo exato',
        targetSelector: '#section-reconciliation-assistant',
        focusInputId: undefined,
        icon: Compass,
        isCompleted: isReconciliationStepDone,
        whereToFind:
          `Role até a Seção 3 ("Assistente de Conciliação no ${pdvName}").\n• Se um garçom fechou Débito como Crédito por engano, o sistema mostrará em azul: "Altere o pagamento tirando de X colocando em Y".\n• Se ainda sobrar ou faltar valor, o sistema sugere automaticamente quais itens do cardápio lançar ou excluir com desconto de no máximo R$ 1,00.`,
        instruction:
          !hasDivergences
            ? 'Seu caixa já está batendo 100%! Nenhuma correção de comanda é necessária.'
            : unresolvableCount > 0
            ? `Analise as sugestões calculadas pelo sistema na Seção 3 e clique em "Marcar esta Opção" para cada divergência (${selectedExclusionCount} de ${unresolvableCount} marcada[s]).`
            : `Aplique no ${pdvName} as ${instructionsCount} transferência(s) de forma de pagamento indicadas pelo Assistente.`,
        proTip:
          'Para SOBRA, sempre criamos uma Nova Comanda SEM os 10% de taxa. Para FALTA, reabrimos uma comanda paga e excluímos/trocamos itens.',
        subTasks: [
          {
            label: 'Verificar Transferências entre Formas de Pagamento',
            done: true,
            detail:
              instructionsCount > 0
                ? `${instructionsCount} troca(s) simples detectada(s) entre modalidades`
                : 'Nenhuma troca cruzada pendente',
            targetSelector: '#section-reconciliation-assistant',
          },
          {
            label: 'Marcar opção de zeramento para Sobras ou Faltas',
            done: unresolvableCount === 0 || selectedExclusionCount >= unresolvableCount,
            detail:
              unresolvableCount === 0
                ? 'Sem sobras ou faltas líquidas!'
                : `${selectedExclusionCount} de ${unresolvableCount} divergência(s) com solução marcada`,
            targetSelector: '#section-reconciliation-assistant',
          },
        ] as SubTaskItem[],
        statusSummary: !hasDivergences
          ? 'Caixa 100% conciliado! Não há diferenças pendentes.'
          : unresolvableCount === 0
          ? `Apenas ${instructionsCount} transferência(s) entre formas de pagamento. Sem sobra/falta real!`
          : `${selectedExclusionCount} de ${unresolvableCount} opção(ões) de zeramento selecionada(s).`,
      },
      {
        id: 5,
        shortLabel: '6. Finalizar & PDF',
        title: 'Passo 6: Conferência Final no PDV, PDF e Salvamento',
        subtitle: 'Confira se o PDV bateu 100%, baixe o PDF e salve na nuvem',
        targetSelector: '#section-closing-actions',
        focusInputId: undefined,
        icon: ShieldCheck,
        isCompleted: isReconciliationStepDone && (isMachinesStepDone || isCashStepDone),
        whereToFind:
          `No final da página (Seção 4), clique primeiro em "O que Lançar no ${pdvName}" para ver o checklist final de lançamentos e valores por bandeira. Depois clique em "Salvar Fechamento" para anexar fotos dos comprovantes e baixar o PDF oficial.`,
        instruction:
          `1) Clique em "O que Lançar no ${pdvName}" e confirme que os números finais batem.\n2) Clique em "Baixar PDF Profissional" para guardar ou imprimir o documento.\n3) Clique em "Salvar Fechamento" para encerrar seu turno!`,
        proTip:
          'Se já passou da meia-noite (madrugada), na janela de Salvar Fechamento escolha a opção "Ontem (Dia Anterior)" para o relatório ficar na data certa do turno.',
        subTasks: [
          {
            label: `Revisar quadro "O que Lançar no ${pdvName}"`,
            done: isReconciliationStepDone,
            detail: 'Checklist final de valores por modalidade e bandeira',
            targetSelector: '#section-closing-actions',
          },
          {
            label: 'Baixar PDF e Salvar Fechamento no Histórico',
            done: false,
            detail: 'Gera relatório para WhatsApp + PDF assinado e limpa a tela para o próximo turno',
            targetSelector: '#section-closing-actions',
          },
        ] as SubTaskItem[],
        statusSummary:
          'Tudo pronto para revisar o resumo final, emitir o PDF profissional e salvar o fechamento!',
      },
    ],
    [
      cardName,
      pdvName,
      isCashStepDone,
      isCashSummaryStepDone,
      isMachinesStepDone,
      isPdvStepDone,
      isReconciliationStepDone,
      cashTotal,
      cashOpening,
      cashPdvSales,
      cashExpenses,
      cashDifference,
      hasCashSummaryFilled,
      machinesCount,
      filledMachinesCount,
      getnetTotal,
      jclanTotal,
      jclanCredit,
      jclanDebit,
      jclanPix,
      jclanVoucher,
      differenceTotal,
      hasDivergences,
      unresolvableCount,
      selectedExclusionCount,
      instructionsCount,
    ]
  );

  const completedStepsCount = useMemo(
    () => steps.filter((s) => s.isCompleted).length,
    [steps]
  );
  const progressPercent = Math.round((completedStepsCount / steps.length) * 100);

  const currentStepData = steps[currentStep] || steps[0];

  // Destaca na página o elemento da etapa atual e foca no campo se solicitado
  const focusStepTarget = (selector?: string, inputId?: string) => {
    if (!isOpen) return;
    const targetSel = selector || currentStepData?.targetSelector;
    const targetInput = inputId !== undefined ? inputId : currentStepData?.focusInputId;

    document.querySelectorAll('.tutorial-spotlight-active').forEach((el) => {
      el.classList.remove('tutorial-spotlight-active');
    });

    if (targetSel) {
      const targetEl = document.querySelector(targetSel) as HTMLElement | null;
      if (targetEl) {
        targetEl.classList.add('tutorial-spotlight-active');
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }

    if (targetInput) {
      setTimeout(() => {
        const inputEl = document.getElementById(targetInput) as HTMLInputElement | null;
        if (inputEl) {
          inputEl.focus();
          inputEl.select?.();
        }
      }, 350);
    }
  };

  useEffect(() => {
    if (viewMode === 'copilot' && activeTab === 'step') {
      focusStepTarget();
    }
    return () => {
      document.querySelectorAll('.tutorial-spotlight-active').forEach((el) => {
        el.classList.remove('tutorial-spotlight-active');
      });
    };
  }, [currentStep, isOpen, viewMode, activeTab]);

  // Salta automaticamente para a primeira etapa ainda pendente
  const handleJumpToNextPending = () => {
    const nextPendingIdx = steps.findIndex((s) => !s.isCompleted);
    const targetIdx = nextPendingIdx !== -1 ? nextPendingIdx : steps.length - 1;
    setCurrentStep(targetIdx);
    setActiveTab('step');
    setViewMode('copilot');
    setTimeout(() => {
      focusStepTarget(steps[targetIdx].targetSelector, steps[targetIdx].focusInputId);
    }, 60);
  };

  if (!isOpen) return null;

  const faqItems = [
    {
      q: `1. Deu FALTA no Crédito e SOBRA do mesmo valor no Débito. O que eu faço?`,
      a: `Isso acontece quando o garçom fechou a conta no ${pdvName} como Crédito, mas na maquininha passou no Débito. Você NÃO precisa excluir nem lançar itens! Basta olhar na Seção 3 ("Reabrir Comandas e Mudar Forma de Pagamento"): o sistema dirá exatamente qual valor alterar de uma forma para outra no ${pdvName}.`,
    },
    {
      q: `2. O cliente fez um Pix direto na chave CNPJ do bar (fora da maquininha). Onde lanço?`,
      a: `Se o Pix caiu direto na conta bancária do bar e foi registrado no ${pdvName}, some esse valor junto ao campo "Pix" de uma das maquininhas (ou crie uma máquina extra para Pix CNPJ) para que o confronto ${cardName} x ${pdvName} fique equilibrado.`,
    },
    {
      q: `3. O que significa "Sobra" e "Falta" nas maquininhas?`,
      a: `• SOBRA (Verde/Laranja): As maquininhas ${cardName} passaram MAIS dinheiro do que está lançado no ${pdvName} (ex: cobraram o cliente na máquina, mas esqueceram de lançar um produto no sistema). Solução: Criar uma Nova Comanda sem os 10%.\n• FALTA (Vermelho): O ${pdvName} tem MAIS valor registrado do que realmente passou nas maquininhas. Solução: Reabrir uma comanda e excluir/ajustar itens.`,
    },
    {
      q: `4. Por que itens de Happy Hour não aparecem nas sugestões de zeramento?`,
      a: `Itens promocionais ou de Happy Hour possuem trava de horário no ${pdvName} e não podem ser lançados na madrugada durante o fechamento de caixa. O sistema filtra esses itens automaticamente para evitar erros no seu PDV.`,
    },
    {
      q: `5. Estou fechando o caixa às 02h da manhã. Salvo como "Hoje" ou "Ontem"?`,
      a: `Quando o turno começou à noite e terminou na madrugada (entre 00h e 06h), clique em "Salvar Fechamento" e mantenha marcada a opção "Ontem (Dia Anterior)". Assim o fechamento fica registrado na data comercial correta da noite trabalhada.`,
    },
  ];

  // ============================================================================
  // MODO 1: MINIMIZADO (BARRA FLUTUANTE COMPACTA NO CANTO INFERIOR DIREITO)
  // ============================================================================
  if (viewMode === 'minimized') {
    return (
      <div className="fixed bottom-4 right-4 z-[95] animate-in fade-in duration-200">
        <div className="bg-slate-900/95 text-white border-2 border-blue-500 shadow-2xl rounded-2xl p-2.5 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setViewMode('copilot')}
            className="flex items-center gap-2.5 text-left cursor-pointer px-1"
            title="Restaurar Guia Interativo"
          >
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-xs shrink-0">
              {progressPercent}%
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-400 block">
                Guia Ativo • Passo {currentStep + 1}/{steps.length}
              </span>
              <span className="text-xs font-bold text-white truncate max-w-[170px] block">
                {currentStepData.shortLabel}
              </span>
            </div>
          </button>

          <div className="flex items-center gap-1 border-l border-slate-700 pl-2">
            <button
              type="button"
              onClick={() => setViewMode('copilot')}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Abrir Copiloto Lateral"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Encerrar Guia"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  const Icon = currentStepData.icon;
  const isExpandedModal = viewMode === 'expanded';

  // Container adaptável: Copiloto lateral (não bloqueia a digitação) vs Central Expandido (visão panorâmica)
  const wrapperClass = isExpandedModal
    ? 'fixed inset-0 z-[115] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-3 sm:p-5 overflow-y-auto'
    : 'fixed bottom-3 right-3 sm:bottom-5 sm:right-5 z-[95] w-[95vw] sm:w-[440px] max-w-[450px] select-none';

  const cardClass = isExpandedModal
    ? 'bg-slate-900 text-white border border-slate-700 shadow-2xl rounded-3xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh]'
    : 'bg-slate-900/98 backdrop-blur-md text-white border-2 border-blue-500/80 shadow-[0_18px_45px_rgba(0,0,0,0.65)] rounded-3xl overflow-hidden flex flex-col max-h-[84vh]';

  return (
    <div className={wrapperClass}>
      <div className={cardClass}>
        {/* CABEÇALHO DO SISTEMA DE NAVEGAÇÃO INTUITIVA */}
        <div className="p-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-slate-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-md">
                  Guia do Operador
                </span>
                <span className="text-[11px] font-mono font-bold text-emerald-400 tabular-nums">
                  {completedStepsCount}/{steps.length} concluídos ({progressPercent}%)
                </span>
              </div>
              <h4 className="text-xs sm:text-sm font-black text-white leading-tight mt-0.5">
                Fechamento de Caixa Passo a Passo
              </h4>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setViewMode(isExpandedModal ? 'copilot' : 'expanded')}
              className="px-2 py-1.5 text-[11px] font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
              title={
                isExpandedModal
                  ? 'Mudar para Modo Copiloto Lateral (permite digitar nos campos enquanto lê)'
                  : 'Expandir em Tela Cheia para estudar todos os passos'
              }
            >
              <Layers className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden sm:inline">{isExpandedModal ? 'Modo Copiloto' : 'Expandir'}</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('minimized')}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Minimizar para o canto da tela"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Fechar Guia"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ABAS DE NAVEGAÇÃO PEDAGÓGICA */}
        <div className="bg-slate-950 px-3 py-2 border-b border-slate-800 flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1 flex-1">
            <button
              type="button"
              onClick={() => setActiveTab('step')}
              className={`flex-1 py-1.5 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'step'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Passo a Passo</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('checklist')}
              className={`flex-1 py-1.5 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'checklist'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <ListChecks className="w-3.5 h-3.5" />
              <span>O Que Falta ({steps.length - completedStepsCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('faq')}
              className={`flex-1 py-1.5 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'faq'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Tira-Dúvidas</span>
            </button>
          </div>
        </div>

        {/* TRILHA DE NAVEGAÇÃO LIVRE ENTRE OS 6 PASSOS (SEMPRE VISÍVEL NA ABA PASSO A PASSO) */}
        {activeTab === 'step' && (
          <div className="bg-slate-950/70 px-3 py-2.5 border-b border-slate-800/80 overflow-x-auto">
            <div className="flex items-center gap-1.5 min-w-max">
              {steps.map((st, idx) => {
                const isCurrent = idx === currentStep;
                return (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setCurrentStep(idx)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      isCurrent
                        ? 'bg-blue-600 text-white ring-2 ring-blue-400/40 shadow-xs'
                        : st.isCompleted
                        ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-900/60'
                        : 'bg-slate-900 text-slate-400 border border-slate-800 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                    title={st.title}
                  >
                    {st.isCompleted ? (
                      <Check className="w-3 h-3 text-emerald-400 stroke-[3]" />
                    ) : (
                      <span className="w-3.5 h-3.5 rounded-full bg-slate-800 text-[10px] flex items-center justify-center font-black">
                        {idx + 1}
                      </span>
                    )}
                    <span>{st.shortLabel.replace(/^\d+\.\s*/, '')}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* CORPO PRINCIPAL DO GUIA */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* ================================================================= */}
          {/* ABA 1: PASSO A PASSO INTERATIVO                                   */}
          {/* ================================================================= */}
          {activeTab === 'step' && (
            <>
              {/* Cabeçalho da Etapa + Botão de Foco Direto */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2.5">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 border ${
                      currentStepData.isCompleted
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                        : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h5 className="font-black text-sm sm:text-base text-white leading-tight">
                        {currentStepData.title}
                      </h5>
                      {currentStepData.isCompleted && (
                        <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-black px-2 py-0.5 rounded-md flex items-center gap-1">
                          <Check className="w-3 h-3" /> Concluído
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{currentStepData.subtitle}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (viewMode === 'expanded') setViewMode('copilot');
                    setTimeout(() => focusStepTarget(), 50);
                  }}
                  className="text-[11px] font-bold text-blue-300 hover:text-white bg-blue-500/20 hover:bg-blue-600 border border-blue-500/40 px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 transition-all shrink-0 cursor-pointer shadow-2xs"
                  title="Rolar até esta seção e destacar o campo na tela"
                >
                  <LocateFixed className="w-3.5 h-3.5 text-blue-400" />
                  <span>Ir p/ Campo</span>
                </button>
              </div>

              {/* Box: O que fazer agora */}
              <div className="bg-slate-950/90 p-3.5 rounded-2xl border border-slate-800 space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-400 block">
                  Como fazer este passo:
                </span>
                <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-line">
                  {currentStepData.instruction}
                </p>
              </div>

              {/* Box: Onde encontrar esse valor no papel/sistema? */}
              <div className="bg-slate-800/50 p-3.5 rounded-2xl border border-slate-700/70 space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                  <span>Onde encontrar esses valores no bar?</span>
                </span>
                <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">
                  {currentStepData.whereToFind}
                </p>
              </div>

              {/* Sub-tarefas com Verificação Ao Vivo e Atalhos Diretos */}
              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                  Verificação em Tempo Real desta Etapa:
                </span>
                <div className="space-y-1.5">
                  {currentStepData.subTasks.map((sub, sIdx) => (
                    <div
                      key={sIdx}
                      className={`p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 transition-all ${
                        sub.done
                          ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200'
                          : 'bg-slate-950/70 border-slate-800 text-slate-300'
                      }`}
                    >
                      <div className="flex items-start gap-2 min-w-0">
                        {sub.done ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        )}
                        <div className="min-w-0">
                          <span className="font-bold block truncate">{sub.label}</span>
                          <span className="text-[11px] text-slate-400 block tabular-nums">{sub.detail}</span>
                        </div>
                      </div>
                      {(sub.focusId || sub.targetSelector) && (
                        <button
                          type="button"
                          onClick={() => {
                            if (viewMode === 'expanded') setViewMode('copilot');
                            setTimeout(() => focusStepTarget(sub.targetSelector, sub.focusId), 50);
                          }}
                          className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-800 hover:bg-blue-600 text-blue-300 hover:text-white border border-slate-700 transition-colors shrink-0 cursor-pointer"
                        >
                          Preencher →
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Botões de Ação Contextual por Etapa */}
              {currentStep === 2 && (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  {onAddMachine && (
                    <button
                      type="button"
                      onClick={() => {
                        onAddMachine();
                        onShowToast?.('Nova maquininha adicionada à grade!');
                      }}
                      className="py-2 px-3 rounded-xl bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 border border-orange-500/30 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Nova Maquininha</span>
                    </button>
                  )}
                  {onOpenVoice && (
                    <button
                      type="button"
                      onClick={onOpenVoice}
                      className="py-2 px-3 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                    >
                      <Mic className="w-3.5 h-3.5" />
                      <span>Ditar por Voz</span>
                    </button>
                  )}
                </div>
              )}

              {currentStep === 5 && (
                <div className="pt-1 space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => onOpenPdvSummary?.()}
                      className="w-full bg-emerald-950/90 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/40 text-xs font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-all"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>1. O que Lançar no {pdvName}</span>
                    </button>
                    {onDownloadPdf && (
                      <button
                        type="button"
                        onClick={onDownloadPdf}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-all"
                      >
                        <Download className="w-4 h-4" />
                        <span>2. Baixar PDF Oficial</span>
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenSaveClosing?.();
                    }}
                    className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-slate-950 text-xs font-black py-3 rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all active:scale-[0.99]"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>3. Finalizar e Salvar Fechamento Agora</span>
                  </button>
                </div>
              )}

              {/* Dica Prática do Operador Experiente */}
              <div className="bg-blue-950/40 border border-blue-500/30 rounded-xl p-3 flex items-start gap-2.5 text-xs text-blue-200">
                <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold text-white">Dica Prática: </strong>
                  <span>{currentStepData.proTip}</span>
                </div>
              </div>
            </>
          )}

          {/* ================================================================= */}
          {/* ABA 2: DIAGNÓSTICO AO VIVO ("O QUE FALTA PARA FECHAR?")           */}
          {/* ================================================================= */}
          {activeTab === 'checklist' && (
            <div className="space-y-3">
              <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 flex items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-blue-400 block">
                    Diagnóstico Inteligente do Turno
                  </span>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Clique em qualquer etapa abaixo para ir diretamente ao campo que falta preencher.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleJumpToNextPending}
                  className="px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shrink-0 cursor-pointer transition-all"
                >
                  Ir p/ Próxima Pendência
                </button>
              </div>

              <div className="space-y-2">
                {steps.map((st, idx) => (
                  <div
                    key={st.id}
                    onClick={() => {
                      setCurrentStep(idx);
                      setActiveTab('step');
                    }}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      st.isCompleted
                        ? 'bg-emerald-950/25 border-emerald-500/30 hover:border-emerald-500/60'
                        : 'bg-slate-950/80 border-slate-800 hover:border-blue-500/50'
                    }`}
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div
                        className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs shrink-0 mt-0.5 ${
                          st.isCompleted
                            ? 'bg-emerald-500 text-slate-950'
                            : 'bg-slate-800 text-slate-300 border border-slate-700'
                        }`}
                      >
                        {st.isCompleted ? <Check className="w-4 h-4 stroke-[3]" /> : idx + 1}
                      </div>
                      <div className="min-w-0">
                        <h6 className="text-xs font-black text-white truncate">{st.title}</h6>
                        <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">{st.statusSummary}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* ABA 3: TIRA-DÚVIDAS RÁPIDO PARA OPERADORES INEXPERIENTES (SOS)    */}
          {/* ================================================================= */}
          {activeTab === 'faq' && (
            <div className="space-y-3">
              {/* Legenda Rápida de Cores */}
              <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                  Significado das Cores no Sistema:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-emerald-950/50 border border-emerald-500/30">
                    <strong className="text-emerald-300 block">Dif: R$ 0,00 (Batendo)</strong>
                    <span className="text-[11px] text-slate-300">Maquininha e {pdvName} estão iguais.</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-amber-950/50 border border-amber-500/30">
                    <strong className="text-amber-300 block">Dif Positiva (+ Sobra)</strong>
                    <span className="text-[11px] text-slate-300">Passou mais na máquina que no {pdvName}.</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-rose-950/50 border border-rose-500/30">
                    <strong className="text-rose-300 block">Dif Negativa (- Falta)</strong>
                    <span className="text-[11px] text-slate-300">O {pdvName} registrou mais que a máquina.</span>
                  </div>
                </div>
              </div>

              {/* Perguntas Frequentes Acordeão */}
              <div className="space-y-2">
                {faqItems.map((item, idx) => {
                  const isOpenFaq = openFaqIndex === idx;
                  return (
                    <div
                      key={idx}
                      className="bg-slate-950/90 border border-slate-800 rounded-2xl overflow-hidden"
                    >
                      <button
                        type="button"
                        onClick={() => setOpenFaqIndex(isOpenFaq ? null : idx)}
                        className="w-full p-3 text-left text-xs font-bold text-white flex items-center justify-between gap-2 hover:bg-slate-900 transition-colors cursor-pointer"
                      >
                        <span>{item.q}</span>
                        <ChevronRight
                          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${
                            isOpenFaq ? 'rotate-90 text-blue-400' : ''
                          }`}
                        />
                      </button>
                      {isOpenFaq && (
                        <div className="px-3.5 pb-3.5 pt-1 text-xs text-slate-300 leading-relaxed border-t border-slate-800/80 whitespace-pre-line">
                          {item.a}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* RODAPÉ DE NAVEGAÇÃO INTUITIVA (LIVRE + ATALHO DE PRÓXIMA ETAPA) */}
        <div className="p-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-2">
          <button
            type="button"
            disabled={currentStep === 0 && activeTab === 'step'}
            onClick={() => {
              if (activeTab !== 'step') {
                setActiveTab('step');
              } else {
                setCurrentStep((prev) => Math.max(0, prev - 1));
              }
            }}
            className="px-3 py-2 rounded-xl text-xs font-bold text-slate-300 bg-slate-900 border border-slate-800 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Passo Anterior</span>
          </button>

          <div className="flex items-center gap-2">
            {currentStep < steps.length - 1 ? (
              <button
                type="button"
                onClick={() => {
                  setActiveTab('step');
                  setCurrentStep((prev) => Math.min(steps.length - 1, prev + 1));
                }}
                className="px-4 py-2.5 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-500 text-white shadow-md flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
              >
                <span>Próximo Passo ({currentStep + 2}/{steps.length})</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-xs font-black bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center gap-1.5 shadow-md transition-all cursor-pointer active:scale-95"
              >
                <Check className="w-4 h-4" />
                <span>Concluir Guia</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
