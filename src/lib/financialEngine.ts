import {
  AppSettings,
  BetEntry,
  BetFundType,
  BetStatus,
  FreeSpinEntry,
  FreebetEntry,
  PromoConversionEntry,
  TreasuryEntry
} from '../types';
import { BOOKMAKERS, SPORTS_LIST } from '../data/footballMarkets';

/**
 * Política documentada de Turnover (Giro) e ROI — Apex Bankroll Fase 1.1:
 * - Turnover Real: soma das stakes liquidadas com dinheiro próprio ('Saldo Real'),
 *   EXCLUINDO apostas com status 'PENDENTE' (ainda em aberto) e 'VOID' (reembolso integral
 *   sem risco liquidado, cujo P/L é 0 e não deve diluir ou inflar artificialmente o ROI).
 * - Apostas promocionais ('Freebet' e 'Bônus Rollover') NÃO compõem o turnover real nem o ROI real.
 * - O Turnover Promocional é contabilizado separadamente para métricas de rollover e extração.
 */
export const TURNOVER_POLICY_DOC =
  'Turnover Efetivo = soma das stakes liquidadas em Saldo Real, excluindo apostas PENDENTE, entradas anuladas (VOID) e saldos promocionais (Freebet / Bônus Rollover).';

export const ALLOWED_BET_TYPES: readonly BetFundType[] = [
  'Saldo Real',
  'Freebet',
  'Bônus Rollover'
];

export const ALLOWED_BET_STATUSES: readonly BetStatus[] = [
  'GREEN',
  'RED',
  'HALF_GREEN',
  'HALF_RED',
  'VOID',
  'CASHOUT',
  'PENDENTE'
];

export const finiteNumber = (v: unknown, fallback = 0): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

export const roundCurrency = (v: unknown): number => {
  const n = finiteNumber(v, 0);
  const rounded = Math.round((n + Number.EPSILON) * 100) / 100;
  return Object.is(rounded, -0) ? 0 : rounded;
};

export interface BetSettlementInput {
  stake: number;
  odd: number;
  status: BetStatus;
  type: BetFundType;
  cashoutReturn?: number | null;
}

export interface BetSettlementResult {
  gross: number;
  pl: number;
  potentialGross: number;
  potentialPl: number;
  cashoutReturn?: number;
}

export function calculateBetPotential(
  stake: number,
  odd: number,
  type: BetFundType
): { potentialGross: number; potentialPl: number } {
  const s = Math.max(0, finiteNumber(stake, 0));
  const o = Math.max(1, finiteNumber(odd, 1));
  if (type === 'Freebet') {
    const net = roundCurrency(s * (o - 1));
    return { potentialGross: net, potentialPl: net };
  }
  const gross = roundCurrency(s * o);
  return {
    potentialGross: gross,
    potentialPl: roundCurrency(gross - s)
  };
}

/**
 * Fonte única de verdade para liquidação matemática de apostas reais, Freebets e Bônus Rollover.
 * Proíbe qualquer multiplicador fictício em Cashout: exige valor efetivamente recebido.
 */
export function calculateBetSettlement(input: BetSettlementInput): BetSettlementResult {
  const s = Math.max(0, finiteNumber(input.stake, 0));
  const o = Math.max(1, finiteNumber(input.odd, 1));
  const type: BetFundType = ALLOWED_BET_TYPES.includes(input.type)
    ? input.type
    : 'Saldo Real';
  const status: BetStatus = ALLOWED_BET_STATUSES.includes(input.status)
    ? input.status
    : 'PENDENTE';

  const { potentialGross, potentialPl } = calculateBetPotential(s, o, type);

  if (status === 'PENDENTE') {
    return {
      gross: 0,
      pl: 0,
      potentialGross,
      potentialPl
    };
  }

  if (status === 'GREEN') {
    if (type === 'Freebet') {
      const net = roundCurrency(s * (o - 1));
      return { gross: net, pl: net, potentialGross, potentialPl };
    }
    const gross = roundCurrency(s * o);
    return { gross, pl: roundCurrency(gross - s), potentialGross, potentialPl };
  }

  if (status === 'HALF_GREEN') {
    if (type === 'Freebet') {
      const net = roundCurrency((s * (o - 1)) / 2);
      return { gross: net, pl: net, potentialGross, potentialPl };
    }
    const gross = roundCurrency(s + (s * (o - 1)) / 2);
    return { gross, pl: roundCurrency(gross - s), potentialGross, potentialPl };
  }

  if (status === 'RED') {
    if (type === 'Freebet') {
      return { gross: 0, pl: 0, potentialGross, potentialPl };
    }
    return { gross: 0, pl: roundCurrency(-s), potentialGross, potentialPl };
  }

  if (status === 'HALF_RED') {
    if (type === 'Freebet') {
      return { gross: 0, pl: 0, potentialGross, potentialPl };
    }
    const returned = roundCurrency(s / 2);
    return {
      gross: returned,
      pl: roundCurrency(-s / 2),
      potentialGross,
      potentialPl
    };
  }

  if (status === 'VOID') {
    if (type === 'Freebet') {
      return { gross: 0, pl: 0, potentialGross, potentialPl };
    }
    const returned = roundCurrency(s);
    return { gross: returned, pl: 0, potentialGross, potentialPl };
  }

  // CASHOUT: obrigatoriamente usa o valor efetivamente recebido informado pelo usuário
  const rawCashout = input.cashoutReturn;
  if (
    rawCashout === undefined ||
    rawCashout === null ||
    !Number.isFinite(Number(rawCashout)) ||
    Number(rawCashout) < 0
  ) {
    throw new Error('Informe o valor efetivamente recebido no Cashout (maior ou igual a zero).');
  }

  const received = roundCurrency(Math.max(0, Number(rawCashout)));
  if (type === 'Freebet') {
    return {
      gross: received,
      pl: received,
      potentialGross,
      potentialPl,
      cashoutReturn: received
    };
  }

  return {
    gross: received,
    pl: roundCurrency(received - s),
    potentialGross,
    potentialPl,
    cashoutReturn: received
  };
}

