import React, { useState, useMemo } from 'react';
import { useBankroll } from '../context/BankrollContext';
import { BetEntry, BetStatus } from '../types';
import { SPORTS_LIST } from '../data/footballMarkets';
import { BookmakerBadge } from './BookmakerLogo';
import { MatchCrests } from './TeamCrests';

interface LedgerViewProps {
  onOpenNewBetModal: () => void;
  onEditBet: (bet: BetEntry) => void;
  onSuccessToast?: (msg: string) => void;
}

export const LedgerView: React.FC<LedgerViewProps> = ({
  onOpenNewBetModal,
  onEditBet,
  onSuccessToast
}) => {
  const { bets, deleteBet, resolveBet } = useBankroll();

  const [selectedMonth, setSelectedMonth] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSport, setSelectedSport] = useState('ALL');
  const [selectedMarketCat, setSelectedMarketCat] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const rowsPerPage = 12;

  const months = [
    { key: 'ALL', label: 'Todos' },
    { key: '01', label: 'Jan' },
    { key: '02', label: 'Fev' },
    { key: '03', label: 'Mar' },
    { key: '04', label: 'Abr' },
    { key: '05', label: 'Mai' },
    { key: '06', label: 'Jun' },
    { key: '07', label: 'Jul' },
    { key: '08', label: 'Ago' },
    { key: '09', label: 'Set' },
    { key: '10', label: 'Out' },
    { key: '11', label: 'Nov' },
    { key: '12', label: 'Dez' }
  ];

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const filteredBets = useMemo(() => {
    return bets.filter((b) => {
      if (selectedMonth !== 'ALL') {
        const dStr = b.date || '';
        const match = dStr.match(/(\d{4})-(\d{2})|(\d{2})\/(\d{2})/);
        const mNum = match ? match[2] || match[4] : dStr.includes('Mai') || dStr.includes('-05-') ? '05' : '';
        if (mNum !== selectedMonth) return false;
      }

      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const ev = (b.event || '').toLowerCase();
        const mk = (b.market || '').toLowerCase();
        const bk = (b.bookmaker || '').toLowerCase();
        const matchesTerm = ev.includes(term) || mk.includes(term) || bk.includes(term);
        if (!matchesTerm) return false;
      }

      if (selectedSport !== 'ALL' && b.sport !== selectedSport) {
        return false;
      }

      if (selectedMarketCat !== 'ALL') {
        const mLower = b.market.toLowerCase();
        if (
          selectedMarketCat === 'Gols' &&
          !(
            mLower.includes('gol') ||
            mLower.includes('over') ||
            mLower.includes('under') ||
            mLower.includes('btts') ||
            mLower.includes('marcam') ||
            mLower.includes('clean sheet') ||
            mLower.includes('multigols') ||
            mLower.includes('sofrer')
          )
        ) {
          return false;
        }
        if (
          selectedMarketCat === 'Handicap' &&
          !(
            mLower.includes('handicap') ||
            mLower.includes('ha ') ||
            mLower.includes('asiático') ||
            mLower.includes('asiatico') ||
            mLower.includes('dnb') ||
            mLower.includes('spread') ||
            mLower.includes('.25') ||
            mLower.includes('.75')
          )
        ) {
          return false;
        }
        if (
          selectedMarketCat === 'Escanteios' &&
          !(mLower.includes('escanteio') || mLower.includes('corner') || mLower.includes('canto'))
        ) {
          return false;
        }
        if (
          selectedMarketCat === 'Cartões' &&
          !(
            mLower.includes('cart') ||
            mLower.includes('card') ||
            mLower.includes('vermelho') ||
            mLower.includes('expuls')
          )
        ) {
          return false;
        }
        if (
          selectedMarketCat === 'Resultado' &&
          !(
            mLower.includes('resultado') ||
            mLower.includes('1x2') ||
            mLower.includes('dupla chance') ||
            mLower.includes('moneyline') ||
            mLower.includes('ml') ||
            mLower.includes('vencedor') ||
            mLower.includes('vence') ||
            mLower.includes('empate') ||
            mLower.includes('intervalo') ||
            mLower.includes('win to nil')
          )
        ) {
          return false;
        }
        if (
          selectedMarketCat === 'Props' &&
          !(
            mLower.includes('chute') ||
            mLower.includes('finaliza') ||
            mLower.includes('jogador') ||
            mLower.includes('marcador') ||
            mLower.includes('assist') ||
            mLower.includes('desarme') ||
            mLower.includes('falta') ||
            mLower.includes('triplo') ||
            mLower.includes('reb')
          )
        ) {
          return false;
        }
        if (
          selectedMarketCat === 'Especiais' &&
          !(
            mLower.includes('pênalti') ||
            mLower.includes('penalti') ||
            mLower.includes('minuto') ||
            mLower.includes('placar') ||
            mLower.includes('ímpar') ||
            mLower.includes('impar') ||
            mLower.includes('par')
          )
        ) {
          return false;
        }
      }

      if (statusFilter !== 'ALL') {
        if (statusFilter === 'GREEN' && !(b.status === 'GREEN' || b.status === 'HALF_GREEN')) return false;
        if (statusFilter === 'RED' && !(b.status === 'RED' || b.status === 'HALF_RED')) return false;
        if (statusFilter === 'PENDENTE' && b.status !== 'PENDENTE') return false;
      }

      return true;
    });
  }, [bets, selectedMonth, searchTerm, selectedSport, selectedMarketCat, statusFilter]);

  const periodStats = useMemo(() => {
    let volume = 0;
    let pl = 0;

    filteredBets.forEach((b) => {
      volume += b.stake;
      if (b.status !== 'PENDENTE') {
        pl += b.pl;
      }
    });

    const roi = volume > 0 ? (pl / volume) * 100 : 0;

    return {
      count: filteredBets.length,
      volume,
      pl,
      roi
    };
  }, [filteredBets]);

  const totalPages = Math.max(1, Math.ceil(filteredBets.length / rowsPerPage));
  const paginatedBets = filteredBets.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  const exportCSV = () => {
    let csv = 'Data,Casa,Esporte,Evento,Mercado,Odd,Valor,Status,Lucro\n';
    filteredBets.forEach((r) => {
      csv += `"${r.date}","${r.bookmaker || ''}","${r.sport}","${r.event}","${r.market}",${r.odd},${r.stake},"${r.status}",${r.pl}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `apostas_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    onSuccessToast?.('Planilha CSV exportada com sucesso.');
  };

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
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0e1422]/95 border border-white/[0.07] rounded-2xl p-4 sm:p-6 shadow-sm">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">Livro-Razão</h2>
          <p className="text-xs text-slate-400">Extrato auditável de todas as suas operações esportivas</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={exportCSV}
            disabled={filteredBets.length === 0}
            className="flex-1 sm:flex-initial justify-center px-3.5 py-2 bg-[#080c14] hover:bg-slate-800 disabled:opacity-40 border border-white/[0.08] rounded-xl text-xs font-medium text-slate-200 transition-colors flex items-center gap-1.5 whitespace-nowrap"
          >
            <span className="material-symbols-outlined text-[16px]">download</span>
            <span>Exportar CSV</span>
          </button>
          <button
            type="button"
            onClick={onOpenNewBetModal}
            className="flex-1 sm:flex-initial justify-center px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-xs transition-all flex items-center gap-1.5 shadow-md shadow-blue-500/20 active:scale-95 whitespace-nowrap"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            <span>Nova Aposta</span>
          </button>
        </div>
      </div>

      {/* Month Filter Scroller (wraps cleanly on desktop, scrolls on small mobile) */}
      <div className="flex items-center sm:flex-wrap gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {months.map((m) => {
          const isSelected = selectedMonth === m.key;
          return (
            <button
              key={m.key}
              type="button"
              onClick={() => {
                setSelectedMonth(m.key);
                setCurrentPage(1);
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                isSelected
                  ? 'bg-blue-600 text-white font-semibold shadow-sm'
                  : 'bg-[#0e1422]/90 text-slate-400 hover:text-white border border-white/[0.06]'
              }`}
            >
              {m.label}
            </button>
          );
        })}
      </div>

      {/* Period Summary 4-Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-[#0e1422]/95 border border-white/[0.07] rounded-2xl p-3.5 sm:p-4 shadow-sm">
          <span className="text-[11px] text-slate-400 font-medium">Apostas no Filtro</span>
          <div className="text-lg sm:text-xl font-mono font-bold text-white mt-1 tabular-nums">
            {periodStats.count}
          </div>
        </div>
        <div className="bg-[#0e1422]/95 border border-white/[0.07] rounded-2xl p-3.5 sm:p-4 shadow-sm">
          <span className="text-[11px] text-slate-400 font-medium">Volume Apostado</span>
          <div className="text-lg sm:text-xl font-mono font-bold text-white mt-1 tabular-nums truncate">
            {formatBRL(periodStats.volume)}
          </div>
        </div>
        <div className="bg-[#0e1422]/95 border border-white/[0.07] rounded-2xl p-3.5 sm:p-4 shadow-sm">
          <span className="text-[11px] text-slate-400 font-medium">Lucro / P&L</span>
          <div
            className={`text-lg sm:text-xl font-mono font-bold mt-1 tabular-nums truncate ${
              periodStats.pl >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {periodStats.pl >= 0 ? '+' : ''}
            {formatBRL(periodStats.pl)}
          </div>
        </div>
        <div className="bg-[#0e1422]/95 border border-white/[0.07] rounded-2xl p-3.5 sm:p-4 shadow-sm">
          <span className="text-[11px] text-slate-400 font-medium">ROI do Período</span>
          <div
            className={`text-lg sm:text-xl font-mono font-bold mt-1 tabular-nums ${
              periodStats.roi >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {periodStats.roi >= 0 ? '+' : ''}
            {periodStats.roi.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#0e1422]/95 border border-white/[0.07] rounded-2xl p-3.5 sm:p-4 flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 flex-1">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-[16px]">
              search
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Time, evento ou casa..."
              className="bg-[#080c14] border border-white/[0.08] text-slate-200 pl-9 pr-3 py-2 rounded-xl text-xs focus:outline-none focus:border-blue-500 w-full placeholder:text-slate-500"
            />
          </div>

          <select
            value={selectedSport}
            onChange={(e) => {
              setSelectedSport(e.target.value);
              setCurrentPage(1);
            }}
            className="bg-[#080c14] border border-white/[0.08] text-slate-200 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-blue-500"
          >
            <option value="ALL" className="bg-[#0e1422] text-slate-200">Todos os Esportes</option>
            {SPORTS_LIST.map((sp) => (
              <option key={sp} value={sp} className="bg-[#0e1422] text-slate-200">
                {sp}
              </option>
            ))}
          </select>

          <select
            value={selectedMarketCat}
            onChange={(e) => {
              setSelectedMarketCat(e.target.value);
              setCurrentPage(1);
            }}
            className="bg-[#080c14] border border-white/[0.08] text-slate-200 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-blue-500"
          >
            <option value="ALL" className="bg-[#0e1422] text-slate-200">Todos os Mercados</option>
            <option value="Resultado" className="bg-[#0e1422] text-slate-200">Resultado / ML</option>
            <option value="Gols" className="bg-[#0e1422] text-slate-200">Gols & BTTS</option>
            <option value="Handicap" className="bg-[#0e1422] text-slate-200">Handicap / Spread</option>
            <option value="Escanteios" className="bg-[#0e1422] text-slate-200">Escanteios</option>
            <option value="Cartões" className="bg-[#0e1422] text-slate-200">Cartões</option>
            <option value="Props" className="bg-[#0e1422] text-slate-200">Props / Jogadores</option>
            <option value="Especiais" className="bg-[#0e1422] text-slate-200">Especiais & Minutos</option>
          </select>
        </div>

        {/* Status segmented buttons */}
        <div className="flex items-center bg-[#080c14] p-1 rounded-xl border border-white/[0.08] overflow-x-auto scrollbar-none shrink-0">
          {(['ALL', 'GREEN', 'RED', 'PENDENTE'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => {
                setStatusFilter(st);
                setCurrentPage(1);
              }}
              className={`flex-1 xl:flex-initial px-3 py-1.5 text-xs rounded-lg whitespace-nowrap transition-all ${
                statusFilter === st
                  ? 'bg-slate-800 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {st === 'ALL' ? 'Todas' : st === 'GREEN' ? 'Greens' : st === 'RED' ? 'Reds' : 'Pendentes'}
            </button>
          ))}
        </div>
      </div>

      {/* Results List / Table */}
      {paginatedBets.length === 0 ? (
        <div className="bg-[#0e1422]/95 border border-white/[0.07] rounded-2xl py-12 px-4 flex flex-col items-center justify-center text-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <span className="material-symbols-outlined text-[22px]">table_rows</span>
          </div>
          <div className="max-w-sm">
            <h4 className="text-sm font-semibold text-white">Nenhum registro encontrado</h4>
            <p className="text-xs text-slate-400 mt-1">
              {bets.length === 0
                ? 'Adicione sua primeira aposta para preencher o Livro-Razão.'
                : 'Nenhuma aposta corresponde aos filtros selecionados.'}
            </p>
          </div>
          {bets.length === 0 && (
            <button
              type="button"
              onClick={onOpenNewBetModal}
              className="mt-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-md shadow-blue-600/20 active:scale-95 transition-all flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              <span>Registrar Nova Aposta</span>
            </button>
          )}
        </div>
      ) : (
        <>
          {/* MOBILE CARD LIST (< md) */}
          <div className="flex flex-col gap-2.5 md:hidden">
            {paginatedBets.map((bet) => {
              const isMultipleBet =
                /^m[uú]ltipla\s*\(/i.test(bet.event) ||
                (bet.event.includes(' + ') && /\s(?:x|vs\.?|v)\s/i.test(bet.event));
              return (
              <div
                key={bet.id}
                className="bg-[#0e1422]/95 border border-white/[0.07] rounded-xl p-3.5 flex flex-col gap-2.5"
              >
                {isMultipleBet ? (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold text-blue-300 uppercase tracking-wider flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">layers</span>
                        <span>Entrada Múltipla</span>
                      </span>
                      <div className="flex items-center shrink-0 gap-2">
                        {getStatusBadge(bet.status)}
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
                      <div className="rounded-lg bg-[#05080f]/80 border border-white/[0.05] px-2.5 py-1.5 max-h-16 overflow-y-auto overscroll-contain text-[11px] text-slate-400 leading-relaxed space-y-0.5">
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
                      </div>
                    </div>
                    <div className="min-w-0 flex flex-col gap-0.5">
                      <span className="text-[13px] sm:text-sm font-semibold text-white leading-snug line-clamp-2 break-words">
                        {bet.event}
                      </span>
                      <span className="text-xs text-slate-400 block truncate">
                        {bet.market} · {bet.sport}
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-xs text-slate-400 pt-2 border-t border-white/[0.05]">
                  <div className="flex items-center gap-1.5 font-mono tabular-nums shrink-0">
                    <span className="text-blue-400 font-semibold">@{Number(bet.odd || 1).toFixed(2)}</span>
                    <span>·</span>
                    <span className="text-slate-200">{formatBRL(bet.stake)}</span>
                    <span>({bet.units}u)</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400 min-w-0 truncate">
                    <BookmakerBadge bookmaker={bet.bookmaker} size="sm" />
                    <span>·</span>
                    <span className="font-mono shrink-0">{bet.date}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1">
                  {bet.status === 'PENDENTE' ? (
                    <div className="flex items-center gap-1.5 flex-1">
                      <button
                        type="button"
                        onClick={() => {
                          resolveBet(bet.id, 'GREEN');
                          onSuccessToast?.('Aposta resolvida como GREEN!');
                        }}
                        className="flex-1 min-h-[38px] px-2.5 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 text-xs font-semibold flex items-center justify-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[16px]">check</span>
                        <span>Green</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          resolveBet(bet.id, 'RED');
                          onSuccessToast?.('Aposta resolvida como RED.');
                        }}
                        className="flex-1 min-h-[38px] px-2.5 py-1.5 rounded-lg bg-rose-500/15 text-rose-400 border border-rose-500/25 text-xs font-semibold flex items-center justify-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[16px]">close</span>
                        <span>Red</span>
                      </button>
                    </div>
                  ) : (
                    <span className="text-[11px] text-slate-500 font-mono truncate min-w-0 flex-1">{bet.id}</span>
                  )}

                  <div className="flex items-center gap-1.5 shrink-0 ml-auto">
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
                          onSuccessToast?.('Aposta excluída.');
                        }}
                        className="min-h-[38px] px-2.5 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold"
                      >
                        Confirmar
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
              );
            })}
          </div>

          {/* DESKTOP TABLE (md and up) */}
          <div className="hidden md:block w-full overflow-x-auto rounded-2xl border border-white/[0.06] bg-[#080c14] shadow-sm">
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
                {paginatedBets.map((bet) => (
                  <tr key={bet.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-3.5 font-mono text-slate-400 whitespace-nowrap tabular-nums">
                      {bet.date}
                    </td>
                    <td className="py-3 px-3.5 font-medium text-slate-200 whitespace-nowrap">
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
                            <div className="rounded-lg bg-[#05080f]/80 border border-white/[0.05] px-2.5 py-1 max-h-14 overflow-y-auto overscroll-contain text-[11px] text-slate-400 leading-snug space-y-0.5">
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
                            <span className="font-semibold text-slate-100 truncate">{bet.event}</span>
                            <span className="text-[11px] text-slate-400 truncate">
                              {bet.market} · {bet.sport}
                            </span>
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3.5 text-right font-mono font-semibold text-blue-400 whitespace-nowrap tabular-nums">
                      @{Number(bet.odd || 1).toFixed(2)}
                    </td>
                    <td className="py-3 px-3.5 text-right font-mono text-slate-200 whitespace-nowrap tabular-nums">
                      {formatBRL(bet.stake)}
                    </td>
                    <td className="py-3 px-3.5 text-center whitespace-nowrap">
                      {getStatusBadge(bet.status)}
                    </td>
                    <td
                      className={`py-3 px-3.5 text-right font-mono font-bold text-xs sm:text-sm whitespace-nowrap tabular-nums ${
                        bet.status === 'PENDENTE'
                          ? 'text-slate-500'
                          : bet.pl >= 0
                          ? 'text-emerald-400'
                          : 'text-rose-400'
                      }`}
                    >
                      {bet.status === 'PENDENTE' ? '-' : `${bet.pl >= 0 ? '+' : ''}${formatBRL(bet.pl)}`}
                    </td>
                    <td className="py-3 px-3.5 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        {bet.status === 'PENDENTE' && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                resolveBet(bet.id, 'GREEN');
                                onSuccessToast?.('Aposta resolvida como GREEN');
                              }}
                              className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-500/20"
                              title="Green"
                            >
                              <span className="material-symbols-outlined text-[16px]">check</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                resolveBet(bet.id, 'RED');
                                onSuccessToast?.('Aposta resolvida como RED');
                              }}
                              className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/20"
                              title="Red"
                            >
                              <span className="material-symbols-outlined text-[16px]">close</span>
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => onEditBet(bet)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
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
                              onSuccessToast?.('Aposta excluída com sucesso.');
                            }}
                            className="px-2 py-1 rounded-lg bg-rose-600 text-white text-[11px] font-semibold"
                          >
                            Confirmar
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(bet.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800"
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

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
          <span>
            Mostrando {paginatedBets.length} de {filteredBets.length} apostas
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 bg-[#0e1422] border border-white/[0.08] rounded-lg disabled:opacity-40 hover:text-white"
            >
              Anterior
            </button>
            <span className="px-2 font-mono text-slate-200 tabular-nums">
              {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1.5 bg-[#0e1422] border border-white/[0.08] rounded-lg disabled:opacity-40 hover:text-white"
            >
              Próxima
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
