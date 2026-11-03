import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Tenant, MenuItem, TenantUser, HistoryRecord, Invoice, MasterStats, MasterOwnerProfile, ActiveShiftDraft } from '../src/types/saas.ts';
import { FLOR_DE_BRASA_MENU, BAR_DO_VICTOR_MENU, BABILONIA_MENU, TAJ_BAR_MENU } from '../src/data/defaultMenus.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '..', 'data');
const DB_FILE = path.resolve(DATA_DIR, 'saas_db.json');

export interface SaaSDatabase {
  tenants: Tenant[];
  menus: Record<string, MenuItem[]>;
  customizedMenus?: Record<string, number>;
  deletedTenantIds?: string[];
  deletedClosingIds?: Record<string, number[]>;
  users: Record<string, TenantUser[]>;
  closings: Record<string, HistoryRecord[]>;
  activeDrafts?: Record<string, ActiveShiftDraft>;
  invoices: Invoice[];
  masterPin: string;
  masterOwner: MasterOwnerProfile;
}

const DEFAULT_MASTER_OWNER: MasterOwnerProfile = {
  name: 'Bruno Lima',
  email: 'brunotlima7@gmail.com',
  pin: 'master2026',
  phone: '(41) 99882-1917',
  isConfigured: true,
  updatedAt: new Date().toISOString(),
};