/**
 * Preview tolerante para UI enquanto o usuário ainda está digitando o valor de Cashout.
 * Nunca usa 1.15x: indica `cashoutValid: false` quando o campo está vazio/inválido.
 */
export function calculateBetPreview(input: {
  stake: number;
  odd: number;
  status: BetStatus;
  type: BetFundType;
  cashoutReturnInput?: number | null;
}): BetSettlementResult & { cashoutValid: boolean } {
  if (input.status === 'CASHOUT') {
    const raw = input.cashoutReturnInput;
    const valid = raw !== undefined && raw !== null && Number.isFinite(raw) && raw >= 0;
    const { potentialGross, potentialPl } = calculateBetPotential(
      input.stake,
      input.odd,
      input.type
    );
    if (!valid) {
      return {
        gross: 0,
        pl: 0,
        potentialGross,
        potentialPl,
        cashoutValid: false
      };
    }
    const res = calculateBetSettlement({
      stake: input.stake,
      odd: input.odd,
      status: 'CASHOUT',
      type: input.type,
      cashoutReturn: raw
    });
    return { ...res, cashoutValid: true };
  }

  const res = calculateBetSettlement({
    stake: input.stake,
    odd: input.odd,
    status: input.status,
    type: input.type
  });
  return { ...res, cashoutValid: true };
}

export function calculateFreebetPotentialReturn(bonusAmount: number, odd: number): number {
  const b = Math.max(0, finiteNumber(bonusAmount, 0));
  const o = Math.max(1, finiteNumber(odd, 1));
  return roundCurrency(b * (o - 1));
}

export function calculateFreebetRealizedReturn(
  bonusAmount: number,
  odd: number,
  status: FreebetEntry['status'],
  explicitSettledPl?: number
): number {
  if (status !== 'Creditado') {
    return 0;
  }
  if (
    explicitSettledPl !== undefined &&
    Number.isFinite(Number(explicitSettledPl)) &&
    Number(explicitSettledPl) >= 0
  ) {
    return roundCurrency(Number(explicitSettledPl));
  }
  return calculateFreebetPotentialReturn(bonusAmount, odd);
}

export function mapFreebetStatusToBetStatus(fbStatus: FreebetEntry['status']): BetStatus {
  if (fbStatus === 'Creditado') return 'GREEN';
  if (fbStatus === 'Expirado') return 'VOID';
  return 'PENDENTE';
}

export function mapBetStatusToFreebetStatus(
  betStatus: BetStatus,
  betPl = 0
): FreebetEntry['status'] {
  if (betStatus === 'GREEN' || betStatus === 'HALF_GREEN') return 'Creditado';
  if (betStatus === 'CASHOUT') return betPl > 0 ? 'Creditado' : 'Expirado';
  if (betStatus === 'RED' || betStatus === 'HALF_RED' || betStatus === 'VOID') return 'Expirado';
  return 'Ao Vivo';
}

export function normalizeFreebetEntry(raw: any, sanitizeId: (id?: string) => string): FreebetEntry {
  const allowed: FreebetEntry['status'][] = ['Ao Vivo', 'Creditado', 'Pendente', 'Expirado'];
  const status: FreebetEntry['status'] = allowed.includes(raw?.status)
    ? raw.status
    : 'Pendente';
  const bonusAmount = Math.max(0, finiteNumber(raw?.bonusAmount ?? raw?.bonus_amount, 0));
  const odd = Math.max(1, finiteNumber(raw?.odd, 1));
  const storedReturn = finiteNumber(raw?.netReturn ?? raw?.net_return, 0);

  // Regra F1-04: registros pendentes/ao vivo/expirados não podem conter valor realizado > 0
  const netReturn =
    status === 'Creditado'
      ? storedReturn > 0
        ? roundCurrency(storedReturn)
        : calculateFreebetPotentialReturn(bonusAmount, odd)
      : 0;

  const entry: FreebetEntry = {
    id: sanitizeId(raw?.id),
    bookmaker: String(raw?.bookmaker || '1win'),
    event: String(raw?.event || 'Evento Promocional'),
    selection: String(raw?.selection || 'Seleção'),
    bonusAmount,
    odd,
    netReturn,
    status,
    date: String(raw?.date || new Date().toLocaleDateString('pt-BR'))
  };

  if (raw?.linkedBetId && String(raw.linkedBetId).trim()) {
    entry.linkedBetId = sanitizeId(String(raw.linkedBetId));
  }

  return entry;
}

