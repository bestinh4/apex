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
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onSelectTab,
  onOpenNewBetModal
}) => {
  const { currentEquity, currentUser, signOut } = useBankroll();

  const formatBRL = (val: number) => {
    const clean = Number.isFinite(val) ? val : 0;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2
    }).format(clean);
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
      <header className="fixed top-0 left-0 right-0 z-40 h-14 sm:h-16 bg-[#080c14]/90 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="h-full w-full max-w-[1440px] mx-auto px-3.5 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          {/* Zone 1: Brand Wordmark */}
          <button
            type="button"
            onClick={() => onSelectTab('dashboard')}
            className="text-sm sm:text-base font-bold tracking-tight text-white hover:text-blue-400 transition-colors whitespace-nowrap shrink-0"
          >
            Apex Bankroll
          </button>

          {/* Zone 2: Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-0.5 xl:gap-1 bg-[#0d1322] p-1 rounded-xl border border-white/[0.06] shrink-0">
            {navItems.map((item) => {
              const isActive = activeTab === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => onSelectTab(item.key)}
                  className={`px-2.5 xl:px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-slate-800 text-white font-semibold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                >
                  <span
                    className={`material-symbols-outlined text-[16px] ${
                      isActive ? 'text-blue-400' : 'text-slate-500'
                    }`}
                  >
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Live Bankroll + Primary CTA + User Logout */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onSelectTab('fluxo-de-caixa')}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-[#0d1322] border border-white/[0.06] hover:border-white/[0.14] transition-colors whitespace-nowrap shrink-0"
              title="Ver Fluxo de Caixa"
            >
              <span className="text-[11px] text-slate-400 hidden sm:inline">Banca:</span>
              <span className="font-mono text-xs sm:text-sm font-bold text-emerald-400 tracking-tight tabular-nums whitespace-nowrap">
                {formatBRL(currentEquity)}
              </span>
            </button>

            <div className="hidden xl:block shrink-0">
              <PWAInstallButton variant="navbar" />
            </div>

            <button
              type="button"
              onClick={onOpenNewBetModal}
              className="px-3 sm:px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-md shadow-blue-600/20 active:scale-95 transition-all flex items-center gap-1 whitespace-nowrap shrink-0"
            >
              <span className="material-symbols-outlined text-[17px]">add</span>
              <span>Nova Aposta</span>
            </button>

            {currentUser && (
              <button
                type="button"
                onClick={signOut}
                title={`Sair da conta (${currentUser.email})`}
                className="p-2 rounded-xl bg-[#0d1322] border border-white/[0.06] hover:border-rose-500/30 text-slate-400 hover:text-rose-400 transition-colors flex items-center gap-1.5 shrink-0"
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
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 h-14 bg-[#080c14]/95 backdrop-blur-xl border-t border-white/[0.08] grid grid-cols-6 items-center px-1"
      >
        {navItems.map((item) => {
          const isActive = activeTab === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onSelectTab(item.key)}
              className={`h-full flex flex-col items-center justify-center gap-0.5 transition-colors ${
                isActive ? 'text-blue-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="material-symbols-outlined text-[20px] leading-none">
                {item.icon}
              </span>
              <span
                className={`text-[10px] tracking-tight truncate max-w-full px-0.5 ${
                  isActive ? 'font-semibold text-white' : 'font-medium text-slate-400'
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
