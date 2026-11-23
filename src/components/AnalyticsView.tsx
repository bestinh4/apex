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
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-6 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_1px_2px_rgba(15,23,42,0.04)]">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
            Estatísticas de Desempenho
          </h2>
          <p className="text-xs text-slate-500">
            Indicadores isolados por origem de saldo (Dinheiro Real vs Promocional)
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setScope('Saldo Real')}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                scope === 'Saldo Real'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
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
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Promocional (Freebet / Rollover)
            </button>
          </div>

          <button
            type="button"
            onClick={handleExport}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 active:scale-95 shadow-md shadow-blue-600/20 whitespace-nowrap"
          >
            <span className="material-symbols-outlined text-[16px]">download</span>
            <span>Exportar Relatório</span>
          </button>
        </div>
      </div>

      {/* Turnover Policy Notice */}
      <div className="px-4 py-3 rounded-xl bg-blue-50 border border-blue-200 text-[11px] text-blue-900 flex items-start gap-2">
        <span className="material-symbols-outlined text-[16px] text-blue-600 shrink-0 mt-0.5">
          info
        </span>
        <span>
          <strong className="text-blue-950">Política de Turnover & ROI:</strong> {TURNOVER_POLICY_DOC}
        </span>
      </div>

      {/* 3 Key Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">
              {scope === 'Saldo Real'
                ? 'Fator de Lucro (Real)'
                : 'ROI Promocional & Extração'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm shadow-emerald-600/20">
              <span className="material-symbols-outlined text-[18px]">query_stats</span>
            </div>
          </div>
          {scope === 'Saldo Real' ? (
            <>
              <div className="text-2xl font-mono font-bold text-slate-900 mt-2 tabular-nums">
                {analytics.profitFactor}
              </div>
              <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5 flex-wrap">
                <span>
                  Ganhos:{' '}
                  <strong className="text-emerald-600 font-mono tabular-nums">
                    {formatBRL(analytics.totalGains)}
                  </strong>
                </span>
                <span>·</span>
                <span>
                  Perdas:{' '}
                  <strong className="text-rose-600 font-mono tabular-nums">
                    {formatBRL(analytics.totalLosses)}
                  </strong>
                </span>
              </div>
            </>
          ) : (
            <>
              <div
                className={`text-2xl font-mono font-bold mt-2 tabular-nums ${
                  promoRoi >= 0 ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {promoRoi >= 0 ? '+' : ''}
                {promoRoi.toFixed(1)}%
              </div>
              <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5 flex-wrap">
                <span>
                  Extração FB:{' '}
                  <strong className="text-indigo-600 font-mono tabular-nums">
                    {freebetExtractionRate.toFixed(1)}%
                  </strong>
                </span>
                <span>·</span>
                <span>
                  Rollover ROI:{' '}
                  <strong className="text-slate-800 font-mono tabular-nums">
                    {rolloverRoi >= 0 ? '+' : ''}
                    {rolloverRoi.toFixed(1)}%
                  </strong>
                </span>
              </div>
            </>
          )}
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">
              {scope === 'Saldo Real' ? 'Sequências (Saldo Real)' : 'Saldo & Volume Promo'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm shadow-blue-600/20">
              <span className="material-symbols-outlined text-[18px]">
                {scope === 'Saldo Real' ? 'local_fire_department' : 'redeem'}
              </span>
            </div>
          </div>
          {scope === 'Saldo Real' ? (
            <>
              <div className="text-2xl font-mono font-bold mt-2 tabular-nums flex items-center gap-2">
                <span className="text-emerald-600">{maxWinStreak}G</span>
                <span className="text-slate-300 font-normal">/</span>
                <span className="text-rose-600">{maxLossStreak}R</span>
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Momento atual:{' '}
                <span
                  className={`font-semibold ${
                    currentStreakText.startsWith('+')
                      ? 'text-emerald-600'
                      : currentStreakText.startsWith('-')
                      ? 'text-rose-600'
                      : 'text-slate-700'
                  }`}
                >
                  {currentStreakText}
                </span>
              </div>
            </>
          ) : (
            <>
              <div className="text-2xl font-mono font-bold text-indigo-600 mt-2 tabular-nums">
                {formatBRL(promoBalance)}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Giro Promo: <strong className="text-slate-800 font-mono">{formatBRL(promoTurnover)}</strong> · Lucro:{' '}
                <strong className="text-emerald-600 font-mono">
                  {promoBetProfit >= 0 ? '+' : ''}
                  {formatBRL(promoBetProfit)}
                </strong>
              </div>
            </>
          )}
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">
              Média Líquida ({scope === 'Saldo Real' ? 'Real' : 'Promo'})
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm shadow-indigo-600/20">
              <span className="material-symbols-outlined text-[18px]">analytics</span>
            </div>
          </div>
          <div
            className={`text-2xl font-mono font-bold mt-2 tabular-nums ${
              analytics.settledBets.length === 0
                ? 'text-slate-800'
                : analytics.avgNet >= 0
                ? 'text-emerald-600'
                : 'text-rose-600'
            }`}
          >
            {analytics.settledBets.length > 0
              ? `${analytics.avgNet >= 0 ? '+' : ''}${formatBRL(analytics.avgNet)}`
              : 'R$ 0,00'}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Baseado em {analytics.settledBets.length}{' '}
            {analytics.settledBets.length === 1 ? 'aposta finalizada' : 'apostas finalizadas'} · ROI{' '}
            <strong className={analytics.totalRoi >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
              {analytics.totalRoi >= 0 ? '+' : ''}
              {analytics.totalRoi.toFixed(1)}%
            </strong>
          </div>
        </div>
      </div>

      {/* Sports Breakdown (Mobile Cards + Desktop Table) */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-6 shadow-sm flex flex-col gap-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
            Desempenho por Modalidade ({scope === 'Saldo Real' ? 'Saldo Real' : 'Promocionais'})
          </h3>
          <span className="text-xs font-mono text-slate-500 font-medium">
            Giro: {formatBRL(analytics.totalVolume)}
          </span>
        </div>

        {/* Mobile Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 md:hidden">
          {analytics.sportStats.map((item) => (
            <div
              key={item.key}
              className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-col gap-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">{item.key}</span>
                <span className="text-[11px] font-mono text-slate-500 tabular-nums">
                  {item.count} {item.count === 1 ? 'aposta' : 'apostas'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200 text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 block">Acerto</span>
                  <span className="font-mono font-semibold text-slate-800 tabular-nums">
                    {item.winRate.toFixed(1)}%
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">ROI</span>
                  <span
                    className={`font-mono font-semibold tabular-nums ${
                      item.roi >= 0 ? 'text-emerald-600' : 'text-rose-600'
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
                      item.pl >= 0 ? 'text-emerald-600' : 'text-rose-600'
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
        <div className="hidden md:block w-full overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 text-[11px] font-bold">
                <th className="py-3 px-3.5">Esporte</th>
                <th className="py-3 px-3.5 text-center">Apostas</th>
                <th className="py-3 px-3.5 text-right">Volume Efetivo</th>
                <th className="py-3 px-3.5 text-center">Taxa de Acerto</th>
                <th className="py-3 px-3.5 text-right">Lucro / P&L</th>
                <th className="py-3 px-3.5 text-right">ROI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {analytics.sportStats.map((item) => (
                <tr key={item.key} className="hover:bg-slate-50/90 transition-colors">
                  <td className="py-3 px-3.5 font-semibold text-slate-900">{item.key}</td>
                  <td className="py-3 px-3.5 text-center font-mono text-slate-600 tabular-nums">
                    {item.count}
                  </td>
                  <td className="py-3 px-3.5 text-right font-mono text-slate-700 tabular-nums">
                    {formatBRL(item.volume)}
                  </td>
                  <td className="py-3 px-3.5 text-center font-mono font-semibold text-slate-800 tabular-nums">
                    {item.winRate.toFixed(1)}%
                  </td>
                  <td
                    className={`py-3 px-3.5 text-right font-mono font-bold tabular-nums ${
                      item.pl >= 0 ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {item.pl >= 0 ? '+' : ''}
                    {formatBRL(item.pl)}
                  </td>
                  <td
                    className={`py-3 px-3.5 text-right font-mono font-bold tabular-nums ${
                      item.roi >= 0 ? 'text-emerald-600' : 'text-rose-600'
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
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-6 shadow-sm flex flex-col gap-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
            Desempenho por Categoria de Mercado
          </h3>
          <span className="text-xs text-slate-500 font-medium">{analytics.marketStats.length} categorias</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {analytics.marketStats.map((item) => (
            <div
              key={item.key}
              className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-col gap-2"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-900 truncate">{item.key}</span>
                <span className="text-[11px] font-mono text-slate-500 font-semibold tabular-nums shrink-0">
                  {item.count}
                </span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-xs">
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-500">Acerto / ROI</span>
                  <span className="font-mono text-slate-800 font-medium tabular-nums">
                    {item.winRate.toFixed(0)}% ·{' '}
                    <span className={`font-semibold ${item.roi >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {item.roi >= 0 ? '+' : ''}
                      {item.roi.toFixed(1)}%
                    </span>
                  </span>
                </div>
                <span
                  className={`font-mono font-bold tabular-nums ${
                    item.pl >= 0 ? 'text-emerald-600' : 'text-rose-600'
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
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-6 shadow-sm flex flex-col gap-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
            Desempenho por Casa de Apostas
          </h3>
          <span className="text-xs text-slate-500 font-medium">{analytics.bookmakerStats.length} casas</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {analytics.bookmakerStats.map((item) => (
            <div
              key={item.key}
              className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-col gap-2"
            >
              <div className="flex items-center justify-between gap-2">
                <BookmakerBadge
                  bookmaker={item.key}
                  size="md"
                  className="text-xs font-bold text-slate-900"
                />
                <span className="text-[11px] font-mono text-slate-500 tabular-nums shrink-0">
                  {item.count} {item.count === 1 ? 'aposta' : 'apostas'}
                </span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-xs">
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-500">Acerto / ROI</span>
                  <span className="font-mono text-slate-800 font-medium tabular-nums">
                    {item.winRate.toFixed(0)}% ·{' '}
                    <span className={`font-semibold ${item.roi >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {item.roi >= 0 ? '+' : ''}
                      {item.roi.toFixed(1)}%
                    </span>
                  </span>
                </div>
                <span
                  className={`font-mono font-bold tabular-nums ${
                    item.pl >= 0 ? 'text-emerald-600' : 'text-rose-600'
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
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-6 shadow-sm flex flex-col gap-4">
        <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
          Distribuição por Faixa de Odds ({scope === 'Saldo Real' ? 'Saldo Real' : 'Promocionais'})
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {analytics.oddsBuckets.map((bucket) => (
            <div
              key={bucket.label}
              className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col gap-2.5"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-xs text-slate-800">{bucket.label}</span>
                <span className={`text-xs font-mono font-bold tabular-nums ${bucket.textColor}`}>
                  {bucket.winRate.toFixed(0)}% Acerto
                </span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-slate-200 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${bucket.barColor}`}
                  style={{ width: `${Math.min(100, Math.max(0, bucket.winRate))}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono tabular-nums">
                <span>{bucket.count} apostas</span>
                <span className={`font-semibold ${bucket.roi >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
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
