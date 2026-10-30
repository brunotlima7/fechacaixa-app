import React, { useState } from 'react';
import { ChevronDown, Store, ShieldCheck, CreditCard, Plus, Check } from 'lucide-react';
import { Tenant } from '../../types/saas.ts';

interface StoreSwitcherProps {
  tenants: Tenant[];
  currentTenant: Tenant;
  onSelectTenant: (tenant: Tenant) => void;
  onOpenMasterPanel: () => void;
  onOpenBilling: () => void;
}

export const StoreSwitcher: React.FC<StoreSwitcherProps> = ({
  tenants,
  currentTenant,
  onSelectTenant,
  onOpenMasterPanel,
  onOpenBilling,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-slate-800/90 hover:bg-slate-700/90 text-white px-3 py-1.5 rounded-xl border border-slate-700 transition-all text-xs font-bold shadow-sm"
      >
        <div
          className={`w-5 h-5 rounded-md bg-gradient-to-tr ${currentTenant.logoColor} flex items-center justify-center font-black text-[10px] text-white shadow-xs`}
        >
          {currentTenant.logoInitials}
        </div>
        <div className="flex flex-col text-left">
          <span className="leading-tight truncate max-w-[140px] sm:max-w-[200px]">{currentTenant.name}</span>
          <span className="text-[9px] text-slate-400 font-normal leading-none">{currentTenant.city}</span>
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 mt-2 w-72 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl py-2 z-50 text-white animate-fade-in divide-y divide-slate-800">
            <div className="px-3.5 py-2 text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>Bares de Curitiba (SaaS)</span>
              <span className="text-emerald-400">{tenants.length} cadastrados</span>
            </div>

            <div className="py-1 max-h-60 overflow-y-auto">
              {tenants.map((t) => {
                const isSelected = t.id === currentTenant.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => {
                      onSelectTenant(t);
                      setIsOpen(false);
                    }}
                    className={`w-full px-3.5 py-2 text-left flex items-center justify-between hover:bg-slate-800 transition-colors ${
                      isSelected ? 'bg-slate-800/80 text-orange-400 font-bold' : 'text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-6 h-6 rounded-md bg-gradient-to-tr ${t.logoColor} text-white font-black text-[10px] flex items-center justify-center`}
                      >
                        {t.logoInitials}
                      </div>
                      <div>
                        <span className="text-xs block leading-tight">{t.name}</span>
                        <span className="text-[10px] text-slate-400 block">{t.city}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {t.status === 'bloqueado' && (
                        <span className="text-[9px] bg-rose-500/20 text-rose-400 border border-rose-500/30 px-1.5 py-0.5 rounded font-bold uppercase">
                          Suspenso
                        </span>
                      )}
                      {isSelected && <Check className="w-4 h-4 text-orange-400" />}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="p-2 space-y-1 bg-slate-950/50 rounded-b-2xl">
              <button
                onClick={() => {
                  setIsOpen(false);
                  onOpenBilling();
                }}
                className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-teal-400 hover:bg-teal-950/40 transition-colors flex items-center gap-2"
              >
                <CreditCard className="w-4 h-4" />
                <span>Assinatura & Faturamento do Bar</span>
              </button>

              <button
                onClick={() => {
                  setIsOpen(false);
                  onOpenMasterPanel();
                }}
                className="w-full text-left px-3 py-2 rounded-xl text-xs font-black text-amber-400 hover:bg-amber-950/40 transition-colors flex items-center gap-2"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Painel Master (Centro de Comando)</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
