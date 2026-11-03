import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  X,
  ShieldCheck,
  Users,
  History,
  Palette,
  Utensils,
  Plus,
  Trash2,
  Edit3,
  Check,
  Copy,
  Image as ImageIcon,
  Upload,
  ZoomIn,
  AlertCircle,
  FileText,
  DollarSign,
  CreditCard,
  Sparkles,
  ExternalLink,
  MessageSquare,
  Settings,
  Search,
  QrCode,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Key,
  Timer,
  Clock,
  Zap,
  ChevronLeft,
  ChevronRight,
  Calculator,
  Filter,
  FileSpreadsheet,
  Bell,
  Volume2,
  VolumeX,
  Sun,
  Moon,
  Download
} from 'lucide-react';
import { Tenant, TenantUser, HistoryRecord, MenuItem, Invoice, AuditLogEntry, isHappyHourOrPromoItem, PLAN_DETAILS } from '../../types/saas.ts';
import { formatCurrency } from '../../App.tsx';
import { THEME_PALETTES, LOGIN_BG_PRESETS, getTheme } from '../../utils/theme.ts';
import { PdfMenuImportModal } from './PdfMenuImportModal.tsx';
import { playClosingReminderChime } from '../../utils/audioAlert.ts';
import { AutoBackupSettings, AutoBackupFrequency } from '../../utils/closingPersistence.ts';

interface BarAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenant: Tenant;
  currentOperator: TenantUser | null;
  users: TenantUser[];
  history: HistoryRecord[];
  currentShiftAuditLogs?: AuditLogEntry[];
  onOpenLiveAuditDrawer?: () => void;
  menu: MenuItem[];
  invoices: Invoice[];
  apiKey: string;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
  onSaveApiKey: (key: string) => void;
  onAddUser: (user: { name: string; pin: string; isAdmin: boolean }) => Promise<void>;
  onUpdateUser: (userId: number, updates: Partial<TenantUser>) => Promise<void>;
  onDeleteUser: (userId: number) => Promise<void>;
  onDeleteClosing: (closingId: number) => Promise<void>;
  onImportClosings?: (closings: HistoryRecord[]) => Promise<void>;
  autoBackupSettings?: AutoBackupSettings;
  onUpdateAutoBackupSettings?: (updates: Partial<AutoBackupSettings>) => void;
  onTriggerFullBackupDownload?: () => Promise<void> | void;
  onRestoreFullBackup?: (payload: any) => Promise<void>;
  onSaveMenu: (items: MenuItem[]) => Promise<void>;
  onConfirmPayment: (invoiceId: string) => Promise<void>;
  onUpdateTenantAppearance: (updates: Partial<Tenant>) => Promise<void>;
  onZoomImage: (url: string) => void;
  onShowToast: (msg: string) => void;
  onOpenUpgradeModal?: () => void;
}

