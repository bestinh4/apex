import React, { useState } from 'react';
import { BankrollProvider, useBankroll } from './context/BankrollContext';
import { Navbar, TabKey } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { LedgerView } from './components/LedgerView';
import { AnalyticsView } from './components/AnalyticsView';
import { CashflowView } from './components/CashflowView';
import { PromotionsView } from './components/PromotionsView';
import { SettingsView } from './components/SettingsView';
import { AuthView } from './components/AuthView';
import { BetModal } from './components/BetModal';
import { CashflowModal } from './components/CashflowModal';
import { FreeSpinModal } from './components/FreeSpinModal';
import { FreebetModal } from './components/FreebetModal';
import { Toast } from './components/Toast';
import { BetEntry } from './types';

function AppContent() {
  const { currentUser, authLoading } = useBankroll();
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');
  const [isBetModalOpen, setIsBetModalOpen] = useState(false);
  const [editingBet, setEditingBet] = useState<BetEntry | null>(null);
  const [isCashflowModalOpen, setIsCashflowModalOpen] = useState(false);
  const [isFreeSpinModalOpen, setIsFreeSpinModalOpen] = useState(false);
  const [isFreebetModalOpen, setIsFreebetModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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

  // Carregamento imediato sem travar na tela inicial

  return (
    <div className="min-h-screen bg-[#080c14] text-[#e2e8f0] flex flex-col bg-ambient-glow selection:bg-blue-500 selection:text-white">
      {/* Top Header + Mobile Bottom Navigation */}
      <Navbar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenNewBetModal={handleOpenNewBet}
      />

      {/* Main Content with safe padding for mobile bottom bar */}
      <div className="pt-16 sm:pt-20 pb-20 lg:pb-10 flex-1 flex flex-col">
        <main className="w-full max-w-[1440px] mx-auto px-3.5 sm:px-6 lg:px-8 py-3 sm:py-5 flex-1">
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
    <BankrollProvider>
      <AppContent />
    </BankrollProvider>
  );
}

export default App;
