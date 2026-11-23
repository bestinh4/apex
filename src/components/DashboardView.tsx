import React, { useState } from 'react';
import { useBankroll } from '../context/BankrollContext';
import { BetEntry, BetStatus } from '../types';
import { BankrollChart } from './BankrollChart';
import { BookmakerBadge } from './BookmakerLogo';
import { MatchCrests } from './TeamCrests';

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
    realEquity,
    availableRealBalance,
    realExposure,
    promoBalance,
    settings,
    netBetProfit,
    winRate,
    turnoverVolume,
    roi,
    turnoverPolicyDoc,
    winCount,
    lossCount,
    voidCount,
    bettingDrawdownPct
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
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">
            Green
          </span>
        );
      case 'RED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 whitespace-nowrap">
            Red
          </span>
        );
      case 'HALF_GREEN':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300 whitespace-nowrap">
            ½ Green
          </span>
        );
      case 'HALF_RED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-rose-100 text-rose-800 border border-rose-300 whitespace-nowrap">
            ½ Red
          </span>
        );
      case 'VOID':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-300 whitespace-nowrap">
            Reembolso
          </span>
        );
      case 'CASHOUT':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 whitespace-nowrap">
            Cashout
          </span>
        );
      case 'PENDENTE':
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 whitespace-nowrap">
            Pendente
          </span>
        );
    }
  };

  return (
    <div className="w-full flex flex-col gap-4 sm:gap-6 animate-in fade-in duration-200">
      {/* 4 Primary KPI Cards - 2x2 on Mobile, 4 cols on Desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* 1. Patrimônio Real & Disponível */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 sm:p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_1px_2px_rgba(15,23,42,0.04)] flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] sm:text-xs font-semibold text-slate-500 truncate">
              Patrimônio Real
            </span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-blue-600 text-white shadow-sm shadow-blue-600/25 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[16px] sm:text-[18px]">account_balance_wallet</span>
            </div>
          </div>
          <div className="mt-2 sm:mt-3 flex flex-col">
            <span className="text-lg sm:text-xl xl:text-2xl font-mono font-bold text-slate-900 tracking-tight tabular-nums truncate">
              {formatBRL(realEquity)}
            </span>
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-slate-500 mt-1">
              <span>
                Disp:{' '}
                <span className="font-mono text-emerald-600 font-semibold tabular-nums">
                  {formatBRL(availableRealBalance)}
                </span>
              </span>
              {realExposure > 0 && (
                <>
                  <span>·</span>
                  <span>
                    Exp:{' '}
                    <span className="font-mono text-amber-600 font-semibold tabular-nums">
                      {formatBRL(realExposure)}
                    </span>
                  </span>
                </>
              )}
              {promoBalance !== 0 && (
                <>
                  <span>·</span>
                  <span>
                    Promo:{' '}
                    <span className="font-mono text-indigo-600 font-semibold tabular-nums">
                      {formatBRL(promoBalance)}
                    </span>
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* 2. Lucro Líquido (Apostas Reais) */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 sm:p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_1px_2px_rgba(15,23,42,0.04)] flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] sm:text-xs font-semibold text-slate-500 truncate">
              Lucro Líquido (Real)
            </span>
            <div
              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center text-white shadow-sm shrink-0 ${
                netBetProfit >= 0
                  ? 'bg-emerald-600 shadow-emerald-600/25'
                  : 'bg-rose-600 shadow-rose-600/25'
              }`}
            >
              <span className="material-symbols-outlined text-[16px] sm:text-[18px]">
                {netBetProfit >= 0 ? 'trending_up' : 'trending_down'}
              </span>
            </div>
          </div>
          <div className="mt-2 sm:mt-3 flex flex-col">
            <span
              className={`text-lg sm:text-xl xl:text-2xl font-mono font-bold tracking-tight tabular-nums truncate ${
                netBetProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              {netBetProfit >= 0 ? '+' : ''}
              {formatBRL(netBetProfit)}
            </span>
            <div className="flex items-center gap-1 text-[11px] mt-1 text-slate-500 truncate">
              <span
                className={`font-mono font-semibold tabular-nums ${
                  netBetProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {netBetProfit >= 0 ? '+' : ''}
                {plPct.toFixed(1)}%
              </span>
              <span>·</span>
              <span className="font-mono text-slate-700 font-medium tabular-nums">
                {plUnits >= 0 ? '+' : ''}
                {plUnits.toFixed(1)}u
              </span>
            </div>
          </div>
        </div>

        {/* 3. Taxa de Acerto (Win Rate) */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 sm:p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_1px_2px_rgba(15,23,42,0.04)] flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] sm:text-xs font-semibold text-slate-500 truncate">
              Taxa de Acerto
            </span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-indigo-600 text-white shadow-sm shadow-indigo-600/25 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[16px] sm:text-[18px]">verified</span>
            </div>
          </div>
          <div className="mt-2 sm:mt-3 flex flex-col">
            <span className="text-lg sm:text-xl xl:text-2xl font-mono font-bold text-slate-900 tracking-tight tabular-nums">
              {winRate.toFixed(1)}%
            </span>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-1 font-mono tabular-nums">
              <span className="text-emerald-600 font-bold">{winCount}G</span>
              <span>·</span>
              <span className="text-rose-600 font-bold">{lossCount}R</span>
              {voidCount > 0 && (
                <>
                  <span>·</span>
                  <span className="text-slate-500 font-medium">{voidCount}V</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* 4. ROI (Retorno sobre Investimento Real) */}
        <div
          title={turnoverPolicyDoc}
          className="bg-white border border-slate-200/90 rounded-2xl p-3.5 sm:p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_1px_2px_rgba(15,23,42,0.04)] flex flex-col justify-between"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] sm:text-xs font-semibold text-slate-500 truncate">
              Retorno Real (ROI)
            </span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-teal-600 text-white shadow-sm shadow-teal-600/25 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[16px] sm:text-[18px]">monitoring</span>
            </div>
          </div>
          <div className="mt-2 sm:mt-3 flex flex-col">
            <span
              className={`text-lg sm:text-xl xl:text-2xl font-mono font-bold tracking-tight tabular-nums ${
                roi >= 0 ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              {roi >= 0 ? '+' : ''}
              {roi.toFixed(1)}%
            </span>
            <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-1 truncate">
              <span>Giro Real:</span>
              <span className="font-mono text-slate-700 font-medium tabular-nums">{formatBRL(turnoverVolume)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Bankroll Evolution Chart */}
      <BankrollChart
        bets={bets}
        initialBankroll={settings.initialBankroll}
        currentEquity={realEquity}
        unitValue={settings.unitValue}
        maxDrawdownPct={bettingDrawdownPct}
        onOpenNewBetModal={onOpenNewBetModal}
      />

      {/* Recent Bets Section */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-6 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_1px_2px_rgba(15,23,42,0.04)] flex flex-col gap-4">
        {/* Section Header + Toolbar */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                Apostas Recentes
              </h3>
              <p className="text-xs text-slate-500">
                Gerencie suas entradas, edite ou liquide apostas pendentes
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenNewBetModal}
              className="xl:hidden px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs transition-all flex items-center gap-1 active:scale-95 shadow-sm shadow-blue-600/25 shrink-0 whitespace-nowrap"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              <span>Nova Aposta</span>
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-60">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[16px]">
                search
              </span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar evento, mercado ou casa..."
                className="w-full bg-slate-50 border border-slate-200 text-slate-900 pl-9 pr-3 py-2 rounded-xl text-xs focus:outline-none focus:border-blue-600 focus:bg-white placeholder:text-slate-400 transition-colors"
              />
            </div>

            {/* Status Segmented Tabs */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 overflow-x-auto scrollbar-none shrink-0">
              {(['ALL', 'GREEN', 'RED', 'PENDENTE'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setFilterStatus(st)}
                  className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-all ${
                    filterStatus === st
                      ? 'bg-blue-600 text-white font-semibold shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {st === 'ALL' ? 'Todas' : st === 'GREEN' ? 'Greens' : st === 'RED' ? 'Reds' : 'Pendentes'}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={onOpenNewBetModal}
              className="hidden xl:flex px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs transition-all items-center gap-1.5 active:scale-95 shadow-sm shadow-blue-600/25 whitespace-nowrap shrink-0"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              <span>Nova Aposta</span>
            </button>
          </div>
        </div>

        {/* Empty State */}
        {filteredBets.length === 0 ? (
          <div className="bg-slate-50 border border-slate-200 rounded-xl py-10 px-4 flex flex-col items-center justify-center text-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-sm shadow-blue-600/20">
              <span className="material-symbols-outlined text-[22px]">receipt_long</span>
            </div>
            <div className="max-w-sm">
              <h4 className="text-sm font-bold text-slate-900">
                {bets.length === 0 ? 'Nenhuma aposta registrada' : 'Nenhum resultado para o filtro'}
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                {bets.length === 0
                  ? 'Seu painel está limpo e pronto para uso. Adicione sua primeira operação para acompanhar estatísticas e evolução da banca.'
                  : 'Tente alterar os termos da busca ou selecionar outro status.'}
              </p>
            </div>
            {bets.length === 0 && (
              <button
                type="button"
                onClick={onOpenNewBetModal}
                className="mt-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 text-white text-xs font-semibold rounded-xl shadow-md shadow-blue-600/20 active:scale-95 transition-all flex items-center gap-1.5"
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
              {filteredBets.map((bet) => {
                const isMultipleBet =
                  /^m[uú]ltipla\s*\(/i.test(bet.event) ||
                  (bet.event.includes(' + ') && /\s(?:x|vs\.?|v)\s/i.test(bet.event));
                return (
                <div
                  key={bet.id}
                  className="bg-slate-50/70 border border-slate-200 rounded-xl p-3.5 flex flex-col gap-2.5"
                >
                  {/* Top Row: Crests + Status + P&L, then full-width Event + Market */}
                  {isMultipleBet ? (
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">layers</span>
                          <span>Entrada Múltipla</span>
                        </span>
                        <div className="flex items-center shrink-0 gap-2">
                          {getStatusBadge(bet.status)}
                          <span
                            className={`font-mono font-bold text-sm tabular-nums ${
                              bet.status === 'PENDENTE'
                                ? 'text-amber-600'
                                : bet.pl >= 0
                                ? 'text-emerald-600'
                                : 'text-rose-600'
                            }`}
                          >
                            {bet.status === 'PENDENTE'
                              ? 'Em aberto'
                              : `${bet.pl >= 0 ? '+' : ''}${formatBRL(bet.pl)}`}
                          </span>
                        </div>
                      </div>
                      <MatchCrests
                        event={bet.event}
                        sport={bet.sport}
                        size="sm"
                        showLabels
                        maxScrollHeightClass="max-h-[168px]"
                      />
                      {bet.market && (
                        <div className="rounded-lg bg-white border border-slate-200 px-2.5 py-1.5 max-h-16 overflow-y-auto overscroll-contain text-[11px] text-slate-600 leading-relaxed space-y-0.5">
                          {bet.market.split(' | ').map((line, i) => (
                            <p key={i} className="break-words">{line}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <MatchCrests event={bet.event} sport={bet.sport} size="sm" />
                        <div className="flex items-center shrink-0 gap-2">
                          {getStatusBadge(bet.status)}
                          <span
                            className={`font-mono font-bold text-sm tabular-nums ${
                              bet.status === 'PENDENTE'
                                ? 'text-amber-600'
                                : bet.pl >= 0
                                ? 'text-emerald-600'
                                : 'text-rose-600'
                            }`}
                          >
                            {bet.status === 'PENDENTE'
                              ? 'Em aberto'
                              : `${bet.pl >= 0 ? '+' : ''}${formatBRL(bet.pl)}`}
                          </span>
                        </div>
                      </div>
                      <div className="min-w-0 flex flex-col gap-0.5">
                        <span className="text-[13px] sm:text-sm font-bold text-slate-900 leading-snug line-clamp-2 break-words">
                          {bet.event}
                        </span>
                        <span className="text-xs text-slate-500 block truncate">
                          {bet.market}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Middle Metadata Row: Odd · Stake · Bookmaker · Date */}
                  <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-xs text-slate-500 pt-2 border-t border-slate-200/80">
                    <div className="flex items-center gap-1.5 font-mono tabular-nums shrink-0">
                      <span className="text-blue-600 font-bold">@{Number(bet.odd || 1).toFixed(2)}</span>
                      <span>·</span>
                      <span className="text-slate-800 font-semibold">{formatBRL(bet.stake)}</span>
                      <span>({bet.units}u)</span>
                      {bet.type !== 'Saldo Real' && (
                        <span className="px-1.5 py-0.5 rounded bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-sans font-semibold">
                          {bet.type === 'Bônus Rollover' ? 'Rollover' : 'Freebet'}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 min-w-0 truncate">
                      <BookmakerBadge bookmaker={bet.bookmaker} size="sm" className="text-slate-700 font-medium" />
                      <span>·</span>
                      <span className="font-mono shrink-0">{bet.date}</span>
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
                          className="flex-1 min-h-[38px] px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center justify-center gap-1 active:scale-95 transition-all shadow-sm"
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
                          className="flex-1 min-h-[38px] px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center justify-center gap-1 active:scale-95 transition-all shadow-sm"
                        >
                          <span className="material-symbols-outlined text-[16px]">close</span>
                          <span>Red</span>
                        </button>
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-500 font-medium">{bet.sport}</span>
                    )}

                    <div className="flex items-center gap-1.5 ml-auto">
                      <button
                        type="button"
                        onClick={() => onEditBet(bet)}
                        className="min-h-[38px] px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-100 text-xs font-semibold flex items-center gap-1 transition-colors"
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
                          className="min-h-[38px] min-w-[38px] rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 flex items-center justify-center transition-colors"
                          title="Excluir"
                        >
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                );
              })}
            </div>

            {/* DESKTOP TABLE (md and up) */}
            <div className="hidden md:block w-full overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 text-[11px] font-bold">
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
                <tbody className="divide-y divide-slate-100">
                  {filteredBets.map((bet) => (
                    <tr key={bet.id} className="hover:bg-slate-50/90 transition-colors">
                      <td className="py-3 px-3.5 font-mono text-slate-500 whitespace-nowrap tabular-nums">
                        {bet.date}
                      </td>
                      <td className="py-3 px-3.5 font-semibold text-slate-800 whitespace-nowrap">
                        <BookmakerBadge bookmaker={bet.bookmaker} size="sm" />
                      </td>
                      <td className="py-3 px-3.5 max-w-lg">
                        {(/^m[uú]ltipla\s*\(/i.test(bet.event) ||
                          (bet.event.includes(' + ') && /\s(?:x|vs\.?|v)\s/i.test(bet.event))) ? (
                          <div className="flex flex-col gap-1.5 min-w-[290px]">
                            <MatchCrests
                              event={bet.event}
                              sport={bet.sport}
                              size="md"
                              showLabels
                              maxScrollHeightClass="max-h-[156px]"
                            />
                            {bet.market && (
                              <div className="rounded-lg bg-slate-50 border border-slate-200 px-2.5 py-1 max-h-14 overflow-y-auto overscroll-contain text-[11px] text-slate-600 leading-snug space-y-0.5">
                                {bet.market.split(' | ').map((line, i) => (
                                  <p key={i} className="truncate">{line}</p>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-3 min-w-[220px]">
                            <MatchCrests event={bet.event} sport={bet.sport} size="md" />
                            <div className="flex flex-col min-w-0">
                              <span className="font-semibold text-slate-900 truncate">{bet.event}</span>
                              <span className="text-[11px] text-slate-500 truncate">{bet.market}</span>
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3.5 text-right font-mono font-bold text-blue-600 whitespace-nowrap tabular-nums">
                        @{Number(bet.odd || 1).toFixed(2)}
                      </td>
                      <td className="py-3 px-3.5 text-right font-mono text-slate-800 font-medium whitespace-nowrap tabular-nums">
                        <div className="flex flex-col items-end">
                          <span>{formatBRL(bet.stake)}</span>
                          {bet.type !== 'Saldo Real' && (
                            <span className="text-[10px] font-sans font-semibold text-indigo-600">
                              {bet.type === 'Bônus Rollover' ? 'Rollover' : 'Freebet'}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3.5 text-center whitespace-nowrap">
                        {getStatusBadge(bet.status)}
                      </td>
                      <td
                        className={`py-3 px-3.5 text-right font-mono font-bold text-xs sm:text-sm whitespace-nowrap tabular-nums ${
                          bet.status === 'PENDENTE'
                            ? 'text-amber-600'
                            : bet.pl >= 0
                            ? 'text-emerald-600'
                            : 'text-rose-600'
                        }`}
                      >
                        {bet.status === 'PENDENTE'
                          ? 'Pendente'
                          : `${bet.pl >= 0 ? '+' : ''}${formatBRL(bet.pl)}`}
                      </td>
                      <td className="py-3 px-3.5 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          {bet.status === 'PENDENTE' && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  resolveBet(bet.id, 'GREEN');
                                  onSuccessToast?.(`Aposta resolvida como GREEN!`);
                                }}
                                className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-100 transition-colors"
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
                                className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-100 transition-colors"
                                title="Definir Red"
                              >
                                <span className="material-symbols-outlined text-[16px]">close</span>
                              </button>
                            </>
                          )}

                          <button
                            type="button"
                            onClick={() => onEditBet(bet)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
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
                              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
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
