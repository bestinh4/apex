import React, { useState, useMemo, useRef } from 'react';
import { BetEntry } from '../types';

interface BankrollChartProps {
  bets: BetEntry[];
  initialBankroll: number;
  currentEquity: number;
  unitValue: number;
  maxDrawdownPct: number;
  onOpenNewBetModal: () => void;
}

type ChartMode = 'EQUITY' | 'PROFIT' | 'UNITS';
type ChartRange = 'ALL' | '10' | '25' | '50';

interface ChartPoint {
  index: number;
  label: string;
  sublabel: string;
  date: string;
  equity: number;
  cumulativeProfit: number;
  cumulativeUnits: number;
  deltaPL: number;
  deltaUnits: number;
  odd?: number;
  status?: string;
}

export const BankrollChart: React.FC<BankrollChartProps> = ({
  bets,
  initialBankroll,
  currentEquity,
  unitValue,
  maxDrawdownPct,
  onOpenNewBetModal
}) => {
  const [mode, setMode] = useState<ChartMode>('EQUITY');
  const [range, setRange] = useState<ChartRange>('ALL');
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const safeNum = (val: any, fallback = 0): number => {
    const n = Number(val);
    return Number.isFinite(n) ? n : fallback;
  };

  const formatBRL = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(safeNum(val, 0));

  const formatCompactBRL = (val: number) => {
    const clean = safeNum(val, 0);
    if (Math.abs(clean) >= 10000) {
      return `R$ ${(clean / 1000).toFixed(1)}k`;
    }
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(clean);
  };

  // Build chronological points from settled bets
  const allPoints = useMemo<ChartPoint[]>(() => {
    const settledChronological = [...bets]
      .filter((b) => b.status !== 'PENDENTE')
      .reverse();

    const totalBetPL = settledChronological.reduce((acc, b) => acc + safeNum(b.pl, 0), 0);
    // Base capital includes initialBankroll + net deposits/withdrawals/spins so final point equals currentEquity
    const baseCapital = safeNum(currentEquity, safeNum(initialBankroll, 1000)) - totalBetPL;
    const safeUnit = safeNum(unitValue, 25) > 0 ? safeNum(unitValue, 25) : 25;

    const pts: ChartPoint[] = [
      {
        index: 0,
        label: 'Banca Inicial',
        sublabel: 'Ponto de partida da curva',
        date: 'Início',
        equity: baseCapital,
        cumulativeProfit: 0,
        cumulativeUnits: 0,
        deltaPL: 0,
        deltaUnits: 0,
        status: 'BASE'
      }
    ];

    let runningProfit = 0;
    settledChronological.forEach((bet, i) => {
      const betPL = safeNum(bet.pl, 0);
      runningProfit += betPL;
      const runningEquity = baseCapital + runningProfit;
      const cumUnits = runningProfit / safeUnit;
      const dUnits = betPL / safeUnit;
      const evLabel = bet.event && bet.event !== 'undefined' ? bet.event : 'Partida';
      const mkLabel = bet.market && bet.market !== 'undefined' ? bet.market : 'Mercado Principal';
      const dtLabel = bet.date && bet.date !== 'undefined' ? bet.date : 'Hoje';

      pts.push({
        index: i + 1,
        label: evLabel,
        sublabel: `${mkLabel}${bet.bookmaker && bet.bookmaker !== 'undefined' ? ` · ${bet.bookmaker}` : ''}`,
        date: dtLabel,
        equity: runningEquity,
        cumulativeProfit: runningProfit,
        cumulativeUnits: cumUnits,
        deltaPL: betPL,
        deltaUnits: dUnits,
        odd: safeNum(bet.odd, 1.0),
        status: bet.status
      });
    });

    return pts;
  }, [bets, currentEquity, initialBankroll, unitValue]);

  // Apply range filter while keeping baseline context
  const visiblePoints = useMemo<ChartPoint[]>(() => {
    if (range === 'ALL') return allPoints;
    const limit = parseInt(range, 10);
    if (allPoints.length <= limit + 1) return allPoints;
    return allPoints.slice(allPoints.length - (limit + 1));
  }, [allPoints, range]);

  const getValue = (pt: ChartPoint): number => {
    if (mode === 'PROFIT') return pt.cumulativeProfit;
    if (mode === 'UNITS') return pt.cumulativeUnits;
    return pt.equity;
  };

  const formatValue = (val: number): string => {
    if (mode === 'PROFIT') {
      return `${val >= 0 ? '+' : ''}${formatBRL(val)}`;
    }
    if (mode === 'UNITS') {
      return `${val >= 0 ? '+' : ''}${val.toFixed(2)}u`;
    }
    return formatBRL(val);
  };

  const formatAxisValue = (val: number): string => {
    if (mode === 'PROFIT') {
      return `${val >= 0 ? '+' : ''}${formatCompactBRL(val)}`;
    }
    if (mode === 'UNITS') {
      return `${val >= 0 ? '+' : ''}${val.toFixed(1)}u`;
    }
    return formatCompactBRL(val);
  };

  // Determine chart geometry and scales
  const chartGeometry = useMemo(() => {
    const width = 720;
    const height = 220;
    const padLeft = 8;
    const padRight = 14;
    const padTop = 20;
    const padBottom = 24;
    const plotW = width - padLeft - padRight;
    const plotH = height - padTop - padBottom;

    const values = visiblePoints.map(getValue);
    const startVal = values[0] ?? (mode === 'EQUITY' ? initialBankroll : 0);
    const endVal = values[values.length - 1] ?? startVal;

    let minVal = Math.min(...values, startVal);
    let maxVal = Math.max(...values, startVal);

    if (Math.abs(maxVal - minVal) < 0.001) {
      const buffer = mode === 'UNITS' ? 2 : Math.max(50, Math.abs(startVal) * 0.05);
      minVal -= buffer;
      maxVal += buffer;
    } else {
      const span = maxVal - minVal;
      minVal -= span * 0.12;
      maxVal += span * 0.12;
    }

    const toX = (idx: number) => {
      if (visiblePoints.length <= 1) return padLeft + plotW / 2;
      return padLeft + (idx / (visiblePoints.length - 1)) * plotW;
    };

    const toY = (val: number) => {
      const ratio = (val - minVal) / (maxVal - minVal || 1);
      return padTop + plotH - ratio * plotH;
    };

    const coords = visiblePoints.map((pt, i) => ({
      x: toX(i),
      y: toY(getValue(pt)),
      pt,
      val: getValue(pt)
    }));

    // Build smooth cubic bezier SVG path
    let linePath = '';
    let areaPath = '';

    if (coords.length === 1) {
      const y = coords[0].y;
      linePath = `M ${padLeft} ${y} L ${padLeft + plotW} ${y}`;
      areaPath = `M ${padLeft} ${y} L ${padLeft + plotW} ${y} L ${padLeft + plotW} ${padTop + plotH} L ${padLeft} ${padTop + plotH} Z`;
    } else if (coords.length > 1) {
      linePath = `M ${coords[0].x.toFixed(2)} ${coords[0].y.toFixed(2)}`;
      for (let i = 0; i < coords.length - 1; i++) {
        const p0 = coords[i];
        const p1 = coords[i + 1];
        const cpx1 = p0.x + (p1.x - p0.x) * 0.42;
        const cpy1 = p0.y;
        const cpx2 = p1.x - (p1.x - p0.x) * 0.42;
        const cpy2 = p1.y;
        linePath += ` C ${cpx1.toFixed(2)} ${cpy1.toFixed(2)}, ${cpx2.toFixed(2)} ${cpy2.toFixed(2)}, ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`;
      }
      const firstX = coords[0].x.toFixed(2);
      const lastX = coords[coords.length - 1].x.toFixed(2);
      const bottomY = (padTop + plotH).toFixed(2);
      areaPath = `${linePath} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
    }

    const baselineY = Math.max(padTop, Math.min(padTop + plotH, toY(startVal)));
    const isPositive = endVal >= startVal;

    // Peak and low in visible range
    const rawValues = visiblePoints.map(getValue);
    const peakVal = Math.max(...rawValues);
    const lowVal = Math.min(...rawValues);
    const midVal = (peakVal + lowVal) / 2;

    return {
      width,
      height,
      padLeft,
      padRight,
      padTop,
      padBottom,
      plotW,
      plotH,
      coords,
      linePath,
      areaPath,
      baselineY,
      startVal,
      endVal,
      peakVal,
      lowVal,
      midVal,
      isPositive
    };
  }, [visiblePoints, mode, initialBankroll]);

  const effectiveIdx =
    activeIdx !== null && activeIdx < visiblePoints.length
      ? activeIdx
      : visiblePoints.length - 1;

  const activeCoord = chartGeometry.coords[effectiveIdx] || chartGeometry.coords[0];
  const activePoint = activeCoord?.pt;

  const handlePointerInteraction = (clientX: number) => {
    if (!svgRef.current || visiblePoints.length <= 1) return;
    const rect = svgRef.current.getBoundingClientRect();
    const relX = Math.max(0, Math.min(1, (clientX - rect.left) / (rect.width || 1)));
    const idx = Math.round(relX * (visiblePoints.length - 1));
    setActiveIdx(idx);
  };

  const settledCount = allPoints.length - 1;
  const totalPeriodVariation = chartGeometry.endVal - chartGeometry.startVal;
  const growthPct =
    initialBankroll > 0
      ? ((allPoints[allPoints.length - 1].cumulativeProfit / initialBankroll) * 100)
      : 0;

  const strokeColor =
    settledCount === 0
      ? '#3b82f6'
      : chartGeometry.isPositive
      ? '#10b981'
      : '#f43f5e';

  return (
    <div className="bg-[#0e1422]/95 border border-white/[0.07] rounded-2xl p-4 sm:p-6 shadow-sm flex flex-col gap-4">
      {/* Top Row: Title + Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center justify-between sm:justify-start gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                Evolução da Banca
              </h3>
              <span className="text-xs text-slate-400 font-mono tabular-nums">
                · {settledCount} {settledCount === 1 ? 'aposta' : 'apostas'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Toque ou arraste no gráfico para inspecionar cada operação
            </p>
          </div>
        </div>

        {/* Mode & Range Segmented Controls */}
        <div className="flex items-center justify-between sm:justify-end gap-2 flex-wrap">
          {/* Metric Mode Selector */}
          <div className="flex items-center bg-[#080c14] p-1 rounded-xl border border-white/[0.07]">
            {(
              [
                { key: 'EQUITY', label: 'Banca (R$)' },
                { key: 'PROFIT', label: 'Lucro' },
                { key: 'UNITS', label: 'Unid. (u)' }
              ] as const
            ).map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setMode(item.key)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  mode === item.key
                    ? 'bg-blue-600 text-white font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Range Filter */}
          <div className="flex items-center bg-[#080c14] p-1 rounded-xl border border-white/[0.07]">
            {(
              [
                { key: 'ALL', label: 'Tudo' },
                { key: '10', label: '10' },
                { key: '25', label: '25' },
                { key: '50', label: '50' }
              ] as const
            ).map((r) => (
              <button
                key={r.key}
                type="button"
                onClick={() => {
                  setRange(r.key);
                  setActiveIdx(null);
                }}
                className={`px-2 py-1.5 rounded-lg text-xs font-mono whitespace-nowrap transition-all ${
                  range === r.key
                    ? 'bg-slate-800 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Interactive Active Point Inspector Bar */}
      {activePoint && (
        <div className="bg-[#080c14] border border-white/[0.06] rounded-xl p-3 sm:px-4 sm:py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-2.5 h-8 rounded-full shrink-0 ${
                activePoint.index === 0
                  ? 'bg-blue-500'
                  : activePoint.deltaPL > 0
                  ? 'bg-emerald-400'
                  : activePoint.deltaPL < 0
                  ? 'bg-rose-400'
                  : 'bg-slate-500'
              }`}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="font-mono text-slate-300 font-semibold">
                  {activePoint.index === 0 ? 'Início' : `#${activePoint.index}`}
                </span>
                <span>·</span>
                <span className="truncate">{activePoint.date}</span>
                {activePoint.odd && (
                  <>
                    <span>·</span>
                    <span className="font-mono text-blue-400 font-semibold">
                      @{Number(activePoint.odd || 1).toFixed(2)}
                    </span>
                  </>
                )}
              </div>
              <div className="text-xs sm:text-sm font-semibold text-white truncate mt-0.5">
                {activePoint.label}
                {activePoint.index > 0 && (
                  <span className="text-slate-400 font-normal"> — {activePoint.sublabel}</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-4 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/[0.05] shrink-0">
            {activePoint.index > 0 && (
              <div className="flex flex-col sm:items-end">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                  Resultado da Aposta
                </span>
                <span
                  className={`font-mono text-xs sm:text-sm font-bold tabular-nums ${
                    activePoint.deltaPL > 0
                      ? 'text-emerald-400'
                      : activePoint.deltaPL < 0
                      ? 'text-rose-400'
                      : 'text-slate-300'
                  }`}
                >
                  {activePoint.deltaPL > 0 ? '+' : ''}
                  {formatBRL(activePoint.deltaPL)} ({activePoint.deltaUnits >= 0 ? '+' : ''}
                  {Number(activePoint.deltaUnits || 0).toFixed(2)}u)
                </span>
              </div>
            )}

            <div className="flex flex-col items-end">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                {mode === 'EQUITY'
                  ? 'Banca no Ponto'
                  : mode === 'PROFIT'
                  ? 'Lucro Acumulado'
                  : 'Unidades Acumuladas'}
              </span>
              <span className="font-mono text-sm sm:text-base font-bold text-white tabular-nums">
                {formatValue(getValue(activePoint))}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Main SVG Chart Canvas */}
      <div className="relative w-full h-52 sm:h-64 bg-[#080c14] border border-white/[0.06] rounded-xl overflow-hidden select-none touch-pan-y">
        {/* Y-Axis Reference Labels (Right-aligned subtle overlay) */}
        <div className="absolute inset-y-0 right-2.5 py-3 flex flex-col justify-between items-end pointer-events-none z-20 text-[10px] font-mono text-slate-500 tabular-nums">
          <span>{formatAxisValue(chartGeometry.peakVal)}</span>
          <span>{formatAxisValue(chartGeometry.midVal)}</span>
          <span>{formatAxisValue(chartGeometry.lowVal)}</span>
        </div>

        {/* Interactive SVG */}
        <svg
          ref={svgRef}
          viewBox={`0 0 ${chartGeometry.width} ${chartGeometry.height}`}
          preserveAspectRatio="none"
          className="w-full h-full cursor-crosshair relative z-10"
          onMouseMove={(e) => handlePointerInteraction(e.clientX)}
          onMouseLeave={() => setActiveIdx(null)}
          onTouchStart={(e) => {
            if (e.touches[0]) handlePointerInteraction(e.touches[0].clientX);
          }}
          onTouchMove={(e) => {
            if (e.touches[0]) handlePointerInteraction(e.touches[0].clientX);
          }}
        >
          <defs>
            <linearGradient id="bankrollAreaGradPositive" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.28" />
              <stop offset="65%" stopColor="#10b981" stopOpacity="0.06" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="bankrollAreaGradNegative" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.26" />
              <stop offset="65%" stopColor="#f43f5e" stopOpacity="0.06" />
              <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="bankrollAreaGradNeutral" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Horizontal Grid Lines */}
          {[0.15, 0.5, 0.85].map((ratio, idx) => {
            const y = chartGeometry.padTop + chartGeometry.plotH * ratio;
            return (
              <line
                key={idx}
                x1={chartGeometry.padLeft}
                x2={chartGeometry.width - chartGeometry.padRight}
                y1={y}
                y2={y}
                stroke="#1e293b"
                strokeWidth="1"
                strokeOpacity="0.6"
              />
            );
          })}

          {/* Baseline (Initial Bankroll or Zero Profit) */}
          <line
            x1={chartGeometry.padLeft}
            x2={chartGeometry.width - chartGeometry.padRight}
            y1={chartGeometry.baselineY}
            y2={chartGeometry.baselineY}
            stroke="#475569"
            strokeWidth="1.2"
            strokeDasharray="4 4"
          />

          {/* Shaded Area Under Curve */}
          <path
            d={chartGeometry.areaPath}
            fill={
              settledCount === 0
                ? 'url(#bankrollAreaGradNeutral)'
                : chartGeometry.isPositive
                ? 'url(#bankrollAreaGradPositive)'
                : 'url(#bankrollAreaGradNegative)'
            }
          />

          {/* Main Smooth Curve */}
          <path
            d={chartGeometry.linePath}
            fill="none"
            stroke={strokeColor}
            strokeWidth="2.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Active Vertical Crosshair */}
          {activeCoord && (
            <line
              x1={activeCoord.x}
              x2={activeCoord.x}
              y1={chartGeometry.padTop}
              y2={chartGeometry.padTop + chartGeometry.plotH}
              stroke="#94a3b8"
              strokeWidth="1"
              strokeDasharray="3 3"
              strokeOpacity="0.5"
            />
          )}

          {/* Individual Data Nodes (when <= 30 points) */}
          {visiblePoints.length <= 30 &&
            chartGeometry.coords.map((c, idx) => {
              const isSelected = idx === effectiveIdx;
              const dotColor =
                c.pt.index === 0
                  ? '#3b82f6'
                  : c.pt.deltaPL > 0
                  ? '#10b981'
                  : c.pt.deltaPL < 0
                  ? '#f43f5e'
                  : '#94a3b8';

              return (
                <g key={c.pt.index}>
                  {isSelected && (
                    <circle
                      cx={c.x}
                      cy={c.y}
                      r="9"
                      fill={dotColor}
                      opacity="0.22"
                    />
                  )}
                  <circle
                    cx={c.x}
                    cy={c.y}
                    r={isSelected ? '4.5' : '3'}
                    fill={dotColor}
                    stroke="#080c14"
                    strokeWidth="1.5"
                  />
                </g>
              );
            })}

          {/* Highlight Active Node when > 30 points */}
          {visiblePoints.length > 30 && activeCoord && (
            <g>
              <circle
                cx={activeCoord.x}
                cy={activeCoord.y}
                r="9"
                fill={strokeColor}
                opacity="0.22"
              />
              <circle
                cx={activeCoord.x}
                cy={activeCoord.y}
                r="4.5"
                fill={strokeColor}
                stroke="#080c14"
                strokeWidth="1.5"
              />
            </g>
          )}
        </svg>

        {/* Empty State Callout Overlay when 0 settled bets */}
        {settledCount === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#080c14]/60 backdrop-blur-[1px] z-30 p-4 text-center">
            <p className="text-xs sm:text-sm font-medium text-slate-300 max-w-md">
              Sua banca está pronta em <strong className="text-white font-mono">{formatBRL(currentEquity)}</strong>. Registre sua primeira aposta para iniciar a curva de evolução.
            </p>
            <button
              type="button"
              onClick={onOpenNewBetModal}
              className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-md shadow-blue-600/25 active:scale-95 transition-all flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              <span>Registrar 1ª Aposta</span>
            </button>
          </div>
        )}
      </div>

      {/* Bottom Summary Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 pt-1">
        <div className="bg-[#080c14] border border-white/[0.05] rounded-xl px-3 py-2.5 flex flex-col">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider">Base do Período</span>
          <span className="font-mono text-xs sm:text-sm font-bold text-slate-200 tabular-nums mt-0.5">
            {formatValue(chartGeometry.startVal)}
          </span>
        </div>

        <div className="bg-[#080c14] border border-white/[0.05] rounded-xl px-3 py-2.5 flex flex-col">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider">Pico (Máxima)</span>
          <span className="font-mono text-xs sm:text-sm font-bold text-emerald-400 tabular-nums mt-0.5">
            {formatValue(chartGeometry.peakVal)}
          </span>
        </div>

        <div className="bg-[#080c14] border border-white/[0.05] rounded-xl px-3 py-2.5 flex flex-col">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider">Drawdown Máx.</span>
          <span className="font-mono text-xs sm:text-sm font-bold text-slate-200 tabular-nums mt-0.5">
            {maxDrawdownPct > 0 ? `-${maxDrawdownPct.toFixed(1)}%` : '0.0%'}
          </span>
        </div>

        <div className="bg-[#080c14] border border-white/[0.05] rounded-xl px-3 py-2.5 flex flex-col">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider">Crescimento Total</span>
          <span
            className={`font-mono text-xs sm:text-sm font-bold tabular-nums mt-0.5 ${
              totalPeriodVariation >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {growthPct >= 0 ? '+' : ''}
            {growthPct.toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
};
