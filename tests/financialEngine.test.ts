import assert from 'node:assert/strict';
import {
  TURNOVER_POLICY_DOC,
  calculateBetPotential,
  calculateBetPreview,
  calculateBetSettlement,
  calculateFreebetPotentialReturn,
  calculateFreebetRealizedReturn,
  computeBettingDrawdownAndStreaks,
  computeFinancialMetrics,
  computeScopedAnalytics,
  deduplicateFreeSpins,
  deduplicatePromoConversions,
  findLinkedBetForFreebet,
  findLinkedFreebetForBet,
  mapBetStatusToFreebetStatus,
  mapFreebetStatusToBetStatus,
  normalizeBetEntry,
  normalizeFreebetEntry,
  validatePromoConversion
} from '../src/lib/financialEngine';
import { mapRowToBet } from '../src/lib/supabase';
import {
  BetEntry,
  FreeSpinEntry,
  FreebetEntry,
  PromoConversionEntry,
  TreasuryEntry
} from '../src/types';

interface TestCase {
  name: string;
  fn: () => void;
}

const tests: TestCase[] = [];
const it = (name: string, fn: () => void) => {
  tests.push({ name, fn });
};

// ---------------------------------------------------------------------------
// 1. Todos os resultados de apostas reais (stake=100, odd=2.00)
// ---------------------------------------------------------------------------
it('1. Dinheiro Real: GREEN, HALF_GREEN, RED, HALF_RED, VOID e PENDENTE (stake=100, odd=2.00)', () => {
  const green = calculateBetSettlement({ stake: 100, odd: 2.0, status: 'GREEN', type: 'Saldo Real' });
  assert.equal(green.gross, 200);
  assert.equal(green.pl, 100);

  const halfGreen = calculateBetSettlement({ stake: 100, odd: 2.0, status: 'HALF_GREEN', type: 'Saldo Real' });
  assert.equal(halfGreen.gross, 150);
  assert.equal(halfGreen.pl, 50);

  const red = calculateBetSettlement({ stake: 100, odd: 2.0, status: 'RED', type: 'Saldo Real' });
  assert.equal(red.gross, 0);
  assert.equal(red.pl, -100);

  const halfRed = calculateBetSettlement({ stake: 100, odd: 2.0, status: 'HALF_RED', type: 'Saldo Real' });
  assert.equal(halfRed.gross, 50);
  assert.equal(halfRed.pl, -50);

  const voidBet = calculateBetSettlement({ stake: 100, odd: 2.0, status: 'VOID', type: 'Saldo Real' });
  assert.equal(voidBet.gross, 100);
  assert.equal(voidBet.pl, 0);

  const pending = calculateBetSettlement({ stake: 100, odd: 2.0, status: 'PENDENTE', type: 'Saldo Real' });
  assert.equal(pending.gross, 0);
  assert.equal(pending.pl, 0);
  assert.equal(pending.potentialGross, 200);
  assert.equal(pending.potentialPl, 100);
});

// ---------------------------------------------------------------------------
// 2. Todos os resultados de Freebets (F1-02 e F1-03)
// ---------------------------------------------------------------------------
it('2. Freebet: GREEN, HALF_GREEN, RED, HALF_RED, VOID e PENDENTE (stake=100, odd=2.00)', () => {
  const green = calculateBetSettlement({ stake: 100, odd: 2.0, status: 'GREEN', type: 'Freebet' });
  assert.equal(green.gross, 100);
  assert.equal(green.pl, 100);

  const halfGreen = calculateBetSettlement({ stake: 100, odd: 2.0, status: 'HALF_GREEN', type: 'Freebet' });
  assert.equal(halfGreen.gross, 50);
  assert.equal(halfGreen.pl, 50);

  const red = calculateBetSettlement({ stake: 100, odd: 2.0, status: 'RED', type: 'Freebet' });
  assert.equal(red.gross, 0);
  assert.equal(red.pl, 0);

  const halfRed = calculateBetSettlement({ stake: 100, odd: 2.0, status: 'HALF_RED', type: 'Freebet' });
  assert.equal(halfRed.gross, 0);
  assert.equal(halfRed.pl, 0);

  const voidFb = calculateBetSettlement({ stake: 100, odd: 2.0, status: 'VOID', type: 'Freebet' });
  assert.equal(voidFb.gross, 0);
  assert.equal(voidFb.pl, 0);

  const pendingFb = calculateBetSettlement({ stake: 100, odd: 2.0, status: 'PENDENTE', type: 'Freebet' });
  assert.equal(pendingFb.gross, 0);
  assert.equal(pendingFb.pl, 0);

  // Odd 3.50 com stake 100 -> Half Green deve ser (100 * 2.5)/2 = 125 sem devolver stake
  const halfGreenOdd35 = calculateBetSettlement({ stake: 100, odd: 3.5, status: 'HALF_GREEN', type: 'Freebet' });
  assert.equal(halfGreenOdd35.gross, 125);
  assert.equal(halfGreenOdd35.pl, 125);
});

