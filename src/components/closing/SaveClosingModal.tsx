import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Upload,
  Image as ImageIcon,
  Trash2,
  CheckCircle2,
  AlertCircle,
  FileText,
  CreditCard,
  DollarSign,
  Camera,
  Clipboard,
  Sparkles,
  MessageSquare
} from 'lucide-react';
import { Tenant } from '../../types/saas.ts';
import { formatCurrency } from '../../App.tsx';
import { getTheme } from '../../utils/theme.ts';

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
  onConfirmSave: (comments: string, attachments: string[]) => Promise<void>;
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
  onZoomImage,
}) => {
  const [comments, setComments] = useState('');
  const [attachments, setAttachments] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const theme = getTheme(tenant.themeColor);

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
      await onConfirmSave(comments.trim(), attachments);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const isCardsBalanced = Math.abs(differenceTotal) < 0.01;
  const isCashBalanced = Math.abs(cashDifference) < 0.01;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden my-6 border border-slate-200 flex flex-col max-h-[92vh]">
        {/* Top Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${tenant.logoColor || theme.logoGradient} flex items-center justify-center font-black text-sm text-white shadow-md`}
            >
              {tenant.logoInitials || 'CC'}
            </div>
            <div>
              <h3 className="font-black text-base tracking-wide flex items-center gap-2">
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
          <button
            onClick={onClose}
            disabled={isSaving}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1 bg-slate-50">
          {/* Resumo de Conferência */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Cartões */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-blue-600" /> Cartões (Getnet x Jclan)
                </span>
                <span
                  className={`text-[11px] font-black px-2 py-0.5 rounded-md ${
                    isCardsBalanced
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : differenceTotal > 0
                      ? 'bg-amber-100 text-amber-800 border border-amber-300'
                      : 'bg-rose-100 text-rose-800 border border-rose-300'
                  }`}
                >
                  {isCardsBalanced ? '100% Batendo' : differenceTotal > 0 ? 'Sobra' : 'Falta'}
                </span>
              </div>
              <div className="flex justify-between text-xs text-slate-600 mb-1">
                <span>Total Getnet:</span>
                <strong className="text-slate-800">{formatCurrency(getnetTotal)}</strong>
              </div>
              <div className="flex justify-between text-xs text-slate-600 mb-1">
                <span>Total Jclan:</span>
                <strong className="text-slate-800">{formatCurrency(jclanTotal)}</strong>
              </div>
              <div className="flex justify-between text-xs pt-1 border-t border-slate-100 font-bold">
                <span className="text-slate-500">Diferença:</span>
                <span className={isCardsBalanced ? 'text-emerald-600' : 'text-rose-600'}>
                  {formatCurrency(differenceTotal)}
                </span>
              </div>
            </div>

            {/* Dinheiro / Gaveta */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-emerald-600" /> Gaveta (Dinheiro Físico)
                </span>
                <span
                  className={`text-[11px] font-black px-2 py-0.5 rounded-md ${
                    isCashBalanced
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : cashDifference > 0
                      ? 'bg-amber-100 text-amber-800 border border-amber-300'
                      : 'bg-rose-100 text-rose-800 border border-rose-300'
                  }`}
                >
                  {isCashBalanced ? '100% Batendo' : cashDifference > 0 ? 'Sobra' : 'Falta'}
                </span>
              </div>
              <div className="flex justify-between text-xs text-slate-600 mb-1">
                <span>Físico na Gaveta:</span>
                <strong className="text-slate-800">{formatCurrency(cashTotal)}</strong>
              </div>
              <div className="flex justify-between text-xs text-slate-600 mb-1">
                <span>Total Esperado:</span>
                <strong className="text-slate-800">{formatCurrency(expectedCash)}</strong>
              </div>
              <div className="flex justify-between text-xs pt-1 border-t border-slate-100 font-bold">
                <span className="text-slate-500">Diferença:</span>
                <span className={isCashBalanced ? 'text-emerald-600' : 'text-rose-600'}>
                  {formatCurrency(cashDifference)}
                </span>
              </div>
            </div>
          </div>

          {/* Campo de Comentários / Observações */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-slate-500" />
                Comentários & Observações do Fechamento
              </span>
              <span className="text-[10px] text-slate-400 font-semibold normal-case">
                Opcional • Fica gravado no histórico
              </span>
            </label>
            <textarea
              rows={3}
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Ex: Sobrou R$ 15,00 na gaveta referente a gorjeta do turno; Maquininha 03 ficou sem bobina às 22h; Diferença de cartões autorizada pelo gerente."
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-orange-500 transition-all font-medium resize-none"
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
                  className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-0.5 rounded-md font-semibold transition-colors cursor-pointer border border-slate-200"
                >
                  + {quick}
                </button>
              ))}
            </div>
          </div>

          {/* Upload de Fotos & Prints de Comprovantes */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-slate-500" />
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
                  ? 'border-orange-500 bg-orange-50/50'
                  : 'border-slate-300 hover:border-slate-400 bg-slate-50/60'
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
                <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
                  <Upload className="w-5 h-5" />
                </div>
                <p className="text-xs font-bold text-slate-700">
                  Clique para selecionar fotos/prints ou arraste aqui
                </p>
                <p className="text-[10px] text-slate-400">
                  Comprovantes impressos das maquininhas, relatórios do Jclan ou foto da gaveta
                </p>
              </div>
            </div>

            {/* Galeria de Miniaturas Anexadas */}
            {attachments.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-3 pt-3 border-t border-slate-100">
                {attachments.map((imgUrl, index) => (
                  <div
                    key={index}
                    className="relative group rounded-xl overflow-hidden border border-slate-200 bg-slate-100 aspect-video flex items-center justify-center"
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
          <div className="pt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="flex-1 py-3 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className={`flex-2 py-3 px-5 rounded-xl font-black text-xs text-white shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
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
