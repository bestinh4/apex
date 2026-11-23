export type BetStatus = 'GREEN' | 'RED' | 'HALF_GREEN' | 'HALF_RED' | 'VOID' | 'CASHOUT' | 'PENDENTE';

export type BetFundType = 'Saldo Real' | 'Freebet' | 'Bônus Rollover';

export interface BetEntry {
  id: string;
  date: string;
  sport: string;
  event: string;
  market: string;
  odd: number;
  stake: number;
  units: number;
  type: BetFundType;
  status: BetStatus;
  gross: number;
  pl: number;
  cashoutReturn?: number;
  freebetId?: string;
  bookmaker?: string;
  closingOdd?: number;
}

export type TreasuryType = 'DEPOSIT' | 'WITHDRAW' | 'BONUS';

export interface TreasuryEntry {
  id: string;
  date: string;
  type: TreasuryType;
  desc: string;
  details?: string;
  amount: number;
  status: 'Compensado' | 'Pendente' | 'Processando';
}

export interface FreebetEntry {
  id: string;
  bookmaker: string;
  event: string;
  selection: string;
  bonusAmount: number;
  odd: number;
  netReturn: number;
  status: 'Ao Vivo' | 'Creditado' | 'Pendente' | 'Expirado';
  date: string;
  linkedBetId?: string;
}

export interface FreeSpinEntry {
  id: string;
  provider: string;
  game: string;
  bookmaker: string;
  spinsCount: number;
  netProfit: number;
  date: string;
  idempotencyKey?: string;
}

export interface PromoConversionEntry {
  id: string;
  amount: number;
  date: string;
  origin: string;
  promotionName: string;
  bookmaker?: string;
  notes?: string;
  idempotencyKey?: string;
  sourceId?: string;
  createdAtIso?: string;
}

export interface AppSettings {
  initialBankroll: number;
  initialPromoBalance?: number;
  unitValue: number;
  kellyFraction: string;
  maxDrawdownLimitPct: number;
  monthlyTargetPct: number;
  supabaseEndpoint: string;
  supabaseSyncIntervalSec: number;
  autoSync: boolean;
}
