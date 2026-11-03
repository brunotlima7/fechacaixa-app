import React, { useState, useEffect } from 'react';
import {
  X,
  RefreshCw,
  Globe,
  Lock,
  User,
  Zap,
  Camera,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  RotateCcw,
  Calendar,
  Clock,
  Building2,
} from 'lucide-react';
import { Tenant } from '../types/saas.ts';
import { preprocessReceiptImage } from '../utils/imagePreprocessing.ts';

export interface JclanTotalsResult {
  credit: string;
  debit: string;
  pix: string;
  voucher: string;
  cash: string;
}

export interface JclanBreakdownEntry {
  label: string;
  amount: number;
  formatted: string;
  category: 'credit' | 'debit' | 'pix' | 'voucher' | 'cash' | 'other';
}

export interface JclanCompanyEntry {
  id: string;
  name: string;
  codigoInterno?: string | number;
}

interface JclanLiveSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenant: Tenant;
  apiKey?: string;
  lastJclanSyncAt: number | null;
  lastJclanError: string | null;
  lastPeriodLabel?: string | null;
  lastSelectedEmpresaName?: string | null;
  lastBreakdown?: JclanBreakdownEntry[];
  lastChangeSummary?: string | null;
  availableCompanies?: JclanCompanyEntry[];
  canUndoJclan: boolean;
  onUndoJclan: () => void;
  onSavePortalConfig: (updates: Partial<Tenant>) => Promise<void>;
  onTriggerManualSync: (overrideCreds?: {
    portalUrl: string;
    username: string;
    password: string;
    forceRelogin?: boolean;
    dateMode?: 'turno_auto' | 'hoje' | 'ontem' | 'custom';
    customStartDate?: string;
    customStartTime?: string;
    customEndDate?: string;
    customEndTime?: string;
    selectedEmpresaId?: string;
  }) => Promise<boolean>;
  onApplyTotals: (totals: JclanTotalsResult, sourceLabel: string) => void;
  onShowToast: (msg: string) => void;
}

