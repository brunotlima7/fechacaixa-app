import React, { useState } from 'react';
import {
  X,
  BookOpen,
  DollarSign,
  CreditCard,
  Calculator,
  CheckCircle2,
  Check,
  FileText,
  Camera,
  ArrowRight,
  Sparkles,
  HelpCircle,
  Lightbulb,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';

interface ClosingGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  cardName?: string;
  pdvName?: string;
}

export const ClosingGuideModal: React.FC<ClosingGuideModalProps> = ({
  isOpen,
  onClose,
  cardName = 'Getnet',
  pdvName = 'Jclan',
}) => {
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const steps = [
    {
      id: 0,
      title: '1. Gaveta Física (Dinheiro)',
      subtitle: 'Contagem das notas, moedas e conciliação do dinheiro',
      icon: DollarSign,
      color: 'emerald',
      content: (
        <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
            <h5 className="font-bold text-emerald-900 text-sm mb-1 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-600" /> Como conferir o dinheiro físico:
            </h5>
            <p>
              Conte todas as cédulas e moedas presentes na gaveta e digite a <strong>quantidade de cada uma</strong> no painel esquerdo da Seção 1. O sistema calcula automaticamente o valor total em reais (R$).
            </p>
          </div>

          <div className="space-y-2">
            <strong className="text-slate-800 font-bold block">No painel de Resumo do Dinheiro (lado direito):</strong>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
              <li>
                <strong>Fundo de Abertura:</strong> Informe o troco inicial deixado na abertura do caixa (ex: R$ 200,00).
              </li>
              <li>
                <strong>Vendas Dinheiro no {pdvName}:</strong> Preencha o valor que o seu sistema PDV registrou de vendas em espécie no turno.
              </li>
              <li>
                <strong>Pagamentos / Sangrias:</strong> Digite o total de saídas, vales ou despesas pagas com o dinheiro do caixa.
              </li>
            </ul>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-start gap-2.5 text-slate-600">
            <Lightbulb className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <p>
              <strong>Dica de ouro:</strong> O indicador inferior mostrará na hora se o dinheiro está <em>Batendo 100%</em>, se há <em>Sobra</em> ou se há <em>Falta</em>.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 1,
      title: `2. Maquininhas de Cartão (${cardName})`,
      subtitle: 'Digitação ou leitura por foto/OCR dos extratos das máquinas',
      icon: CreditCard,
      color: 'blue',
      content: (
        <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <h5 className="font-bold text-blue-900 text-sm mb-1 flex items-center gap-2">
              <Camera className="w-4 h-4 text-blue-600" /> Leitura Inteligente com Foto / OCR:
            </h5>
            <p>
              Tire foto do relatório de fechamento diário impresso pela maquininha e clique no botão de <strong>câmera</strong> em cada máquina, ou use <strong>Upload Múltiplo</strong> para ler todas de uma vez com IA Gemini 3.8.
            </p>
          </div>

          <div className="space-y-2">
            <strong className="text-slate-800 font-bold block">Campos conferidos por máquina:</strong>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
              <li><strong>Crédito:</strong> Todas as transações à vista e parceladas.</li>
              <li><strong>Débito:</strong> Vendas no cartão de débito.</li>
              <li><strong>Vouchers / Refeição:</strong> Identificados com o nome da bandeira (ex: <em>Alelo, Ticket, Sodexo, VR, Ben</em>) para você saber exatamente o que lançar no {pdvName}.</li>
              <li><strong>Pix na Maquininha:</strong> Transações via QR code gerado no POS.</li>
            </ul>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-start gap-2.5 text-slate-600">
            <Lightbulb className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
            <p>
              <strong>Navegação rápida:</strong> Use as <strong>setas do teclado (←, →, ↑, ↓)</strong> para saltar de campo em campo sem tirar as mãos do teclado numérico.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 2,
      title: `3. Conferência com o PDV (${pdvName})`,
      subtitle: 'Lançamento dos totais do sistema do bar e comparação em tempo real',
      icon: FileText,
      color: 'orange',
      content: (
        <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <h5 className="font-bold text-amber-900 text-sm mb-1 flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-600" /> Barra Fixa de Comparação (Topo da Tela):
            </h5>
            <p>
              Tire o relatório de fechamento do {pdvName} e digite os valores totais nos campos <strong>{pdvName}: R$ 0,00</strong> nos cartões de <em>Crédito, Débito, Pix e Voucher</em> no topo da tela.
            </p>
          </div>

          <div className="space-y-2">
            <strong className="text-slate-800 font-bold block">Como interpretar as cores dos cartões:</strong>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900">
                <span className="font-bold block">Verde (Batendo):</span>
                <span>Diferença R$ 0,00. Perfeito!</span>
              </div>
              <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900">
                <span className="font-bold block">Laranja (Sobra {cardName}):</span>
                <span>Passou mais no cartão que no {pdvName}.</span>
              </div>
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-900">
                <span className="font-bold block">Vermelho (Falta {cardName}):</span>
                <span>PDV tem mais valor que o cartão.</span>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 3,
      title: '4. Assistente de Zeramento & Comandas',
      subtitle: 'Como zerar divergências sem erros no centavo exato',
      icon: Calculator,
      color: 'purple',
      content: (
        <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
            <h5 className="font-bold text-purple-900 text-sm mb-1 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-600" /> O assistente resolve para você:
            </h5>
            <p>
              Se houver divergência, o FechaCaixa calcula instantaneamente a melhor solução pelo cardápio oficial com desconto máximo de <strong>R$ 1,00</strong>.
            </p>
          </div>

          <div className="space-y-3">
            <div className="border border-slate-200 p-3 rounded-xl bg-slate-50">
              <strong className="text-rose-700 font-bold block mb-1">
                ✂️ Em caso de FALTA (Comanda Reaberta):
              </strong>
              <p className="text-slate-600 mb-2">
                Repita os itens que constam na comanda física reaberta. O sistema apresentará as opções na hierarquia oficial:
              </p>
              <div className="space-y-1.5 pl-2 border-l-2 border-rose-400">
                <div>
                  <strong className="text-slate-800">1ª Opção:</strong> Comanda Paga COM 10% (Taxa de Serviço sobre a comanda toda)
                </div>
                <div>
                  <strong className="text-slate-800">2ª Opção Secundária:</strong> Comanda Fechada SEM 10%
                </div>
              </div>
              <p className="mt-2 text-slate-600 font-medium">
                👉 Clique em <strong>"Marcar esta Opção"</strong> na que você efetivamente usou para zerar o caixa.
              </p>
            </div>

            <div className="border border-slate-200 p-3 rounded-xl bg-slate-50">
              <strong className="text-amber-700 font-bold block mb-1">
                🔥 Em caso de SOBRA (Nova Comanda):
              </strong>
              <p className="text-slate-600">
                O sistema já calcula automaticamente os itens do cardápio <strong>sempre sem os 10%</strong>. Você não precisa pesquisar nada — basta ver o que lançar no {pdvName} e clicar em <strong>"Marcar esta Opção"</strong>.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 4,
      title: '5. Revisão Consolidada & Salvar',
      subtitle: 'Revisão final, auditoria do turno, anexar prints e enviar relatório',
      icon: CheckCircle2,
      color: 'emerald',
      content: (
        <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
            <h5 className="font-bold text-emerald-900 text-sm mb-1 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Painel de Resumo Consolidado de Zeramento:
            </h5>
            <p>
              Antes do botão de salvar fechamento, confira o resumo de todas as opções de zeramento marcadas. Elas serão salvas no histórico da nuvem e descritas detalhadamente no relatório do dia.
            </p>
          </div>

          <div className="space-y-2">
            <strong className="text-slate-800 font-bold block">Passos finais para concluir:</strong>
            <ol className="list-decimal pl-5 space-y-1.5 text-slate-600">
              <li>
                Clique no botão <strong>"Ver Auditoria do Turno"</strong> no rodapé para conferir se todos os seus lançamentos e preenchimentos foram registrados corretamente.
              </li>
              <li>
                Clique em <strong>"Salvar Fechamento"</strong>.
              </li>
              <li>
                Escreva observações se houver (ex: <em>"Troca de turno com Bruno. Comanda 42 ajustada"</em>) e anexe fotos ou prints dos comprovantes das máquinas.
              </li>
              <li>
                Clique em <strong>"Confirmar e Salvar Fechamento"</strong> e depois em <strong>"Copiar para WhatsApp"</strong> para enviar ao grupo do bar ou aos donos.
              </li>
            </ol>
          </div>

          <div className="bg-slate-900 text-white p-3.5 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <span className="font-bold text-xs">Pronto! Fechamento 100% auditado e seguro.</span>
            </div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh] border border-slate-200">
        {/* Top Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center text-white shadow-md">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm sm:text-base text-white flex items-center gap-2">
                <span>Guia Passo a Passo de Fechamento de Caixa</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">
                  Tutorial Oficial
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Aprenda a realizar o fechamento diário sem erros, conferindo gaveta, cartões e PDV.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Stepper Tabs */}
        <div className="bg-slate-100 p-2 border-b border-slate-200 flex gap-1.5 overflow-x-auto">
          {steps.map((st, i) => {
            const Icon = st.icon;
            const isActive = currentStep === i;
            return (
              <button
                key={st.id}
                onClick={() => setCurrentStep(i)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-white text-slate-600 hover:bg-slate-200/80 border border-slate-200'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                <span>Passo {i + 1}</span>
              </button>
            );
          })}
        </div>

        {/* Step Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
              Passo {currentStep + 1} de {steps.length}
            </span>
            <h4 className="text-base font-black text-slate-900">{steps[currentStep].title}</h4>
            <p className="text-xs text-slate-500 mt-0.5">{steps[currentStep].subtitle}</p>
          </div>

          {steps[currentStep].content}
        </div>

        {/* Bottom Navigation */}
        <div className="bg-slate-50 p-4 border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            type="button"
            disabled={currentStep === 0}
            onClick={() => setCurrentStep((prev) => Math.max(0, prev - 1))}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
          >
            ← Voltar
          </button>

          <span className="text-[11px] font-semibold text-slate-400">
            {currentStep + 1} / {steps.length}
          </span>

          {currentStep < steps.length - 1 ? (
            <button
              type="button"
              onClick={() => setCurrentStep((prev) => Math.min(steps.length - 1, prev + 1))}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 flex items-center gap-1.5 shadow-md transition-all cursor-pointer active:scale-95"
            >
              <span>Próximo Passo</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-xs font-black text-slate-950 bg-emerald-400 hover:bg-emerald-300 flex items-center gap-1.5 shadow-md transition-all cursor-pointer active:scale-95"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Entendi, Iniciar Fechamento</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