// ---------------------------------------------------------------------------
// 3. Cashout com valores diferentes e proibição de 1.15x (F1-01)
// ---------------------------------------------------------------------------
it('3. Cashout: usa valor efetivamente recebido, respeita fundo e proíbe multiplicador 1.15x', () => {
  // Exemplo obrigatório: stake real 100, cashout recebido 65 -> retorno 65, prejuízo -35
  const realLoss = calculateBetSettlement({
    stake: 100,
    odd: 2.0,
    status: 'CASHOUT',
    type: 'Saldo Real',
    cashoutReturn: 65
  });
  assert.equal(realLoss.gross, 65);
  assert.equal(realLoss.pl, -35);
  assert.equal(realLoss.cashoutReturn, 65);

  const realProfit = calculateBetSettlement({
    stake: 100,
    odd: 3.0,
    status: 'CASHOUT',
    type: 'Saldo Real',
    cashoutReturn: 140
  });
  assert.equal(realProfit.gross, 140);
  assert.equal(realProfit.pl, 40);

  const realZero = calculateBetSettlement({
    stake: 100,
    odd: 2.0,
    status: 'CASHOUT',
    type: 'Saldo Real',
    cashoutReturn: 0
  });
  assert.equal(realZero.gross, 0);
  assert.equal(realZero.pl, -100);

  // Freebet: valor recebido no cashout é lucro promocional integral
  const freebetCashout = calculateBetSettlement({
    stake: 100,
    odd: 4.0,
    status: 'CASHOUT',
    type: 'Freebet',
    cashoutReturn: 42.5
  });
  assert.equal(freebetCashout.gross, 42.5);
  assert.equal(freebetCashout.pl, 42.5);

  // Bônus Rollover: segue regra received - stake no saldo promocional
  const rolloverCashout = calculateBetSettlement({
    stake: 100,
    odd: 2.5,
    status: 'CASHOUT',
    type: 'Bônus Rollover',
    cashoutReturn: 70
  });
  assert.equal(rolloverCashout.gross, 70);
  assert.equal(rolloverCashout.pl, -30);

  // Não pode aceitar Cashout sem valor informado ou negativo (sem fallback 1.15x)
  assert.throws(() =>
    calculateBetSettlement({ stake: 100, odd: 2.0, status: 'CASHOUT', type: 'Saldo Real' })
  );
  assert.throws(() =>
    calculateBetSettlement({ stake: 100, odd: 2.0, status: 'CASHOUT', type: 'Saldo Real', cashoutReturn: -10 })
  );

  const invalidPreview = calculateBetPreview({
    stake: 100,
    odd: 2.0,
    status: 'CASHOUT',
    type: 'Saldo Real',
    cashoutReturnInput: null
  });
  assert.equal(invalidPreview.cashoutValid, false);
  assert.equal(invalidPreview.gross, 0);
  assert.equal(invalidPreview.pl, 0);
});