export function normalizeBetEntry(
  raw: any,
  fallbackUnitValue = 25,
  sanitizeId: (id?: string) => string = (id) => String(id || '')
): BetEntry {
  const safeUnit = fallbackUnitValue > 0 ? fallbackUnitValue : 25;
  const stake = Math.max(0, finiteNumber(raw?.stake, 0));
  const odd = Math.max(1, finiteNumber(raw?.odd, 1));
  const type: BetFundType =
    raw?.type === 'Freebet' || raw?.type === 'Bônus Rollover' ? raw.type : 'Saldo Real';

  const rawStatus = String(raw?.status || 'GREEN').toUpperCase() as BetStatus;
  const status: BetStatus = ALLOWED_BET_STATUSES.includes(rawStatus) ? rawStatus : 'GREEN';

  let gross = finiteNumber(raw?.gross, 0);
  let pl = finiteNumber(raw?.pl, 0);
  let cashoutReturn: number | undefined =
    raw?.cashoutReturn !== undefined &&
    raw?.cashoutReturn !== null &&
    Number.isFinite(Number(raw.cashoutReturn)) &&
    Number(raw.cashoutReturn) >= 0
      ? roundCurrency(Number(raw.cashoutReturn))
      : undefined;

  if (status === 'PENDENTE') {
    // Regra F1-04: pendentes nunca carregam lucro realizado
    gross = 0;
    pl = 0;
  } else if (status === 'CASHOUT') {
    if (cashoutReturn === undefined) {
      // Compatibilidade com registros antigos de Cashout que só gravaram gross/pl
      if (Number.isFinite(Number(raw?.gross)) && Number(raw.gross) >= 0) {
        cashoutReturn = roundCurrency(Number(raw.gross));
      } else if (Number.isFinite(Number(raw?.pl))) {
        cashoutReturn = roundCurrency(
          Math.max(0, (type === 'Freebet' ? 0 : stake) + Number(raw.pl))
        );
      } else {
        cashoutReturn = roundCurrency(stake);
      }
    }
    const settled = calculateBetSettlement({
      stake,
      odd,
      status: 'CASHOUT',
      type,
      cashoutReturn
    });
    gross = settled.gross;
    pl = settled.pl;
  } else {
    const settled = calculateBetSettlement({ stake, odd, status, type });
    // Se for Freebet antigo gravado com regra errada (ex: HALF_RED negativo, VOID/HALF_GREEN com stake somada),
    // corrige automaticamente para a regra matemática correta; nos demais casos recalcula se vier nulo/NaN.
    const needsFreebetHeal =
      type === 'Freebet' &&
      (Math.abs(gross - settled.gross) > 0.01 || Math.abs(pl - settled.pl) > 0.01);
    const missingRealValues =
      raw?.gross === undefined ||
      raw?.pl === undefined ||
      !Number.isFinite(Number(raw?.gross)) ||
      !Number.isFinite(Number(raw?.pl));

    if (needsFreebetHeal || missingRealValues) {
      gross = settled.gross;
      pl = settled.pl;
    } else {
      gross = roundCurrency(gross);
      pl = roundCurrency(pl);
    }
  }

  const units =
    raw?.units !== undefined && Number.isFinite(Number(raw.units))
      ? Number(raw.units)
      : Number((stake / safeUnit).toFixed(2));

  const entry: BetEntry = {
    id: sanitizeId(raw?.id),
    date: String(raw?.date || new Date().toLocaleDateString('pt-BR')),
    sport: String(raw?.sport || 'Futebol'),
    event: String(raw?.event || 'Evento Esportivo'),
    market: String(raw?.market || 'Mercado Principal'),
    odd,
    stake,
    units,
    type,
    status,
    gross,
    pl,
    bookmaker: String(raw?.bookmaker || '1win')
  };

  if (cashoutReturn !== undefined) {
    entry.cashoutReturn = cashoutReturn;
  }

  if (raw?.freebetId && String(raw.freebetId).trim()) {
    entry.freebetId = sanitizeId(String(raw.freebetId));
  }

  if (
    raw?.closingOdd !== undefined &&
    Number.isFinite(Number(raw.closingOdd)) &&
    Number(raw.closingOdd) >= 1
  ) {
    entry.closingOdd = Number(raw.closingOdd);
  }

  return entry;
}