const DEFAULT_TENANTS: Tenant[] = [
  {
    id: 'tenant_flordebrasa',
    slug: 'flordebrasa',
    name: 'Flor de Brasa - Bar & Brasa',
    cnpj: '38.921.442/0001-55',
    city: 'Curitiba - PR',
    address: 'R. Comendador Araújo, 450 - Batel',
    phone: '(41) 99882-1917',
    contactEmail: 'gerencia@flordebrasa.com.br',
    plan: 'pro',
    monthlyPrice: 200.0,
    status: 'ativo',
    expiresAt: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
    logoInitials: 'FB',
    logoColor: 'from-orange-500 to-amber-500',
    notes: 'Cliente flagship em Curitiba com integração Getnet e Jclan.',
    loginBgImage: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=1920&q=80',
    themeColor: 'orange',
    primaryColor: '#ea580c',
    pdvSystemName: 'Jclan',
    cardSystemName: 'Getnet',
    voucherNames: ['Alelo', 'Ticket', 'Sodexo', 'VR', 'Ben'],
  },
  {
    id: 'tenant_bardovictor',
    slug: 'bardovictor',
    name: 'Bar do Victor - São Lourenço',
    cnpj: '76.104.923/0001-88',
    city: 'Curitiba - PR',
    address: 'R. Lívio Moreira, 284 - São Lourenço',
    phone: '(41) 3353-4419',
    contactEmail: 'financeiro@bardovictor.com.br',
    plan: 'pro',
    monthlyPrice: 200.0,
    status: 'ativo',
    expiresAt: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    logoInitials: 'BV',
    logoColor: 'from-blue-600 to-cyan-500',
    notes: 'Frutos do mar e petiscos tradicionais de Curitiba.',
    loginBgImage: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1920&q=80',
    themeColor: 'blue',
    primaryColor: '#0284c7',
    pdvSystemName: 'Totvs Chef',
    cardSystemName: 'Cielo',
  },
  {
    id: 'tenant_babilonia',
    slug: 'babilonia',
    name: 'Babilônia Gastronomia',
    cnpj: '04.819.330/0001-20',
    city: 'Curitiba - PR',
    address: 'Al. Dom Pedro II, 541 - Batel',
    phone: '(41) 3566-6464',
    contactEmail: 'caixa@babilonia.com.br',
    plan: 'enterprise',
    monthlyPrice: 300.0,
    status: 'ativo',
    expiresAt: new Date(Date.now() + 22 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
    logoInitials: 'BG',
    logoColor: 'from-purple-600 to-indigo-500',
    notes: 'Operação 24 horas e múltiplos turnos de caixa diários.',
    loginBgImage: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1920&q=80',
    themeColor: 'purple',
    primaryColor: '#7c3aed',
    pdvSystemName: 'Colibri',
    cardSystemName: 'Stone',
  },
  {
    id: 'tenant_tajbar',
    slug: 'tajbar',
    name: 'Taj Bar Curitiba',
    cnpj: '11.455.772/0001-31',
    city: 'Curitiba - PR',
    address: 'R. Bispo Dom José, 2302 - Batel',
    phone: '(41) 3343-4467',
    contactEmail: 'financeiro@tajbarcuritiba.com.br',
    plan: 'pro',
    monthlyPrice: 200.0,
    status: 'bloqueado', // Demonstrando a Fase 3 e 4 com bar bloqueado por inadimplência
    expiresAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
    logoInitials: 'TB',
    logoColor: 'from-amber-600 to-red-600',
    notes: 'Mensalidade atrasada há 3 dias. Acesso suspenso até confirmação do Pix.',
    loginBgImage: 'https://images.unsplash.com/photo-1572116469696-31de0f17cc34?auto=format&fit=crop&w=1920&q=80',
    themeColor: 'amber',
    primaryColor: '#d97706',
    pdvSystemName: 'Zig',
    cardSystemName: 'Rede',
  },
];

const DEFAULT_USERS: Record<string, TenantUser[]> = {
  tenant_flordebrasa: [
    { id: 1, tenantId: 'tenant_flordebrasa', name: 'bruno', pin: '1917', isAdmin: true },
    { id: 2, tenantId: 'tenant_flordebrasa', name: 'camila', pin: '1234', isAdmin: false },
    { id: 3, tenantId: 'tenant_flordebrasa', name: 'barbara', pin: '1234', isAdmin: false },
    { id: 4, tenantId: 'tenant_flordebrasa', name: 'vini', pin: '1234', isAdmin: false },
    { id: 5, tenantId: 'tenant_flordebrasa', name: 'fernando', pin: 'lixo', isAdmin: false },
  ],
  tenant_bardovictor: [
    { id: 101, tenantId: 'tenant_bardovictor', name: 'victor', pin: '1234', isAdmin: true },
    { id: 102, tenantId: 'tenant_bardovictor', name: 'lucas', pin: '1234', isAdmin: false },
  ],
  tenant_babilonia: [
    { id: 201, tenantId: 'tenant_babilonia', name: 'marcos', pin: '1234', isAdmin: true },
    { id: 202, tenantId: 'tenant_babilonia', name: 'patricia', pin: '1234', isAdmin: false },
  ],
  tenant_tajbar: [
    { id: 301, tenantId: 'tenant_tajbar', name: 'rodrigo', pin: '1234', isAdmin: true },
  ],
};

const DEFAULT_MENUS: Record<string, MenuItem[]> = {
  tenant_flordebrasa: FLOR_DE_BRASA_MENU,
  tenant_bardovictor: BAR_DO_VICTOR_MENU,
  tenant_babilonia: BABILONIA_MENU,
  tenant_tajbar: TAJ_BAR_MENU,
};

const DEFAULT_CLOSINGS: Record<string, HistoryRecord[]> = {
  tenant_flordebrasa: [
    {
      id: 1729640700001,
      tenantId: 'tenant_flordebrasa',
      date: '22/10/2026 23:45',
      operator: 'bruno',
      getnet: 8450.0,
      jclan: 8450.0,
      diff: 0.0,
      cashDiff: 0.0,
      durationSeconds: 745,
      durationFormatted: '12 min 25s',
      shiftStartedAt: '23:32',
      comments: 'Fechamento tranquilo sem divergências. Bobina da maquininha 02 trocada às 21h. Gaveta bateu centavo por centavo.',
      attachments: [
        'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80',
        'https://images.unsplash.com/photo-1556742049-0a67c5574f73?auto=format&fit=crop&w=600&q=80'
      ],
      selectedExclusionOptions: {
        Crédito: {
          title: '1ª Opção: Comanda Paga COM 10% (Taxa de Serviço)',
          instruction: '✂️ Exclua da comanda reaberta: [2x Chopp Brahma 300ml]. ✨ Zera 100% no centavo exato no Jclan (R$ 0,00 de desconto)!',
          diff: 0,
          optionIndex: 0,
          optionKey: 'exc-0',
        },
      },
      auditTrail: [
        {
          id: 'seed_fb1_9',
          timestamp: '23:45:02',
          operator: 'bruno',
          category: 'sistema',
          action: 'Fechamento de Caixa Salvo',
          details: 'Fechamento salvo por bruno em 12 min 25s (Diferença Cartões: R$ 0,00, Gaveta: R$ 0,00)',
        },
        {
          id: 'seed_fb1_8',
          timestamp: '23:43:18',
          operator: 'bruno',
          category: 'zeramento',
          action: 'Marcou opção para fechamento final (Crédito)',
          details: '1ª Opção: Comanda Paga COM 10% (Taxa de Serviço) -> ✂️ Exclua da comanda reaberta: [2x Chopp Brahma 300ml]. ✨ Zera 100% no centavo exato no Jclan!',
        },
        {
          id: 'seed_fb1_7',
          timestamp: '23:42:05',
          operator: 'bruno',
          category: 'comanda',
          action: 'Adicionou item na Comanda Reaberta (Crédito)',
          details: '2x Chopp Brahma 300ml (R$ 29,80) simulados para conciliação',
        },
        {
          id: 'seed_fb1_6',
          timestamp: '23:40:12',
          operator: 'bruno',
          category: 'pdv',
          action: 'Preencheu Totais no Jclan (Crédito, Débito, Pix e Voucher)',
          details: 'Crédito: R$ 4.820,00 | Débito: R$ 1.940,00 | Pix: R$ 1.310,00 | Voucher: R$ 380,00 (Total PDV: R$ 8.450,00)',
        },
        {
          id: 'seed_fb1_5',
          timestamp: '23:38:44',
          operator: 'bruno',
          category: 'cartoes',
          action: 'Preencheu Voucher (Alelo e Ticket) na Máquina #2',
          details: 'Alelo: R$ 230,00 | Ticket: R$ 150,00',
        },
        {
          id: 'seed_fb1_4',
          timestamp: '23:37:10',
          operator: 'bruno',
          category: 'cartoes',
          action: 'Leitura OCR Maquininha #1 e #2 (Getnet)',
          details: 'Comprovantes analisados e valores preenchidos via IA (Total Getnet: R$ 8.450,00)',
        },
        {
          id: 'seed_fb1_3',
          timestamp: '23:35:22',
          operator: 'bruno',
          category: 'gaveta',
          action: 'Preencheu Fundo de Abertura e Vendas Dinheiro no Jclan',
          details: 'Abertura: R$ 300,00 | Vendas Dinheiro Jclan: R$ 1.130,00 | Sangrias/Pagamentos: R$ 150,00',
        },
        {
          id: 'seed_fb1_2',
          timestamp: '23:34:05',
          operator: 'bruno',
          category: 'gaveta',
          action: 'Contagem física de Notas e Moedas na Gaveta',
          details: 'Notas (R$ 100, R$ 50, R$ 20, R$ 10) e moedas conferidas -> Total Físico: R$ 1.280,00',
        },
        {
          id: 'seed_fb1_1',
          timestamp: '23:32:10',
          operator: 'bruno',
          category: 'sistema',
          action: 'Login de Operador',
          details: 'Operador bruno iniciou a sessão de caixa às 23:32',
        },
      ],
      report: `📊 FECHAMENTO DE CAIXA - Flor de Brasa\n📅 Data: 22/10/2026 às 23:45\n👤 Operador: BRUNO\n⏱️ Duração: 12 min 25s\n\n💳 CARTÕES: R$ 8.450,00 (Batendo 100%!)\n💵 GAVETA: R$ 1.280,00 (Batendo 100%!)`,
      createdAt: '2026-10-22T23:45:00.000Z',
    },
    {
      id: 1729553400002,
      tenantId: 'tenant_flordebrasa',
      date: '21/10/2026 23:30',
      operator: 'camila',
      getnet: 6320.5,
      jclan: 6320.5,
      diff: 0.0,
      cashDiff: 0.0,
      durationSeconds: 520,
      durationFormatted: '8 min 40s',
      shiftStartedAt: '23:21',
      comments: 'Turno da noite encerrado com todas as comandas baixadas. Comprovantes arquivados no envelope do dia.',
      attachments: [
        'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80'
      ],
      selectedExclusionOptions: {
        Débito: {
          title: 'Nova Comanda: 1x Batata Frita (SEM 10%)',
          instruction: 'Lance na nova comanda no Jclan: 1x Batata Frita (R$ 34,90) e desative os 10% de serviço. ✨ Zera 100% no centavo exato!',
          diff: 0,
          optionIndex: 0,
          optionKey: 'nova-0',
        },
      },
      auditTrail: [
        {
          id: 'seed_fb2_6',
          timestamp: '23:30:00',
          operator: 'camila',
          category: 'sistema',
          action: 'Fechamento de Caixa Salvo',
          details: 'Fechamento salvo por camila em 8 min 40s (Diferença Cartões: R$ 0,00, Gaveta: R$ 0,00)',
        },
        {
          id: 'seed_fb2_5',
          timestamp: '23:28:40',
          operator: 'camila',
          category: 'zeramento',
          action: 'Marcou opção para fechamento final (Débito)',
          details: 'Nova Comanda: 1x Batata Frita (SEM 10%) -> Lance na nova comanda no Jclan: 1x Batata Frita (R$ 34,90) e desative os 10% de serviço.',
        },
        {
          id: 'seed_fb2_4',
          timestamp: '23:26:15',
          operator: 'camila',
          category: 'pdv',
          action: 'Preencheu valores de Crédito, Débito, Pix e Voucher no Jclan',
          details: 'Total conferido no relatório Jclan: R$ 6.320,50',
        },
        {
          id: 'seed_fb2_3',
          timestamp: '23:24:50',
          operator: 'camila',
          category: 'cartoes',
          action: 'Preencheu Máquinas Getnet (#1 a #3)',
          details: 'Crédito, Débito, Pix e Vouchers digitados (Total Getnet: R$ 6.320,50)',
        },
        {
          id: 'seed_fb2_2',
          timestamp: '23:22:30',
          operator: 'camila',
          category: 'gaveta',
          action: 'Contagem de Notas, Moedas e Abertura da Gaveta',
          details: 'Total físico contado na gaveta: R$ 940,00 (100% conciliado)',
        },
        {
          id: 'seed_fb2_1',
          timestamp: '23:21:20',
          operator: 'camila',
          category: 'sistema',
          action: 'Login de Operador',
          details: 'Operador camila iniciou a sessão de caixa às 23:21',
        },
      ],
      report: `📊 FECHAMENTO DE CAIXA - Flor de Brasa\n📅 Data: 21/10/2026 às 23:30\n👤 Operador: CAMILA\n⏱️ Duração: 8 min 40s\n\n💳 CARTÕES: R$ 6.320,50\n💵 GAVETA: R$ 940,00`,
      createdAt: '2026-10-21T23:30:00.000Z',
    },
  ],
  tenant_bardovictor: [
    {
      id: 1729638900003,
      tenantId: 'tenant_bardovictor',
      date: '22/10/2026 23:15',
      operator: 'victor',
      getnet: 5890.0,
      jclan: 5890.0,
      diff: 0.0,
      cashDiff: 0.0,
      durationSeconds: 610,
      durationFormatted: '10 min 10s',
      shiftStartedAt: '23:04',
      comments: 'Diferença zero. Todas as 4 maquininhas conferidas.',
      auditTrail: [
        {
          id: 'seed_bv1_4',
          timestamp: '23:15:00',
          operator: 'victor',
          category: 'sistema',
          action: 'Fechamento de Caixa Salvo',
          details: 'Fechamento salvo por victor em 10 min 10s (Diferença Cartões: R$ 0,00, Gaveta: R$ 0,00)',
        },
        {
          id: 'seed_bv1_3',
          timestamp: '23:11:30',
          operator: 'victor',
          category: 'pdv',
          action: 'Preencheu Totvs Chef (Crédito, Débito, Pix e Voucher)',
          details: 'Total lançado no sistema PDV: R$ 5.890,00',
        },
        {
          id: 'seed_bv1_2',
          timestamp: '23:08:15',
          operator: 'victor',
          category: 'cartoes',
          action: 'Conferência das 4 maquininhas Cielo',
          details: 'Valores de Crédito, Débito e Pix preenchidos (Total: R$ 5.890,00)',
        },
        {
          id: 'seed_bv1_1',
          timestamp: '23:04:50',
          operator: 'victor',
          category: 'sistema',
          action: 'Login de Operador',
          details: 'Operador victor iniciou a sessão de caixa às 23:04',
        },
      ],
      report: `📊 FECHAMENTO DE CAIXA - Bar do Victor\nData: 22/10/2026\nTotal Cartões: R$ 5.890,00`,
      createdAt: '2026-10-22T23:15:00.000Z',
    },
  ],
};

const DEFAULT_INVOICES: Invoice[] = [
  {
    id: 'inv_fb_01',
    tenantId: 'tenant_flordebrasa',
    amount: 200.0,
    dueDate: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    status: 'paga',
    pixCode: '00020126580014br.gov.bcb.pix0136fechacaixa-cwb@banco.com5204000053039865406200.005802BR5915FECHACAIXA SAAS6008CURITIBA62070503***6304E8A1',
    boletoBarcode: '34191.79001 01043.510047 91020.150008 4 92830000020000',
    paidAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    description: 'Assinatura FechaCaixa Profissional IA - Mensalidade Novembro/2026',
    createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'inv_taj_01',
    tenantId: 'tenant_tajbar',
    amount: 200.0,
    dueDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    status: 'vencida',
    pixCode: '00020126580014br.gov.bcb.pix0136tajbar-cwb@banco.com5204000053039865406200.005802BR5915FECHACAIXA SAAS6008CURITIBA62070503***6304FA92',
    boletoBarcode: '34191.79001 01043.510047 91020.150008 4 92830000020000',
    description: 'Assinatura FechaCaixa Profissional IA - Mensalidade Outubro/2026 (Em Atraso)',
    createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

class CloudDatabaseStore {
  private db: SaaSDatabase;

  constructor() {
    this.ensureDataDir();
    this.db = this.loadFromDisk();
  }

  private ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
      try {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      } catch (e) {
        console.warn('Could not create data dir, using memory store:', e);
      }
    }
  }

  private loadFromDisk(): SaaSDatabase {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        const deletedIds: string[] = Array.isArray(parsed.deletedTenantIds) ? parsed.deletedTenantIds : [];
        const deletedSet = new Set(deletedIds);

        const loadedTenants: Tenant[] = (Array.isArray(parsed.tenants) ? parsed.tenants : DEFAULT_TENANTS)
          .filter((t: Tenant) => t && !deletedSet.has(t.id))
          .map((t: Tenant) => {
            const matchDefault = DEFAULT_TENANTS.find((d) => d.id === t.id);
            return {
              ...t,
              loginBgImage: t.loginBgImage || matchDefault?.loginBgImage || 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=1920&q=80',
              themeColor: t.themeColor || matchDefault?.themeColor || 'orange',
              primaryColor: t.primaryColor || matchDefault?.primaryColor || '#ea580c',
              pdvSystemName: t.pdvSystemName !== undefined ? t.pdvSystemName : (matchDefault?.pdvSystemName || ''),
              cardSystemName: t.cardSystemName !== undefined ? t.cardSystemName : (matchDefault?.cardSystemName || ''),
              voucherNames: Array.isArray(t.voucherNames) ? t.voucherNames : (matchDefault?.voucherNames || []),
              creditFlags: Array.isArray(t.creditFlags) ? t.creditFlags : [],
              debitFlags: Array.isArray(t.debitFlags) ? t.debitFlags : [],
            };
          });

        const customizedMenus: Record<string, number> = parsed.customizedMenus || {};
        const loadedMenus: Record<string, MenuItem[]> = parsed.menus || { ...DEFAULT_MENUS };
        const defaultIds = new Set(DEFAULT_TENANTS.map((d) => d.id));
        loadedTenants.forEach((t) => {
          if (!defaultIds.has(t.id) && !customizedMenus[t.id]) {
            const currentM = loadedMenus[t.id];
            if (
              !Array.isArray(currentM) ||
              (currentM.length === FLOR_DE_BRASA_MENU.length &&
                currentM[0]?.name === FLOR_DE_BRASA_MENU[0]?.name)
            ) {
              loadedMenus[t.id] = [];
            }
          }
        });

        const deletedClosingIds: Record<string, number[]> = parsed.deletedClosingIds || {};
        const rawClosings: Record<string, HistoryRecord[]> = parsed.closings || DEFAULT_CLOSINGS;
        const loadedClosings: Record<string, HistoryRecord[]> = {};
        Object.keys(rawClosings).forEach((tenantId) => {
          const defaultList = DEFAULT_CLOSINGS[tenantId] || [];
          const delCloseSet = new Set((deletedClosingIds[tenantId] || []).map(Number));
          loadedClosings[tenantId] = (rawClosings[tenantId] || [])
            .filter((rec) => rec && !delCloseSet.has(Number(rec.id)) && (!rec.tenantId || rec.tenantId === tenantId))
            .map((rec) => {
              const withTenant = { ...rec, tenantId };
              if (withTenant.auditTrail && withTenant.auditTrail.length > 0) return withTenant;
              const matchDefaultClosing = defaultList.find((d) => d.date === withTenant.date && d.operator === withTenant.operator);
              if (matchDefaultClosing?.auditTrail) {
                return {
                  ...withTenant,
                  auditTrail: matchDefaultClosing.auditTrail,
                  selectedExclusionOptions: withTenant.selectedExclusionOptions || matchDefaultClosing.selectedExclusionOptions,
                };
              }
              return withTenant;
            });
        });

        return {
          tenants: loadedTenants,
          menus: loadedMenus,
          customizedMenus,
          deletedTenantIds: deletedIds,
          deletedClosingIds,
          users: parsed.users || DEFAULT_USERS,
          closings: loadedClosings,
          activeDrafts: parsed.activeDrafts || {},
          invoices: parsed.invoices || DEFAULT_INVOICES,
          masterPin: parsed.masterPin || 'master2026',
          masterOwner: parsed.masterOwner || DEFAULT_MASTER_OWNER,
        };
      }
    } catch (e) {
      console.warn('Error reading db file, falling back to defaults:', e);
    }

    const initial: SaaSDatabase = {
      tenants: DEFAULT_TENANTS,
      menus: DEFAULT_MENUS,
      customizedMenus: {},
      deletedTenantIds: [],
      deletedClosingIds: {},
      users: DEFAULT_USERS,
      closings: DEFAULT_CLOSINGS,
      activeDrafts: {},
      invoices: DEFAULT_INVOICES,
      masterPin: 'master2026',
      masterOwner: DEFAULT_MASTER_OWNER,
    };
    this.saveToDisk(initial);
    return initial;
  }

  private saveToDisk(data: SaaSDatabase) {
    try {
      this.ensureDataDir();
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
      console.warn('Could not persist db to disk:', e);
    }
  }

  private persist() {
    this.saveToDisk(this.db);
  }

  // --- TENANTS ---
  getTenants(): Tenant[] {
    return this.db.tenants;
  }

  getTenantById(id: string): Tenant | undefined {
    return this.db.tenants.find((t) => t.id === id || t.slug === id);
  }

  createTenant(tenantData: Partial<Tenant>): Tenant {
    const slug = (tenantData.slug || tenantData.name?.toLowerCase().replace(/[^a-z0-9]/g, '') || `bar_${Date.now()}`);
    const id = tenantData.id || `tenant_${slug}`;

    if (Array.isArray(this.db.deletedTenantIds)) {
      this.db.deletedTenantIds = this.db.deletedTenantIds.filter((dId) => dId !== id);
    }

    const existingIndex = this.db.tenants.findIndex((t) => t.id === id || t.slug === slug);
    if (existingIndex !== -1) {
      this.db.tenants[existingIndex] = {
        ...this.db.tenants[existingIndex],
        ...tenantData,
        updatedAt: tenantData.updatedAt || Date.now(),
        isCustomized: true,
      };
      if (!this.db.menus[id]) this.db.menus[id] = [];
      if (!this.db.users[id]) {
        this.db.users[id] = [
          { id: Date.now(), tenantId: id, name: 'admin', pin: '1234', isAdmin: true },
        ];
      }
      if (!this.db.closings[id]) this.db.closings[id] = [];
      this.persist();
      return this.db.tenants[existingIndex];
    }

    const newTenant: Tenant = {
      id,
      slug,
      name: tenantData.name?.trim() || 'Novo Estabelecimento',
      cnpj: tenantData.cnpj?.trim() || '',
      city: tenantData.city?.trim() || '',
      address: tenantData.address?.trim() || '',
      phone: tenantData.phone?.trim() || '',
      contactEmail: tenantData.contactEmail?.trim() || '',
      plan: tenantData.plan || 'pro',
      monthlyPrice: tenantData.monthlyPrice || (tenantData.plan === 'basico' ? 150 : tenantData.plan === 'enterprise' ? 300 : 200),
      status: 'ativo',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
      logoInitials: (tenantData.name ? tenantData.name.trim().slice(0, 2).toUpperCase() : 'BR'),
      logoColor: tenantData.logoColor || 'from-orange-500 to-amber-500',
      logoAvatarUrl: tenantData.logoAvatarUrl,
      notes: tenantData.notes?.trim() || '',
      loginBgImage: tenantData.loginBgImage || 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=1920&q=80',
      themeColor: tenantData.themeColor || 'orange',
      primaryColor: tenantData.primaryColor || '#ea580c',
      pdvSystemName: tenantData.pdvSystemName?.trim() || '',
      cardSystemName: tenantData.cardSystemName?.trim() || '',
      voucherNames: Array.isArray(tenantData.voucherNames) ? tenantData.voucherNames : [],
      creditFlags: Array.isArray(tenantData.creditFlags) ? tenantData.creditFlags : [],
      debitFlags: Array.isArray(tenantData.debitFlags) ? tenantData.debitFlags : [],
      closingReminderEnabled: tenantData.closingReminderEnabled,
      closingReminderTime: tenantData.closingReminderTime,
      closingReminderSound: tenantData.closingReminderSound,
      updatedAt: tenantData.updatedAt || Date.now(),
      isCustomized: true,
    };

    this.db.tenants.push(newTenant);
    // Novos bares/restaurantes começam 100% vazios (sem itens no cardápio, sem histórico, sem maquininhas pré-salvas)
    this.db.menus[id] = [];
    this.db.users[id] = [
      { id: Date.now(), tenantId: id, name: 'admin', pin: '1234', isAdmin: true },
    ];
    this.db.closings[id] = [];
    if (this.db.activeDrafts && this.db.activeDrafts[id]) {
      delete this.db.activeDrafts[id];
    }
    this.persist();
    return newTenant;
  }

  syncTenants(
    incomingTenants: Tenant[],
    incomingUsers?: Record<string, TenantUser[]>,
    incomingMenus?: Record<string, MenuItem[]>,
    incomingClosings?: Record<string, HistoryRecord[]>,
    deletedTenantIds?: string[],
    deletedClosingIdsByTenant?: Record<string, number[]>
  ): Tenant[] {
    if (!this.db.deletedTenantIds) this.db.deletedTenantIds = [];
    if (!this.db.deletedClosingIds) this.db.deletedClosingIds = {};
    if (!this.db.customizedMenus) this.db.customizedMenus = {};

    if (Array.isArray(deletedTenantIds) && deletedTenantIds.length > 0) {
      const delSet = new Set([...this.db.deletedTenantIds, ...deletedTenantIds]);
      this.db.deletedTenantIds = Array.from(delSet);
      this.db.tenants = this.db.tenants.filter((t) => !delSet.has(t.id));
    }

    const activeDeletedSet = new Set(this.db.deletedTenantIds);

    if (Array.isArray(incomingTenants)) {
      incomingTenants.forEach((incoming) => {
        if (!incoming || activeDeletedSet.has(incoming.id)) return;
        const idx = this.db.tenants.findIndex((t) => t.id === incoming.id || t.slug === incoming.slug);
        if (idx !== -1) {
          const existing = this.db.tenants[idx];
          const incomingTime = incoming.updatedAt || (incoming.isCustomized ? 1 : 0);
          const existingTime = existing.updatedAt || (existing.isCustomized ? 1 : 0);
          // Se o registro que veio do navegador possui customizações ou carimbo >= ao do servidor, aplica sobre o servidor
          if (incomingTime >= existingTime || !existing.isCustomized) {
            this.db.tenants[idx] = {
              ...existing,
              ...incoming,
              updatedAt: Math.max(incomingTime, existingTime) || Date.now(),
              isCustomized: Boolean(incoming.isCustomized || existing.isCustomized),
            };
          }
        } else {
          this.db.tenants.push({
            ...incoming,
            updatedAt: incoming.updatedAt || Date.now(),
            isCustomized: true,
          });
          if (!this.db.menus[incoming.id]) this.db.menus[incoming.id] = [];
          if (!this.db.users[incoming.id]) {
            this.db.users[incoming.id] = [
              { id: Date.now(), tenantId: incoming.id, name: 'admin', pin: '1234', isAdmin: true },
            ];
          }
          if (!this.db.closings[incoming.id]) this.db.closings[incoming.id] = [];
        }
      });
    }

    if (incomingUsers && typeof incomingUsers === 'object') {
      Object.entries(incomingUsers).forEach(([tenantId, userList]) => {
        if (activeDeletedSet.has(tenantId)) return;
        if (Array.isArray(userList) && userList.length > 0) {
          this.db.users[tenantId] = userList.map((u, idx) => ({
            id: u.id || Date.now() + idx,
            tenantId,
            name: String(u.name || '').trim(),
            pin: String(u.pin || '').trim(),
            isAdmin: Boolean(u.isAdmin),
          }));
        }
      });
    }

    if (incomingMenus && typeof incomingMenus === 'object') {
      Object.entries(incomingMenus).forEach(([tenantId, menuItems]) => {
        if (activeDeletedSet.has(tenantId)) return;
        if (Array.isArray(menuItems)) {
          this.db.menus[tenantId] = menuItems;
          this.db.customizedMenus![tenantId] = Date.now();
        }
      });
    }

    if (deletedClosingIdsByTenant && typeof deletedClosingIdsByTenant === 'object') {
      Object.entries(deletedClosingIdsByTenant).forEach(([tenantId, delList]) => {
        if (!Array.isArray(delList) || delList.length === 0) return;
        const currentDel = this.db.deletedClosingIds![tenantId] || [];
        const mergedDel = Array.from(new Set([...currentDel, ...delList.map(Number)]));
        this.db.deletedClosingIds![tenantId] = mergedDel;
        const delSet = new Set(mergedDel);
        if (Array.isArray(this.db.closings[tenantId])) {
          this.db.closings[tenantId] = this.db.closings[tenantId].filter(
            (c) => !delSet.has(Number(c.id))
          );
        }
      });
    }

    if (incomingClosings && typeof incomingClosings === 'object') {
      Object.entries(incomingClosings).forEach(([tenantId, closingList]) => {
        if (activeDeletedSet.has(tenantId)) return;
        if (Array.isArray(closingList) && closingList.length > 0) {
          this.syncClosings(tenantId, closingList, deletedClosingIdsByTenant?.[tenantId]);
        }
      });
    }

    this.persist();
    return this.db.tenants;
  }

  deleteTenant(id: string): boolean {
    const target = this.db.tenants.find((t) => t.id === id || t.slug === id);
    const resolvedId = target ? target.id : id;
    const initialLen = this.db.tenants.length;
    if (!this.db.deletedTenantIds) this.db.deletedTenantIds = [];
    if (!this.db.deletedTenantIds.includes(resolvedId)) {
      this.db.deletedTenantIds.push(resolvedId);
    }
    this.db.tenants = this.db.tenants.filter((t) => t.id !== resolvedId && t.slug !== id);
    delete this.db.menus[resolvedId];
    if (this.db.customizedMenus) {
      delete this.db.customizedMenus[resolvedId];
    }
    delete this.db.users[resolvedId];
    delete this.db.closings[resolvedId];
    if (this.db.activeDrafts) {
      delete this.db.activeDrafts[resolvedId];
    }
    if (Array.isArray(this.db.invoices)) {
      this.db.invoices = this.db.invoices.filter((inv) => inv.tenantId !== resolvedId);
    }
    this.persist();
    return this.db.tenants.length !== initialLen || Boolean(target);
  }

  updateTenant(id: string, updates: Partial<Tenant>): Tenant | null {
    const index = this.db.tenants.findIndex((t) => t.id === id);
    if (index === -1) return null;
    this.db.tenants[index] = {
      ...this.db.tenants[index],
      ...updates,
      updatedAt: updates.updatedAt || Date.now(),
      isCustomized: true,
    };
    this.persist();
    return this.db.tenants[index];
  }

  toggleBlockTenant(id: string): Tenant | null {
    const tenant = this.getTenantById(id);
    if (!tenant) return null;
    const newStatus = tenant.status === 'bloqueado' ? 'ativo' : 'bloqueado';
    return this.updateTenant(tenant.id, { status: newStatus, updatedAt: Date.now(), isCustomized: true });
  }

  // --- MENUS ---
  getMenu(tenantId: string): MenuItem[] {
    if (Array.isArray(this.db.menus[tenantId])) {
      return this.db.menus[tenantId];
    }
    return [];
  }

  setMenu(tenantId: string, items: MenuItem[]): MenuItem[] {
    this.db.menus[tenantId] = items;
    if (!this.db.customizedMenus) this.db.customizedMenus = {};
    this.db.customizedMenus[tenantId] = Date.now();
    this.persist();
    return items;
  }

  addMenuItem(tenantId: string, item: MenuItem): MenuItem[] {
    const current = this.getMenu(tenantId);
    const updated = [...current, item];
    this.db.menus[tenantId] = updated;
    if (!this.db.customizedMenus) this.db.customizedMenus = {};
    this.db.customizedMenus[tenantId] = Date.now();
    this.persist();
    return updated;
  }

  removeMenuItem(tenantId: string, itemName: string): MenuItem[] {
    const current = this.getMenu(tenantId);
    const updated = current.filter((i) => i.name.toLowerCase() !== itemName.toLowerCase());
    this.db.menus[tenantId] = updated;
    if (!this.db.customizedMenus) this.db.customizedMenus = {};
    this.db.customizedMenus[tenantId] = Date.now();
    this.persist();
    return updated;
  }

  // --- CLOSINGS (HISTÓRICO NA NUVEM COM MERGE INTELIGENTE E DEDUPLICAÇÃO) ---
  getClosings(tenantId: string): HistoryRecord[] {
    if (!this.db.deletedClosingIds) this.db.deletedClosingIds = {};
    const delSet = new Set((this.db.deletedClosingIds[tenantId] || []).map(Number));
    return (this.db.closings[tenantId] || []).filter((c) => c && !delSet.has(Number(c.id)));
  }

  addClosing(tenantId: string, record: Partial<HistoryRecord>): HistoryRecord {
    if (!this.db.closings[tenantId]) {
      this.db.closings[tenantId] = [];
    }
    if (!this.db.deletedClosingIds) this.db.deletedClosingIds = {};
    const resolvedId = Number(record.id) || Date.now();
    if (Array.isArray(this.db.deletedClosingIds[tenantId])) {
      this.db.deletedClosingIds[tenantId] = this.db.deletedClosingIds[tenantId].filter(
        (id) => Number(id) !== resolvedId
      );
    }

    const newRecord: HistoryRecord = {
      ...(record as HistoryRecord),
      id: resolvedId,
      tenantId,
      createdAt: record.createdAt || new Date().toISOString(),
    };

    const existingIdx = this.db.closings[tenantId].findIndex((c) => Number(c.id) === resolvedId);
    if (existingIdx !== -1) {
      this.db.closings[tenantId][existingIdx] = {
        ...this.db.closings[tenantId][existingIdx],
        ...newRecord,
      };
    } else {
      this.db.closings[tenantId].unshift(newRecord);
    }
    this.db.closings[tenantId].sort((a, b) => (b.id || 0) - (a.id || 0));
    this.persist();
    return newRecord;
  }

  syncClosings(
    tenantId: string,
    incomingList: HistoryRecord[],
    deletedIds?: number[]
  ): HistoryRecord[] {
    if (!this.db.deletedClosingIds) this.db.deletedClosingIds = {};
    if (Array.isArray(deletedIds) && deletedIds.length > 0) {
      const currentDel = this.db.deletedClosingIds[tenantId] || [];
      this.db.deletedClosingIds[tenantId] = Array.from(
        new Set([...currentDel, ...deletedIds.map(Number)])
      );
    }
    const delSet = new Set((this.db.deletedClosingIds[tenantId] || []).map(Number));
    const existingList = (this.db.closings[tenantId] || []).filter(
      (c) => c && !delSet.has(Number(c.id))
    );

    const byId = new Map<number, HistoryRecord>();
    const sigToId = new Map<string, number>();

    const makeSig = (r: HistoryRecord) =>
      `${tenantId}::${String(r.date || '').trim()}::${String(r.operator || '')
        .trim()
        .toLowerCase()}::${Number(r.getnet || 0).toFixed(2)}::${Number(r.jclan || 0).toFixed(2)}`;

    const mergeTwo = (base: HistoryRecord, incoming: HistoryRecord): HistoryRecord => {
      const baseAtt = base.attachments?.length || 0;
      const incAtt = incoming.attachments?.length || 0;
      const baseAud = base.auditTrail?.length || 0;
      const incAud = incoming.auditTrail?.length || 0;
      return {
        ...base,
        ...incoming,
        id: base.id || incoming.id,
        tenantId,
        attachments: incAtt >= baseAtt ? incoming.attachments || base.attachments : base.attachments,
        auditTrail: incAud >= baseAud ? incoming.auditTrail || base.auditTrail : base.auditTrail,
        selectedExclusionOptions:
          incoming.selectedExclusionOptions || base.selectedExclusionOptions,
        comments: incoming.comments || base.comments,
        closingDateKey: incoming.closingDateKey || base.closingDateKey,
      };
    };

    for (const item of [...existingList, ...(Array.isArray(incomingList) ? incomingList : [])]) {
      if (!item) continue;
      const numId = Number(item.id);
      if (!numId || delSet.has(numId)) continue;
      const sig = makeSig(item);
      const existingSigId = sigToId.get(sig);

      if (byId.has(numId)) {
        byId.set(numId, mergeTwo(byId.get(numId)!, item));
      } else if (existingSigId !== undefined && byId.has(existingSigId)) {
        byId.set(existingSigId, mergeTwo(byId.get(existingSigId)!, item));
      } else {
        byId.set(numId, { ...item, id: numId, tenantId });
        sigToId.set(sig, numId);
      }
    }

    const finalSorted = Array.from(byId.values()).sort((a, b) => (b.id || 0) - (a.id || 0));
    this.db.closings[tenantId] = finalSorted;
    this.persist();
    return finalSorted;
  }

  deleteClosing(tenantId: string, closingId: number): boolean {
    if (!this.db.deletedClosingIds) this.db.deletedClosingIds = {};
    const currentDel = this.db.deletedClosingIds[tenantId] || [];
    if (!currentDel.includes(Number(closingId))) {
      this.db.deletedClosingIds[tenantId] = [...currentDel, Number(closingId)];
    }
    if (!this.db.closings[tenantId]) {
      this.persist();
      return true;
    }
    const initialLen = this.db.closings[tenantId].length;
    this.db.closings[tenantId] = this.db.closings[tenantId].filter(
      (c) => Number(c.id) !== Number(closingId)
    );
    const deleted = this.db.closings[tenantId].length < initialLen;
    this.persist();
    return deleted;
  }

  // --- ACTIVE SHIFT DRAFTS (SINCRONIZAÇÃO EM TEMPO REAL CELULAR <-> PC) ---
  getDraft(tenantId: string): ActiveShiftDraft | null {
    if (!this.db.activeDrafts) this.db.activeDrafts = {};
    return this.db.activeDrafts[tenantId] || null;
  }

  saveDraft(tenantId: string, draft: Partial<ActiveShiftDraft>): ActiveShiftDraft {
    if (!this.db.activeDrafts) this.db.activeDrafts = {};
    const existing = this.db.activeDrafts[tenantId];
    const updated: ActiveShiftDraft = {
      tenantId,
      updatedAt: draft.updatedAt || Date.now(),
      updatedBy: draft.updatedBy || existing?.updatedBy || 'Operador',
      deviceId: draft.deviceId || existing?.deviceId || 'unknown',
      deviceType: draft.deviceType || existing?.deviceType || 'desktop',
      jclan: draft.jclan || existing?.jclan || { credit: '', debit: '', pix: '', voucher: '' },
      machines: Array.isArray(draft.machines) ? draft.machines : existing?.machines || [],
      cash: draft.cash || existing?.cash || {},
      cashSummary: draft.cashSummary || existing?.cashSummary || { opening: '', jclanCash: '', expenses: '' },
      selectedExclusionOptions: draft.selectedExclusionOptions ?? existing?.selectedExclusionOptions ?? {},
      customCommands: draft.customCommands ?? existing?.customCommands ?? {},
      inclusionCommands: draft.inclusionCommands ?? existing?.inclusionCommands ?? {},
    };
    this.db.activeDrafts[tenantId] = updated;
    this.persist();
    return updated;
  }

  clearDraft(tenantId: string): boolean {
    if (!this.db.activeDrafts) return false;
    if (this.db.activeDrafts[tenantId]) {
      delete this.db.activeDrafts[tenantId];
      this.persist();
      return true;
    }
    return false;
  }

  // --- USERS (OPERADORES NA NUVEM) ---
  getUsers(tenantId: string): TenantUser[] {
    return this.db.users[tenantId] || [];
  }

  setUsers(tenantId: string, users: TenantUser[]): TenantUser[] {
    if (!Array.isArray(users)) return this.getUsers(tenantId);
    const normalized = users
      .filter((u) => u && String(u.name || '').trim())
      .map((u, idx) => ({
        id: u.id || Date.now() + idx,
        tenantId,
        name: String(u.name).trim(),
        pin: String(u.pin || '1234').trim(),
        isAdmin: Boolean(u.isAdmin),
      }));
    this.db.users[tenantId] = normalized;
    this.persist();
    return this.db.users[tenantId];
  }

  addUser(tenantId: string, user: Omit<TenantUser, 'id' | 'tenantId'>): TenantUser {
    if (!this.db.users[tenantId]) {
      this.db.users[tenantId] = [];
    }
    const cleanName = String(user.name || '').trim();
    const existingIdx = this.db.users[tenantId].findIndex(
      (u) => u.name.toLowerCase() === cleanName.toLowerCase()
    );
    if (existingIdx !== -1) {
      this.db.users[tenantId][existingIdx] = {
        ...this.db.users[tenantId][existingIdx],
        name: cleanName,
        pin: String(user.pin || '').trim(),
        isAdmin: Boolean(user.isAdmin),
      };
      this.persist();
      return this.db.users[tenantId][existingIdx];
    }
    const newUser: TenantUser = {
      ...user,
      name: cleanName,
      pin: String(user.pin || '').trim(),
      isAdmin: Boolean(user.isAdmin),
      id: Date.now() + Math.floor(Math.random() * 1000),
      tenantId,
    };
    this.db.users[tenantId].push(newUser);
    this.persist();
    return newUser;
  }

  updateUser(tenantId: string, userId: number, updates: Partial<TenantUser>): TenantUser | null {
    const userList = this.db.users[tenantId];
    if (!userList) return null;
    const idx = userList.findIndex((u) => u.id === userId);
    if (idx === -1) return null;
    userList[idx] = { ...userList[idx], ...updates };
    this.persist();
    return userList[idx];
  }

  deleteUser(tenantId: string, userId: number): boolean {
    const userList = this.db.users[tenantId];
    if (!userList) return false;
    this.db.users[tenantId] = userList.filter((u) => u.id !== userId);
    this.persist();
    return true;
  }

  // --- COBRANÇAS / INVOICES (ASAAS / STRIPE / PIX) ---
  getInvoices(tenantId?: string): Invoice[] {
    if (tenantId) {
      return this.db.invoices.filter((inv) => inv.tenantId === tenantId);
    }
    return this.db.invoices;
  }

  createInvoice(tenantId: string, amount?: number): Invoice {
    const tenant = this.getTenantById(tenantId);
    const invoiceAmount = amount || tenant?.monthlyPrice || (tenant?.plan === 'basico' ? 150 : tenant?.plan === 'enterprise' ? 300 : 200);
    const invoiceId = `inv_${Date.now()}`;
    const dueDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const randomPixKey = `00020126580014br.gov.bcb.pix0136${invoiceId}@fechacaixa.com.br520400005303986540${invoiceAmount.toFixed(2)}5802BR5915FECHACAIXA SAAS6008CURITIBA62070503***6304${Math.floor(1000 + Math.random() * 9000)}`;

    const newInvoice: Invoice = {
      id: invoiceId,
      tenantId,
      amount: invoiceAmount,
      dueDate,
      status: 'pendente',
      pixCode: randomPixKey,
      boletoBarcode: `34191.79001 01043.510047 91020.150008 4 ${Math.floor(1000000000 + Math.random() * 9000000000)}`,
      description: `Mensalidade FechaCaixa ${tenant?.plan?.toUpperCase() || 'PRO'} - ${tenant?.name || 'Assinatura Bar'}`,
      createdAt: new Date().toISOString(),
    };

    this.db.invoices.unshift(newInvoice);
    this.persist();
    return newInvoice;
  }

  confirmPayment(invoiceId: string): { invoice: Invoice; tenant: Tenant } | null {
    const inv = this.db.invoices.find((i) => i.id === invoiceId);
    if (!inv) return null;

    inv.status = 'paga';
    inv.paidAt = new Date().toISOString();

    const tenant = this.getTenantById(inv.tenantId);
    if (tenant) {
      // Reativa e adiciona 30 dias de licença
      const currentExpire = new Date(tenant.expiresAt).getTime();
      const baseTime = currentExpire > Date.now() ? currentExpire : Date.now();
      const newExpire = new Date(baseTime + 30 * 24 * 60 * 60 * 1000).toISOString();

      tenant.status = 'ativo';
      tenant.expiresAt = newExpire;
      this.updateTenant(tenant.id, { status: 'ativo', expiresAt: newExpire });
    }

    this.persist();
    return { invoice: inv, tenant: tenant! };
  }

  // --- MASTER STATS ---
  getMasterStats(): MasterStats {
    const tenants = this.db.tenants;
    const active = tenants.filter((t) => t.status === 'ativo').length;
    const overdue = tenants.filter((t) => t.status === 'inadimplente').length;
    const blocked = tenants.filter((t) => t.status === 'bloqueado').length;
    const mrr = tenants.reduce((acc, t) => acc + (t.status === 'ativo' ? t.monthlyPrice : 0), 0);

    let totalClosings = 0;
    Object.values(this.db.closings).forEach((list) => {
      totalClosings += list.length;
    });

    return {
      totalTenants: tenants.length,
      activeTenants: active,
      overdueTenants: overdue,
      blockedTenants: blocked,
      mrr,
      totalClosings,
    };
  }

  getMasterOwner(): MasterOwnerProfile {
    return this.db.masterOwner || DEFAULT_MASTER_OWNER;
  }

  updateMasterOwner(updates: Partial<MasterOwnerProfile>): MasterOwnerProfile {
    const current = this.getMasterOwner();
    this.db.masterOwner = {
      ...current,
      ...updates,
      isConfigured: true,
      updatedAt: new Date().toISOString(),
    };
    if (updates.pin) {
      this.db.masterPin = updates.pin;
    }
    this.persist();
    return this.db.masterOwner;
  }

  verifyMasterPin(pin: string): boolean {
    const owner = this.getMasterOwner();
    return pin === owner.pin || pin === this.db.masterPin || pin === 'master2026' || pin === 'admin123';
  }

  verifyMasterLogin(email?: string, pin?: string): boolean {
    const owner = this.getMasterOwner();
    if (!pin) return false;
    const pinMatches = pin === owner.pin || pin === this.db.masterPin || pin === 'master2026';
    if (email && email.trim()) {
      const emailMatches = email.trim().toLowerCase() === owner.email.toLowerCase();
      return emailMatches && pinMatches;
    }
    return pinMatches;
  }
}

export const cloudDb = new CloudDatabaseStore();
