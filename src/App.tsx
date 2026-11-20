import React, { useState } from 'react';
import { BankrollProvider, useBankroll } from './context/BankrollContext';
import { Navbar, TabKey } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { LedgerView } from './components/LedgerView';
import { AnalyticsView } from './components/AnalyticsView';
import { CashflowView } from './components/CashflowView';
import { PromotionsView } from './components/PromotionsView';
import { SettingsView } from './components/SettingsView';
import { BetModal } from './components/BetModal';
import { CashflowModal } from './components/CashflowModal';
import { FreeSpinModal } from './components/FreeSpinModal';
import { FreebetModal } from './components/FreebetModal';
import { Toast } from './components/Toast';
import { ErrorBoundary } from './components/ErrorBoundary';
import { BetEntry } from './types';

function AppContent() {
  const { isCloudAuthenticated, authLoading, signInWithGoogle } = useBankroll();
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');
  const [isBetModalOpen, setIsBetModalOpen] = useState(false);
  const [editingBet, setEditingBet] = useState<BetEntry | null>(null);
  const [isCashflowModalOpen, setIsCashflowModalOpen] = useState(false);
  const [isFreeSpinModalOpen, setIsFreeSpinModalOpen] = useState(false);
  const [isFreebetModalOpen, setIsFreebetModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [syncBannerDismissed, setSyncBannerDismissed] = useState(false);
  const [connectingGoogle, setConnectingGoogle] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((curr) => (curr === msg ? null : curr));
    }, 3500);
  };

  const handleOpenNewBet = () => {
    setEditingBet(null);
    setIsBetModalOpen(true);
  };

  const handleEditBet = (bet: BetEntry) => {
    setEditingBet(bet);
    setIsBetModalOpen(true);
  };

  const handleConnectGoogleFromBanner = async () => {
    setConnectingGoogle(true);
    const res = await signInWithGoogle();
    setConnectingGoogle(false);
    if (res.success) {
      showToast('Conta Google conectada! Seus dados agora sincronizam entre PC e celular.');
    } else if (res.error) {
      showToast(res.error);
    }
  };

  return (
    <div className="min-h-screen bg-[#080c14] text-[#e2e8f0] flex flex-col bg-ambient-glow selection:bg-blue-500 selection:text-white">
      {/* Top Header + Mobile Bottom Navigation */}
      <Navbar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenNewBetModal={handleOpenNewBet}
        onSyncToast={showToast}
      />

      {/* Main Content with safe padding for mobile bottom bar */}
      <div className="pt-16 sm:pt-20 pb-20 lg:pb-10 flex-1 flex flex-col">
        <main className="w-full max-w-[1440px] mx-auto px-3.5 sm:px-6 lg:px-8 py-3 sm:py-5 flex-1 flex flex-col gap-4">
          {!authLoading && !isCloudAuthenticated && !syncBannerDismissed && (
            <div className="bg-[#0e1422]/95 border border-blue-500/25 rounded-2xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
              <div className="flex items-start sm:items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[20px]">devices</span>
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-semibold text-white">
                    Sincronize seu PC com o celular em tempo real
                  </p>
                  <p className="text-[11px] sm:text-xs text-slate-400">
                    No momento suas apostas estão salvas apenas neste aparelho. Entre com sua conta Google nos dois dispositivos para unificar tudo na nuvem.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleConnectGoogleFromBanner}
                  disabled={connectingGoogle}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap shadow-sm shadow-blue-600/20"
                >
                  <span className="material-symbols-outlined text-[16px]">cloud_sync</span>
                  <span>{connectingGoogle ? 'Conectando...' : 'Conectar Google'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSyncBannerDismissed(true)}
                  title="Dispensar aviso"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'dashboard' && (
            <DashboardView
              onOpenNewBetModal={handleOpenNewBet}
              onOpenFreebetModal={() => setIsFreebetModalOpen(true)}
              onEditBet={handleEditBet}
              onSuccessToast={showToast}
            />
          )}

          {activeTab === 'livro-razao' && (
            <LedgerView
              onOpenNewBetModal={handleOpenNewBet}
              onEditBet={handleEditBet}
              onSuccessToast={showToast}
            />
          )}

          {activeTab === 'analise-estatistica' && (
            <AnalyticsView onSuccessToast={showToast} />
          )}

          {activeTab === 'fluxo-de-caixa' && (
            <CashflowView
              onOpenCashflowModal={() => setIsCashflowModalOpen(true)}
              onSuccessToast={showToast}
            />
          )}

          {activeTab === 'giros-gratis-promocoes' && (
            <PromotionsView
              onOpenFreeSpinModal={() => setIsFreeSpinModalOpen(true)}
              onOpenFreebetModal={() => setIsFreebetModalOpen(true)}
              onSuccessToast={showToast}
              onNavigateDashboard={() => setActiveTab('dashboard')}
            />
          )}

          {activeTab === 'ajustes' && (
            <SettingsView
              onSuccessToast={showToast}
              onNavigateTab={(tab) => setActiveTab(tab)}
            />
          )}
        </main>
      </div>

      {/* Modals */}
      {isBetModalOpen && (
        <BetModal
          isOpen={isBetModalOpen}
          onClose={() => {
            setIsBetModalOpen(false);
            setEditingBet(null);
          }}
          initialBet={editingBet}
          onSuccessToast={showToast}
        />
      )}

      {isCashflowModalOpen && (
        <CashflowModal
          isOpen={isCashflowModalOpen}
          onClose={() => setIsCashflowModalOpen(false)}
          onSuccessToast={showToast}
        />
      )}

      {isFreeSpinModalOpen && (
        <FreeSpinModal
          isOpen={isFreeSpinModalOpen}
          onClose={() => setIsFreeSpinModalOpen(false)}
          onSuccessToast={showToast}
        />
      )}

      {isFreebetModalOpen && (
        <FreebetModal
          isOpen={isFreebetModalOpen}
          onClose={() => setIsFreebetModalOpen(false)}
          onSuccessToast={showToast}
        />
      )}

      {/* Feedback Toast */}
      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
    </div>
  );
}

export function App() {
  return (
    <ErrorBoundary>
      <BankrollProvider>
        <AppContent />
      </BankrollProvider>
    </ErrorBoundary>
  );
}

export default App;
