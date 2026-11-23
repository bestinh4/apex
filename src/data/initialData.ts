import {
  BetEntry,
  TreasuryEntry,
  FreebetEntry,
  FreeSpinEntry,
  PromoConversionEntry,
  AppSettings
} from '../types';

// Clean default state ready for real use
export const initialBets: BetEntry[] = [];
export const initialTreasury: TreasuryEntry[] = [];
export const initialFreebets: FreebetEntry[] = [];
export const initialFreeSpins: FreeSpinEntry[] = [];
export const initialPromoConversions: PromoConversionEntry[] = [];

// Optional sample dataset if the user wants to test/preview
export const demoBets: BetEntry[] = [
  {
    id: "APX-9821",
    date: "18/05/2025 16:00",
    sport: "Futebol",
    event: "Real Madrid vs Manchester City",
    market: "Over 2.5 Gols FT",
    odd: 1.95,
    stake: 50.00,
    units: 2.0,
    type: "Saldo Real",
    status: "GREEN",
    gross: 97.50,
    pl: 47.50,
    bookmaker: "Bet365",
    closingOdd: 1.88
  },
  {
    id: "APX-9820",
    date: "18/05/2025 14:30",
    sport: "Basquete",
    event: "Boston Celtics vs NY Knicks",
    market: "Boston -5.5 Spread",
    odd: 1.90,
    stake: 75.00,
    units: 3.0,
    type: "Saldo Real",
    status: "GREEN",
    gross: 142.50,
    pl: 67.50,
    bookmaker: "Pinnacle",
    closingOdd: 1.84
  },
  {
    id: "APX-9819",
    date: "17/05/2025 21:00",
    sport: "Futebol",
    event: "Flamengo vs Palmeiras",
    market: "Ambas Marcam: Sim",
    odd: 1.83,
    stake: 50.00,
    units: 2.0,
    type: "Saldo Real",
    status: "RED",
    gross: 0.00,
    pl: -50.00,
    bookmaker: "Betano",
    closingOdd: 1.81
  },
  {
    id: "APX-9818",
    date: "17/05/2025 19:15",
    sport: "Tênis",
    event: "C. Alcaraz vs J. Sinner",
    market: "Alcaraz Vence 1º Set",
    odd: 2.10,
    stake: 25.00,
    units: 1.0,
    type: "Saldo Real",
    status: "GREEN",
    gross: 52.50,
    pl: 27.50,
    bookmaker: "Bet365",
    closingOdd: 2.02
  },
  {
    id: "APX-9817",
    date: "16/05/2025 22:00",
    sport: "MMA / eSports",
    event: "UFC 305: Main Card",
    market: "Luta Não Vai Até o Fim",
    odd: 1.72,
    stake: 100.00,
    units: 4.0,
    type: "Saldo Real",
    status: "HALF_GREEN",
    gross: 136.00,
    pl: 36.00,
    bookmaker: "Betfair",
    closingOdd: 1.68
  },
  {
    id: "APX-9815",
    date: "15/05/2025 20:30",
    sport: "Basquete",
    event: "Golden State vs LA Lakers",
    market: "S. Curry Over 4.5 Triplos",
    odd: 1.92,
    stake: 25.00,
    units: 1.0,
    type: "Freebet",
    status: "GREEN",
    gross: 23.00,
    pl: 23.00,
    bookmaker: "Betano",
    closingOdd: 1.85
  },
  {
    id: "APX-9814",
    date: "15/05/2025 15:45",
    sport: "Futebol",
    event: "Bayern München vs Dortmund",
    market: "Over 3.5 Gols FT",
    odd: 2.15,
    stake: 60.00,
    units: 2.4,
    type: "Saldo Real",
    status: "RED",
    gross: 0.00,
    pl: -60.00,
    bookmaker: "Bet365",
    closingOdd: 2.10
  },
  {
    id: "APX-9811",
    date: "13/05/2025 21:00",
    sport: "MMA / eSports",
    event: "CS2 Major: Navi vs Furia",
    market: "Navi ML",
    odd: 1.65,
    stake: 125.00,
    units: 5.0,
    type: "Saldo Real",
    status: "GREEN",
    gross: 206.25,
    pl: 81.25,
    bookmaker: "Bet365",
    closingOdd: 1.58
  }
];

export const demoTreasury: TreasuryEntry[] = [];

export const demoFreebets: FreebetEntry[] = [
  {
    id: "FB-001",
    bookmaker: "Betano",
    event: "Arsenal vs Bayern Munique",
    selection: "Mais de 2.5 Gols",
    bonusAmount: 50.00,
    odd: 2.10,
    netReturn: 0.00,
    status: "Ao Vivo",
    date: "Hoje, 16:00"
  }
];

export const demoFreeSpins: FreeSpinEntry[] = [
  {
    id: "FS-001",
    provider: "Pragmatic Play",
    game: "Gates of Olympus",
    bookmaker: "Betano",
    spinsCount: 10,
    netProfit: 28.50,
    date: "Ontem, 21:14"
  }
];

export const defaultSettings: AppSettings = {
  initialBankroll: 1000.00,
  initialPromoBalance: 0.00,
  unitValue: 25.00,
  kellyFraction: "KELLY CRITERION 2.4 FRACTIONAL",
  maxDrawdownLimitPct: 25.0,
  monthlyTargetPct: 30.0,
  supabaseEndpoint: "",
  supabaseSyncIntervalSec: 10,
  autoSync: true
};
