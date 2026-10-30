export interface ThemePalette {
  id: string;
  name: string;
  primaryHex: string;
  badgeBg: string;
  badgeText: string;
  btnGradient: string;
  btnHover: string;
  ringFocus: string;
  logoGradient: string;
  accentText: string;
  borderAccent: string;
}

export const THEME_PALETTES: Record<string, ThemePalette> = {
  fechacaixa: {
    id: 'fechacaixa',
    name: 'FechaCaixa Oficial (Azul Royal & Verde Esmeralda)',
    primaryHex: '#22c55e',
    badgeBg: 'bg-emerald-500/20',
    badgeText: 'text-emerald-400',
    btnGradient: 'bg-gradient-to-r from-blue-700 via-blue-600 to-emerald-500',
    btnHover: 'hover:from-blue-600 hover:via-blue-500 hover:to-emerald-400',
    ringFocus: 'focus:ring-emerald-500',
    logoGradient: 'from-blue-600 to-emerald-500',
    accentText: 'text-emerald-400',
    borderAccent: 'border-emerald-500',
  },
  orange: {
    id: 'orange',
    name: 'Brasa / Laranja',
    primaryHex: '#ea580c',
    badgeBg: 'bg-orange-500/20',
    badgeText: 'text-orange-400',
    btnGradient: 'bg-gradient-to-r from-orange-600 to-amber-600',
    btnHover: 'hover:from-orange-500 hover:to-amber-500',
    ringFocus: 'focus:ring-orange-500',
    logoGradient: 'from-orange-500 to-amber-500',
    accentText: 'text-orange-500',
    borderAccent: 'border-orange-500',
  },
  blue: {
    id: 'blue',
    name: 'Oceano / Azul',
    primaryHex: '#0284c7',
    badgeBg: 'bg-blue-500/20',
    badgeText: 'text-blue-400',
    btnGradient: 'bg-gradient-to-r from-blue-600 to-cyan-600',
    btnHover: 'hover:from-blue-500 hover:to-cyan-500',
    ringFocus: 'focus:ring-blue-500',
    logoGradient: 'from-blue-600 to-cyan-500',
    accentText: 'text-blue-500',
    borderAccent: 'border-blue-500',
  },
  emerald: {
    id: 'emerald',
    name: 'Boteco / Verde Esmeralda',
    primaryHex: '#059669',
    badgeBg: 'bg-emerald-500/20',
    badgeText: 'text-emerald-400',
    btnGradient: 'bg-gradient-to-r from-emerald-600 to-teal-600',
    btnHover: 'hover:from-emerald-500 hover:to-teal-500',
    ringFocus: 'focus:ring-emerald-500',
    logoGradient: 'from-emerald-600 to-teal-500',
    accentText: 'text-emerald-500',
    borderAccent: 'border-emerald-500',
  },
  purple: {
    id: 'purple',
    name: 'Gastro / Roxo Noturno',
    primaryHex: '#7c3aed',
    badgeBg: 'bg-purple-500/20',
    badgeText: 'text-purple-400',
    btnGradient: 'bg-gradient-to-r from-purple-600 to-indigo-600',
    btnHover: 'hover:from-purple-500 hover:to-indigo-500',
    ringFocus: 'focus:ring-purple-500',
    logoGradient: 'from-purple-600 to-indigo-500',
    accentText: 'text-purple-500',
    borderAccent: 'border-purple-500',
  },
  amber: {
    id: 'amber',
    name: 'Lounge / Âmbar Dourado',
    primaryHex: '#d97706',
    badgeBg: 'bg-amber-500/20',
    badgeText: 'text-amber-400',
    btnGradient: 'bg-gradient-to-r from-amber-600 to-yellow-600',
    btnHover: 'hover:from-amber-500 hover:to-yellow-500',
    ringFocus: 'focus:ring-amber-500',
    logoGradient: 'from-amber-600 to-red-600',
    accentText: 'text-amber-500',
    borderAccent: 'border-amber-500',
  },
  rose: {
    id: 'rose',
    name: 'Bistrô / Carmim & Rubi',
    primaryHex: '#e11d48',
    badgeBg: 'bg-rose-500/20',
    badgeText: 'text-rose-400',
    btnGradient: 'bg-gradient-to-r from-rose-600 to-pink-600',
    btnHover: 'hover:from-rose-500 hover:to-pink-500',
    ringFocus: 'focus:ring-rose-500',
    logoGradient: 'from-rose-600 to-pink-500',
    accentText: 'text-rose-500',
    borderAccent: 'border-rose-500',
  },
  slate: {
    id: 'slate',
    name: 'Modern / Grafite & Aço',
    primaryHex: '#334155',
    badgeBg: 'bg-slate-500/20',
    badgeText: 'text-slate-300',
    btnGradient: 'bg-gradient-to-r from-slate-700 to-slate-900',
    btnHover: 'hover:from-slate-600 hover:to-slate-800',
    ringFocus: 'focus:ring-slate-500',
    logoGradient: 'from-slate-700 to-slate-900',
    accentText: 'text-slate-400',
    borderAccent: 'border-slate-500',
  },
};

export const getTheme = (themeId?: string): ThemePalette => {
  if (!themeId) return THEME_PALETTES.orange;
  return THEME_PALETTES[themeId] || THEME_PALETTES.orange;
};

export interface BackgroundPreset {
  id: string;
  title: string;
  description: string;
  url: string;
}

export const LOGIN_BG_PRESETS: BackgroundPreset[] = [
  {
    id: 'fechacaixa_official',
    title: 'FechaCaixa Oficial (Marca & Identidade)',
    description: 'Wallpaper oficial em Azul Escuro (#0B1528) e Verde Esmeralda (#22C55E)',
    url: '/assets/aistudio/Gemini_Generated_Image_1fwult1fwult1fwu_e6cd1608.jpg',
  },
  {
    id: 'rustic_bar',
    title: 'Bar Rústico & Brasa',
    description: 'Iluminação âmbar aconchegante com balcão de madeira',
    url: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=1920&q=80',
  },
  {
    id: 'cozy_bistro',
    title: 'Bistrô & Frutos do Mar',
    description: 'Ambiente arejado e sofisticado estilo Bar do Victor',
    url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1920&q=80',
  },
  {
    id: 'gastropub',
    title: 'Babilônia & Gastronomia 24h',
    description: 'Restaurante amplo e moderno com iluminação cênica',
    url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1920&q=80',
  },
  {
    id: 'asian_lounge',
    title: 'Taj Lounge & Coquetelaria',
    description: 'Ambiente exclusivo com atmosfera noturna e luzes quentes',
    url: 'https://images.unsplash.com/photo-1572116469696-31de0f17cc34?auto=format&fit=crop&w=1920&q=80',
  },
  {
    id: 'brewpub',
    title: 'Chopperia & Taproom Curitiba',
    description: 'Balcão de chopp artesanal e torneiras iluminadas',
    url: 'https://images.unsplash.com/photo-1575444758702-4a6b9222336e?auto=format&fit=crop&w=1920&q=80',
  },
  {
    id: 'cocktail_bar',
    title: 'Bar de Coquetéis & Balcão',
    description: 'Taças e garrafas em exibição com estética elegante',
    url: 'https://images.unsplash.com/photo-1543007630-9710e4a00a20?auto=format&fit=crop&w=1920&q=80',
  },
];