// ---------------------------------------------------------------------------
// 4. Consistência entre criação, edição e liquidação de apostas
// ---------------------------------------------------------------------------
it('4. Criação, edição e liquidação usam exatamente a mesma regra matemática', () => {
  const createdPreview = calculateBetPreview({
    stake: 100,
    odd: 2.0,
    status: 'HALF_GREEN',
    type: 'Freebet'
  });
  const settled = calculateBetSettlement({
    stake: 100,
    odd: 2.0,
    status: 'HALF_GREEN',
    type: 'Freebet'
  });
  const normalizedEdited = normalizeBetEntry({
    id: 'b-edit',
    date: '01/05/2026',
    sport: 'Futebol',
    event: 'Time A vs Time B',
    market: 'Vencedor',
    stake: 100,
    odd: 2.0,
    type: 'Freebet',
    status: 'HALF_GREEN',
    // Simula valor errado legado antes da edição/normalização
    gross: 150,
    pl: 50
  });

  assert.equal(createdPreview.gross, 50);
  assert.equal(createdPreview.pl, 50);
  assert.equal(settled.gross, 50);
  assert.equal(settled.pl, 50);
  assert.equal(normalizedEdited.gross, 50);
  assert.equal(normalizedEdited.pl, 50);

  const pot = calculateBetPotential(100, 2.0, 'Freebet');
  assert.equal(pot.potentialGross, 100);
  assert.equal(pot.potentialPl, 100);
});

// ---------------------------------------------------------------------------
// 5. Separação estrita entre saldo real e promocional (F1-07 e F1-13)
// ---------------------------------------------------------------------------
it('5. Bônus Rollover e Freebet ficam isolados da banca real e dos depósitos reais', () => {
  const bets: BetEntry[] = [
    {
      id: 'b-real',
      date: '01/05/2026',
      sport: 'Futebol',
      event: 'Jogo Real',
      market: '1X2',
      odd: 2.0,
      stake: 100,
      units: 4,
      type: 'Saldo Real',
      status: 'GREEN',
      gross: 200,
      pl: 100
    },
    {
      id: 'b-rollover',
      date: '01/05/2026',
      sport: 'Futebol',
      event: 'Jogo Rollover',
      market: '1X2',
      odd: 2.0,
      stake: 100,
      units: 4,
      type: 'Bônus Rollover',
      status: 'GREEN',
      gross: 200,
      pl: 100
    },
    {
      id: 'b-freebet',
      date: '01/05/2026',
      sport: 'Futebol',
      event: 'Jogo Freebet',
      market: 'Over 2.5',
      odd: 2.0,
      stake: 50,
      units: 2,
      type: 'Freebet',
      status: 'GREEN',
      gross: 50,
      pl: 50
    }
  ];

  const treasury: TreasuryEntry[] = [
    {
      id: 'tx-dep',
      date: '01/05/2026',
      type: 'DEPOSIT',
      desc: 'PIX Depósito',
      amount: 500,
      status: 'Compensado'
    },
    {
      id: 'tx-bonus',
      date: '01/05/2026',
      type: 'BONUS',
      desc: 'Bônus Rollover 100%',
      amount: 300,
      status: 'Compensado'
    }
  ];

  const summary = computeFinancialMetrics({
    bets,
    treasury,
    freebets: [],
    freeSpins: [],
    promoConversions: [],
    settings: { initialBankroll: 1000, initialPromoBalance: 0 }
  });

  // Depósito real exclui BONUS
  assert.equal(summary.totalDeposits, 500);
  assert.equal(summary.bonusCredits, 300);

  // Banca real = 1000 + 500 + 100 (aposta real) = 1600 (sem contaminação promocional)
  assert.equal(summary.realBetProfit, 100);
  assert.equal(summary.realEquity, 1600);

  // Saldo promocional = 300 (bônus) + 100 (rollover) + 50 (freebet) = 450
  assert.equal(summary.rolloverBetProfit, 100);
  assert.equal(summary.totalFreebetsProfit, 50);
  assert.equal(summary.promoBetProfit, 150);
  assert.equal(summary.promoBalance, 450);
});

