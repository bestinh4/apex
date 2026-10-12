import React, { useState, useEffect, useRef } from 'react';
import { useBankroll } from '../context/BankrollContext';
import { PWAInstallButton } from './PWAInstallButton';
import { usePWAInstall } from '../hooks/usePWAInstall';
import {
  isSupabaseConfigured,
  SUPABASE_PROJECT_REF,
  SUPABASE_REGION,
  SUPABASE_SQL_SCHEMA
} from '../lib/supabase';
import { localResetPassword } from '../lib/localAuth';

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
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
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

  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [showPasswordChange, setShowPasswordChange] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.email) return;
    if (newPasswordInput.trim().length < 6) {
      onSuccessToast?.('A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }
    const res = await localResetPassword(currentUser.email, newPasswordInput.trim());
    if (res.success) {
      onSuccessToast?.('Senha da sua conta alterada com sucesso!');
      setNewPasswordInput('');
      setShowPasswordChange(false);
    } else {
      onSuccessToast?.(res.error || 'Erro ao alterar senha.');
    }
  };

  const handleManualSync = async () => {
    if (!isSupabaseConfigured) {
      onSuccessToast?.('Modo Local Seguro ativo. Seus dados estão 100% salvos e isolados neste dispositivo.');
      return;
    }
    setIsSyncing(true);
    const ok = await syncNow();
    setIsSyncing(false);
    if (ok) {
      onSuccessToast?.('Seus dados foram sincronizados com a nuvem!');
    } else {
      setShowSqlModal(true);
      onSuccessToast?.('Falha ao conectar com o Supabase. Seus dados continuam seguros localmente.');
    }
  };

  const handleCopySql = async () => {
    try {
      await navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
      onSuccessToast?.('Script SQL copiado para a área de transferência!');
    } catch {
      onSuccessToast?.('Selecione e copie o script SQL abaixo.');
      setShowSqlModal(true);
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
              <div className="w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-400 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                {currentUser.name.slice(0, 2)}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-white truncate">
                  {currentUser.name}
                </div>
                <div className="text-[11px] text-slate-400 truncate font-mono">
                  {currentUser.email}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setShowPasswordChange((v) => !v)}
                title="Alterar Senha da Conta"
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1 transition-colors"
              >
                <span className="material-symbols-outlined text-[15px]">key</span>
                <span className="hidden md:inline">Senha</span>
              </button>

              <button
                type="button"
                onClick={signOut}
                className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 text-rose-400 text-xs font-semibold flex items-center gap-1 transition-colors"
              >
                <span className="material-symbols-outlined text-[15px]">logout</span>
                <span>Sair</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {showPasswordChange && currentUser && (
        <form
          onSubmit={handleChangePassword}
          className="bg-[#0e1422]/95 border border-blue-500/30 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-end gap-3 animate-in fade-in duration-150"
        >
          <div className="flex-1 flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-300">
              Nova Senha para {currentUser.email}
            </label>
            <input
              type="password"
              placeholder="Mínimo 6 caracteres"
              value={newPasswordInput}
              onChange={(e) => setNewPasswordInput(e.target.value)}
              className="bg-[#080c14] border border-white/[0.08] text-white px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-blue-500"
              required
              minLength={6}
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="submit"
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[15px]">check</span>
              <span>Salvar Nova Senha</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setShowPasswordChange(false);
                setNewPasswordInput('');
              }}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

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
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300">
                  Valor de 1.0 Unidade / Stake (R$)
                </label>
                <span className="text-[11px] font-mono text-blue-400 font-semibold tabular-nums">
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

      {/* Supabase Cloud Database Integration */}
      <div className="bg-[#0e1422]/95 border border-white/[0.07] rounded-2xl p-4 sm:p-6 shadow-sm flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
              Sincronização & Isolamento na Nuvem (Supabase)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Projeto <span className="font-mono text-slate-200">{SUPABASE_PROJECT_REF}</span> ({SUPABASE_REGION}) • Cada usuário acessa apenas seus próprios registros
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
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
              onClick={handleCopySql}
              className="px-3.5 py-2 bg-[#080c14] hover:bg-slate-800 border border-white/[0.08] text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <span className="material-symbols-outlined text-[16px] text-blue-400">content_copy</span>
              <span>Copiar SQL Multi-Usuário</span>
            </button>

            <button
              type="button"
              onClick={() => setShowSqlModal((v) => !v)}
              className="px-3 py-2 bg-[#080c14] hover:bg-slate-800 border border-white/[0.08] text-slate-300 rounded-xl text-xs font-semibold transition-colors"
            >
              {showSqlModal ? 'Ocultar SQL' : 'Ver SQL'}
            </button>
          </div>
        </div>

        {showSqlModal && (
          <div className="bg-[#080c14] border border-white/[0.08] rounded-xl p-3.5 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-300">
                Script SQL com Políticas RLS (Row Level Security) por usuário ({SUPABASE_PROJECT_REF}):
              </span>
              <button
                type="button"
                onClick={handleCopySql}
                className="text-[11px] text-blue-400 hover:text-blue-300 font-semibold"
              >
                Copiar Tudo
              </button>
            </div>
            <pre className="text-[11px] font-mono text-slate-300 overflow-x-auto max-h-64 p-2 bg-[#05080f] rounded-lg border border-white/[0.05] select-all">
              {SUPABASE_SQL_SCHEMA}
            </pre>
          </div>
        )}
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          <button
            type="button"
            onClick={handleExportBackup}
            className="px-4 py-3 bg-[#080c14] hover:bg-slate-800/80 border border-white/[0.08] rounded-xl text-xs font-semibold text-slate-200 flex items-center justify-center gap-2 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px] text-blue-400">download</span>
            <span>Exportar Backup (.json)</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-3 bg-[#080c14] hover:bg-slate-800/80 border border-white/[0.08] rounded-xl text-xs font-semibold text-slate-200 flex items-center justify-center gap-2 transition-colors"
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
            className="px-4 py-3 bg-[#080c14] hover:bg-slate-800/80 border border-white/[0.08] rounded-xl text-xs font-semibold text-slate-300 flex items-center justify-center gap-2 transition-colors"
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
