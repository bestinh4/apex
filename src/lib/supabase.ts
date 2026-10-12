import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { BetEntry, TreasuryEntry, FreebetEntry, FreeSpinEntry, AppSettings, BetStatus, BetFundType } from '../types';

export const SUPABASE_PROJECT_REF = 'giwvoaxkqmuepnjlrxgz';
export const SUPABASE_REGION = 'us-west-2';
export const DEFAULT_SUPABASE_URL = `https://${SUPABASE_PROJECT_REF}.supabase.co`;
export const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdpd3ZvYXhrcW11ZXBuamxyeGd6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYzNTM2ODksImV4cCI6MjA4MTkyOTY4OX0.JdHyQ8_qnD8ATlb7Gq4vuqyoSgcaPFtagQz7CNnXtnY';

const env = (import.meta as any).env || {};

const rawUrl =
  env.VITE_SUPABASE_URL ||
  env.NEXT_PUBLIC_SUPABASE_URL ||
  env.SUPABASE_URL ||
  '';

const rawAnonKey =
  env.VITE_SUPABASE_ANON_KEY ||
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  env.SUPABASE_ANON_KEY ||
  env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ||
  '';

// Only mark Supabase as active if real environment variables are provided (not empty and not the placeholder)
export const isSupabaseConfigured = Boolean(
  rawUrl &&
  rawAnonKey &&
  rawAnonKey !== 'YOUR_SUPABASE_ANON_PUBLIC_KEY' &&
  !rawUrl.includes('giwvoaxkqmuepnjlrxgz')
);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(rawUrl, rawAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true
      }
    })
  : null;

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function ensureValidUuid(id?: string): string {
  if (id && UUID_REGEX.test(id)) return id;
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Scopes non-UUID table IDs with userId so each user strictly accesses only their own rows
function toScopedId(userId: string, rawId: string): string {
  const prefix = `${userId}__`;
  return rawId.startsWith(prefix) ? rawId : `${prefix}${rawId}`;
}

function fromScopedId(userId: string, scopedId: string): string {
  const prefix = `${userId}__`;
  return scopedId.startsWith(prefix) ? scopedId.slice(prefix.length) : scopedId;
}

function safeNum(val: any, fallback = 0): number {
  const n = Number(val);
  return Number.isFinite(n) ? n : fallback;
}

function cleanStr(val: any, fallback: string): string {
  if (val === undefined || val === null) return fallback;
  const s = String(val).trim();
  if (!s || s === 'undefined' || s === 'null' || s === 'NaN') return fallback;
  return s;
}

function formatDateDisplay(rawDate: any, createdAt?: any): string {
  const str = cleanStr(rawDate, '');
  if (str) {
    const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoMatch) {
      return `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1]}`;
    }
    return str;
  }
  if (createdAt) {
    try {
      const d = new Date(createdAt);
      if (!Number.isNaN(d.getTime())) {
        return d.toLocaleDateString('pt-BR');
      }
    } catch {
      // ignore
    }
  }
  return new Date().toLocaleDateString('pt-BR');
}

function toIsoDateOnly(displayDate?: string): string {
  if (displayDate) {
    const brMatch = displayDate.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (brMatch) {
      return `${brMatch[3]}-${brMatch[2]}-${brMatch[1]}`;
    }
    const isoMatch = displayDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
    }
  }
  return new Date().toISOString().slice(0, 10);
}

function normalizeStatus(raw: any): BetStatus {
  const s = cleanStr(raw, 'GREEN').toUpperCase();
  const allowed: BetStatus[] = [
    'GREEN',
    'RED',
    'HALF_GREEN',
    'HALF_RED',
    'VOID',
    'CASHOUT',
    'PENDENTE'
  ];
  if (allowed.includes(s as BetStatus)) return s as BetStatus;
  if (s === 'GANHA' || s === 'WON' || s === 'WIN') return 'GREEN';
  if (s === 'PERDIDA' || s === 'LOST' || s === 'LOSS') return 'RED';
  if (s === 'ABERTA' || s === 'OPEN' || s === 'PENDING') return 'PENDENTE';
  return 'GREEN';
}

