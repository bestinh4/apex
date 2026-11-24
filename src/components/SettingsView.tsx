import React, { useState, useEffect, useRef } from 'react';
import { useBankroll } from '../context/BankrollContext';
import { PWAInstallButton } from './PWAInstallButton';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { FIREBASE_PROJECT_ID } from '../lib/firebase';
import { BetDateRecoveryCandidate } from '../types';

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
    unauthorizedDomain,
    lastSyncedAt,
    signInWithGoogle,
    uploadLocalToCloud,
    signOut,
    bets,
    treasury,
    freebets,
    freeSpins,
    promoConversions,
    settings,
    updateSettings,
    resetData,
    loadDemoData,
    importBackup,
    syncNow,
    previewBetDateRecovery,
    applyBetDateRecovery
  } = useBankroll();
  const { canShowInstallUI } = usePWAInstall();

  const [initialBankroll, setInitialBankroll] = useState(settings.initialBankroll.toString());
  const [initialPromoBalance, setInitialPromoBalance] = useState(
    String(settings.initialPromoBalance ?? 0)
  );
  const [unitValue, setUnitValue] = useState(settings.unitValue.toString());
  const [confirmClear, setConfirmClear] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isConnectingGoogle, setIsConnectingGoogle] = useState(false);
  const [recoveryCandidates, setRecoveryCandidates] = useState<BetDateRecoveryCandidate[]>([]);
  const [recoveryWasChecked, setRecoveryWasChecked] = useState(false);
  const [isCheckingRecovery, setIsCheckingRecovery] = useState(false);
  const [isApplyingRecovery, setIsApplyingRecovery] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setInitialBankroll(String(settings.initialBankroll));
    setInitialPromoBalance(String(settings.initialPromoBalance ?? 0));
    setUnitValue(String(settings.unitValue));
  }, [settings.initialBankroll, settings.initialPromoBalance, settings.unitValue]);

  const parseNum = (val: string | number): number => {
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    if (!val) return 0;
    const clean = String(val).trim().replace(',', '.');
    const parsed = parseFloat(clean);
    return isNaN(parsed) ? 0 : parsed;
  };

  const numBankroll = parseNum(initialBankroll) || 0;
  const numPromo = Math.max(0, parseNum(initialPromoBalance));
  const numUnit = parseNum(unitValue) || 25;
  const unitPct = numBankroll > 0 ? (numUnit / numBankroll) * 100 : 0;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      initialBankroll: Math.max(0, numBankroll),
      initialPromoBalance: numPromo,
      unitValue: Math.max(0.01, numUnit)
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


  const handlePreviewBetDateRecovery = async () => {
    setIsCheckingRecovery(true);
    setRecoveryWasChecked(false);
    setRecoveryCandidates([]);
    const result = await previewBetDateRecovery();
    setIsCheckingRecovery(false);
    if (!result.success) {
      onSuccessToast?.(result.error || 'Não foi possível analisar as datas.');
      return;
    }
    setRecoveryCandidates(result.candidates);
    setRecoveryWasChecked(true);
    if (result.candidates.length === 0) {
      onSuccessToast?.('Nenhuma data recuperável foi encontrada nos registros da nuvem.');
    }
  };

  const handleApplyBetDateRecovery = async () => {
    if (!recoveryCandidates.length || isApplyingRecovery) return;
    const confirmed = window.confirm(
      `Confirma a recuperação de ${recoveryCandidates.length} data(s) usando o horário original de cadastro? Nenhum valor ou resultado de aposta será alterado.`
    );
    if (!confirmed) return;
    setIsApplyingRecovery(true);
    const result = await applyBetDateRecovery(recoveryCandidates);
    setIsApplyingRecovery(false);
    if (result.success) {
      setRecoveryCandidates([]);
      setRecoveryWasChecked(false);
      onSuccessToast?.(
        `${result.recovered} data(s) recuperada(s). ${result.skipped} registro(s) foram ignorados por já terem mudado ou não coincidirem mais com a prévia.`
      );
    } else {
      onSuccessToast?.(result.error || 'Não foi possível recuperar as datas.');
    }
  };

  const handleCopyUnauthorizedDomain = async (domain: string) => {
    try {
      await navigator.clipboard.writeText(domain);
      onSuccessToast?.(`Domínio "${domain}" copiado!`);
    } catch {
      onSuccessToast?.(`Copie manualmente: ${domain}`);
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
      freeSpins,
      promoConversions
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
        if (parsed.settings?.initialBankroll !== undefined) {
          setInitialBankroll(String(parsed.settings.initialBankroll));
        }
        if (parsed.settings?.initialPromoBalance !== undefined) {
          setInitialPromoBalance(String(parsed.settings.initialPromoBalance));
        }
        if (parsed.settings?.unitValue !== undefined) {
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
      <div className="bg-white border border-slate-300/80 ring-1 ring-slate-900/[0.03] rounded-2xl p-4 sm:p-6 shadow-[0_1px_2px_rgba(15,23,42,0.05),0_4px_14px_-2px_rgba(15,23,42,0.06)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
            Ajustes & Gestão da Banca
          </h2>
          <p className="text-xs text-slate-600">
            Seus parâmetros e registros são exclusivos da sua conta
          </p>
        </div>

        {currentUser && (
          <div className="flex items-center justify-between sm:justify-end gap-3 bg-slate-50/90 border border-slate-300/80 rounded-xl px-3.5 py-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              {currentUser.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt={currentUser.name}
                  className="w-8 h-8 rounded-lg object-cover border border-slate-300 shrink-0"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs uppercase shrink-0">
                  {currentUser.name.slice(0, 2)}
                </div>
              )}
              <div className="min-w-0">
                <div className="text-xs font-semibold text-slate-900 truncate flex items-center gap-1.5">
                  <span className="truncate">{currentUser.name}</span>
                  {isCloudAuthenticated && (
                    <span className="px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-300 text-emerald-800 text-[10px] font-semibold">
                      Google Nuvem
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-600 truncate font-mono">
                  {isCloudAuthenticated ? currentUser.email : 'Modo Local (apenas este aparelho)'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {isCloudAuthenticated ? (
                <button
                  type="button"
                  onClick={signOut}
                  className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-300 text-rose-800 text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  <span className="material-symbols-outlined text-[15px]">logout</span>
                  <span>Desconectar</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleConnectGoogle}
                  disabled={isConnectingGoogle}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1 transition-colors"
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
      <div className="bg-white border border-slate-300/80 ring-1 ring-slate-900/[0.03] rounded-2xl p-4 sm:p-6 shadow-[0_1px_2px_rgba(15,23,42,0.05),0_4px_14px_-2px_rgba(15,23,42,0.06)] flex flex-col gap-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white shadow-sm ${
                isCloudAuthenticated
                  ? cloudSyncStatus === 'error'
                    ? 'bg-rose-600 shadow-rose-600/20'
                    : 'bg-emerald-700 shadow-emerald-700/20'
                  : 'bg-blue-600 shadow-blue-600/20'
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
              <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                Sincronização em Tempo Real (PC ↔ Celular)
              </h3>
              {isCloudAuthenticated ? (
                <p className="text-xs text-slate-600 mt-0.5">
                  Conectado como{' '}
                  <span className="text-emerald-700 font-semibold">{currentUser?.email}</span>. Toda
                  aposta, depósito ou ajuste feito no PC aparece instantaneamente no celular e
                  vice-versa.
                  {lastSyncedAt && (
                    <span className="text-slate-600 ml-1.5 font-mono">
                      (Atualizado às {lastSyncedAt.toLocaleTimeString('pt-BR')})
                    </span>
                  )}
                </p>
              ) : (
                <p className="text-xs text-slate-600 mt-0.5">
                  Atualmente seus dados ficam salvos apenas no navegador deste aparelho. Conecte a{' '}
                  <strong className="text-slate-900">mesma conta Google</strong> no computador e no
                  celular para sincronizar automaticamente na nuvem.
                </p>
              )}
              {cloudSyncError && !unauthorizedDomain && (
                <p className="text-xs text-rose-700 font-medium mt-1.5">{cloudSyncError}</p>
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
                  className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm shadow-emerald-700/20"
                >
                  <span className="material-symbols-outlined text-[16px]">sync</span>
                  <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar Agora'}</span>
                </button>
                <button
                  type="button"
                  onClick={handlePushLocalBackupToCloud}
                  disabled={isSyncing}
                  className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-300 hover:border-slate-400 text-slate-800 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px] text-blue-700">
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
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm shadow-blue-600/20"
              >
                <span className="material-symbols-outlined text-[17px]">cloud_sync</span>
                <span>
                  {isConnectingGoogle ? 'Conectando Google...' : 'Conectar Conta Google'}
                </span>
              </button>
            )}
          </div>
        </div>

        {unauthorizedDomain && (
          <div className="bg-amber-50 border border-amber-300 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs text-amber-900 leading-relaxed">
              <strong className="text-amber-950">Ação necessária no Firebase Auth:</strong> o domínio{' '}
              <code className="px-1.5 py-0.5 rounded bg-amber-100 font-mono text-amber-950 font-semibold">
                {unauthorizedDomain}
              </code>{' '}
              precisa estar listado em{' '}
              <strong>Authentication → Settings → Authorized domains</strong> no projeto{' '}
              <code className="font-mono text-amber-950 font-semibold">{FIREBASE_PROJECT_ID}</code>.
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleCopyUnauthorizedDomain(unauthorizedDomain)}
                className="px-3 py-1.5 rounded-lg bg-amber-200/70 hover:bg-amber-200 text-amber-950 text-xs font-semibold whitespace-nowrap transition-colors"
              >
                Copiar Domínio
              </button>
              <a
                href={`https://console.firebase.google.com/project/${FIREBASE_PROJECT_ID}/authentication/settings`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold whitespace-nowrap transition-colors"
              >
                Autorizar no Console
              </a>
            </div>
          </div>
        )}
      </div>


      {/* Safe recovery of historical bet dates */}
      <div className="bg-white border border-slate-300/80 ring-1 ring-slate-900/[0.03] rounded-2xl p-4 sm:p-6 shadow-[0_1px_2px_rgba(15,23,42,0.05),0_4px_14px_-2px_rgba(15,23,42,0.06)] flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[22px]">history</span>
          </div>
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-bold text-slate-900">Recuperar datas antigas das apostas</h3>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              O Apex compara a data exibida com o horário original de cadastro salvo no Firestore.
              Primeiro fazemos uma prévia. Só corrigimos os registros depois da sua confirmação.
              Valores, odds, unidades e resultados não são modificados.
            </p>
          </div>
        </div>

        {!isCloudAuthenticated ? (
          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3">
            Conecte a mesma conta Google que contém suas apostas para consultar os horários originais.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handlePreviewBetDateRecovery}
                disabled={isCheckingRecovery || isApplyingRecovery}
                className="px-3.5 py-2 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">manage_search</span>
                {isCheckingRecovery ? 'Analisando registros...' : 'Analisar datas recuperáveis'}
              </button>
              {recoveryWasChecked && recoveryCandidates.length > 0 && (
                <button
                  type="button"
                  onClick={handleApplyBetDateRecovery}
                  disabled={isApplyingRecovery || isCheckingRecovery}
                  className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">event_available</span>
                  {isApplyingRecovery ? 'Recuperando...' : `Confirmar recuperação (${recoveryCandidates.length})`}
                </button>
              )}
            </div>

            {recoveryWasChecked && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 flex flex-col gap-2">
                {recoveryCandidates.length > 0 ? (
                  <>
                    <p className="text-xs font-semibold text-slate-800">
                      Prévia: {recoveryCandidates.length} aposta(s) com data recuperável
                    </p>
                    <div className="max-h-64 overflow-y-auto divide-y divide-slate-200">
                      {recoveryCandidates.slice(0, 12).map((candidate) => (
                        <div key={candidate.id} className="py-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-xs">
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-800 truncate">{candidate.event}</p>
                            <p className="text-slate-500">{candidate.bookmaker} · Data atual: {candidate.currentDate || 'sem data'}</p>
                          </div>
                          <p className="font-mono font-bold text-emerald-700 shrink-0">
                            {candidate.recoveredDate.split('-').reverse().join('/')}
                          </p>
                        </div>
                      ))}
                    </div>
                    {recoveryCandidates.length > 12 && (
                      <p className="text-[11px] text-slate-500">
                        Exibindo as primeiras 12. A confirmação considera todas as {recoveryCandidates.length} apostas.
                      </p>
                    )}
                    <p className="text-[11px] text-amber-800">
                      A data recuperada representa o dia do cadastro no Apex, não necessariamente o dia da partida.
                    </p>
                  </>
                ) : (
                  <p className="text-xs text-slate-600">
                    Nenhuma aposta com data genérica ou data atual incompatível com o horário de cadastro foi encontrada.
                    Registros sem horário original não podem ser recuperados com segurança.
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Main Settings Form */}
      <div className="bg-white border border-slate-300/80 ring-1 ring-slate-900/[0.03] rounded-2xl p-4 sm:p-6 shadow-[0_1px_2px_rgba(15,23,42,0.05),0_4px_14px_-2px_rgba(15,23,42,0.06)]">
        <form onSubmit={handleSave} className="flex flex-col gap-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Banca Real Inicial (R$)
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
                className="bg-slate-50 border border-slate-300 hover:border-slate-400 text-slate-900 font-mono px-3.5 py-2.5 rounded-xl text-sm focus:outline-none focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-600/15 placeholder:text-slate-500"
                required
              />
              <span className="text-[11px] text-slate-600">
                Base do patrimônio real e gráfico de evolução
              </span>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Saldo Promocional Inicial (R$)
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={initialPromoBalance}
                onChange={(e) => {
                  const val = e.target.value;
                  if (/^[0-9]*[.,]?[0-9]*$/.test(val) || val === '') {
                    setInitialPromoBalance(val);
                  }
                }}
                placeholder="0,00"
                className="bg-slate-50 border border-slate-300 hover:border-slate-400 text-amber-800 font-bold font-mono px-3.5 py-2.5 rounded-xl text-sm focus:outline-none focus:border-amber-600 focus:bg-white focus:ring-2 focus:ring-amber-600/15 placeholder:text-slate-500"
              />
              <span className="text-[11px] text-slate-600">
                Saldo inicial isolado em bônus / promoções (opcional)
              </span>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <label className="text-xs font-semibold text-slate-700">
                  Valor de 1.0 Unidade / Stake (R$)
                </label>
                <span className="text-[11px] font-mono text-blue-700 font-semibold tabular-nums whitespace-nowrap">
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
                className="bg-slate-50 border border-slate-300 hover:border-slate-400 text-slate-900 font-mono px-3.5 py-2.5 rounded-xl text-sm focus:outline-none focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-600/15 placeholder:text-slate-500"
                required
              />
              {/* Quick Unit % Presets */}
              <div className="flex items-center gap-1.5 pt-0.5">
                <span className="text-[11px] text-slate-600 mr-1">Atalhos:</span>
                {[1, 2, 2.5, 5].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => applyUnitPctPreset(pct)}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 border border-slate-300 hover:border-blue-400 text-[11px] font-mono font-semibold text-slate-700 hover:text-blue-800 transition-colors"
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end pt-3 border-t border-slate-300/80">
            <button
              type="submit"
              className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs transition-all active:scale-95 shadow-sm shadow-blue-600/20 flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">check</span>
              <span>Salvar Configurações</span>
            </button>
          </div>
        </form>
      </div>

      {/* Native App Installation Card (PWA) - only displayed when not yet installed */}
      {canShowInstallUI && (
        <div className="bg-white border border-slate-300/80 ring-1 ring-slate-900/[0.03] rounded-2xl p-4 sm:p-6 shadow-[0_1px_2px_rgba(15,23,42,0.05),0_4px_14px_-2px_rgba(15,23,42,0.06)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
              Aplicativo Instalável (Android, iOS & Desktop)
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">
              Instale o aplicativo completo no seu aparelho para abrir em tela cheia, sem barra de endereço do navegador e com carregamento instantâneo.
            </p>
          </div>
          <div className="shrink-0">
            <PWAInstallButton variant="card" />
          </div>
        </div>
      )}

      {/* Backup & Data Control */}
      <div className="bg-white border border-slate-300/80 ring-1 ring-slate-900/[0.03] rounded-2xl p-4 sm:p-6 shadow-[0_1px_2px_rgba(15,23,42,0.05),0_4px_14px_-2px_rgba(15,23,42,0.06)] flex flex-col gap-4">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
            Backup & Controle da Sua Conta
          </h3>
          <p className="text-xs text-slate-600">
            Exporte um backup em JSON, restaure registros ou limpe exclusivamente os dados da sua conta.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2.5">
          <button
            type="button"
            onClick={handleExportBackup}
            className="px-4 py-3 bg-slate-50/90 hover:bg-slate-100 border border-slate-300 hover:border-slate-400 rounded-xl text-xs font-semibold text-slate-800 flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
          >
            <span className="material-symbols-outlined text-[18px] text-blue-700">download</span>
            <span>Exportar Backup (.json)</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-3 bg-slate-50/90 hover:bg-slate-100 border border-slate-300 hover:border-slate-400 rounded-xl text-xs font-semibold text-slate-800 flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
          >
            <span className="material-symbols-outlined text-[18px] text-emerald-700">upload_file</span>
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
            className="px-4 py-3 bg-slate-50/90 hover:bg-slate-100 border border-slate-300 hover:border-slate-400 rounded-xl text-xs font-semibold text-slate-800 flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
          >
            <span className="material-symbols-outlined text-[18px] text-indigo-700">science</span>
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
                className="flex-1 py-3 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors"
              >
                Confirmar Limpeza
              </button>
              <button
                type="button"
                onClick={() => setConfirmClear(false)}
                className="py-3 px-3 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 rounded-xl text-xs font-semibold transition-colors"
              >
                Cancelar
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmClear(true)}
              className="px-4 py-3 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
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
