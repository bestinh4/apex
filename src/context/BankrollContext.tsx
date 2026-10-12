import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef, ReactNode } from 'react';
import { BetEntry, TreasuryEntry, FreebetEntry, FreeSpinEntry, AppSettings, BetStatus } from '../types';
import {
  initialBets,
  initialTreasury,
  initialFreebets,
  initialFreeSpins,
  demoBets,
  demoTreasury,
  demoFreebets,
  demoFreeSpins,
  defaultSettings
} from '../data/initialData';
import {
  supabase,
  isSupabaseConfigured,
  ensureValidUuid,
  mapRowToBet,
  fetchAllFromSupabase,
  upsertBetToSupabase,
  deleteBetFromSupabase,
  upsertTreasuryToSupabase,
  deleteTreasuryFromSupabase,
  upsertFreebetToSupabase,
  deleteFreebetFromSupabase,
  upsertFreeSpinToSupabase,
  deleteFreeSpinFromSupabase,
  upsertSettingsToSupabase,
  pushAllStateToSupabase,
  clearAllSupabaseTables
} from '../lib/supabase';
import {
  getCurrentSession,
  setCurrentSession,
  getOrCreateDefaultSession,
  DEFAULT_USER,
  localLogin,
  localRegister,
  localResetPassword,
  localSignOut
} from '../lib/localAuth';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

interface BankrollContextType {
  currentUser: AuthUser | null;
  authLoading: boolean;
  signIn: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, pass: string, name?: string) => Promise<{ success: boolean; error?: string }>;
  resetPassword: (email: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  signOut: () => Promise<void>;
  bets: BetEntry[];
  treasury: TreasuryEntry[];
  freebets: FreebetEntry[];
  freeSpins: FreeSpinEntry[];
  settings: AppSettings;
  addBet: (bet: Omit<BetEntry, 'id' | 'gross' | 'pl'> & { gross?: number; pl?: number }) => void;
  updateBet: (id: string, updated: Partial<BetEntry>) => void;
  deleteBet: (id: string) => void;
  resolveBet: (id: string, status: BetStatus) => void;
  addTreasury: (tx: Omit<TreasuryEntry, 'id'>) => void;
  deleteTreasury: (id: string) => void;
  addFreebet: (fb: Omit<FreebetEntry, 'id'>) => void;
  updateFreebetStatus: (id: string, status: FreebetEntry['status']) => void;
  deleteFreebet: (id: string) => void;
  addFreeSpin: (spin: Omit<FreeSpinEntry, 'id'>) => void;
  deleteFreeSpin: (id: string) => void;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  resetData: () => void;
  loadDemoData: () => void;
  importBackup: (data: {
    bets?: BetEntry[];
    treasury?: TreasuryEntry[];
    freebets?: FreebetEntry[];
    freeSpins?: FreeSpinEntry[];
    settings?: AppSettings;
  }) => void;
  syncNow: () => Promise<boolean>;
  // Computed metrics
  totalDeposits: number;
  totalWithdrawals: number;
  netBetProfit: number;
  totalSpinsProfit: number;
  totalFreebetsProfit: number;
  currentEquity: number;
  activeExposure: number;
  openPositionsCount: number;
  settledBetsCount: number;
  winCount: number;
  lossCount: number;
  voidCount: number;
  winRate: number;
  turnoverVolume: number;
  roi: number;
  maxDrawdownPct: number;
  currentStreakText: string;
  maxWinStreak: number;
  maxLossStreak: number;
  monthlyTargetAmount: number;
  stopLossDistance: number;
  unitValue: number;
}

const BankrollContext = createContext<BankrollContextType | undefined>(undefined);

const STORAGE_VERSION = 'apex_bankroll_v3_';

const finiteNumber = (v: any, fallback = 0): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

function getStorageKey(userId: string, key: string): string {
  return `${STORAGE_VERSION}${userId}_${key}`;
}

