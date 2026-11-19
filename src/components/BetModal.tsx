import React, { useState, useEffect } from 'react';
import { BetEntry, BetFundType, BetStatus } from '../types';
import { useBankroll } from '../context/BankrollContext';
import {
  FOOTBALL_MARKETS,
  FOOTBALL_CATEGORIES,
  BOOKMAKERS,
  SPORTS_LIST,
  OTHER_SPORT_MARKETS
} from '../data/footballMarkets';

interface BetModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialBet?: BetEntry | null;
  onSuccessToast?: (msg: string) => void;
}

export const BetModal: React.FC<BetModalProps> = ({
  isOpen,
  onClose,
  initialBet,
  onSuccessToast
}) => {
  const { addBet, updateBet, settings } = useBankroll();

  const getInitialBookmaker = () => {
    try {
      return localStorage.getItem('apex_last_bookmaker') || '1win';
    } catch {
      return '1win';
    }
  };

  const [fundType, setFundType] = useState<BetFundType>('Saldo Real');
  const [bookmaker, setBookmaker] = useState<string>(getInitialBookmaker);
  const [customBookmaker, setCustomBookmaker] = useState<string>('');
  const [sport, setSport] = useState('Futebol');
  const [event, setEvent] = useState('');
  const [marketSearch, setMarketSearch] = useState('');

  // Football market & selection state
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos os Mercados');
  const [selectedMarketId, setSelectedMarketId] = useState<string>('gols-over-under');
  const [selectedOption, setSelectedOption] = useState<string>('Mais de 2.5 Gols (Over 2.5)');
  const [customMarketText, setCustomMarketText] = useState<string>('');

  const [odd, setOdd] = useState('1.90');
  const [stake, setStake] = useState('25.00');
  const [status, setStatus] = useState<BetStatus>('GREEN');

  const searchClean = marketSearch.trim().toLowerCase();

  // When searching, search across ALL markets so nothing is hidden by an active category tab
  const filteredFootballMarkets = FOOTBALL_MARKETS.filter((m) => {
    const matchesCategory =
      searchClean.length > 0 ||
      selectedCategory === 'Todos os Mercados' ||
      m.category === selectedCategory;

    const matchesSearch =
      !searchClean ||
      m.name.toLowerCase().includes(searchClean) ||
      m.category.toLowerCase().includes(searchClean) ||
      m.selections.some((s) => s.toLowerCase().includes(searchClean));

    return matchesCategory && matchesSearch;
  });

  const activeMarket =
    filteredFootballMarkets.find((m) => m.id === selectedMarketId) ||
    filteredFootballMarkets[0] ||
    FOOTBALL_MARKETS.find((m) => m.id === selectedMarketId) ||
    FOOTBALL_MARKETS[0];

  useEffect(() => {
    if (initialBet) {
      setFundType(initialBet.type);
      const bk = initialBet.bookmaker || '1win';
      if ((BOOKMAKERS as readonly string[]).includes(bk)) {
        setBookmaker(bk);
        setCustomBookmaker('');
      } else {
        setBookmaker('Outra');
        setCustomBookmaker(bk);
      }
      setSport(initialBet.sport);
      setEvent(initialBet.event);
      setCustomMarketText(initialBet.market);
      setOdd(initialBet.odd.toString());
      setStake(initialBet.stake.toString());
      setStatus(initialBet.status);
      setMarketSearch('');

      const matched = FOOTBALL_MARKETS.find((m) => initialBet.market.includes(m.name));
      if (matched) {
        setSelectedMarketId(matched.id);
        setSelectedCategory(matched.category);
      }
    } else {
      setFundType('Saldo Real');
      const savedBk = getInitialBookmaker();
      if ((BOOKMAKERS as readonly string[]).includes(savedBk)) {
        setBookmaker(savedBk);
        setCustomBookmaker('');
      } else {
        setBookmaker('Outra');
        setCustomBookmaker(savedBk);
      }
      setSport('Futebol');
      setEvent('');
      setMarketSearch('');
      setSelectedCategory('Todos os Mercados');
      setSelectedMarketId('gols-over-under');
      setSelectedOption('Mais de 2.5 Gols (Over 2.5)');
      setCustomMarketText('Total de Gols FT (Over / Under): Mais de 2.5 Gols (Over 2.5)');
      setOdd('1.90');
      setStake(settings.unitValue.toFixed(2));
      setStatus('GREEN');
    }
  }, [initialBet, isOpen, settings.unitValue]);

  const handleMarketChange = (marketId: string) => {
    setSelectedMarketId(marketId);
    const m = FOOTBALL_MARKETS.find((item) => item.id === marketId);
    if (m && m.selections.length > 0) {
      const firstOpt = m.selections[0];
      setSelectedOption(firstOpt);
      setCustomMarketText(`${m.name}: ${firstOpt}`);
    }
  };

  const handleOptionChange = (opt: string) => {
    setSelectedOption(opt);
    if (activeMarket) {
      setSelectedMarketId(activeMarket.id);
      setCustomMarketText(`${activeMarket.name}: ${opt}`);
    } else {
      setCustomMarketText(opt);
    }
  };

  if (!isOpen) return null;

  // Suporte a decimais com vírgula ou ponto (ex: 2,75 ou 2.75)
  const parseLocaleNumber = (val: string | number): number => {
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    if (!val) return 0;
    const clean = String(val).trim().replace(',', '.');
    const parsed = parseFloat(clean);
    return isNaN(parsed) ? 0 : parsed;
  };

  const numStake = parseLocaleNumber(stake);
  const numOdd = parseLocaleNumber(odd) || 1.0;
  const safeUnitVal = settings.unitValue > 0 ? settings.unitValue : 25;
  const units = numStake / safeUnitVal;

  let gross = 0;
  let pl = 0;
  if (status === 'GREEN') {
    gross = fundType === 'Freebet' ? numStake * (numOdd - 1) : numStake * numOdd;
    pl = gross - (fundType === 'Freebet' ? 0 : numStake);
  } else if (status === 'HALF_GREEN') {
    gross = numStake + (numStake * (numOdd - 1)) / 2;
    pl = gross - numStake;
  } else if (status === 'RED') {
    gross = 0;
    pl = fundType === 'Freebet' ? 0 : -numStake;
  } else if (status === 'HALF_RED') {
    gross = numStake / 2;
    pl = -numStake / 2;
  } else if (status === 'VOID') {
    gross = numStake;
    pl = 0;
  } else if (status === 'CASHOUT') {
    gross = numStake * 1.15;
    pl = gross - numStake;
  } else if (status === 'PENDENTE') {
    gross = numStake * numOdd;
    pl = gross - numStake;
  }

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const handleApplyUnit = (multiplier: number) => {
    setStake((safeUnitVal * multiplier).toFixed(2));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const finalMarket =
      customMarketText.trim() ||
      (sport === 'Futebol' ? `${activeMarket?.name}: ${selectedOption}` : 'Mercado Geral');

    const finalEvent =
      event.trim() || (sport === 'Futebol' ? `${activeMarket?.name || 'Aposta'}` : 'Entrada Avulsa');

    const now = new Date();
    const formattedDate = `Hoje, ${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}`;

    const resolvedBookmaker =
      bookmaker === 'Outra' ? customBookmaker.trim() || '1win' : bookmaker;

    try {
      localStorage.setItem('apex_last_bookmaker', resolvedBookmaker);
    } catch {
      // ignore storage quota errors
    }

    try {
      if (initialBet) {
        updateBet(initialBet.id, {
          type: fundType,
          bookmaker: resolvedBookmaker,
          sport,
          event: finalEvent,
          market: finalMarket,
          odd: numOdd,
          stake: numStake,
          status,
          gross,
          pl
        });
        onSuccessToast?.(`Aposta #${initialBet.id} atualizada com sucesso.`);
      } else {
        addBet({
          date: formattedDate,
          type: fundType,
          bookmaker: resolvedBookmaker,
          sport,
          event: finalEvent,
          market: finalMarket,
          odd: numOdd,
          stake: numStake,
          units: Number(units.toFixed(2)),
          status,
          gross,
          pl
        });
        onSuccessToast?.(`Nova aposta de R$ ${numStake.toFixed(2).replace('.', ',')} registrada (${resolvedBookmaker})!`);
      }
    } catch (err) {
      console.error('Falha ao registrar aposta:', err);
    }

    onClose();
  };

  const categoryCounts: Record<string, number> = {
    'Todos os Mercados': FOOTBALL_MARKETS.length
  };
  FOOTBALL_MARKETS.forEach((m) => {
    categoryCounts[m.category] = (categoryCounts[m.category] || 0) + 1;
  });

  const otherSportList = OTHER_SPORT_MARKETS[sport] || [];

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-md p-0 sm:p-4 lg:p-6 overflow-y-auto"
    >
      <div className="w-full max-w-4xl bg-[#0e1422] border-t sm:border border-white/[0.09] rounded-t-3xl sm:rounded-2xl p-4 sm:p-6 shadow-2xl flex flex-col gap-4 max-h-[94dvh] overflow-y-auto">
        <div className="w-10 h-1 bg-slate-700 rounded-full mx-auto sm:hidden shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.06] shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0">
              <span className="material-symbols-outlined text-[20px]">sports_soccer</span>
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-base text-white tracking-tight truncate">
                {initialBet ? `Editar Aposta #${initialBet.id}` : 'Registrar Nova Aposta'}
              </h3>
              <p className="text-xs text-slate-400 truncate">
                Catálogo completo de mercados e cálculo automático de P/L
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-white/[0.06] transition-colors shrink-0"
            aria-label="Fechar modal"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Form Body - 2-column layout on Desktop (lg), stacked on Mobile */}
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* LEFT COLUMN: Entry details, Stake, Odd, Status, Return */}
          <div className="lg:col-span-5 flex flex-col gap-3.5">
            {/* Tipo de Saldo (Real ou Freebet) */}
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#080c14] rounded-xl border border-white/[0.06]">
              <button
                type="button"
                onClick={() => setFundType('Saldo Real')}
                className={`py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
                  fundType === 'Saldo Real'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span className="material-symbols-outlined text-[15px]">account_balance_wallet</span>
                <span>Saldo Real</span>
              </button>
              <button
                type="button"
                onClick={() => setFundType('Freebet')}
                className={`py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
                  fundType === 'Freebet'
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                    : 'text-slate-400 hover:text-emerald-400'
                }`}
              >
                <span className="material-symbols-outlined text-[15px]">redeem</span>
                <span>Freebet</span>
              </button>
            </div>

            {/* Casa e Esporte */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-slate-400">
                  Casa de Apostas
                </label>
                <select
                  value={bookmaker}
                  onChange={(e) => setBookmaker(e.target.value)}
                  className="bg-[#080c14] border border-white/[0.08] text-white px-3 py-2.5 rounded-xl text-xs focus:outline-none focus:border-blue-500 transition-colors"
                >
                  {BOOKMAKERS.map((bk) => (
                    <option key={bk} value={bk} className="bg-[#0e1422] text-white">
                      {bk}
                    </option>
                  ))}
                  <option value="Outra" className="bg-[#0e1422] text-white">
                    Outra casa...
                  </option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-slate-400">
                  Esporte Principal
                </label>
                <select
                  value={sport}
                  onChange={(e) => {
                    const nextSport = e.target.value;
                    setSport(nextSport);
                    if (nextSport !== 'Futebol') {
                      const presets = OTHER_SPORT_MARKETS[nextSport];
                      if (presets && presets.length > 0) {
                        setCustomMarketText(presets[0]);
                      }
                    } else if (activeMarket) {
                      setCustomMarketText(`${activeMarket.name}: ${selectedOption}`);
                    }
                  }}
                  className="bg-[#080c14] border border-white/[0.08] text-white px-3 py-2.5 rounded-xl text-xs focus:outline-none focus:border-blue-500 transition-colors"
                >
                  {SPORTS_LIST.map((sp) => (
                    <option key={sp} value={sp} className="bg-[#0e1422] text-white">
                      {sp === 'Futebol' ? 'Futebol (Catálogo Completo)' : sp}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {bookmaker === 'Outra' && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-slate-400">
                  Nome da Casa de Apostas
                </label>
                <input
                  type="text"
                  value={customBookmaker}
                  onChange={(e) => setCustomBookmaker(e.target.value)}
                  placeholder="Digite o nome da casa..."
                  className="bg-[#080c14] border border-white/[0.08] text-white px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-blue-500 placeholder:text-slate-600"
                />
              </div>
            )}

            {/* Partida / Evento */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-slate-400">
                Evento / Partida
              </label>
              <input
                type="text"
                value={event}
                onChange={(e) => setEvent(e.target.value)}
                placeholder="Ex: Real Madrid vs Manchester City"
                className="bg-[#080c14] border border-white/[0.08] text-white px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-blue-500 placeholder:text-slate-600 transition-colors"
              />
            </div>

            {/* Odd e Stake */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-slate-400">
                  Odd Decimal
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={odd}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (/^[0-9]*[.,]?[0-9]*$/.test(val) || val === '') {
                      setOdd(val);
                    }
                  }}
                  placeholder="Ex: 1,90"
                  className="bg-[#080c14] border border-white/[0.08] text-white font-mono px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-blue-500 tabular-nums"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-slate-400">
                  Valor / Stake (R$)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={stake}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (/^[0-9]*[.,]?[0-9]*$/.test(val) || val === '') {
                      setStake(val);
                    }
                  }}
                  placeholder="Ex: 2,75"
                  className="bg-[#080c14] border border-white/[0.08] text-white font-mono px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-blue-500 tabular-nums"
                  required
                />
              </div>
            </div>

            {/* Atalhos de Unidades */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-slate-400">Atalhos de Unidade</span>
                <span className="font-mono text-blue-400 font-semibold tabular-nums">
                  {units.toFixed(2)}u
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleApplyUnit(0.5)}
                  className="py-2 bg-[#080c14] hover:bg-white/[0.06] border border-white/[0.08] rounded-xl text-xs font-mono text-slate-300 transition-colors"
                >
                  0.5u
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyUnit(1.0)}
                  className="py-2 bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 rounded-xl text-xs font-mono text-blue-400 font-bold transition-colors"
                >
                  1.0u
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyUnit(2.0)}
                  className="py-2 bg-[#080c14] hover:bg-white/[0.06] border border-white/[0.08] rounded-xl text-xs font-mono text-slate-300 transition-colors"
                >
                  2.0u
                </button>
              </div>
            </div>

            {/* Status selector */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-slate-400">
                Resultado / Status da Aposta
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as BetStatus)}
                className="bg-[#080c14] border border-white/[0.08] text-white px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-blue-500"
              >
                <option value="GREEN" className="bg-[#0e1422] text-white">GREEN (Ganho Total)</option>
                <option value="PENDENTE" className="bg-[#0e1422] text-white">AO VIVO / PENDENTE (Em Aberto)</option>
                <option value="RED" className="bg-[#0e1422] text-white">RED (Perdida)</option>
                <option value="HALF_GREEN" className="bg-[#0e1422] text-white">MEIO GREEN (50% Ganho)</option>
                <option value="HALF_RED" className="bg-[#0e1422] text-white">MEIO RED (50% Devolvido)</option>
                <option value="VOID" className="bg-[#0e1422] text-white">REEMBOLSO / VOID (Devolvida)</option>
                <option value="CASHOUT" className="bg-[#0e1422] text-white">CASHOUT (Encerrada)</option>
              </select>
            </div>

            {/* Resumo do Retorno */}
            <div className="p-3.5 rounded-xl bg-[#080c14] border border-white/[0.07] flex items-center justify-between gap-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-[11px] text-slate-400">Retorno Bruto</span>
                <span className="font-mono text-sm sm:text-base font-bold text-white tabular-nums">
                  {formatBRL(gross)}
                </span>
              </div>
              <div className="flex flex-col text-right gap-0.5">
                <span className="text-[11px] text-slate-400">
                  {status === 'PENDENTE' ? 'Lucro Potencial' : 'Resultado Líquido'}
                </span>
                <span
                  className={`font-mono text-sm sm:text-base font-bold tabular-nums ${
                    pl > 0 ? 'text-emerald-400' : pl < 0 ? 'text-rose-400' : 'text-slate-300'
                  }`}
                >
                  {pl > 0 ? '+' : ''}
                  {formatBRL(pl)} ({pl >= 0 ? '+' : ''}
                  {(pl / safeUnitVal).toFixed(2)}u)
                </span>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Full Market Explorer */}
          <div className="lg:col-span-7 flex flex-col gap-3.5">
            {sport === 'Futebol' ? (
              <div className="p-4 bg-[#080c14] border border-white/[0.07] rounded-2xl flex flex-col gap-3.5">
                {/* Title + Global Search */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <span className="text-xs font-bold text-white flex items-center gap-2 shrink-0">
                    <span className="material-symbols-outlined text-[16px] text-blue-400">
                      sports_soccer
                    </span>
                    <span>Mercados de Futebol ({filteredFootballMarkets.length})</span>
                  </span>
                  <div className="relative flex-1 sm:max-w-[260px]">
                    <span className="material-symbols-outlined text-[15px] text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2">
                      search
                    </span>
                    <input
                      type="text"
                      value={marketSearch}
                      onChange={(e) => setMarketSearch(e.target.value)}
                      placeholder="Buscar qualquer mercado (ex: cartões, escanteios)..."
                      className="w-full bg-[#0e1422] border border-white/[0.08] text-white pl-8 pr-7 py-1.5 rounded-lg text-xs focus:outline-none focus:border-blue-500 placeholder:text-slate-500"
                    />
                    {marketSearch && (
                      <button
                        type="button"
                        onClick={() => setMarketSearch('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                        title="Limpar busca"
                      >
                        <span className="material-symbols-outlined text-[14px]">close</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* 1. Categorias de Mercado - Wrap completo para todas ficarem visíveis no desktop */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {FOOTBALL_CATEGORIES.map((cat) => {
                    const isSelected = selectedCategory === cat && !searchClean;
                    const count = categoryCounts[cat] || 0;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => {
                          setMarketSearch('');
                          setSelectedCategory(cat);
                          const firstInCat = FOOTBALL_MARKETS.find(
                            (m) => cat === 'Todos os Mercados' || m.category === cat
                          );
                          if (firstInCat) {
                            handleMarketChange(firstInCat.id);
                          }
                        }}
                        className={`px-2.5 py-1.5 text-[11px] font-medium rounded-lg whitespace-nowrap transition-all flex items-center gap-1 ${
                          isSelected
                            ? 'bg-blue-600 text-white font-semibold shadow-sm shadow-blue-600/30'
                            : 'bg-[#0e1422] text-slate-300 hover:text-white hover:bg-slate-800/80 border border-white/[0.07]'
                        }`}
                      >
                        <span>{cat}</span>
                        <span
                          className={`text-[10px] font-mono ${
                            isSelected ? 'text-blue-100' : 'text-slate-500'
                          }`}
                        >
                          ({count})
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* 2. Lista Interativa Visível de Mercados */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>
                      {searchClean
                        ? `Resultados da busca (${filteredFootballMarkets.length}):`
                        : `Mercados em "${selectedCategory}" (${filteredFootballMarkets.length}):`}
                    </span>
                  </div>

                  {filteredFootballMarkets.length === 0 ? (
                    <div className="p-4 rounded-xl bg-[#0e1422] border border-white/[0.06] text-center text-xs text-slate-400">
                      Nenhum mercado encontrado para &ldquo;{marketSearch}&rdquo;.{' '}
                      <button
                        type="button"
                        onClick={() => setMarketSearch('')}
                        className="text-blue-400 hover:underline font-semibold ml-1"
                      >
                        Limpar busca
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-44 overflow-y-auto p-1.5 bg-[#0e1422] border border-white/[0.06] rounded-xl">
                      {filteredFootballMarkets.map((m) => {
                        const isCurrent = activeMarket?.id === m.id;
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => handleMarketChange(m.id)}
                            className={`text-left px-3 py-2 rounded-lg text-xs transition-all flex flex-col gap-0.5 ${
                              isCurrent
                                ? 'bg-blue-600/20 border border-blue-500/50 text-white font-semibold'
                                : 'bg-[#080c14] hover:bg-white/[0.05] border border-white/[0.05] text-slate-300'
                            }`}
                          >
                            <span className="truncate leading-snug">{m.name}</span>
                            <span className="text-[10px] text-slate-400 truncate">
                              {m.category} · {m.selections.length} linhas
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 3. Seleção / Opção do Mercado */}
                {activeMarket && activeMarket.selections.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-medium text-slate-400">
                      Linha / Seleção em <strong className="text-slate-200">{activeMarket.name}</strong>:
                    </label>
                    <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2 bg-[#0e1422] border border-white/[0.06] rounded-xl">
                      {activeMarket.selections.map((sel) => {
                        const isSel = selectedOption === sel;
                        return (
                          <button
                            key={sel}
                            type="button"
                            onClick={() => handleOptionChange(sel)}
                            className={`px-2.5 py-1.5 rounded-lg text-xs transition-all flex items-center gap-1 ${
                              isSel
                                ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm shadow-emerald-500/20'
                                : 'bg-[#080c14] text-slate-300 hover:bg-white/[0.06] border border-white/[0.06]'
                            }`}
                          >
                            {isSel && (
                              <span className="material-symbols-outlined text-[14px]">check</span>
                            )}
                            <span>{sel}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 4. Campo de confirmação ou personalização livre */}
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-medium text-slate-400">
                    Resumo Final do Mercado (editável para adicionar jogador/time):
                  </label>
                  <input
                    type="text"
                    value={customMarketText}
                    onChange={(e) => setCustomMarketText(e.target.value)}
                    placeholder="Ex: Total de Gols FT: Mais de 2.5 Gols (Over 2.5)"
                    className="bg-[#0e1422] border border-emerald-500/30 text-emerald-400 font-medium px-3.5 py-2 rounded-xl text-xs focus:outline-none focus:border-emerald-400"
                  />
                </div>
              </div>
            ) : (
              <div className="p-4 bg-[#080c14] border border-white/[0.07] rounded-2xl flex flex-col gap-3.5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold text-slate-400">
                    Mercados Populares — {sport}
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {otherSportList.map((preset) => {
                      const isSel = customMarketText === preset;
                      return (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setCustomMarketText(preset)}
                          className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
                            isSel
                              ? 'bg-emerald-500 text-slate-950 font-bold'
                              : 'bg-[#0e1422] text-slate-300 hover:bg-white/[0.06] border border-white/[0.06]'
                          }`}
                        >
                          {preset}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold text-slate-400">
                    Mercado & Seleção Personalizada
                  </label>
                  <input
                    type="text"
                    value={customMarketText}
                    onChange={(e) => setCustomMarketText(e.target.value)}
                    placeholder="Ex: Vencedor da Partida / Moneyline ou Handicap"
                    className="bg-[#0e1422] border border-white/[0.08] text-white px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-blue-500 placeholder:text-slate-600"
                  />
                </div>
              </div>
            )}

            {/* Botões de Ação */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-xs font-semibold text-slate-400 hover:text-white rounded-xl hover:bg-white/[0.05] transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs rounded-xl transition-all flex items-center gap-1.5 shadow-lg shadow-blue-600/25 active:scale-95"
              >
                <span className="material-symbols-outlined text-[16px]">check</span>
                <span>{initialBet ? 'Salvar Alterações' : 'Confirmar Aposta'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