// ---------------------------------------------------------------------------
// 6. Conversão manual e bloqueio de duplicidade (F1-17)
// ---------------------------------------------------------------------------
it('6. Conversão manual exige confirmação, respeita saldo disponível e bloqueia duplicidade', () => {
  const existing: PromoConversionEntry[] = [
    {
      id: 'conv-1',
      amount: 30,
      date: '01/05/2026',
      origin: 'Bônus Rollover',
      promotionName: 'Boas-Vindas',
      idempotencyKey: 'key-1',
      sourceId: 'src-1'
    }
  ];

  // Sem confirmação explícita -> bloqueado
  const unconfirmed = validatePromoConversion(
    {
      amount: 20,
      date: '01/05/2026',
      origin: 'Bônus Rollover',
      promotionName: 'Promo X',
      confirmed: false
    },
    100,
    existing
  );
  assert.equal(unconfirmed.valid, false);

  // Superior ao saldo promocional disponível -> bloqueado
  const exceeds = validatePromoConversion(
    {
      amount: 150,
      date: '01/05/2026',
      origin: 'Bônus Rollover',
      promotionName: 'Promo X',
      confirmed: true
    },
    100,
    existing
  );
  assert.equal(exceeds.valid, false);

  // IdempotencyKey repetida -> bloqueado
  const dupKey = validatePromoConversion(
    {
      amount: 20,
      date: '01/05/2026',
      origin: 'Bônus Rollover',
      promotionName: 'Boas-Vindas',
      confirmed: true,
      idempotencyKey: 'key-1'
    },
    100,
    existing
  );
  assert.equal(dupKey.valid, false);

  // sourceId repetido -> bloqueado
  const dupSource = validatePromoConversion(
    {
      amount: 20,
      date: '01/05/2026',
      origin: 'Bônus Rollover',
      promotionName: 'Boas-Vindas',
      confirmed: true,
      sourceId: 'src-1'
    },
    100,
    existing
  );
  assert.equal(dupSource.valid, false);

  // Deduplicação em lote
  const deduped = deduplicatePromoConversions([
    ...existing,
    { ...existing[0], id: 'conv-2', idempotencyKey: 'key-1' },
    { ...existing[0], id: 'conv-3', sourceId: 'src-1', idempotencyKey: 'key-other' }
  ]);
  assert.equal(deduped.length, 1);

  // Conversão válida
  const valid = validatePromoConversion(
    {
      amount: 20,
      date: '01/05/2026',
      origin: 'Freebet Extraída',
      promotionName: 'Super Odd',
      confirmed: true,
      idempotencyKey: 'key-2'
    },
    100,
    existing
  );
  assert.equal(valid.valid, true);
  assert.equal(valid.normalizedAmount, 20);
});

// ---------------------------------------------------------------------------
// 7. Crédito automático de Giros Grátis e proteção contra duplicidade
// ---------------------------------------------------------------------------
it('7. Giros Grátis creditam automaticamente na banca real sem alterar saldo promocional nem duplicar', () => {
  const spins: FreeSpinEntry[] = [
    {
      id: 'fs-1',
      provider: 'Pragmatic Play',
      game: 'Gates of Olympus',
      bookmaker: 'Betano',
      spinsCount: 20,
      netProfit: 25,
      date: '01/05/2026',
      idempotencyKey: 'spin-key-1'
    },
    // Tentativa duplicada com mesma idempotencyKey
    {
      id: 'fs-2',
      provider: 'Pragmatic Play',
      game: 'Gates of Olympus',
      bookmaker: 'Betano',
      spinsCount: 20,
      netProfit: 25,
      date: '01/05/2026',
      idempotencyKey: 'spin-key-1'
    }
  ];

  assert.equal(deduplicateFreeSpins(spins).length, 1);

  const metrics = computeFinancialMetrics({
    bets: [],
    treasury: [],
    freebets: [],
    freeSpins: spins,
    promoConversions: [],
    settings: { initialBankroll: 1000, initialPromoBalance: 200 }
  });

  assert.equal(metrics.totalSpinsProfit, 25);
  assert.equal(metrics.realEquity, 1025);
  assert.equal(metrics.promoBalance, 200);
});

// ---------------------------------------------------------------------------
// 8. Depósitos e saques por status (F1-16)
// ---------------------------------------------------------------------------
it('8. Apenas movimentações Compensado alteram saldos; Pendente e Processando não alteram', () => {
  const treasury: TreasuryEntry[] = [
    { id: 't1', date: '01/05/2026', type: 'DEPOSIT', desc: 'Depósito OK', amount: 500, status: 'Compensado' },
    { id: 't2', date: '01/05/2026', type: 'DEPOSIT', desc: 'Depósito Pendente', amount: 400, status: 'Pendente' },
    { id: 't3', date: '01/05/2026', type: 'WITHDRAW', desc: 'Saque OK', amount: 150, status: 'Compensado' },
    { id: 't4', date: '01/05/2026', type: 'WITHDRAW', desc: 'Saque Processando', amount: 300, status: 'Processando' },
    { id: 't5', date: '01/05/2026', type: 'BONUS', desc: 'Bônus Pendente', amount: 200, status: 'Pendente' },
    { id: 't6', date: '01/05/2026', type: 'BONUS', desc: 'Bônus OK', amount: 100, status: 'Compensado' }
  ];

  const metrics = computeFinancialMetrics({
    bets: [],
    treasury,
    freebets: [],
    freeSpins: [],
    promoConversions: [],
    settings: { initialBankroll: 1000, initialPromoBalance: 0 }
  });

  assert.equal(metrics.totalDeposits, 500);
  assert.equal(metrics.pendingDeposits, 400);
  assert.equal(metrics.totalWithdrawals, 150);
  assert.equal(metrics.pendingWithdrawals, 300);
  assert.equal(metrics.bonusCredits, 100);
  assert.equal(metrics.pendingBonusCredits, 200);

  // 1000 + 500 - 150 = 1350 (pendentes ignorados)
  assert.equal(metrics.realEquity, 1350);
  assert.equal(metrics.promoBalance, 100);
});

