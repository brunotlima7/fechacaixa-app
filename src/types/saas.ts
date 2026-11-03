export type SaaSPlan = 'basico' | 'pro' | 'enterprise';
export type TenantStatus = 'ativo' | 'inadimplente' | 'bloqueado' | 'trial';

export const PLAN_PRICING: Record<SaaSPlan, number> = {
  basico: 150,
  pro: 200,
  enterprise: 300,
};

export interface PlanFeatureInfo {
  id: SaaSPlan;
  name: string;
  tagline: string;
  price: number;
  badge?: string;
  badgeColor?: string;
  color: string;
  features: string[];
  notIncluded?: string[];
}

export const PLAN_DETAILS: Record<SaaSPlan, PlanFeatureInfo> = {
  basico: {
    id: 'basico',
    name: 'Plano Essencial',
    tagline: 'Ideal para bares e restaurantes que querem fechar caixas sem erros nas maquininhas e na gaveta.',
    price: 150,
    color: 'from-blue-600 to-cyan-600',
    features: [
      'Gestão de todas as maquininhas (Crédito, Débito, Pix e Voucher)',
      'Controle completo de Gaveta e Dinheiro físico (Sangrias e Suprimentos)',
      'Comparativo e conferência manual com o sistema PDV',
      'Relatórios formatados para PDF e compartilhamento no WhatsApp',
      'Backup automático e redundância em arquivo .JSON',
      'Múltiplos operadores e controle de acesso com PIN',
    ],
    notIncluded: [
      'Assistentes Inteligentes de Foto OCR e Comando de Voz',
      'Conexão direta automática com a Jclan (AlphaX9)',
      'Instalação, manutenção de cardápio e treinamento pela equipe',
    ],
  },
  pro: {
    id: 'pro',
    name: 'Plano Profissional IA',
    tagline: 'Para operações ágeis que economizam tempo com foto de comprovantes e comandos por voz.',
    price: 200,
    badge: 'Mais Popular',
    badgeColor: 'bg-orange-500 text-white',
    color: 'from-orange-500 to-amber-600',
    features: [
      'Tudo do Plano Essencial (R$ 150/mês)',
      'Leitura inteligente de fitas e comprovantes por FOTO (Gemini OCR)',
      'Preenchimento ágil por Comando de Voz nas maquininhas',
      'Auditoria Inteligente e histórico detalhado de alterações',
      'Sugestões automatizadas de conciliação com o cardápio',
      'Suporte técnico via WhatsApp',
    ],
    notIncluded: [
      'Conexão direta automática com a Jclan (AlphaX9)',
      'Instalação, manutenção de cardápio e treinamento pela equipe',
    ],
  },
  enterprise: {
    id: 'enterprise',
    name: 'Plano VIP / Enterprise',
    tagline: 'Solução completa com integração direta Jclan e assessoria VIP da equipe do Bruno Lima.',
    price: 300,
    badge: 'VIP Completo',
    badgeColor: 'bg-purple-600 text-white',
    color: 'from-purple-600 to-indigo-700',
    features: [
      'Tudo do Plano Profissional IA (R$ 200/mês)',
      'Conexão Direta Jclan AlphaX9 em 1 clique (login e captura automática)',
      'Sincronização em tempo real de vendas e turnos da Jclan',
      'Instalação e adaptação completa do sistema no seu estabelecimento',
      'Cadastro e manutenção contínua do seu cardápio pela equipe do Bruno',
      'Treinamento presencial/online de gerentes e operadores',
      'Canal VIP prioritário direto com o Bruno Lima',
    ],
  },
};

export interface PlanCapabilities {
  canUseAiAssistants: boolean; // Foto OCR, Comando de Voz nas maquininhas, Auditoria com IA
  canUseJclanIntegration: boolean; // Conexão direta com portal Jclan AlphaX9
  includesManagedMenuAndTraining: boolean; // Cardápio gerenciado pela equipe e treinamento
}

export const getPlanCapabilities = (plan: SaaSPlan = 'pro'): PlanCapabilities => {
  return {
    canUseAiAssistants: plan === 'pro' || plan === 'enterprise',
    canUseJclanIntegration: plan === 'enterprise',
    includesManagedMenuAndTraining: plan === 'enterprise',
  };
};

