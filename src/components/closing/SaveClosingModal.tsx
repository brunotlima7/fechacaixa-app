import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Upload,
  Trash2,
  CheckCircle2,
  CreditCard,
  DollarSign,
  Camera,
  Clipboard,
  MessageSquare,
  Calendar,
  Clock,
  Download
} from 'lucide-react';
import { Tenant } from '../../types/saas.ts';
import { formatCurrency } from '../../App.tsx';
import { getTheme } from '../../utils/theme.ts';

export interface ClosingDateSelection {
  displayDate: string; // "DD/MM/AAAA HH:mm"
  dateKey: string;     // "YYYY-MM-DD"
  time: string;        // "HH:mm"
  dateOnlyBr: string;  // "DD/MM/AAAA"
}

interface SaveClosingModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenant: Tenant;
  operatorName?: string;
  getnetTotal: number;
  jclanTotal: number;
  differenceTotal: number;
  cashTotal: number;
  expectedCash: number;
  cashDifference: number;
  onConfirmSave: (
    comments: string,
    attachments: string[],
    dateSelection?: ClosingDateSelection
  ) => Promise<void>;
  onDownloadPdf?: (comments: string, dateSelection: ClosingDateSelection) => void;
  onZoomImage: (url: string) => void;
}

export const SaveClosingModal: React.FC<SaveClosingModalProps> = ({
  isOpen,
  onClose,
  tenant,
  operatorName,
  getnetTotal,
  jclanTotal,
  differenceTotal,
  cashTotal,
  expectedCash,
  cashDifference,
  onConfirmSave,
  onDownloadPdf,
  onZoomImage,
}) => {
  const [comments, setComments] = useState('');
  const [attachments, setAttachments] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Datas de referência: Hoje e Ontem
  const getTodayKey = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const getYesterdayKey = () => {
    const d = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  // Se o fechamento ocorrer na madrugada (00h às 06h), sugere Ontem por padrão (turno noturno)
  const isEarlyMorning = new Date().getHours() < 6;
  const [dateMode, setDateMode] = useState<'hoje' | 'ontem' | 'custom'>(isEarlyMorning ? 'ontem' : 'hoje');
  const [customDate, setCustomDate] = useState<string>(() => (isEarlyMorning ? getYesterdayKey() : getTodayKey()));
  const [closingTime, setClosingTime] = useState<string>(() => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  });

  const theme = getTheme(tenant.themeColor);

  const getResolvedDateSelection = (): ClosingDateSelection => {
    let resolvedKey = getTodayKey();
    if (dateMode === 'ontem') {
      resolvedKey = getYesterdayKey();
    } else if (dateMode === 'custom' && customDate) {
      resolvedKey = customDate;
    }
    const [y, m, d] = resolvedKey.split('-').map(Number);
    const dateOnlyBr = `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
    const displayDate = `${dateOnlyBr} ${closingTime}`;
    return {
      displayDate,
      dateKey: resolvedKey,
      time: closingTime,
      dateOnlyBr,
    };
  };

  // Escuta evento de Colar (Ctrl+V / Cmd+V) para capturar prints de tela diretamente da área de transferência
  useEffect(() => {
    if (!isOpen) return;

    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            const reader = new FileReader();
            reader.onload = () => {
              if (reader.result) {
                setAttachments((prev) => [...prev, reader.result as string]);
              }
            };
            reader.readAsDataURL(file);
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result) {
          setAttachments((prev) => [...prev, reader.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleQuickComment = (text: string) => {
    setComments((prev) => (prev ? `${prev}. ${text}` : text));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const dateSelection = getResolvedDateSelection();
      await onConfirmSave(comments.trim(), attachments, dateSelection);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const handleGeneratePdfClick = () => {
    if (onDownloadPdf) {
      onDownloadPdf(comments.trim(), getResolvedDateSelection());
    }
  };

  const isCardsBalanced = Math.abs(differenceTotal) < 0.01;
  const isCashBalanced = Math.abs(cashDifference) < 0.01;
  const cardName = tenant.cardSystemName || 'Getnet';
  const pdvName = tenant.pdvSystemName || 'Jclan';

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden my-6 border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh]">
        {/* Top Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-900 dark:bg-slate-950 text-white">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${tenant.logoColor || theme.logoGradient} flex items-center justify-center font-black text-sm text-white shadow-md shrink-0`}
            >
              {tenant.logoInitials || 'CC'}
            </div>
            <div>
              <h3 className="font-black text-base tracking-wide flex items-center gap-2 flex-wrap">
                <span>Finalizar e Salvar Fechamento</span>
                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${theme.badgeBg} ${theme.badgeText}`}>
                  {tenant.name}
                </span>
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                Operador: <strong className="text-white capitalize">{operatorName || 'Operador'}</strong> • Nuvem SaaS FechaCaixa
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onDownloadPdf && (
              <button
                type="button"
                onClick={handleGeneratePdfClick}
                className="px-3 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                title="Baixar relatório de fechamento de caixa em PDF profissional"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Baixar PDF</span>
              </button>
            )}
            <button
              onClick={onClose}
              disabled={isSaving}
              className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1 bg-slate-50 dark:bg-slate-950/80">
          {/* 1. SELETOR DE DATA / TURNO DO FECHAMENTO */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <label className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-orange-500" />
                Data de Referência do Caixa / Turno
              </label>
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                Data do Registro: <strong className="text-slate-900 dark:text-white">{getResolvedDateSelection().displayDate}</strong>
              </span>
            </div>

            {/* Botões de seleção rápida: Hoje vs Ontem vs Outra Data */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setDateMode('hoje')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  dateMode === 'hoje'
                    ? 'bg-orange-50 dark:bg-orange-950/50 border-orange-500 ring-2 ring-orange-400/30'
                    : 'bg-slate-50 dark:bg-slate-800/70 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-800 dark:text-slate-100">Hoje</span>
                  {dateMode === 'hoje' && <CheckCircle2 className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />}
                </div>
                <span className="text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400 mt-0.5">
                  {new Date().toLocaleDateString('pt-BR')}
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Turno do dia atual</span>
              </button>

              <button
                type="button"
                onClick={() => setDateMode('ontem')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  dateMode === 'ontem'
                    ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-500 ring-2 ring-amber-400/30'
                    : 'bg-slate-50 dark:bg-slate-800/70 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-amber-950 dark:text-amber-200 flex items-center gap-1">
                    <span>Ontem</span>
                    <span className="bg-amber-200 dark:bg-amber-500/30 text-amber-900 dark:text-amber-200 text-[9px] font-black px-1.5 py-0.2 rounded">
                      Dia Anterior
                    </span>
                  </span>
                  {dateMode === 'ontem' && <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />}
                </div>
                <span className="text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400 mt-0.5">
                  {new Date(Date.now() - 86400000).toLocaleDateString('pt-BR')}
                </span>
                <span className="text-[10px] text-amber-700 dark:text-amber-400 font-semibold mt-1">
                  Turno noturno / madrugada
                </span>
              </button>

              <button
                type="button"
                onClick={() => setDateMode('custom')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  dateMode === 'custom'
                    ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-500 ring-2 ring-blue-400/30'
                    : 'bg-slate-50 dark:bg-slate-800/70 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-800 dark:text-slate-100">Outra Data</span>
                  {dateMode === 'custom' && <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />}
                </div>
                <span className="text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400 mt-0.5">
                  {customDate.split('-').reverse().join('/')}
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Escolher no calendário</span>
              </button>
            </div>

            {/* Inputs de data personalizada e horário */}
            <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-slate-100 dark:border-slate-800">
              {dateMode === 'custom' && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-600 dark:text-slate-300 font-semibold">Data:</span>
                  <input
                    type="date"
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                    className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-800 dark:text-white outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-600 dark:text-slate-300 font-semibold flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" /> Horário de Encerramento:
                </span>
                <input
                  type="time"
                  value={closingTime}
                  onChange={(e) => setClosingTime(e.target.value)}
                  className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-800 dark:text-white outline-none focus:ring-1 focus:ring-orange-500"
                />
              </div>
            </div>
          </div>

          {/* Resumo de Conferência */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Cartões */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Cartões ({cardName} x {pdvName})
                </span>
                <span
                  className={`text-[11px] font-black px-2 py-0.5 rounded-md ${
                    isCardsBalanced
                      ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                      : differenceTotal > 0
                      ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                      : 'bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-700'
                  }`}
                >
                  {isCardsBalanced ? '100% Batendo' : differenceTotal > 0 ? 'Sobra' : 'Falta'}
                </span>
              </div>
              <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400 mb-1">
                <span>Total {cardName}:</span>
                <strong className="text-slate-800 dark:text-slate-100 tabular-nums">{formatCurrency(getnetTotal)}</strong>
              </div>
              <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400 mb-1">
                <span>Total {pdvName}:</span>
                <strong className="text-slate-800 dark:text-slate-100 tabular-nums">{formatCurrency(jclanTotal)}</strong>
              </div>
              <div className="flex justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-800 font-bold">
                <span className="text-slate-500 dark:text-slate-400">Diferença:</span>
                <span className={`${isCardsBalanced ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'} tabular-nums`}>
                  {formatCurrency(differenceTotal)}
                </span>
              </div>
            </div>

            {/* Dinheiro / Gaveta */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Gaveta (Dinheiro Físico)
                </span>
                <span
                  className={`text-[11px] font-black px-2 py-0.5 rounded-md ${
                    isCashBalanced
                      ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                      : cashDifference > 0
                      ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                      : 'bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-700'
                  }`}
                >
                  {isCashBalanced ? '100% Batendo' : cashDifference > 0 ? 'Sobra' : 'Falta'}
                </span>
              </div>
              <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400 mb-1">
                <span>Físico na Gaveta:</span>
                <strong className="text-slate-800 dark:text-slate-100 tabular-nums">{formatCurrency(cashTotal)}</strong>
              </div>
              <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400 mb-1">
                <span>Total Esperado:</span>
                <strong className="text-slate-800 dark:text-slate-100 tabular-nums">{formatCurrency(expectedCash)}</strong>
              </div>
              <div className="flex justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-800 font-bold">
                <span className="text-slate-500 dark:text-slate-400">Diferença:</span>
                <span className={`${isCashBalanced ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'} tabular-nums`}>
                  {formatCurrency(cashDifference)}
                </span>
              </div>
            </div>
          </div>

          {/* Campo de Comentários / Observações */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <label className="block text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                Comentários & Observações do Fechamento
              </span>
              <span className="text-[10px] text-slate-400 font-semibold normal-case">
                Opcional • Fica gravado no histórico e no PDF
              </span>
            </label>
            <textarea
              rows={3}
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Ex: Sobrou R$ 15,00 na gaveta referente a gorjeta do turno; Maquininha 03 ficou sem bobina às 22h; Diferença de cartões autorizada pelo gerente."
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-orange-500 transition-all font-medium resize-none"
            />

            {/* Sugestões Rápidas de Comentário */}
            <div className="flex items-center gap-1.5 flex-wrap mt-2">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Rápido:</span>
              {[
                'Tudo conferido e batendo 100%',
                'Gorjeta deixada na gaveta',
                'Bobina de cartão trocada',
                'Diferença conferida com a gerência',
              ].map((quick, idx) => (
                <button
                  type="button"
                  key={idx}
                  onClick={() => handleQuickComment(quick)}
                  className="text-[10px] bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-md font-semibold transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
                >
                  + {quick}
                </button>
              ))}
            </div>
          </div>

          {/* Upload de Fotos & Prints de Comprovantes */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                Fotos & Prints de Comprovantes ({attachments.length})
              </label>
              <div className="flex items-center gap-1 text-[11px] text-slate-400 font-semibold">
                <Clipboard className="w-3.5 h-3.5 text-slate-400" />
                <span>Dica: Pressione <strong>Ctrl+V</strong> para colar print</span>
              </div>
            </div>

            {/* Zona de Drop & Seleção de Arquivo */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-orange-500 bg-orange-50/50 dark:bg-orange-950/30'
                  : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600 bg-slate-50/60 dark:bg-slate-800/40'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => handleFiles(e.target.files)}
                className="hidden"
              />
              <div className="flex flex-col items-center justify-center gap-1.5">
                <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 flex items-center justify-center">
                  <Upload className="w-5 h-5" />
                </div>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  Clique para selecionar fotos/prints ou arraste aqui
                </p>
                <p className="text-[10px] text-slate-400">
                  Comprovantes impressos das maquininhas, relatórios do {pdvName} ou foto da gaveta
                </p>
              </div>
            </div>

            {/* Galeria de Miniaturas Anexadas */}
            {attachments.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                {attachments.map((imgUrl, index) => (
                  <div
                    key={index}
                    className="relative group rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 aspect-video flex items-center justify-center"
                  >
                    <img
                      src={imgUrl}
                      alt={`Anexo ${index + 1}`}
                      className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                      onClick={() => onZoomImage(imgUrl)}
                      title="Clique para ampliar"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 pointer-events-none">
                      <span className="text-[10px] text-white font-bold bg-black/60 px-2 py-0.5 rounded">
                        Ampliar
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveAttachment(index);
                      }}
                      className="absolute top-1 right-1 bg-rose-600 hover:bg-rose-700 text-white p-1 rounded-md shadow-md transition-colors cursor-pointer"
                      title="Remover print"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <span className="absolute bottom-1 left-1 bg-black/70 text-white text-[9px] px-1.5 py-0.5 rounded font-bold">
                      #{index + 1}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Botões de Ação */}
          <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="py-3 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition-colors cursor-pointer"
            >
              Cancelar
            </button>

            {onDownloadPdf && (
              <button
                type="button"
                onClick={handleGeneratePdfClick}
                disabled={isSaving}
                className="py-3 px-4 rounded-xl border border-blue-500/40 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                title="Baixar arquivo PDF formatado do relatório de fechamento"
              >
                <Download className="w-4 h-4" />
                <span>Baixar Relatório em PDF</span>
              </button>
            )}

            <button
              type="submit"
              disabled={isSaving}
              className={`flex-1 py-3 px-5 rounded-xl font-black text-xs text-white shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                theme.btnGradient
              } ${theme.btnHover} ${isSaving ? 'opacity-70 cursor-not-allowed' : 'active:scale-[0.99]'}`}
            >
              {isSaving ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Gravando na Nuvem...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirmar e Salvar Fechamento</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