// ---------------------------------------------------------------------------
// 9. Exposição e saldo disponível (F1-05)
// ---------------------------------------------------------------------------
it('9. Exposição reduz apenas o saldo disponível, preservando patrimônio real', () => {
  const pendingRealBet: BetEntry = {
    id: 'b-pend-real',
    date: '01/05/2026',
    sport: 'Futebol',
    event: 'Jogo Ao Vivo',
    market: '1X2',
    odd: 2.0,
    stake: 100,
    units: 4,
    type: 'Saldo Real',
    status: 'PENDENTE',
    gross: 0,
    pl: 0
  };
  const pendingRolloverBet: BetEntry = {
    id: 'b-pend-rollover',
    date: '01/05/2026',
    sport: 'Futebol',
    event: 'Jogo Promo',
    market: 'Over 1.5',
    odd: 1.8,
    stake: 40,
    units: 1.6,
    type: 'Bônus Rollover',
    status: 'PENDENTE',
    gross: 0,
    pl: 0
  };

  const metrics = computeFinancialMetrics({
    bets: [pendingRealBet, pendingRolloverBet],
    treasury: [],
    freebets: [],
    freeSpins: [],
    promoConversions: [],
    settings: { initialBankroll: 1000, initialPromoBalance: 200 }
  });

  // Exemplo obrigatório: patrimônio real R$ 1.000 e exposição R$ 100 -> disponível R$ 900
  assert.equal(metrics.realEquity, 1000);
  assert.equal(metrics.realExposure, 100);
  assert.equal(metrics.availableRealBalance, 900);

  // Exposição em Bônus Rollover afeta apenas availablePromoBalance
  assert.equal(metrics.promoBalance, 200);
  assert.equal(metrics.rolloverExposure, 40);
  assert.equal(metrics.availablePromoBalance, 160);
});

// ---------------------------------------------------------------------------
// 10. ROI real, exclusão de VOID do turnover e indicadores promocionais (F1-12)
// ---------------------------------------------------------------------------
it('10. ROI real exclui Freebet, Rollover e VOID do turnover; Analytics separa escopos', () => {
  assert.ok(TURNOVER_POLICY_DOC.includes('VOID'));
  assert.ok(TURNOVER_POLICY_DOC.includes('Freebet'));

  const bets: BetEntry[] = [
    {
      id: '1',
      date: '01/05/2026',
      sport: 'Futebol',
      event: 'Real Green',
      market: 'Escanteios Over 9.5',
      odd: 2.0,
      stake: 100,
      units: 4,
      type: 'Saldo Real',
      status: 'GREEN',
      gross: 200,
      pl: 100,
      bookmaker: 'Bet365'
    },
    {
      id: '2',
      date: '01/05/2026',
      sport: 'Futebol',
      event: 'Real Void',
      market: 'Handicap Asiático 0.0',
      odd: 1.9,
      stake: 500,
      units: 20,
      type: 'Saldo Real',
      status: 'VOID',
      gross: 500,
      pl: 0,
      bookmaker: 'Bet365'
    },
    {
      id: '3',
      date: '01/05/2026',
      sport: 'Basquete',
      event: 'Freebet Green',
      market: 'Moneyline',
      odd: 3.0,
      stake: 100,
      units: 4,
      type: 'Freebet',
      status: 'GREEN',
      gross: 200,
      pl: 200,
      bookmaker: 'Betano'
    }
  ];

  const metrics = computeFinancialMetrics({
    bets,
    treasury: [],
    freebets: [],
    freeSpins: [],
    promoConversions: [],
    settings: { initialBankroll: 1000, initialPromoBalance: 0 }
  });

  // Turnover real = 100 (VOID de 500 excluído, Freebet de 100 excluído)
  assert.equal(metrics.realTurnover, 100);
  assert.equal(metrics.realVoidVolume, 500);
  assert.equal(metrics.realBetProfit, 100);
  assert.equal(metrics.roi, 100); // +100 / 100 = 100%

  // Indicadores promocionais separados
  assert.equal(metrics.promoTurnover, 100);
  assert.equal(metrics.promoBetProfit, 200);
  assert.equal(metrics.promoRoi, 200);
  assert.equal(metrics.freebetExtractionRate, 200);

  const realAnalytics = computeScopedAnalytics(bets, 'Saldo Real');
  const promoAnalytics = computeScopedAnalytics(bets, 'Promocional');

  assert.equal(realAnalytics.totalVolume, 100);
  assert.equal(realAnalytics.totalPl, 100);
  assert.equal(realAnalytics.totalRoi, 100);

  assert.equal(promoAnalytics.totalVolume, 100);
  assert.equal(promoAnalytics.totalPl, 200);
  assert.equal(promoAnalytics.totalRoi, 200);
});

