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
import { BookmakerSelector } from './BookmakerLogo';
import { MatchCrests } from './TeamCrests';
import {
  COMPETITION_PRESET_GROUPS,
  looksLikeBetLinkInput,
  matchFootballCatalogMarket,
  parseBetLink,
  ParsedBetLinkResult,
  POPULAR_COMPETITION_PRESETS,
  splitEventAndInlineMarket
} from '../lib/betLinkParser';
import { calculateBetPreview } from '../lib/financialEngine';

interface BetModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialBet?: BetEntry | null;
  initialShareInput?: string | null;
  onSuccessToast?: (msg: string) => void;
}

export const BetModal: React.FC<BetModalProps> = ({
  isOpen,
  onClose,
  initialBet,
  initialShareInput,
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
  const [cashoutReturnInput, setCashoutReturnInput] = useState('');
  const [cashoutError, setCashoutError] = useState<string | null>(null);

  // Shared bet link importer state
  const [shareLinkInput, setShareLinkInput] = useState('');
  const [isParsingLink, setIsParsingLink] = useState(false);
  const [linkParseError, setLinkParseError] = useState<string | null>(null);
  const [importedResult, setImportedResult] = useState<ParsedBetLinkResult | null>(null);
  const [autoMatchedHint, setAutoMatchedHint] = useState<string | null>(null);
  const [inlineDetectedMarket, setInlineDetectedMarket] = useState<{
    cleanEvent: string;
    label: string;
  } | null>(null);
  const [manualMarketOverride, setManualMarketOverride] = useState(false);

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
      setCashoutReturnInput(
        initialBet.status === 'CASHOUT'
          ? String(initialBet.cashoutReturn ?? initialBet.gross ?? '')
          : ''
      );
      setCashoutError(null);
      setMarketSearch('');
      setManualMarketOverride(true);
      setInlineDetectedMarket(null);

      if (initialBet.sport === 'Futebol') {
        const matched =
          matchFootballCatalogMarket(initialBet.market, initialBet.event) ||
          (() => {
            const byName = FOOTBALL_MARKETS.find((m) => initialBet.market.includes(m.name));
            return byName ? { market: byName, selection: undefined } : null;
          })();
        if (matched) {
          setSelectedCategory(matched.market.category);
          setSelectedMarketId(matched.market.id);
          if (matched.selection) {
            setSelectedOption(matched.selection);
          } else {
            const exactOpt = matched.market.selections.find((s) =>
              initialBet.market.toLowerCase().includes(s.toLowerCase())
            );
            if (exactOpt) setSelectedOption(exactOpt);
          }
          setAutoMatchedHint(
            matched.selection
              ? `${matched.market.name} → ${matched.selection}`
              : matched.market.name
          );
        } else {
          setAutoMatchedHint(null);
        }
      } else {
        setAutoMatchedHint(null);
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
      setCashoutReturnInput('');
      setCashoutError(null);
      setShareLinkInput(initialShareInput || '');
      setLinkParseError(null);
      setImportedResult(null);
      setAutoMatchedHint(null);
      setInlineDetectedMarket(null);
      setManualMarketOverride(false);
    }
  }, [initialBet, initialShareInput, isOpen, settings.unitValue]);

  const syncFootballCatalogFromText = (
    rawMarket: string,
    rawEvent: string,
    options?: { updateSummaryText?: boolean; isMultiple?: boolean }
  ): boolean => {
    const catalogHit = matchFootballCatalogMarket(rawMarket, rawEvent);
    if (!catalogHit) return false;

    setMarketSearch('');
    setSelectedCategory(catalogHit.market.category);
    setSelectedMarketId(catalogHit.market.id);
    const resolvedSelection =
      catalogHit.selection || catalogHit.market.selections[0] || '';
    if (resolvedSelection) {
      setSelectedOption(resolvedSelection);
    }

    if (options?.updateSummaryText && !options.isMultiple && catalogHit.selection) {
      setCustomMarketText(`${catalogHit.market.name}: ${catalogHit.selection}`);
    }

    setAutoMatchedHint(
      catalogHit.selection
        ? `${catalogHit.market.name} → ${catalogHit.selection}`
        : catalogHit.market.name
    );
    return true;
  };

  const applyParsedBet = (parsed: ParsedBetLinkResult) => {
    setImportedResult(parsed);
    setLinkParseError(null);
    setMarketSearch('');
    setInlineDetectedMarket(null);

    if (parsed.bookmaker) {
      if ((BOOKMAKERS as readonly string[]).includes(parsed.bookmaker)) {
        setBookmaker(parsed.bookmaker);
        setCustomBookmaker('');
      } else {
        setBookmaker('Outra');
        setCustomBookmaker(parsed.bookmaker);
      }
    }

    const validSport = (SPORTS_LIST as readonly string[]).includes(parsed.sport)
      ? parsed.sport
      : 'Futebol';
    setSport(validSport);

    const { eventPart: splitEv, marketPart: splitMkt } = splitEventAndInlineMarket(parsed.event || '');
    const effectiveEvent = parsed.isMultiple ? parsed.event : splitEv || parsed.event;
    if (effectiveEvent) {
      setEvent(effectiveEvent);
    }

    const firstLegMarket =
      parsed.legs[0]
        ? `${parsed.legs[0].marketGroup}: ${parsed.legs[0].selection}`.trim()
        : '';
    const candidateMarket = parsed.market || splitMkt || firstLegMarket;

    if (candidateMarket) {
      setCustomMarketText(candidateMarket);
      if (validSport === 'Futebol') {
        const hit =
          syncFootballCatalogFromText(candidateMarket, effectiveEvent, {
            updateSummaryText: !parsed.isMultiple,
            isMultiple: parsed.isMultiple
          }) ||
          (firstLegMarket &&
            syncFootballCatalogFromText(firstLegMarket, effectiveEvent, {
              updateSummaryText: !parsed.isMultiple,
              isMultiple: parsed.isMultiple
            }));
        if (!hit) {
          setAutoMatchedHint(null);
        } else {
          setManualMarketOverride(false);
        }
      }
    }

    if (parsed.odd && parsed.odd > 1) {
      setOdd(parsed.odd.toFixed(2));
    }

    const unitBase = settings.unitValue > 0 ? settings.unitValue : 25;
    if (parsed.stake !== null && parsed.stake > 0) {
      setStake(parsed.stake.toFixed(2));
    } else if (parsed.units && parsed.units > 0) {
      setStake((parsed.units * unitBase).toFixed(2));
    }

    setStatus(parsed.status || 'PENDENTE');
  };

  const handleEventInputChange = (nextEvent: string) => {
    setEvent(nextEvent);
    if (sport !== 'Futebol') {
      setInlineDetectedMarket(null);
      return;
    }

    const { eventPart, marketPart } = splitEventAndInlineMarket(nextEvent);
    if (!marketPart) {
      setInlineDetectedMarket(null);
      return;
    }

    const catalogHit = matchFootballCatalogMarket(marketPart, eventPart);
    if (catalogHit) {
      const resolvedSelection = catalogHit.selection || catalogHit.market.selections[0] || '';
      const label = catalogHit.selection
        ? `${catalogHit.market.name} → ${catalogHit.selection}`
        : catalogHit.market.name;
      setInlineDetectedMarket({ cleanEvent: eventPart, label });

      setMarketSearch('');
      setSelectedCategory(catalogHit.market.category);
      setSelectedMarketId(catalogHit.market.id);
      if (resolvedSelection) setSelectedOption(resolvedSelection);
      setAutoMatchedHint(label);

      if (!manualMarketOverride) {
        setCustomMarketText(
          catalogHit.selection
            ? `${catalogHit.market.name}: ${catalogHit.selection}`
            : marketPart
        );
      }
    } else {
      setInlineDetectedMarket(null);
    }
  };

  const handleCustomMarketChange = (nextVal: string) => {
    setCustomMarketText(nextVal);
    setManualMarketOverride(true);
    if (sport === 'Futebol') {
      const hit = matchFootballCatalogMarket(nextVal, event);
      if (hit) {
        setMarketSearch('');
        setSelectedCategory(hit.market.category);
        setSelectedMarketId(hit.market.id);
        if (hit.selection) {
          setSelectedOption(hit.selection);
        }
        setAutoMatchedHint(
          hit.selection ? `${hit.market.name} → ${hit.selection}` : hit.market.name
        );
      } else {
        setAutoMatchedHint(null);
      }
    }
  };

  const handleImportBetLink = async (overrideInput?: string) => {
    const raw = (overrideInput ?? shareLinkInput).trim();
    if (!raw) {
      setLinkParseError('Cole o link ou código da aposta primeiro.');
      return;
    }

    setIsParsingLink(true);
    setLinkParseError(null);
    setImportedResult(null);

    try {
      const parsed = await parseBetLink(raw);
      applyParsedBet(parsed);
      onSuccessToast?.(
        parsed.isMultiple
          ? `Múltipla (${parsed.selectionsCount} seleções) importada da ${parsed.bookmaker || 'casa'}!`
          : `Aposta identificada: ${parsed.event || parsed.market || parsed.bookmaker || 'Pronta para conferir'}!`
      );
    } catch (err) {
      setLinkParseError(
        err instanceof Error
          ? err.message
          : 'Não foi possível identificar a aposta por esse link.'
      );
    } finally {
      setIsParsingLink(false);
    }
  };

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && text.trim()) {
        setShareLinkInput(text.trim());
        await handleImportBetLink(text.trim());
      } else {
        setLinkParseError('Sua área de transferência está vazia.');
      }
    } catch {
      setLinkParseError('Permita acesso à área de transferência ou cole o link manualmente no campo.');
    }
  };

  useEffect(() => {
    if (isOpen && !initialBet && initialShareInput && initialShareInput.trim()) {
      void handleImportBetLink(initialShareInput.trim());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialBet, initialShareInput]);

  const handleMarketChange = (marketId: string) => {
    setManualMarketOverride(true);
    setAutoMatchedHint(null);
    setSelectedMarketId(marketId);
    const m = FOOTBALL_MARKETS.find((item) => item.id === marketId);
    if (m && m.selections.length > 0) {
      const firstOpt = m.selections[0];
      setSelectedOption(firstOpt);
      setCustomMarketText(`${m.name}: ${firstOpt}`);
    }
  };

  const handleOptionChange = (opt: string) => {
    setManualMarketOverride(true);
    setAutoMatchedHint(null);
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

  const parseOptionalLocaleNumber = (val: string): number | null => {
    const clean = String(val ?? '').trim().replace(',', '.');
    if (!clean) return null;
    const parsed = Number(clean);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const numStake = parseLocaleNumber(stake);
  const numOdd = Math.max(1, parseLocaleNumber(odd) || 1.0);
  const safeUnitVal = settings.unitValue > 0 ? settings.unitValue : 25;
  const units = numStake / safeUnitVal;

  const parsedCashoutReturn = parseOptionalLocaleNumber(cashoutReturnInput);
  const preview = calculateBetPreview({
    stake: numStake,
    odd: numOdd,
    status,
    type: fundType,
    cashoutReturnInput: parsedCashoutReturn
  });

  const displayGross = status === 'PENDENTE' ? preview.potentialGross : preview.gross;
  const displayPl = status === 'PENDENTE' ? preview.potentialPl : preview.pl;

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const handleApplyUnit = (multiplier: number) => {
    setStake((safeUnitVal * multiplier).toFixed(2));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (status === 'CASHOUT' && !preview.cashoutValid) {
      setCashoutError(
        'Informe o valor efetivamente recebido no Cashout (ex: 65,00).'
      );
      return;
    }
    setCashoutError(null);

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
      const persistedGross = status === 'PENDENTE' ? 0 : preview.gross;
      const persistedPl = status === 'PENDENTE' ? 0 : preview.pl;
      const resolvedCashout =
        status === 'CASHOUT' ? preview.cashoutReturn : undefined;

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
          gross: persistedGross,
          pl: persistedPl,
          cashoutReturn: resolvedCashout
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
          gross: persistedGross,
          pl: persistedPl,
          ...(resolvedCashout !== undefined ? { cashoutReturn: resolvedCashout } : {})
        });
        onSuccessToast?.(
          `Nova aposta de R$ ${numStake.toFixed(2).replace('.', ',')} registrada (${resolvedBookmaker} · ${fundType})!`
        );
      }
      onClose();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Falha ao registrar aposta.';
      setCashoutError(msg);
      console.error('Falha ao registrar aposta:', err);
    }
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
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-0 sm:p-4 lg:p-6 overflow-y-auto"
    >
      <div className="w-full max-w-4xl bg-white border-t sm:border border-slate-300 rounded-t-3xl sm:rounded-2xl p-4 sm:p-6 shadow-[0_24px_56px_-12px_rgba(15,23,42,0.28),0_8px_24px_-4px_rgba(15,23,42,0.12)] flex flex-col gap-4 max-h-[94dvh] overflow-y-auto">
        <div className="w-10 h-1 bg-slate-400 rounded-full mx-auto sm:hidden shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-300/80 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-sm shadow-blue-600/20 shrink-0">
              <span className="material-symbols-outlined text-[20px]">sports_soccer</span>
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-base text-slate-900 tracking-tight truncate">
                {initialBet ? `Editar Aposta #${initialBet.id}` : 'Registrar Nova Aposta'}
              </h3>
              <p className="text-xs text-slate-600 truncate">
                Catálogo completo de mercados e cálculo automático de P/L
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-600 hover:text-slate-900 p-1.5 rounded-xl hover:bg-slate-100 transition-colors shrink-0"
            aria-label="Fechar modal"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Quick Import by Shared Bet Link */}
        {!initialBet && (
          <div className="p-3.5 rounded-2xl bg-slate-50/90 border border-blue-300 flex flex-col gap-2.5 shrink-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[16px]">link</span>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 leading-tight">
                    Importar Aposta por Link ou Texto da Tip
                  </p>
                  <p className="text-[11px] text-slate-600 truncate">
                    Cole o link da casa (1win) ou a mensagem completa com liga, jogo e mercado
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handlePasteFromClipboard}
                disabled={isParsingLink}
                className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 hover:border-slate-400 text-[11px] font-semibold text-slate-700 flex items-center gap-1 transition-colors disabled:opacity-50 shrink-0"
              >
                <span className="material-symbols-outlined text-[14px]">content_paste</span>
                <span>Colar e Ler</span>
              </button>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-end">
              <div className="relative flex-1">
                <textarea
                  rows={3}
                  value={shareLinkInput}
                  onChange={(e) => setShareLinkInput(e.target.value)}
                  onPaste={(e) => {
                    const pasted = e.clipboardData.getData('text');
                    if (pasted && looksLikeBetLinkInput(pasted)) {
                      e.preventDefault();
                      const trimmed = pasted.trim();
                      setShareLinkInput(trimmed);
                      void handleImportBetLink(trimmed);
                    }
                  }}
                  onKeyDown={(e) => {
                    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                      e.preventDefault();
                      void handleImportBetLink();
                    }
                  }}
                  placeholder={`Cole o link ou a tip em múltiplas linhas, ex:\nLiga Jupiler 🇧🇪 - 16:45\nMechelen x Club Brugge\nBTTS e Over 2.5 Gols @1.80 (1 un)`}
                  className="w-full bg-white border border-slate-300 hover:border-slate-400 text-slate-900 pl-3.5 pr-8 py-2 rounded-xl text-xs focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15 placeholder:text-slate-500 font-mono resize-y leading-relaxed"
                />
                {shareLinkInput && (
                  <button
                    type="button"
                    onClick={() => {
                      setShareLinkInput('');
                      setLinkParseError(null);
                      setImportedResult(null);
                    }}
                    className="absolute right-2.5 top-2.5 text-slate-600 hover:text-slate-900"
                    aria-label="Limpar texto"
                  >
                    <span className="material-symbols-outlined text-[15px]">close</span>
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => void handleImportBetLink()}
                disabled={isParsingLink || !shareLinkInput.trim()}
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all whitespace-nowrap shrink-0 shadow-sm shadow-blue-600/20"
              >
                <span
                  className={`material-symbols-outlined text-[16px] ${
                    isParsingLink ? 'animate-spin' : ''
                  }`}
                >
                  {isParsingLink ? 'progress_activity' : 'auto_awesome'}
                </span>
                <span>{isParsingLink ? 'Identificando...' : 'Identificar Aposta'}</span>
              </button>
            </div>

            {linkParseError && (
              <div className="px-3 py-2 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-[11px] font-medium flex items-start gap-2">
                <span className="material-symbols-outlined text-[15px] shrink-0 mt-0.5">
                  error_outline
                </span>
                <span>{linkParseError}</span>
              </div>
            )}

            {importedResult && (
              <div className="px-3 py-2.5 rounded-xl bg-emerald-50 border border-emerald-300 text-xs flex flex-col gap-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-emerald-800 font-semibold">
                    <span className="material-symbols-outlined text-[16px]">check_circle</span>
                    <span>
                      {(importedResult.bookmaker || (bookmaker === 'Outra' ? customBookmaker || 'Casa' : bookmaker))} · {importedResult.sport}
                      {importedResult.tournament ? ` · ${importedResult.tournament}` : ''}
                      {importedResult.isMultiple
                        ? ` · Múltipla (${importedResult.selectionsCount} seleções)`
                        : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {importedResult.odd && (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-700 text-white font-mono text-[11px] font-bold">
                        Odd {importedResult.odd.toFixed(2)}
                      </span>
                    )}
                    {importedResult.units && (
                      <span className="px-2 py-0.5 rounded-md bg-blue-600 text-white font-mono text-[11px] font-bold">
                        {importedResult.units}u
                      </span>
                    )}
                  </div>
                </div>

                {importedResult.legs.length > 0 && (
                  <div className="flex flex-col gap-1.5 text-[11px] text-slate-800 max-h-60 overflow-y-auto overscroll-contain pr-1">
                    {importedResult.legs.map((leg, i) => {
                      const marketText =
                        leg.selection && leg.selection !== leg.marketGroup
                          ? `${leg.marketGroup}: ${leg.selection}`
                          : leg.marketGroup;
                      return (
                        <div
                          key={`${leg.matchId || i}-${i}`}
                          className="flex items-center justify-between gap-2.5 bg-white border border-slate-300/80 px-3 py-2 rounded-xl shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
                        >
                          <div className="min-w-0 flex-1 flex items-center gap-2.5">
                            <MatchCrests
                              event={leg.event}
                              sport={leg.sport || importedResult.sport}
                              size="sm"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="font-semibold text-slate-900 truncate">
                                {leg.event}
                                {leg.tournament && (
                                  <span className="text-slate-600 font-normal ml-1.5">({leg.tournament})</span>
                                )}
                              </div>
                              {marketText && (
                                <div className="text-emerald-800 font-medium truncate">{marketText}</div>
                              )}
                            </div>
                          </div>
                          {leg.odd > 1 && (
                            <span className="font-mono text-blue-700 font-bold shrink-0">
                              @{leg.odd.toFixed(2)}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {importedResult.warning && (
                  <p className="text-[11px] text-amber-900 font-medium flex items-start gap-1.5 pt-0.5">
                    <span className="material-symbols-outlined text-[14px] shrink-0 mt-0.5">
                      info
                    </span>
                    <span>{importedResult.warning}</span>
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Form Body - 2-column layout on Desktop (lg), stacked on Mobile */}
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* LEFT COLUMN: Entry details, Stake, Odd, Status, Return */}
          <div className="lg:col-span-5 flex flex-col gap-3.5">
            {/* Tipo de Saldo (Real, Freebet ou Bônus Rollover) */}
            <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-xl border border-slate-300/80">
              <button
                type="button"
                onClick={() => setFundType('Saldo Real')}
                className={`py-2 px-1.5 text-[11px] font-semibold rounded-lg transition-all flex items-center justify-center gap-1 whitespace-nowrap ${
                  fundType === 'Saldo Real'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                <span className="material-symbols-outlined text-[14px]">account_balance_wallet</span>
                <span>Saldo Real</span>
              </button>
              <button
                type="button"
                onClick={() => setFundType('Freebet')}
                className={`py-2 px-1.5 text-[11px] font-semibold rounded-lg transition-all flex items-center justify-center gap-1 whitespace-nowrap ${
                  fundType === 'Freebet'
                    ? 'bg-emerald-700 text-white font-bold shadow-sm'
                    : 'text-slate-700 hover:text-emerald-800'
                }`}
              >
                <span className="material-symbols-outlined text-[14px]">redeem</span>
                <span>Freebet</span>
              </button>
              <button
                type="button"
                onClick={() => setFundType('Bônus Rollover')}
                className={`py-2 px-1.5 text-[11px] font-semibold rounded-lg transition-all flex items-center justify-center gap-1 whitespace-nowrap ${
                  fundType === 'Bônus Rollover'
                    ? 'bg-indigo-600 text-white font-bold shadow-sm'
                    : 'text-slate-700 hover:text-indigo-700'
                }`}
              >
                <span className="material-symbols-outlined text-[14px]">stars</span>
                <span>Rollover</span>
              </button>
            </div>

            {/* Casa e Esporte */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-slate-600">
                  Casa de Apostas
                </label>
                <BookmakerSelector
                  value={bookmaker}
                  onChange={setBookmaker}
                  allowCustom
                  customValue={customBookmaker}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-slate-600">
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
                  className="bg-slate-50 border border-slate-300 hover:border-slate-400 text-slate-900 px-3 py-2.5 rounded-xl text-xs focus:outline-none focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-600/15 transition-colors"
                >
                  {SPORTS_LIST.map((sp) => (
                    <option key={sp} value={sp} className="bg-white text-slate-900">
                      {sp === 'Futebol' ? 'Futebol (Catálogo Completo)' : sp}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {bookmaker === 'Outra' && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-slate-600">
                  Nome da Casa de Apostas
                </label>
                <input
                  type="text"
                  value={customBookmaker}
                  onChange={(e) => setCustomBookmaker(e.target.value)}
                  placeholder="Digite o nome da casa..."
                  className="bg-slate-50 border border-slate-300 hover:border-slate-400 text-slate-900 px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-600/15 placeholder:text-slate-500"
                />
              </div>
            )}

            {/* Partida / Evento */}
            <div className="flex flex-col gap-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-[11px] font-semibold text-slate-600 shrink-0">
                  Evento / Partida
                </label>
                <select
                  aria-label="Adicionar competição e bandeira"
                  value=""
                  onChange={(e) => {
                    const comp = e.target.value;
                    if (!comp) return;
                    const trimmed = event.trim();
                    if (!trimmed) {
                      setEvent(`${comp} `);
                      return;
                    }
                    if (trimmed.startsWith(comp)) return;
                    const existingPreset = POPULAR_COMPETITION_PRESETS.find((p) =>
                      trimmed.startsWith(p.value)
                    );
                    if (existingPreset) {
                      const rest = trimmed.slice(existingPreset.value.length).trimStart();
                      setEvent(rest ? `${comp} ${rest}` : `${comp} `);
                    } else {
                      setEvent(`${comp} ${trimmed}`);
                    }
                  }}
                  className="bg-slate-50 border border-slate-300 hover:border-slate-400 text-slate-800 px-2.5 py-1 rounded-lg text-[11px] focus:outline-none focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-600/15 min-w-0 w-full sm:w-auto sm:max-w-[230px]"
                >
                  <option value="" className="bg-white text-slate-600">
                    + Competição / Bandeira ({POPULAR_COMPETITION_PRESETS.length})
                  </option>
                  {COMPETITION_PRESET_GROUPS.map((group) => (
                    <optgroup
                      key={group.group}
                      label={group.group}
                      className="bg-slate-50 text-slate-700 font-semibold"
                    >
                      {group.items.map((preset) => (
                        <option
                          key={`${group.group}-${preset.value}`}
                          value={preset.value}
                          className="bg-white text-slate-900 font-normal"
                        >
                          {preset.label}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
              <input
                type="text"
                value={event}
                onChange={(e) => handleEventInputChange(e.target.value)}
                onPaste={(e) => {
                  const pasted = e.clipboardData.getData('text');
                  if (
                    pasted &&
                    (/https?:\/\//i.test(pasted) ||
                      /sharebet[=:]/i.test(pasted) ||
                      pasted.includes('\n') ||
                      /@\s*\d/.test(pasted))
                  ) {
                    e.preventDefault();
                    setShareLinkInput(pasted.trim());
                    void handleImportBetLink(pasted.trim());
                  }
                }}
                placeholder="Ex: Liga Jupiler 🇧🇪 - 16:45 Mechelen x Club Brugge"
                className="bg-slate-50 border border-slate-300 hover:border-slate-400 text-slate-900 px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-600/15 placeholder:text-slate-500 transition-colors"
              />
              {inlineDetectedMarket && (
                <div className="flex flex-wrap items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl bg-emerald-50 border border-emerald-300 text-[11px]">
                  <span className="text-emerald-800 font-medium truncate flex items-center gap-1.5 min-w-0">
                    <span className="material-symbols-outlined text-[14px] shrink-0">auto_awesome</span>
                    <span className="truncate">Mercado: {inlineDetectedMarket.label}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setEvent(inlineDetectedMarket.cleanEvent);
                      setInlineDetectedMarket(null);
                    }}
                    className="text-[10px] font-semibold text-emerald-800 hover:text-emerald-950 px-2 py-0.5 rounded-md bg-emerald-100 hover:bg-emerald-200 transition-colors shrink-0"
                  >
                    Deixar só o jogo
                  </button>
                </div>
              )}
              {event.trim() && (
                <MatchCrests
                  event={event}
                  sport={sport}
                  size="md"
                  showLabels
                  debounceMs={350}
                  maxScrollHeightClass="max-h-48"
                  className="pt-1"
                />
              )}
            </div>

            {/* Odd e Stake */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-slate-600">
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
                  className="bg-slate-50 border border-slate-300 hover:border-slate-400 text-slate-900 font-mono px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-600/15 placeholder:text-slate-500 tabular-nums"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-slate-600">
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
                  className="bg-slate-50 border border-slate-300 hover:border-slate-400 text-slate-900 font-mono px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-600/15 placeholder:text-slate-500 tabular-nums"
                  required
                />
              </div>
            </div>

            {/* Atalhos de Unidades */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-slate-600">Atalhos de Unidade</span>
                <span className="font-mono text-blue-700 font-semibold tabular-nums">
                  {units.toFixed(2)}u
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleApplyUnit(0.5)}
                  className="py-2 bg-slate-50 hover:bg-slate-100 border border-slate-300 hover:border-slate-400 rounded-xl text-xs font-mono font-semibold text-slate-800 transition-colors"
                >
                  0.5u
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyUnit(1.0)}
                  className="py-2 bg-blue-50 hover:bg-blue-100 border border-blue-300 rounded-xl text-xs font-mono text-blue-800 font-bold transition-colors"
                >
                  1.0u
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyUnit(2.0)}
                  className="py-2 bg-slate-50 hover:bg-slate-100 border border-slate-300 hover:border-slate-400 rounded-xl text-xs font-mono font-semibold text-slate-800 transition-colors"
                >
                  2.0u
                </button>
              </div>
            </div>

            {/* Status selector */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-slate-600">
                Resultado / Status da Aposta
              </label>
              <select
                value={status}
                onChange={(e) => {
                  const next = e.target.value as BetStatus;
                  setStatus(next);
                  setCashoutError(null);
                }}
                className="bg-slate-50 border border-slate-300 hover:border-slate-400 text-slate-900 px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-600/15"
              >
                <option value="GREEN" className="bg-white text-slate-900">GREEN (Ganho Total)</option>
                <option value="PENDENTE" className="bg-white text-slate-900">AO VIVO / PENDENTE (Em Aberto)</option>
                <option value="RED" className="bg-white text-slate-900">RED (Perdida)</option>
                <option value="HALF_GREEN" className="bg-white text-slate-900">MEIO GREEN (50% Ganho)</option>
                <option value="HALF_RED" className="bg-white text-slate-900">MEIO RED (50% Devolvido)</option>
                <option value="VOID" className="bg-white text-slate-900">REEMBOLSO / VOID (Devolvida)</option>
                <option value="CASHOUT" className="bg-white text-slate-900">CASHOUT (Valor Recebido)</option>
              </select>
            </div>

            {status === 'CASHOUT' && (
              <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-blue-50 border border-blue-300">
                <label className="text-[11px] font-semibold text-blue-800">
                  Valor Efetivamente Recebido no Cashout (R$)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={cashoutReturnInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (/^[0-9]*[.,]?[0-9]*$/.test(val) || val === '') {
                      setCashoutReturnInput(val);
                      setCashoutError(null);
                    }
                  }}
                  placeholder="Ex: 65,00"
                  className="bg-white border border-blue-300 text-slate-900 font-mono px-3.5 py-2 rounded-xl text-xs focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15 tabular-nums placeholder:text-slate-500"
                  required
                />
                <span className="text-[10px] text-slate-700">
                  {fundType === 'Freebet'
                    ? 'Em Freebet, o valor recebido no cashout representa ganho promocional integral.'
                    : 'Ex.: Stake R$ 100 e Cashout recebido de R$ 65 = resultado líquido de -R$ 35.'}
                </span>
                {cashoutError && (
                  <span className="text-[11px] text-rose-700 font-medium">{cashoutError}</span>
                )}
              </div>
            )}

            {/* Resumo do Retorno */}
            <div className="p-3.5 rounded-xl bg-slate-50/90 border border-slate-300/80 flex items-center justify-between gap-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-[11px] text-slate-600">
                  {status === 'PENDENTE' ? 'Retorno Potencial' : 'Retorno Bruto'}
                </span>
                <span className="font-mono text-sm sm:text-base font-bold text-slate-900 tabular-nums">
                  {status === 'CASHOUT' && !preview.cashoutValid
                    ? 'Informe o valor'
                    : formatBRL(displayGross)}
                </span>
              </div>
              <div className="flex flex-col text-right gap-0.5">
                <span className="text-[11px] text-slate-600">
                  {status === 'PENDENTE'
                    ? 'Lucro Potencial'
                    : fundType === 'Saldo Real'
                    ? 'Resultado Líquido'
                    : 'Resultado Promo'}
                </span>
                <span
                  className={`font-mono text-sm sm:text-base font-bold tabular-nums ${
                    displayPl > 0
                      ? 'text-emerald-700'
                      : displayPl < 0
                      ? 'text-rose-700'
                      : 'text-slate-700'
                  }`}
                >
                  {status === 'CASHOUT' && !preview.cashoutValid
                    ? '—'
                    : `${displayPl > 0 ? '+' : ''}${formatBRL(displayPl)} (${
                        displayPl >= 0 ? '+' : ''
                      }${(displayPl / safeUnitVal).toFixed(2)}u)`}
                </span>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Full Market Explorer */}
          <div className="lg:col-span-7 flex flex-col gap-3.5">
            {sport === 'Futebol' ? (
              <div className="p-4 bg-slate-50/90 border border-slate-300/80 rounded-2xl flex flex-col gap-3.5">
                {/* Title + Global Search */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-2 shrink-0">
                    <span className="material-symbols-outlined text-[16px] text-blue-700">
                      sports_soccer
                    </span>
                    <span>Mercados de Futebol ({filteredFootballMarkets.length})</span>
                  </span>
                  <div className="relative flex-1 sm:max-w-[260px]">
                    <span className="material-symbols-outlined text-[15px] text-slate-600 absolute left-2.5 top-1/2 -translate-y-1/2">
                      search
                    </span>
                    <input
                      type="text"
                      value={marketSearch}
                      onChange={(e) => setMarketSearch(e.target.value)}
                      placeholder="Buscar qualquer mercado (ex: cartões, escanteios)..."
                      className="w-full bg-white border border-slate-300 hover:border-slate-400 text-slate-900 pl-8 pr-7 py-1.5 rounded-lg text-xs focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15 placeholder:text-slate-500"
                    />
                    {marketSearch && (
                      <button
                        type="button"
                        onClick={() => setMarketSearch('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-900"
                        title="Limpar busca"
                        aria-label="Limpar busca de mercado"
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
                            ? 'bg-blue-600 text-white font-semibold shadow-sm shadow-blue-600/20'
                            : 'bg-white text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-slate-300'
                        }`}
                      >
                        <span>{cat}</span>
                        <span
                          className={`text-[10px] font-mono ${
                            isSelected ? 'text-blue-100' : 'text-slate-600'
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
                  <div className="flex items-center justify-between text-[11px] text-slate-600">
                    <span>
                      {searchClean
                        ? `Resultados da busca (${filteredFootballMarkets.length}):`
                        : `Mercados em "${selectedCategory}" (${filteredFootballMarkets.length}):`}
                    </span>
                  </div>

                  {filteredFootballMarkets.length === 0 ? (
                    <div className="p-4 rounded-xl bg-white border border-slate-300/80 text-center text-xs text-slate-600">
                      Nenhum mercado encontrado para &ldquo;{marketSearch}&rdquo;.{' '}
                      <button
                        type="button"
                        onClick={() => setMarketSearch('')}
                        className="text-blue-700 hover:underline font-semibold ml-1"
                      >
                        Limpar busca
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-44 overflow-y-auto p-1.5 bg-white border border-slate-300/80 rounded-xl">
                      {filteredFootballMarkets.map((m) => {
                        const isCurrent = activeMarket?.id === m.id;
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => handleMarketChange(m.id)}
                            className={`text-left px-3 py-2 rounded-lg text-xs transition-all flex flex-col gap-0.5 ${
                              isCurrent
                                ? 'bg-blue-50 border border-blue-500 text-blue-950 font-semibold'
                                : 'bg-slate-50/90 hover:bg-slate-100 border border-slate-300/80 text-slate-800'
                            }`}
                          >
                            <span className="truncate leading-snug">{m.name}</span>
                            <span className={`text-[10px] truncate ${isCurrent ? 'text-blue-800 font-normal' : 'text-slate-600'}`}>
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
                    <label className="text-[11px] font-medium text-slate-600">
                      Linha / Seleção em <strong className="text-slate-900">{activeMarket.name}</strong>:
                    </label>
                    <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2 bg-white border border-slate-300/80 rounded-xl">
                      {activeMarket.selections.map((sel) => {
                        const isSel = selectedOption === sel;
                        return (
                          <button
                            key={sel}
                            type="button"
                            onClick={() => handleOptionChange(sel)}
                            className={`px-2.5 py-1.5 rounded-lg text-xs transition-all flex items-center gap-1 ${
                              isSel
                                ? 'bg-emerald-700 text-white font-semibold shadow-sm shadow-emerald-700/20'
                                : 'bg-slate-50/90 text-slate-800 hover:bg-slate-100 border border-slate-300'
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
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="text-[11px] font-medium text-slate-600">
                      Resumo Final do Mercado (editável para adicionar jogador/time):
                    </label>
                    {autoMatchedHint && (
                      <span className="text-[10px] font-semibold text-emerald-800 flex items-center gap-1 truncate max-w-full">
                        <span className="material-symbols-outlined text-[13px] shrink-0">check_circle</span>
                        <span className="truncate">Auto: {autoMatchedHint}</span>
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={customMarketText}
                    onChange={(e) => handleCustomMarketChange(e.target.value)}
                    placeholder="Ex: Total de Gols FT: Mais de 2.5 Gols (Over 2.5)"
                    className="bg-white border border-emerald-400 text-emerald-800 font-semibold px-3.5 py-2 rounded-xl text-xs focus:outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15 placeholder:text-slate-500"
                  />
                </div>
              </div>
            ) : (
              <div className="p-4 bg-slate-50/90 border border-slate-300/80 rounded-2xl flex flex-col gap-3.5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold text-slate-600">
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
                              ? 'bg-emerald-700 text-white font-semibold'
                              : 'bg-white text-slate-800 hover:bg-slate-100 border border-slate-300'
                          }`}
                        >
                          {preset}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold text-slate-600">
                    Mercado & Seleção Personalizada
                  </label>
                  <input
                    type="text"
                    value={customMarketText}
                    onChange={(e) => setCustomMarketText(e.target.value)}
                    placeholder="Ex: Vencedor da Partida / Moneyline ou Handicap"
                    className="bg-white border border-slate-300 hover:border-slate-400 text-slate-900 px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15 placeholder:text-slate-500"
                  />
                </div>
              </div>
            )}

            {/* Botões de Ação */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-xs font-semibold text-slate-700 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-xs rounded-xl transition-all flex items-center gap-1.5 shadow-sm shadow-blue-600/20 active:scale-95"
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