function computeFallbackGrossAndPL(
  stake: number,
  odd: number,
  status: BetStatus,
  fundType: BetFundType
): { gross: number; pl: number } {
  if (status === 'GREEN') {
    const gross = fundType === 'Freebet' ? stake * (odd - 1) : stake * odd;
    const pl = fundType === 'Freebet' ? gross : gross - stake;
    return { gross, pl };
  }
  if (status === 'HALF_GREEN') {
    const gross =
      fundType === 'Freebet' ? (stake * (odd - 1)) / 2 : stake + (stake * (odd - 1)) / 2;
    const pl = fundType === 'Freebet' ? gross : gross - stake;
    return { gross, pl };
  }
  if (status === 'RED') {
    return { gross: 0, pl: fundType === 'Freebet' ? 0 : -stake };
  }
  if (status === 'HALF_RED') {
    return {
      gross: fundType === 'Freebet' ? 0 : stake / 2,
      pl: fundType === 'Freebet' ? 0 : -stake / 2
    };
  }
  if (status === 'VOID') {
    return { gross: fundType === 'Freebet' ? 0 : stake, pl: 0 };
  }
  if (status === 'CASHOUT') {
    const gross = stake * 1.15;
    return { gross, pl: gross - stake };
  }
  return { gross: 0, pl: 0 };
}

// SQL script with strict Multi-User Isolation (RLS by auth.uid())
export const SUPABASE_SQL_SCHEMA = `-- ============================================================================
-- APEX BANKROLL - MULTI-USER SUPABASE SCHEMA (Project: giwvoaxkqmuepnjlrxgz)
-- Isolamento individual por usuário autenticado (Row Level Security)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.bets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  data DATE DEFAULT CURRENT_DATE,
  evento TEXT NOT NULL,
  mercado TEXT NOT NULL,
  odd NUMERIC(10, 2) NOT NULL,
  stake NUMERIC(12, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'GREEN',
  lucro_prejuizo NUMERIC(12, 2) NOT NULL DEFAULT 0,
  categoria TEXT DEFAULT 'Futebol',
  notas TEXT DEFAULT '',
  user_id UUID DEFAULT auth.uid()
);

CREATE TABLE IF NOT EXISTS public.treasury (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  type TEXT NOT NULL,
  "desc" TEXT NOT NULL,
  details TEXT,
  amount NUMERIC(12, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'Compensado',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.freebets (
  id TEXT PRIMARY KEY,
  bookmaker TEXT NOT NULL,
  event TEXT NOT NULL,
  selection TEXT NOT NULL,
  bonus_amount NUMERIC(12, 2) NOT NULL,
  odd NUMERIC(10, 2) NOT NULL,
  net_return NUMERIC(12, 2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Ao Vivo',
  date TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.free_spins (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  game TEXT NOT NULL,
  bookmaker TEXT NOT NULL,
  spins_count INTEGER NOT NULL DEFAULT 0,
  net_profit NUMERIC(12, 2) NOT NULL DEFAULT 0,
  date TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.app_settings (
  id TEXT PRIMARY KEY,
  initial_bankroll NUMERIC(12, 2) NOT NULL DEFAULT 1000.00,
  unit_value NUMERIC(12, 2) NOT NULL DEFAULT 25.00,
  kelly_fraction TEXT NOT NULL DEFAULT 'KELLY CRITERION 2.4 FRACTIONAL',
  max_drawdown_limit_pct NUMERIC(6, 2) NOT NULL DEFAULT 25.00,
  monthly_target_pct NUMERIC(6, 2) NOT NULL DEFAULT 30.00,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treasury ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.freebets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.free_spins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow full access to bets" ON public.bets;
DROP POLICY IF EXISTS "Users manage own bets" ON public.bets;
CREATE POLICY "Users manage own bets" ON public.bets
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow full access to treasury" ON public.treasury;
DROP POLICY IF EXISTS "Users manage own treasury" ON public.treasury;
CREATE POLICY "Users manage own treasury" ON public.treasury
  FOR ALL USING (id LIKE auth.uid()::text || '__%') WITH CHECK (id LIKE auth.uid()::text || '__%');

DROP POLICY IF EXISTS "Allow full access to freebets" ON public.freebets;
DROP POLICY IF EXISTS "Users manage own freebets" ON public.freebets;
CREATE POLICY "Users manage own freebets" ON public.freebets
  FOR ALL USING (id LIKE auth.uid()::text || '__%') WITH CHECK (id LIKE auth.uid()::text || '__%');

DROP POLICY IF EXISTS "Allow full access to free_spins" ON public.free_spins;
DROP POLICY IF EXISTS "Users manage own free_spins" ON public.free_spins;
CREATE POLICY "Users manage own free_spins" ON public.free_spins
  FOR ALL USING (id LIKE auth.uid()::text || '__%') WITH CHECK (id LIKE auth.uid()::text || '__%');

DROP POLICY IF EXISTS "Allow full access to app_settings" ON public.app_settings;
DROP POLICY IF EXISTS "Users manage own settings" ON public.app_settings;
CREATE POLICY "Users manage own settings" ON public.app_settings
  FOR ALL USING (id = auth.uid()::text) WITH CHECK (id = auth.uid()::text);`;