export function findLinkedBetForFreebet(
  fb: FreebetEntry,
  bets: BetEntry[],
  alreadyClaimedBetIds?: Set<string>
): BetEntry | undefined {
  if (fb.linkedBetId) {
    const direct = bets.find((b) => b.id === fb.linkedBetId);
    if (direct) return direct;
  }

  const byBackRef = bets.find((b) => b.freebetId && b.freebetId === fb.id);
  if (byBackRef) return byBackRef;

  // Fallback seguro apenas para registros antigos sem ponteiro explícito
  return bets.find(
    (b) =>
      b.type === 'Freebet' &&
      !b.freebetId &&
      !(alreadyClaimedBetIds && alreadyClaimedBetIds.has(b.id)) &&
      (b.bookmaker || '').trim().toLowerCase() === (fb.bookmaker || '').trim().toLowerCase() &&
      b.event.trim().toLowerCase() === fb.event.trim().toLowerCase() &&
      Math.abs(roundCurrency(b.stake) - roundCurrency(fb.bonusAmount)) <= 0.01 &&
      Math.abs(b.odd - fb.odd) <= 0.01
  );
}

export function findLinkedFreebetForBet(
  bet: BetEntry,
  freebets: FreebetEntry[]
): FreebetEntry | undefined {
  if (bet.type !== 'Freebet') return undefined;
  if (bet.freebetId) {
    const direct = freebets.find((fb) => fb.id === bet.freebetId);
    if (direct) return direct;
  }
  return freebets.find((fb) => fb.linkedBetId === bet.id);
}

export function deduplicateFreeSpins(spins: FreeSpinEntry[]): FreeSpinEntry[] {
  const seenIds = new Set<string>();
  const seenKeys = new Set<string>();
  const result: FreeSpinEntry[] = [];

  for (const s of spins) {
    if (!s || !s.id) continue;
    if (seenIds.has(s.id)) continue;
    if (s.idempotencyKey && seenKeys.has(s.idempotencyKey)) continue;
    seenIds.add(s.id);
    if (s.idempotencyKey) seenKeys.add(s.idempotencyKey);
    result.push({
      ...s,
      spinsCount: Math.max(0, finiteNumber(s.spinsCount, 0)),
      netProfit: roundCurrency(s.netProfit)
    });
  }

  return result;
}

export function deduplicatePromoConversions(
  conversions: PromoConversionEntry[]
): PromoConversionEntry[] {
  const seenIds = new Set<string>();
  const seenKeys = new Set<string>();
  const seenSources = new Set<string>();
  const result: PromoConversionEntry[] = [];

  for (const c of conversions) {
    if (!c || !c.id) continue;
    if (seenIds.has(c.id)) continue;
    if (c.idempotencyKey && seenKeys.has(c.idempotencyKey)) continue;
    if (c.sourceId && seenSources.has(c.sourceId)) continue;
    seenIds.add(c.id);
    if (c.idempotencyKey) seenKeys.add(c.idempotencyKey);
    if (c.sourceId) seenSources.add(c.sourceId);
    result.push({
      ...c,
      amount: roundCurrency(Math.max(0, finiteNumber(c.amount, 0)))
    });
  }

  return result;
}

export interface PromoConversionRequest {
  amount: number;
  date: string;
  origin: string;
  promotionName: string;
  bookmaker?: string;
  notes?: string;
  confirmed: boolean;
  idempotencyKey?: string;
  sourceId?: string;
}

export interface PromoConversionValidationResult {
  valid: boolean;
  error?: string;
  normalizedAmount?: number;
}

export function validatePromoConversion(
  req: PromoConversionRequest,
  availablePromoBalance: number,
  existingConversions: PromoConversionEntry[]
): PromoConversionValidationResult {
  if (!req.confirmed) {
    return {
      valid: false,
      error: 'A conversão promocional exige confirmação explícita do usuário.'
    };
  }

  const cleanAmount = roundCurrency(req.amount);
  if (!Number.isFinite(cleanAmount) || cleanAmount <= 0) {
    return {
      valid: false,
      error: 'Informe um valor válido maior que zero para converter.'
    };
  }

  if (!req.origin || !req.origin.trim()) {
    return {
      valid: false,
      error: 'Informe a origem do saldo promocional.'
    };
  }

  if (!req.promotionName || !req.promotionName.trim()) {
    return {
      valid: false,
      error: 'Informe a promoção relacionada à conversão.'
    };
  }

  const avail = roundCurrency(Math.max(0, availablePromoBalance));
  if (cleanAmount > avail) {
    return {
      valid: false,
      error: `Valor solicitado (R$ ${cleanAmount.toFixed(2)}) excede o saldo promocional disponível (R$ ${avail.toFixed(2)}).`
    };
  }

  if (
    req.idempotencyKey &&
    existingConversions.some((c) => c.idempotencyKey === req.idempotencyKey)
  ) {
    return {
      valid: false,
      error: 'Conversão duplicada bloqueada para esta solicitação.'
    };
  }

  if (req.sourceId && existingConversions.some((c) => c.sourceId === req.sourceId)) {
    return {
      valid: false,
      error: 'Esta promoção já foi convertida anteriormente.'
    };
  }

  return { valid: true, normalizedAmount: cleanAmount };
}

export interface FinancialMetricsSummary {
  // Caixa real (somente Compensado)
  totalDeposits: number;
  totalWithdrawals: number;
  pendingDeposits: number;
  pendingWithdrawals: number;

