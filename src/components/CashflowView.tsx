import React, { useState } from 'react';
import { useBankroll } from '../context/BankrollContext';
import { TreasuryEntry } from '../types';

interface CashflowViewProps {
  onOpenCashflowModal: () => void;
  onSuccessToast?: (msg: string) => void;
}

export const CashflowView: React.FC<CashflowViewProps> = ({
  onOpenCashflowModal,
  onSuccessToast
}) => {
  const {
    treasury,
    updateTreasuryStatus,
    deleteTreasury,
    totalDeposits,
    totalWithdrawals,
    pendingDeposits,
    pendingWithdrawals,
    bonusCredits,
    pendingBonusCredits,
    realEquity,
    availableRealBalance,
    realExposure,
    promoBalance
  } = useBankroll();

  const [filterType, setFilterType] = useState<'ALL' | 'DEPOSIT' | 'WITHDRAW' | 'BONUS'>('ALL');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const filteredTreasury = treasury.filter((tx) => {
    if (filterType === 'ALL') return true;
    return tx.type === filterType;
  });

  const getStatusBadge = (status: TreasuryEntry['status']) => {
    if (status === 'Compensado') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 whitespace-nowrap">
          Compensado
        </span>
      );
    }
    if (status === 'Processando') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-500/10 text-blue-300 border border-blue-500/20 whitespace-nowrap">
          Processando
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20 whitespace-nowrap">
        Pendente
      </span>
    );
  };

  return (
    <div className="w-full flex flex-col gap-4 sm:gap-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0e1422]/95 border border-white/[0.07] rounded-2xl p-4 sm:p-6 shadow-sm">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">Fluxo de Caixa</h2>
          <p className="text-xs text-slate-400">
            Apenas lançamentos compensados alteram o patrimônio real ou o saldo promocional
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenCashflowModal}
          className="px-3.5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 self-stretch sm:self-auto active:scale-95 shadow-md shadow-blue-500/20 whitespace-nowrap"
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
          <span>Lançar Depósito / Saque</span>
        </button>
      </div>

      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-[#0e1422]/95 border border-white/[0.07] rounded-2xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Depósitos Compensados</span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <span className="material-symbols-outlined text-[18px]">south_east</span>
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-mono font-bold text-white mt-2 tabular-nums">
            {formatBRL(totalDeposits)}
          </div>
          <div className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-x-2">
            <span>
              {treasury.filter((t) => t.type === 'DEPOSIT' && t.status === 'Compensado').length}{' '}
              compensado(s)
            </span>
            {pendingDeposits > 0 && (
              <span className="text-amber-300 font-mono">
                · Pendente: {formatBRL(pendingDeposits)}
              </span>
            )}
          </div>
        </div>

        <div className="bg-[#0e1422]/95 border border-white/[0.07] rounded-2xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Saques Compensados</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <span className="material-symbols-outlined text-[18px]">north_east</span>
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-mono font-bold text-emerald-400 mt-2 tabular-nums">
            {formatBRL(totalWithdrawals)}
          </div>
          <div className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-x-2">
            <span>
              {treasury.filter((t) => t.type === 'WITHDRAW' && t.status === 'Compensado').length}{' '}
              retirada(s)
            </span>
            {pendingWithdrawals > 0 && (
              <span className="text-amber-300 font-mono">
                · Pendente: {formatBRL(pendingWithdrawals)}
              </span>
            )}
          </div>
        </div>

        <div className="bg-[#0e1422]/95 border border-white/[0.07] rounded-2xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Patrimônio Real vs Disponível</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <span className="material-symbols-outlined text-[18px]">account_balance_wallet</span>
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-mono font-bold text-blue-400 mt-2 tabular-nums">
            {formatBRL(realEquity)}
          </div>
          <div className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span>
              Disp:{' '}
              <strong className="font-mono text-emerald-400">
                {formatBRL(availableRealBalance)}
              </strong>
            </span>
            {realExposure > 0 && (
              <span>
                · Exp: <strong className="font-mono text-amber-300">{formatBRL(realExposure)}</strong>
              </span>
            )}
            {(promoBalance !== 0 || bonusCredits > 0 || pendingBonusCredits > 0) && (
              <span>
                · Promo: <strong className="font-mono text-indigo-300">{formatBRL(promoBalance)}</strong>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* History Section */}
      <div className="bg-[#0e1422]/95 border border-white/[0.07] rounded-2xl p-4 sm:p-6 shadow-sm flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
            Histórico de Transações
          </h3>
          <div className="flex items-center bg-[#080c14] p-1 rounded-xl border border-white/[0.08] overflow-x-auto scrollbar-none">
            {(
              [
                { key: 'ALL', label: 'Todos' },
                { key: 'DEPOSIT', label: 'Depósitos' },
                { key: 'WITHDRAW', label: 'Saques' },
                { key: 'BONUS', label: 'Bônus Promo' }
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setFilterType(tab.key)}
                className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-all ${
                  filterType === tab.key
                    ? 'bg-slate-800 text-white font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {filteredTreasury.length === 0 ? (
          <div className="bg-[#080c14] border border-white/[0.06] rounded-xl py-10 px-4 flex flex-col items-center justify-center text-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <span className="material-symbols-outlined text-[22px]">account_balance</span>
            </div>
            <div className="max-w-sm">
              <h4 className="text-sm font-semibold text-white">Nenhuma movimentação registrada</h4>
              <p className="text-xs text-slate-400 mt-1">
                Registre novos aportes ou retiradas para manter seu saldo de caixa sincronizado.
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenCashflowModal}
              className="mt-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-md shadow-blue-600/20 active:scale-95 transition-all flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              <span>Novo Depósito / Saque</span>
            </button>
          </div>
        ) : (
          <>
            {/* Mobile Cards (< md) */}
            <div className="flex flex-col gap-2.5 md:hidden">
              {filteredTreasury.map((item) => (
                <div
                  key={item.id}
                  className="bg-[#080c14] border border-white/[0.06] rounded-xl p-3.5 flex flex-col gap-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-semibold text-white block truncate">
                        {item.desc}
                      </span>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        {getStatusBadge(item.status)}
                        <span className="text-[11px] text-slate-400 truncate">
                          {item.details || item.status} · {item.date}
                        </span>
                      </div>
                    </div>
                    <span
                      className={`font-mono font-bold text-sm tabular-nums shrink-0 ${
                        item.status !== 'Compensado'
                          ? 'text-slate-400'
                          : item.type === 'WITHDRAW'
                          ? 'text-rose-400'
                          : item.type === 'BONUS'
                          ? 'text-indigo-300'
                          : 'text-emerald-400'
                      }`}
                    >
                      {item.type === 'WITHDRAW' ? '-' : '+'}
                      {formatBRL(item.amount)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-white/[0.05] gap-2">
                    <span className="text-[11px] text-slate-400">
                      {item.type === 'DEPOSIT'
                        ? 'Depósito Real'
                        : item.type === 'WITHDRAW'
                        ? 'Saque Real'
                        : 'Bônus Rollover (Promo)'}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {item.status !== 'Compensado' && (
                        <button
                          type="button"
                          onClick={() => {
                            updateTreasuryStatus(item.id, 'Compensado');
                            onSuccessToast?.('Movimentação marcada como Compensada.');
                          }}
                          className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 text-[11px] font-semibold"
                        >
                          Compensar
                        </button>
                      )}
                      {confirmDeleteId === item.id ? (
                        <button
                          type="button"
                          onClick={() => {
                            deleteTreasury(item.id);
                            setConfirmDeleteId(null);
                            onSuccessToast?.('Transação excluída.');
                          }}
                          className="px-2.5 py-1 rounded-lg bg-rose-600 text-white text-xs font-semibold"
                        >
                          Confirmar Exclusão
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(item.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg"
                        >
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block w-full overflow-x-auto rounded-xl border border-white/[0.06] bg-[#080c14]">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-white/[0.06] bg-slate-900/60 text-slate-400 text-[11px] font-semibold">
                    <th className="py-3 px-3.5">Data</th>
                    <th className="py-3 px-3.5">Tipo</th>
                    <th className="py-3 px-3.5">Status</th>
                    <th className="py-3 px-3.5">Descrição</th>
                    <th className="py-3 px-3.5">Detalhes</th>
                    <th className="py-3 px-3.5 text-right">Valor</th>
                    <th className="py-3 px-3.5 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {filteredTreasury.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-3.5 font-mono text-slate-400 whitespace-nowrap tabular-nums">
                        {item.date}
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        {item.type === 'DEPOSIT' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            Depósito Real
                          </span>
                        ) : item.type === 'WITHDRAW' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            Saque Real
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                            Bônus Promo
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap">{getStatusBadge(item.status)}</td>
                      <td className="py-3 px-3.5 font-medium text-slate-200">{item.desc}</td>
                      <td className="py-3 px-3.5 text-slate-400">{item.details || item.status}</td>
                      <td
                        className={`py-3 px-3.5 text-right font-mono font-bold whitespace-nowrap tabular-nums ${
                          item.status !== 'Compensado'
                            ? 'text-slate-400'
                            : item.type === 'WITHDRAW'
                            ? 'text-rose-400'
                            : item.type === 'BONUS'
                            ? 'text-indigo-300'
                            : 'text-emerald-400'
                        }`}
                      >
                        {item.type === 'WITHDRAW' ? '-' : '+'}
                        {formatBRL(item.amount)}
                      </td>
                      <td className="py-3 px-3.5 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {item.status !== 'Compensado' && (
                            <button
                              type="button"
                              onClick={() => {
                                updateTreasuryStatus(item.id, 'Compensado');
                                onSuccessToast?.('Movimentação compensada!');
                              }}
                              className="px-2 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/25 text-[11px] font-semibold"
                              title="Marcar como Compensado"
                            >
                              Compensar
                            </button>
                          )}
                          {confirmDeleteId === item.id ? (
                            <button
                              type="button"
                              onClick={() => {
                                deleteTreasury(item.id);
                                setConfirmDeleteId(null);
                                onSuccessToast?.('Transação excluída com sucesso.');
                              }}
                              className="px-2 py-1 rounded-lg bg-rose-600 text-white text-[11px] font-semibold"
                            >
                              Confirmar
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(item.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                              title="Excluir"
                            >
                              <span className="material-symbols-outlined text-[16px]">delete</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
