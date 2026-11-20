import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  ReactNode
} from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
  Unsubscribe
} from 'firebase/firestore';
import {
  BetEntry,
  TreasuryEntry,
  FreebetEntry,
  FreeSpinEntry,
  AppSettings,
  BetStatus,
  BetFundType
} from '../types';
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
  auth,
  db,
  signInWithGooglePopup,
  signOutFirebase,
  ensureUserProfileDoc,
  updateUserProfileSettings,
  createBetInFirestore,
  updateBetInFirestore,
  deleteBetInFirestore,
  createTreasuryInFirestore,
  deleteTreasuryInFirestore,
  createFreebetInFirestore,
  updateFreebetStatusInFirestore,
  deleteFreebetInFirestore,
  createFreeSpinInFirestore,
  deleteFreeSpinInFirestore,
  hasAnyCloudRecords,
  pushAllStateToFirestore,
  clearAllUserSubcollectionsInFirestore,
  sanitizeFirestoreId,
  timestampToMillis
} from '../lib/firebase';
import {
  getCurrentSession,
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
  photoURL?: string;
}

export type CloudSyncStatus = 'local' | 'syncing' | 'synced' | 'error';

interface BankrollContextType {
  currentUser: AuthUser | null;
  authLoading: boolean;
  isCloudAuthenticated: boolean;
  cloudSyncStatus: CloudSyncStatus;
  cloudSyncError: string | null;
  unauthorizedDomain: string | null;
  lastSyncedAt: Date | null;
  signInWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  uploadLocalToCloud: () => Promise<boolean>;
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

const finiteNumber = (v: unknown, fallback = 0): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

function getStorageKey(userId: string, key: string): string {
  return `${STORAGE_VERSION}${userId}_${key}`;
}

function normalizeBetEntry(raw: any, fallbackUnitValue = 25): BetEntry {
  const safeUnit = fallbackUnitValue > 0 ? fallbackUnitValue : 25;
  const stake = finiteNumber(raw?.stake, 0);
  const odd = Math.max(1, finiteNumber(raw?.odd, 1));
  const type: BetFundType =
    raw?.type === 'Freebet' || raw?.type === 'Bônus Rollover' ? raw.type : 'Saldo Real';
  const allowedStatuses: BetStatus[] = [
    'GREEN',
    'RED',
    'HALF_GREEN',
    'HALF_RED',
    'VOID',
    'CASHOUT',
    'PENDENTE'
  ];
  const rawStatus = String(raw?.status || 'GREEN').toUpperCase() as BetStatus;
  const status: BetStatus = allowedStatuses.includes(rawStatus) ? rawStatus : 'GREEN';
  const gross = finiteNumber(raw?.gross, 0);
  const pl = finiteNumber(raw?.pl, 0);
  const units =
    raw?.units !== undefined && Number.isFinite(Number(raw.units))
      ? Number(raw.units)
      : Number((stake / safeUnit).toFixed(2));

  const entry: BetEntry = {
    id: sanitizeFirestoreId(raw?.id),
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

  if (
    raw?.closingOdd !== undefined &&
    Number.isFinite(Number(raw.closingOdd)) &&
    Number(raw.closingOdd) >= 1
  ) {
    entry.closingOdd = Number(raw.closingOdd);
  }
  return entry;
}

function readLocalStateForUid(uid: string): {
  settings: AppSettings;
  bets: BetEntry[];
  treasury: TreasuryEntry[];
  freebets: FreebetEntry[];
  freeSpins: FreeSpinEntry[];
} {
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
          unitValue: Math.max(0.01, finiteNumber(parsedSettings.unitValue, defaultSettings.unitValue))
        }
      : defaultSettings;

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
    const userBets: BetEntry[] =
      parsedBets && Array.isArray(parsedBets)
        ? parsedBets.map((item) => normalizeBetEntry(item, userSettings.unitValue))
        : initialBets;

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
    const userTreasury: TreasuryEntry[] = savedTreasury ? JSON.parse(savedTreasury) : initialTreasury;

    const savedFreebets = localStorage.getItem(getStorageKey(uid, 'freebets'));
    const userFreebets: FreebetEntry[] = savedFreebets ? JSON.parse(savedFreebets) : initialFreebets;

    const savedSpins = localStorage.getItem(getStorageKey(uid, 'freespins'));
    const userFreeSpins: FreeSpinEntry[] = savedSpins ? JSON.parse(savedSpins) : initialFreeSpins;

    return {
      settings: userSettings,
      bets: Array.isArray(userBets) ? userBets : initialBets,
      treasury: Array.isArray(userTreasury) ? userTreasury : initialTreasury,
      freebets: Array.isArray(userFreebets) ? userFreebets : initialFreebets,
      freeSpins: Array.isArray(userFreeSpins) ? userFreeSpins : initialFreeSpins
    };
  } catch {
    return {
      settings: defaultSettings,
      bets: initialBets,
      treasury: initialTreasury,
      freebets: initialFreebets,
      freeSpins: initialFreeSpins
    };
  }
}

