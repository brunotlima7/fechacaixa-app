export type SaaSPlan = 'basico' | 'pro' | 'enterprise';
export type TenantStatus = 'ativo' | 'inadimplente' | 'bloqueado' | 'trial';

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
  notes?: string;
  loginBgImage?: string; // URL or base64 of background image for login screen
  themeColor?: string; // 'orange' | 'blue' | 'emerald' | 'purple' | 'amber' | 'rose' | 'slate'
  primaryColor?: string; // hex code like '#ea580c'
  pdvSystemName?: string; // e.g. 'Jclan', 'Colibri', 'Totvs Chef', 'Saipos', 'Zig'
  cardSystemName?: string; // e.g. 'Getnet', 'Cielo', 'Stone', 'PagBank', 'Rede'
  voucherNames?: string[]; // e.g. ['Alelo', 'Ticket', 'Sodexo', 'VR', 'Ben']
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
  selectedExclusionOptions?: Record<string, { title: string; instruction: string; diff: number }>;
  auditTrail?: AuditLogEntry[];
  durationSeconds?: number;
  durationFormatted?: string;
  shiftStartedAt?: string;
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

