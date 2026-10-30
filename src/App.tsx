import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Upload,
  Eraser,
  AlertCircle,
  RefreshCw,
  Check,
  Plus,
  Trash2,
  User as UserIcon,
  Lock,
  Grid,
  Columns3,
  X,
  Settings,
  ShieldCheck,
  Edit3,
  Copy,
  ChevronDown,
  ChevronUp,
  Sparkles,
  FileText,
  DollarSign,
  CreditCard,
  Receipt,
  LogOut,
  ArrowRight,
  TrendingUp,
  Calculator,
  Utensils,
  Camera,
  Palette,
  Eye,
  CheckCircle2,
  History as HistoryIcon,
  ClipboardList,
  BookOpen,
  HelpCircle,
  Timer
} from 'lucide-react';

// --- SAAS MULTI-TENANT & CLOUD IMPORTS ---
import { Tenant, MenuItem, CommandItem, TenantUser, HistoryRecord, Invoice, MasterStats, AuditLogEntry, isHappyHourOrPromoItem } from './types/saas.ts';
import { FLOR_DE_BRASA_MENU } from './data/defaultMenus.ts';
import { saasApi } from './services/saasApi.ts';
import { StoreSwitcher } from './components/saas/StoreSwitcher.tsx';
import { MasterPanelModal } from './components/saas/MasterPanelModal.tsx';
import { SuspendedBarBanner } from './components/saas/SuspendedBarBanner.tsx';
import { BarBillingModal } from './components/saas/BarBillingModal.tsx';
import { MenuManagerModal } from './components/saas/MenuManagerModal.tsx';
import { BarAdminModal } from './components/saas/BarAdminModal.tsx';
import { SaveClosingModal } from './components/closing/SaveClosingModal.tsx';
import { FinalPdvSummaryModal } from './components/closing/FinalPdvSummaryModal.tsx';
import { ImageZoomModal } from './components/common/ImageZoomModal.tsx';
import { AuditTrailDrawer } from './components/common/AuditTrailDrawer.tsx';
import { InteractiveClosingGuide } from './components/common/InteractiveClosingGuide.tsx';
import { getTheme } from './utils/theme.ts';
import { FechaCaixaLogo } from './components/brand/FechaCaixaLogo.tsx';

// --- TIPAGEM ---
type User = TenantUser;

interface Machine {
  id: number;
  collapsed: boolean;
  credits: string[];
  debits: string[];
  vouchers: string[];
  pix: string;
}

// --- FUNÇÕES UTILITÁRIAS ---
export const parseValue = (val: string | number | undefined | null): number => {
  if (!val) return 0;
  return parseFloat(val.toString().replace(/\./g, '').replace(',', '.')) || 0;
};

export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
};

export const sumArray = (arr: string[] = []): number => arr.reduce((acc, curr) => acc + parseValue(curr), 0);

// --- COMPONENTE CARD DE COMPARAÇÃO ---
interface ComparisonCardProps {
  title: string;
  getnetVal: number;
  jclanVal: string;
  field: 'credit' | 'debit' | 'pix' | 'voucher';
  iconColor: string;
  onJclanChange: (field: 'credit' | 'debit' | 'pix' | 'voucher', val: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>, field: string) => void;
  onBlur?: () => void;
  cardName?: string;
  pdvName?: string;
}

const ComparisonCard: React.FC<ComparisonCardProps> = ({
  title,
  getnetVal,
  jclanVal,
  field,
  iconColor,
  onJclanChange,
  onKeyDown,
  onBlur,
  cardName = 'Getnet',
  pdvName = 'Jclan',
}) => {
  const diff = getnetVal - parseValue(jclanVal);
  let colorClass = 'text-slate-500 bg-slate-100 border-slate-200';
  if (diff > 0.009) colorClass = 'text-emerald-700 bg-emerald-50 border-emerald-200';
  if (diff < -0.009) colorClass = 'text-rose-700 bg-rose-50 border-rose-200';

  return (
    <div className="flex flex-col bg-white p-3 rounded-xl border border-slate-200 shadow-sm transition-all hover:border-slate-300">
      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
        <span className={`w-2.5 h-2.5 rounded-full ${iconColor}`}></span>
        {title}
      </span>
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-xs font-semibold text-slate-400">{cardName}:</span>
        <span className="text-sm font-bold text-slate-800">{formatCurrency(getnetVal)}</span>
      </div>
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs font-semibold text-slate-400">{pdvName}:</span>
        <div className="relative w-28">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold">R$</span>
          <input
            id={`jclan-${field}`}
            type="text"
            placeholder="0,00"
            value={jclanVal}
            onChange={(e) => onJclanChange(field, e.target.value)}
            onKeyDown={(e) => onKeyDown && onKeyDown(e, field)}
            onBlur={onBlur}
            className="w-full bg-slate-50 border border-slate-300 rounded p-1 pl-7 text-right text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
          />
        </div>
      </div>
      <div className={`text-center text-xs font-bold mt-auto pt-2 border-t rounded-b-lg -mx-3 -mb-3 pb-2 transition-colors ${colorClass}`}>
        Dif: {formatCurrency(diff)}
      </div>
    </div>
  );
};