// ---------------------------------------------------------------------------
// 11. Sincronização de Freebets com Livro-Razão (F1-04)
// ---------------------------------------------------------------------------
it('11. Freebet <-> Livro-Razão sincronizam 1:1 sem duplicidade e pendente carrega retorno 0', () => {
  assert.equal(mapFreebetStatusToBetStatus('Ao Vivo'), 'PENDENTE');
  assert.equal(mapFreebetStatusToBetStatus('Pendente'), 'PENDENTE');
  assert.equal(mapFreebetStatusToBetStatus('Creditado'), 'GREEN');
  assert.equal(mapFreebetStatusToBetStatus('Expirado'), 'VOID');

  assert.equal(mapBetStatusToFreebetStatus('GREEN'), 'Creditado');
  assert.equal(mapBetStatusToFreebetStatus('HALF_GREEN'), 'Creditado');
  assert.equal(mapBetStatusToFreebetStatus('RED'), 'Expirado');
  assert.equal(mapBetStatusToFreebetStatus('HALF_RED'), 'Expirado');
  assert.equal(mapBetStatusToFreebetStatus('VOID'), 'Expirado');
  assert.equal(mapBetStatusToFreebetStatus('CASHOUT', 40), 'Creditado');
  assert.equal(mapBetStatusToFreebetStatus('CASHOUT', 0), 'Expirado');

  // Registro pendente não pode aparentar lucro realizado
  assert.equal(calculateFreebetRealizedReturn(50, 3.0, 'Ao Vivo'), 0);
  assert.equal(calculateFreebetRealizedReturn(50, 3.0, 'Pendente'), 0);
  assert.equal(calculateFreebetPotentialReturn(50, 3.0), 100);

  const linkedBet: BetEntry = {
    id: 'bet-fb-1',
    date: '01/05/2026',
    sport: 'Futebol',
    event: 'Arsenal vs Chelsea',
    market: 'Arsenal ML',
    odd: 3.0,
    stake: 50,
    units: 2,
    type: 'Freebet',
    status: 'GREEN',
    gross: 100,
    pl: 100,
    bookmaker: 'Betano',
    freebetId: 'fb-1'
  };

  const linkedFreebet: FreebetEntry = {
    id: 'fb-1',
    bookmaker: 'Betano',
    event: 'Arsenal vs Chelsea',
    selection: 'Arsenal ML',
    bonusAmount: 50,
    odd: 3.0,
    netReturn: 100,
    status: 'Creditado',
    date: '01/05/2026',
    linkedBetId: 'bet-fb-1'
  };

  assert.equal(findLinkedBetForFreebet(linkedFreebet, [linkedBet])?.id, 'bet-fb-1');
  assert.equal(findLinkedFreebetForBet(linkedBet, [linkedFreebet])?.id, 'fb-1');

  // Mesmo existindo nos dois arrays, o total não pode ser contado duas vezes (deve ser 100, não 200)
  const metrics = computeFinancialMetrics({
    bets: [linkedBet],
    treasury: [],
    freebets: [linkedFreebet],
    freeSpins: [],
    promoConversions: [],
    settings: { initialBankroll: 1000, initialPromoBalance: 0 }
  });
  assert.equal(metrics.freebetLedgerProfit, 100);
  assert.equal(metrics.unlinkedFreebetProfit, 0);
  assert.equal(metrics.totalFreebetsProfit, 100);
  assert.equal(metrics.promoBalance, 100);
  assert.equal(metrics.realEquity, 1000);
});

