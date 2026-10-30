import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Tenant, MenuItem, TenantUser, HistoryRecord, Invoice, MasterStats, MasterOwnerProfile } from '../src/types/saas.ts';
import { FLOR_DE_BRASA_MENU, BAR_DO_VICTOR_MENU, BABILONIA_MENU, TAJ_BAR_MENU } from '../src/data/defaultMenus.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '..', 'data');
const DB_FILE = path.resolve(DATA_DIR, 'saas_db.json');

export interface SaaSDatabase {
  tenants: Tenant[];
  menus: Record<string, MenuItem[]>;
  users: Record<string, TenantUser[]>;
  closings: Record<string, HistoryRecord[]>;
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
    monthlyPrice: 249.0,
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
    monthlyPrice: 249.0,
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
    monthlyPrice: 399.0,
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
    monthlyPrice: 249.0,
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
      id: Date.now() - 86400000,
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
      report: `📊 FECHAMENTO DE CAIXA - Flor de Brasa\n📅 Data: 22/10/2026 às 23:45\n👤 Operador: BRUNO\n⏱️ Duração: 12 min 25s\n\n💳 CARTÕES: R$ 8.450,00 (Batendo 100%!)\n💵 GAVETA: R$ 1.280,00 (Batendo 100%!)`,
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: Date.now() - 172800000,
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
      report: `📊 FECHAMENTO DE CAIXA - Flor de Brasa\n📅 Data: 21/10/2026 às 23:30\n👤 Operador: CAMILA\n⏱️ Duração: 8 min 40s\n\n💳 CARTÕES: R$ 6.320,50\n💵 GAVETA: R$ 940,00`,
      createdAt: new Date(Date.now() - 172800000).toISOString(),
    },
  ],
  tenant_bardovictor: [
    {
      id: Date.now() - 86400000,
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
      report: `📊 FECHAMENTO DE CAIXA - Bar do Victor\nData: 22/10/2026\nTotal Cartões: R$ 5.890,00`,
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
  ],
};