export const mapRowToBet = (r: any, unitValue = 25): BetEntry => {
  let meta: Record<string, any> = {};
  if (typeof r?.notas === 'string' && r.notas.trim().startsWith('{')) {
    try {
      meta = JSON.parse(r.notas);
    } catch {
      meta = {};
    }
  }

  const odd = safeNum(r?.odd, 1.0);
  const stake = safeNum(r?.stake, 0);
  const status = normalizeStatus(r?.status);
  const fundType: BetFundType =
    r?.type === 'Freebet' || meta?.type === 'Freebet'
      ? 'Freebet'
      : r?.type === 'Bônus Rollover' || meta?.type === 'Bônus Rollover'
      ? 'Bônus Rollover'
      : 'Saldo Real';

  const fallbackCalc = computeFallbackGrossAndPL(stake, odd, status, fundType);

  const rawPL =
    r?.pl !== undefined && r?.pl !== null && Number.isFinite(Number(r.pl))
      ? Number(r.pl)
      : r?.lucro_prejuizo !== undefined &&
        r?.lucro_prejuizo !== null &&
        Number.isFinite(Number(r.lucro_prejuizo))
      ? Number(r.lucro_prejuizo)
      : fallbackCalc.pl;

  const rawGross =
    r?.gross !== undefined && r?.gross !== null && Number.isFinite(Number(r.gross))
      ? Number(r.gross)
      : meta?.gross !== undefined && Number.isFinite(Number(meta.gross))
      ? Number(meta.gross)
      : status === 'PENDENTE'
      ? 0
      : Math.max(0, (fundType === 'Freebet' ? 0 : stake) + rawPL);

  const safeUnit = unitValue > 0 ? unitValue : 25;
  const rawUnits =
    r?.units !== undefined && r?.units !== null && Number.isFinite(Number(r.units))
      ? Number(r.units)
      : meta?.units !== undefined && Number.isFinite(Number(meta.units))
      ? Number(meta.units)
      : Number((stake / safeUnit).toFixed(2));

  const dateStr = formatDateDisplay(
    meta?.displayDate || r?.date || r?.data,
    r?.created_at
  );

  return {
    id: cleanStr(r?.id, ensureValidUuid()),
    date: dateStr,
    sport: cleanStr(r?.sport ?? r?.categoria ?? meta?.sport, 'Futebol'),
    event: cleanStr(r?.event ?? r?.evento, 'Evento Esportivo'),
    market: cleanStr(r?.market ?? r?.mercado, 'Mercado Principal'),
    odd,
    stake,
    units: rawUnits,
    type: fundType,
    status,
    gross: rawGross,
    pl: rawPL,
    bookmaker: cleanStr(r?.bookmaker ?? meta?.bookmaker, 'Bet365'),
    closingOdd:
      r?.closing_odd !== undefined && r?.closing_odd !== null
        ? safeNum(r.closing_odd)
        : meta?.closingOdd !== undefined
        ? safeNum(meta.closingOdd)
        : undefined
  };
};

const mapBetToPortugueseRow = (b: BetEntry, userId: string) => ({
  id: ensureValidUuid(b.id),
  user_id: userId,
  data: toIsoDateOnly(b.date),
  evento: cleanStr(b.event, 'Partida'),
  mercado: cleanStr(b.market, 'Mercado'),
  odd: safeNum(b.odd, 1.0),
  stake: safeNum(b.stake, 0),
  status: b.status,
  lucro_prejuizo: safeNum(b.pl, 0),
  categoria: cleanStr(b.sport, 'Futebol'),
  notas: JSON.stringify({
    bookmaker: b.bookmaker || 'Bet365',
    type: b.type || 'Saldo Real',
    units: safeNum(b.units, 1),
    gross: safeNum(b.gross, 0),
    displayDate: b.date,
    closingOdd: b.closingOdd
  })
});

