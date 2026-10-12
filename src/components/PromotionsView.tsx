import React, { useState } from 'react';
import { useBankroll } from '../context/BankrollContext';

interface PromotionsViewProps {
  onOpenFreeSpinModal: () => void;
  onOpenFreebetModal: () => void;
  onSuccessToast?: (msg: string) => void;
  onNavigateDashboard?: () => void;
}

export const PromotionsView: React.FC<PromotionsViewProps> = ({
  onOpenFreeSpinModal,
  onOpenFreebetModal,
  onSuccessToast,
  onNavigateDashboard
}) => {
  const {
    freebets,
    freeSpins,
    totalSpinsProfit,
    totalFreebetsProfit,
    updateFreebetStatus,
    deleteFreebet,
    deleteFreeSpin
  } = useBankroll();

  // Simple Freebet conversion calculator
  const [calcFreebetAmount, setCalcFreebetAmount] = useState('50.00');
  const [calcOddBack, setCalcOddBack] = useState('4.00');
  const [calcOddLay, setCalcOddLay] = useState('4.10');

  const parseNum = (val: string | number): number => {
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    if (!val) return 0;
    const clean = String(val).trim().replace(',', '.');
    const parsed = parseFloat(clean);
    return isNaN(parsed) ? 0 : parsed;
  };

  const fbVal = parseNum(calcFreebetAmount);
  const oddB = parseNum(calcOddBack) || 1.0;
  const oddL = parseNum(calcOddLay) || 1.0;

  const layStake = oddL > 0.05 ? (fbVal * (oddB - 1)) / (oddL - 0.03) : 0;
  const guaranteedProfit = Math.max(0, fbVal * (oddB - 1) - layStake * (oddL - 1));

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const totalLucro = totalSpinsProfit + totalFreebetsProfit;

  return (
    <div className="w-full flex flex-col gap-4 sm:gap-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0e1422]/95 border border-white/[0.07] rounded-2xl p-4 sm:p-6 shadow-sm">
        <div className="flex items-center gap-3">
          {onNavigateDashboard && (
            <button
              type="button"
              onClick={onNavigateDashboard}
              className="p-2 sm:px-3 sm:py-2 rounded-xl bg-[#080c14] border border-white/[0.08] text-slate-300 hover:text-white hover:bg-white/[0.06] transition-colors flex items-center gap-1.5 text-xs font-semibold shrink-0"
              title="Voltar ao Dashboard"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              <span className="hidden sm:inline">Voltar ao Início</span>
            </button>
          )}
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
              Bônus, Freebets & Giros Grátis
            </h2>
            <p className="text-xs text-slate-400">
              Controle de apostas grátis, rodadas promocionais e calculadora de extração
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenFreeSpinModal}
            className="flex-1 sm:flex-initial justify-center px-3.5 py-2 bg-[#080c14] hover:bg-slate-800 border border-white/[0.08] text-slate-200 font-semibold rounded-xl text-xs transition-all flex items-center gap-1.5 whitespace-nowrap"
          >
            <span className="material-symbols-outlined text-[16px] text-emerald-400">casino</span>
            <span>+ Giros Grátis</span>
          </button>
          <button
            type="button"
            onClick={onOpenFreebetModal}
            className="flex-1 sm:flex-initial justify-center px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-xs transition-all flex items-center gap-1.5 active:scale-95 shadow-md shadow-blue-500/20 whitespace-nowrap"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            <span>+ Nova Freebet</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-[#0e1422]/95 border border-white/[0.07] rounded-2xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Lucro Total em Bônus</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <span className="material-symbols-outlined text-[18px]">redeem</span>
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-mono font-bold text-emerald-400 mt-2 tabular-nums">
            +{formatBRL(totalLucro)}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Freebets creditadas + giros grátis
          </div>
        </div>

        <div className="bg-[#0e1422]/95 border border-white/[0.07] rounded-2xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Freebets Ativas</span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <span className="material-symbols-outlined text-[18px]">confirmation_number</span>
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-mono font-bold text-white mt-2 tabular-nums">
            {freebets.filter((f) => f.status === 'Ao Vivo' || f.status === 'Pendente').length} disponíveis
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Retorno creditado: <span className="font-mono text-slate-300">{formatBRL(totalFreebetsProfit)}</span>
          </div>
        </div>

        <div className="bg-[#0e1422]/95 border border-white/[0.07] rounded-2xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Lucro em Giros Grátis</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <span className="material-symbols-outlined text-[18px]">casino</span>
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-mono font-bold text-emerald-400 mt-2 tabular-nums">
            +{formatBRL(totalSpinsProfit)}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {freeSpins.length} {freeSpins.length === 1 ? 'rodada registrada' : 'rodadas registradas'}
          </div>
        </div>
      </div>

      {/* Calculator Section */}
      <div className="bg-[#0e1422]/95 border border-white/[0.07] rounded-2xl p-4 sm:p-6 shadow-sm flex flex-col gap-4">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
            Calculadora de Conversão (Back / Lay)
          </h3>
          <p className="text-xs text-slate-400">
            Converta freebets em dinheiro real sem risco (Matched Betting)
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold text-slate-400">
              Valor da Freebet (R$)
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={calcFreebetAmount}
              onChange={(e) => {
                const val = e.target.value;
                if (/^[0-9]*[.,]?[0-9]*$/.test(val) || val === '') {
                  setCalcFreebetAmount(val);
                }
              }}
              placeholder="50,00"
              className="bg-[#080c14] border border-white/[0.08] text-slate-200 px-3.5 py-2.5 rounded-xl text-xs font-mono focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold text-slate-400">
              Odd Back (Casa de Apostas)
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={calcOddBack}
              onChange={(e) => {
                const val = e.target.value;
                if (/^[0-9]*[.,]?[0-9]*$/.test(val) || val === '') {
                  setCalcOddBack(val);
                }
              }}
              placeholder="4,00"
              className="bg-[#080c14] border border-white/[0.08] text-slate-200 px-3.5 py-2.5 rounded-xl text-xs font-mono focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold text-slate-400">
              Odd Lay (Exchange / Betfair)
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={calcOddLay}
              onChange={(e) => {
                const val = e.target.value;
                if (/^[0-9]*[.,]?[0-9]*$/.test(val) || val === '') {
                  setCalcOddLay(val);
                }
              }}
              placeholder="4,10"
              className="bg-[#080c14] border border-white/[0.08] text-slate-200 px-3.5 py-2.5 rounded-xl text-xs font-mono focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Result of conversion */}
        <div className="p-3.5 sm:p-4 bg-[#080c14] border border-white/[0.06] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center justify-between sm:flex-col sm:items-start">
            <span className="text-[11px] text-slate-400 font-medium">Stake Lay na Exchange</span>
            <span className="text-sm sm:text-base font-mono font-bold text-slate-200 tabular-nums">
              {formatBRL(layStake)}
            </span>
          </div>
          <div className="flex items-center justify-between sm:flex-col sm:items-end pt-2 sm:pt-0 border-t sm:border-t-0 border-white/[0.05]">
            <span className="text-[11px] text-slate-400 font-medium">Lucro Líquido Garantido</span>
            <span className="text-sm sm:text-base font-mono font-bold text-emerald-400 tabular-nums">
              +{formatBRL(guaranteedProfit)} ({((guaranteedProfit / (fbVal || 1)) * 100).toFixed(1)}%)
            </span>
          </div>
        </div>
      </div>

      {/* Freebets List */}
      <div className="bg-[#0e1422]/95 border border-white/[0.07] rounded-2xl p-4 sm:p-6 shadow-sm flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
            Freebets Cadastradas
          </h3>
          <span className="text-xs font-mono text-slate-400">{freebets.length} registro(s)</span>
        </div>

        {freebets.length === 0 ? (
          <div className="bg-[#080c14] border border-white/[0.06] rounded-xl py-8 px-4 text-center text-xs text-slate-400">
            Nenhuma freebet cadastrada no momento.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {freebets.map((fb) => (
              <div
                key={fb.id}
                className="bg-[#080c14] border border-white/[0.06] rounded-xl p-3.5 flex flex-col gap-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-bold text-white block truncate">{fb.event}</span>
                    <span className="text-xs text-slate-400 block truncate mt-0.5">
                      {fb.selection} · <strong className="text-blue-400 font-mono">@{fb.odd.toFixed(2)}</strong>
                    </span>
                  </div>
                  <span className="font-mono font-bold text-sm text-emerald-400 tabular-nums shrink-0">
                    +{formatBRL(fb.netReturn)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-white/[0.05]">
                  <span>
                    {fb.bookmaker} · Bônus <strong className="font-mono text-slate-200">{formatBRL(fb.bonusAmount)}</strong>
                  </span>
                  <div className="flex items-center gap-1.5">
                    {fb.status !== 'Creditado' ? (
                      <button
                        type="button"
                        onClick={() => {
                          updateFreebetStatus(fb.id, 'Creditado');
                          onSuccessToast?.('Freebet marcada como Creditada!');
                        }}
                        className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 text-[11px] font-semibold"
                      >
                        Creditar
                      </button>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-semibold">
                        Creditado
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        deleteFreebet(fb.id);
                        onSuccessToast?.('Freebet removida.');
                      }}
                      className="p-1 text-slate-400 hover:text-rose-400 rounded-lg"
                      title="Excluir"
                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Free Spins List */}
      {freeSpins.length > 0 && (
        <div className="bg-[#0e1422]/95 border border-white/[0.07] rounded-2xl p-4 sm:p-6 shadow-sm flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
              Histórico de Giros Grátis
            </h3>
            <span className="text-xs font-mono text-slate-400">{freeSpins.length} registro(s)</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {freeSpins.map((fs) => (
              <div
                key={fs.id}
                className="bg-[#080c14] border border-white/[0.06] rounded-xl p-3.5 flex items-center justify-between gap-3"
              >
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-bold text-white block truncate">{fs.game}</span>
                  <span className="text-[11px] text-slate-400 block truncate mt-0.5">
                    {fs.bookmaker} · {fs.spinsCount} giros · {fs.date}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-mono font-bold text-sm text-emerald-400 tabular-nums">
                    +{formatBRL(fs.netProfit)}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      deleteFreeSpin(fs.id);
                      onSuccessToast?.('Registro de giros removido.');
                    }}
                    className="p-1 text-slate-400 hover:text-rose-400 rounded-lg"
                    title="Excluir"
                  >
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