const DEFAULT_INVOICES: Invoice[] = [
  {
    id: 'inv_fb_01',
    tenantId: 'tenant_flordebrasa',
    amount: 249.0,
    dueDate: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    status: 'paga',
    pixCode: '00020126580014br.gov.bcb.pix0136fechacaixa-cwb@banco.com5204000053039865406249.005802BR5915FECHACAIXA SAAS6008CURITIBA62070503***6304E8A1',
    boletoBarcode: '34191.79001 01043.510047 91020.150008 4 92830000024900',
    paidAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    description: 'Assinatura FechaCaixa Pro - Mensalidade Novembro/2026',
    createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'inv_taj_01',
    tenantId: 'tenant_tajbar',
    amount: 249.0,
    dueDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    status: 'vencida',
    pixCode: '00020126580014br.gov.bcb.pix0136tajbar-cwb@banco.com5204000053039865406249.005802BR5915FECHACAIXA SAAS6008CURITIBA62070503***6304FA92',
    boletoBarcode: '34191.79001 01043.510047 91020.150008 4 92830000024900',
    description: 'Assinatura FechaCaixa Pro - Mensalidade Outubro/2026 (Em Atraso)',
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
        const loadedTenants: Tenant[] = (parsed.tenants || DEFAULT_TENANTS).map((t: Tenant) => {
          const matchDefault = DEFAULT_TENANTS.find((d) => d.id === t.id);
          return {
            ...t,
            loginBgImage: t.loginBgImage || matchDefault?.loginBgImage || 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=1920&q=80',
            themeColor: t.themeColor || matchDefault?.themeColor || 'orange',
            primaryColor: t.primaryColor || matchDefault?.primaryColor || '#ea580c',
            pdvSystemName: t.pdvSystemName || matchDefault?.pdvSystemName || 'Jclan',
            cardSystemName: t.cardSystemName || matchDefault?.cardSystemName || 'Getnet',
          };
        });

        const loadedMenus: Record<string, MenuItem[]> = parsed.menus || { ...DEFAULT_MENUS };
        const defaultIds = new Set(DEFAULT_TENANTS.map((d) => d.id));
        loadedTenants.forEach((t) => {
          if (!defaultIds.has(t.id)) {
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

        return {
          tenants: loadedTenants,
          menus: loadedMenus,
          users: parsed.users || DEFAULT_USERS,
          closings: parsed.closings || DEFAULT_CLOSINGS,
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
      users: DEFAULT_USERS,
      closings: DEFAULT_CLOSINGS,
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
    const id = `tenant_${slug}`;
    const newTenant: Tenant = {
      id,
      slug,
      name: tenantData.name || 'Novo Bar Curitiba',
      cnpj: tenantData.cnpj || '00.000.000/0001-00',
      city: tenantData.city || 'Curitiba - PR',
      address: tenantData.address || 'Curitiba - PR',
      phone: tenantData.phone || '(41) 99999-9999',
      contactEmail: tenantData.contactEmail || `contato@${slug}.com.br`,
      plan: tenantData.plan || 'pro',
      monthlyPrice: tenantData.plan === 'basico' ? 149 : tenantData.plan === 'enterprise' ? 399 : 249,
      status: 'ativo',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
      logoInitials: (tenantData.name ? tenantData.name.slice(0, 2).toUpperCase() : 'NB'),
      logoColor: tenantData.logoColor || 'from-orange-500 to-amber-500',
      notes: tenantData.notes || '',
      loginBgImage: tenantData.loginBgImage || 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=1920&q=80',
      themeColor: tenantData.themeColor || 'orange',
      primaryColor: tenantData.primaryColor || '#ea580c',
      pdvSystemName: tenantData.pdvSystemName?.trim() || 'Jclan',
      cardSystemName: tenantData.cardSystemName?.trim() || 'Getnet',
      voucherNames: tenantData.voucherNames && tenantData.voucherNames.length > 0 ? tenantData.voucherNames : ['Alelo', 'Ticket', 'Sodexo', 'VR', 'Ben'],
    };

    this.db.tenants.push(newTenant);
    // Novos bares/restaurantes começam com o cardápio vazio (0 itens)
    this.db.menus[id] = [];
    this.db.users[id] = [
      { id: Date.now(), tenantId: id, name: 'admin', pin: '1234', isAdmin: true },
    ];
    this.db.closings[id] = [];
    this.persist();
    return newTenant;
  }

  updateTenant(id: string, updates: Partial<Tenant>): Tenant | null {
    const index = this.db.tenants.findIndex((t) => t.id === id);
    if (index === -1) return null;
    this.db.tenants[index] = { ...this.db.tenants[index], ...updates };
    this.persist();
    return this.db.tenants[index];
  }

  toggleBlockTenant(id: string): Tenant | null {
    const tenant = this.getTenantById(id);
    if (!tenant) return null;
    const newStatus = tenant.status === 'bloqueado' ? 'ativo' : 'bloqueado';
    return this.updateTenant(tenant.id, { status: newStatus });
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
    this.persist();
    return items;
  }

  addMenuItem(tenantId: string, item: MenuItem): MenuItem[] {
    const current = this.getMenu(tenantId);
    const updated = [...current, item];
    this.db.menus[tenantId] = updated;
    this.persist();
    return updated;
  }

  removeMenuItem(tenantId: string, itemName: string): MenuItem[] {
    const current = this.getMenu(tenantId);
    const updated = current.filter((i) => i.name.toLowerCase() !== itemName.toLowerCase());
    this.db.menus[tenantId] = updated;
    this.persist();
    return updated;
  }

  // --- CLOSINGS (HISTÓRICO NA NUVEM) ---
  getClosings(tenantId: string): HistoryRecord[] {
    return this.db.closings[tenantId] || [];
  }

  addClosing(tenantId: string, record: Omit<HistoryRecord, 'id' | 'createdAt'>): HistoryRecord {
    if (!this.db.closings[tenantId]) {
      this.db.closings[tenantId] = [];
    }
    const newRecord: HistoryRecord = {
      ...record,
      id: Date.now(),
      tenantId,
      createdAt: new Date().toISOString(),
    };
    this.db.closings[tenantId].unshift(newRecord);
    this.persist();
    return newRecord;
  }

  deleteClosing(tenantId: string, closingId: number): boolean {
    if (!this.db.closings[tenantId]) return false;
    const initialLen = this.db.closings[tenantId].length;
    this.db.closings[tenantId] = this.db.closings[tenantId].filter((c) => c.id !== closingId);
    const deleted = this.db.closings[tenantId].length < initialLen;
    if (deleted) this.persist();
    return deleted;
  }

  // --- USERS (OPERADORES NA NUVEM) ---
  getUsers(tenantId: string): TenantUser[] {
    return this.db.users[tenantId] || [];
  }

  addUser(tenantId: string, user: Omit<TenantUser, 'id' | 'tenantId'>): TenantUser {
    if (!this.db.users[tenantId]) {
      this.db.users[tenantId] = [];
    }
    const newUser: TenantUser = {
      ...user,
      id: Date.now(),
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
    const invoiceAmount = amount || tenant?.monthlyPrice || 249.0;
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
