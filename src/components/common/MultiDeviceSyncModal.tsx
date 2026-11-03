import React from 'react';
import {
  Smartphone,
  Monitor,
  RefreshCw,
  Copy,
  CheckCircle2,
  X,
  Wifi,
  ArrowLeftRight,
  Mic,
  Camera,
} from 'lucide-react';
import { Tenant } from '../../types/saas.ts';

interface ConnectedDeviceInfo {
  deviceId: string;
  deviceType: 'mobile' | 'desktop';
  operator: string;
}

interface MultiDeviceSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenant: Tenant;
  currentOperatorName?: string;
  myDeviceId: string;
  myDeviceType: 'mobile' | 'desktop';
  connectedDevices: ConnectedDeviceInfo[];
  lastSyncedBy: string | null;
  lastSyncedAt: number | null;
  onForcePullFromCloud: () => void;
  onForcePushToCloud: () => void;
  onCopyLink: (url: string) => void;
}

export const MultiDeviceSyncModal: React.FC<MultiDeviceSyncModalProps> = ({
  isOpen,
  onClose,
  tenant,
  currentOperatorName = 'Operador',
  myDeviceId,
  myDeviceType,
  connectedDevices,
  lastSyncedBy,
  lastSyncedAt,
  onForcePullFromCloud,
  onForcePushToCloud,
  onCopyLink,
}) => {
  if (!isOpen) return null;

  const barDirectUrl = `${window.location.origin}${window.location.pathname}?bar=${encodeURIComponent(
    tenant.slug
  )}&nome=${encodeURIComponent(tenant.name)}`;

  const qrCodeImgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=8&data=${encodeURIComponent(
    barDirectUrl
  )}`;

  const mobileCount = connectedDevices.filter((d) => d.deviceType === 'mobile').length;
  const desktopCount = connectedDevices.filter((d) => d.deviceType === 'desktop').length;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-slate-900 border border-slate-700/90 text-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-indigo-950 px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white">Celular + Computador Ao Vivo</h3>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black uppercase px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Tempo Real
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Sincronização instantânea do turno em andamento • <strong>{tenant.name}</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Diagrama Visual Celular <-> PC */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 flex items-center justify-around gap-2">
            <div className="flex flex-col items-center text-center">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center border mb-1.5 ${
                  mobileCount > 0 || myDeviceType === 'mobile'
                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                    : 'bg-slate-900 border-slate-800 text-slate-500'
                }`}
              >
                <Smartphone className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold text-white">No Celular</span>
              <span className="text-[10px] text-slate-400">Fotos OCR, Voz e Balcão</span>
            </div>

            <div className="flex flex-col items-center">
              <div className="flex items-center gap-1 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <div className="w-12 sm:w-20 h-0.5 bg-gradient-to-r from-emerald-500 via-cyan-400 to-indigo-500" />
                <Wifi className="w-4 h-4 text-cyan-400 animate-pulse" />
                <div className="w-12 sm:w-20 h-0.5 bg-gradient-to-r from-indigo-500 via-cyan-400 to-emerald-500" />
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <span className="text-[10px] font-bold text-emerald-300 mt-1 uppercase tracking-wider">
                Sincronia Automática
              </span>
            </div>

            <div className="flex flex-col items-center text-center">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center border mb-1.5 ${
                  desktopCount > 0 || myDeviceType === 'desktop'
                    ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-400'
                    : 'bg-slate-900 border-slate-800 text-slate-500'
                }`}
              >
                <Monitor className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold text-white">No Computador</span>
              <span className="text-[10px] text-slate-400">Conferência e Zeramentos</span>
            </div>
          </div>

          {/* Aparelhos Conectados Agora */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Aparelhos Conectados neste Caixa ({ Math.max(1, connectedDevices.length) })
              </span>
              {lastSyncedAt && (
                <span className="text-[10px] text-emerald-400 font-semibold">
                  Último envio: {new Date(lastSyncedAt).toLocaleTimeString('pt-BR')}
                  {lastSyncedBy ? ` • ${lastSyncedBy}` : ''}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {connectedDevices.length === 0 ? (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 flex items-center gap-2.5 text-xs">
                  {myDeviceType === 'mobile' ? (
                    <Smartphone className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <Monitor className="w-4 h-4 text-indigo-400 shrink-0" />
                  )}
                  <div>
                    <span className="font-bold text-white block capitalize">
                      {currentOperatorName} (Este {myDeviceType === 'mobile' ? 'Celular' : 'Computador'})
                    </span>
                    <span className="text-[10px] text-emerald-400">Conectado à nuvem</span>
                  </div>
                </div>
              ) : (
                connectedDevices.map((dev) => {
                  const isMe = dev.deviceId === myDeviceId;
                  return (
                    <div
                      key={dev.deviceId}
                      className={`rounded-xl p-2.5 flex items-center gap-2.5 text-xs border ${
                        isMe
                          ? 'bg-emerald-950/30 border-emerald-500/40'
                          : 'bg-slate-900 border-slate-800'
                      }`}
                    >
                      {dev.deviceType === 'mobile' ? (
                        <Smartphone className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <Monitor className="w-4 h-4 text-indigo-400 shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <span className="font-bold text-white truncate block capitalize">
                          {dev.operator}{' '}
                          <span className="text-[10px] font-normal text-slate-400">
                            ({dev.deviceType === 'mobile' ? 'Celular' : 'Computador'}
                            {isMe ? ' • Você' : ''})
                          </span>
                        </span>
                        <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Sincronizando ao vivo
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* QR Code e Link Rápido para Abrir no Outro Aparelho */}
          <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-4">
            <div className="bg-white p-2 rounded-2xl shrink-0 shadow-md">
              <img
                src={qrCodeImgUrl}
                alt={`QR Code ${tenant.name}`}
                className="w-28 h-28 rounded-lg object-contain"
              />
            </div>
            <div className="space-y-2 text-center sm:text-left flex-1">
              <h4 className="text-xs font-black text-white uppercase tracking-wider">
                Abra no seu {myDeviceType === 'desktop' ? 'Celular' : 'Computador'} agora:
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Aponte a câmera do celular para o QR Code ao lado ou copie o link exclusivo de{' '}
                <strong>{tenant.name}</strong>. Tudo o que você preencher em um aparelho aparece no outro na mesma hora!
              </p>
              <button
                type="button"
                onClick={() => onCopyLink(barDirectUrl)}
                className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-3.5 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copiar Link de {tenant.name}</span>
              </button>
            </div>
          </div>

          {/* Dicas de Uso Simultâneo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
            <div className="bg-slate-800/60 border border-slate-700/70 rounded-xl p-3 flex items-start gap-2.5">
              <Camera className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white block mb-0.5">1. Fotos e Voz no Celular</strong>
                <span className="text-slate-400 text-[11px]">
                  Tire foto dos comprovantes das maquininhas ou dite os valores por voz pelo celular.
                </span>
              </div>
            </div>
            <div className="bg-slate-800/60 border border-slate-700/70 rounded-xl p-3 flex items-start gap-2.5">
              <Mic className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white block mb-0.5">2. Zeramentos no PC</strong>
                <span className="text-slate-400 text-[11px]">
                  Na tela do computador, os valores já aparecem preenchidos prontos para terminar os zeramentos!
                </span>
              </div>
            </div>
          </div>

          {/* Botões de Sincronização Manual */}
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onForcePullFromCloud}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
              <span>Buscar Dados do Outro Aparelho</span>
            </button>
            <button
              type="button"
              onClick={onForcePushToCloud}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-md"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Enviar Meus Dados Agora</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