  // Apostas em dinheiro próprio (Saldo Real)
  realBetProfit: number;
  netBetProfit: number; // Alias compatível estritamente com dinheiro real
  realExposure: number;
  activeExposure: number;
  openPositionsCount: number;
  settledBetsCount: number;
  winCount: number;
  lossCount: number;
  voidCount: number;
  cashoutCount: number;
  winRate: number;
  realTurnover: number;
  realVoidVolume: number;
  turnoverVolume: number;
  roi: number;

  // Patrimônio Real vs Disponível
  realEquity: number;
  currentEquity: number;
  availableRealBalance: number;

  // Giros grátis (automático na banca real, sem duplicidade)
  totalSpinsProfit: number;

  // Saldo Promocional e Indicadores Promocionais (isolados da banca real)
  bonusCredits: number;
  pendingBonusCredits: number;
  rolloverBetProfit: number;
  rolloverExposure: number;
  rolloverTurnover: number;
  rolloverRoi: number;
  freebetLedgerProfit: number;
  unlinkedFreebetProfit: number;
  totalFreebetsProfit: number;
  freebetNominalVolume: number;
  freebetExtractionRate: number;
  promoExposure: number;
  promoBetProfit: number;
  promoTurnover: number;
  promoRoi: number;
  totalConvertedPromo: number;
  promoBalance: number;
  availablePromoBalance: number;
  promoSettledCount: number;
  promoOpenCount: number;

  // Drawdown e streaks sobre apostas com dinheiro real
  bettingDrawdownPct: number;
  maxDrawdownPct: number;
  currentStreakText: string;
  maxWinStreak: number;
  maxLossStreak: number;
}

export function computeBettingDrawdownAndStreaks(
  bets: BetEntry[],
  initialBankroll: number
): {
  bettingDrawdownPct: number;
  maxWinStreak: number;
  maxLossStreak: number;
  currentStreakText: string;
} {
  let maxW = 0;
  let maxL = 0;
  let currentW = 0;
  let currentL = 0;

  // Apenas apostas liquidadas com dinheiro próprio ('Saldo Real') entram na curva e drawdown real
  const chronological = [...bets]
    .filter((b) => b.type === 'Saldo Real' && b.status !== 'PENDENTE')
    .reverse();

  const baseBankroll = Math.max(0, finiteNumber(initialBankroll, 1000));
  let runningEquity = baseBankroll;
  let peakEquity = baseBankroll;
  let maxDd = 0;

  chronological.forEach((b) => {
    runningEquity = roundCurrency(runningEquity + finiteNumber(b.pl, 0));
    if (runningEquity > peakEquity) {
      peakEquity = runningEquity;
    }
    if (peakEquity > 0) {
      const dd = ((peakEquity - runningEquity) / peakEquity) * 100;
      if (dd > maxDd) maxDd = dd;
    }

    if (b.status === 'VOID' || b.status === 'CASHOUT') return;

    if (b.status === 'GREEN' || b.status === 'HALF_GREEN') {
      currentW++;
      currentL = 0;
      if (currentW > maxW) maxW = currentW;
    } else if (b.status === 'RED' || b.status === 'HALF_RED') {
      currentL++;
      currentW = 0;
      if (currentL > maxL) maxL = currentL;
    }
  });

  let streakText = 'Sem histórico';
  if (currentW > 0) {
    streakText = `+${currentW} ${currentW === 1 ? 'Green seguido' : 'Greens seguidos'}`;
  } else if (currentL > 0) {
    streakText = `-${currentL} ${currentL === 1 ? 'Red seguido' : 'Reds seguidos'}`;
  }

  return {
    bettingDrawdownPct: Number(maxDd.toFixed(4)),
    maxWinStreak: maxW,
    maxLossStreak: maxL,
    currentStreakText: streakText
  };
}