const getTodayYmd = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const JclanLiveSyncModal: React.FC<JclanLiveSyncModalProps> = ({
  isOpen,
  onClose,
  tenant,
  apiKey,
  lastJclanSyncAt,
  lastJclanError,
  lastPeriodLabel,
  lastSelectedEmpresaName,
  lastBreakdown = [],
  lastChangeSummary,
  availableCompanies = [],
  canUndoJclan,
  onUndoJclan,
  onSavePortalConfig,
  onTriggerManualSync,
  onApplyTotals,
}) => {
  const pdvName = tenant.pdvSystemName || 'Jclan';
  const [activeTab, setActiveTab] = useState<'portal' | 'screen_ocr'>('portal');

  const [portalUrl, setPortalUrl] = useState(
    tenant.jclanPortalUrl || 'https://gestao.flordebrasacuritiba.com.br/'
  );
  const [username, setUsername] = useState(tenant.jclanPortalUsername || '');
  const [password, setPassword] = useState(tenant.jclanPortalPassword || '');

  const [dateMode, setDateMode] = useState<'turno_auto' | 'hoje' | 'ontem' | 'custom'>(
    tenant.jclanDateMode || 'turno_auto'
  );
  const [customStartDate, setCustomStartDate] = useState(
    tenant.jclanCustomStartDate || getTodayYmd()
  );
  const [customStartTime, setCustomStartTime] = useState(tenant.jclanCustomStartTime || '00:00');
  const [customEndDate, setCustomEndDate] = useState(tenant.jclanCustomEndDate || getTodayYmd());
  const [customEndTime, setCustomEndTime] = useState(tenant.jclanCustomEndTime || '23:59');
  const [selectedEmpresaId, setSelectedEmpresaId] = useState(tenant.jclanSelectedEmpresaId || '');

  const [isSyncingNow, setIsSyncingNow] = useState(false);
  const [isReadingScreen, setIsReadingScreen] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setPortalUrl(tenant.jclanPortalUrl || 'https://gestao.flordebrasacuritiba.com.br/');
      setUsername(tenant.jclanPortalUsername || '');
      setPassword(tenant.jclanPortalPassword || '');
      setDateMode(tenant.jclanDateMode || 'turno_auto');
      setCustomStartDate(tenant.jclanCustomStartDate || getTodayYmd());
      setCustomStartTime(tenant.jclanCustomStartTime || '00:00');
      setCustomEndDate(tenant.jclanCustomEndDate || getTodayYmd());
      setCustomEndTime(tenant.jclanCustomEndTime || '23:59');
      setSelectedEmpresaId(tenant.jclanSelectedEmpresaId || '');
      setLocalError(null);
    }
  }, [isOpen, tenant]);

  // Permite colar Print da tela (Ctrl + V) quando o modal está aberto
  useEffect(() => {
    if (!isOpen) return;
    const handleWindowPaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            setActiveTab('screen_ocr');
            await processScreenImageFile(file);
          }
          return;
        }
      }
    };
    window.addEventListener('paste', handleWindowPaste);
    return () => window.removeEventListener('paste', handleWindowPaste);
  }, [isOpen]);

  if (!isOpen) return null;

  const companiesList: JclanCompanyEntry[] =
    availableCompanies.length > 0 ? availableCompanies : tenant.jclanEmpresasCache || [];

  const handleSaveAndSyncNow = async () => {
    setLocalError(null);
    const cleanUrl = portalUrl.trim() || 'https://gestao.flordebrasacuritiba.com.br/';
    const cleanUser = username.trim();

    if (!cleanUser || !password) {
      setLocalError('Informe o E-mail e a Senha que você usa no portal da Jclan.');
      return;
    }

    setIsSyncingNow(true);
    try {
      await onSavePortalConfig({
        jclanPortalUrl: cleanUrl,
        jclanPortalUsername: cleanUser,
        jclanPortalPassword: password,
        jclanAutoSyncEnabled: false,
        jclanDateMode: dateMode,
        jclanCustomStartDate: customStartDate,
        jclanCustomStartTime: customStartTime,
        jclanCustomEndDate: customEndDate,
        jclanCustomEndTime: customEndTime,
        jclanSelectedEmpresaId: selectedEmpresaId || undefined,
      });

      const ok = await onTriggerManualSync({
        portalUrl: cleanUrl,
        username: cleanUser,
        password,
        forceRelogin: true,
        dateMode,
        customStartDate,
        customStartTime,
        customEndDate,
        customEndTime,
        selectedEmpresaId: selectedEmpresaId || undefined,
      });

      if (!ok) {
        setLocalError(
          lastJclanError ||
            'Não foi possível autenticar na API AlphaX9 da Jclan. Verifique seu E-mail e Senha.'
        );
      }
    } finally {
      setIsSyncingNow(false);
    }
  };

  const handleSelectDateMode = async (nextMode: 'turno_auto' | 'hoje' | 'ontem' | 'custom') => {
    setDateMode(nextMode);
    await onSavePortalConfig({
      jclanDateMode: nextMode,
    });
    if (username.trim() && password && nextMode !== 'custom') {
      setIsSyncingNow(true);
      try {
        await onTriggerManualSync({
          portalUrl: portalUrl.trim() || 'https://gestao.flordebrasacuritiba.com.br/',
          username: username.trim(),
          password,
          dateMode: nextMode,
          customStartDate,
          customStartTime,
          customEndDate,
          customEndTime,
          selectedEmpresaId: selectedEmpresaId || undefined,
        });
      } finally {
        setIsSyncingNow(false);
      }
    }
  };

  const handleSelectCompany = async (empId: string) => {
    setSelectedEmpresaId(empId);
    await onSavePortalConfig({
      jclanSelectedEmpresaId: empId || undefined,
    });
    if (username.trim() && password) {
      setIsSyncingNow(true);
      try {
        await onTriggerManualSync({
          portalUrl: portalUrl.trim() || 'https://gestao.flordebrasacuritiba.com.br/',
          username: username.trim(),
          password,
          dateMode,
          customStartDate,
          customStartTime,
          customEndDate,
          customEndTime,
          selectedEmpresaId: empId || undefined,
        });
      } finally {
        setIsSyncingNow(false);
      }
    }
  };

  const processScreenImageFile = async (file: File) => {
    setIsReadingScreen(true);
    setLocalError(null);
    const t0 = performance.now();
    try {
      const preprocessed = await preprocessReceiptImage(file);
      const res = await fetch('/api/jclan/ocr-screen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: preprocessed.base64,
          mimeType: preprocessed.mimeType,
          customApiKey: apiKey || localStorage.getItem('geminiApiKey') || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Não foi possível ler o print da tela.');
      }

      const totals: JclanTotalsResult = data.totals;
      const hasAny = Boolean(
        totals.credit || totals.debit || totals.pix || totals.voucher || totals.cash
      );
      if (!hasAny) {
        throw new Error(
          'Nenhum valor de Crédito, Débito, Pix, Voucher ou Dinheiro foi identificado na imagem.'
        );
      }

      const elapsed = ((performance.now() - t0) / 1000).toFixed(1);
      onApplyTotals(totals, `Print/Foto da Tela ${pdvName} (${elapsed}s)`);
      onClose();
    } catch (err: any) {
      setLocalError(err.message || 'Erro ao processar imagem da tela do Jclan.');
    } finally {
      setIsReadingScreen(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processScreenImageFile(file);
    e.target.value = '';
  };

  const isConnectedOk = Boolean(lastJclanSyncAt && !lastJclanError && !localError);
  const hasConnectionError = Boolean(lastJclanError || localError);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden text-slate-100 my-auto">
        {/* Cabeçalho */}
        <div className="px-5 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-slate-700/80 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                  Conexão Direta {pdvName} AlphaX9
                </h2>
                {isConnectedOk && (
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Conectado Jclan
                  </span>
                )}
                {hasConnectionError && (
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-rose-400">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Erro Jclan
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Atualiza sob demanda <strong className="text-slate-200">Crédito, Débito, Pix, Voucher e Dinheiro</strong> via botão com 1 clique
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {canUndoJclan && (
              <button
                type="button"
                onClick={onUndoJclan}
                className="px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
                title="Restaurar os valores anteriores antes da última leitura do Jclan"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Desfazer</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Abas de Modo */}
        <div className="grid grid-cols-2 gap-2 p-3 bg-slate-950/60 border-b border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('portal')}
            className={`py-2.5 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'portal'
                ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/25'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <Zap className="w-4 h-4" />
            <span>1. Conexão Direta c/ Login (1 Clique)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('screen_ocr')}
            className={`py-2.5 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'screen_ocr'
                ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/25'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>2. Ler Print / Foto da Tela (1s)</span>
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[78vh] overflow-y-auto">
          {(localError || lastJclanError) && (
            <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="space-y-1 flex-1">
                <p className="font-bold text-rose-300">Aviso na conexão:</p>
                <p>{localError || lastJclanError}</p>
              </div>
            </div>
          )}

          {activeTab === 'portal' && (
            <div className="space-y-4">
              {/* Explicação do Modo Sob Demanda (1 Clique) */}
              <div className="p-3.5 rounded-xl bg-slate-950/90 border border-cyan-500/30 flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-cyan-400" />
                    <span className="text-sm font-black text-white">
                      Atualização Manual Sob Demanda (1 Clique)
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Sem consultas automáticas em segundo plano. Sempre que o operador finalizar uma operação no {pdvName}, basta clicar em <strong className="text-cyan-300">Atualizar Valores {pdvName}</strong> para ver o resultado da mudança na hora.
                  </p>
                </div>
              </div>

              {/* Seletor de Período de Data/Hora (Turno Inteligente / Hoje / Ontem / Personalizado) */}
              <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Período do Fechamento na Jclan</span>
                  </label>
                  {lastPeriodLabel && (
                    <span className="text-[11px] font-mono text-emerald-400">
                      Lendo: {lastPeriodLabel}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'turno_auto', label: 'Turno Inteligente', desc: 'Auto (Madrugada/Dia)' },
                    { id: 'hoje', label: 'Hoje', desc: '00:00 às 23:59' },
                    { id: 'ontem', label: 'Ontem', desc: '00:00 às 23:59' },
                    { id: 'custom', label: 'Data e Hora', desc: 'Personalizar' },
                  ].map((opt) => {
                    const active = dateMode === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() =>
                          handleSelectDateMode(
                            opt.id as 'turno_auto' | 'hoje' | 'ontem' | 'custom'
                          )
                        }
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          active
                            ? 'bg-cyan-500/15 border-cyan-500 text-white'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <div className="text-xs font-black">{opt.label}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{opt.desc}</div>
                      </button>
                    );
                  })}
                </div>

                {dateMode === 'custom' && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-slate-800/80">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                        Data Início
                      </label>
                      <input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        className="w-full px-2.5 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                        Hora Início
                      </label>
                      <input
                        type="time"
                        value={customStartTime}
                        onChange={(e) => setCustomStartTime(e.target.value)}
                        className="w-full px-2.5 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                        Data Fim
                      </label>
                      <input
                        type="date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        className="w-full px-2.5 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                        Hora Fim
                      </label>
                      <input
                        type="time"
                        value={customEndTime}
                        onChange={(e) => setCustomEndTime(e.target.value)}
                        className="w-full px-2.5 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Seletor de Filial / Empresa (quando o login retorna empresas) */}
              {companiesList.length > 0 && (
                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Empresa / Unidade Vinculada na Jclan</span>
                    </label>
                    <span className="text-[11px] text-emerald-400 font-bold">
                      {lastSelectedEmpresaName || companiesList[0]?.name}
                    </span>
                  </div>

                  {companiesList.length > 1 ? (
                    <select
                      value={selectedEmpresaId || companiesList[0]?.id || ''}
                      onChange={(e) => handleSelectCompany(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-bold focus:outline-none focus:border-cyan-500"
                    >
                      {companiesList.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.codigoInterno ? `${emp.codigoInterno} - ` : ''}
                          {emp.name}
                        </option>
                      ))}
                      <option value="ALL">Somar Todas as Empresas ({companiesList.length})</option>
                    </select>
                  ) : (
                    <div className="text-xs text-slate-400">
                      Unidade selecionada automaticamente:{' '}
                      <strong className="text-white">
                        {companiesList[0]?.codigoInterno
                          ? `${companiesList[0].codigoInterno} - `
                          : ''}
                        {companiesList[0]?.name}
                      </strong>
                    </div>
                  )}
                </div>
              )}

              {/* Credenciais do Portal Jclan */}
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-300">
                      URL do Portal de Gestão {pdvName}
                    </label>
                    <a
                      href={portalUrl || 'https://gestao.flordebrasacuritiba.com.br/'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1"
                    >
                      <span>Abrir portal</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <div className="relative">
                    <Globe className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="url"
                      value={portalUrl}
                      onChange={(e) => setPortalUrl(e.target.value)}
                      placeholder="https://gestao.flordebrasacuritiba.com.br/"
                      className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      E-mail de Login no Portal Jclan
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="seuemail@flordebrasa.com.br"
                        autoComplete="username"
                        className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Senha do Portal Jclan
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        autoComplete="current-password"
                        className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Detalhamento da Última Leitura */}
              {lastJclanSyncAt && (
                <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 space-y-2">
                  <div className="flex items-center justify-between text-xs text-emerald-300">
                    <div className="flex items-center gap-2 font-bold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>
                        Sincronizado às {new Date(lastJclanSyncAt).toLocaleTimeString('pt-BR')}
                      </span>
                    </div>
                    {lastPeriodLabel && (
                      <span className="text-[11px] font-mono text-emerald-400/90 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {lastPeriodLabel}
                      </span>
                    )}
                  </div>

                  {lastChangeSummary && (
                    <div className="px-2.5 py-1.5 rounded-lg bg-cyan-950/60 border border-cyan-500/30 text-[11px] text-cyan-200 font-bold">
                      Resultado da última atualização: <span className="font-mono text-white">{lastChangeSummary}</span>
                    </div>
                  )}

                  {lastBreakdown.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 pt-1">
                      {lastBreakdown.map((item, idx) => {
                        const isPix = item.category === 'pix';
                        return (
                          <div
                            key={`${item.label}-${idx}`}
                            className={`px-2.5 py-1.5 rounded-lg border flex items-center justify-between text-[11px] ${
                              isPix
                                ? 'bg-emerald-950/40 border-emerald-500/40'
                                : 'bg-slate-900/90 border-slate-800'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 truncate mr-2 min-w-0">
                              <span className="text-slate-300 truncate">{item.label}</span>
                              {isPix && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
                                  PIX
                                </span>
                              )}
                            </div>
                            <span className="font-mono font-bold text-white shrink-0">
                              R$ {item.formatted}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400">
                      Conectado à API Jclan AlphaX9 com sucesso. Nenhuma venda finalizada registrada neste período ainda.
                    </p>
                  )}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                <button
                  type="button"
                  disabled={isSyncingNow}
                  onClick={handleSaveAndSyncNow}
                  className="flex-1 py-3 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-cyan-600/25 cursor-pointer transition-all"
                >
                  <RefreshCw className={`w-4 h-4 ${isSyncingNow ? 'animate-spin' : ''}`} />
                  <span>
                    {isSyncingNow
                      ? 'Conectando à API Jclan AlphaX9...'
                      : `Salvar & Atualizar Valores do ${pdvName} Agora`}
                  </span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'screen_ocr' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <p className="text-xs text-slate-300 leading-relaxed">
                  Tire um <strong>Print da tela</strong> (<code className="text-cyan-300">Win + Shift + S</code> ou <code className="text-cyan-300">PrintScreen</code>) com o portal Jclan aberto e pressione{' '}
                  <kbd className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-cyan-300 font-mono text-xs">
                    Ctrl + V
                  </kbd>{' '}
                  aqui, ou tire uma foto do monitor pelo celular:
                </p>
              </div>

              <label className="flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed border-cyan-500/40 bg-slate-950/60 hover:bg-slate-950 hover:border-cyan-400 transition-all cursor-pointer text-center">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  disabled={isReadingScreen}
                  className="hidden"
                />
                <div className="w-14 h-14 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-3">
                  {isReadingScreen ? (
                    <RefreshCw className="w-7 h-7 animate-spin" />
                  ) : (
                    <Camera className="w-7 h-7" />
                  )}
                </div>
                <span className="text-sm font-black text-white">
                  {isReadingScreen
                    ? 'Lendo valores da tela do Jclan...'
                    : 'Clique para enviar Foto/Print ou pressione Ctrl+V'}
                </span>
                <span className="text-xs text-slate-400 mt-1">
                  Identifica Crédito, Débito, Pix (incluindo Movimentação Bancária), Voucher e Dinheiro em 1 a 2s
                </span>
              </label>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
