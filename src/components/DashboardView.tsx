import React, { useState } from 'react';
import { useBankroll } from '../context/BankrollContext';
import { BetEntry, BetStatus } from '../types';
import { BankrollChart } from './BankrollChart';

interface DashboardViewProps {
  onOpenNewBetModal: () => void;
  onOpenFreebetModal: () => void;
  onEditBet: (bet: BetEntry) => void;
  onSuccessToast?: (msg: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onOpenNewBetModal,
  onEditBet,
  onSuccessToast
}) => {
  const {
    bets,
    deleteBet,
    resolveBet,
    currentEquity,
    settings,
    netBetProfit,
    winRate,
    turnoverVolume,
    roi,
    winCount,
    lossCount,
    voidCount,
    maxDrawdownPct
  } = useBankroll();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const plPct = settings.initialBankroll > 0 ? (netBetProfit / settings.initialBankroll) * 100 : 0;
  const plUnits = settings.unitValue > 0 ? netBetProfit / settings.unitValue : 0;

  const filteredBets = bets.filter((b) => {
    const ev = (b.event || '').toLowerCase();
    const mk = (b.market || '').toLowerCase();
    const bk = (b.bookmaker || '').toLowerCase();
    const st = searchTerm.toLowerCase();

    const matchesSearch = !searchTerm || ev.includes(st) || mk.includes(st) || bk.includes(st);

    const matchesStatus =
      filterStatus === 'ALL' ||
      (filterStatus === 'GREEN' && (b.status === 'GREEN' || b.status === 'HALF_GREEN')) ||
      (filterStatus === 'RED' && (b.status === 'RED' || b.status === 'HALF_RED')) ||
      (filterStatus === 'PENDENTE' && b.status === 'PENDENTE');

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: BetStatus) => {
    switch (status) {
      case 'GREEN':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 whitespace-nowrap">
            Green
          </span>
        );
      case 'RED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20 whitespace-nowrap">
            Red
          </span>
        );
      case 'HALF_GREEN':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/20 whitespace-nowrap">
            ½ Green
          </span>
        );
      case 'HALF_RED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/20 whitespace-nowrap">
            ½ Red
          </span>
        );
      case 'VOID':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-800 text-slate-300 border border-slate-700 whitespace-nowrap">
            Reembolso
          </span>
        );
      case 'CASHOUT':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 whitespace-nowrap">
            Cashout
          </span>
        );
      case 'PENDENTE':
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 whitespace-nowrap">
            Pendente
          </span>
        );
    }
  };

  return (
    <div className="w-full flex flex-col gap-4 sm:gap-6 animate-in fade-in duration-200">
      {/* 4 Primary KPI Cards - 2x2 on Mobile, 4 cols on Desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* 1. Saldo Total */}
        <div className="bg-[#0e1422]/95 border border-white/[0.07] rounded-2xl p-3.5 sm:p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] sm:text-xs font-semibold text-slate-400 truncate">
              Saldo Total
            </span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
              <span className="material-symbols-outlined text-[16px] sm:text-[18px]">account_balance_wallet</span>
            </div>
          </div>
          <div className="mt-2 sm:mt-3 flex flex-col">
            <span className="text-lg sm:text-2xl lg:text-3xl font-mono font-bold text-white tracking-tight tabular-nums truncate">
              {formatBRL(currentEquity)}
            </span>
            <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-1 truncate">
              <span>Inicial:</span>
              <span className="font-mono text-slate-300 tabular-nums">{formatBRL(settings.initialBankroll)}</span>
            </div>
          </div>
        </div>

        {/* 2. Lucro Líquido */}
        <div className="bg-[#0e1422]/95 border border-white/[0.07] rounded-2xl p-3.5 sm:p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] sm:text-xs font-semibold text-slate-400 truncate">
              Lucro Líquido
            </span>
            <div
              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center border shrink-0 ${
                netBetProfit >= 0
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
              }`}
            >
              <span className="material-symbols-outlined text-[16px] sm:text-[18px]">
                {netBetProfit >= 0 ? 'trending_up' : 'trending_down'}
              </span>
            </div>
          </div>
          <div className="mt-2 sm:mt-3 flex flex-col">
            <span
              className={`text-lg sm:text-2xl lg:text-3xl font-mono font-bold tracking-tight tabular-nums truncate ${
                netBetProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {netBetProfit >= 0 ? '+' : ''}
              {formatBRL(netBetProfit)}
            </span>
            <div className="flex items-center gap-1 text-[11px] mt-1 text-slate-400 truncate">
              <span
                className={`font-mono font-semibold tabular-nums ${
                  netBetProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {netBetProfit >= 0 ? '+' : ''}
                {plPct.toFixed(1)}%
              </span>
              <span>·</span>
              <span className="font-mono text-slate-300 tabular-nums">
                {plUnits >= 0 ? '+' : ''}
                {plUnits.toFixed(1)}u
              </span>
            </div>
          </div>
        </div>

        {/* 3. Taxa de Acerto (Win Rate) */}
        <div className="bg-[#0e1422]/95 border border-white/[0.07] rounded-2xl p-3.5 sm:p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] sm:text-xs font-semibold text-slate-400 truncate">
              Taxa de Acerto
            </span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
              <span className="material-symbols-outlined text-[16px] sm:text-[18px]">verified</span>
            </div>
          </div>
          <div className="mt-2 sm:mt-3 flex flex-col">
            <span className="text-lg sm:text-2xl lg:text-3xl font-mono font-bold text-white tracking-tight tabular-nums">
              {winRate.toFixed(1)}%
            </span>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-1 font-mono tabular-nums">
              <span className="text-emerald-400 font-medium">{winCount}G</span>
              <span>·</span>
              <span className="text-rose-400 font-medium">{lossCount}R</span>
              {voidCount > 0 && (
                <>
                  <span>·</span>
                  <span className="text-slate-400">{voidCount}V</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* 4. ROI (Retorno sobre Investimento) */}
        <div className="bg-[#0e1422]/95 border border-white/[0.07] rounded-2xl p-3.5 sm:p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] sm:text-xs font-semibold text-slate-400 truncate">
              Retorno (ROI)
            </span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <span className="material-symbols-outlined text-[16px] sm:text-[18px]">monitoring</span>
            </div>
          </div>
          <div className="mt-2 sm:mt-3 flex flex-col">
            <span
              className={`text-lg sm:text-2xl lg:text-3xl font-mono font-bold tracking-tight tabular-nums ${
                roi >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {roi >= 0 ? '+' : ''}
              {roi.toFixed(1)}%
            </span>
            <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-1 truncate">
              <span>Giro:</span>
              <span className="font-mono text-slate-300 tabular-nums">{formatBRL(turnoverVolume)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Bankroll Evolution Chart */}
      <BankrollChart
        bets={bets}
        initialBankroll={settings.initialBankroll}
        currentEquity={currentEquity}
        unitValue={settings.unitValue}
        maxDrawdownPct={maxDrawdownPct}
        onOpenNewBetModal={onOpenNewBetModal}
      />

      {/* Recent Bets Section */}
      <div className="bg-[#0e1422]/95 border border-white/[0.07] rounded-2xl p-4 sm:p-6 shadow-sm flex flex-col gap-4">
        {/* Section Header + Toolbar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                Apostas Recentes
              </h3>
              <p className="text-xs text-slate-400">
                Gerencie suas entradas, edite ou liquide apostas pendentes
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenNewBetModal}
              className="lg:hidden px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-xs transition-all flex items-center gap-1 active:scale-95 shadow-sm shrink-0"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              <span>Nova</span>
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-56">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-[16px]">
                search
              </span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar evento, mercado ou casa..."
                className="w-full bg-[#080c14] border border-white/[0.08] text-slate-200 pl-9 pr-3 py-2 rounded-xl text-xs focus:outline-none focus:border-blue-500 placeholder:text-slate-500 transition-colors"
              />
            </div>

            {/* Status Segmented Tabs */}
            <div className="flex items-center bg-[#080c14] p-1 rounded-xl border border-white/[0.08] overflow-x-auto scrollbar-none">
              {(['ALL', 'GREEN', 'RED', 'PENDENTE'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setFilterStatus(st)}
                  className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-all ${
                    filterStatus === st
                      ? 'bg-slate-800 text-white font-semibold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {st === 'ALL' ? 'Todas' : st === 'GREEN' ? 'Greens' : st === 'RED' ? 'Reds' : 'Pendentes'}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={onOpenNewBetModal}
              className="hidden lg:flex px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-xs transition-all items-center gap-1.5 active:scale-95 shadow-sm whitespace-nowrap"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              <span>Nova Aposta</span>
            </button>
          </div>
        </div>

        {/* Empty State */}
        {filteredBets.length === 0 ? (
          <div className="bg-[#080c14] border border-white/[0.06] rounded-xl py-10 px-4 flex flex-col items-center justify-center text-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <span className="material-symbols-outlined text-[22px]">receipt_long</span>
            </div>
            <div className="max-w-sm">
              <h4 className="text-sm font-semibold text-white">
                {bets.length === 0 ? 'Nenhuma aposta registrada' : 'Nenhum resultado para o filtro'}
              </h4>
              <p className="text-xs text-slate-400 mt-1">
                {bets.length === 0
                  ? 'Seu painel está limpo e pronto para uso. Adicione sua primeira operação para acompanhar estatísticas e evolução da banca.'
                  : 'Tente alterar os termos da busca ou selecionar outro status.'}
              </p>
            </div>
            {bets.length === 0 && (
              <button
                type="button"
                onClick={onOpenNewBetModal}
                className="mt-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-emerald-500 hover:from-blue-500 hover:to-emerald-400 text-white text-xs font-semibold rounded-xl shadow-md shadow-blue-500/20 active:scale-95 transition-all flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                <span>Registrar Primeira Aposta</span>
              </button>
            )}
          </div>
        ) : (
          <>
            {/* MOBILE CARD LIST (< md) */}
            <div className="flex flex-col gap-2.5 md:hidden">
              {filteredBets.map((bet) => (
                <div
                  key={bet.id}
                  className="bg-[#080c14] border border-white/[0.06] rounded-xl p-3.5 flex flex-col gap-2.5"
                >
                  {/* Top Row: Event + Status + P&L */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <span className="text-xs sm:text-sm font-semibold text-white block truncate">
                        {bet.event}
                      </span>
                      <span className="text-xs text-slate-400 block truncate mt-0.5">
                        {bet.market}
                      </span>
                    </div>
                    <div className="flex flex-col items-end shrink-0 gap-1">
                      <span
                        className={`font-mono font-bold text-sm tabular-nums ${
                          bet.status === 'PENDENTE'
                            ? 'text-amber-400'
                            : bet.pl >= 0
                            ? 'text-emerald-400'
                            : 'text-rose-400'
                        }`}
                      >
                        {bet.status === 'PENDENTE'
                          ? 'Em aberto'
                          : `${bet.pl >= 0 ? '+' : ''}${formatBRL(bet.pl)}`}
                      </span>
                      {getStatusBadge(bet.status)}
                    </div>
                  </div>

                  {/* Middle Metadata Row: Odd · Stake · Bookmaker · Date */}
                  <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-white/[0.05]">
                    <div className="flex items-center gap-1.5 font-mono tabular-nums">
                      <span className="text-blue-400 font-semibold">@{Number(bet.odd || 1).toFixed(2)}</span>
                      <span>·</span>
                      <span className="text-slate-200">{formatBRL(bet.stake)}</span>
                      <span>({bet.units}u)</span>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-slate-400 truncate">
                      <span>{bet.bookmaker || 'Casa'}</span>
                      <span>·</span>
                      <span className="font-mono">{bet.date}</span>
                    </div>
                  </div>

                  {/* Bottom Touch Actions Row */}
                  <div className="flex items-center justify-between gap-2 pt-1">
                    {bet.status === 'PENDENTE' ? (
                      <div className="flex items-center gap-1.5 flex-1">
                        <button
                          type="button"
                          onClick={() => {
                            resolveBet(bet.id, 'GREEN');
                            onSuccessToast?.(`Aposta resolvida como GREEN!`);
                          }}
                          className="flex-1 min-h-[38px] px-2.5 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 text-xs font-semibold flex items-center justify-center gap-1 active:scale-95 transition-all"
                        >
                          <span className="material-symbols-outlined text-[16px]">check</span>
                          <span>Green</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            resolveBet(bet.id, 'RED');
                            onSuccessToast?.(`Aposta resolvida como RED.`);
                          }}
                          className="flex-1 min-h-[38px] px-2.5 py-1.5 rounded-lg bg-rose-500/15 text-rose-400 border border-rose-500/25 text-xs font-semibold flex items-center justify-center gap-1 active:scale-95 transition-all"
                        >
                          <span className="material-symbols-outlined text-[16px]">close</span>
                          <span>Red</span>
                        </button>
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-500">{bet.sport}</span>
                    )}

                    <div className="flex items-center gap-1.5 ml-auto">
                      <button
                        type="button"
                        onClick={() => onEditBet(bet)}
                        className="min-h-[38px] px-2.5 py-1.5 rounded-lg bg-slate-800/70 text-slate-300 hover:text-white text-xs font-medium flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[15px]">edit</span>
                        <span>Editar</span>
                      </button>

                      {confirmDeleteId === bet.id ? (
                        <button
                          type="button"
                          onClick={() => {
                            deleteBet(bet.id);
                            setConfirmDeleteId(null);
                            onSuccessToast?.('Aposta removida.');
                          }}
                          className="min-h-[38px] px-2.5 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold flex items-center gap-1"
                        >
                          <span>Confirmar</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(bet.id)}
                          className="min-h-[38px] min-w-[38px] rounded-lg bg-slate-800/70 text-slate-400 hover:text-rose-400 flex items-center justify-center"
                          title="Excluir"
                        >
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* DESKTOP TABLE (md and up) */}
            <div className="hidden md:block w-full overflow-x-auto rounded-xl border border-white/[0.06] bg-[#080c14]">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-white/[0.06] bg-slate-900/60 text-slate-400 text-[11px] font-semibold">
                    <th className="py-3 px-3.5">Data</th>
                    <th className="py-3 px-3.5">Casa</th>
                    <th className="py-3 px-3.5">Evento / Mercado</th>
                    <th className="py-3 px-3.5 text-right">Odd</th>
                    <th className="py-3 px-3.5 text-right">Valor</th>
                    <th className="py-3 px-3.5 text-center">Status</th>
                    <th className="py-3 px-3.5 text-right">Lucro / P&L</th>
                    <th className="py-3 px-3.5 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {filteredBets.map((bet) => (
                    <tr key={bet.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-3.5 font-mono text-slate-400 whitespace-nowrap tabular-nums">
                        {bet.date}
                      </td>
                      <td className="py-3 px-3.5 font-medium text-slate-300">{bet.bookmaker || '-'}</td>
                      <td className="py-3 px-3.5">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-100">{bet.event}</span>
                          <span className="text-[11px] text-slate-400">{bet.market}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3.5 text-right font-mono font-semibold text-blue-400 tabular-nums">
                        @{Number(bet.odd || 1).toFixed(2)}
                      </td>
                      <td className="py-3 px-3.5 text-right font-mono text-slate-200 tabular-nums">
                        {formatBRL(bet.stake)}
                      </td>
                      <td className="py-3 px-3.5 text-center">{getStatusBadge(bet.status)}</td>
                      <td
                        className={`py-3 px-3.5 text-right font-mono font-bold text-xs sm:text-sm tabular-nums ${
                          bet.status === 'PENDENTE'
                            ? 'text-slate-500'
                            : bet.pl >= 0
                            ? 'text-emerald-400'
                            : 'text-rose-400'
                        }`}
                      >
                        {bet.status === 'PENDENTE'
                          ? 'Pendente'
                          : `${bet.pl >= 0 ? '+' : ''}${formatBRL(bet.pl)}`}
                      </td>
                      <td className="py-3 px-3.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {bet.status === 'PENDENTE' && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  resolveBet(bet.id, 'GREEN');
                                  onSuccessToast?.(`Aposta resolvida como GREEN!`);
                                }}
                                className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                                title="Definir Green"
                              >
                                <span className="material-symbols-outlined text-[16px]">check</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  resolveBet(bet.id, 'RED');
                                  onSuccessToast?.(`Aposta resolvida como RED.`);
                                }}
                                className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/20 transition-colors"
                                title="Definir Red"
                              >
                                <span className="material-symbols-outlined text-[16px]">close</span>
                              </button>
                            </>
                          )}

                          <button
                            type="button"
                            onClick={() => onEditBet(bet)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                            title="Editar"
                          >
                            <span className="material-symbols-outlined text-[16px]">edit</span>
                          </button>

                          {confirmDeleteId === bet.id ? (
                            <button
                              type="button"
                              onClick={() => {
                                deleteBet(bet.id);
                                setConfirmDeleteId(null);
                                onSuccessToast?.('Aposta removida.');
                              }}
                              className="px-2 py-1 rounded-lg bg-rose-600 text-white text-[11px] font-semibold"
                            >
                              Confirmar
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(bet.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
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