export const BarAdminModal: React.FC<BarAdminModalProps> = ({
  isOpen,
  onClose,
  tenant,
  currentOperator,
  users,
  history,
  currentShiftAuditLogs = [],
  onOpenLiveAuditDrawer,
  menu,
  invoices,
  apiKey,
  isDarkMode = true,
  onToggleDarkMode,
  onSaveApiKey,
  onAddUser,
  onUpdateUser,
  onDeleteUser,
  onDeleteClosing,
  onImportClosings,
  autoBackupSettings,
  onUpdateAutoBackupSettings,
  onTriggerFullBackupDownload,
  onRestoreFullBackup,
  onSaveMenu,
  onConfirmPayment,
  onUpdateTenantAppearance,
  onZoomImage,
  onShowToast,
  onOpenUpgradeModal,
}) => {
  const [activeTab, setActiveTab] = useState<'users' | 'history' | 'menu' | 'reminder' | 'billing' | 'ai' | 'appearance'>('users');

  // --- ESTADOS: OPERADORES ---
  const [newUserForm, setNewUserForm] = useState({ name: '', pin: '', isAdmin: false });
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [editUserForm, setEditUserForm] = useState({ name: '', pin: '', isAdmin: false });

  // --- ESTADOS: CALENDÁRIO DO HISTÓRICO & AUDITORIA ---
  const [calendarYear, setCalendarYear] = useState<number>(() => new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState<number>(() => new Date().getMonth());
  const [selectedHistoryDateKey, setSelectedHistoryDateKey] = useState<string | null>(null);
  const [auditFilterByRecord, setAuditFilterByRecord] = useState<Record<number, string>>({});
  const [auditSearchByRecord, setAuditSearchByRecord] = useState<Record<number, string>>({});
  const [showLiveShiftAuditInHistory, setShowLiveShiftAuditInHistory] = useState<boolean>(false);

  // --- ESTADOS: CARDÁPIO ---
  const [menuSearchTerm, setMenuSearchTerm] = useState('');
  const [visibleMenuCount, setVisibleMenuCount] = useState(60);
  const [newMenuItem, setNewMenuItem] = useState({ name: '', price: '' });
  const [editingMenuItemIndex, setEditingMenuItemIndex] = useState<number | null>(null);
  const [editingMenuItemPrice, setEditingMenuItemPrice] = useState<string>('');
  const [isSavingMenu, setIsSavingMenu] = useState(false);
  const [isPdfImportOpen, setIsPdfImportOpen] = useState(false);

  useEffect(() => {
    setVisibleMenuCount(60);
  }, [menuSearchTerm, tenant.id]);

  // --- ESTADOS: LEMBRETE DE FECHAMENTO ---
  const [reminderEnabled, setReminderEnabled] = useState<boolean>(tenant.closingReminderEnabled ?? false);
  const [reminderTime, setReminderTime] = useState<string>(tenant.closingReminderTime || '02:00');
  const [reminderSound, setReminderSound] = useState<boolean>(tenant.closingReminderSound ?? true);
  const [isSavingReminder, setIsSavingReminder] = useState(false);
  const [isPlayingTestSound, setIsPlayingTestSound] = useState(false);

  // --- ESTADOS: ASSINATURA ---
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [copiedPix, setCopiedPix] = useState(false);

  // --- ESTADOS: IA GEMINI ---
  const [customKeyInput, setCustomKeyInput] = useState(apiKey || '');

  // --- ESTADOS: APARÊNCIA ---
  const [selectedBg, setSelectedBg] = useState<string>(
    tenant.loginBgImage || LOGIN_BG_PRESETS[0].url
  );
  const [customBgUrl, setCustomBgUrl] = useState<string>('');
  const [selectedThemeColor, setSelectedThemeColor] = useState<string>(tenant.themeColor || 'orange');
  const [selectedAvatarUrl, setSelectedAvatarUrl] = useState<string>(tenant.logoAvatarUrl || '');
  const [customAvatarUrlInput, setCustomAvatarUrlInput] = useState<string>('');
  const [selectedLogoInitials, setSelectedLogoInitials] = useState<string>(
    tenant.logoInitials || (tenant.name ? tenant.name.slice(0, 2).toUpperCase() : 'BR')
  );
  const [adminPdvSystemName, setAdminPdvSystemName] = useState<string>(tenant.pdvSystemName ?? '');
  const [adminCardSystemName, setAdminCardSystemName] = useState<string>(tenant.cardSystemName ?? '');
  const [adminCreditFlags, setAdminCreditFlags] = useState<string>(
    (tenant.creditFlags && tenant.creditFlags.length > 0 ? tenant.creditFlags : []).join(', ')
  );
  const [adminDebitFlags, setAdminDebitFlags] = useState<string>(
    (tenant.debitFlags && tenant.debitFlags.length > 0 ? tenant.debitFlags : []).join(', ')
  );
  const [adminVoucherNames, setAdminVoucherNames] = useState<string>(
    (tenant.voucherNames && tenant.voucherNames.length > 0 ? tenant.voucherNames : []).join(', ')
  );
  const [isSavingAppearance, setIsSavingAppearance] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSelectedBg(tenant.loginBgImage || LOGIN_BG_PRESETS[0].url);
    setSelectedThemeColor(tenant.themeColor || 'orange');
    setSelectedAvatarUrl(tenant.logoAvatarUrl || '');
    setSelectedLogoInitials(
      tenant.logoInitials || (tenant.name ? tenant.name.slice(0, 2).toUpperCase() : 'BR')
    );
    setAdminPdvSystemName(tenant.pdvSystemName ?? '');
    setAdminCardSystemName(tenant.cardSystemName ?? '');
    setAdminCreditFlags(
      (tenant.creditFlags && tenant.creditFlags.length > 0 ? tenant.creditFlags : []).join(', ')
    );
    setAdminDebitFlags(
      (tenant.debitFlags && tenant.debitFlags.length > 0 ? tenant.debitFlags : []).join(', ')
    );
    setAdminVoucherNames(
      (tenant.voucherNames && tenant.voucherNames.length > 0 ? tenant.voucherNames : []).join(', ')
    );
    setReminderEnabled(tenant.closingReminderEnabled ?? false);
    setReminderTime(tenant.closingReminderTime || '02:00');
    setReminderSound(tenant.closingReminderSound ?? true);
  }, [tenant]);

  const parseRecordDate = (
    record: HistoryRecord
  ): { key: string; year: number; month: number; day: number; time: string } => {
    const timeMatch = (record.date || '').match(/(\d{1,2}:\d{2})/);
    const time = timeMatch ? timeMatch[1] : '';

    // 1. Prioridade absoluta: chave de data explícita YYYY-MM-DD
    if (record.closingDateKey && /^\d{4}-\d{1,2}-\d{1,2}$/.test(record.closingDateKey.trim())) {
      const parts = record.closingDateKey.trim().split('-').map(Number);
      const year = parts[0];
      const month = parts[1] - 1;
      const day = parts[2];
      const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      return { key, year, month, day, time };
    }

    const dateStr = (record.date || '').trim();

    // 2. Formato YYYY-MM-DD no texto
    const isoMatch = dateStr.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (isoMatch) {
      const year = parseInt(isoMatch[1], 10);
      const month = parseInt(isoMatch[2], 10) - 1;
      const day = parseInt(isoMatch[3], 10);
      const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      return { key, year, month, day, time };
    }

    // 3. Formato com barra: DD/MM/YYYY ou MM/DD/YYYY
    const slashMatch = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (slashMatch) {
      const first = parseInt(slashMatch[1], 10);
      const second = parseInt(slashMatch[2], 10);
      const year = parseInt(slashMatch[3], 10);

      let day = first;
      let month = second - 1;

      // Se o segundo número for > 12, então era MM/DD/YYYY
      if (second > 12 && first <= 12) {
        month = first - 1;
        day = second;
      }

      const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      return { key, year, month, day, time };
    }

    // 4. createdAt ISO timestamp
    if (record.createdAt) {
      const d = new Date(record.createdAt);
      if (!isNaN(d.getTime())) {
        const year = d.getFullYear();
        const month = d.getMonth();
        const day = d.getDate();
        const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return { key, year, month, day, time: time || d.toTimeString().slice(0, 5) };
      }
    }

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const day = now.getDate();
    return {
      key: `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      year,
      month,
      day,
      time: '',
    };
  };

  useEffect(() => {
    if (isOpen && history.length > 0) {
      const latestParsed = parseRecordDate(history[0]);
      setCalendarYear(latestParsed.year);
      setCalendarMonth(latestParsed.month);
    }
  }, [isOpen, tenant.id, history.length]);

  // --- HANDLERS CARDÁPIO ---
  const normalizeSearchText = (str: string) =>
    (str || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9.,\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  const filteredMenuItemsWithIndex = useMemo(() => {
    const normalizedMenuQuery = normalizeSearchText(menuSearchTerm);
    const queryTokens = normalizedMenuQuery ? normalizedMenuQuery.split(' ').filter(Boolean) : [];
    return menu
      .map((item, originalIdx) => ({ item, originalIdx }))
      .filter(({ item }) => {
        if (queryTokens.length === 0) return true;
        const itemPriceComma = Number(item.price || 0).toFixed(2).replace('.', ',');
        const itemPriceDot = Number(item.price || 0).toFixed(2);
        const searchableContent = `${normalizeSearchText(item.name)} ${itemPriceComma} ${itemPriceDot}`;
        return queryTokens.every((token) => searchableContent.includes(token));
      });
  }, [menu, menuSearchTerm]);

  const visibleMenuItemsWithIndex = useMemo(
    () => filteredMenuItemsWithIndex.slice(0, visibleMenuCount),
    [filteredMenuItemsWithIndex, visibleMenuCount]
  );

  // Agrupa fechamentos por data YYYY-MM-DD (Memoizado)
  const recordsByDateKey = useMemo(() => {
    return history.reduce<Record<string, HistoryRecord[]>>((acc, rec) => {
      const { key } = parseRecordDate(rec);
      if (!acc[key]) acc[key] = [];
      acc[key].push(rec);
      return acc;
    }, {});
  }, [history]);

  if (!isOpen) return null;

  const currentTheme = getTheme(tenant.themeColor);
  const previewTheme = getTheme(selectedThemeColor);
  const isOverdue = tenant.status === 'inadimplente' || tenant.status === 'bloqueado';
  const currentInvoice = invoices && invoices.length > 0 ? invoices[0] : null;

  // --- HANDLERS OPERADORES ---
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserForm.name.trim() || !newUserForm.pin.trim()) {
      onShowToast('Preencha nome e PIN.');
      return;
    }
    if (users.some((u) => u.name.toLowerCase() === newUserForm.name.toLowerCase().trim())) {
      onShowToast('Este operador já está cadastrado nesta casa.');
      return;
    }
    await onAddUser({
      name: newUserForm.name.trim(),
      pin: newUserForm.pin.trim(),
      isAdmin: newUserForm.isAdmin,
    });
    setNewUserForm({ name: '', pin: '', isAdmin: false });
  };

  const handleStartEdit = (user: TenantUser) => {
    setEditingUserId(user.id);
    setEditUserForm({ name: user.name, pin: user.pin, isAdmin: user.isAdmin });
  };

  const handleSaveEdit = async () => {
    if (!editUserForm.name.trim() || !editUserForm.pin.trim() || !editingUserId) {
      onShowToast('Preencha nome e PIN.');
      return;
    }
    await onUpdateUser(editingUserId, {
      name: editUserForm.name.trim(),
      pin: editUserForm.pin.trim(),
      isAdmin: editUserForm.isAdmin,
    });
    setEditingUserId(null);
  };

  const handleAddMenuItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMenuItem.name.trim() || !newMenuItem.price.trim()) {
      onShowToast('Informe o nome e o preço do item.');
      return;
    }
    const priceNum = parseFloat(newMenuItem.price.replace(',', '.')) || 0;
    if (priceNum <= 0) {
      onShowToast('Preço inválido.');
      return;
    }

    const addedName = newMenuItem.name.trim();
    const updated = [
      { name: addedName, price: priceNum, cat: 'Geral' },
      ...menu,
    ];

    setIsSavingMenu(true);
    try {
      await onSaveMenu(updated);
      setNewMenuItem({ name: '', price: '' });
      onShowToast(`Item "${addedName}" adicionado ao cardápio com sucesso!`);
    } catch {
      onShowToast('Erro ao salvar item.');
    } finally {
      setIsSavingMenu(false);
    }
  };

  const handleDeleteMenuItem = async (originalIdx: number, itemName: string) => {
    const updated = menu.filter((_, idx) => idx !== originalIdx);
    setIsSavingMenu(true);
    try {
      await onSaveMenu(updated);
      onShowToast(`Item "${itemName}" removido do cardápio.`);
    } catch {
      onShowToast('Erro ao remover item.');
    } finally {
      setIsSavingMenu(false);
    }
  };

  const handleClearMenu = async () => {
    setIsSavingMenu(true);
    try {
      await onSaveMenu([]);
      onShowToast(`Todos os itens do cardápio de ${tenant.name} foram removidos.`);
    } catch {
      onShowToast('Erro ao limpar cardápio.');
    } finally {
      setIsSavingMenu(false);
    }
  };

  const handleSaveItemPrice = async (originalIdx: number, originalItem: MenuItem) => {
    const newPriceNum = parseFloat(editingMenuItemPrice.replace(',', '.')) || 0;
    if (newPriceNum <= 0) {
      onShowToast('Preço inválido.');
      return;
    }
    const updated = menu.map((i, idx) =>
      idx === originalIdx ? { ...i, price: newPriceNum } : i
    );
    setIsSavingMenu(true);
    try {
      await onSaveMenu(updated);
      setEditingMenuItemIndex(null);
      onShowToast(`Preço de "${originalItem.name}" atualizado para ${formatCurrency(newPriceNum)}.`);
    } catch {
      onShowToast('Erro ao atualizar preço.');
    } finally {
      setIsSavingMenu(false);
    }
  };

  const handleToggleMenuItemPromo = async (originalIdx: number, originalItem: MenuItem) => {
    const nextPromo = !isHappyHourOrPromoItem(originalItem);
    const updated = menu.map((i, idx) =>
      idx === originalIdx ? { ...i, isPromo: nextPromo } : i
    );
    setIsSavingMenu(true);
    try {
      await onSaveMenu(updated);
      onShowToast(
        nextPromo
          ? `🚫 "${originalItem.name}" marcado como Happy Hour / Promocional (bloqueado nas sugestões de fechamento).`
          : `✓ "${originalItem.name}" liberado para sugestões normais de fechamento.`
      );
    } catch {
      onShowToast('Erro ao atualizar regra do item.');
    } finally {
      setIsSavingMenu(false);
    }
  };

  const handleApplyPdfMenu = async (newItems: MenuItem[], mode: 'replace' | 'merge') => {
    setIsSavingMenu(true);
    try {
      let finalMenu: MenuItem[] = [];
      if (mode === 'replace') {
        finalMenu = [...newItems];
      } else {
        const existingMap = new Map<string, MenuItem>();
        menu.forEach((item) => existingMap.set(item.name.toLowerCase().trim(), item));
        newItems.forEach((item) => existingMap.set(item.name.toLowerCase().trim(), item));
        finalMenu = Array.from(existingMap.values());
      }
      await onSaveMenu(finalMenu);
      onShowToast(`Cardápio atualizado com sucesso (${finalMenu.length} itens no total)!`);
    } catch {
      onShowToast('Erro ao salvar o cardápio importado.');
    } finally {
      setIsSavingMenu(false);
    }
  };

  // --- HANDLERS ASSINATURA ---
  const copyPixToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedPix(true);
      onShowToast('Código Pix Copia e Cola copiado com sucesso!');
      setTimeout(() => setCopiedPix(false), 3000);
    } catch {
      onShowToast('Selecione e copie o código Pix manualmente.');
    }
  };

  const handleSimulatePayment = async (invId: string) => {
    setIsProcessingPayment(true);
    try {
      await onConfirmPayment(invId);
      onShowToast('🎉 Pagamento aprovado via Webhook! Licença renovada por +30 dias.');
    } catch {
      onShowToast('Erro ao confirmar pagamento.');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // --- HANDLERS IA GEMINI ---
  const handleSaveGeminiKey = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveApiKey(customKeyInput.trim());
    onShowToast('Configurações da Gemini AI salvas com sucesso!');
  };

  // --- HANDLERS LEMBRETE DE FECHAMENTO ---
  const handleSaveReminderSettings = async () => {
    setIsSavingReminder(true);
    try {
      await onUpdateTenantAppearance({
        closingReminderEnabled: reminderEnabled,
        closingReminderTime: reminderTime,
        closingReminderSound: reminderSound,
      });
      onShowToast(
        reminderEnabled
          ? `⏰ Lembrete de Fechamento configurado para as ${reminderTime} com sucesso!`
          : 'Lembrete de Fechamento desativado.'
      );
    } catch {
      onShowToast('Erro ao salvar configurações do lembrete.');
    } finally {
      setIsSavingReminder(false);
    }
  };

  const handleTestReminderSound = async () => {
    setIsPlayingTestSound(true);
    try {
      const ok = await playClosingReminderChime();
      if (ok) {
        onShowToast('🔔 Alerta sonoro de teste reproduzido com sucesso!');
      } else {
        onShowToast('Clique na página para autorizar a reprodução de áudio.');
      }
    } catch {
      onShowToast('Erro ao reproduzir áudio no navegador.');
    } finally {
      setTimeout(() => setIsPlayingTestSound(false), 2200);
    }
  };

  // --- HANDLERS APARÊNCIA ---
  const handleUploadAvatarFile = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!file.type.startsWith('image/')) {
      onShowToast('Por favor, selecione um arquivo de imagem para o avatar.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const img = new Image();
        img.onload = async () => {
          const canvas = document.createElement('canvas');
          const maxSize = 240;
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > maxSize) {
              height = Math.round((height * maxSize) / width);
              width = maxSize;
            }
          } else {
            if (height > maxSize) {
              width = Math.round((width * maxSize) / height);
              height = maxSize;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressedDataUrl = canvas.toDataURL('image/png', 0.9);
            setSelectedAvatarUrl(compressedDataUrl);
            try {
              await onUpdateTenantAppearance({ logoAvatarUrl: compressedDataUrl });
              onShowToast('Avatar do bar atualizado com sucesso!');
            } catch {
              onShowToast('Avatar carregado! Clique em Salvar Aparência para confirmar.');
            }
          }
        };
        img.src = reader.result;
      }
    };
    reader.readAsDataURL(file);
  };

  const handleUploadBgFile = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!file.type.startsWith('image/')) {
      onShowToast('Por favor, selecione um arquivo de imagem.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result) {
        setSelectedBg(reader.result as string);
        onShowToast('Imagem de fundo carregada com sucesso!');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveAppearance = async () => {
    setIsSavingAppearance(true);
    try {
      const palette = THEME_PALETTES[selectedThemeColor] || THEME_PALETTES.orange;
      const parsedCredits = adminCreditFlags
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const parsedDebits = adminDebitFlags
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const parsedVouchers = adminVoucherNames
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const cleanInitials =
        selectedLogoInitials.trim() ||
        (tenant.name ? tenant.name.slice(0, 2).toUpperCase() : 'BR');

      await onUpdateTenantAppearance({
        loginBgImage: selectedBg,
        themeColor: selectedThemeColor,
        primaryColor: palette.primaryHex,
        logoColor: palette.logoGradient,
        logoAvatarUrl: selectedAvatarUrl.trim(),
        logoInitials: cleanInitials,
        pdvSystemName: adminPdvSystemName.trim(),
        cardSystemName: adminCardSystemName.trim(),
        creditFlags: parsedCredits,
        debitFlags: parsedDebits,
        voucherNames: parsedVouchers,
      });
      onShowToast('Avatar, aparência, sistemas e bandeiras de cartões atualizados!');
    } catch {
      onShowToast('Erro ao salvar personalização visual.');
    } finally {
      setIsSavingAppearance(false);
    }
  };

  const copyReportToClipboard = async (text: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        onShowToast('Relatório copiado para a área de transferência!');
        return;
      }
    } catch {
      // Fallback
    }
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    onShowToast('Relatório copiado para a área de transferência!');
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden my-6 border border-slate-200 flex flex-col max-h-[92vh]">
        {/* Top Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div
              className={`w-11 h-11 rounded-2xl bg-gradient-to-tr ${tenant.logoColor || currentTheme.logoGradient} flex items-center justify-center font-black text-base text-white shadow-lg overflow-hidden shrink-0`}
            >
              {tenant.logoAvatarUrl ? (
                <img
                  src={tenant.logoAvatarUrl}
                  alt={tenant.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                tenant.logoInitials || 'FB'
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-lg tracking-wide text-white">
                  Área do Administrador • {tenant.name}
                </h3>
                <span className="bg-amber-400 text-slate-950 text-[10px] uppercase font-black px-2 py-0.5 rounded shadow-xs">
                  Acesso Restrito
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                Gestão exclusiva de operadores, histórico com comprovantes, cardápio, assinatura e IA Gemini
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Abas de Navegação */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-4 sm:px-5 gap-1 sm:gap-2 pt-2 overflow-x-auto select-none">
          <button
            onClick={() => setActiveTab('users')}
            className={`py-3 px-3 sm:px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'users'
                ? 'border-orange-500 text-orange-600 bg-white rounded-t-xl shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Operadores ({users.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`py-3 px-3 sm:px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'history'
                ? 'border-orange-500 text-orange-600 bg-white rounded-t-xl shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Histórico ({history.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('menu')}
            className={`py-3 px-3 sm:px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'menu'
                ? 'border-orange-500 text-orange-600 bg-white rounded-t-xl shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Utensils className="w-4 h-4" />
            <span>Cardápio & Preços ({menu.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('reminder')}
            className={`py-3 px-3 sm:px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'reminder'
                ? 'border-orange-500 text-orange-600 bg-white rounded-t-xl shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Clock className="w-4 h-4 text-amber-500" />
            <span>Lembrete de Fechamento</span>
            {reminderEnabled && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse ml-0.5" title="Lembrete Ativo" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('billing')}
            className={`py-3 px-3 sm:px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'billing'
                ? 'border-orange-500 text-orange-600 bg-white rounded-t-xl shadow-xs'
                : isOverdue
                ? 'border-transparent text-rose-600 font-black animate-pulse'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Assinatura SaaS</span>
          </button>
          <button
            onClick={() => setActiveTab('ai')}
            className={`py-3 px-3 sm:px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'ai'
                ? 'border-orange-500 text-orange-600 bg-white rounded-t-xl shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sparkles className="w-4 h-4 text-blue-500" />
            <span>IA Gemini</span>
          </button>
          <button
            onClick={() => setActiveTab('appearance')}
            className={`py-3 px-3 sm:px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'appearance'
                ? 'border-orange-500 text-orange-600 bg-white rounded-t-xl shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Palette className="w-4 h-4" />
            <span>Aparência</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50">
          {/* ========================================================= */}
          {/* 1. ABA OPERADORES */}
          {/* ========================================================= */}
          {activeTab === 'users' && (
            <div className="space-y-6">
              {/* Formulário Novo Operador */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-orange-500" /> Cadastrar Novo Operador no {tenant.name}
                </h4>
                <form onSubmit={handleCreateUser} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                  <div className="sm:col-span-5">
                    <label className="block text-xs font-bold text-slate-500 mb-1">Nome do Operador</label>
                    <input
                      type="text"
                      required
                      value={newUserForm.name}
                      onChange={(e) => setNewUserForm({ ...newUserForm, name: e.target.value })}
                      placeholder="Ex: mariana"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <label className="block text-xs font-bold text-slate-500 mb-1">PIN / Senha</label>
                    <input
                      type="text"
                      required
                      value={newUserForm.pin}
                      onChange={(e) => setNewUserForm({ ...newUserForm, pin: e.target.value })}
                      placeholder="Ex: 4321"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div className="sm:col-span-4 flex items-center justify-between gap-2">
                    <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-slate-600 select-none">
                      <input
                        type="checkbox"
                        checked={newUserForm.isAdmin}
                        onChange={(e) => setNewUserForm({ ...newUserForm, isAdmin: e.target.checked })}
                        className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500"
                      />
                      <span>Privilégio Admin</span>
                    </label>
                    <button
                      type="submit"
                      className="bg-orange-600 hover:bg-orange-500 text-white font-black text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 shadow-md transition-all active:scale-95 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Adicionar
                    </button>
                  </div>
                </form>
              </div>

              {/* Tabela de Operadores */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                  <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">
                    Equipe do Caixa ({users.length} operadores ativos)
                  </h4>
                  <span className="text-[11px] text-slate-400 font-medium">
                    Somente operadores marcados como Admin têm acesso a esta área
                  </span>
                </div>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-400 text-[11px] uppercase tracking-wider">
                      <th className="p-3 border-b">Operador</th>
                      <th className="p-3 border-b">PIN de Acesso</th>
                      <th className="p-3 border-b">Permissão</th>
                      <th className="p-3 border-b text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                        {editingUserId === u.id ? (
                          <>
                            <td className="p-2">
                              <input
                                type="text"
                                value={editUserForm.name}
                                onChange={(e) => setEditUserForm({ ...editUserForm, name: e.target.value })}
                                className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-xs font-bold"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={editUserForm.pin}
                                onChange={(e) => setEditUserForm({ ...editUserForm, pin: e.target.value })}
                                className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-xs font-mono font-bold"
                              />
                            </td>
                            <td className="p-2">
                              <label className="flex items-center gap-1 text-xs font-bold text-slate-700 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={editUserForm.isAdmin}
                                  onChange={(e) => setEditUserForm({ ...editUserForm, isAdmin: e.target.checked })}
                                />
                                <span>Admin</span>
                              </label>
                            </td>
                            <td className="p-2 text-right">
                              <button
                                onClick={handleSaveEdit}
                                className="text-emerald-600 hover:text-emerald-700 mr-2 p-1.5 rounded-lg hover:bg-emerald-50 cursor-pointer"
                                title="Salvar"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setEditingUserId(null)}
                                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
                                title="Cancelar"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="p-3 text-xs font-bold capitalize text-slate-800">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px] font-black">
                                  {u.name.slice(0, 2).toUpperCase()}
                                </div>
                                <span>{u.name}</span>
                                {currentOperator?.id === u.id && (
                                  <span className="text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0.2 rounded font-bold">
                                    Você
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-3 text-xs font-mono font-bold text-slate-600">{u.pin}</td>
                            <td className="p-3">
                              {u.isAdmin ? (
                                <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md text-[10px] font-black uppercase border border-amber-200">
                                  Admin
                                </span>
                              ) : (
                                <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md text-[10px] font-bold">
                                  Operador Comum
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-right">
                              <button
                                onClick={() => handleStartEdit(u)}
                                className="text-blue-600 hover:text-blue-800 mr-2 p-1.5 rounded-lg hover:bg-blue-50 cursor-pointer transition-colors"
                                title="Editar"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              {u.id !== currentOperator?.id && (
                                <button
                                  onClick={() => onDeleteUser(u.id)}
                                  className="text-rose-500 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-50 cursor-pointer transition-colors"
                                  title="Excluir operador"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 2. ABA HISTÓRICO RESUMIDA EM CALENDÁRIO INTERATIVO */}
          {/* ========================================================= */}
          {activeTab === 'history' && (() => {
            const MONTH_NAMES = [
              'Janeiro',
              'Fevereiro',
              'Março',
              'Abril',
              'Maio',
              'Junho',
              'Julho',
              'Agosto',
              'Setembro',
              'Outubro',
              'Novembro',
              'Dezembro',
            ];
            const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

            // Cálculo dos dias do mês atual no calendário
            const firstDayOfWeek = new Date(calendarYear, calendarMonth, 1).getDay();
            const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
            const today = new Date();
            const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

            const handlePrevMonth = () => {
              setSelectedHistoryDateKey(null);
              if (calendarMonth === 0) {
                setCalendarMonth(11);
                setCalendarYear((y) => y - 1);
              } else {
                setCalendarMonth((m) => m - 1);
              }
            };

            const handleNextMonth = () => {
              setSelectedHistoryDateKey(null);
              if (calendarMonth === 11) {
                setCalendarMonth(0);
                setCalendarYear((y) => y + 1);
              } else {
                setCalendarMonth((m) => m + 1);
              }
            };

            const handleGoToToday = () => {
              const now = new Date();
              setCalendarYear(now.getFullYear());
              setCalendarMonth(now.getMonth());
              const tKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
              setSelectedHistoryDateKey(tKey);
            };

            const handleGoToYesterday = () => {
              const yest = new Date(Date.now() - 24 * 60 * 60 * 1000);
              setCalendarYear(yest.getFullYear());
              setCalendarMonth(yest.getMonth());
              const yestKey = `${yest.getFullYear()}-${String(yest.getMonth() + 1).padStart(2, '0')}-${String(yest.getDate()).padStart(2, '0')}`;
              setSelectedHistoryDateKey(yestKey);
            };

            const handleGoToLatestClosing = () => {
              if (history.length === 0) return;
              const latest = parseRecordDate(history[0]);
              setCalendarYear(latest.year);
              setCalendarMonth(latest.month);
              setSelectedHistoryDateKey(latest.key);
            };

            // Fechamentos do mês selecionado no calendário
            const monthPrefix = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-`;
            const monthClosingsCount = Object.entries(recordsByDateKey)
              .filter(([key]) => key.startsWith(monthPrefix))
              .reduce((sum, [_, list]) => sum + list.length, 0);

            const selectedDayRecords = selectedHistoryDateKey
              ? recordsByDateKey[selectedHistoryDateKey] || []
              : [];

            const formatSelectedDateDisplay = (key: string) => {
              const parts = key.split('-');
              if (parts.length !== 3) return key;
              return `${parts[2]}/${parts[1]}/${parts[0]}`;
            };

            const getAuditCategoryBadge = (cat: AuditLogEntry['category']) => {
              switch (cat) {
                case 'zeramento':
                  return {
                    label: 'Zeramento',
                    bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
                    icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />,
                  };
                case 'comanda':
                  return {
                    label: 'Comanda / Simulação',
                    bg: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
                    icon: <Calculator className="w-3.5 h-3.5 text-purple-400" />,
                  };
                case 'pdv':
                  return {
                    label: `PDV (${tenant.pdvSystemName || 'Jclan'})`,
                    bg: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
                    icon: <FileSpreadsheet className="w-3.5 h-3.5 text-blue-400" />,
                  };
                case 'cartoes':
                  return {
                    label: `Cartões (${tenant.cardSystemName || 'Getnet'}) / OCR`,
                    bg: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
                    icon: <CreditCard className="w-3.5 h-3.5 text-indigo-400" />,
                  };
                case 'gaveta':
                  return {
                    label: 'Gaveta Dinheiro',
                    bg: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
                    icon: <DollarSign className="w-3.5 h-3.5 text-amber-400" />,
                  };
                case 'sistema':
                default:
                  return {
                    label: 'Sistema',
                    bg: 'bg-slate-700/60 text-slate-300 border-slate-600',
                    icon: <ShieldCheck className="w-3.5 h-3.5 text-slate-300" />,
                  };
              }
            };

            const getEffectiveAuditTrail = (record: HistoryRecord): AuditLogEntry[] => {
              if (record.auditTrail && record.auditTrail.length > 0) {
                return record.auditTrail;
              }
              // Síntese automática da linha do tempo para fechamentos antigos que não possuíam auditTrail salvo
              const op = record.operator || 'Operador';
              const endTimeMatch = (record.date || '').match(/(\d{1,2}:\d{2})/);
              const endTime = endTimeMatch ? endTimeMatch[1] : '23:45';
              const startTime = record.shiftStartedAt || '23:30';
              const pdvName = tenant.pdvSystemName || 'Jclan';
              const cardName = tenant.cardSystemName || 'Getnet';

              const synthesized: AuditLogEntry[] = [
                {
                  id: `syn_${record.id}_end`,
                  timestamp: `${endTime}:00`,
                  operator: op,
                  category: 'sistema',
                  action: 'Fechamento de Caixa Salvo',
                  details: `Fechamento salvo por ${op} em ${record.durationFormatted || '10 min'} (Diferença Cartões: ${formatCurrency(
                    record.diff || 0
                  )}, Gaveta: ${formatCurrency(record.cashDiff || 0)})`,
                },
              ];

              if (record.selectedExclusionOptions && Object.keys(record.selectedExclusionOptions).length > 0) {
                Object.entries(record.selectedExclusionOptions).forEach(([label, opt], idx) => {
                  synthesized.push({
                    id: `syn_${record.id}_zer_${idx}`,
                    timestamp: `${endTime}`,
                    operator: op,
                    category: 'zeramento',
                    action: `Marcou opção para fechamento final (${label})`,
                    details: `${opt.title} -> ${opt.instruction}`,
                  });
                });
              }

              synthesized.push(
                {
                  id: `syn_${record.id}_pdv`,
                  timestamp: `${endTime}`,
                  operator: op,
                  category: 'pdv',
                  action: `Preencheu totais no ${pdvName}`,
                  details: `Valores conferidos no relatório ${pdvName}: ${formatCurrency(record.jclan)}`,
                },
                {
                  id: `syn_${record.id}_cards`,
                  timestamp: `${startTime}`,
                  operator: op,
                  category: 'cartoes',
                  action: `Preencheu maquininhas ${cardName}`,
                  details: `Valores de Crédito, Débito, Pix e Voucher lançados (Total ${cardName}: ${formatCurrency(
                    record.getnet
                  )})`,
                },
                {
                  id: `syn_${record.id}_cash`,
                  timestamp: `${startTime}`,
                  operator: op,
                  category: 'gaveta',
                  action: 'Contagem física de Notas, Moedas e Abertura da Gaveta',
                  details:
                    Math.abs(record.cashDiff || 0) < 0.01
                      ? 'Gaveta física conferida (100% conciliada sem diferenças)'
                      : `Gaveta conferida com diferença registrada de ${formatCurrency(record.cashDiff || 0)}`,
                },
                {
                  id: `syn_${record.id}_start`,
                  timestamp: `${startTime}:00`,
                  operator: op,
                  category: 'sistema',
                  action: 'Login de Operador',
                  details: `Operador ${op} iniciou a sessão de fechamento às ${startTime}`,
                }
              );

              return synthesized;
            };

            return (
              <div className="space-y-5">
                {/* Barra Rápida: Auditoria & Registro do Operador do Turno Atual em Andamento */}
                <div className="bg-slate-900 rounded-2xl border border-slate-800 p-4 text-white shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-orange-600/20 border border-orange-500/30 flex items-center justify-center text-orange-400 shrink-0">
                        <History className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-black text-sm text-white">
                            Auditoria & Registro do Operador (Turno Atual)
                          </h4>
                          <span className="bg-orange-500/20 text-orange-300 border border-orange-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            {currentShiftAuditLogs.length} {currentShiftAuditLogs.length === 1 ? 'ação no turno' : 'ações no turno'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Linha do tempo contínua de tudo o que foi preenchido, simulado e marcado no turno em andamento.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <button
                        type="button"
                        onClick={() => setShowLiveShiftAuditInHistory((prev) => !prev)}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-orange-300 transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <History className="w-3.5 h-3.5" />
                        <span>{showLiveShiftAuditInHistory ? 'Ocultar Linha do Tempo Atual' : 'Ver Linha do Tempo do Turno Atual'}</span>
                      </button>
                      {onOpenLiveAuditDrawer && (
                        <button
                          type="button"
                          onClick={onOpenLiveAuditDrawer}
                          className="px-3 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-xs font-black text-white transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Abrir Painel Lateral</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {showLiveShiftAuditInHistory && (
                    <div className="mt-4 pt-3 border-t border-slate-800 space-y-2.5 max-h-72 overflow-y-auto pr-1">
                      {currentShiftAuditLogs.length === 0 ? (
                        <div className="py-6 text-center text-slate-400 text-xs">
                          Nenhuma ação registrada no turno atual ainda. Assim que o operador preencher valores na gaveta, maquininhas, PDV ou simular comandas, os registros aparecerão aqui.
                        </div>
                      ) : (
                        currentShiftAuditLogs.map((log) => {
                          const badge = getAuditCategoryBadge(log.category);
                          return (
                            <div
                              key={log.id}
                              className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-xs hover:border-slate-700 transition-colors"
                            >
                              <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${badge.bg}`}
                                  >
                                    {badge.icon}
                                    <span>{badge.label}</span>
                                  </span>
                                  <span className="font-bold text-white text-xs">{log.action}</span>
                                </div>
                                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                                  <span className="font-semibold text-slate-300 capitalize">{log.operator}</span>
                                  <span>•</span>
                                  <span className="font-mono text-slate-400">{log.timestamp}</span>
                                </div>
                              </div>
                              <p className="text-slate-300 leading-relaxed font-medium bg-slate-900/90 p-2 rounded-lg border border-slate-800/80">
                                {log.details}
                              </p>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>

                {/* Painel de Backup Automático Periódico em Arquivo JSON (Redundância Contra Limpeza de Cache) */}
                <div className="bg-slate-900 rounded-2xl border border-emerald-500/30 p-4 text-white shadow-sm">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                        <Download className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-black text-sm text-white">
                            Backup Automático Periódico em Arquivo (.JSON)
                          </h4>
                          <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-black px-2 py-0.5 rounded-full">
                            {autoBackupSettings?.enabled !== false ? 'Proteção Ativa' : 'Pausado'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                          Exporta o histórico de fechamentos + configurações dos bares, cardápios e operadores em arquivo JSON para download seguro contra limpezas de cache do navegador.
                        </p>
                        {autoBackupSettings?.lastBackupAt ? (
                          <p className="text-[11px] text-emerald-300/90 mt-1">
                            ✓ Último backup JSON baixado em:{' '}
                            <strong>
                              {new Date(autoBackupSettings.lastBackupAt).toLocaleDateString('pt-BR')} às{' '}
                              {new Date(autoBackupSettings.lastBackupAt).toLocaleTimeString('pt-BR').slice(0, 5)}
                            </strong>
                          </p>
                        ) : (
                          <p className="text-[11px] text-amber-300/90 mt-1">
                            • Nenhum arquivo JSON baixado recentemente neste dispositivo.
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => {
                          if (onTriggerFullBackupDownload) {
                            onTriggerFullBackupDownload();
                          } else {
                            try {
                              const payload = {
                                version: '2.1',
                                tenantId: tenant.id,
                                tenantName: tenant.name,
                                exportedAt: new Date().toISOString(),
                                tenants: [tenant],
                                closingsByTenant: { [tenant.id]: history },
                                closings: history,
                              };
                              const blob = new Blob([JSON.stringify(payload, null, 2)], {
                                type: 'application/json;charset=utf-8',
                              });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `fechacaixa_backup_${tenant.slug || tenant.id}_${new Date().toISOString().slice(0, 10)}.json`;
                              document.body.appendChild(a);
                              a.click();
                              a.remove();
                              setTimeout(() => URL.revokeObjectURL(url), 5000);
                              onShowToast(`✓ Backup JSON (${history.length} fechamentos + configurações) baixado!`);
                            } catch (err: any) {
                              onShowToast(`Erro ao exportar backup: ${err.message}`);
                            }
                          }
                        }}
                        className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-black text-white transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                        title="Baixar agora o arquivo JSON contendo todos os fechamentos e configurações dos bares"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Baixar Backup (.JSON) Agora</span>
                      </button>

                      {(onImportClosings || onRestoreFullBackup) && (
                        <label
                          className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-blue-300 transition-colors cursor-pointer flex items-center gap-1.5"
                          title="Restaurar histórico de fechamentos e configurações a partir de um arquivo JSON salvo"
                        >
                          <Upload className="w-3.5 h-3.5 text-blue-400" />
                          <span>Restaurar Backup (.JSON)</span>
                          <input
                            type="file"
                            accept=".json,application/json"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const reader = new FileReader();
                              reader.onload = async (ev) => {
                                try {
                                  const parsed = JSON.parse(String(ev.target?.result || '{}'));
                                  if (
                                    onRestoreFullBackup &&
                                    parsed &&
                                    typeof parsed === 'object' &&
                                    Array.isArray(parsed.tenants) &&
                                    parsed.tenants.length > 0
                                  ) {
                                    await onRestoreFullBackup(parsed);
                                    return;
                                  }
                                  const list: HistoryRecord[] = Array.isArray(parsed)
                                    ? parsed
                                    : Array.isArray(parsed?.closings)
                                    ? parsed.closings
                                    : parsed?.closingsByTenant?.[tenant.id] || [];
                                  if (!Array.isArray(list) || list.length === 0) {
                                    throw new Error('Nenhum fechamento ou configuração válida encontrada no arquivo.');
                                  }
                                  if (onImportClosings) {
                                    await onImportClosings(list);
                                  }
                                } catch (err: any) {
                                  onShowToast(`Erro ao restaurar backup: ${err.message}`);
                                } finally {
                                  e.target.value = '';
                                }
                              };
                              reader.readAsText(file);
                            }}
                          />
                        </label>
                      )}
                    </div>
                  </div>

                  {/* Controles de Frequência e Auto-Download ao Salvar */}
                  {onUpdateAutoBackupSettings && (
                    <div className="mt-3 pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-3 flex-wrap">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={autoBackupSettings?.autoDownloadOnClosing ?? true}
                            onChange={(e) =>
                              onUpdateAutoBackupSettings({
                                enabled: true,
                                autoDownloadOnClosing: e.target.checked,
                              })
                            }
                            className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500"
                          />
                          <span className="font-bold text-slate-200">
                            Baixar arquivo JSON automaticamente ao salvar cada fechamento
                          </span>
                        </label>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-bold text-slate-400">
                          Lembrete de Exportação Periódica:
                        </span>
                        {(
                          [
                            { id: 'every_closing', label: 'A cada fechamento' },
                            { id: 'daily', label: 'Diário (24h)' },
                            { id: 'weekly', label: 'Semanal (7d)' },
                          ] as Array<{ id: AutoBackupFrequency; label: string }>
                        ).map((opt) => {
                          const isSelected = (autoBackupSettings?.frequency || 'daily') === opt.id;
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() =>
                                onUpdateAutoBackupSettings({
                                  enabled: true,
                                  frequency: opt.id,
                                })
                              }
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                                isSelected
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                              }`}
                            >
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Cabeçalho do Calendário de Fechamentos */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                  <div className="p-4 sm:p-5 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-orange-500/20 border border-orange-500/30 text-orange-400 flex items-center justify-center shrink-0">
                        <Calendar className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-black text-sm text-white flex items-center gap-2 flex-wrap">
                          <span>Calendário de Fechamentos de Caixa</span>
                          <span className="bg-slate-800 text-amber-400 border border-slate-700 text-[10px] font-black px-2 py-0.5 rounded-full">
                            {monthClosingsCount} {monthClosingsCount === 1 ? 'fechamento neste mês' : 'fechamentos neste mês'}
                          </span>
                          <span
                            className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-black px-2 py-0.5 rounded-full inline-flex items-center gap-1"
                            title="Todos os fechamentos e comprovantes deste bar são gravados simultaneamente no IndexedDB de alta capacidade, LocalStorage e Servidor, resistindo a atualizações do sistema."
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Blindagem Permanente Ativa ({history.length} salvos)</span>
                          </span>
                        </h4>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Clique na data desejada no calendário abaixo para abrir e consultar o fechamento daquele dia.
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="px-4 sm:px-5 py-3 bg-slate-950/95 border-t border-slate-800 text-white flex flex-wrap items-center justify-between gap-2">

                    {/* Controles de Mês / Ano */}
                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <button
                        type="button"
                        onClick={handlePrevMonth}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
                        title="Mês anterior"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <div className="min-w-[150px] text-center px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 font-black text-xs text-white">
                        {MONTH_NAMES[calendarMonth]} de {calendarYear}
                      </div>
                      <button
                        type="button"
                        onClick={handleNextMonth}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
                        title="Próximo mês"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={handleGoToToday}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-slate-300 transition-colors cursor-pointer"
                        title="Ir para o dia de hoje"
                      >
                        Hoje
                      </button>
                      <button
                        type="button"
                        onClick={handleGoToYesterday}
                        className="px-2.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-[11px] font-black text-amber-300 border border-amber-500/30 transition-colors cursor-pointer"
                        title="Ir e abrir o fechamento de ontem (dia anterior)"
                      >
                        Ontem
                      </button>
                      {history.length > 0 && (
                        <button
                          type="button"
                          onClick={handleGoToLatestClosing}
                          className="px-2.5 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-[11px] font-black text-white transition-colors cursor-pointer shadow-xs"
                          title="Abrir o fechamento mais recente gravado"
                        >
                          Último Salvo
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Legenda rápida */}
                  <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600 font-semibold">
                    <div className="flex flex-wrap items-center gap-4">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                        Caixa Conciliado (Sem Diferença)
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                        Com Diferença / Observação
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-slate-200 border border-slate-300 inline-block" />
                        Sem Fechamento
                      </span>
                    </div>
                    <span className="text-slate-400">
                      Total geral salvo: <strong className="text-slate-700">{history.length}</strong>
                    </span>
                  </div>

                  {/* Grade de Dias da Semana */}
                  <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-100/70">
                    {WEEKDAYS.map((dayName) => (
                      <div
                        key={dayName}
                        className="py-2 text-center text-[11px] font-black uppercase tracking-wider text-slate-500"
                      >
                        {dayName}
                      </div>
                    ))}
                  </div>

                  {/* Grade de Dias do Mês */}
                  <div className="grid grid-cols-7 gap-px bg-slate-200">
                    {/* Espaços vazios antes do dia 1 */}
                    {Array.from({ length: firstDayOfWeek }).map((_, emptyIdx) => (
                      <div key={`empty-${emptyIdx}`} className="bg-slate-50/70 min-h-[76px] sm:min-h-[88px] p-2" />
                    ))}

                    {/* Dias do mês */}
                    {Array.from({ length: daysInMonth }).map((_, idx) => {
                      const dayNumber = idx + 1;
                      const dayKey = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(dayNumber).padStart(2, '0')}`;
                      const dayRecords = recordsByDateKey[dayKey] || [];
                      const hasClosings = dayRecords.length > 0;
                      const isSelected = selectedHistoryDateKey === dayKey;
                      const isToday = dayKey === todayKey;
                      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
                      const yesterdayKey = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
                      const isYesterday = dayKey === yesterdayKey;

                      const allBalanced =
                        hasClosings &&
                        dayRecords.every(
                          (r) => Math.abs(r.diff || 0) < 0.01 && Math.abs(r.cashDiff || 0) < 0.01
                        );

                      return (
                        <button
                          key={dayKey}
                          type="button"
                          onClick={() =>
                            setSelectedHistoryDateKey((prev) => (prev === dayKey ? null : dayKey))
                          }
                          className={`min-h-[76px] sm:min-h-[88px] p-2 text-left flex flex-col justify-between transition-all cursor-pointer relative group ${
                            isSelected
                              ? 'bg-orange-50 ring-2 ring-inset ring-orange-500 z-10'
                              : hasClosings
                              ? allBalanced
                                ? 'bg-emerald-50/60 hover:bg-emerald-100/70'
                                : 'bg-amber-50/60 hover:bg-amber-100/70'
                              : 'bg-white hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-1 flex-wrap">
                              <span
                                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                                  isSelected
                                    ? 'bg-orange-600 text-white shadow-xs'
                                    : isToday
                                    ? 'bg-slate-900 text-white'
                                    : isYesterday
                                    ? 'bg-amber-200 text-amber-950 font-black'
                                    : hasClosings
                                    ? 'text-slate-900'
                                    : 'text-slate-400'
                                }`}
                              >
                                {dayNumber}
                              </span>
                              {isYesterday && (
                                <span className="text-[9px] font-black text-amber-700 bg-amber-100 px-1 py-0.2 rounded hidden sm:inline">
                                  Ontem
                                </span>
                              )}
                              {isToday && (
                                <span className="text-[9px] font-black text-slate-700 bg-slate-200 px-1 py-0.2 rounded hidden sm:inline">
                                  Hoje
                                </span>
                              )}
                            </div>

                            {hasClosings && (
                              <span
                                className={`w-2.5 h-2.5 rounded-full ${
                                  allBalanced ? 'bg-emerald-500' : 'bg-amber-500'
                                }`}
                                title={
                                  allBalanced
                                    ? 'Fechamento conciliado sem diferenças'
                                    : 'Fechamento com diferença ou observação'
                                }
                              />
                            )}
                          </div>

                          {hasClosings ? (
                            <div className="mt-1 space-y-1 w-full">
                              <div
                                className={`text-[10px] font-black px-1.5 py-0.5 rounded-md truncate border ${
                                  allBalanced
                                    ? 'bg-emerald-100/90 text-emerald-900 border-emerald-200'
                                    : 'bg-amber-100/90 text-amber-900 border-amber-200'
                                }`}
                              >
                                {dayRecords.length === 1
                                  ? '1 Fechamento'
                                  : `${dayRecords.length} Fechamentos`}
                              </div>
                              <div className="text-[10px] text-slate-600 font-bold truncate capitalize hidden sm:block">
                                {dayRecords.map((r) => r.operator || 'Operador').join(', ')}
                              </div>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-300 font-medium hidden sm:block group-hover:text-slate-400">
                              —
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Painel do Fechamento Aberto ao Clicar na Data */}
                {selectedHistoryDateKey && (
                  <div className="space-y-4 animate-fade-in">
                    <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-sm">
                      <div className="flex items-center gap-2.5">
                        <Calendar className="w-4 h-4 text-orange-400" />
                        <span className="text-xs font-black tracking-wide">
                          Fechamentos do dia {formatSelectedDateDisplay(selectedHistoryDateKey)}
                        </span>
                        <span className="bg-slate-800 text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          {selectedDayRecords.length}{' '}
                          {selectedDayRecords.length === 1 ? 'registro encontrado' : 'registros encontrados'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedHistoryDateKey(null)}
                        className="text-xs font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1 rounded-xl flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Fechar dia</span>
                      </button>
                    </div>

                    {selectedDayRecords.length === 0 ? (
                      <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400">
                        <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        <h4 className="font-bold text-slate-700 text-xs">
                          Nenhum fechamento registrado em {formatSelectedDateDisplay(selectedHistoryDateKey)}
                        </h4>
                        <p className="text-[11px] text-slate-400 mt-1">
                          Selecione no calendário acima uma data destacada em verde ou âmbar para abrir o fechamento.
                        </p>
                      </div>
                    ) : (
                      selectedDayRecords.map((record) => {
                        const durSec = record.durationSeconds || 600;
                        const isFast = durSec <= 600;
                        const isNormal = durSec > 600 && durSec <= 1200;

                        return (
                          <div
                            key={record.id}
                            className="bg-white border-2 border-orange-200 rounded-2xl p-5 shadow-sm transition-all space-y-3"
                          >
                            {/* Top Row: Data, Operador, Duração e Ações */}
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-black text-slate-800">{record.date}</span>
                                <span className="text-slate-300">•</span>
                                <span className="text-xs font-bold text-slate-700 capitalize">
                                  Operador: {record.operator || 'Desconhecido'}
                                </span>

                                <span
                                  className={`px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 border shadow-2xs ${
                                    isFast
                                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                      : isNormal
                                      ? 'bg-blue-50 text-blue-800 border-blue-200'
                                      : 'bg-amber-50 text-amber-800 border-amber-200'
                                  }`}
                                  title={
                                    record.shiftStartedAt
                                      ? `Sessão iniciada às ${record.shiftStartedAt} e concluída às ${record.date}`
                                      : `Duração do fechamento de caixa: ${record.durationFormatted || '10 min'}`
                                  }
                                >
                                  <Timer className="w-3.5 h-3.5 text-current shrink-0" />
                                  <span>
                                    Tempo de Fechamento:{' '}
                                    <strong>{record.durationFormatted || `${Math.floor(durSec / 60)} min`}</strong>
                                  </span>
                                  {record.shiftStartedAt && (
                                    <span className="text-[10px] opacity-75 hidden sm:inline">
                                      (Início: {record.shiftStartedAt})
                                    </span>
                                  )}
                                  <span className="text-[10px] font-black uppercase ml-0.5">
                                    {isFast ? '⚡ Ágil' : isNormal ? '✓ Padrão' : '⏳ Estendido'}
                                  </span>
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => copyReportToClipboard(record.report)}
                                  className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                                  title="Copiar Relatório"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                  <span>Copiar Relatório</span>
                                </button>
                                <button
                                  onClick={() => onDeleteClosing(record.id)}
                                  className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                                  title="Excluir Registro"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>

                            {/* Resumo de Diferenças */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                <span className="text-[10px] font-bold text-slate-400 uppercase block">
                                  Cartões {tenant.cardSystemName || 'Maquininhas'}
                                </span>
                                <strong className="text-xs text-slate-800">{formatCurrency(record.getnet)}</strong>
                              </div>
                              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                <span className="text-[10px] font-bold text-slate-400 uppercase block">
                                  Cartões {tenant.pdvSystemName || 'PDV'}
                                </span>
                                <strong className="text-xs text-slate-800">{formatCurrency(record.jclan)}</strong>
                              </div>
                              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                <span className="text-[10px] font-bold text-slate-400 uppercase block">
                                  Diferença Cartões
                                </span>
                                <strong
                                  className={`text-xs ${
                                    Math.abs(record.diff) < 0.01 ? 'text-emerald-600' : 'text-rose-600'
                                  }`}
                                >
                                  {formatCurrency(record.diff)}
                                </strong>
                              </div>
                              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                <span className="text-[10px] font-bold text-slate-400 uppercase block">
                                  Diferença Gaveta
                                </span>
                                <strong
                                  className={`text-xs ${
                                    Math.abs(record.cashDiff || 0) < 0.01 ? 'text-emerald-600' : 'text-rose-600'
                                  }`}
                                >
                                  {formatCurrency(record.cashDiff || 0)}
                                </strong>
                              </div>
                            </div>

                            {/* Relatório Completo do Fechamento */}
                            {record.report && (
                              <div className="bg-slate-900 text-slate-100 rounded-xl p-3.5 border border-slate-800">
                                <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 block mb-1.5">
                                  Espelho Completo do Fechamento:
                                </span>
                                <pre className="text-[11px] font-mono whitespace-pre-wrap leading-relaxed text-slate-200 max-h-56 overflow-y-auto">
                                  {record.report}
                                </pre>
                              </div>
                            )}

                            {/* Comentários do Operador (se houver) */}
                            {record.comments && (
                              <div className="bg-amber-50/80 border border-amber-200/80 rounded-xl p-3 flex items-start gap-2.5">
                                <MessageSquare className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                <div className="text-xs text-amber-900 leading-relaxed">
                                  <strong className="font-bold text-amber-950 block">Observação do Operador:</strong>
                                  <span>{record.comments}</span>
                                </div>
                              </div>
                            )}

                            {/* Opções de Zeramento Marcadas no Fechamento (se houver) */}
                            {record.selectedExclusionOptions &&
                              Object.keys(record.selectedExclusionOptions).length > 0 && (
                                <div className="bg-emerald-50/90 border border-emerald-200 rounded-xl p-3 space-y-1.5">
                                  <div className="flex items-center gap-2 text-emerald-950 font-bold text-xs">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                    <span>Opções de Zeramento Aplicadas pelo Operador:</span>
                                  </div>
                                  <div className="space-y-1 pl-6">
                                    {Object.entries(record.selectedExclusionOptions).map(([label, opt]) => (
                                      <div key={label} className="text-xs text-emerald-900 leading-relaxed">
                                        <span className="font-bold text-emerald-950">
                                          [{label}] {opt.title}:
                                        </span>{' '}
                                        <span>{opt.instruction}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                            {/* ================================================================= */}
                            {/* AUDITORIA & REGISTRO DO OPERADOR - LINHA DO TEMPO CONTÍNUA DO TURNO */}
                            {/* ================================================================= */}
                            {(() => {
                              const fullAuditTrail = getEffectiveAuditTrail(record);
                              const activeCat = auditFilterByRecord[record.id] || 'all';
                              const searchStr = (auditSearchByRecord[record.id] || '').toLowerCase().trim();

                              const filteredTrail = fullAuditTrail.filter((log) => {
                                const matchesCat = activeCat === 'all' || log.category === activeCat;
                                const matchesSearch =
                                  !searchStr ||
                                  log.action.toLowerCase().includes(searchStr) ||
                                  log.details.toLowerCase().includes(searchStr) ||
                                  log.operator.toLowerCase().includes(searchStr) ||
                                  log.timestamp.includes(searchStr);
                                return matchesCat && matchesSearch;
                              });

                              const handleCopyAuditTrail = () => {
                                const text = fullAuditTrail
                                  .map(
                                    (l) =>
                                      `[${l.timestamp}] [${l.operator}] [${l.category.toUpperCase()}] ${l.action}: ${l.details}`
                                  )
                                  .join('\n');
                                copyReportToClipboard(text);
                                onShowToast('Linha do tempo de auditoria copiada!');
                              };

                              return (
                                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden text-slate-100 shadow-md">
                                  {/* Cabeçalho da Auditoria & Registro do Operador */}
                                  <div className="p-4 border-b border-slate-800 bg-slate-950/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 rounded-xl bg-orange-600/20 border border-orange-500/30 flex items-center justify-center text-orange-400 shrink-0">
                                        <History className="w-5 h-5" />
                                      </div>
                                      <div>
                                        <h5 className="font-black text-white text-sm flex items-center gap-2 flex-wrap">
                                          <span>Auditoria & Registro do Operador</span>
                                          <span className="bg-orange-500/20 text-orange-300 border border-orange-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                            {fullAuditTrail.length} ações
                                          </span>
                                        </h5>
                                        <p className="text-xs text-slate-400 mt-0.5">
                                          Linha do tempo contínua de tudo o que foi preenchido, simulado e marcado no turno.
                                        </p>
                                      </div>
                                    </div>

                                    <button
                                      type="button"
                                      onClick={handleCopyAuditTrail}
                                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700 self-start sm:self-auto"
                                      title="Copiar linha do tempo de auditoria deste fechamento"
                                    >
                                      <Copy className="w-3.5 h-3.5 text-orange-400" />
                                      <span>Copiar Log ({fullAuditTrail.length})</span>
                                    </button>
                                  </div>

                                  {/* Barra de Busca e Filtros de Categoria da Linha do Tempo */}
                                  <div className="p-3.5 border-b border-slate-800 bg-slate-900/95 space-y-2.5">
                                    <div className="relative">
                                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                      <input
                                        type="text"
                                        value={auditSearchByRecord[record.id] || ''}
                                        onChange={(e) =>
                                          setAuditSearchByRecord((prev) => ({
                                            ...prev,
                                            [record.id]: e.target.value,
                                          }))
                                        }
                                        placeholder="Buscar na linha do tempo por valor, item simulado, maquininha ou ação..."
                                        className="w-full bg-slate-950 border border-slate-700 rounded-xl py-1.5 pl-8 pr-8 text-xs text-white outline-none focus:ring-1 focus:ring-orange-500 placeholder:text-slate-500"
                                      />
                                      {auditSearchByRecord[record.id] && (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setAuditSearchByRecord((prev) => ({
                                              ...prev,
                                              [record.id]: '',
                                            }))
                                          }
                                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                                        >
                                          <X className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </div>

                                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                                      <span className="text-[10px] font-bold uppercase text-slate-400 mr-1 flex items-center gap-1 shrink-0">
                                        <Filter className="w-3 h-3" /> Filtrar:
                                      </span>
                                      {[
                                        { id: 'all', label: 'Todas' },
                                        { id: 'zeramento', label: 'Zeramento' },
                                        { id: 'comanda', label: 'Comanda / Simulação' },
                                        { id: 'pdv', label: 'PDV' },
                                        { id: 'cartoes', label: 'Cartões' },
                                        { id: 'gaveta', label: 'Gaveta' },
                                        { id: 'sistema', label: 'Sistema' },
                                      ].map((cat) => (
                                        <button
                                          key={cat.id}
                                          type="button"
                                          onClick={() =>
                                            setAuditFilterByRecord((prev) => ({
                                              ...prev,
                                              [record.id]: cat.id,
                                            }))
                                          }
                                          className={`px-2.5 py-1 rounded-lg font-bold text-[11px] whitespace-nowrap transition-colors cursor-pointer ${
                                            activeCat === cat.id
                                              ? 'bg-orange-600 text-white shadow-xs'
                                              : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                                          }`}
                                        >
                                          {cat.label}
                                        </button>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Lista Contínua de Eventos do Turno */}
                                  <div className="p-3.5 space-y-2.5 max-h-80 overflow-y-auto bg-slate-950/50">
                                    {filteredTrail.length === 0 ? (
                                      <div className="text-center py-6 text-slate-500 text-xs">
                                        Nenhum registro encontrado para este filtro.
                                      </div>
                                    ) : (
                                      filteredTrail.map((log) => {
                                        const badge = getAuditCategoryBadge(log.category);
                                        return (
                                          <div
                                            key={log.id}
                                            className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs hover:border-slate-700 transition-colors shadow-2xs"
                                          >
                                            <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                                              <div className="flex items-center gap-2 flex-wrap">
                                                <span
                                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${badge.bg}`}
                                                >
                                                  {badge.icon}
                                                  <span>{badge.label}</span>
                                                </span>
                                                <span className="font-bold text-white text-xs">{log.action}</span>
                                              </div>
                                              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                                                <span className="font-semibold text-slate-300 capitalize">
                                                  {log.operator}
                                                </span>
                                                <span>•</span>
                                                <span className="font-mono text-slate-400">{log.timestamp}</span>
                                              </div>
                                            </div>
                                            <p className="text-slate-300 leading-relaxed font-medium bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
                                              {log.details}
                                            </p>
                                          </div>
                                        );
                                      })
                                    )}
                                  </div>
                                </div>
                              );
                            })()}

                            {/* Comprovantes e Fotos Anexadas (se houver) */}
                            {record.attachments && record.attachments.length > 0 && (
                              <div>
                                <span className="text-[11px] font-black text-slate-600 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
                                  <ImageIcon className="w-3.5 h-3.5 text-slate-500" />
                                  Comprovantes & Prints Anexados ({record.attachments.length}):
                                </span>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                  {record.attachments.map((imgUrl, imgIdx) => (
                                    <div
                                      key={imgIdx}
                                      onClick={() => onZoomImage(imgUrl)}
                                      className="group relative aspect-video rounded-xl overflow-hidden border border-slate-200 bg-slate-900 cursor-pointer shadow-2xs hover:shadow-md transition-all"
                                    >
                                      <img
                                        src={imgUrl}
                                        alt={`Comprovante ${imgIdx + 1}`}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                      />
                                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1 text-white font-bold text-[10px]">
                                        <ZoomIn className="w-3.5 h-3.5" />
                                        <span>Ver em Zoom</span>
                                      </div>
                                      <span className="absolute bottom-1 left-1 bg-black/70 text-white text-[9px] px-1.5 py-0.5 rounded font-bold">
                                        #{imgIdx + 1}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })()}

          {/* ========================================================= */}
          {/* 3. ABA CARDÁPIO & PREÇOS (EXCLUSIVO ADMIN) */}
          {/* ========================================================= */}
          {activeTab === 'menu' && (
            <div className="space-y-6">
              {/* Banner Destacado: Subir Cardápio via PDF com IA */}
              <div className="bg-gradient-to-r from-orange-600 via-amber-600 to-rose-600 p-5 rounded-3xl text-white shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-xs border border-white/30 flex items-center justify-center shrink-0">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-black text-sm tracking-wide">
                        Subir Cardápio a partir de arquivo PDF
                      </h4>
                      <span className="text-[10px] bg-white/20 border border-white/30 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-amber-200" /> Leitura por IA Gemini
                      </span>
                    </div>
                    <p className="text-xs text-orange-100 mt-1 max-w-xl leading-relaxed">
                      Envie o arquivo PDF com a carta de bebidas e pratos do seu bar. O Gemini lê as páginas automaticamente, identifica todos os nomes, categorias e preços em Reais para você revisar e atualizar de uma só vez.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPdfImportOpen(true)}
                  className="bg-white hover:bg-orange-50 text-orange-700 font-black text-xs px-5 py-3 rounded-2xl shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-2 whitespace-nowrap shrink-0"
                >
                  <Upload className="w-4 h-4" />
                  <span>Subir Cardápio em PDF</span>
                </button>
              </div>

              {/* Formulário de Adicionar Item ao Cardápio */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                    <Plus className="w-4 h-4 text-orange-500" /> Adicionar Item ao Cardápio ({tenant.name})
                  </h4>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setIsPdfImportOpen(true)}
                      className="text-xs font-black text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors"
                      title="Importar pratos e preços de um arquivo PDF"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Importar via PDF</span>
                    </button>
                    {menu.length > 0 && (
                      <button
                        type="button"
                        onClick={handleClearMenu}
                        disabled={isSavingMenu}
                        className="text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors"
                        title="Apagar todos os itens atuais do cardápio deste bar"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Zerar Cardápio</span>
                      </button>
                    )}
                  </div>
                </div>
                <form onSubmit={handleAddMenuItem} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                  <div className="sm:col-span-6">
                    <label className="block text-xs font-bold text-slate-500 mb-1">Nome do Item / Bebida / Prato</label>
                    <input
                      type="text"
                      required
                      value={newMenuItem.name}
                      onChange={(e) => setNewMenuItem({ ...newMenuItem, name: e.target.value })}
                      placeholder="Ex: Chopp Artesanal 500ml"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <label className="block text-xs font-bold text-slate-500 mb-1">Preço (R$)</label>
                    <input
                      type="text"
                      required
                      value={newMenuItem.price}
                      onChange={(e) => setNewMenuItem({ ...newMenuItem, price: e.target.value.replace(/[^0-9,.]/g, '') })}
                      placeholder="Ex: 18,90"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <button
                      type="submit"
                      disabled={isSavingMenu}
                      className="w-full bg-orange-600 hover:bg-orange-500 text-white font-black text-xs px-4 py-2.5 rounded-xl flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-95 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Adicionar
                    </button>
                  </div>
                </form>
              </div>

              {/* Lista e Busca de Itens do Cardápio */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={menuSearchTerm}
                      onChange={(e) => setMenuSearchTerm(e.target.value)}
                      placeholder="Pesquisar item por nome ou preço (ex: chopp, água, 14,90)..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-8 py-2 text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-orange-500"
                    />
                    {menuSearchTerm && (
                      <button
                        type="button"
                        onClick={() => setMenuSearchTerm('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-200/60 cursor-pointer"
                        title="Limpar pesquisa"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="flex items-center justify-end shrink-0">
                    <span className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-700">
                      {menuSearchTerm.trim()
                        ? `${filteredMenuItemsWithIndex.length} de ${menu.length} itens`
                        : `Total: ${menu.length} itens`}
                    </span>
                  </div>
                </div>

                <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100">
                  {filteredMenuItemsWithIndex.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-xs font-medium">
                      {menu.length === 0 ? (
                        'Nenhum item cadastrado no cardápio deste bar. Adicione itens manualmente acima ou clique em "Importar via PDF".'
                      ) : (
                        <div className="space-y-2">
                          <p>Nenhum item encontrado para "{menuSearchTerm}".</p>
                          <button
                            type="button"
                            onClick={() => setMenuSearchTerm('')}
                            className="text-orange-600 hover:text-orange-700 font-bold underline cursor-pointer"
                          >
                            Limpar pesquisa e mostrar todos ({menu.length})
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      {visibleMenuItemsWithIndex.map(({ item, originalIdx }) => {
                        const isPromo = isHappyHourOrPromoItem(item);
                        return (
                          <div
                            key={originalIdx}
                            className="p-3.5 flex items-center justify-between hover:bg-slate-50/70 transition-colors gap-3"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-xs text-slate-800 truncate">{item.name}</span>
                                <button
                                  type="button"
                                  onClick={() => handleToggleMenuItemPromo(originalIdx, item)}
                                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold border flex items-center gap-1 transition-colors cursor-pointer ${
                                    isPromo
                                      ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                                      : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                  }`}
                                  title={
                                    isPromo
                                      ? 'Produto de Happy Hour / Promocional (horário limite: não será indicado no Assistente de Conciliação). Clique para liberar.'
                                      : 'Liberado para indicação no Assistente de Conciliação. Clique para marcar como Happy Hour / Promocional.'
                                  }
                                >
                                  <Timer className="w-3 h-3" />
                                  <span>{isPromo ? 'Happy Hour / Promo (Bloqueado)' : 'Liberado PDV'}</span>
                                </button>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              {editingMenuItemIndex === originalIdx ? (
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="text"
                                    value={editingMenuItemPrice}
                                    onChange={(e) => setEditingMenuItemPrice(e.target.value.replace(/[^0-9,.]/g, ''))}
                                    className="w-20 bg-white border border-slate-300 rounded-lg p-1 text-xs text-right font-bold outline-none focus:ring-2 focus:ring-orange-500"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleSaveItemPrice(originalIdx, item)}
                                    className="text-emerald-600 hover:text-emerald-700 p-1 cursor-pointer"
                                    title="Salvar preço"
                                  >
                                    <Check className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingMenuItemIndex(null)}
                                    className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                                    title="Cancelar"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <span className="font-black text-xs text-slate-900">
                                    {formatCurrency(item.price)}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingMenuItemIndex(originalIdx);
                                      setEditingMenuItemPrice(item.price.toFixed(2).replace('.', ','));
                                    }}
                                    className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50 cursor-pointer"
                                    title="Editar Preço"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteMenuItem(originalIdx, item.name)}
                                    className="text-rose-500 hover:text-rose-700 p-1 rounded hover:bg-rose-50 cursor-pointer"
                                    title="Remover do cardápio"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}

                      {visibleMenuCount < filteredMenuItemsWithIndex.length && (
                        <div className="p-3 bg-slate-50 text-center">
                          <button
                            type="button"
                            onClick={() => setVisibleMenuCount((prev) => prev + 60)}
                            className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold shadow-2xs transition-colors cursor-pointer"
                          >
                            Mostrar mais itens ({filteredMenuItemsWithIndex.length - visibleMenuCount} restantes)
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 3.1. ABA LEMBRETE DE FECHAMENTO (AVISO SONORO & VISUAL)   */}
          {/* ========================================================= */}
          {activeTab === 'reminder' && (
            <div className="space-y-6">
              {/* Header explicativo do Lembrete */}
              <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 rounded-2xl p-5 text-white shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-xs border border-white/30 flex items-center justify-center shrink-0">
                    <Clock className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-black text-sm tracking-wide">
                        Lembrete Automático de Fechamento de Caixa
                      </h4>
                      <span className="text-[10px] bg-white/20 border border-white/30 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1">
                        <Bell className="w-3 h-3 text-amber-200" /> Alerta Pontual
                      </span>
                    </div>
                    <p className="text-xs text-orange-100 mt-1 max-w-xl leading-relaxed">
                      Configure um horário limite para o encerramento do caixa (ex: <strong>02:00 da manhã</strong>). Se o operador ainda não tiver finalizado e salvo o fechamento até o horário determinado, o sistema emitirá um sinal sonoro e projetará um aviso visual na tela.
                    </p>
                  </div>
                </div>

                <div className="bg-black/20 backdrop-blur-xs px-4 py-2.5 rounded-xl border border-white/20 text-center shrink-0 w-full md:w-auto">
                  <span className="text-[10px] text-orange-200 font-bold uppercase block">Status Atual</span>
                  <span className="text-xs font-black text-white flex items-center justify-center gap-1.5 mt-0.5">
                    {reminderEnabled ? (
                      <>
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                        Ativo para as {reminderTime}
                      </>
                    ) : (
                      <>
                        <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                        Desativado
                      </>
                    )}
                  </span>
                </div>
              </div>

              {/* Painel de Configurações do Lembrete */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div>
                    <h5 className="text-sm font-black text-slate-800">
                      Disparo do Lembrete de Fechamento
                    </h5>
                    <p className="text-xs text-slate-400">
                      Habilite ou desabilite o disparo automático na estação de trabalho do operador
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={reminderEnabled}
                      onChange={(e) => setReminderEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                  </label>
                </div>

                {/* Seleção de Horário */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                  <div>
                    <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
                      Horário do Lembrete (Hora do Turno)
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="time"
                          value={reminderTime}
                          onChange={(e) => setReminderTime(e.target.value)}
                          disabled={!reminderEnabled}
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2.5 pl-10 pr-3 text-sm font-black text-slate-800 outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50"
                        />
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1.5">
                      Horário sugerido para bares noturnos: <strong>02:00 da manhã</strong>.
                    </p>

                    {/* Atalhos Rápidos de Horário */}
                    <div className="mt-3">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                        Horários Mais Usados em Bares:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {['23:00', '00:00', '01:00', '02:00', '03:00', '04:00'].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => {
                              setReminderTime(preset);
                              if (!reminderEnabled) setReminderEnabled(true);
                            }}
                            className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                              reminderTime === preset
                                ? 'bg-orange-500 text-white border-orange-500 shadow-xs'
                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {preset} {preset === '02:00' && '⭐'}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Configuração do Alerta Sonoro */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                          <Volume2 className="w-4 h-4 text-amber-500" /> Alerta Sonoro no Caixa
                        </span>
                        <input
                          type="checkbox"
                          checked={reminderSound}
                          onChange={(e) => setReminderSound(e.target.checked)}
                          disabled={!reminderEnabled}
                          className="w-4 h-4 text-orange-600 rounded border-slate-300 focus:ring-orange-500"
                        />
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Emite um aviso sonoro harmônico no alto-falante do computador do operador quando o horário limite chegar, garantindo atenção mesmo se a janela estiver em segundo plano.
                      </p>
                    </div>

                    <div className="pt-3 mt-3 border-t border-slate-200 flex items-center justify-between">
                      <span className="text-[11px] text-slate-400 font-medium">
                        Web Audio Sintetizado (Sem arquivos externos)
                      </span>
                      <button
                        type="button"
                        onClick={handleTestReminderSound}
                        disabled={isPlayingTestSound}
                        className="bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-xs px-3 py-1.5 rounded-lg border border-amber-300 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                      >
                        <Bell className={`w-3.5 h-3.5 text-amber-700 ${isPlayingTestSound ? 'animate-bell-ring' : ''}`} />
                        <span>{isPlayingTestSound ? 'Tocando Som...' : 'Testar Som 🔔'}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Prévia do Alerta Visual na Tela */}
                <div className="bg-slate-900 rounded-xl p-4 text-white border border-slate-800">
                  <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-slate-800">
                    <span className="text-xs font-black uppercase text-amber-400 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                      Como o Operador Verá o Alerta às {reminderTime || '02:00'}:
                    </span>
                    <span className="text-[10px] bg-amber-400/20 text-amber-300 border border-amber-400/30 px-2 py-0.5 rounded-full font-bold">
                      Simulação Visual
                    </span>
                  </div>
                  <div className="bg-slate-950 p-4 rounded-lg border border-amber-500/40 flex items-start gap-3 shadow-inner">
                    <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
                      <Clock className="w-5 h-5 animate-pulse" />
                    </div>
                    <div className="flex-1">
                      <h6 className="font-black text-sm text-amber-300">
                        ⏰ Horário Limite de Fechamento Atingido ({reminderTime || '02:00'})!
                      </h6>
                      <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                        Atenção operador! O horário configurado pela gerência do <strong>{tenant.name}</strong> para encerramento do caixa foi alcançado e o fechamento ainda não foi finalizado. Por favor, encerre e salve os lançamentos.
                      </p>
                      <div className="flex items-center gap-2 mt-3">
                        <span className="bg-orange-500 text-white font-bold text-[11px] px-3 py-1 rounded-md">
                          Fechar Caixa Agora
                        </span>
                        <span className="bg-slate-800 text-slate-300 font-bold text-[11px] px-3 py-1 rounded-md border border-slate-700">
                          Silenciar por 10 min (Snooze)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Botão de Salvar Configurações */}
                <div className="pt-3 border-t border-slate-100 flex justify-end">
                  <button
                    type="button"
                    onClick={handleSaveReminderSettings}
                    disabled={isSavingReminder}
                    className="bg-orange-600 hover:bg-orange-700 text-white font-black text-xs py-3 px-6 rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-2 cursor-pointer disabled:opacity-70"
                  >
                    {isSavingReminder ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Salvando Configuração...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Salvar Configuração do Lembrete</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 4. ABA ASSINATURA & FATURAMENTO (EXCLUSIVO ADMIN) */}
          {/* ========================================================= */}
          {activeTab === 'billing' && (
            <div className="space-y-6">
              {/* Status da Assinatura */}
              <div
                className={`p-5 rounded-2xl border ${
                  isOverdue
                    ? 'bg-rose-50 border-rose-200 text-rose-900'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                }`}
              >
                <div className="flex items-start justify-between flex-wrap gap-2">
                  <div>
                    <span className="text-[11px] font-black uppercase tracking-wider block opacity-75">
                      Status da Assinatura FechaCaixa
                    </span>
                    <div className="flex items-center gap-2 mt-1">
                      {isOverdue ? (
                        <AlertTriangle className="w-5 h-5 text-rose-600" />
                      ) : (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      )}
                      <h4 className="text-base font-black capitalize">
                        {isOverdue ? 'Acesso Suspenso (Atraso)' : 'Assinatura Regularizada & Ativa'}
                      </h4>
                    </div>
                    <p className="text-xs mt-1 opacity-80">
                      Plano <strong>{PLAN_DETAILS[tenant.plan]?.name || tenant.plan.toUpperCase()}</strong> • Mensalidade de {formatCurrency(tenant.monthlyPrice)} / mês
                    </p>
                    {onOpenUpgradeModal && (
                      <button
                        type="button"
                        onClick={onOpenUpgradeModal}
                        className="mt-2 text-xs font-black bg-white hover:bg-slate-50 text-slate-800 px-3 py-1.5 rounded-xl border border-slate-300 shadow-xs inline-flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-orange-500" />
                        <span>Ver Detalhes / Fazer Upgrade de Plano</span>
                      </button>
                    )}
                  </div>
                  <div className="bg-white/90 p-3 rounded-xl border border-current/20 text-right">
                    <span className="text-[10px] font-bold block opacity-75">Vencimento da Licença</span>
                    <strong className="text-xs font-black block">
                      {new Date(tenant.expiresAt).toLocaleDateString('pt-BR')}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Fatura Vigente & Pix Copia e Cola */}
              {currentInvoice && (
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                        Fatura Atual: {currentInvoice.description}
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        Vencimento: {currentInvoice.dueDate} • Valor: <strong>{formatCurrency(currentInvoice.amount)}</strong>
                      </p>
                    </div>
                    <span
                      className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border ${
                        currentInvoice.status === 'paga'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : 'bg-amber-100 text-amber-800 border-amber-300'
                      }`}
                    >
                      {currentInvoice.status}
                    </span>
                  </div>

                  {/* Pix Copia e Cola */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <label className="block text-xs font-bold text-slate-600 mb-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <QrCode className="w-4 h-4 text-emerald-600" />
                        Pix Copia e Cola (Banco Central do Brasil)
                      </span>
                      <span className="text-[10px] text-emerald-600 font-bold">Baixa Instantânea</span>
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        readOnly
                        value={currentInvoice.pixCode}
                        className="flex-1 bg-white border border-slate-300 rounded-lg p-2 text-[11px] font-mono text-slate-700 outline-none select-all"
                      />
                      <button
                        type="button"
                        onClick={() => copyPixToClipboard(currentInvoice.pixCode)}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3.5 py-2 rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        {copiedPix ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedPix ? 'Copiado!' : 'Copiar'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Linha Digitável Boleto */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">
                      Linha Digitável do Boleto Bancário
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        readOnly
                        value={currentInvoice.boletoBarcode}
                        className="flex-1 bg-white border border-slate-300 rounded-lg p-2 text-[11px] font-mono text-slate-700 outline-none select-all"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(currentInvoice.boletoBarcode);
                          onShowToast('Código de barras copiado!');
                        }}
                        className="bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs px-3.5 py-2 rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar</span>
                      </button>
                    </div>
                  </div>

                  {/* Botão de Simulação de Pagamento Asaas / Webhook */}
                  {currentInvoice.status !== 'paga' && (
                    <div className="pt-2 flex justify-end">
                      <button
                        type="button"
                        disabled={isProcessingPayment}
                        onClick={() => handleSimulatePayment(currentInvoice.id)}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        {isProcessingPayment ? (
                          <span>Confirmando no Banco...</span>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Confirmar Pagamento do Pix Agora</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* 5. ABA CONFIGURAÇÃO IA GEMINI (EXCLUSIVO ADMIN) */}
          {/* ========================================================= */}
          {activeTab === 'ai' && (
            <div className="space-y-6">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                      Inteligência Artificial OCR (Gemini 3.8 Flash)
                    </h4>
                    <p className="text-xs text-slate-500">
                      Motor de visão computacional responsável pela leitura automática de comprovantes de maquininhas.
                    </p>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 text-blue-900 p-4 rounded-xl text-xs space-y-2">
                  <div className="flex items-center gap-2 font-bold text-blue-950">
                    <CheckCircle2 className="w-4 h-4 text-blue-600" />
                    <span>Conexão Servidor Ativa</span>
                  </div>
                  <p>
                    O backend do FechaCaixa já possui conexão configurada no servidor para processar fotos e extratos de maquininhas (Getnet, Cielo, Stone, PagBank).
                  </p>
                  <p className="text-[11px] text-blue-800 opacity-90">
                    Se a administração deste bar preferir utilizar uma chave de API própria do Google AI Studio para faturamento dedicado, informe abaixo:
                  </p>
                </div>

                <form onSubmit={handleSaveGeminiKey} className="space-y-3">
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center justify-between">
                    <span>Chave Gemini API Personalizada (Opcional):</span>
                    <span className="text-[10px] text-slate-400 font-normal">Ex: AIzaSy...</span>
                  </label>
                  <div className="relative">
                    <Key className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={customKeyInput}
                      onChange={(e) => setCustomKeyInput(e.target.value)}
                      placeholder="Deixe em branco para usar a chave padrão do servidor"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2.5 text-xs font-mono text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md transition-all cursor-pointer"
                    >
                      Salvar Chave da IA
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 6. ABA APARÊNCIA & CORES DO BAR (EXCLUSIVO ADMIN) */}
          {/* ========================================================= */}
          {activeTab === 'appearance' && (
            <div className="space-y-6">
              {/* Modo de Exibição da Interface (Modo Escuro / Modo Claro) */}
              {onToggleDarkMode && (
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                      {isDarkMode ? (
                        <Moon className="w-4 h-4 text-indigo-600" />
                      ) : (
                        <Sun className="w-4 h-4 text-amber-500" />
                      )}
                      <span>Modo de Exibição da Tela (Escuro / Claro)</span>
                    </h4>
                    <p className="text-xs text-slate-500 max-w-xl">
                      Escolha entre o <strong>Modo Escuro</strong> (ideal para ambientes de bar à noite e menor cansaço visual) ou o <strong>Modo Claro</strong> para a tela principal de fechamento de caixa.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        if (!isDarkMode) {
                          onToggleDarkMode();
                          onShowToast('Modo Escuro ativado!');
                        }
                      }}
                      className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                        isDarkMode
                          ? 'bg-slate-900 text-white shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Moon className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Modo Escuro</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (isDarkMode) {
                          onToggleDarkMode();
                          onShowToast('Modo Claro ativado!');
                        }
                      }}
                      className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                        !isDarkMode
                          ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Sun className="w-3.5 h-3.5 text-amber-500" />
                      <span>Modo Claro</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Personalização do Avatar / Logo do Bar ou Restaurante */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-16 h-16 rounded-2xl bg-gradient-to-tr ${previewTheme.logoGradient} flex items-center justify-center font-black text-xl text-white shadow-lg overflow-hidden shrink-0 border-2 border-white ring-2 ring-slate-200`}
                    >
                      {selectedAvatarUrl ? (
                        <img
                          src={selectedAvatarUrl}
                          alt={tenant.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        selectedLogoInitials || 'FB'
                      )}
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                        <ImageIcon className="w-4 h-4 text-orange-500" /> Avatar / Logo do Bar ou Restaurante
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5 max-w-xl">
                        Personalize o avatar do <strong>{tenant.name}</strong> exibido na barra superior, na tela de login e no painel administrativo. Você pode enviar a logomarca da casa ou escolher um ícone/sigla.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <input
                      ref={avatarFileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        handleUploadAvatarFile(e.target.files);
                        e.target.value = '';
                      }}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => avatarFileInputRef.current?.click()}
                      className="bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Enviar Foto / Logo</span>
                    </button>
                    {selectedAvatarUrl && (
                      <button
                        type="button"
                        onClick={async () => {
                          setSelectedAvatarUrl('');
                          try {
                            await onUpdateTenantAppearance({ logoAvatarUrl: '' });
                            onShowToast('Foto removida. Usando siglas/ícone no avatar.');
                          } catch {}
                        }}
                        className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold px-3 py-2 rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remover Foto</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-100">
                  {/* Siglas ou Ícone Rápido */}
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">
                      Siglas ou Ícone do Avatar (quando sem foto)
                    </label>
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        type="text"
                        maxLength={4}
                        value={selectedLogoInitials}
                        onChange={(e) => setSelectedLogoInitials(e.target.value.toUpperCase())}
                        placeholder="Ex: FB"
                        className="w-24 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-black text-center text-slate-800 uppercase outline-none focus:ring-2 focus:ring-orange-500"
                      />
                      <span className="text-[11px] text-slate-400">
                        Digite até 4 letras ou escolha um ícone abaixo:
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        tenant.name ? tenant.name.slice(0, 2).toUpperCase() : 'FB',
                        '🍺',
                        '🥩',
                        '🍔',
                        '🍕',
                        '🍸',
                        '🍷',
                        '🍣',
                        '🔥',
                        '🍽️',
                      ].map((iconPreset) => (
                        <button
                          key={iconPreset}
                          type="button"
                          onClick={() => {
                            setSelectedLogoInitials(iconPreset);
                            setSelectedAvatarUrl('');
                          }}
                          className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                            !selectedAvatarUrl && selectedLogoInitials === iconPreset
                              ? 'bg-orange-500 text-white border-orange-600 shadow-xs scale-105'
                              : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {iconPreset}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* URL direta para o Avatar */}
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">
                      Ou Cole a URL de uma Imagem / Logomarca
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={customAvatarUrlInput}
                        onChange={(e) => setCustomAvatarUrlInput(e.target.value)}
                        placeholder="https://exemplo.com/logo-do-bar.png"
                        className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-orange-500"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (customAvatarUrlInput.trim()) {
                            setSelectedAvatarUrl(customAvatarUrlInput.trim());
                            setCustomAvatarUrlInput('');
                            onShowToast('Imagem aplicada ao avatar na prévia!');
                          }
                        }}
                        className="bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition-colors cursor-pointer shrink-0"
                      >
                        Aplicar
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1.5">
                      Dica: imagens quadradas (PNG, JPG ou WebP) ficam perfeitas no ícone do bar.
                    </p>
                  </div>
                </div>
              </div>

              {/* Seletor de Cores do Sistema */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Palette className="w-4 h-4 text-orange-500" /> Paleta de Cores do Sistema ({tenant.name})
                </h4>
                <p className="text-xs text-slate-500 mb-4">
                  Escolha o tema que melhor representa a identidade visual deste bar. Essa cor será usada nos botões, cabeçalhos e destaques do sistema.
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
                  {Object.values(THEME_PALETTES).map((pal) => (
                    <button
                      key={pal.id}
                      type="button"
                      onClick={() => setSelectedThemeColor(pal.id)}
                      className={`p-3 rounded-2xl border-2 text-center transition-all cursor-pointer flex flex-col items-center gap-2 ${
                        selectedThemeColor === pal.id
                          ? 'border-slate-900 bg-slate-50 shadow-md scale-105'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-full bg-gradient-to-tr ${pal.logoGradient} shadow-md flex items-center justify-center text-white`}
                      >
                        {selectedThemeColor === pal.id && <Check className="w-4 h-4 stroke-[3]" />}
                      </div>
                      <span className="text-[11px] font-bold text-slate-700 leading-tight">
                        {pal.name.split('/')[0]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Seletor de Fundo da Tela de Login */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div>
                    <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-orange-500" /> Imagem de Fundo da Tela de Login
                    </h4>
                    <p className="text-xs text-slate-500">
                      Personalize a tela de entrada deste restaurante com uma imagem de fundo atmosférica ou a foto do próprio bar.
                    </p>
                  </div>
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleUploadBgFile(e.target.files)}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold px-3 py-2 rounded-xl border border-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5 text-slate-600" />
                      <span>Fazer Upload de Foto do Bar</span>
                    </button>
                  </div>
                </div>

                {/* Galeria de Presets Atmosféricos */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                  {LOGIN_BG_PRESETS.map((preset) => (
                    <div
                      key={preset.id}
                      onClick={() => setSelectedBg(preset.url)}
                      className={`group relative aspect-video rounded-2xl overflow-hidden border-2 cursor-pointer transition-all ${
                        selectedBg === preset.url
                          ? 'border-orange-500 shadow-md ring-2 ring-orange-500/30 scale-[1.02]'
                          : 'border-slate-200 hover:border-slate-300 opacity-80 hover:opacity-100'
                      }`}
                    >
                      <img src={preset.url} alt={preset.title} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-2.5 flex flex-col justify-end">
                        <span className="text-[11px] font-bold text-white leading-tight">{preset.title}</span>
                        <span className="text-[9px] text-slate-300 leading-none truncate">{preset.description}</span>
                      </div>
                      {selectedBg === preset.url && (
                        <div className="absolute top-2 right-2 bg-orange-600 text-white rounded-full p-1 shadow-md">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Ou URL personalizada */}
                <div className="flex gap-2 items-center pt-2 border-t border-slate-100">
                  <input
                    type="text"
                    value={customBgUrl}
                    onChange={(e) => setCustomBgUrl(e.target.value)}
                    placeholder="Ou cole uma URL direta de imagem (https://...)"
                    className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (customBgUrl.trim()) {
                        setSelectedBg(customBgUrl.trim());
                        setCustomBgUrl('');
                        onShowToast('URL de imagem aplicada na prévia!');
                      }
                    }}
                    className="bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs px-3 py-2 rounded-xl transition-colors cursor-pointer"
                  >
                    Aplicar URL
                  </button>
                </div>
              </div>

              {/* Nomes dos Sistemas e Bandeiras de Cartões Usados pelo Bar */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                  <span className="text-xs font-black text-slate-700 uppercase tracking-wider">
                    Sistemas e Bandeiras de Cartões do Bar / Restaurante
                  </span>
                </div>
                <p className="text-xs text-slate-500 mb-4">
                  Defina os nomes do seu PDV, máquinas de cartão e, se desejar, as bandeiras de Crédito, Débito e Voucher. Por padrão, Crédito e Débito ficam sem bandeiras (campos simples), mas você pode ativá-las abaixo caso precise separar por bandeira.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                      Sistema PDV / Comandas
                    </label>
                    <input
                      type="text"
                      value={adminPdvSystemName}
                      onChange={(e) => setAdminPdvSystemName(e.target.value)}
                      placeholder="Ex: Colibri, Totvs Chef, Saipos, Zig"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                      Maquininhas / Cartões
                    </label>
                    <input
                      type="text"
                      value={adminCardSystemName}
                      onChange={(e) => setAdminCardSystemName(e.target.value)}
                      placeholder="Ex: Stone, Cielo, PagBank, Rede"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>

                {/* Bandeiras de Crédito (Opcional - Padrão: Sem Bandeiras) */}
                <div className="mt-4 pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                    <label className="text-xs font-bold text-slate-600 uppercase">
                      Bandeiras de Crédito nas Maquininhas (Opcional)
                    </label>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setAdminCreditFlags('')}
                        className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer"
                      >
                        Sem bandeiras (Padrão)
                      </button>
                      <button
                        type="button"
                        onClick={() => setAdminCreditFlags('Visa, Mastercard, Elo, Amex, Hipercard')}
                        className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 cursor-pointer"
                      >
                        Sugerir bandeiras de crédito
                      </button>
                    </div>
                  </div>
                  <input
                    type="text"
                    value={adminCreditFlags}
                    onChange={(e) => setAdminCreditFlags(e.target.value)}
                    placeholder="Padrão: deixe em branco (sem bandeiras) ou digite ex: Visa, Mastercard, Elo, Amex, Hipercard"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Deixe em branco para usar os campos de Crédito sem bandeiras (padrão). Se preencher separado por vírgulas, cada bandeira aparecerá acima do respectivo campo de Crédito nas maquininhas.
                  </p>
                </div>

                {/* Bandeiras de Débito (Opcional - Padrão: Sem Bandeiras) */}
                <div className="mt-4 pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                    <label className="text-xs font-bold text-slate-600 uppercase">
                      Bandeiras de Débito nas Maquininhas (Opcional)
                    </label>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setAdminDebitFlags('')}
                        className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer"
                      >
                        Sem bandeiras (Padrão)
                      </button>
                      <button
                        type="button"
                        onClick={() => setAdminDebitFlags('Visa Electron, Maestro, Elo Débito, Cabal, Banricompras')}
                        className="text-[10px] font-bold px-2 py-0.5 rounded bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 cursor-pointer"
                      >
                        Sugerir bandeiras de débito
                      </button>
                    </div>
                  </div>
                  <input
                    type="text"
                    value={adminDebitFlags}
                    onChange={(e) => setAdminDebitFlags(e.target.value)}
                    placeholder="Padrão: deixe em branco (sem bandeiras) ou digite ex: Visa Electron, Maestro, Elo Débito"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Deixe em branco para usar os campos de Débito sem bandeiras (padrão). Se preencher separado por vírgulas, cada bandeira aparecerá acima do respectivo campo de Débito nas maquininhas.
                  </p>
                </div>

                {/* Bandeiras de Voucher (Opcional - Padrão: Sem Bandeiras) */}
                <div className="mt-4 pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                    <label className="text-xs font-bold text-slate-600 uppercase">
                      Bandeiras dos Vouchers nas Maquininhas (Opcional)
                    </label>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setAdminVoucherNames('')}
                        className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer"
                      >
                        Sem bandeiras
                      </button>
                      <button
                        type="button"
                        onClick={() => setAdminVoucherNames('Alelo, Ticket, Sodexo, VR, Ben')}
                        className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 cursor-pointer"
                      >
                        Sugerir bandeiras de voucher
                      </button>
                    </div>
                  </div>
                  <input
                    type="text"
                    value={adminVoucherNames}
                    onChange={(e) => setAdminVoucherNames(e.target.value)}
                    placeholder="Padrão: deixe em branco ou digite ex: Alelo, Ticket, Sodexo, VR, Ben"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Separe por vírgulas. Essas bandeiras serão exibidas acima de cada campo de voucher nas máquinas para o operador identificar e lançar cada valor corretamente no {adminPdvSystemName || 'PDV'}.
                  </p>
                </div>
              </div>

              {/* Pré-visualização em Tempo Real da Tela de Login */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <span className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-3">
                  Prévia em Tempo Real da Tela de Login:
                </span>
                <div
                  className="relative rounded-2xl overflow-hidden p-6 sm:p-10 flex items-center justify-center bg-cover bg-center min-h-[300px]"
                  style={{ backgroundImage: `url(${selectedBg})` }}
                >
                  {/* Dark overlay */}
                  <div className="absolute inset-0 bg-black/75 backdrop-blur-[2px]" />

                  {/* Card mockup */}
                  <div className="relative z-10 bg-[#121212]/95 border border-slate-800 p-6 rounded-3xl shadow-2xl w-full max-w-sm text-center">
                    <div
                      className={`w-12 h-12 mx-auto rounded-2xl bg-gradient-to-tr ${previewTheme.logoGradient} flex items-center justify-center font-black text-white text-base shadow-md mb-2 overflow-hidden`}
                    >
                      {selectedAvatarUrl ? (
                        <img
                          src={selectedAvatarUrl}
                          alt={tenant.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        selectedLogoInitials || tenant.logoInitials
                      )}
                    </div>
                    <h5 className="text-base font-black text-white">{tenant.name}</h5>
                    <p className={`text-[10px] font-bold uppercase tracking-wider ${previewTheme.accentText} mt-0.5`}>
                      Fechamento de Caixa • {tenant.city}
                    </p>
                    <div className="mt-4 pt-3 border-t border-slate-800 flex flex-col gap-2">
                      <div className="bg-[#181818] border border-slate-700 rounded-xl p-2 text-[11px] text-slate-400 text-left">
                        Exemplo: Campo de Operador
                      </div>
                      <div
                        className={`w-full py-2.5 rounded-xl font-bold text-xs text-white shadow-md ${previewTheme.btnGradient}`}
                      >
                        Entrar no Caixa (Prévia)
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Botão Salvar Customizações */}
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveAppearance}
                  disabled={isSavingAppearance}
                  className={`py-3 px-6 rounded-xl font-black text-xs text-white shadow-lg transition-all flex items-center gap-2 cursor-pointer ${
                    previewTheme.btnGradient
                  } ${previewTheme.btnHover} ${isSavingAppearance ? 'opacity-70' : 'active:scale-95'}`}
                >
                  {isSavingAppearance ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Salvando Aparência...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Salvar Aparência & Cores do Bar</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Importação de Cardápio via PDF por IA */}
      {isPdfImportOpen && (
        <PdfMenuImportModal
          isOpen={isPdfImportOpen}
          onClose={() => setIsPdfImportOpen(false)}
          tenantName={tenant.name}
          currentMenuCount={menu.length}
          apiKey={apiKey}
          onApplyMenu={handleApplyPdfMenu}
          onShowToast={onShowToast}
        />
      )}
    </div>
  );
};
