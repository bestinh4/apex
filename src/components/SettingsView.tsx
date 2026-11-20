import React, { useState, useEffect, useRef } from 'react';
import { useBankroll } from '../context/BankrollContext';
import { PWAInstallButton } from './PWAInstallButton';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface SettingsViewProps {
  onSuccessToast?: (msg: string) => void;
  onNavigateTab: (tab: any) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  onSuccessToast,
  onNavigateTab
}) => {
  const {
    currentUser,
    isCloudAuthenticated,
    cloudSyncStatus,
    cloudSyncError,
    lastSyncedAt,
    signInWithGoogle,
    uploadLocalToCloud,
    signOut,
    bets,
    treasury,
    freebets,
    freeSpins,
    settings,
    updateSettings,
    resetData,
    loadDemoData,
    importBackup,
    syncNow
  } = useBankroll();
  const { canShowInstallUI } = usePWAInstall();

  const [initialBankroll, setInitialBankroll] = useState(settings.initialBankroll.toString());
  const [unitValue, setUnitValue] = useState(settings.unitValue.toString());
  const [confirmClear, setConfirmClear] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isConnectingGoogle, setIsConnectingGoogle] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setInitialBankroll(String(settings.initialBankroll));
    setUnitValue(String(settings.unitValue));
  }, [settings.initialBankroll, settings.unitValue]);

  const parseNum = (val: string | number): number => {
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    if (!val) return 0;
    const clean = String(val).trim().replace(',', '.');
    const parsed = parseFloat(clean);
    return isNaN(parsed) ? 0 : parsed;
  };

  const numBankroll = parseNum(initialBankroll) || 1000;
  const numUnit = parseNum(unitValue) || 25;
  const unitPct = numBankroll > 0 ? (numUnit / numBankroll) * 100 : 0;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      initialBankroll: numBankroll,
      unitValue: numUnit
    });
    onSuccessToast?.('Configurações da sua banca salvas com sucesso!');
  };

  const applyUnitPctPreset = (pct: number) => {
    const calculated = ((numBankroll * pct) / 100).toFixed(2);
    setUnitValue(calculated);
  };

  const handleConnectGoogle = async () => {
    setIsConnectingGoogle(true);
    const res = await signInWithGoogle();
    setIsConnectingGoogle(false);
    if (res.success) {
      onSuccessToast?.('Conta Google conectada! Sincronização PC ↔ Celular ativada.');
    } else if (res.error) {
      onSuccessToast?.(res.error);
    }
  };

  const handleManualSync = async () => {
    if (!isCloudAuthenticated) {
      await handleConnectGoogle();
      return;
    }
    setIsSyncing(true);
    const ok = await syncNow();
    setIsSyncing(false);
    if (ok) {
      onSuccessToast?.('Dados sincronizados em tempo real com a nuvem!');
    } else {
      onSuccessToast?.('Não foi possível sincronizar agora. Verifique sua conexão.');
    }
  };

  const handlePushLocalBackupToCloud = async () => {
    if (!isCloudAuthenticated) return;
    setIsSyncing(true);
    const ok = await uploadLocalToCloud();
    setIsSyncing(false);
    if (ok) {
      onSuccessToast?.('Registros locais enviados e mesclados na sua conta Google!');
    } else {
      onSuccessToast?.('Erro ao enviar registros locais para a nuvem.');
    }
  };

  const handleExportBackup = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      userEmail: currentUser?.email,
      settings,
      bets,
      treasury,
      freebets,
      freeSpins
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json;charset=utf-8;'
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `apex_bankroll_backup_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    onSuccessToast?.('Backup individual exportado com sucesso!');
  };

  const handleImportBackupFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(String(event.target?.result || '{}'));
        importBackup(parsed);
        if (parsed.settings?.initialBankroll) {
          setInitialBankroll(String(parsed.settings.initialBankroll));
        }
        if (parsed.settings?.unitValue) {
          setUnitValue(String(parsed.settings.unitValue));
        }
        onSuccessToast?.('Backup restaurado na sua conta com sucesso!');
      } catch {
        onSuccessToast?.('Arquivo de backup inválido.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="w-full flex flex-col gap-4 sm:gap-6 animate-in fade-in duration-200">
      {/* Header + Active User Account Card */}
      <div className="bg-[#0e1422]/95 border border-white/[0.07] rounded-2xl p-4 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
            Ajustes & Gestão da Banca
          </h2>
          <p className="text-xs text-slate-400">
            Seus parâmetros e registros são exclusivos da sua conta
          </p>
        </div>

        {currentUser && (
          <div className="flex items-center justify-between sm:justify-end gap-3 bg-[#080c14] border border-white/[0.07] rounded-xl px-3.5 py-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              {currentUser.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt={currentUser.name}
                  className="w-8 h-8 rounded-lg object-cover border border-white/10 shrink-0"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-400 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                  {currentUser.name.slice(0, 2)}
                </div>
              )}
              <div className="min-w-0">
                <div className="text-xs font-semibold text-white truncate flex items-center gap-1.5">
                  <span className="truncate">{currentUser.name}</span>
                  {isCloudAuthenticated && (
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 text-[10px] font-semibold">
                      Google Nuvem
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-400 truncate font-mono">
                  {isCloudAuthenticated ? currentUser.email : 'Modo Local (apenas este aparelho)'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {isCloudAuthenticated ? (
                <button
                  type="button"
                  onClick={signOut}
                  className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 text-rose-400 text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  <span className="material-symbols-outlined text-[15px]">logout</span>
                  <span>Desconectar</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleConnectGoogle}
                  disabled={isConnectingGoogle}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  <span className="material-symbols-outlined text-[15px]">cloud_sync</span>
                  <span>{isConnectingGoogle ? 'Conectando...' : 'Conectar Google'}</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Firebase Real-time Cloud Sync (PC <-> Mobile) */}
      <div className="bg-[#0e1422]/95 border border-white/[0.07] rounded-2xl p-4 sm:p-6 shadow-sm flex flex-col gap-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                isCloudAuthenticated
                  ? cloudSyncStatus === 'error'
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                    : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-blue-500/10 border-blue-500/30 text-blue-400'
              }`}
            >
              <span className="material-symbols-outlined text-[22px]">
                {isCloudAuthenticated
                  ? cloudSyncStatus === 'error'
                    ? 'cloud_off'
                    : 'cloud_done'
                  : 'devices'}
              </span>
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                Sincronização em Tempo Real (PC ↔ Celular)
              </h3>
              {isCloudAuthenticated ? (
                <p className="text-xs text-slate-400 mt-0.5">
                  Conectado como{' '}
                  <span className="text-emerald-300 font-medium">{currentUser?.email}</span>. Toda
                  aposta, depósito ou ajuste feito no PC aparece instantaneamente no celular e
                  vice-versa.
                  {lastSyncedAt && (
                    <span className="text-slate-500 ml-1.5 font-mono">
                      (Atualizado às {lastSyncedAt.toLocaleTimeString('pt-BR')})
                    </span>
                  )}
                </p>
              ) : (
                <p className="text-xs text-slate-400 mt-0.5">
                  Atualmente seus dados ficam salvos apenas no navegador deste aparelho. Conecte a{' '}
                  <strong className="text-slate-200">mesma conta Google</strong> no computador e no
                  celular para sincronizar automaticamente na nuvem.
                </p>
              )}
              {cloudSyncError && (
                <p className="text-xs text-rose-400 mt-1.5">{cloudSyncError}</p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {isCloudAuthenticated ? (
              <>
                <button
                  type="button"
                  onClick={handleManualSync}
                  disabled={isSyncing}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">sync</span>
                  <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar Agora'}</span>
                </button>
                <button
                  type="button"
                  onClick={handlePushLocalBackupToCloud}
                  disabled={isSyncing}
                  className="px-3.5 py-2 bg-[#080c14] hover:bg-slate-800 border border-white/[0.08] text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px] text-blue-400">
                    cloud_upload
                  </span>
                  <span>Enviar Dados Locais</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleConnectGoogle}
                disabled={isConnectingGoogle}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-md shadow-blue-600/20"
              >
                <span className="material-symbols-outlined text-[17px]">cloud_sync</span>
                <span>
                  {isConnectingGoogle ? 'Conectando Google...' : 'Conectar Conta Google'}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Settings Form */}
      <div className="bg-[#0e1422]/95 border border-white/[0.07] rounded-2xl p-4 sm:p-6 shadow-sm">
        <form onSubmit={handleSave} className="flex flex-col gap-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Banca Inicial de Referência (R$)
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={initialBankroll}
                onChange={(e) => {
                  const val = e.target.value;
                  if (/^[0-9]*[.,]?[0-9]*$/.test(val) || val === '') {
                    setInitialBankroll(val);
                  }
                }}
                placeholder="1000,00"
                className="bg-[#080c14] border border-white/[0.08] text-white font-mono px-3.5 py-2.5 rounded-xl text-sm focus:outline-none focus:border-blue-500"
                required
              />
              <span className="text-[11px] text-slate-400">
                Ponto de partida usado no gráfico de evolução e cálculo de crescimento
              </span>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <label className="text-xs font-semibold text-slate-300">
                  Valor de 1.0 Unidade / Stake (R$)
                </label>
                <span className="text-[11px] font-mono text-blue-400 font-semibold tabular-nums whitespace-nowrap">
                  {unitPct.toFixed(1)}% da banca
                </span>
              </div>
              <input
                type="text"
                inputMode="decimal"
                value={unitValue}
                onChange={(e) => {
                  const val = e.target.value;
                  if (/^[0-9]*[.,]?[0-9]*$/.test(val) || val === '') {
                    setUnitValue(val);
                  }
                }}
                placeholder="25,00"
                className="bg-[#080c14] border border-white/[0.08] text-white font-mono px-3.5 py-2.5 rounded-xl text-sm focus:outline-none focus:border-blue-500"
                required
              />
              {/* Quick Unit % Presets */}
              <div className="flex items-center gap-1.5 pt-0.5">
                <span className="text-[11px] text-slate-400 mr-1">Atalhos:</span>
                {[1, 2, 2.5, 5].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => applyUnitPctPreset(pct)}
                    className="px-2.5 py-1 rounded-lg bg-[#080c14] hover:bg-slate-800 border border-white/[0.07] text-[11px] font-mono text-slate-300 transition-colors"
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end pt-3 border-t border-white/[0.06]">
            <button
              type="submit"
              className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-xs transition-all active:scale-95 shadow-md shadow-blue-500/20 flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">check</span>
              <span>Salvar Configurações</span>
            </button>
          </div>
        </form>
      </div>

      {/* Native App Installation Card (PWA) - only displayed when not yet installed */}
      {canShowInstallUI && (
        <div className="bg-[#0e1422]/95 border border-white/[0.07] rounded-2xl p-4 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
              Aplicativo Instalável (Android, iOS & Desktop)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Instale o aplicativo completo no seu aparelho para abrir em tela cheia, sem barra de endereço do navegador e com carregamento instantâneo.
            </p>
          </div>
          <div className="shrink-0">
            <PWAInstallButton variant="card" />
          </div>
        </div>
      )}

      {/* Backup & Data Control */}
      <div className="bg-[#0e1422]/95 border border-white/[0.07] rounded-2xl p-4 sm:p-6 shadow-sm flex flex-col gap-4">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
            Backup & Controle da Sua Conta
          </h3>
          <p className="text-xs text-slate-400">
            Exporte um backup em JSON, restaure registros ou limpe exclusivamente os dados da sua conta.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2.5">
          <button
            type="button"
            onClick={handleExportBackup}
            className="px-4 py-3 bg-[#080c14] hover:bg-slate-800/80 border border-white/[0.08] rounded-xl text-xs font-semibold text-slate-200 flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
          >
            <span className="material-symbols-outlined text-[18px] text-blue-400">download</span>
            <span>Exportar Backup (.json)</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-3 bg-[#080c14] hover:bg-slate-800/80 border border-white/[0.08] rounded-xl text-xs font-semibold text-slate-200 flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
          >
            <span className="material-symbols-outlined text-[18px] text-emerald-400">upload_file</span>
            <span>Importar Backup (.json)</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleImportBackupFile}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => {
              loadDemoData();
              onSuccessToast?.('Dados de demonstração carregados na sua conta!');
              onNavigateTab('dashboard');
            }}
            className="px-4 py-3 bg-[#080c14] hover:bg-slate-800/80 border border-white/[0.08] rounded-xl text-xs font-semibold text-slate-300 flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
          >
            <span className="material-symbols-outlined text-[18px] text-indigo-400">science</span>
            <span>Carregar Exemplo</span>
          </button>

          {confirmClear ? (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  resetData();
                  setConfirmClear(false);
                  onSuccessToast?.('Todos os registros da sua conta foram limpos!');
                  onNavigateTab('dashboard');
                }}
                className="flex-1 py-3 px-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-colors"
              >
                Confirmar Limpeza
              </button>
              <button
                type="button"
                onClick={() => setConfirmClear(false)}
                className="py-3 px-3 bg-[#080c14] border border-white/[0.08] text-slate-400 rounded-xl text-xs"
              >
                Cancelar
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmClear(true)}
              className="px-4 py-3 bg-[#080c14] hover:bg-rose-500/10 text-rose-400 border border-white/[0.08] hover:border-rose-500/30 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">delete_sweep</span>
              <span>Zerar Meus Dados</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
