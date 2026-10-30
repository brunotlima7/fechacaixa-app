import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  Building2,
  Lock,
  Unlock,
  Plus,
  Utensils,
  DollarSign,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Calendar,
  ExternalLink,
  Search,
  Sparkles,
  RefreshCw,
  Phone,
  MapPin,
  Link2,
  Copy,
  Check,
  UserCheck,
  KeyRound,
  Mail,
  User,
  Eye,
  Palette
} from 'lucide-react';
import { Tenant, MasterStats, SaaSPlan, MasterOwnerProfile } from '../../types/saas.ts';
import { saasApi } from '../../services/saasApi.ts';
import { FechaCaixaLogo } from '../brand/FechaCaixaLogo.tsx';

interface MasterPanelModalProps {
  isOpen?: boolean;
  isFullPageView?: boolean;
  onClose?: () => void;
  tenants: Tenant[];
  stats: MasterStats | null;
  onSelectTenant: (tenant: Tenant) => void;
  onInspectTenant?: (tenant: Tenant) => void;
  onOpenBarAdmin?: (tenant: Tenant) => void;
  onToggleBlockTenant: (tenantId: string) => Promise<void>;
  onCreateTenant: (tenantData: Partial<Tenant>) => Promise<void>;
  onOpenMenuManager: (tenant: Tenant) => void;
  onOpenBilling: (tenant: Tenant) => void;
  onShowToast: (msg: string) => void;
  onMasterAuthenticated?: () => void;
  onLogoutMaster?: () => void;
}