export function computeFinancialMetrics(input: {
  bets: BetEntry[];
  treasury: TreasuryEntry[];
  freebets: FreebetEntry[];
  freeSpins: FreeSpinEntry[];
  promoConversions: PromoConversionEntry[];
  settings: Pick<AppSettings, 'initialBankroll' | 'initialPromoBalance'>;
}): FinancialMetricsSummary {
  const { bets, treasury, freebets, freeSpins, promoConversions, settings } = input;

  // 1. Tesouraria: apenas status 'Compensado' altera saldos efetivos (F1-07, F1-13, F1-16)
  let totalDeposits = 0;
  let totalWithdrawals = 0;
  let pendingDeposits = 0;
  let pendingWithdrawals = 0;
  let bonusCredits = 0;
  let pendingBonusCredits = 0;

  treasury.forEach((t) => {
    const amt = Math.max(0, finiteNumber(t.amount, 0));
    const isCompensado = t.status === 'Compensado';
    if (t.type === 'DEPOSIT') {
      if (isCompensado) totalDeposits += amt;
      else pendingDeposits += amt;
    } else if (t.type === 'WITHDRAW') {
      if (isCompensado) totalWithdrawals += amt;
      else pendingWithdrawals += amt;
    } else if (t.type === 'BONUS') {
      // Bônus Rollover nunca é depósito real: vai exclusivamente para o saldo promocional
      if (isCompensado) bonusCredits += amt;
      else pendingBonusCredits += amt;
    }
  });

  totalDeposits = roundCurrency(totalDeposits);
  totalWithdrawals = roundCurrency(totalWithdrawals);
  pendingDeposits = roundCurrency(pendingDeposits);
  pendingWithdrawals = roundCurrency(pendingWithdrawals);
  bonusCredits = roundCurrency(bonusCredits);
  pendingBonusCredits = roundCurrency(pendingBonusCredits);

  // 2. Giros Grátis deduplicados -> crédito direto na banca real
  const dedupedSpins = deduplicateFreeSpins(freeSpins);
  const totalSpinsProfit = roundCurrency(
    dedupedSpins.reduce((sum, s) => sum + finiteNumber(s.netProfit, 0), 0)
  );

  // 3. Conversões manuais promocional -> real deduplicadas
  const dedupedConversions = deduplicatePromoConversions(promoConversions);
  const totalConvertedPromo = roundCurrency(
    dedupedConversions.reduce((sum, c) => sum + finiteNumber(c.amount, 0), 0)
  );

  // 4. Separação estrita das apostas por tipo de saldo
  let realBetProfit = 0;
  let realExposure = 0;
  let openPositionsCount = 0;
  let settledBetsCount = 0;
  let winCount = 0;
  let lossCount = 0;
  let voidCount = 0;
  let cashoutCount = 0;
  let realTurnover = 0;
  let realVoidVolume = 0;

  let rolloverBetProfit = 0;
  let rolloverExposure = 0;
  let rolloverTurnover = 0;

  let freebetLedgerProfit = 0;
  let freebetNominalVolume = 0;
  let promoSettledCount = 0;
  let promoOpenCount = 0;

  bets.forEach((b) => {
    const stakeVal = Math.max(0, finiteNumber(b.stake, 0));
    const plVal = finiteNumber(b.pl, 0);

    if (b.type === 'Saldo Real') {
      if (b.status === 'PENDENTE') {
        realExposure += stakeVal;
        openPositionsCount++;
      } else {
        settledBetsCount++;
        realBetProfit += plVal;

        if (b.status === 'VOID') {
          voidCount++;
          realVoidVolume += stakeVal;
        } else {
          // VOID excluído do turnover efetivo (F1-12)
          realTurnover += stakeVal;
        }

        if (b.status === 'GREEN' || b.status === 'HALF_GREEN') {
          winCount++;
        } else if (b.status === 'RED' || b.status === 'HALF_RED') {
          lossCount++;
        } else if (b.status === 'CASHOUT') {
          cashoutCount++;
        }
      }
      return;
    }

    if (b.type === 'Bônus Rollover') {
      if (b.status === 'PENDENTE') {
        rolloverExposure += stakeVal;
        promoOpenCount++;
      } else {
        promoSettledCount++;
        rolloverBetProfit += plVal;
        if (b.status !== 'VOID') {
          rolloverTurnover += stakeVal;
        }
      }
      return;
    }

    // Freebet
    if (b.status === 'PENDENTE') {
      promoOpenCount++;
    } else {
      promoSettledCount++;
      freebetLedgerProfit += plVal;
      if (b.status !== 'VOID') {
        freebetNominalVolume += stakeVal;
      }
    }
  });

  // 5. Freebets registradas na aba Promoções sem vínculo duplicado no Livro-Razão
  const claimedBetIds = new Set<string>();
  freebets.forEach((fb) => {
    if (fb.linkedBetId) claimedBetIds.add(fb.linkedBetId);
  });

  let unlinkedFreebetProfit = 0;
  let unlinkedFreebetNominal = 0;

  freebets.forEach((fb) => {
    const linked = findLinkedBetForFreebet(fb, bets, claimedBetIds);
    if (linked) {
      claimedBetIds.add(linked.id);
      return; // Já contabilizada em freebetLedgerProfit via Livro-Razão -> zero duplicidade
    }
    if (fb.status === 'Creditado') {
      unlinkedFreebetProfit += calculateFreebetRealizedReturn(
        fb.bonusAmount,
        fb.odd,
        fb.status,
        fb.netReturn
      );
      unlinkedFreebetNominal += Math.max(0, finiteNumber(fb.bonusAmount, 0));
    } else if (fb.status === 'Expirado') {
      unlinkedFreebetNominal += Math.max(0, finiteNumber(fb.bonusAmount, 0));
    }
  });

  realBetProfit = roundCurrency(realBetProfit);
  realExposure = roundCurrency(realExposure);
  realTurnover = roundCurrency(realTurnover);
  realVoidVolume = roundCurrency(realVoidVolume);

  rolloverBetProfit = roundCurrency(rolloverBetProfit);
  rolloverExposure = roundCurrency(rolloverExposure);
  rolloverTurnover = roundCurrency(rolloverTurnover);

  freebetLedgerProfit = roundCurrency(freebetLedgerProfit);
  unlinkedFreebetProfit = roundCurrency(unlinkedFreebetProfit);
  const totalFreebetsProfit = roundCurrency(freebetLedgerProfit + unlinkedFreebetProfit);
  const totalFreebetNominal = roundCurrency(freebetNominalVolume + unlinkedFreebetNominal);

  const initialReal = Math.max(0, finiteNumber(settings.initialBankroll, 1000));
  const initialPromo = Math.max(0, finiteNumber(settings.initialPromoBalance, 0));

  const realEquity = roundCurrency(
    initialReal +
      totalDeposits -
      totalWithdrawals +
      realBetProfit +
      totalSpinsProfit +
      totalConvertedPromo
  );

  const availableRealBalance = roundCurrency(realEquity - realExposure);

  const promoBetProfit = roundCurrency(rolloverBetProfit + totalFreebetsProfit);
  const promoTurnover = roundCurrency(rolloverTurnover + totalFreebetNominal);
  const promoBalance = roundCurrency(
    initialPromo + bonusCredits + promoBetProfit - totalConvertedPromo
  );
  const availablePromoBalance = roundCurrency(promoBalance - rolloverExposure);

  const totalDecisive = winCount + lossCount;
  const winRate = totalDecisive > 0 ? (winCount / totalDecisive) * 100 : 0;
  const roi = realTurnover > 0 ? (realBetProfit / realTurnover) * 100 : 0;
  const rolloverRoi = rolloverTurnover > 0 ? (rolloverBetProfit / rolloverTurnover) * 100 : 0;
  const freebetExtractionRate =
    totalFreebetNominal > 0 ? (totalFreebetsProfit / totalFreebetNominal) * 100 : 0;
  const promoRoi = promoTurnover > 0 ? (promoBetProfit / promoTurnover) * 100 : 0;

  const { bettingDrawdownPct, maxWinStreak, maxLossStreak, currentStreakText } =
    computeBettingDrawdownAndStreaks(bets, initialReal);

  return {
    totalDeposits,
    totalWithdrawals,
    pendingDeposits,
    pendingWithdrawals,

    realBetProfit,
    netBetProfit: realBetProfit,
    realExposure,
    activeExposure: realExposure,
    openPositionsCount,
    settledBetsCount,
    winCount,
    lossCount,
    voidCount,
    cashoutCount,
    winRate,
    realTurnover,
    realVoidVolume,
    turnoverVolume: realTurnover,
    roi,

    realEquity,
    currentEquity: realEquity,
    availableRealBalance,

    totalSpinsProfit,

    bonusCredits,
    pendingBonusCredits,
    rolloverBetProfit,
    rolloverExposure,
    rolloverTurnover,
    rolloverRoi,
    freebetLedgerProfit,
    unlinkedFreebetProfit,
    totalFreebetsProfit,
    freebetNominalVolume: totalFreebetNominal,
    freebetExtractionRate,
    promoExposure: rolloverExposure,
    promoBetProfit,
    promoTurnover,
    promoRoi,
    totalConvertedPromo,
    promoBalance,
    availablePromoBalance,
    promoSettledCount,
    promoOpenCount,

    bettingDrawdownPct,
    maxDrawdownPct: bettingDrawdownPct,
    currentStreakText,
    maxWinStreak,
    maxLossStreak
  };
}