export interface Tenant {
  id: string; // e.g. 'tenant_flordebrasa'
  slug: string; // e.g. 'flordebrasa'
  name: string; // e.g. 'Flor de Brasa'
  cnpj: string; // e.g. '34.567.890/0001-12'
  city: string; // e.g. 'Curitiba - PR'
  address: string;
  phone: string;
  contactEmail: string;
  plan: SaaSPlan;
  monthlyPrice: number;
  status: TenantStatus;
  expiresAt: string; // ISO string
  createdAt: string; // ISO string
  logoInitials: string;
  logoColor: string;
  logoAvatarUrl?: string; // URL or base64 data URL of the bar's custom avatar/logo image
  notes?: string;
  loginBgImage?: string; // URL or base64 of background image for login screen
  themeColor?: string; // 'orange' | 'blue' | 'emerald' | 'purple' | 'amber' | 'rose' | 'slate'
  primaryColor?: string; // hex code like '#ea580c'
  pdvSystemName?: string; // e.g. 'Jclan', 'Colibri', 'Totvs Chef', 'Saipos', 'Zig'
  cardSystemName?: string; // e.g. 'Getnet', 'Cielo', 'Stone', 'PagBank', 'Rede'
  voucherNames?: string[]; // e.g. ['Alelo', 'Ticket', 'Sodexo', 'VR', 'Ben']
  creditFlags?: string[]; // e.g. ['Visa', 'Mastercard', 'Elo', 'Amex', 'Hipercard'] (padrão: vazio / sem bandeiras)
  debitFlags?: string[]; // e.g. ['Visa', 'Mastercard', 'Elo'] (padrão: vazio / sem bandeiras)
  closingReminderEnabled?: boolean;
  closingReminderTime?: string; // e.g. '02:00'
  closingReminderSound?: boolean;
  jclanPortalUrl?: string; // e.g. 'https://gestao.flordebrasacuritiba.com.br/'
  jclanPortalUsername?: string;
  jclanPortalPassword?: string;
  jclanPortalCookie?: string;
  jclanAutoSyncEnabled?: boolean;
  jclanDateMode?: 'turno_auto' | 'hoje' | 'ontem' | 'custom';
  jclanCustomStartDate?: string; // YYYY-MM-DD
  jclanCustomStartTime?: string; // HH:mm
  jclanCustomEndDate?: string; // YYYY-MM-DD
  jclanCustomEndTime?: string; // HH:mm
  jclanSelectedEmpresaId?: string;
  jclanEmpresasCache?: Array<{ id: string; name: string; codigoInterno?: string | number }>;
  updatedAt?: number;
  isCustomized?: boolean;
}

export interface MenuItem {
  name: string;
  price: number;
  cat: string;
  isPromo?: boolean;
}

export const isHappyHourOrPromoItem = (item: MenuItem): boolean => {
  if (item.isPromo === true) return true;
  if (item.isPromo === false) return false;
  const normalize = (str: string) =>
    (str || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  const text = `${normalize(item.name)} | ${normalize(item.cat)}`;
  return (
    text.includes('happy hour') ||
    text.includes('happy-hour') ||
    text.includes('happyhour') ||
    /\bhh\b/.test(text) ||
    text.includes('promo') ||
    text.includes('oferta') ||
    text.includes('combo') ||
    text.includes('em dobro') ||
    text.includes('double') ||
    text.includes('rodizio') ||
    text.includes('executivo') ||
    text.includes('ate 19h') ||
    text.includes('ate 20h') ||
    text.includes('17h as') ||
    text.includes('18h as') ||
    text.includes('horario limite')
  );
};

export interface CommandItem extends MenuItem {
  id: number;
}

export interface TenantUser {
  id: number;
  tenantId: string;
  name: string;
  pin: string;
  isAdmin: boolean;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  operator: string;
  category: 'pdv' | 'cartoes' | 'gaveta' | 'comanda' | 'zeramento' | 'sistema';
  action: string;
  details: string;
}

export interface HistoryRecord {
  id: number;
  tenantId?: string;
  date: string;
  operator?: string;
  getnet: number;
  jclan: number;
  diff: number;
  cashDiff: number;
  report: string;
  comments?: string;
  attachments?: string[]; // Array of base64 data URLs or image URLs
  selectedExclusionOptions?: Record<
    string,
    { title: string; instruction: string; diff: number; optionIndex?: number; optionKey?: string }
  >;
  auditTrail?: AuditLogEntry[];
  durationSeconds?: number;
  durationFormatted?: string;
  shiftStartedAt?: string;
  closingDateKey?: string; // YYYY-MM-DD
  createdAt?: string;
}

export interface Invoice {
  id: string;
  tenantId: string;
  amount: number;
  dueDate: string;
  status: 'paga' | 'pendente' | 'vencida';
  pixCode: string;
  pixQrCodeUrl?: string;
  boletoBarcode: string;
  paidAt?: string;
  description: string;
  createdAt: string;
}

export interface MasterStats {
  totalTenants: number;
  activeTenants: number;
  overdueTenants: number;
  blockedTenants: number;
  mrr: number;
  totalClosings: number;
}

export interface MasterOwnerProfile {
  name: string;
  email: string;
  pin: string;
  phone?: string;
  isConfigured: boolean;
  updatedAt?: string;
}

export interface Machine {
  id: number;
  collapsed: boolean;
  credits: string[];
  debits: string[];
  vouchers: string[];
  pix: string;
}

export interface ActiveShiftDraft {
  tenantId: string;
  updatedAt: number;
  updatedBy: string;
  deviceId: string;
  deviceType?: 'mobile' | 'desktop';
  jclan: {
    credit: string;
    debit: string;
    pix: string;
    voucher: string;
  };
  machines: Machine[];
  cash: Record<string, string>;
  cashSummary: {
    opening: string;
    jclanCash: string;
    expenses: string;
  };
  selectedExclusionOptions?: Record<
    string,
    { title: string; instruction: string; diff: number; optionIndex: number; optionKey: string }
  >;
  customCommands?: Record<string, CommandItem[]>;
  inclusionCommands?: Record<string, CommandItem[]>;
}
