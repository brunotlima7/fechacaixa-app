import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Mic,
  MicOff,
  RotateCcw,
  X,
  CheckCircle2,
  Sparkles,
  Volume2,
  HelpCircle,
  Send,
  CreditCard,
  Trash2,
  Zap,
} from 'lucide-react';
import { parseVoiceCommand, VoiceAction } from '../../utils/voiceCommandParser.ts';

interface VoiceHistoryItem {
  id: string;
  timestamp: string;
  transcript: string;
  descriptions: string[];
}

interface VoiceAssistantPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onOpen: () => void;
  activeMachineId: number | null;
  onSelectMachineId: (id: number | null) => void;
  machinesCount: number;
  creditFlags?: string[];
  debitFlags?: string[];
  voucherNames?: string[];
  pdvSystemName?: string;
  cardSystemName?: string;
  onExecuteVoiceActions: (actions: VoiceAction[], rawTranscript: string) => string[];
  onUndoLastVoiceCommand: () => boolean;
  canUndo: boolean;
  onShowToast: (msg: string) => void;
}

export const VoiceAssistantPanel: React.FC<VoiceAssistantPanelProps> = ({
  isOpen,
  onClose,
  onOpen,
  activeMachineId,
  onSelectMachineId,
  machinesCount,
  creditFlags = [],
  debitFlags = [],
  voucherNames = ['Alelo', 'Ticket', 'Sodexo', 'VR', 'Ben'],
  pdvSystemName = 'Jclan',
  cardSystemName = 'Getnet',
  onExecuteVoiceActions,
  onUndoLastVoiceCommand,
  canUndo,
  onShowToast,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [manualInput, setManualInput] = useState('');
  const [voiceHistory, setVoiceHistory] = useState<VoiceHistoryItem[]>([]);
  const [showExamples, setShowExamples] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);

  const recognitionRef = useRef<any>(null);
  const shouldKeepListeningRef = useRef(false);

  // Mantém referência atualizada para evitar stale closures dentro dos callbacks do SpeechRecognition
  const contextRef = useRef({
    activeMachineId,
    creditFlags,
    debitFlags,
    voucherNames,
    pdvSystemName,
    cardSystemName,
    machinesCount,
    onExecuteVoiceActions,
    onUndoLastVoiceCommand,
    onShowToast,
  });

  useEffect(() => {
    contextRef.current = {
      activeMachineId,
      creditFlags,
      debitFlags,
      voucherNames,
      pdvSystemName,
      cardSystemName,
      machinesCount,
      onExecuteVoiceActions,
      onUndoLastVoiceCommand,
      onShowToast,
    };
  }, [
    activeMachineId,
    creditFlags,
    debitFlags,
    voucherNames,
    pdvSystemName,
    cardSystemName,
    machinesCount,
    onExecuteVoiceActions,
    onUndoLastVoiceCommand,
    onShowToast,
  ]);

  // Pré-visualização instantânea enquanto o operador fala (interimText) ou digita (manualInput)
  const livePreviewActions = useMemo(() => {
    const previewSource = interimText.trim() || manualInput.trim();
    if (!previewSource) return [];
    return parseVoiceCommand(previewSource, {
      defaultMachineId: activeMachineId,
      creditFlags,
      debitFlags,
      voucherNames,
      pdvSystemName,
      cardSystemName,
      machinesCount,
    });
  }, [
    interimText,
    manualInput,
    activeMachineId,
    creditFlags,
    debitFlags,
    voucherNames,
    pdvSystemName,
    cardSystemName,
    machinesCount,
  ]);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        const transcript = res[0].transcript;
        if (res.isFinal) {
          setInterimText('');
          handleProcessTranscript(transcript);
        } else {
          interim += transcript;
        }
      }
      if (interim) {
        setInterimText(interim);
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        shouldKeepListeningRef.current = false;
        setIsListening(false);
        contextRef.current.onShowToast(
          'Permissão de microfone negada no navegador. Use o campo de ditado ou libere o microfone.'
        );
      } else if (event.error !== 'no-speech' && event.error !== 'aborted') {
        console.warn('SpeechRecognition notice:', event.error);
      }
    };

    recognition.onend = () => {
      if (shouldKeepListeningRef.current) {
        try {
          recognition.start();
        } catch {
          setIsListening(false);
          shouldKeepListeningRef.current = false;
        }
      } else {
        setIsListening(false);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      shouldKeepListeningRef.current = false;
      try {
        recognition.stop();
      } catch {}
    };
  }, []);

  const handleProcessTranscript = (raw: string) => {
    const clean = raw.trim();
    if (!clean) return;

    const ctx = contextRef.current;
    const actions = parseVoiceCommand(clean, {
      defaultMachineId: ctx.activeMachineId,
      creditFlags: ctx.creditFlags,
      debitFlags: ctx.debitFlags,
      voucherNames: ctx.voucherNames,
      pdvSystemName: ctx.pdvSystemName,
      cardSystemName: ctx.cardSystemName,
      machinesCount: ctx.machinesCount,
    });

    if (actions.length === 0) {
      ctx.onShowToast(`Não entendi o valor em: "${clean}". Ex: "Crédito cento e cinquenta e noventa"`);
      return;
    }

    if (actions.length === 1 && actions[0].type === 'undo') {
      const undone = ctx.onUndoLastVoiceCommand();
      if (undone) {
        setVoiceHistory((prev) => [
          {
            id: `${Date.now()}`,
            timestamp: new Date().toLocaleTimeString('pt-BR').slice(0, 8),
            transcript: clean,
            descriptions: ['↩️ Último preenchimento por voz desfeito'],
          },
          ...prev.slice(0, 14),
        ]);
      }
      return;
    }

    const appliedDescriptions = ctx.onExecuteVoiceActions(actions, clean);
    if (appliedDescriptions.length > 0) {
      setVoiceHistory((prev) => [
        {
          id: `${Date.now()}_${Math.random()}`,
          timestamp: new Date().toLocaleTimeString('pt-BR').slice(0, 8),
          transcript: clean,
          descriptions: appliedDescriptions,
        },
        ...prev.slice(0, 14),
      ]);
    }
  };

  const toggleListening = () => {
    if (!speechSupported || !recognitionRef.current) {
      onOpen();
      onShowToast('Use o microfone do teclado do celular no campo abaixo para ditar.');
      return;
    }

    if (isListening) {
      shouldKeepListeningRef.current = false;
      setIsListening(false);
      setInterimText('');
      try {
        recognitionRef.current.stop();
      } catch {}
    } else {
      onOpen();
      shouldKeepListeningRef.current = true;
      setIsListening(true);
      try {
        recognitionRef.current.start();
        onShowToast(
          activeMachineId
            ? `🎙️ Ouvindo para Máquina #${activeMachineId}! Fale em números ou por extenso...`
            : '🎙️ Microfone ativo! Diga ex: "Máquina 1 crédito cento e cinquenta e cinquenta"'
        );
      } catch {
        // Já iniciado
      }
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    handleProcessTranscript(manualInput);
    setManualInput('');
  };

  if (!isOpen) {
    return null;
  }

  const lastAppliedItem = voiceHistory[0];

  return (
    <div className="fixed bottom-4 right-4 z-[90] w-[calc(100vw-2rem)] sm:w-[420px] bg-slate-900 text-white rounded-3xl shadow-2xl border border-slate-700/90 overflow-hidden animate-fade-in">
      {/* Cabeçalho */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 px-4 py-3.5 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center border ${
              isListening
                ? 'bg-rose-500/20 border-rose-500/50 text-rose-400 animate-pulse'
                : 'bg-orange-500/20 border-orange-500/30 text-orange-400'
            }`}
          >
            <Volume2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h4 className="text-sm font-black text-white">Ditado de Caixa por Voz</h4>
              {isListening && (
                <span className="bg-rose-500 text-white text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full animate-pulse">
                  Ao Vivo
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400">
              Entende números por extenso, bandeiras e fala contínua
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setShowExamples(!showExamples)}
            className={`p-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              showExamples ? 'bg-amber-500/20 text-amber-300' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title="Ver exemplos de comandos de voz"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              if (isListening) {
                shouldKeepListeningRef.current = false;
                setIsListening(false);
                try {
                  recognitionRef.current?.stop();
                } catch {}
              }
              onClose();
            }}
            className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 cursor-pointer"
            title="Minimizar painel de voz"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-3.5 max-h-[75vh] overflow-y-auto">
        {/* Seletor Rápido de Maquininha Foco */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <CreditCard className="w-3 h-3 text-blue-400" />
              <span>Foco Rápido (Opcional - evita precisar falar o nº da máquina):</span>
            </span>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            <button
              type="button"
              onClick={() => onSelectMachineId(null)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap border transition-all cursor-pointer ${
                activeMachineId === null
                  ? 'bg-orange-600 text-white border-orange-500 shadow-sm'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
            >
              Geral (Todas)
            </button>
            {Array.from({ length: machinesCount }, (_, idx) => idx + 1).map((mId) => (
              <button
                key={mId}
                type="button"
                onClick={() => onSelectMachineId(mId)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap border transition-all cursor-pointer ${
                  activeMachineId === mId
                    ? 'bg-blue-600 text-white border-blue-400 shadow-sm'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
              >
                Máq #{mId}
              </button>
            ))}
          </div>
        </div>

        {/* Botão Principal de Microfone */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleListening}
            className={`flex-1 py-3 px-4 rounded-2xl font-black text-xs flex items-center justify-center gap-2.5 shadow-lg transition-all cursor-pointer active:scale-98 ${
              isListening
                ? 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white border border-rose-400/50'
                : 'bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white'
            }`}
          >
            {isListening ? (
              <>
                <MicOff className="w-4 h-4 animate-pulse" />
                <span>Pausar Microfone (Ouvindo...)</span>
              </>
            ) : (
              <>
                <Mic className="w-4 h-4" />
                <span>
                  {activeMachineId
                    ? `Falar Valores da Máquina #${activeMachineId}`
                    : 'Ativar Microfone e Falar'}
                </span>
              </>
            )}
          </button>
        </div>

        {/* Barra de Desfazer Rápido (Destaque Imediato pós-preenchimento) */}
        {canUndo && (
          <div className="bg-amber-500/10 border border-amber-500/35 rounded-2xl p-2.5 flex items-center justify-between gap-2 animate-fade-in">
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-300 block">
                Preenchido na hora • Errou algum valor?
              </span>
              {lastAppliedItem && lastAppliedItem.descriptions.length > 0 && (
                <p className="text-[11px] text-slate-300 truncate">
                  Último: {lastAppliedItem.descriptions.join(' • ')}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => onUndoLastVoiceCommand()}
              className="px-3 py-2 rounded-xl font-black text-xs flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md transition-all cursor-pointer shrink-0 active:scale-95"
              title="Desfazer imediatamente o último ditado de voz"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Desfazer Último Ditado</span>
            </button>
          </div>
        )}

        {/* Transcrição e Pré-visualização em Tempo Real */}
        {(isListening || interimText || livePreviewActions.length > 0) && (
          <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-3 text-xs space-y-2">
            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <span className="font-bold uppercase tracking-wider flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${isListening ? 'bg-rose-500 animate-ping' : 'bg-emerald-400'}`} />
                {isListening ? 'Ouvindo em Tempo Real (pt-BR)' : 'Pré-visualização do Comando'}
              </span>
              {activeMachineId && (
                <span className="text-blue-400 font-bold">Destino: Máquina #{activeMachineId}</span>
              )}
            </div>
            { (isListening || interimText) && (
              <p className="text-slate-200 font-semibold italic min-h-[20px]">
                {interimText
                  ? `"${interimText}..."`
                  : 'Pode falar! Ex: "Crédito cento e cinquenta e noventa, Pix oitenta e cinco"'}
              </p>
            )}
            {livePreviewActions.length > 0 && (
              <div className="pt-1.5 border-t border-slate-800/80">
                <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1 mb-1">
                  <Zap className="w-3 h-3" />
                  Reconhecendo para preencher:
                </span>
                <div className="flex flex-wrap gap-1">
                  {livePreviewActions.map((act, idx) => (
                    <span
                      key={idx}
                      className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-md text-[10px] font-bold"
                    >
                      {act.description}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Campo de Ditado do Teclado / Comando Rápido */}
        <form onSubmit={handleManualSubmit} className="flex items-center gap-1.5">
          <input
            type="text"
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            placeholder={
              activeMachineId
                ? `Ex: Crédito cento e cinquenta e noventa, pix 85...`
                : `Digite ou fale: "Máquina 1 crédito cento e cinquenta e 50"`
            }
            className="flex-1 bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:ring-2 focus:ring-orange-500 outline-none"
          />
          <button
            type="submit"
            className="bg-slate-800 hover:bg-slate-700 text-orange-400 border border-slate-700 p-2 rounded-xl transition-colors cursor-pointer"
            title="Aplicar comando"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

        {/* Guia de Exemplos de Frases */}
        {showExamples && (
          <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-3 space-y-2 text-[11px]">
            <p className="font-bold text-amber-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Como falar os valores (clique para testar):</span>
            </p>
            <div className="space-y-1.5 text-slate-300">
              <button
                type="button"
                onClick={() =>
                  handleProcessTranscript(
                    'Máquina 1 crédito cento e cinquenta e dois e noventa débito trezentos e vinte pix oitenta e cinco'
                  )
                }
                className="w-full text-left bg-slate-900 hover:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-800 transition-colors cursor-pointer block"
              >
                🎙️{' '}
                <strong className="text-white">
                  "Máquina 1 crédito cento e cinquenta e dois e noventa débito trezentos e vinte pix oitenta e cinco"
                </strong>
              </button>
              <button
                type="button"
                onClick={() =>
                  handleProcessTranscript(
                    `Máquina 2 ${voucherNames[0] || 'Alelo'} cento e oitenta e cinquenta ${voucherNames[1] || 'Ticket'} noventa e cinco`
                  )
                }
                className="w-full text-left bg-slate-900 hover:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-800 transition-colors cursor-pointer block"
              >
                🎙️{' '}
                <strong className="text-white">
                  "Máquina 2 {voucherNames[0] || 'Alelo'} cento e oitenta e cinquenta {voucherNames[1] || 'Ticket'} noventa e cinco"
                </strong>
              </button>
              <button
                type="button"
                onClick={() => handleProcessTranscript('Somar cinquenta reais no pix da máquina 1')}
                className="w-full text-left bg-slate-900 hover:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-800 transition-colors cursor-pointer block"
              >
                🎙️ <strong className="text-white">"Somar cinquenta reais no pix da máquina 1"</strong>
              </button>
              <button
                type="button"
                onClick={() => handleProcessTranscript(`${pdvSystemName} crédito 5400 débito 2100 pix 980`)}
                className="w-full text-left bg-slate-900 hover:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-800 transition-colors cursor-pointer block"
              >
                🎙️ <strong className="text-white">"{pdvSystemName} crédito 5400 débito 2100 pix 980"</strong>
              </button>
            </div>
          </div>
        )}

        {/* Histórico Recente de Comandos de Voz Aplicados */}
        {voiceHistory.length > 0 && (
          <div className="space-y-1.5 pt-1 border-t border-slate-800">
            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <span className="font-bold uppercase tracking-wider">Últimos Lançamentos por Voz</span>
              <button
                type="button"
                onClick={() => setVoiceHistory([])}
                className="text-slate-500 hover:text-slate-300 flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3 h-3" /> Limpar lista
              </button>
            </div>
            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {voiceHistory.map((item) => (
                <div
                  key={item.id}
                  className="bg-slate-950/80 border border-slate-800/90 rounded-xl px-3 py-2 text-xs"
                >
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mb-0.5">
                    <span className="italic text-slate-300 truncate max-w-[240px]">"{item.transcript}"</span>
                    <span className="font-mono">{item.timestamp}</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {item.descriptions.map((desc, dIdx) => (
                      <span
                        key={dIdx}
                        className="bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                        <span>{desc}</span>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
