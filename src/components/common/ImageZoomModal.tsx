import React from 'react';
import { X, ZoomIn, Download } from 'lucide-react';

interface ImageZoomModalProps {
  imageUrl: string | null;
  title?: string;
  onClose: () => void;
}

export const ImageZoomModal: React.FC<ImageZoomModalProps> = ({ imageUrl, title, onClose }) => {
  if (!imageUrl) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-950/90 border-b border-slate-800 text-white">
          <div className="flex items-center gap-2">
            <ZoomIn className="w-4 h-4 text-orange-400" />
            <span className="font-bold text-sm tracking-wide">
              {title || 'Visualização do Comprovante / Print'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={imageUrl}
              download="comprovante_fechamento.jpg"
              target="_blank"
              rel="noreferrer"
              className="p-1.5 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg transition-colors cursor-pointer"
              title="Abrir em nova aba / Download"
            >
              <Download className="w-4 h-4" />
            </a>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              title="Fechar (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Imagem */}
        <div className="p-2 sm:p-4 overflow-auto flex items-center justify-center bg-black/60 max-h-[calc(90vh-60px)]">
          <img
            src={imageUrl}
            alt="Comprovante ampliado"
            className="max-h-[80vh] w-auto max-w-full object-contain rounded-lg shadow-lg select-none"
          />
        </div>
      </div>
    </div>
  );
};
