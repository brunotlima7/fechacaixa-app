import React, { useState } from 'react';
import { X, Plus, Trash2, Edit3, Check, Utensils, RotateCcw, Search, DollarSign, FileText, Timer } from 'lucide-react';
import { Tenant, MenuItem, isHappyHourOrPromoItem } from '../../types/saas.ts';
import { FLOR_DE_BRASA_MENU } from '../../data/defaultMenus.ts';
import { PdfMenuImportModal } from './PdfMenuImportModal.tsx';

interface MenuManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenant: Tenant;
  menu: MenuItem[];
  onSaveMenu: (items: MenuItem[]) => Promise<void>;
  onShowToast: (msg: string) => void;
}

export const MenuManagerModal: React.FC<MenuManagerModalProps> = ({
  isOpen,
  onClose,
  tenant,
  menu,
  onSaveMenu,
  onShowToast,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCat, setSelectedCat] = useState<string>('todos');
  const [newItem, setNewItem] = useState<{ name: string; price: string; cat: string }>({
    name: '',
    price: '',
    cat: 'Petiscos',
  });
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editPrice, setEditPrice] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [isPdfImportOpen, setIsPdfImportOpen] = useState(false);

  if (!isOpen) return null;

  const categories = Array.from(new Set(menu.map((i) => i.cat))).filter(Boolean);

  const filteredMenuWithIndex = menu
    .map((item, originalIdx) => ({ item, originalIdx }))
    .filter(({ item }) => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCat = selectedCat === 'todos' || item.cat === selectedCat;
      return matchesSearch && matchesCat;
    });

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.name.trim() || !newItem.price.trim()) {
      onShowToast('Informe o nome e o preço do item.');
      return;
    }
    const priceNum = parseFloat(newItem.price.replace(',', '.')) || 0;
    if (priceNum <= 0) {
      onShowToast('Preço inválido.');
      return;
    }

    const addedName = newItem.name.trim();
    const updated = [
      { name: addedName, price: priceNum, cat: newItem.cat.trim() || 'Geral' },
      ...menu,
    ];

    setIsSaving(true);
    try {
      await onSaveMenu(updated);
      setNewItem({ name: '', price: '', cat: 'Petiscos' });
      onShowToast(`Item "${addedName}" adicionado ao cardápio de ${tenant.name}!`);
    } catch {
      onShowToast('Erro ao salvar item.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteItem = async (originalIdx: number, itemName: string) => {
    const updated = menu.filter((_, idx) => idx !== originalIdx);
    setIsSaving(true);
    try {
      await onSaveMenu(updated);
      onShowToast(`Item "${itemName}" removido do cardápio.`);
    } catch {
      onShowToast('Erro ao remover item.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearAllMenu = async () => {
    setIsSaving(true);
    try {
      await onSaveMenu([]);
      onShowToast(`Todos os itens do cardápio de ${tenant.name} foram removidos.`);
    } catch {
      onShowToast('Erro ao limpar cardápio.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePriceEdit = async (originalIdx: number, originalItem: MenuItem) => {
    const newPriceNum = parseFloat(editPrice.replace(',', '.')) || 0;
    if (newPriceNum <= 0) {
      onShowToast('Preço inválido.');
      return;
    }
    const updated = menu.map((i, idx) =>
      idx === originalIdx ? { ...i, price: newPriceNum } : i
    );
    setIsSaving(true);
    try {
      await onSaveMenu(updated);
      setEditingIndex(null);
      onShowToast(`Preço de "${originalItem.name}" atualizado para R$ ${newPriceNum.toFixed(2)}.`);
    } catch {
      onShowToast('Erro ao salvar alteração.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTogglePromo = async (originalIdx: number, originalItem: MenuItem) => {
    const nextPromo = !isHappyHourOrPromoItem(originalItem);
    const updated = menu.map((i, idx) =>
      idx === originalIdx ? { ...i, isPromo: nextPromo } : i
    );
    setIsSaving(true);
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
      setIsSaving(false);
    }
  };

  const handleCloneFlorDeBrasa = async () => {
    setIsSaving(true);
    try {
      await onSaveMenu([...FLOR_DE_BRASA_MENU]);
      onShowToast('Cardápio do Flor de Brasa importado com sucesso!');
    } catch {
      onShowToast('Erro ao importar cardápio.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleApplyPdfMenu = async (newItems: MenuItem[], mode: 'replace' | 'merge') => {
    setIsSaving(true);
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
      onShowToast(`Cardápio substituído com sucesso (${finalMenu.length} itens)!`);
    } catch {
      onShowToast('Erro ao salvar cardápio importado.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-3 sm:p-6 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center text-white shadow-md">
              <Utensils className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base sm:text-lg text-white">Gestor de Cardápio Centralizado</h3>
                <span className="bg-orange-500/20 text-orange-400 border border-orange-500/30 px-2 py-0.5 rounded text-[11px] font-bold">
                  {tenant.name}
                </span>
              </div>
              <p className="text-slate-400 text-xs">
                Edite preços e itens em tempo real na nuvem sem precisar mexer no código-fonte
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action bar & New Item Form */}
        <div className="p-4 sm:p-6 bg-slate-50 border-b border-slate-200 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-orange-600" /> Cadastrar Novo Item no Cardápio
            </h4>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setIsPdfImportOpen(true)}
                className="text-xs font-black bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white px-3.5 py-1.5 rounded-lg shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
                title="Subir arquivo PDF e extrair itens e preços via IA Gemini"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Subir Cardápio em PDF</span>
              </button>
              {menu.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAllMenu}
                  disabled={isSaving}
                  className="text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 px-3 py-1.5 rounded-lg border border-rose-200 shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Apagar todos os itens do cardápio deste bar"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" /> Zerar Cardápio
                </button>
              )}
              <button
                type="button"
                onClick={handleCloneFlorDeBrasa}
                disabled={isSaving}
                className="text-xs font-bold bg-white hover:bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg border border-slate-300 shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
                title="Importar template com 70+ itens do Flor de Brasa"
              >
                <RotateCcw className="w-3.5 h-3.5 text-orange-500" /> Template Flor de Brasa
              </button>
            </div>
          </div>

          <form onSubmit={handleAddItem} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
            <div className="sm:col-span-5">
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Nome do Item / Prato</label>
              <input
                type="text"
                required
                value={newItem.name}
                onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                placeholder="Ex: Isca de Tilápia com Molho Tártaro"
                className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs sm:text-sm font-semibold outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div className="sm:col-span-3">
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Preço (R$)</label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">R$</span>
                <input
                  type="text"
                  required
                  value={newItem.price}
                  onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
                  placeholder="39,90"
                  className="w-full bg-white border border-slate-300 rounded-lg p-2.5 pl-8 text-xs sm:text-sm font-bold text-right outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Categoria</label>
              <input
                type="text"
                value={newItem.cat}
                onChange={(e) => setNewItem({ ...newItem, cat: e.target.value })}
                placeholder="Ex: Petiscos"
                className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={isSaving}
                className="w-full bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-bold p-2.5 rounded-lg text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Adicionar
              </button>
            </div>
          </form>

          {/* Filters & Search */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar item pelo nome..."
                className="w-full bg-white border border-slate-300 rounded-lg py-2 pl-9 pr-3 text-xs outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <select
              value={selectedCat}
              onChange={(e) => setSelectedCat(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg py-2 px-3 text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="todos">Todas as Categorias ({menu.length} itens)</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Menu Items Table */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-100 text-slate-500 uppercase tracking-wider text-[11px] font-bold">
                  <th className="p-3 border-b">Item</th>
                  <th className="p-3 border-b">Categoria</th>
                  <th className="p-3 border-b text-right">Preço</th>
                  <th className="p-3 border-b text-right w-24">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMenuWithIndex.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-400 font-medium">
                      Nenhum item cadastrado no cardápio deste bar. Adicione itens manualmente ou envie um PDF.
                    </td>
                  </tr>
                ) : (
                  filteredMenuWithIndex.map(({ item, originalIdx }) => {
                    const isPromo = isHappyHourOrPromoItem(item);
                    return (
                    <tr key={originalIdx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 font-semibold text-slate-800">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span>{item.name}</span>
                          <button
                            type="button"
                            onClick={() => handleTogglePromo(originalIdx, item)}
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
                      </td>
                      <td className="p-3">
                        <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[11px] font-medium border border-slate-200">
                          {item.cat}
                        </span>
                      </td>
                      <td className="p-3 text-right font-bold text-slate-900">
                        {editingIndex === originalIdx ? (
                          <div className="flex items-center justify-end gap-1">
                            <span className="text-xs text-slate-400">R$</span>
                            <input
                              type="text"
                              value={editPrice}
                              onChange={(e) => setEditPrice(e.target.value)}
                              className="w-20 bg-white border border-orange-400 rounded p-1 text-right text-xs font-bold outline-none"
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => handleSavePriceEdit(originalIdx, item)}
                              className="p-1 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded cursor-pointer"
                              title="Salvar preço"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingIndex(null)}
                              className="p-1 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.price)
                        )}
                      </td>
                      <td className="p-3 text-right">
                        {editingIndex !== originalIdx && (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingIndex(originalIdx);
                                setEditPrice(item.price.toFixed(2).replace('.', ','));
                              }}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                              title="Alterar Preço"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteItem(originalIdx, item.name)}
                              className="p-1.5 text-rose-500 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                              title="Excluir Item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-xs text-slate-500 font-semibold">
          <span>Total: {menu.length} itens cadastrados</span>
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-sm transition-all"
          >
            Concluir & Fechar
          </button>
        </div>
      </div>

      {/* Modal de Importação de Cardápio via PDF por IA */}
      {isPdfImportOpen && (
        <PdfMenuImportModal
          isOpen={isPdfImportOpen}
          onClose={() => setIsPdfImportOpen(false)}
          tenantName={tenant.name}
          currentMenuCount={menu.length}
          onApplyMenu={handleApplyPdfMenu}
          onShowToast={onShowToast}
        />
      )}
    </div>
  );
};
