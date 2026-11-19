import React from 'react';
import { useBankroll } from '../context/BankrollContext';
import { SPORTS_LIST, BOOKMAKERS } from '../data/footballMarkets';
import { BookmakerBadge } from './BookmakerLogo';

interface AnalyticsViewProps {
  onSuccessToast?: (msg: string) => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ onSuccessToast }) => {
  const { bets, maxWinStreak, maxLossStreak, currentStreakText } = useBankroll();

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  // Sports stats (base sports + any extra sport found in bets)
  const extraSports = Array.from(
    new Set(bets.map((b) => b.sport).filter((s) => s && !(SPORTS_LIST as readonly string[]).includes(s)))
  );
  const sports = [...SPORTS_LIST, ...extraSports];
  const sportStats = sports.map((s) => {
    const list = bets.filter((b) => b.sport === s);
    const resolved = list.filter((b) => b.status !== 'PENDENTE');
    const volume = resolved.reduce((sum, b) => sum + b.stake, 0);
    const pl = resolved.reduce((sum, b) => sum + b.pl, 0);
    const wins = resolved.filter((b) => b.status === 'GREEN' || b.status === 'HALF_GREEN').length;
    const losses = resolved.filter((b) => b.status === 'RED' || b.status === 'HALF_RED').length;
    const totalDecisive = wins + losses;
    const winRate = totalDecisive > 0 ? (wins / totalDecisive) * 100 : 0;
    const roi = volume > 0 ? (pl / volume) * 100 : 0;

    return {
      sport: s,
      count: list.length,
      volume,
      winRate,
      pl,
      roi
    };
  });

  // Real Odds Buckets Computation
  const oddsBuckets = [
    {
      label: 'Odds Baixas (@1.01 - @1.60)',
      min: 1.0,
      max: 1.6,
      barColor: 'bg-emerald-400',
      textColor: 'text-emerald-400'
    },
    {
      label: 'Odds Médias (@1.61 - @2.10)',
      min: 1.6001,
      max: 2.1,
      barColor: 'bg-blue-500',
      textColor: 'text-blue-400'
    },
    {
      label: 'Odds Altas (@2.11+)',
      min: 2.1001,
      max: 9999,
      barColor: 'bg-indigo-500',
      textColor: 'text-indigo-400'
    }
  ].map((bucket) => {
    const resolved = bets.filter(
      (b) => b.status !== 'PENDENTE' && b.odd >= bucket.min && b.odd <= bucket.max
    );
    const wins = resolved.filter((b) => b.status === 'GREEN' || b.status === 'HALF_GREEN').length;
    const losses = resolved.filter((b) => b.status === 'RED' || b.status === 'HALF_RED').length;
    const decisive = wins + losses;
    const winRate = decisive > 0 ? (wins / decisive) * 100 : 0;
    const volume = resolved.reduce((sum, b) => sum + b.stake, 0);
    const pl = resolved.reduce((sum, b) => sum + b.pl, 0);
    const roi = volume > 0 ? (pl / volume) * 100 : 0;

    return {
      ...bucket,
      count: resolved.length,
      winRate,
      roi,
      pl
    };
  });

  // Profit factor calculation
  const settledBets = bets.filter((b) => b.status !== 'PENDENTE');
  const totalGains = settledBets.filter((b) => b.pl > 0).reduce((sum, b) => sum + b.pl, 0);
  const totalLosses = Math.abs(settledBets.filter((b) => b.pl < 0).reduce((sum, b) => sum + b.pl, 0));
  const avgNet = settledBets.length > 0 ? (totalGains - totalLosses) / settledBets.length : 0;
  const profitFactor =
    totalLosses > 0
      ? (totalGains / totalLosses).toFixed(2)
      : totalGains > 0
      ? '∞'
      : '0.00';

  // Market categories breakdown
  const classifyMarket = (marketStr: string): string => {
    const m = (marketStr || '').toLowerCase();
    if (m.includes('escanteio') || m.includes('corner') || m.includes('canto')) return 'Escanteios';
    if (m.includes('cart') || m.includes('card') || m.includes('vermelho') || m.includes('expuls')) return 'Cartões';
    if (m.includes('handicap') || m.includes('asiático') || m.includes('asiatico') || m.includes('dnb') || m.includes('spread') || m.includes('.25') || m.includes('.75')) return 'Handicap Asiático';
    if (m.includes('chute') || m.includes('finaliza') || m.includes('marcador') || m.includes('desarme') || m.includes('falta') || m.includes('assist') || m.includes('jogador') || m.includes('triplo') || m.includes('reb')) return 'Props de Jogadores';
    if (m.includes('pênalti') || m.includes('penalti') || m.includes('minuto') || m.includes('placar') || m.includes('ímpar') || m.includes('impar')) return 'Especiais & Minutos';
    if (m.includes('gol') || m.includes('over') || m.includes('under') || m.includes('btts') || m.includes('marcam') || m.includes('clean sheet') || m.includes('multigols')) return 'Gols & BTTS';
    if (m.includes('resultado') || m.includes('1x2') || m.includes('dupla chance') || m.includes('moneyline') || m.includes('ml') || m.includes('vencedor') || m.includes('vence') || m.includes('intervalo') || m.includes('win to nil')) return 'Resultado & Linhas';
    return 'Outros Mercados';
  };

  const marketCategoriesList = [
    'Resultado & Linhas',
    'Gols & BTTS',
    'Handicap Asiático',
    'Escanteios',
    'Cartões',
    'Props de Jogadores',
    'Especiais & Minutos'
  ];

  const marketStats = marketCategoriesList.map((cat) => {
    const list = bets.filter((b) => classifyMarket(b.market) === cat);
    const resolved = list.filter((b) => b.status !== 'PENDENTE');
    const volume = resolved.reduce((sum, b) => sum + b.stake, 0);
    const pl = resolved.reduce((sum, b) => sum + b.pl, 0);
    const wins = resolved.filter((b) => b.status === 'GREEN' || b.status === 'HALF_GREEN').length;
    const losses = resolved.filter((b) => b.status === 'RED' || b.status === 'HALF_RED').length;
    const decisive = wins + losses;
    const winRate = decisive > 0 ? (wins / decisive) * 100 : 0;
    const roi = volume > 0 ? (pl / volume) * 100 : 0;

    return {
      category: cat,
      count: list.length,
      volume,
      winRate,
      pl,
      roi
    };
  });

  // Bookmakers breakdown (used bookmakers first, or default list if empty)
  const usedBookmakers = Array.from(
    new Set(bets.map((b) => b.bookmaker).filter((bk): bk is string => Boolean(bk && bk.trim())))
  );
  const displayBookmakers =
    usedBookmakers.length > 0 ? usedBookmakers : [...BOOKMAKERS.slice(0, 6)];

  const bookmakerStats = displayBookmakers.map((bk) => {
    const list = bets.filter((b) => b.bookmaker === bk);
    const resolved = list.filter((b) => b.status !== 'PENDENTE');
    const volume = resolved.reduce((sum, b) => sum + b.stake, 0);
    const pl = resolved.reduce((sum, b) => sum + b.pl, 0);
    const wins = resolved.filter((b) => b.status === 'GREEN' || b.status === 'HALF_GREEN').length;
    const losses = resolved.filter((b) => b.status === 'RED' || b.status === 'HALF_RED').length;
    const decisive = wins + losses;
    const winRate = decisive > 0 ? (wins / decisive) * 100 : 0;
    const roi = volume > 0 ? (pl / volume) * 100 : 0;

    return {
      bookmaker: bk,
      count: list.length,
      volume,
      winRate,
      pl,
      roi
    };
  });

  // Export CSV
  const handleExport = () => {
    let csv = 'Modalidade,Apostas,Volume_BRL,Taxa_Acerto_Pct,Lucro_BRL,ROI_Pct\n';
    sportStats.forEach((s) => {
      csv += `"${s.sport}",${s.count},${s.volume.toFixed(2)},${s.winRate.toFixed(1)},${s.pl.toFixed(2)},${s.roi.toFixed(1)}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `estatisticas_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    onSuccessToast?.('Relatório de estatísticas baixado com sucesso.');
  };

  return (
    <div className="w-full flex flex-col gap-4 sm:gap-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0e1422]/95 border border-white/[0.07] rounded-2xl p-4 sm:p-6 shadow-sm">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
            Estatísticas de Desempenho
          </h2>
          <p className="text-xs text-slate-400">
            Análise real por modalidade, faixas de odds e consistência operacional
          </p>
        </div>

        <button
          type="button"
          onClick={handleExport}
          className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 self-stretch sm:self-auto active:scale-95 shadow-md shadow-blue-500/20 whitespace-nowrap"
        >
          <span className="material-symbols-outlined text-[16px]">download</span>
          <span>Exportar Relatório</span>
        </button>
      </div>

      {/* 3 Key Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-[#0e1422]/95 border border-white/[0.07] rounded-2xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">
              Fator de Lucro (Profit Factor)
            </span>
            <span className="material-symbols-outlined text-[18px] text-emerald-400">query_stats</span>
          </div>
          <div className="text-2xl font-mono font-bold text-white mt-2 tabular-nums">
            {profitFactor}
          </div>
          <div className="text-xs text-slate-400 mt-1 flex items-center gap-1.5 flex-wrap">
            <span>
              Ganhos: <strong className="text-emerald-400 font-mono tabular-nums">{formatBRL(totalGains)}</strong>
            </span>
            <span>·</span>
            <span>
              Perdas: <strong className="text-rose-400 font-mono tabular-nums">{formatBRL(totalLosses)}</strong>
            </span>
          </div>
        </div>

        <div className="bg-[#0e1422]/95 border border-white/[0.07] rounded-2xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Sequências (Streaks)</span>
            <span className="material-symbols-outlined text-[18px] text-blue-400">
              local_fire_department
            </span>
          </div>
          <div className="text-2xl font-mono font-bold mt-2 tabular-nums flex items-center gap-2">
            <span className="text-emerald-400">{maxWinStreak}G</span>
            <span className="text-slate-600 font-normal">/</span>
            <span className="text-rose-500">{maxLossStreak}R</span>
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Momento atual:{' '}
            <span
              className={`font-semibold ${
                currentStreakText.startsWith('+')
                  ? 'text-emerald-400'
                  : currentStreakText.startsWith('-')
                  ? 'text-rose-400'
                  : 'text-slate-200'
              }`}
            >
              {currentStreakText}
            </span>
          </div>
        </div>

        <div className="bg-[#0e1422]/95 border border-white/[0.07] rounded-2xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Média Líquida por Aposta</span>
            <span className="material-symbols-outlined text-[18px] text-indigo-400">analytics</span>
          </div>
          <div
            className={`text-2xl font-mono font-bold mt-2 tabular-nums ${
              settledBets.length === 0
                ? 'text-slate-200'
                : avgNet >= 0
                ? 'text-emerald-400'
                : 'text-rose-400'
            }`}
          >
            {settledBets.length > 0
              ? `${avgNet >= 0 ? '+' : ''}${formatBRL(avgNet)}`
              : 'R$ 0,00'}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Baseado em {settledBets.length} {settledBets.length === 1 ? 'aposta finalizada' : 'apostas finalizadas'}
          </div>
        </div>
      </div>

      {/* Sports Breakdown (Mobile Cards + Desktop Table) */}
      <div className="bg-[#0e1422]/95 border border-white/[0.07] rounded-2xl p-4 sm:p-6 shadow-sm flex flex-col gap-4">
        <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
          Desempenho por Modalidade
        </h3>

        {/* Mobile Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 md:hidden">
          {sportStats.map((item) => (
            <div
              key={item.sport}
              className="bg-[#080c14] border border-white/[0.06] rounded-xl p-3.5 flex flex-col gap-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">{item.sport}</span>
                <span className="text-[11px] font-mono text-slate-400 tabular-nums">
                  {item.count} {item.count === 1 ? 'aposta' : 'apostas'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/[0.05] text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 block">Acerto</span>
                  <span className="font-mono font-semibold text-slate-200 tabular-nums">
                    {item.winRate.toFixed(1)}%
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">ROI</span>
                  <span
                    className={`font-mono font-semibold tabular-nums ${
                      item.roi >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {item.roi >= 0 ? '+' : ''}
                    {item.roi.toFixed(1)}%
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 block">Lucro</span>
                  <span
                    className={`font-mono font-bold tabular-nums ${
                      item.pl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {item.pl >= 0 ? '+' : ''}
                    {formatBRL(item.pl)}
                  </span>
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
                <th className="py-3 px-3.5">Esporte</th>
                <th className="py-3 px-3.5 text-center">Apostas</th>
                <th className="py-3 px-3.5 text-right">Volume</th>
                <th className="py-3 px-3.5 text-center">Taxa de Acerto</th>
                <th className="py-3 px-3.5 text-right">Lucro / P&L</th>
                <th className="py-3 px-3.5 text-right">ROI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {sportStats.map((item) => (
                <tr key={item.sport} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 px-3.5 font-medium text-slate-200">{item.sport}</td>
                  <td className="py-3 px-3.5 text-center font-mono text-slate-400 tabular-nums">
                    {item.count}
                  </td>
                  <td className="py-3 px-3.5 text-right font-mono text-slate-300 tabular-nums">
                    {formatBRL(item.volume)}
                  </td>
                  <td className="py-3 px-3.5 text-center font-mono font-medium text-slate-200 tabular-nums">
                    {item.winRate.toFixed(1)}%
                  </td>
                  <td
                    className={`py-3 px-3.5 text-right font-mono font-bold tabular-nums ${
                      item.pl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {item.pl >= 0 ? '+' : ''}
                    {formatBRL(item.pl)}
                  </td>
                  <td
                    className={`py-3 px-3.5 text-right font-mono font-bold tabular-nums ${
                      item.roi >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {item.roi >= 0 ? '+' : ''}
                    {item.roi.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Market Category Breakdown */}
      <div className="bg-[#0e1422]/95 border border-white/[0.07] rounded-2xl p-4 sm:p-6 shadow-sm flex flex-col gap-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
            Desempenho por Categoria de Mercado
          </h3>
          <span className="text-xs text-slate-400">{marketStats.length} categorias</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {marketStats.map((item) => (
            <div
              key={item.category}
              className="bg-[#080c14] border border-white/[0.06] rounded-xl p-3.5 flex flex-col gap-2"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-white truncate">{item.category}</span>
                <span className="text-[11px] font-mono text-slate-400 tabular-nums shrink-0">
                  {item.count}
                </span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-white/[0.05] text-xs">
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-500">Acerto / ROI</span>
                  <span className="font-mono text-slate-200 tabular-nums">
                    {item.winRate.toFixed(0)}% ·{' '}
                    <span className={item.roi >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                      {item.roi >= 0 ? '+' : ''}
                      {item.roi.toFixed(1)}%
                    </span>
                  </span>
                </div>
                <span
                  className={`font-mono font-bold tabular-nums ${
                    item.pl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {item.pl >= 0 ? '+' : ''}
                  {formatBRL(item.pl)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bookmakers Breakdown */}
      <div className="bg-[#0e1422]/95 border border-white/[0.07] rounded-2xl p-4 sm:p-6 shadow-sm flex flex-col gap-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
            Desempenho por Casa de Apostas
          </h3>
          <span className="text-xs text-slate-400">{bookmakerStats.length} casas</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {bookmakerStats.map((item) => (
            <div
              key={item.bookmaker}
              className="bg-[#080c14] border border-white/[0.06] rounded-xl p-3.5 flex flex-col gap-2"
            >
              <div className="flex items-center justify-between gap-2">
                <BookmakerBadge
                  bookmaker={item.bookmaker}
                  size="md"
                  className="text-xs font-bold text-white"
                />
                <span className="text-[11px] font-mono text-slate-400 tabular-nums shrink-0">
                  {item.count} {item.count === 1 ? 'aposta' : 'apostas'}
                </span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-white/[0.05] text-xs">
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-500">Acerto / ROI</span>
                  <span className="font-mono text-slate-200 tabular-nums">
                    {item.winRate.toFixed(0)}% ·{' '}
                    <span className={item.roi >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                      {item.roi >= 0 ? '+' : ''}
                      {item.roi.toFixed(1)}%
                    </span>
                  </span>
                </div>
                <span
                  className={`font-mono font-bold tabular-nums ${
                    item.pl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {item.pl >= 0 ? '+' : ''}
                  {formatBRL(item.pl)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Real Odds Buckets */}
      <div className="bg-[#0e1422]/95 border border-white/[0.07] rounded-2xl p-4 sm:p-6 shadow-sm flex flex-col gap-4">
        <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
          Distribuição por Faixa de Odds
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {oddsBuckets.map((bucket) => (
            <div
              key={bucket.label}
              className="p-4 bg-[#080c14] border border-white/[0.06] rounded-xl flex flex-col gap-2.5"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-xs text-slate-200">{bucket.label}</span>
                <span className={`text-xs font-mono font-semibold tabular-nums ${bucket.textColor}`}>
                  {bucket.winRate.toFixed(0)}% Acerto
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${bucket.barColor}`}
                  style={{ width: `${Math.min(100, Math.max(0, bucket.winRate))}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono tabular-nums">
                <span>{bucket.count} apostas</span>
                <span className={bucket.roi >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                  ROI: {bucket.roi >= 0 ? '+' : ''}
                  {bucket.roi.toFixed(1)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
