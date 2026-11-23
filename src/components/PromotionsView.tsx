import React, { useState } from 'react';
import { useBankroll } from '../context/BankrollContext';
import { BookmakerBadge } from './BookmakerLogo';
import { calculateFreebetPotentialReturn } from '../lib/financialEngine';

interface PromotionsViewProps {
  onOpenFreeSpinModal: () => void;
  onOpenFreebetModal: () => void;
  onSuccessToast?: (msg: string) => void;
  onNavigateDashboard?: () => void;
}

const makeConversionKey = () =>
  `conv_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

export const PromotionsView: React.FC<PromotionsViewProps> = ({
  onOpenFreeSpinModal,
  onOpenFreebetModal,
  onSuccessToast,
  onNavigateDashboard
}) => {
  const {
    freebets,
    freeSpins,
    promoConversions,
    totalSpinsProfit,
    totalFreebetsProfit,
    rolloverBetProfit,
    rolloverRoi,
    freebetExtractionRate,
    promoBalance,
    availablePromoBalance,
    bonusCredits,
    totalConvertedPromo,
    realEquity,
    updateFreebetStatus,
    deleteFreebet,
    deleteFreeSpin,
    convertPromoToReal,
    deletePromoConversion
  } = useBankroll();

  // Simple Freebet conversion calculator
  const [calcFreebetAmount, setCalcFreebetAmount] = useState('50.00');
  const [calcOddBack, setCalcOddBack] = useState('4.00');
  const [calcOddLay, setCalcOddLay] = useState('4.10');

  // Manual Promotional -> Real Conversion (F1-17)
  const [convAmount, setConvAmount] = useState('');
  const [convOrigin, setConvOrigin] = useState('Bônus Rollover');
  const [convPromotionName, setConvPromotionName] = useState('');
  const [convBookmaker, setConvBookmaker] = useState('');
  const [convDate, setConvDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [convNotes, setConvNotes] = useState('');
  const [convConfirmed, setConvConfirmed] = useState(false);
  const [convError, setConvError] = useState<string | null>(null);
  const [convKey, setConvKey] = useState<string>(() => makeConversionKey());
  const [isConverting, setIsConverting] = useState(false);

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

  const layStake = oddL > 1.0 && oddB > 1.0 ? (fbVal * (oddB - 1)) / (oddL - 0.03) : 0;
  const guaranteedProfit =
    oddL > 1.0 && oddB > 1.0 ? Math.max(0, fbVal * (oddB - 1) - layStake * (oddL - 1)) : 0;

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const handleManualConversion = (e: React.FormEvent) => {
    e.preventDefault();
    if (isConverting) return;
    setConvError(null);
    setIsConverting(true);

    try {
      const dateParts = convDate.split('-');
      const formattedDate =
        dateParts.length === 3
          ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`
          : new Date().toLocaleDateString('pt-BR');

      const result = convertPromoToReal({
        amount: parseNum(convAmount),
        date: formattedDate,
        origin: convOrigin,
        promotionName: convPromotionName,
        bookmaker: convBookmaker,
        notes: convNotes,
        confirmed: convConfirmed,
        idempotencyKey: convKey
      });

      if (!result.success) {
        setConvError(result.error || 'Não foi possível concluir a conversão.');
        return;
      }

      onSuccessToast?.(
        `Conversão de ${formatBRL(result.entry!.amount)} transferida para a Banca Real!`
      );
      setConvAmount('');
      setConvPromotionName('');
      setConvBookmaker('');
      setConvNotes('');
      setConvConfirmed(false);
      setConvKey(makeConversionKey());
    } finally {
      setIsConverting(false);
    }
  };

  const activeFreebetsCount = freebets.filter(
    (f) => f.status === 'Ao Vivo' || f.status === 'Pendente'
  ).length;

  return (
    <div className="w-full flex flex-col gap-4 sm:gap-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-6 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_1px_2px_rgba(15,23,42,0.04)]">
        <div className="flex items-center gap-3">
          {onNavigateDashboard && (
            <button
              type="button"
              onClick={onNavigateDashboard}
              className="p-2 sm:px-3 sm:py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors flex items-center gap-1.5 text-xs font-semibold shrink-0"
              title="Voltar ao Dashboard"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              <span className="hidden sm:inline">Voltar ao Início</span>
            </button>
          )}
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              Bônus, Freebets & Giros Grátis
            </h2>
            <p className="text-xs text-slate-500">
              Saldo promocional isolado da banca real, conversão manual e extração de bônus
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenFreeSpinModal}
            className="flex-1 sm:flex-initial justify-center px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 font-semibold rounded-xl text-xs transition-all flex items-center gap-1.5 whitespace-nowrap"
          >
            <span className="material-symbols-outlined text-[16px] text-emerald-600">casino</span>
            <span>+ Giros Grátis</span>
          </button>
          <button
            type="button"
            onClick={onOpenFreebetModal}
            className="flex-1 sm:flex-initial justify-center px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs transition-all flex items-center gap-1.5 active:scale-95 shadow-sm shadow-blue-600/20 whitespace-nowrap"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            <span>+ Nova Freebet</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_1px_2px_rgba(15,23,42,0.04)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">
              Saldo Promocional Disponível
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-white shadow-sm shadow-amber-500/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">redeem</span>
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-mono font-bold text-amber-600 mt-2 tabular-nums">
            {formatBRL(availablePromoBalance)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex flex-wrap gap-x-2">
            <span>Total promo: <strong className="text-slate-800 font-mono">{formatBRL(promoBalance)}</strong></span>
            <span>·</span>
            <span>Créditos bônus: <strong className="text-slate-800 font-mono">{formatBRL(bonusCredits)}</strong></span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_1px_2px_rgba(15,23,42,0.04)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">
              Convertido para Banca Real
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white shadow-sm shadow-blue-600/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">currency_exchange</span>
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-mono font-bold text-slate-900 mt-2 tabular-nums">
            {formatBRL(totalConvertedPromo)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex flex-wrap gap-x-2">
            <span>Patrimônio real: <strong className="text-emerald-600 font-mono">{formatBRL(realEquity)}</strong></span>
            <span>·</span>
            <span>{activeFreebetsCount} freebet(s) ativas</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_1px_2px_rgba(15,23,42,0.04)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">
              Giros Grátis (Direto na Banca Real)
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white shadow-sm shadow-indigo-600/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">casino</span>
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-mono font-bold text-emerald-600 mt-2 tabular-nums">
            +{formatBRL(totalSpinsProfit)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {freeSpins.length} {freeSpins.length === 1 ? 'rodada' : 'rodadas'} · crédito automático na banca real
          </div>
        </div>
      </div>

      {/* Promo Performance Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white border border-slate-200/90 rounded-2xl p-3.5 sm:p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_1px_2px_rgba(15,23,42,0.04)]">
        <div>
          <span className="text-[11px] font-medium text-slate-500 block">Lucro Freebets</span>
          <span className="text-sm font-mono font-bold text-emerald-600 tabular-nums">
            +{formatBRL(totalFreebetsProfit)}
          </span>
        </div>
        <div>
          <span className="text-[11px] font-medium text-slate-500 block">Taxa Extração Freebet</span>
          <span className="text-sm font-mono font-bold text-blue-600 tabular-nums">
            {freebetExtractionRate.toFixed(1)}%
          </span>
        </div>
        <div>
          <span className="text-[11px] font-medium text-slate-500 block">P/L Bônus Rollover</span>
          <span
            className={`text-sm font-mono font-bold tabular-nums ${
              rolloverBetProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'
            }`}
          >
            {rolloverBetProfit >= 0 ? '+' : ''}
            {formatBRL(rolloverBetProfit)}
          </span>
        </div>
        <div>
          <span className="text-[11px] font-medium text-slate-500 block">ROI Rollover</span>
          <span
            className={`text-sm font-mono font-bold tabular-nums ${
              rolloverRoi >= 0 ? 'text-emerald-600' : 'text-rose-600'
            }`}
          >
            {rolloverRoi >= 0 ? '+' : ''}
            {rolloverRoi.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Manual Conversion Section (F1-17) */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-6 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_1px_2px_rgba(15,23,42,0.04)] flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
              Conversão Manual (Promocional → Saldo Real)
            </h3>
            <p className="text-xs text-slate-500">
              Transfira ganhos promocionais liberados após cumprir rollover. Requer confirmação explícita.
            </p>
          </div>
          <button
            type="button"
            disabled={availablePromoBalance <= 0}
            onClick={() => {
              setConvAmount(Math.max(0, availablePromoBalance).toFixed(2));
              setConvError(null);
            }}
            className="self-start sm:self-auto px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 disabled:opacity-40 border border-amber-200 text-amber-800 text-[11px] font-semibold font-mono transition-colors"
          >
            Usar Disponível ({formatBRL(Math.max(0, availablePromoBalance))})
          </button>
        </div>

        <form onSubmit={handleManualConversion} className="flex flex-col gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-slate-600">
                Valor a Converter (R$) *
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={convAmount}
                onChange={(e) => {
                  const val = e.target.value;
                  if (/^[0-9]*[.,]?[0-9]*$/.test(val) || val === '') {
                    setConvAmount(val);
                    setConvError(null);
                  }
                }}
                placeholder="30,00"
                className="bg-slate-50 border border-slate-200 text-slate-900 px-3.5 py-2.5 rounded-xl text-xs font-mono focus:outline-none focus:border-blue-600 focus:bg-white placeholder:text-slate-400"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-slate-600">Origem *</label>
              <select
                value={convOrigin}
                onChange={(e) => setConvOrigin(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-slate-900 px-3 py-2.5 rounded-xl text-xs focus:outline-none focus:border-blue-600 focus:bg-white"
              >
                <option value="Bônus Rollover" className="bg-white text-slate-900">Bônus Rollover</option>
                <option value="Freebet Extraída" className="bg-white text-slate-900">Freebet Extraída</option>
                <option value="Cashback / Promoção" className="bg-white text-slate-900">Cashback / Promoção</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-slate-600">
                Promoção Relacionada *
              </label>
              <input
                type="text"
                value={convPromotionName}
                onChange={(e) => {
                  setConvPromotionName(e.target.value);
                  setConvError(null);
                }}
                placeholder="Ex: Bônus Boas-Vindas / Rollover 5x"
                className="bg-slate-50 border border-slate-200 text-slate-900 px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-blue-600 focus:bg-white placeholder:text-slate-400"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-slate-600">Data</label>
              <input
                type="date"
                value={convDate}
                onChange={(e) => setConvDate(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-slate-900 px-3 py-2.5 rounded-xl text-xs font-mono focus:outline-none focus:border-blue-600 focus:bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-slate-600">
                Casa de Apostas (Opcional)
              </label>
              <input
                type="text"
                value={convBookmaker}
                onChange={(e) => setConvBookmaker(e.target.value)}
                placeholder="Ex: Bet365, Betano..."
                className="bg-slate-50 border border-slate-200 text-slate-900 px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-blue-600 focus:bg-white placeholder:text-slate-400"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-slate-600">
                Observações (Opcional)
              </label>
              <input
                type="text"
                value={convNotes}
                onChange={(e) => setConvNotes(e.target.value)}
                placeholder="Ex: Rollover concluído integralmente"
                className="bg-slate-50 border border-slate-200 text-slate-900 px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-blue-600 focus:bg-white placeholder:text-slate-400"
              />
            </div>
          </div>

          <label className="flex items-start gap-2.5 bg-slate-50 border border-slate-200 rounded-xl p-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={convConfirmed}
              onChange={(e) => {
                setConvConfirmed(e.target.checked);
                setConvError(null);
              }}
              className="mt-0.5 w-4 h-4 rounded border-slate-300 bg-white accent-blue-600 shrink-0"
            />
            <span className="text-xs text-slate-700 leading-relaxed">
              Confirmo manualmente a transferência deste valor do <strong className="text-slate-900">Saldo Promocional</strong>{' '}
              para a <strong className="text-slate-900">Banca Real</strong>. O valor não excede o saldo promocional disponível.
            </span>
          </label>

          {convError && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium rounded-xl px-3.5 py-2.5">
              {convError}
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isConverting || !convConfirmed || availablePromoBalance <= 0}
              className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-45 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-xs transition-all active:scale-95 shadow-sm shadow-blue-600/20 flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">currency_exchange</span>
              <span>Confirmar Conversão para Saldo Real</span>
            </button>
          </div>
        </form>

        {/* Conversion History */}
        <div className="pt-3 border-t border-slate-200/80 flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Histórico de Conversões Promocionais
            </h4>
            <span className="text-[11px] font-mono text-slate-500">
              {promoConversions.length} registro(s)
            </span>
          </div>

          {promoConversions.length === 0 ? (
            <div className="bg-slate-50 border border-slate-200 rounded-xl py-4 px-3 text-center text-xs text-slate-500">
              Nenhuma conversão manual realizada até o momento.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {promoConversions.map((conv) => (
                <div
                  key={conv.id}
                  className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-900 truncate">
                        {conv.promotionName}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-semibold">
                        {conv.origin}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-1 flex-wrap">
                      <span className="font-mono">{conv.date}</span>
                      {conv.bookmaker && (
                        <>
                          <span>·</span>
                          <BookmakerBadge
                            bookmaker={conv.bookmaker}
                            size="sm"
                            className="text-slate-700 font-medium"
                          />
                        </>
                      )}
                      {conv.notes && (
                        <>
                          <span>·</span>
                          <span className="truncate">{conv.notes}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono font-bold text-sm text-emerald-600 tabular-nums">
                      +{formatBRL(conv.amount)}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        deletePromoConversion(conv.id);
                        onSuccessToast?.('Conversão removida.');
                      }}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                      title="Estornar conversão"
                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Calculator Section */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-6 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_1px_2px_rgba(15,23,42,0.04)] flex flex-col gap-4">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
            Calculadora de Extração (Back / Lay)
          </h3>
          <p className="text-xs text-slate-500">
            Simule o lucro garantido em Matched Betting para freebets (sem devolver a stake)
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold text-slate-600">
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
              className="bg-slate-50 border border-slate-200 text-slate-900 px-3.5 py-2.5 rounded-xl text-xs font-mono focus:outline-none focus:border-blue-600 focus:bg-white placeholder:text-slate-400"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold text-slate-600">
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
              className="bg-slate-50 border border-slate-200 text-slate-900 px-3.5 py-2.5 rounded-xl text-xs font-mono focus:outline-none focus:border-blue-600 focus:bg-white placeholder:text-slate-400"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold text-slate-600">
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
              className="bg-slate-50 border border-slate-200 text-slate-900 px-3.5 py-2.5 rounded-xl text-xs font-mono focus:outline-none focus:border-blue-600 focus:bg-white placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* Result of conversion */}
        <div className="p-3.5 sm:p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center justify-between sm:flex-col sm:items-start">
            <span className="text-[11px] text-slate-500 font-medium">Stake Lay na Exchange</span>
            <span className="text-sm sm:text-base font-mono font-bold text-slate-900 tabular-nums">
              {formatBRL(layStake)}
            </span>
          </div>
          <div className="flex items-center justify-between sm:flex-col sm:items-end pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200">
            <span className="text-[11px] text-slate-500 font-medium">Lucro Líquido Garantido</span>
            <span className="text-sm sm:text-base font-mono font-bold text-emerald-600 tabular-nums">
              +{formatBRL(guaranteedProfit)} ({((guaranteedProfit / (fbVal || 1)) * 100).toFixed(1)}%)
            </span>
          </div>
        </div>
      </div>

      {/* Freebets List */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-6 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_1px_2px_rgba(15,23,42,0.04)] flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
            Freebets Cadastradas
          </h3>
          <span className="text-xs font-mono text-slate-500">{freebets.length} registro(s)</span>
        </div>

        {freebets.length === 0 ? (
          <div className="bg-slate-50 border border-slate-200 rounded-xl py-8 px-4 text-center text-xs text-slate-500">
            Nenhuma freebet cadastrada no momento.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {freebets.map((fb) => {
              const potential = calculateFreebetPotentialReturn(fb.bonusAmount, fb.odd);
              const isPending = fb.status === 'Ao Vivo' || fb.status === 'Pendente';
              const isCredited = fb.status === 'Creditado';

              return (
                <div
                  key={fb.id}
                  className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-col gap-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-slate-900 truncate">{fb.event}</span>
                        {fb.linkedBetId && (
                          <span className="px-1.5 py-0.5 rounded bg-blue-50 border border-blue-200 text-blue-700 text-[10px] font-semibold">
                            Vinculada ao Razão
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-600 block truncate mt-0.5">
                        {fb.selection} ·{' '}
                        <strong className="text-blue-600 font-mono">@{fb.odd.toFixed(2)}</strong>
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      {isCredited ? (
                        <span className="font-mono font-bold text-sm text-emerald-600 tabular-nums">
                          +{formatBRL(fb.netReturn)}
                        </span>
                      ) : isPending ? (
                        <div>
                          <span className="block text-[10px] text-amber-700 font-semibold">
                            Potencial
                          </span>
                          <span className="font-mono font-bold text-xs text-amber-600 tabular-nums">
                            +{formatBRL(potential)}
                          </span>
                        </div>
                      ) : (
                        <span className="font-mono font-bold text-sm text-slate-500 tabular-nums">
                          {formatBRL(0)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-200 gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <BookmakerBadge
                        bookmaker={fb.bookmaker}
                        size="sm"
                        className="text-slate-800 font-medium"
                      />
                      <span>·</span>
                      <span>
                        Bônus{' '}
                        <strong className="font-mono text-slate-800">
                          {formatBRL(fb.bonusAmount)}
                        </strong>
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {isPending ? (
                        <>
                          <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-semibold">
                            {fb.status}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              updateFreebetStatus(fb.id, 'Creditado');
                              onSuccessToast?.('Freebet marcada como Creditada!');
                            }}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold transition-colors"
                          >
                            Creditar
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              updateFreebetStatus(fb.id, 'Expirado');
                              onSuccessToast?.('Freebet marcada como Expirada / Perdida.');
                            }}
                            className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-semibold transition-colors"
                          >
                            Expirado
                          </button>
                        </>
                      ) : isCredited ? (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold">
                          Creditado
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200 text-[11px] font-semibold">
                          Expirado
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          deleteFreebet(fb.id);
                          onSuccessToast?.('Freebet removida.');
                        }}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                        title="Excluir"
                      >
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Free Spins List */}
      {freeSpins.length > 0 && (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-6 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_1px_2px_rgba(15,23,42,0.04)] flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
              Histórico de Giros Grátis (Banca Real)
            </h3>
            <span className="text-xs font-mono text-slate-500">{freeSpins.length} registro(s)</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {freeSpins.map((fs) => (
              <div
                key={fs.id}
                className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center justify-between gap-3"
              >
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-bold text-slate-900 block truncate">{fs.game}</span>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5 flex-wrap">
                    <BookmakerBadge
                      bookmaker={fs.bookmaker}
                      size="sm"
                      className="text-slate-700 font-medium"
                    />
                    <span>·</span>
                    <span>{fs.spinsCount} giros</span>
                    <span>·</span>
                    <span>{fs.date}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-mono font-bold text-sm text-emerald-600 tabular-nums">
                    +{formatBRL(fs.netProfit)}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      deleteFreeSpin(fs.id);
                      onSuccessToast?.('Registro de giros removido.');
                    }}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
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
