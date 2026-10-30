import React from 'react';

interface FechaCaixaLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'full' | 'horizontal' | 'icon-only' | 'badge';
  showSubtitle?: boolean;
  className?: string;
  useImage?: boolean;
}

export const FechaCaixaLogo: React.FC<FechaCaixaLogoProps> = ({
  size = 'md',
  variant = 'horizontal',
  showSubtitle = true,
  className = '',
  useImage = false,
}) => {
  // Se useImage for true em modo full/hero, pode usar a imagem gerada oficial
  if (useImage && variant === 'full') {
    return (
      <div className={`flex flex-col items-center select-none ${className}`}>
        <img
          src="/assets/aistudio/Gemini_Generated_Image_1fwult1fwult1fwu_e6cd1608.jpg"
          alt="FechaCaixa - Sistema de Conciliação & Auditoria"
          className="max-w-[280px] sm:max-w-[340px] h-auto rounded-2xl shadow-xl border border-emerald-500/20"
        />
      </div>
    );
  }

  // Dimensões do Ícone (Nota verde com $ e Checkmark verde)
  const iconSizes = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  const textSizes = {
    sm: 'text-base',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-3xl sm:text-4xl',
  };

  const subtitleSizes = {
    sm: 'text-[7px]',
    md: 'text-[9px]',
    lg: 'text-[10px]',
    xl: 'text-[11px] sm:text-xs',
  };

  // Ícone Vetorial da Marca (Nota Verde Esmeralda + Checkmark)
  const BrandIcon = ({ className: c = '' }: { className?: string }) => (
    <div className={`relative flex items-center justify-center shrink-0 ${c}`}>
      <svg
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-md"
      >
        {/* Fundo do Ícone */}
        <rect width="64" height="64" rx="14" fill="#0B1528" />
        
        {/* Nota Verde Esmeralda */}
        <rect
          x="8"
          y="20"
          width="40"
          height="28"
          rx="5"
          fill="#22C55E"
          stroke="#16A34A"
          strokeWidth="1.5"
        />
        {/* Detalhes circulares na nota */}
        <circle cx="14" cy="34" r="2.5" fill="#15803D" />
        {/* Círculo central com $ */}
        <circle cx="28" cy="34" r="7.5" fill="#0B1528" />
        <text
          x="28"
          y="38.5"
          fill="#22C55E"
          fontFamily="'Montserrat', sans-serif"
          fontWeight="900"
          fontSize="11"
          textAnchor="middle"
        >
          $
        </text>

        {/* Checkmark Verde Vibrante */}
        <path
          d="M26 21L37 32L55 13"
          stroke="#22C55E"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );

  if (variant === 'icon-only') {
    return <BrandIcon className={`${iconSizes[size]} ${className}`} />;
  }

  if (variant === 'badge') {
    return (
      <div
        className={`inline-flex items-center gap-2 bg-[#0B1528] border border-emerald-500/30 px-3 py-1.5 rounded-xl shadow-sm ${className}`}
      >
        <BrandIcon className={iconSizes.sm} />
        <div className="flex flex-col">
          <span className="font-['Montserrat',sans-serif] font-black text-xs text-white leading-tight">
            Fecha<span className="text-emerald-400">Caixa</span>
          </span>
          <span className="text-[8px] font-bold text-slate-400 tracking-wider uppercase">
            Conciliação & Auditoria
          </span>
        </div>
      </div>
    );
  }

  if (variant === 'full') {
    return (
      <div className={`flex flex-col items-center text-center select-none ${className}`}>
        {/* Ícone com brilho sutil */}
        <div className="relative mb-3">
          <div className="absolute inset-0 bg-emerald-500/20 blur-xl rounded-full" />
          <BrandIcon className={`${iconSizes[size]} relative`} />
        </div>

        {/* Tipografia Oficial FechaCaixa */}
        <div className="flex items-center font-['Montserrat',sans-serif] font-black tracking-tight leading-none text-white">
          <span className={textSizes[size]}>Fecha</span>
          <span className={`${textSizes[size]} ml-1.5 text-white flex items-center`}>
            Cai
            <span className="relative text-emerald-400">
              x
              <span className="absolute -top-0.5 right-0 w-1 h-1 bg-emerald-400 rounded-full" />
            </span>
            a
          </span>
        </div>

        {showSubtitle && (
          <p
            className={`font-['Montserrat',sans-serif] font-bold text-slate-300 uppercase tracking-[0.22em] mt-2 ${subtitleSizes[size]}`}
          >
            Sistema de Conciliação & Auditoria
          </p>
        )}
      </div>
    );
  }

  // Variant horizontal (Padrão para Cabeçalhos e Barras de Navegação)
  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      <BrandIcon className={iconSizes[size]} />
      <div className="flex flex-col justify-center">
        <div className="flex items-center font-['Montserrat',sans-serif] font-black tracking-tight leading-none text-white">
          <span className={textSizes[size]}>Fecha</span>
          <span className={`${textSizes[size]} ml-1 text-white flex items-center`}>
            Cai
            <span className="relative text-emerald-400">
              x
              <span className="absolute -top-0.5 right-0 w-1 h-1 bg-emerald-400 rounded-full" />
            </span>
            a
          </span>
        </div>
        {showSubtitle && (
          <span
            className={`font-['Montserrat',sans-serif] font-bold text-emerald-400/90 uppercase tracking-[0.18em] mt-1 ${subtitleSizes[size]}`}
          >
            Sistema de Conciliação & Auditoria
          </span>
        )}
      </div>
    </div>
  );
};
