import React, { useState, useRef, useEffect } from 'react';
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
  RotateCcw,
  QrCode,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Key,
  Timer,
  Clock,
  Zap
} from 'lucide-react';
import { Tenant, TenantUser, HistoryRecord, MenuItem, Invoice, isHappyHourOrPromoItem } from '../../types/saas.ts';
import { formatCurrency } from '../../App.tsx';
import { THEME_PALETTES, LOGIN_BG_PRESETS, getTheme } from '../../utils/theme.ts';
import { FLOR_DE_BRASA_MENU } from '../../data/defaultMenus.ts';
import { PdfMenuImportModal } from './PdfMenuImportModal.tsx';

interface BarAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenant: Tenant;
  currentOperator: TenantUser | null;
  users: TenantUser[];
  history: HistoryRecord[];
  menu: MenuItem[];
  invoices: Invoice[];
  apiKey: string;
  onSaveApiKey: (key: string) => void;
  onAddUser: (user: { name: string; pin: string; isAdmin: boolean }) => Promise<void>;
  onUpdateUser: (userId: number, updates: Partial<TenantUser>) => Promise<void>;
  onDeleteUser: (userId: number) => Promise<void>;
  onDeleteClosing: (closingId: number) => Promise<void>;
  onSaveMenu: (items: MenuItem[]) => Promise<void>;
  onConfirmPayment: (invoiceId: string) => Promise<void>;
  onUpdateTenantAppearance: (updates: Partial<Tenant>) => Promise<void>;
  onZoomImage: (url: string) => void;
  onShowToast: (msg: string) => void;
}