// ---------------------------------------------------------------------------
// 12. Persistência, cura de registros legados, Drawdown e Simulação Obrigatória (Seção 5)
// ---------------------------------------------------------------------------
it('12A. Cura de registros antigos (normalizeBetEntry, normalizeFreebetEntry, mapRowToBet) e Drawdown', () => {
  // Freebet pendente salva antigamente com netReturn fictício 100 -> curada para 0
  const healedFb = normalizeFreebetEntry(
    {
      id: 'fb-old',
      bookmaker: 'Betano',
      event: 'Jogo',
      selection: 'Home',
      bonusAmount: 50,
      odd: 3.0,
      netReturn: 100,
      status: 'Ao Vivo',
      date: '01/05/2026'
    },
    (id) => String(id)
  );
  assert.equal(healedFb.netReturn, 0);

  // Freebet HALF_RED antiga salva com prejuízo -50 -> curada para 0
  const healedHalfRedBet = normalizeBetEntry({
    id: 'b-old-hr',
    stake: 100,
    odd: 2.0,
    type: 'Freebet',
    status: 'HALF_RED',
    gross: 50,
    pl: -50
  });
  assert.equal(healedHalfRedBet.gross, 0);
  assert.equal(healedHalfRedBet.pl, 0);

  // Linha legada do Supabase em Cashout sem cashout_return mas com gross/lucro_prejuizo
  const supaCashout = mapRowToBet({
    id: 'row-cashout',
    odd: 2.0,
    stake: 100,
    status: 'CASHOUT',
    lucro_prejuizo: -35,
    notas: JSON.stringify({ type: 'Saldo Real', cashoutReturn: 65, gross: 65 })
  });
  assert.equal(supaCashout.gross, 65);
  assert.equal(supaCashout.pl, -35);
  assert.equal(supaCashout.cashoutReturn, 65);

  // Drawdown sobre apostas reais: 1000 -> +200 (1200 pico) -> -300 (900) => 25% drawdown
  const dd = computeBettingDrawdownAndStreaks(
    [
      {
        id: 'dd2',
        date: '02/05/2026',
        sport: 'Futebol',
        event: 'J2',
        market: '1X2',
        odd: 2.0,
        stake: 300,
        units: 12,
        type: 'Saldo Real',
        status: 'RED',
        gross: 0,
        pl: -300
      },
      {
        id: 'dd1',
        date: '01/05/2026',
        sport: 'Futebol',
        event: 'J1',
        market: '1X2',
        odd: 2.0,
        stake: 200,
        units: 8,
        type: 'Saldo Real',
        status: 'GREEN',
        gross: 400,
        pl: 200
      }
    ],
    1000
  );
  assert.equal(dd.bettingDrawdownPct, 25);
});

