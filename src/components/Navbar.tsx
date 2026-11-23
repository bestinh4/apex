import React from 'react';
import { useBankroll } from '../context/BankrollContext';
import { PWAInstallButton } from './PWAInstallButton';

export type TabKey =
  | 'dashboard'
  | 'livro-razao'
  | 'analise-estatistica'
  | 'fluxo-de-caixa'
  | 'giros-gratis-promocoes'
  | 'ajustes';

interface NavbarProps {
  activeTab: TabKey;
  onSelectTab: (tab: TabKey) => void;
  onOpenNewBetModal: () => void;
  onSyncToast?: (msg: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onSelectTab,
  onOpenNewBetModal,
  onSyncToast
}) => {
  const {
    currentEquity,
    currentUser,
    isCloudAuthenticated,
    cloudSyncStatus,
    signInWithGoogle,
    signOut
  } = useBankroll();

  const formatBRL = (val: number) => {
    const clean = Number.isFinite(val) ? val : 0;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2
    }).format(clean);
  };

  const handleGoogleConnect = async () => {
    const res = await signInWithGoogle();
    if (res.success) {
      onSyncToast?.('Conta Google conectada! Sincronização PC ↔ Celular ativada.');
    } else if (res.error) {
      onSyncToast?.(res.error);
    }
  };

  const navItems: { key: TabKey; label: string; shortLabel: string; icon: string }[] = [
    { key: 'dashboard', label: 'Dashboard', shortLabel: 'Início', icon: 'space_dashboard' },
    { key: 'livro-razao', label: 'Livro-Razão', shortLabel: 'Histórico', icon: 'receipt_long' },
    { key: 'analise-estatistica', label: 'Estatísticas', shortLabel: 'Dados', icon: 'monitoring' },
    { key: 'fluxo-de-caixa', label: 'Caixa', shortLabel: 'Caixa', icon: 'account_balance' },
    { key: 'giros-gratis-promocoes', label: 'Bônus', shortLabel: 'Bônus', icon: 'redeem' },
    { key: 'ajustes', label: 'Ajustes', shortLabel: 'Ajustes', icon: 'tune' }
  ];

  return (
    <>
      {/* Top Bar */}
      <header className="fixed top-0 left-0 right-0 z-40 h-14 sm:h-16 bg-white/95 backdrop-blur-xl border-b border-slate-200/90 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
        <div className="h-full w-full max-w-[1440px] mx-auto px-3.5 sm:px-6 lg:px-8 flex items-center justify-between gap-3">
          {/* Zone 1: Brand Wordmark */}
          <button
            type="button"
            onClick={() => onSelectTab('dashboard')}
            className="text-sm sm:text-base font-bold tracking-tight text-slate-900 hover:text-blue-600 transition-colors whitespace-nowrap shrink-0 flex items-center gap-2"
          >
            <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-sm shadow-blue-600/20">
              <span className="material-symbols-outlined text-[16px]">account_balance_wallet</span>
            </span>
            <span>Apex Bankroll</span>
          </button>

          {/* Zone 2: Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-0.5 xl:gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/90 shrink-0">
            {navItems.map((item) => {
              const isActive = activeTab === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => onSelectTab(item.key)}
                  className={`px-2.5 xl:px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-blue-600 text-white font-semibold shadow-sm shadow-blue-600/20'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                  }`}
                >
                  <span
                    className={`material-symbols-outlined text-[16px] ${
                      isActive ? 'text-white' : 'text-slate-500'
                    }`}
                  >
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Cloud Sync + Live Bankroll + Primary CTA */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {isCloudAuthenticated ? (
              <button
                type="button"
                onClick={() => onSelectTab('ajustes')}
                title={
                  cloudSyncStatus === 'error'
                    ? 'Erro na sincronização em nuvem — clique para verificar'
                    : `Sincronizado na nuvem (${currentUser?.email})`
                }
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  cloudSyncStatus === 'error'
                    ? 'bg-rose-50 border-rose-200 text-rose-700'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                }`}
              >
                <span className="material-symbols-outlined text-[15px]">
                  {cloudSyncStatus === 'syncing'
                    ? 'sync'
                    : cloudSyncStatus === 'error'
                    ? 'cloud_off'
                    : 'cloud_done'}
                </span>
                <span className="hidden xl:inline">
                  {cloudSyncStatus === 'syncing'
                    ? 'Sincronizando'
                    : cloudSyncStatus === 'error'
                    ? 'Erro Sync'
                    : 'Nuvem'}
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleGoogleConnect}
                title="Conectar Google para sincronizar PC e celular"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-700 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
              >
                <span className="material-symbols-outlined text-[15px]">cloud_upload</span>
                <span className="hidden sm:inline">Sincronizar</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => onSelectTab('fluxo-de-caixa')}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition-colors whitespace-nowrap shrink-0"
              title="Ver Fluxo de Caixa"
            >
              <span className="text-[11px] font-medium text-emerald-700 hidden sm:inline">Banca:</span>
              <span className="font-mono text-xs sm:text-sm font-bold text-emerald-700 tracking-tight tabular-nums whitespace-nowrap">
                {formatBRL(currentEquity)}
              </span>
            </button>

            <div className="hidden xl:block shrink-0">
              <PWAInstallButton variant="navbar" />
            </div>

            <button
              type="button"
              onClick={onOpenNewBetModal}
              className="px-2.5 sm:px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-md shadow-blue-600/25 active:scale-95 transition-all flex items-center gap-1 whitespace-nowrap shrink-0"
            >
              <span className="material-symbols-outlined text-[17px]">add</span>
              <span className="hidden xs:inline sm:inline">Nova Aposta</span>
            </button>

            {isCloudAuthenticated && currentUser && (
              <button
                type="button"
                onClick={signOut}
                title={`Sair da conta Google (${currentUser.email})`}
                className="p-2 rounded-xl bg-slate-100 border border-slate-200 hover:border-rose-300 hover:bg-rose-50 text-slate-600 hover:text-rose-600 transition-colors flex items-center gap-1.5 shrink-0"
              >
                <span className="material-symbols-outlined text-[17px]">logout</span>
                <span className="hidden 2xl:inline text-xs font-medium max-w-[100px] truncate">
                  {currentUser.name}
                </span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Bottom Tab Bar (< lg) */}
      <nav
        aria-label="Navegação principal móvel"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 h-14 bg-white/95 backdrop-blur-xl border-t border-slate-200 grid grid-cols-6 items-center px-1 shadow-[0_-2px_10px_rgba(15,23,42,0.05)]"
      >
        {navItems.map((item) => {
          const isActive = activeTab === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onSelectTab(item.key)}
              className={`h-full flex flex-col items-center justify-center gap-0.5 transition-colors ${
                isActive ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span className="material-symbols-outlined text-[20px] leading-none">
                {item.icon}
              </span>
              <span
                className={`text-[10px] tracking-tight truncate max-w-full px-0.5 ${
                  isActive ? 'font-bold text-blue-600' : 'font-medium text-slate-500'
                }`}
              >
                {item.shortLabel}
              </span>
            </button>
          );
        })}
      </nav>
    </>
  );
};
