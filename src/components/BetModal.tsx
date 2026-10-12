import React, { useState, useEffect } from 'react';
import { BetEntry, BetFundType, BetStatus } from '../types';
import { useBankroll } from '../context/BankrollContext';
import { FOOTBALL_MARKETS, FOOTBALL_CATEGORIES } from '../data/footballMarkets';

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

  const [fundType, setFundType] = useState<BetFundType>('Saldo Real');
  const [bookmaker, setBookmaker] = useState('Bet365');
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

  // Filter football markets by selected category and optional search
  const filteredFootballMarkets = FOOTBALL_MARKETS.filter((m) => {
    const matchesCategory = selectedCategory === 'Todos os Mercados' || m.category === selectedCategory;
    const matchesSearch =
      !marketSearch.trim() ||
      m.name.toLowerCase().includes(marketSearch.toLowerCase()) ||
      m.category.toLowerCase().includes(marketSearch.toLowerCase()) ||
      m.selections.some((s) => s.toLowerCase().includes(marketSearch.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const activeMarket =
    filteredFootballMarkets.find((m) => m.id === selectedMarketId) ||
    FOOTBALL_MARKETS.find((m) => m.id === selectedMarketId) ||
    FOOTBALL_MARKETS[0];

  useEffect(() => {
    if (initialBet) {
      setFundType(initialBet.type);
      setBookmaker(initialBet.bookmaker || 'Bet365');
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
      setBookmaker('Bet365');
      setSport('Futebol');
      setEvent('');
      setMarketSearch('');
      setSelectedCategory('Todos os Mercados');
      setSelectedMarketId('gols-over-under');
      setSelectedOption('Mais de 2.5 Gols (Over 2.5)');
      setCustomMarketText('Total de Gols FT: Mais de 2.5 Gols (Over 2.5)');
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

    const finalEvent = event.trim() || (sport === 'Futebol' ? `${activeMarket?.name || 'Aposta'}` : 'Entrada Avulsa');

    const now = new Date();
    const formattedDate = `Hoje, ${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}`;

    try {
      if (initialBet) {
        updateBet(initialBet.id, {
          type: fundType,
          bookmaker,
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
          bookmaker,
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
        onSuccessToast?.(`Nova aposta de R$ ${numStake.toFixed(2).replace('.', ',')} registrada!`);
      }
    } catch (err) {
      console.error('Falha ao registrar aposta:', err);
    }

    onClose();
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-md p-0 sm:p-4 overflow-y-auto"
    >
      <div className="w-full max-w-2xl bg-[#0e1422] border-t sm:border border-white/[0.09] rounded-t-3xl sm:rounded-2xl p-4 sm:p-6 shadow-2xl flex flex-col gap-4 sm:gap-5 max-h-[92dvh] overflow-y-auto">
        <div className="w-10 h-1 bg-slate-700 rounded-full mx-auto sm:hidden shrink-0" />
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/20">
              <span className="material-symbols-outlined text-[20px]">sports_soccer</span>
            </div>
            <div>
              <h3 className="font-bold text-base text-white tracking-tight">
                {initialBet ? `Editar Aposta #${initialBet.id}` : 'Registrar Nova Aposta'}
              </h3>
              <p className="text-xs text-slate-400">
                Catálogo completo de mercados de Futebol e cálculo de P/L em tempo real
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-white/[0.06] transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Tipo de Saldo (Real ou Freebet) */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#080c14] rounded-xl border border-white/[0.06]">
          <button
            type="button"
            onClick={() => setFundType('Saldo Real')}
            className={`py-2.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${
              fundType === 'Saldo Real'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">account_balance_wallet</span>
            Saldo Real (Banca)
          </button>
          <button
            type="button"
            onClick={() => setFundType('Freebet')}
            className={`py-2.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${
              fundType === 'Freebet'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-emerald-400'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">redeem</span>
            Freebet (Aposta Grátis)
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Casa e Esporte */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Casa de Apostas
              </label>
              <select
                value={bookmaker}
                onChange={(e) => setBookmaker(e.target.value)}
                className="bg-[#080c14] border border-white/[0.08] text-white px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-blue-500 transition-colors"
              >
                <option value="Bet365">Bet365</option>
                <option value="Betano">Betano</option>
                <option value="Pinnacle">Pinnacle</option>
                <option value="Betfair">Betfair</option>
                <option value="Stake">Stake</option>
                <option value="Superbet">Superbet</option>
                <option value="Novibet">Novibet</option>
                <option value="KTO">KTO</option>
                <option value="EstrelaBet">EstrelaBet</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Esporte Principal
              </label>
              <select
                value={sport}
                onChange={(e) => setSport(e.target.value)}
                className="bg-[#080c14] border border-white/[0.08] text-white px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-blue-500 transition-colors"
              >
                <option value="Futebol">⚽ Futebol (Catálogo Completo)</option>
                <option value="Basquete">🏀 Basquete</option>
                <option value="Tênis">🎾 Tênis</option>
                <option value="MMA / eSports">🎮 MMA / eSports</option>
              </select>
            </div>
          </div>

          {/* Partida / Evento */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Evento / Partida
            </label>
            <input
              type="text"
              value={event}
              onChange={(e) => setEvent(e.target.value)}
              placeholder="Ex: Real Madrid vs Manchester City (ou deixe em branco)"
              className="bg-[#080c14] border border-white/[0.08] text-white px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-blue-500 placeholder:text-slate-600 transition-colors"
            />
          </div>

          {/* SELEÇÃO ESPECIALIZADA DE MERCADOS DE FUTEBOL */}
          {sport === 'Futebol' ? (
            <div className="p-4 bg-[#080c14] border border-white/[0.07] rounded-2xl flex flex-col gap-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-blue-400">
                    sports_soccer
                  </span>
                  Mercados & Seleções de Futebol
                </span>
                <div className="relative flex-1 max-w-[220px]">
                  <span className="material-symbols-outlined text-[15px] text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2">
                    search
                  </span>
                  <input
                    type="text"
                    value={marketSearch}
                    onChange={(e) => setMarketSearch(e.target.value)}
                    placeholder="Buscar mercado (ex: escanteios, BTTS)..."
                    className="w-full bg-[#0e1422] border border-white/[0.07] text-white pl-8 pr-2.5 py-1.5 rounded-lg text-[11px] focus:outline-none focus:border-blue-500 placeholder:text-slate-500"
                  />
                </div>
              </div>

              {/* 1. Categorias de Mercado */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {FOOTBALL_CATEGORIES.map((cat) => {
                  const isSelected = selectedCategory === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        setSelectedCategory(cat);
                        const firstInCat = FOOTBALL_MARKETS.find(
                          (m) => cat === 'Todos os Mercados' || m.category === cat
                        );
                        if (firstInCat) {
                          handleMarketChange(firstInCat.id);
                        }
                      }}
                      className={`px-3 py-1.5 text-[11px] font-medium rounded-lg whitespace-nowrap transition-all ${
                        isSelected
                          ? 'bg-blue-600 text-white font-semibold shadow-sm shadow-blue-600/30'
                          : 'bg-[#0e1422] text-slate-400 hover:text-white border border-white/[0.06]'
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>

              {/* 2. Seleção do Mercado */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-medium text-slate-400">
                  Mercado ({filteredFootballMarkets.length} disponíveis):
                </label>
                <select
                  value={activeMarket?.id || selectedMarketId}
                  onChange={(e) => handleMarketChange(e.target.value)}
                  className="bg-[#0e1422] border border-white/[0.08] text-white px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-blue-500"
                >
                  {filteredFootballMarkets.map((m) => (
                    <option key={m.id} value={m.id}>
                      [{m.category}] {m.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 3. Seleção / Opção do Mercado */}
              {activeMarket && activeMarket.selections.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-medium text-slate-400">
                    Linha / Seleção do Mercado:
                  </label>
                  <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto p-2 bg-[#0e1422] border border-white/[0.06] rounded-xl">
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
                  Resumo do Mercado & Seleção (editável para adicionar nome de jogador ou equipe):
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
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Mercado & Seleção
              </label>
              <input
                type="text"
                value={customMarketText}
                onChange={(e) => setCustomMarketText(e.target.value)}
                placeholder="Ex: Vencedor da Partida / Moneyline ou Handicap"
                className="bg-[#080c14] border border-white/[0.08] text-white px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-blue-500 placeholder:text-slate-600"
              />
            </div>
          )}

          {/* Odd e Stake */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
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
                className="bg-[#080c14] border border-white/[0.08] text-white font-mono px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-blue-500"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
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
                className="bg-[#080c14] border border-white/[0.08] text-white font-mono px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-blue-500"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Unidades ({units.toFixed(2)}u)
              </label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleApplyUnit(0.5)}
                  className="flex-1 py-2.5 bg-[#080c14] hover:bg-white/[0.06] border border-white/[0.08] rounded-xl text-xs font-mono text-slate-300 transition-colors"
                >
                  0.5u
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyUnit(1.0)}
                  className="flex-1 py-2.5 bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 rounded-xl text-xs font-mono text-blue-400 font-bold transition-colors"
                >
                  1.0u
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyUnit(2.0)}
                  className="flex-1 py-2.5 bg-[#080c14] hover:bg-white/[0.06] border border-white/[0.08] rounded-xl text-xs font-mono text-slate-300 transition-colors"
                >
                  2.0u
                </button>
              </div>
            </div>
          </div>

          {/* Status selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Resultado / Status da Aposta
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as BetStatus)}
              className="bg-[#080c14] border border-white/[0.08] text-white px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-blue-500"
            >
              <option value="GREEN">GREEN (Ganho Total)</option>
              <option value="PENDENTE">PENDENTE (Em Aberto)</option>
              <option value="RED">RED (Perdida)</option>
              <option value="HALF_GREEN">MEIO GREEN (50% Ganho)</option>
              <option value="HALF_RED">MEIO RED (50% Devolvido)</option>
              <option value="VOID">REEMBOLSO / VOID (Devolvida)</option>
              <option value="CASHOUT">CASHOUT (Encerrada)</option>
            </select>
          </div>

          {/* Resumo do Retorno */}
          <div className="p-4 rounded-xl bg-[#080c14] border border-white/[0.07] flex items-center justify-between">
            <div className="flex flex-col gap-0.5">
              <span className="text-[11px] text-slate-400">Retorno Bruto Estimado</span>
              <span className="font-mono text-base font-bold text-white">{formatBRL(gross)}</span>
            </div>
            <div className="flex flex-col text-right gap-0.5">
              <span className="text-[11px] text-slate-400">
                {status === 'PENDENTE' ? 'Lucro Potencial Líquido' : 'Resultado Líquido (P/L)'}
              </span>
              <span
                className={`font-mono text-base font-bold ${
                  pl > 0 ? 'text-emerald-400' : pl < 0 ? 'text-rose-400' : 'text-slate-300'
                }`}
              >
                {pl > 0 ? '+' : ''}
                {formatBRL(pl)} ({pl >= 0 ? '+' : ''}
                {(pl / safeUnitVal).toFixed(2)}u)
              </span>
            </div>
          </div>

          {/* Botões */}
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
              {initialBet ? 'Salvar Alterações' : 'Confirmar Aposta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
