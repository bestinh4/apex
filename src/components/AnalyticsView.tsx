import React, { useState, useMemo } from 'react';
import { useBankroll } from '../context/BankrollContext';
import { BookmakerBadge } from './BookmakerLogo';
import {
  AnalyticsScope,
  TURNOVER_POLICY_DOC,
  computeScopedAnalytics
} from '../lib/financialEngine';

interface AnalyticsViewProps {
  onSuccessToast?: (msg: string) => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ onSuccessToast }) => {
  const {
    bets,
    maxWinStreak,
    maxLossStreak,
    currentStreakText,
    promoBalance,
    freebetExtractionRate,
    rolloverRoi,
    promoRoi,
    promoTurnover,
    promoBetProfit
  } = useBankroll();

  const [scope, setScope] = useState<AnalyticsScope>('Saldo Real');

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const analytics = useMemo(() => computeScopedAnalytics(bets, scope), [bets, scope]);

  const handleExport = () => {
    let csv = 'Escopo,Modalidade,Apostas,Volume_Efetivo_BRL,Taxa_Acerto_Pct,Lucro_BRL,ROI_Pct\n';
    analytics.sportStats.forEach((s) => {
      csv += `"${scope}","${s.key}",${s.count},${s.volume.toFixed(2)},${s.winRate.toFixed(
        1
      )},${s.pl.toFixed(2)},${s.roi.toFixed(1)}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `estatisticas_${scope === 'Saldo Real' ? 'real' : 'promo'}_${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    link.click();
    onSuccessToast?.('Relatório de estatísticas baixado com sucesso.');
  };

  return (
    <div className="w-full flex flex-col gap-4 sm:gap-6 animate-in fade-in duration-200">
      {/* Header + Scope Switch */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-[#0e1422]/95 border border-white/[0.07] rounded-2xl p-4 sm:p-6 shadow-sm">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
            Estatísticas de Desempenho
          </h2>
          <p className="text-xs text-slate-400">
            Indicadores isolados por origem de saldo (Dinheiro Real vs Promocional)
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="flex items-center bg-[#080c14] p-1 rounded-xl border border-white/[0.08]">
            <button
              type="button"
              onClick={() => setScope('Saldo Real')}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                scope === 'Saldo Real'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Dinheiro Real
            </button>
            <button
              type="button"
              onClick={() => setScope('Promocional')}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                scope === 'Promocional'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Promocional (Freebet / Rollover)
            </button>
          </div>

          <button
            type="button"
            onClick={handleExport}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 active:scale-95 shadow-md shadow-blue-500/20 whitespace-nowrap"
          >
            <span className="material-symbols-outlined text-[16px]">download</span>
            <span>Exportar Relatório</span>
          </button>
        </div>
      </div>

      {/* Turnover Policy Notice */}
      <div className="px-4 py-2.5 rounded-xl bg-blue-500/[0.06] border border-blue-500/20 text-[11px] text-slate-300 flex items-start gap-2">
        <span className="material-symbols-outlined text-[16px] text-blue-400 shrink-0 mt-0.5">
          info
        </span>
        <span>
          <strong className="text-white">Política de Turnover & ROI:</strong> {TURNOVER_POLICY_DOC}
        </span>
      </div>

      {/* 3 Key Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-[#0e1422]/95 border border-white/[0.07] rounded-2xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">
              {scope === 'Saldo Real'
                ? 'Fator de Lucro (Real)'
                : 'ROI Promocional & Extração'}
            </span>
            <span className="material-symbols-outlined text-[18px] text-emerald-400">query_stats</span>
          </div>
          {scope === 'Saldo Real' ? (
            <>
              <div className="text-2xl font-mono font-bold text-white mt-2 tabular-nums">
                {analytics.profitFactor}
              </div>
              <div className="text-xs text-slate-400 mt-1 flex items-center gap-1.5 flex-wrap">
                <span>
                  Ganhos:{' '}
                  <strong className="text-emerald-400 font-mono tabular-nums">
                    {formatBRL(analytics.totalGains)}
                  </strong>
                </span>
                <span>·</span>
                <span>
                  Perdas:{' '}
                  <strong className="text-rose-400 font-mono tabular-nums">
                    {formatBRL(analytics.totalLosses)}
                  </strong>
                </span>
              </div>
            </>
          ) : (
            <>
              <div
                className={`text-2xl font-mono font-bold mt-2 tabular-nums ${
                  promoRoi >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {promoRoi >= 0 ? '+' : ''}
                {promoRoi.toFixed(1)}%
              </div>
              <div className="text-xs text-slate-400 mt-1 flex items-center gap-1.5 flex-wrap">
                <span>
                  Extração FB:{' '}
                  <strong className="text-indigo-300 font-mono tabular-nums">
                    {freebetExtractionRate.toFixed(1)}%
                  </strong>
                </span>
                <span>·</span>
                <span>
                  Rollover ROI:{' '}
                  <strong className="text-slate-200 font-mono tabular-nums">
                    {rolloverRoi >= 0 ? '+' : ''}
                    {rolloverRoi.toFixed(1)}%
                  </strong>
                </span>
              </div>
            </>
          )}
        </div>

        <div className="bg-[#0e1422]/95 border border-white/[0.07] rounded-2xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">
              {scope === 'Saldo Real' ? 'Sequências (Saldo Real)' : 'Saldo & Volume Promo'}
            </span>
            <span className="material-symbols-outlined text-[18px] text-blue-400">
              {scope === 'Saldo Real' ? 'local_fire_department' : 'redeem'}
            </span>
          </div>
          {scope === 'Saldo Real' ? (
            <>
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
            </>
          ) : (
            <>
              <div className="text-2xl font-mono font-bold text-indigo-300 mt-2 tabular-nums">
                {formatBRL(promoBalance)}
              </div>
              <div className="text-xs text-slate-400 mt-1">
                Giro Promo: <strong className="text-slate-200 font-mono">{formatBRL(promoTurnover)}</strong> · Lucro:{' '}
                <strong className="text-emerald-400 font-mono">
                  {promoBetProfit >= 0 ? '+' : ''}
                  {formatBRL(promoBetProfit)}
                </strong>
              </div>
            </>
          )}
        </div>

        <div className="bg-[#0e1422]/95 border border-white/[0.07] rounded-2xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">
              Média Líquida ({scope === 'Saldo Real' ? 'Real' : 'Promo'})
            </span>
            <span className="material-symbols-outlined text-[18px] text-indigo-400">analytics</span>
          </div>
          <div
            className={`text-2xl font-mono font-bold mt-2 tabular-nums ${
              analytics.settledBets.length === 0
                ? 'text-slate-200'
                : analytics.avgNet >= 0
                ? 'text-emerald-400'
                : 'text-rose-400'
            }`}
          >
            {analytics.settledBets.length > 0
              ? `${analytics.avgNet >= 0 ? '+' : ''}${formatBRL(analytics.avgNet)}`
              : 'R$ 0,00'}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Baseado em {analytics.settledBets.length}{' '}
            {analytics.settledBets.length === 1 ? 'aposta finalizada' : 'apostas finalizadas'} · ROI{' '}
            <strong className={analytics.totalRoi >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
              {analytics.totalRoi >= 0 ? '+' : ''}
              {analytics.totalRoi.toFixed(1)}%
            </strong>
          </div>
        </div>
      </div>

      {/* Sports Breakdown (Mobile Cards + Desktop Table) */}
      <div className="bg-[#0e1422]/95 border border-white/[0.07] rounded-2xl p-4 sm:p-6 shadow-sm flex flex-col gap-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
            Desempenho por Modalidade ({scope === 'Saldo Real' ? 'Saldo Real' : 'Promocionais'})
          </h3>
          <span className="text-xs font-mono text-slate-400">
            Giro: {formatBRL(analytics.totalVolume)}
          </span>
        </div>

        {/* Mobile Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 md:hidden">
          {analytics.sportStats.map((item) => (
            <div
              key={item.key}
              className="bg-[#080c14] border border-white/[0.06] rounded-xl p-3.5 flex flex-col gap-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">{item.key}</span>
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
                <th className="py-3 px-3.5 text-right">Volume Efetivo</th>
                <th className="py-3 px-3.5 text-center">Taxa de Acerto</th>
                <th className="py-3 px-3.5 text-right">Lucro / P&L</th>
                <th className="py-3 px-3.5 text-right">ROI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {analytics.sportStats.map((item) => (
                <tr key={item.key} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 px-3.5 font-medium text-slate-200">{item.key}</td>
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
          <span className="text-xs text-slate-400">{analytics.marketStats.length} categorias</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {analytics.marketStats.map((item) => (
            <div
              key={item.key}
              className="bg-[#080c14] border border-white/[0.06] rounded-xl p-3.5 flex flex-col gap-2"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-white truncate">{item.key}</span>
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
          <span className="text-xs text-slate-400">{analytics.bookmakerStats.length} casas</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {analytics.bookmakerStats.map((item) => (
            <div
              key={item.key}
              className="bg-[#080c14] border border-white/[0.06] rounded-xl p-3.5 flex flex-col gap-2"
            >
              <div className="flex items-center justify-between gap-2">
                <BookmakerBadge
                  bookmaker={item.key}
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

      {/* Odds Buckets */}
      <div className="bg-[#0e1422]/95 border border-white/[0.07] rounded-2xl p-4 sm:p-6 shadow-sm flex flex-col gap-4">
        <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
          Distribuição por Faixa de Odds ({scope === 'Saldo Real' ? 'Saldo Real' : 'Promocionais'})
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {analytics.oddsBuckets.map((bucket) => (
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