export type AnalyticsScope = 'Saldo Real' | 'Promocional';

export interface ScopedBucketStat {
  key: string;
  count: number;
  settledCount: number;
  volume: number;
  winRate: number;
  pl: number;
  roi: number;
}

export interface ScopedOddsBucketStat {
  label: string;
  min: number;
  max: number;
  barColor: string;
  textColor: string;
  count: number;
  volume: number;
  winRate: number;
  roi: number;
  pl: number;
}

export function classifyFootballMarketCategory(marketStr: string): string {
  const m = (marketStr || '').toLowerCase();
  if (m.includes('escanteio') || m.includes('corner') || m.includes('canto')) return 'Escanteios';
  if (m.includes('cart') || m.includes('card') || m.includes('vermelho') || m.includes('expuls'))
    return 'Cartões';
  if (
    m.includes('handicap') ||
    m.includes('asiático') ||
    m.includes('asiatico') ||
    m.includes('dnb') ||
    m.includes('spread') ||
    m.includes('.25') ||
    m.includes('.75')
  ) {
    return 'Handicap Asiático';
  }
  if (
    m.includes('chute') ||
    m.includes('finaliza') ||
    m.includes('marcador') ||
    m.includes('desarme') ||
    m.includes('falta') ||
    m.includes('assist') ||
    m.includes('jogador') ||
    m.includes('triplo') ||
    m.includes('reb')
  ) {
    return 'Props de Jogadores';
  }
  if (
    m.includes('pênalti') ||
    m.includes('penalti') ||
    m.includes('minuto') ||
    m.includes('placar') ||
    m.includes('ímpar') ||
    m.includes('impar')
  ) {
    return 'Especiais & Minutos';
  }
  if (
    m.includes('gol') ||
    m.includes('over') ||
    m.includes('under') ||
    m.includes('btts') ||
    m.includes('marcam') ||
    m.includes('clean sheet') ||
    m.includes('multigols')
  ) {
    return 'Gols & BTTS';
  }
  if (
    m.includes('resultado') ||
    m.includes('1x2') ||
    m.includes('dupla chance') ||
    m.includes('moneyline') ||
    m.includes('ml') ||
    m.includes('vencedor') ||
    m.includes('vence') ||
    m.includes('intervalo') ||
    m.includes('win to nil')
  ) {
    return 'Resultado & Linhas';
  }
  return 'Outros Mercados';
}

