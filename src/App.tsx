import React, { useState, useEffect, useMemo, useRef, useCallback, Suspense } from 'react';
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
  Timer,
  AlertTriangle,
  Bell,
  Clock,
  Volume2,
  Headphones,
  Mic,
  Smartphone,
  Monitor,
  ArrowLeftRight,
  Moon,
  Sun,
  Download,
  Globe,
  Zap,
  RotateCcw
} from 'lucide-react';

import {
  Tenant,
  SaaSPlan,
  MenuItem,
  CommandItem,
  TenantUser,
  HistoryRecord,
  Invoice,
  MasterStats,
  AuditLogEntry,
  ActiveShiftDraft,
  isHappyHourOrPromoItem,
  PLAN_PRICING,
  PLAN_DETAILS,
  getPlanCapabilities,
  PlanCapabilities
} from './types/saas.ts';
import { UpgradePlanModal, FeatureGateReason } from './components/saas/UpgradePlanModal.tsx';
import { FLOR_DE_BRASA_MENU } from './data/defaultMenus.ts';
import { saasApi } from './services/saasApi.ts';
import { playClosingReminderChime } from './utils/audioAlert.ts';
import { preprocessReceiptImage } from './utils/imagePreprocessing.ts';
import { VoiceAction, ShiftSnapshot } from './utils/voiceCommandParser.ts';
import { generateClosingReportPdf, ClosingPdfData } from './utils/closingReportPdf.ts';
import { StoreSwitcher } from './components/saas/StoreSwitcher.tsx';
import { MasterPanelModal } from './components/saas/MasterPanelModal.tsx';
import { SuspendedBarBanner } from './components/saas/SuspendedBarBanner.tsx';
import { getTheme } from './utils/theme.ts';
import { FechaCaixaLogo } from './components/brand/FechaCaixaLogo.tsx';
import {
  saveClosingsForTenant,
  getClosingsFromLocalStorageSync,
  loadClosingsForTenantAsync,
  mergeClosingRecordLists,
  getDeletedClosingIdsSync,
  getDeletedClosingIdsAsync,
  addDeletedClosingId,
  clearAllPersistenceForTenant,
  saveDraftToPersistence,
  loadDraftFromPersistence,
  clearDraftFromPersistence,
  saveAuditLogsToPersistence,
  loadAuditLogsFromPersistence,
  AutoBackupSettings,
  getAutoBackupSettings,
  saveAutoBackupSettings,
  triggerFullRedundantBackupDownload,
} from './utils/closingPersistence.ts';

// --- CODE SPLITTING / LAZY LOADING DE MODAIS SECUNDÁRIOS ---
const BarBillingModal = React.lazy(() =>
  import('./components/saas/BarBillingModal.tsx').then((m) => ({ default: m.BarBillingModal }))
);
const MenuManagerModal = React.lazy(() =>
  import('./components/saas/MenuManagerModal.tsx').then((m) => ({ default: m.MenuManagerModal }))
);
const BarAdminModal = React.lazy(() =>
  import('./components/saas/BarAdminModal.tsx').then((m) => ({ default: m.BarAdminModal }))
);
const SaveClosingModal = React.lazy(() =>
  import('./components/closing/SaveClosingModal.tsx').then((m) => ({ default: m.SaveClosingModal }))
);
const FinalPdvSummaryModal = React.lazy(() =>
  import('./components/closing/FinalPdvSummaryModal.tsx').then((m) => ({ default: m.FinalPdvSummaryModal }))
);
const ImageZoomModal = React.lazy(() =>
  import('./components/common/ImageZoomModal.tsx').then((m) => ({ default: m.ImageZoomModal }))
);
const AuditTrailDrawer = React.lazy(() =>
  import('./components/common/AuditTrailDrawer.tsx').then((m) => ({ default: m.AuditTrailDrawer }))
);
const SupportDivergenceModal = React.lazy(() =>
  import('./components/support/SupportDivergenceModal.tsx').then((m) => ({ default: m.SupportDivergenceModal }))
);
const InteractiveClosingGuide = React.lazy(() =>
  import('./components/common/InteractiveClosingGuide.tsx').then((m) => ({ default: m.InteractiveClosingGuide }))
);
const VoiceAssistantPanel = React.lazy(() =>
  import('./components/common/VoiceAssistantPanel.tsx').then((m) => ({ default: m.VoiceAssistantPanel }))
);
const MultiDeviceSyncModal = React.lazy(() =>
  import('./components/common/MultiDeviceSyncModal.tsx').then((m) => ({ default: m.MultiDeviceSyncModal }))
);
import {
  JclanLiveSyncModal,
  JclanTotalsResult,
  JclanBreakdownEntry,
  JclanCompanyEntry,
} from './components/JclanLiveSyncModal.tsx';

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

// --- FUNÇÕES UTILITÁRIAS (PRECISÃO EM CENTAVOS) ---
export const roundCurrency = (val: number): number => {
  return Math.round((val + Number.EPSILON) * 100) / 100;
};

export const parseValue = (val: string | number | undefined | null): number => {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : roundCurrency(val);
  const str = val.toString().trim().replace(/[^\d.,-]/g, '');
  if (!str) return 0;

  let normalized = str;
  const lastComma = str.lastIndexOf(',');
  const lastDot = str.lastIndexOf('.');

  if (lastComma !== -1 && lastDot !== -1) {
    // Possui ponto e vírgula: o último separador é o decimal
    if (lastComma > lastDot) {
      normalized = str.replace(/\./g, '').replace(',', '.');
    } else {
      normalized = str.replace(/,/g, '');
    }
  } else if (lastComma !== -1) {
    // Apenas vírgula (ex: "15,50" ou "120,5")
    const parts = str.split(',');
    if (parts.length > 2) {
      const dec = parts.pop();
      normalized = `${parts.join('')}.${dec}`;
    } else {
      normalized = str.replace(',', '.');
    }
  } else if (lastDot !== -1) {
    // Apenas ponto: se houver 1 ponto seguido de 1 ou 2 dígitos no final (ex: "15.50" ou "15.5"), trata como decimal
    const parts = str.split('.');
    if (parts.length === 2 && parts[1].length <= 2) {
      normalized = str;
    } else {
      normalized = str.replace(/\./g, '');
    }
  }

  const parsed = parseFloat(normalized);
  return isNaN(parsed) ? 0 : roundCurrency(parsed);
};

export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
};

export const sumArray = (arr: string[] = []): number => {
  const totalCents = arr.reduce((acc, curr) => acc + Math.round(parseValue(curr) * 100), 0);
  return totalCents / 100;
};

// --- COMPONENTE CARD DE COMPARAÇÃO (MEMOIZADO) ---
interface ComparisonCardProps {
  title: string;
  getnetVal: number;
  jclanVal: string;
  field: 'credit' | 'debit' | 'pix' | 'voucher';
  iconColor: string;
  onJclanChange: (field: 'credit' | 'debit' | 'pix' | 'voucher', val: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>, field: string) => void;
  onFieldBlur?: (field: 'credit' | 'debit' | 'pix' | 'voucher') => void;
  cardName?: string;
  pdvName?: string;
}

const ComparisonCard: React.FC<ComparisonCardProps> = React.memo(({
  title,
  getnetVal,
  jclanVal,
  field,
  iconColor,
  onJclanChange,
  onKeyDown,
  onFieldBlur,
  cardName = 'Getnet',
  pdvName = 'Jclan',
}) => {
  const diff = roundCurrency(getnetVal - parseValue(jclanVal));
  let colorClass =
    'text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700';
  if (diff >= 0.01)
    colorClass =
      'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800/70';
  if (diff <= -0.01)
    colorClass =
      'text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800/70';

  return (
    <div className="flex flex-col bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:border-slate-300 dark:hover:border-slate-700 relative">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <span className={`w-2.5 h-2.5 rounded-full ${iconColor}`}></span>
          {title}
        </span>
      </div>
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">{cardName}:</span>
        <span className="text-sm font-bold text-slate-800 dark:text-slate-100 tabular-nums">{formatCurrency(getnetVal)}</span>
      </div>
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">{pdvName}:</span>
        <div className="relative w-28">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold">R$</span>
          <input
            id={`jclan-${field}`}
            type="text"
            placeholder="0,00"
            value={jclanVal}
            onChange={(e) => onJclanChange(field, e.target.value)}
            onKeyDown={(e) => onKeyDown && onKeyDown(e, field)}
            onBlur={() => onFieldBlur && onFieldBlur(field)}
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 rounded p-1 pl-7 text-right text-xs font-bold text-slate-800 dark:text-slate-100 outline-none transition-all tabular-nums"
          />
        </div>
      </div>
      <div
        className={`text-center text-xs font-bold mt-auto pt-2 border-t rounded-b-lg -mx-3 -mb-3 pb-2 transition-colors tabular-nums ${colorClass}`}
      >
        Dif: {formatCurrency(diff)}
      </div>
    </div>
  );
});

// --- CACHE WEAKMAP POR REFERÊNCIA DE MAQUININHA (EVITA RE-PARSE DE STRINGS EM MÁQUINAS NÃO ALTERADAS) ---
interface MachineCentsSummary {
  creditCents: number;
  debitCents: number;
  voucherCents: number;
  pixCents: number;
  totalCents: number;
  creditArrCents: number[];
  debitArrCents: number[];
  voucherArrCents: number[];
}

const machineCentsWeakCache = new WeakMap<Machine, MachineCentsSummary>();

const getMachineCentsSummary = (machine: Machine): MachineCentsSummary => {
  const cached = machineCentsWeakCache.get(machine);
  if (cached) return cached;

  const creditArrCents = (machine.credits || []).map((v) => Math.round(parseValue(v) * 100));
  const debitArrCents = (machine.debits || []).map((v) => Math.round(parseValue(v) * 100));
  const voucherArrCents = (machine.vouchers || []).map((v) => Math.round(parseValue(v) * 100));

  let creditCents = 0;
  for (let i = 0; i < creditArrCents.length; i++) creditCents += creditArrCents[i];

  let debitCents = 0;
  for (let i = 0; i < debitArrCents.length; i++) debitCents += debitArrCents[i];

  let voucherCents = 0;
  for (let i = 0; i < voucherArrCents.length; i++) voucherCents += voucherArrCents[i];

  const pixCents = Math.round(parseValue(machine.pix) * 100);
  const totalCents = creditCents + debitCents + voucherCents + pixCents;

  const summary: MachineCentsSummary = {
    creditCents,
    debitCents,
    voucherCents,
    pixCents,
    totalCents,
    creditArrCents,
    debitArrCents,
    voucherArrCents,
  };
  machineCentsWeakCache.set(machine, summary);
  return summary;
};

// --- COMPONENTE CARD DE MAQUININHA INDIVIDUAL (MEMOIZADO + RENDERIZAÇÃO SELETIVA DE VIEWPORT) ---
interface MachineCardProps {
  machine: Machine;
  isCompactView: boolean;
  isLoading: boolean;
  isVoiceActive: boolean;
  enableViewportVirtualization?: boolean;
  canUseAiAssistants?: boolean;
  onGateTrigger?: (reason: 'ai_ocr' | 'ai_voice') => void;
  creditFlags?: string[];
  debitFlags?: string[];
  voucherNames?: string[];
  onToggleCollapse: (machineId: number) => void;
  onOpenVoice: (machineId: number, isCollapsed: boolean) => void;
  onClearMachine: (machineId: number) => void;
  onRemoveMachine: (machineId: number) => void;
  onImageUpload: (machineId: number, e: React.ChangeEvent<HTMLInputElement>) => void;
  onAddField: (machineId: number, type: 'credits' | 'debits' | 'vouchers') => void;
  onArrayChange: (machineId: number, type: 'credits' | 'debits' | 'vouchers', index: number, value: string) => void;
  onArrayBlur: (machineId: number, type: 'credits' | 'debits' | 'vouchers', index: number, value: string) => void;
  onPixChange: (machineId: number, value: string) => void;
  onPixBlur: (machineId: number, value: string) => void;
  onKeyDown: (
    e: React.KeyboardEvent<HTMLInputElement>,
    machineId: number,
    type: 'credits' | 'debits' | 'vouchers' | 'pix',
    index: number
  ) => void;
}

const areArraysShallowEqual = (a?: string[], b?: string[]): boolean => {
  if (a === b) return true;
  if (!a || !b) return (!a || a.length === 0) && (!b || b.length === 0);
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
};

const areMachineCardPropsEqual = (prev: MachineCardProps, next: MachineCardProps): boolean => {
  return (
    prev.machine === next.machine &&
    prev.isCompactView === next.isCompactView &&
    prev.isLoading === next.isLoading &&
    prev.isVoiceActive === next.isVoiceActive &&
    prev.enableViewportVirtualization === next.enableViewportVirtualization &&
    prev.canUseAiAssistants === next.canUseAiAssistants &&
    areArraysShallowEqual(prev.creditFlags, next.creditFlags) &&
    areArraysShallowEqual(prev.debitFlags, next.debitFlags) &&
    areArraysShallowEqual(prev.voucherNames, next.voucherNames)
  );
};

