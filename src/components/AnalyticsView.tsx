import React, { useState, useMemo } from 'react';
import { useBankroll } from '../context/BankrollContext';
import { BookmakerBadge } from './BookmakerLogo';
import {
  AnalyticsScope,
  TURNOVER_POLICY_DOC,
  computeScopedAnalytics
} from '../lib/financialEngine';


const toISODate = (value: string): string | null => {
  const raw = String(value || '').trim();
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const br = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  return null;
};

const localISODate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

type PeriodPreset = 'ALL' | 'TODAY' | '7D' | '30D' | 'MONTH' | 'YEAR' | 'CUSTOM';

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
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const applyPeriodPreset = (preset: PeriodPreset) => {
    const today = new Date();
    const end = localISODate(today);
    const startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    if (preset === 'ALL') {
      setDateFrom('');
      setDateTo('');
    } else if (preset === 'TODAY') {
      setDateFrom(end);
      setDateTo(end);
    } else if (preset === '7D' || preset === '30D') {
      startDate.setDate(startDate.getDate() - (preset === '7D' ? 6 : 29));
      setDateFrom(localISODate(startDate));
      setDateTo(end);
    } else if (preset === 'MONTH') {
      setDateFrom(localISODate(new Date(today.getFullYear(), today.getMonth(), 1)));
      setDateTo(end);
    } else if (preset === 'YEAR') {
      setDateFrom(localISODate(new Date(today.getFullYear(), 0, 1)));
      setDateTo(end);
    }
    setPeriodPreset(preset);
  };

  const periodBets = useMemo(() => bets.filter((bet) => {
    const betDate = toISODate(bet.date);
    if (!betDate) return !dateFrom && !dateTo;
    if (dateFrom && betDate < dateFrom) return false;
    if (dateTo && betDate > dateTo) return false;
    return true;
  }), [bets, dateFrom, dateTo]);

  const analytics = useMemo(() => computeScopedAnalytics(periodBets, scope), [periodBets, scope]);
  const betProfitUnits = (bet: (typeof analytics.settledBets)[number]) => {
    const stake = Number(bet.stake);
    const units = Number(bet.units);
    if (!Number.isFinite(stake) || stake <= 0 || !Number.isFinite(units)) return 0;
    return (Number(bet.pl || 0) / stake) * units;
  };
  const profitUnits = analytics.settledBets.reduce((sum, bet) => sum + betProfitUnits(bet), 0);
  const gainUnits = analytics.settledBets.filter((bet) => bet.pl > 0).reduce((sum, bet) => sum + betProfitUnits(bet), 0);
  const lossUnits = Math.abs(analytics.settledBets.filter((bet) => bet.pl < 0).reduce((sum, bet) => sum + betProfitUnits(bet), 0));
  const undatedCount = bets.filter((bet) => !toISODate(bet.date)).length;

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
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white border border-slate-300/80 ring-1 ring-slate-900/[0.03] rounded-2xl p-4 sm:p-6 shadow-[0_1px_2px_rgba(15,23,42,0.05),0_4px_14px_-2px_rgba(15,23,42,0.06)]">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
            Estatísticas de Desempenho
          </h2>
          <p className="text-xs text-slate-600">
            Indicadores isolados por origem de saldo (Dinheiro Real vs Promocional)
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-300/80">
            <button
              type="button"
              onClick={() => setScope('Saldo Real')}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                scope === 'Saldo Real'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-700 hover:text-slate-900'
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
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              Promocional (Freebet / Rollover)
            </button>
          </div>

          <button
            type="button"
            onClick={handleExport}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 active:scale-95 shadow-md shadow-blue-600/25 whitespace-nowrap"
          >
            <span className="material-symbols-outlined text-[16px]">download</span>
            <span>Exportar Relatório</span>
          </button>
        </div>
      </div>

      <section className="bg-white border border-slate-300/80 rounded-2xl p-4 sm:p-5 flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Período da análise</h3>
            <p className="text-[11px] text-slate-600">Todos os indicadores e rankings abaixo respeitam este intervalo.</p>
          </div>
          <span className="text-[11px] font-semibold text-slate-700">{analytics.scopedBets.length} apostas no período</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {([
            ['ALL', 'Todo o histórico'], ['TODAY', 'Hoje'], ['7D', 'Últimos 7 dias'],
            ['30D', 'Últimos 30 dias'], ['MONTH', 'Este mês'], ['YEAR', 'Este ano']
          ] as [PeriodPreset, string][]).map(([key, label]) => (
            <button key={key} type="button" onClick={() => applyPeriodPreset(key)}
              className={`px-3 py-2 rounded-lg text-[11px] font-semibold border transition-colors ${periodPreset === key ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-blue-50'}`}>
              {label}
            </button>
          ))}
          <button type="button" onClick={() => setPeriodPreset('CUSTOM')}
            className={`px-3 py-2 rounded-lg text-[11px] font-semibold border ${periodPreset === 'CUSTOM' ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 text-slate-700 border-slate-300'}`}>
            Personalizado
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
          <label className="text-[11px] font-semibold text-slate-600 flex flex-col gap-1">De
            <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPeriodPreset('CUSTOM'); }} max={dateTo || undefined} className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900" />
          </label>
          <label className="text-[11px] font-semibold text-slate-600 flex flex-col gap-1">Até
            <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPeriodPreset('CUSTOM'); }} min={dateFrom || undefined} className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900" />
          </label>
        </div>
        {undatedCount > 0 && <p className="text-[10px] text-amber-700">{undatedCount} aposta(s) sem data identificável ficam fora dos períodos definidos. No histórico completo, elas continuam incluídas.</p>}
      </section>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-300/80 rounded-2xl p-4">
          <p className="text-[11px] font-semibold text-slate-600">Ganhos no período</p>
          <p className="text-lg sm:text-xl font-mono font-bold text-emerald-700 mt-1">{formatBRL(analytics.totalGains)}</p>
          <p className="text-[10px] text-slate-500 mt-1">+{gainUnits.toFixed(2)}u</p>
        </div>
        <div className="bg-white border border-slate-300/80 rounded-2xl p-4">
          <p className="text-[11px] font-semibold text-slate-600">Perdas no período</p>
          <p className="text-lg sm:text-xl font-mono font-bold text-rose-700 mt-1">{formatBRL(analytics.totalLosses)}</p>
          <p className="text-[10px] text-slate-500 mt-1">-{lossUnits.toFixed(2)}u</p>
        </div>
        <div className="bg-white border border-slate-300/80 rounded-2xl p-4">
          <p className="text-[11px] font-semibold text-slate-600">Lucro líquido</p>
          <p className={`text-lg sm:text-xl font-mono font-bold mt-1 ${analytics.totalPl >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{analytics.totalPl >= 0 ? '+' : ''}{formatBRL(analytics.totalPl)}</p>
          <p className="text-[10px] text-slate-500 mt-1">{profitUnits >= 0 ? '+' : ''}{profitUnits.toFixed(2)}u · unidade histórica de cada aposta</p>
        </div>
        <div className="bg-white border border-slate-300/80 rounded-2xl p-4">
          <p className="text-[11px] font-semibold text-slate-600">Volume / ROI</p>
          <p className="text-lg sm:text-xl font-mono font-bold text-slate-900 mt-1">{formatBRL(analytics.totalVolume)}</p>
          <p className={`text-[10px] font-semibold mt-1 ${analytics.totalRoi >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>ROI {analytics.totalRoi >= 0 ? '+' : ''}{analytics.totalRoi.toFixed(2)}%</p>
        </div>
      </section>

      {/* Turnover Policy Notice */}
      <div className="px-4 py-3 rounded-xl bg-blue-50 border border-blue-300 text-[11px] text-blue-950 flex items-start gap-2 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
        <span className="material-symbols-outlined text-[16px] text-blue-700 shrink-0 mt-0.5">
          info
        </span>
        <span>
          <strong className="text-blue-950">Política de Turnover & ROI:</strong> {TURNOVER_POLICY_DOC}
        </span>
      </div>

      {/* 3 Key Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-white border border-slate-300/80 ring-1 ring-slate-900/[0.03] rounded-2xl p-4 sm:p-5 shadow-[0_1px_2px_rgba(15,23,42,0.05),0_4px_14px_-2px_rgba(15,23,42,0.06)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">
              {scope === 'Saldo Real'
                ? 'Fator de Lucro (Real)'
                : 'ROI Promocional & Extração'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-700 text-white flex items-center justify-center shadow-sm shadow-emerald-700/25">
              <span className="material-symbols-outlined text-[18px]">query_stats</span>
            </div>
          </div>
          {scope === 'Saldo Real' ? (
            <>
              <div className="text-2xl font-mono font-bold text-slate-900 mt-2 tabular-nums">
                {analytics.profitFactor}
              </div>
              <div className="text-xs text-slate-600 mt-1 flex items-center gap-1.5 flex-wrap">
                <span>
                  Ganhos:{' '}
                  <strong className="text-emerald-700 font-mono tabular-nums">
                    {formatBRL(analytics.totalGains)}
                  </strong>
                </span>
                <span>·</span>
                <span>
                  Perdas:{' '}
                  <strong className="text-rose-700 font-mono tabular-nums">
                    {formatBRL(analytics.totalLosses)}
                  </strong>
                </span>
              </div>
            </>
          ) : (
            <>
              <div
                className={`text-2xl font-mono font-bold mt-2 tabular-nums ${
                  promoRoi >= 0 ? 'text-emerald-700' : 'text-rose-700'
                }`}
              >
                {promoRoi >= 0 ? '+' : ''}
                {promoRoi.toFixed(1)}%
              </div>
              <div className="text-xs text-slate-600 mt-1 flex items-center gap-1.5 flex-wrap">
                <span>
                  Extração FB:{' '}
                  <strong className="text-indigo-700 font-mono tabular-nums">
                    {freebetExtractionRate.toFixed(1)}%
                  </strong>
                </span>
                <span>·</span>
                <span>
                  Rollover ROI:{' '}
                  <strong className="text-slate-900 font-mono tabular-nums">
                    {rolloverRoi >= 0 ? '+' : ''}
                    {rolloverRoi.toFixed(1)}%
                  </strong>
                </span>
              </div>
            </>
          )}
        </div>

        <div className="bg-white border border-slate-300/80 ring-1 ring-slate-900/[0.03] rounded-2xl p-4 sm:p-5 shadow-[0_1px_2px_rgba(15,23,42,0.05),0_4px_14px_-2px_rgba(15,23,42,0.06)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">
              {scope === 'Saldo Real' ? 'Sequências (Saldo Real)' : 'Saldo & Volume Promo'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm shadow-blue-600/25">
              <span className="material-symbols-outlined text-[18px]">
                {scope === 'Saldo Real' ? 'local_fire_department' : 'redeem'}
              </span>
            </div>
          </div>
          {scope === 'Saldo Real' ? (
            <>
              <div className="text-2xl font-mono font-bold mt-2 tabular-nums flex items-center gap-2">
                <span className="text-emerald-700">{maxWinStreak}G</span>
                <span className="text-slate-500 font-normal">/</span>
                <span className="text-rose-700">{maxLossStreak}R</span>
              </div>
              <div className="text-xs text-slate-600 mt-1">
                Momento atual:{' '}
                <span
                  className={`font-semibold ${
                    currentStreakText.startsWith('+')
                      ? 'text-emerald-700'
                      : currentStreakText.startsWith('-')
                      ? 'text-rose-700'
                      : 'text-slate-800'
                  }`}
                >
                  {currentStreakText}
                </span>
              </div>
            </>
          ) : (
            <>
              <div className="text-2xl font-mono font-bold text-indigo-700 mt-2 tabular-nums">
                {formatBRL(promoBalance)}
              </div>
              <div className="text-xs text-slate-600 mt-1">
                Giro Promo: <strong className="text-slate-900 font-mono">{formatBRL(promoTurnover)}</strong> · Lucro:{' '}
                <strong className="text-emerald-700 font-mono">
                  {promoBetProfit >= 0 ? '+' : ''}
                  {formatBRL(promoBetProfit)}
                </strong>
              </div>
            </>
          )}
        </div>

        <div className="bg-white border border-slate-300/80 ring-1 ring-slate-900/[0.03] rounded-2xl p-4 sm:p-5 shadow-[0_1px_2px_rgba(15,23,42,0.05),0_4px_14px_-2px_rgba(15,23,42,0.06)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">
              Média Líquida ({scope === 'Saldo Real' ? 'Real' : 'Promo'})
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm shadow-indigo-600/25">
              <span className="material-symbols-outlined text-[18px]">analytics</span>
            </div>
          </div>
          <div
            className={`text-2xl font-mono font-bold mt-2 tabular-nums ${
              analytics.settledBets.length === 0
                ? 'text-slate-900'
                : analytics.avgNet >= 0
                ? 'text-emerald-700'
                : 'text-rose-700'
            }`}
          >
            {analytics.settledBets.length > 0
              ? `${analytics.avgNet >= 0 ? '+' : ''}${formatBRL(analytics.avgNet)}`
              : 'R$ 0,00'}
          </div>
          <div className="text-xs text-slate-600 mt-1">
            Baseado em {analytics.settledBets.length}{' '}
            {analytics.settledBets.length === 1 ? 'aposta finalizada' : 'apostas finalizadas'} · ROI{' '}
            <strong className={analytics.totalRoi >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
              {analytics.totalRoi >= 0 ? '+' : ''}
              {analytics.totalRoi.toFixed(1)}%
            </strong>
          </div>
        </div>
      </div>

      {/* Sports Breakdown (Mobile Cards + Desktop Table) */}
      <div className="bg-white border border-slate-300/80 ring-1 ring-slate-900/[0.03] rounded-2xl p-4 sm:p-6 shadow-[0_1px_2px_rgba(15,23,42,0.05),0_4px_14px_-2px_rgba(15,23,42,0.06)] flex flex-col gap-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
            Desempenho por Modalidade ({scope === 'Saldo Real' ? 'Saldo Real' : 'Promocionais'})
          </h3>
          <span className="text-xs font-mono text-slate-600 font-semibold">
            Giro: {formatBRL(analytics.totalVolume)}
          </span>
        </div>

        {/* Mobile Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 md:hidden">
          {analytics.sportStats.map((item) => (
            <div
              key={item.key}
              className="bg-slate-50/90 border border-slate-300/80 rounded-xl p-3.5 flex flex-col gap-2 shadow-[0_1px_2px_rgba(15,23,42,0.03)]"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">{item.key}</span>
                <span className="text-[11px] font-mono text-slate-600 font-medium tabular-nums">
                  {item.count} {item.count === 1 ? 'aposta' : 'apostas'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-300/70 text-xs">
                <div>
                  <span className="text-[10px] text-slate-600 font-medium block">Acerto</span>
                  <span className="font-mono font-semibold text-slate-900 tabular-nums">
                    {item.winRate.toFixed(1)}%
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-600 font-medium block">ROI</span>
                  <span
                    className={`font-mono font-semibold tabular-nums ${
                      item.roi >= 0 ? 'text-emerald-700' : 'text-rose-700'
                    }`}
                  >
                    {item.roi >= 0 ? '+' : ''}
                    {item.roi.toFixed(1)}%
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-600 font-medium block">Lucro</span>
                  <span
                    className={`font-mono font-bold tabular-nums ${
                      item.pl >= 0 ? 'text-emerald-700' : 'text-rose-700'
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
        <div className="hidden md:block w-full overflow-x-auto rounded-xl border border-slate-300/85 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.05)]">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-300/85 bg-slate-100/90 text-slate-700 text-[11px] font-bold">
                <th className="py-3 px-3.5">Esporte</th>
                <th className="py-3 px-3.5 text-center">Apostas</th>
                <th className="py-3 px-3.5 text-right">Volume Efetivo</th>
                <th className="py-3 px-3.5 text-center">Taxa de Acerto</th>
                <th className="py-3 px-3.5 text-right">Lucro / P&L</th>
                <th className="py-3 px-3.5 text-right">ROI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {analytics.sportStats.map((item) => (
                <tr key={item.key} className="hover:bg-blue-50/40 transition-colors">
                  <td className="py-3 px-3.5 font-semibold text-slate-900">{item.key}</td>
                  <td className="py-3 px-3.5 text-center font-mono text-slate-700 tabular-nums">
                    {item.count}
                  </td>
                  <td className="py-3 px-3.5 text-right font-mono text-slate-800 tabular-nums">
                    {formatBRL(item.volume)}
                  </td>
                  <td className="py-3 px-3.5 text-center font-mono font-semibold text-slate-900 tabular-nums">
                    {item.winRate.toFixed(1)}%
                  </td>
                  <td
                    className={`py-3 px-3.5 text-right font-mono font-bold tabular-nums ${
                      item.pl >= 0 ? 'text-emerald-700' : 'text-rose-700'
                    }`}
                  >
                    {item.pl >= 0 ? '+' : ''}
                    {formatBRL(item.pl)}
                  </td>
                  <td
                    className={`py-3 px-3.5 text-right font-mono font-bold tabular-nums ${
                      item.roi >= 0 ? 'text-emerald-700' : 'text-rose-700'
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
      <div className="bg-white border border-slate-300/80 ring-1 ring-slate-900/[0.03] rounded-2xl p-4 sm:p-6 shadow-[0_1px_2px_rgba(15,23,42,0.05),0_4px_14px_-2px_rgba(15,23,42,0.06)] flex flex-col gap-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
            Desempenho por Categoria de Mercado
          </h3>
          <span className="text-xs text-slate-600 font-semibold">{analytics.marketStats.length} categorias</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {analytics.marketStats.map((item) => (
            <div
              key={item.key}
              className="bg-slate-50/90 border border-slate-300/80 rounded-xl p-3.5 flex flex-col gap-2 shadow-[0_1px_2px_rgba(15,23,42,0.03)]"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-900 truncate">{item.key}</span>
                <span className="text-[11px] font-mono text-slate-600 font-semibold tabular-nums shrink-0">
                  {item.count}
                </span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-300/70 text-xs">
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-600 font-medium">Acerto / ROI</span>
                  <span className="font-mono text-slate-900 font-medium tabular-nums">
                    {item.winRate.toFixed(0)}% ·{' '}
                    <span className={`font-semibold ${item.roi >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {item.roi >= 0 ? '+' : ''}
                      {item.roi.toFixed(1)}%
                    </span>
                  </span>
                </div>
                <span
                  className={`font-mono font-bold tabular-nums ${
                    item.pl >= 0 ? 'text-emerald-700' : 'text-rose-700'
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
      <div className="bg-white border border-slate-300/80 ring-1 ring-slate-900/[0.03] rounded-2xl p-4 sm:p-6 shadow-[0_1px_2px_rgba(15,23,42,0.05),0_4px_14px_-2px_rgba(15,23,42,0.06)] flex flex-col gap-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
            Desempenho por Casa de Apostas
          </h3>
          <span className="text-xs text-slate-600 font-semibold">{analytics.bookmakerStats.length} casas</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {analytics.bookmakerStats.map((item) => (
            <div
              key={item.key}
              className="bg-slate-50/90 border border-slate-300/80 rounded-xl p-3.5 flex flex-col gap-2 shadow-[0_1px_2px_rgba(15,23,42,0.03)]"
            >
              <div className="flex items-center justify-between gap-2">
                <BookmakerBadge
                  bookmaker={item.key}
                  size="md"
                  className="text-xs font-bold text-slate-900"
                />
                <span className="text-[11px] font-mono text-slate-600 font-medium tabular-nums shrink-0">
                  {item.count} {item.count === 1 ? 'aposta' : 'apostas'}
                </span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-300/70 text-xs">
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-600 font-medium">Acerto / ROI</span>
                  <span className="font-mono text-slate-900 font-medium tabular-nums">
                    {item.winRate.toFixed(0)}% ·{' '}
                    <span className={`font-semibold ${item.roi >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {item.roi >= 0 ? '+' : ''}
                      {item.roi.toFixed(1)}%
                    </span>
                  </span>
                </div>
                <span
                  className={`font-mono font-bold tabular-nums ${
                    item.pl >= 0 ? 'text-emerald-700' : 'text-rose-700'
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
      <div className="bg-white border border-slate-300/80 ring-1 ring-slate-900/[0.03] rounded-2xl p-4 sm:p-6 shadow-[0_1px_2px_rgba(15,23,42,0.05),0_4px_14px_-2px_rgba(15,23,42,0.06)] flex flex-col gap-4">
        <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
          Distribuição por Faixa de Odds ({scope === 'Saldo Real' ? 'Saldo Real' : 'Promocionais'})
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {analytics.oddsBuckets.map((bucket) => (
            <div
              key={bucket.label}
              className="p-4 bg-slate-50/90 border border-slate-300/80 rounded-xl flex flex-col gap-2.5 shadow-[0_1px_2px_rgba(15,23,42,0.03)]"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-xs text-slate-900">{bucket.label}</span>
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
              <div className="flex items-center justify-between text-[11px] text-slate-600 font-mono tabular-nums">
                <span>{bucket.count} apostas</span>
                <span className={`font-semibold ${bucket.roi >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
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
