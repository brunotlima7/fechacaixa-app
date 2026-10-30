import React, { useState } from 'react';
import {
  X,
  History,
  Search,
  Filter,
  CheckCircle2,
  CreditCard,
  DollarSign,
  Calculator,
  ShieldCheck,
  Copy,
  Trash2,
  FileSpreadsheet
} from 'lucide-react';
import { AuditLogEntry } from '../../types/saas.ts';

interface AuditTrailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  logs: AuditLogEntry[];
  currentOperatorName?: string;
  onClearLogs?: () => void;
  onShowToast: (msg: string) => void;
}

export const AuditTrailDrawer: React.FC<AuditTrailDrawerProps> = ({
  isOpen,
  onClose,
  logs,
  currentOperatorName,
  onClearLogs,
  onShowToast,
}) => {
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  const filteredLogs = logs.filter((log) => {
    const matchesCat = filterCategory === 'all' || log.category === filterCategory;
    const term = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !term ||
      log.action.toLowerCase().includes(term) ||
      log.details.toLowerCase().includes(term) ||
      log.operator.toLowerCase().includes(term) ||
      log.timestamp.includes(term);
    return matchesCat && matchesSearch;
  });

  const getCategoryBadge = (cat: AuditLogEntry['category']) => {
    switch (cat) {
      case 'zeramento':
        return {
          label: 'Zeramento',
          bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />,
        };
      case 'comanda':
        return {
          label: 'Comanda Reaberta',
          bg: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
          icon: <Calculator className="w-3.5 h-3.5 text-purple-400" />,
        };
      case 'pdv':
        return {
          label: 'PDV',
          bg: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
          icon: <FileSpreadsheet className="w-3.5 h-3.5 text-blue-400" />,
        };
      case 'cartoes':
        return {
          label: 'Cartões / OCR',
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

  const handleCopyLogs = () => {
    if (logs.length === 0) {
      onShowToast('Nenhum registro para copiar.');
      return;
    }
    const text = logs
      .map((l) => `[${l.timestamp}] [${l.operator}] [${l.category.toUpperCase()}] ${l.action}: ${l.details}`)
      .join('\n');
    navigator.clipboard.writeText(text);
    onShowToast('Histórico de auditoria copiado para a área de transferência!');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/75 backdrop-blur-xs animate-fade-in">
      <div className="bg-slate-900 border-l border-slate-800 w-full max-w-xl h-full flex flex-col shadow-2xl overflow-hidden text-slate-100">
        {/* Cabeçalho */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-600/20 border border-orange-500/30 flex items-center justify-center text-orange-400">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-white text-base flex items-center gap-2">
                <span>Auditoria & Registro do Operador</span>
                <span className="bg-orange-500/20 text-orange-300 border border-orange-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {logs.length} ações
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Linha do tempo contínua de tudo o que foi preenchido, simulado e marcado no turno.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
            title="Fechar auditoria"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filtros e Busca */}
        <div className="p-3.5 sm:p-4 border-b border-slate-800 bg-slate-900/90 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por operador, valor, item ou ação..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2 pl-9 pr-3 text-xs text-white outline-none focus:ring-1 focus:ring-orange-500 placeholder:text-slate-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <span className="text-[10px] font-bold uppercase text-slate-500 mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3" /> Categoria:
            </span>
            {[
              { id: 'all', label: 'Todas' },
              { id: 'zeramento', label: 'Zeramento' },
              { id: 'comanda', label: 'Comanda' },
              { id: 'pdv', label: 'PDV' },
              { id: 'cartoes', label: 'Cartões' },
              { id: 'gaveta', label: 'Gaveta' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setFilterCategory(cat.id)}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] whitespace-nowrap transition-colors cursor-pointer ${
                  filterCategory === cat.id
                    ? 'bg-orange-600 text-white shadow-sm'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Linha do Tempo de Ações */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-950/40">
          {filteredLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500 space-y-2">
              <History className="w-10 h-10 stroke-[1.5] text-slate-600" />
              <p className="text-sm font-semibold">Nenhum evento registrado ainda.</p>
              <p className="text-xs text-slate-600 text-center max-w-xs">
                Conforme o operador preencher os valores das máquinas, gaveta, comanda e opções de zeramento, as ações aparecerão aqui em tempo real.
              </p>
            </div>
          ) : (
            filteredLogs.map((log) => {
              const badge = getCategoryBadge(log.category);
              return (
                <div
                  key={log.id}
                  className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs hover:border-slate-700 transition-colors shadow-xs"
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${badge.bg}`}>
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
                  <p className="text-slate-300 leading-relaxed font-medium bg-slate-950/50 p-2 rounded-lg border border-slate-800/80">
                    {log.details}
                  </p>
                </div>
              );
            })
          )}
        </div>

        {/* Rodapé de Ações */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/90 flex items-center justify-between gap-3">
          <div className="text-[11px] text-slate-400">
            {currentOperatorName && (
              <span>Operador atual: <strong className="text-white capitalize">{currentOperatorName}</strong></span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {onClearLogs && logs.length > 0 && (
              <button
                onClick={() => {
                  if (window.confirm('Deseja limpar os registros da sessão atual?')) {
                    onClearLogs();
                    onShowToast('Registros do turno limpos.');
                  }
                }}
                className="px-3 py-1.5 rounded-lg border border-rose-900/50 hover:bg-rose-950/40 text-rose-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                title="Limpar registros do turno"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Limpar</span>
              </button>
            )}
            <button
              onClick={handleCopyLogs}
              className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copiar Log</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