const MachineCard: React.FC<MachineCardProps> = React.memo(({
  machine,
  isCompactView,
  isLoading,
  isVoiceActive,
  enableViewportVirtualization = false,
  canUseAiAssistants = true,
  onGateTrigger,
  creditFlags,
  debitFlags,
  voucherNames,
  onToggleCollapse,
  onOpenVoice,
  onClearMachine,
  onRemoveMachine,
  onImageUpload,
  onAddField,
  onArrayChange,
  onArrayBlur,
  onPixChange,
  onPixBlur,
  onKeyDown,
}) => {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [isNearViewport, setIsNearViewport] = useState<boolean>(() => !enableViewportVirtualization || machine.id <= 9);

  useEffect(() => {
    if (!enableViewportVirtualization || machine.collapsed) {
      setIsNearViewport(true);
      return;
    }
    const el = cardRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setIsNearViewport(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry) {
          setIsNearViewport(entry.isIntersecting);
        }
      },
      { rootMargin: '550px 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [enableViewportVirtualization, machine.collapsed]);

  // Memoização granular por modalidade dentro da maquininha
  const creditSum = useMemo(() => sumArray(machine.credits), [machine.credits]);
  const debitSum = useMemo(() => sumArray(machine.debits), [machine.debits]);
  const voucherSum = useMemo(() => sumArray(machine.vouchers), [machine.vouchers]);
  const pixSum = useMemo(() => parseValue(machine.pix), [machine.pix]);

  const machineTotal = useMemo(
    () => roundCurrency(creditSum + debitSum + voucherSum + pixSum),
    [creditSum, debitSum, voucherSum, pixSum]
  );

  const configuredCredits = creditFlags && creditFlags.length > 0 ? creditFlags : [];
  const configuredDebits = debitFlags && debitFlags.length > 0 ? debitFlags : [];
  const configuredVouchers = voucherNames && voucherNames.length > 0 ? voucherNames : [];

  const shouldRenderInputs = !machine.collapsed && (!enableViewportVirtualization || isNearViewport || isVoiceActive);

  return (
    <div
      ref={cardRef}
      id={`machine-card-${machine.id}`}
      onFocusCapture={() => {
        if (!isNearViewport) setIsNearViewport(true);
      }}
      onMouseEnter={() => {
        if (!isNearViewport) setIsNearViewport(true);
      }}
      className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden transition-all hover:shadow-md"
    >
      <div
        className={`p-3 flex justify-between items-center cursor-pointer select-none transition-colors ${
          machine.collapsed
            ? 'bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100'
            : 'bg-slate-900 dark:bg-slate-950 text-white border-b border-transparent dark:border-slate-800'
        }`}
        onClick={() => onToggleCollapse(machine.id)}
      >
        <div className="flex items-center gap-2">
          {machine.collapsed ? (
            <ChevronDown className="w-4 h-4 text-slate-500 dark:text-slate-400" />
          ) : (
            <ChevronUp className="w-4 h-4 text-slate-300" />
          )}
          <h3 className="font-extrabold text-sm tracking-wide">Máquina {machine.id}</h3>
        </div>
        <div className="flex items-center gap-2.5">
          <span
            className={`font-black text-sm tabular-nums ${
              machine.collapsed ? 'text-blue-600 dark:text-blue-400' : 'text-blue-300'
            }`}
          >
            {formatCurrency(machineTotal)}
          </span>
          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => {
                if (!canUseAiAssistants && onGateTrigger) {
                  onGateTrigger('ai_voice');
                  return;
                }
                onOpenVoice(machine.id, machine.collapsed);
              }}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer relative ${
                isVoiceActive
                  ? 'bg-orange-600 text-white'
                  : machine.collapsed
                  ? 'bg-orange-100 dark:bg-orange-950/60 hover:bg-orange-200 text-orange-700 dark:text-orange-300'
                  : 'bg-slate-800 hover:bg-orange-600 text-orange-300 hover:text-white'
              }`}
              title={
                !canUseAiAssistants
                  ? `Comando de Voz 🔒 (Disponível no Plano Pro R$ 200/mês)`
                  : `Preencher Máquina #${machine.id} por Comando de Voz`
              }
            >
              <Mic className="w-3.5 h-3.5" />
              {!canUseAiAssistants && (
                <Lock className="w-2.5 h-2.5 text-amber-400 absolute -top-1 -right-1" />
              )}
            </button>
            <button
              onClick={() => onClearMachine(machine.id)}
              className={`p-1.5 rounded-lg transition-colors ${
                machine.collapsed
                  ? 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
              }`}
              title="Limpar Maquininha"
            >
              <Eraser className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onRemoveMachine(machine.id)}
              className={`p-1.5 rounded-lg transition-colors ${
                machine.collapsed
                  ? 'bg-slate-200 dark:bg-slate-700 hover:bg-rose-100 dark:hover:bg-rose-950 text-rose-600 dark:text-rose-400'
                  : 'bg-slate-800 hover:bg-rose-600 text-rose-300 hover:text-white'
              }`}
              title="Excluir Maquininha"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>

            {!canUseAiAssistants ? (
              <button
                type="button"
                onClick={() => onGateTrigger?.('ai_ocr')}
                className={`p-1.5 rounded-lg cursor-pointer flex items-center justify-center transition-colors relative ${
                  machine.collapsed
                    ? 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
                title="Ler Comprovante com Foto OCR 🔒 (Disponível no Plano Pro R$ 200/mês)"
              >
                <Upload className="w-3.5 h-3.5" />
                <Lock className="w-2.5 h-2.5 text-amber-400 absolute -top-1 -right-1" />
              </button>
            ) : (
              <label
                className={`p-1.5 rounded-lg cursor-pointer flex items-center justify-center transition-colors ${
                  isLoading
                    ? 'bg-blue-400 cursor-wait'
                    : machine.collapsed
                    ? 'bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 hover:bg-blue-200'
                    : 'bg-blue-600 text-white hover:bg-blue-500'
                }`}
                title="Ler Comprovante com Gemini OCR"
              >
                {isLoading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Upload className="w-3.5 h-3.5" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => onImageUpload(machine.id, e)}
                  disabled={isLoading}
                />
              </label>
            )}
          </div>
        </div>
      </div>

      {!machine.collapsed && !shouldRenderInputs && (
        <div
          onClick={() => setIsNearViewport(true)}
          className="p-4 space-y-3 bg-slate-50/60 dark:bg-slate-900/60 cursor-pointer min-h-[250px] flex flex-col justify-between"
        >
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-white dark:bg-slate-950 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Crédito</span>
              <span className="font-bold text-blue-600 dark:text-blue-400 tabular-nums">{formatCurrency(creditSum)}</span>
            </div>
            <div className="bg-white dark:bg-slate-950 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Débito</span>
              <span className="font-bold text-orange-500 dark:text-orange-400 tabular-nums">{formatCurrency(debitSum)}</span>
            </div>
            <div className="bg-white dark:bg-slate-950 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Voucher</span>
              <span className="font-bold text-purple-500 dark:text-purple-400 tabular-nums">{formatCurrency(voucherSum)}</span>
            </div>
            <div className="bg-white dark:bg-slate-950 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Pix</span>
              <span className="font-bold text-teal-600 dark:text-teal-400 tabular-nums">{formatCurrency(pixSum)}</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 text-center font-medium">
            Toque ou role até a Máquina #{machine.id} para editar os campos
          </p>
        </div>
      )}

      {shouldRenderInputs && (
        <div className="p-4 space-y-4">
          {(['credits', 'debits', 'vouchers'] as const).map((type) => {
            const hasFlagsForType =
              (type === 'credits' && configuredCredits.length > 0) ||
              (type === 'debits' && configuredDebits.length > 0) ||
              (type === 'vouchers' && configuredVouchers.length > 0);
            const modalityTotal =
              type === 'credits' ? creditSum : type === 'debits' ? debitSum : voucherSum;

            return (
              <div key={type}>
                <div className="flex justify-between items-center mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {type === 'credits' ? 'Crédito' : type === 'debits' ? 'Débito' : 'Voucher'}
                    </span>
                    <button
                      onClick={() => onAddField(machine.id, type)}
                      className="w-4 h-4 flex items-center justify-center bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded text-xs transition-colors"
                      title="Adicionar campo de valor"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  <span
                    className={`text-[11px] font-bold tabular-nums ${
                      type === 'credits'
                        ? 'text-blue-600 dark:text-blue-400'
                        : type === 'debits'
                        ? 'text-orange-500 dark:text-orange-400'
                        : 'text-purple-500 dark:text-purple-400'
                    }`}
                  >
                    {formatCurrency(modalityTotal)}
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-1.5">
                  {machine[type].map((val, idx) => {
                    const flagLabel =
                      type === 'credits'
                        ? configuredCredits[idx] || `Crédito ${idx + 1}`
                        : type === 'debits'
                        ? configuredDebits[idx] || `Débito ${idx + 1}`
                        : configuredVouchers[idx] || `Voucher ${idx + 1}`;
                    const flagBadgeStyle =
                      type === 'credits'
                        ? 'text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800'
                        : type === 'debits'
                        ? 'text-orange-700 dark:text-orange-300 bg-orange-50 dark:bg-orange-950/60 border-orange-200 dark:border-orange-800'
                        : 'text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 border-purple-200 dark:border-purple-800';

                    return (
                      <div key={`${type}-${idx}`} className="flex flex-col">
                        {hasFlagsForType && (
                          <span
                            className={`text-[9px] font-bold rounded px-1 truncate text-center mb-0.5 border ${flagBadgeStyle}`}
                            title={flagLabel}
                          >
                            {flagLabel}
                          </span>
                        )}
                        <input
                          id={`input-${machine.id}-${type}-${idx}`}
                          type="text"
                          placeholder="0,00"
                          value={val}
                          onChange={(e) => onArrayChange(machine.id, type, idx, e.target.value)}
                          onBlur={() => onArrayBlur(machine.id, type, idx, val)}
                          onKeyDown={(e) => onKeyDown(e, machine.id, type, idx)}
                          className={`w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-center font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none py-1.5 px-0.5 transition-all tabular-nums ${
                            isCompactView ? 'text-xs' : 'text-sm'
                          }`}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Pix
              </span>
              <span className="text-[11px] font-bold text-teal-600 dark:text-teal-400 tabular-nums">
                {formatCurrency(pixSum)}
              </span>
            </div>
            <input
              id={`input-${machine.id}-pix-0`}
              type="text"
              placeholder="0,00"
              value={machine.pix}
              onChange={(e) => onPixChange(machine.id, e.target.value)}
              onBlur={() => onPixBlur(machine.id, machine.pix)}
              onKeyDown={(e) => onKeyDown(e, machine.id, 'pix', 0)}
              className={`w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg py-1.5 px-3 font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none transition-all tabular-nums ${
                isCompactView ? 'text-xs' : 'text-sm'
              }`}
            />
          </div>
        </div>
      )}
    </div>
  );
}, areMachineCardPropsEqual);

interface VirtualMachineListProps {
  machines: Machine[];
  isCompactView: boolean;
  loadingMachineId: number | null;
  voiceActiveMachineId: number | null;
  isVoicePanelOpen: boolean;
  canUseAiAssistants?: boolean;
  onGateTrigger?: (reason: 'ai_ocr' | 'ai_voice') => void;
  creditFlags?: string[];
  debitFlags?: string[];
  voucherNames?: string[];
  onToggleCollapse: (machineId: number) => void;
  onOpenVoice: (machineId: number, isCollapsed: boolean) => void;
  onClearMachine: (machineId: number) => void;
  onRemoveMachine: (machineId: number) => void;
  onImageUpload: (machineId: number, e: React.ChangeEvent<HTMLInputElement>) => void;
  onAddField: (machineId: number, type: 'credits' | 'debits' | 'vouchers') => void;
  onArrayChange: (machineId: number, type: 'credits' | 'debits' | 'vouchers', index: number, value: string) => void;
  onArrayBlur: (machineId: number, type: 'credits' | 'debits' | 'vouchers', index: number, value: string) => void;
  onPixChange: (machineId: number, value: string) => void;
  onPixBlur: (machineId: number, value: string) => void;
  onKeyDown: (
    e: React.KeyboardEvent<HTMLInputElement>,
    machineId: number,
    type: 'credits' | 'debits' | 'vouchers' | 'pix',
    index: number
  ) => void;
}

const VIRTUAL_BATCH_SIZE = 12;

const VirtualMachineList: React.FC<VirtualMachineListProps> = React.memo(({
  machines,
  isCompactView,
  loadingMachineId,
  voiceActiveMachineId,
  isVoicePanelOpen,
  canUseAiAssistants = true,
  onGateTrigger,
  creditFlags,
  debitFlags,
  voucherNames,
  onToggleCollapse,
  onOpenVoice,
  onClearMachine,
  onRemoveMachine,
  onImageUpload,
  onAddField,
  onArrayChange,
  onArrayBlur,
  onPixChange,
  onPixBlur,
  onKeyDown,
}) => {
  const [filterMode, setFilterMode] = useState<'all' | 'filled' | 'empty'>('all');
  const [quickSearchId, setQuickSearchId] = useState<string>('');
  const [visibleLimit, setVisibleLimit] = useState<number>(VIRTUAL_BATCH_SIZE);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const { filledCount, emptyCount, filteredMachines } = useMemo(() => {
    let filled = 0;
    let empty = 0;
    const cleanQuery = quickSearchId.trim().replace(/\D/g, '');

    const filtered = machines.filter((m) => {
      const hasVal = getMachineCentsSummary(m).totalCents > 0;
      if (hasVal) filled++;
      else empty++;

      if (filterMode === 'filled' && !hasVal) return false;
      if (filterMode === 'empty' && hasVal) return false;
      if (cleanQuery && !String(m.id).includes(cleanQuery)) return false;
      return true;
    });

    return { filledCount: filled, emptyCount: empty, filteredMachines: filtered };
  }, [machines, filterMode, quickSearchId]);

  // Expande a janela virtual automaticamente conforme o operador rola a página
  useEffect(() => {
    if (visibleLimit >= filteredMachines.length) return;
    const el = sentinelRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleLimit((prev) => Math.min(filteredMachines.length, prev + VIRTUAL_BATCH_SIZE));
        }
      },
      { rootMargin: '600px 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [visibleLimit, filteredMachines.length]);

  const visibleMachines = useMemo(
    () => filteredMachines.slice(0, visibleLimit),
    [filteredMachines, visibleLimit]
  );

  const enableViewportVirtualization = machines.length > 8;

  const handleJumpToMachine = useCallback(
    (targetId: number) => {
      const idx = filteredMachines.findIndex((m) => m.id === targetId);
      if (idx !== -1 && idx >= visibleLimit) {
        setVisibleLimit(idx + VIRTUAL_BATCH_SIZE);
      }
      setTimeout(() => {
        const el = document.getElementById(`machine-card-${targetId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 30);
    },
    [filteredMachines, visibleLimit]
  );

  return (
    <div className="space-y-3">
      {/* Barra de Renderização Seletiva e Salto Rápido (exibida quando há mais de 6 máquinas) */}
      {machines.length > 6 && (
        <div className="bg-white dark:bg-slate-900 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-wrap items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider mr-1">
              Filtro Seletivo:
            </span>
            <button
              type="button"
              onClick={() => {
                setFilterMode('all');
                setVisibleLimit(VIRTUAL_BATCH_SIZE);
              }}
              className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                filterMode === 'all'
                  ? 'bg-slate-900 dark:bg-blue-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              Todas ({machines.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setFilterMode('filled');
                setVisibleLimit(VIRTUAL_BATCH_SIZE);
              }}
              className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                filterMode === 'filled'
                  ? 'bg-blue-600 text-white'
                  : 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 hover:bg-blue-100'
              }`}
            >
              Com Valores ({filledCount})
            </button>
            <button
              type="button"
              onClick={() => {
                setFilterMode('empty');
                setVisibleLimit(VIRTUAL_BATCH_SIZE);
              }}
              className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                filterMode === 'empty'
                  ? 'bg-slate-700 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              Vazias ({emptyCount})
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="text"
              inputMode="numeric"
              value={quickSearchId}
              onChange={(e) => setQuickSearchId(e.target.value)}
              placeholder="Ir p/ Máquina #..."
              className="w-36 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
            />
            {quickSearchId && (
              <button
                type="button"
                onClick={() => setQuickSearchId('')}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1"
                title="Limpar filtro"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            {machines.length > 9 && (
              <div className="hidden xl:flex items-center gap-1 max-w-xs overflow-x-auto py-0.5">
                {machines.slice(0, 15).map((m) => {
                  const hasVal = getMachineCentsSummary(m).totalCents > 0;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => handleJumpToMachine(m.id)}
                      className={`w-6 h-6 rounded-md text-[10px] font-black shrink-0 transition-colors cursor-pointer ${
                        hasVal
                          ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700 hover:bg-blue-200'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200'
                      }`}
                      title={`Ir para Máquina #${m.id}`}
                    >
                      {m.id}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {filteredMachines.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 text-center text-xs text-slate-500 dark:text-slate-400">
          Nenhuma maquininha corresponde ao filtro selecionado.{' '}
          <button
            type="button"
            onClick={() => {
              setFilterMode('all');
              setQuickSearchId('');
            }}
            className="text-blue-600 dark:text-blue-400 font-bold hover:underline ml-1 cursor-pointer"
          >
            Mostrar todas
          </button>
        </div>
      ) : (
        <>
          <div
            className={`grid gap-4 items-start ${
              isCompactView
                ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
                : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
            }`}
          >
            {visibleMachines.map((machine) => (
              <MachineCard
                key={machine.id}
                machine={machine}
                isCompactView={isCompactView}
                isLoading={loadingMachineId === machine.id}
                isVoiceActive={voiceActiveMachineId === machine.id && isVoicePanelOpen}
                enableViewportVirtualization={enableViewportVirtualization}
                canUseAiAssistants={canUseAiAssistants}
                onGateTrigger={onGateTrigger}
                creditFlags={creditFlags}
                debitFlags={debitFlags}
                voucherNames={voucherNames}
                onToggleCollapse={onToggleCollapse}
                onOpenVoice={onOpenVoice}
                onClearMachine={onClearMachine}
                onRemoveMachine={onRemoveMachine}
                onImageUpload={onImageUpload}
                onAddField={onAddField}
                onArrayChange={onArrayChange}
                onArrayBlur={onArrayBlur}
                onPixChange={onPixChange}
                onPixBlur={onPixBlur}
                onKeyDown={onKeyDown}
              />
            ))}
          </div>

          {/* Sentinela da VirtualList para carregamento progressivo automático */}
          {visibleLimit < filteredMachines.length && (
            <div ref={sentinelRef} className="pt-2 flex justify-center">
              <button
                type="button"
                onClick={() =>
                  setVisibleLimit((prev) => Math.min(filteredMachines.length, prev + VIRTUAL_BATCH_SIZE))
                }
                className="bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 font-bold text-xs px-5 py-2.5 rounded-xl shadow-2xs transition-all cursor-pointer"
              >
                Exibindo {visibleMachines.length} de {filteredMachines.length} máquinas • Carregar mais
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
});

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
      closingReminderEnabled: true,
      closingReminderTime: '02:00',
      closingReminderSound: true,
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

  const defaultUsersByTenant: Record<string, User[]> = {
    tenant_flordebrasa: defaultUsers,
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

  const getStoredUsersForTenant = (tenantId: string): User[] => {
    if (!tenantId) return [];
    try {
      const saved = localStorage.getItem(`fechacaixa_users_${tenantId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return (
      defaultUsersByTenant[tenantId] || [
        { id: 1, tenantId, name: 'admin', pin: '1234', isAdmin: true },
      ]
    );
  };

  const saveUsersForTenantToStorage = (tenantId: string, list: User[], markCustomized = true) => {
    if (!tenantId) return;
    try {
      localStorage.setItem(`fechacaixa_users_${tenantId}`, JSON.stringify(list));
      if (markCustomized) {
        localStorage.setItem(`fechacaixa_users_customized_${tenantId}`, 'true');
      }
    } catch (e) {
      console.warn('Erro ao salvar operadores no localStorage:', e);
    }
  };

  const getAllStoredUsersMap = (tenantList: Tenant[]): Record<string, User[]> => {
    const map: Record<string, User[]> = {};
    tenantList.forEach((t) => {
      if (t && t.id) {
        map[t.id] = getStoredUsersForTenant(t.id);
      }
    });
    return map;
  };

  // Quantidade de itens dos cardápios padrão de fábrica para detectar edições feitas antes do marcador explícito
  const DEFAULT_FACTORY_MENU_LENGTHS: Record<string, number> = {
    tenant_flordebrasa: 90,
    tenant_bardovictor: 18,
    tenant_babilonia: 18,
    tenant_tajbar: 18,
  };

  const isLocalMenuCustomized = (tenantId: string, localMenu: MenuItem[] | null): boolean => {
    if (!tenantId) return false;
    try {
      if (localStorage.getItem(`fechacaixa_menu_customized_${tenantId}`)) {
        return true;
      }
    } catch {}
    if (!localMenu || !Array.isArray(localMenu)) return false;
    const isDefaultBar = defaultTenants.some((dt) => dt.id === tenantId);
    if (!isDefaultBar) {
      return localMenu.length > 0;
    }
    const expectedLen = DEFAULT_FACTORY_MENU_LENGTHS[tenantId];
    if (expectedLen !== undefined && localMenu.length > 0 && localMenu.length !== expectedLen) {
      return true;
    }
    return false;
  };

  const getAllStoredMenusMap = (tenantList: Tenant[]): Record<string, MenuItem[]> => {
    const map: Record<string, MenuItem[]> = {};
    tenantList.forEach((t) => {
      if (!t || !t.id) return;
      try {
        const raw = localStorage.getItem(`fechacaixa_menu_${t.id}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && isLocalMenuCustomized(t.id, parsed)) {
            map[t.id] = parsed;
          }
        }
      } catch {}
    });
    return map;
  };

  const getAllStoredClosingsMap = (tenantList: Tenant[]): Record<string, HistoryRecord[]> => {
    const map: Record<string, HistoryRecord[]> = {};
    tenantList.forEach((t) => {
      if (!t || !t.id) return;
      const list = getClosingsFromLocalStorageSync(t.id);
      if (list.length > 0) {
        map[t.id] = list;
      }
    });
    return map;
  };

  const getAllStoredClosingsMapAsync = async (
    tenantList: Tenant[]
  ): Promise<Record<string, HistoryRecord[]>> => {
    const map: Record<string, HistoryRecord[]> = {};
    await Promise.all(
      tenantList.map(async (t) => {
        if (!t || !t.id) return;
        const list = await loadClosingsForTenantAsync(t.id);
        if (list.length > 0) {
          map[t.id] = list;
        }
      })
    );
    return map;
  };

  const getAllDeletedClosingIdsMapAsync = async (
    tenantList: Tenant[]
  ): Promise<Record<string, number[]>> => {
    const map: Record<string, number[]> = {};
    await Promise.all(
      tenantList.map(async (t) => {
        if (!t || !t.id) return;
        const delIds = await getDeletedClosingIdsAsync(t.id);
        if (delIds.length > 0) {
          map[t.id] = delIds;
        }
      })
    );
    return map;
  };

  const areTenantsEqualConfig = (a: Tenant, b: Tenant): boolean => {
    const normArr = (arr?: string[]) => JSON.stringify(Array.isArray(arr) ? arr : []);
    return (
      a.name === b.name &&
      a.slug === b.slug &&
      a.cnpj === b.cnpj &&
      a.city === b.city &&
      a.address === b.address &&
      a.phone === b.phone &&
      a.contactEmail === b.contactEmail &&
      a.plan === b.plan &&
      a.status === b.status &&
      (a.pdvSystemName || '') === (b.pdvSystemName || '') &&
      (a.cardSystemName || '') === (b.cardSystemName || '') &&
      (a.themeColor || 'orange') === (b.themeColor || 'orange') &&
      (a.primaryColor || '#ea580c') === (b.primaryColor || '#ea580c') &&
      (a.logoAvatarUrl || '') === (b.logoAvatarUrl || '') &&
      (a.loginBgImage || '') === (b.loginBgImage || '') &&
      (a.notes || '') === (b.notes || '') &&
      Boolean(a.closingReminderEnabled) === Boolean(b.closingReminderEnabled) &&
      (a.closingReminderTime || '02:00') === (b.closingReminderTime || '02:00') &&
      Boolean(a.closingReminderSound ?? true) === Boolean(b.closingReminderSound ?? true) &&
      (a.jclanPortalUrl || '') === (b.jclanPortalUrl || '') &&
      (a.jclanPortalUsername || '') === (b.jclanPortalUsername || '') &&
      (a.jclanPortalPassword || '') === (b.jclanPortalPassword || '') &&
      (a.jclanPortalCookie || '') === (b.jclanPortalCookie || '') &&
      Boolean(a.jclanAutoSyncEnabled) === Boolean(b.jclanAutoSyncEnabled) &&
      (a.jclanDateMode || 'turno_auto') === (b.jclanDateMode || 'turno_auto') &&
      (a.jclanCustomStartDate || '') === (b.jclanCustomStartDate || '') &&
      (a.jclanCustomStartTime || '') === (b.jclanCustomStartTime || '') &&
      (a.jclanCustomEndDate || '') === (b.jclanCustomEndDate || '') &&
      (a.jclanCustomEndTime || '') === (b.jclanCustomEndTime || '') &&
      (a.jclanSelectedEmpresaId || '') === (b.jclanSelectedEmpresaId || '') &&
      normArr(a.creditFlags) === normArr(b.creditFlags) &&
      normArr(a.debitFlags) === normArr(b.debitFlags) &&
      normArr(a.voucherNames) === normArr(b.voucherNames)
    );
  };

  const isTenantCustomizedOrEdited = (t: Tenant): boolean => {
    if (!t) return false;
    if (t.isCustomized || (t.updatedAt && t.updatedAt > 0)) return true;
    const matchDefault = defaultTenants.find((dt) => dt.id === t.id);
    if (!matchDefault) return true;
    return !areTenantsEqualConfig(t, matchDefault);
  };

  const normalizeSlug = (str: string) =>
    String(str || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '');

  const findTenantByParam = (list: Tenant[], param: string): Tenant | undefined => {
    if (!param) return undefined;
    const clean = decodeURIComponent(param).trim().toLowerCase();
    const cleanNorm = normalizeSlug(clean);
    const withoutPrefix = cleanNorm.replace(/^tenant/, '');
    return list.find((t) => {
      const tSlug = (t.slug || '').toLowerCase();
      const tId = (t.id || '').toLowerCase();
      const tSlugNorm = normalizeSlug(tSlug);
      const tIdNorm = normalizeSlug(tId).replace(/^tenant/, '');
      const tNameNorm = normalizeSlug(t.name || '');
      return (
        tSlug === clean ||
        tId === clean ||
        tSlugNorm === cleanNorm ||
        (withoutPrefix && tSlugNorm === withoutPrefix) ||
        (withoutPrefix && tIdNorm === withoutPrefix) ||
        tNameNorm === cleanNorm
      );
    });
  };

  const buildTenantFromUrlParams = (barParam: string, urlParams: URLSearchParams): Tenant => {
    const cleanSlug = normalizeSlug(barParam).replace(/^tenant/, '') || `bar_${Date.now()}`;
    const id = barParam.toLowerCase().startsWith('tenant_') ? barParam.toLowerCase() : `tenant_${cleanSlug}`;
    const rawName = urlParams.get('nome') || urlParams.get('name');
    const formattedName = rawName
      ? decodeURIComponent(rawName).trim()
      : decodeURIComponent(barParam)
          .replace(/^tenant_/i, '')
          .replace(/[-_]+/g, ' ')
          .replace(/\b\w/g, (l) => l.toUpperCase());

    return {
      id,
      slug: cleanSlug,
      name: formattedName || 'Restaurante Parceiro',
      cnpj: '00.000.000/0001-00',
      city: urlParams.get('cidade') || 'Curitiba - PR',
      address: 'Curitiba - PR',
      phone: '(41) 99999-9999',
      contactEmail: `contato@${cleanSlug}.com.br`,
      plan: 'pro',
      monthlyPrice: 249,
      status: 'ativo',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
      logoInitials: (formattedName ? formattedName.slice(0, 2).toUpperCase() : 'RP'),
      logoColor: 'from-orange-500 to-amber-500',
      notes: '',
      loginBgImage: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=1920&q=80',
      themeColor: 'orange',
      primaryColor: '#ea580c',
      pdvSystemName: urlParams.get('pdv') || '',
      cardSystemName: urlParams.get('card') || '',
      creditFlags: [],
      debitFlags: [],
      voucherNames: [],
    };
  };

  // --- PERSISTÊNCIA DUAL LOCAL & NUVEM (RESILIENTE A REINÍCIOS DE SERVIDOR) ---
  const getDeletedTenantIds = (): string[] => {
    try {
      const raw = localStorage.getItem('fechacaixa_deleted_tenant_ids');
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const addDeletedTenantId = (tenantId: string) => {
    try {
      const current = new Set(getDeletedTenantIds());
      current.add(tenantId);
      localStorage.setItem('fechacaixa_deleted_tenant_ids', JSON.stringify(Array.from(current)));
    } catch {}
  };

  const removeDeletedTenantId = (tenantId: string) => {
    try {
      const current = new Set(getDeletedTenantIds());
      if (current.has(tenantId)) {
        current.delete(tenantId);
        localStorage.setItem('fechacaixa_deleted_tenant_ids', JSON.stringify(Array.from(current)));
      }
    } catch {}
  };

  const getStoredTenants = (): Tenant[] => {
    try {
      const deletedSet = new Set(getDeletedTenantIds());
      const allSavedStr = localStorage.getItem('fechacaixa_all_tenants');
      const customSavedStr = localStorage.getItem('fechacaixa_custom_tenants');
      let combined: Tenant[] = defaultTenants.filter((dt) => !deletedSet.has(dt.id));

      if (allSavedStr) {
        const parsedAll = JSON.parse(allSavedStr);
        if (Array.isArray(parsedAll)) {
          const map = new Map<string, Tenant>();
          parsedAll.forEach((t: Tenant) => {
            if (t && t.id && !deletedSet.has(t.id)) map.set(t.id, t);
          });
          defaultTenants.forEach((dt) => {
            if (!map.has(dt.id) && !deletedSet.has(dt.id)) map.set(dt.id, dt);
          });
          combined = Array.from(map.values());
        }
      }

      if (customSavedStr) {
        const parsedCustom = JSON.parse(customSavedStr);
        if (Array.isArray(parsedCustom)) {
          parsedCustom.forEach((custom: Tenant) => {
            if (custom && custom.id && !deletedSet.has(custom.id)) {
              const exists = combined.some((t) => t.id === custom.id || t.slug === custom.slug);
              if (!exists) {
                combined.push(custom);
              }
            }
          });
        }
      }

      return combined;
    } catch {
      return defaultTenants;
    }
  };

  const saveTenantsToStorage = (list: Tenant[]) => {
    try {
      const deletedSet = new Set(getDeletedTenantIds());
      const filteredList = list.filter((t) => !deletedSet.has(t.id));
      localStorage.setItem('fechacaixa_all_tenants', JSON.stringify(filteredList));
      const customOnly = filteredList.filter((t) => !defaultTenants.some((dt) => dt.id === t.id));
      localStorage.setItem('fechacaixa_custom_tenants', JSON.stringify(customOnly));
    } catch (e) {
      console.warn('Erro ao salvar bares no localStorage:', e);
    }
  };

  // --- MULTI-TENANT & SAAS CLOUD STATES ---
  const [tenants, setTenants] = useState<Tenant[]>(getStoredTenants);
  const [isResolvingBarUrl, setIsResolvingBarUrl] = useState<boolean>(() => {
    const list = getStoredTenants();
    const urlParams = new URLSearchParams(window.location.search);
    const barParam = urlParams.get('bar') || urlParams.get('loja') || urlParams.get('tenant');
    if (barParam) {
      const matchParam = findTenantByParam(list, barParam);
      return !matchParam;
    }
    return false;
  });
  const [currentTenant, setCurrentTenant] = useState<Tenant>(() => {
    const list = getStoredTenants();
    const urlParams = new URLSearchParams(window.location.search);
    const barParam = urlParams.get('bar') || urlParams.get('loja') || urlParams.get('tenant');
    if (barParam) {
      const matchParam = findTenantByParam(list, barParam);
      if (matchParam) return matchParam;
      // NUNCA faz fallback para Flor de Brasa quando há ?bar= na URL
      return buildTenantFromUrlParams(barParam, urlParams);
    }
    const savedTenantId =
      localStorage.getItem('fechacaixa_tenant_id') ||
      localStorage.getItem('caixacerto_tenant_id');
    const match = list.find((t) => t.id === savedTenantId);
    return match || list[0];
  });
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
  const [users, setUsers] = useState<User[]>(() =>
    getStoredUsersForTenant(currentTenant?.id || 'tenant_flordebrasa')
  );

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

  // --- TEMA MODO ESCURO (DARK MODE PERSISTENTE) ---
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('fechacaixa_theme_mode');
      if (saved === 'dark' || saved === 'light') return saved === 'dark';
    } catch {}
    return false;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem('fechacaixa_theme_mode', isDarkMode ? 'dark' : 'light');
    } catch {}
  }, [isDarkMode]);

  const lastSavedPdfDataRef = useRef<ClosingPdfData | null>(null);

  // Estados do Caixa
  const createEmptyMachine = (id: number, tenantObj?: Tenant | null): Machine => {
    const t = tenantObj ?? currentTenant;
    const creditCount = Math.max(5, t?.creditFlags?.length || 0);
    const debitCount = Math.max(5, t?.debitFlags?.length || 0);
    const voucherCount = Math.max(5, t?.voucherNames?.length || 0);
    return {
      id,
      collapsed: false,
      credits: Array(creditCount).fill(''),
      debits: Array(debitCount).fill(''),
      vouchers: Array(voucherCount).fill(''),
      pix: '',
    };
  };

  const getInitialMachinesForTenant = (tenantObj?: Tenant | null): Machine[] => {
    const t = tenantObj ?? currentTenant;
    // Novos bares começam com 0 maquininhas pré-salvas (tudo configurado pelo dono/admin)
    if (t && t.id === 'tenant_flordebrasa') {
      return Array.from({ length: 9 }, (_, i) => createEmptyMachine(i + 1, t));
    }
    return [];
  };

  const [jclan, setJclan] = useState({ credit: '', debit: '', pix: '', voucher: '' });
  const [machines, setMachines] = useState<Machine[]>(() => getInitialMachinesForTenant(currentTenant));

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

  // Registro de Auditoria contínua isolado por bar
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(() => {
    try {
      const saved = localStorage.getItem(`fechacaixa_audit_logs_${currentTenant?.id || 'tenant_flordebrasa'}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isAuditDrawerOpen, setIsAuditDrawerOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);

  // --- ESTADOS: COMANDO DE VOZ & SINCRONIZAÇÃO CELULAR <-> COMPUTADOR ---
  const [isVoicePanelOpen, setIsVoicePanelOpen] = useState(false);
  const [voiceActiveMachineId, setVoiceActiveMachineId] = useState<number | null>(null);
  const [voiceUndoStack, setVoiceUndoStack] = useState<ShiftSnapshot[]>([]);
  const [isMultiDeviceModalOpen, setIsMultiDeviceModalOpen] = useState(false);

  // --- ESTADOS: INTEGRAÇÃO SOB DEMANDA JCLAN ALPHAX9 & OCR DE TELA ---
  const [isJclanSyncModalOpen, setIsJclanSyncModalOpen] = useState(false);
  const [isJclanSyncing, setIsJclanSyncing] = useState(false);
  const [isJclanOcrLoading, setIsJclanOcrLoading] = useState(false);
  const [lastJclanSyncAt, setLastJclanSyncAt] = useState<number | null>(null);
  const [lastJclanError, setLastJclanError] = useState<string | null>(null);
  const [lastJclanPeriodLabel, setLastJclanPeriodLabel] = useState<string | null>(null);
  const [lastJclanEmpresaName, setLastJclanEmpresaName] = useState<string | null>(null);
  const [lastJclanBreakdown, setLastJclanBreakdown] = useState<JclanBreakdownEntry[]>([]);
  const [lastJclanChangeSummary, setLastJclanChangeSummary] = useState<string | null>(null);
  const [jclanCompanies, setJclanCompanies] = useState<JclanCompanyEntry[]>([]);
  const [jclanUndoSnapshot, setJclanUndoSnapshot] = useState<{
    jclan: { credit: string; debit: string; pix: string; voucher: string };
    jclanCash: string;
  } | null>(null);

  // --- CONTROLE COMERCIAL DE PLANOS SAAS (R$ 150 / R$ 200 / R$ 300) ---
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [upgradeGateReason, setUpgradeGateReason] = useState<FeatureGateReason>('general');
  const [isClearTableConfirmOpen, setIsClearTableConfirmOpen] = useState(false);

  const handleTriggerGateUpgrade = useCallback((reason: FeatureGateReason = 'general') => {
    setUpgradeGateReason(reason);
    setIsUpgradeModalOpen(true);
  }, []);

  const planCapabilities: PlanCapabilities = useMemo(
    () => getPlanCapabilities(currentTenant?.plan),
    [currentTenant?.plan]
  );

  const jclanSyncInFlightRef = useRef(false);
  const jclanQuickPhotoInputRef = useRef<HTMLInputElement | null>(null);
  const multipleUploadInputRef = useRef<HTMLInputElement | null>(null);

  const [myDeviceId] = useState<string>(() => {
    try {
      const existing = sessionStorage.getItem('fechacaixa_device_id');
      if (existing) return existing;
      const created = `dev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      sessionStorage.setItem('fechacaixa_device_id', created);
      return created;
    } catch {
      return `dev_${Date.now()}`;
    }
  });

  const [myDeviceType] = useState<'mobile' | 'desktop'>(() => {
    if (typeof window !== 'undefined') {
      const isMob =
        /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || window.innerWidth < 768;
      return isMob ? 'mobile' : 'desktop';
    }
    return 'desktop';
  });

  const [connectedDevices, setConnectedDevices] = useState<
    Array<{ deviceId: string; deviceType: 'mobile' | 'desktop'; operator: string }>
  >([]);
  const [lastSyncedBy, setLastSyncedBy] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);

  const isApplyingRemoteRef = useRef(false);
  const isInitialTenantLoadRef = useRef(true);
  const lastAppliedRemoteAtRef = useRef<number>(0);
  const lastLocalEditAtRef = useRef<number>(0);

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

  // --- FUNCIONALIDADE: LEMBRETE DE FECHAMENTO (AVISO VISUAL & SONORO) ---
  const [isReminderAlertOpen, setIsReminderAlertOpen] = useState(false);
  const [reminderSnoozedUntil, setReminderSnoozedUntil] = useState<number | null>(null);
  const [lastChimedMinute, setLastChimedMinute] = useState<string | null>(null);
  const [hasSavedClosingInSession, setHasSavedClosingInSession] = useState(false);

  // --- FUNCIONALIDADE: BACKUP PERIÓDICO AUTOMÁTICO EM JSON (REDUNDÂNCIA EXTRA) ---
  const [autoBackupSettings, setAutoBackupSettings] = useState<AutoBackupSettings>(getAutoBackupSettings);
  const [isPeriodicBackupBannerVisible, setIsPeriodicBackupBannerVisible] = useState(false);

  const handleUpdateAutoBackupSettings = useCallback((updates: Partial<AutoBackupSettings>) => {
    const next = saveAutoBackupSettings(updates);
    setAutoBackupSettings(next);
    if (updates.enabled === false) {
      setIsPeriodicBackupBannerVisible(false);
    }
  }, []);

  const handleTriggerFullJsonBackup = useCallback(
    async (reasonLabel = 'manual', silentToast = false) => {
      try {
        const currentTenantsList = getStoredTenants();
        const { filename, totalClosingsCount } = await triggerFullRedundantBackupDownload(
          currentTenantsList.length > 0 ? currentTenantsList : tenants,
          currentTenant,
          reasonLabel
        );
        setAutoBackupSettings(getAutoBackupSettings());
        setIsPeriodicBackupBannerVisible(false);
        if (!silentToast) {
          showToast(
            `🛡️ Backup JSON baixado (${filename} • ${totalClosingsCount} fechamentos protegidos)!`
          );
        }
      } catch (err: any) {
        if (!silentToast) {
          showToast(`Erro ao gerar backup JSON: ${err?.message || 'Falha inesperada'}`);
        }
      }
    },
    [tenants, currentTenant]
  );

  // Monitoramento periódico para exportação de backup em arquivo JSON (Diário 24h / Semanal 7d)
  useEffect(() => {
    if (!autoBackupSettings.enabled || !isAuthenticated || appMode !== 'bar') {
      setIsPeriodicBackupBannerVisible(false);
      return;
    }

    const checkPeriodicBackup = () => {
      const settings = getAutoBackupSettings();
      if (!settings.enabled) return;
      if (settings.snoozedUntil && Date.now() < settings.snoozedUntil) return;
      if (history.length === 0) return;

      const now = Date.now();
      const intervalMs =
        settings.frequency === 'weekly'
          ? 7 * 24 * 60 * 60 * 1000
          : 24 * 60 * 60 * 1000; // 'daily' ou 'every_closing' verifica a cada 24h caso não tenha baixado

      const isDueByTime = !settings.lastBackupAt || now - settings.lastBackupAt >= intervalMs;
      const hasNewUnsavedClosings =
        settings.frequency === 'every_closing' &&
        history.length > (settings.lastBackedUpClosingsTotal || 0) &&
        (!settings.lastBackupAt || now - settings.lastBackupAt > 5 * 60 * 1000);

      if (isDueByTime || hasNewUnsavedClosings) {
        setIsPeriodicBackupBannerVisible(true);
      }
    };

    const initialTimer = setTimeout(checkPeriodicBackup, 4000);
    const interval = setInterval(checkPeriodicBackup, 60000);
    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [autoBackupSettings.enabled, autoBackupSettings.frequency, isAuthenticated, appMode, history.length]);

  // Monitoramento contínuo do horário de fechamento configurado pelo administrador
  useEffect(() => {
    if (!currentTenant?.closingReminderEnabled || !isAuthenticated || appMode !== 'bar') {
      return;
    }

    const checkReminder = () => {
      const now = new Date();
      const currentHours = now.getHours();
      const currentMinutes = now.getMinutes();
      const currentFormatted = `${String(currentHours).padStart(2, '0')}:${String(currentMinutes).padStart(2, '0')}`;
      const targetTime = currentTenant.closingReminderTime || '02:00';

      const [targetHStr, targetMStr] = targetTime.split(':');
      const targetH = parseInt(targetHStr, 10);
      const targetM = parseInt(targetMStr, 10);
      if (isNaN(targetH) || isNaN(targetM)) return;

      // Se o fechamento já foi concluído nesta sessão/dia, não dispara
      if (hasSavedClosingInSession) return;

      // Se está no período de silêncio (snooze), não dispara
      if (reminderSnoozedUntil && Date.now() < reminderSnoozedUntil) return;

      // Checagem de horário para turnos noturnos:
      // Se targetTime for madrugada (<= 6h), dispara entre targetTime e 06:59
      // Para qualquer outro horário configurado, compara se hora atual >= hora limite
      const isPastOrAtTarget =
        targetH <= 6
          ? (currentHours >= targetH && currentHours < 7) || (currentHours === targetH && currentMinutes >= targetM)
          : (currentHours > targetH || (currentHours === targetH && currentMinutes >= targetM));

      if (isPastOrAtTarget) {
        setIsReminderAlertOpen(true);

        // Dispara o alerta sonoro Web Audio caso esteja ativado e ainda não tenha soado neste minuto
        if (currentTenant.closingReminderSound !== false && lastChimedMinute !== currentFormatted) {
          setLastChimedMinute(currentFormatted);
          playClosingReminderChime();
        }
      }
    };

    checkReminder();
    const interval = setInterval(checkReminder, 5000);
    return () => clearInterval(interval);
  }, [
    currentTenant?.closingReminderEnabled,
    currentTenant?.closingReminderTime,
    currentTenant?.closingReminderSound,
    isAuthenticated,
    appMode,
    hasSavedClosingInSession,
    reminderSnoozedUntil,
    lastChimedMinute,
  ]);

  useEffect(() => {
    if (!currentTenant?.id) return;
    const tenantId = currentTenant.id;
    const timer = setTimeout(() => {
      saveAuditLogsToPersistence(tenantId, auditLogs.slice(0, 150)).catch(() => {});
    }, 350);
    return () => clearTimeout(timer);
  }, [auditLogs, currentTenant?.id]);

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
                  `🎯 Último zeramento concluído! Confira o que lançar no ${currentTenant.pdvSystemName || 'PDV'}.`
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

    const localList = getStoredTenants();

    saasApi
      .getTenants()
      .then(async (loaded) => {
        const deletedIds = getDeletedTenantIds();
        const deletedSet = new Set(deletedIds);
        const filteredLoaded = Array.isArray(loaded)
          ? loaded.filter((t) => !deletedSet.has(t.id))
          : [];

        let needsServerSync = false;
        const mergedMap = new Map<string, Tenant>();

        // 1. Mescla inteligente entre Bares do Servidor e Bares LocalStorage (nunca sobrescreve edições locais com padrão de fábrica)
        filteredLoaded.forEach((serverT) => {
          const localT = localList.find(
            (lt) => lt.id === serverT.id || lt.slug === serverT.slug
          );
          if (localT) {
            const localIsCustom = isTenantCustomizedOrEdited(localT);
            const serverIsCustom = Boolean(serverT.isCustomized || serverT.updatedAt);
            const localTime = localT.updatedAt || (localIsCustom ? 1 : 0);
            const serverTime = serverT.updatedAt || (serverIsCustom ? 1 : 0);

            if (localIsCustom && (localTime >= serverTime || !serverIsCustom)) {
              const preservedLocal: Tenant = {
                ...serverT,
                ...localT,
                isCustomized: true,
                updatedAt: Math.max(localTime, serverTime) || Date.now(),
              };
              mergedMap.set(preservedLocal.id, preservedLocal);
              if (!serverIsCustom || !areTenantsEqualConfig(preservedLocal, serverT)) {
                needsServerSync = true;
              }
            } else {
              mergedMap.set(serverT.id, serverT);
            }
          } else {
            mergedMap.set(serverT.id, serverT);
          }
        });

        // 2. Inclui bares criados localmente que ainda não estão no servidor (ex: após reinício do container)
        localList.forEach((localT) => {
          if (deletedSet.has(localT.id)) return;
          const alreadyInMerged = Array.from(mergedMap.values()).some(
            (m) => m.id === localT.id || m.slug === localT.slug
          );
          if (!alreadyInMerged) {
            mergedMap.set(localT.id, {
              ...localT,
              isCustomized: true,
              updatedAt: localT.updatedAt || Date.now(),
            });
            needsServerSync = true;
          }
        });

        let merged =
          mergedMap.size > 0
            ? Array.from(mergedMap.values()).filter((t) => !deletedSet.has(t.id))
            : localList.filter((t) => !deletedSet.has(t.id));

        // Garante que o monthlyPrice de cada bar corresponda estritamente ao plano assinado (R$ 150 / R$ 200 / R$ 300)
        merged = merged.map((t) => {
          const plan = t.plan || 'pro';
          const expectedPrice = PLAN_PRICING[plan] ?? 200;
          return t.monthlyPrice === expectedPrice
            ? t
            : { ...t, monthlyPrice: expectedPrice };
        });

        const hasLocalCustomUsers = merged.some(
          (t) => localStorage.getItem(`fechacaixa_users_customized_${t.id}`) === 'true'
        );
        const menusMap = getAllStoredMenusMap(merged);
        const [closingsMap, deletedClosingIdsMap] = await Promise.all([
          getAllStoredClosingsMapAsync(merged),
          getAllDeletedClosingIdsMapAsync(merged),
        ]);

        if (
          needsServerSync ||
          hasLocalCustomUsers ||
          Object.keys(menusMap).length > 0 ||
          Object.keys(closingsMap).length > 0 ||
          Object.keys(deletedClosingIdsMap).length > 0 ||
          deletedIds.length > 0
        ) {
          try {
            const usersMap = getAllStoredUsersMap(merged);
            const synced = await saasApi.syncTenants(
              merged,
              usersMap,
              menusMap,
              closingsMap,
              deletedIds,
              deletedClosingIdsMap
            );
            if (synced && synced.length > 0) {
              // Preserva a versão local mesclada caso algum campo tenha sido editado
              const syncedFiltered = synced.filter((t) => !deletedSet.has(t.id));
              merged = syncedFiltered.map((st) => {
                const localMatch = merged.find((m) => m.id === st.id);
                return localMatch && isTenantCustomizedOrEdited(localMatch)
                  ? { ...st, ...localMatch }
                  : st;
              });
            }
          } catch (e) {
            console.warn('Auto-sync para o servidor:', e);
          }
        }

        if (barParam) {
          const matchParam = findTenantByParam(merged, barParam);
          if (matchParam) {
            setTenants(merged);
            saveTenantsToStorage(merged);
            setCurrentTenant(matchParam);
            setUsers(getStoredUsersForTenant(matchParam.id));
            setIsResolvingBarUrl(false);
            return;
          } else {
            // Se o bar veio pela URL mas ainda não estava na lista (ex: aberto em outro aparelho após cold start),
            // registra o bar a partir dos dados da URL e NUNCA redireciona para o Flor de Brasa!
            const urlBuiltTenant = buildTenantFromUrlParams(barParam, urlParams);
            const updatedMerged = [...merged, urlBuiltTenant];
            setTenants(updatedMerged);
            saveTenantsToStorage(updatedMerged);
            setCurrentTenant(urlBuiltTenant);
            setUsers(getStoredUsersForTenant(urlBuiltTenant.id));
            setIsResolvingBarUrl(false);
            saasApi.createTenant(urlBuiltTenant).catch(() => {});
            return;
          }
        }

        setTenants(merged);
        saveTenantsToStorage(merged);

        const savedTenantId =
          localStorage.getItem('fechacaixa_tenant_id') ||
          localStorage.getItem('caixacerto_tenant_id');
        const match = merged.find((t) => t.id === savedTenantId) || merged[0];
        setCurrentTenant(match);
        setIsResolvingBarUrl(false);
      })
      .catch(() => {
        setTenants(localList);
        setIsResolvingBarUrl(false);
      });
    saasApi.getMasterStats().then((st) => setMasterStats(st));
  }, []);

  // --- CARREGAMENTO REATIVO POR BAR SELECIONADO (ISOLAMENTO MULTI-TENANT ESTRITO) ---
  useEffect(() => {
    if (!currentTenant) return;
    const activeTenantId = currentTenant.id;
    localStorage.setItem('fechacaixa_tenant_id', activeTenantId);

    // 0. Carrega Logs de Auditoria exclusivos deste Bar (LocalStorage + IndexedDB)
    try {
      const savedAudit = localStorage.getItem(`fechacaixa_audit_logs_${activeTenantId}`);
      if (savedAudit) {
        const parsedAudit = JSON.parse(savedAudit);
        setAuditLogs(Array.isArray(parsedAudit) ? parsedAudit : []);
      } else {
        setAuditLogs([]);
      }
    } catch {
      setAuditLogs([]);
    }
    loadAuditLogsFromPersistence(activeTenantId).then((persistedLogs) => {
      if (Array.isArray(persistedLogs) && persistedLogs.length > 0) {
        setAuditLogs((prev) => (persistedLogs.length >= prev.length ? persistedLogs : prev));
      }
    });

    // 1. Carrega Cardápio do Bar (sem vazar cardápio de outro bar)
    const localMenuKey = `fechacaixa_menu_${activeTenantId}`;
    let localMenuCached: MenuItem[] | null = null;
    try {
      const savedMenu = localStorage.getItem(localMenuKey);
      if (savedMenu) {
        const parsed = JSON.parse(savedMenu);
        if (Array.isArray(parsed)) {
          localMenuCached = parsed;
          setCurrentMenu(parsed);
        } else {
          setCurrentMenu([]);
        }
      } else {
        setCurrentMenu([]);
      }
    } catch {
      setCurrentMenu([]);
    }

    saasApi.getMenu(activeTenantId).then((m) => {
      const localMenuIsCustom = isLocalMenuCustomized(activeTenantId, localMenuCached);
      if (localMenuIsCustom && localMenuCached !== null) {
        // Nunca sobrescreve um cardápio personalizado/importado localmente pelo padrão de fábrica do servidor
        setCurrentMenu(localMenuCached);
        if (!Array.isArray(m) || JSON.stringify(m) !== JSON.stringify(localMenuCached)) {
          saasApi.saveMenu(activeTenantId, localMenuCached).catch(() => {});
        }
      } else if (Array.isArray(m) && m.length > 0) {
        setCurrentMenu(m);
        try {
          localStorage.setItem(localMenuKey, JSON.stringify(m));
        } catch {}
      } else if (localMenuCached && localMenuCached.length > 0) {
        setCurrentMenu(localMenuCached);
        saasApi.saveMenu(activeTenantId, localMenuCached).catch(() => {});
      } else {
        setCurrentMenu([]);
      }
    });

    // 2. Carrega Usuários (Operadores) daquele Bar com persistência dual (Local + Nuvem)
    const tenantId = activeTenantId;
    const localUsers = getStoredUsersForTenant(tenantId);
    const isCustomizedLocally = localStorage.getItem(`fechacaixa_users_customized_${tenantId}`) === 'true';
    setUsers(localUsers);

    saasApi.getUsers(tenantId).then((cloudUsers) => {
      if (isCustomizedLocally) {
        // Preserva operadores criados/editados/excluídos localmente e sincroniza na nuvem
        const mergedMap = new Map<string, User>();
        localUsers.forEach((u) => mergedMap.set(u.name.toLowerCase().trim(), u));
        if (Array.isArray(cloudUsers)) {
          cloudUsers.forEach((cu) => {
            const key = cu.name.toLowerCase().trim();
            // Não readiciona 'admin' padrão se o usuário já personalizou a lista local sem ele
            if (!mergedMap.has(key) && key !== 'admin') {
              mergedMap.set(key, cu);
            }
          });
        }
        const finalUsers = Array.from(mergedMap.values());
        setUsers(finalUsers);
        saveUsersForTenantToStorage(tenantId, finalUsers, true);
        saasApi.saveUsers(tenantId, finalUsers).catch(() => {});
      } else if (Array.isArray(cloudUsers) && cloudUsers.length > 0) {
        const mergedMap = new Map<string, User>();
        cloudUsers.forEach((cu) => mergedMap.set(cu.name.toLowerCase().trim(), cu));
        localUsers.forEach((lu) => {
          const key = lu.name.toLowerCase().trim();
          if (!mergedMap.has(key)) {
            mergedMap.set(key, lu);
          }
        });
        const finalUsers = Array.from(mergedMap.values());
        setUsers(finalUsers);
        saveUsersForTenantToStorage(tenantId, finalUsers, false);
      } else {
        setUsers(localUsers);
        saveUsersForTenantToStorage(tenantId, localUsers, false);
        saasApi.saveUsers(tenantId, localUsers).catch(() => {});
      }
    });

    // 3. Carrega Histórico de Fechamento estritamente isolado para este Bar (IndexedDB + LocalStorage + Servidor com Auto-Reidratação)
    const syncLocalRecords = getClosingsFromLocalStorageSync(activeTenantId);
    setHistory(syncLocalRecords);

    setCloudSyncStatus('syncing');
    Promise.all([
      loadClosingsForTenantAsync(activeTenantId),
      getDeletedClosingIdsAsync(activeTenantId),
      saasApi.getClosings(activeTenantId).catch(() => null),
    ])
      .then(async ([localPersistedRecords, deletedClosingIds, cloudClosings]) => {
        const validCloud = Array.isArray(cloudClosings)
          ? cloudClosings.filter(
              (c: HistoryRecord) =>
                c &&
                (c.tenantId === activeTenantId ||
                  (!c.tenantId && activeTenantId === 'tenant_flordebrasa'))
            )
          : [];

        // Prioriza a versão local (IndexedDB) para preservar fotos em alta resolução e mescla com a nuvem sem perder nenhum registro
        const merged = mergeClosingRecordLists(
          activeTenantId,
          [localPersistedRecords, syncLocalRecords, validCloud],
          deletedClosingIds
        );

        setHistory(merged);
        await saveClosingsForTenant(activeTenantId, merged);

        if (cloudClosings === null) {
          setCloudSyncStatus('offline');
          return;
        }

        // Reidratação automática do servidor: se o navegador/IndexedDB possui fechamentos que o servidor perdeu após atualização/reinício,
        // ou se há IDs excluídos localmente, reenvia imediatamente para o servidor
        const cloudIdSet = new Set(validCloud.map((c) => Number(c.id)));
        const hasMissingOnServer = merged.some((m) => !cloudIdSet.has(Number(m.id)));
        const hasDeletedOnServer = validCloud.some((c) =>
          deletedClosingIds.includes(Number(c.id))
        );

        if (hasMissingOnServer || hasDeletedOnServer) {
          await saasApi.syncTenantClosings(activeTenantId, merged, deletedClosingIds);
          saasApi.getMasterStats().then((st) => {
            if (st) setMasterStats(st);
          });
        }

        setCloudSyncStatus('synced');
      })
      .catch(() => setCloudSyncStatus('offline'));

    // 4. Carrega Faturas deste Bar (Asaas)
    saasApi.getInvoices(activeTenantId).then((invs) => {
      if (invs) setInvoices(invs);
    });

    // 5. Carrega Rascunho do Turno em Andamento (Local + Nuvem) para este Bar
    isInitialTenantLoadRef.current = true;
    const localDraftKey = `fechacaixa_draft_${activeTenantId}`;
    let localDraftTimestamp = 0;

    const applyShiftDraft = (draft: ActiveShiftDraft) => {
      isApplyingRemoteRef.current = true;
      lastAppliedRemoteAtRef.current = draft.updatedAt || Date.now();
      setJclan(draft.jclan || { credit: '', debit: '', pix: '', voucher: '' });
      if (Array.isArray(draft.machines)) {
        setMachines(draft.machines);
      } else {
        setMachines(getInitialMachinesForTenant(currentTenant));
      }
      setCash(
        draft.cash || {
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
        }
      );
      setCashSummary(draft.cashSummary || { opening: '', jclanCash: '', expenses: '' });
      setSelectedExclusionOptions(draft.selectedExclusionOptions || {});
      setCustomCommands(draft.customCommands || {});
      setInclusionCommands(draft.inclusionCommands || {});
      if (draft.updatedBy) setLastSyncedBy(draft.updatedBy);
      if (draft.updatedAt) setLastSyncedAt(draft.updatedAt);
    };

    try {
      const savedDraftStr = localStorage.getItem(localDraftKey);
      if (savedDraftStr) {
        const parsedDraft: ActiveShiftDraft = JSON.parse(savedDraftStr);
        if (parsedDraft && parsedDraft.tenantId === activeTenantId) {
          localDraftTimestamp = parsedDraft.updatedAt || 0;
          applyShiftDraft(parsedDraft);
        }
      } else {
        // Limpa os campos ao trocar para um bar sem rascunho
        isApplyingRemoteRef.current = true;
        setJclan({ credit: '', debit: '', pix: '', voucher: '' });
        setMachines(getInitialMachinesForTenant(currentTenant));
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
        setSelectedExclusionOptions({});
        setCustomCommands({});
        setInclusionCommands({});
      }
    } catch {}

    Promise.all([
      loadDraftFromPersistence(activeTenantId),
      saasApi.getDraft(activeTenantId),
    ]).then(([idbDraft, { draft: cloudDraft, connectedDevices: devs }]) => {
      if (Array.isArray(devs)) setConnectedDevices(devs);
      const bestLocalDraft =
        idbDraft &&
        idbDraft.tenantId === activeTenantId &&
        (idbDraft.updatedAt || 0) > localDraftTimestamp
          ? idbDraft
          : null;
      if (bestLocalDraft) {
        localDraftTimestamp = bestLocalDraft.updatedAt || 0;
        applyShiftDraft(bestLocalDraft);
      }
      if (
        cloudDraft &&
        cloudDraft.tenantId === activeTenantId &&
        (cloudDraft.updatedAt || 0) >= localDraftTimestamp
      ) {
        applyShiftDraft(cloudDraft);
        saveDraftToPersistence(activeTenantId, cloudDraft).catch(() => {});
      } else if (bestLocalDraft && (!cloudDraft || localDraftTimestamp > (cloudDraft.updatedAt || 0))) {
        saasApi.saveDraft(activeTenantId, bestLocalDraft).catch(() => {});
      }
      setTimeout(() => {
        isInitialTenantLoadRef.current = false;
      }, 250);
    });
  }, [currentTenant?.id]);

  // --- CONEXÃO EM TEMPO REAL (SSE + POLLING RESILIENTE) ENTRE CELULAR E COMPUTADOR ---
  useEffect(() => {
    if (!currentTenant?.id || appMode !== 'bar') return;
    const tenantId = currentTenant.id;
    const localDraftKey = `fechacaixa_draft_${tenantId}`;
    const opName = currentOperator?.name || 'Operador';

    const handleIncomingDraft = (remoteDraft: ActiveShiftDraft | null, devs?: any[]) => {
      if (Array.isArray(devs)) {
        setConnectedDevices(devs);
      }
      if (!remoteDraft) return;
      if (remoteDraft.deviceId === myDeviceId) return;
      // Evita sobrescrever se o usuário digitou localmente nos últimos 900ms
      if (Date.now() - lastLocalEditAtRef.current < 900) return;
      if ((remoteDraft.updatedAt || 0) <= lastAppliedRemoteAtRef.current) return;

      isApplyingRemoteRef.current = true;
      lastAppliedRemoteAtRef.current = remoteDraft.updatedAt;
      setJclan(remoteDraft.jclan || { credit: '', debit: '', pix: '', voucher: '' });
      if (Array.isArray(remoteDraft.machines) && remoteDraft.machines.length > 0) {
        setMachines(remoteDraft.machines);
      }
      if (remoteDraft.cash) setCash(remoteDraft.cash);
      if (remoteDraft.cashSummary) setCashSummary(remoteDraft.cashSummary);
      if (remoteDraft.selectedExclusionOptions) {
        setSelectedExclusionOptions(remoteDraft.selectedExclusionOptions);
      }
      if (remoteDraft.customCommands) setCustomCommands(remoteDraft.customCommands);
      if (remoteDraft.inclusionCommands) setInclusionCommands(remoteDraft.inclusionCommands);

      setLastSyncedBy(remoteDraft.updatedBy || 'Outro Aparelho');
      setLastSyncedAt(remoteDraft.updatedAt);
      setCloudSyncStatus('synced');
      try {
        localStorage.setItem(localDraftKey, JSON.stringify(remoteDraft));
      } catch {}
    };

    const handleRemoteClear = (payload: any) => {
      if (payload?.deviceId === myDeviceId) return;
      isApplyingRemoteRef.current = true;
      lastAppliedRemoteAtRef.current = Date.now();
      setJclan({ credit: '', debit: '', pix: '', voucher: '' });
      setMachines(getInitialMachinesForTenant(currentTenant));
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
      setSelectedExclusionOptions({});
      setCustomCommands({});
      setInclusionCommands({});
      try {
        localStorage.removeItem(localDraftKey);
      } catch {}
    };

    const streamUrl = `/api/tenants/${encodeURIComponent(tenantId)}/draft/stream?deviceId=${encodeURIComponent(
      myDeviceId
    )}&deviceType=${myDeviceType}&operator=${encodeURIComponent(opName)}`;

    let es: EventSource | null = null;
    try {
      es = new EventSource(streamUrl);
      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'draft:init' || data.type === 'draft:updated' || data.type === 'presence:update') {
            handleIncomingDraft(data.payload, data.connectedDevices);
          } else if (data.type === 'draft:cleared') {
            handleRemoteClear(data.payload);
          }
        } catch {}
      };
    } catch {}

    // Fallback de sincronização contínua a cada 2.5s (garante funcionamento mesmo sob proxy)
    const pollInterval = setInterval(() => {
      saasApi.getDraft(tenantId).then(({ draft, connectedDevices: devs }) => {
        handleIncomingDraft(draft, devs);
      });
    }, 2500);

    return () => {
      clearInterval(pollInterval);
      if (es) {
        try {
          es.close();
        } catch {}
      }
    };
  }, [currentTenant?.id, appMode, currentOperator?.name, myDeviceId, myDeviceType]);

  // --- AUTO-SAVE EM TEMPO REAL DO RASCUNHO COM DEBOUNCE (CELULAR <-> PC) ---
  useEffect(() => {
    if (!currentTenant?.id || isInitialTenantLoadRef.current) return;
    if (isApplyingRemoteRef.current) {
      isApplyingRemoteRef.current = false;
      return;
    }

    const now = Date.now();
    lastLocalEditAtRef.current = now;
    lastAppliedRemoteAtRef.current = now;
    const tenantId = currentTenant.id;

    const timer = setTimeout(() => {
      const deviceLabel = myDeviceType === 'mobile' ? 'Celular' : 'Computador';
      const updatedByLabel = `${currentOperator?.name || 'Operador'} (${deviceLabel})`;

      const draftPayload: ActiveShiftDraft = {
        tenantId,
        updatedAt: Date.now(),
        updatedBy: updatedByLabel,
        deviceId: myDeviceId,
        deviceType: myDeviceType,
        jclan,
        machines,
        cash,
        cashSummary,
        selectedExclusionOptions,
        customCommands,
        inclusionCommands,
      };

      saveDraftToPersistence(tenantId, draftPayload).catch(() => {});

      saasApi.saveDraft(tenantId, draftPayload).then(({ draft, connectedDevices: devs }) => {
        if (draft) {
          setLastSyncedBy(draft.updatedBy);
          setLastSyncedAt(draft.updatedAt);
          setCloudSyncStatus('synced');
        }
        if (Array.isArray(devs)) {
          setConnectedDevices(devs);
        }
      });
    }, 320);

    return () => clearTimeout(timer);
  }, [
    jclan,
    machines,
    cash,
    cashSummary,
    selectedExclusionOptions,
    customCommands,
    inclusionCommands,
    currentTenant?.id,
    currentOperator?.name,
    myDeviceId,
    myDeviceType,
  ]);

  const handleForcePullFromCloud = async () => {
    if (!currentTenant?.id) return;
    setCloudSyncStatus('syncing');
    const { draft, connectedDevices: devs } = await saasApi.getDraft(currentTenant.id);
    if (Array.isArray(devs)) setConnectedDevices(devs);
    if (draft) {
      isApplyingRemoteRef.current = true;
      lastAppliedRemoteAtRef.current = draft.updatedAt || Date.now();
      setJclan(draft.jclan || { credit: '', debit: '', pix: '', voucher: '' });
      if (Array.isArray(draft.machines) && draft.machines.length > 0) setMachines(draft.machines);
      if (draft.cash) setCash(draft.cash);
      if (draft.cashSummary) setCashSummary(draft.cashSummary);
      if (draft.selectedExclusionOptions) setSelectedExclusionOptions(draft.selectedExclusionOptions);
      if (draft.customCommands) setCustomCommands(draft.customCommands);
      if (draft.inclusionCommands) setInclusionCommands(draft.inclusionCommands);
      setLastSyncedBy(draft.updatedBy);
      setLastSyncedAt(draft.updatedAt);
      setCloudSyncStatus('synced');
      showToast(`📲 Dados sincronizados (${draft.updatedBy || 'Nuvem'})!`);
    } else {
      setCloudSyncStatus('synced');
      showToast('Nenhum rascunho pendente no outro aparelho.');
    }
  };

  const handleForcePushToCloud = async () => {
    if (!currentTenant?.id) return;
    const now = Date.now();
    const deviceLabel = myDeviceType === 'mobile' ? 'Celular' : 'Computador';
    const draftPayload: ActiveShiftDraft = {
      tenantId: currentTenant.id,
      updatedAt: now,
      updatedBy: `${currentOperator?.name || 'Operador'} (${deviceLabel})`,
      deviceId: myDeviceId,
      deviceType: myDeviceType,
      jclan,
      machines,
      cash,
      cashSummary,
      selectedExclusionOptions,
      customCommands,
      inclusionCommands,
    };
    const { draft, connectedDevices: devs } = await saasApi.saveDraft(currentTenant.id, draftPayload);
    if (Array.isArray(devs)) setConnectedDevices(devs);
    if (draft) {
      setLastSyncedBy(draft.updatedBy);
      setLastSyncedAt(draft.updatedAt);
    }
    showToast('☁️ Seus dados foram enviados instantaneamente para os outros aparelhos!');
  };

  // --- EXECUTOR DE COMANDOS DE VOZ COM SUPORTE A DESFAZER (UNDO) ---
  const handleExecuteVoiceActions = (actions: VoiceAction[], rawTranscript: string): string[] => {
    if (!actions || actions.length === 0) return [];

    // Salva snapshot atual na pilha de Undo antes de modificar
    const snapshot: ShiftSnapshot = {
      jclan: { ...jclan },
      machines: machines.map((m) => ({
        ...m,
        credits: [...m.credits],
        debits: [...m.debits],
        vouchers: [...m.vouchers],
      })),
      cash: { ...cash },
      cashSummary: { ...cashSummary },
    };
    setVoiceUndoStack((prev) => [snapshot, ...prev.slice(0, 19)]);

    const appliedDescriptions: string[] = [];

    let nextJclan = { ...jclan };
    let nextMachines = machines.map((m) => ({
      ...m,
      credits: [...m.credits],
      debits: [...m.debits],
      vouchers: [...m.vouchers],
    }));
    let nextCash = { ...cash };
    let nextCashSummary = { ...cashSummary };

    const combineMoneyStr = (existingStr: string, incomingStr: string, mode?: 'set' | 'add'): string => {
      if (mode !== 'add') return incomingStr;
      const cur = parseValue(existingStr);
      const inc = parseValue(incomingStr);
      if (cur <= 0) return incomingStr;
      return roundCurrency(cur + inc).toFixed(2).replace('.', ',');
    };

    for (const action of actions) {
      if (action.type === 'set_jclan') {
        nextJclan[action.field] = combineMoneyStr(nextJclan[action.field], action.value, action.mode);
        appliedDescriptions.push(action.description);
      } else if (action.type === 'set_machine_pix') {
        const mIdx = nextMachines.findIndex((m) => m.id === action.machineId);
        if (mIdx !== -1) {
          nextMachines[mIdx].pix = combineMoneyStr(nextMachines[mIdx].pix, action.value, action.mode);
          nextMachines[mIdx].collapsed = false;
          appliedDescriptions.push(action.description);
        }
      } else if (action.type === 'set_machine_array') {
        const mIdx = nextMachines.findIndex((m) => m.id === action.machineId);
        if (mIdx !== -1) {
          const targetArr = [...nextMachines[mIdx][action.modality]];
          let slotIdx = action.index;
          if (slotIdx === undefined) {
            if (action.mode === 'add') {
              // No modo somar sem índice explícito, soma no primeiro campo preenchido ou no campo 0
              const filledIdx = targetArr.findIndex((v) => v && v.trim() !== '');
              slotIdx = filledIdx !== -1 ? filledIdx : 0;
            } else {
              // Procura o primeiro campo vazio; se todos estiverem preenchidos, adiciona novo campo
              const emptyIdx = targetArr.findIndex((v) => !v || v.trim() === '');
              slotIdx = emptyIdx !== -1 ? emptyIdx : targetArr.length;
            }
          }
          while (targetArr.length <= slotIdx) {
            targetArr.push('');
          }
          targetArr[slotIdx] = combineMoneyStr(targetArr[slotIdx], action.value, action.mode);
          nextMachines[mIdx][action.modality] = targetArr;
          nextMachines[mIdx].collapsed = false;
          appliedDescriptions.push(action.description);
        }
      } else if (action.type === 'clear_machine') {
        const mIdx = nextMachines.findIndex((m) => m.id === action.machineId);
        if (mIdx !== -1) {
          nextMachines[mIdx] = {
            ...nextMachines[mIdx],
            credits: ['', '', '', '', ''],
            debits: ['', '', '', '', ''],
            vouchers: ['', '', '', '', ''],
            pix: '',
          };
          appliedDescriptions.push(action.description);
        }
      } else if (action.type === 'set_cash_summary') {
        nextCashSummary[action.field] = combineMoneyStr(
          nextCashSummary[action.field],
          action.value,
          action.mode
        );
        appliedDescriptions.push(action.description);
      } else if (action.type === 'set_cash_bill') {
        nextCash[action.field] = action.quantity;
        appliedDescriptions.push(action.description);
      }
    }

    if (appliedDescriptions.length > 0) {
      setJclan(nextJclan);
      setMachines(nextMachines);
      setCash(nextCash);
      setCashSummary(nextCashSummary);
      addAuditLog(
        'sistema',
        'Preenchimento por Comando de Voz',
        `Fala: "${rawTranscript}" -> ${appliedDescriptions.join(' | ')}`
      );
      showToast(`🎙️ Preenchido: ${appliedDescriptions.join(' • ')}`);
    }

    return appliedDescriptions;
  };

  const handleUndoLastVoiceCommand = (): boolean => {
    if (voiceUndoStack.length === 0) {
      showToast('Nenhum comando de voz para desfazer.');
      return false;
    }
    const [lastSnapshot, ...rest] = voiceUndoStack;
    setVoiceUndoStack(rest);
    setJclan(lastSnapshot.jclan);
    setMachines(lastSnapshot.machines);
    setCash(lastSnapshot.cash);
    setCashSummary(lastSnapshot.cashSummary);
    addAuditLog('sistema', 'Desfez Comando de Voz', 'Último preenchimento por voz revertido pelo operador');
    showToast('↩️ Último preenchimento por voz foi desfeito!');
    return true;
  };

  // Carrega o cardápio específico do bar selecionado no Modal de Cardápio do Painel Master
  useEffect(() => {
    if (!tenantForMenuModal) return;
    const localMenuKey = `fechacaixa_menu_${tenantForMenuModal.id}`;
    let localMenuCached: MenuItem[] | null = null;
    try {
      const savedMenu = localStorage.getItem(localMenuKey);
      if (savedMenu) {
        const parsed = JSON.parse(savedMenu);
        if (Array.isArray(parsed)) {
          localMenuCached = parsed;
          setMenuModalItems(parsed);
        }
      }
    } catch {}

    if (tenantForMenuModal.id === currentTenant?.id && !localMenuCached) {
      setMenuModalItems(currentMenu);
    }
    saasApi.getMenu(tenantForMenuModal.id).then((m) => {
      const localMenuIsCustom = isLocalMenuCustomized(tenantForMenuModal.id, localMenuCached);
      if (localMenuIsCustom && localMenuCached !== null) {
        setMenuModalItems(localMenuCached);
        if (tenantForMenuModal.id === currentTenant?.id) {
          setCurrentMenu(localMenuCached);
        }
        if (!Array.isArray(m) || JSON.stringify(m) !== JSON.stringify(localMenuCached)) {
          saasApi.saveMenu(tenantForMenuModal.id, localMenuCached).catch(() => {});
        }
      } else if (Array.isArray(m) && m.length > 0) {
        setMenuModalItems(m);
        try {
          localStorage.setItem(localMenuKey, JSON.stringify(m));
        } catch {}
        if (tenantForMenuModal.id === currentTenant?.id) {
          setCurrentMenu(m);
        }
      } else if (localMenuCached && localMenuCached.length > 0) {
        setMenuModalItems(localMenuCached);
        saasApi.saveMenu(tenantForMenuModal.id, localMenuCached).catch(() => {});
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
    const cleanName = newUserForm.name.trim();
    const cleanPin = newUserForm.pin.trim();
    if (!cleanName || !cleanPin) {
      showToast('Preencha nome e PIN.');
      return;
    }
    if (users.some((u) => u.name.toLowerCase() === cleanName.toLowerCase())) {
      showToast('Este operador já está cadastrado neste bar.');
      return;
    }
    const optimisticUser: User = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      tenantId: currentTenant.id,
      name: cleanName,
      pin: cleanPin,
      isAdmin: newUserForm.isAdmin,
    };
    const nextList = [...users, optimisticUser];
    setUsers(nextList);
    saveUsersForTenantToStorage(currentTenant.id, nextList, true);
    setNewUserForm({ name: '', pin: '', isAdmin: false });

    try {
      const added = await saasApi.addUser(currentTenant.id, {
        name: cleanName,
        pin: cleanPin,
        isAdmin: newUserForm.isAdmin,
      });
      const syncedList = nextList.map((u) => (u.id === optimisticUser.id ? added : u));
      setUsers(syncedList);
      saveUsersForTenantToStorage(currentTenant.id, syncedList, true);
      await saasApi.saveUsers(currentTenant.id, syncedList);
      showToast('Operador cadastrado e salvo com sucesso!');
    } catch {
      showToast('Operador salvo com sucesso!');
    }
  };

  const handleRemoveUser = async (id: number) => {
    if (id === currentOperator?.id) {
      showToast('Você não pode excluir a si mesmo.');
      return;
    }
    const nextList = users.filter((u) => u.id !== id);
    setUsers(nextList);
    saveUsersForTenantToStorage(currentTenant.id, nextList, true);
    try {
      await saasApi.deleteUser(currentTenant.id, id);
      await saasApi.saveUsers(currentTenant.id, nextList);
    } catch (e) {
      console.warn('Erro ao deletar operador na nuvem:', e);
    }
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

    const nextList = users.map((u) =>
      u.id === editingUserId
        ? {
            ...u,
            name: updatedName,
            pin: updatedPin,
            isAdmin: updatedIsAdmin,
          }
        : u
    );
    setUsers(nextList);
    saveUsersForTenantToStorage(currentTenant.id, nextList, true);

    try {
      if (editingUserId) {
        await saasApi.updateUser(currentTenant.id, editingUserId, {
          name: updatedName,
          pin: updatedPin,
          isAdmin: updatedIsAdmin,
        });
        await saasApi.saveUsers(currentTenant.id, nextList);
      }
    } catch (e) {
      console.warn('Erro ao atualizar na nuvem:', e);
    }

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
    showToast('Operador atualizado e salvo com sucesso!');
  };

  const handleBarAdminAddUser = async (userData: { name: string; pin: string; isAdmin: boolean }) => {
    const cleanName = userData.name.trim();
    const cleanPin = userData.pin.trim();
    const optimisticUser: User = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      tenantId: currentTenant.id,
      name: cleanName,
      pin: cleanPin,
      isAdmin: userData.isAdmin,
    };
    const nextList = [
      ...users.filter((u) => u.name.toLowerCase() !== cleanName.toLowerCase()),
      optimisticUser,
    ];
    setUsers(nextList);
    saveUsersForTenantToStorage(currentTenant.id, nextList, true);

    try {
      const added = await saasApi.addUser(currentTenant.id, {
        name: cleanName,
        pin: cleanPin,
        isAdmin: userData.isAdmin,
      });
      const syncedList = nextList.map((u) => (u.id === optimisticUser.id ? added : u));
      setUsers(syncedList);
      saveUsersForTenantToStorage(currentTenant.id, syncedList, true);
      await saasApi.saveUsers(currentTenant.id, syncedList);
      showToast('Operador cadastrado e salvo com sucesso!');
    } catch {
      showToast('Operador salvo com sucesso!');
    }
  };

  const handleBarAdminUpdateUser = async (userId: number, updates: Partial<TenantUser>) => {
    const nextList = users.map((u) => (u.id === userId ? { ...u, ...updates } : u));
    setUsers(nextList);
    saveUsersForTenantToStorage(currentTenant.id, nextList, true);

    try {
      await saasApi.updateUser(currentTenant.id, userId, updates);
      await saasApi.saveUsers(currentTenant.id, nextList);
    } catch (e) {
      console.warn('Erro ao atualizar na nuvem:', e);
    }
    if (currentOperator?.id === userId) {
      setCurrentOperator((prev) => (prev ? { ...prev, ...updates } : null));
    }
    showToast('Operador atualizado e salvo com sucesso!');
  };

  const handleUpdateTenantAppearance = async (updates: Partial<Tenant>) => {
    const now = Date.now();
    const stampedUpdates: Partial<Tenant> = {
      ...updates,
      updatedAt: now,
      isCustomized: true,
    };
    const optimisticUpdated: Tenant = { ...currentTenant, ...stampedUpdates };
    setCurrentTenant(optimisticUpdated);
    setTenants((prev) => {
      const next = prev.map((t) => (t.id === optimisticUpdated.id ? optimisticUpdated : t));
      saveTenantsToStorage(next);
      return next;
    });

    try {
      const updated = await saasApi.updateTenant(currentTenant.id, stampedUpdates);
      if (updated) {
        const merged: Tenant = {
          ...optimisticUpdated,
          ...updated,
          ...stampedUpdates,
          updatedAt: now,
          isCustomized: true,
        };
        setCurrentTenant(merged);
        setTenants((prev) => {
          const next = prev.map((t) => (t.id === merged.id ? merged : t));
          saveTenantsToStorage(next);
          return next;
        });
      }
    } catch {
      const currentList = getStoredTenants().map((t) =>
        t.id === optimisticUpdated.id ? optimisticUpdated : t
      );
      saasApi.syncTenants(currentList).catch(() => {});
    }
  };

  const handleUpdateTenantPlan = async (tenantId: string, newPlan: SaaSPlan) => {
    const monthlyPrice = PLAN_PRICING[newPlan] || 200;
    const planInfo = PLAN_DETAILS[newPlan];
    try {
      const updated = await saasApi.updateTenant(tenantId, {
        plan: newPlan,
        monthlyPrice,
      });
      const stamped: Tenant = {
        ...(updated || currentTenant),
        plan: newPlan,
        monthlyPrice,
        updatedAt: Date.now(),
        isCustomized: true,
      };
      setTenants((prev) => {
        const next = prev.map((t) => (t.id === tenantId ? stamped : t));
        saveTenantsToStorage(next);
        return next;
      });
      if (currentTenant?.id === tenantId) {
        setCurrentTenant(stamped);
      }
      showToast(`🎉 Plano alterado para ${planInfo.name} (${formatCurrency(monthlyPrice)}/mês)!`);
    } catch (err: any) {
      showToast(`Erro ao alterar plano: ${err?.message || 'Falha inesperada'}`);
    }
  };

  // --- HANDLERS SAAS (FASES 1, 2, 3, 4) ---
  const handleSelectTenant = (tenant: Tenant) => {
    setCurrentTenant(tenant);
    setUsers(getStoredUsersForTenant(tenant.id));
    localStorage.setItem('fechacaixa_tenant_id', tenant.id);
    showToast(`Bar selecionado: ${tenant.name}`);
  };

  const handleToggleBlockTenant = async (tenantId: string) => {
    try {
      const updatedTenant = await saasApi.toggleBlockTenant(tenantId);
      if (updatedTenant) {
        const stamped: Tenant = {
          ...updatedTenant,
          updatedAt: Date.now(),
          isCustomized: true,
        };
        setTenants((prev) => {
          const next = prev.map((t) => (t.id === tenantId ? stamped : t));
          saveTenantsToStorage(next);
          return next;
        });
        if (currentTenant?.id === tenantId) {
          setCurrentTenant(stamped);
        }
        showToast(
          stamped.status === 'bloqueado'
            ? `🚫 Bar ${stamped.name} bloqueado no SaaS!`
            : `✅ Bar ${stamped.name} desbloqueado com sucesso!`
        );
      }
      const updatedStats = await saasApi.getMasterStats();
      if (updatedStats) setMasterStats(updatedStats);
    } catch {
      showToast('Erro ao alterar status do bar.');
    }
  };

  const handleCreateTenant = async (tenantData: Partial<Tenant>) => {
    const now = Date.now();
    const payloadWithStamp: Partial<Tenant> = {
      ...tenantData,
      updatedAt: now,
      isCustomized: true,
    };
    try {
      const createdRaw = await saasApi.createTenant(payloadWithStamp);
      const created: Tenant = {
        ...createdRaw,
        updatedAt: now,
        isCustomized: true,
      };
      removeDeletedTenantId(created.id);
      const currentList = getStoredTenants();
      const next = [...currentList.filter((t) => t.id !== created.id && t.slug !== created.slug), created];
      saveTenantsToStorage(next);
      setTenants(next);

      // Garante que todo novo bar comece 100% zerado (sem histórico, sem cardápio, sem maquininhas pré-salvas)
      try {
        localStorage.removeItem(`fechacaixa_closings_${created.id}`);
        localStorage.removeItem(`fechacaixa_menu_${created.id}`);
        localStorage.removeItem(`fechacaixa_menu_customized_${created.id}`);
        localStorage.removeItem(`fechacaixa_draft_${created.id}`);
        localStorage.removeItem(`fechacaixa_audit_logs_${created.id}`);
      } catch {}

      const initialBarUsers: User[] = [
        { id: Date.now(), tenantId: created.id, name: 'admin', pin: '1234', isAdmin: true },
      ];
      saveUsersForTenantToStorage(created.id, initialBarUsers, false);
      setCurrentTenant(created);
      setUsers(initialBarUsers);
      setCurrentMenu([]);
      setHistory([]);
      setMachines([]);
      setAuditLogs([]);
      localStorage.setItem('fechacaixa_tenant_id', created.id);

      const updatedStats = await saasApi.getMasterStats();
      if (updatedStats) setMasterStats(updatedStats);
      showToast(`🎉 Bar ${created.name} cadastrado e salvo com segurança!`);
    } catch {
      const slug = tenantData.slug || tenantData.name?.toLowerCase().replace(/[^a-z0-9]/g, '') || `bar_${Date.now()}`;
      const fallbackTenant: Tenant = {
        id: tenantData.id || `tenant_${slug}`,
        slug,
        name: tenantData.name || 'Novo Bar',
        cnpj: tenantData.cnpj || '',
        city: tenantData.city?.trim() || '',
        address: tenantData.address?.trim() || '',
        phone: tenantData.phone?.trim() || '',
        contactEmail: tenantData.contactEmail || `contato@${slug}.com.br`,
        plan: tenantData.plan || 'pro',
        monthlyPrice: tenantData.monthlyPrice || (tenantData.plan === 'basico' ? 150 : tenantData.plan === 'enterprise' ? 300 : 200),
        status: 'ativo',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date().toISOString(),
        logoInitials: (tenantData.name ? tenantData.name.slice(0, 2).toUpperCase() : 'NB'),
        logoColor: tenantData.logoColor || 'from-orange-500 to-amber-500',
        notes: tenantData.notes || '',
        loginBgImage: tenantData.loginBgImage || 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=1920&q=80',
        themeColor: tenantData.themeColor || 'orange',
        primaryColor: tenantData.primaryColor || '#ea580c',
        pdvSystemName: tenantData.pdvSystemName?.trim() || '',
        cardSystemName: tenantData.cardSystemName?.trim() || '',
        creditFlags: Array.isArray(tenantData.creditFlags) ? tenantData.creditFlags : [],
        debitFlags: Array.isArray(tenantData.debitFlags) ? tenantData.debitFlags : [],
        voucherNames: Array.isArray(tenantData.voucherNames) ? tenantData.voucherNames : [],
        updatedAt: now,
        isCustomized: true,
      };
      removeDeletedTenantId(fallbackTenant.id);
      const currentList = getStoredTenants();
      const next = [...currentList.filter((t) => t.id !== fallbackTenant.id && t.slug !== fallbackTenant.slug), fallbackTenant];
      saveTenantsToStorage(next);
      setTenants(next);

      try {
        localStorage.removeItem(`fechacaixa_closings_${fallbackTenant.id}`);
        localStorage.removeItem(`fechacaixa_menu_${fallbackTenant.id}`);
        localStorage.removeItem(`fechacaixa_menu_customized_${fallbackTenant.id}`);
        localStorage.removeItem(`fechacaixa_draft_${fallbackTenant.id}`);
        localStorage.removeItem(`fechacaixa_audit_logs_${fallbackTenant.id}`);
      } catch {}

      const initialBarUsers: User[] = [
        { id: Date.now(), tenantId: fallbackTenant.id, name: 'admin', pin: '1234', isAdmin: true },
      ];
      saveUsersForTenantToStorage(fallbackTenant.id, initialBarUsers, false);
      setCurrentTenant(fallbackTenant);
      setUsers(initialBarUsers);
      setCurrentMenu([]);
      setHistory([]);
      setMachines([]);
      setAuditLogs([]);
      localStorage.setItem('fechacaixa_tenant_id', fallbackTenant.id);

      saasApi.syncTenants([fallbackTenant], { [fallbackTenant.id]: initialBarUsers }).catch(() => {});
      showToast(`🎉 Bar ${fallbackTenant.name} salvo localmente no seu dispositivo!`);
    }
  };

  const handleDeleteTenant = async (tenantId: string) => {
    const deletedBarName = tenants.find((t) => t.id === tenantId)?.name || 'Bar';
    addDeletedTenantId(tenantId);
    try {
      await saasApi.deleteTenant(tenantId);
    } catch {}
    await clearAllPersistenceForTenant(tenantId);
    try {
      localStorage.removeItem(`fechacaixa_menu_${tenantId}`);
      localStorage.removeItem(`fechacaixa_menu_customized_${tenantId}`);
      localStorage.removeItem(`fechacaixa_users_${tenantId}`);
      localStorage.removeItem(`fechacaixa_users_customized_${tenantId}`);
    } catch {}

    let nextActiveTenant: Tenant | null = null;
    setTenants((prev) => {
      const next = prev.filter((t) => t.id !== tenantId);
      saveTenantsToStorage(next);
      nextActiveTenant = next[0] || null;
      return next;
    });
    if (currentTenant?.id === tenantId && nextActiveTenant) {
      setCurrentTenant(nextActiveTenant);
      localStorage.setItem('fechacaixa_tenant_id', (nextActiveTenant as Tenant).id);
    }
    const updatedStats = await saasApi.getMasterStats();
    if (updatedStats) setMasterStats(updatedStats);
    showToast(`🗑️ Bar "${deletedBarName}" removido permanentemente com todos os seus dados.`);
  };

  const handleSyncAllTenants = async () => {
    try {
      setCloudSyncStatus('syncing');
      const currentList = getStoredTenants();
      const usersMap = getAllStoredUsersMap(currentList);
      const menusMap = getAllStoredMenusMap(currentList);
      const [closingsMap, deletedClosingIdsMap] = await Promise.all([
        getAllStoredClosingsMapAsync(currentList),
        getAllDeletedClosingIdsMapAsync(currentList),
      ]);
      const deletedIds = getDeletedTenantIds();
      const synced = await saasApi.syncTenants(
        currentList,
        usersMap,
        menusMap,
        closingsMap,
        deletedIds,
        deletedClosingIdsMap
      );
      if (synced && synced.length > 0) {
        const deletedSet = new Set(deletedIds);
        const merged = synced
          .filter((t) => !deletedSet.has(t.id))
          .map((st) => {
            const localMatch = currentList.find((m) => m.id === st.id);
            return localMatch && isTenantCustomizedOrEdited(localMatch)
              ? { ...st, ...localMatch }
              : st;
          });
        setTenants(merged);
        saveTenantsToStorage(merged);
      }
      setCloudSyncStatus('synced');
      const updatedStats = await saasApi.getMasterStats();
      if (updatedStats) setMasterStats(updatedStats);
      showToast('☁️ Todos os bares, cardápios, operadores e fechamentos sincronizados na nuvem!');
    } catch {
      setCloudSyncStatus('offline');
      showToast('Falha na conexão com a nuvem, bares e fechamentos protegidos no seu navegador.');
    }
  };

  const handleRestoreTenantsBackup = async (
    importedPayload:
      | Tenant[]
      | {
          tenants?: Tenant[];
          closingsByTenant?: Record<string, HistoryRecord[]>;
          menusByTenant?: Record<string, MenuItem[]>;
          usersByTenant?: Record<string, TenantUser[]>;
        }
  ) => {
    const importedTenants = Array.isArray(importedPayload)
      ? importedPayload
      : Array.isArray(importedPayload?.tenants)
      ? importedPayload.tenants
      : [];

    if (importedTenants.length === 0) {
      showToast('Nenhum bar válido encontrado no arquivo de backup.');
      return;
    }
    const now = Date.now();
    const currentList = getStoredTenants();
    const map = new Map<string, Tenant>();
    currentList.forEach((t) => map.set(t.id, t));
    importedTenants.forEach((t) => {
      if (t && (t.id || t.name)) {
        const id = t.id || `tenant_${t.slug || Date.now()}`;
        removeDeletedTenantId(id);
        map.set(id, { ...t, id, updatedAt: now, isCustomized: true });
      }
    });
    const merged = Array.from(map.values());
    setTenants(merged);
    saveTenantsToStorage(merged);

    // Se o backup contiver histórico de fechamentos, cardápios ou operadores, restaura no IndexedDB + localStorage também
    if (!Array.isArray(importedPayload) && importedPayload) {
      if (importedPayload.closingsByTenant && typeof importedPayload.closingsByTenant === 'object') {
        for (const [tId, list] of Object.entries(importedPayload.closingsByTenant)) {
          if (Array.isArray(list) && list.length > 0) {
            const existing = await loadClosingsForTenantAsync(tId);
            const delIds = await getDeletedClosingIdsAsync(tId);
            const combinedClosings = mergeClosingRecordLists(tId, [list, existing], delIds);
            await saveClosingsForTenant(tId, combinedClosings);
            if (currentTenant?.id === tId) {
              setHistory(combinedClosings);
            }
          }
        }
      }
      if (importedPayload.menusByTenant && typeof importedPayload.menusByTenant === 'object') {
        for (const [tId, mItems] of Object.entries(importedPayload.menusByTenant)) {
          if (Array.isArray(mItems) && mItems.length > 0) {
            try {
              localStorage.setItem(`fechacaixa_menu_${tId}`, JSON.stringify(mItems));
              localStorage.setItem(`fechacaixa_menu_customized_${tId}`, String(now));
            } catch {}
            if (currentTenant?.id === tId) setCurrentMenu(mItems);
          }
        }
      }
      if (importedPayload.usersByTenant && typeof importedPayload.usersByTenant === 'object') {
        for (const [tId, uList] of Object.entries(importedPayload.usersByTenant)) {
          if (Array.isArray(uList) && uList.length > 0) {
            saveUsersForTenantToStorage(tId, uList, true);
            if (currentTenant?.id === tId) setUsers(uList);
          }
        }
      }
    }

    try {
      const [closingsMap, deletedClosingIdsMap] = await Promise.all([
        getAllStoredClosingsMapAsync(merged),
        getAllDeletedClosingIdsMapAsync(merged),
      ]);
      await saasApi.syncTenants(
        merged,
        getAllStoredUsersMap(merged),
        getAllStoredMenusMap(merged),
        closingsMap,
        getDeletedTenantIds(),
        deletedClosingIdsMap
      );
    } catch {}
    const updatedStats = await saasApi.getMasterStats();
    if (updatedStats) setMasterStats(updatedStats);
    showToast(`✓ Backup restaurado e sincronizado com sucesso (${importedTenants.length} bares + histórico)!`);
  };

  const handleImportTenantClosings = async (importedClosings: HistoryRecord[]) => {
    if (!currentTenant?.id || !Array.isArray(importedClosings) || importedClosings.length === 0) {
      showToast('Nenhum fechamento válido encontrado no arquivo.');
      return;
    }
    const tenantId = currentTenant.id;
    const existing = await loadClosingsForTenantAsync(tenantId);
    const deletedIds = await getDeletedClosingIdsAsync(tenantId);
    const merged = mergeClosingRecordLists(
      tenantId,
      [importedClosings.map((c) => ({ ...c, tenantId })), existing],
      deletedIds
    );
    setHistory(merged);
    await saveClosingsForTenant(tenantId, merged);
    await saasApi.syncTenantClosings(tenantId, merged, deletedIds);
    const updatedStats = await saasApi.getMasterStats();
    if (updatedStats) setMasterStats(updatedStats);
    showToast(`✓ ${importedClosings.length} fechamento(s) restaurados e blindados no histórico!`);
  };

  const handleConfirmPayment = async (invoiceId: string) => {
    try {
      const res = await saasApi.confirmPayment(invoiceId);
      if (res.tenant) {
        const stamped: Tenant = { ...res.tenant, updatedAt: Date.now(), isCustomized: true };
        setTenants((prev) => {
          const next = prev.map((t) => (t.id === stamped.id ? stamped : t));
          saveTenantsToStorage(next);
          return next;
        });
        if (currentTenant?.id === stamped.id) {
          setCurrentTenant(stamped);
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
    const localMenuKey = `fechacaixa_menu_${targetTenant.id}`;
    const localMenuCustomKey = `fechacaixa_menu_customized_${targetTenant.id}`;
    try {
      localStorage.setItem(localMenuKey, JSON.stringify(items));
      localStorage.setItem(localMenuCustomKey, String(Date.now()));
    } catch {}
    try {
      const saved = await saasApi.saveMenu(targetTenant.id, items);
      const finalItems = Array.isArray(saved) ? saved : items;
      try {
        localStorage.setItem(localMenuKey, JSON.stringify(finalItems));
        localStorage.setItem(localMenuCustomKey, String(Date.now()));
      } catch {}
      if (currentTenant?.id === targetTenant.id) {
        setCurrentMenu(finalItems);
      }
      if (tenantForMenuModal?.id === targetTenant.id) {
        setMenuModalItems(finalItems);
      }
      showToast(`Cardápio de ${targetTenant.name} atualizado e salvo (${finalItems.length} itens)!`);
    } catch {
      if (currentTenant?.id === targetTenant.id) {
        setCurrentMenu(items);
      }
      if (tenantForMenuModal?.id === targetTenant.id) {
        setMenuModalItems(items);
      }
      showToast('Cardápio salvo localmente no dispositivo.');
    }
  };

  // --- CÁLCULOS TOTAIS (ARITMÉTICA EXATA EM CENTAVOS COM WEAKMAP + USEMEMO AVANÇADO) ---
  // Como getMachineCentsSummary(m) utiliza WeakMap indexado pela referência do objeto Machine,
  // ao digitar em 1 maquininha, as demais (N - 1) maquininhas retornam seus totais em O(1) sem re-parsear strings.
  const { getnetCredit, getnetDebit, getnetVoucher, getnetPix, getnetTotal } = useMemo(() => {
    let creditCents = 0;
    let debitCents = 0;
    let voucherCents = 0;
    let pixCents = 0;

    for (let i = 0; i < machines.length; i++) {
      const s = getMachineCentsSummary(machines[i]);
      creditCents += s.creditCents;
      debitCents += s.debitCents;
      voucherCents += s.voucherCents;
      pixCents += s.pixCents;
    }

    const credit = creditCents / 100;
    const debit = debitCents / 100;
    const voucher = voucherCents / 100;
    const pix = pixCents / 100;
    const total = (creditCents + debitCents + voucherCents + pixCents) / 100;

    return {
      getnetCredit: credit,
      getnetDebit: debit,
      getnetVoucher: voucher,
      getnetPix: pix,
      getnetTotal: roundCurrency(total),
    };
  }, [machines]);

  const jclanCredit = useMemo(() => parseValue(jclan.credit), [jclan.credit]);
  const jclanDebit = useMemo(() => parseValue(jclan.debit), [jclan.debit]);
  const jclanPix = useMemo(() => parseValue(jclan.pix), [jclan.pix]);
  const jclanVoucher = useMemo(() => parseValue(jclan.voucher), [jclan.voucher]);
  const jclanTotal = useMemo(
    () => roundCurrency(jclanCredit + jclanDebit + jclanPix + jclanVoucher),
    [jclanCredit, jclanDebit, jclanPix, jclanVoucher]
  );

  const differenceTotal = useMemo(
    () => roundCurrency(getnetTotal - jclanTotal),
    [getnetTotal, jclanTotal]
  );

  const cashTotal = useMemo(
    () =>
      roundCurrency(
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
          (parseInt(cash.c005) || 0) * 0.05
      ),
    [cash]
  );

  const expectedCash = useMemo(
    () =>
      roundCurrency(
        parseValue(cashSummary.opening) +
          parseValue(cashSummary.jclanCash) -
          parseValue(cashSummary.expenses)
      ),
    [cashSummary]
  );
  const cashDifference = useMemo(
    () => roundCurrency(cashTotal - expectedCash),
    [cashTotal, expectedCash]
  );

  // Valores individuais por bandeira de crédito, débito e voucher do bar (acelerados pelo WeakMap por máquina)
  const creditBreakdown = useMemo(() => {
    const configuredCredits =
      currentTenant?.creditFlags && currentTenant.creditFlags.length > 0
        ? currentTenant.creditFlags
        : [];
    if (configuredCredits.length === 0) return [];

    const maxCreditFields = machines.reduce(
      (max, m) => Math.max(max, m.credits?.length || 0),
      configuredCredits.length
    );

    const list: Array<{ name: string; amount: number }> = [];
    for (let idx = 0; idx < maxCreditFields; idx++) {
      const name = configuredCredits[idx] || `Crédito ${idx + 1}`;
      let sumCents = 0;
      for (let i = 0; i < machines.length; i++) {
        const s = getMachineCentsSummary(machines[i]);
        sumCents += s.creditArrCents[idx] || 0;
      }
      const amount = sumCents / 100;
      if (idx < configuredCredits.length || amount > 0) {
        list.push({ name, amount });
      }
    }
    return list;
  }, [currentTenant?.creditFlags, machines]);

  const debitBreakdown = useMemo(() => {
    const configuredDebits =
      currentTenant?.debitFlags && currentTenant.debitFlags.length > 0
        ? currentTenant.debitFlags
        : [];
    if (configuredDebits.length === 0) return [];

    const maxDebitFields = machines.reduce(
      (max, m) => Math.max(max, m.debits?.length || 0),
      configuredDebits.length
    );

    const list: Array<{ name: string; amount: number }> = [];
    for (let idx = 0; idx < maxDebitFields; idx++) {
      const name = configuredDebits[idx] || `Débito ${idx + 1}`;
      let sumCents = 0;
      for (let i = 0; i < machines.length; i++) {
        const s = getMachineCentsSummary(machines[i]);
        sumCents += s.debitArrCents[idx] || 0;
      }
      const amount = sumCents / 100;
      if (idx < configuredDebits.length || amount > 0) {
        list.push({ name, amount });
      }
    }
    return list;
  }, [currentTenant?.debitFlags, machines]);

  const voucherBreakdown = useMemo(() => {
    const configuredVouchers =
      currentTenant?.voucherNames && currentTenant.voucherNames.length > 0
        ? currentTenant.voucherNames
        : [];
    if (configuredVouchers.length === 0) return [];

    const maxVoucherFields = machines.reduce(
      (max, m) => Math.max(max, m.vouchers?.length || 0),
      configuredVouchers.length
    );

    const list: Array<{ name: string; amount: number }> = [];
    for (let idx = 0; idx < maxVoucherFields; idx++) {
      const name = configuredVouchers[idx] || `Voucher ${idx + 1}`;
      let sumCents = 0;
      for (let i = 0; i < machines.length; i++) {
        const s = getMachineCentsSummary(machines[i]);
        sumCents += s.voucherArrCents[idx] || 0;
      }
      const amount = sumCents / 100;
      if (idx < configuredVouchers.length || amount > 0) {
        list.push({ name, amount });
      }
    }
    return list;
  }, [currentTenant?.voucherNames, machines]);

  // --- HANDLERS DE ALTERAÇÃO ESTABILIZADOS (USECALLBACK) ---
  const handleJclanChange = useCallback(
    (field: 'credit' | 'debit' | 'pix' | 'voucher', value: string) => {
      setJclan((prev) => ({ ...prev, [field]: value.replace(/[^0-9,.]/g, '') }));
    },
    []
  );

  const handleCashSummaryChange = useCallback(
    (field: 'opening' | 'jclanCash' | 'expenses', value: string) => {
      setCashSummary((prev) => ({ ...prev, [field]: value.replace(/[^0-9,.]/g, '') }));
    },
    []
  );

  const handleCashChange = useCallback((field: string, value: string) => {
    setCash((prev) => ({ ...prev, [field]: value.replace(/[^0-9]/g, '') }));
  }, []);

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

  // --- INTEGRAÇÃO SOB DEMANDA (1 CLIQUE) COM PORTAL WEB JCLAN ALPHAX9 + LEITURA DE TELA ---
  const jclanRef = useRef(jclan);
  jclanRef.current = jclan;
  const cashSummaryRef = useRef(cashSummary);
  cashSummaryRef.current = cashSummary;

  const applyJclanTotals = useCallback(
    (totals: JclanTotalsResult, sourceLabel: string, silent = false) => {
      const prevJclan = jclanRef.current;
      const prevCash = cashSummaryRef.current.jclanCash;

      const nextCredit =
        totals.credit !== undefined && totals.credit !== ''
          ? totals.credit.replace(/[^0-9,.]/g, '')
          : prevJclan.credit;
      const nextDebit =
        totals.debit !== undefined && totals.debit !== ''
          ? totals.debit.replace(/[^0-9,.]/g, '')
          : prevJclan.debit;
      const nextPix =
        totals.pix !== undefined && totals.pix !== ''
          ? totals.pix.replace(/[^0-9,.]/g, '')
          : prevJclan.pix;
      const nextVoucher =
        totals.voucher !== undefined && totals.voucher !== ''
          ? totals.voucher.replace(/[^0-9,.]/g, '')
          : prevJclan.voucher;
      const nextCash =
        totals.cash !== undefined && totals.cash !== ''
          ? totals.cash.replace(/[^0-9,.]/g, '')
          : prevCash;

      // Calcula a diferença exata do que mudou em relação à leitura anterior para o operador ver o resultado da sua operação
      const deltaItems: Array<{ label: string; diff: number }> = [
        { label: 'Crédito', diff: roundCurrency(parseValue(nextCredit) - parseValue(prevJclan.credit)) },
        { label: 'Débito', diff: roundCurrency(parseValue(nextDebit) - parseValue(prevJclan.debit)) },
        { label: 'Pix', diff: roundCurrency(parseValue(nextPix) - parseValue(prevJclan.pix)) },
        { label: 'Voucher', diff: roundCurrency(parseValue(nextVoucher) - parseValue(prevJclan.voucher)) },
        { label: 'Dinheiro', diff: roundCurrency(parseValue(nextCash) - parseValue(prevCash)) },
      ].filter((item) => Math.abs(item.diff) >= 0.01);

      const hasChanged =
        nextCredit !== prevJclan.credit ||
        nextDebit !== prevJclan.debit ||
        nextPix !== prevJclan.pix ||
        nextVoucher !== prevJclan.voucher ||
        nextCash !== prevCash;

      setLastJclanSyncAt(Date.now());
      setLastJclanError(null);

      if (!hasChanged) {
        setLastJclanChangeSummary('Sem alteração nos totais desde a última consulta');
        if (!silent) {
          showToast(
            `✅ ${currentTenant?.pdvSystemName || 'Jclan'} atualizado! Os totais permanecem os mesmos.`
          );
        }
        return;
      }

      const deltaText =
        deltaItems.length > 0
          ? deltaItems
              .map(
                (d) =>
                  `${d.label}: ${d.diff > 0 ? '+' : '-'}${formatCurrency(Math.abs(d.diff))}`
              )
              .join(' · ')
          : 'Totais preenchidos';

      setLastJclanChangeSummary(deltaText);

      setJclanUndoSnapshot({
        jclan: { ...prevJclan },
        jclanCash: prevCash,
      });

      setJclan({
        credit: nextCredit,
        debit: nextDebit,
        pix: nextPix,
        voucher: nextVoucher,
      });

      if (totals.cash !== undefined && totals.cash !== '') {
        setCashSummary((prev) => ({
          ...prev,
          jclanCash: nextCash,
        }));
      }

      const summaryParts: string[] = [];
      if (totals.credit) summaryParts.push(`Créd: R$ ${totals.credit}`);
      if (totals.debit) summaryParts.push(`Déb: R$ ${totals.debit}`);
      if (totals.pix) summaryParts.push(`Pix: R$ ${totals.pix}`);
      if (totals.voucher) summaryParts.push(`Voucher: R$ ${totals.voucher}`);
      if (totals.cash) summaryParts.push(`Dinheiro: R$ ${totals.cash}`);

      addAuditLog(
        'pdv',
        `Atualizou ${currentTenant?.pdvSystemName || 'Jclan'} (${sourceLabel})`,
        `${deltaText} | Atuais: ${summaryParts.join(' | ') || 'Totais atualizados'}`
      );

      showToast(
        `⚡ ${currentTenant?.pdvSystemName || 'Jclan'} atualizado! Mudança: ${deltaText}`
      );
    },
    [currentTenant?.pdvSystemName]
  );

  const handleUndoJclanSync = useCallback(() => {
    if (!jclanUndoSnapshot) return;
    setJclan(jclanUndoSnapshot.jclan);
    setCashSummary((prev) => ({
      ...prev,
      jclanCash: jclanUndoSnapshot.jclanCash,
    }));
    setJclanUndoSnapshot(null);
    setLastJclanChangeSummary(null);
    addAuditLog('pdv', `Desfez última sincronização do ${currentTenant?.pdvSystemName || 'Jclan'}`, 'Valores anteriores restaurados');
    showToast('↩️ Valores anteriores do Jclan restaurados!');
  }, [jclanUndoSnapshot, currentTenant?.pdvSystemName]);

  const handleTriggerJclanSync = useCallback(
    async (
      overrideCreds?: {
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
      },
      silent = false
    ): Promise<boolean> => {
      if (!currentTenant) return false;
      if (jclanSyncInFlightRef.current && silent) return false;

      const portalUrl =
        overrideCreds?.portalUrl ||
        currentTenant.jclanPortalUrl ||
        'https://gestao.flordebrasacuritiba.com.br/';
      const username = overrideCreds?.username ?? currentTenant.jclanPortalUsername ?? '';
      const password = overrideCreds?.password ?? currentTenant.jclanPortalPassword ?? '';
      const dateMode = overrideCreds?.dateMode || currentTenant.jclanDateMode || 'turno_auto';
      const customStartDate =
        overrideCreds?.customStartDate ?? currentTenant.jclanCustomStartDate ?? '';
      const customStartTime =
        overrideCreds?.customStartTime ?? currentTenant.jclanCustomStartTime ?? '00:00';
      const customEndDate =
        overrideCreds?.customEndDate ?? currentTenant.jclanCustomEndDate ?? '';
      const customEndTime =
        overrideCreds?.customEndTime ?? currentTenant.jclanCustomEndTime ?? '23:59';
      const selectedEmpresaId =
        overrideCreds?.selectedEmpresaId ?? currentTenant.jclanSelectedEmpresaId ?? '';

      if (!username || !password) {
        if (!silent) {
          setIsJclanSyncModalOpen(true);
        }
        return false;
      }

      jclanSyncInFlightRef.current = true;
      if (!silent) setIsJclanSyncing(true);

      try {
        const response = await fetch('/api/jclan/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tenantId: currentTenant.id,
            tenantName: currentTenant.name,
            portalUrl,
            username,
            password,
            forceRelogin: Boolean(overrideCreds?.forceRelogin),
            dateMode,
            customStartDate,
            customStartTime,
            customEndDate,
            customEndTime,
            selectedEmpresaId,
            customApiKey: apiKey || undefined,
          }),
        });
        const data = await response.json();
        if (response.ok && data?.success && data?.totals) {
          if (data.periodLabel) setLastJclanPeriodLabel(data.periodLabel);
          if (data.selectedEmpresaName) setLastJclanEmpresaName(data.selectedEmpresaName);
          if (Array.isArray(data.breakdown)) setLastJclanBreakdown(data.breakdown);
          if (Array.isArray(data.companies) && data.companies.length > 0) {
            setJclanCompanies(data.companies);
          }

          if (data.foundAny) {
            applyJclanTotals(
              data.totals,
              `Jclan AlphaX9 (${data.periodLabel || 'Manual'})`,
              silent
            );
          } else {
            setLastJclanSyncAt(Date.now());
            setLastJclanError(null);
            setLastJclanChangeSummary('R$ 0,00 registrados neste período');
            if (!silent) {
              showToast(
                `✅ Conectado ao Jclan (${data.selectedEmpresaName || 'Unidade'} · ${
                  data.periodLabel || 'Período'
                }): R$ 0,00 lançados até o momento.`
              );
            }
          }
          return true;
        } else {
          const errMsg =
            data?.message ||
            data?.error ||
            'Não foi possível autenticar na API AlphaX9 da Jclan. Verifique seu E-mail e Senha.';
          setLastJclanError(errMsg);
          if (!silent) {
            showToast(`⚠️ ${errMsg}`);
          }
          return false;
        }
      } catch {
        const errMsg = 'Falha de comunicação ao conectar com o servidor AlphaX9 da Jclan.';
        setLastJclanError(errMsg);
        if (!silent) {
          showToast(`⚠️ ${errMsg}`);
        }
        return false;
      } finally {
        jclanSyncInFlightRef.current = false;
        if (!silent) setIsJclanSyncing(false);
      }
    },
    [currentTenant, apiKey, applyJclanTotals]
  );

  const handleQuickJclanScreenPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsJclanOcrLoading(true);
    showToast('📸 Lendo valores da tela Jclan...');
    try {
      const processed = await preprocessReceiptImage(file, {
        maxDimension: 1400,
        quality: 0.82,
      });
      const response = await fetch('/api/jclan/ocr-screen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: processed.base64,
          mimeType: processed.mimeType,
          customApiKey: apiKey || undefined,
        }),
      });
      const data = await response.json();
      if (response.ok && data?.success && data?.totals) {
        applyJclanTotals(data.totals, 'Print / Foto Jclan', false);
      } else {
        showToast(data?.error || 'Não foi possível identificar os totais na imagem.');
      }
    } catch {
      showToast('Erro ao processar a foto/print da tela do Jclan.');
    } finally {
      setIsJclanOcrLoading(false);
      e.target.value = '';
    }
  };

  const handleCashBlur = (field: string, label: string) => {
    const val = cash[field];
    if (val && parseInt(val, 10) > 0) {
      addAuditLog('gaveta', `Contagem de dinheiro (${label})`, `Qtd: ${val} un.`);
    }
  };

  const handleMachineArrayBlur = useCallback(
    (
      machineId: number,
      type: 'credits' | 'debits' | 'vouchers',
      index: number,
      value: string
    ) => {
      if (value && parseValue(value) > 0) {
        const configuredCredits = currentTenant?.creditFlags || [];
        const configuredDebits = currentTenant?.debitFlags || [];
        const configuredVouchers = currentTenant?.voucherNames || [];
        const typeLabel =
          type === 'credits'
            ? configuredCredits[index]
              ? `Crédito ${configuredCredits[index]}`
              : `Crédito (Campo ${index + 1})`
            : type === 'debits'
            ? configuredDebits[index]
              ? `Débito ${configuredDebits[index]}`
              : `Débito (Campo ${index + 1})`
            : configuredVouchers[index]
            ? `Voucher ${configuredVouchers[index]}`
            : `Voucher (Campo ${index + 1})`;
        addAuditLog(
          'cartoes',
          `Preencheu ${typeLabel} na Máquina #${machineId}`,
          `Valor digitado: R$ ${value}`
        );
      }
    },
    [currentTenant?.creditFlags, currentTenant?.debitFlags, currentTenant?.voucherNames, currentOperator?.name]
  );

  const handleMachinePixBlur = useCallback(
    (machineId: number, value: string) => {
      if (value && parseValue(value) > 0) {
        addAuditLog(
          'cartoes',
          `Preencheu Pix na Máquina #${machineId}`,
          `Valor digitado: R$ ${value}`
        );
      }
    },
    [currentOperator?.name]
  );

  const handleArrayChange = useCallback(
    (
      machineId: number,
      type: 'credits' | 'debits' | 'vouchers',
      index: number,
      value: string
    ) => {
      const cleaned = value.replace(/[^0-9,.]/g, '');
      setMachines((prev) =>
        prev.map((m) =>
          m.id === machineId
            ? {
                ...m,
                [type]: m[type].map((v, i) => (i === index ? cleaned : v)),
              }
            : m
        )
      );
    },
    []
  );

  const handlePixChange = useCallback((machineId: number, value: string) => {
    const cleaned = value.replace(/[^0-9,.]/g, '');
    setMachines((prev) =>
      prev.map((m) => (m.id === machineId ? { ...m, pix: cleaned } : m))
    );
  }, []);

  const handleClearMachine = useCallback(
    (machineId: number) => {
      setMachines((prev) =>
        prev.map((m) =>
          m.id === machineId
            ? {
                ...createEmptyMachine(m.id, currentTenant),
                collapsed: m.collapsed,
              }
            : m
        )
      );
    },
    [currentTenant]
  );

  const toggleCollapse = useCallback((machineId: number) => {
    setMachines((prev) => prev.map((m) => (m.id === machineId ? { ...m, collapsed: !m.collapsed } : m)));
  }, []);

  const handleOpenVoiceForMachine = useCallback((machineId: number, isCollapsed: boolean) => {
    setVoiceActiveMachineId(machineId);
    setIsVoicePanelOpen(true);
    if (isCollapsed) {
      setMachines((prev) => prev.map((m) => (m.id === machineId ? { ...m, collapsed: false } : m)));
    }
  }, []);

  const setAllCollapsed = useCallback((state: boolean) => {
    setMachines((prev) => prev.map((m) => ({ ...m, collapsed: state })));
  }, []);

  const handleAddMachine = useCallback(() => {
    setMachines((prev) => {
      const newMachines = [...prev, createEmptyMachine(0, currentTenant)];
      return newMachines.map((m, index) => ({ ...m, id: index + 1 }));
    });
  }, [currentTenant]);

  const handleRemoveMachine = useCallback((machineId: number) => {
    setMachines((prev) => {
      const filtered = prev.filter((m) => m.id !== machineId);
      return filtered.map((m, index) => ({ ...m, id: index + 1 }));
    });
  }, []);

  const handleAddField = useCallback((machineId: number, type: 'credits' | 'debits' | 'vouchers') => {
    setMachines((prev) =>
      prev.map((m) => (m.id === machineId ? { ...m, [type]: [...m[type], ''] } : m))
    );
  }, []);

  // --- NAVEGAÇÃO POR SETAS DO TECLADO ---
  const jclanFields = ['credit', 'debit', 'pix', 'voucher'];
  const handleJclanKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>, field: string) => {
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
  }, []);

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

  const machinesRef = useRef<Machine[]>(machines);
  machinesRef.current = machines;

  const handleKeyDown = useCallback(
    (
      e: React.KeyboardEvent<HTMLInputElement>,
      machineId: number,
      type: 'credits' | 'debits' | 'vouchers' | 'pix',
      index: number
    ) => {
      const currentMachines = machinesRef.current;
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
        else if (machineId < currentMachines.length) {
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
        const currentArrayLength = (currentMachines.find((m) => m.id === machineId) as any)?.[type]?.length || 5;
        if (target.selectionEnd === target.value.length) {
          if (index < currentArrayLength - 1 && type !== 'pix') {
            e.preventDefault();
            nextColIndex = index + 1;
          } else if (machineId < currentMachines.length) {
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
    },
    []
  );

  // --- FUNÇÕES DE CONVERSÃO EXATA EM CENTAVOS ---
  const toCents = (val: number): number => Math.round(val * 100);
  const fromCents = (cents: number): number => cents / 100;
  const withTaxCents = (cents: number): number => Math.round(cents * 1.1);

  // Interface para o cálculo rigoroso de desconto no Jclan com taxa de serviço de 10%
  interface TaxDiscountResult {
    discountToTypeCents: number; // Valor do desconto a ser digitado no Jclan (em centavos, ex: 45 = R$ 0,45)
    effectiveDropCents: number;  // Abatimento real produzido na comanda com os 10%: Math.round(d * 1.10) (ex: 50 = R$ 0,50)
    residualCents: number;       // Diferença residual após o desconto (0 centavos = zeramento perfeito no centavo)
  }

  // No Jclan (PDV), ao dar um desconto D em uma comanda COM 10% de taxa de serviço:
  // O sistema calcula os 10% sobre o Subtotal Líquido: Total = (Subtotal - D) * 1.10 = Subtotal * 1.10 - (D * 1.10).
  // Portanto, cada centavo de desconto digitado reduz a conta final em Math.round(D * 1.10).
  // Esta função calcula o valor exato de desconto D (<= R$ 1,00) que, ao ser multiplicado por 1,10 no Jclan,
  // produz a redução necessária nos centavos, eliminando 100% dos erros recorrentes de centavos.
  const calculateDiscountForWithTax = (neededDropCents: number): TaxDiscountResult => {
    if (neededDropCents <= 0) {
      return { discountToTypeCents: 0, effectiveDropCents: 0, residualCents: 0 };
    }
    let bestDiscount = 0;
    let bestEffective = 0;
    let bestResidual = Infinity;

    // Varre descontos de 1 a 100 centavos (ou seja, até o teto de R$ 1,00 de desconto)
    for (let d = 1; d <= 100; d++) {
      const effective = Math.round(d * 1.1);
      const residual = Math.abs(effective - neededDropCents);
      if (residual < bestResidual) {
        bestResidual = residual;
        bestDiscount = d;
        bestEffective = effective;
        if (residual === 0) break; // Zeramento 100% no centavo exato!
      }
    }

    return {
      discountToTypeCents: bestDiscount,
      effectiveDropCents: bestEffective,
      residualCents: bestResidual,
    };
  };

  const formatItemCounts = (items: Array<MenuItem | CommandItem>): string => {
    const counts: Record<string, number> = {};
    items.forEach((i) => (counts[i.name] = (counts[i.name] || 0) + 1));
    return Object.entries(counts)
      .map(([name, count]) => (count > 1 ? `${count}x ${name}` : name))
      .join(' + ');
  };

  // --- MOTOR DE COMBINAÇÕES ILIMITADAS DO CARDÁPIO DO BAR/RESTAURANTE ---
  // Sem limite de quantidade de itens: utiliza quantos itens do cardápio forem necessários
  // para atingir qualquer valor de sobra ou falta com precisão em centavos.
  interface UnlimitedComboEntry {
    item: MenuItem;
    qty: number;
  }

  interface UnlimitedComboResult {
    sumCents: number;
    formatted: string;
    sig: string;
    totalQty: number;
    distinctCount: number;
  }

  const buildUnlimitedComboSummary = (
    entries: UnlimitedComboEntry[],
    alwaysPrefixOne = true
  ): { formatted: string; sig: string; totalQty: number; distinctCount: number } => {
    const map = new Map<string, { item: MenuItem; qty: number; priceCents: number }>();
    for (const e of entries) {
      if (e.qty <= 0) continue;
      const existing = map.get(e.item.name);
      if (existing) {
        existing.qty += e.qty;
      } else {
        map.set(e.item.name, { item: e.item, qty: e.qty, priceCents: toCents(e.item.price) });
      }
    }
    const merged = Array.from(map.values()).sort((a, b) => b.priceCents - a.priceCents || a.item.name.localeCompare(b.item.name));
    let totalQty = 0;
    const parts: string[] = [];
    const sigParts: string[] = [];
    for (const m of merged) {
      totalQty += m.qty;
      parts.push(m.qty > 1 || alwaysPrefixOne ? `${m.qty}x ${m.item.name}` : m.item.name);
      sigParts.push(`${m.qty}x${m.item.name}`);
    }
    return {
      formatted: parts.join(' + '),
      sig: sigParts.sort().join('+'),
      totalQty,
      distinctCount: merged.length,
    };
  };

  // Cache da Tabela de Programação Dinâmica (Unbounded Knapsack Variation) por assinatura do cardápio
  const dpMenuCacheRef = useRef<{
    menuKey: string;
    limitCents: number;
    uniquePrices: Int32Array;
    priceBuckets: Map<number, MenuItem[]>;
    minQty: Int32Array;
    firstPrice: Int32Array;
    altPrice1: Int32Array;
    altPrice2: Int32Array;
  } | null>(null);

  const findUnlimitedMenuSubsets = (
    minSumCents: number,
    maxSumCents: number,
    menuToUse: MenuItem[],
    alwaysPrefixOne = true
  ): UnlimitedComboResult[] => {
    if (maxSumCents <= 0 || !menuToUse || menuToUse.length === 0) return [];
    const effectiveMin = Math.max(1, minSumCents);
    if (effectiveMin > maxSumCents) return [];

    // 1. Filtra itens válidos e agrupa por classes de equivalência de preço em centavos (ideal para cardápios grandes com preços repetidos/similares)
    const priceBuckets = new Map<number, MenuItem[]>();
    const keyParts: string[] = [];

    for (let i = 0; i < menuToUse.length; i++) {
      const item = menuToUse[i];
      const cents = toCents(item.price);
      if (cents <= 0) continue;
      keyParts.push(`${item.name}:${cents}`);
      let bucket = priceBuckets.get(cents);
      if (!bucket) {
        bucket = [item];
        priceBuckets.set(cents, bucket);
      } else if (bucket.length < 4 && !bucket.some((b) => b.name === item.name)) {
        // Mantém até 4 itens distintos por mesmo preço para gerar variações ricas sem inflar a tabela DP
        bucket.push(item);
      }
    }

    if (priceBuckets.size === 0) return [];

    const menuKey = keyParts.join('|');
    const MAX_DP_CAPACITY = 200000; // Até R$ 2.000,00 diretamente na tabela DP em memória (Int32Array)
    const INF = 0x3fffffff;

    // Determina até qual capacidade em centavos a tabela DP precisa estar construída
    const neededDpLimit = Math.min(
      MAX_DP_CAPACITY,
      Math.max(maxSumCents <= MAX_DP_CAPACITY ? maxSumCents : MAX_DP_CAPACITY, 60000)
    );

    let dpState = dpMenuCacheRef.current;
    if (!dpState || dpState.menuKey !== menuKey || dpState.limitCents < neededDpLimit) {
      const sortedUniquePrices = Array.from(priceBuckets.keys()).sort((a, b) => b - a);
      const uniquePrices = new Int32Array(sortedUniquePrices);
      const buildLimit = neededDpLimit;

      const minQty = new Int32Array(buildLimit + 1);
      minQty.fill(INF);
      minQty[0] = 0;

      const firstPrice = new Int32Array(buildLimit + 1);
      const altPrice1 = new Int32Array(buildLimit + 1);
      const altPrice2 = new Int32Array(buildLimit + 1);

      // 2. Construção da Tabela de Programação Dinâmica (Unbounded Knapsack / Change-Making Variation)
      // Complexidade O(U * W), onde U é apenas o número de preços únicos no cardápio e W é o limite em centavos
      for (let i = 0; i < uniquePrices.length; i++) {
        const p = uniquePrices[i];
        if (p > buildLimit) continue;

        for (let w = p; w <= buildLimit; w++) {
          const prev = minQty[w - p];
          if (prev === INF) continue;
          const cand = prev + 1;
          const cur = minQty[w];

          if (cand < cur) {
            if (cur === cand + 1) {
              altPrice2[w] = altPrice1[w];
              altPrice1[w] = firstPrice[w];
            } else {
              altPrice1[w] = 0;
              altPrice2[w] = 0;
            }
            minQty[w] = cand;
            firstPrice[w] = p;
          } else if (cand <= cur + 1) {
            const fp = firstPrice[w];
            const ap1 = altPrice1[w];
            if (p !== fp && ap1 === 0) {
              altPrice1[w] = p;
            } else if (p !== fp && p !== ap1 && altPrice2[w] === 0) {
              altPrice2[w] = p;
            }
          }
        }
      }

      dpState = {
        menuKey,
        limitCents: buildLimit,
        uniquePrices,
        priceBuckets,
        minQty,
        firstPrice,
        altPrice1,
        altPrice2,
      };
      dpMenuCacheRef.current = dpState;
    }

    const { uniquePrices, minQty, firstPrice, altPrice1, altPrice2 } = dpState;
    const activeBuckets = dpState.priceBuckets;

    const results: UnlimitedComboResult[] = [];
    const seenSigs = new Set<string>();

    const recordMatch = (sumCents: number, entries: UnlimitedComboEntry[]) => {
      if (sumCents < effectiveMin || sumCents > maxSumCents) return;
      const summary = buildUnlimitedComboSummary(entries, alwaysPrefixOne);
      if (summary.totalQty === 0) return;
      if (!seenSigs.has(summary.sig)) {
        seenSigs.add(summary.sig);
        results.push({
          sumCents,
          formatted: summary.formatted,
          sig: summary.sig,
          totalQty: summary.totalQty,
          distinctCount: summary.distinctCount,
        });
      }
    };

    // Reconstrói um caminho ótimo na tabela DP a partir do peso remW até 0
    const traceDpPath = (
      startW: number,
      forcedFirstPrice = 0,
      useAltAtSecondStep = false
    ): Map<number, number> | null => {
      const counts = new Map<number, number>();
      let cur = startW;

      if (forcedFirstPrice > 0) {
        if (cur < forcedFirstPrice || minQty[cur - forcedFirstPrice] === INF) return null;
        counts.set(forcedFirstPrice, 1);
        cur -= forcedFirstPrice;
      }

      let step = 0;
      let safety = 0;
      while (cur > 0 && safety < 2000) {
        safety++;
        let p = firstPrice[cur];
        if (step === 0 && useAltAtSecondStep && altPrice1[cur] > 0) {
          p = altPrice1[cur];
        }
        if (p <= 0 || cur < p || minQty[cur - p] === INF) return null;
        counts.set(p, (counts.get(p) || 0) + 1);
        cur -= p;
        step++;
      }

      return cur === 0 ? counts : null;
    };

    // Expande um multiconjunto de preços da tabela DP em combinações reais de itens (aproveitando itens de mesmo preço)
    const expandPriceCountsToResults = (
      totalSumCents: number,
      priceCounts: Map<number, number>,
      prefixEntries: UnlimitedComboEntry[]
    ) => {
      const priceEntries = Array.from(priceCounts.entries());
      if (priceEntries.length === 0 && prefixEntries.length === 0) return;

      // Variante 0: primeiro item representante de cada faixa de preço
      const baseCombo: UnlimitedComboEntry[] = [...prefixEntries];
      let hasMultiBucket = false;
      for (const [p, qty] of priceEntries) {
        const bucket = activeBuckets.get(p);
        if (!bucket || bucket.length === 0) return;
        if (bucket.length > 1) hasMultiBucket = true;
        baseCombo.push({ item: bucket[0], qty });
      }
      recordMatch(totalSumCents, baseCombo);

      // Variantes de equivalência: se o cardápio possui múltiplos itens com o mesmo preço, gera alternativas variadas
      if (hasMultiBucket) {
        for (let altIdx = 1; altIdx <= 2; altIdx++) {
          const altCombo: UnlimitedComboEntry[] = [...prefixEntries];
          for (const [p, qty] of priceEntries) {
            const bucket = activeBuckets.get(p)!;
            const chosen = bucket[altIdx % bucket.length];
            altCombo.push({ item: chosen, qty });
          }
          recordMatch(totalSumCents, altCombo);
        }

        // Variante mista: divide quantidade >= 2 entre dois itens de mesmo preço (ex: 1x Item A + 1x Item B)
        const splitCombo: UnlimitedComboEntry[] = [...prefixEntries];
        let didSplit = false;
        for (const [p, qty] of priceEntries) {
          const bucket = activeBuckets.get(p)!;
          if (!didSplit && qty >= 2 && bucket.length >= 2) {
            splitCombo.push({ item: bucket[0], qty: qty - 1 });
            splitCombo.push({ item: bucket[1], qty: 1 });
            didSplit = true;
          } else {
            splitCombo.push({ item: bucket[0], qty });
          }
        }
        if (didSplit) {
          recordMatch(totalSumCents, splitCombo);
        }
      }
    };

    // Executa a busca na janela [winMin, winMax] dentro da tabela DP com um prefixo opcional (para alvos > R$ 2.000,00)
    const searchDpWindow = (
      winMin: number,
      winMax: number,
      prefixSumCents: number,
      prefixEntries: UnlimitedComboEntry[]
    ) => {
      const clampedMin = Math.max(0, winMin);
      const clampedMax = Math.min(dpState!.limitCents, winMax);
      if (clampedMin > clampedMax) return;

      const reachable: number[] = [];
      for (let w = clampedMin; w <= clampedMax; w++) {
        if (minQty[w] < INF) {
          reachable.push(w);
        }
      }
      if (reachable.length === 0) return;

      // Seleciona pesos prioritários: menores somas (sobra), maiores somas (falta) e menores quantidades de itens (minQty[w])
      const selectedWeights = new Set<number>();
      const limitEdge = Math.min(reachable.length, 18);
      for (let i = 0; i < limitEdge; i++) {
        selectedWeights.add(reachable[i]);
        selectedWeights.add(reachable[reachable.length - 1 - i]);
      }

      const byMinItems = [...reachable].sort((a, b) => minQty[a] - minQty[b] || a - b);
      for (let i = 0; i < Math.min(byMinItems.length, 18); i++) {
        selectedWeights.add(byMinItems[i]);
      }

      for (const w of selectedWeights) {
        const totalSum = prefixSumCents + w;
        if (totalSum < effectiveMin || totalSum > maxSumCents) continue;

        if (w === 0) {
          recordMatch(totalSum, prefixEntries);
          continue;
        }

        const optQty = minQty[w];

        // 1. Caminho ótimo principal da tabela DP
        const path0 = traceDpPath(w, 0, false);
        if (path0) expandPriceCountsToResults(totalSum, path0, prefixEntries);

        // 2. Caminhos alternativos registrados na tabela DP (altPrice1, altPrice2 e ramificação de 2º nível)
        if (altPrice1[w] > 0) {
          const path1 = traceDpPath(w, altPrice1[w], false);
          if (path1) expandPriceCountsToResults(totalSum, path1, prefixEntries);
        }
        if (altPrice2[w] > 0) {
          const path2 = traceDpPath(w, altPrice2[w], false);
          if (path2) expandPriceCountsToResults(totalSum, path2, prefixEntries);
        }
        const pathSecondAlt = traceDpPath(w, 0, true);
        if (pathSecondAlt) expandPriceCountsToResults(totalSum, pathSecondAlt, prefixEntries);

        // 3. Varredura rápida na tabela DP por transições de 1º passo que mantenham a quantidade de itens próxima do ótimo (<= optQty + 1)
        let extraBranches = 0;
        for (let i = 0; i < uniquePrices.length && extraBranches < 4; i++) {
          const p = uniquePrices[i];
          if (p > w || p === firstPrice[w] || p === altPrice1[w] || p === altPrice2[w]) continue;
          if (minQty[w - p] + 1 <= optQty + 1) {
            const branchPath = traceDpPath(w, p, false);
            if (branchPath) {
              expandPriceCountsToResults(totalSum, branchPath, prefixEntries);
              extraBranches++;
            }
          }
        }
      }
    };

    // Caso padrão (até R$ 2.000,00): consulta direta O(1) na tabela de Programação Dinâmica
    if (maxSumCents <= dpState.limitCents) {
      searchDpWindow(effectiveMin, maxSumCents, 0, []);
    } else {
      // Para valores extraordinariamente altos (> R$ 2.000,00), reduz com múltiplos dos maiores itens âncora até caber na tabela DP
      const topAnchorCount = Math.min(uniquePrices.length, 5);
      for (let i = 0; i < topAnchorCount; i++) {
        const anchorPrice = uniquePrices[i];
        if (anchorPrice <= 0) continue;
        const anchorBucket = activeBuckets.get(anchorPrice);
        if (!anchorBucket || anchorBucket.length === 0) continue;

        const targetRemainder = Math.min(60000, Math.floor(dpState.limitCents / 2));
        const chunkQty = Math.max(1, Math.floor((effectiveMin - targetRemainder) / anchorPrice));
        const prefixSum = chunkQty * anchorPrice;
        if (prefixSum >= maxSumCents) continue;

        const remMin = Math.max(0, effectiveMin - prefixSum);
        const remMax = maxSumCents - prefixSum;
        if (remMin <= dpState.limitCents) {
          searchDpWindow(remMin, Math.min(remMax, dpState.limitCents), prefixSum, [
            { item: anchorBucket[0], qty: chunkQty },
          ]);
        }
      }
    }

    return results;
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

  // --- SUGESTÃO INTELIGENTE BASEADA NO CARDÁPIO (SEM LIMITE DE QUANTIDADE DE ITENS, DESCONTO <= R$ 1,00) ---
  const calculateMenuSuggestions = (targetAmount: number, type: 'sobra' | 'falta' = 'sobra') => {
    if (!targetAmount || targetAmount <= 0) return [];
    const targetCents = toCents(targetAmount);
    const pdvName = currentTenant?.pdvSystemName || 'Jclan';

    interface SuggestionCandidate {
      title: string;
      item: string;
      centAdjustment: number;
      instruction: string;
      diffCents: number;
      numItems: number;
      distinctCount: number;
      isExact: boolean;
      mode: 'nova_comanda' | 'exclusao' | 'troca';
    }

    const candidates: SuggestionCandidate[] = [];
    const seen = new Set<string>();
    const menuToUse = eligibleMenuForJclan;

    if (type === 'sobra') {
      // SOBRA: Lançar quantos itens do cardápio forem necessários em uma NOVA COMANDA
      // 1. Com 10% de taxa: withTaxCents(sumCents) entre [targetCents, targetCents + 110]
      const minRawTax = Math.max(1, Math.floor((targetCents - 2) / 1.1));
      const maxRawTax = Math.ceil((targetCents + 112) / 1.1);
      const taxCombos = findUnlimitedMenuSubsets(minRawTax, maxRawTax, menuToUse, true);

      for (const combo of taxCombos) {
        const totalTaxCents = withTaxCents(combo.sumCents);
        const gapTax = totalTaxCents - targetCents;
        if (gapTax >= 0 && gapTax <= 110) {
          const sig = `${combo.sig}|tax=1`;
          if (!seen.has(sig)) {
            seen.add(sig);
            const taxDisc = calculateDiscountForWithTax(gapTax);
            const instruction =
              `Lance [${combo.formatted}] + 10% = ${formatCurrency(fromCents(totalTaxCents))}. ` +
              (taxDisc.discountToTypeCents === 0
                ? `✨ Zera 100% no centavo exato (R$ 0,00 de desconto)!`
                : taxDisc.residualCents === 0
                ? `Dê ${formatCurrency(fromCents(taxDisc.discountToTypeCents))} de desconto no ${pdvName} (com os 10% abate ${formatCurrency(fromCents(taxDisc.effectiveDropCents))}). ✨ Zera 100% no centavo exato!`
                : `Dê ${formatCurrency(fromCents(taxDisc.discountToTypeCents))} de desconto no ${pdvName} (com os 10% abate ${formatCurrency(fromCents(taxDisc.effectiveDropCents))}, resíduo: ${formatCurrency(fromCents(taxDisc.residualCents))}).`);

            candidates.push({
              title: 'Nova Comanda (COM 10% de Taxa)',
              item: combo.formatted,
              centAdjustment: fromCents(taxDisc.discountToTypeCents),
              diffCents: taxDisc.residualCents,
              numItems: combo.totalQty,
              distinctCount: combo.distinctCount,
              isExact: taxDisc.residualCents === 0,
              mode: 'nova_comanda',
              instruction,
            });
          }
        }
      }

      // 2. Sem 10% de taxa: sumCents entre [targetCents, targetCents + 100]
      const noTaxCombos = findUnlimitedMenuSubsets(targetCents, targetCents + 100, menuToUse, true);
      for (const combo of noTaxCombos) {
        const diffNoTax = combo.sumCents - targetCents;
        if (diffNoTax >= 0 && diffNoTax <= 100) {
          const sig = `${combo.sig}|tax=0`;
          if (!seen.has(sig)) {
            seen.add(sig);
            candidates.push({
              title: 'Nova Comanda (SEM 10% de Taxa)',
              item: combo.formatted,
              centAdjustment: fromCents(diffNoTax),
              diffCents: 0,
              numItems: combo.totalQty,
              distinctCount: combo.distinctCount,
              isExact: true,
              mode: 'nova_comanda',
              instruction:
                `Lance [${combo.formatted}] e desative a taxa (Total: ${formatCurrency(fromCents(combo.sumCents))}). ` +
                (diffNoTax === 0
                  ? `✨ Zera 100% no centavo exato (R$ 0,00 de desconto)!`
                  : `Dê apenas ${formatCurrency(fromCents(diffNoTax))} de desconto no ${pdvName}. ✨ Zera 100% no centavo exato!`),
            });
          }
        }
      }

      // Fallback para cardápios cujos preços são todos inteiros redondos (ex: múltiplos de R$ 5 ou R$ 10)
      if (candidates.length === 0 && menuToUse.length > 0) {
        const minMenuCents = Math.min(...menuToUse.map((i) => toCents(i.price)).filter((c) => c > 0));
        const fallbackCombos = findUnlimitedMenuSubsets(
          targetCents,
          targetCents + Math.max(500, minMenuCents),
          menuToUse,
          true
        );
        for (const combo of fallbackCombos.slice(0, 4)) {
          const diffNoTax = combo.sumCents - targetCents;
          candidates.push({
            title: 'Nova Comanda (SEM 10% de Taxa)',
            item: combo.formatted,
            centAdjustment: fromCents(diffNoTax),
            diffCents: 0,
            numItems: combo.totalQty,
            distinctCount: combo.distinctCount,
            isExact: diffNoTax === 0,
            mode: 'nova_comanda',
            instruction: `Lance [${combo.formatted}] e desative a taxa (Total: ${formatCurrency(fromCents(combo.sumCents))}). Dê ${formatCurrency(fromCents(diffNoTax))} de desconto no ${pdvName}.`,
          });
        }
      }
    } else {
      // FALTA: Excluir quantos itens do cardápio forem necessários de uma COMANDA REABERTA ou fazer troca
      // 1. Exclusão direta COM 10% de taxa
      const minExcTax = Math.max(1, Math.floor((targetCents - 112) / 1.1));
      const maxExcTax = Math.ceil((targetCents + 2) / 1.1);
      const excTaxCombos = findUnlimitedMenuSubsets(minExcTax, maxExcTax, menuToUse, true);

      for (const combo of excTaxCombos) {
        const totalTaxCents = withTaxCents(combo.sumCents);
        const gapTax = targetCents - totalTaxCents;
        if (gapTax >= 0 && gapTax <= 110) {
          const sig = `exc|${combo.sig}|tax=1`;
          if (!seen.has(sig)) {
            seen.add(sig);
            const taxDisc = calculateDiscountForWithTax(gapTax);
            const instruction =
              `Exclua da comanda reaberta: [${combo.formatted}] (abate ${formatCurrency(fromCents(totalTaxCents))}). ` +
              (taxDisc.discountToTypeCents === 0
                ? `✨ Zera 100% no centavo exato (R$ 0,00 de desconto)!`
                : taxDisc.residualCents === 0
                ? `Dê ${formatCurrency(fromCents(taxDisc.discountToTypeCents))} de desconto no ${pdvName} (com os 10% abate ${formatCurrency(fromCents(taxDisc.effectiveDropCents))}). ✨ Zera 100% no centavo exato no ${pdvName}!`
                : `Dê ${formatCurrency(fromCents(taxDisc.discountToTypeCents))} de desconto no ${pdvName} (com os 10% abate ${formatCurrency(fromCents(taxDisc.effectiveDropCents))}, resíduo: ${formatCurrency(fromCents(taxDisc.residualCents))}).`);

            candidates.push({
              title: 'Exclusão Direta (Comanda COM 10%)',
              item: combo.formatted,
              centAdjustment: fromCents(taxDisc.discountToTypeCents),
              diffCents: taxDisc.residualCents,
              numItems: combo.totalQty,
              distinctCount: combo.distinctCount,
              isExact: taxDisc.residualCents === 0,
              mode: 'exclusao',
              instruction,
            });
          }
        }
      }

      // 2. Exclusão direta SEM 10% de taxa
      const excNoTaxCombos = findUnlimitedMenuSubsets(Math.max(1, targetCents - 100), targetCents, menuToUse, true);
      for (const combo of excNoTaxCombos) {
        const gapNoTax = targetCents - combo.sumCents;
        if (gapNoTax >= 0 && gapNoTax <= 100) {
          const sig = `exc|${combo.sig}|tax=0`;
          if (!seen.has(sig)) {
            seen.add(sig);
            candidates.push({
              title: 'Exclusão Direta (Comanda SEM 10%)',
              item: combo.formatted,
              centAdjustment: fromCents(gapNoTax),
              diffCents: 0,
              numItems: combo.totalQty,
              distinctCount: combo.distinctCount,
              isExact: true,
              mode: 'exclusao',
              instruction:
                `Exclua da comanda reaberta sem taxa: [${combo.formatted}] (abate ${formatCurrency(fromCents(combo.sumCents))}). ` +
                (gapNoTax === 0
                  ? `✨ Zera 100% no centavo exato (R$ 0,00 de desconto)!`
                  : `Dê apenas ${formatCurrency(fromCents(gapNoTax))} de desconto no ${pdvName}. ✨ Zera 100% no centavo exato!`),
            });
          }
        }
      }

      // 3. Ajuste Misto Inteligente (Troca: Excluir 1 item maior e Incluir 1 item menor)
      for (const itemA of menuToUse) {
        const centsA = toCents(itemA.price);
        for (const itemB of menuToUse) {
          const centsB = toCents(itemB.price);
          if (centsA <= centsB) continue;

          // Com 10% (calculado sobre a diferença de subtotal na comanda)
          const netRedTax = withTaxCents(centsA - centsB);
          const gapTax = targetCents - netRedTax;
          if (gapTax >= 0 && gapTax <= 110) {
            const sig = `swap|${itemA.name}-${itemB.name}|tax=1`;
            if (!seen.has(sig)) {
              seen.add(sig);
              const taxDisc = calculateDiscountForWithTax(gapTax);
              const instruction =
                `Na comanda reaberta, exclua 1x ${itemA.name} e adicione 1x ${itemB.name} (Redução líquida: ${formatCurrency(fromCents(netRedTax))}). ` +
                (taxDisc.discountToTypeCents === 0
                  ? `✨ Zera 100% no centavo exato (R$ 0,00 de desconto)!`
                  : taxDisc.residualCents === 0
                  ? `Dê ${formatCurrency(fromCents(taxDisc.discountToTypeCents))} de desconto no ${pdvName} (com os 10% abate ${formatCurrency(fromCents(taxDisc.effectiveDropCents))}). ✨ Zera 100% no centavo exato no ${pdvName}!`
                  : `Dê ${formatCurrency(fromCents(taxDisc.discountToTypeCents))} de desconto no ${pdvName} (com os 10% abate ${formatCurrency(fromCents(taxDisc.effectiveDropCents))}, resíduo: ${formatCurrency(fromCents(taxDisc.residualCents))}).`);

              candidates.push({
                title: 'Ajuste Misto: Excluir + Incluir (COM 10%)',
                item: `✂️ Exclui 1x ${itemA.name} ➕ Inclui 1x ${itemB.name}`,
                centAdjustment: fromCents(taxDisc.discountToTypeCents),
                diffCents: taxDisc.residualCents,
                numItems: 2,
                distinctCount: 2,
                isExact: taxDisc.residualCents === 0,
                mode: 'troca',
                instruction,
              });
            }
          }

          // Sem 10%
          const netRedNoTax = centsA - centsB;
          const gapNoTax = targetCents - netRedNoTax;
          if (gapNoTax >= 0 && gapNoTax <= 100) {
            const sig = `swap|${itemA.name}-${itemB.name}|tax=0`;
            if (!seen.has(sig)) {
              seen.add(sig);
              candidates.push({
                title: 'Ajuste Misto: Excluir + Incluir (SEM 10%)',
                item: `✂️ Exclui 1x ${itemA.name} ➕ Inclui 1x ${itemB.name}`,
                centAdjustment: fromCents(gapNoTax),
                diffCents: 0,
                numItems: 2,
                distinctCount: 2,
                isExact: true,
                mode: 'troca',
                instruction:
                  `Na comanda reaberta, exclua 1x ${itemA.name} e adicione 1x ${itemB.name} (Redução líquida: ${formatCurrency(fromCents(netRedNoTax))}). ` +
                  (gapNoTax === 0
                    ? `✨ Zera 100% no centavo exato (R$ 0,00 de desconto)!`
                    : `Dê apenas ${formatCurrency(fromCents(gapNoTax))} de desconto no ${pdvName}. ✨ Zera 100% no centavo exato!`),
              });
            }
          }
          if (candidates.length > 60) break;
        }
        if (candidates.length > 60) break;
      }
    }

    // Ordenação rigorosa:
    // 1. Zera 100% exato primeiro (isExact === true, residual === 0)
    // 2. Menor resíduo de centavos
    // 3. Menor desconto digitado
    // 4. Menor quantidade de linhas distintas / total de itens
    candidates.sort((a, b) => {
      if (a.isExact && !b.isExact) return -1;
      if (!a.isExact && b.isExact) return 1;
      if (a.diffCents !== b.diffCents) return a.diffCents - b.diffCents;
      if (Math.abs(a.centAdjustment - b.centAdjustment) > 0.001) return a.centAdjustment - b.centAdjustment;
      if (a.distinctCount !== b.distinctCount) return a.distinctCount - b.distinctCount;
      return a.numItems - b.numItems;
    });

    // Garante variedade entre as 4 sugestões (ex: menor desconto possível + opção mais enxuta em quantidade de itens)
    const selected: SuggestionCandidate[] = [];
    const usedItems = new Set<string>();
    for (const c of candidates) {
      if (selected.length >= 3) break;
      if (!usedItems.has(c.item)) {
        usedItems.add(c.item);
        selected.push(c);
      }
    }
    // Se houver uma opção com bem menos itens (e desconto <= R$ 1,00) ainda não incluída, inclui como 4ª alternativa prática
    const compactCandidate = [...candidates]
      .filter((c) => !usedItems.has(c.item))
      .sort((a, b) => a.numItems - b.numItems || a.centAdjustment - b.centAdjustment)[0];
    if (compactCandidate && selected.length < 4) {
      usedItems.add(compactCandidate.item);
      selected.push(compactCandidate);
    }
    for (const c of candidates) {
      if (selected.length >= 4) break;
      if (!usedItems.has(c.item)) {
        usedItems.add(c.item);
        selected.push(c);
      }
    }

    return selected.map((c) => ({
      title: c.title,
      item: c.item,
      centAdjustment: c.centAdjustment,
      instruction: c.instruction,
      isExact: c.isExact,
      mode: c.mode,
    }));
  };

  // --- LOCALIZADOR DE ITENS DO CARDÁPIO ( PRÉ-INDEXADO COM USEMEMO ) ---
  const normalizeMenuQuery = (val: string) =>
    (val || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();

  const normalizedMenuEntries = useMemo(
    () =>
      (currentMenu || []).map((item) => ({
        item,
        normName: normalizeMenuQuery(item.name),
      })),
    [currentMenu]
  );

  const findMenuItem = useCallback(
    (str: string) => {
      const s = normalizeMenuQuery(str);
      if (!s) return null;
      return (
        normalizedMenuEntries.find((e) => e.normName === s)?.item ||
        normalizedMenuEntries.find((e) => e.normName.startsWith(s))?.item ||
        normalizedMenuEntries.find((e) => e.normName.includes(s))?.item ||
        null
      );
    },
    [normalizedMenuEntries]
  );

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

  // Gera todos os subconjuntos deduplicados por soma e assinatura para suportar comandas com qualquer número de itens sem travar
  const buildDeduplicatedSubsets = (itemsArray: CommandItem[]): CommandItem[][] => {
    const bySum = new Map<number, CommandItem[][]>();
    bySum.set(0, [[]]);

    for (const item of itemsArray) {
      const itemCents = toCents(item.price);
      const currentEntries = Array.from(bySum.entries());
      for (const [sum, sets] of currentEntries) {
        const nextSum = sum + itemCents;
        const existingNext = bySum.get(nextSum) || [];
        if (existingNext.length >= 3) continue;
        for (const s of sets) {
          if (existingNext.length >= 3) break;
          const candidate = [...s, item];
          const sig = formatItemCounts(candidate);
          if (!existingNext.some((ex) => formatItemCounts(ex) === sig)) {
            existingNext.push(candidate);
          }
        }
        bySum.set(nextSum, existingNext);
      }
    }

    const result: CommandItem[][] = [];
    for (const [sum, sets] of bySum.entries()) {
      if (sum > 0) {
        result.push(...sets);
      }
    }
    return result;
  };

  // --- CALCULADORA DE EXCLUSÃO EXATA (COMANDA REABERTA - FALTAS) ---
  // Hierarquia: 1ª Opção COM 10% (taxa de serviço sobre a comanda toda) sempre no topo,
  // 2ª Opção Secundária SEM 10%.
  // Aplica o cálculo rigoroso onde o desconto digitado D no Jclan é multiplicado por 1,10 para abater os centavos com perfeição.
  const findBestCommandSubsets = (targetAmount: number, itemsArray: CommandItem[]) => {
    if (!targetAmount || targetAmount <= 0) return [];
    const targetCents = toCents(targetAmount);
    const pdvName = currentTenant?.pdvSystemName || 'Jclan';

    interface Candidate {
      formattedItems: string;
      diffCents: number; // resíduo em centavos (0 se zerar perfeito)
      discountCents: number; // valor do desconto a digitar no Jclan em centavos
      effectiveDropCents: number; // abatimento real total da comanda
      isExact: boolean;
      type: 'pure' | 'mixed';
      itemToAdd?: string;
      netReductionCents: number;
      itemCount: number;
      instruction: string;
    }

    const candidatesWithTax: Candidate[] = [];
    const candidatesWithoutTax: Candidate[] = [];

    // Se a falta for pequena (<= R$ 1,10), o operador pode aplicar o desconto direto na comanda reaberta no Jclan
    if (targetCents <= 110) {
      const directTax = calculateDiscountForWithTax(targetCents);
      const instructionTax =
        `Na comanda reaberta, não precisa excluir itens: dê apenas ${formatCurrency(fromCents(directTax.discountToTypeCents))} de desconto no ${pdvName} (com os 10% abate ${formatCurrency(fromCents(directTax.effectiveDropCents))}). ` +
        (directTax.residualCents === 0
          ? `✨ Zera 100% no centavo exato no ${pdvName}!`
          : `Resíduo: ${formatCurrency(fromCents(directTax.residualCents))}.`);

      candidatesWithTax.push({
        formattedItems: 'Sem exclusão de itens (Desconto Direto na Comanda)',
        diffCents: directTax.residualCents,
        discountCents: directTax.discountToTypeCents,
        effectiveDropCents: directTax.effectiveDropCents,
        isExact: directTax.residualCents === 0,
        type: 'pure',
        netReductionCents: directTax.effectiveDropCents,
        itemCount: 0,
        instruction: instructionTax,
      });

      if (targetCents <= 100) {
        candidatesWithoutTax.push({
          formattedItems: 'Sem exclusão de itens (Desconto Direto na Comanda)',
          diffCents: 0,
          discountCents: targetCents,
          effectiveDropCents: targetCents,
          isExact: true,
          type: 'pure',
          netReductionCents: targetCents,
          itemCount: 0,
          instruction: `Na comanda reaberta sem taxa, não precisa excluir itens: dê ${formatCurrency(fromCents(targetCents))} de desconto no ${pdvName}. ✨ Zera 100% no centavo exato!`,
        });
      }
    }

    const allSubsets = buildDeduplicatedSubsets(itemsArray);

    // 1. FASE A: EXCLUSÃO PURA (remover subconjunto de itens já na comanda)
    allSubsets.forEach((subset) => {
      const sumCents = subset.reduce((acc, curr) => acc + toCents(curr.price), 0);
      const formatted = formatItemCounts(subset);

      // Comanda toda COM 10% (Taxa de serviço sobre a comanda inteira)
      const taxCents = withTaxCents(sumCents);
      const gapTax = targetCents - taxCents;
      if (gapTax >= 0 && gapTax <= 110) {
        const taxDisc = calculateDiscountForWithTax(gapTax);
        const instruction =
          `✂️ Exclua da comanda reaberta: [${formatted}] (abate ${formatCurrency(fromCents(taxCents))}). ` +
          (taxDisc.discountToTypeCents === 0
            ? `✨ Zera 100% no centavo exato no ${pdvName} (R$ 0,00 de desconto)!`
            : taxDisc.residualCents === 0
            ? `Dê ${formatCurrency(fromCents(taxDisc.discountToTypeCents))} de desconto no ${pdvName} (com os 10% abate ${formatCurrency(fromCents(taxDisc.effectiveDropCents))}). ✨ Zera 100% no centavo exato no ${pdvName}!`
            : `Dê ${formatCurrency(fromCents(taxDisc.discountToTypeCents))} de desconto no ${pdvName} (com os 10% abate ${formatCurrency(fromCents(taxDisc.effectiveDropCents))}, resíduo: ${formatCurrency(fromCents(taxDisc.residualCents))}).`);

        candidatesWithTax.push({
          formattedItems: formatted,
          diffCents: taxDisc.residualCents,
          discountCents: taxDisc.discountToTypeCents,
          effectiveDropCents: taxCents + taxDisc.effectiveDropCents,
          isExact: taxDisc.residualCents === 0,
          type: 'pure',
          netReductionCents: taxCents,
          itemCount: subset.length,
          instruction,
        });
      }

      // Comanda toda SEM 10%
      const gapNoTax = targetCents - sumCents;
      if (gapNoTax >= 0 && gapNoTax <= 100) {
        const instruction =
          `✂️ Exclua da comanda reaberta: [${formatted}] e desative a taxa de serviço. ` +
          (gapNoTax === 0
            ? `✨ Zera 100% no centavo exato no ${pdvName} (R$ 0,00 de desconto)!`
            : `Dê apenas ${formatCurrency(fromCents(gapNoTax))} de desconto no ${pdvName}. ✨ Zera 100% no centavo exato!`);

        candidatesWithoutTax.push({
          formattedItems: formatted,
          diffCents: 0,
          discountCents: gapNoTax,
          effectiveDropCents: sumCents + gapNoTax,
          isExact: true,
          type: 'pure',
          netReductionCents: sumCents,
          itemCount: subset.length,
          instruction,
        });
      }
    });

    // 2. FASE B: AJUSTE MISTO (EXCLUIR ITENS DA COMANDA + INCLUIR 1 OU MAIS ITENS DO CARDÁPIO)
    const activeMenuItems = eligibleMenuForJclan;
    allSubsets.forEach((subset) => {
      const sumExcludedCents = subset.reduce((acc, curr) => acc + toCents(curr.price), 0);
      const formatted = formatItemCounts(subset);

      // Comanda COM 10%: precisamos que withTaxCents(sumExcludedCents - sumAddedCents) esteja em [targetCents - 110, targetCents]
      const minNetRawTax = Math.max(1, Math.floor((targetCents - 112) / 1.1));
      const maxNetRawTax = Math.ceil((targetCents + 2) / 1.1);
      const minAddTax = sumExcludedCents - maxNetRawTax;
      const maxAddTax = sumExcludedCents - minNetRawTax;
      if (maxAddTax >= 1) {
        const addCombosTax = findUnlimitedMenuSubsets(Math.max(1, minAddTax), maxAddTax, activeMenuItems, true);
        for (const addCombo of addCombosTax.slice(0, 6)) {
          if (addCombo.sumCents >= sumExcludedCents) continue;
          const netTaxCents = withTaxCents(sumExcludedCents - addCombo.sumCents);
          const gapTax = targetCents - netTaxCents;
          if (gapTax >= 0 && gapTax <= 110) {
            const taxDisc = calculateDiscountForWithTax(gapTax);
            const instruction =
              `✂️ Exclua da comanda: [${formatted}] e ➕ Lance: [${addCombo.formatted}] (Redução líquida: ${formatCurrency(fromCents(netTaxCents))}). ` +
              (taxDisc.discountToTypeCents === 0
                ? `✨ Zera 100% no centavo exato no ${pdvName} (R$ 0,00 de desconto)!`
                : taxDisc.residualCents === 0
                ? `Dê ${formatCurrency(fromCents(taxDisc.discountToTypeCents))} de desconto no ${pdvName} (com os 10% abate ${formatCurrency(fromCents(taxDisc.effectiveDropCents))}). ✨ Zera 100% no centavo exato no ${pdvName}!`
                : `Dê ${formatCurrency(fromCents(taxDisc.discountToTypeCents))} de desconto no ${pdvName} (com os 10% abate ${formatCurrency(fromCents(taxDisc.effectiveDropCents))}, resíduo: ${formatCurrency(fromCents(taxDisc.residualCents))}).`);

            candidatesWithTax.push({
              formattedItems: formatted,
              diffCents: taxDisc.residualCents,
              discountCents: taxDisc.discountToTypeCents,
              effectiveDropCents: netTaxCents + taxDisc.effectiveDropCents,
              isExact: taxDisc.residualCents === 0,
              type: 'mixed',
              itemToAdd: addCombo.formatted,
              netReductionCents: netTaxCents,
              itemCount: subset.length + addCombo.totalQty,
              instruction,
            });
          }
        }
      }

      // Comanda SEM 10%: precisamos que (sumExcludedCents - sumAddedCents) esteja em [targetCents - 100, targetCents]
      const minAddNoTax = sumExcludedCents - targetCents;
      const maxAddNoTax = sumExcludedCents - (targetCents - 100);
      if (maxAddNoTax >= 1) {
        const addCombosNoTax = findUnlimitedMenuSubsets(Math.max(1, minAddNoTax), maxAddNoTax, activeMenuItems, true);
        for (const addCombo of addCombosNoTax.slice(0, 6)) {
          if (addCombo.sumCents >= sumExcludedCents) continue;
          const netNoTaxCents = sumExcludedCents - addCombo.sumCents;
          const gapNoTax = targetCents - netNoTaxCents;
          if (gapNoTax >= 0 && gapNoTax <= 100) {
            const instruction =
              `✂️ Exclua da comanda: [${formatted}] e ➕ Lance: [${addCombo.formatted}] (sem taxa). Redução líquida de ${formatCurrency(fromCents(netNoTaxCents))}. ` +
              (gapNoTax === 0
                ? `✨ Zera 100% no centavo exato no ${pdvName} (R$ 0,00 de desconto)!`
                : `Dê apenas ${formatCurrency(fromCents(gapNoTax))} de desconto no ${pdvName}. ✨ Zera 100% no centavo exato!`);

            candidatesWithoutTax.push({
              formattedItems: formatted,
              diffCents: 0,
              discountCents: gapNoTax,
              effectiveDropCents: netNoTaxCents + gapNoTax,
              isExact: true,
              type: 'mixed',
              itemToAdd: addCombo.formatted,
              netReductionCents: netNoTaxCents,
              itemCount: subset.length + addCombo.totalQty,
              instruction,
            });
          }
        }
      }
    });

    const sortCandidates = (list: Candidate[]) => {
      list.sort((a, b) => {
        if (a.isExact && !b.isExact) return -1;
        if (!a.isExact && b.isExact) return 1;
        if (a.diffCents !== b.diffCents) return a.diffCents - b.diffCents;
        if (a.discountCents !== b.discountCents) return a.discountCents - b.discountCents;
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
      options.push({
        title: '1ª Opção: Comanda Paga COM 10% (Taxa de Serviço)',
        instruction: best.instruction,
        diff: fromCents(best.discountCents),
        isExact: best.isExact,
        type: best.type,
      });
    }

    // 2ª OPÇÃO SECUNDÁRIA: Comanda fechada SEM 10% (se houver combinação viável)
    if (candidatesWithoutTax.length > 0) {
      const best = candidatesWithoutTax[0];
      options.push({
        title: '2ª Opção Secundária: Comanda Fechada SEM 10%',
        instruction: best.instruction,
        diff: fromCents(best.discountCents),
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
  // Limite de R$ 1,00 de desconto + Complemento automático ilimitado do cardápio se necessário
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

    const allSubsets = buildDeduplicatedSubsets(itemsArray);

    // 1. FASE A: SUB-CONJUNTOS DIRETOS DOS ITENS ADICIONADOS
    allSubsets.forEach((subset) => {
      const sumCents = subset.reduce((acc, curr) => acc + toCents(curr.price), 0);
      const formattedItems = formatItemCounts(subset);

      // Com 10%
      const totalTaxCents = withTaxCents(sumCents);
      const gapTax = totalTaxCents - targetCents;
      if (gapTax >= 0 && gapTax <= 110) {
        const sig = `${formattedItems}|tax=1`;
        if (!seen.has(sig)) {
          seen.add(sig);
          const taxDisc = calculateDiscountForWithTax(gapTax);
          options.push({
            title: 'Nova Comanda (COM 10% de Taxa)',
            diff: fromCents(taxDisc.discountToTypeCents),
            isExact: taxDisc.residualCents === 0,
            type: 'direct',
            instruction:
              `Lance na nova comanda: [${formattedItems}]. ` +
              (taxDisc.discountToTypeCents === 0
                ? `✨ Zera 100% no centavo exato no ${pdvName} (R$ 0,00 de desconto)!`
                : taxDisc.residualCents === 0
                ? `Dê ${formatCurrency(fromCents(taxDisc.discountToTypeCents))} de desconto no ${pdvName} (com os 10% abate ${formatCurrency(fromCents(taxDisc.effectiveDropCents))}). ✨ Zera 100% no centavo exato no ${pdvName}!`
                : `Dê ${formatCurrency(fromCents(taxDisc.discountToTypeCents))} de desconto no ${pdvName} (com os 10% abate ${formatCurrency(fromCents(taxDisc.effectiveDropCents))}, resíduo: ${formatCurrency(fromCents(taxDisc.residualCents))}).`),
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
            isExact: true,
            type: 'direct',
            instruction:
              `Lance na nova comanda: [${formattedItems}]. ` +
              (diffNoTax === 0
                ? `✨ Zera 100% no centavo exato no ${pdvName} (R$ 0,00 de desconto)!`
                : `Dê apenas ${formatCurrency(fromCents(diffNoTax))} de desconto no ${pdvName}. ✨ Zera 100% no centavo exato!`),
          });
        }
      }
    });

    // 2. FASE B: COMPLEMENTAR OS ITENS ESCOLHIDOS COM QUANTOS ITENS DO CARDÁPIO FOREM NECESSÁRIOS
    if (allSubsets.length > 0) {
      const activeMenuItems = eligibleMenuForJclan;
      allSubsets.forEach((subset) => {
        const sumChosenCents = subset.reduce((acc, curr) => acc + toCents(curr.price), 0);
        const formattedChosen = formatItemCounts(subset);

        // Complemento SEM 10%
        const remMinNoTax = targetCents - sumChosenCents;
        const remMaxNoTax = targetCents + 100 - sumChosenCents;
        if (remMaxNoTax >= 1) {
          const compNoTax = findUnlimitedMenuSubsets(Math.max(1, remMinNoTax), remMaxNoTax, activeMenuItems, true);
          for (const comp of compNoTax.slice(0, 4)) {
            const totalSumCents = sumChosenCents + comp.sumCents;
            const diffNoTax = totalSumCents - targetCents;
            if (diffNoTax >= 0 && diffNoTax <= 100) {
              const sig = `${formattedChosen}+${comp.sig}|tax=0`;
              if (!seen.has(sig)) {
                seen.add(sig);
                options.push({
                  title: 'Nova Comanda: Itens Escolhidos + Complemento (SEM 10%)',
                  diff: fromCents(diffNoTax),
                  isExact: true,
                  type: 'complement',
                  instruction:
                    `Lance: [${formattedChosen}] e ➕ Adicione [${comp.formatted}] (sem taxa). Total: ${formatCurrency(fromCents(totalSumCents))}. ` +
                    (diffNoTax === 0
                      ? `✨ Zera 100% no centavo exato no ${pdvName} (R$ 0,00 de desconto)!`
                      : `Dê apenas ${formatCurrency(fromCents(diffNoTax))} de desconto no ${pdvName}. ✨ Zera 100% no centavo exato!`),
                });
              }
            }
          }
        }
      });
    }

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

  // --- CALCULADORA DE INCLUSÃO AUTOMÁTICA (NOVA COMANDA - SEMPRE SEM 10%, SEM LIMITE DE ITENS) ---
  // Informa diretamente quais itens lançar da lista do cardápio do bar/restaurante (excluindo Happy Hour e Promocionais),
  // SEMPRE sem os 10%, utilizando quantos itens forem necessários para atingir qualquer sobra com desconto <= R$ 1,00.
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
      distinctCount: number;
      sig: string;
    }

    const options: AutoNovaOption[] = [];
    const seen = new Set<string>();

    // Busca combinações com quantidade ilimitada de itens do cardápio que atinjam [targetCents, targetCents + 100]
    let combos = findUnlimitedMenuSubsets(targetCents, targetCents + 100, menuToUse, true);

    // Caso o cardápio do bar possua apenas preços redondos (ex: todos múltiplos de R$ 10,00) onde nenhuma combinação matemática cai em <= R$ 1,00,
    // amplia a faixa para encontrar a combinação mais próxima possível dentro do cardápio
    if (combos.length === 0 && menuToUse.length > 0) {
      const minMenuCents = Math.min(...menuToUse.map((i) => toCents(i.price)).filter((c) => c > 0));
      combos = findUnlimitedMenuSubsets(
        targetCents,
        targetCents + Math.max(500, minMenuCents),
        menuToUse,
        true
      );
    }

    for (const combo of combos) {
      const diffNoTax = combo.sumCents - targetCents;
      if (diffNoTax >= 0 && !seen.has(combo.sig)) {
        seen.add(combo.sig);
        options.push({
          title: `Nova Comanda: ${combo.formatted} (SEM 10%)`,
          diff: fromCents(diffNoTax),
          diffCents: diffNoTax,
          isExact: diffNoTax === 0,
          itemsCount: combo.totalQty,
          distinctCount: combo.distinctCount,
          sig: combo.sig,
          instruction:
            `Lance na nova comanda no ${pdvName}: ${combo.formatted} e desative a taxa de serviço (Total: ${formatCurrency(fromCents(combo.sumCents))}). ` +
            (diffNoTax === 0
              ? `✨ Zera 100% no centavo exato no ${pdvName} (R$ 0,00 de desconto)!`
              : `Dê apenas ${formatCurrency(fromCents(diffNoTax))} de desconto no ${pdvName}${diffNoTax <= 100 ? ' (limite <= R$ 1,00)' : ''}.`),
        });
      }
    }

    // Ordenação: 100% exato primeiro, menor desconto, menor quantidade de linhas/itens
    options.sort((a, b) => {
      if (a.isExact && !b.isExact) return -1;
      if (!a.isExact && b.isExact) return 1;
      if (a.diffCents !== b.diffCents) return a.diffCents - b.diffCents;
      if (a.distinctCount !== b.distinctCount) return a.distinctCount - b.distinctCount;
      return a.itemsCount - b.itemsCount;
    });

    // Seleciona até 4 opções combinando os menores descontos possíveis + a opção mais enxuta em quantidade de itens
    const finalOptions: AutoNovaOption[] = [];
    const usedSigs = new Set<string>();
    for (const opt of options) {
      if (finalOptions.length >= 3) break;
      if (!usedSigs.has(opt.sig)) {
        usedSigs.add(opt.sig);
        finalOptions.push(opt);
      }
    }

    const compactOpt = [...options]
      .filter((o) => !usedSigs.has(o.sig) && o.diffCents <= 100)
      .sort((a, b) => a.itemsCount - b.itemsCount || a.diffCents - b.diffCents)[0];
    if (compactOpt && finalOptions.length < 4) {
      usedSigs.add(compactOpt.sig);
      finalOptions.push(compactOpt);
    }

    for (const opt of options) {
      if (finalOptions.length >= 4) break;
      if (!usedSigs.has(opt.sig)) {
        usedSigs.add(opt.sig);
        finalOptions.push(opt);
      }
    }

    return finalOptions;
  };

  // --- RELATÓRIO E FECHAMENTO ---
  const generateReportText = () => {
    const now = new Date();
    const dateStr = now.toLocaleDateString('pt-BR');
    const timeStr = now.toLocaleTimeString('pt-BR').slice(0, 5);
    const pdvName = currentTenant?.pdvSystemName || 'PDV';
    const cardName = currentTenant?.cardSystemName || 'Maquininhas';

    let report = `📊 FECHAMENTO DE CAIXA - ${currentTenant.name}\n`;
    report += `📅 Data: ${dateStr} às ${timeStr}\n`;
    report += `👤 Operador: ${currentOperator?.name?.toUpperCase() || 'Desconhecido'}\n\n`;

    report += `💳 CARTÕES (${cardName} x ${pdvName})\n`;
    report += `• Crédito: ${formatCurrency(getnetCredit)} (${pdvName}: ${formatCurrency(jclanCredit)} | Dif: ${formatCurrency(roundCurrency(getnetCredit - jclanCredit))})\n`;
    if (creditBreakdown.length > 0) {
      creditBreakdown.forEach((cb) => {
        report += `   ↳ ${cb.name}: ${formatCurrency(cb.amount)}\n`;
      });
    }
    report += `• Débito: ${formatCurrency(getnetDebit)} (${pdvName}: ${formatCurrency(jclanDebit)} | Dif: ${formatCurrency(roundCurrency(getnetDebit - jclanDebit))})\n`;
    if (debitBreakdown.length > 0) {
      debitBreakdown.forEach((db) => {
        report += `   ↳ ${db.name}: ${formatCurrency(db.amount)}\n`;
      });
    }
    report += `• Pix: ${formatCurrency(getnetPix)} (${pdvName}: ${formatCurrency(jclanPix)} | Dif: ${formatCurrency(roundCurrency(getnetPix - jclanPix))})\n`;
    report += `• Voucher: ${formatCurrency(getnetVoucher)} (${pdvName}: ${formatCurrency(jclanVoucher)} | Dif: ${formatCurrency(roundCurrency(getnetVoucher - jclanVoucher))})\n`;
    if (voucherBreakdown.length > 0) {
      voucherBreakdown.forEach((vb) => {
        report += `   ↳ ${vb.name}: ${formatCurrency(vb.amount)}\n`;
      });
    }
    report += `Total ${cardName}: ${formatCurrency(getnetTotal)}\n`;
    report += `Total ${pdvName}: ${formatCurrency(jclanTotal)}\n`;
    report += `Diferença Geral Cartões: ${formatCurrency(differenceTotal)} ${
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

  // --- GERADOR DE PDF PROFISSIONAL DO RELATÓRIO DE FECHAMENTO DE CAIXA ---
  const buildCurrentClosingPdfData = (
    comments?: string,
    referenceDateStr?: string,
    durationFormattedStr?: string
  ): ClosingPdfData => {
    const startMs = shiftStartTime || Date.now() - 10 * 60 * 1000;
    const durationSec = Math.max(20, Math.round((Date.now() - startMs) / 1000));
    const mins = Math.floor(durationSec / 60);
    const secs = durationSec % 60;
    const durFormatted = durationFormattedStr || (mins > 0 ? `${mins} min ${secs}s` : `${secs}s`);

    return {
      tenant: currentTenant,
      operatorName: currentOperator?.name || 'Operador',
      referenceDate:
        referenceDateStr ||
        `${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR').slice(0, 5)}`,
      shiftDurationFormatted: durFormatted,
      shiftStartedAt: new Date(startMs).toLocaleTimeString('pt-BR').slice(0, 5),
      getnetCredit,
      getnetDebit,
      getnetPix,
      getnetVoucher,
      getnetTotal,
      jclanCredit,
      jclanDebit,
      jclanPix,
      jclanVoucher,
      jclanTotal,
      differenceTotal,
      creditBreakdown,
      debitBreakdown,
      voucherBreakdown,
      cashTotal,
      expectedCash,
      cashDifference,
      cashOpening: parseValue(cashSummary.opening),
      cashPdvSales: parseValue(cashSummary.jclanCash),
      cashExpenses: parseValue(cashSummary.expenses),
      cashCounts: { ...cash },
      machines: machines.map((m) => ({
        id: m.id,
        credits: [...m.credits],
        debits: [...m.debits],
        vouchers: [...m.vouchers],
        pix: m.pix,
      })),
      instructions,
      selectedExclusionOptions,
      comments,
      auditLogs,
    };
  };

  const handleDownloadClosingPdf = (
    customComments?: string,
    customDateSelection?: { displayDate: string },
    useLastSavedSnapshot = false
  ) => {
    try {
      const payload =
        useLastSavedSnapshot && lastSavedPdfDataRef.current
          ? lastSavedPdfDataRef.current
          : buildCurrentClosingPdfData(customComments, customDateSelection?.displayDate);
      const filename = generateClosingReportPdf(payload);
      addAuditLog('sistema', 'Download de PDF do Fechamento', `Arquivo gerado: ${filename}`);
      showToast(`📄 Relatório PDF gerado com sucesso (${filename})!`);
    } catch (err) {
      console.error('Erro ao gerar PDF:', err);
      showToast('Não foi possível gerar o PDF do relatório.');
    }
  };

  const handleConfirmSaveClosing = async (
    comments: string,
    attachments: string[],
    dateSelection?: { displayDate: string; dateKey: string; time: string; dateOnlyBr: string }
  ) => {
    const startMs = shiftStartTime || (Date.now() - 10 * 60 * 1000);
    const nowMs = Date.now();
    const durationSec = Math.max(20, Math.round((nowMs - startMs) / 1000));
    const mins = Math.floor(durationSec / 60);
    const secs = durationSec % 60;
    const durFormatted = mins > 0 ? `${mins} min ${secs}s` : `${secs}s`;
    const shiftStartedAtStr = new Date(startMs).toLocaleTimeString('pt-BR').slice(0, 5);

    // Data de referência escolhida pelo operador (Ontem, Hoje ou Personalizada)
    const today = new Date();
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const dateKeyToUse = dateSelection?.dateKey || todayKey;
    const dateDisplayToUse = dateSelection?.displayDate || `${today.toLocaleDateString('pt-BR')} ${today.toLocaleTimeString('pt-BR').slice(0, 5)}`;

    // Salva snapshot estruturado para geração do PDF na tela de "Fechamento Validado!"
    lastSavedPdfDataRef.current = buildCurrentClosingPdfData(
      comments,
      dateDisplayToUse,
      durFormatted
    );

    let reportText = generateReportText();
    reportText += `\n⏱️ TEMPO DE FECHAMENTO: ${durFormatted} (Início às ${shiftStartedAtStr})\n`;
    reportText += `📅 DATA DE REFERÊNCIA: ${dateDisplayToUse}\n`;
    if (comments) {
      reportText += `\n📝 OBSERVAÇÕES DO OPERADOR:\n${comments}\n`;
    }
    if (attachments && attachments.length > 0) {
      reportText += `\n📸 COMPROVANTES ANEXADOS: ${attachments.length} foto(s)/print(s) arquivados na nuvem.\n`;
    }

    const closingAuditEntry: AuditLogEntry = {
      id: `${Date.now()}_closing`,
      timestamp: dateSelection?.time || new Date().toLocaleTimeString('pt-BR'),
      operator: currentOperator?.name || 'Operador',
      category: 'sistema',
      action: 'Fechamento de Caixa Salvo',
      details: `Fechamento (${dateDisplayToUse}) salvo por ${currentOperator?.name || 'Operador'} em ${durFormatted} (Diferença Cartões: ${formatCurrency(
        differenceTotal
      )}, Gaveta: ${formatCurrency(cashDifference)})`,
    };

    const completeAuditTrail = [closingAuditEntry, ...auditLogs].slice(0, 150);
    setAuditLogs(completeAuditTrail);

    const newRecord: HistoryRecord = {
      id: Date.now(),
      tenantId: currentTenant.id,
      date: dateDisplayToUse,
      closingDateKey: dateKeyToUse,
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
      auditTrail: completeAuditTrail,
      durationSeconds: durationSec,
      durationFormatted: durFormatted,
      shiftStartedAt: shiftStartedAtStr,
      createdAt: new Date().toISOString(),
    };

    const tenantId = currentTenant.id;
    setCloudSyncStatus('syncing');

    // 1. Grava imediatamente na blindagem local (IndexedDB sem limite de 5MB + espelho quota-safe no localStorage)
    const nextLocalHistory = mergeClosingRecordLists(
      tenantId,
      [[newRecord], history],
      getDeletedClosingIdsSync(tenantId)
    );
    setHistory(nextLocalHistory);
    await saveClosingsForTenant(tenantId, nextLocalHistory);

    // 2. Sincroniza com o servidor e garante consistência total
    try {
      const saved = await saasApi.saveClosing(tenantId, newRecord);
      const mergedAfterCloud = mergeClosingRecordLists(
        tenantId,
        [[{ ...newRecord, ...saved, attachments: newRecord.attachments || saved.attachments }], nextLocalHistory],
        getDeletedClosingIdsSync(tenantId)
      );
      setHistory(mergedAfterCloud);
      await saveClosingsForTenant(tenantId, mergedAfterCloud);
      setCloudSyncStatus('synced');
      showToast(`Fechamento salvo e blindado com sucesso (${dateDisplayToUse.slice(0, 10)})!`);
    } catch {
      setCloudSyncStatus('offline');
      showToast('Fechamento salvo e blindado no dispositivo (sincronizará automaticamente com a nuvem).');
    }
    setHasSavedClosingInSession(true);
    setIsReminderAlertOpen(false);
    setReportModal(reportText);

    // 3. Redundância Extra: se o backup automático ao salvar fechamento estiver ativo, baixa o arquivo JSON completo automaticamente
    const currentBackupCfg = getAutoBackupSettings();
    if (
      currentBackupCfg.enabled &&
      (currentBackupCfg.autoDownloadOnClosing || currentBackupCfg.frequency === 'every_closing')
    ) {
      setTimeout(() => {
        handleTriggerFullJsonBackup('auto_closing_saved', true);
      }, 350);
    }
  };

  const confirmAndClear = () => {
    setReportModal(null);
    setHasSavedClosingInSession(false);
    setReminderSnoozedUntil(null);
    setJclan({ credit: '', debit: '', pix: '', voucher: '' });
    setMachines(getInitialMachinesForTenant(currentTenant));
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
    setVoiceUndoStack([]);
    clearDraftFromPersistence(currentTenant.id).catch(() => {});
    saasApi
      .clearDraft(
        currentTenant.id,
        myDeviceId,
        `${currentOperator?.name || 'Operador'} (${myDeviceType === 'mobile' ? 'Celular' : 'Computador'})`
      )
      .catch(() => {});
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

  // Verifica se há qualquer dado preenchido na tabela do turno atual
  const hasAnyTableData = useMemo(() => {
    const hasJclan = Boolean(jclan.credit || jclan.debit || jclan.pix || jclan.voucher);
    const hasCash = Object.values(cash).some((v) => Boolean(v && v !== '0'));
    const hasCashSum = Boolean(cashSummary.opening || cashSummary.jclanCash || cashSummary.expenses);
    const hasMachines = machines.some(
      (m) =>
        (Array.isArray(m.credits) && m.credits.some((v: string) => Boolean(v))) ||
        (Array.isArray(m.debits) && m.debits.some((v: string) => Boolean(v))) ||
        (Array.isArray(m.pix) && m.pix.some((v: string) => Boolean(v))) ||
        (Array.isArray(m.vouchers) && m.vouchers.some((v: string) => Boolean(v)))
    );
    const hasCustomCmds = Object.values(customCommands).some((list) => list && list.length > 0);
    const hasIncCmds = Object.values(inclusionCommands).some((list) => list && list.length > 0);
    return hasJclan || hasCash || hasCashSum || hasMachines || hasCustomCmds || hasIncCmds;
  }, [jclan, cash, cashSummary, machines, customCommands, inclusionCommands]);

  const handlePromptClearAllTable = () => {
    if (!hasAnyTableData) {
      showToast('A tabela já está vazia.');
      return;
    }
    setIsClearTableConfirmOpen(true);
  };

  const handleExecuteClearAllTable = () => {
    setJclan({ credit: '', debit: '', pix: '', voucher: '' });
    setMachines(getInitialMachinesForTenant(currentTenant));
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
    setVoiceUndoStack([]);
    clearDraftFromPersistence(currentTenant.id).catch(() => {});
    saasApi
      .clearDraft(
        currentTenant.id,
        myDeviceId,
        `${currentOperator?.name || 'Operador'} (${myDeviceType === 'mobile' ? 'Celular' : 'Computador'})`
      )
      .catch(() => {});
    addAuditLog(
      'sistema',
      'Limpeza de Tabela',
      `Operador ${currentOperator?.name || 'anônimo'} limpou todas as informações da tabela do turno`
    );
    setIsClearTableConfirmOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast('🧹 Todas as informações da tabela foram limpas com sucesso!');
  };

  const deleteRecord = async (id: number) => {
    const tenantId = currentTenant.id;
    await addDeletedClosingId(tenantId, id);
    const next = history.filter((item) => Number(item.id) !== Number(id));
    setHistory(next);
    await saveClosingsForTenant(tenantId, next);
    try {
      await saasApi.deleteClosing(tenantId, id);
    } catch (e) {
      console.warn('Erro ao deletar da nuvem:', e);
    }
    showToast('Registro excluído permanentemente.');
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

  // --- OCR TURBO (1 A 2S) VIA SERVIDOR / GEMINI API COM MAPEAMENTO DE BANDEIRAS ---
  const formatOcrMachineArrays = (result: any) => {
    const cFlagsLen = currentTenant?.creditFlags?.length || 5;
    const dFlagsLen = currentTenant?.debitFlags?.length || 5;
    const vFlagsLen = currentTenant?.voucherNames?.length || 5;

    const fill = (arr: any = [], minLen: number) => {
      const size = Array.isArray(arr) ? Math.max(5, minLen, arr.length) : Math.max(5, minLen);
      const n = Array(size).fill('');
      if (Array.isArray(arr)) {
        arr.forEach((v, i) => {
          const clean = v ? String(v).trim() : '';
          n[i] = clean === '0,00' || clean === '0' ? '' : clean;
        });
      }
      return n;
    };

    const rawPix = result?.pix ? String(result.pix).trim() : '';
    return {
      credits: fill(result?.credits, cFlagsLen),
      debits: fill(result?.debits, dFlagsLen),
      vouchers: fill(result?.vouchers, vFlagsLen),
      pix: rawPix === '0,00' || rawPix === '0' ? '' : rawPix,
      collapsed: false,
    };
  };

  const handleImageUpload = async (machineId: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoadingMachineId(machineId);
    const t0 = performance.now();
    try {
      const preprocessed = await preprocessReceiptImage(file);
      const res = await fetch('/api/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: preprocessed.base64,
          mimeType: preprocessed.mimeType,
          customApiKey: apiKey || undefined,
          creditFlags: currentTenant?.creditFlags,
          debitFlags: currentTenant?.debitFlags,
          voucherNames: currentTenant?.voucherNames,
        }),
      });

      const result = await res.json();
      if (!res.ok || result.error) {
        throw new Error(result.error || 'Erro ao processar comprovante.');
      }

      const formattedData = formatOcrMachineArrays(result);
      setMachines((prev) =>
        prev.map((m) => (m.id === machineId ? { ...m, ...formattedData } : m))
      );

      const elapsedSec = ((performance.now() - t0) / 1000).toFixed(1);
      addAuditLog(
        'cartoes',
        `Leitura OCR Turbo Maquininha #${machineId}`,
        `Comprovante lido e bandeiras mapeadas em ${elapsedSec}s (pré-processamento: ${preprocessed.processingTimeMs}ms)`
      );
      showToast(`⚡ Comprovante lido e mapeado em ${elapsedSec}s!`);
    } catch (error: any) {
      showToast(`Erro na IA: ${error.message}`);
    } finally {
      setLoadingMachineId(null);
      event.target.value = '';
    }
  };

  const handleGlobalImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []).slice(0, 6);
    if (!files.length) return;

    setIsGlobalLoading(true);
    const t0 = performance.now();
    try {
      // Garante que existam maquininhas suficientes para receber cada foto conforme forem terminando em paralelo
      setMachines((prev) => {
        if (prev.length >= files.length) return prev;
        const next = [...prev];
        while (next.length < files.length) {
          next.push(createEmptyMachine(next.length + 1, currentTenant));
        }
        return next.map((m, idx) => ({ ...m, id: idx + 1 }));
      });

      let completedCount = 0;

      // Processa todas as fotos em paralelo (pré-processamento + requisição individual Turbo)
      // atualizando cada maquininha progressivamente assim que sua resposta chega!
      await Promise.all(
        files.map(async (file, index) => {
          const preprocessed = await preprocessReceiptImage(file);
          const res = await fetch('/api/ocr', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              imageBase64: preprocessed.base64,
              mimeType: preprocessed.mimeType,
              customApiKey: apiKey || undefined,
              creditFlags: currentTenant?.creditFlags,
              debitFlags: currentTenant?.debitFlags,
              voucherNames: currentTenant?.voucherNames,
            }),
          });

          const result = await res.json();
          if (!res.ok || result.error) {
            throw new Error(result.error || `Falha ao ler comprovante #${index + 1}`);
          }

          const formattedData = formatOcrMachineArrays(result);
          completedCount++;

          setMachines((prev) => {
            const next = [...prev];
            if (index < next.length) {
              next[index] = { ...next[index], ...formattedData };
            } else {
              next.push({ id: index + 1, ...formattedData });
            }
            return next.map((m, idx) => ({ ...m, id: idx + 1 }));
          });
        })
      );

      const elapsedSec = ((performance.now() - t0) / 1000).toFixed(1);
      addAuditLog(
        'cartoes',
        `Leitura OCR Turbo em Lote (${completedCount} fotos)`,
        `${completedCount} comprovante(s) processados em paralelo em ${elapsedSec}s`
      );
      showToast(`⚡ ${completedCount} comprovante(s) lidos em paralelo em ${elapsedSec}s!`);
    } catch (error: any) {
      showToast(`Erro no upload múltiplo: ${error.message}`);
    } finally {
      setIsGlobalLoading(false);
      event.target.value = '';
    }
  };

  // --- MOTOR DE RECONCILIAÇÃO (PRECISÃO EM CENTAVOS) ---
  const generateRecommendations = () => {
    const diffs = [
      { id: 'dinheiro', label: 'Dinheiro', diff: roundCurrency(cashDifference), order: 1 },
      { id: 'pix', label: 'Pix', diff: roundCurrency(getnetPix - jclanPix), order: 2 },
      { id: 'credito', label: 'Crédito', diff: roundCurrency(getnetCredit - jclanCredit), order: 3 },
      { id: 'debito', label: 'Débito', diff: roundCurrency(getnetDebit - jclanDebit), order: 4 },
      { id: 'voucher', label: 'Voucher', diff: roundCurrency(getnetVoucher - jclanVoucher), order: 5 },
    ];

    const needs = diffs
      .filter((d) => d.diff >= 0.01)
      .map((d) => ({ ...d, amount: roundCurrency(d.diff) }))
      .sort((a, b) => a.order - b.order);
    const excesses = diffs
      .filter((d) => d.diff <= -0.01)
      .map((d) => ({ ...d, amount: roundCurrency(Math.abs(d.diff)) }))
      .sort((a, b) => a.order - b.order);
    const instructions: Array<{ from: string; to: string; amount: number }> = [];
    let nIdx = 0;
    let eIdx = 0;

    while (nIdx < needs.length && eIdx < excesses.length) {
      const need = needs[nIdx];
      const excess = excesses[eIdx];
      const transferAmount = roundCurrency(Math.min(need.amount, excess.amount));
      if (transferAmount >= 0.01) {
        instructions.push({ from: excess.label, to: need.label, amount: transferAmount });
      }
      need.amount = roundCurrency(need.amount - transferAmount);
      excess.amount = roundCurrency(excess.amount - transferAmount);
      if (need.amount < 0.01) nIdx++;
      if (excess.amount < 0.01) eIdx++;
    }

    const unresolvable: Array<{ type: 'sobra' | 'falta'; label: string; amount: number }> = [];
    while (nIdx < needs.length) {
      if (needs[nIdx].amount >= 0.01) {
        unresolvable.push({ type: 'sobra', label: needs[nIdx].label, amount: roundCurrency(needs[nIdx].amount) });
      }
      nIdx++;
    }
    while (eIdx < excesses.length) {
      if (excesses[eIdx].amount >= 0.01) {
        unresolvable.push({ type: 'falta', label: excesses[eIdx].label, amount: roundCurrency(excesses[eIdx].amount) });
      }
      eIdx++;
    }
    return { instructions, unresolvable };
  };

  // --- SISTEMA DE MEMOIZATION AVANÇADO PARA RECONCILIAÇÃO (CACHE MULTI-CAMADA + DEBOUNCE INTELIGENTE) ---
  // 1. Assinatura memoizada do cardápio elegível e PDV ativo
  const reconciliationMenuKey = useMemo(() => {
    const pdv = currentTenant?.pdvSystemName || 'Jclan';
    const itemsKey = eligibleMenuForJclan
      .map((i) => `${i.name}:${toCents(i.price)}`)
      .join('|');
    return `${currentTenant?.id || 'default'}::${pdv}::${itemsKey}`;
  }, [currentTenant?.id, currentTenant?.pdvSystemName, eligibleMenuForJclan]);

  // 2. Caches persistentes por assinatura de divergência (evita recalcular modalidades cujo valor não mudou)
  const menuSuggestionCacheRef = useRef<
    Map<
      string,
      {
        menuOpts: ReturnType<typeof calculateMenuSuggestions>;
        autoNovaOptions: ReturnType<typeof findAutoNovaComandaSubsets>;
      }
    >
  >(new Map());

  const commandSubsetsCacheRef = useRef<
    Map<string, ReturnType<typeof findBestCommandSubsets>>
  >(new Map());

  // Limpa os caches caso o cardápio do bar ou nome do PDV seja alterado
  useEffect(() => {
    menuSuggestionCacheRef.current.clear();
    commandSubsetsCacheRef.current.clear();
  }, [reconciliationMenuKey]);

  const { instructions, unresolvable } = useMemo(
    () => generateRecommendations(),
    [
      cashDifference,
      getnetPix,
      jclanPix,
      getnetCredit,
      jclanCredit,
      getnetDebit,
      jclanDebit,
      getnetVoucher,
      jclanVoucher,
    ]
  );
  const hasDivergences = instructions.length > 0 || unresolvable.length > 0;

  // 3. Estabilização assíncrona (150ms) durante digitação contínua em maquininhas individuais:
  // Se o valor já estiver no cache em memória ou não houver divergências, resolve em 0ms (instantâneo).
  // Caso o operador esteja digitando rapidamente vários dígitos, aguarda 150ms antes de disparar novas buscas combinatórias pesadas.
  const [stabilizedUnresolvable, setStabilizedUnresolvable] = useState(unresolvable);

  useEffect(() => {
    if (unresolvable.length === 0) {
      setStabilizedUnresolvable([]);
      return;
    }
    const allCached = unresolvable.every((u) =>
      menuSuggestionCacheRef.current.has(`${reconciliationMenuKey}::${u.type}::${toCents(u.amount)}`)
    );
    if (allCached) {
      setStabilizedUnresolvable(unresolvable);
      return;
    }
    const timer = setTimeout(() => {
      setStabilizedUnresolvable(unresolvable);
    }, 150);
    return () => clearTimeout(timer);
  }, [unresolvable, reconciliationMenuKey]);

  // 4. Memoização avançada das sugestões do cardápio reaproveitando resultados individuais por modalidade/valor
  const unresolvableWithMenuSuggestions = useMemo(() => {
    return stabilizedUnresolvable.map((unres) => {
      const amountCents = toCents(unres.amount);
      const cacheKey = `${reconciliationMenuKey}::${unres.type}::${amountCents}`;
      const cached = menuSuggestionCacheRef.current.get(cacheKey);
      if (cached) {
        return {
          unres,
          menuOpts: cached.menuOpts,
          autoNovaOptions: cached.autoNovaOptions,
        };
      }

      const menuOpts = calculateMenuSuggestions(unres.amount, unres.type);
      const autoNovaOptions =
        unres.type === 'sobra' ? findAutoNovaComandaSubsets(unres.amount) : [];

      // Mantém limite saudável de entradas no cache LRU simples
      if (menuSuggestionCacheRef.current.size > 200) {
        const firstKey = menuSuggestionCacheRef.current.keys().next().value;
        if (firstKey) menuSuggestionCacheRef.current.delete(firstKey);
      }
      menuSuggestionCacheRef.current.set(cacheKey, { menuOpts, autoNovaOptions });

      return {
        unres,
        menuOpts,
        autoNovaOptions,
      };
    });
  }, [stabilizedUnresolvable, reconciliationMenuKey]);

  // 5. Memoização avançada da Calculadora de Exclusão Exata (Comanda Reaberta) por modalidade
  const commandSubsetsByLabel = useMemo(() => {
    const result: Record<string, ReturnType<typeof findBestCommandSubsets>> = {};
    for (const unres of stabilizedUnresolvable) {
      if (unres.type !== 'falta') continue;
      const items = customCommands[unres.label];
      if (!items || items.length === 0) continue;

      const itemsSig = items.map((i) => `${i.name}:${toCents(i.price)}`).join(',');
      const cacheKey = `${reconciliationMenuKey}::${unres.label}::${toCents(unres.amount)}::${itemsSig}`;
      const cached = commandSubsetsCacheRef.current.get(cacheKey);
      if (cached) {
        result[unres.label] = cached;
      } else {
        const computed = findBestCommandSubsets(unres.amount, items);
        if (commandSubsetsCacheRef.current.size > 100) {
          const firstKey = commandSubsetsCacheRef.current.keys().next().value;
          if (firstKey) commandSubsetsCacheRef.current.delete(firstKey);
        }
        commandSubsetsCacheRef.current.set(cacheKey, computed);
        result[unres.label] = computed;
      }
    }
    return result;
  }, [stabilizedUnresolvable, customCommands, reconciliationMenuKey]);

  // 6. Fila Hierárquica Passo a Passo (Estritamente 1 passo por vez)
  // Regra de Ouro: O 1º passo é SEMPRE o acerto do Dinheiro da Gaveta, seguido estritamente pela ordem de zeramento: Pix -> Crédito -> Débito -> Voucher
  const STRICT_MODALITY_ORDER: Record<string, number> = {
    Dinheiro: 1,
    Pix: 2,
    Crédito: 3,
    Débito: 4,
    Voucher: 5,
  };

  const getModalityRank = (label: string): number => STRICT_MODALITY_ORDER[label] ?? 99;

  const reconciliationSteps = useMemo(() => {
    type StepItem =
      | {
          id: string;
          priorityTier: 1 | 2 | 3;
          priorityLabel: string;
          shortLabel: string;
          modalityName: string;
          modalityRank: number;
          kind: 'transfer';
          isCash: boolean;
          inst: { from: string; to: string; amount: number };
        }
      | {
          id: string;
          priorityTier: 1 | 2 | 3;
          priorityLabel: string;
          shortLabel: string;
          modalityName: string;
          modalityRank: number;
          kind: 'menu';
          isCash: boolean;
          unres: { type: 'sobra' | 'falta'; label: string; amount: number };
          menuOpts: ReturnType<typeof calculateMenuSuggestions>;
          autoNovaOptions: ReturnType<typeof findAutoNovaComandaSubsets>;
        };

    const steps: StepItem[] = [];

    // 1º PASSO OBRIGATÓRIO (Parte A): Acerto do Dinheiro da Gaveta via Troca de Forma de Pagamento (ordenado pela modalidade parceira: Pix -> Crédito -> Débito -> Voucher)
    const cashTransfers = [...instructions]
      .filter((inst) => inst.from === 'Dinheiro' || inst.to === 'Dinheiro')
      .sort((a, b) => {
        const partnerA = a.from === 'Dinheiro' ? a.to : a.from;
        const partnerB = b.from === 'Dinheiro' ? b.to : b.from;
        return getModalityRank(partnerA) - getModalityRank(partnerB);
      });

    cashTransfers.forEach((inst, idx) => {
      steps.push({
        id: `cash-transfer-${inst.from}-${inst.to}-${idx}`,
        priorityTier: 1,
        priorityLabel: '1º Passo Obrigatório • Acerto do Dinheiro da Gaveta (Troca de Pagamento)',
        shortLabel: `💵 Gaveta (${inst.from} → ${inst.to})`,
        modalityName: 'Dinheiro',
        modalityRank: 1,
        kind: 'transfer',
        isCash: true,
        inst,
      });
    });

    // 1º PASSO OBRIGATÓRIO (Parte B): Acerto do Dinheiro da Gaveta via Cardápio (Sobra ou Falta em Dinheiro resolvida antes de qualquer outra modalidade)
    const cashMenuAdjustments = unresolvableWithMenuSuggestions.filter(
      (item) => item.unres.label === 'Dinheiro'
    );
    cashMenuAdjustments.forEach((item) => {
      steps.push({
        id: `cash-menu-${item.unres.type}-${item.unres.label}`,
        priorityTier: 1,
        priorityLabel: '1º Passo Obrigatório • Acerto do Dinheiro da Gaveta via Cardápio',
        shortLabel: `💵 Gaveta (${item.unres.type === 'sobra' ? 'Sobra' : 'Falta'})`,
        modalityName: 'Dinheiro',
        modalityRank: 1,
        kind: 'menu',
        isCash: true,
        unres: item.unres,
        menuOpts: item.menuOpts,
        autoNovaOptions: item.autoNovaOptions,
      });
    });

    // DEMAIS PASSOS DE CONCILIAÇÃO — Trocas entre modalidades seguindo a ordem estrita (Pix -> Crédito -> Débito -> Voucher)
    const nonCashTransfers = [...instructions]
      .filter((inst) => inst.from !== 'Dinheiro' && inst.to !== 'Dinheiro')
      .sort((a, b) => {
        const minA = Math.min(getModalityRank(a.from), getModalityRank(a.to));
        const minB = Math.min(getModalityRank(b.from), getModalityRank(b.to));
        if (minA !== minB) return minA - minB;
        const toDiff = getModalityRank(a.to) - getModalityRank(b.to);
        if (toDiff !== 0) return toDiff;
        return getModalityRank(a.from) - getModalityRank(b.from);
      });

    nonCashTransfers.forEach((inst, idx) => {
      const primaryModality =
        getModalityRank(inst.from) <= getModalityRank(inst.to) ? inst.from : inst.to;
      steps.push({
        id: `card-transfer-${inst.from}-${inst.to}-${idx}`,
        priorityTier: 2,
        priorityLabel: `Conciliação por Troca • ${inst.from} → ${inst.to}`,
        shortLabel: `🔄 Troca: ${inst.from} → ${inst.to}`,
        modalityName: primaryModality,
        modalityRank: getModalityRank(primaryModality),
        kind: 'transfer',
        isCash: false,
        inst,
      });
    });

    // DEMAIS PASSOS DE ZERAMENTO — Ordem estrita de zeramento sugerida: Pix (2) -> Crédito (3) -> Débito (4) -> Voucher (5)
    const nonCashMenuAdjustments = [...unresolvableWithMenuSuggestions]
      .filter((item) => item.unres.label !== 'Dinheiro')
      .sort((a, b) => getModalityRank(a.unres.label) - getModalityRank(b.unres.label));

    nonCashMenuAdjustments.forEach((item) => {
      const rank = getModalityRank(item.unres.label);
      steps.push({
        id: `card-menu-${item.unres.type}-${item.unres.label}`,
        priorityTier: 3,
        priorityLabel: `Zeramento de ${item.unres.label} (${rank - 1}ª Modalidade pós-Gaveta)`,
        shortLabel: `🍽️ ${item.unres.label} (${item.unres.type === 'sobra' ? 'Sobra' : 'Falta'})`,
        modalityName: item.unres.label,
        modalityRank: rank,
        kind: 'menu',
        isCash: false,
        unres: item.unres,
        menuOpts: item.menuOpts,
        autoNovaOptions: item.autoNovaOptions,
      });
    });

    return steps;
  }, [instructions, unresolvableWithMenuSuggestions]);

  const [activeReconciliationStepIdx, setActiveReconciliationStepIdx] = useState(0);
  const [completedReconciliationSteps, setCompletedReconciliationSteps] = useState<Record<string, boolean>>({});

  // Garante que o índice ativo nunca ultrapasse o tamanho atual da fila
  const safeReconciliationStepIdx =
    reconciliationSteps.length > 0
      ? Math.min(activeReconciliationStepIdx, reconciliationSteps.length - 1)
      : 0;

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
            setUsers(getStoredUsersForTenant(t.id));
            localStorage.setItem('fechacaixa_tenant_id', t.id);
            window.history.pushState(
              {},
              '',
              `${window.location.pathname}?bar=${t.slug}&nome=${encodeURIComponent(t.name)}`
            );
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
            setUsers(getStoredUsersForTenant(t.id));
            localStorage.setItem('fechacaixa_tenant_id', t.id);
            window.history.pushState(
              {},
              '',
              `${window.location.pathname}?bar=${t.slug}&nome=${encodeURIComponent(t.name)}`
            );
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
          onOpenBarLogin={(t) => {
            setCurrentTenant(t);
            setUsers(getStoredUsersForTenant(t.id));
            localStorage.setItem('fechacaixa_tenant_id', t.id);
            window.history.pushState(
              {},
              '',
              `${window.location.pathname}?bar=${t.slug}&nome=${encodeURIComponent(t.name)}`
            );
            setIsMasterSession(true);
            setIsAuthenticated(false);
            setAppMode('bar');
            showToast(`Tela de login aberta para: ${t.name}`);
          }}
          onOpenBarAdmin={(t) => {
            setCurrentTenant(t);
            setUsers(getStoredUsersForTenant(t.id));
            localStorage.setItem('fechacaixa_tenant_id', t.id);
            window.history.pushState(
              {},
              '',
              `${window.location.pathname}?bar=${t.slug}&nome=${encodeURIComponent(t.name)}`
            );
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
          onDeleteTenant={handleDeleteTenant}
          onSyncAllTenants={handleSyncAllTenants}
          onRestoreBackup={handleRestoreTenantsBackup}
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
        <Suspense fallback={null}>
          {isBillingOpen && currentTenant && (
            <BarBillingModal
              isOpen={isBillingOpen}
              onClose={() => setIsBillingOpen(false)}
              tenant={currentTenant}
              invoices={invoices}
              onConfirmPayment={handleConfirmPayment}
              onShowToast={showToast}
              onOpenUpgradeModal={() => handleTriggerGateUpgrade('general')}
            />
          )}

          {isUpgradeModalOpen && currentTenant && (
            <UpgradePlanModal
              isOpen={isUpgradeModalOpen}
              onClose={() => setIsUpgradeModalOpen(false)}
              tenant={currentTenant}
              reason={upgradeGateReason}
              onSelectPlan={(newPlan) => handleUpdateTenantPlan(currentTenant.id, newPlan)}
              isMaster={true}
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
        </Suspense>
      </div>
    );
  }

  // --- TELA DE LOGIN EXCLUSIVA DO BAR (ISOLADA MULTI-TENANT) ---
  if (!isAuthenticated) {
    if (isResolvingBarUrl) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 font-sans text-slate-100 bg-slate-950">
          <FechaCaixaLogo size="md" variant="horizontal" showSubtitle={true} />
          <div className="mt-6 flex items-center gap-3 bg-slate-900/90 border border-slate-800 px-5 py-3.5 rounded-2xl text-xs text-slate-300 shadow-xl">
            <div className="w-4 h-4 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" />
            <span>Carregando ambiente de {currentTenant?.name || 'Restaurante'}...</span>
          </div>
        </div>
      );
    }

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
              } rounded-2xl flex items-center justify-center text-white mb-3 shadow-lg font-black text-xl tracking-wider overflow-hidden`}
            >
              {currentTenant?.logoAvatarUrl ? (
                <img
                  src={currentTenant.logoAvatarUrl}
                  alt={currentTenant.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                currentTenant?.logoInitials || (currentTenant?.name ? currentTenant.name.slice(0, 2).toUpperCase() : 'FC')
              )}
            </div>
            <h1 className="text-2xl font-black text-white tracking-wide text-center">
              {currentTenant?.name || 'Restaurante Parceiro'}
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
    <div className="min-h-screen pb-24 font-sans text-slate-800 dark:text-slate-100 bg-slate-100 dark:bg-slate-950 transition-colors">
      {toastMsg && (
        <div className="fixed top-4 right-4 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-2xl z-[999] flex items-center gap-3 border border-slate-700 animate-bounce-subtle">
          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
          <span className="font-medium text-sm">{toastMsg}</span>
        </div>
      )}

      {/* Datalist Global do Cardápio Dinâmico do Bar */}
      <datalist id="flor-de-brasa-menu-list">
        {currentMenu.map((item, idx) => (
          <option key={idx} value={item.name}>
            {formatCurrency(item.price)}
          </option>
        ))}
      </datalist>

      {/* Barra Superior Unificada de Usuário & SaaS Multi-Tenant */}
      <header className="bg-slate-900 dark:bg-slate-950 text-white px-4 py-3 flex flex-wrap justify-between items-center text-sm font-bold shadow-md border-b border-transparent dark:border-slate-800 sticky top-0 z-40 gap-2">
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Identidade do Bar (Com seletor StoreSwitcher unificado quando em Sessão Master) */}
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
                className={`w-6 h-6 rounded-md bg-gradient-to-tr ${currentTenant.logoColor} flex items-center justify-center font-black text-[10px] text-white shadow-xs overflow-hidden shrink-0`}
              >
                {currentTenant.logoAvatarUrl ? (
                  <img
                    src={currentTenant.logoAvatarUrl}
                    alt={currentTenant.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  currentTenant.logoInitials
                )}
              </div>
              <div className="flex flex-col text-left">
                <span className="leading-tight truncate max-w-[140px] sm:max-w-[200px]">{currentTenant.name}</span>
                <span className="text-[9px] text-slate-400 font-normal leading-none">{currentTenant.city}</span>
              </div>
            </div>
          )}

          {/* Botão Discreto de Limpar Tabela (próximo ao logo do bar/restaurante) */}
          <button
            type="button"
            onClick={handlePromptClearAllTable}
            className="px-2 sm:px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-rose-950/50 hover:text-rose-300 text-slate-400 hover:border-rose-500/40 border border-slate-700/70 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold shrink-0 group shadow-xs"
            title="Limpar todas as informações da tabela (Zerar valores do turno)"
          >
            <Eraser className="w-3.5 h-3.5 group-hover:text-rose-400 transition-colors" />
            <span className="text-[11px] font-bold group-hover:text-rose-200">
              Limpar<span className="hidden sm:inline"> Tabela</span>
            </span>
          </button>

          <div className="h-6 w-px bg-slate-700 hidden sm:block" />

          {/* Indicador de Nuvem & Sincronização Celular + PC (Somente Ícones) */}
          <button
            type="button"
            onClick={() => setIsMultiDeviceModalOpen(true)}
            className="flex items-center gap-1.5 text-xs bg-slate-800/90 hover:bg-slate-700/90 px-2.5 py-1.5 rounded-xl border border-slate-700 text-slate-200 transition-all cursor-pointer shadow-xs shrink-0"
            title={
              connectedDevices.length > 1
                ? `${connectedDevices.length} aparelhos conectados em tempo real — Clique para gerenciar`
                : 'Sincronização em Tempo Real entre Celular e Computador — Clique para conectar outro aparelho'
            }
          >
            <span
              className={`w-2 h-2 rounded-full ${
                cloudSyncStatus === 'synced'
                  ? 'bg-emerald-400'
                  : cloudSyncStatus === 'syncing'
                  ? 'bg-amber-400'
                  : 'bg-rose-400'
              }`}
            />
            <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
            <ArrowLeftRight className="w-3 h-3 text-slate-400" />
            <Monitor className="w-3.5 h-3.5 text-indigo-400" />
            {connectedDevices.length > 1 && (
              <span className="text-emerald-300 text-[10px] font-mono font-black ml-0.5">
                {connectedDevices.length}
              </span>
            )}
          </button>

          {/* Indicador Compacto de Status de Conexão com a API AlphaX9 da Jclan */}
          <button
            type="button"
            onClick={() => {
              if (!planCapabilities.canUseJclanIntegration) {
                handleTriggerGateUpgrade('jclan_sync');
                return;
              }
              setIsJclanSyncModalOpen(true);
            }}
            className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer shadow-xs whitespace-nowrap shrink-0 ${
              !planCapabilities.canUseJclanIntegration
                ? 'bg-purple-950/60 hover:bg-purple-900/60 border-purple-500/50 text-purple-300'
                : lastJclanError
                ? 'bg-rose-950/60 hover:bg-rose-900/60 border-rose-500/50 text-rose-400'
                : 'bg-emerald-950/50 hover:bg-emerald-900/50 border-emerald-500/40 text-emerald-400'
            }`}
            title={
              !planCapabilities.canUseJclanIntegration
                ? 'Conexão direta Jclan AlphaX9 🔒 (Exclusivo Plano VIP R$ 300/mês)'
                : lastJclanError
                ? `Erro na última tentativa com a API AlphaX9: ${lastJclanError}`
                : lastJclanSyncAt
                ? `API AlphaX9 conectada (Última leitura às ${new Date(lastJclanSyncAt).toLocaleTimeString('pt-BR')}) — Clique para configurar`
                : 'API AlphaX9 Jclan pronta — Clique para configurar ou testar conexão'
            }
          >
            {!planCapabilities.canUseJclanIntegration ? (
              <>
                <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="font-bold text-[11px] text-purple-200">Jclan (VIP)</span>
              </>
            ) : lastJclanError ? (
              <>
                <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span className="font-bold text-[11px] text-rose-400">Erro Jclan</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="font-bold text-[11px] text-emerald-400">Conectado Jclan</span>
              </>
            )}
          </button>

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
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Botão Guia / Tutorial de Fechamento (Mantido com texto) */}
          <button
            onClick={() => setIsGuideOpen(true)}
            className="text-xs bg-blue-600/25 hover:bg-blue-600/35 text-blue-200 px-2.5 py-1.5 rounded-lg border border-blue-500/40 transition-colors flex items-center gap-1.5 font-bold shadow-sm cursor-pointer whitespace-nowrap shrink-0"
            title="Abrir Guia Interativo de Fechamento Passo a Passo"
          >
            <BookOpen className="w-3.5 h-3.5 text-blue-400" />
            <span>Guia Passo a Passo</span>
          </button>

          {/* Botão Painel Admin da Loja (Apenas para Administrador) */}
          {currentOperator?.isAdmin && (
            <button
              onClick={() => setIsAdminOpen(true)}
              className="text-xs bg-slate-800 hover:bg-slate-700 text-amber-400 px-3 py-1.5 rounded-lg border border-slate-700 transition-colors flex items-center gap-1.5 font-bold shadow-sm cursor-pointer whitespace-nowrap shrink-0"
              title="Acessar Área do Administrador do Bar (Operadores, Cardápio, Aparência e Modo Escuro/Claro)"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>Admin</span>
            </button>
          )}

          {/* Botão Painel Master Unificado (Exibido EXCLUSIVAMENTE para o Dono em Sessão Master) */}
          {isMasterSession && (
            <button
              onClick={() => {
                setAppMode('master');
                window.history.pushState({}, '', window.location.pathname);
              }}
              className="text-xs bg-gradient-to-r from-indigo-700 to-purple-700 hover:from-indigo-600 hover:to-purple-600 text-white px-2.5 py-1.5 rounded-lg border border-indigo-500/50 transition-all flex items-center gap-1.5 font-black shadow-sm cursor-pointer whitespace-nowrap shrink-0"
              title="Voltar ao Painel Master SaaS"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span className="hidden md:inline">Painel Master</span>
            </button>
          )}

          <button
            onClick={() => setIsAuthenticated(false)}
            className="text-xs bg-slate-800 hover:bg-rose-950/60 hover:text-rose-300 text-slate-300 px-2.5 py-1.5 rounded-lg border border-slate-700 transition-colors flex items-center gap-1 font-bold cursor-pointer whitespace-nowrap shrink-0"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      </header>

      {/* Modal Painel Admin Exclusivo do Bar (Contém Cardápio, Assinatura, Configuração IA Gemini, Operadores e Aparência) */}
      <Suspense fallback={null}>
        {isAdminOpen && (
          <BarAdminModal
            isOpen={isAdminOpen}
            onClose={() => setIsAdminOpen(false)}
            tenant={currentTenant}
            currentOperator={currentOperator}
            users={users}
            history={history}
            currentShiftAuditLogs={auditLogs}
            onOpenLiveAuditDrawer={() => {
              setIsAdminOpen(false);
              setIsAuditDrawerOpen(true);
            }}
            menu={currentMenu}
            invoices={invoices}
            apiKey={apiKey}
            isDarkMode={isDarkMode}
            onToggleDarkMode={() => setIsDarkMode((prev) => !prev)}
            onSaveApiKey={(key) => {
              setApiKey(key);
              localStorage.setItem('geminiApiKey', key);
            }}
            onAddUser={handleBarAdminAddUser}
            onUpdateUser={handleBarAdminUpdateUser}
            onDeleteUser={handleRemoveUser}
            onDeleteClosing={deleteRecord}
            onImportClosings={handleImportTenantClosings}
            autoBackupSettings={autoBackupSettings}
            onUpdateAutoBackupSettings={handleUpdateAutoBackupSettings}
            onTriggerFullBackupDownload={() => handleTriggerFullJsonBackup('admin_panel', false)}
            onRestoreFullBackup={handleRestoreTenantsBackup}
            onSaveMenu={handleSaveMenu}
            onConfirmPayment={handleConfirmPayment}
            onUpdateTenantAppearance={handleUpdateTenantAppearance}
            onZoomImage={(url) => setZoomImageUrl(url)}
            onShowToast={showToast}
            onOpenUpgradeModal={() => handleTriggerGateUpgrade('general')}
          />
        )}
      </Suspense>

      {/* Banner Flutuante Não-Intrusivo: Backup Periódico Automático em JSON */}
      {isPeriodicBackupBannerVisible && isAuthenticated && appMode === 'bar' && (
        <div className="fixed bottom-4 right-4 z-[95] max-w-sm w-full bg-slate-900/95 backdrop-blur-md text-white border border-emerald-500/40 rounded-2xl p-4 shadow-2xl animate-fade-in">
          <div className="flex items-start justify-between gap-2.5">
            <div className="flex items-start gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                <Download className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-black text-emerald-400 uppercase tracking-wider">
                    Backup Periódico (.JSON)
                  </span>
                  <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-1.5 py-0.5 rounded">
                    {history.length} fechamentos
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                  Baixe o arquivo JSON atualizado com o histórico de fechamentos e configurações dos bares para redundância contra limpeza de cache.
                </p>
                {autoBackupSettings.lastBackupAt && (
                  <p className="text-[10px] text-slate-400 mt-1">
                    Último arquivo baixado em:{' '}
                    <strong className="text-slate-200">
                      {new Date(autoBackupSettings.lastBackupAt).toLocaleDateString('pt-BR')} às{' '}
                      {new Date(autoBackupSettings.lastBackupAt).toLocaleTimeString('pt-BR').slice(0, 5)}
                    </strong>
                  </p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                handleUpdateAutoBackupSettings({
                  snoozedUntil: Date.now() + 24 * 60 * 60 * 1000,
                });
                setIsPeriodicBackupBannerVisible(false);
              }}
              className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              title="Adiar lembrete por 24h"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleTriggerFullJsonBackup('periodic_banner', false)}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Baixar Backup (.JSON) Agora</span>
            </button>
            <button
              type="button"
              onClick={() => {
                handleUpdateAutoBackupSettings({
                  snoozedUntil: Date.now() + 24 * 60 * 60 * 1000,
                });
                setIsPeriodicBackupBannerVisible(false);
              }}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[11px] py-2 px-3 rounded-xl border border-slate-700 transition-colors cursor-pointer"
            >
              Adiar 24h
            </button>
          </div>
        </div>
      )}

      {/* Modal de Fechamento Salvo */}
      {reportModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] border border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-center p-5 border-b border-emerald-500/20 bg-emerald-600 text-white">
              <h3 className="font-black text-white flex items-center gap-2">
                <Check className="w-5 h-5" /> Fechamento Validado!
              </h3>
              <button
                onClick={() => handleDownloadClosingPdf(undefined, undefined, true)}
                className="text-xs bg-white/15 hover:bg-white/25 text-white font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Baixar arquivo PDF formatado do relatório de fechamento"
              >
                <Download className="w-3.5 h-3.5" />
                <span>PDF</span>
              </button>
            </div>
            <div className="p-6 overflow-y-auto bg-slate-50 dark:bg-slate-950 flex-1">
              <p className="text-sm text-slate-600 dark:text-slate-300 mb-4 font-medium">
                O caixa foi salvo no histórico com sucesso. Você pode copiar o resumo para o WhatsApp, baixar o PDF ou salvar o Backup JSON de segurança:
              </p>
              <pre className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-200 whitespace-pre-wrap font-mono shadow-inner leading-relaxed">
                {reportModal}
              </pre>
            </div>
            <div className="p-5 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                onClick={() => copyToClipboard(reportModal)}
                className="w-full bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-md transition-all text-xs cursor-pointer"
              >
                <Copy className="w-4 h-4" /> Copiar para WhatsApp
              </button>
              <button
                onClick={() => handleDownloadClosingPdf(undefined, undefined, true)}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-md transition-all text-xs cursor-pointer"
              >
                <Download className="w-4 h-4" /> Baixar Relatório em PDF
              </button>
              <button
                onClick={() => handleTriggerFullJsonBackup('closing_validated_modal', false)}
                className="sm:col-span-2 w-full bg-slate-100 dark:bg-slate-800/90 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-800 dark:text-emerald-300 border border-slate-200 dark:border-slate-700 font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all text-xs cursor-pointer"
                title="Baixar arquivo JSON completo com histórico de fechamentos e configurações dos bares"
              >
                <Download className="w-4 h-4 text-emerald-500" />
                <span>Baixar Backup JSON de Segurança (Histórico + Configurações)</span>
              </button>
              <button
                onClick={confirmAndClear}
                className="sm:col-span-2 w-full bg-emerald-100 dark:bg-emerald-950/80 hover:bg-emerald-200 dark:hover:bg-emerald-900 text-emerald-900 dark:text-emerald-200 border border-transparent dark:border-emerald-800 font-bold py-3.5 rounded-xl transition-all text-xs cursor-pointer"
              >
                Iniciar Novo Turno (Limpar Tela)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Visual: Lembrete de Fechamento de Caixa */}
      {isReminderAlertOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border-2 border-amber-400 flex flex-col">
            {/* Top Warning Banner Header */}
            <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center shrink-0">
                  <Clock className="w-7 h-7 text-white" />
                </div>
                <div>
                  <span className="bg-white text-orange-700 text-[10px] font-black uppercase px-2 py-0.5 rounded-full tracking-wider">
                    Alerta de Horário Limite
                  </span>
                  <h3 className="text-lg font-black text-white mt-0.5 flex items-center gap-2">
                    <span>Lembrete de Fechamento de Caixa</span>
                  </h3>
                  <p className="text-xs text-orange-100 font-medium">
                    Horário programado atingido: <strong>{currentTenant.closingReminderTime || '02:00'}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setReminderSnoozedUntil(Date.now() + 10 * 60 * 1000);
                  setIsReminderAlertOpen(false);
                  showToast('Lembrete silenciado por 10 minutos.');
                }}
                className="text-white/80 hover:text-white p-2 rounded-xl hover:bg-black/10 transition-colors cursor-pointer"
                title="Fechar e silenciar por 10 min"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 bg-slate-50/70 dark:bg-slate-950/80">
              <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-950 dark:text-amber-200 leading-relaxed">
                  <p className="font-bold text-sm mb-1 text-amber-900 dark:text-amber-100">
                    Atenção, {currentOperator?.name ? currentOperator.name.toUpperCase() : 'Operador'}!
                  </p>
                  <p>
                    O horário estipulado pela administração do <strong>{currentTenant.name}</strong> para o fechamento de caixa do turno foi alcançado. O caixa ainda consta em aberto no sistema.
                  </p>
                </div>
              </div>

              {/* Snapshot do Caixa em Aberto */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2.5">
                <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500 dark:text-slate-400 font-bold">Horário Atual:</span>
                  <span className="font-mono font-black text-slate-800 dark:text-slate-100 text-sm">
                    {new Date().toLocaleTimeString('pt-BR').slice(0, 5)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500 dark:text-slate-400 font-bold">Total Máquinas {currentTenant.cardSystemName || 'Getnet'}:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-100 tabular-nums">{formatCurrency(getnetTotal)}</span>
                </div>
                <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500 dark:text-slate-400 font-bold">Total no {currentTenant.pdvSystemName || 'Jclan'}:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-100 tabular-nums">{formatCurrency(jclanTotal)}</span>
                </div>
                <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500 dark:text-slate-400 font-bold">Divergência Cartões:</span>
                  <span className={`font-black tabular-nums ${Math.abs(differenceTotal) < 0.01 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {formatCurrency(differenceTotal)} {Math.abs(differenceTotal) < 0.01 ? '(Batendo 100%)' : ''}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400 font-bold">Divergência Gaveta (Dinheiro):</span>
                  <span className={`font-black tabular-nums ${Math.abs(cashDifference) < 0.01 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {formatCurrency(cashDifference)} {Math.abs(cashDifference) < 0.01 ? '(Batendo 100%)' : ''}
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center">
                Recomendamos conferir as maquininhas, conciliar as comandas no {currentTenant.pdvSystemName || 'PDV'} e salvar o fechamento do dia.
              </p>
            </div>

            {/* Modal Actions */}
            <div className="p-5 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setReminderSnoozedUntil(Date.now() + 10 * 60 * 1000);
                  setIsReminderAlertOpen(false);
                  showToast('Lembrete silenciado por 10 minutos (Snooze).');
                }}
                className="flex-1 py-3 px-4 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer text-center"
              >
                Silenciar por 10 min
              </button>

              <button
                type="button"
                onClick={() => {
                  setReminderSnoozedUntil(Date.now() + 30 * 60 * 1000);
                  setIsReminderAlertOpen(false);
                  showToast('Lembrete dispensado por 30 minutos.');
                }}
                className="py-3 px-4 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white text-xs font-semibold transition-all cursor-pointer text-center"
              >
                Dispensar
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsReminderAlertOpen(false);
                  handleOpenSaveClosingModal();
                }}
                className="flex-1 py-3 px-5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-black shadow-lg shadow-orange-600/30 transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2"
              >
                <FileText className="w-4 h-4" />
                <span>Fechar Caixa Agora</span>
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
          <div id="pdv-totals-bar" className="sticky top-[53px] z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-sm border-b border-slate-200 dark:border-slate-800 p-4 mb-6 transition-all">
        {/* Barra de Atualização Manual Sob Demanda Portal Web Jclan + Leitura de Print/Foto */}
        <div className="max-w-7xl mx-auto mb-3 flex flex-wrap items-center justify-between gap-2 bg-slate-900 dark:bg-slate-950 text-white px-3.5 py-2 rounded-xl border border-slate-800">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex items-center gap-2">
              <Globe className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span className="text-xs font-black tracking-tight">
                {currentTenant.pdvSystemName || 'Jclan'} AlphaX9
              </span>
              {!planCapabilities.canUseJclanIntegration && (
                <button
                  type="button"
                  onClick={() => handleTriggerGateUpgrade('jclan_sync')}
                  className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1 hover:bg-purple-500/30 transition-colors cursor-pointer"
                  title="Recurso exclusivo do Plano VIP (R$ 300/mês) — Clique para ver detalhes"
                >
                  <Lock className="w-3 h-3 text-amber-400" />
                  <span>VIP (R$ 300)</span>
                </button>
              )}
            </div>

            {/* Seletor rápido de período de fechamento (Turno Auto / Hoje / Ontem / Data-Hora) */}
            <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800">
              {(
                [
                  { id: 'turno_auto', label: 'Turno Auto' },
                  { id: 'hoje', label: 'Hoje' },
                  { id: 'ontem', label: 'Ontem' },
                ] as const
              ).map((m) => {
                const isSelected = (currentTenant.jclanDateMode || 'turno_auto') === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={async () => {
                      if (!planCapabilities.canUseJclanIntegration) {
                        handleTriggerGateUpgrade('jclan_sync');
                        return;
                      }
                      await handleUpdateTenantAppearance({ jclanDateMode: m.id });
                      if (
                        currentTenant.jclanPortalUsername &&
                        currentTenant.jclanPortalPassword
                      ) {
                        handleTriggerJclanSync(
                          {
                            portalUrl:
                              currentTenant.jclanPortalUrl ||
                              'https://gestao.flordebrasacuritiba.com.br/',
                            username: currentTenant.jclanPortalUsername,
                            password: currentTenant.jclanPortalPassword,
                            dateMode: m.id,
                          },
                          false
                        );
                      }
                    }}
                    className={`px-2 py-1 rounded-md text-[10px] font-bold transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-cyan-600 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title={
                      !planCapabilities.canUseJclanIntegration
                        ? 'Conexão Jclan 🔒 (Exclusivo Plano VIP R$ 300/mês)'
                        : `Consultar vendas do período: ${m.label}`
                    }
                  >
                    {m.label}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => {
                  if (!planCapabilities.canUseJclanIntegration) {
                    handleTriggerGateUpgrade('jclan_sync');
                    return;
                  }
                  setIsJclanSyncModalOpen(true);
                }}
                className={`px-2 py-1 rounded-md text-[10px] font-bold transition-colors cursor-pointer ${
                  currentTenant.jclanDateMode === 'custom'
                    ? 'bg-cyan-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title={
                  !planCapabilities.canUseJclanIntegration
                    ? 'Conexão Jclan 🔒 (Exclusivo Plano VIP R$ 300/mês)'
                    : 'Escolher data e hora personalizadas para a leitura da Jclan'
                }
              >
                Data/Hora
              </button>
            </div>

            {lastJclanPeriodLabel && (
              <span className="text-[10px] text-emerald-400 font-mono hidden md:inline">
                {lastJclanPeriodLabel}
              </span>
            )}

            {lastJclanSyncAt && (
              <span className="text-[10px] text-slate-400 font-mono">
                · {new Date(lastJclanSyncAt).toLocaleTimeString('pt-BR')}
              </span>
            )}

            {lastJclanChangeSummary && (
              <span className="text-[10px] text-cyan-300 font-mono hidden lg:inline">
                · {lastJclanChangeSummary}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <input
              ref={jclanQuickPhotoInputRef}
              type="file"
              accept="image/*"
              onChange={handleQuickJclanScreenPhoto}
              className="hidden"
            />

            {jclanUndoSnapshot && (
              <button
                type="button"
                onClick={handleUndoJclanSync}
                className="px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all"
                title="Desfazer última atualização do Jclan"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Desfazer</span>
              </button>
            )}

            <button
              type="button"
              disabled={isJclanSyncing}
              onClick={() => {
                if (!planCapabilities.canUseJclanIntegration) {
                  handleTriggerGateUpgrade('jclan_sync');
                  return;
                }
                if (currentTenant.jclanPortalUsername && currentTenant.jclanPortalPassword) {
                  handleTriggerJclanSync(undefined, false);
                } else {
                  setIsJclanSyncModalOpen(true);
                }
              }}
              className="px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-[11px] font-black flex items-center gap-1.5 cursor-pointer transition-all shadow-sm"
              title={
                !planCapabilities.canUseJclanIntegration
                  ? 'Conexão direta Jclan AlphaX9 🔒 (Exclusivo Plano VIP R$ 300/mês)'
                  : 'Atualizar valores de Crédito, Débito, Pix, Voucher e Dinheiro vindo da Jclan para ver o resultado da mudança'
              }
            >
              {!planCapabilities.canUseJclanIntegration ? (
                <Lock className="w-3.5 h-3.5 text-amber-300" />
              ) : (
                <RefreshCw className={`w-3.5 h-3.5 ${isJclanSyncing ? 'animate-spin' : ''}`} />
              )}
              <span>
                {!planCapabilities.canUseJclanIntegration
                  ? 'Conectar Jclan (VIP)'
                  : isJclanSyncing
                  ? 'Atualizando Jclan...'
                  : currentTenant.jclanPortalUsername && currentTenant.jclanPortalPassword
                  ? `Atualizar Valores ${currentTenant.pdvSystemName || 'Jclan'}`
                  : `Conectar ${currentTenant.pdvSystemName || 'Jclan'}`}
              </span>
            </button>

            <button
              type="button"
              disabled={isJclanOcrLoading}
              onClick={() => {
                if (!planCapabilities.canUseAiAssistants) {
                  handleTriggerGateUpgrade('ai_ocr');
                  return;
                }
                jclanQuickPhotoInputRef.current?.click();
              }}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition-all"
              title={
                !planCapabilities.canUseAiAssistants
                  ? 'Leitura IA por Foto/OCR 🔒 (Disponível nos planos Pro R$ 200 e VIP R$ 300)'
                  : 'Enviar Print ou Foto da tela do Jclan para preencher Crédito, Débito, Pix, Voucher e Dinheiro em 1 segundo'
              }
            >
              {!planCapabilities.canUseAiAssistants ? (
                <Lock className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <Camera className={`w-3.5 h-3.5 text-cyan-400 ${isJclanOcrLoading ? 'animate-pulse' : ''}`} />
              )}
              <span>
                {!planCapabilities.canUseAiAssistants
                  ? 'Ler Print (Pro)'
                  : isJclanOcrLoading
                  ? 'Lendo Tela...'
                  : 'Ler Print / Foto'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (!planCapabilities.canUseJclanIntegration) {
                  handleTriggerGateUpgrade('jclan_sync');
                  return;
                }
                setIsJclanSyncModalOpen(true);
              }}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all"
              title={
                !planCapabilities.canUseJclanIntegration
                  ? 'Conexão Jclan 🔒 (Exclusivo Plano VIP R$ 300/mês)'
                  : 'Configurar login do portal gestao.flordebrasacuritiba.com.br, unidade e período de leitura'
              }
            >
              <Globe className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden md:inline">Configurar Login</span>
            </button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto flex flex-col xl:flex-row gap-4 items-center justify-between">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full xl:w-auto flex-1">
            <ComparisonCard
              title="Crédito"
              getnetVal={getnetCredit}
              jclanVal={jclan.credit}
              field="credit"
              iconColor="bg-blue-500"
              cardName={currentTenant.cardSystemName || 'Maquininhas'}
              pdvName={currentTenant.pdvSystemName || 'PDV'}
              onJclanChange={handleJclanChange}
              onKeyDown={handleJclanKeyDown}
              onFieldBlur={handleJclanBlur}
            />
            <ComparisonCard
              title="Débito"
              getnetVal={getnetDebit}
              jclanVal={jclan.debit}
              field="debit"
              iconColor="bg-orange-500"
              cardName={currentTenant.cardSystemName || 'Maquininhas'}
              pdvName={currentTenant.pdvSystemName || 'PDV'}
              onJclanChange={handleJclanChange}
              onKeyDown={handleJclanKeyDown}
              onFieldBlur={handleJclanBlur}
            />
            <ComparisonCard
              title="Pix"
              getnetVal={getnetPix}
              jclanVal={jclan.pix}
              field="pix"
              iconColor="bg-teal-500"
              cardName={currentTenant.cardSystemName || 'Maquininhas'}
              pdvName={currentTenant.pdvSystemName || 'PDV'}
              onJclanChange={handleJclanChange}
              onKeyDown={handleJclanKeyDown}
              onFieldBlur={handleJclanBlur}
            />
            <ComparisonCard
              title="Voucher"
              getnetVal={getnetVoucher}
              jclanVal={jclan.voucher}
              field="voucher"
              iconColor="bg-purple-500"
              cardName={currentTenant.cardSystemName || 'Maquininhas'}
              pdvName={currentTenant.pdvSystemName || 'PDV'}
              onJclanChange={handleJclanChange}
              onKeyDown={handleJclanKeyDown}
              onFieldBlur={handleJclanBlur}
            />
          </div>

          <div className="flex gap-3 sm:gap-4 items-center w-full xl:w-auto justify-end bg-slate-50 dark:bg-slate-950/80 p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex-wrap">
            <div
              className={`px-4 py-2 rounded-lg border-2 ${
                Math.abs(differenceTotal) < 0.01
                  ? 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-100 border-slate-300 dark:border-slate-700'
                  : differenceTotal > 0
                  ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                  : 'bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-700'
              } text-center min-w-[140px]`}
            >
              <span className="block text-[10px] font-bold uppercase mb-0.5">
                {Math.abs(differenceTotal) < 0.01
                  ? 'Sem Diferença'
                  : differenceTotal > 0
                  ? `Sobra ${currentTenant.cardSystemName || 'Maquininhas'}`
                  : `Falta ${currentTenant.cardSystemName || 'Maquininhas'}`}
              </span>
              <span className="text-xl font-black tabular-nums">{formatCurrency(Math.abs(differenceTotal))}</span>
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
        <section id="section-cash-drawer" className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col md:flex-row transition-all">
          <div className="p-6 md:w-2/3 md:border-r border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3 mb-6">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-800 dark:bg-slate-800 text-white font-black text-sm">
                1
              </span>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
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
                      className="flex items-center justify-between bg-slate-50 dark:bg-slate-950/70 p-2 rounded-lg border border-slate-100 dark:border-slate-800"
                    >
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 w-24 tabular-nums">{i.l}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400">qtd:</span>
                        <input
                          id={`cash-${i.f}`}
                          type="text"
                          value={cash[i.f]}
                          onChange={(e) => handleCashChange(i.f, e.target.value)}
                          onBlur={() => handleCashBlur(i.f, i.l)}
                          onKeyDown={(e) => handleCashKeyDown(e, 'notes', idx)}
                          className="w-16 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded p-1.5 text-center text-sm font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none shadow-sm tabular-nums"
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
                      className="flex items-center justify-between bg-slate-50 dark:bg-slate-950/70 p-2 rounded-lg border border-slate-100 dark:border-slate-800"
                    >
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 w-24 tabular-nums">{i.l}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400">qtd:</span>
                        <input
                          id={`cash-${i.f}`}
                          type="text"
                          value={cash[i.f]}
                          onChange={(e) => handleCashChange(i.f, e.target.value)}
                          onBlur={() => handleCashBlur(i.f, i.l)}
                          onKeyDown={(e) => handleCashKeyDown(e, 'coins', idx)}
                          className="w-16 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded p-1.5 text-center text-sm font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none shadow-sm tabular-nums"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Totalização da Gaveta */}
          <div className="p-6 md:w-1/3 flex flex-col rounded-b-xl md:rounded-r-xl bg-slate-900 dark:bg-slate-950 text-white">
            <div className="flex flex-col items-center mb-6">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Total Físico na Gaveta
              </span>
              <span className="text-4xl font-black text-emerald-400 mt-1 tabular-nums">{formatCurrency(cashTotal)}</span>
            </div>
            <div className="space-y-3.5 mb-6 w-full flex-1">
              <div className="flex justify-between items-center bg-slate-800/80 p-2.5 rounded-lg border border-slate-700/60">
                <span className="text-xs text-slate-300 font-medium">Abertura de Caixa</span>
                <input
                  id="cash-summary-opening"
                  type="text"
                  placeholder="0,00"
                  value={cashSummary.opening}
                  onChange={(e) => handleCashSummaryChange('opening', e.target.value)}
                  onBlur={() => handleCashSummaryBlur('opening')}
                  className="w-28 bg-slate-950 border border-slate-700 rounded p-1.5 text-right text-xs font-bold text-white focus:ring-1 focus:ring-orange-500 outline-none tabular-nums"
                />
              </div>
              <div className="flex justify-between items-center bg-slate-800/80 p-2.5 rounded-lg border border-slate-700/60">
                <span className="text-xs text-slate-300 font-medium">{currentTenant.pdvSystemName || 'PDV'} (Dinheiro)</span>
                <input
                  id="cash-summary-jclanCash"
                  type="text"
                  placeholder="0,00"
                  value={cashSummary.jclanCash}
                  onChange={(e) => handleCashSummaryChange('jclanCash', e.target.value)}
                  onBlur={() => handleCashSummaryBlur('jclanCash')}
                  className="w-28 bg-slate-950 border border-slate-700 rounded p-1.5 text-right text-xs font-bold text-white focus:ring-1 focus:ring-orange-500 outline-none tabular-nums"
                />
              </div>
              <div className="flex justify-between items-center bg-slate-800/80 p-2.5 rounded-lg border border-slate-700/60">
                <span className="text-xs text-slate-300 font-medium">Pagamentos</span>
                <input
                  id="cash-summary-expenses"
                  type="text"
                  placeholder="0,00"
                  value={cashSummary.expenses}
                  onChange={(e) => handleCashSummaryChange('expenses', e.target.value)}
                  onBlur={() => handleCashSummaryBlur('expenses')}
                  className="w-28 bg-slate-950 border border-rose-900/60 rounded p-1.5 text-right text-xs font-bold text-rose-300 focus:ring-1 focus:ring-rose-500 outline-none tabular-nums"
                />
              </div>
            </div>
            <div className="pt-5 border-t border-slate-800 mt-auto">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-semibold text-slate-400">Caixa Esperado:</span>
                <span className="text-sm font-bold text-slate-200 tabular-nums">{formatCurrency(expectedCash)}</span>
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
                <span className="text-xl font-black tabular-nums">{formatCurrency(Math.abs(cashDifference))}</span>
              </div>
            </div>
          </div>
        </section>

        {/* 2. PAINÉIS DE CARTÃO */}
        <section className="space-y-4">
          <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex justify-between items-center flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center font-black text-xs">
                2
              </span>
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>
                  Máquinas {currentTenant.cardSystemName ? `${currentTenant.cardSystemName} ` : ''}({machines.length})
                </span>
              </h2>
            </div>
            <div className="flex gap-2 flex-wrap items-center">
              <button
                onClick={() => setIsCompactView(!isCompactView)}
                className={`px-3 py-2 rounded-lg font-bold text-xs uppercase flex items-center gap-1.5 transition-colors ${
                  isCompactView
                    ? 'bg-slate-800 dark:bg-blue-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {isCompactView ? <Columns3 className="w-3.5 h-3.5" /> : <Grid className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">Grade Compacta</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!planCapabilities.canUseAiAssistants) {
                    handleTriggerGateUpgrade('ai_ocr');
                    return;
                  }
                  multipleUploadInputRef.current?.click();
                }}
                className={`text-xs px-4 py-2 rounded-lg font-bold uppercase flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm ${
                  !planCapabilities.canUseAiAssistants
                    ? 'bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/70 border border-transparent dark:border-purple-800'
                    : isGlobalLoading
                    ? 'bg-purple-200 dark:bg-purple-900 text-purple-800 dark:text-purple-200 cursor-wait'
                    : 'bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/70 border border-transparent dark:border-purple-800'
                }`}
                title={
                  !planCapabilities.canUseAiAssistants
                    ? 'Leitura IA de Comprovantes 🔒 (Disponível nos planos Pro R$ 200 e VIP R$ 300)'
                    : 'Enviar várias fotos de comprovantes de maquininhas de uma só vez'
                }
              >
                {!planCapabilities.canUseAiAssistants ? (
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                ) : isGlobalLoading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Upload className="w-3.5 h-3.5" />
                )}
                <span>
                  {isGlobalLoading
                    ? 'Lendo com IA...'
                    : !planCapabilities.canUseAiAssistants
                    ? 'Upload Múltiplo (Pro)'
                    : 'Upload Múltiplo'}
                </span>
                <input
                  ref={multipleUploadInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleGlobalImageUpload}
                  disabled={isGlobalLoading || !planCapabilities.canUseAiAssistants}
                />
              </button>
              <button
                onClick={handleAddMachine}
                className="text-xs bg-orange-100 dark:bg-orange-950/70 hover:bg-orange-200 dark:hover:bg-orange-900/70 px-4 py-2 rounded-lg font-bold text-orange-800 dark:text-orange-300 border border-transparent dark:border-orange-800 uppercase flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Nova Máquina
              </button>
              {machines.length > 0 && (
                <>
                  <button
                    onClick={() => setAllCollapsed(true)}
                    className="text-xs bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-3 py-2 rounded-lg font-bold text-slate-600 dark:text-slate-300 uppercase hidden md:inline-block transition-colors"
                  >
                    Ocultar Todas
                  </button>
                  <button
                    onClick={() => setAllCollapsed(false)}
                    className="text-xs bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-3 py-2 rounded-lg font-bold text-slate-600 dark:text-slate-300 uppercase hidden md:inline-block transition-colors"
                  >
                    Expandir Todas
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Grade de Maquininhas ou Estado Vazio para Novos Bares */}
          {machines.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-8 text-center shadow-2xs">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center mb-3">
                <CreditCard className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wide">
                Nenhuma maquininha adicionada neste bar
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1 mb-4">
                Clique em <strong>+ Nova Máquina</strong> para adicionar as maquininhas utilizadas pela casa ou envie fotos dos comprovantes em <strong>Upload Múltiplo</strong>.
              </p>
              <button
                type="button"
                onClick={handleAddMachine}
                className="bg-orange-600 hover:bg-orange-500 text-white font-black text-xs px-5 py-2.5 rounded-xl inline-flex items-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Adicionar Primeira Maquininha</span>
              </button>
            </div>
          ) : (
            <VirtualMachineList
              machines={machines}
              isCompactView={isCompactView}
              loadingMachineId={loadingMachineId}
              voiceActiveMachineId={voiceActiveMachineId}
              isVoicePanelOpen={isVoicePanelOpen}
              creditFlags={currentTenant.creditFlags}
              debitFlags={currentTenant.debitFlags}
              voucherNames={currentTenant.voucherNames}
              canUseAiAssistants={planCapabilities.canUseAiAssistants}
              onGateTrigger={(reason) => handleTriggerGateUpgrade(reason)}
              onToggleCollapse={toggleCollapse}
              onOpenVoice={handleOpenVoiceForMachine}
              onClearMachine={handleClearMachine}
              onRemoveMachine={handleRemoveMachine}
              onImageUpload={handleImageUpload}
              onAddField={handleAddField}
              onArrayChange={handleArrayChange}
              onArrayBlur={handleMachineArrayBlur}
              onPixChange={handlePixChange}
              onPixBlur={handleMachinePixBlur}
              onKeyDown={handleKeyDown}
            />
          )}
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

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                disabled={isJclanSyncing}
                onClick={() => {
                  if (currentTenant.jclanPortalUsername && currentTenant.jclanPortalPassword) {
                    handleTriggerJclanSync(undefined, false);
                  } else {
                    setIsJclanSyncModalOpen(true);
                  }
                }}
                className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
                title="Fez uma alteração no Jclan? Clique aqui para atualizar os valores e conferir o resultado da mudança agora"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isJclanSyncing ? 'animate-spin' : ''}`} />
                <span>
                  {isJclanSyncing
                    ? 'Atualizando...'
                    : `Atualizar Valores ${currentTenant.pdvSystemName || 'Jclan'}`}
                </span>
              </button>

              {hasDivergences && reconciliationSteps.length > 0 && (
                <span className="px-3 py-1.5 rounded-lg text-xs font-extrabold bg-orange-500/15 text-orange-300 border border-orange-500/40 flex items-center gap-1.5 shadow-sm">
                  <Sparkles className="w-3.5 h-3.5 text-orange-400 animate-pulse" />
                  <span>Modo Guiado • 1 Passo por Vez ({safeReconciliationStepIdx + 1}/{reconciliationSteps.length})</span>
                </span>
              )}

              <button
                type="button"
                onClick={() => setIsSupportModalOpen(true)}
                className="bg-slate-700/80 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
                title="Gerar laudo técnico em PDF e dados de divergência para suporte Jclan / Getnet"
              >
                <Headphones className="w-3.5 h-3.5 text-cyan-400" />
                <span>Gerar Laudo para Suporte</span>
              </button>

              {!hasDivergences && (
                <span className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-xs font-bold border border-emerald-500/30 flex items-center gap-1.5">
                  <Check className="w-4 h-4" /> 100% Conciliado
                </span>
              )}
            </div>
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
            ) : reconciliationSteps.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-slate-400 text-xs gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-orange-400" />
                <span>Calculando sugestões de conciliação...</span>
              </div>
            ) : (
              <div className="space-y-6">
                {/* BARRA DE PROGRESSO HIERÁRQUICA (ESTRITAMENTE 1 PASSO POR VEZ) */}
                {(() => {
                  const currentStep = reconciliationSteps[safeReconciliationStepIdx];
                  const isCurrentDone =
                    !!completedReconciliationSteps[currentStep.id] ||
                    (currentStep.kind === 'menu' && !!selectedExclusionOptions[currentStep.unres.label]);

                  return (
                    <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 shadow-inner">
                      <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="bg-orange-600 text-white text-xs font-black px-3 py-1 rounded-lg shadow-sm">
                            PASSO {safeReconciliationStepIdx + 1} DE {reconciliationSteps.length}
                          </span>
                          <span
                            className={`text-xs font-extrabold px-3 py-1 rounded-lg border flex items-center gap-1.5 ${
                              currentStep.isCash
                                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                                : currentStep.priorityTier === 2
                                ? 'bg-blue-500/15 text-blue-300 border-blue-500/40'
                                : 'bg-amber-500/15 text-amber-300 border-amber-500/40'
                            }`}
                          >
                            {currentStep.isCash && <span>💵</span>}
                            {!currentStep.isCash && currentStep.priorityTier === 2 && <span>🔄</span>}
                            {!currentStep.isCash && currentStep.priorityTier === 3 && <span>🍽️</span>}
                            <span>{currentStep.priorityLabel}</span>
                          </span>
                          <span className="text-[11px] font-bold text-slate-300 bg-slate-900 border border-slate-700/80 px-2.5 py-1 rounded-lg">
                            Ordem: 1º Gaveta → Pix → Crédito → Débito → Voucher
                          </span>
                        </div>

                        <span
                          className="bg-rose-500/15 text-rose-300 border border-rose-500/30 px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1.5"
                          title="Produtos de Happy Hour e Promocionais possuem horário máximo para serem lançados no PDV e são bloqueados automaticamente nas recomendações do Assistente."
                        >
                          <Timer className="w-3 h-3 text-rose-400" />
                          <span>
                            🚫 Sem Happy Hour / Promocionais
                            {blockedPromoItemsCount > 0 ? ` (${blockedPromoItemsCount} ocultados)` : ''}
                          </span>
                        </span>
                      </div>

                      {/* Trilha Sequencial de Passos (Bloqueia avanço sem concluir o passo atual) */}
                      <div className="flex items-center gap-2 overflow-x-auto pb-2 pt-1">
                        {reconciliationSteps.map((step, sIdx) => {
                          const isStepActive = sIdx === safeReconciliationStepIdx;
                          const isStepDone =
                            !!completedReconciliationSteps[step.id] ||
                            (step.kind === 'menu' && !!selectedExclusionOptions[step.unres.label]);
                          const isLockedFuture = sIdx > safeReconciliationStepIdx && !isCurrentDone;

                          return (
                            <button
                              key={step.id}
                              type="button"
                              onClick={() => {
                                if (sIdx > safeReconciliationStepIdx && !isCurrentDone) {
                                  showToast(
                                    `Conclua o Passo ${safeReconciliationStepIdx + 1} (${currentStep.shortLabel}) antes de avançar para o próximo!`
                                  );
                                  return;
                                }
                                setActiveReconciliationStepIdx(sIdx);
                              }}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 border cursor-pointer ${
                                isStepActive
                                  ? step.isCash
                                    ? 'bg-emerald-600 text-white border-emerald-400 shadow-md ring-2 ring-emerald-500/40 scale-[1.02]'
                                    : step.priorityTier === 2
                                    ? 'bg-blue-600 text-white border-blue-400 shadow-md ring-2 ring-blue-500/40 scale-[1.02]'
                                    : 'bg-amber-600 text-white border-amber-400 shadow-md ring-2 ring-amber-500/40 scale-[1.02]'
                                  : isStepDone
                                  ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40 hover:bg-emerald-900/50'
                                  : isLockedFuture
                                  ? 'bg-slate-900/50 text-slate-500 border-slate-800/70 opacity-75 hover:border-amber-500/40'
                                  : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800 hover:text-white'
                              }`}
                            >
                              <span className="w-4 h-4 rounded-full bg-black/30 flex items-center justify-center text-[10px] font-black">
                                {isStepDone ? '✓' : isLockedFuture ? '🔒' : sIdx + 1}
                              </span>
                              <span>{step.shortLabel}</span>
                            </button>
                          );
                        })}
                      </div>

                      <div className="mt-2 pt-2.5 border-t border-slate-800/80 flex items-center justify-between flex-wrap gap-2 text-[11px] text-slate-400">
                        <span>
                          {currentStep.isCash ? (
                            <>
                              <strong className="text-emerald-400">Prioridade Máxima (1º Passo):</strong> Sempre acerte primeiro o{' '}
                              <strong className="text-white">Dinheiro da Gaveta</strong> antes de conciliar Pix, Crédito, Débito ou Voucher.
                            </>
                          ) : currentStep.priorityTier === 2 ? (
                            <>
                              <strong className="text-blue-400">Etapa de Transferência:</strong> Com o dinheiro da gaveta acertado, faça esta troca no{' '}
                              <strong className="text-white">{currentTenant.pdvSystemName || 'Jclan'}</strong> antes de seguir para o próximo passo.
                            </>
                          ) : (
                            <>
                              <strong className="text-amber-400">Ordem Estrita de Zeramento ({currentStep.modalityName}):</strong> Escolha e marque uma opção do cardápio abaixo para concluir este passo.
                            </>
                          )}
                        </span>

                        {isCurrentDone ? (
                          <span className="text-emerald-400 font-bold flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                            <Check className="w-3.5 h-3.5" /> Passo concluído — pronto para avançar
                          </span>
                        ) : (
                          <span className="text-orange-300 font-bold flex items-center gap-1 bg-orange-500/10 border border-orange-500/30 px-2.5 py-0.5 rounded-full animate-pulse">
                            <AlertCircle className="w-3.5 h-3.5 text-orange-400" /> Aguardando conclusão deste passo
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })()}

                <div className="space-y-5">
                  {[reconciliationSteps[safeReconciliationStepIdx]].map((step, idx) => {
                    if (!step) return null;

                    const isCurrentStepCompleted =
                      !!completedReconciliationSteps[step.id] ||
                      (step.kind === 'menu' && !!selectedExclusionOptions[step.unres.label]);

                    if (step.kind === 'transfer') {
                      const inst = step.inst;
                      const isStepDone = isCurrentStepCompleted;

                      return (
                        <div
                          key={`step-transfer-${step.id}-${safeReconciliationStepIdx}`}
                          className={`animate-reconciliation-step rounded-2xl p-5 border-2 transition-all duration-300 ${
                            isStepDone
                              ? 'bg-emerald-950/30 border-emerald-500/80 shadow-lg shadow-emerald-950/30'
                              : step.isCash
                              ? 'bg-emerald-950/25 border-emerald-500 reconciliation-active-cash-glow'
                              : 'bg-slate-800/90 border-orange-500 reconciliation-active-step-glow'
                          }`}
                        >
                          {/* BANNER DE DESTAQUE VISUAL DO PASSO ATUAL */}
                          <div
                            className={`mb-4 px-4 py-3 rounded-xl border flex items-center justify-between flex-wrap gap-3 transition-all ${
                              isStepDone
                                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200'
                                : step.isCash
                                ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-100'
                                : 'bg-orange-500/15 border-orange-500/40 text-orange-100'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <span
                                className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                                  isStepDone
                                    ? 'bg-emerald-400'
                                    : step.isCash
                                    ? 'bg-emerald-400 animate-ping'
                                    : 'bg-orange-400 animate-ping'
                                }`}
                              />
                              <span className="text-xs font-black uppercase tracking-wide">
                                {isStepDone
                                  ? `✅ Passo ${safeReconciliationStepIdx + 1} Concluído! Você já pode avançar para o próximo passo.`
                                  : `⚡ Passo ${safeReconciliationStepIdx + 1} em Foco: Conclua esta ação no ${currentTenant.pdvSystemName || 'Jclan'} antes de seguir para o próximo passo.`}
                              </span>
                            </div>
                            <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-md bg-slate-950/70 border border-white/10">
                              {step.isCash ? '1º Passo: Dinheiro da Gaveta' : `Modalidade: ${step.modalityName}`}
                            </span>
                          </div>

                          <div className="flex items-center justify-between flex-wrap gap-2 pb-3 mb-4 border-b border-slate-700/80">
                            <div className="flex items-center gap-2">
                              <span
                                className={`p-2 rounded-xl ${
                                  step.isCash
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                    : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                }`}
                              >
                                <RefreshCw className="w-5 h-5" />
                              </span>
                              <div>
                                <h4
                                  className={`text-sm font-black uppercase tracking-wider ${
                                    step.isCash ? 'text-emerald-300' : 'text-blue-300'
                                  }`}
                                >
                                  {step.isCash
                                    ? 'Acertar Dinheiro da Gaveta • Mudar Forma de Pagamento'
                                    : 'Reabrir Comanda e Mudar Forma de Pagamento'}
                                </h4>
                                <p className="text-xs text-slate-400">
                                  Realize esta transferência no {currentTenant.pdvSystemName || 'Jclan'} antes de ir para a próxima dica
                                </p>
                              </div>
                            </div>

                            <span
                              className={`text-[11px] font-bold px-3 py-1 rounded-full border ${
                                step.isCash
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                  : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                              }`}
                            >
                              {step.isCash ? '💵 Prioridade 1: Dinheiro' : `🔄 Prioridade: ${step.modalityName}`}
                            </span>
                          </div>

                          <div className="bg-slate-900/90 border border-slate-700/90 rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                            <div className="space-y-2">
                              <p className="text-slate-300 text-sm">
                                No sistema <strong className="text-white">{currentTenant.pdvSystemName || 'Jclan'}</strong>, localize uma comanda (ou soma de comandas) no valor de{' '}
                                <span className="font-black text-white bg-slate-700 px-2.5 py-1 rounded-lg text-base border border-slate-600">
                                  {formatCurrency(inst.amount)}
                                </span>
                              </p>
                              <div className="flex items-center gap-2.5 font-extrabold text-base flex-wrap pt-1">
                                <span className="bg-rose-500/15 text-rose-300 border border-rose-500/30 px-3 py-1 rounded-lg line-through">
                                  Tire de {inst.from}
                                </span>
                                <ArrowRight className="w-5 h-5 text-slate-400" />
                                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-3 py-1 rounded-lg">
                                  Coloque em {inst.to}
                                </span>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                setCompletedReconciliationSteps((prev) => ({
                                  ...prev,
                                  [step.id]: !prev[step.id],
                                }));
                                if (!isStepDone && safeReconciliationStepIdx < reconciliationSteps.length - 1) {
                                  setActiveReconciliationStepIdx((prev) =>
                                    Math.min(reconciliationSteps.length - 1, prev + 1)
                                  );
                                }
                              }}
                              className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                                isStepDone
                                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md'
                                  : 'bg-orange-600 hover:bg-orange-500 text-white shadow-lg shadow-orange-600/25'
                              }`}
                            >
                              <Check className="w-4 h-4" />
                              <span>
                                {isStepDone
                                  ? '✓ Troca Realizada'
                                  : safeReconciliationStepIdx < reconciliationSteps.length - 1
                                  ? 'Concluir Passo e Ir ao Próximo →'
                                  : 'Marcar Passo como Concluído'}
                              </span>
                            </button>
                          </div>
                        </div>
                      );
                    }

                    const { unres, menuOpts, autoNovaOptions } = step;
                        return (
                          <div
                            key={`step-menu-${step.id || idx}-${safeReconciliationStepIdx}`}
                            className={`animate-reconciliation-step p-5 rounded-2xl border-2 transition-all duration-300 ${
                              isCurrentStepCompleted
                                ? 'bg-emerald-950/25 border-emerald-500/80 shadow-lg shadow-emerald-950/30'
                                : step.isCash
                                ? 'bg-emerald-950/20 border-emerald-500 reconciliation-active-cash-glow'
                                : 'bg-slate-800/95 border-orange-500 reconciliation-active-step-glow'
                            }`}
                          >
                            {/* BANNER DE DESTAQUE VISUAL DO PASSO ATUAL (ZERAMENTO VIA CARDÁPIO) */}
                            <div
                              className={`mb-4 px-4 py-3 rounded-xl border flex items-center justify-between flex-wrap gap-3 transition-all ${
                                isCurrentStepCompleted
                                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200'
                                  : step.isCash
                                  ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-100'
                                  : 'bg-orange-500/15 border-orange-500/40 text-orange-100'
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <span
                                  className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                                    isCurrentStepCompleted
                                      ? 'bg-emerald-400'
                                      : step.isCash
                                      ? 'bg-emerald-400 animate-ping'
                                      : 'bg-orange-400 animate-ping'
                                  }`}
                                />
                                <span className="text-xs font-black uppercase tracking-wide">
                                  {isCurrentStepCompleted
                                    ? `✅ Passo ${safeReconciliationStepIdx + 1} (${unres.label}) Concluído! Avance para o próximo passo.`
                                    : `⚡ Passo ${safeReconciliationStepIdx + 1} em Foco (${unres.label}): Marque uma opção abaixo ou conclua este ajuste antes de avançar.`}
                                </span>
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const nextDoneState = !completedReconciliationSteps[step.id];
                                    setCompletedReconciliationSteps((prev) => ({
                                      ...prev,
                                      [step.id]: nextDoneState,
                                    }));
                                    if (nextDoneState && safeReconciliationStepIdx < reconciliationSteps.length - 1) {
                                      setActiveReconciliationStepIdx((prev) =>
                                        Math.min(reconciliationSteps.length - 1, prev + 1)
                                      );
                                    }
                                  }}
                                  className={`px-3 py-1 rounded-lg text-[11px] font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                                    isCurrentStepCompleted
                                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                                      : 'bg-orange-600 hover:bg-orange-500 text-white shadow-sm'
                                  }`}
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>
                                    {isCurrentStepCompleted
                                      ? '✓ Passo Concluído'
                                      : safeReconciliationStepIdx < reconciliationSteps.length - 1
                                      ? 'Concluir e Avançar →'
                                      : 'Marcar Passo Concluído'}
                                  </span>
                                </button>
                              </div>
                            </div>

                            <div className="font-bold text-base mb-3 flex items-center justify-between border-b border-slate-700/80 pb-3 flex-wrap gap-2">
                              <span className="flex items-center gap-2 flex-wrap">
                                {step.isCash ? (
                                  <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-black px-2.5 py-1 rounded-lg">
                                    💵 1º Passo Obrigatório: Dinheiro da Gaveta
                                  </span>
                                ) : (
                                  <span className="bg-orange-500/20 text-orange-300 border border-orange-500/40 text-xs font-black px-2.5 py-1 rounded-lg">
                                    🎯 Passo {safeReconciliationStepIdx + 1}: {unres.label}
                                  </span>
                                )}
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
                                                <Check className="w-3 h-3" /> Zera 100% Exato {opt.centAdjustment > 0 ? `(Desc: ${formatCurrency(opt.centAdjustment)})` : ''}
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
                                    O sistema calculou automaticamente a combinação de itens do cardápio (sem limite de quantidade de itens) para lançar em uma nova comanda no <strong>{currentTenant.pdvSystemName || 'Jclan'}</strong> e absorver a sobra de <strong>{formatCurrency(unres.amount)}</strong>. Lançamento <strong>sempre sem os 10% de taxa</strong>:
                                  </p>

                                  {autoNovaOptions.length === 0 ? (
                                    <div className="bg-amber-950/50 border border-amber-500/40 rounded-xl p-3.5 text-xs text-amber-200 flex items-start gap-2.5">
                                      <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                                      <p>
                                        Nenhuma combinação de itens do cardápio disponível para atingir a sobra de <strong>{formatCurrency(unres.amount)}</strong>. Verifique se há itens ativos (não promocionais) cadastrados no cardápio deste bar no Painel Admin.
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
                                  const cmdSubsets = commandSubsetsByLabel[unres.label] || [];
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

                {/* BARRA DE NAVEGAÇÃO INFERIOR ENTRE OS PASSOS (ESTRITAMENTE 1 PASSO POR VEZ) */}
                {reconciliationSteps.length > 0 && (() => {
                  const currentStep = reconciliationSteps[safeReconciliationStepIdx];
                  const isCurrentDone =
                    !!completedReconciliationSteps[currentStep.id] ||
                    (currentStep.kind === 'menu' && !!selectedExclusionOptions[currentStep.unres.label]);
                  const hasPrev = safeReconciliationStepIdx > 0;
                  const hasNext = safeReconciliationStepIdx < reconciliationSteps.length - 1;
                  const nextStep = hasNext ? reconciliationSteps[safeReconciliationStepIdx + 1] : null;

                  return (
                    <div className="flex items-center justify-between flex-wrap gap-3 pt-4 border-t border-slate-800">
                      <button
                        type="button"
                        disabled={!hasPrev}
                        onClick={() => setActiveReconciliationStepIdx((prev) => Math.max(0, prev - 1))}
                        className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border ${
                          hasPrev
                            ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 cursor-pointer'
                            : 'bg-slate-900/40 text-slate-600 border-slate-800/60 cursor-not-allowed'
                        }`}
                      >
                        <span>← Passo Anterior</span>
                      </button>

                      <div className="text-center text-xs text-slate-400">
                        {hasNext && nextStep ? (
                          <span>
                            {isCurrentDone ? (
                              <>
                                Passo atual concluído! Próxima etapa:{' '}
                                <strong className="text-emerald-300">{nextStep.shortLabel}</strong>
                              </>
                            ) : (
                              <>
                                Conclua <strong className="text-orange-300">{currentStep.shortLabel}</strong> antes de seguir para{' '}
                                <strong className="text-slate-200">{nextStep.shortLabel}</strong>
                              </>
                            )}
                          </span>
                        ) : isCurrentDone ? (
                          <span className="text-emerald-400 font-bold">
                            🎉 Todos os passos da fila de conciliação foram concluídos!
                          </span>
                        ) : (
                          <span className="text-orange-300 font-bold">
                            ⚡ Último passo da fila — conclua esta etapa para finalizar a conciliação!
                          </span>
                        )}
                      </div>

                      {hasNext ? (
                        <button
                          type="button"
                          onClick={() => {
                            if (currentStep) {
                              setCompletedReconciliationSteps((prev) => ({
                                ...prev,
                                [currentStep.id]: true,
                              }));
                            }
                            setActiveReconciliationStepIdx((prev) =>
                              Math.min(reconciliationSteps.length - 1, prev + 1)
                            );
                          }}
                          className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                            isCurrentDone
                              ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/25'
                              : 'bg-orange-600 hover:bg-orange-500 text-white shadow-lg shadow-orange-600/25'
                          }`}
                        >
                          <Check className="w-4 h-4" />
                          <span>
                            {isCurrentDone
                              ? 'Avançar para o Próximo Passo →'
                              : 'Concluir Passo Atual e Avançar →'}
                          </span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            if (currentStep) {
                              setCompletedReconciliationSteps((prev) => ({
                                ...prev,
                                [currentStep.id]: !prev[currentStep.id],
                              }));
                            }
                          }}
                          className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                            isCurrentDone
                              ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/25'
                              : 'bg-orange-600 hover:bg-orange-500 text-white shadow-lg shadow-orange-600/25'
                          }`}
                        >
                          <Check className="w-4 h-4" />
                          <span>{isCurrentDone ? '✓ Último Passo Concluído' : 'Concluir Último Passo'}</span>
                        </button>
                      )}
                    </div>
                  );
                })()}
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

      {/* Modais SaaS Multi-Tenant & Utilitários Carregados Sob Demanda */}
      <Suspense fallback={null}>
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
            onDeleteTenant={handleDeleteTenant}
            onSyncAllTenants={handleSyncAllTenants}
            onRestoreBackup={handleRestoreTenantsBackup}
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
            onOpenUpgradeModal={() => handleTriggerGateUpgrade('general')}
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
            creditBreakdown={creditBreakdown}
            debitBreakdown={debitBreakdown}
            voucherBreakdown={voucherBreakdown}
            onProceedToSaveClosing={() => setIsSaveClosingModalOpen(true)}
            onDownloadPdf={() => handleDownloadClosingPdf()}
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
            onDownloadPdf={(comments, dateSelection) => handleDownloadClosingPdf(comments, dateSelection)}
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

        {/* Modal de Laudo Técnico e Relatório de Divergências para Suporte Técnico */}
        {isSupportModalOpen && (
          <SupportDivergenceModal
            isOpen={isSupportModalOpen}
            onClose={() => setIsSupportModalOpen(false)}
            tenant={currentTenant}
            currentOperator={currentOperator}
            machines={machines}
            jclan={jclan}
            getnetCredit={getnetCredit}
            getnetDebit={getnetDebit}
            getnetVoucher={getnetVoucher}
            getnetPix={getnetPix}
            getnetTotal={getnetTotal}
            jclanTotal={jclanTotal}
            differenceTotal={differenceTotal}
            cashDifference={cashDifference}
            cashTotal={cashTotal}
            expectedCash={expectedCash}
            instructions={instructions}
            unresolvable={unresolvable}
            auditLogs={auditLogs}
            onShowToast={showToast}
          />
        )}

        {/* Drawer de Auditoria do Turno em Tempo Real */}
        {isAuditDrawerOpen && (
          <AuditTrailDrawer
            isOpen={isAuditDrawerOpen}
            onClose={() => setIsAuditDrawerOpen(false)}
            logs={auditLogs}
            currentOperatorName={currentOperator?.name}
            onClearLogs={() => {
              setAuditLogs([]);
              try {
                localStorage.removeItem(`fechacaixa_audit_logs_${currentTenant.id}`);
              } catch {
                // ignore
              }
              showToast('Histórico de auditoria do turno limpo.');
            }}
            onShowToast={showToast}
          />
        )}

        {/* Tutorial Interativo Flutuante com Spotlight e Acompanhamento da Tarefa Real */}
        {isGuideOpen && (
          <InteractiveClosingGuide
            isOpen={isGuideOpen}
            onClose={() => setIsGuideOpen(false)}
            cardName={currentTenant.cardSystemName || 'Maquininhas'}
            pdvName={currentTenant.pdvSystemName || 'PDV'}
            cashTotal={cashTotal}
            hasCashData={
              cashTotal > 0 ||
              parseValue(cashSummary.opening) > 0 ||
              parseValue(cashSummary.jclanCash) > 0 ||
              parseValue(cashSummary.expenses) > 0
            }
            cashOpening={parseValue(cashSummary.opening)}
            cashPdvSales={parseValue(cashSummary.jclanCash)}
            cashExpenses={parseValue(cashSummary.expenses)}
            cashDifference={cashDifference}
            machinesCount={machines.length}
            filledMachinesCount={machines.filter((m) => getMachineCentsSummary(m).totalCents > 0).length}
            getnetTotal={getnetTotal}
            jclanTotal={jclanTotal}
            jclanCredit={jclanCredit}
            jclanDebit={jclanDebit}
            jclanPix={jclanPix}
            jclanVoucher={jclanVoucher}
            differenceTotal={differenceTotal}
            hasDivergences={hasDivergences}
            unresolvableCount={unresolvable.length}
            selectedExclusionCount={Object.keys(selectedExclusionOptions).length}
            instructionsCount={instructions.length}
            onOpenPdvSummary={() => setIsPdvSummaryOpen(true)}
            onOpenSaveClosing={handleOpenSaveClosingModal}
            onDownloadPdf={() => handleDownloadClosingPdf()}
            onAddMachine={handleAddMachine}
            onOpenVoice={() => {
              if (!planCapabilities.canUseAiAssistants) {
                handleTriggerGateUpgrade('ai_voice');
                return;
              }
              setVoiceActiveMachineId(null);
              setIsVoicePanelOpen(true);
            }}
            onShowToast={showToast}
          />
        )}

        {/* Painel Flutuante de Preenchimento por Comando de Voz */}
        {isVoicePanelOpen && (
          <VoiceAssistantPanel
            isOpen={isVoicePanelOpen}
            onOpen={() => setIsVoicePanelOpen(true)}
            onClose={() => setIsVoicePanelOpen(false)}
            activeMachineId={voiceActiveMachineId}
            onSelectMachineId={(id) => setVoiceActiveMachineId(id)}
            machinesCount={machines.length}
            creditFlags={currentTenant.creditFlags}
            debitFlags={currentTenant.debitFlags}
            voucherNames={currentTenant.voucherNames}
            pdvSystemName={currentTenant.pdvSystemName || 'PDV'}
            cardSystemName={currentTenant.cardSystemName || 'Maquininhas'}
            onExecuteVoiceActions={handleExecuteVoiceActions}
            onUndoLastVoiceCommand={handleUndoLastVoiceCommand}
            canUndo={voiceUndoStack.length > 0}
            onShowToast={showToast}
          />
        )}

        {/* Modal de Sincronização em Tempo Real Celular + Computador */}
        {isMultiDeviceModalOpen && (
          <MultiDeviceSyncModal
            isOpen={isMultiDeviceModalOpen}
            onClose={() => setIsMultiDeviceModalOpen(false)}
            tenant={currentTenant}
            currentOperatorName={currentOperator?.name}
            myDeviceId={myDeviceId}
            myDeviceType={myDeviceType}
            connectedDevices={connectedDevices}
            lastSyncedBy={lastSyncedBy}
            lastSyncedAt={lastSyncedAt}
            onForcePullFromCloud={handleForcePullFromCloud}
            onForcePushToCloud={handleForcePushToCloud}
            onCopyLink={(url) => copyToClipboard(url)}
          />
        )}

        {/* Modal de Conexão Direta Sob Demanda Portal Web Jclan + Leitura de Print/Foto */}
        {isJclanSyncModalOpen && (
          <JclanLiveSyncModal
            isOpen={isJclanSyncModalOpen}
            onClose={() => setIsJclanSyncModalOpen(false)}
            tenant={currentTenant}
            apiKey={apiKey}
            lastJclanSyncAt={lastJclanSyncAt}
            lastJclanError={lastJclanError}
            lastPeriodLabel={lastJclanPeriodLabel}
            lastSelectedEmpresaName={lastJclanEmpresaName}
            lastBreakdown={lastJclanBreakdown}
            lastChangeSummary={lastJclanChangeSummary}
            availableCompanies={jclanCompanies}
            canUndoJclan={Boolean(jclanUndoSnapshot)}
            onUndoJclan={handleUndoJclanSync}
            onSavePortalConfig={handleUpdateTenantAppearance}
            onTriggerManualSync={(overrideCreds) => handleTriggerJclanSync(overrideCreds, false)}
            onApplyTotals={(totals, sourceLabel) => applyJclanTotals(totals, sourceLabel, false)}
            onShowToast={showToast}
          />
        )}

        {/* Modal de Upgrade e Comparativo de Planos SaaS (R$ 150 / R$ 200 / R$ 300) */}
        {isUpgradeModalOpen && currentTenant && (
          <UpgradePlanModal
            isOpen={isUpgradeModalOpen}
            onClose={() => setIsUpgradeModalOpen(false)}
            tenant={currentTenant}
            reason={upgradeGateReason}
            onSelectPlan={(newPlan) => handleUpdateTenantPlan(currentTenant.id, newPlan)}
            isMaster={isMasterSession}
          />
        )}

        {/* Modal de Confirmação: Limpar Todas as Informações da Tabela */}
        {isClearTableConfirmOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-800">
              <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center shrink-0">
                    <Eraser className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-800 dark:text-white text-sm">
                      Limpar Informações da Tabela?
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {currentTenant.name}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsClearTableConfirmOpen(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-3">
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Tem certeza que deseja zerar todos os dados preenchidos neste turno?
                </p>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 text-[11px] space-y-1.5 text-slate-500 dark:text-slate-400">
                  <p className="font-bold text-slate-700 dark:text-slate-300">Serão limpos:</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    <li>Valores das maquininhas (Crédito, Débito, Pix e Voucher)</li>
                    <li>Contagem de notas e moedas da gaveta de dinheiro</li>
                    <li>Totais importados ou preenchidos do PDV ({currentTenant.pdvSystemName || 'Jclan'})</li>
                    <li>Abertura de caixa e despesas informadas</li>
                  </ul>
                </div>
                <p className="text-[10px] text-slate-400">
                  💡 O histórico de fechamentos anteriores já salvos <strong>não</strong> será afetado.
                </p>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-950/90 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsClearTableConfirmOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleExecuteClearAllTable}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black shadow-md shadow-rose-600/30 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Eraser className="w-3.5 h-3.5" />
                  <span>Sim, Limpar Tudo</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </Suspense>
    </div>
  );
}