it('12B. Simulação Obrigatória de Integridade da Banca (Seção 5)', () => {
  // Passo 1: Estado inicial: Banca real R$ 1.000 | Saldo promocional R$ 200
  const baseSettings = { initialBankroll: 1000, initialPromoBalance: 200 };

  // Passo 2: Lucro de aposta real +R$ 100 & Lucro promocional +R$ 50
  const simBets: BetEntry[] = [
    {
      id: 'sim-real-1',
      date: '01/05/2026',
      sport: 'Futebol',
      event: 'Sim Real',
      market: '1X2',
      odd: 2.0,
      stake: 100,
      units: 4,
      type: 'Saldo Real',
      status: 'GREEN',
      gross: 200,
      pl: 100
    },
    {
      id: 'sim-promo-1',
      date: '01/05/2026',
      sport: 'Futebol',
      event: 'Sim Promo',
      market: '1X2',
      odd: 2.0,
      stake: 50,
      units: 2,
      type: 'Freebet',
      status: 'GREEN',
      gross: 50,
      pl: 50
    }
  ];

  const afterBets = computeFinancialMetrics({
    bets: simBets,
    treasury: [],
    freebets: [],
    freeSpins: [],
    promoConversions: [],
    settings: baseSettings
  });
  assert.equal(afterBets.realEquity, 1100);
  assert.equal(afterBets.promoBalance, 250);

  // Passo 3: Conversão manual de R$ 30
  const convReq = {
    amount: 30,
    date: '01/05/2026',
    origin: 'Freebet Extraída',
    promotionName: 'Simulação Integridade',
    confirmed: true,
    idempotencyKey: 'sim-conv-30',
    sourceId: 'sim-source-30'
  };
  const convValidation = validatePromoConversion(convReq, afterBets.availablePromoBalance, []);
  assert.equal(convValidation.valid, true);

  const conversions: PromoConversionEntry[] = [
    {
      id: 'conv-sim-1',
      amount: convValidation.normalizedAmount!,
      date: convReq.date,
      origin: convReq.origin,
      promotionName: convReq.promotionName,
      idempotencyKey: convReq.idempotencyKey,
      sourceId: convReq.sourceId
    }
  ];

  const afterConversion = computeFinancialMetrics({
    bets: simBets,
    treasury: [],
    freebets: [],
    freeSpins: [],
    promoConversions: conversions,
    settings: baseSettings
  });
  // Resultado esperado: Banca real R$ 1.130 | Saldo promocional R$ 220
  assert.equal(afterConversion.realEquity, 1130);
  assert.equal(afterConversion.promoBalance, 220);

  // Passo 4: Registrar R$ 25 de lucro em Giros Grátis
  const simSpins: FreeSpinEntry[] = [
    {
      id: 'sim-spin-1',
      provider: 'Pragmatic Play',
      game: 'Sweet Bonanza',
      bookmaker: 'Betano',
      spinsCount: 25,
      netProfit: 25,
      date: '01/05/2026',
      idempotencyKey: 'sim-spin-key-25'
    }
  ];

  const afterSpins = computeFinancialMetrics({
    bets: simBets,
    treasury: [],
    freebets: [],
    freeSpins: simSpins,
    promoConversions: conversions,
    settings: baseSettings
  });
  // Resultado esperado: Banca real R$ 1.155 | Saldo promocional R$ 220
  assert.equal(afterSpins.realEquity, 1155);
  assert.equal(afterSpins.promoBalance, 220);

  // Passo 5: Conversão de R$ 30 não pode ser repetida indevidamente
  const repeatValidation = validatePromoConversion(
    convReq,
    afterSpins.availablePromoBalance,
    conversions
  );
  assert.equal(repeatValidation.valid, false);

  const withDuplicateAttempt = computeFinancialMetrics({
    bets: simBets,
    treasury: [],
    freebets: [],
    freeSpins: simSpins,
    promoConversions: [
      ...conversions,
      { ...conversions[0], id: 'conv-sim-dup' }
    ],
    settings: baseSettings
  });
  assert.equal(withDuplicateAttempt.realEquity, 1155);
  assert.equal(withDuplicateAttempt.promoBalance, 220);

  console.log(
    JSON.stringify({
      simulacaoSecao5: {
        inicial: { realEquity: 1000, promoBalance: 200 },
        aposApostas: { realEquity: afterBets.realEquity, promoBalance: afterBets.promoBalance },
        aposConversao30: {
          realEquity: afterConversion.realEquity,
          promoBalance: afterConversion.promoBalance
        },
        aposGiros25: { realEquity: afterSpins.realEquity, promoBalance: afterSpins.promoBalance },
        bloqueioDuplicidade: {
          valid: repeatValidation.valid,
          realEquityFinal: withDuplicateAttempt.realEquity,
          promoBalanceFinal: withDuplicateAttempt.promoBalance
        }
      }
    })
  );
});

// Runner
let passed = 0;
let failed = 0;

for (const t of tests) {
  try {
    t.fn();
    passed++;
    console.log(`PASS: ${t.name}`);
  } catch (err: any) {
    failed++;
    console.error(`FAIL: ${t.name}`);
    console.error(err?.stack || err);
  }
}

console.log(`\nRESUMO_TESTES: total=${tests.length} aprovados=${passed} reprovados=${failed}`);
if (failed > 0) {
  process.exit(1);
}