export const BarAdminModal: React.FC<BarAdminModalProps> = ({
  isOpen,
  onClose,
  tenant,
  currentOperator,
  users,
  history,
  menu,
  invoices,
  apiKey,
  onSaveApiKey,
  onAddUser,
  onUpdateUser,
  onDeleteUser,
  onDeleteClosing,
  onSaveMenu,
  onConfirmPayment,
  onUpdateTenantAppearance,
  onZoomImage,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<'users' | 'history' | 'menu' | 'billing' | 'ai' | 'appearance'>('users');

  // --- ESTADOS: OPERADORES ---
  const [newUserForm, setNewUserForm] = useState({ name: '', pin: '', isAdmin: false });
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [editUserForm, setEditUserForm] = useState({ name: '', pin: '', isAdmin: false });

  // --- ESTADOS: CARDÁPIO ---
  const [menuSearchTerm, setMenuSearchTerm] = useState('');
  const [selectedMenuCat, setSelectedMenuCat] = useState<string>('todos');
  const [newMenuItem, setNewMenuItem] = useState({ name: '', price: '', cat: 'Petiscos' });
  const [editingMenuItemIndex, setEditingMenuItemIndex] = useState<number | null>(null);
  const [editingMenuItemPrice, setEditingMenuItemPrice] = useState<string>('');
  const [isSavingMenu, setIsSavingMenu] = useState(false);
  const [isPdfImportOpen, setIsPdfImportOpen] = useState(false);

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
  const [adminPdvSystemName, setAdminPdvSystemName] = useState<string>(tenant.pdvSystemName || 'Jclan');
  const [adminCardSystemName, setAdminCardSystemName] = useState<string>(tenant.cardSystemName || 'Getnet');
  const [adminVoucherNames, setAdminVoucherNames] = useState<string>(
    (tenant.voucherNames && tenant.voucherNames.length > 0
      ? tenant.voucherNames
      : ['Alelo', 'Ticket', 'Sodexo', 'VR', 'Ben']
    ).join(', ')
  );
  const [isSavingAppearance, setIsSavingAppearance] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSelectedBg(tenant.loginBgImage || LOGIN_BG_PRESETS[0].url);
    setSelectedThemeColor(tenant.themeColor || 'orange');
    setAdminPdvSystemName(tenant.pdvSystemName || 'Jclan');
    setAdminCardSystemName(tenant.cardSystemName || 'Getnet');
    setAdminVoucherNames(
      (tenant.voucherNames && tenant.voucherNames.length > 0
        ? tenant.voucherNames
        : ['Alelo', 'Ticket', 'Sodexo', 'VR', 'Ben']
      ).join(', ')
    );
  }, [tenant]);

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

  // --- HANDLERS CARDÁPIO ---
  const menuCategories = Array.from(new Set(menu.map((i) => i.cat))).filter(Boolean);
  const filteredMenuItemsWithIndex = menu
    .map((item, originalIdx) => ({ item, originalIdx }))
    .filter(({ item }) => {
      const matchesSearch = item.name.toLowerCase().includes(menuSearchTerm.toLowerCase());
      const matchesCat = selectedMenuCat === 'todos' || item.cat === selectedMenuCat;
      return matchesSearch && matchesCat;
    });

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
      { name: addedName, price: priceNum, cat: newMenuItem.cat.trim() || 'Geral' },
      ...menu,
    ];

    setIsSavingMenu(true);
    try {
      await onSaveMenu(updated);
      setNewMenuItem({ name: '', price: '', cat: 'Petiscos' });
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

  const handleResetMenuToDefault = async () => {
    setIsSavingMenu(true);
    try {
      await onSaveMenu([...FLOR_DE_BRASA_MENU]);
      onShowToast('Cardápio restaurado para o padrão oficial.');
    } catch {
      onShowToast('Erro ao restaurar cardápio.');
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

  // --- HANDLERS APARÊNCIA ---
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
      const parsedVouchers = adminVoucherNames
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      await onUpdateTenantAppearance({
        loginBgImage: selectedBg,
        themeColor: selectedThemeColor,
        primaryColor: palette.primaryHex,
        logoColor: palette.logoGradient,
        pdvSystemName: adminPdvSystemName.trim() || 'Jclan',
        cardSystemName: adminCardSystemName.trim() || 'Getnet',
        voucherNames:
          parsedVouchers.length > 0 ? parsedVouchers : ['Alelo', 'Ticket', 'Sodexo', 'VR', 'Ben'],
      });
      onShowToast('Aparência, sistemas e bandeiras de voucher atualizados!');
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
              className={`w-11 h-11 rounded-2xl bg-gradient-to-tr ${tenant.logoColor || currentTheme.logoGradient} flex items-center justify-center font-black text-base text-white shadow-lg`}
            >
              {tenant.logoInitials || 'FB'}
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
          {/* 2. ABA HISTÓRICO COM FOTOS & COMENTÁRIOS */}
          {/* ========================================================= */}
          {activeTab === 'history' && (() => {
            const validDurationRecords = history.filter((r) => r.durationSeconds && r.durationSeconds > 0);
            const avgSeconds =
              validDurationRecords.length > 0
                ? Math.round(
                    validDurationRecords.reduce((acc, curr) => acc + (curr.durationSeconds || 0), 0) /
                      validDurationRecords.length
                  )
                : 0;
            const avgMin = Math.floor(avgSeconds / 60);
            const avgSec = avgSeconds % 60;
            const avgDurationStr = avgSeconds > 0 ? `${avgMin} min ${avgSec > 0 ? `${avgSec}s` : ''}` : '---';

            const fastestRec = validDurationRecords.reduce<HistoryRecord | null>((fastest, curr) => {
              if (!fastest || (curr.durationSeconds || Infinity) < (fastest.durationSeconds || Infinity)) {
                return curr;
              }
              return fastest;
            }, null);

            // Estatísticas por operador
            const operatorStats = history.reduce<Record<string, { totalSec: number; count: number }>>((acc, curr) => {
              const op = curr.operator?.toLowerCase() || 'desconhecido';
              if (!acc[op]) acc[op] = { totalSec: 0, count: 0 };
              if (curr.durationSeconds) {
                acc[op].totalSec += curr.durationSeconds;
                acc[op].count += 1;
              }
              return acc;
            }, {});

            return (
              <div className="space-y-4">
                {/* Painel Gerencial de Auditoria de Tempo de Fechamento */}
                <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 text-white p-5 rounded-2xl border border-slate-700/80 shadow-md space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-slate-700/60">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-orange-500/20 text-orange-400 border border-orange-500/30 flex items-center justify-center">
                        <Timer className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-white flex items-center gap-2">
                          <span>Tempo de Fechamento por Operador</span>
                          <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-black px-2 py-0.5 rounded-full">
                            Métrica do Administrador
                          </span>
                        </h4>
                        <p className="text-xs text-slate-400">
                          Acompanhe quanto tempo cada operador levou para encerrar o caixa e conciliar os valores no PDV.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-xl">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Tempo Médio de Fechamento
                      </span>
                      <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-xl font-black text-amber-400">{avgDurationStr}</span>
                        <span className="text-[10px] text-slate-400">por turno</span>
                      </div>
                      <span className="text-[10px] text-emerald-400 mt-1 block">
                        Meta ideal: até 15 minutos
                      </span>
                    </div>

                    <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-xl">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Fechamento Mais Rápido
                      </span>
                      <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-xl font-black text-emerald-400">
                          {fastestRec?.durationFormatted || '---'}
                        </span>
                        {fastestRec?.operator && (
                          <span className="text-xs font-bold text-slate-300 capitalize">
                            ({fastestRec.operator})
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        Comprovado com conciliação completa
                      </span>
                    </div>

                    <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-xl">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Média de Tempo por Operador
                      </span>
                      <div className="space-y-1">
                        {Object.keys(operatorStats).length === 0 ? (
                          <span className="text-xs text-slate-500">Sem dados registrados</span>
                        ) : (
                          Object.entries(operatorStats)
                            .filter(([_, s]) => s.count > 0)
                            .slice(0, 3)
                            .map(([op, stat]) => {
                              const opAvg = Math.round(stat.totalSec / stat.count);
                              const opMin = Math.floor(opAvg / 60);
                              const opSec = opAvg % 60;
                              return (
                                <div key={op} className="flex items-center justify-between text-xs">
                                  <span className="capitalize font-bold text-slate-300">{op}:</span>
                                  <span className="font-mono font-bold text-amber-300 bg-slate-900 px-1.5 py-0.2 rounded border border-slate-800">
                                    {opMin}m {opSec > 0 ? `${opSec}s` : ''}
                                  </span>
                                </div>
                              );
                            })
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {history.length === 0 ? (
                  <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-400">
                    <FileText className="w-10 h-10 mx-auto mb-3 opacity-40" />
                    <h4 className="font-bold text-slate-700 text-sm">Nenhum fechamento registrado ainda</h4>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                      Assim que os operadores realizarem o fechamento de caixa deste bar, todos os relatórios, fotos, comprovantes e tempo de fechamento aparecerão aqui na nuvem.
                    </p>
                  </div>
                ) : (
                  history.map((record) => {
                    const durSec = record.durationSeconds || 600;
                    const isFast = durSec <= 600; // <= 10 min
                    const isNormal = durSec > 600 && durSec <= 1200; // 10-20 min

                    return (
                      <div
                        key={record.id}
                        className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs transition-all hover:border-slate-300 space-y-3"
                      >
                        {/* Top Row: Data, Operador, Duração e Ações */}
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-black text-slate-800">{record.date}</span>
                            <span className="text-slate-300">•</span>
                            <span className="text-xs font-bold text-slate-700 capitalize">
                              Operador: {record.operator || 'Desconhecido'}
                            </span>

                            {/* Badge Gerencial: Tempo que o Operador demorou para fechar o caixa */}
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
                                Tempo de Fechamento: <strong>{record.durationFormatted || `${Math.floor(durSec / 60)} min`}</strong>
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
                              <span>Copiar</span>
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
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Cartões Getnet</span>
                        <strong className="text-xs text-slate-800">{formatCurrency(record.getnet)}</strong>
                      </div>
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Cartões Jclan</span>
                        <strong className="text-xs text-slate-800">{formatCurrency(record.jclan)}</strong>
                      </div>
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Diferença Cartões</span>
                        <strong
                          className={`text-xs ${
                            Math.abs(record.diff) < 0.01 ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                        >
                          {formatCurrency(record.diff)}
                        </strong>
                      </div>
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Diferença Gaveta</span>
                        <strong
                          className={`text-xs ${
                            Math.abs(record.cashDiff || 0) < 0.01 ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                        >
                          {formatCurrency(record.cashDiff || 0)}
                        </strong>
                      </div>
                    </div>

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
                    {record.selectedExclusionOptions && Object.keys(record.selectedExclusionOptions).length > 0 && (
                      <div className="bg-emerald-50/90 border border-emerald-200 rounded-xl p-3 space-y-1.5">
                        <div className="flex items-center gap-2 text-emerald-950 font-bold text-xs">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>Opções de Zeramento Aplicadas pelo Operador:</span>
                        </div>
                        <div className="space-y-1 pl-6">
                          {Object.entries(record.selectedExclusionOptions).map(([label, opt]) => (
                            <div key={label} className="text-xs text-emerald-900 leading-relaxed">
                              <span className="font-bold text-emerald-950">[{label}] {opt.title}:</span>{' '}
                              <span>{opt.instruction}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Histórico / Trilha de Auditoria do Turno (se houver) */}
                    {record.auditTrail && record.auditTrail.length > 0 && (
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                        <details className="text-xs text-slate-700">
                          <summary className="font-bold text-slate-800 cursor-pointer flex items-center justify-between select-none hover:text-slate-900">
                            <span className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-blue-500" />
                              Registro de Auditoria do Turno ({record.auditTrail.length} ações salvas)
                            </span>
                            <span className="text-[10px] text-blue-600 font-semibold underline">Ver Detalhes</span>
                          </summary>
                          <div className="mt-2.5 pt-2 border-t border-slate-200 space-y-1.5 max-h-48 overflow-y-auto font-mono text-[11px]">
                            {record.auditTrail.map((log) => (
                              <div key={log.id} className="flex items-start gap-2 bg-white p-1.5 rounded border border-slate-100">
                                <span className="text-slate-400 shrink-0 text-[10px]">[{log.timestamp}]</span>
                                <span className="font-bold text-slate-700 uppercase text-[9px] bg-slate-100 px-1 py-0.5 rounded shrink-0">
                                  {log.category}
                                </span>
                                <span className="text-slate-800 font-medium">{log.action}:</span>
                                <span className="text-slate-500 truncate">{log.details}</span>
                              </div>
                            ))}
                          </div>
                        </details>
                      </div>
                    )}

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
                    <button
                      type="button"
                      onClick={handleResetMenuToDefault}
                      disabled={isSavingMenu}
                      className="text-[11px] text-slate-500 hover:text-slate-700 flex items-center gap-1 font-semibold cursor-pointer"
                      title="Restaurar cardápio completo padrão"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Template Flor de Brasa</span>
                    </button>
                  </div>
                </div>
                <form onSubmit={handleAddMenuItem} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                  <div className="sm:col-span-5">
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
                  <div className="sm:col-span-4 flex gap-2">
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-slate-500 mb-1">Categoria</label>
                      <input
                        type="text"
                        value={newMenuItem.cat}
                        onChange={(e) => setNewMenuItem({ ...newMenuItem, cat: e.target.value })}
                        placeholder="Ex: Petiscos"
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isSavingMenu}
                      className="bg-orange-600 hover:bg-orange-500 text-white font-black text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 shadow-md transition-all active:scale-95 cursor-pointer shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" /> Adicionar
                    </button>
                  </div>
                </form>
              </div>

              {/* Lista e Busca de Itens do Cardápio */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={menuSearchTerm}
                      onChange={(e) => setMenuSearchTerm(e.target.value)}
                      placeholder="Buscar item do cardápio..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                    <button
                      type="button"
                      onClick={() => setSelectedMenuCat('todos')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                        selectedMenuCat === 'todos'
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Todos ({menu.length})
                    </button>
                    {menuCategories.slice(0, 5).map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setSelectedMenuCat(cat)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                          selectedMenuCat === cat
                            ? 'bg-slate-900 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100">
                  {filteredMenuItemsWithIndex.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-xs font-medium">
                      Nenhum item cadastrado no cardápio deste bar. Adicione itens manualmente acima ou clique em "Subir Cardápio em PDF".
                    </div>
                  ) : (
                    filteredMenuItemsWithIndex.map(({ item, originalIdx }) => {
                      const isPromo = isHappyHourOrPromoItem(item);
                      return (
                      <div
                        key={originalIdx}
                        className="p-3.5 flex items-center justify-between hover:bg-slate-50/70 transition-colors gap-3"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-xs text-slate-800 truncate">{item.name}</span>
                            <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-semibold">
                              {item.cat}
                            </span>
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
                    })
                  )}
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
                      Plano <strong>{tenant.plan.toUpperCase()}</strong> • Mensalidade de {formatCurrency(tenant.monthlyPrice)} / mês
                    </p>
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

              {/* Nomes dos Sistemas Usados pelo Bar */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                  <span className="text-xs font-black text-slate-700 uppercase tracking-wider">
                    Sistemas Utilizados no Bar / Restaurante
                  </span>
                </div>
                <p className="text-xs text-slate-500 mb-4">
                  Defina os nomes exatos do seu PDV e máquinas de cartão. O FechaCaixa atualizará automaticamente os cartões de conferência, assistente de conciliação e relatórios de fechamento para a sua casa.
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
                      placeholder="Ex: Jclan, Colibri, Totvs Chef, Saipos, Zig"
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
                      placeholder="Ex: Getnet, Stone, Cielo, PagBank, Rede"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>

                {/* Bandeiras de Voucher */}
                <div className="mt-4 pt-3 border-t border-slate-100">
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1 flex items-center justify-between">
                    <span>Bandeiras dos Vouchers nas Maquininhas</span>
                    <span className="text-[10px] text-purple-600 font-bold lowercase">rotula cada campo de voucher</span>
                  </label>
                  <input
                    type="text"
                    value={adminVoucherNames}
                    onChange={(e) => setAdminVoucherNames(e.target.value)}
                    placeholder="Ex: Alelo, Ticket, Sodexo, VR, Ben"
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
                      className={`w-12 h-12 mx-auto rounded-2xl bg-gradient-to-tr ${previewTheme.logoGradient} flex items-center justify-center font-black text-white text-base shadow-md mb-2`}
                    >
                      {tenant.logoInitials}
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