const mapRowToTreasury = (r: any, userId: string): TreasuryEntry => ({
  id: fromScopedId(userId, cleanStr(r?.id, `TX-${Math.floor(1000 + Math.random() * 9000)}`)),
  date: cleanStr(r?.date ?? r?.data, new Date().toLocaleDateString('pt-BR')),
  type: r?.type === 'WITHDRAW' || r?.type === 'BONUS' ? r.type : 'DEPOSIT',
  desc: cleanStr(r?.desc ?? r?.descricao, 'Movimentação'),
  details: r?.details ? String(r.details) : undefined,
  amount: safeNum(r?.amount ?? r?.valor, 0),
  status: r?.status === 'Pendente' || r?.status === 'Processando' ? r.status : 'Compensado'
});

const mapTreasuryToRow = (t: TreasuryEntry, userId: string) => ({
  id: toScopedId(userId, t.id),
  date: t.date,
  type: t.type,
  desc: t.desc,
  details: t.details ?? null,
  amount: safeNum(t.amount, 0),
  status: t.status
});

const mapRowToFreebet = (r: any, userId: string): FreebetEntry => ({
  id: fromScopedId(userId, cleanStr(r?.id, `FB-${Math.floor(100 + Math.random() * 900)}`)),
  bookmaker: cleanStr(r?.bookmaker, 'Bet365'),
  event: cleanStr(r?.event ?? r?.evento, 'Evento'),
  selection: cleanStr(r?.selection ?? r?.mercado, 'Seleção'),
  bonusAmount: safeNum(r?.bonus_amount ?? r?.bonusAmount, 0),
  odd: safeNum(r?.odd, 2.0),
  netReturn: safeNum(r?.net_return ?? r?.netReturn, 0),
  status: r?.status || 'Ao Vivo',
  date: cleanStr(r?.date, 'Hoje')
});

const mapFreebetToRow = (f: FreebetEntry, userId: string) => ({
  id: toScopedId(userId, f.id),
  bookmaker: f.bookmaker,
  event: f.event,
  selection: f.selection,
  bonus_amount: safeNum(f.bonusAmount, 0),
  odd: safeNum(f.odd, 2.0),
  net_return: safeNum(f.netReturn, 0),
  status: f.status,
  date: f.date
});

const mapRowToFreeSpin = (r: any, userId: string): FreeSpinEntry => ({
  id: fromScopedId(userId, cleanStr(r?.id, `FS-${Math.floor(100 + Math.random() * 900)}`)),
  provider: cleanStr(r?.provider, 'Pragmatic Play'),
  game: cleanStr(r?.game, 'Slot'),
  bookmaker: cleanStr(r?.bookmaker, 'Betano'),
  spinsCount: safeNum(r?.spins_count ?? r?.spinsCount, 10),
  netProfit: safeNum(r?.net_profit ?? r?.netProfit, 0),
  date: cleanStr(r?.date, 'Hoje')
});

const mapFreeSpinToRow = (s: FreeSpinEntry, userId: string) => ({
  id: toScopedId(userId, s.id),
  provider: s.provider,
  game: s.game,
  bookmaker: s.bookmaker,
  spins_count: safeNum(s.spinsCount, 0),
  net_profit: safeNum(s.netProfit, 0),
  date: s.date
});

export async function fetchAllFromSupabase(userId: string) {
  if (!supabase || !userId) return null;

  const prefixPattern = `${userId}__%`;

  const [betsRes, treasuryRes, freebetsRes, spinsRes, settingsRes] = await Promise.all([
    supabase.from('bets').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    supabase.from('treasury').select('*').like('id', prefixPattern).order('created_at', { ascending: false }),
    supabase.from('freebets').select('*').like('id', prefixPattern).order('created_at', { ascending: false }),
    supabase.from('free_spins').select('*').like('id', prefixPattern).order('created_at', { ascending: false }),
    supabase.from('app_settings').select('*').eq('id', userId).maybeSingle()
  ]);

  if (betsRes.error) throw betsRes.error;

  const settingsRow = settingsRes.data;
  const resolvedUnitValue = settingsRow ? safeNum(settingsRow.unit_value, 25) : 25;

  return {
    bets: (betsRes.data || []).map((r) => mapRowToBet(r, resolvedUnitValue)),
    treasury: (treasuryRes.data || []).map((r) => mapRowToTreasury(r, userId)),
    freebets: (freebetsRes.data || []).map((r) => mapRowToFreebet(r, userId)),
    freeSpins: (spinsRes.data || []).map((r) => mapRowToFreeSpin(r, userId)),
    settings: settingsRow
      ? {
          initialBankroll: safeNum(settingsRow.initial_bankroll, 1000),
          unitValue: resolvedUnitValue,
          kellyFraction: String(settingsRow.kelly_fraction || 'KELLY CRITERION 2.4 FRACTIONAL'),
          maxDrawdownLimitPct: safeNum(settingsRow.max_drawdown_limit_pct, 25),
          monthlyTargetPct: safeNum(settingsRow.monthly_target_pct, 30)
        }
      : null
  };
}

