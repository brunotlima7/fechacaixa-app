import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  FileText,
  Sparkles,
  Check,
  AlertCircle,
  RefreshCw,
  Search,
  Trash2,
  Edit3,
  Layers,
  ArrowRight,
  HelpCircle,
  FileCheck,
} from 'lucide-react';
import { MenuItem } from '../../types/saas.ts';
import { extractPdfContent } from '../../utils/pdfExtractor.ts';

interface PdfMenuImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenantName: string;
  currentMenuCount: number;
  apiKey?: string;
  onApplyMenu: (newMenu: MenuItem[], mode: 'replace' | 'merge') => Promise<void>;
  onShowToast: (msg: string) => void;
}

export const PdfMenuImportModal: React.FC<PdfMenuImportModalProps> = ({
  isOpen,
  onClose,
  tenantName,
  currentMenuCount,
  apiKey,
  onApplyMenu,
  onShowToast,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState('');
  const [fileBase64, setFileBase64] = useState<string | null>(null);
  const [fileSizeStr, setFileSizeStr] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);

  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Itens extraídos
  const [extractedItems, setExtractedItems] = useState<MenuItem[] | null>(null);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [importMode, setImportMode] = useState<'replace' | 'merge'>('replace');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCat, setSelectedCat] = useState<string>('todos');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editPrice, setEditPrice] = useState<string>('');
  const [isApplying, setIsApplying] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      if (selected.type && selected.type !== 'application/pdf' && !selected.name.toLowerCase().endsWith('.pdf')) {
        onShowToast('Por favor, selecione um arquivo em formato .PDF');
        return;
      }
      loadFile(selected);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) {
      if (dropped.type !== 'application/pdf' && !dropped.name.toLowerCase().endsWith('.pdf')) {
        onShowToast('Por favor, envie um arquivo em formato .PDF');
        return;
      }
      loadFile(dropped);
    }
  };

  const loadFile = (f: File) => {
    setFile(f);
    setFileName(f.name);
    setFileSizeStr((f.size / (1024 * 1024)).toFixed(2) + ' MB');
    setErrorMessage(null);
    setExtractedItems(null);

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.includes('base64,') ? result.split('base64,')[1] : result;
      setFileBase64(base64.trim());
    };
    reader.onerror = () => {
      setErrorMessage('Erro ao ler o arquivo selecionado.');
    };
    reader.readAsDataURL(f);
  };

  // Carrega PDF de exemplo disponível no sistema
  const handleLoadSamplePdf = async () => {
    setIsProcessing(true);
    setProcessingStatus('Carregando PDF de exemplo do Flor de Brasa...');
    setErrorMessage(null);
    try {
      const res = await fetch('/api/sample-menu-pdf');
      const contentType = res.headers.get('content-type') || '';
      let data: any = {};
      if (contentType.includes('application/json')) {
        data = await res.json();
      } else {
        throw new Error(`O servidor retornou status ${res.status} ao carregar o exemplo.`);
      }

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Não foi possível carregar o arquivo de exemplo.');
      }
      setFileName(data.fileName);
      setFileSizeStr((data.sizeBytes / (1024 * 1024)).toFixed(2) + ' MB');
      setFileBase64(data.base64);
      setFile(null);
      onShowToast('PDF de exemplo carregado! Clique em "Processar com IA" para extrair.');
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao carregar PDF de exemplo.');
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  // Processa o PDF via IA Gemini com pré-otimização no navegador (Elimina HTTP 413)
  const handleProcessPdf = async () => {
    if (!file && !fileBase64) {
      setErrorMessage('Nenhum arquivo PDF carregado para leitura.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    setProcessingStatus('Lendo e otimizando documento PDF no navegador...');

    try {
      let endpoint = '/api/parse-menu-pdf';
      let payload: any = {
        customApiKey: apiKey || localStorage.getItem('geminiApiKey') || undefined,
      };

      try {
        let source: File | ArrayBuffer | null = file;
        if (!source && fileBase64) {
          const binary = atob(fileBase64);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
          source = bytes.buffer;
        }

        if (source) {
          setProcessingStatus('Extraindo páginas e texto do cardápio...');
          const extracted = await extractPdfContent(source);
          if (extracted.hasText) {
            endpoint = '/api/parse-menu-text';
            payload.menuText = extracted.text;
            setProcessingStatus('Texto do cardápio extraído! Enviando para a IA Gemini...');
          } else if (extracted.pageImages && extracted.pageImages.length > 0) {
            endpoint = '/api/parse-menu-images';
            payload.pageImages = extracted.pageImages;
            setProcessingStatus('Fotos das páginas escaneadas compactadas! Enviando para o Gemini...');
          } else {
            payload.pdfBase64 = fileBase64;
          }
        } else {
          payload.pdfBase64 = fileBase64;
        }
      } catch (clientErr) {
        console.warn('Fallback para envio direto de PDF:', clientErr);
        payload.pdfBase64 = fileBase64;
      }

      setProcessingStatus('Gemini 3.8 Flash estruturando itens, categorias e preços...');

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const contentType = res.headers.get('content-type') || '';
      let data: any = {};
      if (contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const textResp = await res.text();
        console.error('Resposta não-JSON do servidor:', textResp.slice(0, 300));
        throw new Error(
          `O servidor retornou código HTTP ${res.status}. O arquivo pode ter excedido os limites ou a API está indisponível.`
        );
      }

      if (!res.ok) {
        throw new Error(data.error || 'Falha ao processar o arquivo PDF com a IA.');
      }

      if (!data.items || data.items.length === 0) {
        throw new Error('Nenhum item com preço válido foi identificado no PDF.');
      }

      setExtractedItems(data.items);
      setImportMode('replace');
      // Seleciona todos os itens por padrão
      const allIdx = new Set<number>(data.items.map((_: MenuItem, idx: number) => idx));
      setSelectedIndices(allIdx);
      onShowToast(`Sucesso! ${data.items.length} itens identificados no cardápio.`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro inesperado durante a extração por IA.');
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  // Seleção e filtros na tabela
  const toggleSelectAll = () => {
    if (!extractedItems) return;
    if (selectedIndices.size === extractedItems.length) {
      setSelectedIndices(new Set());
    } else {
      setSelectedIndices(new Set(extractedItems.map((_, i) => i)));
    }
  };

  const toggleItem = (idx: number) => {
    const next = new Set(selectedIndices);
    if (next.has(idx)) {
      next.delete(idx);
    } else {
      next.add(idx);
    }
    setSelectedIndices(next);
  };

  const handleDeleteItem = (idx: number) => {
    if (!extractedItems) return;
    const next = extractedItems.filter((_, i) => i !== idx);
    setExtractedItems(next);
    const nextSelected = new Set<number>();
    selectedIndices.forEach((i) => {
      if (i < idx) nextSelected.add(i);
      else if (i > idx) nextSelected.add(i - 1);
    });
    setSelectedIndices(nextSelected);
  };

  const handleSavePriceEdit = (idx: number) => {
    if (!extractedItems) return;
    const val = parseFloat(editPrice.replace(',', '.')) || 0;
    if (val <= 0) return;
    const next = [...extractedItems];
    next[idx] = { ...next[idx], price: val };
    setExtractedItems(next);
    setEditingIndex(null);
  };

  const handleConfirmApply = async () => {
    if (!extractedItems || selectedIndices.size === 0) {
      onShowToast('Selecione ao menos um item do cardápio para importar.');
      return;
    }

    const itemsToImport = extractedItems.filter((_, idx) => selectedIndices.has(idx));
    setIsApplying(true);
    try {
      await onApplyMenu(itemsToImport, importMode);
      onShowToast(`Cardápio atualizado com ${itemsToImport.length} itens com sucesso!`);
      onClose();
    } catch (err: any) {
      onShowToast(err.message || 'Erro ao aplicar o cardápio.');
    } finally {
      setIsApplying(false);
    }
  };

  const categories = extractedItems
    ? Array.from(new Set(extractedItems.map((i) => i.cat))).filter(Boolean)
    : [];

  const filteredItemsWithIndex = extractedItems
    ? extractedItems
        .map((item, originalIndex) => ({ item, originalIndex }))
        .filter(({ item }) => {
          const matchSearch =
            item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.cat.toLowerCase().includes(searchTerm.toLowerCase());
          const matchCat = selectedCat === 'todos' || item.cat === selectedCat;
          return matchSearch && matchCat;
        })
    : [];

  const formatPrice = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Cabeçalho */}
        <div className="p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-orange-950 text-white flex items-center justify-between border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/20 border border-orange-400/40 flex items-center justify-center text-orange-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base tracking-wide flex items-center gap-2">
                <span>Subir Cardápio via Arquivo PDF</span>
                <span className="text-[10px] bg-orange-500 text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                  IA Gemini
                </span>
              </h3>
              <p className="text-xs text-slate-300">
                Extração inteligente de pratos, bebidas e preços para: <strong className="text-white font-bold">{tenantName}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo do Modal */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 bg-slate-50/50">
          {errorMessage && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-2xl flex items-start gap-3 text-xs leading-relaxed">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-black text-rose-900 mb-0.5">Erro na Leitura do PDF</strong>
                <span>{errorMessage}</span>
              </div>
            </div>
          )}

          {/* ESTADO 1: Upload e Seleção de Arquivo */}
          {!extractedItems && (
            <div className="space-y-5">
              {/* Dropzone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-3xl p-8 sm:p-10 text-center cursor-pointer transition-all ${
                  isDragOver
                    ? 'border-orange-500 bg-orange-50/60 scale-[1.01]'
                    : fileBase64
                    ? 'border-emerald-400 bg-emerald-50/40'
                    : 'border-slate-300 hover:border-orange-400 bg-white hover:bg-slate-50/80 shadow-xs'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  className="hidden"
                  onClick={(e) => {
                    (e.target as HTMLInputElement).value = '';
                  }}
                  onChange={handleFileChange}
                />

                <div className="w-16 h-16 rounded-3xl bg-orange-100 text-orange-600 flex items-center justify-center mx-auto mb-4 shadow-inner">
                  {fileBase64 ? (
                    <FileCheck className="w-8 h-8 text-emerald-600" />
                  ) : (
                    <Upload className="w-8 h-8" />
                  )}
                </div>

                {fileBase64 ? (
                  <div className="space-y-1">
                    <p className="text-sm font-black text-slate-800">{fileName}</p>
                    <p className="text-xs text-slate-500 font-medium">{fileSizeStr} • Pronto para análise</p>
                    <p className="text-xs text-orange-600 font-bold mt-2">
                      Clique aqui caso deseje trocar por outro arquivo PDF
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <h4 className="text-sm font-black text-slate-800">
                      Arraste e solte o arquivo PDF do cardápio aqui
                    </h4>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                      Ou clique para navegar nos seus arquivos locais. O modelo lerá todas as páginas, reconhecendo descrições, categorias e preços.
                    </p>
                    <span className="inline-block text-[11px] font-bold text-orange-600 bg-orange-50 border border-orange-200 px-3 py-1 rounded-full mt-2">
                      Formatos suportados: .PDF (qualquer diagramação)
                    </span>
                  </div>
                )}
              </div>

              {/* Botões de Ação para Iniciar Leitura */}
              <div className="flex flex-col sm:flex-row gap-3 items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={handleLoadSamplePdf}
                  disabled={isProcessing}
                  className="w-full sm:w-auto text-xs font-bold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-300 px-4 py-3 rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs disabled:opacity-50"
                  title="Carregar o arquivo PDF oficial do Flor de Brasa já presente no sistema"
                >
                  <FileText className="w-4 h-4 text-orange-500" />
                  <span>Carregar PDF de Exemplo (Flor de Brasa)</span>
                </button>

                <button
                  type="button"
                  onClick={handleProcessPdf}
                  disabled={!fileBase64 || isProcessing}
                  className="w-full sm:w-auto bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-black text-sm px-6 py-3.5 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 transition-all active:scale-98 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>{processingStatus || 'Processando com IA...'}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Extrair Cardápio com IA Gemini</span>
                    </>
                  )}
                </button>
              </div>

              {/* Card Explicativo */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-start gap-3">
                <HelpCircle className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                <div className="text-xs text-slate-500 leading-relaxed space-y-1">
                  <strong className="font-bold text-slate-700 block">Como a leitura por IA funciona:</strong>
                  <p>
                    A inteligência artificial analisa fotos, diagramações em colunas, tabelas de Happy Hour e cartas de vinhos do PDF. Antes de salvar no sistema, você poderá revisar todos os itens identificados, ajustar preços ou remover produtos que não queira incluir.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ESTADO 2: Revisão dos Itens Extraídos */}
          {extractedItems && (
            <div className="space-y-4">
              {/* Barra de Resumo e Modo de Aplicação */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-black text-slate-900">
                      {extractedItems.length} itens extraídos do PDF
                    </span>
                    <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                      {categories.length} categorias
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {selectedIndices.size} selecionados para serem importados no bar
                  </p>
                </div>

                {/* Opções: Substituir vs Mesclar */}
                <div className="bg-slate-100 p-1.5 rounded-2xl flex items-center gap-1 border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setImportMode('replace')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      importMode === 'replace'
                        ? 'bg-white text-orange-600 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Substituir Cardápio Atual ({currentMenuCount} itens)
                  </button>
                  <button
                    type="button"
                    onClick={() => setImportMode('merge')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      importMode === 'merge'
                        ? 'bg-white text-orange-600 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Mesclar / Adicionar aos Existentes
                  </button>
                </div>
              </div>

              {/* Filtros e Busca */}
              <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Filtrar por nome ou categoria..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className="text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 px-3 py-1.5 rounded-xl cursor-pointer whitespace-nowrap"
                  >
                    {selectedIndices.size === extractedItems.length ? 'Desmarcar Todos' : 'Marcar Todos'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedCat('todos')}
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                      selectedCat === 'todos'
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Todos
                  </button>
                  {categories.slice(0, 4).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCat(cat)}
                      className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                        selectedCat === cat
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tabela de Revisão */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs max-h-[380px] overflow-y-auto divide-y divide-slate-100">
                {filteredItemsWithIndex.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    Nenhum item corresponde ao filtro informado.
                  </div>
                ) : (
                  filteredItemsWithIndex.map(({ item, originalIndex }) => (
                    <div
                      key={originalIndex}
                      className={`p-3 flex items-center justify-between gap-3 transition-colors ${
                        selectedIndices.has(originalIndex)
                          ? 'hover:bg-slate-50/80'
                          : 'opacity-50 bg-slate-50/40'
                      }`}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <input
                          type="checkbox"
                          checked={selectedIndices.has(originalIndex)}
                          onChange={() => toggleItem(originalIndex)}
                          className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 cursor-pointer"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-slate-800 truncate">{item.name}</span>
                            <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-semibold shrink-0">
                              {item.cat}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Preço e Ações */}
                      <div className="flex items-center gap-2 shrink-0">
                        {editingIndex === originalIndex ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={editPrice}
                              onChange={(e) => setEditPrice(e.target.value.replace(/[^0-9,.]/g, ''))}
                              placeholder="0,00"
                              className="w-20 bg-white border border-slate-300 rounded-lg p-1 text-xs font-bold text-right"
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => handleSavePriceEdit(originalIndex)}
                              className="p-1 text-emerald-600 hover:text-emerald-700 cursor-pointer"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingIndex(null)}
                              className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-slate-900 min-w-[70px] text-right">
                              {formatPrice(item.price)}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingIndex(originalIndex);
                                setEditPrice(item.price.toFixed(2).replace('.', ','));
                              }}
                              className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                              title="Editar preço antes de salvar"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteItem(originalIndex)}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Remover item da importação"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Botões do Rodapé de Confirmação */}
              <div className="flex flex-col sm:flex-row gap-3 items-center justify-between pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setExtractedItems(null);
                    setFileBase64(null);
                  }}
                  className="w-full sm:w-auto text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-300 px-4 py-2.5 rounded-xl cursor-pointer"
                >
                  Voltar e Enviar Outro PDF
                </button>

                <div className="flex gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 sm:flex-initial text-xs font-bold text-slate-500 hover:text-slate-700 px-4 py-2.5 rounded-xl cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmApply}
                    disabled={isApplying || selectedIndices.size === 0}
                    className="flex-1 sm:flex-initial bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs px-6 py-2.5 rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    {isApplying ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    <span>
                      Aplicar {selectedIndices.size} Itens ao Cardápio ({importMode === 'replace' ? 'Substituir' : 'Mesclar'})
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