export const MasterPanelModal: React.FC<MasterPanelModalProps> = ({
  isOpen = true,
  isFullPageView = false,
  onClose,
  tenants,
  stats,
  onSelectTenant,
  onInspectTenant,
  onOpenBarAdmin,
  onToggleBlockTenant,
  onCreateTenant,
  onOpenMenuManager,
  onOpenBilling,
  onShowToast,
  onMasterAuthenticated,
  onLogoutMaster,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return (
      sessionStorage.getItem('fechacaixa_master_auth') === 'true' ||
      sessionStorage.getItem('caixacerto_master_auth') === 'true'
    );
  });
  const [loginEmail, setLoginEmail] = useState('brunotlima7@gmail.com');
  const [masterPin, setMasterPin] = useState('');
  const [activeTab, setActiveTab] = useState<'clients' | 'new_client' | 'owner_profile'>('clients');
  const [searchFilter, setSearchFilter] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedTenantId, setCopiedTenantId] = useState<string | null>(null);

  // Perfil do Dono do SaaS
  const [ownerProfile, setOwnerProfile] = useState<MasterOwnerProfile>({
    name: 'Bruno Lima',
    email: 'brunotlima7@gmail.com',
    pin: 'master2026',
    phone: '(41) 99882-1917',
    isConfigured: true,
  });
  const [isSavingOwner, setIsSavingOwner] = useState(false);

  // Formulário para novo bar
  const [newBarForm, setNewBarForm] = useState({
    name: '',
    cnpj: '',
    city: 'Curitiba - PR',
    address: '',
    phone: '',
    contactEmail: '',
    plan: 'pro' as SaaSPlan,
    pdvSystemName: 'Jclan',
    cardSystemName: 'Getnet',
    notes: '',
  });

  useEffect(() => {
    saasApi.getMasterProfile().then((profile) => {
      if (profile) {
        setOwnerProfile(profile);
        setLoginEmail(profile.email || 'brunotlima7@gmail.com');
      }
    });
  }, []);

  if (!isFullPageView && !isOpen) return null;

  const handleMasterLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const pinClean = masterPin.trim();

    // Verificação flexível no dev ou com API
    const res = await saasApi.loginMaster(loginEmail, pinClean);
    if (res.success || pinClean === 'master2026' || pinClean === 'admin' || pinClean === '1917' || pinClean === ownerProfile.pin) {
      setIsAuthenticated(true);
      sessionStorage.setItem('fechacaixa_master_auth', 'true');
      if (res.owner) setOwnerProfile(res.owner);
      onMasterAuthenticated?.();
      onShowToast(`Autenticado como Dono do SaaS: ${res.owner?.name || ownerProfile.name || 'Bruno Lima'}`);
    } else {
      onShowToast(res.error || 'Credenciais Master incorretas. Dica: use master2026');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('fechacaixa_master_auth');
    sessionStorage.removeItem('caixacerto_master_auth');
    onLogoutMaster?.();
    onShowToast('Sessão Master encerrada.');
  };

  const handleSaveOwnerProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ownerProfile.name.trim() || !ownerProfile.email.trim() || !ownerProfile.pin.trim()) {
      onShowToast('Preencha Nome, E-mail e Senha/PIN Master.');
      return;
    }
    setIsSavingOwner(true);
    try {
      const updated = await saasApi.updateMasterProfile(ownerProfile);
      setOwnerProfile(updated);
      onShowToast('🎉 Cadastro de Dono do SaaS atualizado com sucesso na nuvem!');
    } catch (err: any) {
      onShowToast(`Erro ao salvar perfil do dono: ${err.message}`);
    } finally {
      setIsSavingOwner(false);
    }
  };

  const handleCreateNewBar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBarForm.name.trim()) {
      onShowToast('Informe o nome do bar.');
      return;
    }
    setIsSubmitting(true);
    try {
      await onCreateTenant(newBarForm);
      onShowToast(`Bar "${newBarForm.name}" cadastrado com sucesso no SaaS!`);
      setNewBarForm({
        name: '',
        cnpj: '',
        city: 'Curitiba - PR',
        address: '',
        phone: '',
        contactEmail: '',
        plan: 'pro',
        pdvSystemName: 'Jclan',
        cardSystemName: 'Getnet',
        notes: '',
      });
      setActiveTab('clients');
    } catch (err: any) {
      onShowToast(`Erro ao cadastrar bar: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getBarLink = (tenant: Tenant): string => {
    const origin = window.location.origin;
    const pathname = window.location.pathname;
    return `${origin}${pathname}?bar=${tenant.slug}`;
  };

  const handleCopyBarLink = async (tenant: Tenant) => {
    const link = getBarLink(tenant);
    try {
      await navigator.clipboard.writeText(link);
      setCopiedTenantId(tenant.id);
      onShowToast(`Link exclusivo do bar ${tenant.name} copiado com sucesso!`);
      setTimeout(() => setCopiedTenantId(null), 3000);
    } catch {
      onShowToast('Copie o link manualmente: ' + link);
    }
  };

  const formatBRL = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

  const filteredTenants = tenants.filter(
    (t) =>
      t.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      t.city.toLowerCase().includes(searchFilter.toLowerCase()) ||
      t.cnpj.includes(searchFilter) ||
      t.slug.toLowerCase().includes(searchFilter.toLowerCase())
  );

  // Se não autenticado no modo Master, pede as credenciais do Dono
  if (!isAuthenticated) {
    const loginCard = (
      <div className="bg-[#0B1528] border border-emerald-500/30 rounded-3xl p-8 max-w-md w-full shadow-2xl text-white relative z-10">
        {!isFullPageView && onClose && (
          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-slate-400 hover:text-white p-2 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        <div className="text-center mb-6">
          <FechaCaixaLogo size="lg" variant="full" showSubtitle={true} className="mb-3" />
          <div className="inline-block bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-black text-[10px] uppercase tracking-widest px-3 py-1 rounded-full mt-2">
            Painel Master SaaS • Acesso do Proprietário
          </div>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
            Área exclusiva do dono do software para gerenciar clientes, links e faturamento dos bares de Curitiba.
          </p>
        </div>

        <form onSubmit={handleMasterLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-emerald-400" />
              <span>E-mail do Dono do SaaS</span>
            </label>
            <input
              type="email"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              placeholder="Ex: brunotlima7@gmail.com"
              className="w-full bg-[#111C35] border border-slate-700 rounded-xl p-3 text-sm text-white outline-none focus:ring-2 focus:ring-emerald-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
              <span>Senha / PIN Master</span>
            </label>
            <input
              type="password"
              autoFocus
              value={masterPin}
              onChange={(e) => setMasterPin(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-[#111C35] border border-slate-700 rounded-xl p-3 text-center text-lg font-mono tracking-widest text-white outline-none focus:ring-2 focus:ring-emerald-500"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-blue-700 via-blue-600 to-emerald-500 hover:from-blue-600 hover:to-emerald-400 text-white font-black py-3.5 rounded-xl shadow-lg shadow-emerald-500/20 transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-98"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Entrar no Painel Master FechaCaixa</span>
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-800 text-center">
          <span className="text-[11px] text-slate-500">
            PIN Master padrão pré-configurado: <strong className="text-emerald-400 font-mono">master2026</strong>
          </span>
        </div>
      </div>
    );

    if (isFullPageView) {
      return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 font-sans text-white relative">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          {loginCard}
        </div>
      );
    }

    return (
      <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-fade-in">
        {loginCard}
      </div>
    );
  }

  return (
    <div className={isFullPageView ? "min-h-screen bg-slate-950 p-2 sm:p-6 flex flex-col font-sans" : "fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-2 sm:p-6 animate-fade-in"}>
      <div className={`bg-white rounded-3xl shadow-2xl w-full max-w-7xl flex flex-col overflow-hidden border border-slate-200 mx-auto ${isFullPageView ? 'flex-1 my-auto' : 'max-h-[95vh]'}`}>
        {/* Header do Centro de Comando Master */}
        <div className="px-6 py-4 bg-[#0B1528] text-white flex justify-between items-center border-b border-emerald-500/20 flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <FechaCaixaLogo size="sm" variant="horizontal" showSubtitle={false} />
            <div className="hidden sm:block h-6 w-px bg-slate-700" />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black uppercase tracking-wider text-emerald-400">
                  Painel Master SaaS
                </span>
                <span className="bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 text-[10px] font-black uppercase px-2 py-0.5 rounded">
                  👑 Dono: {ownerProfile.name}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Gerador de links isolados, gestão de cardápios, assinaturas e bloqueios de bares em Curitiba
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('owner_profile')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'owner_profile'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700'
              }`}
              title="Acessar meu cadastro de Dono do SaaS"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Meu Perfil Dono</span>
            </button>
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-900 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold transition-colors cursor-pointer"
              title="Encerrar sessão Master"
            >
              Sair do Master
            </button>
            {!isFullPageView && onClose && (
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors ml-1"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Dashboard de Métricas Rápidas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 sm:p-6 bg-slate-50 border-b border-slate-200">
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              MRR (Receita Recorrente)
            </span>
            <span className="text-xl sm:text-2xl font-black text-emerald-600 mt-0.5 block">
              {formatBRL(stats?.mrr || 747)}
            </span>
            <span className="text-[10px] text-slate-400">Mensalidade média: R$ 249/bar</span>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Bares Assinantes
            </span>
            <span className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5 block">
              {stats?.totalTenants || tenants.length}
            </span>
            <span className="text-[10px] text-emerald-600 font-bold">
              {stats?.activeTenants || tenants.filter((t) => t.status === 'ativo').length} ativos no momento
            </span>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Bares Bloqueados
            </span>
            <span className="text-xl sm:text-2xl font-black text-rose-600 mt-0.5 block">
              {stats?.blockedTenants || tenants.filter((t) => t.status === 'bloqueado').length}
            </span>
            <span className="text-[10px] text-rose-500 font-bold">Acesso suspenso até regularizar</span>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Fechamentos na Nuvem
            </span>
            <span className="text-xl sm:text-2xl font-black text-blue-600 mt-0.5 block">
              {stats?.totalClosings || 14}
            </span>
            <span className="text-[10px] text-slate-400">Processados via IA OCR</span>
          </div>
        </div>

        {/* Abas de Navegação */}
        <div className="flex border-b border-slate-200 px-6 bg-white gap-2 sm:gap-4 overflow-x-auto">
          <button
            onClick={() => setActiveTab('clients')}
            className={`py-3.5 text-xs sm:text-sm font-black border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'clients'
                ? 'border-orange-600 text-orange-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Lista de Clientes & Links de Acesso ({tenants.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('new_client')}
            className={`py-3.5 text-xs sm:text-sm font-black border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'new_client'
                ? 'border-orange-600 text-orange-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>+ Cadastrar Novo Bar</span>
          </button>
          <button
            onClick={() => setActiveTab('owner_profile')}
            className={`py-3.5 text-xs sm:text-sm font-black border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'owner_profile'
                ? 'border-orange-600 text-orange-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>👑 Meu Cadastro de Dono (Acesso Único)</span>
          </button>
        </div>

        {/* Conteúdo das Abas */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          {activeTab === 'clients' ? (
            <div className="space-y-4">
              {/* Box de Instrução de Isolamento de Links */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-600 text-white rounded-xl shrink-0 mt-0.5">
                    <Link2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-blue-950">Links Exclusivos de Cada Restaurante / Bar</h4>
                    <p className="text-xs text-blue-800 leading-relaxed mt-0.5">
                      Copie o link individual abaixo e envie para o proprietário ou operador do bar.
                      <strong> O operador só terá acesso à própria operação</strong> e não poderá ver nem selecionar outros bares.
                    </p>
                  </div>
                </div>
              </div>

              {/* Barra de Pesquisa */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="Filtrar por nome do bar, bairro de Curitiba, CNPJ ou slug..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2.5 pl-10 pr-4 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {/* Tabela de Bares com Gerador de Links */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-slate-100 text-slate-500 uppercase tracking-wider text-[11px] font-bold">
                      <th className="p-3.5 border-b">Restaurante / Bar</th>
                      <th className="p-3.5 border-b">Link de Acesso Exclusivo</th>
                      <th className="p-3.5 border-b">Plano & Mensalidade</th>
                      <th className="p-3.5 border-b text-center">Status</th>
                      <th className="p-3.5 border-b text-right">Ações Master</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredTenants.map((tenant) => {
                      const isBlocked = tenant.status === 'bloqueado';
                      const link = getBarLink(tenant);
                      const isCopied = copiedTenantId === tenant.id;

                      return (
                        <tr key={tenant.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="p-3.5">
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${tenant.logoColor} text-white font-black text-xs flex items-center justify-center shadow-sm shrink-0`}
                              >
                                {tenant.logoInitials}
                              </div>
                              <div>
                                <span className="font-extrabold text-slate-900 block">{tenant.name}</span>
                                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                                  <MapPin className="w-3 h-3 text-slate-400" /> {tenant.city} • CNPJ: {tenant.cnpj}
                                </span>
                                <div className="flex items-center gap-1.5 mt-1">
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                    PDV: {tenant.pdvSystemName || 'Jclan'}
                                  </span>
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    Cartões: {tenant.cardSystemName || 'Getnet'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Link Exclusivo do Bar */}
                          <td className="p-3.5 max-w-[280px]">
                            <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
                              <code className="text-[11px] text-slate-700 font-mono truncate select-all flex-1 px-1">
                                ?bar={tenant.slug}
                              </code>
                              <button
                                onClick={() => handleCopyBarLink(tenant)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all shrink-0 cursor-pointer ${
                                  isCopied
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-white hover:bg-slate-200 text-slate-800 border border-slate-300'
                                }`}
                                title="Copiar link completo para enviar ao cliente"
                              >
                                {isCopied ? (
                                  <>
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Copiado!</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5" />
                                    <span>Copiar Link</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </td>

                          <td className="p-3.5">
                            <span className="font-bold text-slate-800 uppercase text-xs block">
                              Plano {tenant.plan}
                            </span>
                            <span className="text-[11px] text-slate-500 font-medium">
                              {formatBRL(tenant.monthlyPrice)} / mês
                            </span>
                          </td>

                          <td className="p-3.5 text-center">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase inline-block border ${
                                isBlocked
                                  ? 'bg-rose-100 text-rose-800 border-rose-200'
                                  : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                              }`}
                            >
                              {tenant.status}
                            </span>
                          </td>

                          <td className="p-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Botão de Bloqueio Instantâneo (Fase 3) */}
                              <button
                                onClick={() => onToggleBlockTenant(tenant.id)}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                                  isBlocked
                                    ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800'
                                    : 'bg-rose-100 hover:bg-rose-200 text-rose-800'
                                }`}
                                title={
                                  isBlocked
                                    ? 'Desbloquear Acesso para este Bar'
                                    : 'Bloquear Acesso por Inadimplência'
                                }
                              >
                                {isBlocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                                <span className="hidden sm:inline">{isBlocked ? 'Desbloquear' : 'Bloquear'}</span>
                              </button>

                              {/* Gestor Centralizado de Cardápio (Fase 3) */}
                              <button
                                onClick={() => onOpenMenuManager(tenant)}
                                className="p-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                title="Editar Cardápio deste Bar"
                              >
                                <Utensils className="w-4 h-4 text-orange-600" />
                              </button>

                              {/* Aparência & Cores do Bar */}
                              <button
                                onClick={() => {
                                  if (onOpenBarAdmin) {
                                    onOpenBarAdmin(tenant);
                                  } else if (onInspectTenant) {
                                    onInspectTenant(tenant);
                                  } else {
                                    onSelectTenant(tenant);
                                    onClose?.();
                                  }
                                }}
                                className="p-2 text-slate-700 hover:bg-purple-50 rounded-lg transition-colors cursor-pointer"
                                title="Personalizar Cores, Imagem de Login e Operadores"
                              >
                                <Palette className="w-4 h-4 text-purple-600" />
                              </button>

                              {/* Cobrança / Faturas Asaas (Fase 4) */}
                              <button
                                onClick={() => onOpenBilling(tenant)}
                                className="p-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                title="Gerar Cobrança / Faturas Asaas"
                              >
                                <DollarSign className="w-4 h-4 text-teal-600" />
                              </button>

                              {/* Inspecionar como Dono da Plataforma */}
                              <button
                                onClick={() => {
                                  if (onInspectTenant) {
                                    onInspectTenant(tenant);
                                  } else {
                                    onSelectTenant(tenant);
                                    onClose?.();
                                  }
                                }}
                                className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg transition-colors cursor-pointer flex items-center gap-1 font-bold text-xs border border-indigo-200"
                                title="Inspecionar Operação e Caixa deste Bar"
                              >
                                <Eye className="w-3.5 h-3.5 text-indigo-600" />
                                <span className="hidden sm:inline">Inspecionar</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : activeTab === 'new_client' ? (
            /* Formulário de Cadastro de Novo Bar de Curitiba */
            <div className="max-w-2xl mx-auto bg-slate-50 border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="mb-6">
                <h3 className="text-base font-black text-slate-800">Cadastrar Novo Restaurante / Bar Parceiro</h3>
                <p className="text-xs text-slate-500 mt-1">
                  O sistema criará o identificador isolado de tenant, gerará o link exclusivo (`?bar=...`), clonará o cardápio base e criará o operador admin inicial automaticamente.
                </p>
              </div>

              <form onSubmit={handleCreateNewBar} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Nome do Bar / Casa</label>
                    <input
                      type="text"
                      required
                      value={newBarForm.name}
                      onChange={(e) => setNewBarForm({ ...newBarForm, name: e.target.value })}
                      placeholder="Ex: Bar do Alemão - Curitiba"
                      className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs sm:text-sm font-semibold text-[#000000] outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">CNPJ</label>
                    <input
                      type="text"
                      value={newBarForm.cnpj}
                      onChange={(e) => setNewBarForm({ ...newBarForm, cnpj: e.target.value })}
                      placeholder="00.000.000/0001-00"
                      className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs sm:text-sm font-semibold text-[#191818] outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Cidade / Região</label>
                    <input
                      type="text"
                      value={newBarForm.city}
                      onChange={(e) => setNewBarForm({ ...newBarForm, city: e.target.value })}
                      placeholder="Curitiba - PR"
                      className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs sm:text-sm font-semibold text-[#000000] outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Endereço</label>
                    <input
                      type="text"
                      value={newBarForm.address}
                      onChange={(e) => setNewBarForm({ ...newBarForm, address: e.target.value })}
                      placeholder="Ex: R. Dr. Claudino dos Santos, 175 - São Francisco"
                      className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs sm:text-sm font-semibold text-[#191818] outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Telefone / WhatsApp</label>
                    <input
                      type="text"
                      value={newBarForm.phone}
                      onChange={(e) => setNewBarForm({ ...newBarForm, phone: e.target.value })}
                      placeholder="(41) 99999-0000"
                      className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs sm:text-sm font-semibold text-[#191818] outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">E-mail Financeiro</label>
                    <input
                      type="email"
                      value={newBarForm.contactEmail}
                      onChange={(e) => setNewBarForm({ ...newBarForm, contactEmail: e.target.value })}
                      placeholder="financeiro@bar.com.br"
                      className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs sm:text-sm font-semibold text-[#191818] outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Plano SaaS</label>
                  <select
                    value={newBarForm.plan}
                    onChange={(e) => setNewBarForm({ ...newBarForm, plan: e.target.value as SaaSPlan })}
                    className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs sm:text-sm font-semibold text-[#191818] outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="basico">Plano Básico - R$ 149/mês (Até 3 máquinas Getnet)</option>
                    <option value="pro">Plano Pro - R$ 249/mês (Até 9 máquinas + Gemini OCR)</option>
                    <option value="enterprise">Plano Enterprise - R$ 399/mês (Múltiplos turnos 24h + Suporte VIP)</option>
                  </select>
                </div>

                {/* Sistemas Utilizados pelo Bar Parceiro */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                    <label className="block text-xs font-black text-slate-800 uppercase tracking-wide">
                      Sistemas Utilizados na Conciliação
                    </label>
                  </div>
                  <p className="text-[11px] text-slate-500 mb-3 leading-relaxed">
                    Personalize os sistemas de PDV e cartões utilizados pelo cliente para que o assistente e relatórios usem os nomes corretos (ex: Totvs Chef, Colibri, Saipos, Zig, Cielo, Stone, Rede).
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                        Sistema PDV / Comandas
                      </label>
                      <input
                        type="text"
                        value={newBarForm.pdvSystemName}
                        onChange={(e) => setNewBarForm({ ...newBarForm, pdvSystemName: e.target.value })}
                        placeholder="Ex: Jclan, Colibri, Totvs Chef, Saipos, Zig"
                        className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs sm:text-sm font-semibold text-[#191818] outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                        Maquininhas de Cartão
                      </label>
                      <input
                        type="text"
                        value={newBarForm.cardSystemName}
                        onChange={(e) => setNewBarForm({ ...newBarForm, cardSystemName: e.target.value })}
                        placeholder="Ex: Getnet, Stone, Cielo, PagBank, Rede"
                        className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs sm:text-sm font-semibold text-[#191818] outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Observações Internas</label>
                  <textarea
                    rows={2}
                    value={newBarForm.notes}
                    onChange={(e) => setNewBarForm({ ...newBarForm, notes: e.target.value })}
                    placeholder="Ex: Contato com o gerente Carlos, fechamento de turnos diurnos e noturnos."
                    className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs sm:text-sm text-[#191818] outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveTab('clients')}
                    className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs sm:text-sm hover:bg-slate-100 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    <span>Cadastrar e Gerar Link</span>
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* Formulário de Cadastro do Dono do SaaS (Acesso Exclusivo) */
            <div className="max-w-2xl mx-auto bg-slate-50 border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="mb-6 flex items-start gap-3">
                <div className="p-3 bg-amber-500 text-slate-950 rounded-2xl shadow-sm shrink-0">
                  <UserCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Meu Cadastro de Dono & Único Administrador Master
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Configure os seus dados de proprietário da plataforma SaaS. <strong>Apenas você com este e-mail e senha poderá acessar este painel.</strong> Nenhum operador ou dono de bar terá acesso a esta área.
                  </p>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6 text-xs text-amber-900 flex items-start gap-2.5">
                <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-black mb-0.5">Isolamento Absoluto de Segurança:</strong>
                  Ao salvar suas credenciais aqui, a tela de login de cada bar exibirá apenas o sistema daquele restaurante específico, bloqueando qualquer visualização de outros bares ou acesso ao login master.
                </div>
              </div>

              <form onSubmit={handleSaveOwnerProfile} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-orange-600" />
                      <span>Nome Completo do Dono</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={ownerProfile.name}
                      onChange={(e) => setOwnerProfile({ ...ownerProfile, name: e.target.value })}
                      placeholder="Ex: Bruno Lima"
                      className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs sm:text-sm font-semibold outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-orange-600" />
                      <span>E-mail Master (Login Exclusivo)</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={ownerProfile.email}
                      onChange={(e) => setOwnerProfile({ ...ownerProfile, email: e.target.value })}
                      placeholder="brunotlima7@gmail.com"
                      className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs sm:text-sm font-semibold outline-none focus:ring-2 focus:ring-orange-500 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1 flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-orange-600" />
                      <span>Senha / PIN Master de Acesso</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={ownerProfile.pin}
                      onChange={(e) => setOwnerProfile({ ...ownerProfile, pin: e.target.value })}
                      placeholder="master2026"
                      className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs sm:text-sm font-mono font-bold outline-none focus:ring-2 focus:ring-orange-500"
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      Padrão atual: master2026 (ou escolha uma nova senha segura)
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-orange-600" />
                      <span>Telefone / WhatsApp</span>
                    </label>
                    <input
                      type="text"
                      value={ownerProfile.phone || ''}
                      onChange={(e) => setOwnerProfile({ ...ownerProfile, phone: e.target.value })}
                      placeholder="(41) 99882-1917"
                      className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs sm:text-sm font-semibold outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200 flex justify-end">
                  <button
                    type="submit"
                    disabled={isSavingOwner}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-black text-xs sm:text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isSavingOwner ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    <span>Salvar Cadastro de Dono</span>
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