export function BankrollProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    try {
      const session = getCurrentSession();
      if (session?.user?.id) {
        return {
          id: session.user.id,
          email: session.user.email,
          name: session.user.name
        };
      }
    } catch {}
    return DEFAULT_USER;
  });
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [isCloudAuthenticated, setIsCloudAuthenticated] = useState<boolean>(false);
  const [cloudSyncStatus, setCloudSyncStatus] = useState<CloudSyncStatus>('local');
  const [cloudSyncError, setCloudSyncError] = useState<string | null>(null);
  const [unauthorizedDomain, setUnauthorizedDomain] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [bets, setBets] = useState<BetEntry[]>(initialBets);
  const [treasury, setTreasury] = useState<TreasuryEntry[]>(initialTreasury);
  const [freebets, setFreebets] = useState<FreebetEntry[]>(initialFreebets);
  const [freeSpins, setFreeSpins] = useState<FreeSpinEntry[]>(initialFreeSpins);

  const loadedUserRef = useRef<string | null>(null);
  const firebaseUserRef = useRef<User | null>(null);
  const unsubscribesRef = useRef<Unsubscribe[]>([]);
  const authFlowSeqRef = useRef<number>(0);

  const stateRef = useRef({ bets, treasury, freebets, freeSpins, settings });
  stateRef.current = { bets, treasury, freebets, freeSpins, settings };

  const loadLocalUserData = useCallback((uid: string) => {
    const localData = readLocalStateForUid(uid);
    setSettings(localData.settings);
    setBets(localData.bets);
    setTreasury(localData.treasury);
    setFreebets(localData.freebets);
    setFreeSpins(localData.freeSpins);
    loadedUserRef.current = uid;
  }, []);

  const cleanupFirestoreListeners = useCallback(() => {
    unsubscribesRef.current.forEach((unsub) => {
      try {
        unsub();
      } catch {}
    });
    unsubscribesRef.current = [];
  }, []);

  const attachCloudListeners = useCallback(
    (fbUser: User) => {
      cleanupFirestoreListeners();
      const uid = fbUser.uid;
      loadedUserRef.current = uid;

      const handleListenerError = (path: string) => (err: Error) => {
        console.error(`Firestore snapshot error at ${path}:`, err);
        setCloudSyncStatus('error');
        setCloudSyncError(err.message || 'Erro de sincronização com a nuvem.');
      };

      const unsubUser = onSnapshot(
        doc(db, 'users', uid),
        (snap) => {
          if (snap.exists()) {
            const d = snap.data();
            setSettings((prev) => ({
              ...prev,
              initialBankroll: finiteNumber(d.initialBankroll, prev.initialBankroll),
              unitValue: Math.max(0.01, finiteNumber(d.unitValue, prev.unitValue)),
              kellyFraction: String(d.kellyFraction || prev.kellyFraction),
              maxDrawdownLimitPct: finiteNumber(d.maxDrawdownLimitPct, prev.maxDrawdownLimitPct),
              monthlyTargetPct: finiteNumber(d.monthlyTargetPct, prev.monthlyTargetPct)
            }));
          }
          setCloudSyncStatus('synced');
          setLastSyncedAt(new Date());
        },
        handleListenerError(`users/${uid}`)
      );

      const unsubBets = onSnapshot(
        query(collection(db, 'users', uid, 'bets'), where('userId', '==', uid)),
        (snap) => {
          const rows = snap.docs
            .map((d) => ({
              data: d.data(),
              id: d.id,
              ts: timestampToMillis(d.data().createdAt)
            }))
            .sort((a, b) => b.ts - a.ts)
            .map((item) =>
              normalizeBetEntry(
                { ...item.data, id: item.id },
                stateRef.current.settings.unitValue
              )
            );
          setBets(rows);
          setCloudSyncStatus('synced');
          setLastSyncedAt(new Date());
        },
        handleListenerError(`users/${uid}/bets`)
      );

      const unsubTreasury = onSnapshot(
        query(collection(db, 'users', uid, 'treasury'), where('userId', '==', uid)),
        (snap) => {
          const rows = snap.docs
            .map((d) => ({
              data: d.data(),
              id: d.id,
              ts: timestampToMillis(d.data().createdAt)
            }))
            .sort((a, b) => b.ts - a.ts)
            .map((item) => ({
              id: item.id,
              date: String(item.data.date || ''),
              type: item.data.type as TreasuryEntry['type'],
              desc: String(item.data.desc || ''),
              details: item.data.details ? String(item.data.details) : undefined,
              amount: finiteNumber(item.data.amount, 0),
              status: item.data.status as TreasuryEntry['status']
            }));
          setTreasury(rows);
          setCloudSyncStatus('synced');
          setLastSyncedAt(new Date());
        },
        handleListenerError(`users/${uid}/treasury`)
      );

      const unsubFreebets = onSnapshot(
        query(collection(db, 'users', uid, 'freebets'), where('userId', '==', uid)),
        (snap) => {
          const rows = snap.docs
            .map((d) => ({
              data: d.data(),
              id: d.id,
              ts: timestampToMillis(d.data().createdAt)
            }))
            .sort((a, b) => b.ts - a.ts)
            .map((item) => ({
              id: item.id,
              bookmaker: String(item.data.bookmaker || '1win'),
              event: String(item.data.event || ''),
              selection: String(item.data.selection || ''),
              bonusAmount: finiteNumber(item.data.bonusAmount, 0),
              odd: finiteNumber(item.data.odd, 1),
              netReturn: finiteNumber(item.data.netReturn, 0),
              status: item.data.status as FreebetEntry['status'],
              date: String(item.data.date || '')
            }));
          setFreebets(rows);
          setCloudSyncStatus('synced');
          setLastSyncedAt(new Date());
        },
        handleListenerError(`users/${uid}/freebets`)
      );

      const unsubFreeSpins = onSnapshot(
        query(collection(db, 'users', uid, 'free_spins'), where('userId', '==', uid)),
        (snap) => {
          const rows = snap.docs
            .map((d) => ({
              data: d.data(),
              id: d.id,
              ts: timestampToMillis(d.data().createdAt)
            }))
            .sort((a, b) => b.ts - a.ts)
            .map((item) => ({
              id: item.id,
              provider: String(item.data.provider || ''),
              game: String(item.data.game || ''),
              bookmaker: String(item.data.bookmaker || '1win'),
              spinsCount: finiteNumber(item.data.spinsCount, 0),
              netProfit: finiteNumber(item.data.netProfit, 0),
              date: String(item.data.date || '')
            }));
          setFreeSpins(rows);
          setCloudSyncStatus('synced');
          setLastSyncedAt(new Date());
        },
        handleListenerError(`users/${uid}/free_spins`)
      );

      unsubscribesRef.current = [
        unsubUser,
        unsubBets,
        unsubTreasury,
        unsubFreebets,
        unsubFreeSpins
      ];
    },
    [cleanupFirestoreListeners]
  );

  // Firebase Auth listener with graceful non-blocking local fallback
  useEffect(() => {
    // Load local session immediately for zero-lag boot
    try {
      const localSession = getCurrentSession() || getOrCreateDefaultSession();
      setCurrentUser({
        id: localSession.user.id,
        email: localSession.user.email,
        name: localSession.user.name
      });
      loadLocalUserData(localSession.user.id);
    } catch (e) {
      console.warn('Local session init fallback:', e);
    }

    const unsubscribeAuth = onAuthStateChanged(auth, async (fbUser) => {
      const seq = ++authFlowSeqRef.current;

      if (!fbUser) {
        cleanupFirestoreListeners();
        firebaseUserRef.current = null;
        setIsCloudAuthenticated(false);
        setCloudSyncStatus('local');
        setCloudSyncError(null);

        try {
          const session = getCurrentSession() || getOrCreateDefaultSession();
          setCurrentUser({
            id: session.user.id,
            email: session.user.email,
            name: session.user.name
          });
          loadLocalUserData(session.user.id);
        } catch {}
        setAuthLoading(false);
        return;
      }

      // User signed in with Google -> connect real-time Firestore sync
      cleanupFirestoreListeners();
      firebaseUserRef.current = fbUser;
      setIsCloudAuthenticated(true);
      setCloudSyncStatus('syncing');
      setCloudSyncError(null);
      setUnauthorizedDomain(null);

      // Capture existing local data BEFORE switching active UID so we can migrate on first sign-in
      const localFallback = readLocalStateForUid(loadedUserRef.current || DEFAULT_USER.id);
      const localSnapshot = {
        bets: stateRef.current.bets.length > 0 ? stateRef.current.bets : localFallback.bets,
        treasury:
          stateRef.current.treasury.length > 0
            ? stateRef.current.treasury
            : localFallback.treasury,
        freebets:
          stateRef.current.freebets.length > 0
            ? stateRef.current.freebets
            : localFallback.freebets,
        freeSpins:
          stateRef.current.freeSpins.length > 0
            ? stateRef.current.freeSpins
            : localFallback.freeSpins,
        settings: stateRef.current.settings
      };

      setCurrentUser({
        id: fbUser.uid,
        email: fbUser.email || '',
        name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Apostador',
        photoURL: fbUser.photoURL || undefined
      });

      try {
        await ensureUserProfileDoc(fbUser, localSnapshot.settings);
        if (seq !== authFlowSeqRef.current) return;

        const cloudHasData = await hasAnyCloudRecords(fbUser.uid);
        if (seq !== authFlowSeqRef.current) return;

        const hasLocalRecords =
          localSnapshot.bets.length > 0 ||
          localSnapshot.treasury.length > 0 ||
          localSnapshot.freebets.length > 0 ||
          localSnapshot.freeSpins.length > 0;

        if (!cloudHasData && hasLocalRecords) {
          await pushAllStateToFirestore(fbUser, localSnapshot, false);
          if (seq !== authFlowSeqRef.current) return;
        }

        attachCloudListeners(fbUser);
        setCloudSyncStatus('synced');
        setLastSyncedAt(new Date());
      } catch (err: any) {
        if (seq !== authFlowSeqRef.current) return;
        console.error('Firebase cloud init error:', err);
        setCloudSyncStatus('error');
        setCloudSyncError(err?.message || 'Erro ao inicializar sincronização na nuvem.');
      } finally {
        if (seq === authFlowSeqRef.current) {
          setAuthLoading(false);
        }
      }
    });

    return () => {
      unsubscribeAuth();
      cleanupFirestoreListeners();
    };
  }, [attachCloudListeners, cleanupFirestoreListeners, loadLocalUserData]);

  // Cache state to user-scoped localStorage for instant reloads & offline resilience
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

  const signInWithGoogle = useCallback(async (): Promise<{
    success: boolean;
    error?: string;
  }> => {
    try {
      setCloudSyncError(null);
      setUnauthorizedDomain(null);
      await signInWithGooglePopup();
      return { success: true };
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        return { success: false, error: 'Login com Google cancelado.' };
      }
      if (code === 'auth/popup-blocked') {
        return {
          success: false,
          error: 'O navegador bloqueou o pop-up do Google. Permita pop-ups para este site e tente novamente.'
        };
      }
      if (code === 'auth/unauthorized-domain') {
        const host = typeof window !== 'undefined' ? window.location.hostname : '';
        const msg = host
          ? `Domínio "${host}" ainda não autorizado no Firebase Auth. Adicione este domínio em Authentication → Settings → Authorized domains no Console do Firebase.`
          : 'Domínio não autorizado no Firebase Authentication.';
        setUnauthorizedDomain(host || 'domínio atual');
        setCloudSyncError(msg);
        return { success: false, error: msg };
      }
      const fallbackMsg = err?.message || 'Não foi possível conectar com a conta Google.';
      setCloudSyncError(fallbackMsg);
      return {
        success: false,
        error: fallbackMsg
      };
    }
  }, []);

  const uploadLocalToCloud = useCallback(async (): Promise<boolean> => {
    const fbUser = firebaseUserRef.current;
    if (!fbUser) return false;
    try {
      setCloudSyncStatus('syncing');
      const localDefault = readLocalStateForUid(DEFAULT_USER.id);
      const mergedPayload = {
        bets: stateRef.current.bets.length > 0 ? stateRef.current.bets : localDefault.bets,
        treasury:
          stateRef.current.treasury.length > 0
            ? stateRef.current.treasury
            : localDefault.treasury,
        freebets:
          stateRef.current.freebets.length > 0
            ? stateRef.current.freebets
            : localDefault.freebets,
        freeSpins:
          stateRef.current.freeSpins.length > 0
            ? stateRef.current.freeSpins
            : localDefault.freeSpins,
        settings: stateRef.current.settings
      };
      await pushAllStateToFirestore(fbUser, mergedPayload, false);
      setCloudSyncStatus('synced');
      setLastSyncedAt(new Date());
      return true;
    } catch (err: any) {
      setCloudSyncStatus('error');
      setCloudSyncError(err?.message || 'Erro ao enviar dados locais para a nuvem.');
      return false;
    }
  }, []);

  const syncNow = useCallback(async (): Promise<boolean> => {
    const fbUser = firebaseUserRef.current;
    if (!fbUser) return false;
    try {
      setCloudSyncStatus('syncing');
      await ensureUserProfileDoc(fbUser, stateRef.current.settings);
      attachCloudListeners(fbUser);
      setCloudSyncStatus('synced');
      setLastSyncedAt(new Date());
      return true;
    } catch {
      setCloudSyncStatus('error');
      return false;
    }
  }, [attachCloudListeners]);

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
      loadLocalUserData(userObj.id);
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
      loadLocalUserData(userObj.id);
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
    cleanupFirestoreListeners();
    if (firebaseUserRef.current) {
      try {
        await signOutFirebase();
      } catch {}
      firebaseUserRef.current = null;
    }
    localSignOut();
    loadedUserRef.current = null;
    setIsCloudAuthenticated(false);
    setCloudSyncStatus('local');
    setCloudSyncError(null);
    const session = getOrCreateDefaultSession();
    setCurrentUser(session.user);
    loadLocalUserData(session.user.id);
  };

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

  const addBet = (
    newBet: Omit<BetEntry, 'id' | 'gross' | 'pl'> & { gross?: number; pl?: number }
  ) => {
    const { gross, pl } =
      newBet.gross !== undefined && newBet.pl !== undefined && Number.isFinite(newBet.pl)
        ? { gross: finiteNumber(newBet.gross, 0), pl: finiteNumber(newBet.pl, 0) }
        : calculateGrossAndPL(newBet.stake, newBet.odd, newBet.status, newBet.type);

    const safeUnit = settings.unitValue > 0 ? settings.unitValue : 25;
    const entry: BetEntry = {
      ...newBet,
      id: sanitizeFirestoreId(),
      units: Number((finiteNumber(newBet.stake, 0) / safeUnit).toFixed(2)),
      gross,
      pl
    };

    setBets((prev) => [entry, ...prev]);
    const uid = firebaseUserRef.current?.uid;
    if (uid) {
      createBetInFirestore(entry, uid).catch((err) => {
        setCloudSyncStatus('error');
        setCloudSyncError(err?.message || 'Falha ao salvar aposta na nuvem.');
      });
    }
  };

  const updateBet = (id: string, updated: Partial<BetEntry>) => {
    const existing = stateRef.current.bets.find((b) => b.id === id);
    if (!existing) return;

    const merged = { ...existing, ...updated };
    const { gross, pl } = calculateGrossAndPL(merged.stake, merged.odd, merged.status, merged.type);
    const safeUnit = settings.unitValue > 0 ? settings.unitValue : 25;
    const finalBet: BetEntry = {
      ...merged,
      units: Number((finiteNumber(merged.stake, 0) / safeUnit).toFixed(2)),
      gross,
      pl
    };

    setBets((prev) => prev.map((bet) => (bet.id === id ? finalBet : bet)));
    const uid = firebaseUserRef.current?.uid;
    if (uid) {
      updateBetInFirestore(finalBet, uid).catch((err) => {
        setCloudSyncStatus('error');
        setCloudSyncError(err?.message || 'Falha ao atualizar aposta na nuvem.');
      });
    }
  };

  const deleteBet = (id: string) => {
    setBets((prev) => prev.filter((bet) => bet.id !== id));
    const uid = firebaseUserRef.current?.uid;
    if (uid) {
      deleteBetInFirestore(id, uid).catch((err) => {
        setCloudSyncStatus('error');
        setCloudSyncError(err?.message || 'Falha ao excluir aposta na nuvem.');
      });
    }
  };

  const resolveBet = (id: string, status: BetStatus) => {
    const existing = stateRef.current.bets.find((b) => b.id === id);
    if (!existing) return;

    const { gross, pl } = calculateGrossAndPL(existing.stake, existing.odd, status, existing.type);
    const finalBet: BetEntry = {
      ...existing,
      status,
      gross,
      pl
    };

    setBets((prev) => prev.map((bet) => (bet.id === id ? finalBet : bet)));
    const uid = firebaseUserRef.current?.uid;
    if (uid) {
      updateBetInFirestore(finalBet, uid).catch((err) => {
        setCloudSyncStatus('error');
        setCloudSyncError(err?.message || 'Falha ao liquidar aposta na nuvem.');
      });
    }
  };

  const addTreasury = (tx: Omit<TreasuryEntry, 'id'>) => {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const entry: TreasuryEntry = {
      ...tx,
      id: `TX-${Date.now().toString(36)}-${randomSuffix}`,
      amount: finiteNumber(tx.amount, 0)
    };
    setTreasury((prev) => [entry, ...prev]);
    const uid = firebaseUserRef.current?.uid;
    if (uid) {
      createTreasuryInFirestore(entry, uid).catch((err) => {
        setCloudSyncStatus('error');
        setCloudSyncError(err?.message || 'Falha ao salvar movimentação na nuvem.');
      });
    }
  };

  const deleteTreasury = (id: string) => {
    setTreasury((prev) => prev.filter((tx) => tx.id !== id));
    const uid = firebaseUserRef.current?.uid;
    if (uid) {
      deleteTreasuryInFirestore(id, uid).catch((err) => {
        setCloudSyncStatus('error');
        setCloudSyncError(err?.message || 'Falha ao excluir movimentação na nuvem.');
      });
    }
  };

  const addFreebet = (fb: Omit<FreebetEntry, 'id'>) => {
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const entry: FreebetEntry = { ...fb, id: `FB-${Date.now().toString(36)}-${randomSuffix}` };
    setFreebets((prev) => [entry, ...prev]);
    const uid = firebaseUserRef.current?.uid;
    if (uid) {
      createFreebetInFirestore(entry, uid).catch((err) => {
        setCloudSyncStatus('error');
        setCloudSyncError(err?.message || 'Falha ao salvar freebet na nuvem.');
      });
    }
  };

  const updateFreebetStatus = (id: string, status: FreebetEntry['status']) => {
    const existing = stateRef.current.freebets.find((fb) => fb.id === id);
    if (!existing) return;

    const updated = { ...existing, status };
    setFreebets((prev) => prev.map((fb) => (fb.id === id ? updated : fb)));
    const uid = firebaseUserRef.current?.uid;
    if (uid) {
      updateFreebetStatusInFirestore(id, status, uid).catch((err) => {
        setCloudSyncStatus('error');
        setCloudSyncError(err?.message || 'Falha ao atualizar freebet na nuvem.');
      });
    }
  };

  const deleteFreebet = (id: string) => {
    setFreebets((prev) => prev.filter((fb) => fb.id !== id));
    const uid = firebaseUserRef.current?.uid;
    if (uid) {
      deleteFreebetInFirestore(id, uid).catch((err) => {
        setCloudSyncStatus('error');
        setCloudSyncError(err?.message || 'Falha ao excluir freebet na nuvem.');
      });
    }
  };

  const addFreeSpin = (spin: Omit<FreeSpinEntry, 'id'>) => {
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const entry: FreeSpinEntry = {
      ...spin,
      id: `FS-${Date.now().toString(36)}-${randomSuffix}`
    };
    setFreeSpins((prev) => [entry, ...prev]);
    const uid = firebaseUserRef.current?.uid;
    if (uid) {
      createFreeSpinInFirestore(entry, uid).catch((err) => {
        setCloudSyncStatus('error');
        setCloudSyncError(err?.message || 'Falha ao salvar giro grátis na nuvem.');
      });
    }
  };

  const deleteFreeSpin = (id: string) => {
    setFreeSpins((prev) => prev.filter((fs) => fs.id !== id));
    const uid = firebaseUserRef.current?.uid;
    if (uid) {
      deleteFreeSpinInFirestore(id, uid).catch((err) => {
        setCloudSyncStatus('error');
        setCloudSyncError(err?.message || 'Falha ao excluir giro grátis na nuvem.');
      });
    }
  };

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    const merged = { ...stateRef.current.settings, ...newSettings };
    setSettings(merged);
    const fbUser = firebaseUserRef.current;
    if (fbUser) {
      updateUserProfileSettings(fbUser, merged).catch((err) => {
        setCloudSyncStatus('error');
        setCloudSyncError(err?.message || 'Falha ao salvar ajustes na nuvem.');
      });
    }
  };

  const resetData = () => {
    setBets([]);
    setTreasury([]);
    setFreebets([]);
    setFreeSpins([]);
    const uid = firebaseUserRef.current?.uid;
    if (uid) {
      clearAllUserSubcollectionsInFirestore(uid).catch((err) => {
        setCloudSyncStatus('error');
        setCloudSyncError(err?.message || 'Falha ao limpar dados na nuvem.');
      });
    }
  };

  const loadDemoData = () => {
    const sanitizedDemoBets = demoBets.map((b) => ({
      ...b,
      id: sanitizeFirestoreId(b.id)
    }));
    setBets(sanitizedDemoBets);
    setTreasury(demoTreasury);
    setFreebets(demoFreebets);
    setFreeSpins(demoFreeSpins);
    const fbUser = firebaseUserRef.current;
    if (fbUser) {
      pushAllStateToFirestore(
        fbUser,
        {
          bets: sanitizedDemoBets,
          treasury: demoTreasury,
          freebets: demoFreebets,
          freeSpins: demoFreeSpins,
          settings: stateRef.current.settings
        },
        true
      ).catch((err) => {
        setCloudSyncStatus('error');
        setCloudSyncError(err?.message || 'Falha ao carregar exemplo na nuvem.');
      });
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
        ? { ...stateRef.current.settings, ...data.settings }
        : stateRef.current.settings;
    const nextBets = Array.isArray(data.bets)
      ? data.bets.map((b) => normalizeBetEntry(b, nextSettings.unitValue))
      : stateRef.current.bets;
    const nextTreasury = Array.isArray(data.treasury)
      ? data.treasury.map((t) => ({ ...t, id: sanitizeFirestoreId(t.id) }))
      : stateRef.current.treasury;
    const nextFreebets = Array.isArray(data.freebets)
      ? data.freebets.map((f) => ({ ...f, id: sanitizeFirestoreId(f.id) }))
      : stateRef.current.freebets;
    const nextFreeSpins = Array.isArray(data.freeSpins)
      ? data.freeSpins.map((s) => ({ ...s, id: sanitizeFirestoreId(s.id) }))
      : stateRef.current.freeSpins;

    setBets(nextBets);
    setTreasury(nextTreasury);
    setFreebets(nextFreebets);
    setFreeSpins(nextFreeSpins);
    setSettings(nextSettings);

    const fbUser = firebaseUserRef.current;
    if (fbUser) {
      pushAllStateToFirestore(
        fbUser,
        {
          bets: nextBets,
          treasury: nextTreasury,
          freebets: nextFreebets,
          freeSpins: nextFreeSpins,
          settings: nextSettings
        },
        true
      ).catch((err) => {
        setCloudSyncStatus('error');
        setCloudSyncError(err?.message || 'Falha ao importar backup para a nuvem.');
      });
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
    (finiteNumber(settings.initialBankroll, 1000) * finiteNumber(settings.monthlyTargetPct, 30)) /
    100;
  const stopLossDistance =
    (finiteNumber(settings.initialBankroll, 1000) *
      finiteNumber(settings.maxDrawdownLimitPct, 25)) /
    100;

  return (
    <BankrollContext.Provider
      value={{
        currentUser,
        authLoading,
        isCloudAuthenticated,
        cloudSyncStatus,
        cloudSyncError,
        unauthorizedDomain,
        lastSyncedAt,
        signInWithGoogle,
        uploadLocalToCloud,
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