export function BankrollProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);

  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [bets, setBets] = useState<BetEntry[]>(initialBets);
  const [treasury, setTreasury] = useState<TreasuryEntry[]>(initialTreasury);
  const [freebets, setFreebets] = useState<FreebetEntry[]>(initialFreebets);
  const [freeSpins, setFreeSpins] = useState<FreeSpinEntry[]>(initialFreeSpins);

  const loadedUserRef = useRef<string | null>(null);

  const loadUserData = (uid: string) => {
    try {
      let savedSettings = localStorage.getItem(getStorageKey(uid, 'settings'));
      if (!savedSettings) {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.includes('settings') && k !== getStorageKey(uid, 'settings')) {
            const val = localStorage.getItem(k);
            if (val) {
              savedSettings = val;
              break;
            }
          }
        }
      }
      const parsedSettings = savedSettings ? JSON.parse(savedSettings) : null;
      const userSettings: AppSettings = parsedSettings
        ? {
            ...defaultSettings,
            ...parsedSettings,
            initialBankroll: finiteNumber(
              parsedSettings.initialBankroll,
              defaultSettings.initialBankroll
            ),
            unitValue: finiteNumber(parsedSettings.unitValue, defaultSettings.unitValue)
          }
        : defaultSettings;
      setSettings(userSettings);

      let savedBets = localStorage.getItem(getStorageKey(uid, 'bets'));
      let parsedBets = savedBets ? JSON.parse(savedBets) : null;
      if (!parsedBets || (Array.isArray(parsedBets) && parsedBets.length === 0)) {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.includes('bets') && k !== getStorageKey(uid, 'bets')) {
            try {
              const candidate = JSON.parse(localStorage.getItem(k) || '');
              if (Array.isArray(candidate) && candidate.length > 0) {
                parsedBets = candidate;
                break;
              }
            } catch {}
          }
        }
      }
      if (parsedBets !== null && Array.isArray(parsedBets)) {
        setBets(parsedBets.map((item) => mapRowToBet(item, userSettings.unitValue)));
      } else {
        setBets(initialBets);
      }

      let savedTreasury = localStorage.getItem(getStorageKey(uid, 'treasury'));
      if (!savedTreasury) {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.includes('treasury') && k !== getStorageKey(uid, 'treasury')) {
            const v = localStorage.getItem(k);
            if (v) {
              savedTreasury = v;
              break;
            }
          }
        }
      }
      setTreasury(savedTreasury ? JSON.parse(savedTreasury) : initialTreasury);

      const savedFreebets = localStorage.getItem(getStorageKey(uid, 'freebets'));
      setFreebets(savedFreebets ? JSON.parse(savedFreebets) : initialFreebets);

      const savedSpins = localStorage.getItem(getStorageKey(uid, 'freespins'));
      setFreeSpins(savedSpins ? JSON.parse(savedSpins) : initialFreeSpins);
    } catch {
      setSettings(defaultSettings);
      setBets(initialBets);
      setTreasury(initialTreasury);
      setFreebets(initialFreebets);
      setFreeSpins(initialFreeSpins);
    } finally {
      loadedUserRef.current = uid;
    }
  };

  // Initialize active session on mount with automatic instant access
  useEffect(() => {
    try {
      let session = getCurrentSession();
      if (!session?.user?.id) {
        session = getOrCreateDefaultSession();
      }
      if (session?.user?.id) {
        const userObj: AuthUser = {
          id: session.user.id,
          email: session.user.email,
          name: session.user.name
        };
        setCurrentUser(userObj);
        loadUserData(userObj.id);
      } else {
        const fallback = getOrCreateDefaultSession();
        setCurrentUser({
          id: fallback.user.id,
          email: fallback.user.email,
          name: fallback.user.name
        });
        loadUserData(fallback.user.id);
      }
    } catch (e) {
      console.warn('Session init fallback:', e);
    } finally {
      setAuthLoading(false);
    }
  }, []);

  // Persist user-scoped localStorage on state changes (strictly isolated per user ID)
  useEffect(() => {
    if (!currentUser?.id || loadedUserRef.current !== currentUser.id) return;
    localStorage.setItem(getStorageKey(currentUser.id, 'bets'), JSON.stringify(bets));
  }, [bets, currentUser?.id]);

  useEffect(() => {
    if (!currentUser?.id || loadedUserRef.current !== currentUser.id) return;
    localStorage.setItem(getStorageKey(currentUser.id, 'treasury'), JSON.stringify(treasury));
  }, [treasury, currentUser?.id]);

  useEffect(() => {
    if (!currentUser?.id || loadedUserRef.current !== currentUser.id) return;
    localStorage.setItem(getStorageKey(currentUser.id, 'freebets'), JSON.stringify(freebets));
  }, [freebets, currentUser?.id]);

  useEffect(() => {
    if (!currentUser?.id || loadedUserRef.current !== currentUser.id) return;
    localStorage.setItem(getStorageKey(currentUser.id, 'freespins'), JSON.stringify(freeSpins));
  }, [freeSpins, currentUser?.id]);

  useEffect(() => {
    if (!currentUser?.id || loadedUserRef.current !== currentUser.id) return;
    localStorage.setItem(getStorageKey(currentUser.id, 'settings'), JSON.stringify(settings));
  }, [settings, currentUser?.id]);

  // Cloud Sync with Supabase scoped strictly to currentUser.id (gracefully silent if not configured)
  const syncNow = useCallback(async (): Promise<boolean> => {
    if (!isSupabaseConfigured || !currentUser?.id) return false;
    const uid = currentUser.id;
    try {
      const remote = await fetchAllFromSupabase(uid);
      if (!remote) return false;

      const hasRemoteData =
        remote.bets.length > 0 ||
        remote.treasury.length > 0 ||
        remote.freebets.length > 0 ||
        remote.freeSpins.length > 0;

      const hasLocalData =
        bets.length > 0 ||
        treasury.length > 0 ||
        freebets.length > 0 ||
        freeSpins.length > 0;

      if (hasRemoteData) {
        setBets(remote.bets);
        setTreasury(remote.treasury);
        setFreebets(remote.freebets);
        setFreeSpins(remote.freeSpins);
        if (remote.settings) {
          setSettings((prev) => ({
            ...prev,
            ...remote.settings
          }));
        }
      } else if (hasLocalData) {
        await pushAllStateToSupabase(
          {
            bets,
            treasury,
            freebets,
            freeSpins,
            settings
          },
          uid
        );
      } else if (remote.settings) {
        setSettings((prev) => ({
          ...prev,
          ...remote.settings
        }));
      }
      return true;
    } catch {
      return false;
    }
  }, [currentUser?.id, bets, treasury, freebets, freeSpins, settings]);

  useEffect(() => {
    if (!isSupabaseConfigured || !currentUser?.id) return;
    syncNow().catch(() => {});

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        syncNow().catch(() => {});
      }
    };
    window.addEventListener('visibilitychange', handleVisibility);
    return () => window.removeEventListener('visibilitychange', handleVisibility);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  const signUp = async (
    email: string,
    pass: string,
    name?: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await localRegister(email, pass, name);
      if (res.error || !res.user) {
        return { success: false, error: res.error || 'Erro ao criar conta.' };
      }
      const userObj: AuthUser = {
        id: res.user.id,
        email: res.user.email,
        name: res.user.name
      };
      setCurrentUser(userObj);
      loadUserData(userObj.id);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Erro ao criar conta.' };
    }
  };

  const signIn = async (
    email: string,
    pass: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await localLogin(email, pass);
      if (res.error || !res.user) {
        return { success: false, error: res.error || 'Credenciais inválidas.' };
      }
      const userObj: AuthUser = {
        id: res.user.id,
        email: res.user.email,
        name: res.user.name
      };
      setCurrentUser(userObj);
      loadUserData(userObj.id);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Erro ao realizar login.' };
    }
  };

  const resetPassword = async (
    email: string
  ): Promise<{ success: boolean; message?: string; error?: string }> => {
    try {
      const res = await localResetPassword(email);
      if (!res.success) {
        return { success: false, error: res.error || 'Conta não encontrada com este e-mail.' };
      }
      return {
        success: true,
        message: 'Senha temporária definida como: 123456. Você já pode fazer login e alterá-la.'
      };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Erro ao redefinir senha.' };
    }
  };

  const signOut = async () => {
    localSignOut();
    loadedUserRef.current = null;
    setCurrentUser(null);
    setBets(initialBets);
    setTreasury(initialTreasury);
    setFreebets(initialFreebets);
    setFreeSpins(initialFreeSpins);
    setSettings(defaultSettings);
  };

  // Compute Bet outcomes accurately based on status and fund type
  const calculateGrossAndPL = (stake: number, odd: number, status: BetStatus, type: string) => {
    const s = finiteNumber(stake, 0);
    const o = finiteNumber(odd, 1.0);
    let gross = 0;
    let pl = 0;

    if (status === 'GREEN') {
      if (type === 'Freebet') {
        gross = s * (o - 1);
        pl = gross;
      } else {
        gross = s * o;
        pl = gross - s;
      }
    } else if (status === 'HALF_GREEN') {
      if (type === 'Freebet') {
        gross = (s * (o - 1)) / 2;
        pl = gross;
      } else {
        gross = s + (s * (o - 1)) / 2;
        pl = gross - s;
      }
    } else if (status === 'RED') {
      gross = 0;
      pl = type === 'Freebet' ? 0 : -s;
    } else if (status === 'HALF_RED') {
      gross = type === 'Freebet' ? 0 : s / 2;
      pl = type === 'Freebet' ? 0 : -s / 2;
    } else if (status === 'VOID') {
      gross = type === 'Freebet' ? 0 : s;
      pl = 0;
    } else if (status === 'CASHOUT') {
      gross = s * 1.15;
      pl = gross - s;
    } else if (status === 'PENDENTE') {
      gross = 0;
      pl = 0;
    }

    return { gross, pl };
  };

  const addBet = (newBet: Omit<BetEntry, 'id' | 'gross' | 'pl'> & { gross?: number; pl?: number }) => {
    const { gross, pl } =
      newBet.gross !== undefined && newBet.pl !== undefined && Number.isFinite(newBet.pl)
        ? { gross: finiteNumber(newBet.gross, 0), pl: finiteNumber(newBet.pl, 0) }
        : calculateGrossAndPL(newBet.stake, newBet.odd, newBet.status, newBet.type);

    const safeUnit = settings.unitValue > 0 ? settings.unitValue : 25;
    const entry: BetEntry = {
      ...newBet,
      id: ensureValidUuid(),
      units: Number((finiteNumber(newBet.stake, 0) / safeUnit).toFixed(2)),
      gross,
      pl
    };

    setBets((prev) => [entry, ...prev]);
    if (currentUser?.id) {
      upsertBetToSupabase(entry, currentUser.id).catch(() => {});
    }
  };

  const updateBet = (id: string, updated: Partial<BetEntry>) => {
    setBets((prev) =>
      prev.map((bet) => {
        if (bet.id !== id) return bet;
        const merged = { ...bet, ...updated };
        const { gross, pl } = calculateGrossAndPL(merged.stake, merged.odd, merged.status, merged.type);
        const safeUnit = settings.unitValue > 0 ? settings.unitValue : 25;
        const finalBet: BetEntry = {
          ...merged,
          units: Number((finiteNumber(merged.stake, 0) / safeUnit).toFixed(2)),
          gross,
          pl
        };
        if (currentUser?.id) {
          upsertBetToSupabase(finalBet, currentUser.id).catch(() => {});
        }
        return finalBet;
      })
    );
  };

  const deleteBet = (id: string) => {
    setBets((prev) => prev.filter((bet) => bet.id !== id));
    if (currentUser?.id) {
      deleteBetFromSupabase(id, currentUser.id).catch(() => {});
    }
  };

  const resolveBet = (id: string, status: BetStatus) => {
    setBets((prev) =>
      prev.map((bet) => {
        if (bet.id !== id) return bet;
        const { gross, pl } = calculateGrossAndPL(bet.stake, bet.odd, status, bet.type);
        const finalBet: BetEntry = {
          ...bet,
          status,
          gross,
          pl
        };
        if (currentUser?.id) {
          upsertBetToSupabase(finalBet, currentUser.id).catch(() => {});
        }
        return finalBet;
      })
    );
  };

  const addTreasury = (tx: Omit<TreasuryEntry, 'id'>) => {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const entry: TreasuryEntry = {
      ...tx,
      id: `TX-${randomSuffix}`,
      amount: finiteNumber(tx.amount, 0)
    };
    setTreasury((prev) => [entry, ...prev]);
    if (currentUser?.id) {
      upsertTreasuryToSupabase(entry, currentUser.id).catch(() => {});
    }
  };

  const deleteTreasury = (id: string) => {
    setTreasury((prev) => prev.filter((tx) => tx.id !== id));
    if (currentUser?.id) {
      deleteTreasuryFromSupabase(id, currentUser.id).catch(() => {});
    }
  };

  const addFreebet = (fb: Omit<FreebetEntry, 'id'>) => {
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const entry: FreebetEntry = { ...fb, id: `FB-${randomSuffix}` };
    setFreebets((prev) => [entry, ...prev]);
    if (currentUser?.id) {
      upsertFreebetToSupabase(entry, currentUser.id).catch(() => {});
    }
  };

  const updateFreebetStatus = (id: string, status: FreebetEntry['status']) => {
    setFreebets((prev) =>
      prev.map((fb) => {
        if (fb.id !== id) return fb;
        const updated = { ...fb, status };
        if (currentUser?.id) {
          upsertFreebetToSupabase(updated, currentUser.id).catch(() => {});
        }
        return updated;
      })
    );
  };

  const deleteFreebet = (id: string) => {
    setFreebets((prev) => prev.filter((fb) => fb.id !== id));
    if (currentUser?.id) {
      deleteFreebetFromSupabase(id, currentUser.id).catch(() => {});
    }
  };

  const addFreeSpin = (spin: Omit<FreeSpinEntry, 'id'>) => {
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const entry: FreeSpinEntry = { ...spin, id: `FS-${randomSuffix}` };
    setFreeSpins((prev) => [entry, ...prev]);
    if (currentUser?.id) {
      upsertFreeSpinToSupabase(entry, currentUser.id).catch(() => {});
    }
  };

  const deleteFreeSpin = (id: string) => {
    setFreeSpins((prev) => prev.filter((fs) => fs.id !== id));
    if (currentUser?.id) {
      deleteFreeSpinFromSupabase(id, currentUser.id).catch(() => {});
    }
  };

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings((prev) => {
      const merged = { ...prev, ...newSettings };
      if (currentUser?.id) {
        upsertSettingsToSupabase(merged, currentUser.id).catch(() => {});
      }
      return merged;
    });
  };

  const resetData = () => {
    setBets([]);
    setTreasury([]);
    setFreebets([]);
    setFreeSpins([]);
    if (currentUser?.id) {
      clearAllSupabaseTables(currentUser.id).catch(() => {});
    }
  };

  const loadDemoData = () => {
    const sanitizedDemoBets = demoBets.map((b) => ({
      ...b,
      id: ensureValidUuid(b.id)
    }));
    setBets(sanitizedDemoBets);
    setTreasury(demoTreasury);
    setFreebets(demoFreebets);
    setFreeSpins(demoFreeSpins);
    if (currentUser?.id) {
      pushAllStateToSupabase(
        {
          bets: sanitizedDemoBets,
          treasury: demoTreasury,
          freebets: demoFreebets,
          freeSpins: demoFreeSpins,
          settings
        },
        currentUser.id
      ).catch(() => {});
    }
  };

  const importBackup = (data: {
    bets?: BetEntry[];
    treasury?: TreasuryEntry[];
    freebets?: FreebetEntry[];
    freeSpins?: FreeSpinEntry[];
    settings?: AppSettings;
  }) => {
    const nextSettings =
      data.settings && typeof data.settings === 'object'
        ? { ...settings, ...data.settings }
        : settings;
    const nextBets = Array.isArray(data.bets)
      ? data.bets.map((b) => mapRowToBet(b, nextSettings.unitValue))
      : bets;
    const nextTreasury = Array.isArray(data.treasury) ? data.treasury : treasury;
    const nextFreebets = Array.isArray(data.freebets) ? data.freebets : freebets;
    const nextFreeSpins = Array.isArray(data.freeSpins) ? data.freeSpins : freeSpins;

    setBets(nextBets);
    setTreasury(nextTreasury);
    setFreebets(nextFreebets);
    setFreeSpins(nextFreeSpins);
    setSettings(nextSettings);

    if (currentUser?.id) {
      pushAllStateToSupabase(
        {
          bets: nextBets,
          treasury: nextTreasury,
          freebets: nextFreebets,
          freeSpins: nextFreeSpins,
          settings: nextSettings
        },
        currentUser.id
      ).catch(() => {});
    }
  };

  // Computations with NaN-safe finiteNumber guards
  const totalDeposits = useMemo(() => {
    return treasury
      .filter((t) => t.type === 'DEPOSIT' || t.type === 'BONUS')
      .reduce((sum, t) => sum + finiteNumber(t.amount, 0), 0);
  }, [treasury]);

  const totalWithdrawals = useMemo(() => {
    return treasury
      .filter((t) => t.type === 'WITHDRAW')
      .reduce((sum, t) => sum + finiteNumber(t.amount, 0), 0);
  }, [treasury]);

  const totalSpinsProfit = useMemo(() => {
    return freeSpins.reduce((sum, s) => sum + finiteNumber(s.netProfit, 0), 0);
  }, [freeSpins]);

  const totalFreebetsProfit = useMemo(() => {
    return freebets
      .filter((f) => f.status === 'Creditado')
      .reduce((sum, f) => sum + finiteNumber(f.netReturn, 0), 0);
  }, [freebets]);

  const {
    netBetProfit,
    activeExposure,
    openPositionsCount,
    settledBetsCount,
    winCount,
    lossCount,
    voidCount,
    turnoverVolume
  } = useMemo(() => {
    let profit = 0;
    let exposure = 0;
    let openCount = 0;
    let settledCount = 0;
    let wins = 0;
    let losses = 0;
    let voids = 0;
    let turnover = 0;

    bets.forEach((b) => {
      const stakeVal = finiteNumber(b.stake, 0);
      const plVal = finiteNumber(b.pl, 0);

      if (b.status === 'PENDENTE') {
        exposure += stakeVal;
        openCount++;
      } else {
        settledCount++;
        profit += plVal;
        turnover += stakeVal;

        if (b.status === 'GREEN' || b.status === 'HALF_GREEN') {
          wins++;
        } else if (b.status === 'RED' || b.status === 'HALF_RED') {
          losses++;
        } else if (b.status === 'VOID') {
          voids++;
        }
      }
    });

    return {
      netBetProfit: profit,
      activeExposure: exposure,
      openPositionsCount: openCount,
      settledBetsCount: settledCount,
      winCount: wins,
      lossCount: losses,
      voidCount: voids,
      turnoverVolume: turnover
    };
  }, [bets]);

  const currentEquity = useMemo(() => {
    return (
      finiteNumber(settings.initialBankroll, 1000) +
      netBetProfit +
      totalSpinsProfit +
      totalDeposits -
      totalWithdrawals
    );
  }, [settings.initialBankroll, netBetProfit, totalSpinsProfit, totalDeposits, totalWithdrawals]);

  const winRate = useMemo(() => {
    const totalDecisive = winCount + lossCount;
    return totalDecisive > 0 ? (winCount / totalDecisive) * 100 : 0;
  }, [winCount, lossCount]);

  const roi = useMemo(() => {
    return turnoverVolume > 0 ? (netBetProfit / turnoverVolume) * 100 : 0;
  }, [netBetProfit, turnoverVolume]);

  const { maxWinStreak, maxLossStreak, currentStreakText, maxDrawdownPct } = useMemo(() => {
    let maxW = 0;
    let maxL = 0;
    let currentW = 0;
    let currentL = 0;

    const chronological = [...bets].filter((b) => b.status !== 'PENDENTE').reverse();

    const baseBankroll = finiteNumber(settings.initialBankroll, 1000);
    let runningEquity = baseBankroll;
    let peakEquity = baseBankroll;
    let maxDd = 0;

    chronological.forEach((b) => {
      runningEquity += finiteNumber(b.pl, 0);
      if (runningEquity > peakEquity) {
        peakEquity = runningEquity;
      }
      if (peakEquity > 0) {
        const dd = ((peakEquity - runningEquity) / peakEquity) * 100;
        if (dd > maxDd) maxDd = dd;
      }

      if (b.status === 'VOID') return;

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
      maxWinStreak: maxW,
      maxLossStreak: maxL,
      currentStreakText: streakText,
      maxDrawdownPct: maxDd
    };
  }, [bets, settings.initialBankroll]);

  const monthlyTargetAmount =
    (finiteNumber(settings.initialBankroll, 1000) * finiteNumber(settings.monthlyTargetPct, 30)) / 100;
  const stopLossDistance =
    (finiteNumber(settings.initialBankroll, 1000) * finiteNumber(settings.maxDrawdownLimitPct, 25)) / 100;

  return (
    <BankrollContext.Provider
      value={{
        currentUser,
        authLoading,
        signIn,
        signUp,
        resetPassword,
        signOut,
        bets,
        treasury,
        freebets,
        freeSpins,
        settings,
        addBet,
        updateBet,
        deleteBet,
        resolveBet,
        addTreasury,
        deleteTreasury,
        addFreebet,
        updateFreebetStatus,
        deleteFreebet,
        addFreeSpin,
        deleteFreeSpin,
        updateSettings,
        resetData,
        loadDemoData,
        importBackup,
        syncNow,
        totalDeposits,
        totalWithdrawals,
        netBetProfit,
        totalSpinsProfit,
        totalFreebetsProfit,
        currentEquity,
        activeExposure,
        openPositionsCount,
        settledBetsCount,
        winCount,
        lossCount,
        voidCount,
        winRate,
        turnoverVolume,
        roi,
        maxDrawdownPct,
        currentStreakText,
        maxWinStreak,
        maxLossStreak,
        monthlyTargetAmount,
        stopLossDistance,
        unitValue: finiteNumber(settings.unitValue, 25)
      }}
    >
      {children}
    </BankrollContext.Provider>
  );
}

export function useBankroll() {
  const context = useContext(BankrollContext);
  if (!context) {
    throw new Error('useBankroll must be used within a BankrollProvider');
  }
  return context;
}