export function computeScopedAnalytics(bets: BetEntry[], scope: AnalyticsScope) {
  const scopedBets = bets.filter((b) =>
    scope === 'Saldo Real'
      ? b.type === 'Saldo Real'
      : b.type === 'Freebet' || b.type === 'Bônus Rollover'
  );

  const calcStatsForList = (list: BetEntry[]) => {
    const settled = list.filter((b) => b.status !== 'PENDENTE');
    // Turnover exclui VOID conforme política documentada
    const volume = roundCurrency(
      settled
        .filter((b) => b.status !== 'VOID')
        .reduce((sum, b) => sum + Math.max(0, finiteNumber(b.stake, 0)), 0)
    );
    const pl = roundCurrency(settled.reduce((sum, b) => sum + finiteNumber(b.pl, 0), 0));
    const wins = settled.filter((b) => b.status === 'GREEN' || b.status === 'HALF_GREEN').length;
    const losses = settled.filter((b) => b.status === 'RED' || b.status === 'HALF_RED').length;
    const decisive = wins + losses;
    const winRate = decisive > 0 ? (wins / decisive) * 100 : 0;
    const roi = volume > 0 ? (pl / volume) * 100 : 0;

    return {
      count: list.length,
      settledCount: settled.length,
      volume,
      winRate,
      pl,
      roi
    };
  };

  const extraSports = Array.from(
    new Set(
      scopedBets
        .map((b) => b.sport)
        .filter((s) => s && !(SPORTS_LIST as readonly string[]).includes(s))
    )
  );
  const sports = [...SPORTS_LIST, ...extraSports];
  const sportStats: ScopedBucketStat[] = sports.map((s) => ({
    key: s,
    ...calcStatsForList(scopedBets.filter((b) => b.sport === s))
  }));

  const marketCategoriesList = [
    'Resultado & Linhas',
    'Gols & BTTS',
    'Handicap Asiático',
    'Escanteios',
    'Cartões',
    'Props de Jogadores',
    'Especiais & Minutos'
  ];
  const marketStats: ScopedBucketStat[] = marketCategoriesList.map((cat) => ({
    key: cat,
    ...calcStatsForList(scopedBets.filter((b) => classifyFootballMarketCategory(b.market) === cat))
  }));

  const usedBookmakers = Array.from(
    new Set(scopedBets.map((b) => b.bookmaker).filter((bk): bk is string => Boolean(bk && bk.trim())))
  );
  const displayBookmakers =
    usedBookmakers.length > 0 ? usedBookmakers : [...BOOKMAKERS.slice(0, 6)];

  const bookmakerStats: ScopedBucketStat[] = displayBookmakers.map((bk) => ({
    key: bk,
    ...calcStatsForList(scopedBets.filter((b) => b.bookmaker === bk))
  }));

  const oddsBuckets: ScopedOddsBucketStat[] = [
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
    const resolved = scopedBets.filter(
      (b) => b.status !== 'PENDENTE' && b.odd >= bucket.min && b.odd <= bucket.max
    );
    const stats = calcStatsForList(resolved);
    return {
      ...bucket,
      count: stats.settledCount,
      volume: stats.volume,
      winRate: stats.winRate,
      roi: stats.roi,
      pl: stats.pl
    };
  });

  const settledBets = scopedBets.filter((b) => b.status !== 'PENDENTE');
  const totalGains = roundCurrency(
    settledBets.filter((b) => b.pl > 0).reduce((sum, b) => sum + finiteNumber(b.pl, 0), 0)
  );
  const totalLosses = roundCurrency(
    Math.abs(settledBets.filter((b) => b.pl < 0).reduce((sum, b) => sum + finiteNumber(b.pl, 0), 0))
  );
  const overall = calcStatsForList(scopedBets);
  const avgNet = settledBets.length > 0 ? roundCurrency(overall.pl / settledBets.length) : 0;
  const profitFactor =
    totalLosses > 0
      ? (totalGains / totalLosses).toFixed(2)
      : totalGains > 0
      ? '∞'
      : '0.00';

  return {
    scopedBets,
    settledBets,
    totalGains,
    totalLosses,
    avgNet,
    profitFactor,
    totalVolume: overall.volume,
    totalPl: overall.pl,
    totalRoi: overall.roi,
    sportStats,
    marketStats,
    bookmakerStats,
    oddsBuckets
  };
}