export default function App() {
  const defaultTenants: Tenant[] = [
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
      status: 'bloqueado',
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

  const defaultUsers: User[] = [
    { id: 1, tenantId: 'tenant_flordebrasa', name: 'bruno', pin: '1917', isAdmin: true },
    { id: 2, tenantId: 'tenant_flordebrasa', name: 'camila', pin: '1234', isAdmin: false },
    { id: 3, tenantId: 'tenant_flordebrasa', name: 'barbara', pin: '1234', isAdmin: false },
    { id: 4, tenantId: 'tenant_flordebrasa', name: 'vini', pin: '1234', isAdmin: false },
    { id: 5, tenantId: 'tenant_flordebrasa', name: 'fernando', pin: 'lixo', isAdmin: false },
  ];

  // --- MULTI-TENANT & SAAS CLOUD STATES ---
  const [tenants, setTenants] = useState<Tenant[]>(defaultTenants);
  const [currentTenant, setCurrentTenant] = useState<Tenant>(defaultTenants[0]);
  const [currentMenu, setCurrentMenu] = useState<MenuItem[]>([]);
  const [menuModalItems, setMenuModalItems] = useState<MenuItem[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [masterStats, setMasterStats] = useState<MasterStats | null>(null);
  const [cloudSyncStatus, setCloudSyncStatus] = useState<'synced' | 'syncing' | 'offline'>('synced');

  // A primeira página do sistema deve ser 'Painel Master SaaS' ('master')
  // Somente quando a URL possui ?bar=... (ou ?loja= ou ?tenant=), o sistema abre diretamente o bar específico ('bar').
  const [appMode, setAppMode] = useState<'master' | 'bar'>(() => {
    const p = new URLSearchParams(window.location.search);
    const hasBar = p.get('bar') || p.get('loja') || p.get('tenant');
    return hasBar ? 'bar' : 'master';
  });

  // Modais SaaS (Fase 3 & Fase 4)
  const [isMasterOpen, setIsMasterOpen] = useState(false);
  const [isMasterSession, setIsMasterSession] = useState(false);
  const [isBillingOpen, setIsBillingOpen] = useState(false);
  const [isMenuManagerOpen, setIsMenuManagerOpen] = useState(false);
  const [tenantForMenuModal, setTenantForMenuModal] = useState<Tenant | null>(null);

  // Autenticação & Usuários
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginForm, setLoginForm] = useState({ name: '', pin: '' });
  const [currentOperator, setCurrentOperator] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>(defaultUsers);

  // Painel Admin & Configurações
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isSaveClosingModalOpen, setIsSaveClosingModalOpen] = useState(false);
  const [isPdvSummaryOpen, setIsPdvSummaryOpen] = useState(false);
  const [zoomImageUrl, setZoomImageUrl] = useState<string | null>(null);
  const [loginAdminPrompt, setLoginAdminPrompt] = useState(false);
  const [loginAdminPin, setLoginAdminPin] = useState('');
  const [newUserForm, setNewUserForm] = useState({ name: '', pin: '', isAdmin: false });
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [editUserForm, setEditUserForm] = useState({ name: '', pin: '', isAdmin: false });
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('geminiApiKey') || '');
  const [isCompactView, setIsCompactView] = useState(false);

  // Estados do Caixa
  const createEmptyMachine = (id: number): Machine => ({
    id,
    collapsed: false,
    credits: ['', '', '', '', ''],
    debits: ['', '', '', '', ''],
    vouchers: ['', '', '', '', ''],
    pix: '',
  });

  const initialMachines = Array.from({ length: 9 }, (_, i) => createEmptyMachine(i + 1));
  const [jclan, setJclan] = useState({ credit: '', debit: '', pix: '', voucher: '' });
  const [machines, setMachines] = useState<Machine[]>(initialMachines);

  const [cash, setCash] = useState<Record<string, string>>({
    b200: '',
    b100: '',
    b50: '',
    b20: '',
    b10: '',
    b5: '',
    b2: '',
    c1: '',
    c050: '',
    c025: '',
    c010: '',
    c005: '',
  });
  const [cashSummary, setCashSummary] = useState({ opening: '', jclanCash: '', expenses: '' });
  const [history, setHistory] = useState<HistoryRecord[]>([]);

  // Calculadoras Interativas
  const [customCommands, setCustomCommands] = useState<Record<string, CommandItem[]>>({});
  const [inclusionCommands, setInclusionCommands] = useState<Record<string, CommandItem[]>>({});

  // Inputs temporários para as calculadoras
  const [incItemInputs, setIncItemInputs] = useState<Record<string, string>>({});
  const [incQtyInputs, setIncQtyInputs] = useState<Record<string, string>>({});
  const [cmdItemInputs, setCmdItemInputs] = useState<Record<string, string>>({});
  const [cmdQtyInputs, setCmdQtyInputs] = useState<Record<string, string>>({});

  // Opções de zeramento marcadas pelo operador para o fechamento final
  const [selectedExclusionOptions, setSelectedExclusionOptions] = useState<
    Record<string, { title: string; instruction: string; diff: number; optionIndex: number; optionKey: string }>
  >({});

  // Registro de Auditoria contínua de tudo que o operador preenche
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(() => {
    try {
      const saved = localStorage.getItem('fechacaixa_audit_logs');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isAuditDrawerOpen, setIsAuditDrawerOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  // Métrica de Tempo de Fechamento do Caixa (Tempo decorrido no turno)
  const [shiftStartTime, setShiftStartTime] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('fechacaixa_shift_start_time');
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed > 0) return parsed;
      }
    } catch {
      // ignore
    }
    const now = Date.now();
    try {
      localStorage.setItem('fechacaixa_shift_start_time', now.toString());
    } catch {
      // ignore
    }
    return now;
  });

  const [liveShiftMinutes, setLiveShiftMinutes] = useState<number>(() => {
    return Math.max(0, Math.floor((Date.now() - shiftStartTime) / 60000));
  });

  useEffect(() => {
    const updateElapsed = () => {
      setLiveShiftMinutes(Math.max(0, Math.floor((Date.now() - shiftStartTime) / 60000)));
    };
    updateElapsed();
    const interval = setInterval(updateElapsed, 30000);
    return () => clearInterval(interval);
  }, [shiftStartTime]);

  useEffect(() => {
    try {
      localStorage.setItem('fechacaixa_audit_logs', JSON.stringify(auditLogs.slice(0, 150)));
    } catch {
      // ignore
    }
  }, [auditLogs]);

  const addAuditLog = (
    category: AuditLogEntry['category'],
    action: string,
    details: string
  ) => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('pt-BR');
    const entry: AuditLogEntry = {
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: timeStr,
      operator: currentOperator?.name || 'Operador',
      category,
      action,
      details,
    };
    setAuditLogs((prev) => [entry, ...prev.slice(0, 149)]);
  };

  const handleToggleSelectExclusionOption = (
    label: string,
    option: { title: string; instruction: string; diff: number },
    optionIndex: number,
    optionKey?: string
  ) => {
    const resolvedKey = optionKey || `${optionIndex}::${option.title}::${option.instruction}`;
    setSelectedExclusionOptions((prev) => {
      const existing = prev[label];
      const isAlreadySelected = existing
        ? existing.optionKey
          ? existing.optionKey === resolvedKey
          : existing.optionIndex === optionIndex &&
            existing.title === option.title &&
            existing.instruction === option.instruction
        : false;

      if (isAlreadySelected) {
        const copy = { ...prev };
        delete copy[label];
        addAuditLog(
          'zeramento',
          `Desmarcou opção de zeramento (${label})`,
          `Opção "${option.title}" desmarcada pelo operador.`
        );
        showToast(`Opção de zeramento para ${label} desmarcada.`);
        return copy;
      } else {
        addAuditLog(
          'zeramento',
          `Marcou opção para fechamento final (${label})`,
          `${option.title} -> ${option.instruction}`
        );
        showToast(`✓ ${option.title} marcada para o fechamento final!`);
        const next = {
          ...prev,
          [label]: { ...option, optionIndex, optionKey: resolvedKey },
        };

        // Verifica se este foi o último zeramento marcado para as divergências do turno
        try {
          const rec = generateRecommendations();
          if (rec.unresolvable && rec.unresolvable.length > 0) {
            const allMarked = rec.unresolvable.every((u) => next[u.label]);
            if (allMarked) {
              setTimeout(() => {
                setIsPdvSummaryOpen(true);
                showToast(
                  `🎯 Último zeramento concluído! Confira o que lançar no ${currentTenant.pdvSystemName || 'Jclan'}.`
                );
              }, 400);
            }
          }
        } catch {
          // ignore
        }

        return next;
      }
    });
  };

  // Feedback visual
  const [toastMsg, setToastMsg] = useState('');
  const [loadingMachineId, setLoadingMachineId] = useState<number | null>(null);
  const [isGlobalLoading, setIsGlobalLoading] = useState(false);
  const [reportModal, setReportModal] = useState<string | null>(null);
  const [adminTab, setAdminTab] = useState<'users' | 'history'>('users');

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 5000);
  };

  // --- SINCRONIZAÇÃO INICIAL SAAS COM O SERVIDOR (NUVEM) ---
  useEffect(() => {
    // Parâmetros de URL para links exclusivos de bar (?bar=flordebrasa) e master (?master=true)
    const urlParams = new URLSearchParams(window.location.search);
    const barParam = urlParams.get('bar') || urlParams.get('loja') || urlParams.get('tenant');
    const masterParam = urlParams.get('master') || urlParams.get('admin');

    if (barParam) {
      setAppMode('bar');
    } else {
      setAppMode('master');
    }

    if (masterParam === '1' || masterParam === 'true' || masterParam === 'master') {
      setAppMode('master');
      setIsMasterOpen(true);
    }

    saasApi.getTenants().then((loaded) => {
      if (loaded && loaded.length > 0) {
        setTenants(loaded);
        if (barParam) {
          const matchParam = loaded.find(
            (t) => t.slug.toLowerCase() === barParam.toLowerCase() || t.id.toLowerCase() === barParam.toLowerCase()
          );
          if (matchParam) {
            setCurrentTenant(matchParam);
            return;
          }
        }
        const savedTenantId =
          localStorage.getItem('fechacaixa_tenant_id') ||
          localStorage.getItem('caixacerto_tenant_id');
        const match = loaded.find((t) => t.id === savedTenantId) || loaded[0];
        setCurrentTenant(match);
      }
    });
    saasApi.getMasterStats().then((st) => setMasterStats(st));
  }, []);

  // --- CARREGAMENTO REATIVO POR BAR SELECIONADO (ISOLAMENTO MULTI-TENANT) ---
  useEffect(() => {
    if (!currentTenant) return;
    localStorage.setItem('fechacaixa_tenant_id', currentTenant.id);

    // 1. Carrega Cardápio do Bar (respeitando cardápio vazio [] para novos bares)
    saasApi.getMenu(currentTenant.id).then((m) => {
      if (Array.isArray(m)) setCurrentMenu(m);
      else setCurrentMenu([]);
    });

    // 2. Carrega Usuários daquele Bar
    saasApi.getUsers(currentTenant.id).then((u) => {
      if (u && u.length > 0) setUsers(u);
    });

    // 3. Carrega Histórico de Fechamento na Nuvem para este Bar (WHERE loja = tenantId)
    setCloudSyncStatus('syncing');
    saasApi.getClosings(currentTenant.id).then((c) => {
      if (c) {
        setHistory(c);
        setCloudSyncStatus('synced');
      }
    }).catch(() => setCloudSyncStatus('offline'));

    // 4. Carrega Faturas deste Bar (Asaas)
    saasApi.getInvoices(currentTenant.id).then((invs) => {
      if (invs) setInvoices(invs);
    });
  }, [currentTenant?.id]);

  // Carrega o cardápio específico do bar selecionado no Modal de Cardápio do Painel Master
  useEffect(() => {
    if (!tenantForMenuModal) return;
    if (tenantForMenuModal.id === currentTenant?.id) {
      setMenuModalItems(currentMenu);
    }
    saasApi.getMenu(tenantForMenuModal.id).then((m) => {
      if (Array.isArray(m)) {
        setMenuModalItems(m);
        if (tenantForMenuModal.id === currentTenant?.id) {
          setCurrentMenu(m);
        }
      } else {
        setMenuModalItems([]);
      }
    });
  }, [tenantForMenuModal?.id]);

  // Login & Gerenciamento de Usuários
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const nameTrimmed = loginForm.name.trim();
    if (!nameTrimmed) {
      showToast('Digite o nome do operador.');
      return;
    }
    const foundUser = users.find(
      (u) => u.name.toLowerCase() === nameTrimmed.toLowerCase() && u.pin === loginForm.pin
    );

    if (foundUser) {
      setCurrentOperator(foundUser);
      setIsAuthenticated(true);
      setLoginForm({ name: '', pin: '' });
      const now = Date.now();
      setShiftStartTime(now);
      try {
        localStorage.setItem('fechacaixa_shift_start_time', now.toString());
      } catch {}
      showToast(`Bem-vindo(a), ${foundUser.name}!`);
      addAuditLog('sistema', 'Login de Operador', `Operador ${foundUser.name} iniciou a sessão de caixa às ${new Date(now).toLocaleTimeString('pt-BR').slice(0, 5)}`);
    } else {
      showToast('Usuário ou PIN incorretos.');
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserForm.name.trim() || !newUserForm.pin.trim()) {
      showToast('Preencha nome e PIN.');
      return;
    }
    if (users.some((u) => u.name.toLowerCase() === newUserForm.name.toLowerCase().trim())) {
      showToast('Este operador já está cadastrado neste bar.');
      return;
    }
    try {
      const added = await saasApi.addUser(currentTenant.id, {
        name: newUserForm.name.trim(),
        pin: newUserForm.pin.trim(),
        isAdmin: newUserForm.isAdmin,
      });
      setUsers([...users, added]);
      setNewUserForm({ name: '', pin: '', isAdmin: false });
      showToast('Operador cadastrado na nuvem com sucesso!');
    } catch {
      const localUser: User = {
        id: Date.now(),
        tenantId: currentTenant.id,
        name: newUserForm.name.trim(),
        pin: newUserForm.pin.trim(),
        isAdmin: newUserForm.isAdmin,
      };
      setUsers([...users, localUser]);
      setNewUserForm({ name: '', pin: '', isAdmin: false });
      showToast('Operador salvo localmente.');
    }
  };

  const handleRemoveUser = async (id: number) => {
    if (id === currentOperator?.id) {
      showToast('Você não pode excluir a si mesmo.');
      return;
    }
    try {
      await saasApi.deleteUser(currentTenant.id, id);
    } catch (e) {
      console.warn('Erro ao deletar operador na nuvem:', e);
    }
    setUsers(users.filter((u) => u.id !== id));
    showToast('Operador removido.');
  };

  const startEditingUser = (user: User) => {
    setEditingUserId(user.id);
    setEditUserForm({ name: user.name, pin: user.pin, isAdmin: user.isAdmin });
  };

  const saveUserEdit = async () => {
    if (!editUserForm.name.trim() || !editUserForm.pin.trim()) {
      showToast('Preencha nome e PIN.');
      return;
    }
    if (
      users.some(
        (u) => u.id !== editingUserId && u.name.toLowerCase() === editUserForm.name.toLowerCase().trim()
      )
    ) {
      showToast('Este nome já está em uso neste bar.');
      return;
    }
    const updatedName = editUserForm.name.trim();
    const updatedPin = editUserForm.pin.trim();
    const updatedIsAdmin = editUserForm.isAdmin;

    try {
      if (editingUserId) {
        await saasApi.updateUser(currentTenant.id, editingUserId, {
          name: updatedName,
          pin: updatedPin,
          isAdmin: updatedIsAdmin,
        });
      }
    } catch (e) {
      console.warn('Erro ao atualizar na nuvem:', e);
    }

    setUsers(
      users.map((u) =>
        u.id === editingUserId
          ? {
              ...u,
              name: updatedName,
              pin: updatedPin,
              isAdmin: updatedIsAdmin,
            }
          : u
      )
    );
    if (currentOperator?.id === editingUserId) {
      setCurrentOperator((prev) =>
        prev
          ? {
              ...prev,
              name: updatedName,
              pin: updatedPin,
              isAdmin: updatedIsAdmin,
            }
          : null
      );
    }
    setEditingUserId(null);
    showToast('Usuário atualizado na nuvem com sucesso!');
  };

  const handleBarAdminAddUser = async (userData: { name: string; pin: string; isAdmin: boolean }) => {
    try {
      const added = await saasApi.addUser(currentTenant.id, userData);
      setUsers((prev) => [...prev, added]);
      showToast('Operador cadastrado na nuvem com sucesso!');
    } catch {
      const localUser: User = {
        id: Date.now(),
        tenantId: currentTenant.id,
        name: userData.name,
        pin: userData.pin,
        isAdmin: userData.isAdmin,
      };
      setUsers((prev) => [...prev, localUser]);
      showToast('Operador salvo localmente.');
    }
  };

  const handleBarAdminUpdateUser = async (userId: number, updates: Partial<TenantUser>) => {
    try {
      await saasApi.updateUser(currentTenant.id, userId, updates);
    } catch (e) {
      console.warn('Erro ao atualizar na nuvem:', e);
    }
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, ...updates } : u))
    );
    if (currentOperator?.id === userId) {
      setCurrentOperator((prev) => (prev ? { ...prev, ...updates } : null));
    }
    showToast('Operador atualizado com sucesso!');
  };

  const handleUpdateTenantAppearance = async (updates: Partial<Tenant>) => {
    try {
      const updated = await saasApi.updateTenant(currentTenant.id, updates);
      if (updated) {
        setCurrentTenant(updated);
        setTenants((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      }
    } catch {
      showToast('Erro ao atualizar aparência da loja.');
    }
  };

  // --- HANDLERS SAAS (FASES 1, 2, 3, 4) ---
  const handleSelectTenant = (tenant: Tenant) => {
    setCurrentTenant(tenant);
    showToast(`Bar selecionado: ${tenant.name}`);
  };

  const handleToggleBlockTenant = async (tenantId: string) => {
    try {
      const updatedTenant = await saasApi.toggleBlockTenant(tenantId);
      if (updatedTenant) {
        setTenants((prev) => prev.map((t) => (t.id === tenantId ? updatedTenant : t)));
        if (currentTenant?.id === tenantId) {
          setCurrentTenant(updatedTenant);
        }
        showToast(
          updatedTenant.status === 'bloqueado'
            ? `🚫 Bar ${updatedTenant.name} bloqueado no SaaS!`
            : `✅ Bar ${updatedTenant.name} desbloqueado com sucesso!`
        );
      }
      const updatedStats = await saasApi.getMasterStats();
      if (updatedStats) setMasterStats(updatedStats);
    } catch {
      showToast('Erro ao alterar status do bar.');
    }
  };

  const handleCreateTenant = async (tenantData: Partial<Tenant>) => {
    try {
      const created = await saasApi.createTenant(tenantData);
      setTenants((prev) => [...prev, created]);
      const updatedStats = await saasApi.getMasterStats();
      if (updatedStats) setMasterStats(updatedStats);
      showToast(`🎉 Bar ${created.name} cadastrado no SaaS!`);
    } catch {
      showToast('Erro ao cadastrar novo bar.');
    }
  };

  const handleConfirmPayment = async (invoiceId: string) => {
    try {
      const res = await saasApi.confirmPayment(invoiceId);
      if (res.tenant) {
        setTenants((prev) => prev.map((t) => (t.id === res.tenant.id ? res.tenant : t)));
        if (currentTenant?.id === res.tenant.id) {
          setCurrentTenant(res.tenant);
        }
      }
      if (currentTenant) {
        const invs = await saasApi.getInvoices(currentTenant.id);
        if (invs) setInvoices(invs);
      }
      const updatedStats = await saasApi.getMasterStats();
      if (updatedStats) setMasterStats(updatedStats);
      showToast('🎉 Pagamento aprovado via Webhook! Licença renovada por +30 dias.');
    } catch {
      showToast('Erro ao processar confirmação de pagamento.');
    }
  };

  const handleSaveMenu = async (items: MenuItem[]) => {
    const targetTenant = tenantForMenuModal || currentTenant;
    if (!targetTenant) return;
    try {
      const saved = await saasApi.saveMenu(targetTenant.id, items);
      const finalItems = Array.isArray(saved) ? saved : items;
      if (currentTenant?.id === targetTenant.id) {
        setCurrentMenu(finalItems);
      }
      if (tenantForMenuModal?.id === targetTenant.id) {
        setMenuModalItems(finalItems);
      }
      showToast(`Cardápio de ${targetTenant.name} atualizado na nuvem (${finalItems.length} itens)!`);
    } catch {
      if (currentTenant?.id === targetTenant.id) {
        setCurrentMenu(items);
      }
      if (tenantForMenuModal?.id === targetTenant.id) {
        setMenuModalItems(items);
      }
      showToast('Cardápio atualizado localmente.');
    }
  };

  // --- CÁLCULOS TOTAIS ---
  const getnetCredit = useMemo(() => machines.reduce((acc, m) => acc + sumArray(m.credits), 0), [machines]);
  const getnetDebit = useMemo(() => machines.reduce((acc, m) => acc + sumArray(m.debits), 0), [machines]);
  const getnetVoucher = useMemo(() => machines.reduce((acc, m) => acc + sumArray(m.vouchers), 0), [machines]);
  const getnetPix = useMemo(() => machines.reduce((acc, m) => acc + parseValue(m.pix), 0), [machines]);
  const getnetTotal = getnetCredit + getnetDebit + getnetVoucher + getnetPix;

  const jclanCredit = parseValue(jclan.credit);
  const jclanDebit = parseValue(jclan.debit);
  const jclanPix = parseValue(jclan.pix);
  const jclanVoucher = parseValue(jclan.voucher);
  const jclanTotal = jclanCredit + jclanDebit + jclanPix + jclanVoucher;

  const differenceTotal = getnetTotal - jclanTotal;

  const cashTotal =
    (parseInt(cash.b200) || 0) * 200 +
    (parseInt(cash.b100) || 0) * 100 +
    (parseInt(cash.b50) || 0) * 50 +
    (parseInt(cash.b20) || 0) * 20 +
    (parseInt(cash.b10) || 0) * 10 +
    (parseInt(cash.b5) || 0) * 5 +
    (parseInt(cash.b2) || 0) * 2 +
    (parseInt(cash.c1) || 0) * 1 +
    (parseInt(cash.c050) || 0) * 0.5 +
    (parseInt(cash.c025) || 0) * 0.25 +
    (parseInt(cash.c010) || 0) * 0.1 +
    (parseInt(cash.c005) || 0) * 0.05;

  const expectedCash = parseValue(cashSummary.opening) + parseValue(cashSummary.jclanCash) - parseValue(cashSummary.expenses);
  const cashDifference = cashTotal - expectedCash;

  // Valores individuais por bandeira de voucher do bar
  const voucherBreakdown = useMemo(() => {
    const configuredVouchers =
      currentTenant?.voucherNames && currentTenant.voucherNames.length > 0
        ? currentTenant.voucherNames
        : ['Alelo', 'Ticket', 'Sodexo', 'VR', 'Ben'];

    return configuredVouchers.map((name, idx) => {
      const sumForBrand = machines.reduce((acc, m) => {
        return acc + parseValue(m.vouchers[idx] || '0');
      }, 0);
      return { name, amount: sumForBrand };
    });
  }, [currentTenant?.voucherNames, machines]);

  // --- HANDLERS DE ALTERAÇÃO ---
  const handleJclanChange = (field: 'credit' | 'debit' | 'pix' | 'voucher', value: string) => {
    setJclan((prev) => ({ ...prev, [field]: value.replace(/[^0-9,.]/g, '') }));
  };

  const handleCashSummaryChange = (field: 'opening' | 'jclanCash' | 'expenses', value: string) => {
    setCashSummary((prev) => ({ ...prev, [field]: value.replace(/[^0-9,.]/g, '') }));
  };

  const handleCashChange = (field: string, value: string) => {
    setCash((prev) => ({ ...prev, [field]: value.replace(/[^0-9]/g, '') }));
  };

  const handleJclanBlur = (field: 'credit' | 'debit' | 'pix' | 'voucher') => {
    const val = jclan[field];
    if (val && parseValue(val) > 0) {
      const fieldLabels = { credit: 'Crédito', debit: 'Débito', pix: 'Pix', voucher: 'Voucher' };
      addAuditLog(
        'pdv',
        `Preencheu ${fieldLabels[field]} no ${currentTenant?.pdvSystemName || 'PDV'}`,
        `Valor digitado: R$ ${val}`
      );
    }
  };

  const handleCashSummaryBlur = (field: 'opening' | 'jclanCash' | 'expenses') => {
    const val = cashSummary[field];
    if (val && parseValue(val) > 0) {
      const fieldLabels = {
        opening: 'Fundo de Abertura',
        jclanCash: `Vendas Dinheiro no ${currentTenant?.pdvSystemName || 'PDV'}`,
        expenses: 'Sangrias / Pagamentos',
      };
      addAuditLog('gaveta', `Preencheu ${fieldLabels[field]}`, `Valor digitado: R$ ${val}`);
    }
  };

  const handleCashBlur = (field: string, label: string) => {
    const val = cash[field];
    if (val && parseInt(val, 10) > 0) {
      addAuditLog('gaveta', `Contagem de dinheiro (${label})`, `Qtd: ${val} un.`);
    }
  };

  const handleArrayChange = (
    machineId: number,
    type: 'credits' | 'debits' | 'vouchers',
    index: number,
    value: string
  ) => {
    setMachines((prev) =>
      prev.map((m) =>
        m.id === machineId
          ? {
              ...m,
              [type]: m[type].map((v, i) => (i === index ? value.replace(/[^0-9,.]/g, '') : v)),
            }
          : m
      )
    );
  };

  const handlePixChange = (machineId: number, value: string) => {
    setMachines((prev) =>
      prev.map((m) => (m.id === machineId ? { ...m, pix: value.replace(/[^0-9,.]/g, '') } : m))
    );
  };

  const calculateMachineTotal = (machine: Machine) =>
    sumArray(machine.credits) + sumArray(machine.debits) + sumArray(machine.vouchers) + parseValue(machine.pix);

  const handleClearMachine = (machineId: number) => {
    setMachines((prev) =>
      prev.map((m) =>
        m.id === machineId
          ? {
              ...m,
              credits: ['', '', '', '', ''],
              debits: ['', '', '', '', ''],
              vouchers: ['', '', '', '', ''],
              pix: '',
            }
          : m
      )
    );
  };

  const toggleCollapse = (machineId: number) => {
    setMachines((prev) => prev.map((m) => (m.id === machineId ? { ...m, collapsed: !m.collapsed } : m)));
  };

  const setAllCollapsed = (state: boolean) => {
    setMachines((prev) => prev.map((m) => ({ ...m, collapsed: state })));
  };

  const handleAddMachine = () => {
    setMachines((prev) => {
      const newMachines = [...prev, createEmptyMachine(0)];
      return newMachines.map((m, index) => ({ ...m, id: index + 1 }));
    });
  };

  const handleRemoveMachine = (machineId: number) => {
    if (machines.length <= 1) {
      showToast('Mínimo 1 maquininha.');
      return;
    }
    setMachines((prev) => {
      const filtered = prev.filter((m) => m.id !== machineId);
      return filtered.map((m, index) => ({ ...m, id: index + 1 }));
    });
  };

  const handleAddField = (machineId: number, type: 'credits' | 'debits' | 'vouchers') => {
    setMachines((prev) =>
      prev.map((m) => (m.id === machineId ? { ...m, [type]: [...m[type], ''] } : m))
    );
  };

  // --- NAVEGAÇÃO POR SETAS DO TECLADO ---
  const jclanFields = ['credit', 'debit', 'pix', 'voucher'];
  const handleJclanKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, field: string) => {
    const target = e.currentTarget;
    const index = jclanFields.indexOf(field);
    let nextIndex = index;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      if (target.selectionEnd === target.value.length && index < jclanFields.length - 1) {
        e.preventDefault();
        nextIndex = index + 1;
      }
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      if (target.selectionStart === 0 && index > 0) {
        e.preventDefault();
        nextIndex = index - 1;
      }
    } else return;
    if (nextIndex !== index) {
      setTimeout(() => document.getElementById(`jclan-${jclanFields[nextIndex]}`)?.focus(), 10);
    }
  };

  const notesFields = ['b200', 'b100', 'b50', 'b20', 'b10', 'b5', 'b2'];
  const coinsFields = ['c1', 'c050', 'c025', 'c010', 'c005'];
  const handleCashKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, type: 'notes' | 'coins', index: number) => {
    const target = e.currentTarget;
    let nextType = type;
    let nextIndex = index;
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      nextIndex = Math.max(0, index - 1);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const maxIdx = type === 'notes' ? notesFields.length - 1 : coinsFields.length - 1;
      nextIndex = Math.min(maxIdx, index + 1);
    } else if (e.key === 'ArrowRight') {
      if (type === 'notes' && target.selectionEnd === target.value.length) {
        e.preventDefault();
        nextType = 'coins';
        nextIndex = Math.min(index, coinsFields.length - 1);
      }
    } else if (e.key === 'ArrowLeft') {
      if (type === 'coins' && target.selectionStart === 0) {
        e.preventDefault();
        nextType = 'notes';
      }
    } else return;

    if (nextType !== type || nextIndex !== index) {
      const fields = nextType === 'notes' ? notesFields : coinsFields;
      setTimeout(() => document.getElementById(`cash-${fields[nextIndex]}`)?.focus(), 10);
    }
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    machineId: number,
    type: 'credits' | 'debits' | 'vouchers' | 'pix',
    index: number
  ) => {
    const target = e.currentTarget;
    const rows: Array<'credits' | 'debits' | 'vouchers' | 'pix'> = ['credits', 'debits', 'vouchers', 'pix'];
    const currentRowIndex = rows.indexOf(type);
    let nextMachineId = machineId;
    let nextRowIndex = currentRowIndex;
    let nextColIndex = index;

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (currentRowIndex > 0) nextRowIndex = currentRowIndex - 1;
      else if (machineId > 1) {
        nextMachineId = machineId - 1;
        nextRowIndex = 3;
        nextColIndex = 0;
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (currentRowIndex < rows.length - 1) nextRowIndex = currentRowIndex + 1;
      else if (machineId < machines.length) {
        nextMachineId = machineId + 1;
        nextRowIndex = 0;
        nextColIndex = 0;
      }
    } else if (e.key === 'ArrowLeft') {
      if (target.selectionStart === 0) {
        if (index > 0) {
          e.preventDefault();
          nextColIndex = index - 1;
        } else if (machineId > 1) {
          e.preventDefault();
          nextMachineId = machineId - 1;
          nextColIndex = type === 'pix' ? 0 : 4;
        }
      }
    } else if (e.key === 'ArrowRight') {
      const currentArrayLength = (machines.find((m) => m.id === machineId) as any)?.[type]?.length || 5;
      if (target.selectionEnd === target.value.length) {
        if (index < currentArrayLength - 1 && type !== 'pix') {
          e.preventDefault();
          nextColIndex = index + 1;
        } else if (machineId < machines.length) {
          e.preventDefault();
          nextMachineId = machineId + 1;
          nextColIndex = 0;
        }
      }
    } else return;

    const nextType = rows[nextRowIndex];
    if (nextType === 'pix') nextColIndex = 0;
    const nextInputId = `input-${nextMachineId}-${nextType}-${nextColIndex}`;

    setMachines((prev) => {
      const isCollapsed = prev.find((m) => m.id === nextMachineId)?.collapsed;
      if (isCollapsed) return prev.map((m) => (m.id === nextMachineId ? { ...m, collapsed: false } : m));
      return prev;
    });
    setTimeout(() => {
      document.getElementById(nextInputId)?.focus();
    }, 10);
  };

  // --- FUNÇÕES DE CONVERSÃO EXATA EM CENTAVOS ---
  const toCents = (val: number): number => Math.round(val * 100);
  const fromCents = (cents: number): number => cents / 100;
  const withTaxCents = (cents: number): number => Math.round(cents * 1.1);

  const formatItemCounts = (items: Array<MenuItem | CommandItem>): string => {
    const counts: Record<string, number> = {};
    items.forEach((i) => (counts[i.name] = (counts[i.name] || 0) + 1));
    return Object.entries(counts)
      .map(([name, count]) => (count > 1 ? `${count}x ${name}` : name))
      .join(' + ');
  };

  // Regra do Assistente de Conciliação no Jclan:
  // Produtos de Happy Hour ou Promocionais possuem horário máximo de lançamento e NÃO podem ser indicados no fechamento.
  const eligibleMenuForJclan = useMemo(
    () => (currentMenu || []).filter((item) => !isHappyHourOrPromoItem(item)),
    [currentMenu]
  );

  const blockedPromoItemsCount = useMemo(
    () => (currentMenu || []).length - eligibleMenuForJclan.length,
    [currentMenu, eligibleMenuForJclan]
  );

  // --- SUGESTÃO INTELIGENTE BASEADA NO CARDÁPIO (MÁXIMO R$ 1,00 DE DESCONTO) ---
  const calculateMenuSuggestions = (targetAmount: number, type: 'sobra' | 'falta' = 'sobra') => {
    if (!targetAmount || targetAmount <= 0) return [];
    const targetCents = toCents(targetAmount);

    interface SuggestionCandidate {
      title: string;
      item: string;
      centAdjustment: number;
      instruction: string;
      diffCents: number;
      numItems: number;
      isExact: boolean;
      mode: 'nova_comanda' | 'exclusao' | 'troca';
    }

    const candidates: SuggestionCandidate[] = [];
    const seen = new Set<string>();
    const menuToUse = eligibleMenuForJclan;

    if (type === 'sobra') {
      // SOBRA: Requer lançar itens em uma NOVA COMANDA
      // 1. Testa item único (com 10% e sem 10%)
      for (const item of menuToUse) {
        const itemCents = toCents(item.price);

        // Com 10% de taxa
        const totalTaxCents = withTaxCents(itemCents);
        const diffTax = totalTaxCents - targetCents;
        if (diffTax >= 0 && diffTax <= 100) {
          const sig = `${item.name}|tax=1`;
          if (!seen.has(sig)) {
            seen.add(sig);
            candidates.push({
              title: 'Nova Comanda (COM 10% de Taxa)',
              item: item.name,
              centAdjustment: fromCents(diffTax),
              diffCents: diffTax,
              numItems: 1,
              isExact: diffTax === 0,
              mode: 'nova_comanda',
              instruction:
                `Lance 1x ${item.name} (${formatCurrency(item.price)}) + 10% = ${formatCurrency(fromCents(totalTaxCents))}. ` +
                (diffTax === 0
                  ? '✨ Zera 100% no centavo exato (R$ 0,00 de desconto)!'
                  : `Dê apenas ${formatCurrency(fromCents(diffTax))} de desconto no Jclan (limite <= R$ 1,00).`),
            });
          }
        }

        // Sem 10% de taxa
        const totalNoTaxCents = itemCents;
        const diffNoTax = totalNoTaxCents - targetCents;
        if (diffNoTax >= 0 && diffNoTax <= 100) {
          const sig = `${item.name}|tax=0`;
          if (!seen.has(sig)) {
            seen.add(sig);
            candidates.push({
              title: 'Nova Comanda (SEM 10% de Taxa)',
              item: item.name,
              centAdjustment: fromCents(diffNoTax),
              diffCents: diffNoTax,
              numItems: 1,
              isExact: diffNoTax === 0,
              mode: 'nova_comanda',
              instruction:
                `Lance 1x ${item.name} (${formatCurrency(item.price)}) e desative a taxa de serviço. ` +
                (diffNoTax === 0
                  ? '✨ Zera 100% no centavo exato (R$ 0,00 de desconto)!'
                  : `Dê apenas ${formatCurrency(fromCents(diffNoTax))} de desconto no Jclan (limite <= R$ 1,00).`),
            });
          }
        }
      }

      // 2. Testa combinações de 2 itens
      for (let i = 0; i < menuToUse.length; i++) {
        const itemA = menuToUse[i];
        const centsA = toCents(itemA.price);
        if (centsA > targetCents + 100) continue;

        for (let j = i; j < menuToUse.length; j++) {
          const itemB = menuToUse[j];
          const sumCents = centsA + toCents(itemB.price);

          // Com 10%
          const totalTaxCents = withTaxCents(sumCents);
          const diffTax = totalTaxCents - targetCents;
          if (diffTax >= 0 && diffTax <= 100) {
            const sig = [itemA.name, itemB.name].sort().join('+') + '|tax=1';
            if (!seen.has(sig)) {
              seen.add(sig);
              const formatted = itemA.name === itemB.name ? `2x ${itemA.name}` : `1x ${itemA.name} + 1x ${itemB.name}`;
              candidates.push({
                title: 'Nova Comanda (COM 10% de Taxa)',
                item: formatted,
                centAdjustment: fromCents(diffTax),
                diffCents: diffTax,
                numItems: 2,
                isExact: diffTax === 0,
                mode: 'nova_comanda',
                instruction:
                  `Lance ${formatted} + 10% = ${formatCurrency(fromCents(totalTaxCents))}. ` +
                  (diffTax === 0
                    ? '✨ Zera 100% no centavo exato (R$ 0,00 de desconto)!'
                    : `Dê apenas ${formatCurrency(fromCents(diffTax))} de desconto no Jclan (limite <= R$ 1,00).`),
              });
            }
          }

          // Sem 10%
          const diffNoTax = sumCents - targetCents;
          if (diffNoTax >= 0 && diffNoTax <= 100) {
            const sig = [itemA.name, itemB.name].sort().join('+') + '|tax=0';
            if (!seen.has(sig)) {
              seen.add(sig);
              const formatted = itemA.name === itemB.name ? `2x ${itemA.name}` : `1x ${itemA.name} + 1x ${itemB.name}`;
              candidates.push({
                title: 'Nova Comanda (SEM 10% de Taxa)',
                item: formatted,
                centAdjustment: fromCents(diffNoTax),
                diffCents: diffNoTax,
                numItems: 2,
                isExact: diffNoTax === 0,
                mode: 'nova_comanda',
                instruction:
                  `Lance ${formatted} e desative a taxa. ` +
                  (diffNoTax === 0
                    ? '✨ Zera 100% no centavo exato (R$ 0,00 de desconto)!'
                    : `Dê apenas ${formatCurrency(fromCents(diffNoTax))} de desconto no Jclan (limite <= R$ 1,00).`),
              });
            }
          }
        }
      }

      // 3. Testa combinações de 3 itens se não encontramos match com 0 centavos
      const hasExact = candidates.some((c) => c.diffCents === 0);
      if (!hasExact || candidates.length < 4) {
        for (let i = 0; i < Math.min(menuToUse.length, 45); i++) {
          const itemA = menuToUse[i];
          const centsA = toCents(itemA.price);
          if (centsA > targetCents) continue;

          for (let j = i; j < Math.min(menuToUse.length, 45); j++) {
            const itemB = menuToUse[j];
            const centsAB = centsA + toCents(itemB.price);
            if (centsAB > targetCents + 100) continue;

            for (let k = j; k < Math.min(menuToUse.length, 45); k++) {
              const itemC = menuToUse[k];
              const sumCents = centsAB + toCents(itemC.price);

              // Com 10%
              const totalTaxCents = withTaxCents(sumCents);
              const diffTax = totalTaxCents - targetCents;
              if (diffTax >= 0 && diffTax <= 100) {
                const sig = [itemA.name, itemB.name, itemC.name].sort().join('+') + '|tax=1';
                if (!seen.has(sig)) {
                  seen.add(sig);
                  const formatted = formatItemCounts([itemA, itemB, itemC]);
                  candidates.push({
                    title: 'Nova Comanda (COM 10% de Taxa)',
                    item: formatted,
                    centAdjustment: fromCents(diffTax),
                    diffCents: diffTax,
                    numItems: 3,
                    isExact: diffTax === 0,
                    mode: 'nova_comanda',
                    instruction:
                      `Lance [${formatted}] + 10% = ${formatCurrency(fromCents(totalTaxCents))}. ` +
                      (diffTax === 0
                        ? '✨ Zera 100% no centavo exato (R$ 0,00 de desconto)!'
                        : `Dê apenas ${formatCurrency(fromCents(diffTax))} de desconto no Jclan (limite <= R$ 1,00).`),
                  });
                }
              }

              // Sem 10%
              const diffNoTax = sumCents - targetCents;
              if (diffNoTax >= 0 && diffNoTax <= 100) {
                const sig = [itemA.name, itemB.name, itemC.name].sort().join('+') + '|tax=0';
                if (!seen.has(sig)) {
                  seen.add(sig);
                  const formatted = formatItemCounts([itemA, itemB, itemC]);
                  candidates.push({
                    title: 'Nova Comanda (SEM 10% de Taxa)',
                    item: formatted,
                    centAdjustment: fromCents(diffNoTax),
                    diffCents: diffNoTax,
                    numItems: 3,
                    isExact: diffNoTax === 0,
                    mode: 'nova_comanda',
                    instruction:
                      `Lance [${formatted}] e desative a taxa. ` +
                      (diffNoTax === 0
                        ? '✨ Zera 100% no centavo exato (R$ 0,00 de desconto)!'
                        : `Dê apenas ${formatCurrency(fromCents(diffNoTax))} de desconto no Jclan (limite <= R$ 1,00).`),
                  });
                }
              }
              if (candidates.length > 25) break;
            }
            if (candidates.length > 25) break;
          }
          if (candidates.length > 25) break;
        }
      }
    } else {
      // FALTA: Requer excluir itens de uma COMANDA REABERTA ou fazer uma troca (excluir + incluir)
      // 1. Exclusão direta de 1 item do cardápio presente na comanda
      for (const item of menuToUse) {
        const itemCents = toCents(item.price);

        // Comanda COM 10%
        const totalTaxCents = withTaxCents(itemCents);
        const diffTax = totalTaxCents - targetCents;
        if (diffTax >= 0 && diffTax <= 100) {
          const sig = `exc|${item.name}|tax=1`;
          if (!seen.has(sig)) {
            seen.add(sig);
            candidates.push({
              title: 'Exclusão Direta (Comanda COM 10%)',
              item: item.name,
              centAdjustment: fromCents(diffTax),
              diffCents: diffTax,
              numItems: 1,
              isExact: diffTax === 0,
              mode: 'exclusao',
              instruction:
                `Reabra uma comanda que contenha 1x ${item.name} (${formatCurrency(item.price)}) e exclua-o. ` +
                (diffTax === 0
                  ? '✨ Zera 100% no centavo exato (R$ 0,00 de desconto)!'
                  : `Dê apenas ${formatCurrency(fromCents(diffTax))} de desconto no Jclan (limite <= R$ 1,00).`),
            });
          }
        }

        // Comanda SEM 10%
        const diffNoTax = itemCents - targetCents;
        if (diffNoTax >= 0 && diffNoTax <= 100) {
          const sig = `exc|${item.name}|tax=0`;
          if (!seen.has(sig)) {
            seen.add(sig);
            candidates.push({
              title: 'Exclusão Direta (Comanda SEM 10%)',
              item: item.name,
              centAdjustment: fromCents(diffNoTax),
              diffCents: diffNoTax,
              numItems: 1,
              isExact: diffNoTax === 0,
              mode: 'exclusao',
              instruction:
                `Reabra uma comanda sem taxa que contenha 1x ${item.name} (${formatCurrency(item.price)}) e exclua-o. ` +
                (diffNoTax === 0
                  ? '✨ Zera 100% no centavo exato (R$ 0,00 de desconto)!'
                  : `Dê apenas ${formatCurrency(fromCents(diffNoTax))} de desconto no Jclan (limite <= R$ 1,00).`),
            });
          }
        }
      }

      // 2. Exclusão de 2 itens
      for (let i = 0; i < menuToUse.length; i++) {
        const itemA = menuToUse[i];
        const centsA = toCents(itemA.price);
        if (centsA > targetCents + 100) continue;

        for (let j = i; j < menuToUse.length; j++) {
          const itemB = menuToUse[j];
          const sumCents = centsA + toCents(itemB.price);

          // Com 10%
          const totalTaxCents = withTaxCents(sumCents);
          const diffTax = totalTaxCents - targetCents;
          if (diffTax >= 0 && diffTax <= 100) {
            const sig = `exc|` + [itemA.name, itemB.name].sort().join('+') + '|tax=1';
            if (!seen.has(sig)) {
              seen.add(sig);
              const formatted = itemA.name === itemB.name ? `2x ${itemA.name}` : `1x ${itemA.name} + 1x ${itemB.name}`;
              candidates.push({
                title: 'Exclusão Direta (Comanda COM 10%)',
                item: formatted,
                centAdjustment: fromCents(diffTax),
                diffCents: diffTax,
                numItems: 2,
                isExact: diffTax === 0,
                mode: 'exclusao',
                instruction:
                  `Exclua da comanda reaberta: ${formatted}. ` +
                  (diffTax === 0
                    ? '✨ Zera 100% no centavo exato (R$ 0,00 de desconto)!'
                    : `Dê apenas ${formatCurrency(fromCents(diffTax))} de desconto no Jclan (limite <= R$ 1,00).`),
              });
            }
          }

          // Sem 10%
          const diffNoTax = sumCents - targetCents;
          if (diffNoTax >= 0 && diffNoTax <= 100) {
            const sig = `exc|` + [itemA.name, itemB.name].sort().join('+') + '|tax=0';
            if (!seen.has(sig)) {
              seen.add(sig);
              const formatted = itemA.name === itemB.name ? `2x ${itemA.name}` : `1x ${itemA.name} + 1x ${itemB.name}`;
              candidates.push({
                title: 'Exclusão Direta (Comanda SEM 10%)',
                item: formatted,
                centAdjustment: fromCents(diffNoTax),
                diffCents: diffNoTax,
                numItems: 2,
                isExact: diffNoTax === 0,
                mode: 'exclusao',
                instruction:
                  `Exclua da comanda reaberta sem taxa: ${formatted}. ` +
                  (diffNoTax === 0
                    ? '✨ Zera 100% no centavo exato (R$ 0,00 de desconto)!'
                    : `Dê apenas ${formatCurrency(fromCents(diffNoTax))} de desconto no Jclan (limite <= R$ 1,00).`),
              });
            }
          }
        }
      }

      // 3. Ajuste Misto Inteligente (Troca: Excluir 1 item maior e Incluir 1 item menor)
      for (const itemA of menuToUse) {
        const centsA = toCents(itemA.price);
        for (const itemB of menuToUse) {
          const centsB = toCents(itemB.price);
          if (centsA <= centsB) continue;

          // Com 10%
          const netRedTax = withTaxCents(centsA) - withTaxCents(centsB);
          const diffTax = netRedTax - targetCents;
          if (diffTax >= 0 && diffTax <= 100) {
            const sig = `swap|${itemA.name}-${itemB.name}|tax=1`;
            if (!seen.has(sig)) {
              seen.add(sig);
              candidates.push({
                title: 'Ajuste Misto: Excluir + Incluir (COM 10%)',
                item: `✂️ Exclui 1x ${itemA.name} ➕ Inclui 1x ${itemB.name}`,
                centAdjustment: fromCents(diffTax),
                diffCents: diffTax,
                numItems: 2,
                isExact: diffTax === 0,
                mode: 'troca',
                instruction:
                  `Na comanda reaberta, exclua 1x ${itemA.name} e adicione 1x ${itemB.name} (Redução líquida: ${formatCurrency(fromCents(netRedTax))}). ` +
                  (diffTax === 0
                    ? '✨ Zera 100% no centavo exato (R$ 0,00 de desconto)!'
                    : `Dê apenas ${formatCurrency(fromCents(diffTax))} de desconto no Jclan (limite <= R$ 1,00).`),
              });
            }
          }

          // Sem 10%
          const netRedNoTax = centsA - centsB;
          const diffNoTax = netRedNoTax - targetCents;
          if (diffNoTax >= 0 && diffNoTax <= 100) {
            const sig = `swap|${itemA.name}-${itemB.name}|tax=0`;
            if (!seen.has(sig)) {
              seen.add(sig);
              candidates.push({
                title: 'Ajuste Misto: Excluir + Incluir (SEM 10%)',
                item: `✂️ Exclui 1x ${itemA.name} ➕ Inclui 1x ${itemB.name}`,
                centAdjustment: fromCents(diffNoTax),
                diffCents: diffNoTax,
                numItems: 2,
                isExact: diffNoTax === 0,
                mode: 'troca',
                instruction:
                  `Na comanda reaberta, exclua 1x ${itemA.name} e adicione 1x ${itemB.name} (Redução líquida: ${formatCurrency(fromCents(netRedNoTax))}). ` +
                  (diffNoTax === 0
                    ? '✨ Zera 100% no centavo exato (R$ 0,00 de desconto)!'
                    : `Dê apenas ${formatCurrency(fromCents(diffNoTax))} de desconto no Jclan (limite <= R$ 1,00).`),
              });
            }
          }
          if (candidates.length > 35) break;
        }
        if (candidates.length > 35) break;
      }
    }

    // Ordenação rigorosa:
    // 1. Zera 100% exato primeiro (diffCents === 0)
    // 2. Menor desconto (<= 100 centavos)
    // 3. Menor quantidade de itens
    candidates.sort((a, b) => {
      if (a.diffCents === 0 && b.diffCents !== 0) return -1;
      if (b.diffCents === 0 && a.diffCents !== 0) return 1;
      if (a.diffCents !== b.diffCents) return a.diffCents - b.diffCents;
      return a.numItems - b.numItems;
    });

    return candidates.slice(0, 4).map((c) => ({
      title: c.title,
      item: c.item,
      centAdjustment: c.centAdjustment,
      instruction: c.instruction,
      isExact: c.isExact,
      mode: c.mode,
    }));
  };

  // --- LOCALIZADOR DE ITENS DO CARDÁPIO ---
  const findMenuItem = (str: string) => {
    const s = str.trim().toLowerCase();
    if (!s) return null;
    const menuToSearch = currentMenu || [];
    return (
      menuToSearch.find((i) => i.name.toLowerCase() === s) ||
      menuToSearch.find((i) => i.name.toLowerCase().startsWith(s)) ||
      menuToSearch.find((i) => i.name.toLowerCase().includes(s))
    );
  };

  const handleAddCommandItem = (label: string, itemString: string, qty: number | string = 1) => {
    if (!itemString) return;
    const item = findMenuItem(itemString);
    if (!item) {
      showToast('Item não encontrado. Selecione um item da lista.');
      return;
    }
    const quantity = parseInt(String(qty)) || 1;
    if (quantity < 1) return;

    setCustomCommands((prev) => {
      const currentItems = prev[label] || [];
      const newEntries = Array.from({ length: quantity }, () => ({
        id: Date.now() + Math.random(),
        ...item,
      }));
      if (currentItems.length + newEntries.length > 25) {
        showToast('Máximo de itens atingido para esta simulação.');
        return prev;
      }
      return { ...prev, [label]: [...currentItems, ...newEntries] };
    });

    addAuditLog(
      'comanda',
      `Adicionou item na Comanda Reaberta (${label})`,
      `${quantity}x ${item.name} (${formatCurrency(item.price * quantity)})`
    );
  };

  const handleRemoveCommandItem = (label: string, id: number) => {
    const itemToRemove = customCommands[label]?.find((i) => i.id === id);
    if (itemToRemove) {
      addAuditLog(
        'comanda',
        `Removeu item da Comanda Reaberta (${label})`,
        `1x ${itemToRemove.name} (${formatCurrency(itemToRemove.price)})`
      );
    }
    setCustomCommands((prev) => ({
      ...prev,
      [label]: prev[label].filter((i) => i.id !== id),
    }));
  };

  // --- CALCULADORA DE EXCLUSÃO EXATA (COMANDA REABERTA - FALTAS) ---
  // Hierarquia: 1ª Opção COM 10% (taxa de serviço sobre a comanda toda) sempre no topo,
  // 2ª Opção Secundária SEM 10%. Limite de até R$ 1,00 de desconto.
  const findBestCommandSubsets = (targetAmount: number, itemsArray: CommandItem[]) => {
    if (!targetAmount || targetAmount <= 0) return [];
    const targetCents = toCents(targetAmount);
    const pdvName = currentTenant?.pdvSystemName || 'Jclan';

    interface Candidate {
      formattedItems: string;
      diffCents: number;
      isExact: boolean;
      type: 'pure' | 'mixed';
      itemToAdd?: string;
      netReductionCents: number;
      itemCount: number;
    }

    const candidatesWithTax: Candidate[] = [];
    const candidatesWithoutTax: Candidate[] = [];

    const powerSet = (arr: CommandItem[]): CommandItem[][] =>
      arr.reduce(
        (subsets: CommandItem[][], value: CommandItem) => subsets.concat(subsets.map((set) => [value, ...set])),
        [[]]
      );
    const allSubsets = powerSet(itemsArray).filter((set) => set.length > 0);

    // 1. FASE A: EXCLUSÃO PURA (remover subconjunto de itens já na comanda)
    allSubsets.forEach((subset) => {
      const sumCents = subset.reduce((acc, curr) => acc + toCents(curr.price), 0);
      const formatted = formatItemCounts(subset);

      // Comanda toda COM 10% (Taxa de serviço sobre a comanda inteira)
      const taxCents = withTaxCents(sumCents);
      const diffTax = taxCents - targetCents;
      if (diffTax >= 0 && diffTax <= 100) {
        candidatesWithTax.push({
          formattedItems: formatted,
          diffCents: diffTax,
          isExact: diffTax === 0,
          type: 'pure',
          netReductionCents: taxCents,
          itemCount: subset.length,
        });
      }

      // Comanda toda SEM 10%
      const diffNoTax = sumCents - targetCents;
      if (diffNoTax >= 0 && diffNoTax <= 100) {
        candidatesWithoutTax.push({
          formattedItems: formatted,
          diffCents: diffNoTax,
          isExact: diffNoTax === 0,
          type: 'pure',
          netReductionCents: sumCents,
          itemCount: subset.length,
        });
      }
    });

    // 2. FASE B: AJUSTE MISTO (EXCLUIR ITENS DA COMANDA + INCLUIR ITEM DO CARDÁPIO SEM HAPPY HOUR / PROMO)
    const activeMenuItems = eligibleMenuForJclan;
    allSubsets.forEach((subset) => {
      const sumExcludedCents = subset.reduce((acc, curr) => acc + toCents(curr.price), 0);
      const formatted = formatItemCounts(subset);

      for (const itemToAdd of activeMenuItems) {
        const centsToAdd = toCents(itemToAdd.price);
        if (centsToAdd >= sumExcludedCents) continue; // Inclusão precisa ser menor que a exclusão

        // Comanda toda COM 10%
        const netTaxCents = withTaxCents(sumExcludedCents) - withTaxCents(centsToAdd);
        const diffTax = netTaxCents - targetCents;
        if (diffTax >= 0 && diffTax <= 100) {
          candidatesWithTax.push({
            formattedItems: formatted,
            diffCents: diffTax,
            isExact: diffTax === 0,
            type: 'mixed',
            itemToAdd: itemToAdd.name,
            netReductionCents: netTaxCents,
            itemCount: subset.length + 1,
          });
        }

        // Comanda toda SEM 10%
        const netNoTaxCents = sumExcludedCents - centsToAdd;
        const diffNoTax = netNoTaxCents - targetCents;
        if (diffNoTax >= 0 && diffNoTax <= 100) {
          candidatesWithoutTax.push({
            formattedItems: formatted,
            diffCents: diffNoTax,
            isExact: diffNoTax === 0,
            type: 'mixed',
            itemToAdd: itemToAdd.name,
            netReductionCents: netNoTaxCents,
            itemCount: subset.length + 1,
          });
        }
      }
    });

    const sortCandidates = (list: Candidate[]) => {
      list.sort((a, b) => {
        if (a.isExact && !b.isExact) return -1;
        if (!a.isExact && b.isExact) return 1;
        if (a.diffCents !== b.diffCents) return a.diffCents - b.diffCents;
        if (a.type === 'pure' && b.type === 'mixed') return -1;
        if (a.type === 'mixed' && b.type === 'pure') return 1;
        return a.itemCount - b.itemCount;
      });
    };

    sortCandidates(candidatesWithTax);
    sortCandidates(candidatesWithoutTax);

    interface CommandOption {
      title: string;
      instruction: string;
      diff: number;
      isExact: boolean;
      type: 'pure' | 'mixed';
    }

    const options: CommandOption[] = [];

    // HIERARQUIA 1ª: Sempre a opção da comanda paga COM 10% (se houver combinação viável)
    if (candidatesWithTax.length > 0) {
      const best = candidatesWithTax[0];
      const diffVal = fromCents(best.diffCents);
      const instruction =
        best.type === 'pure'
          ? `✂️ Exclua da comanda reaberta: [${best.formattedItems}]. ` +
            (best.isExact
              ? `✨ Zera 100% no centavo exato no ${pdvName} (R$ 0,00 de desconto)!`
              : `Dê apenas ${formatCurrency(diffVal)} de desconto no ${pdvName} (limite <= R$ 1,00).`)
          : `✂️ Exclua da comanda: [${best.formattedItems}] e ➕ Lance: 1x ${best.itemToAdd}. Redução líquida de ${formatCurrency(fromCents(best.netReductionCents))}. ` +
            (best.isExact
              ? `✨ Zera 100% no centavo exato no ${pdvName} (R$ 0,00 de desconto)!`
              : `Dê apenas ${formatCurrency(diffVal)} de desconto no ${pdvName} (limite <= R$ 1,00).`);

      options.push({
        title: '1ª Opção: Comanda Paga COM 10% (Taxa de Serviço)',
        instruction,
        diff: diffVal,
        isExact: best.isExact,
        type: best.type,
      });
    }

    // 2ª OPÇÃO SECUNDÁRIA: Comanda fechada SEM 10% (se houver combinação viável)
    if (candidatesWithoutTax.length > 0) {
      const best = candidatesWithoutTax[0];
      const diffVal = fromCents(best.diffCents);
      const instruction =
        best.type === 'pure'
          ? `✂️ Exclua da comanda reaberta: [${best.formattedItems}]. ` +
            (best.isExact
              ? `✨ Zera 100% no centavo exato no ${pdvName} (R$ 0,00 de desconto)!`
              : `Dê apenas ${formatCurrency(diffVal)} de desconto no ${pdvName} (limite <= R$ 1,00).`)
          : `✂️ Exclua da comanda: [${best.formattedItems}] e ➕ Lance: 1x ${best.itemToAdd} (sem taxa). Redução líquida de ${formatCurrency(fromCents(best.netReductionCents))}. ` +
            (best.isExact
              ? `✨ Zera 100% no centavo exato no ${pdvName} (R$ 0,00 de desconto)!`
              : `Dê apenas ${formatCurrency(diffVal)} de desconto no ${pdvName} (limite <= R$ 1,00).`);

      options.push({
        title: '2ª Opção Secundária: Comanda Fechada SEM 10%',
        instruction,
        diff: diffVal,
        isExact: best.isExact,
        type: best.type,
      });
    }

    return options;
  };

  // --- CALCULADORA DE INCLUSÃO (SOBRAS) ---
  const handleAddInclusionItem = (label: string, itemString: string, qty: number | string = 1) => {
    if (!itemString) return;
    const item = findMenuItem(itemString);
    if (!item) {
      showToast('Item não encontrado. Selecione um item da lista.');
      return;
    }
    if (isHappyHourOrPromoItem(item)) {
      showToast(
        `🚫 "${item.name}" é de Happy Hour / Promocional e possui horário máximo de lançamento no ${currentTenant?.pdvSystemName || 'Jclan'}.`
      );
      return;
    }
    const quantity = parseInt(String(qty)) || 1;
    if (quantity < 1) return;

    setInclusionCommands((prev) => {
      const currentItems = prev[label] || [];
      const newEntries = Array.from({ length: quantity }, () => ({
        id: Date.now() + Math.random(),
        ...item,
      }));
      if (currentItems.length + newEntries.length > 25) {
        showToast('Máximo de itens atingido para esta simulação.');
        return prev;
      }
      return { ...prev, [label]: [...currentItems, ...newEntries] };
    });

    addAuditLog(
      'comanda',
      `Adicionou item na Simulação de Inclusão (${label})`,
      `${quantity}x ${item.name} (${formatCurrency(item.price * quantity)})`
    );
  };

  const handleRemoveInclusionItem = (label: string, id: number) => {
    const itemToRemove = inclusionCommands[label]?.find((i) => i.id === id);
    if (itemToRemove) {
      addAuditLog(
        'comanda',
        `Removeu item da Simulação de Inclusão (${label})`,
        `1x ${itemToRemove.name} (${formatCurrency(itemToRemove.price)})`
      );
    }
    setInclusionCommands((prev) => ({
      ...prev,
      [label]: prev[label].filter((i) => i.id !== id),
    }));
  };

  // --- CALCULADORA DE INCLUSÃO EXATA (NOVA COMANDA - SOBRAS) ---
  // Limite de R$ 1,00 de desconto + Complemento automático do cardápio se necessário
  const findBestInclusionSubsets = (targetAmount: number, itemsArray: CommandItem[]) => {
    if (!targetAmount || targetAmount <= 0) return [];
    const targetCents = toCents(targetAmount);
    const pdvName = currentTenant?.pdvSystemName || 'Jclan';

    interface InclusionOption {
      title: string;
      instruction: string;
      diff: number;
      isExact: boolean;
      type: 'direct' | 'complement';
    }

    const options: InclusionOption[] = [];
    const seen = new Set<string>();

    const powerSet = (arr: CommandItem[]): CommandItem[][] =>
      arr.reduce(
        (subsets: CommandItem[][], value: CommandItem) => subsets.concat(subsets.map((set) => [value, ...set])),
        [[]]
      );
    const allSubsets = powerSet(itemsArray).filter((set) => set.length > 0);

    // 1. FASE A: SUB-CONJUNTOS DIRETOS DOS ITENS ADICIONADOS
    allSubsets.forEach((subset) => {
      const sumCents = subset.reduce((acc, curr) => acc + toCents(curr.price), 0);
      const formattedItems = formatItemCounts(subset);

      // Com 10%
      const totalTaxCents = withTaxCents(sumCents);
      const diffTax = totalTaxCents - targetCents;
      if (diffTax >= 0 && diffTax <= 100) {
        const sig = `${formattedItems}|tax=1`;
        if (!seen.has(sig)) {
          seen.add(sig);
          options.push({
            title: 'Nova Comanda (COM 10% de Taxa)',
            diff: fromCents(diffTax),
            isExact: diffTax === 0,
            type: 'direct',
            instruction:
              `Lance na nova comanda: [${formattedItems}]. ` +
              (diffTax === 0
                ? `✨ Zera 100% no centavo exato no ${pdvName} (R$ 0,00 de desconto)!`
                : `Dê apenas ${formatCurrency(fromCents(diffTax))} de desconto no ${pdvName} (limite <= R$ 1,00).`),
          });
        }
      }

      // Sem 10%
      const diffNoTax = sumCents - targetCents;
      if (diffNoTax >= 0 && diffNoTax <= 100) {
        const sig = `${formattedItems}|tax=0`;
        if (!seen.has(sig)) {
          seen.add(sig);
          options.push({
            title: 'Nova Comanda (SEM 10% de Taxa)',
            diff: fromCents(diffNoTax),
            isExact: diffNoTax === 0,
            type: 'direct',
            instruction:
              `Lance na nova comanda: [${formattedItems}]. ` +
              (diffNoTax === 0
                ? `✨ Zera 100% no centavo exato no ${pdvName} (R$ 0,00 de desconto)!`
                : `Dê apenas ${formatCurrency(fromCents(diffNoTax))} de desconto no ${pdvName} (limite <= R$ 1,00).`),
          });
        }
      }
    });

    // 2. FASE B: COMPLEMENTAR OS ITENS ESCOLHIDOS COM 1 ITEM DO CARDÁPIO
    if (allSubsets.length > 0) {
      allSubsets.forEach((subset) => {
        const sumChosenCents = subset.reduce((acc, curr) => acc + toCents(curr.price), 0);
        const formattedChosen = formatItemCounts(subset);

        const activeMenuItems = eligibleMenuForJclan;
        for (const itemToAdd of activeMenuItems) {
          const totalSumCents = sumChosenCents + toCents(itemToAdd.price);

          // Com 10%
          const totalTaxCents = withTaxCents(totalSumCents);
          const diffTax = totalTaxCents - targetCents;
          if (diffTax >= 0 && diffTax <= 100) {
            const sig = `${formattedChosen}+${itemToAdd.name}|tax=1`;
            if (!seen.has(sig)) {
              seen.add(sig);
              options.push({
                title: 'Nova Comanda: Itens Escolhidos + Complemento (COM 10%)',
                diff: fromCents(diffTax),
                isExact: diffTax === 0,
                type: 'complement',
                instruction:
                  `Lance: [${formattedChosen}] e ➕ Adicione 1x ${itemToAdd.name}. Total com 10%: ${formatCurrency(fromCents(totalTaxCents))}. ` +
                  (diffTax === 0
                    ? `✨ Zera 100% no centavo exato no ${pdvName} (R$ 0,00 de desconto)!`
                    : `Dê apenas ${formatCurrency(fromCents(diffTax))} de desconto no ${pdvName} (limite <= R$ 1,00).`),
              });
            }
          }

          // Sem 10%
          const diffNoTax = totalSumCents - targetCents;
          if (diffNoTax >= 0 && diffNoTax <= 100) {
            const sig = `${formattedChosen}+${itemToAdd.name}|tax=0`;
            if (!seen.has(sig)) {
              seen.add(sig);
              options.push({
                title: 'Nova Comanda: Itens Escolhidos + Complemento (SEM 10%)',
                diff: fromCents(diffNoTax),
                isExact: diffNoTax === 0,
                type: 'complement',
                instruction:
                  `Lance: [${formattedChosen}] e ➕ Adicione 1x ${itemToAdd.name} (sem taxa). Total: ${formatCurrency(fromCents(totalSumCents))}. ` +
                  (diffNoTax === 0
                    ? `✨ Zera 100% no centavo exato no ${pdvName} (R$ 0,00 de desconto)!`
                    : `Dê apenas ${formatCurrency(fromCents(diffNoTax))} de desconto no ${pdvName} (limite <= R$ 1,00).`),
              });
            }
          }
        }
      });
    }

    // Ordenar opções:
    // 1. Zera 100% exato primeiro
    // 2. Menor desconto
    // 3. Direto antes de complemento se o desconto for igual
    options.sort((a, b) => {
      if (a.isExact && !b.isExact) return -1;
      if (!a.isExact && b.isExact) return 1;
      if (Math.abs(a.diff - b.diff) > 0.001) return a.diff - b.diff;
      if (a.type === 'direct' && b.type === 'complement') return -1;
      if (a.type === 'complement' && b.type === 'direct') return 1;
      return 0;
    });

    return options.slice(0, 5);
  };

  // --- CALCULADORA DE INCLUSÃO AUTOMÁTICA (NOVA COMANDA - SEMPRE SEM 10%) ---
  // Informa diretamente quais itens lançar da lista do cardápio (excluindo Happy Hour e Promocionais), SEMPRE sem os 10%.
  // Desconto máximo de R$ 1,00, sem precisar de barra de busca manual.
  const findAutoNovaComandaSubsets = (targetAmount: number) => {
    if (!targetAmount || targetAmount <= 0) return [];
    const targetCents = toCents(targetAmount);
    const pdvName = currentTenant?.pdvSystemName || 'Jclan';
    const menuToUse = eligibleMenuForJclan;

    interface AutoNovaOption {
      title: string;
      instruction: string;
      diff: number;
      diffCents: number;
      isExact: boolean;
      itemsCount: number;
    }

    const options: AutoNovaOption[] = [];
    const seen = new Set<string>();

    // 1. Testa 1 item SEM 10%
    for (const item of menuToUse) {
      const itemCents = toCents(item.price);
      const diffNoTax = itemCents - targetCents;
      if (diffNoTax >= 0 && diffNoTax <= 100) {
        const sig = item.name;
        if (!seen.has(sig)) {
          seen.add(sig);
          options.push({
            title: `Nova Comanda: 1x ${item.name} (SEM 10%)`,
            diff: fromCents(diffNoTax),
            diffCents: diffNoTax,
            isExact: diffNoTax === 0,
            itemsCount: 1,
            instruction:
              `Lance na nova comanda no ${pdvName}: 1x ${item.name} (${formatCurrency(item.price)}) e desative os 10% de serviço. ` +
              (diffNoTax === 0
                ? `✨ Zera 100% no centavo exato no ${pdvName} (R$ 0,00 de desconto)!`
                : `Dê apenas ${formatCurrency(fromCents(diffNoTax))} de desconto no ${pdvName} (limite <= R$ 1,00).`),
          });
        }
      }
    }

    // 2. Testa 2 itens SEM 10%
    for (let i = 0; i < menuToUse.length; i++) {
      const itemA = menuToUse[i];
      const centsA = toCents(itemA.price);
      if (centsA > targetCents + 100) continue;

      for (let j = i; j < menuToUse.length; j++) {
        const itemB = menuToUse[j];
        const sumCents = centsA + toCents(itemB.price);
        const diffNoTax = sumCents - targetCents;
        if (diffNoTax >= 0 && diffNoTax <= 100) {
          const sig = [itemA.name, itemB.name].sort().join('+');
          if (!seen.has(sig)) {
            seen.add(sig);
            const formatted = itemA.name === itemB.name ? `2x ${itemA.name}` : `1x ${itemA.name} + 1x ${itemB.name}`;
            options.push({
              title: `Nova Comanda: ${formatted} (SEM 10%)`,
              diff: fromCents(diffNoTax),
              diffCents: diffNoTax,
              isExact: diffNoTax === 0,
              itemsCount: 2,
              instruction:
                `Lance na nova comanda no ${pdvName}: ${formatted} e desative a taxa de serviço (Total: ${formatCurrency(fromCents(sumCents))}). ` +
                (diffNoTax === 0
                  ? `✨ Zera 100% no centavo exato no ${pdvName} (R$ 0,00 de desconto)!`
                  : `Dê apenas ${formatCurrency(fromCents(diffNoTax))} de desconto no ${pdvName} (limite <= R$ 1,00).`),
            });
          }
        }
      }
    }

    // 3. Testa 3 itens SEM 10% se não houver exato ou tiver poucas opções
    const hasExact = options.some((o) => o.diffCents === 0);
    if (!hasExact || options.length < 4) {
      for (let i = 0; i < Math.min(menuToUse.length, 35); i++) {
        const itemA = menuToUse[i];
        const centsA = toCents(itemA.price);
        if (centsA > targetCents) continue;

        for (let j = i; j < Math.min(menuToUse.length, 35); j++) {
          const itemB = menuToUse[j];
          const centsAB = centsA + toCents(itemB.price);
          if (centsAB > targetCents + 100) continue;

          for (let k = j; k < Math.min(menuToUse.length, 35); k++) {
            const itemC = menuToUse[k];
            const sumCents = centsAB + toCents(itemC.price);
            const diffNoTax = sumCents - targetCents;
            if (diffNoTax >= 0 && diffNoTax <= 100) {
              const sig = [itemA.name, itemB.name, itemC.name].sort().join('+');
              if (!seen.has(sig)) {
                seen.add(sig);
                const counts: Record<string, number> = {};
                [itemA.name, itemB.name, itemC.name].forEach((n) => (counts[n] = (counts[n] || 0) + 1));
                const formatted = Object.entries(counts)
                  .map(([name, count]) => `${count}x ${name}`)
                  .join(' + ');
                options.push({
                  title: `Nova Comanda: ${formatted} (SEM 10%)`,
                  diff: fromCents(diffNoTax),
                  diffCents: diffNoTax,
                  isExact: diffNoTax === 0,
                  itemsCount: 3,
                  instruction:
                    `Lance na nova comanda no ${pdvName}: ${formatted} e desative a taxa de serviço (Total: ${formatCurrency(fromCents(sumCents))}). ` +
                    (diffNoTax === 0
                      ? `✨ Zera 100% no centavo exato no ${pdvName} (R$ 0,00 de desconto)!`
                      : `Dê apenas ${formatCurrency(fromCents(diffNoTax))} de desconto no ${pdvName} (limite <= R$ 1,00).`),
                });
              }
            }
          }
        }
      }
    }

    // Ordenação: 100% exato primeiro, menor desconto, menor quantidade de itens
    options.sort((a, b) => {
      if (a.isExact && !b.isExact) return -1;
      if (!a.isExact && b.isExact) return 1;
      if (a.diffCents !== b.diffCents) return a.diffCents - b.diffCents;
      return a.itemsCount - b.itemsCount;
    });

    return options.slice(0, 4);
  };

  // --- RELATÓRIO E FECHAMENTO ---
  const generateReportText = () => {
    const now = new Date();
    const dateStr = now.toLocaleDateString('pt-BR');
    const timeStr = now.toLocaleTimeString('pt-BR').slice(0, 5);
    const pdvName = currentTenant?.pdvSystemName || 'Jclan';
    const cardName = currentTenant?.cardSystemName || 'Getnet';

    let report = `📊 FECHAMENTO DE CAIXA - ${currentTenant.name}\n`;
    report += `📅 Data: ${dateStr} às ${timeStr}\n`;
    report += `👤 Operador: ${currentOperator?.name?.toUpperCase() || 'Desconhecido'}\n\n`;

    report += `💳 CARTÕES (${cardName} x ${pdvName})\n`;
    report += `${cardName}: ${formatCurrency(getnetTotal)}\n`;
    report += `${pdvName}: ${formatCurrency(jclanTotal)}\n`;
    report += `Diferença: ${formatCurrency(differenceTotal)} ${
      Math.abs(differenceTotal) < 0.01 ? '(Batendo 100%!)' : differenceTotal > 0 ? '(Sobra)' : '(Falta)'
    }\n\n`;

    report += `💵 GAVETA (Dinheiro)\n`;
    report += `Físico na Gaveta: ${formatCurrency(cashTotal)}\n`;
    report += `Esperado: ${formatCurrency(expectedCash)} (Abertura: ${formatCurrency(
      parseValue(cashSummary.opening)
    )} | ${pdvName}: ${formatCurrency(parseValue(cashSummary.jclanCash))} | Pags: ${formatCurrency(
      parseValue(cashSummary.expenses)
    )})\n`;
    report += `Diferença: ${formatCurrency(cashDifference)} ${
      Math.abs(cashDifference) < 0.01 ? '(Batendo 100%!)' : cashDifference > 0 ? '(Sobra)' : '(Falta)'
    }\n\n`;

    const incKeys = Object.keys(inclusionCommands);
    const excKeys = Object.keys(customCommands);

    if (
      incKeys.some((k) => inclusionCommands[k]?.length > 0) ||
      excKeys.some((k) => customCommands[k]?.length > 0)
    ) {
      report += `🛠️ REGISTRO DE CORREÇÕES (Calculadora)\n`;
      incKeys.forEach((k) => {
        if (inclusionCommands[k]?.length > 0) {
          report += `- Inclusões simuladas (${k}): ${inclusionCommands[k].map((i) => i.name).join(', ')}\n`;
        }
      });
      excKeys.forEach((k) => {
        if (customCommands[k]?.length > 0) {
          report += `- Exclusões simuladas (${k}): ${customCommands[k].map((i) => i.name).join(', ')}\n`;
        }
      });
    } else {
      report += `🛠️ REGISTRO DE CORREÇÕES\nNenhuma correção manual registrada.\n`;
    }

    // Opções de zeramento marcadas pelo operador para o fechamento final
    const selectedExclusionEntries = Object.entries(selectedExclusionOptions);
    if (selectedExclusionEntries.length > 0) {
      report += `\n🎯 OPÇÕES DE ZERAMENTO APLICADAS NO FECHAMENTO:\n`;
      selectedExclusionEntries.forEach(([label, opt]) => {
        report += `• [${label}] ${opt.title}\n`;
        report += `  ↳ Instrução: ${opt.instruction}\n`;
        report += `  ↳ Desconto / Ajuste: ${formatCurrency(opt.diff)}\n`;
      });
    }

    // Registro de Auditoria contínua de preenchimentos do operador no turno
    if (auditLogs.length > 0) {
      report += `\n📋 REGISTRO DE AUDITORIA DO TURNO (Ações do Operador):\n`;
      const recentLogs = auditLogs.slice(0, 12);
      recentLogs.forEach((log) => {
        report += `• [${log.timestamp}] [${log.category.toUpperCase()}] ${log.action} - ${log.details} (${log.operator})\n`;
      });
      if (auditLogs.length > 12) {
        report += `  ↳ ... e mais ${auditLogs.length - 12} registros detalhados gravados na nuvem.\n`;
      }
    }

    return report;
  };

  const handleOpenSaveClosingModal = () => {
    if (getnetTotal === 0 && jclanTotal === 0 && cashTotal === 0) {
      showToast('Preencha os valores antes de salvar.');
      return;
    }
    setIsSaveClosingModalOpen(true);
  };

  const handleConfirmSaveClosing = async (comments: string, attachments: string[]) => {
    const startMs = shiftStartTime || (Date.now() - 10 * 60 * 1000);
    const nowMs = Date.now();
    const durationSec = Math.max(20, Math.round((nowMs - startMs) / 1000));
    const mins = Math.floor(durationSec / 60);
    const secs = durationSec % 60;
    const durFormatted = mins > 0 ? `${mins} min ${secs}s` : `${secs}s`;
    const shiftStartedAtStr = new Date(startMs).toLocaleTimeString('pt-BR').slice(0, 5);

    let reportText = generateReportText();
    reportText += `\n⏱️ TEMPO DE FECHAMENTO: ${durFormatted} (Início às ${shiftStartedAtStr})\n`;
    if (comments) {
      reportText += `\n📝 OBSERVAÇÕES DO OPERADOR:\n${comments}\n`;
    }
    if (attachments && attachments.length > 0) {
      reportText += `\n📸 COMPROVANTES ANEXADOS: ${attachments.length} foto(s)/print(s) arquivados na nuvem.\n`;
    }

    const newRecord: HistoryRecord = {
      id: Date.now(),
      tenantId: currentTenant.id,
      date: new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR').slice(0, 5),
      operator: currentOperator?.name,
      getnet: getnetTotal,
      jclan: jclanTotal,
      diff: differenceTotal,
      cashDiff: cashDifference,
      report: reportText,
      comments: comments || undefined,
      attachments: attachments && attachments.length > 0 ? attachments : undefined,
      selectedExclusionOptions:
        Object.keys(selectedExclusionOptions).length > 0 ? selectedExclusionOptions : undefined,
      auditTrail: auditLogs.length > 0 ? auditLogs.slice(0, 50) : undefined,
      durationSeconds: durationSec,
      durationFormatted: durFormatted,
      shiftStartedAt: shiftStartedAtStr,
    };

    addAuditLog(
      'sistema',
      'Fechamento de Caixa Salvo',
      `Fechamento salvo por ${currentOperator?.name || 'Operador'} em ${durFormatted} (Diferença Cartões: ${formatCurrency(
        differenceTotal
      )}, Gaveta: ${formatCurrency(cashDifference)})`
    );

    setCloudSyncStatus('syncing');
    try {
      const saved = await saasApi.saveClosing(currentTenant.id, newRecord);
      setHistory((prev) => [saved, ...prev.filter((h) => h.id !== saved.id)]);
      setCloudSyncStatus('synced');
      showToast('Fechamento e comprovantes salvos na nuvem com sucesso!');
    } catch {
      setHistory((prev) => [newRecord, ...prev]);
      setCloudSyncStatus('offline');
      showToast('Salvo em cache local.');
    }
    setReportModal(reportText);
  };

  const confirmAndClear = () => {
    setReportModal(null);
    setJclan({ credit: '', debit: '', pix: '', voucher: '' });
    setMachines(initialMachines);
    setCash({
      b200: '',
      b100: '',
      b50: '',
      b20: '',
      b10: '',
      b5: '',
      b2: '',
      c1: '',
      c050: '',
      c025: '',
      c010: '',
      c005: '',
    });
    setCashSummary({ opening: '', jclanCash: '', expenses: '' });
    setCustomCommands({});
    setInclusionCommands({});
    setSelectedExclusionOptions({});
    const now = Date.now();
    setShiftStartTime(now);
    try {
      localStorage.setItem('fechacaixa_shift_start_time', now.toString());
    } catch {
      // ignore
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast('Fechamento salvo e novo turno pronto!');
  };

  const deleteRecord = async (id: number) => {
    try {
      await saasApi.deleteClosing(currentTenant.id, id);
    } catch (e) {
      console.warn('Erro ao deletar da nuvem:', e);
    }
    setHistory((prev) => prev.filter((item) => item.id !== id));
    showToast('Registro excluído com sucesso.');
  };

  const copyToClipboard = async (text: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        showToast('Relatório copiado para a área de transferência!');
        return;
      }
    } catch {
      // Fallback
    }
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-9999px';
      textArea.style.top = '-9999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      showToast('Relatório copiado para a área de transferência!');
    } catch {
      showToast('Erro ao copiar automaticamente. Selecione e copie manualmente.');
    }
  };

  // --- OCR VIA SERVIDOR / GEMINI API ---
  const handleImageUpload = async (machineId: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoadingMachineId(machineId);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      try {
        const base64Data = (reader.result as string).split(',')[1];
        const res = await fetch('/api/ocr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64: base64Data,
            mimeType: file.type,
            customApiKey: apiKey || undefined,
          }),
        });

        const result = await res.json();
        if (!res.ok || result.error) {
          throw new Error(result.error || 'Erro ao processar comprovante.');
        }

        setMachines((prev) =>
          prev.map((m) => {
            if (m.id === machineId) {
              const fill = (arr: any = []) => {
                const n = ['', '', '', '', ''];
                if (Array.isArray(arr)) arr.slice(0, 5).forEach((v, i) => (n[i] = v ? String(v).trim() : ''));
                return n;
              };
              return {
                ...m,
                credits: fill(result.credits),
                debits: fill(result.debits),
                vouchers: fill(result.vouchers),
                pix: result.pix ? String(result.pix).trim() : '',
                collapsed: false,
              };
            }
            return m;
          })
        );
        addAuditLog('cartoes', `Leitura OCR Maquininha #${machineId}`, 'Comprovante analisado e valores preenchidos via IA');
        showToast('Extrato da maquininha lido com sucesso pela IA!');
      } catch (error: any) {
        showToast(`Erro na IA: ${error.message}`);
      } finally {
        setLoadingMachineId(null);
        event.target.value = '';
      }
    };
  };

  const handleGlobalImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []).slice(0, 6);
    if (!files.length) return;

    setIsGlobalLoading(true);
    try {
      const base64Promises = files.map(
        (file) =>
          new Promise<{ base64: string; mimeType: string }>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve({ mimeType: file.type, base64: (reader.result as string).split(',')[1] });
            reader.readAsDataURL(file);
          })
      );
      const imageObjects = await Promise.all(base64Promises);

      const res = await fetch('/api/ocr-multi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images: imageObjects,
          customApiKey: apiKey || undefined,
        }),
      });

      const resultList = await res.json();
      if (!res.ok || resultList.error) {
        throw new Error(resultList.error || 'Erro ao processar lote de imagens.');
      }

      setMachines((prev) => {
        const newMachines = [...prev];
        resultList.forEach((result: any, index: number) => {
          const fill = (arr: any = []) => {
            const n = ['', '', '', '', ''];
            if (Array.isArray(arr)) arr.slice(0, 5).forEach((v, i) => (n[i] = v ? String(v).trim() : ''));
            return n;
          };
          const newMachineData = {
            credits: fill(result.credits),
            debits: fill(result.debits),
            vouchers: fill(result.vouchers),
            pix: result.pix ? String(result.pix).trim() : '',
            collapsed: false,
          };
          if (index < newMachines.length) {
            newMachines[index] = { ...newMachines[index], ...newMachineData };
          } else {
            newMachines.push({ id: 0, ...newMachineData });
          }
        });
        return newMachines.map((m, idx) => ({ ...m, id: idx + 1 }));
      });
      addAuditLog('cartoes', `Leitura OCR Global (${resultList.length} fotos)`, 'Comprovantes processados e distribuídos automaticamente');
      showToast(`${resultList.length} comprovante(s) lidos e preenchidos automaticamente!`);
    } catch (error: any) {
      showToast(`Erro no upload múltiplo: ${error.message}`);
    } finally {
      setIsGlobalLoading(false);
      event.target.value = '';
    }
  };

  // --- MOTOR DE RECONCILIAÇÃO ---
  const generateRecommendations = () => {
    const diffs = [
      { id: 'dinheiro', label: 'Dinheiro', diff: cashDifference, order: 1 },
      { id: 'pix', label: 'Pix', diff: getnetPix - jclanPix, order: 2 },
      { id: 'credito', label: 'Crédito', diff: getnetCredit - jclanCredit, order: 3 },
      { id: 'debito', label: 'Débito', diff: getnetDebit - jclanDebit, order: 4 },
      { id: 'voucher', label: 'Voucher', diff: getnetVoucher - jclanVoucher, order: 5 },
    ];

    const needs = diffs
      .filter((d) => d.diff > 0.01)
      .map((d) => ({ ...d, amount: d.diff }))
      .sort((a, b) => a.order - b.order);
    const excesses = diffs
      .filter((d) => d.diff < -0.01)
      .map((d) => ({ ...d, amount: Math.abs(d.diff) }))
      .sort((a, b) => a.order - b.order);
    const instructions: Array<{ from: string; to: string; amount: number }> = [];
    let nIdx = 0;
    let eIdx = 0;

    while (nIdx < needs.length && eIdx < excesses.length) {
      const need = needs[nIdx];
      const excess = excesses[eIdx];
      const transferAmount = Math.min(need.amount, excess.amount);
      if (transferAmount > 0.01) {
        instructions.push({ from: excess.label, to: need.label, amount: transferAmount });
      }
      need.amount -= transferAmount;
      excess.amount -= transferAmount;
      if (need.amount <= 0.01) nIdx++;
      if (excess.amount <= 0.01) eIdx++;
    }

    const unresolvable: Array<{ type: 'sobra' | 'falta'; label: string; amount: number }> = [];
    while (nIdx < needs.length) {
      if (needs[nIdx].amount > 0.01) {
        unresolvable.push({ type: 'sobra', label: needs[nIdx].label, amount: needs[nIdx].amount });
      }
      nIdx++;
    }
    while (eIdx < excesses.length) {
      if (excesses[eIdx].amount > 0.01) {
        unresolvable.push({ type: 'falta', label: excesses[eIdx].label, amount: excesses[eIdx].amount });
      }
      eIdx++;
    }
    return { instructions, unresolvable };
  };

  const { instructions, unresolvable } = generateRecommendations();
  const hasDivergences = instructions.length > 0 || unresolvable.length > 0;

  // --- PRIMEIRA PÁGINA DO SISTEMA: PAINEL MASTER SAAS ---
  if (appMode === 'master') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
        {toastMsg && (
          <div className="fixed top-4 right-4 bg-slate-800 text-white px-5 py-3 rounded-xl shadow-2xl z-[999] flex items-center gap-3 border border-slate-700 animate-bounce-subtle">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
            <span className="font-medium text-sm">{toastMsg}</span>
          </div>
        )}

        <MasterPanelModal
          isOpen={true}
          isFullPageView={true}
          onClose={() => {}}
          tenants={tenants}
          stats={masterStats}
          onSelectTenant={(t) => {
            setCurrentTenant(t);
            setIsMasterSession(true);
            setAppMode('bar');
            setIsAuthenticated(true);
            setCurrentOperator({
              id: 999,
              tenantId: t.id,
              name: 'Bruno (Dono)',
              pin: '1917',
              isAdmin: true,
            });
            showToast(`Inspecionando operação de caixa: ${t.name}`);
          }}
          onInspectTenant={(t) => {
            setCurrentTenant(t);
            setIsMasterSession(true);
            setAppMode('bar');
            setIsAuthenticated(true);
            setCurrentOperator({
              id: 999,
              tenantId: t.id,
              name: 'Bruno (Dono)',
              pin: '1917',
              isAdmin: true,
            });
            showToast(`Inspecionando operação de caixa: ${t.name}`);
          }}
          onOpenBarAdmin={(t) => {
            setCurrentTenant(t);
            setIsMasterSession(true);
            setAppMode('bar');
            setIsAuthenticated(true);
            setCurrentOperator({
              id: 999,
              tenantId: t.id,
              name: 'Bruno (Dono)',
              pin: '1917',
              isAdmin: true,
            });
            setIsAdminOpen(true);
            showToast(`Área do Administrador aberta para: ${t.name}`);
          }}
          onToggleBlockTenant={handleToggleBlockTenant}
          onCreateTenant={handleCreateTenant}
          onOpenMenuManager={(t) => {
            setTenantForMenuModal(t);
            setIsMenuManagerOpen(true);
          }}
          onOpenBilling={(t) => {
            setCurrentTenant(t);
            setIsBillingOpen(true);
          }}
          onShowToast={showToast}
          onMasterAuthenticated={() => setIsMasterSession(true)}
          onLogoutMaster={() => setIsMasterSession(false)}
        />

        {/* Modais Gerenciais Disparados do Master */}
        {isBillingOpen && currentTenant && (
          <BarBillingModal
            isOpen={isBillingOpen}
            onClose={() => setIsBillingOpen(false)}
            tenant={currentTenant}
            invoices={invoices}
            onConfirmPayment={handleConfirmPayment}
            onShowToast={showToast}
          />
        )}

        {isMenuManagerOpen && tenantForMenuModal && (
          <MenuManagerModal
            isOpen={isMenuManagerOpen}
            onClose={() => {
              setIsMenuManagerOpen(false);
              setTenantForMenuModal(null);
            }}
            tenant={tenantForMenuModal}
            menu={tenantForMenuModal.id === currentTenant?.id ? currentMenu : menuModalItems}
            onSaveMenu={handleSaveMenu}
            onShowToast={showToast}
          />
        )}
      </div>
    );
  }

  // --- TELA DE LOGIN EXCLUSIVA DO BAR (ISOLADA MULTI-TENANT) ---
  if (!isAuthenticated) {
    const isCurrentBarBlocked = currentTenant?.status === 'bloqueado' || currentTenant?.status === 'inadimplente';
    const tenantTheme = getTheme(currentTenant?.themeColor);
    const bgUrl = currentTenant?.loginBgImage || 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=1920&q=80';

    const handleLoginAsAdminPrompt = (e: React.FormEvent) => {
      e.preventDefault();
      const pinTrimmed = loginAdminPin.trim();
      const adminUser = users.find((u) => u.isAdmin && u.pin === pinTrimmed);
      if (adminUser || pinTrimmed === 'master2026' || pinTrimmed === '1917') {
        const op = adminUser || users.find((u) => u.isAdmin) || users[0];
        setCurrentOperator(op);
        setIsAuthenticated(true);
        setIsAdminOpen(true);
        setLoginAdminPrompt(false);
        setLoginAdminPin('');
        showToast(`Bem-vindo à Área Admin de ${currentTenant.name}!`);
      } else {
        showToast('PIN de administrador inválido para esta casa.');
      }
    };

    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center p-4 font-sans text-slate-100 relative bg-cover bg-center overflow-x-hidden"
        style={{ backgroundImage: `url(${bgUrl})` }}
      >
        {/* Dark overlay com leve blur para legibilidade impecável */}
        <div className="absolute inset-0 bg-black/75 backdrop-blur-[3px]" />

        {toastMsg && (
          <div className="fixed top-4 right-4 bg-slate-800 text-white px-5 py-3 rounded-xl shadow-2xl z-50 flex items-center gap-3 border border-slate-700 animate-fade-in">
            <AlertCircle className="w-5 h-5 text-amber-400" />
            <span className="font-medium text-sm">{toastMsg}</span>
          </div>
        )}

        {/* Banner de Inspeção para o Dono do SaaS */}
        {isMasterSession && (
          <div className="relative z-10 w-full max-w-md mb-3 flex items-center justify-between bg-indigo-950/90 border border-indigo-500/50 px-4 py-2.5 rounded-2xl text-xs text-white shadow-lg animate-fade-in">
            <div className="flex items-center gap-2">
              <span className="bg-amber-400 text-slate-950 font-black text-[10px] uppercase px-2 py-0.5 rounded shadow-xs">
                Dono Master
              </span>
              <span className="text-slate-300 font-semibold">Modo Inspeção</span>
            </div>
            <button
              onClick={() => {
                setAppMode('master');
                window.history.pushState({}, '', window.location.pathname);
              }}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-3 py-1 rounded-xl text-xs transition-colors cursor-pointer flex items-center gap-1 shadow-sm"
            >
              <span>← Voltar ao Master</span>
            </button>
          </div>
        )}

        {/* Modal de PIN para Acesso Rápido do Administrador do Bar */}
        {loginAdminPrompt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-[#121212] border border-slate-800 p-6 rounded-3xl shadow-2xl w-full max-w-sm relative">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-amber-400" />
                  <h4 className="text-sm font-black text-white">Área do Administrador</h4>
                </div>
                <button
                  onClick={() => setLoginAdminPrompt(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-xs text-slate-400 mb-4">
                Digite o PIN de administrador cadastrado no <strong>{currentTenant.name}</strong> para gerenciar operadores, histórico e cores da loja.
              </p>
              <form onSubmit={handleLoginAsAdminPrompt} className="space-y-4">
                <input
                  type="password"
                  autoFocus
                  required
                  value={loginAdminPin}
                  onChange={(e) => setLoginAdminPin(e.target.value)}
                  placeholder="PIN Admin (ex: 1917)"
                  className="w-full bg-[#181818] border border-slate-700 rounded-xl p-3 text-center text-sm font-mono font-bold text-white focus:ring-2 focus:ring-amber-500 outline-none"
                />
                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-slate-950 font-black py-3 rounded-xl shadow-lg transition-all text-xs cursor-pointer"
                >
                  Acessar Painel do Bar
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Logo Oficial FechaCaixa no Topo da Tela de Login */}
        <div className="relative z-10 mb-5 animate-fade-in flex flex-col items-center">
          <FechaCaixaLogo size="md" variant="horizontal" showSubtitle={true} />
        </div>

        <div className="relative z-10 bg-[#0B1528]/95 border border-slate-700/80 p-8 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden backdrop-blur-md">
          {/* Faixa decorativa de topo com as cores do bar */}
          <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${currentTenant?.logoColor || tenantTheme.logoGradient}`} />

          {/* Cabeçalho do Bar Selecionado */}
          <div className="flex flex-col items-center mb-6">
            <div
              className={`w-16 h-16 bg-gradient-to-tr ${
                currentTenant?.logoColor || tenantTheme.logoGradient
              } rounded-2xl flex items-center justify-center text-white mb-3 shadow-lg font-black text-xl tracking-wider`}
            >
              {currentTenant?.logoInitials || 'FB'}
            </div>
            <h1 className="text-2xl font-black text-white tracking-wide text-center">
              {currentTenant?.name || 'Flor de Brasa'}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className={`${tenantTheme.accentText} font-bold text-xs uppercase tracking-widest`}>
                Fechamento de Caixa
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-slate-400 text-xs font-medium">{currentTenant?.city || 'Curitiba - PR'}</span>
            </div>

            {/* Aviso de Bar Bloqueado no SaaS */}
            {isCurrentBarBlocked && (
              <div className="mt-3 bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs px-3.5 py-2.5 rounded-xl flex items-center gap-2 text-left">
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                <div>
                  <strong className="block font-black">Acesso Suspenso:</strong>
                  <span>Assinatura pendente de pagamento no SaaS. Entre em contato com a administração.</span>
                </div>
              </div>
            )}
          </div>

          {/* Seletor de Bar (Exibido EXCLUSIVAMENTE para o Dono em Sessão Master) */}
          {isMasterSession && (
            <div className="mb-5 bg-indigo-950/70 p-3 rounded-2xl border border-indigo-500/50">
              <label className="block text-[10px] font-black text-indigo-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>Restaurante / Bar Ativo (Modo Dono):</span>
                <span className="text-amber-300 text-[10px] font-bold">Acesso Master</span>
              </label>
              <select
                value={currentTenant?.id || ''}
                onChange={(e) => {
                  const found = tenants.find((t) => t.id === e.target.value);
                  if (found) {
                    setCurrentTenant(found);
                    showToast(`Bar alterado para: ${found.name}`);
                  }
                }}
                className="w-full bg-[#181818] border border-indigo-400/50 rounded-xl p-2.5 text-xs font-bold text-white focus:ring-2 focus:ring-amber-500 outline-none cursor-pointer"
              >
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.city}) {t.status === 'bloqueado' ? '⛔ [Bloqueado]' : '✓ [Ativo]'}
                  </option>
                ))}
              </select>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Nome do Operador
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  <UserIcon className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  value={loginForm.name}
                  onChange={(e) => setLoginForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: bruno"
                  className={`w-full bg-[#181818] border border-slate-700 rounded-xl p-3 pl-10 text-sm font-semibold text-white ${tenantTheme.ringFocus} outline-none transition-all placeholder:text-slate-500`}
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Senha / PIN
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type="password"
                  value={loginForm.pin}
                  onChange={(e) => setLoginForm((prev) => ({ ...prev, pin: e.target.value }))}
                  placeholder="••••"
                  className={`w-full bg-[#181818] border border-slate-700 rounded-xl p-3 pl-10 text-sm font-semibold text-white ${tenantTheme.ringFocus} outline-none transition-all placeholder:text-slate-500`}
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={isCurrentBarBlocked}
              className={`w-full font-black p-3.5 rounded-xl shadow-lg transition-all mt-3 flex items-center justify-center gap-2 cursor-pointer ${
                isCurrentBarBlocked
                  ? 'bg-rose-900/60 text-rose-300 border border-rose-700/50 cursor-not-allowed opacity-80'
                  : `${tenantTheme.btnGradient} ${tenantTheme.btnHover} text-white shadow-lg active:scale-[0.99]`
              }`}
            >
              <span>{isCurrentBarBlocked ? 'Acesso Bloqueado pelo SaaS' : 'Entrar no Caixa'}</span>
              {!isCurrentBarBlocked && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          {/* Botão de Acesso Admin da Casa na Tela de Login */}
          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
            <p className="text-[11px] text-slate-400">
              Operadores:{' '}
              <span className="text-slate-300 font-semibold">
                {users.map((u) => u.name).join(', ') || 'Nenhum'}
              </span>
            </p>
            <button
              type="button"
              onClick={() => setLoginAdminPrompt(true)}
              className="text-[11px] text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 hover:underline cursor-pointer"
              title="Acessar painel do administrador deste bar"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Área Admin</span>
            </button>
          </div>

          {/* Rodapé Isolado do Bar (Sem botão ou link de acesso master para operadores) */}
          <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-400">
            <span className="flex items-center gap-1.5 font-bold">
              <span className="text-white">Fecha</span>
              <span className="text-emerald-400">Caixa</span>
              <span className="text-slate-500 font-normal">• Conciliação & Auditoria</span>
            </span>
            <span className="text-emerald-400 font-mono text-[9px] bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">v3.0</span>
          </div>
        </div>
      </div>
    );
  }

  // --- TELA PRINCIPAL DO APLICATIVO ---
  return (
    <div className="min-h-screen pb-24 font-sans text-slate-800 bg-slate-100">
      {toastMsg && (
        <div className="fixed top-4 right-4 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-2xl z-[999] flex items-center gap-3 border border-slate-700 animate-bounce-subtle">
          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
          <span className="font-medium text-sm">{toastMsg}</span>
        </div>
      )}

      {/* Datalist Global do Cardápio Flor de Brasa */}
      {/* Datalist Global do Cardápio Dinâmico do Bar */}
      <datalist id="flor-de-brasa-menu-list">
        {currentMenu.map((item, idx) => (
          <option key={idx} value={item.name}>
            {formatCurrency(item.price)} - {item.cat}
          </option>
        ))}
      </datalist>

      {/* Barra de Supervisão do Dono Master (Exibida EXCLUSIVAMENTE para o Dono em Sessão Master) */}
      {isMasterSession && (
        <div className="bg-gradient-to-r from-indigo-950 via-purple-950 to-slate-900 border-b border-indigo-500/40 text-white px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs z-50 sticky top-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="bg-amber-400 text-slate-950 font-black text-[10px] uppercase px-2 py-0.5 rounded shadow-sm flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> Dono do SaaS
            </span>
            <span className="text-slate-300 font-semibold text-xs">Inspecionando Casa:</span>
            <select
              value={currentTenant.id}
              onChange={(e) => {
                const found = tenants.find((t) => t.id === e.target.value);
                if (found) {
                  setCurrentTenant(found);
                  showToast(`Inspecionando: ${found.name}`);
                }
              }}
              className="bg-slate-900 border border-indigo-400/60 rounded-lg px-2.5 py-1 text-white font-bold text-xs outline-none cursor-pointer"
            >
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.city}) - {t.status}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setAppMode('master');
                window.history.pushState({}, '', window.location.pathname);
              }}
              className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 px-3 py-1.5 rounded-xl font-black flex items-center gap-1.5 transition-all text-xs cursor-pointer shadow-md"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>← Voltar ao Painel Master SaaS</span>
            </button>
            <button
              onClick={() => {
                setIsMasterSession(false);
                setAppMode('master');
                window.history.pushState({}, '', window.location.pathname);
                showToast('Modo Master finalizado.');
              }}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1.5 rounded-xl text-xs font-semibold cursor-pointer"
            >
              Sair da Inspeção
            </button>
          </div>
        </div>
      )}

      {/* Barra Superior de Usuário & SaaS Multi-Tenant */}
      <header className="bg-slate-900 text-white px-4 py-3 flex flex-wrap justify-between items-center text-sm font-bold shadow-md sticky top-0 z-40 gap-2">
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Identidade do Bar (Isolada: sem seletor de outros bares para operadores) */}
          {isMasterSession ? (
            <StoreSwitcher
              tenants={tenants}
              currentTenant={currentTenant}
              onSelectTenant={handleSelectTenant}
              onOpenMasterPanel={() => {
                setAppMode('master');
                window.history.pushState({}, '', window.location.pathname);
              }}
              onOpenBilling={() => setIsBillingOpen(true)}
            />
          ) : (
            <div className="flex items-center gap-2 bg-slate-800/90 text-white px-3 py-1.5 rounded-xl border border-slate-700 text-xs font-bold shadow-sm select-none">
              <div
                className={`w-5 h-5 rounded-md bg-gradient-to-tr ${currentTenant.logoColor} flex items-center justify-center font-black text-[10px] text-white shadow-xs`}
              >
                {currentTenant.logoInitials}
              </div>
              <div className="flex flex-col text-left">
                <span className="leading-tight truncate max-w-[140px] sm:max-w-[200px]">{currentTenant.name}</span>
                <span className="text-[9px] text-slate-400 font-normal leading-none">{currentTenant.city}</span>
              </div>
            </div>
          )}

          <div className="hidden lg:flex items-center">
            <FechaCaixaLogo size="sm" variant="badge" />
          </div>

          <div className="h-6 w-px bg-slate-700 hidden sm:block" />

          {/* Indicador de Nuvem (Fase 1) */}
          <div className="flex items-center gap-1.5 text-xs bg-slate-800/90 px-2.5 py-1.5 rounded-xl border border-slate-700 text-slate-300">
            <span
              className={`w-2 h-2 rounded-full ${
                cloudSyncStatus === 'synced'
                  ? 'bg-emerald-400 animate-pulse'
                  : cloudSyncStatus === 'syncing'
                  ? 'bg-amber-400 animate-ping'
                  : 'bg-rose-400'
              }`}
            />
            <span className="font-semibold text-[11px] hidden md:inline">
              {cloudSyncStatus === 'synced'
                ? 'Nuvem Conectada'
                : cloudSyncStatus === 'syncing'
                ? 'Sincronizando...'
                : 'Offline'}
            </span>
          </div>

          {/* Identificação do Operador */}
          <div className="flex items-center gap-1.5 text-slate-300 font-medium text-xs">
            <UserIcon className="w-4 h-4 text-orange-400" />
            <span className="hidden sm:inline">Operador:</span>
            <span className="text-white font-bold capitalize">{currentOperator?.name}</span>
            {currentOperator?.isAdmin && (
              <span className="bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded text-[10px] font-bold uppercase border border-amber-500/30">
                Admin
              </span>
            )}
          </div>

          {/* Cronômetro de Turno do Operador (Tempo decorrido de fechamento) */}
          <div
            className="flex items-center gap-1.5 text-xs bg-slate-800/90 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-xl border border-slate-700 text-amber-300 font-mono shadow-xs select-none"
            title={`Turno de fechamento iniciado às ${new Date(shiftStartTime).toLocaleTimeString('pt-BR').slice(0, 5)} - Métrica de produtividade do operador`}
          >
            <Timer className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span className="font-bold text-[11px]">
              {liveShiftMinutes === 0 ? '< 1 min' : `${liveShiftMinutes} min`}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Botão Guia / Tutorial de Fechamento */}
          <button
            onClick={() => setIsGuideOpen(true)}
            className="text-xs bg-slate-800 hover:bg-slate-700 text-amber-300 px-2.5 py-1.5 rounded-lg border border-slate-700 transition-colors flex items-center gap-1.5 font-bold shadow-sm cursor-pointer"
            title="Abrir Guia e Tutorial de Fechamento Passo a Passo"
          >
            <BookOpen className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Guia Passo a Passo</span>
          </button>

          {/* Botão Ver Auditoria do Turno */}
          <button
            onClick={() => setIsAuditDrawerOpen(true)}
            className="text-xs bg-slate-800 hover:bg-slate-700 text-cyan-300 px-2.5 py-1.5 rounded-lg border border-slate-700 transition-colors flex items-center gap-1.5 font-bold shadow-sm cursor-pointer relative"
            title="Ver Auditoria do Turno em Tempo Real"
          >
            <ClipboardList className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden md:inline">Auditoria</span>
            <span className="bg-cyan-500/20 text-cyan-300 text-[10px] px-1.5 py-0.2 rounded-full font-bold border border-cyan-500/30">
              {auditLogs.length}
            </span>
          </button>

          {/* Botão Painel Admin da Loja (Apenas para Administrador) */}
          {currentOperator?.isAdmin && (
            <button
              onClick={() => setIsAdminOpen(true)}
              className="text-xs bg-slate-800 hover:bg-slate-700 text-amber-400 px-3 py-1.5 rounded-lg border border-slate-700 transition-colors flex items-center gap-1.5 font-bold shadow-sm cursor-pointer"
              title="Acessar Área do Administrador do Bar"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>Admin</span>
            </button>
          )}

          {/* Botão Painel Master (Exibido EXCLUSIVAMENTE para o Dono em Sessão Master) */}
          {isMasterSession && (
            <button
              onClick={() => {
                setAppMode('master');
                window.history.pushState({}, '', window.location.pathname);
              }}
              className="text-xs bg-gradient-to-r from-indigo-700 to-purple-700 hover:from-indigo-600 hover:to-purple-600 text-white px-2.5 py-1.5 rounded-lg border border-indigo-500/50 transition-all flex items-center gap-1.5 font-black shadow-sm cursor-pointer"
              title="Voltar ao Painel Master SaaS"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span className="hidden md:inline">Painel Master</span>
            </button>
          )}

          <button
            onClick={() => setIsAuthenticated(false)}
            className="text-xs bg-slate-800 hover:bg-rose-950/60 hover:text-rose-300 text-slate-300 px-2.5 py-1.5 rounded-lg border border-slate-700 transition-colors flex items-center gap-1 font-bold cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      </header>

      {/* Modal Painel Admin Exclusivo do Bar (Contém Cardápio, Assinatura, Configuração IA Gemini, Operadores e Aparência) */}
      {isAdminOpen && (
        <BarAdminModal
          isOpen={isAdminOpen}
          onClose={() => setIsAdminOpen(false)}
          tenant={currentTenant}
          currentOperator={currentOperator}
          users={users}
          history={history}
          menu={currentMenu}
          invoices={invoices}
          apiKey={apiKey}
          onSaveApiKey={(key) => {
            setApiKey(key);
            localStorage.setItem('geminiApiKey', key);
          }}
          onAddUser={handleBarAdminAddUser}
          onUpdateUser={handleBarAdminUpdateUser}
          onDeleteUser={handleRemoveUser}
          onDeleteClosing={deleteRecord}
          onSaveMenu={handleSaveMenu}
          onConfirmPayment={handleConfirmPayment}
          onUpdateTenantAppearance={handleUpdateTenantAppearance}
          onZoomImage={(url) => setZoomImageUrl(url)}
          onShowToast={showToast}
        />
      )}

      {/* Modal de Fechamento Salvo */}
      {reportModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-5 border-b border-emerald-500/20 bg-emerald-600 text-white">
              <h3 className="font-black text-white flex items-center gap-2">
                <Check className="w-5 h-5" /> Fechamento Validado!
              </h3>
            </div>
            <div className="p-6 overflow-y-auto bg-slate-50 flex-1">
              <p className="text-sm text-slate-600 mb-4 font-medium">
                O caixa foi salvo no histórico com sucesso. Aqui está o relatório pronto para conferência ou envio:
              </p>
              <pre className="bg-white p-4 rounded-xl border border-slate-200 text-xs text-slate-700 whitespace-pre-wrap font-mono shadow-inner leading-relaxed">
                {reportModal}
              </pre>
            </div>
            <div className="p-5 border-t border-slate-100 bg-white grid grid-cols-1 gap-3">
              <button
                onClick={() => copyToClipboard(reportModal)}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all"
              >
                <Copy className="w-4 h-4" /> Copiar para WhatsApp
              </button>
              <button
                onClick={confirmAndClear}
                className="w-full bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-bold py-3.5 rounded-xl transition-all"
              >
                Iniciar Novo Turno (Limpar Tela)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SE O BAR ESTIVER BLOQUEADO / INADIMPLENTE NO SAAS (FASE 3 & 4) */}
      {currentTenant.status === 'bloqueado' || currentTenant.status === 'inadimplente' ? (
        <div className="max-w-4xl mx-auto p-4 sm:p-6 mt-8">
          <SuspendedBarBanner
            tenant={currentTenant}
            invoice={invoices[0]}
            onConfirmPayment={handleConfirmPayment}
            onOpenMasterPanel={() => setIsMasterOpen(true)}
            onSwitchTenant={() => {
              const activeOne = tenants.find((t) => t.status === 'ativo');
              if (activeOne) setCurrentTenant(activeOne);
            }}
            onShowToast={showToast}
          />
        </div>
      ) : (
        <>
          {/* Barra Fixa de Comparação (Topo Sticky) */}
          <div id="pdv-totals-bar" className="sticky top-[53px] z-40 bg-white/95 backdrop-blur-md shadow-sm border-b border-slate-200 p-4 mb-6 transition-all">
        <div className="max-w-7xl mx-auto flex flex-col xl:flex-row gap-4 items-center justify-between">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full xl:w-auto flex-1">
            <ComparisonCard
              title="Crédito"
              getnetVal={getnetCredit}
              jclanVal={jclan.credit}
              field="credit"
              iconColor="bg-blue-500"
              cardName={currentTenant.cardSystemName || 'Getnet'}
              pdvName={currentTenant.pdvSystemName || 'Jclan'}
              onJclanChange={handleJclanChange}
              onKeyDown={handleJclanKeyDown}
            />
            <ComparisonCard
              title="Débito"
              getnetVal={getnetDebit}
              jclanVal={jclan.debit}
              field="debit"
              iconColor="bg-orange-500"
              cardName={currentTenant.cardSystemName || 'Getnet'}
              pdvName={currentTenant.pdvSystemName || 'Jclan'}
              onJclanChange={handleJclanChange}
              onKeyDown={handleJclanKeyDown}
            />
            <ComparisonCard
              title="Pix"
              getnetVal={getnetPix}
              jclanVal={jclan.pix}
              field="pix"
              iconColor="bg-teal-500"
              cardName={currentTenant.cardSystemName || 'Getnet'}
              pdvName={currentTenant.pdvSystemName || 'Jclan'}
              onJclanChange={handleJclanChange}
              onKeyDown={handleJclanKeyDown}
            />
            <ComparisonCard
              title="Voucher"
              getnetVal={getnetVoucher}
              jclanVal={jclan.voucher}
              field="voucher"
              iconColor="bg-purple-500"
              cardName={currentTenant.cardSystemName || 'Getnet'}
              pdvName={currentTenant.pdvSystemName || 'Jclan'}
              onJclanChange={handleJclanChange}
              onKeyDown={handleJclanKeyDown}
            />
          </div>

          <div className="flex gap-4 items-center w-full xl:w-auto justify-end bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div
              className={`px-4 py-2 rounded-lg border-2 ${
                Math.abs(differenceTotal) < 0.01
                  ? 'bg-slate-200 text-slate-800 border-slate-300'
                  : differenceTotal > 0
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  : 'bg-rose-100 text-rose-800 border-rose-300'
              } text-center min-w-[140px]`}
            >
              <span className="block text-[10px] font-bold uppercase mb-0.5">
                {Math.abs(differenceTotal) < 0.01
                  ? 'Sem Diferença'
                  : differenceTotal > 0
                  ? `Sobra ${currentTenant.cardSystemName || 'Getnet'}`
                  : `Falta ${currentTenant.cardSystemName || 'Getnet'}`}
              </span>
              <span className="text-xl font-black">{formatCurrency(Math.abs(differenceTotal))}</span>
            </div>
            <button
              onClick={handleOpenSaveClosingModal}
              className={`${getTheme(currentTenant.themeColor).btnGradient} ${getTheme(currentTenant.themeColor).btnHover} text-white px-5 py-3 rounded-xl font-bold shadow-md whitespace-nowrap transition-all active:scale-[0.98] flex items-center gap-2 cursor-pointer`}
            >
              <FileText className="w-4 h-4" />
              <span>Salvar Fechamento</span>
            </button>
          </div>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <main className="max-w-7xl mx-auto px-4 space-y-6">
        {/* 1. GAVETA (DINHEIRO) */}
        <section id="section-cash-drawer" className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col md:flex-row transition-all">
          <div className="p-6 md:w-2/3 md:border-r border-slate-200">
            <div className="flex items-center gap-3 mb-6">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-800 text-white font-black text-sm">
                1
              </span>
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-600" />
                <span>Gaveta (Dinheiro Físico)</span>
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase mb-4 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Notas
                </h4>
                <div className="space-y-3">
                  {[
                    { l: 'R$ 200,00', f: 'b200' },
                    { l: 'R$ 100,00', f: 'b100' },
                    { l: 'R$ 50,00', f: 'b50' },
                    { l: 'R$ 20,00', f: 'b20' },
                    { l: 'R$ 10,00', f: 'b10' },
                    { l: 'R$ 5,00', f: 'b5' },
                    { l: 'R$ 2,00', f: 'b2' },
                  ].map((i, idx) => (
                    <div
                      key={i.f}
                      className="flex items-center justify-between bg-slate-50 p-2 rounded-lg border border-slate-100"
                    >
                      <span className="text-sm font-semibold text-slate-700 w-24">{i.l}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400">qtd:</span>
                        <input
                          id={`cash-${i.f}`}
                          type="text"
                          value={cash[i.f]}
                          onChange={(e) => handleCashChange(i.f, e.target.value)}
                          onKeyDown={(e) => handleCashKeyDown(e, 'notes', idx)}
                          className="w-16 bg-white border border-slate-300 rounded p-1.5 text-center text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none shadow-sm"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase mb-4 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Moedas
                </h4>
                <div className="space-y-3">
                  {[
                    { l: 'R$ 1,00', f: 'c1' },
                    { l: 'R$ 0,50', f: 'c050' },
                    { l: 'R$ 0,25', f: 'c025' },
                    { l: 'R$ 0,10', f: 'c010' },
                    { l: 'R$ 0,05', f: 'c005' },
                  ].map((i, idx) => (
                    <div
                      key={i.f}
                      className="flex items-center justify-between bg-slate-50 p-2 rounded-lg border border-slate-100"
                    >
                      <span className="text-sm font-semibold text-slate-700 w-24">{i.l}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400">qtd:</span>
                        <input
                          id={`cash-${i.f}`}
                          type="text"
                          value={cash[i.f]}
                          onChange={(e) => handleCashChange(i.f, e.target.value)}
                          onKeyDown={(e) => handleCashKeyDown(e, 'coins', idx)}
                          className="w-16 bg-white border border-slate-300 rounded p-1.5 text-center text-sm font-bold focus:ring-2 focus:ring-amber-500 outline-none shadow-sm"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Totalização da Gaveta */}
          <div className="p-6 md:w-1/3 flex flex-col rounded-b-xl md:rounded-r-xl bg-slate-900 text-white">
            <div className="flex flex-col items-center mb-6">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Total Físico na Gaveta
              </span>
              <span className="text-4xl font-black text-emerald-400 mt-1">{formatCurrency(cashTotal)}</span>
            </div>
            <div className="space-y-3.5 mb-6 w-full flex-1">
              <div className="flex justify-between items-center bg-slate-800/80 p-2.5 rounded-lg border border-slate-700/60">
                <span className="text-xs text-slate-300 font-medium">Abertura de Caixa</span>
                <input
                  type="text"
                  placeholder="0,00"
                  value={cashSummary.opening}
                  onChange={(e) => handleCashSummaryChange('opening', e.target.value)}
                  className="w-28 bg-slate-950 border border-slate-700 rounded p-1.5 text-right text-xs font-bold text-white focus:ring-1 focus:ring-orange-500 outline-none"
                />
              </div>
              <div className="flex justify-between items-center bg-slate-800/80 p-2.5 rounded-lg border border-slate-700/60">
                <span className="text-xs text-slate-300 font-medium">{currentTenant.pdvSystemName || 'Jclan'} (Dinheiro)</span>
                <input
                  type="text"
                  placeholder="0,00"
                  value={cashSummary.jclanCash}
                  onChange={(e) => handleCashSummaryChange('jclanCash', e.target.value)}
                  className="w-28 bg-slate-950 border border-slate-700 rounded p-1.5 text-right text-xs font-bold text-white focus:ring-1 focus:ring-orange-500 outline-none"
                />
              </div>
              <div className="flex justify-between items-center bg-slate-800/80 p-2.5 rounded-lg border border-slate-700/60">
                <span className="text-xs text-slate-300 font-medium">Pagamentos</span>
                <input
                  type="text"
                  placeholder="0,00"
                  value={cashSummary.expenses}
                  onChange={(e) => handleCashSummaryChange('expenses', e.target.value)}
                  className="w-28 bg-slate-950 border border-rose-900/60 rounded p-1.5 text-right text-xs font-bold text-rose-300 focus:ring-1 focus:ring-rose-500 outline-none"
                />
              </div>
            </div>
            <div className="pt-5 border-t border-slate-800 mt-auto">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-semibold text-slate-400">Caixa Esperado:</span>
                <span className="text-sm font-bold text-slate-200">{formatCurrency(expectedCash)}</span>
              </div>
              <div
                className={`p-3 rounded-lg border text-center ${
                  Math.abs(cashDifference) < 0.01
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                    : cashDifference > 0
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                    : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                }`}
              >
                <span className="text-[10px] font-bold uppercase mb-0.5 block">
                  {Math.abs(cashDifference) < 0.01
                    ? 'Dinheiro Bateu 100%'
                    : cashDifference > 0
                    ? 'Sobra em Dinheiro'
                    : 'Falta em Dinheiro'}
                </span>
                <span className="text-xl font-black">{formatCurrency(Math.abs(cashDifference))}</span>
              </div>
            </div>
          </div>
        </section>

        {/* 2. PAINÉIS DE CARTÃO */}
        <section className="space-y-4">
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center font-black text-xs">
                2
              </span>
              <h2 className="text-sm font-bold text-slate-800 uppercase flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-blue-600" />
                <span>Máquinas {currentTenant.cardSystemName || 'Getnet'} ({machines.length})</span>
              </h2>
            </div>
            <div className="flex gap-2 flex-wrap items-center">
              <button
                onClick={() => setIsCompactView(!isCompactView)}
                className={`px-3 py-2 rounded-lg font-bold text-xs uppercase flex items-center gap-1.5 transition-colors ${
                  isCompactView ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {isCompactView ? <Columns3 className="w-3.5 h-3.5" /> : <Grid className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">Grade Compacta</span>
              </button>
              <label
                className={`text-xs px-4 py-2 rounded-lg font-bold uppercase flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm ${
                  isGlobalLoading
                    ? 'bg-purple-200 text-purple-800 cursor-wait'
                    : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                }`}
              >
                {isGlobalLoading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Upload className="w-3.5 h-3.5" />
                )}
                <span>{isGlobalLoading ? 'Lendo com IA...' : 'Upload Múltiplo'}</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleGlobalImageUpload}
                  disabled={isGlobalLoading}
                />
              </label>
              <button
                onClick={handleAddMachine}
                className="text-xs bg-orange-100 hover:bg-orange-200 px-4 py-2 rounded-lg font-bold text-orange-800 uppercase flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Nova Máquina
              </button>
              <button
                onClick={() => setAllCollapsed(true)}
                className="text-xs bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-lg font-bold text-slate-600 uppercase hidden md:inline-block transition-colors"
              >
                Ocultar Todas
              </button>
              <button
                onClick={() => setAllCollapsed(false)}
                className="text-xs bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-lg font-bold text-slate-600 uppercase hidden md:inline-block transition-colors"
              >
                Expandir Todas
              </button>
            </div>
          </div>

          {/* Grade de Maquininhas */}
          <div
            className={`grid gap-4 items-start ${
              isCompactView
                ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
                : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
            }`}
          >
            {machines.map((machine) => (
              <div
                key={machine.id}
                id={`machine-card-${machine.id}`}
                className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden transition-all hover:shadow-md"
              >
                <div
                  className={`p-3 flex justify-between items-center cursor-pointer select-none transition-colors ${
                    machine.collapsed ? 'bg-slate-100 hover:bg-slate-200/70' : 'bg-slate-900 text-white'
                  }`}
                  onClick={() => toggleCollapse(machine.id)}
                >
                  <div className="flex items-center gap-2">
                    {machine.collapsed ? (
                      <ChevronDown className="w-4 h-4 text-slate-500" />
                    ) : (
                      <ChevronUp className="w-4 h-4 text-slate-300" />
                    )}
                    <h3 className="font-extrabold text-sm tracking-wide">Máquina {machine.id}</h3>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`font-black text-sm ${
                        machine.collapsed ? 'text-blue-600' : 'text-blue-300'
                      }`}
                    >
                      {formatCurrency(calculateMachineTotal(machine))}
                    </span>
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleClearMachine(machine.id)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          machine.collapsed
                            ? 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                        }`}
                        title="Limpar Maquininha"
                      >
                        <Eraser className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleRemoveMachine(machine.id)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          machine.collapsed
                            ? 'bg-slate-200 hover:bg-rose-100 text-rose-600'
                            : 'bg-slate-800 hover:bg-rose-600 text-rose-300 hover:text-white'
                        }`}
                        title="Excluir Maquininha"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <label
                        className={`p-1.5 rounded-lg cursor-pointer flex items-center justify-center transition-colors ${
                          loadingMachineId === machine.id
                            ? 'bg-blue-400 cursor-wait'
                            : machine.collapsed
                            ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                            : 'bg-blue-600 text-white hover:bg-blue-500'
                        }`}
                        title="Ler Comprovante com Gemini OCR"
                      >
                        {loadingMachineId === machine.id ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Upload className="w-3.5 h-3.5" />
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleImageUpload(machine.id, e)}
                          disabled={loadingMachineId === machine.id}
                        />
                      </label>
                    </div>
                  </div>
                </div>

                {!machine.collapsed && (
                  <div className="p-4 space-y-4">
                    {(['credits', 'debits', 'vouchers'] as const).map((type) => (
                      <div key={type}>
                        <div className="flex justify-between items-center mb-1.5">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              {type === 'credits' ? 'Crédito' : type === 'debits' ? 'Débito' : 'Voucher'}
                            </span>
                            <button
                              onClick={() => handleAddField(machine.id, type)}
                              className="w-4 h-4 flex items-center justify-center bg-slate-200 hover:bg-slate-300 text-slate-600 rounded text-xs transition-colors"
                              title="Adicionar campo de valor"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                          <span
                            className={`text-[11px] font-bold ${
                              type === 'credits'
                                ? 'text-blue-600'
                                : type === 'debits'
                                ? 'text-orange-500'
                                : 'text-purple-500'
                            }`}
                          >
                            {formatCurrency(sumArray(machine[type]))}
                          </span>
                        </div>
                        <div className="grid grid-cols-5 gap-1.5">
                          {machine[type].map((val, idx) => {
                            const configuredVouchers =
                              currentTenant?.voucherNames && currentTenant.voucherNames.length > 0
                                ? currentTenant.voucherNames
                                : ['Alelo', 'Ticket', 'Sodexo', 'VR', 'Ben'];
                            const voucherLabel = configuredVouchers[idx] || `Voucher ${idx + 1}`;
                            return (
                              <div key={`${type}-${idx}`} className="flex flex-col">
                                {type === 'vouchers' && (
                                  <span
                                    className="text-[9px] font-bold text-purple-700 bg-purple-50 rounded px-1 truncate text-center mb-0.5 border border-purple-200"
                                    title={voucherLabel}
                                  >
                                    {voucherLabel}
                                  </span>
                                )}
                                <input
                                  id={`input-${machine.id}-${type}-${idx}`}
                                  type="text"
                                  placeholder="0,00"
                                  value={val}
                                  onChange={(e) => handleArrayChange(machine.id, type, idx, e.target.value)}
                                  onKeyDown={(e) => handleKeyDown(e, machine.id, type, idx)}
                                  className={`w-full bg-slate-50 border border-slate-200 rounded-lg text-center font-bold focus:ring-2 focus:ring-blue-500 outline-none py-1.5 px-0.5 transition-all ${
                                    isCompactView ? 'text-xs' : 'text-sm'
                                  }`}
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Pix
                        </span>
                        <span className="text-[11px] font-bold text-teal-600">
                          {formatCurrency(parseValue(machine.pix))}
                        </span>
                      </div>
                      <input
                        id={`input-${machine.id}-pix-0`}
                        type="text"
                        placeholder="0,00"
                        value={machine.pix}
                        onChange={(e) => handlePixChange(machine.id, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, machine.id, 'pix', 0)}
                        className={`w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-3 font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all ${
                          isCompactView ? 'text-xs' : 'text-sm'
                        }`}
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* 3. ASSISTENTE DE CORREÇÃO NO PDV */}
        <section id="section-reconciliation-assistant" className="mt-8 bg-slate-900 rounded-xl shadow-xl border border-slate-800 overflow-hidden transition-all">
          <div className="p-4 bg-slate-800/90 border-b border-slate-700 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-orange-600 text-white flex items-center justify-center font-black text-sm">
                3
              </span>
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-orange-400" />
                  <span>Assistente de Conciliação no {currentTenant.pdvSystemName || 'Jclan'}</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Resolução automática de divergências e cálculo exato com itens do cardápio {currentTenant.name}
                </p>
              </div>
            </div>

            {!hasDivergences && (
              <span className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-xs font-bold border border-emerald-500/30 flex items-center gap-1.5">
                <Check className="w-4 h-4" /> 100% Conciliado
              </span>
            )}
          </div>

          <div className="p-6">
            {!hasDivergences ? (
              <div className="flex flex-col items-center justify-center py-10 text-emerald-400 space-y-3">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Check className="w-8 h-8" />
                </div>
                <p className="font-black text-lg text-emerald-300">Caixa Batendo 100%!</p>
                <p className="text-xs text-slate-400 max-w-sm text-center">
                  Os valores de {currentTenant.cardSystemName || 'Getnet'}, gaveta física e sistema {currentTenant.pdvSystemName || 'Jclan'} estão perfeitamente alinhados.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Instruções de Troca de Forma de Pagamento */}
                {instructions.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <RefreshCw className="w-4 h-4" /> Reabrir Comandas e Mudar Forma de Pagamento
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {instructions.map((inst, idx) => (
                        <div
                          key={idx}
                          className="bg-slate-800/70 border border-slate-700 rounded-xl p-4 flex flex-col justify-center"
                        >
                          <p className="text-slate-300 text-sm mb-2">
                            Altere o pagamento de{' '}
                            <span className="font-bold text-white bg-slate-700 px-2 py-0.5 rounded">
                              {formatCurrency(inst.amount)}
                            </span>
                          </p>
                          <div className="flex items-center gap-2 font-bold text-sm">
                            <span className="text-rose-400 line-through">tirando de {inst.from}</span>
                            <ArrowRight className="w-4 h-4 text-slate-500" />
                            <span className="text-emerald-400">colocando em {inst.to}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Faltas ou Sobras Reais Não Resolvidas com Trocas */}
                {unresolvable.length > 0 && (
                  <div className={instructions.length > 0 ? 'pt-6 border-t border-slate-800' : ''}>
                    <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                      <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" /> Ajuste com Itens do Cardápio ({currentTenant.name})
                      </h4>
                      <span
                        className="bg-rose-500/15 text-rose-300 border border-rose-500/30 px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1.5"
                        title="Produtos de Happy Hour e Promocionais possuem horário máximo para serem lançados no PDV e são bloqueados automaticamente nas recomendações do Assistente."
                      >
                        <Timer className="w-3 h-3 text-rose-400" />
                        <span>
                          🚫 Sem Happy Hour / Promocionais (Horário limite no {currentTenant.pdvSystemName || 'Jclan'}
                          {blockedPromoItemsCount > 0 ? ` • ${blockedPromoItemsCount} ocultados` : ''})
                        </span>
                      </span>
                    </div>
                    <div className="space-y-5">
                      {unresolvable.map((unres, idx) => {
                        const menuOpts = calculateMenuSuggestions(unres.amount, unres.type);
                        return (
                          <div
                            key={idx}
                            className={`p-5 rounded-xl border ${
                              unres.type === 'sobra'
                                ? 'bg-slate-800/90 border-amber-500/40'
                                : 'bg-slate-800/90 border-rose-500/40'
                            }`}
                          >
                            <div className="font-bold text-base mb-3 flex items-center justify-between border-b border-slate-700/80 pb-3 flex-wrap gap-2">
                              <span>
                                {unres.type === 'sobra' ? (
                                  <span className="text-amber-300">
                                    SOBRA de{' '}
                                    <span className="text-amber-400 font-black text-lg">
                                      {formatCurrency(unres.amount)}
                                    </span>{' '}
                                    em {unres.label}
                                  </span>
                                ) : (
                                  <span className="text-rose-300">
                                    FALTA de{' '}
                                    <span className="text-rose-400 font-black text-lg">
                                      {formatCurrency(unres.amount)}
                                    </span>{' '}
                                    em {unres.label}
                                  </span>
                                )}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] font-bold text-slate-300 bg-slate-900 px-3 py-1 rounded-full border border-slate-700 flex items-center gap-1.5">
                                  {unres.type === 'sobra' ? '🔥 Criar Nova Comanda' : '✂️ Reabrir e Ajustar'}
                                </span>
                              </div>
                            </div>

                            {/* Sugestões Automáticas Diretas */}
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                                  <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Sugestões Diretas do Cardápio
                                </span>
                                <span className="text-[10px] text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                                  Desconto máx: R$ 1,00
                                </span>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {menuOpts.map((opt, oIdx) => {
                                  const optionKey = `direct-${oIdx}-${opt.title}-${opt.instruction}`;
                                  const selectedForLabel = selectedExclusionOptions[unres.label];
                                  const isSelected = selectedForLabel
                                    ? selectedForLabel.optionKey
                                      ? selectedForLabel.optionKey === optionKey
                                      : selectedForLabel.optionIndex === oIdx &&
                                        selectedForLabel.title === opt.title &&
                                        selectedForLabel.instruction === opt.instruction
                                    : false;
                                  return (
                                    <div
                                      key={oIdx}
                                      className={`rounded-xl p-3 text-xs flex flex-col justify-between transition-all border ${
                                        isSelected
                                          ? 'bg-emerald-950/80 border-emerald-400 ring-2 ring-emerald-500/40 shadow-md'
                                          : opt.isExact
                                          ? 'bg-emerald-950/40 border-emerald-500/50 shadow-sm'
                                          : 'bg-slate-950/80 border-slate-700/80'
                                      }`}
                                    >
                                      <div>
                                        <div className="flex items-center justify-between gap-1.5 mb-1.5 flex-wrap">
                                          <span
                                            className={`font-bold uppercase tracking-wider text-[11px] ${
                                              isSelected ? 'text-emerald-300' : opt.isExact ? 'text-emerald-400' : 'text-amber-400'
                                            }`}
                                          >
                                            {opt.title}
                                          </span>
                                          <div className="flex items-center gap-1.5">
                                            {opt.isExact ? (
                                              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                                                <Check className="w-3 h-3" /> Zera 100% Exato
                                              </span>
                                            ) : (
                                              <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                                Desconto: {formatCurrency(opt.centAdjustment)} (≤ R$ 1,00)
                                              </span>
                                            )}
                                            {isSelected && (
                                              <span className="bg-emerald-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full">
                                                ✓ Marcada
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                        {opt.item && (
                                          <p className="text-slate-100 font-bold text-sm mb-1">{opt.item}</p>
                                        )}
                                        <p className="text-slate-300 leading-relaxed mb-3">{opt.instruction}</p>
                                      </div>
                                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-end">
                                        <button
                                          onClick={() =>
                                            handleToggleSelectExclusionOption(
                                              unres.label,
                                              { title: opt.title, instruction: opt.instruction, diff: opt.centAdjustment },
                                              oIdx,
                                              optionKey
                                            )
                                          }
                                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                                            isSelected
                                              ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                                              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                                          }`}
                                        >
                                          <Check className="w-3.5 h-3.5" />
                                          <span>{isSelected ? '✓ Opção Marcada' : 'Marcar esta Opção'}</span>
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Calculadora de Inclusão Exata (Nova Comanda - SEMPRE SEM OS 10%) */}
                            {unres.type === 'sobra' && (() => {
                              const autoNovaOptions = findAutoNovaComandaSubsets(unres.amount);
                              const selectedForThis = selectedExclusionOptions[unres.label];

                              return (
                                <div className="mt-5 pt-4 border-t border-amber-500/30 bg-amber-950/20 -mx-5 -mb-5 p-5 rounded-b-xl">
                                  <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
                                    <h5 className="text-sm font-bold text-amber-200 flex items-center gap-2">
                                      <TrendingUp className="w-4 h-4 text-amber-400" />
                                      <span>Calculadora de Inclusão Exata (Nova Comanda - SEMPRE SEM 10%)</span>
                                    </h5>
                                    <div className="flex items-center gap-2">
                                      <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                                        🛡️ Desconto máx: R$ 1,00
                                      </span>
                                      <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full text-[10px] font-bold">
                                        Taxa 10%: Desativada
                                      </span>
                                    </div>
                                  </div>
                                  <p className="text-xs text-amber-300/80 mb-3">
                                    O sistema calculou automaticamente os itens exatos do cardápio para lançar em uma nova comanda no <strong>{currentTenant.pdvSystemName || 'Jclan'}</strong> para absorver a sobra de <strong>{formatCurrency(unres.amount)}</strong>. Lançamento <strong>sempre sem os 10% de taxa</strong>:
                                  </p>

                                  {autoNovaOptions.length === 0 ? (
                                    <div className="bg-amber-950/50 border border-amber-500/40 rounded-xl p-3.5 text-xs text-amber-200 flex items-start gap-2.5">
                                      <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                                      <p>
                                        Nenhuma combinação com até 3 itens do cardápio atinge a sobra de <strong>{formatCurrency(unres.amount)}</strong> com desconto ≤ R$ 1,00 sem taxa. Você pode utilizar as sugestões diretas acima ou ajustar itens no cardápio no Painel Admin.
                                      </p>
                                    </div>
                                  ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                      {autoNovaOptions.map((res, i) => {
                                        const optionKey = `nova-${i}-${res.title}-${res.instruction}`;
                                        const isSelected = selectedForThis
                                          ? selectedForThis.optionKey
                                            ? selectedForThis.optionKey === optionKey
                                            : selectedForThis.optionIndex === i &&
                                              selectedForThis.title === res.title &&
                                              selectedForThis.instruction === res.instruction
                                          : false;
                                        return (
                                          <div
                                            key={i}
                                            className={`border rounded-xl p-3 text-xs flex flex-col justify-between transition-all ${
                                              isSelected
                                                ? 'bg-emerald-950/80 border-emerald-400 ring-2 ring-emerald-500/40 shadow-md'
                                                : res.isExact
                                                ? 'bg-emerald-950/40 border-emerald-500/50 shadow-sm'
                                                : 'bg-slate-900/90 border-slate-700/80'
                                            }`}
                                          >
                                            <div>
                                              <div className="flex items-center justify-between gap-1.5 mb-1.5 flex-wrap">
                                                <span
                                                  className={`font-bold text-xs ${
                                                    isSelected ? 'text-emerald-300' : res.isExact ? 'text-emerald-300' : 'text-amber-200'
                                                  }`}
                                                >
                                                  {res.title}
                                                </span>
                                                <div className="flex items-center gap-1.5">
                                                  {res.isExact ? (
                                                    <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                                                      <Check className="w-3 h-3" /> Zera 100% Exato
                                                    </span>
                                                  ) : (
                                                    <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                                      Desconto: {formatCurrency(res.diff)} (≤ R$ 1,00)
                                                    </span>
                                                  )}
                                                  {isSelected && (
                                                    <span className="bg-emerald-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full">
                                                      ✓ Marcada
                                                    </span>
                                                  )}
                                                </div>
                                              </div>
                                              <p className="text-slate-100 font-medium leading-relaxed mb-3">
                                                {res.instruction}
                                              </p>
                                            </div>
                                            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-end">
                                              <button
                                                onClick={() =>
                                                  handleToggleSelectExclusionOption(unres.label, res, i, optionKey)
                                                }
                                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                                                  isSelected
                                                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm'
                                                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                                                }`}
                                              >
                                                <Check className="w-3.5 h-3.5" />
                                                <span>{isSelected ? '✓ Opção Marcada' : 'Marcar esta Opção'}</span>
                                              </button>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              );
                            })()}

                            {/* Calculadora de Exclusão Exata (Faltas) */}
                            {unres.type === 'falta' && (
                              <div className="mt-5 pt-4 border-t border-rose-500/30 bg-rose-950/20 -mx-5 -mb-5 p-5 rounded-b-xl">
                                <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
                                  <h5 className="text-sm font-bold text-rose-200 flex items-center gap-2">
                                    <RefreshCw className="w-4 h-4 text-rose-400" />
                                    <span>Calculadora de Exclusão Exata (Comanda Reaberta)</span>
                                  </h5>
                                  <span className="bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                                    🛡️ Desconto máx: R$ 1,00 | Excluir e/ou Incluir
                                  </span>
                                </div>
                                <p className="text-xs text-rose-300/80 mb-3">
                                  Adicione os itens presentes na comanda reaberta. O sistema indicará quais itens excluir e/ou incluir para zerar a falta perfeitamente.
                                </p>

                                <div className="flex gap-2 mb-3">
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    value={cmdQtyInputs[unres.label] !== undefined ? cmdQtyInputs[unres.label] : '1'}
                                    onFocus={(e) => e.target.select()}
                                    onChange={(e) => {
                                      const clean = e.target.value.replace(/\D/g, '');
                                      setCmdQtyInputs({ ...cmdQtyInputs, [unres.label]: clean });
                                    }}
                                    onBlur={() => {
                                      const val = cmdQtyInputs[unres.label];
                                      if (!val || parseInt(val, 10) < 1) {
                                        setCmdQtyInputs({ ...cmdQtyInputs, [unres.label]: '1' });
                                      }
                                    }}
                                    title="Quantidade de itens"
                                    placeholder="1"
                                    className="w-16 bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-center font-bold text-rose-300 outline-none focus:ring-1 focus:ring-rose-500"
                                  />
                                  <input
                                    type="text"
                                    list="flor-de-brasa-menu-list"
                                    placeholder="Repita os itens da comanda reaberta"
                                    value={cmdItemInputs[unres.label] || ''}
                                    onChange={(e) =>
                                      setCmdItemInputs({ ...cmdItemInputs, [unres.label]: e.target.value })
                                    }
                                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 outline-none focus:ring-1 focus:ring-rose-500 placeholder:text-slate-500"
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        const rawQty = cmdQtyInputs[unres.label];
                                        const qty = rawQty && parseInt(rawQty, 10) >= 1 ? parseInt(rawQty, 10) : 1;
                                        handleAddCommandItem(unres.label, cmdItemInputs[unres.label] || '', qty);
                                        setCmdItemInputs({ ...cmdItemInputs, [unres.label]: '' });
                                        setCmdQtyInputs({ ...cmdQtyInputs, [unres.label]: '1' });
                                      }
                                    }}
                                  />
                                  <button
                                    onClick={() => {
                                      const rawQty = cmdQtyInputs[unres.label];
                                      const qty = rawQty && parseInt(rawQty, 10) >= 1 ? parseInt(rawQty, 10) : 1;
                                      handleAddCommandItem(unres.label, cmdItemInputs[unres.label] || '', qty);
                                      setCmdItemInputs({ ...cmdItemInputs, [unres.label]: '' });
                                      setCmdQtyInputs({ ...cmdQtyInputs, [unres.label]: '1' });
                                    }}
                                    className="bg-rose-600 hover:bg-rose-500 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors shadow-sm cursor-pointer"
                                  >
                                    Adicionar
                                  </button>
                                </div>

                                {customCommands[unres.label] && customCommands[unres.label].length > 0 && (
                                  <div className="flex justify-between items-center bg-rose-950/40 p-3 rounded-lg border border-rose-500/20 mb-3">
                                    <span className="text-[11px] font-bold text-rose-200 uppercase">
                                      Total da Comanda Reaberta:
                                    </span>
                                    <div className="text-right">
                                      <span className="block text-[11px] text-rose-300/80">
                                        Sem taxa:{' '}
                                        {formatCurrency(
                                          customCommands[unres.label].reduce((acc, curr) => acc + curr.price, 0)
                                        )}
                                      </span>
                                      <span className="block text-sm font-black text-rose-100">
                                        Com 10%:{' '}
                                        {formatCurrency(
                                          customCommands[unres.label].reduce((acc, curr) => acc + curr.price, 0) * 1.1
                                        )}
                                      </span>
                                    </div>
                                  </div>
                                )}

                                {customCommands[unres.label] && customCommands[unres.label].length > 0 && (
                                  <div className="flex flex-wrap gap-1.5 mb-3">
                                    {customCommands[unres.label].map((item) => (
                                      <span
                                        key={item.id}
                                        className="bg-slate-800 border border-slate-600 text-slate-200 px-2 py-1 rounded text-[11px] flex items-center gap-1 font-medium shadow-sm"
                                      >
                                        <span>{item.name}</span>
                                        <button
                                          onClick={() => handleRemoveCommandItem(unres.label, item.id)}
                                          className="text-rose-400 hover:text-rose-200 ml-1 p-0.5"
                                        >
                                          <X className="w-3 h-3" />
                                        </button>
                                      </span>
                                    ))}
                                  </div>
                                )}

                                {customCommands[unres.label] && customCommands[unres.label].length > 0 && (() => {
                                  const cmdSubsets = findBestCommandSubsets(unres.amount, customCommands[unres.label]);
                                  if (cmdSubsets.length === 0) {
                                    return (
                                      <div className="bg-rose-950/50 border border-rose-500/40 rounded-xl p-3.5 text-xs text-rose-200 flex items-start gap-2.5 mt-2">
                                        <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                                        <p>
                                          Nenhuma combinação de exclusão ou troca dos itens informados fecha a falta de <strong>{formatCurrency(unres.amount)}</strong> com desconto de até <strong>R$ 1,00</strong>. Adicione outros itens que constam na comanda reaberta ou veja as opções automáticas calculadas acima.
                                        </p>
                                      </div>
                                    );
                                  }
                                  return (
                                    <div className="grid grid-cols-1 gap-2.5 mt-2">
                                      {cmdSubsets.map((res, i) => {
                                        const optionKey = `exc-${i}-${res.title}-${res.instruction}`;
                                        const selectedForLabel = selectedExclusionOptions[unres.label];
                                        const isSelected = selectedForLabel
                                          ? selectedForLabel.optionKey
                                            ? selectedForLabel.optionKey === optionKey
                                            : selectedForLabel.optionIndex === i &&
                                              selectedForLabel.title === res.title &&
                                              selectedForLabel.instruction === res.instruction
                                          : false;
                                        return (
                                          <div
                                            key={i}
                                            className={`border rounded-xl p-3.5 text-xs flex flex-col justify-between transition-all ${
                                              isSelected
                                                ? 'bg-emerald-950/80 border-emerald-400 ring-2 ring-emerald-500/40 shadow-md'
                                                : res.isExact
                                                ? 'bg-emerald-950/40 border-emerald-500/50 shadow-sm'
                                                : 'bg-rose-900/60 border-rose-500/50'
                                            }`}
                                          >
                                            <div className="flex gap-3 items-start">
                                              <div
                                                className={`p-1 rounded-full shrink-0 mt-0.5 ${
                                                  isSelected
                                                    ? 'bg-emerald-500 text-slate-950'
                                                    : res.isExact
                                                    ? 'bg-emerald-500/20 text-emerald-300'
                                                    : 'bg-rose-500/20 text-rose-300'
                                                }`}
                                              >
                                                <Check className="w-3.5 h-3.5" />
                                              </div>
                                              <div className="flex-1">
                                                <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                                                  <span
                                                    className={`font-bold text-xs ${
                                                      isSelected
                                                        ? 'text-emerald-300'
                                                        : res.isExact
                                                        ? 'text-emerald-300'
                                                        : 'text-rose-200'
                                                    }`}
                                                  >
                                                    {res.title}
                                                  </span>
                                                  <div className="flex items-center gap-1.5">
                                                    {res.type === 'mixed' && (
                                                      <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                                        🔄 Troca (Excluir + Incluir)
                                                      </span>
                                                    )}
                                                    {res.isExact ? (
                                                      <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-black px-2 py-0.5 rounded-full">
                                                        ✨ Zera 100% Exato (R$ 0,00)
                                                      </span>
                                                    ) : (
                                                      <span className="bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                                        🏷️ Desconto: {formatCurrency(res.diff)} (≤ R$ 1,00)
                                                      </span>
                                                    )}
                                                    {isSelected && (
                                                      <span className="bg-emerald-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full">
                                                        ✓ Marcada
                                                      </span>
                                                    )}
                                                  </div>
                                                </div>
                                                <span className="text-slate-100 font-medium block leading-relaxed">
                                                  {res.instruction}
                                                </span>
                                              </div>
                                            </div>

                                            <div className="mt-2.5 pt-2 border-t border-slate-700/60 flex items-center justify-between flex-wrap gap-2">
                                              <span className="text-[11px] text-slate-400">
                                                {res.title.startsWith('1ª')
                                                  ? '⭐ 1ª Opção Prioritária (Comanda COM 10%)'
                                                  : 'ℹ️ 2ª Opção Alternativa (Comanda SEM 10%)'}
                                              </span>
                                              <button
                                                onClick={() =>
                                                  handleToggleSelectExclusionOption(unres.label, res, i, optionKey)
                                                }
                                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                                                  isSelected
                                                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm'
                                                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600'
                                                }`}
                                              >
                                                <Check className="w-3.5 h-3.5" />
                                                <span>{isSelected ? '✓ Opção Marcada' : 'Marcar esta Opção'}</span>
                                              </button>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  );
                                })()}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* 4. PAINEL DE RESUMO CONSOLIDADO DE OPÇÕES DE ZERAMENTO */}
        <section className="bg-slate-900 rounded-2xl shadow-xl border border-slate-800 p-5 sm:p-6 mb-8">
          <div className="flex items-center justify-between flex-wrap gap-3 pb-4 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                  <span>Resumo Consolidado de Opções de Zeramento</span>
                  <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-bold">
                    {Object.keys(selectedExclusionOptions).length} opção(ões) selecionada(s)
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  Revise todas as opções de zeramento (Exclusão Direta ou Nova Comanda) marcadas para o fechamento do dia antes de concluir.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setIsPdvSummaryOpen(true)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-950/80 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-500/40 flex items-center gap-2 transition-all cursor-pointer shadow-sm"
                title={`Ver resumo com instruções exatas do que lançar no ${currentTenant.pdvSystemName || 'Jclan'}`}
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>O que Lançar no {currentTenant.pdvSystemName || 'Jclan'}</span>
              </button>
              <button
                onClick={() => setIsAuditDrawerOpen(true)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 flex items-center gap-2 transition-all cursor-pointer shadow-sm"
                title="Visualizar histórico completo de preenchimentos e cálculos do turno em tempo real"
              >
                <ClipboardList className="w-4 h-4 text-cyan-400" />
                <span>Ver Auditoria do Turno ({auditLogs.length})</span>
              </button>
              <button
                onClick={() => setIsGuideOpen(true)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 flex items-center gap-2 transition-all cursor-pointer shadow-sm"
                title="Abrir o tutorial passo a passo para novos operadores"
              >
                <BookOpen className="w-4 h-4 text-amber-400" />
                <span>Guia de Fechamento</span>
              </button>
            </div>
          </div>

          {Object.keys(selectedExclusionOptions).length === 0 ? (
            <div className="py-8 px-4 text-center">
              <div className="w-12 h-12 rounded-full bg-slate-800 mx-auto flex items-center justify-center text-slate-500 mb-3">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-300">
                Nenhuma opção de zeramento marcada até o momento.
              </p>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                {hasDivergences
                  ? 'Selecione uma opção nas calculadoras acima e clique em "Marcar esta Opção" para registrá-la no fechamento e na auditoria.'
                  : 'O caixa está sem divergências pendentes ou batendo 100%! Você já pode salvar o fechamento diretamente.'}
              </p>
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.entries(selectedExclusionOptions).map(([label, opt]) => (
                <div
                  key={label}
                  className="bg-slate-950/90 border border-emerald-500/40 rounded-xl p-4 flex flex-col justify-between shadow-sm relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl pointer-events-none" />
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                      <span className="text-[11px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-md border border-emerald-500/30">
                        {label}
                      </span>
                      <span className="text-[11px] font-bold text-slate-300">
                        Ajuste: <strong className="text-emerald-400">{formatCurrency(opt.diff)}</strong>
                      </span>
                    </div>
                    <h5 className="text-sm font-bold text-white mb-1.5 flex items-center gap-1.5">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{opt.title}</span>
                    </h5>
                    <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                      {opt.instruction}
                    </p>
                  </div>
                  <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between">
                    <span className="text-[10px] text-emerald-400/80 font-semibold flex items-center gap-1">
                      <Check className="w-3 h-3" /> Incluído no Relatório de Fechamento
                    </span>
                    <button
                      onClick={() => {
                        setSelectedExclusionOptions((prev) => {
                          const copy = { ...prev };
                          delete copy[label];
                          return copy;
                        });
                        addAuditLog(
                          'zeramento',
                          `Desmarcou opção de zeramento (${label})`,
                          `Opção "${opt.title}" desmarcada pelo operador no painel consolidado.`
                        );
                        showToast(`Opção de zeramento para ${label} desmarcada.`);
                      }}
                      className="text-xs text-rose-400 hover:text-rose-300 hover:underline cursor-pointer"
                    >
                      Desmarcar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Barra de Ação de Fechamento Final */}
          <div id="section-closing-actions" className="mt-6 pt-5 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-950/50 -mx-5 -mb-5 p-5 rounded-b-2xl transition-all">
            <div className="text-xs text-slate-400 text-center sm:text-left">
              <span className="font-semibold text-slate-200 block">Tudo revisado para encerrar o caixa?</span>
              Clique em Conferir Lançamentos no PDV para checar se o sistema está batendo 100% antes de salvar.
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap">
              <button
                onClick={() => setIsAuditDrawerOpen(true)}
                className="flex-1 sm:flex-initial px-4 py-3 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <ClipboardList className="w-4 h-4 text-cyan-400" />
                <span>Auditoria</span>
              </button>
              <button
                onClick={() => setIsPdvSummaryOpen(true)}
                className="flex-1 sm:flex-initial px-4 py-3 rounded-xl text-xs font-bold bg-emerald-950/90 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/40 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>O que Lançar no {currentTenant.pdvSystemName || 'Jclan'}</span>
              </button>
              <button
                onClick={handleOpenSaveClosingModal}
                className={`${getTheme(currentTenant.themeColor).btnGradient} ${getTheme(currentTenant.themeColor).btnHover} text-white px-6 py-3 rounded-xl font-black text-sm shadow-lg shadow-orange-500/20 hover:shadow-orange-500/40 flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer`}
              >
                <FileText className="w-4 h-4" />
                <span>Salvar Fechamento</span>
              </button>
            </div>
          </div>
        </section>
      </main>
        </>
      )}

      {/* Modais SaaS Multi-Tenant (Fase 3 & Fase 4) */}
      {isMasterOpen && (
        <MasterPanelModal
          isOpen={isMasterOpen}
          onClose={() => setIsMasterOpen(false)}
          tenants={tenants}
          stats={masterStats}
          onSelectTenant={(t) => {
            setCurrentTenant(t);
            setIsMasterOpen(false);
          }}
          onOpenBarAdmin={(t) => {
            setCurrentTenant(t);
            setIsMasterSession(true);
            setIsAdminOpen(true);
            setIsMasterOpen(false);
            setAppMode('bar');
            setIsAuthenticated(true);
            setCurrentOperator({
              id: 999,
              tenantId: t.id,
              name: 'Bruno (Dono)',
              pin: '1917',
              isAdmin: true,
            });
            showToast(`Área do Administrador aberta para: ${t.name}`);
          }}
          onToggleBlockTenant={handleToggleBlockTenant}
          onCreateTenant={handleCreateTenant}
          onOpenMenuManager={(t) => {
            setTenantForMenuModal(t);
            setIsMenuManagerOpen(true);
          }}
          onOpenBilling={(t) => {
            setCurrentTenant(t);
            setIsBillingOpen(true);
          }}
          onShowToast={showToast}
          onMasterAuthenticated={() => setIsMasterSession(true)}
        />
      )}

      {isBillingOpen && currentTenant && (
        <BarBillingModal
          isOpen={isBillingOpen}
          onClose={() => setIsBillingOpen(false)}
          tenant={currentTenant}
          invoices={invoices}
          onConfirmPayment={handleConfirmPayment}
          onShowToast={showToast}
        />
      )}

      {isMenuManagerOpen && tenantForMenuModal && (
        <MenuManagerModal
          isOpen={isMenuManagerOpen}
          onClose={() => {
            setIsMenuManagerOpen(false);
            setTenantForMenuModal(null);
          }}
          tenant={tenantForMenuModal}
          menu={tenantForMenuModal.id === currentTenant?.id ? currentMenu : menuModalItems}
          onSaveMenu={handleSaveMenu}
          onShowToast={showToast}
        />
      )}

      {/* Modal Sobreposto: Resumo do que Lançar no PDV, Conferência e Envio do Extrato */}
      {isPdvSummaryOpen && (
        <FinalPdvSummaryModal
          isOpen={isPdvSummaryOpen}
          onClose={() => setIsPdvSummaryOpen(false)}
          tenant={currentTenant}
          operatorName={currentOperator?.name}
          selectedExclusionOptions={selectedExclusionOptions}
          instructions={instructions}
          getnetTotal={getnetTotal}
          jclanTotal={jclanTotal}
          cashTotal={cashTotal}
          expectedCash={expectedCash}
          totals={{
            credit: { card: getnetCredit, pdv: parseValue(jclan.credit) },
            debit: { card: getnetDebit, pdv: parseValue(jclan.debit) },
            pix: { card: getnetPix, pdv: parseValue(jclan.pix) },
            voucher: { card: getnetVoucher, pdv: parseValue(jclan.voucher) },
            cash: { physical: cashTotal, expected: expectedCash },
          }}
          voucherBreakdown={voucherBreakdown}
          onProceedToSaveClosing={() => setIsSaveClosingModalOpen(true)}
          onShowToast={showToast}
        />
      )}

      {/* Modal Salvar Fechamento com Fotos/Prints e Comentários */}
      {isSaveClosingModalOpen && (
        <SaveClosingModal
          isOpen={isSaveClosingModalOpen}
          onClose={() => setIsSaveClosingModalOpen(false)}
          tenant={currentTenant}
          operatorName={currentOperator?.name}
          getnetTotal={getnetTotal}
          jclanTotal={jclanTotal}
          differenceTotal={differenceTotal}
          cashTotal={cashTotal}
          expectedCash={expectedCash}
          cashDifference={cashDifference}
          onConfirmSave={handleConfirmSaveClosing}
          onZoomImage={(url) => setZoomImageUrl(url)}
        />
      )}

      {/* Modal de Zoom / Lightbox para Comprovantes em Alta Resolução */}
      {zoomImageUrl && (
        <ImageZoomModal
          imageUrl={zoomImageUrl}
          onClose={() => setZoomImageUrl(null)}
        />
      )}

      {/* Drawer de Auditoria do Turno em Tempo Real */}
      <AuditTrailDrawer
        isOpen={isAuditDrawerOpen}
        onClose={() => setIsAuditDrawerOpen(false)}
        logs={auditLogs}
        currentOperatorName={currentOperator?.name}
        onClearLogs={() => {
          setAuditLogs([]);
          try {
            localStorage.removeItem('fechacaixa_audit_logs');
          } catch {
            // ignore
          }
          showToast('Histórico de auditoria do turno limpo.');
        }}
        onShowToast={showToast}
      />

      {/* Tutorial Interativo Flutuante com Spotlight e Acompanhamento da Tarefa Real */}
      <InteractiveClosingGuide
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        cardName={currentTenant.cardSystemName || 'Getnet'}
        pdvName={currentTenant.pdvSystemName || 'Jclan'}
        cashTotal={cashTotal}
        hasCashData={
          cashTotal > 0 ||
          parseValue(cashSummary.opening) > 0 ||
          parseValue(cashSummary.jclanCash) > 0 ||
          parseValue(cashSummary.expenses) > 0
        }
        getnetTotal={getnetTotal}
        jclanTotal={jclanTotal}
        hasDivergences={hasDivergences}
        selectedExclusionCount={Object.keys(selectedExclusionOptions).length}
        instructionsCount={instructions.length}
        onOpenPdvSummary={() => setIsPdvSummaryOpen(true)}
        onOpenSaveClosing={handleOpenSaveClosingModal}
        onShowToast={showToast}
      />
    </div>
  );
}