export async function upsertBetToSupabase(bet: BetEntry, userId: string) {
  if (!supabase || !userId) return;
  const row = mapBetToPortugueseRow(bet, userId);
  await supabase.from('bets').upsert(row);
}

export async function deleteBetFromSupabase(id: string, userId: string) {
  if (!supabase || !userId) return;
  await supabase.from('bets').delete().eq('id', id).eq('user_id', userId);
}

export async function upsertTreasuryToSupabase(tx: TreasuryEntry, userId: string) {
  if (!supabase || !userId) return;
  await supabase.from('treasury').upsert(mapTreasuryToRow(tx, userId));
}

export async function deleteTreasuryFromSupabase(id: string, userId: string) {
  if (!supabase || !userId) return;
  await supabase.from('treasury').delete().eq('id', toScopedId(userId, id));
}

export async function upsertFreebetToSupabase(fb: FreebetEntry, userId: string) {
  if (!supabase || !userId) return;
  await supabase.from('freebets').upsert(mapFreebetToRow(fb, userId));
}

export async function deleteFreebetFromSupabase(id: string, userId: string) {
  if (!supabase || !userId) return;
  await supabase.from('freebets').delete().eq('id', toScopedId(userId, id));
}

export async function upsertFreeSpinToSupabase(spin: FreeSpinEntry, userId: string) {
  if (!supabase || !userId) return;
  await supabase.from('free_spins').upsert(mapFreeSpinToRow(spin, userId));
}

export async function deleteFreeSpinFromSupabase(id: string, userId: string) {
  if (!supabase || !userId) return;
  await supabase.from('free_spins').delete().eq('id', toScopedId(userId, id));
}

export async function upsertSettingsToSupabase(settings: AppSettings, userId: string) {
  if (!supabase || !userId) return;
  await supabase.from('app_settings').upsert({
    id: userId,
    initial_bankroll: safeNum(settings.initialBankroll, 1000),
    unit_value: safeNum(settings.unitValue, 25),
    kelly_fraction: settings.kellyFraction,
    max_drawdown_limit_pct: safeNum(settings.maxDrawdownLimitPct, 25),
    monthly_target_pct: safeNum(settings.monthlyTargetPct, 30),
    updated_at: new Date().toISOString()
  });
}

export async function pushAllStateToSupabase(
  payload: {
    bets: BetEntry[];
    treasury: TreasuryEntry[];
    freebets: FreebetEntry[];
    freeSpins: FreeSpinEntry[];
    settings: AppSettings;
  },
  userId: string
) {
  if (!supabase || !userId) return;

  const ops: Promise<any>[] = [upsertSettingsToSupabase(payload.settings, userId)];

  if (payload.bets.length > 0) {
    ops.push(
      Promise.resolve(
        supabase.from('bets').upsert(payload.bets.map((b) => mapBetToPortugueseRow(b, userId)))
      )
    );
  }
  if (payload.treasury.length > 0) {
    ops.push(
      Promise.resolve(
        supabase.from('treasury').upsert(payload.treasury.map((t) => mapTreasuryToRow(t, userId)))
      )
    );
  }
  if (payload.freebets.length > 0) {
    ops.push(
      Promise.resolve(
        supabase.from('freebets').upsert(payload.freebets.map((f) => mapFreebetToRow(f, userId)))
      )
    );
  }
  if (payload.freeSpins.length > 0) {
    ops.push(
      Promise.resolve(
        supabase.from('free_spins').upsert(payload.freeSpins.map((s) => mapFreeSpinToRow(s, userId)))
      )
    );
  }

  await Promise.all(ops);
}

export async function clearAllSupabaseTables(userId: string) {
  if (!supabase || !userId) return;
  const prefixPattern = `${userId}__%`;
  await Promise.all([
    supabase.from('bets').delete().eq('user_id', userId),
    supabase.from('treasury').delete().like('id', prefixPattern),
    supabase.from('freebets').delete().like('id', prefixPattern),
    supabase.from('free_spins').delete().like('id', prefixPattern)
  ]);
}
